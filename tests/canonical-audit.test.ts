import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, before, test } from 'node:test';
import vm from 'node:vm';
import { createApp } from '../server.ts';
import { CANONICAL_ARTICLES, OFFICIAL_SITE_ORIGIN } from '../server/articles-catalog.ts';
import { renderDynamicArticleHtml } from '../server/news-article-renderer.ts';

let server: http.Server;
let baseUrl: string;

before(async () => {
  const app = await createApp({ attachFrontend: false });
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

function rawGet(reqPath: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; location: string | undefined; body: string }>((resolve, reject) => {
    const target = new URL(baseUrl);
    const req = http.request(
      {
        hostname: target.hostname,
        port: Number(target.port),
        path: reqPath,
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            location: res.headers.location,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('CAN-1. Every built public HTML page and article has a single self-referencing HTTPS www canonical, matching og:url, valid JSON-LD, and zero non-canonical internal links', () => {
  const distDir = path.resolve(process.cwd(), 'dist');

  const expectedPages: Array<{ relFile: string; expectedCanonical: string }> = [
    { relFile: 'index.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/` },
    { relFile: path.join('news', 'index.html'), expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/news/` },
    { relFile: 'about.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/about` },
    { relFile: 'contact.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/contact` },
    { relFile: 'editorial-policy.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/editorial-policy` },
    { relFile: 'privacy.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/privacy` },
    { relFile: 'terms.html', expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/terms` },
    ...CANONICAL_ARTICLES.map((article) => ({
      relFile: path.join('news', `${article.slug}.html`),
      expectedCanonical: `${OFFICIAL_SITE_ORIGIN}/news/${article.slug}`,
    })),
  ];

  // Confirm the three GSC-reported articles are explicitly included in verification
  for (const flaggedSlug of [
    'african-owned-supply-chains',
    'stokvels-and-savings-circles',
    'project-mayibuye-spy-operation',
  ]) {
    assert.ok(
      expectedPages.some((p) => p.expectedCanonical === `${OFFICIAL_SITE_ORIGIN}/news/${flaggedSlug}`),
      `Expected GSC-flagged article in audit list: ${flaggedSlug}`
    );
  }

  for (const page of expectedPages) {
    const absPath = path.join(distDir, page.relFile);
    assert.ok(fs.existsSync(absPath), `Built HTML file missing: dist/${page.relFile}`);
    const html = fs.readFileSync(absPath, 'utf8');

    const canonicalMatches = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/gi)];
    assert.equal(
      canonicalMatches.length,
      1,
      `dist/${page.relFile} must contain exactly one <link rel="canonical"> tag, found ${canonicalMatches.length}`
    );
    const canonicalHref = /href="([^"]+)"/i.exec(canonicalMatches[0][0])?.[1];
    assert.equal(
      canonicalHref,
      page.expectedCanonical,
      `dist/${page.relFile} canonical mismatch: expected ${page.expectedCanonical}, got ${canonicalHref}`
    );

    const ogUrlMatches = [...html.matchAll(/<meta[^>]*property="og:url"[^>]*>/gi)];
    assert.equal(
      ogUrlMatches.length,
      1,
      `dist/${page.relFile} must contain exactly one og:url tag, found ${ogUrlMatches.length}`
    );
    const ogUrlContent = /content="([^"]+)"/i.exec(ogUrlMatches[0][0])?.[1];
    assert.equal(
      ogUrlContent,
      page.expectedCanonical,
      `dist/${page.relFile} og:url mismatch: expected ${page.expectedCanonical}, got ${ogUrlContent}`
    );

    // Zero HTTP or non-www NEF123123 domain references anywhere in the HTML
    assert.equal(
      /https?:\/\/nef123123\.co\.za|http:\/\/www\.nef123123\.co\.za/i.test(html),
      false,
      `dist/${page.relFile} contains non-www or HTTP nef123123.co.za URL`
    );

    // Zero internal .html links or redirecting href="/news" links
    assert.equal(
      /href="\/[^"]*\.html(?:[?#][^"]*)?"/i.test(html),
      false,
      `dist/${page.relFile} contains internal .html link`
    );
    assert.equal(
      /href="\/news"/i.test(html),
      false,
      `dist/${page.relFile} contains redirecting href="/news" link (must use href="/news/")`
    );

    // JSON-LD must parse cleanly and never emit redirecting /news without trailing slash
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(ldBlocks.length >= 1, `dist/${page.relFile} missing JSON-LD structured data`);
    for (const block of ldBlocks) {
      const parsed = JSON.parse(block[1]);
      const serialized = JSON.stringify(parsed);
      assert.equal(
        serialized.includes(`"${OFFICIAL_SITE_ORIGIN}/news"`),
        false,
        `dist/${page.relFile} JSON-LD contains redirecting ${OFFICIAL_SITE_ORIGIN}/news instead of /news/`
      );
      assert.equal(
        /https?:\/\/nef123123\.co\.za|http:\/\/www\.nef123123\.co\.za/i.test(serialized),
        false,
        `dist/${page.relFile} JSON-LD contains non-www or HTTP domain`
      );
    }
  }
});

test('CAN-2. Dynamic SSR article renderer uses canonical HTTPS www URLs and /news/ archive breadcrumbs', () => {
  const sample = CANONICAL_ARTICLES[0];
  const html = renderDynamicArticleHtml(sample, CANONICAL_ARTICLES, { isProduction: false });
  assert.ok(html.includes(`<link rel="canonical" id="canonicalLink" href="${OFFICIAL_SITE_ORIGIN}/news/${sample.slug}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${OFFICIAL_SITE_ORIGIN}/news/${sample.slug}">`));
  assert.ok(html.includes(`"item": "${OFFICIAL_SITE_ORIGIN}/news/"`));
  assert.equal(/href="\/news"/i.test(html), false, 'Dynamic SSR article must link to /news/, not /news');
});

test('CAN-3. Static dist/sitemap.xml, live /sitemap.xml, and news-sitemap.xml contain only canonical indexable URLs (zero redirects/duplicates/.html/admin)', async () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const staticSitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const liveSitemapRes = await rawGet('/sitemap.xml');
  assert.equal(liveSitemapRes.status, 200);

  for (const [label, xml] of [
    ['dist/sitemap.xml', staticSitemap],
    ['live /sitemap.xml', liveSitemapRes.body],
  ] as const) {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(locs.length, 7 + CANONICAL_ARTICLES.length, `${label} unexpected URL count`);
    assert.equal(new Set(locs).size, locs.length, `${label} contains duplicate <loc> entries`);

    assert.ok(locs.includes(`${OFFICIAL_SITE_ORIGIN}/`), `${label} missing homepage`);
    assert.ok(locs.includes(`${OFFICIAL_SITE_ORIGIN}/news/`), `${label} missing canonical /news/`);
    assert.equal(
      locs.includes(`${OFFICIAL_SITE_ORIGIN}/news`),
      false,
      `${label} must NOT include redirecting ${OFFICIAL_SITE_ORIGIN}/news`
    );

    for (const loc of locs) {
      assert.ok(loc.startsWith(`${OFFICIAL_SITE_ORIGIN}/`), `${label} non-canonical origin: ${loc}`);
      assert.equal(/\.html$/i.test(loc), false, `${label} must not contain .html URL: ${loc}`);
      assert.equal(loc.includes('/admin'), false, `${label} must not include /admin: ${loc}`);
      assert.equal(loc.includes('/api/'), false, `${label} must not include /api/: ${loc}`);
    }
  }

  // Admin page stays noindex, nofollow
  const adminHtml = fs.readFileSync(path.join(distDir, 'admin', 'index.html'), 'utf8');
  assert.ok(adminHtml.includes('<meta name="robots" content="noindex, nofollow">'));
});

test('CAN-4. Client-side news/article-seo.js normalizes paths without corrupting /news/index.html or /news/ and removes duplicate canonicals', () => {
  const scriptCode = fs.readFileSync(path.resolve(process.cwd(), 'news', 'article-seo.js'), 'utf8');

  function runArticleSeoAt(pathname: string, duplicateCanonicalCount = 1) {
    const canonicalNodes = Array.from({ length: duplicateCanonicalCount }, () => {
      const attrs: Record<string, string> = { rel: 'canonical', href: 'https://nef123123.co.za/stale' };
      return {
        id: 'canonicalLink',
        removed: false,
        setAttribute(k: string, v: string) {
          attrs[k] = v;
        },
        getAttribute(k: string) {
          return attrs[k];
        },
        remove() {
          this.removed = true;
        },
      };
    });
    const ogAttrs: Record<string, string> = { property: 'og:url', content: 'https://nef123123.co.za/stale' };
    const ogNode = {
      setAttribute(k: string, v: string) {
        ogAttrs[k] = v;
      },
      getAttribute(k: string) {
        return ogAttrs[k];
      },
    };

    const sandbox = {
      window: { location: { pathname } },
      document: {
        head: {
          querySelectorAll(sel: string) {
            if (sel === 'link[rel="canonical"]') return canonicalNodes;
            return [];
          },
          querySelector(sel: string) {
            if (sel === 'meta[property="og:url"]') return ogNode;
            if (sel === 'link[rel="canonical"]') return canonicalNodes[0] || null;
            return null;
          },
          appendChild(node: (typeof canonicalNodes)[0]) {
            canonicalNodes.push(node);
          },
        },
        createElement() {
          const attrs: Record<string, string> = {};
          return {
            id: '',
            removed: false,
            setAttribute(k: string, v: string) {
              attrs[k] = v;
            },
            getAttribute(k: string) {
              return attrs[k];
            },
            remove() {
              this.removed = true;
            },
          };
        },
        getElementById() {
          return null;
        },
      },
      Date,
    };

    vm.runInNewContext(scriptCode, sandbox);
    const activeCanonicals = canonicalNodes.filter((n) => !n.removed);
    return {
      activeCount: activeCanonicals.length,
      canonical: activeCanonicals[0]?.getAttribute('href'),
      ogUrl: ogNode.getAttribute('content'),
    };
  }

  const cases: Array<[string, string]> = [
    ['/', `${OFFICIAL_SITE_ORIGIN}/`],
    ['/index.html', `${OFFICIAL_SITE_ORIGIN}/`],
    ['/news', `${OFFICIAL_SITE_ORIGIN}/news/`],
    ['/news/', `${OFFICIAL_SITE_ORIGIN}/news/`],
    ['/news/index.html', `${OFFICIAL_SITE_ORIGIN}/news/`],
    ['/NEWS/INDEX.HTML', `${OFFICIAL_SITE_ORIGIN}/news/`],
    ['/about.html', `${OFFICIAL_SITE_ORIGIN}/about`],
    ['/about/', `${OFFICIAL_SITE_ORIGIN}/about`],
    ['/news/african-owned-supply-chains.html', `${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains`],
    ['/news/African-Owned-Supply-Chains/', `${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains`],
    ['/news/stokvels-and-savings-circles', `${OFFICIAL_SITE_ORIGIN}/news/stokvels-and-savings-circles`],
    ['/news/project-mayibuye-spy-operation.html', `${OFFICIAL_SITE_ORIGIN}/news/project-mayibuye-spy-operation`],
  ];

  for (const [inputPath, expected] of cases) {
    const result = runArticleSeoAt(inputPath, 2);
    assert.equal(result.activeCount, 1, `Duplicate canonical not removed for ${inputPath}`);
    assert.equal(result.canonical, expected, `Canonical mismatch for ${inputPath}`);
    assert.equal(result.ogUrl, expected, `og:url mismatch for ${inputPath}`);
  }
});

test('CAN-5. Express server enforces permanent 301 redirects for HTTP, non-www, /news, /news/index.html, .html, trailing-slash, and uppercase article URLs', async () => {
  // HTTP and non-www permanent 301 redirects for homepage and all 3 GSC-flagged articles
  const hostRedirectCases: Array<[string, Record<string, string>, string]> = [
    ['/', { Host: 'www.nef123123.co.za', 'X-Forwarded-Proto': 'http' }, `${OFFICIAL_SITE_ORIGIN}/`],
    ['/', { Host: 'nef123123.co.za', 'X-Forwarded-Proto': 'http' }, `${OFFICIAL_SITE_ORIGIN}/`],
    ['/', { Host: 'nef123123.co.za', 'X-Forwarded-Proto': 'https' }, `${OFFICIAL_SITE_ORIGIN}/`],
    [
      '/news/african-owned-supply-chains',
      { Host: 'nef123123.co.za', 'X-Forwarded-Proto': 'https' },
      `${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains`,
    ],
    [
      '/news/stokvels-and-savings-circles',
      { Host: 'nef123123.co.za', 'X-Forwarded-Proto': 'https' },
      `${OFFICIAL_SITE_ORIGIN}/news/stokvels-and-savings-circles`,
    ],
    [
      '/news/project-mayibuye-spy-operation',
      { Host: 'www.nef123123.co.za', 'X-Forwarded-Proto': 'http' },
      `${OFFICIAL_SITE_ORIGIN}/news/project-mayibuye-spy-operation`,
    ],
  ];

  for (const [reqPath, headers, expectedLocation] of hostRedirectCases) {
    const res = await rawGet(reqPath, headers);
    assert.equal(res.status, 301, `Expected 301 for ${JSON.stringify(headers)} ${reqPath}`);
    assert.equal(res.location, expectedLocation);
  }

  // Path-level permanent 301 redirects matching GitHub Pages canonical structure
  const pathRedirectCases: Array<[string, string]> = [
    ['/index.html', '/'],
    ['/news', '/news/'],
    ['/news/index.html', '/news/'],
    ['/about.html', '/about'],
    ['/about/', '/about'],
    ['/contact.html', '/contact'],
    ['/news/african-owned-supply-chains.html', '/news/african-owned-supply-chains'],
    ['/news/african-owned-supply-chains/', '/news/african-owned-supply-chains'],
    ['/news/African-Owned-Supply-Chains', '/news/african-owned-supply-chains'],
    ['/news/stokvels-and-savings-circles.html', '/news/stokvels-and-savings-circles'],
    ['/news/project-mayibuye-spy-operation.html', '/news/project-mayibuye-spy-operation'],
  ];

  for (const [reqPath, expectedLocation] of pathRedirectCases) {
    const res = await rawGet(reqPath);
    assert.equal(res.status, 301, `Expected 301 for ${reqPath}, got ${res.status}`);
    assert.equal(res.location, expectedLocation, `Wrong 301 Location for ${reqPath}`);
  }

  // Canonical endpoints return HTTP 200 with self-referencing canonical tags
  const newsArchiveRes = await rawGet('/news/');
  assert.equal(newsArchiveRes.status, 200);
  assert.ok(newsArchiveRes.body.includes(`<link rel="canonical" id="canonicalLink" href="${OFFICIAL_SITE_ORIGIN}/news/">`));

  for (const slug of [
    'african-owned-supply-chains',
    'stokvels-and-savings-circles',
    'project-mayibuye-spy-operation',
  ]) {
    const res = await rawGet(`/news/${slug}`);
    assert.equal(res.status, 200, `Expected 200 for /news/${slug}`);
    assert.ok(
      res.body.includes(`<link rel="canonical" id="canonicalLink" href="${OFFICIAL_SITE_ORIGIN}/news/${slug}">`),
      `Missing self-referencing canonical on /news/${slug}`
    );
  }
});
