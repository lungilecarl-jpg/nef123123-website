import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server.ts';
import { getCanonicalArticles } from '../server/articles-catalog.ts';
import {
  DuplicateRejectionRegistry,
  auditPublishedArticlesForDuplicates,
  evaluateArticleForDuplicates,
  filterDuplicateFeedImports,
  normalizeUrlForDuplicateCheck,
  type DuplicateCandidateArticle,
} from '../server/duplicate-prevention.ts';
import {
  ExternalPublishingBridge,
  PUBLISHING_CONTRACT_VERSION,
  signApprovedArticlePayload,
} from '../server/external-publishing-source.ts';

const TEST_APPROVAL_SECRET = 'nef123123-duplicate-test-secret-0123456789abcdef';
const TEST_APPROVER = 'admin@nef123123.co.za';

function startServer(
  handler: http.RequestListener
): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') throw new Error('Failed binding test server');
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

test('DUP-1. URL normalization strips tracking params, www, http/https, trailing slashes, and .html', () => {
  const a = normalizeUrlForDuplicateCheck(
    'http://www.nef123123.co.za/news/stokvels-and-savings-circles.html?utm_source=facebook&fbclid=abc123#top'
  );
  const b = normalizeUrlForDuplicateCheck(
    'https://nef123123.co.za/news/stokvels-and-savings-circles/'
  );
  assert.equal(a, b);
  assert.equal(a, 'https://nef123123.co.za/news/stokvels-and-savings-circles');

  const extA = normalizeUrlForDuplicateCheck(
    'https://www.sabcnews.com/story/water-crisis/?utm_medium=rss&ref=home&id=42&b=2&a=1'
  );
  const extB = normalizeUrlForDuplicateCheck(
    'http://sabcnews.com/story/water-crisis?a=1&b=2&id=42&gclid=xyz'
  );
  assert.equal(extA, extB);
});

test('DUP-2. Blocks identical article & articles with completely different headlines but identical body content', () => {
  const existing = getCanonicalArticles();
  const target = existing.find((a) => a.slug === 'da-invites-eff-mk-party-municipal-coalition-talks')!;
  const registry = new DuplicateRejectionRegistry();

  // Different slug, completely different headline, identical body text
  const reheadedDuplicate: DuplicateCandidateArticle = {
    id: 'ext-reheaded-001',
    slug: 'municipal-council-talks-spark-major-debate',
    title: 'Surprise Negotiations Reshape Local Council Alliances Across South Africa',
    source: 'External Wire Feed',
    publishedDate: '2026-04-16T09:00:00+02:00',
    paragraphs: [...target.paragraphs],
    sections: target.sections,
  };

  const result = evaluateArticleForDuplicates(reheadedDuplicate, existing, {
    channel: 'publish_gate',
    registry,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'block_duplicate');
  assert.equal(result.reasonCode, 'duplicate_exact_content');
  assert.equal(result.matchedArticle?.slug, target.slug);
  assert.match(result.explanation, /exact duplicate body content/i);
  assert.equal(registry.getRecords().length, 1);
  assert.equal(registry.getRecords()[0].reasonCode, 'duplicate_exact_content');
});

test('DUP-3. Blocks rephrased/padded near-identical body even when headline is completely changed', () => {
  const existing = getCanonicalArticles();
  const target = existing.find((a) => a.slug === 'da-invites-eff-mk-party-municipal-coalition-talks')!;
  const registry = new DuplicateRejectionRegistry();

  // Different headline, padded intro + minor edits to same paragraphs
  const nearDuplicate: DuplicateCandidateArticle = {
    id: 'ext-padded-002',
    slug: 'breaking-political-shift-in-municipal-talks',
    title: 'Breaking: Political Landscape Shifts Ahead of Local Council Meetings',
    source: 'Syndicated Wire Partner',
    publishedDate: '2026-04-16T10:00:00+02:00',
    paragraphs: [
      'JOHANNESBURG — Political observers are reacting swiftly to new municipal council developments today.',
      target.paragraphs[0],
      target.paragraphs[1],
      target.paragraphs[2],
      'Analysts expect further announcements from party spokespeople later this week.',
    ],
  };

  const result = evaluateArticleForDuplicates(nearDuplicate, existing, {
    channel: 'rss_import',
    registry,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'block_duplicate');
  assert.equal(result.reasonCode, 'duplicate_near_identical_body');
  assert.equal(result.matchedArticle?.slug, target.slug);
  assert.equal(registry.getRecords().length, 1);
});

test('DUP-4. Blocks same story imported from multiple different news sources with rewritten wording', () => {
  const registry = new DuplicateRejectionRegistry();
  const publishedSourceA: DuplicateCandidateArticle = {
    slug: 'tshwane-emergency-water-tankers-deployed-bronkhorstspruit',
    title: 'Tshwane Deploys Emergency Water Tankers to Bronkhorstspruit After Treatment Fault',
    source: 'SABC News RSS',
    publishedDate: '2026-05-01T08:00:00+02:00',
    externalUrl: 'https://www.sabcnews.com/tshwane-water-tankers-bronkhorstspruit',
    paragraphs: [
      'The City of Tshwane deployed 18 emergency water tankers to Bronkhorstspruit residents on Friday after a chlorine dosing fault disrupted the municipal water treatment plant.',
      'Health officials confirmed that 512 residents sought clinic treatment for stomach cramps while municipal engineers flushed reservoir pipelines and began hourly bacterial testing.',
      'Tshwane infrastructure spokesperson Selby Bokaba urged affected households in Zithobeni and Rethabiseng to boil drinking water until clearance certificates are issued.',
    ],
  };

  const multiSourceRewriteB: DuplicateCandidateArticle = {
    slug: 'bronkhorstspruit-water-tankers-sent-after-tshwane-plant-fault',
    title: 'Emergency Water Tankers Sent to Bronkhorstspruit After Tshwane Plant Chlorine Fault',
    source: 'TimesLIVE Atom Feed',
    publishedDate: '2026-05-01T08:25:00+02:00',
    externalUrl: 'https://www.timeslive.co.za/news/bronkhorstspruit-tankers-tshwane-chlorine',
    paragraphs: [
      'Eighteen emergency water tankers were deployed by the City of Tshwane to Bronkhorstspruit on Friday following a chlorine dosing fault at the municipal water treatment plant.',
      'Clinic health officials said 512 residents were treated for stomach cramps as municipal engineers flushed reservoir pipelines and ran hourly bacterial water testing.',
      'Spokesperson Selby Bokaba warned households in Zithobeni and Rethabiseng to boil drinking water until formal clearance certificates are released.',
    ],
  };

  const result = evaluateArticleForDuplicates(multiSourceRewriteB, [publishedSourceA], {
    channel: 'rss_import',
    registry,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'block_duplicate');
  assert.ok(
    result.reasonCode === 'duplicate_cross_source_story' ||
      result.reasonCode === 'duplicate_near_identical_body'
  );
  assert.equal(result.matchedArticle?.slug, publishedSourceA.slug);
  assert.equal(registry.getRecords().length, 1);
});

test('DUP-5. Allows legitimate developing-event update with genuinely different reporting & new facts (does not rely on headlines alone)', () => {
  const existing = getCanonicalArticles();
  const registry = new DuplicateRejectionRegistry();

  // Shares headline entities ("Julius Malema", "Helen Zille", "High Court", "Johannesburg")
  // with existing coverage, BUT reports a genuinely new court ruling & timeline with original details!
  const developingUpdate: DuplicateCandidateArticle = {
    id: 'dev-update-001',
    slug: 'high-court-sets-november-hearing-date-malema-zille-jurisdiction',
    title: 'High Court Sets November Hearing Date in Malema and Helen Zille Johannesburg Venue Dispute',
    source: 'NEF123123 Court Desk',
    publishedDate: '2026-05-12T14:00:00+02:00',
    paragraphs: [
      'Deputy Judge President Roland Sutherland issued a case-management directive on Tuesday scheduling oral arguments for 19 November before a full bench of three judges.',
      'Counsel for both parties must exchange heads of argument by 4 October, addressing Section 21 of the Superior Courts Act and constitutional precedent on inter-provincial defamation filings.',
      'Legal scholars from the University of the Witwatersrand noted that the ruling could clarify whether digital broadcasts published nationwide establish concurrent jurisdiction across multiple divisions.',
      'Court registrar records show amici curiae applications from media-freedom groups remain open until the end of September.',
    ],
  };

  const result = evaluateArticleForDuplicates(developingUpdate, existing, {
    channel: 'publish_gate',
    registry,
  });

  assert.equal(result.allowed, true);
  assert.ok(
    result.decision === 'allow_developing_update' || result.decision === 'allow',
    `Expected legitimate update to be allowed, got ${result.decision}`
  );
  assert.equal(registry.getRecords().length, 0);
});

test('DUP-6. Existing 13 NEF123123 articles non-destructive audit reports zero exact/near duplicates and recognizes Malema/Zille pair as distinct reporting', () => {
  const existing = getCanonicalArticles();
  assert.equal(existing.length, 13);

  const audit = auditPublishedArticlesForDuplicates(existing);
  assert.equal(audit.totalArticlesScanned, 13);
  assert.equal(audit.exactDuplicatesCount, 0);
  assert.equal(audit.suspectedNearDuplicatesCount, 0);
  assert.equal(audit.duplicateUrlEntries.length, 0);
  assert.equal(audit.cleanStatus, true);

  // Confirm the two Malema/EFF articles are never flagged as exact or near duplicates
  const duplicatePair = [...audit.exactDuplicates, ...audit.suspectedNearDuplicates].find(
    (f) =>
      [f.articleA.slug, f.articleB.slug].includes(
        'malema-fires-back-at-helen-zille-mashaba-affidavit-da-emails'
      ) &&
      [f.articleA.slug, f.articleB.slug].includes('malema-challenges-helen-zille-court-venue')
  );
  assert.equal(duplicatePair, undefined, 'Expected the two Malema/EFF stories to remain distinct non-duplicates');
});

test('DUP-7. Batch RSS/Atom/API feed import filter blocks duplicate URLs and cross-source copies while keeping unique items', () => {
  const existing = getCanonicalArticles();
  const registry = new DuplicateRejectionRegistry();

  const incomingFeedBatch: DuplicateCandidateArticle[] = [
    // 1. Unique genuine new story -> ACCEPT
    {
      id: 'rss-1',
      slug: 'sadc-rail-corridor-investment-summit-gaborone',
      title: 'SADC Transport Ministers Approve Cross-Border Freight Rail Corridor in Gaborone',
      source: 'Reuters Africa RSS',
      externalUrl: 'https://www.reuters.com/africa/sadc-rail-gaborone-2026',
      paragraphs: [
        'Southern African transport ministers meeting in Gaborone signed a binding financing compact to upgrade 1,400 kilometres of cross-border freight rail linking Botswana, Namibia, and South Africa.',
        'The corridor will integrate single-stop customs telemetry at Lobatse and Walvis Bay to cut mineral and agricultural transit times by 36 hours.',
      ],
    },
    // 2. Same URL with utm tracking params -> BLOCK
    {
      id: 'rss-2',
      slug: 'sadc-rail-corridor-gaborone-copy',
      title: 'Ministers Back Gaborone Freight Rail Plan',
      source: 'SADC Atom Feed',
      externalUrl: 'http://reuters.com/africa/sadc-rail-gaborone-2026/?utm_source=rss&fbclid=999',
      paragraphs: [
        'Brief summary of Gaborone transport talks covering freight routes in Southern Africa.',
      ],
    },
    // 3. Duplicate of existing NEF123123 article via externalUrl with tracking query -> BLOCK
    {
      id: 'rss-3',
      slug: 'duplicate-insourcing-video-import',
      title: 'Parliament Insourcing Video Re-Import',
      source: 'Facebook RSS Bridge',
      externalUrl: 'https://facebook.com/share/v/1JN4arz1oe?utm_campaign=repost',
      paragraphs: ['Re-imported social video link already published on NEF123123.'],
    },
    // 4. Completely unique second story -> ACCEPT
    {
      id: 'rss-4',
      slug: 'eastern-cape-solar-microgrid-cooperatives-launch',
      title: 'Eastern Cape Rural Cooperatives Commission Four Community Solar Microgrids',
      source: 'Engineering News RSS',
      externalUrl: 'https://www.engineeringnews.co.za/article/eastern-cape-solar-coops-2026',
      paragraphs: [
        'Four community-owned solar microgrids entered commercial operation across Mthatha and Lusikisiki this week, supplying 1,800 households and cold-storage sheds for emerging citrus growers.',
        'Local electricians trained through Buffalo City TVET College hold majority maintenance contracts under the cooperative charter.',
      ],
    },
  ];

  const { accepted, blocked } = filterDuplicateFeedImports(incomingFeedBatch, existing, {
    channel: 'rss_import',
    registry,
  });

  assert.equal(accepted.length, 2);
  assert.equal(blocked.length, 2);
  assert.equal(blocked[0].result.reasonCode, 'duplicate_source_url');
  assert.equal(blocked[1].result.reasonCode, 'duplicate_source_url');
  assert.equal(registry.getRecords().length, 2);
});

test('DUP-8. Phase 3 ExternalPublishingBridge blocks signed external article duplicating bundled NEF123123 content under different headline', async () => {
  const existing = getCanonicalArticles();
  const bundled = existing.find((a) => a.slug === 'stokvels-and-savings-circles')!;
  const dupRegistry = new DuplicateRejectionRegistry();

  const dupArticleRaw = {
    id: 'intel-dup-900',
    slug: 'community-savings-clubs-repackaged-story',
    approvalStatus: 'approved',
    approvedBy: TEST_APPROVER,
    approvedAt: '2026-04-16T09:00:00+02:00',
    title: 'How Township Collective Savings Clubs Build Shared Wealth Across South Africa',
    metaDescription:
      'Repackaged submission duplicating the existing NEF123123 stokvels and savings circles report with a new headline.',
    category: 'ECONOMIC FREEDOM · FINANCE',
    topics: ['south-africa', 'economy'],
    keywords: ['stokvels', 'cooperative finance'],
    publishedAt: '2026-04-16T08:30:00+02:00',
    updatedAt: '2026-04-16T08:30:00+02:00',
    imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=85',
    source: 'External Syndication Feed',
    paragraphs: [...bundled.paragraphs],
  };

  const uniqueArticleRaw = {
    id: 'intel-unique-901',
    slug: 'limpopo-agro-processing-hub-opens-polokwane',
    approvalStatus: 'approved',
    approvedBy: TEST_APPROVER,
    approvedAt: '2026-04-16T09:10:00+02:00',
    title: 'Limpopo Cooperative Agro-Processing Hub Opens Cold-Chain Depot in Polokwane',
    metaDescription:
      'Smallholder fruit and vegetable cooperatives in Limpopo launch a shared cold-chain processing and regional packaging hub in Polokwane.',
    category: 'SOUTH AFRICA · ECONOMY',
    topics: ['south-africa', 'economy'],
    keywords: ['Limpopo', 'agro-processing', 'cooperatives'],
    publishedAt: '2026-04-16T09:05:00+02:00',
    updatedAt: '2026-04-16T09:05:00+02:00',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=85',
    source: 'NEF123123 Intelligence Desk',
    paragraphs: [
      'More than 65 smallholder cooperatives across Capricorn and Mopani districts inaugurated a shared cold-chain packaging facility outside Polokwane on Thursday.',
      'The depot features blast-chilling rooms, solar backup refrigeration, and direct rail-siding access designed to cut post-harvest tomato and avocado spoilage by forty percent.',
    ],
  };

  const payload = {
    schemaVersion: PUBLISHING_CONTRACT_VERSION,
    source: 'NEF123123 Intelligence Desk (Mock)',
    generatedAt: '2026-04-16T09:15:00+02:00',
    articles: [
      {
        ...dupArticleRaw,
        approvalSignature: signApprovedArticlePayload(dupArticleRaw, TEST_APPROVAL_SECRET),
      },
      {
        ...uniqueArticleRaw,
        approvalSignature: signApprovedArticlePayload(uniqueArticleRaw, TEST_APPROVAL_SECRET),
      },
    ],
  };

  const mockFeed = await startServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });

  try {
    const bridge = new ExternalPublishingBridge({
      enabled: true,
      feedUrl: `${mockFeed.baseUrl}/approved.json`,
      approvalSecret: TEST_APPROVAL_SECRET,
      allowedApprovers: [TEST_APPROVER],
      allowLocalTestFeed: true,
      notifySearchEngines: false,
      duplicateRegistry: dupRegistry,
    });

    const sync = await bridge.syncNow();
    assert.equal(sync.outcome, 'synced');
    assert.equal(sync.approvedCount, 1);
    assert.equal(bridge.getApprovedArticleBySlug(uniqueArticleRaw.slug)?.slug, uniqueArticleRaw.slug);
    assert.equal(bridge.getApprovedArticleBySlug(dupArticleRaw.slug), undefined);

    const dupRej = sync.rejections.find((r) => r.slug === dupArticleRaw.slug);
    assert.ok(dupRej, 'Expected duplicate submission to appear in sync.rejections');
    assert.equal(dupRej.reason, 'duplicate_suppressed');
    assert.match(dupRej.detail, /stokvels-and-savings-circles/);

    const logged = dupRegistry.getRecords();
    assert.equal(logged.length, 1);
    assert.equal(logged[0].channel, 'external_bridge');
    assert.equal(logged[0].matchedArticleSlug, 'stokvels-and-savings-circles');
  } finally {
    await closeServer(mockFeed.server);
  }
});

test('DUP-9. Protected admin duplicate API routes enforce HTTP 401 and public config reports duplicatePreventionEnabled without secrets', async () => {
  const app = await createApp({ attachFrontend: false });
  const srv = await startServer(app);
  try {
    const pubRes = await fetch(`${srv.baseUrl}/api/public/config`);
    assert.equal(pubRes.status, 200);
    const pubJson = (await pubRes.json()) as Record<string, unknown>;
    assert.equal(pubJson.duplicatePreventionEnabled, true);
    assert.equal(pubJson.externalPublishingBridgeEnabled, false);

    const auditRes = await fetch(`${srv.baseUrl}/api/admin/duplicates/audit`);
    assert.equal(auditRes.status, 401);

    const rejRes = await fetch(`${srv.baseUrl}/api/admin/duplicates/rejections`);
    assert.equal(rejRes.status, 401);

    const checkRes = await fetch(`${srv.baseUrl}/api/admin/duplicates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', paragraphs: ['Test body text.'] }),
    });
    assert.equal(checkRes.status, 401);
  } finally {
    await closeServer(srv.server);
  }
});
