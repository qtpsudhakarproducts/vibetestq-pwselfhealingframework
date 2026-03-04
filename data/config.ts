// data/config.ts
// Reads runtime configuration and test credentials from environment variables.
// Variables are passed at execution time via shell or CI pipeline — never from files.

import { EnvConfig, RuntimeConfig } from './types';

const DEFAULT_BASE_URL = 'https://opensource-demo.orangehrmlive.com';
const DEFAULT_HEALING_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai:    'gpt-4o',
  gemini:    'gemini-1.5-flash',
} as const;

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Returns Playwright runtime settings from environment variables.
 * Uses sensible defaults when optional vars are not provided.
 * Safe to call at config load time — does NOT require credentials.
 *
 * Optional vars: BASE_URL, CI, GITHUB_RUN_ID
 *                ENABLE_RUNTIME_HEALING, HEAL_LLM_PROVIDER, HEAL_LLM_API_KEY,
 *                HEAL_LLM_MODEL, HEAL_MAX_CALLS, HEAL_MAX_CONSECUTIVE_FAILURES
 */
export function readRuntimeConfig(): RuntimeConfig {
  const provider = process.env.HEAL_LLM_PROVIDER ?? 'openai';
  if (provider !== 'anthropic' && provider !== 'openai' && provider !== 'gemini') {
    throw new Error(
      `HEAL_LLM_PROVIDER "${provider}" is not supported. ` +
      `Supported values: anthropic, openai, gemini`
    );
  }

  const runtime: RuntimeConfig = {
    env: {
      baseURL: process.env.BASE_URL ?? DEFAULT_BASE_URL,
    },
    ci: {
      isCI:  process.env.CI === 'true',
      runId: process.env.GITHUB_RUN_ID,
    },
    healing: {
      enabled:                process.env.ENABLE_RUNTIME_HEALING === 'true',
      provider,
      apiKey:                 process.env.HEAL_LLM_API_KEY ?? '',
      model:                  process.env.HEAL_LLM_MODEL ?? DEFAULT_HEALING_MODELS[provider],
      maxCalls:               parsePositiveInt(process.env.HEAL_MAX_CALLS, 10, 'HEAL_MAX_CALLS'),
      maxConsecutiveFailures: parsePositiveInt(
        process.env.HEAL_MAX_CONSECUTIVE_FAILURES,
        3,
        'HEAL_MAX_CONSECUTIVE_FAILURES'
      ),
    },
  };

  if (runtime.healing.enabled && !runtime.healing.apiKey) {
    throw new Error('HEAL_LLM_API_KEY is required when ENABLE_RUNTIME_HEALING=true.');
  }

  return runtime;
}

/**
 * Returns test credentials passed via environment variables at execution time.
 * Fails immediately with a clear message if any required variable is missing.
 *
 * Required vars: ADMIN_USERNAME, ADMIN_PASSWORD, ESS_USERNAME, ESS_PASSWORD
 * Pass them in shell:   ADMIN_USERNAME=admin npx playwright test
 * Pass them in CI:      set as repository secrets / pipeline variables
 */
export function readEnv(): EnvConfig {
  return {
    baseURL:       readRuntimeConfig().env.baseURL,
    adminUsername: requireEnv('ADMIN_USERNAME'),
    adminPassword: requireEnv('ADMIN_PASSWORD'),
    essUsername:   requireEnv('ESS_USERNAME'),
    essPassword:   requireEnv('ESS_PASSWORD'),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value && value.trim() !== '') return value;
  throw new Error(
    `Missing required environment variable: ${key}. ` +
    `Set it in shell or CI pipeline environment.`
  );
}

function parsePositiveInt(value: string | undefined, defaultValue: number, key: string): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer. Received: ${value}`);
  }
  return parsed;
}
