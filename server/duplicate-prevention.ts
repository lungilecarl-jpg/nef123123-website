import crypto from 'node:crypto';
import { OFFICIAL_SITE_ORIGIN, type CanonicalNewsArticle } from './articles-catalog.ts';

export type DuplicateReasonCode =
  | 'duplicate_slug'
  | 'duplicate_canonical_url'
  | 'duplicate_external_id'
  | 'duplicate_source_url'
  | 'duplicate_exact_content'
  | 'duplicate_near_identical_body'
  | 'duplicate_cross_source_story';

export type DuplicateDecision =
  | 'allow'
  | 'allow_revision_update'
  | 'allow_developing_update'
  | 'block_duplicate';

export type DuplicateCheckChannel =
  | 'external_bridge'
  | 'publish_gate'
  | 'rss_import'
  | 'catalog_build'
  | 'admin_check';

export interface DuplicateCandidateArticle {
  id?: string;
  externalId?: string;
  slug?: string;
  canonicalUrl?: string;
  externalUrl?: string;
  title: string;
  metaDescription?: string;
  source?: string;
  publishedDate?: string;
  updatedDate?: string;
  paragraphs?: string[];
  sections?: Array<{ heading?: string; paragraphs?: string[] }>;
}

export interface DuplicateSimilarityScores {
  headlineCosine: number;
  headlineJaccard: number;
  bodyCosine: number;
  bodyTokenJaccard: number;
  shingleJaccard: number;
  sentenceOverlap: number;
  simhashSimilarity: number;
  novelFactRatio: number;
  sameSource: boolean;
}

export interface ArticleFingerprints {
  normalizedSlug: string;
  normalizedCanonicalUrl: string;
  normalizedExternalUrl: string;
  normalizedHeadline: string;
  normalizedHeadlineFingerprint: string;
  normalizedBodyFingerprint: string | null;
  contentSimHash: string;
  bodyTokenCount: number;
}

export interface MatchedArticleSummary {
  slug: string;
  title: string;
  canonicalUrl: string;
  source: string;
  publishedDate: string;
}

export interface DuplicateCheckResult {
  allowed: boolean;
  decision: DuplicateDecision;
  reasonCode: DuplicateReasonCode | null;
  explanation: string;
  matchedArticle: MatchedArticleSummary | null;
  scores: DuplicateSimilarityScores | null;
  fingerprints: ArticleFingerprints;
}

export interface RejectedDuplicateRecord {
  rejectedAt: string;
  channel: DuplicateCheckChannel;
  candidateId: string;
  candidateSlug: string;
  candidateTitle: string;
  candidateSource: string;
  candidateUrl: string;
  reasonCode: DuplicateReasonCode;
  explanation: string;
  matchedArticleSlug: string;
  matchedArticleTitle: string;
  matchedArticleUrl: string;
  scores: DuplicateSimilarityScores | null;
}

export interface DuplicateAuditFinding {
  classification: 'exact_duplicate' | 'suspected_near_duplicate' | 'related_developing_coverage';
  reasonCode: DuplicateReasonCode | null;
  articleA: MatchedArticleSummary;
  articleB: MatchedArticleSummary;
  scores: DuplicateSimilarityScores;
  explanation: string;
  recommendation: string;
}

export interface DuplicateAuditReport {
  auditedAt: string;
  totalArticlesScanned: number;
  exactDuplicatesCount: number;
  suspectedNearDuplicatesCount: number;
  relatedDevelopingCoverageCount: number;
  exactDuplicates: DuplicateAuditFinding[];
  suspectedNearDuplicates: DuplicateAuditFinding[];
  relatedDevelopingCoverage: DuplicateAuditFinding[];
  duplicateUrlEntries: Array<{ url: string; slugs: string[] }>;
  cleanStatus: boolean;
  recommendations: string[];
}

export interface EvaluateDuplicateOptions {
  allowSameSlugUpdate?: boolean;
  channel?: DuplicateCheckChannel;
  recordRejection?: boolean;
  registry?: DuplicateRejectionRegistry;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'had',
  'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
  'into', 'over', 'after', 'before', 'their', 'they', 'them', 'there', 'these',
  'those', 'which', 'about', 'more', 'also', 'than', 'when', 'what', 'where',
  'while', 'says', 'said', 'told', 'not', 'but', 'can', 'its', 'our', 'out',
  'all', 'who', 'how', 'why', 'now', 'new', 'one', 'two', 'his', 'her', 'she',
  'him', 'you', 'your', 'may', 'must', 'only', 'other', 'such', 'some', 'most',
  'very', 'between', 'through', 'against', 'under', 'across', 'within', 'without',
  'during', 'here', 'just', 'like', 'well', 'even', 'much', 'many', 'still',
  'back', 'both', 'each', 'make', 'made', 'take', 'took', 'into', 'onto', 'upon',
  'because', 'since', 'until', 'though', 'although', 'however', 'while', 'whether',
  'according', 'reported', 'report', 'news', 'article', 'story',
]);

const TRACKING_QUERY_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'yclid', 'mc_cid', 'mc_eid',
  'ref', 'ref_src', 'ref_url', 'source', 'src', 'si', 'igshid',
  'at_medium', 'at_campaign', 'at_custom1', 'at_custom2', 'at_custom3', 'at_custom4',
  'ocid', 'cmpid', 'share', 's', 't', 'feature', 'pp', 'ns_mchannel', 'ns_source',
]);

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Normalizes any canonical or external source URL so superficial differences
 * (http vs https, www vs apex, trailing slash, .html suffix, fragments,
 * and tracking query parameters) resolve to the same canonical comparison key.
 */
export function normalizeUrlForDuplicateCheck(rawUrl?: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = trimmed.startsWith('/')
      ? new URL(trimmed, OFFICIAL_SITE_ORIGIN)
      : new URL(trimmed);
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const port =
    parsed.port && parsed.port !== '80' && parsed.port !== '443' ? `:${parsed.port}` : '';

  let pathname = parsed.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, '');
  }
  if (/^\/news\/[a-z0-9-]+\.html$/i.test(pathname)) {
    pathname = pathname.replace(/\.html$/i, '');
  }
  pathname = pathname.toLowerCase();

  const keptParams: Array<[string, string]> = [];
  parsed.searchParams.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('utm_') || TRACKING_QUERY_PARAMS.has(lowerKey)) {
      return;
    }
    keptParams.push([lowerKey, value.trim()]);
  });
  keptParams.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  const queryStr = keptParams.length
    ? `?${keptParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
    : '';

  return `https://${host}${port}${pathname}${queryStr}`;
}

export function normalizeHeadlineText(title: string): string {
  return String(title || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/\s*\|\s*(nef123123|sabc|timeslive|news24|ewn|iol|reuters|bbc|espn|businesstech).*$/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFullBodyText(article: DuplicateCandidateArticle): string {
  const parts: string[] = [];
  if (Array.isArray(article.paragraphs)) {
    for (const p of article.paragraphs) {
      if (typeof p === 'string' && p.trim()) {
        parts.push(p.trim());
      }
    }
  }
  if (Array.isArray(article.sections)) {
    for (const sec of article.sections) {
      if (sec && Array.isArray(sec.paragraphs)) {
        for (const p of sec.paragraphs) {
          if (typeof p === 'string' && p.trim()) {
            parts.push(p.trim());
          }
        }
      }
    }
  }
  if (parts.length === 0 && typeof article.metaDescription === 'string' && article.metaDescription.trim()) {
    parts.push(article.metaDescription.trim());
  }
  return parts.join('\n');
}

export function normalizeBodyText(rawBody: string): string {
  return String(rawBody || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, ' ')
    // Strip common wire/newsroom dateline prefixes and attribution footers
    .replace(/^(johannesburg|cape town|pretoria|durban|nairobi|lagos|london|washington)\s*[-:]\s*/i, '')
    .replace(/\b(sources? cited|published by nef123123|live syndication dispatch)\b[^.\n]*\.?/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeContent(normalizedText: string): string[] {
  if (!normalizedText) return [];
  return normalizedText
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function tokenizeAllWords(normalizedText: string): string[] {
  if (!normalizedText) return [];
  return normalizedText.split(/\s+/).filter((w) => w.length >= 2);
}

function buildShingles(words: string[], size = 4): Set<string> {
  const result = new Set<string>();
  if (words.length < size) return result;
  for (let i = 0; i <= words.length - size; i += 1) {
    result.add(words.slice(i, i + size).join(' '));
  }
  return result;
}

function extractNormalizedSentences(rawBody: string): string[][] {
  const chunks = String(rawBody || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => normalizeBodyText(s))
    .filter(Boolean);

  const sentences: string[][] = [];
  for (const s of chunks) {
    const words = tokenizeContent(s);
    if (words.length >= 5) {
      sentences.push(words);
    }
  }
  return sentences;
}

function computeCosineSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();
  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, countA] of freqA) {
    normA += countA * countA;
    const countB = freqB.get(term);
    if (countB) dot += countA * countB;
  }
  for (const [, countB] of freqB) {
    normB += countB * countB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeSetJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const item of smaller) {
    if (larger.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 64-bit SimHash over content tokens and 3-gram phrases for fast near-duplicate fingerprinting.
 */
function computeSimHash64(tokens: string[]): bigint {
  if (tokens.length === 0) return 0n;
  const weights = new Array<number>(64).fill(0);
  const features: string[] = [...tokens];
  for (let i = 0; i <= tokens.length - 3; i += 1) {
    features.push(`${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
  }
  for (const feat of features) {
    const hash = crypto.createHash('sha256').update(feat, 'utf8').digest();
    const bits = hash.readBigUInt64BE(0);
    for (let bit = 0; bit < 64; bit += 1) {
      const mask = 1n << BigInt(bit);
      weights[bit] += (bits & mask) !== 0n ? 1 : -1;
    }
  }
  let simhash = 0n;
  for (let bit = 0; bit < 64; bit += 1) {
    if (weights[bit] >= 0) {
      simhash |= 1n << BigInt(bit);
    }
  }
  return simhash;
}

function computeSimHashSimilarity(hashA: bigint, hashB: bigint): number {
  let xor = hashA ^ hashB;
  let distance = 0;
  while (xor !== 0n) {
    xor &= xor - 1n;
    distance += 1;
  }
  return 1 - distance / 64;
}

function computeSentenceContainment(sentencesA: string[][], sentencesB: string[][]): number {
  if (sentencesA.length === 0 || sentencesB.length === 0) return 0;
  const [shorter, longer] =
    sentencesA.length <= sentencesB.length ? [sentencesA, sentencesB] : [sentencesB, sentencesA];
  const longerSets = longer.map((s) => new Set(s));

  let matched = 0;
  for (const sent of shorter) {
    const sentSet = new Set(sent);
    let best = 0;
    for (const targetSet of longerSets) {
      const jac = computeSetJaccard(sentSet, targetSet);
      if (jac > best) best = jac;
      if (best >= 0.78) break;
    }
    if (best >= 0.78) matched += 1;
  }
  return matched / shorter.length;
}

function normalizeSourceName(source?: string): string {
  return String(source || '')
    .toLowerCase()
    .replace(/^sources?\s*(?:cited)?\s*:\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface PreparedArticle {
  raw: DuplicateCandidateArticle;
  slug: string;
  externalId: string;
  canonicalUrl: string;
  normalizedCanonicalUrl: string;
  normalizedExternalUrl: string;
  normalizedSource: string;
  normalizedHeadline: string;
  normalizedHeadlineFingerprint: string;
  normalizedBody: string;
  normalizedBodyFingerprint: string | null;
  headlineTokens: string[];
  headlineTokenSet: Set<string>;
  bodyTokens: string[];
  bodyTokenSet: Set<string>;
  bodyAllWords: string[];
  bodyShingles: Set<string>;
  sentences: string[][];
  simhash: bigint;
  simhashHex: string;
  distinctiveTokens: Set<string>;
}

function prepareArticle(article: DuplicateCandidateArticle): PreparedArticle {
  const slug = String(article.slug || '').trim().toLowerCase();
  const externalId = String(article.externalId || article.id || '').trim();
  const canonicalUrl =
    article.canonicalUrl || (slug ? `${OFFICIAL_SITE_ORIGIN}/news/${slug}` : '');
  const normalizedCanonicalUrl = normalizeUrlForDuplicateCheck(canonicalUrl);
  const normalizedExternalUrl = normalizeUrlForDuplicateCheck(article.externalUrl);
  const normalizedSource = normalizeSourceName(article.source);
  const normalizedHeadline = normalizeHeadlineText(article.title);
  const normalizedHeadlineFingerprint = sha256Hex(normalizedHeadline);

  const rawBody = extractFullBodyText(article);
  const normalizedBody = normalizeBodyText(rawBody);
  const bodyAllWords = tokenizeAllWords(normalizedBody);
  const bodyTokens = tokenizeContent(normalizedBody);
  const normalizedBodyFingerprint =
    bodyAllWords.length >= 12 ? sha256Hex(normalizedBody) : null;

  const headlineTokens = tokenizeContent(normalizedHeadline);
  const bodyShingles = buildShingles(bodyAllWords, 4);
  const sentences = extractNormalizedSentences(rawBody);
  const simhash = computeSimHash64(bodyTokens.length >= 5 ? bodyTokens : headlineTokens);
  const simhashHex = simhash.toString(16).padStart(16, '0');

  // Distinctive tokens (length >= 4 or numeric facts) used to measure genuine novel reporting
  const distinctiveTokens = new Set<string>();
  for (const tok of bodyTokens) {
    if (tok.length >= 4 || /^\d+$/.test(tok)) {
      distinctiveTokens.add(tok);
    }
  }

  return {
    raw: article,
    slug,
    externalId,
    canonicalUrl,
    normalizedCanonicalUrl,
    normalizedExternalUrl,
    normalizedSource,
    normalizedHeadline,
    normalizedHeadlineFingerprint,
    normalizedBody,
    normalizedBodyFingerprint,
    headlineTokens,
    headlineTokenSet: new Set(headlineTokens),
    bodyTokens,
    bodyTokenSet: new Set(bodyTokens),
    bodyAllWords,
    bodyShingles,
    sentences,
    simhash,
    simhashHex,
    distinctiveTokens,
  };
}

export function buildArticleFingerprints(article: DuplicateCandidateArticle): ArticleFingerprints {
  const prep = prepareArticle(article);
  return {
    normalizedSlug: prep.slug,
    normalizedCanonicalUrl: prep.normalizedCanonicalUrl,
    normalizedExternalUrl: prep.normalizedExternalUrl,
    normalizedHeadline: prep.normalizedHeadline,
    normalizedHeadlineFingerprint: prep.normalizedHeadlineFingerprint,
    normalizedBodyFingerprint: prep.normalizedBodyFingerprint,
    contentSimHash: prep.simhashHex,
    bodyTokenCount: prep.bodyAllWords.length,
  };
}

function toMatchedSummary(prep: PreparedArticle): MatchedArticleSummary {
  return {
    slug: prep.slug || '(no-slug)',
    title: prep.raw.title || '(untitled)',
    canonicalUrl: prep.canonicalUrl || prep.normalizedExternalUrl || '',
    source: prep.raw.source || 'NEF123123',
    publishedDate: prep.raw.publishedDate || '',
  };
}

function comparePreparedArticles(
  candidate: PreparedArticle,
  existing: PreparedArticle
): DuplicateSimilarityScores {
  const headlineCosine = computeCosineSimilarity(candidate.headlineTokens, existing.headlineTokens);
  const headlineJaccard = computeSetJaccard(candidate.headlineTokenSet, existing.headlineTokenSet);
  const bodyCosine = computeCosineSimilarity(candidate.bodyTokens, existing.bodyTokens);
  const bodyTokenJaccard = computeSetJaccard(candidate.bodyTokenSet, existing.bodyTokenSet);
  const shingleJaccard = computeSetJaccard(candidate.bodyShingles, existing.bodyShingles);
  const sentenceOverlap = computeSentenceContainment(candidate.sentences, existing.sentences);
  const simhashSimilarity = computeSimHashSimilarity(candidate.simhash, existing.simhash);

  // Measure how much genuinely new information the candidate introduces vs existing article
  const existingCombined = new Set<string>([
    ...existing.distinctiveTokens,
    ...existing.headlineTokenSet,
  ]);
  let novelCount = 0;
  for (const tok of candidate.distinctiveTokens) {
    if (!existingCombined.has(tok)) novelCount += 1;
  }
  const novelFactRatio =
    candidate.distinctiveTokens.size > 0
      ? novelCount / candidate.distinctiveTokens.size
      : 1;

  const sameSource =
    Boolean(candidate.normalizedSource) &&
    candidate.normalizedSource === existing.normalizedSource;

  return {
    headlineCosine: round3(headlineCosine),
    headlineJaccard: round3(headlineJaccard),
    bodyCosine: round3(bodyCosine),
    bodyTokenJaccard: round3(bodyTokenJaccard),
    shingleJaccard: round3(shingleJaccard),
    sentenceOverlap: round3(sentenceOverlap),
    simhashSimilarity: round3(simhashSimilarity),
    novelFactRatio: round3(novelFactRatio),
    sameSource,
  };
}

function evaluatePair(
  candidate: PreparedArticle,
  existing: PreparedArticle,
  allowSameSlugUpdate: boolean
): {
  status: 'duplicate' | 'revision_update' | 'developing_update' | 'distinct';
  reasonCode: DuplicateReasonCode | null;
  explanation: string;
  scores: DuplicateSimilarityScores;
} {
  const scores = comparePreparedArticles(candidate, existing);

  // 1. Same slug check (allows legitimate newer revision updates only when explicitly permitted)
  if (candidate.slug && existing.slug && candidate.slug === existing.slug) {
    const prevTs = Date.parse(existing.raw.updatedDate || existing.raw.publishedDate || '') || 0;
    const nextTs = Date.parse(candidate.raw.updatedDate || candidate.raw.publishedDate || '') || 0;
    const bodyChanged =
      candidate.normalizedBodyFingerprint !== existing.normalizedBodyFingerprint ||
      candidate.normalizedHeadlineFingerprint !== existing.normalizedHeadlineFingerprint;

    if (allowSameSlugUpdate && nextTs > prevTs && bodyChanged) {
      return {
        status: 'revision_update',
        reasonCode: null,
        explanation: `Legitimate newer revision for existing slug "${candidate.slug}" (updated timestamp advances with revised content).`,
        scores,
      };
    }

    return {
      status: 'duplicate',
      reasonCode: 'duplicate_slug',
      explanation: `Blocked duplicate slug "${candidate.slug}": an article with this slug is already published ("${existing.raw.title}").`,
      scores,
    };
  }

  // 2. Duplicate normalized canonical URL
  if (
    candidate.normalizedCanonicalUrl &&
    existing.normalizedCanonicalUrl &&
    candidate.normalizedCanonicalUrl === existing.normalizedCanonicalUrl
  ) {
    return {
      status: 'duplicate',
      reasonCode: 'duplicate_canonical_url',
      explanation: `Blocked duplicate canonical URL "${candidate.normalizedCanonicalUrl}" matching existing article "${existing.slug}".`,
      scores,
    };
  }

  // 3. Duplicate upstream externalId
  if (candidate.externalId && existing.externalId && candidate.externalId === existing.externalId) {
    return {
      status: 'duplicate',
      reasonCode: 'duplicate_external_id',
      explanation: `Blocked duplicate external article ID "${candidate.externalId}" already published under "${existing.slug}".`,
      scores,
    };
  }

  // 4. Duplicate normalized external/source URL (strips utm_*, fbclid, http/https, www, trailing slash)
  if (
    candidate.normalizedExternalUrl &&
    existing.normalizedExternalUrl &&
    candidate.normalizedExternalUrl === existing.normalizedExternalUrl
  ) {
    return {
      status: 'duplicate',
      reasonCode: 'duplicate_source_url',
      explanation: `Blocked duplicate source URL "${candidate.normalizedExternalUrl}" already published under "${existing.slug}".`,
      scores,
    };
  }

  // 5. Exact normalized content fingerprint match (blocks identical content even with completely different headlines!)
  if (
    candidate.normalizedBodyFingerprint &&
    existing.normalizedBodyFingerprint &&
    candidate.normalizedBodyFingerprint === existing.normalizedBodyFingerprint
  ) {
    return {
      status: 'duplicate',
      reasonCode: 'duplicate_exact_content',
      explanation: `Blocked exact duplicate body content (SHA-256 fingerprint match) against "${existing.slug}", regardless of headline differences.`,
      scores,
    };
  }

  const minBodyWords = Math.min(candidate.bodyAllWords.length, existing.bodyAllWords.length);

  // 6. Near-identical / lightly edited / padded body content (independent of headline!)
  if (minBodyWords >= 22) {
    const isNearIdenticalBody =
      scores.shingleJaccard >= 0.42 ||
      scores.sentenceOverlap >= 0.5 ||
      (scores.bodyCosine >= 0.78 && scores.shingleJaccard >= 0.22) ||
      (scores.bodyCosine >= 0.84 && scores.simhashSimilarity >= 0.84);

    if (isNearIdenticalBody) {
      return {
        status: 'duplicate',
        reasonCode: 'duplicate_near_identical_body',
        explanation: `Blocked substantially identical article content matching "${existing.slug}" (bodyCosine=${scores.bodyCosine}, shingleJaccard=${scores.shingleJaccard}, sentenceOverlap=${scores.sentenceOverlap}, simhash=${scores.simhashSimilarity}).`,
        scores,
      };
    }
  }

  // 7. Editorial Quality Guard: Distinguish legitimate developing-story updates from cross-source duplicates
  // Never rely on headlines alone — check whether the incoming article contributes substantial novel facts/reporting.
  const isCrossSourceDuplicate =
    // Standard multi-source rewrite of the same facts without substantial new information
    (scores.headlineCosine >= 0.4 &&
      (scores.bodyCosine >= 0.58 || scores.bodyTokenJaccard >= 0.4) &&
      scores.novelFactRatio < 0.44) ||
    // Very close headline AND substantial body overlap with low novelty
    (scores.headlineCosine >= 0.8 &&
      scores.bodyCosine >= 0.46 &&
      scores.novelFactRatio < 0.46) ||
    // Short RSS/wire blurbs (< 35 words) imported across feeds with strong headline + body overlap
    (minBodyWords > 0 &&
      minBodyWords < 35 &&
      scores.headlineCosine >= 0.62 &&
      scores.bodyCosine >= 0.52 &&
      scores.novelFactRatio < 0.42);

  if (isCrossSourceDuplicate) {
    const sourceContext = scores.sameSource
      ? 'from the same source'
      : `across different sources ("${candidate.raw.source || 'unknown'}" vs "${existing.raw.source || 'unknown'}")`;
    return {
      status: 'duplicate',
      reasonCode: 'duplicate_cross_source_story',
      explanation: `Blocked duplicate story ${sourceContext} matching "${existing.slug}" (headlineCosine=${scores.headlineCosine}, bodyCosine=${scores.bodyCosine}, novelFactRatio=${scores.novelFactRatio}).`,
      scores,
    };
  }

  // Identify legitimate developing-event updates / distinct reporting on a related topic
  const isRelatedDevelopingStory =
    (scores.headlineCosine >= 0.3 && scores.novelFactRatio >= 0.44) ||
    (scores.bodyCosine >= 0.35 && scores.bodyCosine < 0.6 && scores.novelFactRatio >= 0.44);

  if (isRelatedDevelopingStory) {
    return {
      status: 'developing_update',
      reasonCode: null,
      explanation: `Related to "${existing.slug}" on a shared topic, but provides genuinely distinct information/reporting (novelFactRatio=${scores.novelFactRatio}, shingleJaccard=${scores.shingleJaccard}). Allowed as distinct coverage.`,
      scores,
    };
  }

  return {
    status: 'distinct',
    reasonCode: null,
    explanation: 'No duplicate match detected.',
    scores,
  };
}

/**
 * Stateless bounded in-memory registry of rejected duplicate submissions.
 * Zero SQLite / zero Firestore writes (preserves Phase 1–3 zero-DB safeguards).
 */
export class DuplicateRejectionRegistry {
  private readonly maxEntries: number;
  private records: RejectedDuplicateRecord[] = [];
  private totalBlocked = 0;

  constructor(maxEntries = 250) {
    this.maxEntries = maxEntries;
  }

  public record(entry: Omit<RejectedDuplicateRecord, 'rejectedAt'>): RejectedDuplicateRecord {
    const fullRecord: RejectedDuplicateRecord = {
      ...entry,
      rejectedAt: new Date().toISOString(),
    };
    this.records.unshift(fullRecord);
    if (this.records.length > this.maxEntries) {
      this.records.length = this.maxEntries;
    }
    this.totalBlocked += 1;
    return fullRecord;
  }

  public getRecords(limit = 100): RejectedDuplicateRecord[] {
    return this.records.slice(0, Math.max(1, Math.min(limit, this.maxEntries)));
  }

  public getSummary() {
    const byReason: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    for (const r of this.records) {
      byReason[r.reasonCode] = (byReason[r.reasonCode] || 0) + 1;
      byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
    }
    return {
      totalBlockedSinceStartup: this.totalBlocked,
      retainedRecordsCount: this.records.length,
      byReason,
      byChannel,
    };
  }

  public clear(): void {
    this.records = [];
    this.totalBlocked = 0;
  }
}

export const duplicateRejectionRegistry = new DuplicateRejectionRegistry();

/**
 * Primary pre-publication duplicate prevention gate.
 * Evaluates a candidate article against all existing published articles using:
 *  - canonical URL, slug, externalId, and source URL normalization
 *  - exact SHA-256 normalized content fingerprint
 *  - near-duplicate body similarity (4-gram shingles, sentence containment, TF cosine, 64-bit SimHash)
 *  - cross-source story overlap with novel-information protection for legitimate developing updates
 */
export function evaluateArticleForDuplicates(
  candidate: DuplicateCandidateArticle,
  existingArticles: DuplicateCandidateArticle[],
  options: EvaluateDuplicateOptions = {}
): DuplicateCheckResult {
  const allowSameSlugUpdate = options.allowSameSlugUpdate === true;
  const channel: DuplicateCheckChannel = options.channel || 'publish_gate';
  const registry = options.registry || duplicateRejectionRegistry;

  const prepCandidate = prepareArticle(candidate);
  const fingerprints: ArticleFingerprints = {
    normalizedSlug: prepCandidate.slug,
    normalizedCanonicalUrl: prepCandidate.normalizedCanonicalUrl,
    normalizedExternalUrl: prepCandidate.normalizedExternalUrl,
    normalizedHeadline: prepCandidate.normalizedHeadline,
    normalizedHeadlineFingerprint: prepCandidate.normalizedHeadlineFingerprint,
    normalizedBodyFingerprint: prepCandidate.normalizedBodyFingerprint,
    contentSimHash: prepCandidate.simhashHex,
    bodyTokenCount: prepCandidate.bodyAllWords.length,
  };

  let bestDevelopingMatch: {
    existing: PreparedArticle;
    scores: DuplicateSimilarityScores;
    explanation: string;
  } | null = null;
  let revisionMatch: {
    existing: PreparedArticle;
    scores: DuplicateSimilarityScores;
    explanation: string;
  } | null = null;

  for (const rawExisting of existingArticles) {
    const prepExisting = prepareArticle(rawExisting);
    const pairResult = evaluatePair(prepCandidate, prepExisting, allowSameSlugUpdate);

    if (pairResult.status === 'duplicate' && pairResult.reasonCode) {
      const matched = toMatchedSummary(prepExisting);
      if (options.recordRejection !== false) {
        registry.record({
          channel,
          candidateId: prepCandidate.externalId || prepCandidate.slug || '(unassigned)',
          candidateSlug: prepCandidate.slug || '(unassigned)',
          candidateTitle: prepCandidate.raw.title || '(untitled)',
          candidateSource: prepCandidate.raw.source || 'Unknown',
          candidateUrl: prepCandidate.normalizedExternalUrl || prepCandidate.normalizedCanonicalUrl || '',
          reasonCode: pairResult.reasonCode,
          explanation: pairResult.explanation,
          matchedArticleSlug: matched.slug,
          matchedArticleTitle: matched.title,
          matchedArticleUrl: matched.canonicalUrl,
          scores: pairResult.scores,
        });
      }
      return {
        allowed: false,
        decision: 'block_duplicate',
        reasonCode: pairResult.reasonCode,
        explanation: pairResult.explanation,
        matchedArticle: matched,
        scores: pairResult.scores,
        fingerprints,
      };
    }

    if (pairResult.status === 'revision_update') {
      revisionMatch = {
        existing: prepExisting,
        scores: pairResult.scores,
        explanation: pairResult.explanation,
      };
    } else if (pairResult.status === 'developing_update') {
      if (
        !bestDevelopingMatch ||
        pairResult.scores.bodyCosine > bestDevelopingMatch.scores.bodyCosine
      ) {
        bestDevelopingMatch = {
          existing: prepExisting,
          scores: pairResult.scores,
          explanation: pairResult.explanation,
        };
      }
    }
  }

  if (revisionMatch) {
    return {
      allowed: true,
      decision: 'allow_revision_update',
      reasonCode: null,
      explanation: revisionMatch.explanation,
      matchedArticle: toMatchedSummary(revisionMatch.existing),
      scores: revisionMatch.scores,
      fingerprints,
    };
  }

  if (bestDevelopingMatch) {
    return {
      allowed: true,
      decision: 'allow_developing_update',
      reasonCode: null,
      explanation: bestDevelopingMatch.explanation,
      matchedArticle: toMatchedSummary(bestDevelopingMatch.existing),
      scores: bestDevelopingMatch.scores,
      fingerprints,
    };
  }

  return {
    allowed: true,
    decision: 'allow',
    reasonCode: null,
    explanation: 'Passed all duplicate prevention checks (URL, fingerprint, body similarity, and cross-source checks).',
    matchedArticle: null,
    scores: null,
    fingerprints,
  };
}

/**
 * Filters a batch of incoming articles (from RSS, Atom, JSON Feed, or external APIs)
 * against both existing published articles AND earlier accepted items in the same batch.
 * Never publishes duplicates; returns both accepted items and detailed blocked entries.
 */
export function filterDuplicateFeedImports<T extends DuplicateCandidateArticle>(
  incomingItems: T[],
  existingPublished: DuplicateCandidateArticle[],
  options: EvaluateDuplicateOptions = {}
): {
  accepted: T[];
  blocked: Array<{ item: T; result: DuplicateCheckResult }>;
} {
  const accepted: T[] = [];
  const blocked: Array<{ item: T; result: DuplicateCheckResult }> = [];
  const runningPool: DuplicateCandidateArticle[] = [...existingPublished];

  for (const item of incomingItems) {
    const check = evaluateArticleForDuplicates(item, runningPool, {
      allowSameSlugUpdate: options.allowSameSlugUpdate ?? false,
      channel: options.channel || 'rss_import',
      recordRejection: options.recordRejection !== false,
      registry: options.registry || duplicateRejectionRegistry,
    });

    if (!check.allowed) {
      blocked.push({ item, result: check });
      continue;
    }

    accepted.push(item);
    // Update running pool so subsequent items in the same batch are checked against this item too
    if (check.decision === 'allow_revision_update' && item.slug) {
      const targetSlug = item.slug.trim().toLowerCase();
      const idx = runningPool.findIndex((a) => String(a.slug || '').trim().toLowerCase() === targetSlug);
      if (idx >= 0) {
        runningPool[idx] = item;
      } else {
        runningPool.push(item);
      }
    } else {
      runningPool.push(item);
    }
  }

  return { accepted, blocked };
}

/**
 * Read-only audit of existing published articles.
 * NEVER deletes, merges, or rewrites any article — produces a factual report
 * separating exact duplicates, suspected near-duplicates, and legitimate related developing coverage.
 */
export function auditPublishedArticlesForDuplicates(
  articles: Array<CanonicalNewsArticle | DuplicateCandidateArticle>
): DuplicateAuditReport {
  const prepared = articles.map((a) => prepareArticle(a));
  const exactDuplicates: DuplicateAuditFinding[] = [];
  const suspectedNearDuplicates: DuplicateAuditFinding[] = [];
  const relatedDevelopingCoverage: DuplicateAuditFinding[] = [];

  const urlToSlugs = new Map<string, Set<string>>();
  for (const item of prepared) {
    const urls = [item.normalizedCanonicalUrl, item.normalizedExternalUrl].filter(Boolean);
    for (const u of urls) {
      if (!urlToSlugs.has(u)) urlToSlugs.set(u, new Set());
      urlToSlugs.get(u)!.add(item.slug || item.raw.title);
    }
  }

  const duplicateUrlEntries: Array<{ url: string; slugs: string[] }> = [];
  for (const [url, slugsSet] of urlToSlugs.entries()) {
    if (slugsSet.size > 1) {
      duplicateUrlEntries.push({ url, slugs: Array.from(slugsSet) });
    }
  }

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const a = prepared[i];
      const b = prepared[j];
      const verdict = evaluatePair(b, a, false);

      if (verdict.status === 'duplicate' && verdict.reasonCode) {
        const isExact =
          verdict.reasonCode === 'duplicate_slug' ||
          verdict.reasonCode === 'duplicate_canonical_url' ||
          verdict.reasonCode === 'duplicate_external_id' ||
          verdict.reasonCode === 'duplicate_source_url' ||
          verdict.reasonCode === 'duplicate_exact_content';

        const finding: DuplicateAuditFinding = {
          classification: isExact ? 'exact_duplicate' : 'suspected_near_duplicate',
          reasonCode: verdict.reasonCode,
          articleA: toMatchedSummary(a),
          articleB: toMatchedSummary(b),
          scores: verdict.scores,
          explanation: verdict.explanation,
          recommendation: isExact
            ? 'Review manually and, after owner approval, retain the authoritative canonical URL and remove or 301-redirect the duplicate entry.'
            : 'Review both articles manually to determine whether to consolidate into a single comprehensive report or differentiate reporting angle.',
        };
        if (isExact) {
          exactDuplicates.push(finding);
        } else {
          suspectedNearDuplicates.push(finding);
        }
      } else if (verdict.status === 'developing_update') {
        relatedDevelopingCoverage.push({
          classification: 'related_developing_coverage',
          reasonCode: null,
          articleA: toMatchedSummary(a),
          articleB: toMatchedSummary(b),
          scores: verdict.scores,
          explanation: verdict.explanation,
          recommendation:
            'Keep both articles published: distinct reporting/analysis on a related topic or developing story (not a duplicate).',
        });
      }
    }
  }

  const recommendations: string[] = [];
  if (exactDuplicates.length === 0 && suspectedNearDuplicates.length === 0) {
    recommendations.push(
      'No exact duplicates or suspected near-duplicates detected across the published article catalog. No destructive cleanup is required.'
    );
  } else {
    recommendations.push(
      'Manual editorial review required before any deletion, merge, or rewrite. Automatic destructive modifications are permanently disabled.'
    );
  }
  if (relatedDevelopingCoverage.length > 0) {
    recommendations.push(
      `${relatedDevelopingCoverage.length} related story pair(s) share subjects/themes with genuinely distinct reporting; preserve all as legitimate separate coverage.`
    );
  }

  return {
    auditedAt: new Date().toISOString(),
    totalArticlesScanned: prepared.length,
    exactDuplicatesCount: exactDuplicates.length,
    suspectedNearDuplicatesCount: suspectedNearDuplicates.length,
    relatedDevelopingCoverageCount: relatedDevelopingCoverage.length,
    exactDuplicates,
    suspectedNearDuplicates,
    relatedDevelopingCoverage,
    duplicateUrlEntries,
    cleanStatus: exactDuplicates.length === 0 && suspectedNearDuplicates.length === 0,
    recommendations,
  };
}
