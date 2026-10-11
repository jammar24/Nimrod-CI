import { z } from 'zod';

const EnvSchema = z.object({
  NEBIUS_API_KEY: z.string().min(1).optional(),
  NEBIUS_BASE_URL: z.string().url().default('https://api.tokenfactory.nebius.com/v1/'),
  NEBIUS_MODEL_PRIMARY: z.string().default('nvidia/nemotron-3-super-120b-a12b'),
  NEBIUS_MODEL_FAST: z.string().default('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B'),
  TAVILY_API_KEY: z.string().min(1).optional(),
  MAX_DIFF_CHARS: z.coerce.number().int().positive().default(20000),
  MAX_VERIFY_ITERATIONS: z.coerce.number().int().min(1).max(5).default(2),
  DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(300),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;

let cachedEnv: ValidatedEnv | null = null;

/**
 * Validates process.env variables at runtime.
 * Throws a clear descriptive error if critical configuration is malformed.
 */
export function getValidatedEnv(): ValidatedEnv {
  if (cachedEnv && process.env.NODE_ENV === 'production') {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`[Configuration Error] Invalid environment variables: ${issues}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Validates that the Nebius API key is available when a live model execution is attempted.
 */
export function requireNebiusApiKey(): string {
  const env = getValidatedEnv();
  if (!env.NEBIUS_API_KEY) {
    throw new Error(
      'NEBIUS_API_KEY is not configured. Live analysis requires a Nebius Token Factory API key. ' +
      'To test Sentinel-CI without an API key, use "Instant replay" mode with the pre-recorded security fixtures.'
    );
  }
  return env.NEBIUS_API_KEY;
}
