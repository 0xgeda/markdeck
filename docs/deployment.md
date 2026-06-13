# Markdeck Deployment

Production domain: markdeck.pro  
GitHub: github.com/0xgeda/markdeck (branch: main)

## Required Vercel Environment Variables

| Variable | Value |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `NEXT_PUBLIC_SITE_URL` | `https://markdeck.pro` |

No Supabase variables needed — MVP uses sessionStorage (no database).

## Build Checks

1. `npm test` — all tests pass
2. `npm run build` — build succeeds locally before pushing

## Deploy Steps

1. Push to `main` branch on GitHub → Vercel auto-deploys
2. Confirm Production deployment shows **Ready** in Vercel dashboard
3. Smoke test: open markdeck.pro, paste Markdown, click Generate, verify preview loads
