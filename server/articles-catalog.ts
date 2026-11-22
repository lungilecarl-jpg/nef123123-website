import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TopicFeedKey = 'south-africa' | 'africa' | 'parliament' | 'economy';

export interface TopicFeedMeta {
  key: TopicFeedKey;
  title: string;
  description: string;
  feedPath: string;
}

export interface CanonicalNewsArticle {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  publishedDate: string; // Full ISO-8601 with timezone offset (+02:00)
  updatedDate: string;
  category: string;
  topics: TopicFeedKey[];
  keywords: string[];
  title: string;
  imageUrl: string;
  imageAlt: string;
  canonicalUrl: string;
  source: string;
  paragraphs: string[];
  externalUrl?: string;
}

interface RawCatalogArticle {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  publishedDate: string;
  updatedDate?: string;
  category: string;
  topics?: TopicFeedKey[];
  keywords?: string[];
  title: string;
  img: string;
  ogImage?: string;
  alt: string;
  source: string;
  paragraphs?: string[];
  externalUrl?: string;
  externalLabel?: string;
}

export const OFFICIAL_SITE_ORIGIN = (
  process.env.OFFICIAL_SITE_ORIGIN || 'https://www.nef123123.co.za'
).replace(/\/+$/, '');

export const TOPIC_FEEDS: Record<TopicFeedKey, TopicFeedMeta> = {
  'south-africa': {
    key: 'south-africa',
    title: 'NEF123123 — South Africa News',
    description:
      'South African politics, accountability, municipal governance, and national dispatches from NEF123123.',
    feedPath: '/rss/south-africa.xml',
  },
  africa: {
    key: 'africa',
    title: 'NEF123123 — Africa in Focus',
    description:
      'Continental trade, African supply chains, industrialisation, and self-determination coverage from NEF123123.',
    feedPath: '/rss/africa.xml',
  },
  parliament: {
    key: 'parliament',
    title: 'NEF123123 — Parliament & Legislation',
    description:
      'South African Parliamentary committees, legislative bills, oversight, and public accountability dispatches.',
    feedPath: '/rss/parliament.xml',
  },
  economy: {
    key: 'economy',
    title: 'NEF123123 — Navigant Economic Freedom & Economy',
    description:
      'Economic sovereignty, stokvels, local beneficiation, land stewardship, and African manufacturing analysis.',
    feedPath: '/rss/economy.xml',
  },
};

export function isValidTopicFeed(candidate: string): candidate is TopicFeedKey {
  return Object.prototype.hasOwnProperty.call(TOPIC_FEEDS, candidate);
}

function toCanonical(slug: string): string {
  return `${OFFICIAL_SITE_ORIGIN}/news/${slug}`;
}

function resolveAbsoluteImageUrl(imgPath: string): string {
  if (/^https?:\/\//i.test(imgPath)) {
    return imgPath;
  }
  const normalized = imgPath.startsWith('/') ? imgPath : `/${imgPath.replace(/^\.\.\//, '')}`;
  return `${OFFICIAL_SITE_ORIGIN}${normalized}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(__dirname, '..', 'data', 'articles-catalog.json');

/**
 * Deduplicates canonical articles by normalized slug.
 * If the same slug appears more than once, keeps the entry with the most recent
 * updatedDate/publishedDate (or the later entry when timestamps tie).
 */
export function deduplicateArticlesBySlug(
  articles: CanonicalNewsArticle[]
): CanonicalNewsArticle[] {
  const bySlug = new Map<string, { article: CanonicalNewsArticle; order: number }>();
  articles.forEach((article, index) => {
    const normalizedSlug = String(article.slug || '').trim().toLowerCase();
    if (!normalizedSlug) return;
    const existing = bySlug.get(normalizedSlug);
    if (!existing) {
      bySlug.set(normalizedSlug, { article, order: index });
      return;
    }
    const prevTs = Date.parse(existing.article.updatedDate || existing.article.publishedDate) || 0;
    const nextTs = Date.parse(article.updatedDate || article.publishedDate) || 0;
    if (nextTs >= prevTs) {
      bySlug.set(normalizedSlug, { article, order: existing.order });
    }
  });
  return Array.from(bySlug.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.article);
}

/**
 * Stateless canonical catalog loaded from the single version-controlled source of truth
 * (`data/articles-catalog.json`) shared with `scripts/generate-seo-pages.mjs`.
 * Guaranteed immune to ephemeral container restarts and zero modifications to Firestore.
 */
function loadCanonicalArticles(): CanonicalNewsArticle[] {
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as RawCatalogArticle[];
  const mapped: CanonicalNewsArticle[] = raw.map((item) => ({
    slug: item.slug,
    seoTitle: item.seoTitle,
    metaDescription: item.metaDescription,
    publishedDate: item.publishedDate,
    updatedDate: item.updatedDate || item.publishedDate,
    category: item.category,
    topics: Array.isArray(item.topics) ? item.topics : ['south-africa'],
    keywords: Array.isArray(item.keywords) ? item.keywords : [item.category],
    title: item.title,
    imageUrl: resolveAbsoluteImageUrl(item.ogImage || item.img),
    imageAlt: item.alt || item.title,
    canonicalUrl: toCanonical(item.slug),
    source: item.source,
    paragraphs: Array.isArray(item.paragraphs) ? item.paragraphs : [],
    ...(item.externalUrl ? { externalUrl: item.externalUrl } : {}),
  }));
  return deduplicateArticlesBySlug(mapped);
}

let cachedCatalogMtimeMs = 0;
let cachedCatalog: CanonicalNewsArticle[] = [];

try {
  cachedCatalogMtimeMs = fs.statSync(catalogPath).mtimeMs;
} catch {
  cachedCatalogMtimeMs = 0;
}
cachedCatalog = loadCanonicalArticles();

export const CANONICAL_ARTICLES: CanonicalNewsArticle[] = cachedCatalog;

/**
 * Returns the deduplicated canonical article catalog, automatically reloading
 * if `data/articles-catalog.json` has been updated on disk.
 */
export function getCanonicalArticles(): CanonicalNewsArticle[] {
  try {
    const stat = fs.statSync(catalogPath);
    if (stat.mtimeMs !== cachedCatalogMtimeMs) {
      const fresh = loadCanonicalArticles();
      cachedCatalog = fresh;
      cachedCatalogMtimeMs = stat.mtimeMs;
    }
  } catch {
    // Keep last known valid catalog snapshot if file is temporarily unavailable
  }
  return cachedCatalog;
}

export function getArticlesByTopic(
  topic: TopicFeedKey,
  articles: CanonicalNewsArticle[] = getCanonicalArticles()
): CanonicalNewsArticle[] {
  return deduplicateArticlesBySlug(articles).filter((article) => article.topics.includes(topic));
}

/**
 * Merges bundled static canonical articles with server-verified external bridge
 * articles, excludes explicitly retracted/unpublished slugs, and deduplicates
 * by normalized slug (keeping the newest updatedDate/publishedDate revision).
 */
export function mergePublishedArticles(
  bundled: CanonicalNewsArticle[],
  externalApproved: CanonicalNewsArticle[],
  removedSlugs?: Set<string>
): CanonicalNewsArticle[] {
  const excluded = new Set(
    Array.from(removedSlugs || []).map((s) => String(s || '').trim().toLowerCase())
  );
  const combined = [...bundled, ...externalApproved].filter(
    (article) => !excluded.has(String(article.slug || '').trim().toLowerCase())
  );
  return deduplicateArticlesBySlug(combined);
}

