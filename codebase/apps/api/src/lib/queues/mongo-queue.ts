import { BackgroundJob } from '@ai-crm/db';
import type { HydratedDocument } from 'mongoose';
import { log } from '../logger.js';

const LOCK_TTL_MS = 5 * 60 * 1000;

export type BackgroundJobDoc = HydratedDocument<InstanceType<typeof BackgroundJob>>;

export async function enqueueJob(options: {
  queue: string;
  name: string;
  payload: unknown;
  jobId?: string;
  maxAttempts?: number;
}): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 3;

  if (options.jobId) {
    const existing = await BackgroundJob.findOne({
      queue: options.queue,
      jobId: options.jobId,
      status: { $in: ['pending', 'processing'] },
    });
    if (existing) return;
  }

  try {
    await BackgroundJob.create({
      queue: options.queue,
      name: options.name,
      jobId: options.jobId,
      payload: options.payload,
      maxAttempts,
      status: 'pending',
      runAt: new Date(),
    });
  } catch (err) {
    if (options.jobId && isDuplicateKeyError(err)) return;
    throw err;
  }
}

export async function claimNextJob(
  queue: string,
  workerId: string,
): Promise<BackgroundJobDoc | null> {
  const now = new Date();
  const staleLock = new Date(now.getTime() - LOCK_TTL_MS);

  return BackgroundJob.findOneAndUpdate(
    {
      queue,
      status: 'pending',
      runAt: { $lte: now },
      $or: [{ lockedAt: { $exists: false } }, { lockedAt: null }, { lockedAt: { $lt: staleLock } }],
    },
    {
      $set: { status: 'processing', lockedAt: now, lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { sort: { runAt: 1, createdAt: 1 }, new: true },
  );
}

export async function completeJob(jobId: string): Promise<void> {
  await BackgroundJob.findByIdAndUpdate(jobId, {
    status: 'completed',
    completedAt: new Date(),
    lockedAt: null,
    lockedBy: null,
  });
}

export async function failJob(job: BackgroundJobDoc, error: string): Promise<void> {
  if (job.attempts >= job.maxAttempts) {
    await BackgroundJob.findByIdAndUpdate(job.id, {
      status: 'failed',
      lastError: error,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });
    return;
  }

  const delayMs = Math.min(2000 * 2 ** (job.attempts - 1), 60_000);
  await BackgroundJob.findByIdAndUpdate(job.id, {
    status: 'pending',
    lastError: error,
    lockedAt: null,
    lockedBy: null,
    runAt: new Date(Date.now() + delayMs),
  });
}

export async function removeJobByJobId(queue: string, jobId: string): Promise<void> {
  await BackgroundJob.deleteMany({
    queue,
    jobId,
    status: { $in: ['pending', 'processing'] },
  });
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export function startQueuePoller(
  queue: string,
  processor: (payload: unknown) => Promise<void>,
  options: { concurrency?: number; workerId?: string } = {},
): () => void {
  const concurrency = options.concurrency ?? 3;
  const workerId = options.workerId ?? `worker-${process.pid}`;
  let active = 0;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;

    while (active < concurrency && !stopped) {
      const job = await claimNextJob(queue, workerId);
      if (!job) break;

      active += 1;
      void processor(job.payload)
        .then(() => completeJob(job.id))
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          log('mongo-queue', 'job failed', { queue, jobId: job.jobId, error: message });
          return failJob(job, message);
        })
        .finally(() => {
          active -= 1;
        });
    }
  };

  const interval = setInterval(() => {
    void tick();
  }, 1000);

  void tick();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
