#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
  console.log('Starting static file server from dist/ ...');

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(distDir, urlPath);

      // If path is directory or ends with '/', serve index.html
      if (filePath.endsWith(path.sep) || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // If file not found, fallback to dist/index.html (SPA fallback)
      if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.json': 'application/json',
        '.woff2': 'font/woff2'
      }[ext] || 'application/octet-stream';

      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  await new Promise((resolve, reject) => {
    server.listen(previewPort, (err) => {
      if (err) return reject(err);
      console.log('Static server listening at', previewUrl);
      resolve();
    });
  });

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

  // Base site URL for canonical links / JSON-LD
  const siteBase = process.env.SITE_URL || process.env.VITE_SITE_URL || previewUrl.replace(/\/$/, '');

  // Per-route metadata to inject into prerendered HTML
  const routeMeta = {
    '/': {
      title: 'Acordify — Busca acordes, genera letras y practica',
      description: 'Acordify: herramientas para músicos — búsqueda de acordes, transpositor, secuenciador y notebook ChordPro.',
      keywords: 'acordes, chordpro, guitarra, letras, transpositor, secuenciador'
    },
    '/sheet': {
      title: 'ChordPro Notebook — Acordify',
      description: 'Editor ChordPro para escribir y practicar tus canciones. Modo edición, asistente IA y autosave.',
      keywords: 'chordpro, notebook, editor, acordes'
    },
    '/lookup': {
      title: 'Song Lookup — Buscar acordes en la web — Acordify',
      description: 'Busca acordes y partituras en la web. Resultado en formato ChordPro listo para cargar en el notebook.',
      keywords: 'buscar acordes, song lookup, chord chart, chords'
    },
    '/sequencer': {
      title: 'Loop Player & Sequencer — Acordify',
      description: 'Controla loops, exporta/importa secuencias y reproduce patrones para practicar.',
      keywords: 'secuenciador, loop player, practice'
    },
    '/about': {
      title: 'Acerca de Acordify',
      description: 'Información sobre Acordify — misión, equipo y contacto.',
      keywords: 'acordify, about, contacto'
    }
  };

  for (const route of routes) {
    const url = previewUrl.replace(/\/$/, '') + (route === '/' ? '/' : route);
    console.log('Prerendering', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    let html = await page.content();

    // Inject route-specific meta tags and JSON-LD into <head>
    try {
      const meta = routeMeta[route] || routeMeta['/'];

      // Replace or insert <title>
      if (/<title>[\s\S]*?<\/title>/i.test(html)) {
        html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`);
      } else {
        html = html.replace(/<head>/i, `<head>\n    <title>${meta.title}</title>`);
      }

      // Replace description & keywords if present
      if (/<meta\s+name=["']description["'][\s\S]*?>/i.test(html)) {
        html = html.replace(/<meta\s+name=["']description["'][\s\S]*?>/i, `<meta name="description" content="${meta.description}" />`);
      }
      if (/<meta\s+name=["']keywords["'][\s\S]*?>/i.test(html)) {
        html = html.replace(/<meta\s+name=["']keywords["'][\s\S]*?>/i, `<meta name="keywords" content="${meta.keywords}" />`);
      }

      // Prepare OG / Twitter / JSON-LD block
      const ogBlock = `\n    <meta property="og:title" content="${meta.title}" />\n    <meta property="og:description" content="${meta.description}" />\n    <meta property="og:url" content="${siteBase}${route === '/' ? '' : route}" />\n    <meta property="og:image" content="${siteBase}/favicon.svg" />\n    <meta name="twitter:title" content="${meta.title}" />\n    <meta name="twitter:description" content="${meta.description}" />\n    <meta name="twitter:image" content="${siteBase}/favicon.svg" />\n`;

      // JSON-LD: use SearchAction on lookup, WebPage otherwise
      let jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": meta.title,
        "description": meta.description,
        "url": `${siteBase}${route === '/' ? '' : route}`
      };

      if (route === '/lookup') {
        jsonLd.potentialAction = {
          "@type": "SearchAction",
          "target": `${siteBase}/lookup?query={search_term_string}`,
          "query-input": "required name=search_term_string"
        };
      }

      const jsonLdScript = `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`;

      // Insert OG block and JSON-LD before </head>
      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, ogBlock + jsonLdScript + '\n</head>');
      } else {
        html = html + ogBlock + jsonLdScript;
      }
    } catch (injectErr) {
      console.warn('Failed to inject route meta for', route, injectErr);
    }

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
  server.close();
  console.log('Prerender complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
