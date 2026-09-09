import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const e2eEnv = {
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ai-crm',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_SECRET: process.env.JWT_SECRET ?? 'ci-jwt-secret-for-e2e-tests-only',
  TOKEN_ENCRYPTION_KEY:
    process.env.TOKEN_ENCRYPTION_KEY ?? 'ci-token-encryption-key-32chars!!',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  NEXT_PUBLIC_SSE_URL: process.env.NEXT_PUBLIC_SSE_URL ?? 'http://localhost:4000',
  PORT: process.env.PORT ?? '4000',
  API_URL: process.env.API_URL ?? 'http://localhost:4000',
  WEB_URL: process.env.WEB_URL ?? 'http://localhost:3000',
  INTERNAL_SERVICE_TOKEN:
    process.env.INTERNAL_SERVICE_TOKEN ?? 'dev-internal-token-change-in-prod',
  ...(process.env.GEMINI_API_KEY ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY } : {}),
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter @ai-crm/api dev',
          cwd: repoRoot,
          url: 'http://localhost:4000/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: e2eEnv,
        },
        {
          command: 'pnpm --filter @ai-crm/web dev',
          cwd: repoRoot,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: e2eEnv,
        },
      ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
