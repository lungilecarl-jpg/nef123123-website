import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const newsDir = path.resolve(__dirname, 'news');

const STATIC_ROOT_PAGES = ['about', 'contact', 'privacy', 'terms', 'editorial-policy'];

function getMultiPageInputs() {
  const inputs = {
    main: path.resolve(__dirname, 'index.html'),
  };
  for (const page of STATIC_ROOT_PAGES) {
    const filePath = path.resolve(__dirname, `${page}.html`);
    if (fs.existsSync(filePath)) {
      inputs[page] = filePath;
    }
  }
  const adminHtml = path.resolve(__dirname, 'admin', 'index.html');
  if (fs.existsSync(adminHtml)) {
    inputs.admin = adminHtml;
  }
  if (fs.existsSync(newsDir)) {
    for (const file of fs.readdirSync(newsDir)) {
      if (file.endsWith('.html')) {
        const slug = file.replace(/\.html$/i, '');
        inputs[slug === 'index' ? 'news-index' : `news-${slug}`] = path.resolve(newsDir, file);
      }
    }
  }
  return inputs;
}

function cleanNewsUrlMiddleware(baseDir) {
  return (req, _res, next) => {
    if (!req.url) return next();
    const [pathname, query] = req.url.split('?');
    const normalizedRoot = pathname.replace(/\/+$/, '').toLowerCase();
    if (/^\/admin\/?$/i.test(pathname)) {
      const adminCandidate = path.join(baseDir, 'admin', 'index.html');
      if (fs.existsSync(adminCandidate)) {
        req.url = `/admin/index.html${query ? `?${query}` : ''}`;
      }
    } else if (/^\/news\/?$/i.test(pathname)) {
      const archiveCandidate = path.join(baseDir, 'news', 'index.html');
      if (fs.existsSync(archiveCandidate)) {
        req.url = `/news/index.html${query ? `?${query}` : ''}`;
      }
    } else if (STATIC_ROOT_PAGES.includes(normalizedRoot.slice(1))) {
      const pageCandidate = path.join(baseDir, `${normalizedRoot.slice(1)}.html`);
      if (fs.existsSync(pageCandidate)) {
        req.url = `/${normalizedRoot.slice(1)}.html${query ? `?${query}` : ''}`;
      }
    } else if (/^\/news\/[a-z0-9-]+\/?$/i.test(pathname)) {
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
