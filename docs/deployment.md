# Markdeck Deployment

Production domain: markdeck.pro

Required Vercel environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DEEPSEEK_API_KEY
- NEXT_PUBLIC_SITE_URL=https://markdeck.pro

Build checks:

1. Run `npm test`.
2. Run `npm run build`.
3. Confirm Supabase migrations are applied.
4. Confirm Supabase Storage bucket `deck-assets` exists and is public.
5. Confirm markdeck.pro is assigned to the Vercel production deployment.
