#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Routes to prerender (should match sitemap routes)
const routes = ['/', '/sheet', '/lookup', '/sequencer', '/about'];
const previewPort = process.env.PREVIEW_PORT || 5174;
const previewUrl = `http://localhost:${previewPort}`;

function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      http.get(url, (res) => {
        resolve(true);
      }).on('error', (err) => {
        if (Date.now() - start > timeout) return reject(new Error('Server did not start in time'));
        setTimeout(poll, 300);
      });
    })();
  });
}

async function run() {
  console.log('Starting preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(previewPort)], { stdio: 'inherit' });

  try {
    await waitForServer(previewUrl);
    console.log('Preview server ready at', previewUrl);
  } catch (err) {
    console.error('Preview server failed to start:', err);
    preview.kill('SIGKILL');
    process.exit(1);
  }

  // Lazy-load Playwright to avoid failing on install-less environments
  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('Playwright not installed. Run `npm i -D playwright` and try again.');
    preview.kill('SIGKILL');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  for (const route of routes) {
    const url = previewUrl.replace(/\/$/, '') + (route === '/' ? '/' : route);
    console.log('Prerendering', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();

    const outDir = path.join(process.cwd(), 'dist', route === '/' ? '' : route.replace(/^\//, ''));
    const fileDir = route === '/' ? path.join(process.cwd(), 'dist') : path.join(outDir, '');

    const writeDir = route === '/' ? path.join(process.cwd(), 'dist') : path.join(process.cwd(), 'dist', route.replace(/^\//, ''), '');
    try {
      if (route === '/') {
        fs.writeFileSync(path.join(process.cwd(), 'dist', 'index.html'), html, 'utf8');
      } else {
        const dir = path.join(process.cwd(), 'dist', route.replace(/^\//, ''));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
      }
      console.log('Wrote prerendered file for', route);
    } catch (err) {
      console.error('Failed to write prerendered file for', route, err);
    }
  }

  await browser.close();
  preview.kill('SIGKILL');
  console.log('Prerender complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
