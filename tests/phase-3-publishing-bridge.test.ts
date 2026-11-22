import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http, { type Server } from 'node:http';
import path from 'node:path';
import { createApp, DURABLE_STORAGE_CONNECTED } from '../server.ts';
import { CANONICAL_ARTICLES, OFFICIAL_SITE_ORIGIN } from '../server/articles-catalog.ts';
import {
  ExternalPublishingBridge,
  PUBLISHING_CONTRACT_VERSION,
  signApprovedArticlePayload,
  signRemovedSlugPayload,
  validatePublishingFeedUrl,
  type ExternalPublishingFeedPayload,
} from '../server/external-publishing-source.ts';

const TEST_APPROVAL_SECRET = 'nef123123-test-hmac-approval-secret-0123456789abcdef';
const TEST_ADMIN_EMAIL = 'lungile.carl@gmail.com';
const TEST_FEED_TOKEN = 'test-bearer-token-987654321';

function recentIso(minutesAgo = 15): string {
  const dt = new Date(Date.now() - minutesAgo * 60 * 1000);
  // Format with explicit +02:00 SAST offset
  const sast = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  return sast.toISOString().replace(/\.\d{3}Z$/, '+02:00');
}

function makeSignedArticle(
  overrides: Partial<{
    id: string;
    slug: string;
    approvalStatus: string;
    approvedBy: string;
    approvedAt: string;
    title: string;
    seoTitle: string;
    metaDescription: string;
    category: string;
    topics: string[];
    keywords: string[];
    publishedAt: string;
    updatedAt: string;
    imageUrl: string;
    imageAlt: string;
    author: string;
    source: string;
    paragraphs: string[];
    externalUrl: string;
    externalLabel: string;
  }> = {},
  secret: string = TEST_APPROVAL_SECRET
) {
  const publishedAt = overrides.publishedAt || recentIso(20);
  const base = {
    id: overrides.id || 'intel-2026-phase3-001',
    slug: overrides.slug || 'parliament-energy-oversight-report-2026',
    approvalStatus: overrides.approvalStatus || 'approved',
    approvedBy: overrides.approvedBy || TEST_ADMIN_EMAIL,
    approvedAt: overrides.approvedAt || recentIso(10),
    title:
      overrides.title ||
      'Parliament Energy Oversight Committee Releases 2026 Grid Accountability Report',
    seoTitle:
      overrides.seoTitle || 'Parliament Energy Oversight Report 2026 | NEF123123 News',
    metaDescription:
      overrides.metaDescription ||
      "South Africa's Parliamentary energy committee publishes binding municipal grid reliability benchmarks and local industrial supply accountability targets.",
    category: overrides.category || 'Parliament & Legislation',
    topics: overrides.topics || ['south-africa', 'parliament', 'economy'],
    keywords: overrides.keywords || ['South Africa Parliament', 'energy oversight', 'NEF123123'],
    publishedAt,
    updatedAt: overrides.updatedAt || publishedAt,
    imageUrl:
      overrides.imageUrl ||
      'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=85',
    imageAlt: overrides.imageAlt || 'Parliament of South Africa chambers during energy oversight',
    author: overrides.author || 'NEF123123 Editorial Desk',
    source: overrides.source || 'NEF123123 Intelligence Desk — Parliamentary Oversight Review',
    paragraphs: overrides.paragraphs || [
      'Cape Town — The Parliamentary portfolio committee on energy and public accountability has released its 2026 oversight report detailing municipal grid reliability benchmarks across South Africa.',
      'The report outlines binding maintenance schedules, transparent procurement reporting, and priority power allocation for local manufacturing hubs.',
    ],
    ...(overrides.externalUrl ? { externalUrl: overrides.externalUrl } : {}),
    ...(overrides.externalLabel ? { externalLabel: overrides.externalLabel } : {}),
  };

  const approvalSignature = signApprovedArticlePayload(base, secret);
  return { ...base, approvalSignature };
}

interface MockFeedServerHandle {
  url: string;
  requestCount: () => number;
  lastAuthHeader: () => string | undefined;
  setHandler: (
    fn: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ) => void;
  close: () => Promise<void>;
}

async function startMockFeedServer(): Promise<MockFeedServerHandle> {
  let hits = 0;
  let lastAuth: string | undefined;
  let currentHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void = (
    _req,
    res
  ) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        schemaVersion: PUBLISHING_CONTRACT_VERSION,
        source: 'Mock Intelligence Desk',
        generatedAt: recentIso(1),
        articles: [],
      })
    );
  };

  const srv = http.createServer((req, res) => {
    hits += 1;
    lastAuth = req.headers.authorization;
    currentHandler(req, res);
  });

  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
  const addr = srv.address();
  assert.ok(addr && typeof addr === 'object');
  const url = `http://127.0.0.1:${addr.port}/approved-feed.json`;

  return {
    url,
    requestCount: () => hits,
    lastAuthHeader: () => lastAuth,
    setHandler: (fn) => {
      currentHandler = fn;
    },
    close: () =>
      new Promise<void>((resolve, reject) => srv.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function startAppServer(bridge: ExternalPublishingBridge): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const app = await createApp({ attachFrontend: false, publishingBridge: bridge });
  let srv: Server;
  await new Promise<void>((resolve) => {
    srv = app.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = srv!.address();
  assert.ok(addr && typeof addr === 'object');
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => srv!.close((err) => (err ? reject(err) : resolve()))),
  };
}

test('P3-1. Bridge stays safely disabled by default with ZERO outbound calls and ZERO timers', async () => {
  const mock = await startMockFeedServer();
  try {
    const bridge = new ExternalPublishingBridge({
      enabled: false,
      feedUrl: mock.url,
      approvalSecret: TEST_APPROVAL_SECRET,
      allowedApprovers: [TEST_ADMIN_EMAIL],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
    });

    assert.equal(bridge.startPolling(), false);
    const result = await bridge.syncNow();
    assert.equal(result.outcome, 'disabled');
    assert.equal(result.state, 'disabled_by_flag');
    assert.equal(result.outboundFetchPerformed, false);
    assert.equal(mock.requestCount(), 0);
    assert.equal(bridge.getStatus().outboundRequestCount, 0);
    assert.equal(bridge.getStatus().outboundFetchesAllowed, false);
  } finally {
    await mock.close();
  }
});

test('P3-2. Partial configuration (missing URL or missing/weak server approval secret) remains disabled with ZERO outbound calls', async () => {
  const mock = await startMockFeedServer();
  try {
    const noUrlBridge = new ExternalPublishingBridge({
      enabled: true,
      feedUrl: '',
      approvalSecret: TEST_APPROVAL_SECRET,
      allowedApprovers: [TEST_ADMIN_EMAIL],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
    });
    const resNoUrl = await noUrlBridge.syncNow();
    assert.equal(resNoUrl.outcome, 'disabled');
    assert.equal(resNoUrl.state, 'disabled_unconfigured');
    assert.equal(resNoUrl.outboundFetchPerformed, false);

    const noSecretBridge = new ExternalPublishingBridge({
      enabled: true,
      feedUrl: mock.url,
      approvalSecret: 'too-short',
      allowedApprovers: [TEST_ADMIN_EMAIL],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
    });
    const resNoSecret = await noSecretBridge.syncNow();
    assert.equal(resNoSecret.outcome, 'disabled');
    assert.equal(resNoSecret.state, 'disabled_missing_approval_secret');
    assert.equal(resNoSecret.outboundFetchPerformed, false);
    assert.equal(mock.requestCount(), 0);
  } finally {
    await mock.close();
  }
});

test('P3-3. SSRF & non-HTTPS URL validation blocks insecure, loopback, private, and cloud-metadata endpoints', () => {
  const blockedUrls = [
    'http://feeds.nef123123.co.za/approved.json',
    'https://localhost/feed.json',
    'https://127.0.0.1/feed.json',
    'https://169.254.169.254/computeMetadata/v1/',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://10.0.0.5/feed.json',
    'https://172.16.0.10/feed.json',
    'https://192.168.1.50/feed.json',
    'https://user:pass@feeds.nef123123.co.za/approved.json',
    'https://[::1]/feed.json',
    'javascript:alert(1)',
  ];
  for (const candidate of blockedUrls) {
    const check = validatePublishingFeedUrl(candidate);
    assert.equal(check.valid, false, `Expected URL to be blocked: ${candidate}`);
  }

  const validCheck = validatePublishingFeedUrl('https://desk.nef123123.co.za/api/approved.json');
  assert.equal(validCheck.valid, true);
});

test('P3-4. Unapproved articles (draft, pending, in_review, ai_generated, rejected, missing status) are strictly rejected', async () => {
  const mock = await startMockFeedServer();
  try {
    const statuses = ['draft', 'pending', 'in_review', 'ai_generated', 'rejected', ''];
    const payload: ExternalPublishingFeedPayload = {
      schemaVersion: PUBLISHING_CONTRACT_VERSION,
      source: 'Mock Intelligence Desk',
      generatedAt: recentIso(1),
      articles: statuses.map((st, idx) =>
        makeSignedArticle({
          id: `unapproved-${idx}`,
          slug: `unapproved-article-${idx}`,
          approvalStatus: st || 'draft',
        })
      ),
    };
    // Blank out the last status explicitly
    payload.articles[payload.articles.length - 1].approvalStatus = '';

    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    });

    const bridge = new ExternalPublishingBridge({
      enabled: true,
      feedUrl: mock.url,
      approvalSecret: TEST_APPROVAL_SECRET,
      allowedApprovers: [TEST_ADMIN_EMAIL],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
    });
    const result = await bridge.syncNow();
    assert.equal(result.outcome, 'synced');
    assert.equal(result.approvedCount, 0);
    assert.equal(result.rejectedCount, statuses.length);
    assert.equal(bridge.getApprovedArticles().length, 0);
    assert.ok(result.rejections.some((r) => r.reason === 'missing_approval_status'));
    assert.ok(result.rejections.some((r) => r.reason === 'unapproved_status'));
  } finally {
    await mock.close();
  }
});

test('P3-5 & P3-6. Server-side approval verification rejects missing signature, forged signature, tampered content, and unauthorized approver', async () => {
  const mock = await startMockFeedServer();
  try {
    const valid = makeSignedArticle({
      id: 'valid-001',
      slug: 'valid-server-verified-dispatch',
    });

    // 1. Plain JSON "approvalStatus: approved" with NO signature
    const missingSig = { ...makeSignedArticle({ id: 'nosig-001', slug: 'missing-sig-article' }) };
    delete (missingSig as { approvalSignature?: string }).approvalSignature;

    // 2. Forged signature (signed with wrong secret)
    const forgedSig = makeSignedArticle(
      { id: 'forged-001', slug: 'forged-sig-article' },
      'wrong-secret-0123456789abcdefghijklmnopqrstuvwxyz'
    );

    // 3. Valid signature, but headline tampered AFTER signing
    const tampered = makeSignedArticle({ id: 'tampered-001', slug: 'tampered-after-sign' });
    tampered.title = 'Tampered Headline Injected After Administrator Signed Article';

    // 4. Valid HMAC signature, but unauthorized approver email
    const unauthorizedApprover = makeSignedArticle({
      id: 'unauth-001',
      slug: 'unauthorized-approver-article',
      approvedBy: 'intruder@example.com',
    });

    // 5. Missing approvedAt
    const invalidDate = {
      ...makeSignedArticle({ id: 'baddate-001', slug: 'bad-approved-date' }),
      approvedAt: 'not-a-timestamp',
    };

    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          schemaVersion: PUBLISHING_CONTRACT_VERSION,
          source: 'Mock Intelligence Desk',
          generatedAt: recentIso(1),
          articles: [valid, missingSig, forgedSig, tampered, unauthorizedApprover, invalidDate],
        })
      );
    });

    const bridge = new ExternalPublishingBridge({
      enabled: true,
      feedUrl: mock.url,
      feedToken: TEST_FEED_TOKEN,
      approvalSecret: TEST_APPROVAL_SECRET,
      allowedApprovers: [TEST_ADMIN_EMAIL],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
    });

    const result = await bridge.syncNow();
    assert.equal(mock.lastAuthHeader(), `Bearer ${TEST_FEED_TOKEN}`);
    assert.equal(result.approvedCount, 1);
    assert.equal(bridge.getApprovedArticles()[0].slug, 'valid-server-verified-dispatch');

    const reasons = new Map(result.rejections.map((r) => [r.slug, r.reason]));
    assert.equal(reasons.get('missing-sig-article'), 'missing_approval_signature');
    assert.equal(reasons.get('forged-sig-article'), 'invalid_approval_signature');
    assert.equal(reasons.get('tampered-after-sign'), 'invalid_approval_signature');
    assert.equal(reasons.get('unauthorized-approver-article'), 'unauthorized_approver');
    assert.equal(reasons.get('bad-approved-date'), 'invalid_approved_at');
  } finally {
    await mock.close();
  }
});

test('P3-7, P3-8, P3-9 & P3-10. Dynamic /news/:slug SSR, XSS escaping, single canonical URL enforcement, coexistence with 13 static pages, and live syndication feeds', async () => {
  const mock = await startMockFeedServer();
  const bridge = new ExternalPublishingBridge({
    enabled: true,
    feedUrl: mock.url,
    approvalSecret: TEST_APPROVAL_SECRET,
    allowedApprovers: [TEST_ADMIN_EMAIL],
    allowLocalTestFeed: true,
    notifySearchEngines: false,
  });
  const appServer = await startAppServer(bridge);

  try {
    const dynamicArticle = makeSignedArticle({
      id: 'dyn-001',
      slug: 'parliament-energy-oversight-report-2026',
      title: 'Parliament Energy Oversight <script>alert(1)</script> 2026 Report',
      paragraphs: [
        'Cape Town — Official report with safe escaping </script><img src=x onerror=alert(1)> verified.',
        'Municipalities will publish monthly uptime figures.',
      ],
      topics: ['south-africa', 'parliament'],
      externalUrl: 'https://www.parliament.gov.za/energy-report-2026',
    });

    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          schemaVersion: PUBLISHING_CONTRACT_VERSION,
          source: 'Mock Intelligence Desk',
          generatedAt: recentIso(1),
          articles: [dynamicArticle],
        })
      );
    });

    const sync = await bridge.syncNow();
    assert.equal(sync.approvedCount, 1);

    // 1. Dynamic SSR returns HTTP 200 with canonical URL, Google News metadata, and XSS escaped
    const dynRes = await fetch(`${appServer.baseUrl}/news/parliament-energy-oversight-report-2026`);
    assert.equal(dynRes.status, 200);
    assert.match(dynRes.headers.get('content-type') || '', /text\/html/i);
    const html = await dynRes.text();
    const expectedCanonical = `${OFFICIAL_SITE_ORIGIN}/news/parliament-energy-oversight-report-2026`;
    assert.ok(html.includes(`<link rel="canonical" id="canonicalLink" href="${expectedCanonical}">`));
    assert.ok(html.includes('max-image-preview:large'));
    assert.ok(html.includes('"@type": "NewsArticle"'));
    assert.ok(html.includes('"@type": "BreadcrumbList"'));
    assert.ok(html.includes('G-LRM7QXKF2Q'));
    assert.ok(html.includes('ca-pub-7782426836472981'));
    // XSS neutralized both in HTML body and inside JSON-LD
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

    // 2. Zero duplicate URLs: uppercase, trailing slash, and .html redirect 301 to single canonical slug
    for (const variant of [
      '/news/Parliament-Energy-Oversight-Report-2026',
      '/news/parliament-energy-oversight-report-2026/',
      '/news/parliament-energy-oversight-report-2026.html',
    ]) {
      const redir = await fetch(`${appServer.baseUrl}${variant}`, { redirect: 'manual' });
      assert.equal(redir.status, 301, `Expected 301 for duplicate URL variant ${variant}`);
      assert.equal(
        redir.headers.get('location'),
        '/news/parliament-energy-oversight-report-2026'
      );
    }

    // 3. Coexistence: all 13 existing static news article pages continue returning HTTP 200
    for (const staticArticle of CANONICAL_ARTICLES) {
      const staticRes = await fetch(`${appServer.baseUrl}/news/${staticArticle.slug}`);
      assert.equal(staticRes.status, 200, `Existing static page broken: ${staticArticle.slug}`);
      const staticHtml = await staticRes.text();
      assert.ok(
        staticHtml.includes(`href="${OFFICIAL_SITE_ORIGIN}/news/${staticArticle.slug}"`),
        `Canonical URL mismatch on existing static page ${staticArticle.slug}`
      );
    }

    // 4. Instant propagation to Google News 48h sitemap (without includeAll), standard sitemap, RSS, Atom, JSON, and topic feeds
    const newsSitemapXml = await (await fetch(`${appServer.baseUrl}/news-sitemap.xml`)).text();
    assert.ok(newsSitemapXml.includes(`<loc>${expectedCanonical}</loc>`));

    const sitemapXml = await (await fetch(`${appServer.baseUrl}/sitemap.xml`)).text();
    assert.ok(sitemapXml.includes(`<loc>${expectedCanonical}</loc>`));

    const rssXml = await (await fetch(`${appServer.baseUrl}/rss.xml`)).text();
    assert.ok(rssXml.includes(`<link>${expectedCanonical}</link>`));

    const atomXml = await (await fetch(`${appServer.baseUrl}/atom.xml`)).text();
    assert.ok(atomXml.includes(`href="${expectedCanonical}"`));

    const jsonFeed = (await (await fetch(`${appServer.baseUrl}/feed.json`)).json()) as {
      items: Array<{ url: string }>;
    };
    assert.ok(jsonFeed.items.some((item) => item.url === expectedCanonical));
    assert.equal(jsonFeed.items.length, 14); // 13 bundled + 1 newly approved

    const parlRss = await (await fetch(`${appServer.baseUrl}/rss/parliament.xml`)).text();
    assert.ok(parlRss.includes(`<link>${expectedCanonical}</link>`));

    const africaRss = await (await fetch(`${appServer.baseUrl}/rss/africa.xml`)).text();
    assert.equal(africaRss.includes(`<link>${expectedCanonical}</link>`), false);
  } finally {
    await appServer.close();
    await mock.close();
  }
});

test('P3-11, P3-12 & P3-13. 3-Layer deduplication, unchanged ETag 304 no-op, and safe article updates', async () => {
  const mock = await startMockFeedServer();
  const bridge = new ExternalPublishingBridge({
    enabled: true,
    feedUrl: mock.url,
    approvalSecret: TEST_APPROVAL_SECRET,
    allowedApprovers: [TEST_ADMIN_EMAIL],
    allowLocalTestFeed: true,
    notifySearchEngines: false,
  });
  const appServer = await startAppServer(bridge);

  try {
    const t1 = recentIso(40);
    const t2 = recentIso(20);

    const dupSlugOlder = makeSignedArticle({
      id: 'id-slug-a',
      slug: 'dedup-dispatch-story',
      title: 'Older Duplicate Slug Version of Dispatch Story',
      publishedAt: t1,
      updatedAt: t1,
    });
    const dupSlugNewer = makeSignedArticle({
      id: 'id-slug-b',
      slug: 'dedup-dispatch-story',
      title: 'Newer Authoritative Revision of Dispatch Story',
      publishedAt: t1,
      updatedAt: t2,
    });

    // Duplicate upstream ID with different slug
    const dupIdOlder = makeSignedArticle({
      id: 'shared-upstream-id-77',
      slug: 'shared-id-old-slug',
      title: 'Old Slug For Shared Upstream ID Report',
      publishedAt: t1,
      updatedAt: t1,
    });
    const dupIdNewer = makeSignedArticle({
      id: 'shared-upstream-id-77',
      slug: 'shared-id-renamed-slug',
      title: 'Renamed Slug For Shared Upstream ID Report',
      publishedAt: t1,
      updatedAt: t2,
    });

    // Duplicate externalUrl across two articles
    const dupUrlOlder = makeSignedArticle({
      id: 'ext-url-1',
      slug: 'ext-url-story-older',
      title: 'Older Story Pointing To Same External Notice',
      publishedAt: t1,
      updatedAt: t1,
      externalUrl: 'https://www.gov.za/speeches/unique-dispatch-2026',
    });
    const dupUrlNewer = makeSignedArticle({
      id: 'ext-url-2',
      slug: 'ext-url-story-newer',
      title: 'Newer Story Pointing To Same External Notice',
      publishedAt: t1,
      updatedAt: t2,
      externalUrl: 'https://www.gov.za/speeches/unique-dispatch-2026',
    });

    let currentEtag = '"feed-v1"';
    let currentArticles = [
      dupSlugOlder,
      dupSlugNewer,
      dupIdOlder,
      dupIdNewer,
      dupUrlOlder,
      dupUrlNewer,
    ];

    mock.setHandler((req, res) => {
      if (req.headers['if-none-match'] === currentEtag) {
        res.writeHead(304, { ETag: currentEtag });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', ETag: currentEtag });
      res.end(
        JSON.stringify({
          schemaVersion: PUBLISHING_CONTRACT_VERSION,
          source: 'Mock Intelligence Desk',
          generatedAt: recentIso(1),
          articles: currentArticles,
        })
      );
    });

    // Sync 1: 6 inputs deduplicated cleanly to 3 unique articles
    const s1 = await bridge.syncNow();
    assert.equal(s1.approvedCount, 3);
    assert.equal(s1.diff.created.length, 3);
    assert.equal(
      bridge.getApprovedArticleBySlug('dedup-dispatch-story')?.title,
      'Newer Authoritative Revision of Dispatch Story'
    );
    assert.ok(bridge.getApprovedArticleBySlug('shared-id-renamed-slug'));
    assert.equal(bridge.getApprovedArticleBySlug('shared-id-old-slug'), undefined);
    assert.ok(bridge.getApprovedArticleBySlug('ext-url-story-newer'));
    assert.equal(bridge.getApprovedArticleBySlug('ext-url-story-older'), undefined);

    // Sync 2: ETag 304 Not Modified -> zero republished items
    const s2 = await bridge.syncNow();
    assert.equal(s2.outcome, 'not_modified');
    assert.equal(s2.httpStatus, 304);
    assert.equal(s2.diff.created.length, 0);
    assert.equal(s2.diff.updated.length, 0);

    // Sync 3: New ETag but IDENTICAL content -> SHA-256 fingerprint prevents republishing
    currentEtag = '"feed-v1-reissued"';
    const s3 = await bridge.syncNow();
    assert.equal(s3.outcome, 'synced');
    assert.equal(s3.diff.created.length, 0);
    assert.equal(s3.diff.updated.length, 0);
    assert.equal(s3.diff.unchanged.length, 3);

    // Sync 4: Genuine article update (new title + newer updatedAt) + update to an existing static slug
    const t3 = recentIso(5);
    const updatedDynamic = makeSignedArticle({
      id: 'id-slug-b',
      slug: 'dedup-dispatch-story',
      title: 'Updated Evening Edition of Dispatch Story',
      publishedAt: t1,
      updatedAt: t3,
    });
    const updatedExistingStatic = makeSignedArticle({
      id: 'static-update-001',
      slug: 'african-owned-supply-chains',
      title: 'African-Owned Supply Chains (Updated 2026 Edition)',
      publishedAt: '2026-04-15T12:00:00+02:00',
      updatedAt: t3,
      topics: ['africa', 'economy'],
    });
    currentEtag = '"feed-v2"';
    currentArticles = [updatedDynamic, dupIdNewer, dupUrlNewer, updatedExistingStatic];

    const s4 = await bridge.syncNow();
    assert.equal(s4.outcome, 'synced');
    assert.deepEqual(s4.diff.updated, ['dedup-dispatch-story']);
    assert.deepEqual(s4.diff.created, ['african-owned-supply-chains']);

    // Verify dynamic article updated & existing static slug updated with ZERO duplicate entries in sitemap
    const dynHtml = await (
      await fetch(`${appServer.baseUrl}/news/dedup-dispatch-story`)
    ).text();
    assert.ok(dynHtml.includes('Updated Evening Edition of Dispatch Story'));

    const staticOverriddenHtml = await (
      await fetch(`${appServer.baseUrl}/news/african-owned-supply-chains`)
    ).text();
    assert.ok(staticOverriddenHtml.includes('African-Owned Supply Chains (Updated 2026 Edition)'));

    const sitemapXml = await (await fetch(`${appServer.baseUrl}/sitemap.xml`)).text();
    const matches = sitemapXml.match(
      new RegExp(`<loc>${OFFICIAL_SITE_ORIGIN}/news/african-owned-supply-chains</loc>`, 'g')
    );
    assert.equal(matches?.length, 1, 'Must never duplicate canonical URL in sitemap.xml');
  } finally {
    await appServer.close();
    await mock.close();
  }
});

test('P3-14, P3-15 & P3-16. Signed retraction (HTTP 410 Gone), fault isolation, and upstream outage last-known-good recovery', async () => {
  const mock = await startMockFeedServer();
  const bridge = new ExternalPublishingBridge({
    enabled: true,
    feedUrl: mock.url,
    approvalSecret: TEST_APPROVAL_SECRET,
    allowedApprovers: [TEST_ADMIN_EMAIL],
    allowLocalTestFeed: true,
    notifySearchEngines: false,
  });
  const appServer = await startAppServer(bridge);

  try {
    const keepArticle = makeSignedArticle({
      id: 'keep-001',
      slug: 'resilient-published-dispatch',
    });
    const toRetract = makeSignedArticle({
      id: 'retract-001',
      slug: 'temporary-retracted-dispatch',
    });
    const malformed = {
      id: 'bad-001',
      slug: 'bad_slug_with_underscores',
      approvalStatus: 'approved',
      approvedBy: TEST_ADMIN_EMAIL,
      approvedAt: recentIso(5),
      approvalSignature: 'a'.repeat(64),
      title: 'Short',
      metaDescription: 'Too short',
      category: 'SA',
      publishedAt: recentIso(5),
      imageUrl: 'http://insecure.example.com/img.jpg',
      paragraphs: [],
    };

    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          schemaVersion: PUBLISHING_CONTRACT_VERSION,
          source: 'Mock Intelligence Desk',
          generatedAt: recentIso(1),
          articles: [keepArticle, toRetract, malformed],
        })
      );
    });

    const s1 = await bridge.syncNow();
    assert.equal(s1.approvedCount, 2); // Fault isolation: 2 valid succeeded despite 1 malformed
    assert.equal(s1.rejectedCount, 1);

    // Retract `temporary-retracted-dispatch` with authorized admin signature
    const removedAt = recentIso(2);
    const removalSig = signRemovedSlugPayload(
      {
        slug: 'temporary-retracted-dispatch',
        approvedBy: TEST_ADMIN_EMAIL,
        removedAt,
        reason: 'retracted',
      },
      TEST_APPROVAL_SECRET
    );
    // Also send an UNSIGNED retraction attempt for `resilient-published-dispatch` — must be ignored!
    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          schemaVersion: PUBLISHING_CONTRACT_VERSION,
          source: 'Mock Intelligence Desk',
          generatedAt: recentIso(1),
          articles: [keepArticle],
          removedSlugs: [
            {
              slug: 'temporary-retracted-dispatch',
              approvedBy: TEST_ADMIN_EMAIL,
              removedAt,
              reason: 'retracted',
              approvalSignature: removalSig,
            },
            {
              slug: 'resilient-published-dispatch',
              approvedBy: TEST_ADMIN_EMAIL,
              removedAt,
              reason: 'retracted',
              approvalSignature: '0'.repeat(64), // forged removal signature
            },
          ],
        })
      );
    });

    const s2 = await bridge.syncNow();
    assert.equal(s2.approvedCount, 1);
    assert.equal(s2.removedCount, 1);

    const goneRes = await fetch(`${appServer.baseUrl}/news/temporary-retracted-dispatch`);
    assert.equal(goneRes.status, 410);
    const goneHtml = await goneRes.text();
    assert.ok(goneHtml.includes('noindex, follow'));

    // Forged removal was rejected; valid article remains HTTP 200
    const stillLiveRes = await fetch(`${appServer.baseUrl}/news/resilient-published-dispatch`);
    assert.equal(stillLiveRes.status, 200);

    // Upstream outage (HTTP 503) + corrupted JSON -> last-known-good snapshot preserved!
    mock.setHandler((_req, res) => {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Upstream maintenance');
    });
    const s3 = await bridge.syncNow();
    assert.equal(s3.outcome, 'error');
    assert.equal(s3.httpStatus, 503);
    assert.equal(bridge.getApprovedArticles().length, 1);

    mock.setHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{corrupted-json');
    });
    const s4 = await bridge.syncNow();
    assert.equal(s4.outcome, 'error');
    assert.equal(bridge.getApprovedArticles().length, 1);

    const stillLiveAfterOutage = await fetch(
      `${appServer.baseUrl}/news/resilient-published-dispatch`
    );
    assert.equal(stillLiveAfterOutage.status, 200);
  } finally {
    await appServer.close();
    await mock.close();
  }
});

test('P3-17 & P3-18. Admin publishing endpoints enforce HTTP 401, zero secrets exposed, subscriber locks & zero-DB safeguards intact', async () => {
  const defaultBridge = new ExternalPublishingBridge();
  const appServer = await startAppServer(defaultBridge);
  try {
    // Admin publishing endpoints must reject missing and forged Bearer tokens
    const routes: Array<{ method: string; path: string }> = [
      { method: 'GET', path: '/api/admin/publishing/status' },
      { method: 'POST', path: '/api/admin/publishing/sync' },
    ];
    for (const r of routes) {
      const noAuth = await fetch(`${appServer.baseUrl}${r.path}`, { method: r.method });
      assert.equal(noAuth.status, 401, `Expected 401 (no auth) on ${r.method} ${r.path}`);

      const forged = await fetch(`${appServer.baseUrl}${r.path}`, {
        method: r.method,
        headers: { Authorization: 'Bearer forged.jwt.token' },
      });
      assert.equal(forged.status, 401, `Expected 401 (forged token) on ${r.method} ${r.path}`);
    }

    // Public config reports bridge disabled and leaks zero private secrets
    const pubText = await (await fetch(`${appServer.baseUrl}/api/public/config`)).text();
    const pubJson = JSON.parse(pubText);
    assert.equal(pubJson.externalPublishingBridgeEnabled, false);
    assert.equal(pubJson.durableStorageConnected, false);
    assert.equal(pubJson.liveSubscriberSystemEnabled, false);
    assert.equal(pubText.includes('APPROVED_PUBLISHING_APPROVAL_SECRET'), false);
    assert.equal(pubText.includes('APPROVED_PUBLISHING_FEED_TOKEN'), false);

    // Hard safeguards: zero databases, zero Firestore rule files, .env.example stays clean
    assert.equal(DURABLE_STORAGE_CONNECTED, false);
    const rootFiles = fs.readdirSync(process.cwd());
    assert.equal(
      rootFiles.some((f) => f.endsWith('.sqlite') || f.endsWith('.db')),
      false
    );
    assert.equal(rootFiles.includes('firestore.rules'), false);
    assert.equal(rootFiles.includes('firebase-applet-config.json'), false);

    const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
    assert.ok(envExample.includes('EXTERNAL_PUBLISHING_BRIDGE_ENABLED=false'));
    assert.ok(envExample.includes('APPROVED_PUBLISHING_FEED_URL='));
    assert.ok(envExample.includes('APPROVED_PUBLISHING_APPROVAL_SECRET='));
  } finally {
    await appServer.close();
  }
});
