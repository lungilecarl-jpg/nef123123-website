import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANONICAL_ARTICLES,
  OFFICIAL_SITE_ORIGIN,
  TOPIC_FEEDS,
  deduplicateArticlesBySlug,
  type CanonicalNewsArticle,
  type TopicFeedMeta,
} from './articles-catalog.ts';
import {
  evaluateArticleForDuplicates,
  type DuplicateCandidateArticle,
} from './duplicate-prevention.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

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

const ISO_DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/;
const ALLOWED_PUBLISHED_STATUSES = new Set(['published', 'approved']);
const GOOGLE_NEWS_MAX_URLS = 1000;

/**
 * Strictly validates an ISO-8601 date or timestamp string without fabricating fallback dates.
 * Rejects empty strings, malformed formats, impossible calendar dates (e.g. 2026-02-31),
 * and out-of-range years.
 */
export function parseValidIsoDate(value?: string): Date | null {
  const trimmed = String(value || '').trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Verify calendar day didn't silently roll over (e.g. Feb 30 -> Mar 2)
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }

  if (match[4] !== undefined) {
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    if (hour > 23 || minute > 59 || second > 59) return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toIsoDate(value: string): string | null {
  const parsed = parseValidIsoDate(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string): string | null {
  const trimmed = String(value || '').trim();
  const parsed = parseValidIsoDate(trimmed);
  if (!parsed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return trimmed;
  }
  return parsed.toISOString();
}

function toRfc2822(value: string): string | null {
  const parsed = parseValidIsoDate(value);
  if (!parsed) return null;
  return parsed.toUTCString();
}

export function isPublishedArticle(article: CanonicalNewsArticle): boolean {
  if (!article || typeof article !== 'object') return false;
  if (article.draft === true || article.published === false) return false;
  if (article.status !== undefined && String(article.status).trim() !== '') {
    const normalizedStatus = String(article.status).trim().toLowerCase();
    if (!ALLOWED_PUBLISHED_STATUSES.has(normalizedStatus)) return false;
  }
  const slug = String(article.slug || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return false;
  const title = String(article.title || '').trim();
  if (!title) return false;
  if (!parseValidIsoDate(article.publishedDate)) return false;
  return true;
}

export function normalizeCanonicalArticleUrl(article: CanonicalNewsArticle): string | null {
  const slug = String(article.slug || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;

  const officialOriginUrl = new URL(OFFICIAL_SITE_ORIGIN);
  const officialHost = officialOriginUrl.hostname.toLowerCase();
  const apexHost = officialHost.replace(/^www\./, '');

  const rawCanonical = String(article.canonicalUrl || '').trim();
  if (rawCanonical) {
    try {
      const parsed = new URL(rawCanonical);
      const host = parsed.hostname.toLowerCase();
      if (host !== officialHost && host !== apexHost) {
        return null;
      }
      const cleanPath = parsed.pathname.replace(/\.html$/i, '').replace(/\/+$/, '');
      if (!/^\/news\/[a-z0-9-]+$/i.test(cleanPath)) {
        return null;
      }
      return `${OFFICIAL_SITE_ORIGIN}${cleanPath.toLowerCase()}`;
    } catch {
      return null;
    }
  }

  return `${OFFICIAL_SITE_ORIGIN}/news/${slug}`;
}

/**
 * Filters articles strictly down to genuine, published, indexable canonical articles:
 * - Excludes drafts, unpublished, pending, retracted, or non-approved statuses.
 * - Excludes articles without valid ISO publication dates or valid titles/slugs.
 * - Enforces HTTPS + www canonical domain (https://www.nef123123.co.za/news/<slug>).
 * - Excludes duplicate slugs, duplicate canonical URLs, duplicate external URLs, and duplicate stories.
 * - Never fabricates modification dates: updatedDate falls back only to valid publishedDate.
 */
export function filterIndexablePublishedArticles(
  articles: CanonicalNewsArticle[]
): CanonicalNewsArticle[] {
  const validCandidates: CanonicalNewsArticle[] = [];

  for (const article of articles) {
    if (!isPublishedArticle(article)) continue;
    const normalizedUrl = normalizeCanonicalArticleUrl(article);
    if (!normalizedUrl) continue;

    const pubDate = parseValidIsoDate(article.publishedDate);
    if (!pubDate) continue;

    const rawUpdated = article.updatedDate ? parseValidIsoDate(article.updatedDate) : null;
    const effectiveUpdatedStr =
      rawUpdated && rawUpdated.getTime() >= pubDate.getTime()
        ? article.updatedDate
        : article.publishedDate;

    validCandidates.push({
      ...article,
      slug: String(article.slug).trim().toLowerCase(),
      title: String(article.title).trim(),
      canonicalUrl: normalizedUrl,
      updatedDate: effectiveUpdatedStr,
    });
  }

  const slugDeduped = deduplicateArticlesBySlug(validCandidates);
  const seenUrls = new Set<string>();
  const accepted: CanonicalNewsArticle[] = [];

  for (const candidate of slugDeduped) {
    const urlKey = candidate.canonicalUrl.toLowerCase().replace(/\/+$/, '');
    if (seenUrls.has(urlKey)) continue;

    const dupCheck = evaluateArticleForDuplicates(
      candidate as DuplicateCandidateArticle,
      accepted as DuplicateCandidateArticle[],
      { allowSameSlugUpdate: false, recordRejection: false }
    );
    if (!dupCheck.allowed) continue;

    seenUrls.add(urlKey);
    accepted.push(candidate);
  }

  return accepted;
}

const gitLastmodCache = new Map<string, string | null>();

function getGitFileLastmodDate(relPath: string, projectRoot: string): string | null {
  if (!fs.existsSync(path.join(projectRoot, '.git'))) return null;
  const cacheKey = `${projectRoot}::${relPath}`;
  if (gitLastmodCache.has(cacheKey)) {
    return gitLastmodCache.get(cacheKey) || null;
  }
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const parsed = parseValidIsoDate(out);
    const result = parsed ? parsed.toISOString().slice(0, 10) : null;
    gitLastmodCache.set(cacheKey, result);
    return result;
  } catch {
    gitLastmodCache.set(cacheKey, null);
    return null;
  }
}

function getRealFileLastmodDate(relativePaths: string[], projectRoot = PROJECT_ROOT): string | null {
  for (const relPath of relativePaths) {
    const candidate = path.resolve(projectRoot, relPath);
    if (!candidate.startsWith(path.resolve(projectRoot) + path.sep)) continue;
    const gitDate = getGitFileLastmodDate(relPath, projectRoot);
    if (gitDate) return gitDate;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && !Number.isNaN(stat.mtime.getTime())) {
        return stat.mtime.toISOString().slice(0, 10);
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

function maxIsoDate(a: string | null, b: string | null): string | null {
  if (a && b) return a >= b ? a : b;
  return a || b;
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

export interface BuildSitemapOptions {
  projectRoot?: string;
  pageLastmodOverrides?: Record<string, string | null>;
}

const PUBLIC_CORE_PAGES: Array<{
  path: string;
  files: string[];
  changefreq: string;
  priority: string;
  includesArticles?: boolean;
}> = [
  { path: '/', files: ['index.html', 'dist/index.html'], changefreq: 'daily', priority: '1.0', includesArticles: true },
  { path: '/news/', files: ['news/index.html', 'dist/news/index.html'], changefreq: 'daily', priority: '0.9', includesArticles: true },
  { path: '/about', files: ['about.html', 'dist/about.html'], changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', files: ['contact.html', 'dist/contact.html'], changefreq: 'monthly', priority: '0.7' },
  { path: '/editorial-policy', files: ['editorial-policy.html', 'dist/editorial-policy.html'], changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', files: ['privacy.html', 'dist/privacy.html'], changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', files: ['terms.html', 'dist/terms.html'], changefreq: 'monthly', priority: '0.5' },
];

export function buildSitemapXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES,
  options: BuildSitemapOptions = {}
): string {
  const uniqueArticles = filterIndexablePublishedArticles(articles);
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const latestArticleDate = uniqueArticles.reduce<string | null>((latest, article) => {
    const d = toIsoDate(article.updatedDate || article.publishedDate);
    return maxIsoDate(latest, d);
  }, null);

  const seenLocs = new Set<string>();
  const urls: string[] = [];

  for (const page of PUBLIC_CORE_PAGES) {
    const loc = `${OFFICIAL_SITE_ORIGIN}${page.path}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    let lastmod: string | null;
    if (options.pageLastmodOverrides && Object.prototype.hasOwnProperty.call(options.pageLastmodOverrides, page.path)) {
      const override = options.pageLastmodOverrides[page.path];
      lastmod = override ? toIsoDate(override) : null;
    } else {
      const fileLastmod = getRealFileLastmodDate(page.files, projectRoot);
      lastmod = page.includesArticles ? maxIsoDate(fileLastmod, latestArticleDate) : fileLastmod;
    }

    const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
    urls.push(`  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  for (const article of uniqueArticles) {
    const loc = article.canonicalUrl;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    const lastmod = toIsoDate(article.updatedDate || article.publishedDate);
    const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
    const imageBlock = article.imageUrl.startsWith('https://')
      ? `\n    <image:image>
      <image:loc>${escapeXml(article.imageUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
      : '';

    urls.push(`  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageBlock}
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

/**
 * Dedicated Google News Sitemap (Google News Sitemap 0.9 specification + image sitemap extension).
 * Dynamically emits genuine, published, deduplicated canonical articles with valid publication dates.
 * Includes articles published within the last 48 hours by default (or all when includeAll=true for preview).
 */
export function buildGoogleNewsSitemapXml(
  articles: CanonicalNewsArticle[] = CANONICAL_ARTICLES,
  options: { includeAll?: boolean; nowMs?: number } = {}
): string {
  const uniqueArticles = filterIndexablePublishedArticles(articles).sort((a, b) => {
    const aTs = parseValidIsoDate(a.publishedDate)?.getTime() || 0;
    const bTs = parseValidIsoDate(b.publishedDate)?.getTime() || 0;
    return bTs - aTs;
  });
  const nowMs = options.nowMs ?? Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const eligible = (
    options.includeAll
      ? uniqueArticles
      : uniqueArticles.filter((article) => {
          const ts = parseValidIsoDate(article.publishedDate)?.getTime();
          return ts !== undefined && nowMs - ts <= fortyEightHoursMs && ts <= nowMs + 60_000;
        })
  ).slice(0, GOOGLE_NEWS_MAX_URLS);

  const entries = eligible
    .map((article) => {
      const pubIso = toIsoDateTime(article.publishedDate);
      if (!pubIso) return null;
      const lastmodIso = toIsoDateTime(article.updatedDate || article.publishedDate);
      const lastmodTag = lastmodIso ? `\n    <lastmod>${escapeXml(lastmodIso)}</lastmod>` : '';
      const imageBlock = article.imageUrl.startsWith('https://')
        ? `\n    <image:image>
      <image:loc>${escapeXml(article.imageUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
        : '';
      return `  <url>
    <loc>${escapeXml(article.canonicalUrl)}</loc>${lastmodTag}
    <news:news>
      <news:publication>
        <news:name>NEF123123</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(pubIso)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>${imageBlock}
  </url>`;
    })
    .filter((entry): entry is string => entry !== null);

  const note =
    entries.length === 0
      ? '  <!-- No published articles within the last 48 hours per Google News Sitemap guidelines -->\n'
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
  const sorted = [...filterIndexablePublishedArticles(articles)].sort(
    (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
  );
  const lastBuildDate =
    (sorted[0] && toRfc2822(sorted[0].updatedDate || sorted[0].publishedDate)) ||
    new Date().toUTCString();

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
    const pubRfc = toRfc2822(article.publishedDate) || lastBuildDate;
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.canonicalUrl)}</link>
      <guid isPermaLink="true">${escapeXml(article.canonicalUrl)}</guid>
      <pubDate>${escapeXml(pubRfc)}</pubDate>
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
  const sorted = [...filterIndexablePublishedArticles(articles)].sort(
    (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
  );
  const updated =
    (sorted[0] && toIsoDateTime(sorted[0].updatedDate || sorted[0].publishedDate)) ||
    new Date().toISOString();
  const selfUrl = `${OFFICIAL_SITE_ORIGIN}/atom.xml`;
  const hubUrl = getWebSubHubUrl();

  const entries = sorted.map((article) => {
    const hasHttpImg =
      article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://');
    const mediaTag = hasHttpImg
      ? `\n    <media:content url="${escapeXml(article.imageUrl)}" medium="image" type="${inferImageMime(article.imageUrl)}" />`
      : '';
    const pubIso = toIsoDateTime(article.publishedDate) || updated;
    const updIso = toIsoDateTime(article.updatedDate || article.publishedDate) || pubIso;
    return `  <entry>
    <id>${escapeXml(article.canonicalUrl)}</id>
    <title>${escapeXml(article.title)}</title>
    <link href="${escapeXml(article.canonicalUrl)}" rel="alternate" type="text/html" />
    <published>${escapeXml(pubIso)}</published>
    <updated>${escapeXml(updIso)}</updated>
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
  const sorted = [...filterIndexablePublishedArticles(articles)].sort(
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
      date_published: toIsoDateTime(article.publishedDate) || article.publishedDate,
      date_modified:
        toIsoDateTime(article.updatedDate || article.publishedDate) || article.publishedDate,
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
  return `User-agent: Mediapartners-Google
Allow: /

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

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
  const uniqueArticles = filterIndexablePublishedArticles(articles);
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
