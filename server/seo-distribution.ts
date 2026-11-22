import {
  CANONICAL_ARTICLES,
  OFFICIAL_SITE_ORIGIN,
  TOPIC_FEEDS,
  deduplicateArticlesBySlug,
  type CanonicalNewsArticle,
  type TopicFeedMeta,
} from './articles-catalog.ts';

export interface SearchSubmissionRecord {
  id: string;
  engine: 'indexnow' | 'google_search_console' | 'websub';
  action: 'publish' | 'update' | 'remove' | 'sitemap_submit' | 'manual_submit' | 'hub_ping';
  submittedUrls: string[];
  status: 'success' | 'failed' | 'skipped_unconfigured' | 'disabled_phase_1' | 'disabled_default';
  httpStatus: number | null;
  attempts: number;
  message: string;
  timestamp: string;
}

export interface ArticleReadinessAuditItem {
  slug: string;
  title: string;
  category: string;
  canonicalUrl: string;
  publishedDate: string;
  checks: {
    canonicalHttps: boolean;
    headlineWithin110Chars: boolean;
    metaDescriptionOptimal: boolean;
    isoTimezoneTimestamp: boolean;
    discoverImageAdvisoryPass: boolean;
    newsArticleSchemaReady: boolean;
  };
  in48HourNewsWindow: boolean;
  status: 'ready' | 'advisory';
  notes: string[];
}

export interface GoogleNewsReadinessReport {
  generatedAt: string;
  siteOrigin: string;
  totalArticles: number;
  readyCount: number;
  advisoryCount: number;
  recent48hCount: number;
  feeds: {
    sitemap: string;
    newsSitemap: string;
    rss: string;
    atom: string;
    jsonFeed: string;
    topicFeeds: Record<string, string>;
  };
  engines: {
    indexNowConfigured: boolean;
    webSubPingEnabled: boolean;
    webSubHubUrl: string;
    googleSearchConsoleApiEnabled: false;
  };
  articles: ArticleReadinessAuditItem[];
}

// Stateless runtime diagnostic ring-buffer (for current server session only; zero PII).
const sessionSubmissionLog: SearchSubmissionRecord[] = [];
const MAX_SESSION_LOG = 50;

function recordSessionSubmission(entry: SearchSubmissionRecord): SearchSubmissionRecord {
  sessionSubmissionLog.unshift(entry);
  if (sessionSubmissionLog.length > MAX_SESSION_LOG) {
    sessionSubmissionLog.length = MAX_SESSION_LOG;
  }
  return entry;
}

export function getSessionSubmissionHistory(): SearchSubmissionRecord[] {
  return [...sessionSubmissionLog];
}

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '2026-04-15';
  return parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string): string {
  const trimmed = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '2026-04-15T10:00:00+02:00';
  return parsed.toISOString();
}

function toRfc2822(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date('2026-04-15T08:00:00Z').toUTCString();
  return parsed.toUTCString();
}

function inferImageMime(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

function isPublicHttpsUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getWebSubHubUrl(): string {
  const candidate = (process.env.WEBSUB_HUB_URL || 'https://pubsubhubbub.appspot.com/').trim();
  return isPublicHttpsUrl(candidate) ? candidate : 'https://pubsubhubbub.appspot.com/';
}

export function isWebSubPingEnabled(): boolean {
  return String(process.env.WEBSUB_PING_ENABLED || 'false').toLowerCase() === 'true';
}

export function getAllowedCanonicalFeedUrls(): string[] {
  return [
    `${OFFICIAL_SITE_ORIGIN}/rss.xml`,
    `${OFFICIAL_SITE_ORIGIN}/atom.xml`,
    `${OFFICIAL_SITE_ORIGIN}/feed.json`,
    ...Object.values(TOPIC_FEEDS).map((meta) => `${OFFICIAL_SITE_ORIGIN}${meta.feedPath}`),
  ];
}

export function buildSitemapXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES
): string {
  const uniqueArticles = deduplicateArticlesBySlug(articles);
  const latestArticleDate = uniqueArticles.reduce((latest, article) => {
    const d = toIsoDate(article.updatedDate || article.publishedDate);
    return d > latest ? d : latest;
  }, '2026-04-15');

  const urls = [
    `  <url>
    <loc>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}</loc>
    <lastmod>${latestArticleDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...uniqueArticles.map((article) => {
      const imageBlock =
        article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://')
          ? `\n    <image:image>
      <image:loc>${escapeXml(article.imageUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
          : '';
      return `  <url>
    <loc>${escapeXml(article.canonicalUrl)}</loc>
    <lastmod>${toIsoDate(article.updatedDate || article.publishedDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageBlock}
  </url>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

/**
 * Dedicated Google News Sitemap (Google News Sitemap 0.9 specification + image sitemap extension).
 * Includes articles published within the last 48 hours (or all when includeAll=true for preview).
 */
export function buildGoogleNewsSitemapXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES,
  options: { includeAll?: boolean; nowMs?: number } = {}
): string {
  const uniqueArticles = deduplicateArticlesBySlug(articles);
  const nowMs = options.nowMs ?? Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const eligible = options.includeAll
    ? uniqueArticles
    : uniqueArticles.filter((article) => {
        const ts = Date.parse(article.publishedDate);
        return !Number.isNaN(ts) && nowMs - ts <= fortyEightHoursMs && ts <= nowMs + 60_000;
      });

  const entries = eligible.map((article) => {
    const imageBlock =
      article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://')
        ? `\n    <image:image>
      <image:loc>${escapeXml(article.imageUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
        : '';
    return `  <url>
    <loc>${escapeXml(article.canonicalUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>NEF123123</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(toIsoDateTime(article.publishedDate))}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>${imageBlock}
  </url>`;
  });

  const note =
    entries.length === 0
      ? '  <!-- No articles published within the last 48 hours per Google News Sitemap guidelines -->\n'
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${note}${entries.join('\n')}
</urlset>
`;
}

export function buildRssFeedXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES,
  topicMeta?: TopicFeedMeta
): string {
  const sorted = [...deduplicateArticlesBySlug(articles)].sort(
    (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
  );
  const lastBuildDate = sorted[0]
    ? toRfc2822(sorted[0].updatedDate || sorted[0].publishedDate)
    : new Date().toUTCString();

  const channelTitle = topicMeta
    ? topicMeta.title
    : 'NEF123123 — Navigant Economic Freedom News';
  const channelDescription = topicMeta
    ? topicMeta.description
    : 'Reporting, teaching and building. Captaining our own journey to total African liberation, wealth sovereignty and economic justice.';
  const selfUrl = `${OFFICIAL_SITE_ORIGIN}${topicMeta ? topicMeta.feedPath : '/rss.xml'}`;
  const hubUrl = getWebSubHubUrl();

  const items = sorted.map((article) => {
    const hasHttpImg =
      article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://');
    const mime = inferImageMime(article.imageUrl);
    const mediaBlock = hasHttpImg
      ? `\n      <enclosure url="${escapeXml(article.imageUrl)}" type="${mime}" />\n      <media:content url="${escapeXml(article.imageUrl)}" medium="image" type="${mime}" />`
      : '';
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.canonicalUrl)}</link>
      <guid isPermaLink="true">${escapeXml(article.canonicalUrl)}</guid>
      <pubDate>${escapeXml(toRfc2822(article.publishedDate))}</pubDate>
      <category>${escapeXml(article.category)}</category>
      <description>${escapeXml(article.metaDescription)}</description>${mediaBlock}
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}</link>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <atom:link href="${escapeXml(hubUrl)}" rel="hub" />
    <description>${escapeXml(channelDescription)}</description>
    <language>en-za</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <image>
      <url>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/favicon.png`)}</url>
      <title>${escapeXml(channelTitle)}</title>
      <link>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>
`;
}

export function buildAtomFeedXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES
): string {
  const sorted = [...deduplicateArticlesBySlug(articles)].sort(
    (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
  );
  const updated = sorted[0]
    ? toIsoDateTime(sorted[0].updatedDate || sorted[0].publishedDate)
    : '2026-04-15T10:00:00+02:00';
  const selfUrl = `${OFFICIAL_SITE_ORIGIN}/atom.xml`;
  const hubUrl = getWebSubHubUrl();

  const entries = sorted.map((article) => {
    const hasHttpImg =
      article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://');
    const mediaTag = hasHttpImg
      ? `\n    <media:content url="${escapeXml(article.imageUrl)}" medium="image" type="${inferImageMime(article.imageUrl)}" />`
      : '';
    return `  <entry>
    <id>${escapeXml(article.canonicalUrl)}</id>
    <title>${escapeXml(article.title)}</title>
    <link href="${escapeXml(article.canonicalUrl)}" rel="alternate" type="text/html" />
    <published>${escapeXml(toIsoDateTime(article.publishedDate))}</published>
    <updated>${escapeXml(toIsoDateTime(article.updatedDate || article.publishedDate))}</updated>
    <category term="${escapeXml(article.category)}" />
    <author>
      <name>NEF123123 Editorial Desk</name>
      <uri>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}</uri>
    </author>
    <summary type="text">${escapeXml(article.metaDescription)}</summary>${mediaTag}
  </entry>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:media="http://search.yahoo.com/mrss/"
      xml:lang="en-ZA">
  <id>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}</id>
  <title>NEF123123 — Navigant Economic Freedom News</title>
  <subtitle>Reporting, teaching and building. Captaining our own journey to total African liberation, wealth sovereignty and economic justice.</subtitle>
  <link href="${escapeXml(`${OFFICIAL_SITE_ORIGIN}/`)}" rel="alternate" type="text/html" />
  <link href="${escapeXml(selfUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(hubUrl)}" rel="hub" />
  <updated>${escapeXml(updated)}</updated>
  <icon>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/favicon.png`)}</icon>
  <logo>${escapeXml(`${OFFICIAL_SITE_ORIGIN}/favicon.png`)}</logo>
  <rights>© NEF123123 — Navigant Economic Freedom</rights>
${entries.join('\n')}
</feed>
`;
}

export function buildJsonFeed(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES
): Record<string, unknown> {
  const sorted = [...deduplicateArticlesBySlug(articles)].sort(
    (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
  );
  const hubUrl = getWebSubHubUrl();

  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'NEF123123 — Navigant Economic Freedom News',
    home_page_url: `${OFFICIAL_SITE_ORIGIN}/`,
    feed_url: `${OFFICIAL_SITE_ORIGIN}/feed.json`,
    description:
      'Reporting, teaching and building. Captaining our own journey to total African liberation, wealth sovereignty and economic justice.',
    language: 'en-ZA',
    icon: `${OFFICIAL_SITE_ORIGIN}/favicon.png`,
    favicon: `${OFFICIAL_SITE_ORIGIN}/favicon.ico`,
    authors: [
      {
        name: 'NEF123123 Editorial Desk',
        url: `${OFFICIAL_SITE_ORIGIN}/`,
      },
    ],
    hubs: [
      {
        type: 'WebSub',
        url: hubUrl,
      },
    ],
    items: sorted.map((article) => ({
      id: article.canonicalUrl,
      url: article.canonicalUrl,
      ...(article.externalUrl ? { external_url: article.externalUrl } : {}),
      title: article.title,
      summary: article.metaDescription,
      content_text:
        article.paragraphs.length > 0
          ? article.paragraphs.join('\n\n')
          : article.metaDescription,
      image: article.imageUrl,
      date_published: toIsoDateTime(article.publishedDate),
      date_modified: toIsoDateTime(article.updatedDate || article.publishedDate),
      language: 'en-ZA',
      tags: Array.from(new Set([article.category, ...article.topics, ...article.keywords])),
      authors: [
        {
          name: article.source || 'NEF123123 Editorial Desk',
          url: `${OFFICIAL_SITE_ORIGIN}/`,
        },
      ],
    })),
  };
}

export function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${OFFICIAL_SITE_ORIGIN}/sitemap.xml
Sitemap: ${OFFICIAL_SITE_ORIGIN}/news-sitemap.xml
`;
}

export function getIndexNowKey(): string {
  const raw = (process.env.INDEXNOW_KEY || '').trim();
  return /^[a-zA-Z0-9-]{8,128}$/.test(raw) ? raw : '';
}

function validateOfficialUrls(urls: string[]): string[] {
  const allowedOrigin = new URL(OFFICIAL_SITE_ORIGIN).origin;
  const clean: string[] = [];
  for (const candidate of urls) {
    try {
      const parsed = new URL(candidate);
      if (parsed.origin === allowedOrigin && parsed.protocol === 'https:') {
        clean.push(parsed.toString());
      }
    } catch {
      // Ignore malformed URLs
    }
  }
  return Array.from(new Set(clean));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<{ response: Response | null; attempts: number; errorMessage?: string }> {
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return { response, attempts: attempt };
      }
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error';
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt - 1)));
    }
  }
  return { response: null, attempts: maxAttempts, errorMessage: lastError };
}

export async function submitUrlsToIndexNow(
  urls: string[],
  action: SearchSubmissionRecord['action'] = 'manual_submit',
  options: { endpointUrl?: string; allowLocalTestEndpoint?: boolean } = {}
): Promise<SearchSubmissionRecord> {
  const validUrls = validateOfficialUrls(urls);
  const key = getIndexNowKey();
  const timestamp = new Date().toISOString();
  const id = `indexnow_${Date.now()}`;

  if (!key) {
    return recordSessionSubmission({
      id,
      engine: 'indexnow',
      action,
      submittedUrls: validUrls,
      status: 'skipped_unconfigured',
      httpStatus: null,
      attempts: 0,
      message:
        'INDEXNOW_KEY is not configured. IndexNow remains safely idle with zero outbound calls until an optional key is provided.',
      timestamp,
    });
  }

  if (validUrls.length === 0) {
    return recordSessionSubmission({
      id,
      engine: 'indexnow',
      action,
      submittedUrls: [],
      status: 'failed',
      httpStatus: 400,
      attempts: 0,
      message: `No valid ${OFFICIAL_SITE_ORIGIN} URLs provided for IndexNow submission.`,
      timestamp,
    });
  }

  const targetEndpoint =
    options.allowLocalTestEndpoint && options.endpointUrl
      ? options.endpointUrl
      : 'https://api.indexnow.org/indexnow';

  const host = new URL(OFFICIAL_SITE_ORIGIN).host;
  const payload = {
    host,
    key,
    keyLocation: `${OFFICIAL_SITE_ORIGIN}/${key}.txt`,
    urlList: validUrls,
  };

  const result = await fetchWithRetry(targetEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!result.response) {
    return recordSessionSubmission({
      id,
      engine: 'indexnow',
      action,
      submittedUrls: validUrls,
      status: 'failed',
      httpStatus: null,
      attempts: result.attempts,
      message: `IndexNow request failed after ${result.attempts} attempts: ${result.errorMessage || 'Unknown error'}`,
      timestamp,
    });
  }

  const ok = result.response.status === 200 || result.response.status === 202;
  const bodyText = (await result.response.text()).slice(0, 240);
  return recordSessionSubmission({
    id,
    engine: 'indexnow',
    action,
    submittedUrls: validUrls,
    status: ok ? 'success' : 'failed',
    httpStatus: result.response.status,
    attempts: result.attempts,
    message: ok
      ? `Submitted ${validUrls.length} canonical URL(s) to IndexNow (HTTP ${result.response.status}).`
      : `IndexNow rejected request (HTTP ${result.response.status}): ${bodyText || 'No details'}`,
    timestamp,
  });
}

/**
 * Stateless WebSub (PubSubHubbub) hub publisher.
 * Safe-disabled by default (`WEBSUB_PING_ENABLED=false`) so zero outbound calls occur unless opted in.
 * Strictly allows only NEF123123's own canonical feed URLs on OFFICIAL_SITE_ORIGIN.
 */
export async function pingWebSubHub(
  requestedFeedUrls?: string[],
  options: { hubUrl?: string; allowLocalTestHub?: boolean; forceEnableForTest?: boolean } = {}
): Promise<SearchSubmissionRecord> {
  const allowedFeeds = new Set(getAllowedCanonicalFeedUrls());
  const defaultTargets = [
    `${OFFICIAL_SITE_ORIGIN}/rss.xml`,
    `${OFFICIAL_SITE_ORIGIN}/atom.xml`,
  ];

  const candidateFeeds =
    Array.isArray(requestedFeedUrls) && requestedFeedUrls.length > 0
      ? requestedFeedUrls.filter((u) => typeof u === 'string' && allowedFeeds.has(u.trim()))
      : defaultTargets;
  const uniqueFeeds = Array.from(new Set(candidateFeeds));
  const timestamp = new Date().toISOString();
  const id = `websub_${Date.now()}`;

  const enabled = Boolean(options.forceEnableForTest) || isWebSubPingEnabled();
  if (!enabled) {
    return recordSessionSubmission({
      id,
      engine: 'websub',
      action: 'hub_ping',
      submittedUrls: uniqueFeeds,
      status: 'disabled_default',
      httpStatus: null,
      attempts: 0,
      message:
        'WEBSUB_PING_ENABLED is false (safe Phase 2 default). Hub discovery links are embedded in /rss.xml, /atom.xml, and /feed.json; set WEBSUB_PING_ENABLED=true when ready to send live hub pings.',
      timestamp,
    });
  }

  if (uniqueFeeds.length === 0) {
    return recordSessionSubmission({
      id,
      engine: 'websub',
      action: 'hub_ping',
      submittedUrls: [],
      status: 'failed',
      httpStatus: 400,
      attempts: 0,
      message: `No valid ${OFFICIAL_SITE_ORIGIN} canonical feed URLs selected for WebSub ping.`,
      timestamp,
    });
  }

  const hubUrl =
    options.allowLocalTestHub && options.hubUrl ? options.hubUrl : getWebSubHubUrl();

  const bodyParams = new URLSearchParams();
  bodyParams.set('hub.mode', 'publish');
  for (const feedUrl of uniqueFeeds) {
    bodyParams.append('hub.url', feedUrl);
  }

  const result = await fetchWithRetry(hubUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: bodyParams.toString(),
  });

  if (!result.response) {
    return recordSessionSubmission({
      id,
      engine: 'websub',
      action: 'hub_ping',
      submittedUrls: uniqueFeeds,
      status: 'failed',
      httpStatus: null,
      attempts: result.attempts,
      message: `WebSub hub ping failed after ${result.attempts} attempts: ${result.errorMessage || 'Unknown error'}`,
      timestamp,
    });
  }

  const ok = result.response.status >= 200 && result.response.status < 300;
  const bodyText = (await result.response.text()).slice(0, 240);
  return recordSessionSubmission({
    id,
    engine: 'websub',
    action: 'hub_ping',
    submittedUrls: uniqueFeeds,
    status: ok ? 'success' : 'failed',
    httpStatus: result.response.status,
    attempts: result.attempts,
    message: ok
      ? `Notified WebSub hub for ${uniqueFeeds.length} feed(s) (HTTP ${result.response.status}).`
      : `WebSub hub rejected ping (HTTP ${result.response.status}): ${bodyText || 'No details'}`,
    timestamp,
  });
}

/**
 * Google Search Console API authentication remains disabled during Safe Phase 1 & Phase 2.
 * No OAuth credentials are requested or read, and zero outbound Google API calls are made.
 */
export async function submitSitemapsToGoogleSearchConsole(
  action: SearchSubmissionRecord['action'] = 'sitemap_submit'
): Promise<SearchSubmissionRecord> {
  const sitemaps = [
    `${OFFICIAL_SITE_ORIGIN}/sitemap.xml`,
    `${OFFICIAL_SITE_ORIGIN}/news-sitemap.xml`,
  ];

  return recordSessionSubmission({
    id: `gsc_${Date.now()}`,
    engine: 'google_search_console',
    action,
    submittedUrls: sitemaps,
    status: 'disabled_phase_1',
    httpStatus: null,
    attempts: 0,
    message:
      'Google Search Console API authentication remains intentionally disabled until separate OAuth approval. Submit /sitemap.xml and /news-sitemap.xml directly in Google Search Console.',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Stateless Google News & Google Discover readiness audit across all canonical articles.
 */
export function auditGoogleNewsReadiness(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES,
  nowMs: number = Date.now()
): GoogleNewsReadinessReport {
  const uniqueArticles = deduplicateArticlesBySlug(articles);
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const audited: ArticleReadinessAuditItem[] = uniqueArticles.map((article) => {
    const notes: string[] = [];

    const canonicalHttps = article.canonicalUrl.startsWith(`${OFFICIAL_SITE_ORIGIN}/news/`);
    if (!canonicalHttps) notes.push('Canonical URL does not match official HTTPS /news/ prefix.');

    const headlineWithin110Chars = article.title.length > 0 && article.title.length <= 110;
    if (!headlineWithin110Chars) {
      notes.push(`Headline length is ${article.title.length} chars (Google News recommends ≤110).`);
    }

    const metaDescriptionOptimal =
      article.metaDescription.length >= 60 && article.metaDescription.length <= 170;
    if (!metaDescriptionOptimal) {
      notes.push(`Meta description length is ${article.metaDescription.length} chars.`);
    }

    const isoTimezoneTimestamp =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        article.publishedDate
      );
    if (!isoTimezoneTimestamp) {
      notes.push('Publication date missing full ISO-8601 time + timezone offset.');
    }

    let discoverImageAdvisoryPass = article.imageUrl.startsWith('https://');
    const widthMatch = /[?&]w=(\d+)/.exec(article.imageUrl);
    if (widthMatch && Number(widthMatch[1]) < 1200) {
      discoverImageAdvisoryPass = false;
      notes.push(`Remote image width parameter is ${widthMatch[1]}px (Google Discover recommends ≥1200px).`);
    } else if (!article.imageUrl.startsWith('https://')) {
      notes.push('Lead image URL is not HTTPS.');
    }

    const newsArticleSchemaReady = Boolean(
      article.title && article.metaDescription && article.imageUrl && article.source
    );

    const ts = Date.parse(article.publishedDate);
    const in48HourNewsWindow =
      !Number.isNaN(ts) && nowMs - ts <= fortyEightHoursMs && ts <= nowMs + 60_000;

    const allChecksPass =
      canonicalHttps &&
      headlineWithin110Chars &&
      metaDescriptionOptimal &&
      isoTimezoneTimestamp &&
      discoverImageAdvisoryPass &&
      newsArticleSchemaReady;

    return {
      slug: article.slug,
      title: article.title,
      category: article.category,
      canonicalUrl: article.canonicalUrl,
      publishedDate: article.publishedDate,
      checks: {
        canonicalHttps,
        headlineWithin110Chars,
        metaDescriptionOptimal,
        isoTimezoneTimestamp,
        discoverImageAdvisoryPass,
        newsArticleSchemaReady,
      },
      in48HourNewsWindow,
      status: allChecksPass ? 'ready' : 'advisory',
      notes,
    };
  });

  const readyCount = audited.filter((item) => item.status === 'ready').length;
  const recent48hCount = audited.filter((item) => item.in48HourNewsWindow).length;
  const topicFeeds: Record<string, string> = {};
  for (const [key, meta] of Object.entries(TOPIC_FEEDS)) {
    topicFeeds[key] = meta.feedPath;
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    siteOrigin: OFFICIAL_SITE_ORIGIN,
    totalArticles: audited.length,
    readyCount,
    advisoryCount: audited.length - readyCount,
    recent48hCount,
    feeds: {
      sitemap: '/sitemap.xml',
      newsSitemap: '/news-sitemap.xml',
      rss: '/rss.xml',
      atom: '/atom.xml',
      jsonFeed: '/feed.json',
      topicFeeds,
    },
    engines: {
      indexNowConfigured: Boolean(getIndexNowKey()),
      webSubPingEnabled: isWebSubPingEnabled(),
      webSubHubUrl: getWebSubHubUrl(),
      googleSearchConsoleApiEnabled: false,
    },
    articles: audited,
  };
}
