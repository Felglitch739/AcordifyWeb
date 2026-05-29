#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Base URL for the site. Prefer SITE_URL env var, fallback to VITE_SITE_URL, then localhost.
const baseUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173';

// Routes to include in the sitemap. Add more routes as you add pages.
const routes = [
  '/',
  '/sheet',
  '/lookup',
  '/sequencer',
  '/about'
];

function buildSitemapXml(urls) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  const footer = '</urlset>';

  const body = urls.map((u) => {
    const loc = `${baseUrl.replace(/\/$/, '')}${u}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`;
  }).join('\n');

  return header + body + '\n' + footer;
}

function writeSitemap() {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const xml = buildSitemapXml(routes);
    const outPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(outPath, xml, { encoding: 'utf8' });
    console.log('Sitemap written to', outPath);
  } catch (err) {
    console.error('Failed to write sitemap:', err);
    process.exitCode = 1;
  }
}

writeSitemap();
