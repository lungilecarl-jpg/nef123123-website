import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SITE_ORIGIN, type CanonicalNewsArticle } from './articles-catalog.ts';
import { isStrictHttpsPublicUrl } from './external-publishing-source.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distNewsDir = path.resolve(rootDir, 'dist', 'news');

interface ResolvedPageAssets {
  stylesheetHref: string;
  brandLogoSrc: string;
  articleSeoScriptSrc: string | null;
}

let cachedProdAssets: ResolvedPageAssets | null = null;

function resolvePageAssets(isProduction: boolean): ResolvedPageAssets {
  if (!isProduction) {
    return {
      stylesheetHref: '/styles.css',
      brandLogoSrc: '/src/assets/images/regenerated_image_1794535451736.jpg',
      articleSeoScriptSrc: '/news/article-seo.js',
    };
  }

  if (cachedProdAssets) {
    return cachedProdAssets;
  }

  const fallback: ResolvedPageAssets = {
    stylesheetHref: '/styles.css',
    brandLogoSrc: '/src/assets/images/regenerated_image_1794535451736.jpg',
    articleSeoScriptSrc: null,
  };

  try {
    if (fs.existsSync(distNewsDir)) {
      const sampleFile = fs.readdirSync(distNewsDir).find((f) => /^[a-z0-9-]+\.html$/i.test(f));
      if (sampleFile) {
        const html = fs.readFileSync(path.join(distNewsDir, sampleFile), 'utf8');
        const cssMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i);
        const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="brand-logo-img"/i);
        const scriptMatch = html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/i);

        cachedProdAssets = {
          stylesheetHref: cssMatch?.[1] || fallback.stylesheetHref,
          brandLogoSrc: logoMatch?.[1] || fallback.brandLogoSrc,
          articleSeoScriptSrc: scriptMatch?.[1] || null,
        };
        return cachedProdAssets;
      }
    }
  } catch {
    // Fall back safely if dist/news is unavailable
  }

  return fallback;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeJsonLdSafe(data: unknown): string {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

export interface RenderDynamicArticleOptions {
  isProduction?: boolean;
  author?: string;
  externalLabel?: string;
}

/**
 * Renders a full Google News & Discover compliant NEF123123 article page for
 * dynamically approved articles served at `GET /news/:slug`.
 * Preserves 100% of NEF123123 branding, layout, canonical URL discipline,
 * Google Analytics (G-LRM7QXKF2Q), and AdSense (ca-pub-7782426836472981).
 */
export function renderDynamicArticleHtml(
  article: CanonicalNewsArticle,
  allPublishedArticles: CanonicalNewsArticle[],
  options: RenderDynamicArticleOptions = {}
): string {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const assets = resolvePageAssets(isProduction);
  const canonicalUrl = `${OFFICIAL_SITE_ORIGIN}/news/${article.slug}`;
  const publishedIso = article.publishedDate;
  const updatedIso = article.updatedDate || article.publishedDate;
  const publishedDisplay = String(publishedIso).slice(0, 10);
  const authorName = options.author || 'NEF123123 Editorial Desk';

  const safeImageUrl = isStrictHttpsPublicUrl(article.imageUrl)
    ? article.imageUrl
    : `${OFFICIAL_SITE_ORIGIN}/favicon.png`;
  const safeExternalUrl =
    article.externalUrl && isStrictHttpsPublicUrl(article.externalUrl)
      ? article.externalUrl
      : undefined;

  const related = allPublishedArticles
    .filter((item) => item.slug !== article.slug)
    .slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        headline: article.title,
        description: article.metaDescription,
        image: [safeImageUrl],
        datePublished: publishedIso,
        dateModified: updatedIso,
        articleSection: article.category,
        inLanguage: 'en-ZA',
        isAccessibleForFree: true,
        keywords: Array.isArray(article.keywords) ? article.keywords.join(', ') : article.category,
        url: canonicalUrl,
        author: {
          '@type': 'Organization',
          name: authorName,
          url: `${OFFICIAL_SITE_ORIGIN}/`,
        },
        publisher: {
          '@type': 'NewsMediaOrganization',
          '@id': `${OFFICIAL_SITE_ORIGIN}/#organization`,
          name: 'NEF123123',
          alternateName: ['Navigant Economic Freedom', 'nef123123.co.za'],
          url: `${OFFICIAL_SITE_ORIGIN}/`,
          logo: {
            '@type': 'ImageObject',
            url: `${OFFICIAL_SITE_ORIGIN}/favicon.png`,
            width: 192,
            height: 192,
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${OFFICIAL_SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'News',
            item: `${OFFICIAL_SITE_ORIGIN}/news/`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  const paragraphsHtml = article.paragraphs
    .map((paragraph) => `          <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const externalButtonHtml = safeExternalUrl
    ? `\n          <a class="news-article-btn" href="${escapeHtml(safeExternalUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(options.externalLabel || 'Read original source →')}</a>`
    : '';

  const relatedHtml = related
    .map(
      (item) => `            <li>
              <a href="/news/${encodeURIComponent(item.slug)}">
                <span class="news-related-cat">${escapeHtml(item.category)}</span>
                ${escapeHtml(item.title)}
              </a>
            </li>`
    )
    .join('\n');

  const articleScriptTag = assets.articleSeoScriptSrc
    ? `\n  <script src="${escapeHtml(assets.articleSeoScriptSrc)}"></script>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0d6bb0">
  <meta name="description" content="${escapeHtml(article.metaDescription)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" id="canonicalLink" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" type="application/rss+xml" title="NEF123123 — Navigant Economic Freedom RSS Feed" href="${OFFICIAL_SITE_ORIGIN}/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="NEF123123 — Navigant Economic Freedom Atom Feed" href="${OFFICIAL_SITE_ORIGIN}/atom.xml">
  <link rel="alternate" type="application/feed+json" title="NEF123123 — Navigant Economic Freedom JSON Feed" href="${OFFICIAL_SITE_ORIGIN}/feed.json">
  <meta property="og:site_name" content="NEF123123">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.seoTitle)}">
  <meta property="og:description" content="${escapeHtml(article.metaDescription)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(safeImageUrl)}">
  <meta property="article:published_time" content="${escapeHtml(publishedIso)}">
  <meta property="article:modified_time" content="${escapeHtml(updatedIso)}">
  <meta property="article:section" content="${escapeHtml(article.category)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(article.metaDescription)}">
  <meta name="twitter:image" content="${escapeHtml(safeImageUrl)}">
  <title>${escapeHtml(article.seoTitle)}</title>
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="${escapeHtml(assets.stylesheetHref)}">
  <script type="application/ld+json" id="structuredData">
  ${serializeJsonLdSafe(jsonLd)}
  </script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-LRM7QXKF2Q"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-LRM7QXKF2Q');
  </script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7782426836472981" crossorigin="anonymous"></script>
</head>
<body>
  <div class="utility-bar">
    <div class="wrap utility-inner">
      <span>UNITY <b>•</b> LAND <b>•</b> FREEDOM</span>
      <div class="utility-right">
        <span>THE MOVEMENT GAZETTE <span id="today"></span></span>
      </div>
    </div>
  </div>

  <header class="site-header">
    <div class="wrap masthead">
      <a class="brand" href="/" aria-label="NEF123123 home">
        <img src="${escapeHtml(assets.brandLogoSrc)}" alt="NEF123123 Emblem Logo" class="brand-logo-img">
        <div class="brand-text">
          <span class="brand-mark"><span class="mark-nef">NEF</span><span class="mark-num">123123</span></span>
          <span class="brand-sub">NAVIGANT ECONOMIC FREEDOM</span>
        </div>
      </a>

      <div class="masthead-actions">
        <div class="masthead-socials">
          <a href="https://www.youtube.com/@NEF12312" target="_blank" rel="noopener noreferrer" class="masthead-yt-btn" title="Watch NEF123123 on YouTube" aria-label="Watch NEF123123 on YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://www.facebook.com/Nef1231231" target="_blank" rel="noopener noreferrer" class="masthead-fb-btn" title="Follow NEF123123 on Facebook" aria-label="Follow NEF123123 on Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        </div>
        <a class="join-btn" href="/#movement">JOIN THE MOVEMENT</a>
        <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
      </div>
    </div>

    <nav class="main-nav" id="mainNav" aria-label="Primary">
      <div class="wrap nav-inner">
        <a href="/">Home</a>
        <a class="active" href="/news/">All News</a>
        <a href="/#africa">Africa</a>
        <a href="/#markets">Markets</a>
        <a href="/#sport">Sport</a>
        <a href="/#weather">Weather</a>
        <a href="/#economy">Economy</a>
        <a href="/about">About Us</a>
        <a href="/editorial-policy">Editorial Policy</a>
        <a href="/contact">Contact</a>
      </div>
    </nav>
  </header>

  <main class="wrap news-article-page">
    <nav class="news-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span aria-hidden="true">/</span>
      <a href="/news/">News Archive</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(article.category)}</span>
    </nav>

    <div class="news-article-layout">
      <article class="news-article-card">
        <div class="news-article-meta">
          <span class="pill">${escapeHtml(article.category)}</span>
          <time datetime="${escapeHtml(publishedIso)}">${escapeHtml(publishedDisplay)}</time>
        </div>

        <h1>${escapeHtml(article.title)}</h1>

        <p class="news-article-dek">${escapeHtml(article.metaDescription)}</p>

        <figure class="news-article-hero">
          <img src="${escapeHtml(safeImageUrl)}" alt="${escapeHtml(article.imageAlt)}">
        </figure>

        <div class="news-article-body">
${paragraphsHtml}
        </div>

        <div class="news-article-footer">
          <p class="news-article-source"><strong>Source &amp; Attribution:</strong> ${escapeHtml(article.source)}</p>
          <div class="news-article-actions">
            <a class="news-article-back" href="/news/">← All NEF123123 News</a>${externalButtonHtml}
          </div>
        </div>
      </article>

      <aside class="news-related-sidebar" aria-label="More NEF123123 reports">
        <div class="side-card">
          <h3>More NEF123123 Reports</h3>
          <ul class="news-related-list">
${relatedHtml}
          </ul>
        </div>
      </aside>
    </div>
  </main>

  <footer class="site-footer">
    <div class="wrap footer-bottom">
      <span>© <span id="year"></span> NEF123123 — Navigant Economic Freedom.</span>
      <span><a href="/about">About</a> · <a href="/editorial-policy">Editorial Policy</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span>
    </div>
  </footer>${articleScriptTag}
</body>
</html>
`;
}

/**
 * Renders a clean, branded HTTP 410 Gone page when an article has been
 * explicitly retracted or unpublished by an authorized administrator.
 */
export function renderRetractedArticleHtml(
  slug: string,
  options: { isProduction?: boolean; reason?: string } = {}
): string {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const assets = resolvePageAssets(isProduction);
  const reasonLabel = options.reason === 'unpublished' ? 'Unpublished' : 'Retracted';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <title>Article ${escapeHtml(reasonLabel)} | NEF123123 News</title>
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="stylesheet" href="${escapeHtml(assets.stylesheetHref)}">
</head>
<body>
  <header class="site-header">
    <div class="wrap masthead">
      <a class="brand" href="/" aria-label="NEF123123 home">
        <img src="${escapeHtml(assets.brandLogoSrc)}" alt="NEF123123 Emblem Logo" class="brand-logo-img">
        <div class="brand-text">
          <span class="brand-mark"><span class="mark-nef">NEF</span><span class="mark-num">123123</span></span>
          <span class="brand-sub">NAVIGANT ECONOMIC FREEDOM</span>
        </div>
      </a>
    </div>
  </header>
  <main class="wrap news-article-page">
    <article class="news-article-card">
      <div class="news-article-meta">
        <span class="pill">Notice · HTTP 410</span>
      </div>
      <h1>This article is no longer published</h1>
      <p class="news-article-dek">
        The report at <code>/news/${escapeHtml(slug)}</code> has been removed from publication by the NEF123123 Editorial Desk.
      </p>
      <div class="news-article-actions">
        <a class="news-article-back" href="/#latest-news">← Return to NEF123123 News</a>
      </div>
    </article>
  </main>
</body>
</html>
`;
}
