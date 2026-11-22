import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const newsDir = path.join(rootDir, 'news');
const publicDir = path.join(rootDir, 'public');
const catalogPath = path.join(rootDir, 'data', 'articles-catalog.json');

const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';

export function deduplicateRawArticles(list) {
  const bySlug = new Map();
  list.forEach((article, index) => {
    const normalized = String(article.slug || '').trim().toLowerCase();
    if (!normalized) return;
    const existing = bySlug.get(normalized);
    if (!existing) {
      bySlug.set(normalized, { article, order: index });
      return;
    }
    const prevTs = Date.parse(existing.article.updatedDate || existing.article.publishedDate) || 0;
    const nextTs = Date.parse(article.updatedDate || article.publishedDate) || 0;
    if (nextTs >= prevTs) {
      bySlug.set(normalized, { article, order: existing.order });
    }
  });
  return Array.from(bySlug.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.article);
}

/**
 * Safely deletes orphaned `<slug>.html` files in targetNewsDir that are no longer
 * present in `activeSlugs`. Never touches non-HTML assets (e.g. `article-seo.js`)
 * and enforces strict directory boundary containment.
 */
export function removeOrphanedNewsHtml(targetNewsDir, activeSlugs) {
  const resolvedDir = path.resolve(targetNewsDir);
  if (!fs.existsSync(resolvedDir)) return [];

  const allowedFiles = new Set(
    Array.from(activeSlugs).map((slug) => `${String(slug).trim().toLowerCase()}.html`)
  );
  const removed = [];

  for (const entry of fs.readdirSync(resolvedDir)) {
    if (!/^[a-z0-9-]+\.html$/i.test(entry)) continue;
    if (allowedFiles.has(entry.toLowerCase())) continue;

    const candidatePath = path.resolve(resolvedDir, entry);
    if (!candidatePath.startsWith(resolvedDir + path.sep)) continue;
    if (fs.statSync(candidatePath).isFile()) {
      fs.unlinkSync(candidatePath);
      removed.push(entry);
    }
  }
  return removed;
}

const rawArticles = deduplicateRawArticles(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));

function resolveAbsoluteImageUrl(imgPath) {
  if (/^https?:\/\//i.test(imgPath)) {
    return imgPath;
  }
  const normalized = imgPath.startsWith('/') ? imgPath : `/${imgPath.replace(/^\.\.\//, '')}`;
  return `${OFFICIAL_ORIGIN}${normalized}`;
}

const ARTICLES = rawArticles.map((article) => ({
  ...article,
  ogImageAbsolute: resolveAbsoluteImageUrl(article.ogImage || article.img),
  publishedDateIso: article.publishedDate,
  updatedDateIso: article.updatedDate || article.publishedDate,
  publishedDateDisplay: String(article.publishedDate).slice(0, 10),
}));

const LASTMOD = ARTICLES.reduce((latest, article) => {
  const datePart = String(article.updatedDateIso || article.publishedDateIso).slice(0, 10);
  return datePart > latest ? datePart : latest;
}, '2026-04-15');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildArticleHtml(article) {
  const canonicalUrl = `${OFFICIAL_ORIGIN}/news/${article.slug}`;
  const related = ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 6);

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
        image: [article.ogImageAbsolute],
        datePublished: article.publishedDateIso,
        dateModified: article.updatedDateIso,
        articleSection: article.category,
        inLanguage: 'en-ZA',
        isAccessibleForFree: true,
        keywords: Array.isArray(article.keywords) ? article.keywords.join(', ') : article.category,
        url: canonicalUrl,
        author: {
          '@type': 'Organization',
          name: 'NEF123123 Editorial Desk',
          url: `${OFFICIAL_ORIGIN}/`,
        },
        publisher: {
          '@type': 'NewsMediaOrganization',
          name: 'NEF123123 — Navigant Economic Freedom',
          url: `${OFFICIAL_ORIGIN}/`,
          logo: {
            '@type': 'ImageObject',
            url: `${OFFICIAL_ORIGIN}/favicon.png`,
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
            item: `${OFFICIAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'News',
            item: `${OFFICIAL_ORIGIN}/#latest-news`,
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

  const externalButtonHtml = article.externalUrl
    ? `\n          <a class="news-article-btn" href="${escapeHtml(article.externalUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.externalLabel || 'Read original source →')}</a>`
    : '';

  const relatedHtml = related
    .map(
      (item) => `            <li>
              <a href="/news/${item.slug}">
                <span class="news-related-cat">${escapeHtml(item.category)}</span>
                ${escapeHtml(item.title)}
              </a>
            </li>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0d6bb0">
  <meta name="description" content="${escapeHtml(article.metaDescription)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" id="canonicalLink" href="${canonicalUrl}">
  <link rel="alternate" type="application/rss+xml" title="NEF123123 — Navigant Economic Freedom RSS Feed" href="${OFFICIAL_ORIGIN}/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="NEF123123 — Navigant Economic Freedom Atom Feed" href="${OFFICIAL_ORIGIN}/atom.xml">
  <link rel="alternate" type="application/feed+json" title="NEF123123 — Navigant Economic Freedom JSON Feed" href="${OFFICIAL_ORIGIN}/feed.json">
  <meta property="og:site_name" content="NEF123123">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.seoTitle)}">
  <meta property="og:description" content="${escapeHtml(article.metaDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(article.ogImageAbsolute)}">
  <meta property="article:published_time" content="${escapeHtml(article.publishedDateIso)}">
  <meta property="article:modified_time" content="${escapeHtml(article.updatedDateIso)}">
  <meta property="article:section" content="${escapeHtml(article.category)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(article.metaDescription)}">
  <meta name="twitter:image" content="${escapeHtml(article.ogImageAbsolute)}">
  <title>${escapeHtml(article.seoTitle)}</title>
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json" id="structuredData">
  ${JSON.stringify(jsonLd, null, 2)}
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
        <img src="../src/assets/images/regenerated_image_1794535451736.jpg" alt="NEF123123 Emblem Logo" class="brand-logo-img">
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
          <a href="https://www.instagram.com/nef123123/#" target="_blank" rel="noopener noreferrer" class="masthead-ig-btn" title="Follow NEF123123 on Instagram" aria-label="Follow NEF123123 on Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://www.tiktok.com/@NEF123123" target="_blank" rel="noopener noreferrer" class="masthead-tt-btn" title="Follow NEF123123 on TikTok" aria-label="Follow NEF123123 on TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
          </a>
        </div>
        <button class="menu-toggle" id="menuToggle" aria-label="Open navigation" aria-expanded="false">☰</button>
      </div>
    </div>

    <nav class="main-nav" id="mainNav">
      <div class="wrap nav-inner">
        <a href="/">Home</a>
        <a href="/#top-stories">Top Stories</a>
        <a class="active" href="/#latest-news">Latest News</a>
        <a href="/#africa">Africa</a>
        <a href="/#news-ads">Advertising</a>
        <a href="/#markets">Markets</a>
        <a href="/#sport">Sport</a>
        <a href="/#weather">Weather</a>
        <a href="/#economy">Economy</a>
        <a href="/#movement">The Movement</a>
        <a href="/#contact">Contact</a>
      </div>
    </nav>
  </header>

  <main class="portal-canvas news-article-main">
    <div class="wrap">
      <nav class="news-breadcrumb" aria-label="Breadcrumb">
        <a href="/">NEF123123 Home</a>
        <span aria-hidden="true">/</span>
        <a href="/#latest-news">News</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(article.title)}</span>
      </nav>

      <div class="news-article-layout">
        <article class="news-article-shell">
          <div class="news-article-kicker">${escapeHtml(article.category)}</div>
          <h1>${escapeHtml(article.title)}</h1>
          <div class="news-article-byline">
            <span>${escapeHtml(article.source)}</span>
            <span>Published: <time datetime="${escapeHtml(article.publishedDateIso)}">${escapeHtml(article.publishedDateDisplay)}</time></span>
          </div>

          <figure class="news-article-figure">
            <img src="${escapeHtml(article.img)}" alt="${escapeHtml(article.alt)}">
            <figcaption>${escapeHtml(article.alt)}</figcaption>
          </figure>

          <div class="news-article-body">
${paragraphsHtml}
          </div>

          <div class="news-article-actions">
            <a class="news-article-btn news-article-btn-secondary" href="/#latest-news">← Back to NEF123123 News</a>${externalButtonHtml}
          </div>
        </article>

        <aside class="news-article-sidebar" aria-label="More NEF123123 News">
          <div class="news-sidebar-card">
            <h2>More NEF123123 Reports</h2>
            <ul class="news-related-list">
${relatedHtml}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </main>

  <footer id="contact">
    <div class="wrap footer-main">
      <div class="footer-brand">
        <a class="brand brand-footer" href="/">
          <img src="../src/assets/images/regenerated_image_1794535454253.jpg" alt="NEF123123 Logo" class="brand-logo-img">
          <div class="brand-text">
            <span class="brand-mark"><span class="mark-nef">NEF</span><span class="mark-num">123123</span></span>
            <span class="brand-sub">NAVIGANT ECONOMIC FREEDOM</span>
          </div>
        </a>
        <p>Navigating the path to economic freedom. Reporting, teaching and building.</p>
        <strong>✊ Unity, Land, and Freedom.</strong>
      </div>
      <div><h3>Explore</h3><a href="/#top-stories">Top stories &amp; deals</a><a href="/#latest-news">Latest news</a><a href="/#africa">Africa in focus</a><a href="/#news-ads">Advertising</a><a href="/#markets">Markets &amp; real estate</a><a href="/#sport">Sport</a><a href="/#weather">Live weather</a><a href="/#economy">Economic freedom</a></div>
      <div><h3>The movement</h3><a href="/#movement">About NEF123123</a><a href="/#affiliates">Partners</a><a href="/#join">Join the movement</a><a href="/#contact">Contact</a></div>
      <div>
        <h3>Get in touch</h3>
        <p>For editorial submissions, partnerships and general enquiries:</p>
        <a class="footer-email-link" href="mailto:info@nef123123.co.za" title="Email info@nef123123.co.za" aria-label="Email info@nef123123.co.za">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="19" height="19" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </a>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="wrap">
        <span>© <span id="year"></span> NEF123123 — Navigant Economic Freedom</span>
        <span>OFFICIAL DOMAIN: WWW.NEF123123.CO.ZA</span>
        <a href="/">Back to homepage ↑</a>
      </div>
    </div>
  </footer>

  <script type="module" src="./article-seo.js"></script>
</body>
</html>
`;
}

function buildSitemapXml() {
  const urls = [
    `  <url>
    <loc>${escapeXml(`${OFFICIAL_ORIGIN}/`)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...ARTICLES.map(
      (article) => `  <url>
    <loc>${escapeXml(`${OFFICIAL_ORIGIN}/news/${article.slug}`)}</loc>
    <lastmod>${String(article.updatedDateIso || article.publishedDateIso).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeXml(article.ogImageAbsolute)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>
  </url>`
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${OFFICIAL_ORIGIN}/sitemap.xml
Sitemap: ${OFFICIAL_ORIGIN}/news-sitemap.xml
`;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  fs.mkdirSync(newsDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  for (const article of ARTICLES) {
    const html = buildArticleHtml(article);
    fs.writeFileSync(path.join(newsDir, `${article.slug}.html`), html, 'utf8');
  }

  const removedOrphans = removeOrphanedNewsHtml(
    newsDir,
    ARTICLES.map((article) => article.slug)
  );

  const sitemapXml = buildSitemapXml();
  fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');

  const robotsTxt = buildRobotsTxt();
  fs.writeFileSync(path.join(rootDir, 'robots.txt'), robotsTxt, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');

  console.log(
    `Generated ${ARTICLES.length} deduplicated Google News/Discover-ready static news pages (removed ${removedOrphans.length} orphaned HTML file(s)), sitemap.xml, and robots.txt from data/articles-catalog.json.`
  );
}
