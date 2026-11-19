// Dynamically synchronize self-referencing canonical URL and header dates on news article pages
(() => {
  const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';

  function buildCanonicalFromLocation() {
    const rawPath = (window.location.pathname || '/').split('?')[0].split('#')[0];
    const cleanPath = rawPath.replace(/\.html$/i, '').replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/index') {
      return `${OFFICIAL_ORIGIN}/`;
    }
    return `${OFFICIAL_ORIGIN}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
  }

  const canonicalUrl = buildCanonicalFromLocation();
  let canonicalLink = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
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
