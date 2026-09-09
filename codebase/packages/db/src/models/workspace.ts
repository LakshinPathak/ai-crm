import { Schema, model } from 'mongoose';

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    timezone: { type: String, default: 'America/New_York' },
    settings: {
      defaultCurrency: { type: String, default: 'USD' },
      aiCreditsMonthly: { type: Number, default: 10000 },
      aiCreditsUsed: { type: Number, default: 0 },
    },
    primaryCrmConnectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection' },
    onboardingStep: { type: Number, default: 1 },
    selectedCrmProvider: { type: String, default: null },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Workspace = model('Workspace', WorkspaceSchema);
