# Final Launch Setup

## Final page count

- Final page count: **26**
- Final post count: **15**

## Final URL list

### Homepage
- /

### Final support URLs
- /apply/
- /eligibility/
- /providers/
- /documents/
- /lifeline/
- /about/
- /contact/
- /editorial-policy/
- /privacy-policy/
- /terms/

### Final article URLs
- /government-tablet/
- /ebt-tablet/
- /medicaid-tablet/
- /phone-tablet-bundle/
- /lifeline-tablet/
- /low-income-tablet/
- /food-stamps-tablet/
- /airtalk-tablet/
- /qlink-tablet/
- /assurance-tablet/
- /standup-tablet/
- /truconnect-tablet/
- /safelink-tablet/
- /tablet-documents/
- /acp-tablet-update/

## Sitemap URL count

- `sitemap.xml` URL count: **26**

## Image manifest count

- `image-manifest.json` records: **31**

## Image folder paths

- `assets/images/final/`
- `assets/images/final/home/`
- `assets/images/final/posts/`
- `assets/images/final/infographics/`

## Cloudflare Pages settings

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `/`
- Production branch: `main`
- Project name: `freetabletbenefit`
- Custom domain: `freetabletbenefit.com`

## GitHub image replacement workflow

1. Create real images manually.
2. Save them with the exact filenames listed in `image-manifest.json`.
3. Replace files in `assets/images/final/`.
4. Push to GitHub `main`.
5. Cloudflare Pages redeploys automatically from GitHub.

## QA result

- Current status: `npm run qa` passes.

## Remaining manual tasks

- Replace fallback images with my real images using the same filenames
- Push images to GitHub
- Connect GitHub repo to Cloudflare Pages
- Add custom domain freetabletbenefit.com in Cloudflare Pages
