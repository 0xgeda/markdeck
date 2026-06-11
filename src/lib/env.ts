import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  DEEPSEEK_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://markdeck.pro"),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: raw.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: raw.SUPABASE_SERVICE_ROLE_KEY,
    DEEPSEEK_API_KEY: raw.DEEPSEEK_API_KEY,
    NEXT_PUBLIC_SITE_URL: raw.NEXT_PUBLIC_SITE_URL,
  });
}

let _env: Env | undefined;

// Lazy proxy: parseEnv() is deferred until first property access (request time, not build time).
export const env = new Proxy({} as Env, {
  get(_target, key: string) {
    if (!_env) _env = parseEnv();
    return _env[key as keyof Env];
  },
});
