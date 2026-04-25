#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const FINAL_SUPPORT = ['/apply/','/eligibility/','/providers/','/documents/','/lifeline/','/about/','/contact/','/editorial-policy/','/privacy-policy/','/terms/'];
const FINAL_ARTICLES = ['/government-tablet/','/ebt-tablet/','/medicaid-tablet/','/phone-tablet-bundle/','/lifeline-tablet/','/low-income-tablet/','/food-stamps-tablet/','/airtalk-tablet/','/qlink-tablet/','/assurance-tablet/','/standup-tablet/','/truconnect-tablet/','/safelink-tablet/','/tablet-documents/','/acp-tablet-update/'];
const FINAL_INDEXABLE = new Set(['/'].concat(FINAL_SUPPORT, FINAL_ARTICLES));

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

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

const checks = [];
function assert(name, condition, details = []) {
  checks.push({ name, ok: Boolean(condition), details });
}

function parseUrlsFromSitemap(sitemapXml) {
  const urls = [];
  const re = /<loc>https:\/\/freetabletbenefit\.com([^<]*)<\/loc>/g;
  let m;
  while ((m = re.exec(sitemapXml))) urls.push(m[1]);
  return urls;
}

function run() {
  const htmlFiles = allFiles('.html');
  const textFiles = allFiles('.html').concat(allFiles('.md')).concat(allFiles('.txt')).concat(allFiles('.xml')).concat(allFiles('.css')).concat(allFiles('.js'));

  // duplicate cleanup existence
  const postsDir = path.join(ROOT, 'posts');
  const pagesDir = path.join(ROOT, 'pages');
  const legacyPosts = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter((f) => f.endsWith('.html')) : [];
  const legacyPages = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')) : [];
  assert('No duplicate legacy /posts/*.html articles', legacyPosts.length === 0, legacyPosts);
  assert('No duplicate legacy /pages/*.html support pages', legacyPages.length === 0, legacyPages);

  const brokenLinks = [];
  const missingImages = [];
  const missingFinalImagesWarnings = [];
  const duplicateH1 = [];
  const missingMeta = [];
  const badJsonLd = [];
  const badFaqSchema = [];
  const badSchemaTypes = [];
  const imageAttrIssues = [];
  const homepageHeroIssues = [];
  const articleImageLoadingIssues = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const fileRel = rel(file);

    const required = [
      ['title', /<title>[^<]+<\/title>/i],
      ['meta description', /<meta\s+name="description"\s+content="[^"]+"/i],
      ['canonical', /<link\s+rel="canonical"\s+href="[^"]+"/i],
      ['og:title', /property="og:title"/i],
      ['og:description', /property="og:description"/i],
      ['og:type', /property="og:type"/i],
      ['og:url', /property="og:url"/i],
      ['twitter:card', /name="twitter:card"/i],
      ['twitter:title', /name="twitter:title"/i],
      ['twitter:description', /name="twitter:description"/i]
    ];
    for (const [name, re] of required) {
      if (!re.test(html)) missingMeta.push(`${fileRel}: missing ${name}`);
    }

    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) duplicateH1.push(`${fileRel}: h1 count ${h1Count}`);

    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|#)/i.test(href)) continue;
      let target = href.startsWith('/') ? path.join(ROOT, href.slice(1)) : path.join(path.dirname(file), href);
      if (href.endsWith('/')) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) brokenLinks.push(`${fileRel} -> ${href}`);
    }

    for (const m of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi)) {
      const tag = m[0];
      const src = m[1];
      if (!/\balt="[^"]*"/i.test(tag) || !/\btitle="[^"]*"/i.test(tag) || !/\bwidth="\d+"/i.test(tag) || !/\bheight="\d+"/i.test(tag)) {
        imageAttrIssues.push(`${fileRel}: image missing alt/title/width/height`);
      }
      if (fileRel === 'index.html' && /homepage-hero\.(webp|svg)/i.test(src) && !/\bfetchpriority="high"/i.test(tag)) {
        homepageHeroIssues.push(`${fileRel}: homepage hero missing fetchpriority=\"high\"`);
      }
      if (fileRel !== 'index.html' && /\/(posts|infographics)\//i.test(src) && !/\bloading="lazy"/i.test(tag)) {
        articleImageLoadingIssues.push(`${fileRel}: article image missing loading=\"lazy\"`);
      }
      if (!/^https?:/i.test(src)) {
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

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const raw = m[1].trim();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { badJsonLd.push(`${fileRel}: invalid JSON-LD`); continue; }
      const types = Array.isArray(parsed) ? parsed.map((x) => x['@type']) : [parsed['@type']];
      if (types.includes('Review') || types.includes('AggregateRating')) badSchemaTypes.push(`${fileRel}: disallowed schema type`);
      if (types.includes('FAQPage')) {
        const hasVisibleFaq = /<details>[\s\S]*?<summary>/i.test(html) || />FAQs</i.test(html) || />FAQ</i.test(html);
        if (!hasVisibleFaq) badFaqSchema.push(`${fileRel}: FAQPage schema without visible FAQ`);
      }
    }
  }

  assert('No broken internal links', brokenLinks.length === 0, brokenLinks.slice(0, 20));
  assert('No missing non-final image files', missingImages.length === 0, missingImages.slice(0, 20));
  assert('No duplicate or missing H1', duplicateH1.length === 0, duplicateH1.slice(0, 20));
  assert('Required SEO meta present on all HTML pages', missingMeta.length === 0, missingMeta.slice(0, 20));
  assert('JSON-LD parses correctly', badJsonLd.length === 0, badJsonLd.slice(0, 20));
  assert('No Review or AggregateRating schema', badSchemaTypes.length === 0, badSchemaTypes.slice(0, 20));
  assert('FAQPage schema only when visible FAQs exist', badFaqSchema.length === 0, badFaqSchema.slice(0, 20));
  assert('All images include alt/title/width/height', imageAttrIssues.length === 0, imageAttrIssues.slice(0, 20));
  assert('Homepage hero has fetchpriority=\"high\"', homepageHeroIssues.length === 0, homepageHeroIssues.slice(0, 20));
  assert('Article images use loading=\"lazy\"', articleImageLoadingIssues.length === 0, articleImageLoadingIssues.slice(0, 20));

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = new Set(parseUrlsFromSitemap(sitemap));
  const missingFromSitemap = [...FINAL_INDEXABLE].filter((u) => !sitemapUrls.has(u));
  const extraInSitemap = [...sitemapUrls].filter((u) => !FINAL_INDEXABLE.has(u));
  assert('Sitemap contains only final indexable URLs', missingFromSitemap.length === 0 && extraInSitemap.length === 0, [
    ...missingFromSitemap.map((u) => `missing ${u}`),
    ...extraInSitemap.map((u) => `extra ${u}`)
  ]);

  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert('Robots allows crawling and includes sitemap', /Allow:\s*\//i.test(robots) && /Sitemap:\s*https:\/\/freetabletbenefit\.com\/sitemap\.xml/i.test(robots), [robots]);

  const policyViolations = [];
  const acpEndedDatePattern = /june 1,\s*2024/i;
  const acpEndedOnPattern = /acp ended on\s+[^.\n<]+/gi;
  for (const file of textFiles) {
    const r = rel(file);
    if (r.startsWith('scripts/') || r.startsWith('.github/') || r.startsWith('node_modules/')) continue;
    const txt = fs.readFileSync(file, 'utf8');
    const l = txt.toLowerCase();
    if (txt.includes('\u2014')) policyViolations.push(`${r}: contains em dash`);
    if (l.includes('lorem ipsum')) policyViolations.push(`${r}: lorem ipsum`);
    if (l.includes('acp is active')) policyViolations.push(`${r}: ACP active claim`);
    if (l.includes('acp ended on')) {
      for (const match of txt.match(acpEndedOnPattern) || []) {
        if (!acpEndedDatePattern.test(match)) {
          policyViolations.push(`${r}: ACP ended date must be June 1, 2024`);
          break;
        }
      }
    }
    if (l.includes('everyone qualifies')) policyViolations.push(`${r}: everyone qualifies wording`);
    if (l.includes('john doe') || l.includes('jane doe')) policyViolations.push(`${r}: placeholder author name`);
    if (l.includes('official government partner') || l.includes('government approved distributor')) policyViolations.push(`${r}: fake government claim pattern`);
  }
  assert('Policy scan clean (em dash, ACP active, fake claims, placeholders)', policyViolations.length === 0, policyViolations.slice(0, 20));

  const failed = checks.filter((c) => !c.ok);
  console.log('QA REPORT');
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    console.log(`- ${mark}: ${c.name}`);
    if (!c.ok && c.details.length) {
      for (const d of c.details.slice(0, 10)) console.log(`  * ${d}`);
    }
  }
  if (missingFinalImagesWarnings.length) {
    console.log(`- WARN: Missing final images are allowed until manual upload (${missingFinalImagesWarnings.length})`);
    for (const d of missingFinalImagesWarnings.slice(0, 10)) console.log(`  * ${d}`);
  }

  if (failed.length) {
    console.error(`\nQA FAILED: ${failed.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nQA PASSED: all checks passed.');
}

run();
