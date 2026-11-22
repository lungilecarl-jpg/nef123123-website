import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http, { type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.ts';
import {
  CANONICAL_ARTICLES,
  OFFICIAL_SITE_ORIGIN,
  TOPIC_FEEDS,
  deduplicateArticlesBySlug,
  getArticlesByTopic,
  getCanonicalArticles,
  type CanonicalNewsArticle,
  type TopicFeedKey,
} from '../server/articles-catalog.ts';
import {
  auditGoogleNewsReadiness,
  buildAtomFeedXml,
  buildGoogleNewsSitemapXml,
  buildJsonFeed,
  buildRssFeedXml,
  buildSitemapXml,
  escapeXml,
  pingWebSubHub,
  submitUrlsToIndexNow,
} from '../server/seo-distribution.ts';
import {
  deduplicateRawArticles,
  removeOrphanedNewsHtml,
} from '../scripts/generate-seo-pages.mjs';

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

test('P2-1. Unified data/articles-catalog.json loads 13 articles with +02:00 timestamps, topics & Discover-ready images', () => {
  const raw = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data', 'articles-catalog.json'), 'utf8')
  );
  assert.equal(raw.length, 13);
  assert.equal(CANONICAL_ARTICLES.length, 13);

  for (const article of CANONICAL_ARTICLES) {
    assert.match(
      article.publishedDate,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+02:00$/,
      `Expected +02:00 ISO timestamp for ${article.slug}`
    );
    assert.ok(article.topics.length >= 1, `Missing topics for ${article.slug}`);
    assert.ok(article.keywords.length >= 3, `Missing keywords for ${article.slug}`);
    if (article.imageUrl.includes('images.unsplash.com')) {
      assert.ok(
        article.imageUrl.includes('w=1200'),
        `Expected Unsplash w=1200 for Discover readiness on ${article.slug}`
      );
    }
  }
});

test('P2-2. Google News Sitemap enforces strict 48-hour window and emits <image:image> tags', () => {
  const nowMs = Date.parse('2026-05-01T12:00:00Z');
  const sampleBase = CANONICAL_ARTICLES[0];
  const synthetic: CanonicalNewsArticle[] = [
    {
      ...sampleBase,
      slug: 'fresh-breaking-story',
      canonicalUrl: `${OFFICIAL_SITE_ORIGIN}/news/fresh-breaking-story`,
      title: 'Fresh Breaking Report Within 48 Hours',
      publishedDate: '2026-05-01T10:00:00+02:00', // ~4h ago
      updatedDate: '2026-05-01T10:00:00+02:00',
    },
    {
      ...sampleBase,
      slug: 'archive-older-story',
      canonicalUrl: `${OFFICIAL_SITE_ORIGIN}/news/archive-older-story`,
      title: 'Archive Report Older Than 48 Hours',
      publishedDate: '2026-04-28T08:00:00+02:00', // >72h ago
      updatedDate: '2026-04-28T08:00:00+02:00',
    },
  ];

  const strictXml = buildGoogleNewsSitemapXml(synthetic, { nowMs, includeAll: false });
  assert.ok(strictXml.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"'));
  assert.ok(strictXml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  assert.ok(strictXml.includes('/news/fresh-breaking-story'));
  assert.ok(strictXml.includes('<image:loc>'));
  assert.equal(strictXml.includes('/news/archive-older-story'), false);

  const previewXml = buildGoogleNewsSitemapXml(synthetic, { nowMs, includeAll: true });
  assert.ok(previewXml.includes('/news/fresh-breaking-story'));
  assert.ok(previewXml.includes('/news/archive-older-story'));
});

test('P2-3. /sitemap.xml includes Google image sitemap namespace and <image:image> for all 13 articles', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.ok(xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  for (const article of CANONICAL_ARTICLES) {
    assert.ok(
      xml.includes(`<image:loc>${escapeXml(article.imageUrl)}</image:loc>`),
      `Missing <image:loc> for ${article.slug}`
    );
  }
});

test('P2-4. /rss.xml embeds WebSub hub link and Media RSS tags', async () => {
  const res = await fetch(`${baseUrl}/rss.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/rss\+xml/i);
  const rss = await res.text();
  assert.ok(rss.includes('xmlns:media="http://search.yahoo.com/mrss/"'));
  assert.ok(rss.includes('rel="hub"'));
  assert.ok(rss.includes('<media:content '));
});

test('P2-5. /atom.xml serves valid Atom 1.0 feed with WebSub hub link and all 13 entries', async () => {
  const res = await fetch(`${baseUrl}/atom.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/atom\+xml/i);
  const xml = await res.text();
  assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom"'));
  assert.ok(xml.includes('xml:lang="en-ZA"'));
  assert.ok(xml.includes(`href="${OFFICIAL_SITE_ORIGIN}/atom.xml" rel="self"`));
  assert.ok(xml.includes('rel="hub"'));
  for (const article of CANONICAL_ARTICLES) {
    assert.ok(xml.includes(`<id>${article.canonicalUrl}</id>`));
  }
});

test('P2-6. /feed.json serves valid JSON Feed 1.1 with WebSub hubs and all 13 items', async () => {
  const res = await fetch(`${baseUrl}/feed.json`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/feed\+json/i);
  const feed = await res.json();
  assert.equal(feed.version, 'https://jsonfeed.org/version/1.1');
  assert.equal(feed.home_page_url, `${OFFICIAL_SITE_ORIGIN}/`);
  assert.equal(feed.feed_url, `${OFFICIAL_SITE_ORIGIN}/feed.json`);
  assert.equal(feed.language, 'en-ZA');
  assert.ok(Array.isArray(feed.hubs) && feed.hubs[0]?.type === 'WebSub');
  assert.equal(feed.items.length, 13);
  for (const item of feed.items) {
    assert.ok(item.id.startsWith(`${OFFICIAL_SITE_ORIGIN}/news/`));
    assert.ok(typeof item.content_text === 'string' && item.content_text.length > 50);
    assert.ok(typeof item.date_published === 'string' && item.date_published.includes('+02:00'));
  }
});

test('P2-7. All 4 topic RSS feeds serve filtered articles and unknown topic returns 404', async () => {
  const topics = Object.keys(TOPIC_FEEDS) as TopicFeedKey[];
  assert.deepEqual(topics.sort(), ['africa', 'economy', 'parliament', 'south-africa']);

  for (const topic of topics) {
    const res = await fetch(`${baseUrl}/rss/${topic}.xml`);
    assert.equal(res.status, 200, `Expected 200 for /rss/${topic}.xml`);
    assert.match(res.headers.get('content-type') || '', /application\/rss\+xml/i);
    const xml = await res.text();
    assert.ok(xml.includes(`${OFFICIAL_SITE_ORIGIN}/rss/${topic}.xml`));
    const expectedArticles = getArticlesByTopic(topic);
    assert.ok(expectedArticles.length > 0, `Topic ${topic} should have articles`);
    for (const article of expectedArticles) {
      assert.ok(
        xml.includes(`<link>${article.canonicalUrl}</link>`),
        `Topic ${topic} missing ${article.slug}`
      );
    }
  }

  const badRes = await fetch(`${baseUrl}/rss/nonexistent-topic.xml`);
  assert.equal(badRes.status, 404);
});

test('P2-8. WebSub hub ping defaults to disabled_default and sends valid form payload with retry when enabled against mock hub', async () => {
  const prevEnabled = process.env.WEBSUB_PING_ENABLED;
  try {
    delete process.env.WEBSUB_PING_ENABLED;
    const disabledRes = await pingWebSubHub();
    assert.equal(disabledRes.status, 'disabled_default');
    assert.equal(disabledRes.attempts, 0);
  } finally {
    if (prevEnabled !== undefined) process.env.WEBSUB_PING_ENABLED = prevEnabled;
  }

  // Start local mock WebSub hub that returns 503 once, then 204
  let callCount = 0;
  let capturedBody = '';
  let capturedContentType = '';
  const mockHub = http.createServer((req, res) => {
    callCount++;
    capturedContentType = String(req.headers['content-type'] || '');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      capturedBody = Buffer.concat(chunks).toString('utf8');
      if (callCount === 1) {
        res.writeHead(503);
        res.end('Temporary hub overload');
      } else {
        res.writeHead(204);
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) => mockHub.listen(0, '127.0.0.1', () => resolve()));
  const addr = mockHub.address();
  assert.ok(addr && typeof addr === 'object');
  const mockHubUrl = `http://127.0.0.1:${addr.port}/hub`;

  try {
    const liveRes = await pingWebSubHub(
      [
        `${OFFICIAL_SITE_ORIGIN}/rss.xml`,
        `${OFFICIAL_SITE_ORIGIN}/atom.xml`,
        'https://evil.example.com/spoof.xml',
      ],
      { hubUrl: mockHubUrl, allowLocalTestHub: true, forceEnableForTest: true }
    );
    assert.equal(liveRes.status, 'success');
    assert.equal(liveRes.httpStatus, 204);
    assert.equal(liveRes.attempts, 2);
    assert.equal(liveRes.submittedUrls.length, 2);
    assert.match(capturedContentType, /application\/x-www-form-urlencoded/i);
    const params = new URLSearchParams(capturedBody);
    assert.equal(params.get('hub.mode'), 'publish');
    assert.deepEqual(params.getAll('hub.url'), [
      `${OFFICIAL_SITE_ORIGIN}/rss.xml`,
      `${OFFICIAL_SITE_ORIGIN}/atom.xml`,
    ]);
  } finally {
    await new Promise<void>((resolve) => mockHub.close(() => resolve()));
  }
});

test('P2-9. IndexNow sends exact JSON payload and filters foreign-origin URLs against mock endpoint', async () => {
  let capturedJson: Record<string, unknown> | null = null;
  const mockIndexNow = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      capturedJson = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      res.writeHead(202);
      res.end('Accepted');
    });
  });

  await new Promise<void>((resolve) => mockIndexNow.listen(0, '127.0.0.1', () => resolve()));
  const addr = mockIndexNow.address();
  assert.ok(addr && typeof addr === 'object');
  const mockEndpoint = `http://127.0.0.1:${addr.port}/indexnow`;

  const prevKey = process.env.INDEXNOW_KEY;
  try {
    process.env.INDEXNOW_KEY = 'phase2testkey1234567890abcdef12';
    const result = await submitUrlsToIndexNow(
      [
        `${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains`,
        'https://malicious.example.org/phish',
      ],
      'manual_submit',
      { endpointUrl: mockEndpoint, allowLocalTestEndpoint: true }
    );
    assert.equal(result.status, 'success');
    assert.equal(result.httpStatus, 202);
    assert.ok(capturedJson);
    assert.equal(capturedJson.host, 'www.nef123123.co.za');
    assert.equal(capturedJson.key, 'phase2testkey1234567890abcdef12');
    assert.equal(
      capturedJson.keyLocation,
      `${OFFICIAL_SITE_ORIGIN}/phase2testkey1234567890abcdef12.txt`
    );
    assert.deepEqual(capturedJson.urlList, [
      `${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains`,
    ]);
  } finally {
    if (prevKey === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = prevKey;
    await new Promise<void>((resolve) => mockIndexNow.close(() => resolve()));
  }
});

test('P2-10. Google News & Discover readiness audit scores all 13 canonical articles ready', () => {
  const report = auditGoogleNewsReadiness(CANONICAL_ARTICLES);
  assert.equal(report.totalArticles, 13);
  assert.equal(report.readyCount, 13);
  assert.equal(report.advisoryCount, 0);
  assert.equal(report.engines.googleSearchConsoleApiEnabled, false);
  assert.equal(report.feeds.atom, '/atom.xml');
  assert.equal(report.feeds.jsonFeed, '/feed.json');
});

test('P2-11. Built dist/index.html and all 13 dist/news/*.html pages carry Google News/Discover metadata & NewsArticle JSON-LD', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('max-image-preview:large, max-snippet:-1, max-video-preview:-1'),
    'dist/index.html missing Google Discover robots directive'
  );
  assert.ok(indexHtml.includes('application/rss+xml'));
  assert.ok(indexHtml.includes('application/atom+xml'));
  assert.ok(indexHtml.includes('application/feed+json'));

  for (const article of CANONICAL_ARTICLES) {
    const html = fs.readFileSync(path.join(distDir, 'news', `${article.slug}.html`), 'utf8');
    assert.ok(
      html.includes('max-image-preview:large, max-snippet:-1, max-video-preview:-1'),
      `${article.slug} missing Discover robots directive`
    );
    assert.ok(html.includes('application/rss+xml'), `${article.slug} missing RSS link`);
    assert.ok(html.includes('application/atom+xml'), `${article.slug} missing Atom link`);
    assert.ok(html.includes('application/feed+json'), `${article.slug} missing JSON Feed link`);
    assert.ok(
      html.includes(`property="article:published_time" content="${article.publishedDate}"`),
      `${article.slug} missing +02:00 published_time`
    );
    assert.ok(
      html.includes(`property="article:modified_time" content="${article.updatedDate}"`),
      `${article.slug} missing +02:00 modified_time`
    );

    const ldMatch = /<script type="application\/ld\+json" id="structuredData">([\s\S]*?)<\/script>/.exec(
      html
    );
    assert.ok(ldMatch, `${article.slug} missing JSON-LD script`);
    const parsed = JSON.parse(ldMatch[1]);
    const newsNode = parsed['@graph'].find((n: Record<string, unknown>) => n['@type'] === 'NewsArticle');
    assert.ok(newsNode, `${article.slug} missing NewsArticle node`);
    assert.equal(newsNode.inLanguage, 'en-ZA');
    assert.equal(newsNode.isAccessibleForFree, true);
    assert.equal(newsNode.datePublished, article.publishedDate);
    assert.equal(newsNode.dateModified, article.updatedDate);
    assert.equal(newsNode.publisher['@type'], 'NewsMediaOrganization');
  }
});

test('P2-12. Phase 2 admin endpoints require admin auth (401) and /api/public/config exposes feeds with subscriber locks intact', async () => {
  const readinessNoAuth = await fetch(`${baseUrl}/api/admin/seo/readiness`);
  assert.equal(readinessNoAuth.status, 401);

  const websubNoAuth = await fetch(`${baseUrl}/api/admin/seo/websub`, { method: 'POST' });
  assert.equal(websubNoAuth.status, 401);

  const websubForged = await fetch(`${baseUrl}/api/admin/seo/websub`, {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid.forged.token' },
  });
  assert.equal(websubForged.status, 401);

  const pubRes = await fetch(`${baseUrl}/api/public/config`);
  assert.equal(pubRes.status, 200);
  const cfg = await pubRes.json();
  assert.equal(cfg.syndicationPhase, 'phase-2-stateless');
  assert.equal(cfg.liveSubscriberSystemEnabled, false);
  assert.equal(cfg.durableStorageConnected, false);
  assert.equal(cfg.feeds.atom, '/atom.xml');
  assert.equal(cfg.feeds.jsonFeed, '/feed.json');
  assert.equal(cfg.feeds.topicFeeds['south-africa'], '/rss/south-africa.xml');
});

test('P2-13. Duplicate slug prevention deduplicates articles across sitemaps, RSS, Atom, JSON Feed, and readiness audit', () => {
  const baseArticle = CANONICAL_ARTICLES[0];
  const olderVersion: CanonicalNewsArticle = {
    ...baseArticle,
    title: 'Older Duplicate Headline Version',
    publishedDate: '2026-05-01T08:00:00+02:00',
    updatedDate: '2026-05-01T08:00:00+02:00',
  };
  const newerVersion: CanonicalNewsArticle = {
    ...baseArticle,
    title: 'Newer Updated Headline Version',
    publishedDate: '2026-05-01T08:00:00+02:00',
    updatedDate: '2026-05-01T10:30:00+02:00',
  };
  const secondArticle = CANONICAL_ARTICLES[1];

  const withDuplicates = [olderVersion, secondArticle, newerVersion];
  const deduped = deduplicateArticlesBySlug(withDuplicates);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].title, 'Newer Updated Headline Version');

  const sitemap = buildSitemapXml(withDuplicates);
  assert.equal((sitemap.match(new RegExp(baseArticle.canonicalUrl, 'g')) || []).length, 1);
  assert.ok(sitemap.includes('Newer Updated Headline Version'));
  assert.equal(sitemap.includes('Older Duplicate Headline Version'), false);

  const newsSitemap = buildGoogleNewsSitemapXml(withDuplicates, { includeAll: true });
  assert.equal((newsSitemap.match(/<url>/g) || []).length, 2);

  const rss = buildRssFeedXml(withDuplicates);
  assert.equal((rss.match(/<item>/g) || []).length, 2);
  assert.ok(rss.includes('Newer Updated Headline Version'));

  const atom = buildAtomFeedXml(withDuplicates);
  assert.equal((atom.match(/<entry>/g) || []).length, 2);
  assert.ok(atom.includes('Newer Updated Headline Version'));

  const jsonFeed = buildJsonFeed(withDuplicates) as { items: Array<{ title: string }> };
  assert.equal(jsonFeed.items.length, 2);

  const audit = auditGoogleNewsReadiness(withDuplicates);
  assert.equal(audit.totalArticles, 2);

  const rawDeduped = deduplicateRawArticles([
    { slug: 'dup-slug', title: 'Old', publishedDate: '2026-05-01T08:00:00+02:00' },
    { slug: 'dup-slug', title: 'New', publishedDate: '2026-05-01T09:00:00+02:00' },
  ]);
  assert.equal(rawDeduped.length, 1);
  assert.equal(rawDeduped[0].title, 'New');
});

test('P2-14. Orphaned news HTML cleanup removes deleted-article HTML only and preserves active pages and JS assets', () => {
  const tempNewsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nef-news-cleanup-'));
  try {
    fs.writeFileSync(path.join(tempNewsDir, 'active-story.html'), '<html>active</html>');
    fs.writeFileSync(path.join(tempNewsDir, 'removed-story.html'), '<html>orphan</html>');
    fs.writeFileSync(path.join(tempNewsDir, 'article-seo.js'), '// keep js asset');

    const removed = removeOrphanedNewsHtml(tempNewsDir, ['active-story']);
    assert.deepEqual(removed, ['removed-story.html']);
    assert.equal(fs.existsSync(path.join(tempNewsDir, 'removed-story.html')), false);
    assert.equal(fs.existsSync(path.join(tempNewsDir, 'active-story.html')), true);
    assert.equal(fs.existsSync(path.join(tempNewsDir, 'article-seo.js')), true);
  } finally {
    fs.rmSync(tempNewsDir, { recursive: true, force: true });
  }
});

test('P2-15. getCanonicalArticles() returns deduplicated catalog of 13 unique articles', () => {
  const articles = getCanonicalArticles();
  assert.equal(articles.length, 13);
  const uniqueSlugs = new Set(articles.map((a) => a.slug.toLowerCase()));
  assert.equal(uniqueSlugs.size, 13);
});

