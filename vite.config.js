import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const newsDir = path.resolve(__dirname, 'news');

function getMultiPageInputs() {
  const inputs = {
    main: path.resolve(__dirname, 'index.html'),
  };
  if (fs.existsSync(newsDir)) {
    for (const file of fs.readdirSync(newsDir)) {
      if (file.endsWith('.html')) {
        const slug = file.replace(/\.html$/i, '');
        inputs[`news-${slug}`] = path.resolve(newsDir, file);
      }
    }
  }
  return inputs;
}

function cleanNewsUrlMiddleware(baseDir) {
  return (req, _res, next) => {
    if (!req.url) return next();
    const [pathname, query] = req.url.split('?');
    if (/^\/news\/[a-z0-9-]+\/?$/i.test(pathname)) {
      const normalized = pathname.replace(/\/+$/, '');
      const candidateFile = path.join(baseDir, `${normalized}.html`);
      if (fs.existsSync(candidateFile)) {
        req.url = `${normalized}.html${query ? `?${query}` : ''}`;
      }
    }
    next();
  };
}

export default defineConfig({
  plugins: [
    {
      name: 'nef123123-clean-news-urls',
      configureServer(server) {
        server.middlewares.use(cleanNewsUrlMiddleware(__dirname));
      },
      configurePreviewServer(server) {
        server.middlewares.use(cleanNewsUrlMiddleware(path.resolve(__dirname, 'dist')));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: getMultiPageInputs(),
    },
  },
});
