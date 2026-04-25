# Image Replacement Guide

You can create all final images manually and upload them later to GitHub.

## Where image files live

- `assets/images/final/home/`
- `assets/images/final/posts/`
- `assets/images/final/infographics/`

## Required source of truth

Use `image-manifest.json` for:

- exact filenames
- required folder per image
- page URL mapping
- dimensions
- alt text
- title text

## Replacement workflow

1. Create your real images manually.
2. Save each image using the exact filename listed in `image-manifest.json`.
3. Upload files inside `assets/images/final/` in the correct subfolder using the same filenames.
4. Commit and push changes to `main` on GitHub.
5. Cloudflare Pages will automatically redeploy from GitHub.

## Important behavior

- If filenames stay the same, HTML does not need to change.
- If you rename files, update both `image-manifest.json` and the corresponding HTML `src` paths.
- This Codex update intentionally avoids committing binary image files.
