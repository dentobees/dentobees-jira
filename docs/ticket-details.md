# Ticket System (Support Tickets)

This document explains the Support Ticket system implemented in this CRM, with a focus on **database schema (MongoDB/Mongoose)**, permissions, APIs, S3 attachments, and UI pages.

---

## Overview

Support Tickets allow sales users to log customer issues against a **Lead** and route them to an internal **Department** (e.g. Development, Marketing). Each ticket can include:

- Lead reference
- Issue text
- Assigned department
- Attachments (image/video stored in S3)
- Remarks
- Status + Priority
- Due date
- Comments thread
- Soft delete (tickets are not physically removed)

The system follows existing CRM patterns:

- Auth via NextAuth session (`getServerSession`)
- MongoDB via Mongoose (`connectDB`)
- Audit trail via `ActivityLog` (extended to include `Ticket`)

---

## Database Schema (MongoDB)

### Collections

| Domain | Collection | File |
|---|---|---|
| Tickets | `ticket-crm` | `models/Ticket.ts` |
| Ticket Comments | `ticketcomment-crm` | `models/TicketComment.ts` |
| Leads (existing) | `leads-crm` | `models/Lead.ts` |
| Users (existing) | `users-crm` | `models/User.ts` |
| Activity Logs (existing) | `activity-logs-crm` | `models/ActivityLog.ts` |

### 1) Tickets (`ticket-crm`)

Model: `models/Ticket.ts`

#### Fields

- **`_id`**: ObjectId (MongoDB default)
- **`leadId`**: ObjectId (ref: `leads-crm`), **required**
- **`issue`**: string, **required**
- **`department`**: enum string, **required**
  - Allowed values are defined in `lib/ticket-constants.ts`
  - `DEVELOPMENT | MARKETING | SUPPORT | SALES`
- **`attachments`**: array of objects
  - `url`: string (S3 object URL)
  - `name`: string (original filename)
  - `mimeType`: string (optional)
- **`remarks`**: string (optional)
- **`status`**: enum string, default `OPEN`
  - `OPEN | IN_PROGRESS | RESOLVED | CLOSED`
- **`priority`**: enum string, default `MEDIUM`
  - `LOW | MEDIUM | HIGH | URGENT`
- **`dueDate`**: Date (nullable)
- **`createdById`**: ObjectId (ref: `users-crm`), **required**
- **`deletedAt`**: Date (nullable). When non-null, ticket is considered **soft-deleted**.
- **timestamps**:
  - `createdAt`
  - `updatedAt`

#### Indexes

Defined in `models/Ticket.ts`:

- `{ leadId: 1 }`
- `{ createdById: 1 }`
- `{ status: 1 }`
- `{ department: 1 }`
- `{ dueDate: 1 }`
- `{ deletedAt: 1 }` (used to filter out soft-deleted rows)

#### Soft delete behavior

- List + Get-by-id endpoints filter `deletedAt: null`
- Delete endpoint sets `deletedAt = new Date()` (does not remove document)

---

### 2) Ticket Comments (`ticketcomment-crm`)

Model: `models/TicketComment.ts`

#### Fields

- **`_id`**: ObjectId (MongoDB default)
- **`ticketId`**: ObjectId (ref: `ticket-crm`), **required**
- **`createdById`**: ObjectId (ref: `users-crm`), **required**
- **`body`**: string, **required**
- **timestamps**:
  - `createdAt`
  - `updatedAt`

#### Indexes

- `{ ticketId: 1 }` (fetch comments by ticket efficiently)

---

## Enumerations (shared constants)

File: `lib/ticket-constants.ts`

These constants are kept **outside** of `models/Ticket.ts` so client components can import them without pulling `mongoose` into the browser bundle.

- `TICKET_DEPARTMENTS`
- `TICKET_STATUSES`
- `TICKET_PRIORITIES`

---

## Permissions / Access Control

The system enforces access in API routes.

### Roles

- **ADMIN**:
  - Can list and view all tickets
  - Can update any ticket
  - Can delete (soft delete) any ticket
- **SALESPERSON**:
  - Can create tickets only for **leads assigned to them**
  - Can view/update tickets only when the ticket’s `leadId.assignedToId == session.user.id`
  - Can delete tickets only if they are the **creator** (see delete rule below)

### Delete rule (soft delete)

Route: `DELETE /api/tickets/[id]`

- Allowed if:
  - `session.user.role === 'ADMIN'` **OR**
  - `ticket.createdById === session.user.id`

---

## API Endpoints

### 1) Tickets

#### `GET /api/tickets`

File: `app/api/tickets/route.ts`

Query params:

- `page` (default 1)
- `limit` (default 20)
- `department` (optional)
- `status` (optional)
- `priority` (optional)
- `leadId` (optional; admin only)
- `search` (optional)
  - Searches `issue` by regex
  - If `search` is a valid ObjectId, it searches by `_id` **or** issue text

Notes:

- Always filters `deletedAt: null`
- Populates `leadId` (basic lead fields) and `createdById` (name/email)

#### `POST /api/tickets`

File: `app/api/tickets/route.ts`

Body:

- `leadId` (required)
- `issue` (required)
- `department` (required)
- `attachments` (optional array)
- `remarks` (optional)
- `status` (optional, default OPEN)
- `priority` (optional, default MEDIUM)
- `dueDate` (optional)

Behavior:

- Validates lead exists
- Salesperson must own assigned lead
- Creates the ticket with `createdById` from session
- Logs ActivityLog action: `TICKET_CREATED`

---

### 2) Ticket details

#### `GET /api/tickets/[id]`

File: `app/api/tickets/[id]/route.ts`

- Validates ObjectId
- Filters `deletedAt: null`
- Enforces access control via lead assignment

#### `PUT /api/tickets/[id]`

File: `app/api/tickets/[id]/route.ts`

Allowed update fields:

- `issue`, `department`, `attachments`, `remarks`, `status`, `priority`, `dueDate`

Behavior:

- Filters `deletedAt: null`
- Enforces access control
- Logs ActivityLog action: `TICKET_UPDATED`

#### `DELETE /api/tickets/[id]` (soft delete)

File: `app/api/tickets/[id]/route.ts`

Behavior:

- Filters `deletedAt: null`
- Sets `deletedAt = new Date()`
- Logs ActivityLog action: `TICKET_DELETED`

---

### 3) Ticket comments

#### `GET /api/tickets/[id]/comments`

File: `app/api/tickets/[id]/comments/route.ts`

- Enforces ticket access control
- Returns comments sorted by `createdAt: -1`
- Populates `createdById` (name/email)

#### `POST /api/tickets/[id]/comments`

File: `app/api/tickets/[id]/comments/route.ts`

Body:

- `body` (required string)

Behavior:

- Enforces ticket access control
- Creates comment
- Logs ActivityLog action: `TICKET_COMMENT_ADDED`

---

## Attachments (S3 Upload)

### Upload route

File: `app/api/tickets/upload/route.ts`

Endpoint:

- `POST /api/tickets/upload`

Request:

- `multipart/form-data`
- Field name: `files` (supports multiple)

Validation:

- Max size: 25MB per file
- Allowed MIME:
  - `image/*`
  - `video/*`

S3 key format:

- `tickets/{timestamp-rand}/{sanitizedFilename}`

### Required environment variables

Set in `.env.local` (user-managed):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- Optional: `AWS_S3_ENDPOINT` (S3-compatible providers)

### Making attachments public

This project’s bucket is configured with **ACLs disabled** (Bucket owner enforced), so we cannot use `public-read` ACL on uploads.

To make objects public you must:

1. Ensure S3 **Block Public Access** does not block public bucket policies for this bucket, and
2. Add a bucket policy that allows public read for the `tickets/*` prefix.

Example bucket policy (replace `YOUR_BUCKET_NAME`):

```json
{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Sid\": \"PublicReadTicketsPrefix\",
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::YOUR_BUCKET_NAME/tickets/*\"
    }
  ]
}
```

---

## UI Pages / Routes

Sidebar entry:

- File: `components/layout/Sidebar.tsx`
- Label: **Support Tickets**
- Route: `/tickets`

Pages:

- `app/(dashboard)/tickets/page.tsx`
  - List + filters (department/status/priority/search)
  - Search supports issue text and Mongo `_id`
- `app/(dashboard)/tickets/new/page.tsx`
  - Create ticket form
  - Upload attachments via `/api/tickets/upload`
- `app/(dashboard)/tickets/[id]/page.tsx`
  - Ticket details view
  - Comments section + add comment
- `app/(dashboard)/tickets/[id]/edit/page.tsx`
  - Edit ticket fields + attachments

Header title mapping:

- File: `components/layout/Header.tsx`
- Ticket pages display friendly names (Support Tickets / Ticket Details / Edit Ticket / New Ticket)

---

## Activity Logging (Audit Trail)

Activity log helper:

- `lib/activity.ts` uses `models/ActivityLog.ts`
- `ActivityLog.entityType` includes `'Ticket'`

Ticket-related actions currently logged:

- `TICKET_CREATED`
- `TICKET_UPDATED`
- `TICKET_DELETED`
- `TICKET_COMMENT_ADDED`

---

## Notes / Known constraints

- Attachments are stored as **public S3 URLs** once bucket policy allows it.
- For sensitive data, consider switching to **presigned URLs** (private objects) instead of public reads.
- Tickets are soft-deleted; lists and fetches always filter `deletedAt: null`.

