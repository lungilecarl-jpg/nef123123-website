import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const newsDir = path.join(rootDir, 'news');
const publicDir = path.join(rootDir, 'public');
const catalogPath = path.join(rootDir, 'data', 'articles-catalog.json');

const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';

function normalizeExternalUrlKey(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    const kept = [];
    parsed.searchParams.forEach((v, k) => {
      const lk = k.toLowerCase();
      if (lk.startsWith('utm_') || ['fbclid', 'gclid', 'ref', 'source', 'si', 'igshid'].includes(lk)) return;
      kept.push([lk, v.trim()]);
    });
    kept.sort((a, b) => a[0].localeCompare(b[0]));
    const qs = kept.length ? `?${kept.map(([k, v]) => `${k}=${v}`).join('&')}` : '';
    return `https://${host}${pathname}${qs}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

function computeBodyFingerprintKey(article) {
  const parts = [
    ...(Array.isArray(article.paragraphs) ? article.paragraphs : []),
    ...((Array.isArray(article.sections) ? article.sections : []).flatMap((s) =>
      Array.isArray(s?.paragraphs) ? s.paragraphs : []
    )),
  ];
  const normalized = parts
    .join(' ')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = normalized ? normalized.split(' ').filter((w) => w.length >= 2) : [];
  if (words.length < 12) return '';
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

const ISO_DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/;
const ALLOWED_PUBLISHED_STATUSES = new Set(['published', 'approved']);

function parseValidIsoDate(value) {
  const trimmed = String(value || '').trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPublishedRawArticle(article) {
  if (!article || typeof article !== 'object') return false;
  if (article.draft === true || article.published === false) return false;
  if (article.status !== undefined && String(article.status).trim() !== '') {
    if (!ALLOWED_PUBLISHED_STATUSES.has(String(article.status).trim().toLowerCase())) return false;
  }
  const slug = String(article.slug || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return false;
  if (!String(article.title || '').trim()) return false;
  if (!parseValidIsoDate(article.publishedDate)) return false;
  return true;
}

export function deduplicateRawArticles(list) {
  const bySlug = new Map();
  list.forEach((article, index) => {
    if (!isPublishedRawArticle(article)) return;
    const normalized = String(article.slug || '').trim().toLowerCase();
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

  const slugDeduped = Array.from(bySlug.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.article);

  const seenExternalUrls = new Set();
  const seenBodyFingerprints = new Set();
  const finalArticles = [];

  for (const article of slugDeduped) {
    const extKey = normalizeExternalUrlKey(article.externalUrl);
    if (extKey && seenExternalUrls.has(extKey)) {
      console.warn(`[NEF123123 duplicate-guard] Blocked duplicate externalUrl on "${article.slug}": ${extKey}`);
      continue;
    }
    const bodyFp = computeBodyFingerprintKey(article);
    if (bodyFp && seenBodyFingerprints.has(bodyFp)) {
      console.warn(`[NEF123123 duplicate-guard] Blocked duplicate exact content fingerprint on "${article.slug}"`);
      continue;
    }
    if (extKey) seenExternalUrls.add(extKey);
    if (bodyFp) seenBodyFingerprints.add(bodyFp);
    finalArticles.push(article);
  }

  return finalArticles;
}

/**
 * Safely deletes orphaned `<slug>.html` files in targetNewsDir that are no longer
 * present in `activeSlugs`. Never touches non-HTML assets (e.g. `article-seo.js`)
 * or the archive page `index.html`, and enforces strict directory boundary containment.
 */
export function removeOrphanedNewsHtml(targetNewsDir, activeSlugs) {
  const resolvedDir = path.resolve(targetNewsDir);
  if (!fs.existsSync(resolvedDir)) return [];

  const allowedFiles = new Set([
    'index.html',
    ...Array.from(activeSlugs).map((slug) => `${String(slug).trim().toLowerCase()}.html`),
  ]);
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

const ARTICLES = rawArticles.map((article) => {
  const pubParsed = parseValidIsoDate(article.publishedDate);
  const updParsed = article.updatedDate ? parseValidIsoDate(article.updatedDate) : null;
  const effectiveUpdatedIso =
    updParsed && pubParsed && updParsed.getTime() >= pubParsed.getTime()
      ? article.updatedDate
      : article.publishedDate;

  return {
    ...article,
    slug: String(article.slug).trim().toLowerCase(),
    ogImageAbsolute: resolveAbsoluteImageUrl(article.ogImage || article.img),
    publishedDateIso: article.publishedDate,
    updatedDateIso: effectiveUpdatedIso,
    publishedDateDisplay: String(article.publishedDate).slice(0, 10),
  };
});

const hasGitDir = fs.existsSync(path.join(rootDir, '.git'));

function getGitLastCommitDate(relativePath) {
  if (!hasGitDir) return null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relativePath], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const parsed = parseValidIsoDate(out);
    return parsed ? parsed.toISOString().slice(0, 10) : null;
  } catch {
    return null;
  }
}

function getFileLastmodDate(relativePath) {
  const candidate = path.resolve(rootDir, relativePath);
  if (!candidate.startsWith(rootDir + path.sep)) return null;
  const gitDate = getGitLastCommitDate(relativePath);
  if (gitDate) return gitDate;
  try {
    const stat = fs.statSync(candidate);
    if (stat.isFile() && !Number.isNaN(stat.mtime.getTime())) {
      return stat.mtime.toISOString().slice(0, 10);
    }
  } catch {
    return null;
  }
  return null;
}

function maxDate(a, b) {
  if (a && b) return a >= b ? a : b;
  return a || b;
}

function writeFileIfChanged(filePath, content) {
  try {
    if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
      return false;
    }
  } catch {
    // Proceed to write
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

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
          url: `${OFFICIAL_ORIGIN}/about`,
        },
        publisher: {
          '@type': 'NewsMediaOrganization',
          '@id': `${OFFICIAL_ORIGIN}/#organization`,
          name: 'NEF123123',
          alternateName: ['Navigant Economic Freedom', 'nef123123.co.za'],
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
            item: `${OFFICIAL_ORIGIN}/news/`,
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

  const leadParagraphsHtml = article.paragraphs
    .map((paragraph) => `          <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const sectionsHtml = Array.isArray(article.sections)
    ? article.sections
        .map((section) => {
          const secHeading = section.heading
            ? `          <h2>${escapeHtml(section.heading)}</h2>`
            : '';
          const secParas = Array.isArray(section.paragraphs)
            ? section.paragraphs.map((p) => `          <p>${escapeHtml(p)}</p>`).join('\n')
            : '';
          return [secHeading, secParas].filter(Boolean).join('\n');
        })
        .join('\n')
    : '';

  const bodyHtml = [leadParagraphsHtml, sectionsHtml].filter(Boolean).join('\n');

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
          <a href="https://www.instagram.com/nef123123/" target="_blank" rel="noopener noreferrer" class="masthead-ig-btn" title="Follow NEF123123 on Instagram" aria-label="Follow NEF123123 on Instagram">
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

  <main class="portal-canvas news-article-main">
    <div class="wrap">
      <nav class="news-breadcrumb" aria-label="Breadcrumb">
        <a href="/">NEF123123 Home</a>
        <span aria-hidden="true">/</span>
        <a href="/news/">News Archive</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(article.title)}</span>
      </nav>

      <div class="news-article-layout">
        <article class="news-article-shell">
          <div class="news-article-kicker">${escapeHtml(article.category)}</div>
          <h1>${escapeHtml(article.title)}</h1>
          <div class="news-article-byline">
            <span><strong>Source &amp; Desk:</strong> ${escapeHtml(article.source)}</span>
            <span>Published: <time datetime="${escapeHtml(article.publishedDateIso)}">${escapeHtml(article.publishedDateDisplay)}</time></span>
          </div>

          <figure class="news-article-figure">
            <img src="${escapeHtml(article.img)}" alt="${escapeHtml(article.alt)}">
            <figcaption>${escapeHtml(article.alt)}</figcaption>
          </figure>

          <div class="news-article-body">
${bodyHtml}
          </div>

          <div class="article-editorial-note">
            Published by <strong>NEF123123 — Navigant Economic Freedom</strong> under our <a href="/editorial-policy">Editorial Policy</a>. For factual corrections, reader feedback, or right-of-reply requests, please <a href="/contact">contact our desk</a>.
          </div>

          <div class="news-article-actions">
            <a class="news-article-btn news-article-btn-secondary" href="/news/">← All NEF123123 News</a>${externalButtonHtml}
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
      <div>
        <h3>Explore</h3>
        <a href="/news/">All News Reports</a>
        <a href="/#latest-news">Latest news</a>
        <a href="/#africa">Africa in focus</a>
        <a href="/#markets">Markets &amp; real estate</a>
        <a href="/#sport">Sport</a>
        <a href="/#weather">Live weather</a>
        <a href="/#economy">Economic freedom</a>
      </div>
      <div>
        <h3>Organisation &amp; Policies</h3>
        <a href="/about">About Us</a>
        <a href="/editorial-policy">Editorial Policy</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
        <a href="/contact">Contact Us</a>
      </div>
      <div>
        <h3>Get in touch</h3>
        <p>For editorial submissions, corrections, partnerships, and general enquiries:</p>
        <p><a class="footer-email-text" href="mailto:info@nef123123.co.za">info@nef123123.co.za</a></p>
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

function buildNewsArchiveHtml() {
  const canonicalUrl = `${OFFICIAL_ORIGIN}/news/`;
  const cardsHtml = ARTICLES.map(
    (article) => `          <article class="archive-card">
            <a class="archive-card-media" href="/news/${article.slug}" aria-label="${escapeHtml(article.title)}">
              <img src="${escapeHtml(article.img)}" alt="${escapeHtml(article.alt)}" loading="lazy">
            </a>
            <div class="archive-card-body">
              <div class="archive-card-meta">
                <span class="archive-card-cat">${escapeHtml(article.category)}</span>
                <time datetime="${escapeHtml(article.publishedDateIso)}">${escapeHtml(article.publishedDateDisplay)}</time>
              </div>
              <h2><a href="/news/${article.slug}">${escapeHtml(article.title)}</a></h2>
              <p>${escapeHtml(article.metaDescription)}</p>
              <div class="archive-card-foot">
                <span>${escapeHtml(article.source)}</span>
                <a class="archive-read-link" href="/news/${article.slug}">Read full article →</a>
              </div>
            </div>
          </article>`
  ).join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'NEF123123 News Archive — The Movement Gazette',
        description:
          'Browse all South African news reports, parliamentary dispatches, and African economic freedom analyses published by NEF123123.',
        url: canonicalUrl,
        inLanguage: 'en-ZA',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: ARTICLES.map((article, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${OFFICIAL_ORIGIN}/news/${article.slug}`,
            name: article.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${OFFICIAL_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'News Archive', item: canonicalUrl },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0d6bb0">
  <meta name="description" content="Complete NEF123123 News Archive — South African politics, parliamentary oversight, Africa in Focus, and Navigant Economic Freedom analyses.">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" id="canonicalLink" href="${canonicalUrl}">
  <link rel="alternate" type="application/rss+xml" title="NEF123123 — Navigant Economic Freedom RSS Feed" href="${OFFICIAL_ORIGIN}/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="NEF123123 — Navigant Economic Freedom Atom Feed" href="${OFFICIAL_ORIGIN}/atom.xml">
  <link rel="alternate" type="application/feed+json" title="NEF123123 — Navigant Economic Freedom JSON Feed" href="${OFFICIAL_ORIGIN}/feed.json">
  <meta property="og:site_name" content="NEF123123">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:type" content="website">
  <meta property="og:title" content="All News &amp; Reports — NEF123123 | The Movement Gazette">
  <meta property="og:description" content="Browse all South African news reports, parliamentary dispatches, and African economic freedom analyses published by NEF123123.">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${OFFICIAL_ORIGIN}/favicon.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="All News &amp; Reports — NEF123123 | The Movement Gazette">
  <meta name="twitter:description" content="Browse all South African news reports, parliamentary dispatches, and African economic freedom analyses published by NEF123123.">
  <meta name="twitter:image" content="${OFFICIAL_ORIGIN}/favicon.png">
  <title>All News &amp; Reports — NEF123123 | The Movement Gazette</title>
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">
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
          <a href="https://www.instagram.com/nef123123/" target="_blank" rel="noopener noreferrer" class="masthead-ig-btn" title="Follow NEF123123 on Instagram" aria-label="Follow NEF123123 on Instagram">
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

  <main class="portal-canvas news-article-main">
    <div class="wrap">
      <nav class="news-breadcrumb" aria-label="Breadcrumb">
        <a href="/">NEF123123 Home</a>
        <span aria-hidden="true">/</span>
        <span>News Archive</span>
      </nav>

      <section class="news-article-shell archive-header-shell">
        <div class="news-article-kicker">THE MOVEMENT GAZETTE · COMPLETE ARCHIVE</div>
        <h1>NEF123123 News &amp; Economic Freedom Reports</h1>
        <p class="archive-intro">Explore all published South African news reports, parliamentary dispatches, and continental economic sovereignty analyses from NEF123123. Every article is prepared in accordance with our <a href="/editorial-policy">Editorial Policy</a>.</p>
      </section>

      <section class="archive-grid" aria-label="Published NEF123123 articles">
${cardsHtml}
      </section>
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
      <div>
        <h3>Explore</h3>
        <a href="/news/">All News Reports</a>
        <a href="/#latest-news">Latest news</a>
        <a href="/#africa">Africa in focus</a>
        <a href="/#markets">Markets &amp; real estate</a>
        <a href="/#sport">Sport</a>
        <a href="/#weather">Live weather</a>
        <a href="/#economy">Economic freedom</a>
      </div>
      <div>
        <h3>Organisation &amp; Policies</h3>
        <a href="/about">About Us</a>
        <a href="/editorial-policy">Editorial Policy</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
        <a href="/contact">Contact Us</a>
      </div>
      <div>
        <h3>Get in touch</h3>
        <p>For editorial submissions, corrections, partnerships, and general enquiries:</p>
        <p><a class="footer-email-text" href="mailto:info@nef123123.co.za">info@nef123123.co.za</a></p>
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
  const latestArticleDate = ARTICLES.reduce((latest, article) => {
    const parsed = parseValidIsoDate(article.updatedDateIso || article.publishedDateIso);
    const datePart = parsed ? parsed.toISOString().slice(0, 10) : null;
    return maxDate(latest, datePart);
  }, null);

  const corePages = [
    { path: '/', file: 'index.html', changefreq: 'daily', priority: '1.0', includesArticles: true },
    { path: '/news/', file: 'news/index.html', changefreq: 'daily', priority: '0.9', includesArticles: true },
    { path: '/about', file: 'about.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/contact', file: 'contact.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/editorial-policy', file: 'editorial-policy.html', changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy', file: 'privacy.html', changefreq: 'monthly', priority: '0.5' },
    { path: '/terms', file: 'terms.html', changefreq: 'monthly', priority: '0.5' },
  ];

  const urls = [
    ...corePages.map((page) => {
      const fileDate = getFileLastmodDate(page.file);
      const lastmod = page.includesArticles ? maxDate(fileDate, latestArticleDate) : fileDate;
      const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
      return `  <url>
    <loc>${escapeXml(`${OFFICIAL_ORIGIN}${page.path}`)}</loc>${lastmodTag}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }),
    ...ARTICLES.map((article) => {
      const parsed = parseValidIsoDate(article.updatedDateIso || article.publishedDateIso);
      const lastmod = parsed ? parsed.toISOString().slice(0, 10) : null;
      const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
      const imageBlock = article.ogImageAbsolute.startsWith('https://')
        ? `\n    <image:image>
      <image:loc>${escapeXml(article.ogImageAbsolute)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
        : '';
      return `  <url>
    <loc>${escapeXml(`${OFFICIAL_ORIGIN}/news/${article.slug}`)}</loc>${lastmodTag}
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

function buildNewsSitemapXml(nowMs = Date.now()) {
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const eligible = [...ARTICLES]
    .sort((a, b) => Date.parse(b.publishedDateIso) - Date.parse(a.publishedDateIso))
    .filter((article) => {
      const parsed = parseValidIsoDate(article.publishedDateIso);
      if (!parsed) return false;
      const ts = parsed.getTime();
      return nowMs - ts <= fortyEightHoursMs && ts <= nowMs + 60_000;
    })
    .slice(0, 1000);

  const entries = eligible.map((article) => {
    const lastmodTag = article.updatedDateIso
      ? `\n    <lastmod>${escapeXml(article.updatedDateIso)}</lastmod>`
      : '';
    const imageBlock = article.ogImageAbsolute.startsWith('https://')
      ? `\n    <image:image>
      <image:loc>${escapeXml(article.ogImageAbsolute)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`
      : '';
    return `  <url>
    <loc>${escapeXml(`${OFFICIAL_ORIGIN}/news/${article.slug}`)}</loc>${lastmodTag}
    <news:news>
      <news:publication>
        <news:name>NEF123123</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(article.publishedDateIso)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>${imageBlock}
  </url>`;
  });

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

function buildRobotsTxt() {
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
    writeFileIfChanged(path.join(newsDir, `${article.slug}.html`), html);
  }

  writeFileIfChanged(path.join(newsDir, 'index.html'), buildNewsArchiveHtml());

  const removedOrphans = removeOrphanedNewsHtml(
    newsDir,
    ARTICLES.map((article) => article.slug)
  );

  const sitemapXml = buildSitemapXml();
  writeFileIfChanged(path.join(rootDir, 'sitemap.xml'), sitemapXml);
  writeFileIfChanged(path.join(publicDir, 'sitemap.xml'), sitemapXml);

  const newsSitemapXml = buildNewsSitemapXml();
  writeFileIfChanged(path.join(rootDir, 'news-sitemap.xml'), newsSitemapXml);
  writeFileIfChanged(path.join(publicDir, 'news-sitemap.xml'), newsSitemapXml);

  const robotsTxt = buildRobotsTxt();
  writeFileIfChanged(path.join(rootDir, 'robots.txt'), robotsTxt);
  writeFileIfChanged(path.join(publicDir, 'robots.txt'), robotsTxt);

  const rootCnamePath = path.join(rootDir, 'CNAME');
  if (fs.existsSync(rootCnamePath)) {
    const cnameContent = fs.readFileSync(rootCnamePath, 'utf8');
    writeFileIfChanged(path.join(publicDir, 'CNAME'), cnameContent);
  }
  writeFileIfChanged(path.join(publicDir, '.nojekyll'), '');

  console.log(
    `Generated ${ARTICLES.length} deduplicated Google News/Discover-ready static news pages, news/index.html archive (removed ${removedOrphans.length} orphaned HTML file(s)), sitemap.xml, news-sitemap.xml, and robots.txt from data/articles-catalog.json.`
  );
}
