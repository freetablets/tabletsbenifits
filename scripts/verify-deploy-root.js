#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const REQUIRED_ROOT_FILES = ['index.html', 'robots.txt', 'sitemap.xml'];
const REQUIRED_ROOT_DIRS = ['assets'];

const REQUIRED_ROUTE_DIRS = [
  'apply',
  'eligibility',
  'providers',
  'documents',
  'lifeline',
  'about',
  'contact',
  'editorial-policy',
  'privacy-policy',
  'terms',
  'government-tablet',
  'ebt-tablet',
  'medicaid-tablet',
  'phone-tablet-bundle',
  'lifeline-tablet',
  'low-income-tablet',
  'food-stamps-tablet',
  'airtalk-tablet',
  'qlink-tablet',
  'assurance-tablet',
  'standup-tablet',
  'truconnect-tablet',
  'safelink-tablet',
  'tablet-documents',
  'acp-tablet-update'
];

function allFiles(ext) {
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '.git') continue;
        walk(p);
      } else if (ent.isFile() && p.endsWith(ext)) {
        out.push(p);
      }
    }
  };
  walk(ROOT);
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

const failures = [];

for (const file of REQUIRED_ROOT_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    failures.push(`Missing root file: ${file}`);
  }
}

for (const dir of REQUIRED_ROOT_DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    failures.push(`Missing root folder: ${dir}/`);
  }
}

for (const routeDir of REQUIRED_ROUTE_DIRS) {
  const indexPath = path.join(ROOT, routeDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    failures.push(`Missing route index: /${routeDir}/index.html`);
  }
}

const htmlFiles = allFiles('.html');
const brokenLinks = [];
const missingImages = [];
const missingFinalImagesWarnings = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const fileRel = rel(file);

  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    let target = href.startsWith('/') ? path.join(ROOT, href.slice(1)) : path.join(path.dirname(file), href);
    if (href.endsWith('/')) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) brokenLinks.push(`${fileRel} -> ${href}`);
  }

  for (const m of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi)) {
    const src = m[1];
    if (/^https?:/i.test(src)) continue;
    const abs = path.join(ROOT, src.replace(/^\//, ''));
    if (!fs.existsSync(abs)) {
      if (/^\/assets\/images\/final\//i.test(src)) {
        missingFinalImagesWarnings.push(`${fileRel} -> ${src}`);
      } else {
        missingImages.push(`${fileRel} -> ${src}`);
      }
    }
  }
}

if (brokenLinks.length) {
  failures.push(`Broken internal links detected: ${brokenLinks.length}`);
  failures.push(...brokenLinks.slice(0, 20));
}

if (missingImages.length) {
  failures.push(`Missing local images detected: ${missingImages.length}`);
  failures.push(...missingImages.slice(0, 20));
}

if (failures.length) {
  console.error('DEPLOY ROOT VERIFICATION FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('DEPLOY ROOT VERIFICATION PASSED');
console.log(`- Root files present: ${REQUIRED_ROOT_FILES.join(', ')}`);
console.log(`- Required route index files present: ${REQUIRED_ROUTE_DIRS.length}`);
console.log('- No broken internal links');
console.log('- No missing non-final local images');
if (missingFinalImagesWarnings.length) {
  console.log(`- WARN: Missing final images are allowed until manual upload (${missingFinalImagesWarnings.length})`);
  for (const item of missingFinalImagesWarnings.slice(0, 10)) console.log(`  * ${item}`);
}
