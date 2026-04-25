# Deployment Guide

This project is fully automated for image generation, QA, and Cloudflare Pages deployment.

## Required GitHub Secrets

Add these repository secrets before pushing to `main`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `OPENAI_API_KEY` for real AI image generation.

## Image automation behavior

- If `OPENAI_API_KEY` exists, `scripts/generate-images.js` attempts real image generation through the OpenAI Images API.
- If `OPENAI_API_KEY` is missing or generation fails, the script creates clean SVG fallback images automatically.
- Fallback images are still production-safe and prevent missing image files.

## Automation flow

On push to `main`, GitHub Actions will:

1. Install Node and dependencies.
2. Run `npm run build`:
   - `npm run images`
   - `npm run qa`
3. Deploy with Wrangler to Cloudflare Pages.

No manual upload is needed after setup.

## Local commands

```bash
npm run images
npm run qa
npm run build
npm run deploy
```

## Notes

- Cloudflare Pages project name is set to `freetabletbenefit`.
- If your Cloudflare project name differs, update:
  - `wrangler.toml`
  - `.github/workflows/deploy-cloudflare-pages.yml`
  - `package.json` deploy script
