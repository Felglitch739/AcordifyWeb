import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { GET as inspirationGet, POST as inspirationPost } from './api/inspiration.js';

function localApiDevPlugin(): Plugin {
  return {
    name: 'acordify-local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
      }
      if (env.GEMINI_MODEL && !process.env.GEMINI_MODEL) {
        process.env.GEMINI_MODEL = env.GEMINI_MODEL;
      }

      server.middlewares.use('/api/inspiration', async (req, res, next) => {
        if (req.method === 'GET') {
          const webRes = await inspirationGet();
          res.statusCode = webRes.status;
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(await webRes.text());
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const webReq = new Request('http://localhost/api/inspiration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: rawBody,
          });
          const webRes = await inspirationPost(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const text = await webRes.text();
          res.end(text);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Local API proxy error',
            }),
          );
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiDevPlugin()],
});
