#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GEN_MANIFEST_PATH = path.join(ROOT, 'assets', 'images', 'generated', 'manifest.json');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, data) { fs.writeFileSync(file, data); }

function ensureImageAttrs(tag, attrs) {
  let out = tag;
  const setAttr = (name, value) => {
    const re = new RegExp(`${name}="[^"]*"`, 'i');
    if (re.test(out)) out = out.replace(re, `${name}="${value}"`);
    else out = out.replace('<img', `<img ${name}="${value}"`);
  };
  for (const [k, v] of Object.entries(attrs)) setAttr(k, v);
  return out;
}

function applyToArticle(filePath, entryMap) {
  let html = read(filePath);
  for (const entry of entryMap) {
    if (!entry.pageUrl || entry.pageUrl === '/') continue;
    const slug = entry.pageUrl.replace(/^\//, '').replace(/\/$/, '');
    if (!filePath.includes(path.join(ROOT, slug, 'index.html'))) continue;

    const base = slug;
    const kind = entry.kind;
    const oldPattern = kind === 'featured' ? `${base}-featured` : `${base}-infographic`;
    const imgRe = new RegExp(`<img[^>]*src="[^"]*${oldPattern}[^\"]*"[^>]*>`, 'i');
    const m = html.match(imgRe);
    if (m) {
      let tag = m[0].replace(/src="[^"]*"/, `src="${entry.generatedPath}"`);
      tag = ensureImageAttrs(tag, {
        alt: entry.alt,
        title: entry.title,
        width: entry.width,
        height: entry.height,
        loading: 'lazy'
      });
      html = html.replace(m[0], tag);
    }
  }
  write(filePath, html);
}

function ensureHomepageHeroImage(indexPath, heroEntry) {
  let html = read(indexPath);
  if (html.includes('id="homepage-hero-image"')) {
    // refresh attrs and src
    html = html.replace(/<img[^>]*id="homepage-hero-image"[^>]*>/i, (tag) => {
      let out = tag.replace(/src="[^"]*"/i, `src="${heroEntry.generatedPath}"`);
      out = ensureImageAttrs(out, {
        id: 'homepage-hero-image',
        alt: heroEntry.alt,
        title: heroEntry.title,
        width: heroEntry.width,
        height: heroEntry.height,
        fetchpriority: 'high'
      });
      return out;
    });
  } else {
    const insert = `\n      <figure class="image-note">\n` +
      `        <img id="homepage-hero-image" src="${heroEntry.generatedPath}" alt="${heroEntry.alt}" title="${heroEntry.title}" width="${heroEntry.width}" height="${heroEntry.height}" fetchpriority="high">\n` +
      `        <figcaption>Homepage hero visual</figcaption>\n` +
      `      </figure>\n`;
    html = html.replace(/(<p class="lead">[\s\S]*?<\/p>)/, `$1${insert}`);
  }
  write(indexPath, html);
}

function collectTopArticleFiles() {
  const dirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      const ignore = new Set(['assets', 'scripts', '.github', 'node_modules']);
      if (ignore.has(name)) return false;
      return fs.existsSync(path.join(ROOT, name, 'index.html'));
    });

  // only post routes from manifest page URLs except support pages
  return dirs.map((d) => path.join(ROOT, d, 'index.html'));
}

function verifyNoMissingImageRefs() {
  const htmlFiles = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && p.endsWith('.html')) htmlFiles.push(p);
    }
  };
  walk(ROOT);

  const missing = [];
  for (const file of htmlFiles) {
    const html = read(file);
    const matches = html.matchAll(/<img[^>]*src="([^"]+)"/g);
    for (const m of matches) {
      const src = m[1];
      if (src.startsWith('http')) continue;
      const local = path.join(ROOT, src.replace(/^\//, ''));
      if (!fs.existsSync(local)) missing.push({ file, src });
    }
  }

  if (missing.length) {
    console.error('[apply-images] missing image references detected:');
    for (const x of missing) console.error(`- ${path.relative(ROOT, x.file)} -> ${x.src}`);
    process.exit(1);
  }
}

function main() {
  if (!fs.existsSync(GEN_MANIFEST_PATH)) {
    throw new Error('Generated manifest not found. Run scripts/generate-images.js first.');
  }
  const manifest = JSON.parse(read(GEN_MANIFEST_PATH));

  const heroEntry = manifest.find((m) => m.id === 'homepage-hero');
  if (!heroEntry) throw new Error('homepage-hero entry missing in generated manifest');

  ensureHomepageHeroImage(path.join(ROOT, 'index.html'), heroEntry);

  const articleEntries = manifest.filter((m) => m.pageUrl !== '/');
  const files = collectTopArticleFiles();
  for (const file of files) applyToArticle(file, articleEntries);

  verifyNoMissingImageRefs();
  console.log('[apply-images] image paths and attributes updated successfully');
}

main();
