import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Request, type Response } from 'express';
import {
  OFFICIAL_SITE_ORIGIN,
  TOPIC_FEEDS,
  getArticlesByTopic,
  getCanonicalArticles,
  isValidTopicFeed,
  mergePublishedArticles,
} from './server/articles-catalog.ts';
import {
  getConfiguredAdminEmail,
  getConfiguredFirebaseProjectId,
  requireAdmin,
  type AdminRequest,
} from './server/admin-auth.ts';
import {
  ExternalPublishingBridge,
  externalPublishingBridge,
} from './server/external-publishing-source.ts';
import {
  renderDynamicArticleHtml,
  renderRetractedArticleHtml,
} from './server/news-article-renderer.ts';
import {
  auditGoogleNewsReadiness,
  buildAtomFeedXml,
  buildGoogleNewsSitemapXml,
  buildJsonFeed,
  buildRobotsTxt,
  buildRssFeedXml,
  buildSitemapXml,
  getIndexNowKey,
  getSessionSubmissionHistory,
  getWebSubHubUrl,
  isWebSubPingEnabled,
  pingWebSubHub,
  submitSitemapsToGoogleSearchConsole,
  submitUrlsToIndexNow,
} from './server/seo-distribution.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');

/**
 * Hard Phase 1, Phase 2 & Phase 3 safeguard:
 * Live subscriber registration, email verification storage, push subscriptions,
 * and live broadcasts remain strictly disabled until a durable persistent database
 * (outside Cloud Run's ephemeral container filesystem) is explicitly verified & approved.
 */
export const DURABLE_STORAGE_CONNECTED = false;

export function isLiveSubscriberSystemEnabled(): boolean {
  return (
    DURABLE_STORAGE_CONNECTED &&
    String(process.env.LIVE_SUBSCRIBER_SYSTEM_ENABLED || 'false').toLowerCase() === 'true'
  );
}

function sendDisabledSubscriberResponse(_req: Request, res: Response): void {
  res.status(503).json({
    error: 'durable_storage_required',
    liveSubscriberSystemEnabled: false,
    durableStorageConnected: false,
    message:
      'Live subscriber registration, verification storage, and breaking-news broadcasts are safely disabled until a durable persistent database is approved and connected. No subscriber data is stored in temporary local storage.',
  });
}

function isSafePathInside(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedCandidate = path.resolve(candidatePath);
  return resolvedCandidate.startsWith(resolvedBase + path.sep);
}

function getPublicFeedsMap() {
  const topicFeeds: Record<string, string> = {};
  for (const [key, meta] of Object.entries(TOPIC_FEEDS)) {
    topicFeeds[key] = meta.feedPath;
  }
  return {
    sitemap: '/sitemap.xml',
    newsSitemap: '/news-sitemap.xml',
    newsSitemapPreviewAll: '/news-sitemap.xml?includeAll=1',
    rss: '/rss.xml',
    atom: '/atom.xml',
    jsonFeed: '/feed.json',
    topicFeeds,
    robots: '/robots.txt',
  };
}

export interface CreateAppOptions {
  attachFrontend?: boolean;
  publishingBridge?: ExternalPublishingBridge;
}

export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const app = express();
  const bridge = options.publishingBridge || externalPublishingBridge;
  const isProduction = process.env.NODE_ENV === 'production';

  const getAllPublishedArticles = () =>
    mergePublishedArticles(
      getCanonicalArticles(),
      bridge.getApprovedArticles(),
      bridge.getRemovedSlugs()
    );

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  // Baseline security headers (compatible with AI Studio iframe preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ===========================================================================
  // 1. PUBLIC DYNAMIC SEO & SYNDICATION ENDPOINTS (100% Stateless, Phase 1–3)
  // ===========================================================================
  app.get('/sitemap.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildSitemapXml(getAllPublishedArticles()));
  });

  app.get('/news-sitemap.xml', (req, res) => {
    const includeAll = req.query.includeAll === '1';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildGoogleNewsSitemapXml(getAllPublishedArticles(), { includeAll }));
  });

  app.get('/rss.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildRssFeedXml(getAllPublishedArticles()));
  });

  app.get('/rss/:topic.xml', (req, res) => {
    const topic = String(req.params.topic || '').trim().toLowerCase();
    if (!isValidTopicFeed(topic)) {
      res.status(404).json({
        error: 'topic_feed_not_found',
        availableTopics: Object.keys(TOPIC_FEEDS),
      });
      return;
    }
    const topicMeta = TOPIC_FEEDS[topic];
    const filtered = getArticlesByTopic(topic, getAllPublishedArticles());
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildRssFeedXml(filtered, topicMeta));
  });

  app.get('/atom.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildAtomFeedXml(getAllPublishedArticles()));
  });

  app.get('/feed.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/feed+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(buildJsonFeed(getAllPublishedArticles()));
  });

  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildRobotsTxt());
  });

  // IndexNow domain ownership verification file: /<INDEXNOW_KEY>.txt
  app.get('/:candidateKey.txt', (req, res, next) => {
    const configuredKey = getIndexNowKey();
    if (!configuredKey || req.params.candidateKey !== configuredKey) {
      next();
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(configuredKey);
  });

  // ===========================================================================
  // 2. PUBLIC SAFE STATUS CONFIG (Zero Secrets Exposed)
  // ===========================================================================
  app.get('/api/public/config', (_req, res) => {
    const bridgeStatus = bridge.getStatus();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      siteOrigin: OFFICIAL_SITE_ORIGIN,
      phase: 'safe-phase-1',
      syndicationPhase: 'phase-2-stateless',
      publishingBridgePhase: 'phase-3-standby',
      liveSubscriberSystemEnabled: isLiveSubscriberSystemEnabled(),
      durableStorageConnected: DURABLE_STORAGE_CONNECTED,
      pushEnabled: false,
      emailAlertsEnabled: false,
      webSubPingEnabled: isWebSubPingEnabled(),
      webSubHubUrl: getWebSubHubUrl(),
      externalPublishingBridgeEnabled: bridgeStatus.outboundFetchesAllowed,
      feeds: getPublicFeedsMap(),
      articleCount: getAllPublishedArticles().length,
    });
  });

  // ===========================================================================
  // 3. SAFELY LOCKED SUBSCRIBER & PUSH ROUTES (503 Until Durable Storage Ready)
  // ===========================================================================
  app.post('/api/subscribers/email', sendDisabledSubscriberResponse);
  app.get('/api/subscribers/verify', sendDisabledSubscriberResponse);
  app.get('/api/subscribers/unsubscribe', sendDisabledSubscriberResponse);
  app.post('/api/subscribers/unsubscribe', sendDisabledSubscriberResponse);
  app.post('/api/push/subscribe', sendDisabledSubscriberResponse);
  app.post('/api/push/unsubscribe', sendDisabledSubscriberResponse);

  // ===========================================================================
  // 4. PROTECTED ADMIN API ROUTES (Server-Verified Firebase ID Token + ADMIN_EMAIL)
  // ===========================================================================
  app.get('/api/admin/me', requireAdmin, (req: AdminRequest, res) => {
    const bridgeStatus = bridge.getStatus();
    res.json({
      authenticated: true,
      admin: {
        email: req.adminUser?.email,
        name: req.adminUser?.name || null,
      },
      phase: 'safe-phase-1',
      syndicationPhase: 'phase-2-stateless',
      publishingBridgePhase: 'phase-3-standby',
      safeguards: {
        liveSubscriberSystemEnabled: isLiveSubscriberSystemEnabled(),
        durableStorageConnected: DURABLE_STORAGE_CONNECTED,
        existingFirestoreUntouched: true,
        existingFirestoreRulesUntouched: true,
        gscApiAuthEnabled: false,
        resendEmailEnabled: false,
        browserPushBroadcastsEnabled: false,
        subscriberTokensEnabled: false,
      },
      integrations: {
        firebaseProjectId: getConfiguredFirebaseProjectId(),
        adminEmailConfigured: Boolean(getConfiguredAdminEmail()),
        indexNowConfigured: Boolean(getIndexNowKey()),
        webSubPingEnabled: isWebSubPingEnabled(),
        webSubHubUrl: getWebSubHubUrl(),
        externalPublishingBridgeEnabled: bridgeStatus.outboundFetchesAllowed,
        externalPublishingBridgeState: bridgeStatus.state,
      },
      publishingBridge: bridgeStatus,
    });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const articles = getAllPublishedArticles();
    const readiness = auditGoogleNewsReadiness(articles);
    res.json({
      phase: 'safe-phase-1',
      syndicationPhase: 'phase-2-stateless',
      publishingBridgePhase: 'phase-3-standby',
      siteOrigin: OFFICIAL_SITE_ORIGIN,
      articlesPublished: articles.length,
      articles,
      feeds: getPublicFeedsMap(),
      readiness,
      publishingBridge: bridge.getStatus(),
      searchSubmissions: getSessionSubmissionHistory(),
      lockedModules: {
        googleSearchConsoleApi: {
          enabled: false,
          reason: 'disabled_phase_1',
        },
        emailSubscribers: {
          enabled: false,
          reason: 'durable_storage_required',
        },
        pushSubscribers: {
          enabled: false,
          reason: 'durable_storage_required',
        },
        alertBroadcasts: {
          enabled: false,
          reason: 'durable_storage_required',
        },
      },
    });
  });

  app.get('/api/admin/publishing/status', requireAdmin, (_req, res) => {
    res.json({ publishingBridge: bridge.getStatus() });
  });

  app.post('/api/admin/publishing/sync', requireAdmin, async (_req, res) => {
    const sync = await bridge.syncNow();
    res.status(sync.outcome === 'error' ? 502 : 200).json({
      sync,
      publishingBridge: bridge.getStatus(),
    });
  });

  app.get('/api/admin/seo/readiness', requireAdmin, (_req, res) => {
    res.json(auditGoogleNewsReadiness(getAllPublishedArticles()));
  });

  app.get('/api/admin/search-submissions', requireAdmin, (_req, res) => {
    res.json({
      submissions: getSessionSubmissionHistory(),
      note: 'Session diagnostic history only (stateless Phase 3; durable audit storage activates only after durable DB approval).',
    });
  });

  app.post('/api/admin/seo/indexnow', requireAdmin, async (req, res) => {
    const articles = getAllPublishedArticles();
    const singleSlug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : '';
    const requestedSlugs = Array.isArray(req.body?.slugs)
      ? req.body.slugs
      : singleSlug
        ? [singleSlug]
        : null;
    const validCatalogBySlug = new Map(articles.map((a) => [a.slug, a.canonicalUrl]));

    let targetUrls: string[];
    if (requestedSlugs && requestedSlugs.length > 0) {
      targetUrls = requestedSlugs
        .filter((s: unknown): s is string => typeof s === 'string')
        .map((slug: string) => validCatalogBySlug.get(slug.trim()))
        .filter((url): url is string => Boolean(url));
    } else {
      targetUrls = [
        `${OFFICIAL_SITE_ORIGIN}/`,
        ...articles.map((article) => article.canonicalUrl),
      ];
    }

    const record = await submitUrlsToIndexNow(targetUrls, 'manual_submit');
    res.status(record.status === 'failed' ? 502 : 200).json({ submission: record });
  });

  app.post('/api/admin/seo/websub', requireAdmin, async (req, res) => {
    const requestedFeeds = Array.isArray(req.body?.feeds)
      ? req.body.feeds.filter((f: unknown): f is string => typeof f === 'string')
      : undefined;
    const record = await pingWebSubHub(requestedFeeds);
    res.status(record.status === 'failed' ? 502 : 200).json({ submission: record });
  });

  app.post('/api/admin/seo/gsc-sitemaps', requireAdmin, async (_req, res) => {
    const record = await submitSitemapsToGoogleSearchConsole('sitemap_submit');
    res.status(503).json({
      error: 'gsc_api_disabled_phase_1',
      submission: record,
      message: record.message,
    });
  });

  // Admin subscriber & broadcast endpoints remain strictly locked until durable storage approval
  app.get('/api/admin/subscribers', requireAdmin, sendDisabledSubscriberResponse);
  app.post('/api/admin/alerts/approve-send', requireAdmin, sendDisabledSubscriberResponse);

  // ===========================================================================
  // 5. UNIFIED /news/:slug COEXISTENCE ROUTER (Static Preserved + Dynamic SSR + 410)
  // ===========================================================================
  const staticNewsDir = isProduction ? path.join(distDir, 'news') : path.join(__dirname, 'news');

  // Prevent duplicate `.html` URLs for dynamic-only bridge articles while preserving static files
  app.get(/^\/news\/([a-z0-9-]+)\.html$/i, (req, res, next) => {
    const slug = String(req.params[0] || '').toLowerCase();
    if (!slug || slug.length > 140) {
      next();
      return;
    }
    const staticCandidate = path.join(staticNewsDir, `${slug}.html`);
    const hasStaticFile =
      isSafePathInside(staticNewsDir, staticCandidate) && fs.existsSync(staticCandidate);

    if (bridge.isSlugRemoved(slug)) {
      res.redirect(301, `/news/${slug}`);
      return;
    }
    if (!hasStaticFile && bridge.getApprovedArticleBySlug(slug)) {
      res.redirect(301, `/news/${slug}`);
      return;
    }
    next();
  });

  app.get(/^\/news\/([a-z0-9-]+)(\/)?$/i, (req, res, next) => {
    const rawSlug = String(req.params[0] || '');
    const trailingSlash = Boolean(req.params[1]);
    const slug = rawSlug.toLowerCase();

    if (!slug || slug.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      next();
      return;
    }

    const staticCandidate = path.join(staticNewsDir, `${slug}.html`);
    const hasStaticFile =
      isSafePathInside(staticNewsDir, staticCandidate) && fs.existsSync(staticCandidate);
    const approvedArticle = bridge.getApprovedArticleBySlug(slug);
    const removalInfo = bridge.getRemovalInfo(slug);

    // 1. Explicitly retracted / unpublished articles return HTTP 410 Gone
    if (removalInfo) {
      res.status(410);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(renderRetractedArticleHtml(slug, { isProduction, reason: removalInfo.reason }));
      return;
    }

    // 2. Enforce single lowercase, no-trailing-slash canonical URL (zero duplicate URLs)
    if ((rawSlug !== slug || trailingSlash) && (hasStaticFile || approvedArticle)) {
      res.redirect(301, `/news/${slug}`);
      return;
    }

    // 3. Preserve existing static article pages unless superseded by a strictly newer approved revision
    if (hasStaticFile) {
      const bundledMatch = getCanonicalArticles().find((a) => a.slug === slug);
      const bundledTs = Date.parse(bundledMatch?.updatedDate || bundledMatch?.publishedDate || '') || 0;
      const approvedTs = approvedArticle
        ? Date.parse(approvedArticle.updatedDate || approvedArticle.publishedDate) || 0
        : 0;

      if (!approvedArticle || approvedTs <= bundledTs) {
        if (isProduction || options.attachFrontend === false) {
          res.sendFile(staticCandidate);
          return;
        }
        next();
        return;
      }

      // Strictly newer approved revision supersedes static content while keeping the same canonical URL
      const html = renderDynamicArticleHtml(approvedArticle, getAllPublishedArticles(), {
        isProduction,
        author: approvedArticle.author,
        externalLabel: approvedArticle.externalLabel,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.send(html);
      return;
    }

    // 4. Newly approved dynamic article from verified external publishing bridge
    if (approvedArticle) {
      const html = renderDynamicArticleHtml(approvedArticle, getAllPublishedArticles(), {
        isProduction,
        author: approvedArticle.author,
        externalLabel: approvedArticle.externalLabel,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.send(html);
      return;
    }

    next();
  });

  // ===========================================================================
  // 6. EXISTING NEF123123 FRONTEND + /admin SERVING
  // ===========================================================================
  if (options.attachFrontend !== false) {
    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'mpa',
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving from built dist/ with strict path confinement
      app.get(/^\/admin\/?$/, (_req, res) => {
        const adminHtml = path.join(distDir, 'admin', 'index.html');
        if (isSafePathInside(distDir, adminHtml) && fs.existsSync(adminHtml)) {
          res.sendFile(adminHtml);
          return;
        }
        res.status(404).send('Not found');
      });

      app.use(express.static(distDir, { extensions: ['html'] }));
    }
  }

  return app;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const PORT = Number(process.env.PORT || 3000);
  createApp({ attachFrontend: true })
    .then((app) => {
      // Safe no-op while EXTERNAL_PUBLISHING_BRIDGE_ENABLED !== 'true' or config is incomplete
      const pollingStarted = externalPublishingBridge.startPolling();
      app.listen(PORT, '0.0.0.0', () => {
        console.log(
          `[NEF123123] Phase 3 Bridge Standby server listening on http://0.0.0.0:${PORT} (liveSubscriberSystemEnabled=${isLiveSubscriberSystemEnabled()}, webSubPingEnabled=${isWebSubPingEnabled()}, externalBridgePolling=${pollingStarted})`
        );
      });
    })
    .catch((err) => {
      console.error('[NEF123123] Failed to start server:', err);
      process.exit(1);
    });
}

