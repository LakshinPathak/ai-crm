import { Schema, model } from 'mongoose';

const PlanMilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    dueDate: Date,
    description: String,
  },
  { _id: true },
);

const PlanGoalSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
  },
  { _id: true },
);

const DealSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    stageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage', required: true },
    position: { type: Number, default: 0 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    solutionsEngineerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['open', 'won', 'lost'], default: 'open' },
    sentiment: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    technicalFitScore: { type: Number, min: 1, max: 5 },
    winProbability: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0 },
    blockerCount: { type: Number, default: 0 },
    isHot: { type: Boolean, default: false },
    meddpiccCompleteness: { type: Number, default: 0 },
    plan: {
      milestones: { type: [PlanMilestoneSchema], default: [] },
      goals: { type: [PlanGoalSchema], default: [] },
    },
    expectedCloseDate: Date,
    closedAt: Date,
    lostReason: String,
    lastActivityAt: Date,
    crmExternalId: String,
    crmProvider: String,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

DealSchema.index({ workspaceId: 1, stageId: 1, position: 1 });
DealSchema.index({ workspaceId: 1, ownerId: 1 });
DealSchema.index({ workspaceId: 1, title: 'text' });

export const Deal = model('Deal', DealSchema);
