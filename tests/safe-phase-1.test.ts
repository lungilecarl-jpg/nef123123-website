import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from '../server.ts';
import { CANONICAL_ARTICLES, OFFICIAL_SITE_ORIGIN } from '../server/articles-catalog.ts';
import {
  submitSitemapsToGoogleSearchConsole,
  submitUrlsToIndexNow,
} from '../server/seo-distribution.ts';

let server: Server;
let baseUrl = '';

test.before(async () => {
  const app = await createApp({ attachFrontend: false });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      assert.ok(addr && typeof addr === 'object');
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('1. /sitemap.xml serves valid XML with homepage and all 13 canonical article URLs', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/xml/i);
  const xml = await res.text();
  assert.ok(xml.includes(`<loc>${OFFICIAL_SITE_ORIGIN}/</loc>`));
  for (const article of CANONICAL_ARTICLES) {
    assert.ok(
      xml.includes(`<loc>${article.canonicalUrl}</loc>`),
      `Missing canonical URL in sitemap.xml: ${article.canonicalUrl}`
    );
  }
  assert.equal(CANONICAL_ARTICLES.length, 13);
});

test('2. /news-sitemap.xml serves valid Google News 0.9 XML (48h default & includeAll preview)', async () => {
  const resDefault = await fetch(`${baseUrl}/news-sitemap.xml`);
  assert.equal(resDefault.status, 200);
  assert.match(resDefault.headers.get('content-type') || '', /application\/xml/i);
  const xmlDefault = await resDefault.text();
  assert.ok(xmlDefault.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"'));

  const resPreview = await fetch(`${baseUrl}/news-sitemap.xml?includeAll=1`);
  assert.equal(resPreview.status, 200);
  const xmlPreview = await resPreview.text();
  assert.ok(xmlPreview.includes('<news:name>NEF123123</news:name>'));
  assert.ok(xmlPreview.includes('<news:language>en</news:language>'));
  assert.ok(
    xmlPreview.includes(
      `<loc>${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains</loc>`
    )
  );
});

test('3. /rss.xml serves valid RSS 2.0 + Atom feed with all 13 articles', async () => {
  const res = await fetch(`${baseUrl}/rss.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/rss\+xml/i);
  const rss = await res.text();
  assert.ok(rss.includes('<rss version="2.0"'));
  assert.ok(rss.includes(`${OFFICIAL_SITE_ORIGIN}/rss.xml`));
  for (const article of CANONICAL_ARTICLES) {
    assert.ok(rss.includes(`<link>${article.canonicalUrl}</link>`));
  }
});

test('4. /robots.txt advertises both sitemap.xml and news-sitemap.xml', async () => {
  const res = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes(`Sitemap: ${OFFICIAL_SITE_ORIGIN}/sitemap.xml`));
  assert.ok(body.includes(`Sitemap: ${OFFICIAL_SITE_ORIGIN}/news-sitemap.xml`));
});

test('5. IndexNow key route serves configured key and rejects mismatches', async () => {
  const prev = process.env.INDEXNOW_KEY;
  try {
    process.env.INDEXNOW_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
    const okRes = await fetch(`${baseUrl}/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.txt`);
    assert.equal(okRes.status, 200);
    assert.equal(await okRes.text(), 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');

    const badRes = await fetch(`${baseUrl}/wrongkey12345678.txt`);
    assert.equal(badRes.status, 404);
  } finally {
    if (prev === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = prev;
  }
});

test('6. /api/public/config reports Safe Phase 1 disabled safeguards and zero secrets', async () => {
  const res = await fetch(`${baseUrl}/api/public/config`);
  assert.equal(res.status, 200);
  const text = await res.text();
  const data = JSON.parse(text);
  assert.equal(data.phase, 'safe-phase-1');
  assert.equal(data.liveSubscriberSystemEnabled, false);
  assert.equal(data.durableStorageConnected, false);
  assert.equal(data.articleCount, 13);
  assert.equal(text.includes('VAPID_PRIVATE_KEY'), false);
  assert.equal(text.includes('RESEND_API_KEY'), false);
});

test('7. All live subscriber & push endpoints are server-locked with HTTP 503', async () => {
  const lockedRoutes: Array<{ method: string; path: string; body?: object }> = [
    { method: 'POST', path: '/api/subscribers/email', body: { email: 'reader@example.com' } },
    { method: 'GET', path: '/api/subscribers/verify?token=fake' },
    { method: 'GET', path: '/api/subscribers/unsubscribe?token=fake' },
    { method: 'POST', path: '/api/subscribers/unsubscribe', body: { token: 'fake' } },
    { method: 'POST', path: '/api/push/subscribe', body: { endpoint: 'https://example.com' } },
    { method: 'POST', path: '/api/push/unsubscribe', body: { endpoint: 'https://example.com' } },
  ];

  for (const route of lockedRoutes) {
    const res = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: route.body ? { 'Content-Type': 'application/json' } : undefined,
      body: route.body ? JSON.stringify(route.body) : undefined,
    });
    assert.equal(res.status, 503, `Expected 503 for ${route.method} ${route.path}`);
    const payload = await res.json();
    assert.equal(payload.error, 'durable_storage_required');
    assert.equal(payload.liveSubscriberSystemEnabled, false);
  }
});

test('8. All /api/admin/* endpoints reject unauthenticated and forged tokens with 401', async () => {
  const adminRoutes: Array<{ method: string; path: string }> = [
    { method: 'GET', path: '/api/admin/me' },
    { method: 'GET', path: '/api/admin/overview' },
    { method: 'GET', path: '/api/admin/search-submissions' },
    { method: 'POST', path: '/api/admin/seo/indexnow' },
    { method: 'POST', path: '/api/admin/seo/gsc-sitemaps' },
    { method: 'GET', path: '/api/admin/subscribers' },
    { method: 'POST', path: '/api/admin/alerts/approve-send' },
  ];

  for (const route of adminRoutes) {
    const noAuthRes = await fetch(`${baseUrl}${route.path}`, { method: route.method });
    assert.equal(noAuthRes.status, 401, `Expected 401 (no auth) for ${route.path}`);

    const forgedRes = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: { Authorization: 'Bearer forged.jwt.token' },
    });
    assert.equal(forgedRes.status, 401, `Expected 401 (forged token) for ${route.path}`);
  }
});

test('9. IndexNow idles safely when unconfigured and GSC API stays disabled in Safe Phase 1', async () => {
  const prevIndexNow = process.env.INDEXNOW_KEY;
  try {
    delete process.env.INDEXNOW_KEY;

    const inRes = await submitUrlsToIndexNow([`${OFFICIAL_SITE_ORIGIN}/`], 'manual_submit');
    assert.equal(inRes.status, 'skipped_unconfigured');

    const gscRes = await submitSitemapsToGoogleSearchConsole('sitemap_submit');
    assert.equal(gscRes.status, 'disabled_phase_1');
    assert.equal(gscRes.attempts, 0);
  } finally {
    if (prevIndexNow !== undefined) process.env.INDEXNOW_KEY = prevIndexNow;
  }
});

test('10. Zero temporary SQLite files and zero Firestore rule/config modifications exist', () => {
  const rootFiles = fs.readdirSync(process.cwd());
  assert.equal(
    rootFiles.some((f) => f.endsWith('.sqlite') || f.endsWith('.db')),
    false,
    'No SQLite database file should be created in Safe Phase 1'
  );
  assert.equal(rootFiles.includes('firestore.rules'), false);
  assert.equal(rootFiles.includes('firebase-applet-config.json'), false);
});

test('11. Built dist/ contains homepage, /admin, all 13 news pages, and zero leaked secrets', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html missing');
  assert.ok(fs.existsSync(path.join(distDir, 'admin', 'index.html')), 'dist/admin/index.html missing');
  assert.ok(fs.existsSync(path.join(distDir, 'sw.js')), 'dist/sw.js missing');

  for (const article of CANONICAL_ARTICLES) {
    const htmlPath = path.join(distDir, 'news', `${article.slug}.html`);
    assert.ok(fs.existsSync(htmlPath), `Missing built canonical article: ${htmlPath}`);
  }

  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const forbidden = [
      'RESEND_API_KEY',
      'VAPID_PRIVATE_KEY',
      'GSC_CLIENT_SECRET',
      'GSC_REFRESH_TOKEN',
      'SUBSCRIBER_TOKEN_SECRET',
    ];
    for (const file of fs.readdirSync(assetsDir)) {
      if (!file.endsWith('.js')) continue;
      const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
      for (const secretName of forbidden) {
        assert.equal(
          content.includes(secretName),
          false,
          `Secret identifier ${secretName} leaked into built frontend bundle ${file}`
        );
      }
    }
  }
});

test('12. .env.example excludes Phase 2 credentials and Phase 2 docs exist', () => {
  const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
  assert.ok(envExample.includes('LIVE_SUBSCRIBER_SYSTEM_ENABLED=false'));
  assert.ok(envExample.includes('GSC_API_ENABLED=false'));
  assert.ok(envExample.includes('EMAIL_ALERTS_ENABLED=false'));
  assert.ok(envExample.includes('BROWSER_PUSH_ENABLED=false'));

  const disallowedPhase1Prompts = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'SUBSCRIBER_TOKEN_SECRET',
    'GSC_CLIENT_ID',
    'GSC_CLIENT_SECRET',
    'GSC_REFRESH_TOKEN',
  ];
  for (const keyName of disallowedPhase1Prompts) {
    assert.equal(
      envExample.includes(keyName),
      false,
      `.env.example must not prompt for ${keyName} during Safe Phase 1`
    );
  }

  const docsPath = path.resolve(process.cwd(), 'docs', 'PHASE_2_INTEGRATIONS.md');
  assert.ok(fs.existsSync(docsPath), 'docs/PHASE_2_INTEGRATIONS.md should exist');
});
