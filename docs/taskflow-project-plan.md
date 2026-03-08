# TaskFlow — Jira-Like Task Management Tool
### Full-Stack Project Documentation | Next.js + MongoDB + Tailwind CSS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [MongoDB Data Models](#4-mongodb-data-models)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Feature Breakdown](#6-feature-breakdown)
7. [API Routes Reference](#7-api-routes-reference)
8. [UI Pages & Components](#8-ui-pages--components)
9. [Authentication Flow](#9-authentication-flow)
10. [Build Order (Vibe Coding Sequence)](#10-build-order-vibe-coding-sequence)
11. [NPM Packages](#11-npm-packages)
12. [Environment Variables](#12-environment-variables)
13. [Deployment](#13-deployment)

---

## 1. Project Overview

**Dentobees jira** is a developer-first, Jira-inspired task management web application built for software teams. It allows teams to create projects, manage issues across customizable Kanban boards, plan sprints, and collaborate in real time — all inside a clean, fast, and modern interface.

### Core Goals

- Give development teams a centralized place to track bugs, features, and tasks
- Provide Kanban board views with drag-and-drop support
- Support sprint planning and backlog management
- Enable team collaboration with comments, mentions, and activity logs
- Be fast, keyboard-friendly, and developer-focused in its UX

### Who Is It For?

Small-to-medium software development teams who want the power of Jira without the complexity or cost. It is self-hostable and fully customizable.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework with SSR and API routes |
| **Language** | TypeScript | Type safety across frontend and backend |
| **Database** | MongoDB (via MongoDB Atlas) | Flexible document storage for issue/project data |
| **ODM** | Mongoose | MongoDB object modeling for Node.js |
| **Auth** | NextAuth.js | Authentication with Google/GitHub OAuth + credentials |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Accessible, unstyled component primitives |
| **State Management** | Zustand | Lightweight global client state |
| **Data Fetching** | TanStack Query (React Query) | Server state, caching, and background refetch |
| **Drag & Drop** | @dnd-kit/core | Accessible, modern drag-and-drop for Kanban |
| **Rich Text** | Tiptap | Extensible rich text editor for issue descriptions |
| **Charts** | Recharts | Sprint burndown and reporting charts |
| **Command Palette** | cmdk | `Cmd+K` global search |
| **Notifications** | react-hot-toast | In-app toast notifications |
| **Date Utilities** | date-fns | Date formatting and manipulation |
| **Deployment** | Vercel | Serverless deployment for Next.js |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│   Next.js App Router Pages + React Components               │
│   Tailwind CSS + shadcn/ui + Zustand + TanStack Query       │
│   @dnd-kit (Kanban) + Tiptap (Editor) + cmdk (Search)       │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTP / API Calls
┌──────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS SERVER (App Router)                 │
│                                                              │
│   /app/api/** — API Route Handlers                          │
│   NextAuth.js — Session & JWT management                    │
│   Mongoose — MongoDB queries                                │
└──────────────────────┬──────────────────────────────────────┘
                       │  Mongoose ODM
┌──────────────────────▼──────────────────────────────────────┐
│                   MongoDB Atlas (Cloud)                      │
│                                                              │
│   Collections: users, workspaces, projects,                 │
│   sprints, issues, comments, labels, activities             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. User visits the app → NextAuth checks session cookie
2. Authenticated request hits a Next.js API Route (`/api/issues`, etc.)
3. API Route runs Mongoose query against MongoDB Atlas
4. Data returned as JSON → TanStack Query caches it on the client
5. UI updates reactively; Zustand holds ephemeral UI state (open modals, active board column, etc.)

---

## 4. MongoDB Data Models

All models use Mongoose schemas. Each document uses MongoDB's default `_id` (ObjectId).

### 4.1 User

```ts
{
  _id: ObjectId,
  name: string,
  email: string,          // unique
  image: string,          // avatar URL (from OAuth or upload)
  password?: string,      // hashed, only for credentials login
  role: "admin" | "member" | "viewer",
  workspaces: ObjectId[], // ref: Workspace
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Workspace

```ts
{
  _id: ObjectId,
  name: string,
  slug: string,           // unique URL identifier e.g. "my-company"
  owner: ObjectId,        // ref: User
  members: [
    { user: ObjectId, role: "owner" | "admin" | "member" | "viewer" }
  ],
  projects: ObjectId[],   // ref: Project
  createdAt: Date,
  updatedAt: Date
}
```

### 4.3 Project

```ts
{
  _id: ObjectId,
  name: string,
  key: string,            // short prefix e.g. "TF" for issue keys like TF-42
  description: string,
  workspace: ObjectId,    // ref: Workspace
  lead: ObjectId,         // ref: User
  members: ObjectId[],    // ref: User
  columns: [              // Kanban board columns
    { id: string, name: string, color: string, order: number }
  ],
  defaultColumn: string,  // id of the default column for new issues
  createdAt: Date,
  updatedAt: Date
}
```

### 4.4 Sprint

```ts
{
  _id: ObjectId,
  name: string,           // e.g. "Sprint 3"
  project: ObjectId,      // ref: Project
  goal: string,           // sprint goal description
  status: "planning" | "active" | "completed",
  startDate: Date,
  endDate: Date,
  issues: ObjectId[],     // ref: Issue (ordered list)
  createdAt: Date,
  updatedAt: Date
}
```

### 4.5 Issue (Core Model)

```ts
{
  _id: ObjectId,
  key: string,            // auto-generated e.g. "TF-42"
  title: string,
  description: string,    // HTML from Tiptap rich text editor
  type: "bug" | "story" | "task" | "epic" | "subtask",
  status: string,         // matches a column id from Project.columns
  priority: "urgent" | "high" | "medium" | "low" | "none",
  storyPoints: number,
  project: ObjectId,      // ref: Project
  sprint: ObjectId | null, // ref: Sprint — null = backlog
  reporter: ObjectId,     // ref: User
  assignees: ObjectId[],  // ref: User
  labels: ObjectId[],     // ref: Label
  parent: ObjectId | null, // ref: Issue — for subtasks
  children: ObjectId[],   // ref: Issue — subtask list
  attachments: [
    { filename: string, url: string, size: number, uploadedAt: Date }
  ],
  dueDate: Date | null,
  order: number,          // position within a column for sorting
  createdAt: Date,
  updatedAt: Date
}
```

### 4.6 Comment

```ts
{
  _id: ObjectId,
  issue: ObjectId,        // ref: Issue
  author: ObjectId,       // ref: User
  body: string,           // HTML from Tiptap
  mentions: ObjectId[],   // ref: User
  reactions: [
    { emoji: string, users: ObjectId[] }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### 4.7 Label

```ts
{
  _id: ObjectId,
  name: string,
  color: string,          // hex color e.g. "#FF5733"
  project: ObjectId,      // ref: Project
}
```

### 4.8 Activity

```ts
{
  _id: ObjectId,
  issue: ObjectId,        // ref: Issue
  actor: ObjectId,        // ref: User
  action: string,         // e.g. "changed status", "assigned user", "added comment"
  from: string,           // previous value
  to: string,             // new value
  createdAt: Date
}
```

---

## 5. Project Folder Structure

```
taskflow/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # Main app shell (sidebar + topbar)
│   │   ├── dashboard/page.tsx    # Home dashboard
│   │   ├── onboarding/page.tsx   # Create first workspace
│   │   └── [workspace]/
│   │       ├── layout.tsx
│   │       ├── page.tsx          # Workspace overview
│   │       ├── settings/page.tsx
│   │       └── projects/
│   │           └── [projectId]/
│   │               ├── layout.tsx
│   │               ├── board/page.tsx        # Kanban board
│   │               ├── backlog/page.tsx      # Backlog list
│   │               ├── sprints/page.tsx      # Sprint management
│   │               ├── reports/page.tsx      # Charts & reports
│   │               └── settings/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── workspaces/
│       │   ├── route.ts               # GET all, POST create
│       │   └── [workspaceId]/
│       │       ├── route.ts           # GET, PATCH, DELETE
│       │       └── members/route.ts   # POST invite, DELETE remove
│       ├── projects/
│       │   ├── route.ts
│       │   └── [projectId]/route.ts
│       ├── issues/
│       │   ├── route.ts               # GET filtered, POST create
│       │   └── [issueId]/
│       │       ├── route.ts           # GET, PATCH, DELETE
│       │       └── comments/route.ts  # GET, POST
│       └── sprints/
│           ├── route.ts
│           └── [sprintId]/route.ts
│
├── components/
│   ├── board/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── IssueCard.tsx
│   ├── issues/
│   │   ├── IssueModal.tsx         # Create/edit issue modal
│   │   ├── IssueDetail.tsx        # Full issue detail view
│   │   ├── IssueFilters.tsx       # Filter bar
│   │   └── IssuePriorityBadge.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── CommandPalette.tsx     # Cmd+K search
│   ├── sprints/
│   │   ├── SprintCard.tsx
│   │   └── BurndownChart.tsx
│   └── ui/                        # shadcn/ui components
│
├── lib/
│   ├── db.ts                      # MongoDB connection (Mongoose)
│   ├── auth.ts                    # NextAuth config
│   └── utils.ts                   # Shared helpers
│
├── models/                        # Mongoose schemas
│   ├── User.ts
│   ├── Workspace.ts
│   ├── Project.ts
│   ├── Sprint.ts
│   ├── Issue.ts
│   ├── Comment.ts
│   ├── Label.ts
│   └── Activity.ts
│
├── hooks/                         # Custom React hooks
│   ├── useIssues.ts
│   ├── useBoard.ts
│   └── useSprint.ts
│
├── store/                         # Zustand stores
│   ├── boardStore.ts
│   └── uiStore.ts
│
├── types/                         # TypeScript type definitions
│   └── index.ts
│
├── public/
├── .env.local
├── tailwind.config.ts
└── next.config.ts
```

---

## 6. Feature Breakdown

### 6.1 Authentication
- Email/password sign-up and login
- Google OAuth and GitHub OAuth via NextAuth.js
- Protected routes — redirect unauthenticated users to `/login`
- Persistent session via JWT stored in secure cookie

### 6.2 Workspace Management
- Create a workspace with a name and unique slug
- Invite teammates by email (sends invite link)
- Role-based access: `owner`, `admin`, `member`, `viewer`
- Workspace settings: rename, change avatar, delete

### 6.3 Project Management
- Create projects inside a workspace with a name and a short key (e.g. `TF`)
- Customize Kanban columns per project (add, rename, reorder, delete columns)
- Assign a project lead
- Project settings and member management

### 6.4 Issue Management
- Create issues with: title, description (rich text), type, priority, assignees, labels, sprint, story points, due date
- Issue key auto-generated: `{PROJECT_KEY}-{incrementing number}` (e.g. `TF-42`)
- Edit any issue field inline
- Delete or archive issues
- Subtask support — link child issues to a parent
- File attachments per issue
- Issue types: Bug 🐛, Story 📖, Task ✅, Epic ⚡, Subtask 🔗

### 6.5 Kanban Board
- Visual column-based board representing issue statuses
- Drag and drop issue cards between columns using @dnd-kit
- Drag to reorder cards within a column
- Quick-add card at the bottom of any column
- Filter board by assignee, label, priority, or type
- Compact and detailed card view toggle

### 6.6 Backlog
- Flat list view of all issues not in an active sprint
- Bulk-select and bulk-edit (change status, assignee, label)
- Drag to reorder priority ranking
- Move issues into a sprint from the backlog

### 6.7 Sprint Management
- Create a sprint with a name, goal, start date, and end date
- Start sprint — moves it from `planning` to `active` status
- Complete sprint — moves unfinished issues back to backlog
- Only one active sprint per project at a time
- Sprint backlog shows all issues assigned to that sprint

### 6.8 Comments & Collaboration
- Comment on any issue with rich text (Tiptap)
- @mention teammates in comments — triggers notification
- Emoji reactions on comments
- Edit and delete own comments

### 6.9 Activity Log
- Every change on an issue is auto-logged (status changes, reassignment, priority changes, comments, etc.)
- Activity feed visible in the issue detail view
- Timestamped and attributed to the actor

### 6.10 Search & Filters
- Global `Cmd+K` command palette — search issues, projects, and teammates
- Per-board filter bar — filter by assignee, label, priority, type
- Persistent URL-based filters so you can share filtered views

### 6.11 Reporting Dashboard
- Sprint burndown chart (story points remaining vs. days)
- Issues by status (pie chart)
- Issues by assignee (bar chart)
- Cycle time and lead time metrics per sprint

---

## 7. API Routes Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/workspaces` | List all workspaces for current user |
| `POST` | `/api/workspaces` | Create a new workspace |
| `GET` | `/api/workspaces/[id]` | Get workspace by ID |
| `PATCH` | `/api/workspaces/[id]` | Update workspace |
| `DELETE` | `/api/workspaces/[id]` | Delete workspace |
| `POST` | `/api/workspaces/[id]/members` | Invite a member |
| `GET` | `/api/projects` | List projects in a workspace |
| `POST` | `/api/projects` | Create a project |
| `PATCH` | `/api/projects/[id]` | Update project settings |
| `DELETE` | `/api/projects/[id]` | Delete a project |
| `GET` | `/api/issues` | List issues (with filters via query params) |
| `POST` | `/api/issues` | Create a new issue |
| `GET` | `/api/issues/[id]` | Get issue detail |
| `PATCH` | `/api/issues/[id]` | Update an issue field |
| `DELETE` | `/api/issues/[id]` | Delete an issue |
| `GET` | `/api/issues/[id]/comments` | List comments on an issue |
| `POST` | `/api/issues/[id]/comments` | Add a comment |
| `GET` | `/api/sprints` | List sprints for a project |
| `POST` | `/api/sprints` | Create a sprint |
| `PATCH` | `/api/sprints/[id]` | Update or change sprint status |

---

## 8. UI Pages & Components

### Pages

| Route | Description |
|---|---|
| `/login` | Sign in page |
| `/register` | Sign up page |
| `/onboarding` | Create first workspace wizard |
| `/dashboard` | Personal dashboard — all workspaces overview |
| `/[workspace]` | Workspace home — all projects |
| `/[workspace]/[project]/board` | Kanban board for a project |
| `/[workspace]/[project]/backlog` | Backlog list view |
| `/[workspace]/[project]/sprints` | Sprint planning view |
| `/[workspace]/[project]/reports` | Reporting and charts |
| `/[workspace]/settings` | Workspace settings |
| `/[workspace]/[project]/settings` | Project settings |

### Key Reusable Components

| Component | Description |
|---|---|
| `IssueCard` | Compact card shown in Kanban columns |
| `IssueModal` | Slide-over or dialog for creating/editing an issue |
| `IssueDetail` | Full-page issue view with comments and activity |
| `KanbanBoard` | Parent drag-and-drop container |
| `KanbanColumn` | Individual column — droppable zone |
| `CommandPalette` | `Cmd+K` global search overlay |
| `Sidebar` | Left navigation with workspace/project links |
| `Topbar` | Top navigation with notifications and user avatar |
| `BurndownChart` | Recharts sprint burndown visualization |
| `SprintCard` | Sprint block in the sprint planning view |
| `IssuePriorityBadge` | Color-coded priority indicator |
| `UserAvatar` | User profile picture with tooltip |

---

## 9. Authentication Flow

```
User visits /dashboard
        │
        ▼
NextAuth middleware checks session
        │
   ┌────┴──────┐
   │           │
 Valid       Invalid
session      session
   │           │
   ▼           ▼
Load app   Redirect to /login
               │
         ┌─────┴──────┐
         │             │
     Credentials    OAuth
    (email+pass)  (Google/GitHub)
         │             │
         └──────┬───── ┘
                │
       NextAuth creates session
       User saved/updated in MongoDB
                │
                ▼
         Redirect to /dashboard
              or /onboarding (new user)
```

---

## 10. Build Order (Vibe Coding Sequence)

Follow this exact order. Each phase should be shippable before moving to the next.

### Phase 1 — Foundation (Days 1–3)
- [ ] Initialize Next.js project with TypeScript and Tailwind
- [ ] Set up MongoDB Atlas cluster + Mongoose connection (`lib/db.ts`)
- [ ] Create all Mongoose models
- [ ] Set up NextAuth with Google/GitHub providers
- [ ] Build login and register pages
- [ ] Protect all `/app` routes with middleware

### Phase 2 — Workspace & Project Setup (Days 4–6)
- [ ] Build workspace creation flow + onboarding page
- [ ] Workspace dashboard listing all projects
- [ ] Project creation with key and column config
- [ ] Invite members via email
- [ ] Role enforcement middleware

### Phase 3 — Issue CRUD (Days 7–10)
- [ ] Issue model API routes (create, read, update, delete)
- [ ] Issue creation modal with all fields
- [ ] Issue detail page (with Tiptap editor for description)
- [ ] Auto-generate issue keys (e.g. `TF-1`, `TF-2`)
- [ ] Seed database with realistic mock issues for UI testing

### Phase 4 — Kanban Board (Days 11–15)
- [ ] Board layout with Tailwind — columns side by side
- [ ] Fetch and display issues per column
- [ ] `@dnd-kit` drag-and-drop between and within columns
- [ ] Status update on drop via PATCH API
- [ ] Quick-add issue at bottom of each column
- [ ] Filter bar (assignee, priority, label, type)

### Phase 5 — Backlog & Sprints (Days 16–20)
- [ ] Backlog view listing issues without a sprint
- [ ] Sprint creation and sprint management page
- [ ] Drag issues from backlog into a sprint
- [ ] Start and complete sprint functionality
- [ ] Sprint issue list in backlog format

### Phase 6 — Collaboration (Days 21–24)
- [ ] Comment system on issues (Tiptap + API)
- [ ] Activity log auto-generated on every issue change
- [ ] @mentions in comments
- [ ] Emoji reactions on comments

### Phase 7 — Search, Filters & UX Polish (Days 25–28)
- [ ] `Cmd+K` command palette with `cmdk`
- [ ] URL-based persistent filters
- [ ] Keyboard shortcuts (`C` for create issue, etc.)
- [ ] Loading skeletons and empty states
- [ ] Toast notifications with `react-hot-toast`

### Phase 8 — Reports & Deployment (Days 29–32)
- [ ] Sprint burndown chart with Recharts
- [ ] Issues-by-status and issues-by-assignee charts
- [ ] Performance audit (query indexes on MongoDB)
- [ ] Deploy to Vercel + connect MongoDB Atlas production URI

---

## 11. NPM Packages

```bash
# Core
npm install mongoose next-auth

# UI & Styling
npx shadcn-ui@latest init
npm install class-variance-authority clsx tailwind-merge

# Drag & Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Rich Text Editor
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention

# State & Data Fetching
npm install zustand @tanstack/react-query

# Charts
npm install recharts

# Command Palette
npm install cmdk

# Notifications
npm install react-hot-toast

# Date Utilities
npm install date-fns

# Form Handling
npm install react-hook-form zod @hookform/resolvers
```

---

## 12. Environment Variables

Create a `.env.local` file in the root of your project:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/taskflow?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

> **Tip:** Generate `NEXTAUTH_SECRET` by running `openssl rand -base64 32` in your terminal.

---

## 13. Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect the repo to [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` in the Vercel dashboard under **Settings → Environment Variables**
4. Set `NEXTAUTH_URL` to your production domain (e.g. `https://taskflow.vercel.app`)
5. Deploy — Vercel auto-deploys on every push to `main`

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user with read/write access
3. Whitelist all IPs (`0.0.0.0/0`) for Vercel serverless compatibility
4. Copy the connection string into `MONGODB_URI`
5. Add indexes for frequently queried fields:

```ts
// Recommended indexes for performance
issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ project: 1, sprint: 1 });
issueSchema.index({ assignees: 1 });
issueSchema.index({ key: 1 }, { unique: true });
```

---

## Quick Start (Local Development)

```bash
# 1. Create the Next.js project
npx create-next-app@latest taskflow --typescript --tailwind --app
cd taskflow

# 2. Install all dependencies
npm install mongoose next-auth @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @tiptap/react @tiptap/starter-kit zustand @tanstack/react-query \
  recharts cmdk react-hot-toast date-fns \
  react-hook-form zod @hookform/resolvers \
  class-variance-authority clsx tailwind-merge

# 3. Initialize shadcn/ui
npx shadcn-ui@latest init

# 4. Set up .env.local with your MongoDB URI and NextAuth config

# 5. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

*Built with Next.js 14 · MongoDB · Tailwind CSS · TypeScript*
