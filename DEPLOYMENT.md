# Deployment Guide

This project is prepared for GitHub-connected Cloudflare Pages deployment.

## Cloudflare Pages project settings

Use these exact settings when creating the Pages project:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `.`
- Production branch: `main`
- Project name: `tabletsbenifits`
- Custom domain: `freetabletbenefit.com`

## Domain connection steps

1. Push this repository to GitHub.
2. Open Cloudflare Dashboard and go to **Workers & Pages**.
3. Select **Create application** and choose **Pages**.
4. Select **Connect to Git** and authorize GitHub if needed.
5. Select this repository.
6. Set build command to `npm run build`.
7. Set build output directory to `.`.
8. Confirm production branch is `main`.
9. Deploy the project.
10. Open the new Pages project settings and add custom domain `freetabletbenefit.com`.
11. Add `www.freetabletbenefit.com` if you want both hostnames.
12. Confirm Cloudflare DNS points the domain to this Pages project.

## Validation after deployment

Test both URLs after DNS and SSL are active:

- https://freetabletbenefit.com/
- https://www.freetabletbenefit.com/

## Notes

- No manual file upload to Cloudflare Pages is required.
- Deployments should come from GitHub commits to `main`.
- Image replacement steps are documented in `IMAGE-REPLACEMENT-GUIDE.md`.


## Cloudflare 404 troubleshooting

If `*.pages.dev` returns 404:

- Confirm GitHub branch is `main`.
- Confirm Framework preset is `None`.
- Confirm Build command is `npm run build`.
- Confirm Build output directory is `.`.
- Confirm `index.html` exists at repository root.
- Confirm latest deployment completed successfully.
- Redeploy from Cloudflare Pages dashboard.
