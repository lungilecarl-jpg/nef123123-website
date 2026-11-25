import crypto from 'node:crypto';
import {
  OFFICIAL_SITE_ORIGIN,
  deduplicateArticlesBySlug,
  getCanonicalArticles,
  isValidTopicFeed,
  type CanonicalNewsArticle,
  type TopicFeedKey,
} from './articles-catalog.ts';
import { getConfiguredAdminEmail } from './admin-auth.ts';
import {
  DuplicateRejectionRegistry,
  duplicateRejectionRegistry,
  evaluateArticleForDuplicates,
  normalizeUrlForDuplicateCheck,
  type DuplicateCandidateArticle,
} from './duplicate-prevention.ts';
import {
  pingWebSubHub,
  submitUrlsToIndexNow,
} from './seo-distribution.ts';

export const PUBLISHING_CONTRACT_VERSION = 'nef123123-publishing/v1';

const MAX_FEED_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_FEED_ARTICLES = 500;
const FETCH_TIMEOUT_MS = 8_000;
const MIN_APPROVAL_SECRET_LENGTH = 32;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_WITH_TZ_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const HEX_64_REGEX = /^[a-f0-9]{64}$/i;

export type BridgeState =
  | 'disabled_by_flag'
  | 'disabled_unconfigured'
  | 'disabled_missing_approval_secret'
  | 'disabled_invalid_url'
  | 'ready'
  | 'error';

export type RejectionReasonCode =
  | 'missing_approval_status'
  | 'unapproved_status'
  | 'missing_approved_by'
  | 'unauthorized_approver'
  | 'invalid_approved_at'
  | 'missing_approval_signature'
  | 'invalid_approval_signature'
  | 'schema_validation_failed'
  | 'duplicate_suppressed';

export interface ExternalRawArticle {
  id?: unknown;
  slug?: unknown;
  approvalStatus?: unknown;
  approvedBy?: unknown;
  approvedAt?: unknown;
  approvalSignature?: unknown;
  title?: unknown;
  seoTitle?: unknown;
  metaDescription?: unknown;
  category?: unknown;
  topics?: unknown;
  keywords?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  author?: unknown;
  source?: unknown;
  paragraphs?: unknown;
  externalUrl?: unknown;
  externalLabel?: unknown;
}

export interface ExternalRemovedSlug {
  slug?: unknown;
  removedAt?: unknown;
  approvedBy?: unknown;
  approvalSignature?: unknown;
  reason?: unknown;
}

export interface ExternalPublishingFeedPayload {
  schemaVersion: string;
  source: string;
  siteOrigin?: string;
  generatedAt: string;
  articles: ExternalRawArticle[];
  removedSlugs?: ExternalRemovedSlug[];
}

export interface ApprovedBridgeArticle extends CanonicalNewsArticle {
  externalId: string;
  author: string;
  externalLabel?: string;
  approvedBy: string;
  approvedAt: string;
  contentFingerprint: string;
  origin: 'external_bridge';
}

export interface BridgeRejectionEntry {
  slug: string;
  id: string;
  reason: RejectionReasonCode;
  detail: string;
}

export interface BridgeSyncDiff {
  created: string[];
  updated: string[];
  removed: string[];
  unchanged: string[];
}

export interface BridgeSyncResult {
  outcome: 'disabled' | 'synced' | 'not_modified' | 'error';
  state: BridgeState;
  outboundFetchPerformed: boolean;
  httpStatus: number | null;
  message: string;
  approvedCount: number;
  removedCount: number;
  rejectedCount: number;
  diff: BridgeSyncDiff;
  rejections: BridgeRejectionEntry[];
  syncedAt: string;
}

export interface BridgeStatusSnapshot {
  contractVersion: string;
  state: BridgeState;
  enabledFlag: boolean;
  feedUrlConfigured: boolean;
  feedHost: string | null;
  approvalSecretConfigured: boolean;
  feedTokenConfigured: boolean;
  authorizedApproversCount: number;
  outboundFetchesAllowed: boolean;
  pollingActive: boolean;
  syncIntervalSeconds: number;
  approvedCount: number;
  removedCount: number;
  rejectedCount: number;
  outboundRequestCount: number;
  lastSyncAt: string | null;
  lastSyncOutcome: 'never' | 'disabled' | 'synced' | 'not_modified' | 'error';
  lastError: string | null;
  lastDiff: BridgeSyncDiff;
  recentRejections: BridgeRejectionEntry[];
}

export interface BridgeRuntimeConfig {
  enabled?: boolean;
  feedUrl?: string;
  feedToken?: string;
  approvalSecret?: string;
  allowedApprovers?: string[];
  syncIntervalSeconds?: number;
  /**
   * Strictly internal option for automated unit tests targeting an in-process
   * local mock HTTP server. Never exposed to environment variables or HTTP routes.
   */
  allowLocalTestFeed?: boolean;
  notifySearchEngines?: boolean;
  /**
   * Optional duplicate rejection registry override (defaults to shared server registry).
   */
  duplicateRegistry?: DuplicateRejectionRegistry;
  /**
   * Optional existing published catalog provider (defaults to bundled NEF123123 catalog).
   */
  existingArticlesProvider?: () => CanonicalNewsArticle[];
}

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function isValidIsoTimestampWithTz(value: string): boolean {
  if (!ISO_WITH_TZ_REGEX.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function isStrictHttpsPublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return isPublicSafeHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function isPrivateOrLoopbackIpv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isPublicSafeHostname(hostname: string): boolean {
  const lower = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower) return false;
  if (
    lower === 'localhost' ||
    lower === 'metadata.google.internal' ||
    lower === 'metadata' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost')
  ) {
    return false;
  }
  // IPv6 loopback, link-local, unique-local, unspecified
  if (lower.includes(':')) {
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('::ffff:')
    ) {
      return false;
    }
    return false; // Disallow raw IPv6 literals for external feed URLs
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) {
    return !isPrivateOrLoopbackIpv4(lower);
  }
  return lower.includes('.');
}

export function validatePublishingFeedUrl(
  rawUrl: string,
  options: { allowLocalTestFeed?: boolean } = {}
): { valid: boolean; parsed?: URL; reason?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'Feed URL is empty.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Feed URL is not a valid URL.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Feed URL must not embed credentials.' };
  }
  if (options.allowLocalTestFeed === true) {
    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (host === '127.0.0.1' || host === 'localhost')
    ) {
      return { valid: true, parsed };
    }
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Feed URL must use strict HTTPS.' };
  }
  if (!isPublicSafeHostname(parsed.hostname)) {
    return { valid: false, reason: 'Feed URL must target a public hostname (SSRF blocked).' };
  }
  return { valid: true, parsed };
}

export function getAuthorizedApprovers(overrideList?: string[]): string[] {
  if (Array.isArray(overrideList)) {
    return Array.from(
      new Set(overrideList.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))
    );
  }
  const envList = String(process.env.APPROVED_PUBLISHING_ALLOWED_APPROVERS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envList.length > 0) {
    return Array.from(new Set(envList));
  }
  const adminEmail = getConfiguredAdminEmail().trim().toLowerCase();
  return adminEmail ? [adminEmail] : [];
}

export interface FingerprintInput {
  title: string;
  seoTitle: string;
  metaDescription: string;
  category: string;
  topics: TopicFeedKey[];
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  imageUrl: string;
  imageAlt: string;
  author: string;
  source: string;
  paragraphs: string[];
  externalUrl?: string;
  externalLabel?: string;
}

export function computeArticleContentFingerprint(input: FingerprintInput): string {
  const canonicalPayload = JSON.stringify({
    title: input.title,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    category: input.category,
    topics: [...input.topics],
    keywords: [...input.keywords],
    publishedAt: input.publishedAt,
    updatedAt: input.updatedAt,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt,
    author: input.author,
    source: input.source,
    paragraphs: [...input.paragraphs],
    externalUrl: input.externalUrl || '',
    externalLabel: input.externalLabel || '',
  });
  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

function buildArticleApprovalSigningMessage(params: {
  id: string;
  slug: string;
  approvalStatus: string;
  approvedBy: string;
  approvedAt: string;
  contentFingerprint: string;
}): string {
  return [
    'v1',
    'article',
    params.id,
    params.slug,
    params.approvalStatus.toLowerCase(),
    params.approvedBy.toLowerCase(),
    params.approvedAt,
    params.contentFingerprint,
  ].join('|');
}

function buildRemovalSigningMessage(params: {
  slug: string;
  approvedBy: string;
  removedAt: string;
  reason: string;
}): string {
  return [
    'v1',
    'remove',
    params.slug,
    params.approvedBy.toLowerCase(),
    params.removedAt,
    params.reason.toLowerCase(),
  ].join('|');
}

function verifyHmacHexSignature(message: string, providedHex: string, secret: string): boolean {
  if (!secret || secret.length < MIN_APPROVAL_SECRET_LENGTH) return false;
  if (!HEX_64_REGEX.test(providedHex)) return false;
  const expectedHex = crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const providedBuf = Buffer.from(providedHex.toLowerCase(), 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Deterministic HMAC-SHA256 signing helper implementing the server-verified
 * NEF123123 administrator approval attestation contract (`nef123123-publishing/v1`).
 */
export function signApprovedArticlePayload(
  raw: {
    id: string;
    slug: string;
    approvalStatus: string;
    approvedBy: string;
    approvedAt: string;
    title: string;
    seoTitle?: string;
    metaDescription: string;
    category: string;
    topics?: string[];
    keywords?: string[];
    publishedAt: string;
    updatedAt?: string;
    imageUrl: string;
    imageAlt?: string;
    author?: string;
    source?: string;
    paragraphs: string[];
    externalUrl?: string;
    externalLabel?: string;
  },
  secret: string
): string {
  const normalized = normalizeArticleFields(raw);
  if (!normalized.ok) {
    throw new Error(`Cannot sign invalid article payload: ${normalized.detail}`);
  }
  const msg = buildArticleApprovalSigningMessage({
    id: normalized.value.id,
    slug: normalized.value.slug,
    approvalStatus: String(raw.approvalStatus || '').trim().toLowerCase(),
    approvedBy: String(raw.approvedBy || '').trim().toLowerCase(),
    approvedAt: String(raw.approvedAt || '').trim(),
    contentFingerprint: normalized.value.contentFingerprint,
  });
  return crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}

export function signRemovedSlugPayload(
  raw: {
    slug: string;
    approvedBy: string;
    removedAt: string;
    reason?: string;
  },
  secret: string
): string {
  const slug = String(raw.slug || '').trim().toLowerCase();
  const approvedBy = String(raw.approvedBy || '').trim().toLowerCase();
  const removedAt = String(raw.removedAt || '').trim();
  const reason = stripControlChars(String(raw.reason || 'retracted')).toLowerCase() || 'retracted';
  const msg = buildRemovalSigningMessage({ slug, approvedBy, removedAt, reason });
  return crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}

interface NormalizedArticleFields {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  category: string;
  topics: TopicFeedKey[];
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  imageUrl: string;
  imageAlt: string;
  author: string;
  source: string;
  paragraphs: string[];
  externalUrl?: string;
  externalLabel?: string;
  contentFingerprint: string;
}

function normalizeArticleFields(
  raw: ExternalRawArticle
): { ok: true; value: NormalizedArticleFields } | { ok: false; detail: string } {
  const id = stripControlChars(String(raw.id || ''));
  if (!id || id.length > 128) {
    return { ok: false, detail: 'Missing or invalid article id.' };
  }
  const slug = stripControlChars(String(raw.slug || '')).toLowerCase();
  if (!slug || slug.length < 3 || slug.length > 140 || !SLUG_REGEX.test(slug)) {
    return { ok: false, detail: 'Invalid slug format.' };
  }
  const title = stripControlChars(String(raw.title || ''));
  if (title.length < 10 || title.length > 180) {
    return { ok: false, detail: 'Title must be 10–180 characters.' };
  }
  const metaDescription = stripControlChars(String(raw.metaDescription || ''));
  if (metaDescription.length < 40 || metaDescription.length > 320) {
    return { ok: false, detail: 'metaDescription must be 40–320 characters.' };
  }
  const category = stripControlChars(String(raw.category || ''));
  if (category.length < 2 || category.length > 60) {
    return { ok: false, detail: 'Category must be 2–60 characters.' };
  }
  const publishedAt = stripControlChars(String(raw.publishedAt || ''));
  if (!isValidIsoTimestampWithTz(publishedAt)) {
    return { ok: false, detail: 'publishedAt must be valid ISO-8601 with timezone.' };
  }
  const rawUpdatedAt = stripControlChars(String(raw.updatedAt || ''));
  const updatedAt = rawUpdatedAt || publishedAt;
  if (!isValidIsoTimestampWithTz(updatedAt)) {
    return { ok: false, detail: 'updatedAt must be valid ISO-8601 with timezone.' };
  }
  if (Date.parse(updatedAt) < Date.parse(publishedAt)) {
    return { ok: false, detail: 'updatedAt cannot precede publishedAt.' };
  }

  const imageUrl = stripControlChars(String(raw.imageUrl || ''));
  if (!isStrictHttpsPublicUrl(imageUrl)) {
    return { ok: false, detail: 'imageUrl must be a valid public HTTPS URL.' };
  }

  if (!Array.isArray(raw.paragraphs) || raw.paragraphs.length === 0 || raw.paragraphs.length > 100) {
    return { ok: false, detail: 'paragraphs must contain 1–100 non-empty strings.' };
  }
  const paragraphs = raw.paragraphs
    .filter((p): p is string => typeof p === 'string')
    .map((p) => stripControlChars(p))
    .filter((p) => p.length > 0 && p.length <= 4000);
  if (paragraphs.length === 0) {
    return { ok: false, detail: 'paragraphs contained no valid text entries.' };
  }

  const rawSeoTitle = stripControlChars(String(raw.seoTitle || ''));
  const seoTitle = (rawSeoTitle || `${title} | NEF123123 News`).slice(0, 180);

  const rawTopics = Array.isArray(raw.topics) ? raw.topics : [];
  const filteredTopics = Array.from(
    new Set(
      rawTopics
        .map((t) => stripControlChars(String(t || '')).toLowerCase())
        .filter((t): t is TopicFeedKey => isValidTopicFeed(t))
    )
  );
  const topics: TopicFeedKey[] = filteredTopics.length > 0 ? filteredTopics : ['south-africa'];

  const rawKeywords = Array.isArray(raw.keywords) ? raw.keywords : [];
  const keywords = Array.from(
    new Set(
      rawKeywords
        .map((k) => stripControlChars(String(k || '')).slice(0, 60))
        .filter(Boolean)
    )
  ).slice(0, 15);
  const finalKeywords = keywords.length > 0 ? keywords : [category];

  const imageAlt = (stripControlChars(String(raw.imageAlt || '')) || title).slice(0, 220);
  const author = (
    stripControlChars(String(raw.author || '')) || 'NEF123123 Editorial Desk'
  ).slice(0, 120);
  const source = (
    stripControlChars(String(raw.source || '')) || 'NEF123123 Intelligence Desk'
  ).slice(0, 160);

  const rawExternalUrl = stripControlChars(String(raw.externalUrl || ''));
  const externalUrl =
    rawExternalUrl && isStrictHttpsPublicUrl(rawExternalUrl) ? rawExternalUrl : undefined;
  const externalLabel = externalUrl
    ? (stripControlChars(String(raw.externalLabel || '')) || 'Read original source →').slice(0, 120)
    : undefined;

  const contentFingerprint = computeArticleContentFingerprint({
    title,
    seoTitle,
    metaDescription,
    category,
    topics,
    keywords: finalKeywords,
    publishedAt,
    updatedAt,
    imageUrl,
    imageAlt,
    author,
    source,
    paragraphs,
    externalUrl,
    externalLabel,
  });

  return {
    ok: true,
    value: {
      id,
      slug,
      title,
      seoTitle,
      metaDescription,
      category,
      topics,
      keywords: finalKeywords,
      publishedAt,
      updatedAt,
      imageUrl,
      imageAlt,
      author,
      source,
      paragraphs,
      externalUrl,
      externalLabel,
      contentFingerprint,
    },
  };
}

export class ExternalPublishingBridge {
  private readonly configOverride: BridgeRuntimeConfig;
  private approvedArticlesBySlug = new Map<string, ApprovedBridgeArticle>();
  private removedSlugs = new Map<string, { slug: string; removedAt: string; reason: string }>();
  private etag: string | null = null;
  private lastModified: string | null = null;
  private lastSyncAt: string | null = null;
  private lastSyncOutcome: 'never' | 'disabled' | 'synced' | 'not_modified' | 'error' = 'never';
  private lastError: string | null = null;
  private lastDiff: BridgeSyncDiff = { created: [], updated: [], removed: [], unchanged: [] };
  private recentRejections: BridgeRejectionEntry[] = [];
  private outboundRequestCount = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(configOverride: BridgeRuntimeConfig = {}) {
    this.configOverride = configOverride;
  }

  private resolveRuntimeConfig() {
    const enabled =
      this.configOverride.enabled !== undefined
        ? this.configOverride.enabled
        : String(process.env.EXTERNAL_PUBLISHING_BRIDGE_ENABLED || 'false')
            .trim()
            .toLowerCase() === 'true';

    const feedUrl =
      this.configOverride.feedUrl !== undefined
        ? String(this.configOverride.feedUrl).trim()
        : String(process.env.APPROVED_PUBLISHING_FEED_URL || '').trim();

    const feedToken =
      this.configOverride.feedToken !== undefined
        ? String(this.configOverride.feedToken).trim()
        : String(process.env.APPROVED_PUBLISHING_FEED_TOKEN || '').trim();

    const approvalSecret =
      this.configOverride.approvalSecret !== undefined
        ? String(this.configOverride.approvalSecret).trim()
        : String(process.env.APPROVED_PUBLISHING_APPROVAL_SECRET || '').trim();

    const allowedApprovers = getAuthorizedApprovers(this.configOverride.allowedApprovers);

    const rawInterval =
      this.configOverride.syncIntervalSeconds !== undefined
        ? this.configOverride.syncIntervalSeconds
        : Number(process.env.APPROVED_PUBLISHING_SYNC_INTERVAL_SECONDS || 60);
    const syncIntervalSeconds =
      Number.isFinite(rawInterval) && rawInterval >= 30 ? Math.floor(rawInterval) : 60;

    const allowLocalTestFeed = this.configOverride.allowLocalTestFeed === true;
    const notifySearchEngines = this.configOverride.notifySearchEngines !== false;

    return {
      enabled,
      feedUrl,
      feedToken,
      approvalSecret,
      allowedApprovers,
      syncIntervalSeconds,
      allowLocalTestFeed,
      notifySearchEngines,
    };
  }

  public getConfigurationState(): {
    state: BridgeState;
    outboundFetchesAllowed: boolean;
    reason: string;
    feedHost: string | null;
    runtime: ReturnType<ExternalPublishingBridge['resolveRuntimeConfig']>;
  } {
    const runtime = this.resolveRuntimeConfig();

    if (!runtime.enabled) {
      return {
        state: 'disabled_by_flag',
        outboundFetchesAllowed: false,
        reason:
          'External publishing bridge is safely disabled (EXTERNAL_PUBLISHING_BRIDGE_ENABLED is not "true"). Zero outbound requests allowed.',
        feedHost: null,
        runtime,
      };
    }

    if (!runtime.feedUrl) {
      return {
        state: 'disabled_unconfigured',
        outboundFetchesAllowed: false,
        reason:
          'APPROVED_PUBLISHING_FEED_URL is not configured. Bridge remains safely idle with zero outbound requests.',
        feedHost: null,
        runtime,
      };
    }

    const urlCheck = validatePublishingFeedUrl(runtime.feedUrl, {
      allowLocalTestFeed: runtime.allowLocalTestFeed,
    });
    if (!urlCheck.valid || !urlCheck.parsed) {
      return {
        state: 'disabled_invalid_url',
        outboundFetchesAllowed: false,
        reason: urlCheck.reason || 'Feed URL failed security validation.',
        feedHost: null,
        runtime,
      };
    }

    if (runtime.approvalSecret.length < MIN_APPROVAL_SECRET_LENGTH) {
      return {
        state: 'disabled_missing_approval_secret',
        outboundFetchesAllowed: false,
        reason:
          'APPROVED_PUBLISHING_APPROVAL_SECRET (>= 32 chars) is required to verify authorized administrator approval signatures server-side.',
        feedHost: urlCheck.parsed.host,
        runtime,
      };
    }

    if (runtime.allowedApprovers.length === 0) {
      return {
        state: 'disabled_missing_approval_secret',
        outboundFetchesAllowed: false,
        reason: 'No authorized administrator approver is configured on the server.',
        feedHost: urlCheck.parsed.host,
        runtime,
      };
    }

    return {
      state: this.lastSyncOutcome === 'error' ? 'error' : 'ready',
      outboundFetchesAllowed: true,
      reason: 'Bridge configuration and approval verification prerequisites are satisfied.',
      feedHost: urlCheck.parsed.host,
      runtime,
    };
  }

  public getApprovedArticles(): ApprovedBridgeArticle[] {
    return Array.from(this.approvedArticlesBySlug.values()).sort(
      (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
    );
  }

  public getApprovedArticleBySlug(slug: string): ApprovedBridgeArticle | undefined {
    return this.approvedArticlesBySlug.get(slug.trim().toLowerCase());
  }

  public getRemovedSlugs(): Set<string> {
    return new Set(this.removedSlugs.keys());
  }

  public isSlugRemoved(slug: string): boolean {
    return this.removedSlugs.has(slug.trim().toLowerCase());
  }

  public getRemovalInfo(slug: string): { slug: string; removedAt: string; reason: string } | undefined {
    return this.removedSlugs.get(slug.trim().toLowerCase());
  }

  public getStatus(): BridgeStatusSnapshot {
    const cfg = this.getConfigurationState();
    return {
      contractVersion: PUBLISHING_CONTRACT_VERSION,
      state: cfg.state,
      enabledFlag: cfg.runtime.enabled,
      feedUrlConfigured: Boolean(cfg.runtime.feedUrl),
      feedHost: cfg.feedHost,
      approvalSecretConfigured: cfg.runtime.approvalSecret.length >= MIN_APPROVAL_SECRET_LENGTH,
      feedTokenConfigured: Boolean(cfg.runtime.feedToken),
      authorizedApproversCount: cfg.runtime.allowedApprovers.length,
      outboundFetchesAllowed: cfg.outboundFetchesAllowed,
      pollingActive: this.pollTimer !== null,
      syncIntervalSeconds: cfg.runtime.syncIntervalSeconds,
      approvedCount: this.approvedArticlesBySlug.size,
      removedCount: this.removedSlugs.size,
      rejectedCount: this.recentRejections.length,
      outboundRequestCount: this.outboundRequestCount,
      lastSyncAt: this.lastSyncAt,
      lastSyncOutcome: this.lastSyncOutcome,
      lastError: this.lastError,
      lastDiff: {
        created: [...this.lastDiff.created],
        updated: [...this.lastDiff.updated],
        removed: [...this.lastDiff.removed],
        unchanged: [...this.lastDiff.unchanged],
      },
      recentRejections: this.recentRejections.slice(0, 25),
    };
  }

  public startPolling(): boolean {
    const cfg = this.getConfigurationState();
    if (!cfg.outboundFetchesAllowed) {
      return false;
    }
    if (this.pollTimer !== null) {
      return true;
    }
    // Kick off initial sync asynchronously without blocking server listen
    void this.syncNow();
    this.pollTimer = setInterval(() => {
      void this.syncNow();
    }, cfg.runtime.syncIntervalSeconds * 1000);
    if (typeof this.pollTimer.unref === 'function') {
      this.pollTimer.unref();
    }
    return true;
  }

  public stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public async syncNow(): Promise<BridgeSyncResult> {
    const nowIso = new Date().toISOString();
    const cfg = this.getConfigurationState();

    // Hard interlock: zero outbound calls when disabled or unverified
    if (!cfg.outboundFetchesAllowed) {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'disabled';
      return {
        outcome: 'disabled',
        state: cfg.state,
        outboundFetchPerformed: false,
        httpStatus: null,
        message: cfg.reason,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'NEF123123-PublishingBridge/1.0 (+https://www.nef123123.co.za)',
    };
    if (cfg.runtime.feedToken) {
      headers.Authorization = `Bearer ${cfg.runtime.feedToken}`;
    }
    if (this.etag) {
      headers['If-None-Match'] = this.etag;
    }
    if (this.lastModified) {
      headers['If-Modified-Since'] = this.lastModified;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: globalThis.Response;
    try {
      this.outboundRequestCount += 1;
      res = await fetch(cfg.runtime.feedUrl, {
        method: 'GET',
        headers,
        redirect: 'error',
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const errMsg = err instanceof Error ? err.message : 'Upstream fetch failed.';
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = `Upstream feed unreachable (last-known-good snapshot preserved): ${errMsg}`;
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: null,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 304) {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'not_modified';
      this.lastError = null;
      const unchanged = Array.from(this.approvedArticlesBySlug.keys());
      this.lastDiff = { created: [], updated: [], removed: [], unchanged };
      return {
        outcome: 'not_modified',
        state: 'ready',
        outboundFetchPerformed: true,
        httpStatus: 304,
        message: 'Feed unchanged (HTTP 304 Not Modified).',
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: this.lastDiff,
        rejections: [],
        syncedAt: nowIso,
      };
    }

    if (!res.ok) {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = `Upstream returned HTTP ${res.status} (last-known-good snapshot preserved).`;
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: res.status,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    let rawText: string;
    try {
      rawText = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed reading response body.';
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = `Upstream body read error (last-known-good snapshot preserved): ${msg}`;
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: res.status,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    if (Buffer.byteLength(rawText, 'utf8') > MAX_FEED_BYTES) {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = `Upstream payload exceeded ${MAX_FEED_BYTES} byte limit (last-known-good snapshot preserved).`;
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: res.status,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    let payload: ExternalPublishingFeedPayload;
    try {
      payload = JSON.parse(rawText) as ExternalPublishingFeedPayload;
    } catch {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = 'Upstream returned invalid JSON (last-known-good snapshot preserved).';
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: res.status,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.schemaVersion !== PUBLISHING_CONTRACT_VERSION ||
      typeof payload.source !== 'string' ||
      !payload.source.trim() ||
      typeof payload.generatedAt !== 'string' ||
      !isValidIsoTimestampWithTz(payload.generatedAt) ||
      !Array.isArray(payload.articles) ||
      payload.articles.length > MAX_FEED_ARTICLES
    ) {
      this.lastSyncAt = nowIso;
      this.lastSyncOutcome = 'error';
      this.lastError = `Upstream envelope failed ${PUBLISHING_CONTRACT_VERSION} validation (last-known-good snapshot preserved).`;
      return {
        outcome: 'error',
        state: 'error',
        outboundFetchPerformed: true,
        httpStatus: res.status,
        message: this.lastError,
        approvedCount: this.approvedArticlesBySlug.size,
        removedCount: this.removedSlugs.size,
        rejectedCount: this.recentRejections.length,
        diff: { created: [], updated: [], removed: [], unchanged: [] },
        rejections: [],
        syncedAt: nowIso,
      };
    }

    const allowedApproversSet = new Set(cfg.runtime.allowedApprovers);
    const rejections: BridgeRejectionEntry[] = [];
    const candidateApproved: ApprovedBridgeArticle[] = [];
    const nextRemovedSlugs = new Map<string, { slug: string; removedAt: string; reason: string }>();
    const nowMs = Date.now();

    // 1. Validate explicit removedSlugs[] (requires server-verified admin signature)
    if (Array.isArray(payload.removedSlugs)) {
      for (const rem of payload.removedSlugs) {
        const slug = stripControlChars(String(rem?.slug || '')).toLowerCase();
        const approvedBy = stripControlChars(String(rem?.approvedBy || '')).toLowerCase();
        const removedAt = stripControlChars(String(rem?.removedAt || ''));
        const reason = stripControlChars(String(rem?.reason || 'retracted')).toLowerCase() || 'retracted';
        const sig = stripControlChars(String(rem?.approvalSignature || ''));

        if (!slug || !SLUG_REGEX.test(slug)) {
          rejections.push({
            slug: slug || '(invalid)',
            id: '(removal)',
            reason: 'schema_validation_failed',
            detail: 'Invalid removedSlugs entry slug.',
          });
          continue;
        }
        if (!approvedBy) {
          rejections.push({
            slug,
            id: '(removal)',
            reason: 'missing_approved_by',
            detail: 'Removal requires authorized approvedBy.',
          });
          continue;
        }
        if (!allowedApproversSet.has(approvedBy)) {
          rejections.push({
            slug,
            id: '(removal)',
            reason: 'unauthorized_approver',
            detail: `Removal approver "${approvedBy}" is not authorized.`,
          });
          continue;
        }
        if (!isValidIsoTimestampWithTz(removedAt) || Date.parse(removedAt) > nowMs + MAX_CLOCK_SKEW_MS) {
          rejections.push({
            slug,
            id: '(removal)',
            reason: 'invalid_approved_at',
            detail: 'Removal requires valid non-future ISO-8601 removedAt.',
          });
          continue;
        }
        if (!sig) {
          rejections.push({
            slug,
            id: '(removal)',
            reason: 'missing_approval_signature',
            detail: 'Removal requires cryptographic approvalSignature.',
          });
          continue;
        }
        const remMsg = buildRemovalSigningMessage({ slug, approvedBy, removedAt, reason });
        if (!verifyHmacHexSignature(remMsg, sig, cfg.runtime.approvalSecret)) {
          rejections.push({
            slug,
            id: '(removal)',
            reason: 'invalid_approval_signature',
            detail: 'Removal approvalSignature failed server-side HMAC-SHA256 verification.',
          });
          continue;
        }
        nextRemovedSlugs.set(slug, { slug, removedAt, reason });
      }
    }

    // 2. Validate each article fail-closed (never trust approvalStatus alone!)
    for (const raw of payload.articles) {
      const rawSlug = stripControlChars(String(raw?.slug || '')).toLowerCase() || '(missing-slug)';
      const rawId = stripControlChars(String(raw?.id || '')) || '(missing-id)';
      const rawStatus = stripControlChars(String(raw?.approvalStatus || '')).toLowerCase();

      if (!rawStatus) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'missing_approval_status',
          detail: 'Missing approvalStatus field.',
        });
        continue;
      }

      const isRemovalStatus = rawStatus === 'retracted' || rawStatus === 'unpublished';
      if (rawStatus !== 'approved' && !isRemovalStatus) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'unapproved_status',
          detail: `Article approvalStatus "${rawStatus}" is not approved for publication.`,
        });
        continue;
      }

      const approvedBy = stripControlChars(String(raw?.approvedBy || '')).toLowerCase();
      if (!approvedBy) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'missing_approved_by',
          detail: 'Missing approvedBy administrator identifier.',
        });
        continue;
      }
      if (!allowedApproversSet.has(approvedBy)) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'unauthorized_approver',
          detail: `Approver "${approvedBy}" is not in the server-authorized administrator list.`,
        });
        continue;
      }

      const approvedAt = stripControlChars(String(raw?.approvedAt || ''));
      if (!isValidIsoTimestampWithTz(approvedAt) || Date.parse(approvedAt) > nowMs + MAX_CLOCK_SKEW_MS) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'invalid_approved_at',
          detail: 'approvedAt must be a valid non-future ISO-8601 timestamp with timezone.',
        });
        continue;
      }

      const approvalSignature = stripControlChars(String(raw?.approvalSignature || ''));
      if (!approvalSignature) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'missing_approval_signature',
          detail: 'Missing cryptographic approvalSignature; JSON status alone is never trusted.',
        });
        continue;
      }

      if (isRemovalStatus) {
        if (!SLUG_REGEX.test(rawSlug)) {
          rejections.push({
            slug: rawSlug,
            id: rawId,
            reason: 'schema_validation_failed',
            detail: 'Invalid slug on retracted/unpublished article.',
          });
          continue;
        }
        const remMsg = buildRemovalSigningMessage({
          slug: rawSlug,
          approvedBy,
          removedAt: approvedAt,
          reason: rawStatus,
        });
        if (!verifyHmacHexSignature(remMsg, approvalSignature, cfg.runtime.approvalSecret)) {
          rejections.push({
            slug: rawSlug,
            id: rawId,
            reason: 'invalid_approval_signature',
            detail: 'Retraction signature failed server-side HMAC-SHA256 verification.',
          });
          continue;
        }
        nextRemovedSlugs.set(rawSlug, { slug: rawSlug, removedAt: approvedAt, reason: rawStatus });
        continue;
      }

      const normalized = normalizeArticleFields(raw);
      if (!normalized.ok) {
        rejections.push({
          slug: rawSlug,
          id: rawId,
          reason: 'schema_validation_failed',
          detail: normalized.detail,
        });
        continue;
      }

      const signingMessage = buildArticleApprovalSigningMessage({
        id: normalized.value.id,
        slug: normalized.value.slug,
        approvalStatus: rawStatus,
        approvedBy,
        approvedAt,
        contentFingerprint: normalized.value.contentFingerprint,
      });

      if (!verifyHmacHexSignature(signingMessage, approvalSignature, cfg.runtime.approvalSecret)) {
        rejections.push({
          slug: normalized.value.slug,
          id: normalized.value.id,
          reason: 'invalid_approval_signature',
          detail:
            'Cryptographic approvalSignature failed server-side verification (forged approval or tampered content).',
        });
        continue;
      }

      candidateApproved.push({
        slug: normalized.value.slug,
        seoTitle: normalized.value.seoTitle,
        metaDescription: normalized.value.metaDescription,
        publishedDate: normalized.value.publishedAt,
        updatedDate: normalized.value.updatedAt,
        category: normalized.value.category,
        topics: normalized.value.topics,
        keywords: normalized.value.keywords,
        title: normalized.value.title,
        imageUrl: normalized.value.imageUrl,
        imageAlt: normalized.value.imageAlt,
        canonicalUrl: `${OFFICIAL_SITE_ORIGIN}/news/${normalized.value.slug}`,
        source: normalized.value.source,
        paragraphs: normalized.value.paragraphs,
        ...(normalized.value.externalUrl ? { externalUrl: normalized.value.externalUrl } : {}),
        ...(normalized.value.externalLabel ? { externalLabel: normalized.value.externalLabel } : {}),
        externalId: normalized.value.id,
        author: normalized.value.author,
        approvedBy,
        approvedAt,
        contentFingerprint: normalized.value.contentFingerprint,
        origin: 'external_bridge',
      });
    }

    // 3. Multi-Layer Duplicate Prevention (slug + upstream id + normalized URL +
    //    existing catalog check + SHA-256 content fingerprint + near-duplicate body + cross-source story)
    const dupRegistry = this.configOverride.duplicateRegistry || duplicateRejectionRegistry;
    const existingCatalog = (
      this.configOverride.existingArticlesProvider
        ? this.configOverride.existingArticlesProvider()
        : getCanonicalArticles()
    ).filter((article) => !nextRemovedSlugs.has(String(article.slug || '').trim().toLowerCase()));

    const slugDeduped = deduplicateArticlesBySlug(candidateApproved) as ApprovedBridgeArticle[];
    if (slugDeduped.length < candidateApproved.length) {
      const keptSlugs = new Set(slugDeduped.map((a) => `${a.slug}|${a.contentFingerprint}`));
      for (const cand of candidateApproved) {
        if (!keptSlugs.has(`${cand.slug}|${cand.contentFingerprint}`)) {
          const detail = `Duplicate slug "${cand.slug}" suppressed within sync batch (kept newest revision).`;
          rejections.push({
            slug: cand.slug,
            id: cand.externalId,
            reason: 'duplicate_suppressed',
            detail,
          });
          dupRegistry.record({
            channel: 'external_bridge',
            candidateId: cand.externalId,
            candidateSlug: cand.slug,
            candidateTitle: cand.title,
            candidateSource: cand.source,
            candidateUrl: cand.externalUrl || cand.canonicalUrl,
            reasonCode: 'duplicate_slug',
            explanation: detail,
            matchedArticleSlug: cand.slug,
            matchedArticleTitle: cand.title,
            matchedArticleUrl: cand.canonicalUrl,
            scores: null,
          });
        }
      }
    }

    const byExternalId = new Map<string, ApprovedBridgeArticle>();
    for (const art of slugDeduped) {
      if (nextRemovedSlugs.has(art.slug)) continue;
      const existing = byExternalId.get(art.externalId);
      if (!existing) {
        byExternalId.set(art.externalId, art);
        continue;
      }
      const prevTs = Date.parse(existing.updatedDate || existing.publishedDate) || 0;
      const nextTs = Date.parse(art.updatedDate || art.publishedDate) || 0;
      const dropped = nextTs >= prevTs ? existing : art;
      const kept = nextTs >= prevTs ? art : existing;
      const detail = `Duplicate upstream id "${art.externalId}" suppressed (kept newest revision "${kept.slug}").`;
      rejections.push({
        slug: dropped.slug,
        id: art.externalId,
        reason: 'duplicate_suppressed',
        detail,
      });
      dupRegistry.record({
        channel: 'external_bridge',
        candidateId: dropped.externalId,
        candidateSlug: dropped.slug,
        candidateTitle: dropped.title,
        candidateSource: dropped.source,
        candidateUrl: dropped.externalUrl || dropped.canonicalUrl,
        reasonCode: 'duplicate_external_id',
        explanation: detail,
        matchedArticleSlug: kept.slug,
        matchedArticleTitle: kept.title,
        matchedArticleUrl: kept.canonicalUrl,
        scores: null,
      });
      if (nextTs >= prevTs) {
        byExternalId.set(art.externalId, art);
      }
    }

    const byExternalUrl = new Map<string, ApprovedBridgeArticle>();
    const urlDedupedList: ApprovedBridgeArticle[] = [];
    for (const art of byExternalId.values()) {
      if (!art.externalUrl) {
        urlDedupedList.push(art);
        continue;
      }
      const normUrl = normalizeUrlForDuplicateCheck(art.externalUrl);
      const existing = byExternalUrl.get(normUrl);
      if (!existing) {
        byExternalUrl.set(normUrl, art);
        continue;
      }
      const prevTs = Date.parse(existing.updatedDate || existing.publishedDate) || 0;
      const nextTs = Date.parse(art.updatedDate || art.publishedDate) || 0;
      const dropped = nextTs >= prevTs ? existing : art;
      const kept = nextTs >= prevTs ? art : existing;
      const detail = `Duplicate normalized externalUrl "${normUrl}" suppressed (kept newest revision "${kept.slug}").`;
      rejections.push({
        slug: dropped.slug,
        id: dropped.externalId,
        reason: 'duplicate_suppressed',
        detail,
      });
      dupRegistry.record({
        channel: 'external_bridge',
        candidateId: dropped.externalId,
        candidateSlug: dropped.slug,
        candidateTitle: dropped.title,
        candidateSource: dropped.source,
        candidateUrl: dropped.externalUrl || dropped.canonicalUrl,
        reasonCode: 'duplicate_source_url',
        explanation: detail,
        matchedArticleSlug: kept.slug,
        matchedArticleTitle: kept.title,
        matchedArticleUrl: kept.canonicalUrl,
        scores: null,
      });
      if (nextTs >= prevTs) {
        byExternalUrl.set(normUrl, art);
      }
    }
    for (const art of byExternalUrl.values()) {
      urlDedupedList.push(art);
    }

    // Content fingerprint, near-duplicate body, and cross-source story checks
    // against existing published NEF123123 catalog + earlier accepted articles in this batch
    const finalApprovedList: ApprovedBridgeArticle[] = [];
    const comparisonPool: DuplicateCandidateArticle[] = [...existingCatalog];

    for (const art of urlDedupedList) {
      const dupVerdict = evaluateArticleForDuplicates(art, comparisonPool, {
        allowSameSlugUpdate: true,
        channel: 'external_bridge',
        recordRejection: true,
        registry: dupRegistry,
      });
      if (!dupVerdict.allowed) {
        rejections.push({
          slug: art.slug,
          id: art.externalId,
          reason: 'duplicate_suppressed',
          detail: `[${dupVerdict.reasonCode || 'duplicate'}] ${dupVerdict.explanation}`,
        });
        continue;
      }
      finalApprovedList.push(art);
      comparisonPool.push(art);
    }

    const nextMap = new Map<string, ApprovedBridgeArticle>();
    for (const art of finalApprovedList) {
      nextMap.set(art.slug, art);
    }

    // 4. Compute exact content-fingerprint diff vs prior snapshot
    const created: string[] = [];
    const updated: string[] = [];
    const removed: string[] = [];
    const unchanged: string[] = [];

    for (const [slug, art] of nextMap.entries()) {
      const prev = this.approvedArticlesBySlug.get(slug);
      if (!prev) {
        created.push(slug);
      } else if (prev.contentFingerprint !== art.contentFingerprint) {
        updated.push(slug);
      } else {
        unchanged.push(slug);
      }
    }
    for (const prevSlug of this.approvedArticlesBySlug.keys()) {
      if (!nextMap.has(prevSlug)) {
        removed.push(prevSlug);
      }
    }
    for (const remSlug of nextRemovedSlugs.keys()) {
      if (!removed.includes(remSlug) && !this.removedSlugs.has(remSlug)) {
        removed.push(remSlug);
      }
    }

    // Atomic snapshot swap
    this.approvedArticlesBySlug = nextMap;
    this.removedSlugs = nextRemovedSlugs;
    this.etag = res.headers.get('etag');
    this.lastModified = res.headers.get('last-modified');
    this.lastSyncAt = nowIso;
    this.lastSyncOutcome = 'synced';
    this.lastError = null;
    this.lastDiff = { created, updated, removed, unchanged };
    this.recentRejections = rejections;

    // 5. Optional search-engine notification ONLY for genuine new/updated articles
    // (IndexNow and WebSub independently stay safe-disabled unless configured)
    const changedUrls = [...created, ...updated].map(
      (slug) => `${OFFICIAL_SITE_ORIGIN}/news/${slug}`
    );
    if (cfg.runtime.notifySearchEngines && changedUrls.length > 0) {
      void submitUrlsToIndexNow(changedUrls, 'publish_auto').catch(() => {});
      void pingWebSubHub().catch(() => {});
    }

    return {
      outcome: 'synced',
      state: 'ready',
      outboundFetchPerformed: true,
      httpStatus: res.status,
      message: `Synced ${nextMap.size} verified approved article(s) (${created.length} new, ${updated.length} updated, ${removed.length} removed, ${rejections.length} rejected).`,
      approvedCount: nextMap.size,
      removedCount: nextRemovedSlugs.size,
      rejectedCount: rejections.length,
      diff: this.lastDiff,
      rejections,
      syncedAt: nowIso,
    };
  }
}

export const externalPublishingBridge = new ExternalPublishingBridge();
