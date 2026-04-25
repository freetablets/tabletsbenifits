#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'image-manifest.json');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'generated');
const GENERATED_MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSvgFallback(entry) {
  const out = path.join(OUT_DIR, entry.filename.replace(/\.webp$/i, '.svg'));
  const w = entry.width;
  const h = entry.height;
  const title = entry.title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const kind = entry.kind === 'infographic' ? 'Infographic Placeholder' : 'Image Placeholder';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">\n` +
    `  <rect width="${w}" height="${h}" fill="#e9f0f7"/>\n` +
    `  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="18" fill="#dce8f5"/>\n` +
    `  <text x="48" y="${Math.round(h * 0.2)}" font-size="${Math.max(22, Math.round(w * 0.03))}" fill="#14233b" font-family="Arial">${kind}</text>\n` +
    `  <text x="48" y="${Math.round(h * 0.32)}" font-size="${Math.max(18, Math.round(w * 0.022))}" fill="#2f5ea8" font-family="Arial">${title}</text>\n` +
    `</svg>\n`;
  fs.writeFileSync(out, svg, 'utf8');
  return path.relative(ROOT, out).replace(/\\/g, '/');
}

async function tryOpenAIGenerate(entry, apiKey) {
  const endpoint = 'https://api.openai.com/v1/images/generations';
  // Use nearest supported size and keep final dimensions in HTML attributes.
  const size = entry.kind === 'infographic' ? '1024x1024' : '1536x1024';
  const body = {
    model: 'gpt-image-1',
    prompt: entry.prompt,
    size,
    quality: 'high'
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`OpenAI image generation failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI image response missing b64_json payload');
  }

  const out = path.join(OUT_DIR, entry.filename.replace(/\.webp$/i, '.png'));
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  return path.relative(ROOT, out).replace(/\\/g, '/');
}

async function main() {
  ensureDir(OUT_DIR);
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('scripts/image-manifest.json not found');
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const apiKey = process.env.OPENAI_API_KEY;
  const generated = [];

  for (const entry of manifest) {
    let filePath;
    if (apiKey) {
      try {
        filePath = await tryOpenAIGenerate(entry, apiKey);
      } catch (err) {
        console.warn(`[images] OpenAI generation failed for ${entry.id}, falling back to SVG: ${err.message}`);
        filePath = writeSvgFallback(entry);
      }
    } else {
      filePath = writeSvgFallback(entry);
    }

    generated.push({
      ...entry,
      generatedPath: `/${filePath}`
    });
    console.log(`[images] ready ${entry.id} -> /${filePath}`);
  }

  fs.writeFileSync(GENERATED_MANIFEST_PATH, JSON.stringify(generated, null, 2));
  console.log(`[images] wrote ${GENERATED_MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
