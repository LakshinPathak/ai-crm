import { config } from 'dotenv';
import { resolve } from 'node:path';
import { connectDb } from '@ai-crm/db';
import { log } from './lib/logger.js';
import { createApp } from './create-app.js';
import { startBackgroundJobProcessors } from './lib/queues/processor.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function start() {
  await connectDb();
  startBackgroundJobProcessors();
  app.listen(port, () => {
    log('api', `modular monolith listening on :${port}`);
  });
}

start().catch((err) => {
  log('api', 'failed to start', { error: String(err) });
  process.exit(1);
});

export { app };
