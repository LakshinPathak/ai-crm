import { Schema, model } from 'mongoose';

const CompanySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true },
    domain: String,
    industry: String,
    crmExternalId: String,
    crmProvider: String,
    logoUrl: String,
    employeeCount: Number,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CompanySchema.index({ workspaceId: 1, domain: 1 });
CompanySchema.index({ workspaceId: 1, name: 'text' });

export const Company = model('Company', CompanySchema);
