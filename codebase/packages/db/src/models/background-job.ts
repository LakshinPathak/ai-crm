import { Schema, model } from 'mongoose';

const BackgroundJobSchema = new Schema(
  {
    queue: { type: String, required: true, index: true },
    name: { type: String, required: true },
    jobId: { type: String, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    runAt: { type: Date, default: () => new Date(), index: true },
    lockedAt: Date,
    lockedBy: String,
    lastError: String,
    completedAt: Date,
  },
  { timestamps: true },
);

BackgroundJobSchema.index({ queue: 1, status: 1, runAt: 1, createdAt: 1 });
BackgroundJobSchema.index(
  { queue: 1, jobId: 1 },
  { unique: true, partialFilterExpression: { jobId: { $type: 'string' }, status: { $in: ['pending', 'processing'] } } },
);

export const BackgroundJob = model('BackgroundJob', BackgroundJobSchema);
