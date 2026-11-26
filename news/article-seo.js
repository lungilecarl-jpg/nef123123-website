// Dynamically synchronize self-referencing canonical URL and header dates on news article pages
(() => {
  const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';

  function buildCanonicalFromLocation() {
    const rawPath = String(window.location.pathname || '/').split('?')[0].split('#')[0];
    const normalized = rawPath
      .replace(/\/+/g, '/')
      .replace(/\.html$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

    if (!normalized || normalized === '/' || normalized === '/index') {
      return `${OFFICIAL_ORIGIN}/`;
    }
    if (normalized === '/news' || normalized === '/news/index') {
      return `${OFFICIAL_ORIGIN}/news/`;
    }
    const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${OFFICIAL_ORIGIN}${cleanPath}`;
  }

  const canonicalUrl = buildCanonicalFromLocation();
  const existingCanonicals = Array.from(document.head.querySelectorAll('link[rel="canonical"]'));
  let canonicalLink = existingCanonicals[0] || null;
  for (let i = 1; i < existingCanonicals.length; i += 1) {
    existingCanonicals[i].remove();
  }
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    canonicalLink.id = 'canonicalLink';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  const ogUrl = document.head.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', canonicalUrl);
  }

  const today = new Date();
  const todayEl = document.getElementById('today');
  if (todayEl) {
    todayEl.textContent = today
      .toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase();
  }

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(today.getFullYear());
  }

  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  toggle?.addEventListener('click', () => {
    if (!nav) return;
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
})();
