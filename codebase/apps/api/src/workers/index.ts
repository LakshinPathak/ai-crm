/**
 * MongoDB background job worker — agent runs, call ingest.
 * Start separately: `pnpm --filter @ai-crm/api dev:worker`
 */
import { connectDb } from '@ai-crm/db';
import { startBackgroundJobProcessors } from '../lib/queues/processor.js';
import { log } from '../lib/logger.js';

async function main(): Promise<void> {
  await connectDb();
  startBackgroundJobProcessors();
  log('workers', 'MongoDB job processors listening', {
    queues: ['agent-runs', 'ingest-call'],
  });
}

void main();
