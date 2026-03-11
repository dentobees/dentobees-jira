import mongoose, { Schema, models } from "mongoose";

const crmTicketSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, required: true },
    issue: { type: String, required: true },
    department: { type: String, required: true },
    attachments: [
      {
        url: String,
        name: String,
        mimeType: String,
      },
    ],
    remarks: { type: String },
    status: { type: String, default: "OPEN" },
    priority: { type: String, default: "MEDIUM" },
    dueDate: { type: Date, default: null },
    createdById: { type: Schema.Types.ObjectId, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "ticket-crm" }
);

crmTicketSchema.index({ leadId: 1 });
crmTicketSchema.index({ createdById: 1 });
crmTicketSchema.index({ status: 1 });
crmTicketSchema.index({ department: 1 });
crmTicketSchema.index({ dueDate: 1 });
crmTicketSchema.index({ deletedAt: 1 });

export const CrmTicket = models.CrmTicket || mongoose.model("CrmTicket", crmTicketSchema);

