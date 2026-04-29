import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  COURSERA_BASE_URL: z.string().url().default('https://api.coursera.org/api/onDemandCourses.v1'),
  COURSERA_AUTH_URL: z
    .string()
    .url()
    .default('https://www.coursera.org/api/xAuthResetPasswordV1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  TOTP_SECRET: z.string().optional(),
  SESSION_TIMEOUT_MS: z.coerce.number().default(3600000),
  CACHE_TTL_SECONDS: z.coerce.number().default(300),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_DIRECTORY: z.string().default('./logs'),
  ENABLE_CACHE: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_CIRCUIT_BREAKER: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .default('true'),
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().default(60000),
});

type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (config) {
    return config;
  }

  // Load environment variables
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    COURSERA_BASE_URL: process.env.COURSERA_BASE_URL,
    COURSERA_AUTH_URL: process.env.COURSERA_AUTH_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TOTP_SECRET: process.env.TOTP_SECRET,
    SESSION_TIMEOUT_MS: process.env.SESSION_TIMEOUT_MS,
    CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
    LOG_FORMAT: process.env.LOG_FORMAT,
    LOG_DIRECTORY: process.env.LOG_DIRECTORY,
    ENABLE_CACHE: process.env.ENABLE_CACHE,
    ENABLE_CIRCUIT_BREAKER: process.env.ENABLE_CIRCUIT_BREAKER,
    CIRCUIT_BREAKER_THRESHOLD: process.env.CIRCUIT_BREAKER_THRESHOLD,
    CIRCUIT_BREAKER_TIMEOUT_MS: process.env.CIRCUIT_BREAKER_TIMEOUT_MS,
  };

  try {
    config = envSchema.parse(env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type')
        .map((e) => e.path.join('.'))
        .join(', ');
      throw new Error(`Invalid environment configuration: ${missingVars}`);
    }
    throw error;
  }
}

export type { EnvConfig };
