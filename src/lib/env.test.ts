import { describe, expect, it, vi } from 'vitest';

describe('env', () => {
  it('loads required Markdeck environment variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    vi.stubEnv('DEEPSEEK_API_KEY', 'deepseek-key');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://markdeck.pro');

    const { env } = await import('./env');

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://markdeck.pro');
  });
});
