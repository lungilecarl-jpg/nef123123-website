const regeneratedImg =
  document.getElementById('heroSlideMovementImgRef')?.getAttribute('href') ||
  './src/assets/images/regenerated_image_1794523988514.jpg';

const coalitionImg =
  document.querySelector('#openCoalitionImage img')?.getAttribute('src') ||
  './src/assets/images/assets/aistudio/image_e921a8c9.png';

const malemaZilleImg =
  document.querySelector('#openMalemaZilleImage img')?.getAttribute('src') ||
  './src/assets/images/regenerated_image_1794932529148.jpg';

const effInsourcingImg =
  document.querySelector('#openAgricultureImage img')?.getAttribute('src') ||
  './src/assets/images/eff-insourcing-bill-maotwe.jpg';

const faoSchwarzImg =
  document.getElementById('heroSlideFaoImgRef')?.getAttribute('href') ||
  './src/assets/images/fao-schwarz-store-b0d0vnini.jpg';

const sihleLonziImg =
  document.querySelector('#openSihleLonziImage img')?.getAttribute('src') ||
  '/assets/aistudio/Screenshot_2026-11-19_093542_1cad536d.png';

const malemaWaterCrisisImg =
  document.querySelector('#openMalemaWaterCrisisImage img')?.getAttribute('src') ||
  './src/assets/images/malema-water-crisis-warning.jpg';

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
  yearEl.textContent = today.getFullYear();
}

const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('mainNav');
toggle?.addEventListener('click', () => {
  if (!nav) return;
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

nav?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    nav.querySelectorAll('a').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  })
);

document.getElementById('joinForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.getElementById('formMessage');
  if (!message) return;
  message.textContent =
    'Thank you for your interest. The subscription service must be connected by the site administrator before sign-ups can be stored.';
  message.classList.add('form-success');
});

const heroAmazonImg = '/assets/aistudio/image_a0935a15.png';

// MSN-style Hero Carousel Switcher across News, Africa, Amazon Deals & Movement perspectives
const heroSlides = [
  {
    href: 'https://link.amazon/B0d0vNini',
    external: true,
    img: faoSchwarzImg,
    imgPosition: 'center',
    alt: 'FAO Schwarz Official Amazon Storefront — A World of Wonder Awaits featuring plush teddy bears, toys, and musical gifts',
    label: 'AMAZON BRAND STORE',
    category: 'SPONSORED · FAO SCHWARZ OFFICIAL STORE',
    title: 'FAO Schwarz on Amazon: A World of Wonder Awaits',
    desc: 'Explore the official FAO Schwarz storefront featuring iconic Soldier Bear & Adopt-A-Pets plush, Giant Dance Mat Pianos, Kids Electric Guitars, wooden Castle Blocks, Arts & Music kits, and 30% off Early Black Friday gifts.',
    cta: 'Shop FAO Schwarz Store',
    ariaLabel: 'Shop the official FAO Schwarz storefront on Amazon',
  },
  {
    href: 'https://www.facebook.com/share/v/1JN4arz1oe/',
    external: true,
    externalRel: 'noopener noreferrer',
    img: effInsourcingImg,
    imgPosition: 'center top',
    alt: 'EFF Treasurer-General and MP Hon. Omphile Maotwe speaking outside Parliament on the EFF Insourcing Bill',
    label: 'PARLIAMENT VIDEO',
    category: 'NEF123123 NEWS | PARLIAMENT',
    title: 'EFF’s Omphile Maotwe Urges Swift Progress on Insourcing Bill After Four Years',
    desc: 'EFF Treasurer-General & MP Hon. Omphile Maotwe reflects on the Insourcing Bill’s four-year journey since Nov 2022, confirming Treasury, Presidency & DPSA support and urging no further delays.',
    cta: 'Watch Video on Facebook',
    ariaLabel: 'Watch EFF Treasurer-General Hon. Omphile Maotwe speak on the EFF Insourcing Bill on Facebook',
  },
  {
    href: '#latest-news',
    articleId: 'malemaZille',
    img: malemaZilleImg,
    imgPosition: 'center top',
    alt: 'EFF leader Julius Malema smiling in a red beret while speaking with journalists',
    label: 'LATEST NEWS',
    category: 'NEF123123 NEWS | SOUTH AFRICA',
    title: 'Malema Challenges Helen Zille Over Court Venue as Legal Battle Intensifies',
    desc: "Julius Malema questions Helen Zille's decision to oppose proceedings in the Western Cape High Court, insisting that the legal dispute should be heard in Johannesburg, where the alleged conduct took place.",
    cta: 'Read Full Story',
    ariaLabel: 'Read full story: Malema Challenges Helen Zille Over Court Venue as Legal Battle Intensifies',
  },
  {
    href: '#latest-news',
    articleId: 'coalition',
    img: coalitionImg,
    imgPosition: 'center top',
    alt: 'EFF leader Julius Malema waving in an EFF cap surrounded by supporters',
    label: 'POLITICS DESK',
    category: 'SOUTH AFRICA · COALITION TALKS',
    title: 'DA Invites EFF and MK Party to Municipal Coalition Talks',
    desc: "TimesLIVE reports the EFF confirmed an official DA letter and initial meeting, while Adv. Dali Mpofu told SABC the MK Party accepted talks within 48 hours—marking a turn from the DA's prior GNU stance.",
    cta: 'Read Full Story',
    ariaLabel: 'Read full story: DA Invites EFF and MK Party to Municipal Coalition Talks',
  },
  {
    href: 'https://link.amazon/B0hSwb4I2',
    external: true,
    img: './src/assets/images/amazon-bf-b0hswb4i2-clean.jpg',
    imgPosition: 'center top',
    alt: 'Amazon Black Friday deals start tomorrow featuring Join Prime, up to 65% off devices, 50% off Outlet, 40% off toys, and early brand deals on Skullcandy, MSI gaming desktops, and UGG',
    label: 'AMAZON BLACK FRIDAY 2026',
    category: 'SPONSORED · AMAZON BLACK FRIDAY DEALS',
    title: 'Amazon Black Friday Deals & Early Brand Markdowns',
    desc: 'Up to 65% off devices, 50% off Outlet, 40% off toys & 30% off home & kitchen—plus up to 57% off Skullcandy headphones, MSI gaming PCs, UGG blankets & fast free Prime shipping.',
    cta: 'Shop Black Friday Deals',
    ariaLabel: 'Shop Amazon Black Friday Deals 2026 on Amazon',
  },
  {
    href: '#africa',
    articleId: 'africaDignity',
    img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1100&q=80',
    imgPosition: 'center 72%',
    alt: 'African landscape',
    label: 'AFRICA IN FOCUS',
    category: 'CONTINENTAL PERSPECTIVE',
    title: 'Building an African future rooted in dignity and self-determination',
    desc: 'Explore the ideas, institutions and partnerships helping communities build durable wealth, local skills, and regional resilience across the continent.',
    cta: 'Read Full Story',
    ariaLabel: 'Read full story: Building an African future rooted in dignity and self-determination',
  },
  {
    href: '#economy',
    img: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1100&q=85',
    imgPosition: 'center 72%',
    alt: 'Industrial production facility',
    label: 'BEYOND EXTRACTION',
    category: 'WEALTH SOVEREIGNTY',
    title: 'Wealth must create value here.',
    desc: 'African resources should support African industrial capacity, skills, innovation and prosperity.',
    cta: 'Explore economic sovereignty',
    ariaLabel: 'Explore Beyond Extraction and economic sovereignty',
  },
  {
    href: 'https://link.amazon/B0iCzskXw',
    external: true,
    img: heroAmazonImg,
    imgPosition: 'center 72%',
    alt: 'Amazon storefront sign',
    label: 'AMAZON FEATURED',
    category: 'FEATURED SELECTION',
    title: 'Shop curated picks & deals on Amazon',
    desc: 'Explore verified partner recommendations and everyday essentials selected for the NEF123123 community.',
    cta: 'Shop on Amazon',
    ariaLabel: 'Shop featured Amazon selection on Amazon',
  },
];

let currentSlide = 0;
const heroCard = document.querySelector('#top-stories .msn-hero-card');
const heroLink = document.getElementById('heroSlideLink');
const heroImg = document.getElementById('heroSlideImg');
const heroLabel = document.getElementById('heroSlideLabel');
const heroCategory = document.getElementById('heroSlideCategory');
const heroTitle = document.getElementById('heroSlideTitle');
const heroDesc = document.getElementById('heroSlideDesc');
const heroCta = document.getElementById('heroSlideCta');
const heroDots = document.querySelectorAll('.hero-dot');

function renderSlide(index) {
  currentSlide = (index + heroSlides.length) % heroSlides.length;
  const slide = heroSlides[currentSlide];
  heroLink?.setAttribute('href', slide.href);
  if (slide.external) {
    heroLink?.setAttribute('target', '_blank');
    heroLink?.setAttribute('rel', slide.externalRel || 'noopener noreferrer sponsored');
  } else {
    heroLink?.removeAttribute('target');
    heroLink?.removeAttribute('rel');
  }
  heroLink?.setAttribute('aria-label', slide.ariaLabel || slide.title);
  if (heroImg) {
    heroImg.setAttribute('referrerpolicy', /^https:\/\//i.test(slide.img) ? 'no-referrer' : '');
    heroImg.setAttribute('src', slide.img);
    heroImg.setAttribute('alt', slide.alt);
    heroImg.classList.toggle('hero-img-top', slide.imgPosition === 'center top');
  }
  if (heroLabel) heroLabel.textContent = slide.label;
  if (heroCategory) heroCategory.textContent = slide.category;
  if (heroTitle) heroTitle.textContent = slide.title;
  if (heroDesc) heroDesc.textContent = slide.desc;
  if (heroCta) heroCta.innerHTML = `${slide.cta} <b>→</b>`;
  heroDots.forEach((dot, idx) => {
    const isActive = idx === currentSlide;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', String(isActive));
  });
}

heroLink?.addEventListener('click', (event) => {
  const slide = heroSlides[currentSlide];
  if (slide?.articleId) {
    event.preventDefault();
    openArticleReader(slide.articleId, heroLink);
  }
});

let heroAutoTimer = null;
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function stopHeroAuto() {
  if (heroAutoTimer) {
    clearInterval(heroAutoTimer);
    heroAutoTimer = null;
  }
}

function startHeroAuto() {
  if (prefersReducedMotion || heroSlides.length <= 1) return;
  stopHeroAuto();
  heroAutoTimer = setInterval(() => {
    renderSlide(currentSlide + 1);
  }, 6500);
}

heroCard?.addEventListener('mouseenter', stopHeroAuto);
heroCard?.addEventListener('mouseleave', startHeroAuto);
heroCard?.addEventListener('focusin', stopHeroAuto);
heroCard?.addEventListener('focusout', startHeroAuto);

document.getElementById('heroPrev')?.addEventListener('click', () => {
  renderSlide(currentSlide - 1);
  startHeroAuto();
});
document.getElementById('heroNext')?.addEventListener('click', () => {
  renderSlide(currentSlide + 1);
  startHeroAuto();
});
heroDots.forEach((dot) =>
  dot.addEventListener('click', () => {
    renderSlide(Number(dot.dataset.slide || 0));
    startHeroAuto();
  })
);

renderSlide(0);
startHeroAuto();

// MSN-style Top Search Filtering across cards & pillars
const searchForm = document.getElementById('portalSearchForm');
const searchInput = document.getElementById('portalSearchInput');
const searchClear = document.getElementById('portalSearchClear');
const searchStatus = document.getElementById('searchStatus');
const searchableItems = Array.from(document.querySelectorAll('[data-searchable]'));

function applyPortalSearch(scrollToMatch) {
  const query = searchInput.value.trim().toLowerCase();
  searchClear.hidden = query.length === 0;

  if (!query) {
    searchableItems.forEach((el) => {
      el.classList.remove('search-hidden', 'search-match');
    });
    searchStatus.hidden = true;
    searchStatus.textContent = '';
    return;
  }

  let firstMatch = null;
  let matchCount = 0;

  searchableItems.forEach((el) => {
    const text = el.textContent.toLowerCase();
    const matches = text.includes(query);
    el.classList.toggle('search-hidden', !matches);
    el.classList.toggle('search-match', matches);
    if (matches) {
      matchCount += 1;
      if (!firstMatch) firstMatch = el;
    }
  });

  searchStatus.hidden = false;
  searchStatus.textContent = '';
  const summarySpan = document.createElement('span');
  const queryText = searchInput.value.trim();
  summarySpan.textContent =
    matchCount > 0
      ? `Showing ${matchCount} matching item${matchCount === 1 ? '' : 's'} for "${queryText}".`
      : `No items matched "${queryText}".`;
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'portal-search-submit';
  resetBtn.id = 'resetFilterBtn';
  resetBtn.textContent = 'Show all';
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyPortalSearch(false);
    searchInput.focus();
  });
  searchStatus.append(summarySpan, resetBtn);

  if (scrollToMatch && firstMatch) {
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

searchInput?.addEventListener('input', () => applyPortalSearch(false));
searchClear?.addEventListener('click', () => {
  searchInput.value = '';
  applyPortalSearch(false);
  searchInput.focus();
});
searchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  applyPortalSearch(true);
});

// Dynamic SEO & Canonical URL Helpers (Official domain: https://www.nef123123.co.za)
const OFFICIAL_SITE_ORIGIN = 'https://www.nef123123.co.za';
const HOME_SEO = {
  title: 'NEF123123 | Navigant Economic Freedom',
  description:
    'NEF123123 — Navigant Economic Freedom. Navigating the path to African liberation, wealth sovereignty and economic justice. Unity, Land, and Freedom.',
  canonicalUrl: `${OFFICIAL_SITE_ORIGIN}/`,
  ogType: 'website',
  image: `${OFFICIAL_SITE_ORIGIN}/favicon.png`,
};

function buildDynamicCanonicalUrl(pathname) {
  const rawPath = String(pathname || '/').split('?')[0].split('#')[0];
  if (!rawPath || rawPath === '/' || rawPath === '/index.html') {
    return `${OFFICIAL_SITE_ORIGIN}/`;
  }
  const normalized = rawPath.replace(/\.html$/i, '').replace(/\/+$/, '');
  return `${OFFICIAL_SITE_ORIGIN}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function upsertMetaTag(attrName, attrValue, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalTag(canonicalUrl) {
  let link =
    document.getElementById('canonicalLink') ||
    document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.id = 'canonicalLink';
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonicalUrl);
}

function resolveAbsoluteImageUrl(imgUrl) {
  if (!imgUrl) return `${OFFICIAL_SITE_ORIGIN}/favicon.png`;
  if (/^https?:\/\//i.test(imgUrl)) return imgUrl;
  const cleaned = imgUrl.replace(/^\.\//, '').replace(/^\/+/, '');
  return `${OFFICIAL_SITE_ORIGIN}/${cleaned}`;
}

function updateStructuredData(schemaObj) {
  let script = document.getElementById('structuredData');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structuredData';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObj);
}

function applyPageSeo({ title, description, canonicalUrl, ogType, image, article }) {
  const resolvedCanonical = canonicalUrl || buildDynamicCanonicalUrl(window.location.pathname);
  const resolvedTitle = title || HOME_SEO.title;
  const resolvedDesc = description || HOME_SEO.description;
  const resolvedImage = resolveAbsoluteImageUrl(image);

  document.title = resolvedTitle;
  upsertCanonicalTag(resolvedCanonical);
  upsertMetaTag('name', 'description', resolvedDesc);
  upsertMetaTag('property', 'og:title', resolvedTitle);
  upsertMetaTag('property', 'og:description', resolvedDesc);
  upsertMetaTag('property', 'og:type', ogType || 'website');
  upsertMetaTag('property', 'og:url', resolvedCanonical);
  upsertMetaTag('property', 'og:image', resolvedImage);
  upsertMetaTag('name', 'twitter:title', resolvedTitle);
  upsertMetaTag('name', 'twitter:description', resolvedDesc);
  upsertMetaTag('name', 'twitter:image', resolvedImage);

  if (article && article.slug) {
    updateStructuredData({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': resolvedCanonical,
      },
      headline: article.title,
      description: resolvedDesc,
      image: [resolvedImage],
      datePublished: article.publishedDate || '2026-04-15',
      dateModified: article.publishedDate || '2026-04-15',
      author: {
        '@type': 'Organization',
        name: 'NEF123123 Editorial Desk',
        url: `${OFFICIAL_SITE_ORIGIN}/`,
      },
      publisher: {
        '@type': 'Organization',
        name: 'NEF123123 — Navigant Economic Freedom',
        logo: {
          '@type': 'ImageObject',
          url: `${OFFICIAL_SITE_ORIGIN}/favicon.png`,
        },
      },
      articleSection: article.category || 'News',
      url: resolvedCanonical,
    });
  } else {
    updateStructuredData({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'NewsMediaOrganization',
          '@id': `${OFFICIAL_SITE_ORIGIN}/#organization`,
          name: 'NEF123123 — Navigant Economic Freedom',
          alternateName: 'NEF123123',
          url: `${OFFICIAL_SITE_ORIGIN}/`,
          logo: {
            '@type': 'ImageObject',
            url: `${OFFICIAL_SITE_ORIGIN}/favicon.png`,
          },
        },
        {
          '@type': 'WebSite',
          '@id': `${OFFICIAL_SITE_ORIGIN}/#website`,
          url: `${OFFICIAL_SITE_ORIGIN}/`,
          name: HOME_SEO.title,
          description: HOME_SEO.description,
          publisher: {
            '@id': `${OFFICIAL_SITE_ORIGIN}/#organization`,
          },
        },
      ],
    });
  }
}

// In-page article reader modal for Latest News story bodies
const articleCatalog = {
  africanOwnedSupplyChains: {
    slug: 'african-owned-supply-chains',
    seoTitle: 'African-Owned Supply Chains & Continental Trade | NEF123123',
    metaDescription:
      'How African-owned supply chains, local beneficiation, and intra-continental logistics build sovereign wealth and economic freedom across Africa.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'AFRICA · ECONOMIC FREEDOM',
    title: 'African-Owned Supply Chains: Building Continental Value & Sovereign Trade',
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1100&q=85',
    alt: 'Container logistics and freight corridors powering African-owned supply chains',
    imgPosition: 'center',
    source: 'NEF123123 Editorial Desk · Economic Sovereignty',
    paragraphs: [
      'Across Africa, true economic freedom depends on more than extracting raw materials—it requires African ownership and control over the entire supply chain, from local sourcing and industrial processing to freight logistics, cold-chain storage, and cross-border wholesale distribution.',
      'For decades, colonial-era trade corridors were designed to move unprocessed minerals, timber, and agricultural harvests directly to ports for export, leaving African producers locked out of packaging, refining, shipping, and retail margins.',
      'Building African-owned supply chains under the African Continental Free Trade Area (AfCFTA) framework means investing in regional rail networks, cooperative aggregation hubs, domestic agro-processing plants, and African-financed trade credit so smallholder farmers and local manufacturers can supply continental supermarkets and state procurement directly.',
      'Within the Seven Pillars of Navigant Economic Freedom, strengthening African-owned supply chains retains capital inside local communities, reduces import vulnerability, creates skilled jobs across logistics and manufacturing, and anchors long-term continental wealth sovereignty.',
    ],
  },
  stokvelsAndSavingsCircles: {
    slug: 'stokvels-and-savings-circles',
    seoTitle: 'Stokvels and Savings Circles: Collective Capital | NEF123123',
    metaDescription:
      'Exploring how South African stokvels and community savings circles pool grassroots capital to fund cooperative enterprise and shared wealth.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'ECONOMIC FREEDOM · FINANCE',
    title: 'Stokvels and Savings Circles: Mobilising Collective African Capital',
    img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1100&q=85',
    alt: 'Community savings and collective investment capital growth representing stokvels',
    imgPosition: 'center',
    source: 'NEF123123 Editorial Desk · Cooperative Finance',
    paragraphs: [
      'South Africa’s stokvels and Africa’s rotating savings circles represent one of the continent’s most resilient, trusted grassroots financial institutions—mobilising tens of billions of rand every year through disciplined collective saving, mutual accountability, and Ubuntu.',
      'Traditionally used for groceries, burials, and education expenses, modern investment stokvels are increasingly channelling pooled community capital into bulk procurement, property acquisition, agricultural cooperatives, renewable energy micro-projects, and community-owned retail outlets.',
      'By formalising transparent constitutions, collective bargaining with wholesalers, and cooperative banking partnerships, stokvels can negotiate lower input costs and retain financial returns inside townships and rural economies rather than losing wealth to predatory high-interest lending.',
      'Within Navigant Economic Freedom, stokvels and savings circles demonstrate that African communities already possess the social trust and capital discipline required to build democratic, community-owned wealth from the ground up.',
    ],
  },
  projectMayibuyeSpyOperation: {
    slug: 'project-mayibuye-spy-operation',
    seoTitle: 'Project Mayibuye Spy Operation & Accountability | NEF123123',
    metaDescription:
      'Inside the declassified State Security Agency Project Mayibuye operation, intelligence oversight concerns, and calls for democratic accountability.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'SOUTH AFRICA · INVESTIGATIONS',
    title: 'Project Mayibuye Spy Operation: Declassified Records & Accountability',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1100&q=85',
    alt: 'Parliamentary accountability and legal oversight gavel representing public scrutiny',
    imgPosition: 'center',
    source: 'NEF123123 News Desk · South Africa Oversight',
    paragraphs: [
      'Public disclosures and testimony surrounding the State Security Agency’s (SSA) covert "Project Mayibuye" operation have renewed national scrutiny over how South Africa’s intelligence services operated, how secret funds were authorised, and whether covert programmes strayed beyond their constitutional mandate.',
      'Records cited in parliamentary oversight and inquiry proceedings indicate that Project Mayibuye operated within the SSA’s Special Operations structures, raising urgent questions from civil society, opposition parties, and legal analysts about domestic surveillance, political interference, and weak oversight controls.',
      'Constitutional law experts and accountability advocates emphasise that Section 199 of South Africa’s Constitution prohibits security services from furthering any partisan political interest or prejudicing legitimate political activity, making independent parliamentary review and declassification essential to public trust.',
      'Calls continue for full transparency, strengthened powers for the Inspector-General of Intelligence, and clear legislative safeguards to ensure state intelligence institutions protect national sovereignty and citizens’ constitutional rights rather than factional agendas.',
    ],
  },
  malemaZille: {
    slug: 'malema-challenges-helen-zille-court-venue',
    seoTitle: 'Malema Challenges Helen Zille Over Court Venue | NEF123123',
    metaDescription:
      'EFF leader Julius Malema challenges Helen Zille over her push to move their High Court legal dispute from Johannesburg to Cape Town.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'NEF123123 NEWS | SOUTH AFRICA',
    title: 'Malema Challenges Helen Zille Over Court Venue as Legal Battle Intensifies',
    img: malemaZilleImg,
    alt: 'EFF leader Julius Malema smiling in a red beret while speaking with journalists',
    imgPosition: 'center 15%',
    source: 'NEF123123 News | South Africa',
    paragraphs: [
      "Julius Malema questions Helen Zille's decision to oppose proceedings in the Western Cape High Court, insisting that the legal dispute should be heard in Johannesburg, where the alleged conduct took place.",
      "Economic Freedom Fighters (EFF) leader Julius Sello Malema has publicly questioned Helen Zille's decision to oppose a legal application brought against her in the Western Cape Division of the High Court in Cape Town.",
      'In a statement published on his official X account, Malema indicated that he and the EFF intend to pursue the matter in Johannesburg, arguing that the alleged conduct at the centre of the dispute took place there.',
      'Malema questioned why Zille appears determined to have the proceedings heard in Cape Town rather than Johannesburg.',
      '"We are suing her in Johannesburg, but she insists that the case be heard in Cape Town. What does she know about that court that gives her such confidence?" Malema stated.',
      'He further argued that Zille made the remarks in Johannesburg and is also a mayoral candidate in the city, questioning why she would prefer the matter to be heard outside Johannesburg.',
      'Malema maintained that the applicants would fight to have the case heard where the alleged conduct took place.',
    ],
  },
  coalition: {
    slug: 'da-invites-eff-mk-party-municipal-coalition-talks',
    seoTitle: 'DA Invites EFF & MK to Municipal Coalition Talks | NEF123123',
    metaDescription:
      'In a major political shift, the Democratic Alliance formally invites the EFF and MK Party to municipal coalition talks across South Africa.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'SOUTH AFRICA · POLITICS',
    title: 'DA Makes U-Turn, Invites EFF and MK Party to Municipal Coalition Talks',
    img: coalitionImg,
    alt: 'EFF leader Julius Malema waving in an EFF cap surrounded by supporters',
    imgPosition: 'center 14%',
    source: 'Sources cited: TimesLIVE & SABC',
    paragraphs: [
      'In a surprising political shift, the Democratic Alliance (DA) has formally initiated coalition discussions with both the Economic Freedom Fighters (EFF) and the uMkhonto weSizwe (MK) Party as political parties scramble to form municipal coalition governments.',
      'According to confirmation from the EFF to TimesLIVE, the party received an official letter from the DA expressing interest in working together at the municipal level. EFF leadership has reportedly already held an initial meeting with the DA regarding the proposal, though the party stated it has not yet issued a formal response.',
      'Simultaneously, the DA is preparing to sit down with the MK Party within the next 48 hours. Speaking to the SABC, the MK Party’s national negotiator, Advocate Dali Mpofu, confirmed that the party has officially accepted the DA\'s invitation to begin coalition talks.',
      'The move has sparked wide debate across the political landscape, given the DA\'s long-standing public stance against partnering with either party. The DA previously entered the Government of National Unity (GNU) explicitly to keep the EFF and MK Party out of national governance, frequently warning voters against what it termed a "doomsday coalition" involving the ANC, EFF, and MK Party. With meetings now underway and scheduled, all eyes are on how these unexpected negotiations will reshape local governance.',
    ],
  },
  agriculture: {
    slug: 'eff-omphile-maotwe-insourcing-bill-parliament',
    seoTitle: 'Omphile Maotwe Urges Insourcing Bill Progress | NEF123123',
    metaDescription:
      'EFF Treasurer-General Hon. Omphile Maotwe urges Parliament to advance the Insourcing Bill to the desirability stage after four years.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'NEF123123 NEWS | PARLIAMENT',
    title: 'EFF’s Omphile Maotwe Urges Swift Progress on Insourcing Bill After Four Years',
    img: effInsourcingImg,
    alt: 'EFF Treasurer-General and MP Hon. Omphile Maotwe speaking outside Parliament on the EFF Insourcing Bill',
    imgPosition: 'center 12%',
    source: 'Economic Freedom Fighters · Parliament Reel',
    externalUrl: 'https://www.facebook.com/share/v/1JN4arz1oe/',
    externalLabel: 'Watch Video on Facebook →',
    paragraphs: [
      'In a video address from Parliament, EFF Treasurer-General and Member of Parliament Hon. Omphile Maotwe reflects on the four-year legislative journey of the Economic Freedom Fighters’ Insourcing Bill, which was first tabled in Parliament on 18 November 2022.',
      'Hon. Maotwe confirms that key state institutions—including National Treasury, the Presidency, and the Department of Public Service and Administration (DPSA)—have all expressed support for insourcing, noting that the remaining outstanding matters relate strictly to the technicalities of implementation.',
      'Addressing workers and the broader public, she stresses that the Insourcing Bill must now advance to the desirability stage without any further delays.',
      'She warns that workers and ordinary citizens cannot be expected to wait indefinitely for the legislation to be enacted into law, calling for decisive parliamentary momentum to end precarious outsourcing.',
    ],
  },
  sihleLonzi: {
    slug: 'eff-sihle-lonzi-weekly-parliament-youth-initiative',
    seoTitle: 'Hon. Sihle Lonzi Invites Youth Into Parliament | NEF123123',
    metaDescription:
      'EFF MP Hon. Sihle Lonzi launches a weekly initiative inviting South African students and young professionals to observe Parliamentary committees.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'NEF123123 NEWS | PARLIAMENT',
    title: 'EFF MP Hon. Sihle Lonzi Invites Students & Young Professionals Into Parliament Weekly',
    img: sihleLonziImg,
    alt: 'EFF Member of Parliament Hon. Sihle Lonzi speaking outside Parliament about inviting students and young professionals to observe Portfolio Committee proceedings',
    imgPosition: 'center 12%',
    source: 'Economic Freedom Fighters · Parliament Video',
    externalUrl: 'https://www.facebook.com/share/v/1KMb6CGar7/',
    externalLabel: 'Watch Video on Facebook →',
    paragraphs: [
      'Standing on the steps of Parliament, Economic Freedom Fighters (EFF) Member of Parliament Hon. Sihle Lonzi announced a weekly initiative welcoming students and young professionals from across South Africa to attend and observe Parliamentary Portfolio Committee proceedings.',
      'Hon. Lonzi explained that the programme is designed to give young citizens firsthand exposure to how Parliament operates, how oversight of government departments takes place, and how legislation and public budgets are interrogated.',
      'He emphasised that youth must be brought closer to Parliament and given meaningful opportunities to participate in decisions shaping their future, rather than having their future discussed behind closed doors without their involvement.',
    ],
  },
  malemaWaterCrisis: {
    slug: 'malema-past-warning-south-africa-water-crisis',
    seoTitle: 'Julius Malema’s Warning as SA Water Crisis Grows | NEF123123',
    metaDescription:
      'Julius Malema’s past warning on water shortages resurfaces as Bronkhorstspruit, Tshwane, and Johannesburg face escalating water restrictions.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'NEF123123 NEWS | SOUTH AFRICA',
    title: 'Julius Malema’s Past Warning Comes True as South Africa’s Water Crisis Escalates',
    img: malemaWaterCrisisImg,
    alt: 'NEF123123 video report featuring Julius Malema and Bronkhorstspruit residents facing a worsening water crisis',
    imgPosition: 'center',
    source: 'NEF123123 · Facebook Video',
    externalUrl: 'https://www.facebook.com/share/v/1Drffe8xqh/',
    externalLabel: 'Watch Video on Facebook →',
    paragraphs: [
      'Julius Malema previously told communities facing water shortages to demand help from the party they voted for. Now, as reported from the ground, the water crisis has become a serious concern for South Africans across multiple municipalities.',
      'In Bronkhorstspruit, desperate residents are forced to fetch water from a local stream after a chlorine issue at the water treatment facility left over 500 people hospitalised with stomach cramps.',
      'Since 20 October, the City of Tshwane has restricted residents in affected areas to using tap water only to flush toilets as municipal water supply and safety pressures mount.',
      'Meanwhile, the City of Johannesburg is implementing Level 2 water restrictions starting on the 21st—banning the watering of gardens and hosing down of driveways to support strained reservoir levels while multiple areas remain without water.',
    ],
  },
  africaDignity: {
    slug: 'african-future-dignity-self-determination',
    seoTitle: 'African Future Rooted in Dignity & Self-Rule | NEF123123',
    metaDescription:
      'Examining how accountable institutions, regional trade corridors, and economic agency build an African future rooted in dignity and self-determination.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'AFRICA',
    title: 'Building an African future rooted in dignity and self-determination',
    img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80',
    alt: 'African landscape',
    imgPosition: 'center',
    source: 'NEF123123 Perspective · Africa in Focus',
    paragraphs: [
      'Across the continent, a renewed conversation is taking shape around what true self-determination requires in the twenty-first century: institutions built to serve citizens, regional trade corridors controlled by African producers, and civic education rooted in shared accountability.',
      'Economists and community organisers point out that political independence reaches its full promise only when accompanied by economic agency—where households, workers, and local enterprises participate directly in value creation.',
      'Strengthening cross-border partnerships between African universities, cooperatives, and municipal planners is creating practical pathways to share technical skills, lower barriers to intra-African commerce, and build resilient public institutions.',
      'At the heart of this vision is human dignity: ensuring that policy decisions prioritise safe neighbourhoods, quality education, reliable infrastructure, and opportunities that allow young people to build lasting prosperity at home.',
    ],
  },
  africaDevelopment: {
    slug: 'who-owns-future-of-african-development',
    seoTitle: 'Who Owns the Future of African Development? | NEF123123',
    metaDescription:
      'As infrastructure reshapes African cities, domestic procurement, local engineering, and transparent financing determine who owns long-term value.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'DEVELOPMENT',
    title: 'Who owns the future of African development?',
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    alt: 'Modern city buildings',
    imgPosition: 'center',
    source: 'NEF123123 Perspective · Development & Infrastructure',
    paragraphs: [
      'From ports and power grids to digital backbone networks and urban transit, infrastructure investment is reshaping African cities at unprecedented speed. Yet a critical question remains at the centre of every project: who captures the long-term economic value?',
      'When public-interest safeguards, domestic procurement rules, and local engineering participation are embedded from the outset, major capital projects build lasting domestic industrial capacity rather than leaving behind debt and imported dependency.',
      'Regional development specialists advocate transparent financing terms, municipal technical capacity building, and stronger participation by local pension funds and development banks so communities share in the returns of productive assets.',
      'Owning the future of development means measuring success not merely by ribbon-cutting ceremonies, but by reliable energy for small manufacturers, affordable logistics for local producers, and durable public value for generations.',
    ],
  },
  africaLand: {
    slug: 'land-resources-shared-prosperity',
    seoTitle: 'Land, Resources & Shared African Prosperity | NEF123123',
    metaDescription:
      'How equitable land tenure, local mineral beneficiation, and stewardship turn Africa’s natural wealth into durable, shared prosperity.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'LAND & RESOURCES',
    title: 'Land, resources and the promise of shared prosperity',
    img: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=900&q=80',
    alt: 'Hands holding soil and a seedling',
    imgPosition: 'center',
    source: 'NEF123123 Perspective · Land & Resources',
    paragraphs: [
      'Land and natural resources form the foundation of Africa’s economic potential—spanning fertile arable soils, freshwater basins, critical transition minerals, and renewable energy corridors.',
      'For decades, raw resource extraction without local beneficiation exported jobs and industrial margins abroad while leaving host communities vulnerable to ecological strain and volatile boom-and-bust cycles.',
      'A stewardship-driven model places equitable land tenure, environmental restoration, and domestic mineral and agricultural processing at the centre of national development strategies.',
      'By pairing fair ownership frameworks with accessible credit, extension services, and community equity stakes, Africa’s natural wealth can anchor broad-based opportunity and shared prosperity across both rural and urban communities.',
    ],
  },
  industrialisation: {
    slug: 'continental-value-addition-local-manufacturing',
    seoTitle: 'Continental Value Addition & Manufacturing | NEF123123',
    metaDescription:
      'Why shifting from raw commodity exports to African beneficiation and local manufacturing strengthens jobs, currencies, and economic sovereignty.',
    publishedDate: '2026-04-15',
    dot: 'N',
    category: 'INDUSTRIALISATION',
    title: 'Continental Value Addition & Local Manufacturing',
    img: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1100&q=85',
    alt: 'Industrial production facility',
    imgPosition: 'center',
    source: 'NEF123123 Editorial Desk · Industrialisation',
    paragraphs: [
      'Across Africa’s industrial corridors, policy attention is increasingly shifting away from exporting raw commodities and toward domestic beneficiation, component assembly, and finished-goods manufacturing.',
      'Economists note that exporting unprocessed minerals and agricultural crops transfers the highest-margin stages of production—and the skilled engineering, logistics, and fabrication jobs tied to them—to external markets.',
      'Expanding special industrial zones powered by reliable electricity, regional rail links, and technical training colleges enables domestic enterprises to turn local raw materials into construction steel, processed foods, pharmaceuticals, and clean-energy hardware.',
      'Retaining value addition on the continent strengthens currency stability, widens the tax base for public services, and creates durable pathways for youth employment and technological sovereignty.',
    ],
  },
  affiliatePartners: {
    dot: 'A',
    category: 'AMAZON & SHOPIFY PARTNERS',
    title: 'Amazon & Shopify Partner Marketing',
    img: null,
    alt: '',
    imgPosition: 'center',
    source: 'Partner Marketing Overview · Amazon & Shopify',
    paragraphs: [
      'Partner marketing through Amazon and Shopify gives publishers, creators, and online storefronts a direct way to recommend verified products and earn referral commissions when visitors complete qualifying purchases.',
      'With Amazon Partner storefronts, featured links direct shoppers straight to marketplace listings across home essentials, electronics, books, and everyday goods, with real-time pricing and checkout handled securely on Amazon.',
      'Shopify partner marketing complements marketplace links by connecting audiences to independent direct-to-consumer brands, niche retail stores, and digital product storefronts powered by Shopify’s e-commerce platform and partner tracking tools.',
      'Clear sponsorship disclosure ensures shoppers always know when links are sponsored, while curated Amazon and Shopify recommendations keep product discovery focused on practical value at no extra cost to the buyer.',
    ],
  },
};

function findArticleByPath(pathname) {
  const cleaned = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\.html$/i, '')
    .replace(/\/+$/, '');
  const match = cleaned.match(/^\/news\/([a-z0-9-]+)$/i);
  if (!match) return null;
  const slug = match[1].toLowerCase();
  return Object.values(articleCatalog).find((item) => item.slug === slug) || null;
}

const clickableStoryContainers = Array.from(
  document.querySelectorAll(
    '.story-body-clickable[data-article-id], .news-dispatch-clickable[data-article-id], .affiliate-ad-clickable-card[data-article-id]'
  )
);
const articleReaderModal = document.getElementById('articleReaderModal');
const closeArticleModalBtn = document.getElementById('closeArticleModal');
const closeArticleModalFooterBtn = document.getElementById('closeArticleModalFooter');
const articleModalBackdrop = document.getElementById('articleModalBackdrop');
const articleModalDot = document.getElementById('articleModalDot');
const articleModalCategory = document.getElementById('articleModalCategory');
const articleReaderTitle = document.getElementById('articleReaderTitle');
const articleModalMedia = articleReaderModal?.querySelector('.article-modal-media');
const articleModalImg = document.getElementById('articleModalImg');
const articleModalText = document.getElementById('articleModalText');
const articleModalSource = document.getElementById('articleModalSource');
let lastReaderTrigger = null;
let activeEditorialSlug = null;

function openArticleReader(articleOrId, triggerEl, options = {}) {
  const article =
    typeof articleOrId === 'string' ? articleCatalog[articleOrId] : articleOrId;
  if (!articleReaderModal || !article) return;
  lastReaderTrigger = triggerEl || null;
  if (articleModalDot) articleModalDot.textContent = article.dot || 'N';
  if (articleModalCategory) articleModalCategory.textContent = article.category || 'NEF123123';
  if (articleReaderTitle) articleReaderTitle.textContent = article.title || '';
  if (articleModalMedia && articleModalImg) {
    if (article.img) {
      articleModalMedia.hidden = false;
      articleModalImg.setAttribute('referrerpolicy', 'no-referrer');
      articleModalImg.setAttribute('src', article.img);
      articleModalImg.setAttribute('alt', article.alt || article.title || '');
      articleModalImg.style.objectFit = article.imgFit || '';
      articleModalImg.style.objectPosition = article.imgPosition || 'center';
      articleModalImg.onerror = () => {
        articleModalMedia.hidden = true;
      };
    } else {
      articleModalMedia.hidden = true;
      articleModalImg.removeAttribute('src');
      articleModalImg.setAttribute('alt', '');
      articleModalImg.style.objectFit = '';
      articleModalImg.onerror = null;
    }
  }
  if (articleModalText) {
    articleModalText.textContent = '';
    (article.paragraphs || []).forEach((copy) => {
      const p = document.createElement('p');
      p.textContent = copy;
      articleModalText.appendChild(p);
    });
  }
  if (articleModalSource) {
    articleModalSource.textContent = article.source || '';
    if (article.externalUrl && /^https:\/\//i.test(article.externalUrl)) {
      const extLink = document.createElement('a');
      extLink.className = 'article-modal-ext-link';
      extLink.href = article.externalUrl;
      extLink.target = '_blank';
      extLink.rel = 'noopener noreferrer';
      extLink.textContent = article.externalLabel || 'Read full report →';
      articleModalSource.appendChild(extLink);
    }
  }

  if (article.slug) {
    activeEditorialSlug = article.slug;
    const articlePath = `/news/${article.slug}`;
    if (
      !options.skipHistory &&
      /^https?:$/i.test(window.location.protocol) &&
      window.location.pathname !== articlePath
    ) {
      try {
        window.history.pushState({ articleSlug: article.slug }, '', articlePath);
      } catch {
        // Ignore history pushState restrictions in sandboxed environments
      }
    }
    const dynamicCanonical = buildDynamicCanonicalUrl(articlePath);
    applyPageSeo({
      title: article.seoTitle || `${article.title} | NEF123123`,
      description: article.metaDescription || (article.paragraphs && article.paragraphs[0]) || HOME_SEO.description,
      canonicalUrl: dynamicCanonical,
      ogType: 'article',
      image: article.img,
      article,
    });
  }

  articleReaderModal.hidden = false;
  document.body.style.overflow = 'hidden';
  closeArticleModalBtn?.focus();
}

function closeArticleReader(options = {}) {
  if (!articleReaderModal || articleReaderModal.hidden) return;
  articleReaderModal.hidden = true;
  document.body.style.overflow = '';
  if (activeEditorialSlug) {
    activeEditorialSlug = null;
    if (
      !options.skipHistory &&
      /^https?:$/i.test(window.location.protocol) &&
      /^\/news\//i.test(window.location.pathname)
    ) {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        // Ignore history pushState restrictions
      }
    }
    applyPageSeo(HOME_SEO);
  }
  lastReaderTrigger?.focus();
}

// Sync initial SEO and support direct /news/<slug> routing if served via fallback
(() => {
  const matchedArticle = findArticleByPath(window.location.pathname);
  if (matchedArticle) {
    openArticleReader(matchedArticle, null, { skipHistory: true });
  } else {
    applyPageSeo({
      ...HOME_SEO,
      canonicalUrl: buildDynamicCanonicalUrl(window.location.pathname),
    });
  }
})();

window.addEventListener('popstate', () => {
  const matchedArticle = findArticleByPath(window.location.pathname);
  if (matchedArticle) {
    openArticleReader(matchedArticle, null, { skipHistory: true });
  } else if (articleReaderModal && !articleReaderModal.hidden) {
    closeArticleReader({ skipHistory: true });
  } else {
    applyPageSeo({
      ...HOME_SEO,
      canonicalUrl: buildDynamicCanonicalUrl(window.location.pathname),
    });
  }
});

clickableStoryContainers.forEach((storyContainer) => {
  const articleId = storyContainer.dataset.articleId;
  const readBtn = storyContainer.querySelector('.story-read-btn, .dispatch-read-btn, .ad-read-btn');

  storyContainer.addEventListener('click', (event) => {
    if (event.target.closest('a')) return;
    if (event.target.closest('button') && event.target.closest('button') !== readBtn) return;
    openArticleReader(articleId, storyContainer);
  });

  storyContainer.addEventListener('keydown', (event) => {
    if (event.target.closest('a, button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openArticleReader(articleId, storyContainer);
    }
  });

  readBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    openArticleReader(articleId, storyContainer);
  });
});

document
  .querySelectorAll('.msn-card-media-btn[data-article-id], .affiliate-ad-clickable[data-article-id]')
  .forEach((mediaBtn) => {
    mediaBtn.addEventListener('click', () => {
      openArticleReader(mediaBtn.dataset.articleId, mediaBtn);
    });
  });

closeArticleModalBtn?.addEventListener('click', () => closeArticleReader());
closeArticleModalFooterBtn?.addEventListener('click', () => closeArticleReader());
articleModalBackdrop?.addEventListener('click', () => closeArticleReader());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && articleReaderModal && !articleReaderModal.hidden) {
    closeArticleReader();
  }
});

// Live Weather Section (Open-Meteo live forecast & city search)
(() => {
  const cities = {
    johannesburg: { name: 'Johannesburg', region: 'Gauteng · South Africa', lat: -26.2041, lon: 28.0473 },
    'cape-town': { name: 'Cape Town', region: 'Western Cape · South Africa', lat: -33.9249, lon: 18.4241 },
    durban: { name: 'Durban', region: 'KwaZulu-Natal · South Africa', lat: -29.8587, lon: 31.0218 },
    pretoria: { name: 'Pretoria', region: 'Gauteng · South Africa', lat: -25.7479, lon: 28.2293 },
    gqeberha: { name: 'Gqeberha', region: 'Eastern Cape · South Africa', lat: -33.9608, lon: 25.6022 },
    nairobi: { name: 'Nairobi', region: 'Nairobi County · Kenya', lat: -1.2921, lon: 36.8219 },
    lagos: { name: 'Lagos', region: 'Lagos State · Nigeria', lat: 6.5244, lon: 3.3792 },
  };

  const saSnapshotKeys = ['johannesburg', 'cape-town', 'durban', 'pretoria'];

  const cityTabs = Array.from(document.querySelectorAll('.weather-city-tab'));
  const unitBtns = Array.from(document.querySelectorAll('.weather-unit-btn'));
  const searchForm = document.getElementById('weatherSearchForm');
  const cityInput = document.getElementById('weatherCityInput');
  const locateBtn = document.getElementById('weatherLocateBtn');
  const refreshBtn = document.getElementById('weatherRefreshBtn');

  const regionEl = document.getElementById('weatherRegionLabel');
  const cityEl = document.getElementById('weatherCityName');
  const updatedEl = document.getElementById('weatherUpdatedText');
  const iconHeroEl = document.getElementById('weatherCurrentIcon');
  const tempMainEl = document.getElementById('weatherTempMain');
  const condLabelEl = document.getElementById('weatherConditionLabel');
  const highLowEl = document.getElementById('weatherHighLow');
  const feelsEl = document.getElementById('weatherFeelsLike');
  const humidityEl = document.getElementById('weatherHumidity');
  const windEl = document.getElementById('weatherWind');
  const rainEl = document.getElementById('weatherRainChance');
  const forecastListEl = document.getElementById('weatherForecastList');
  const regionalGridEl = document.getElementById('weatherRegionalGrid');
  const feedbackEl = document.getElementById('weatherSearchFeedback');

  if (!cityEl || !forecastListEl) return;

  let activeCityKey = 'johannesburg';
  let activeLocation = { ...cities.johannesburg };
  let activeUnit = 'c';
  let lastWeatherPayload = null;
  let lastSnapshotPayloads = null;

  function wmoLabel(code) {
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog & mist';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Light drizzle';
    if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([80, 81, 82].includes(code)) return 'Rain showers';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Variable clouds';
  }

  function formatTemp(celsius) {
    if (typeof celsius !== 'number' || Number.isNaN(celsius)) return '--°';
    const val = activeUnit === 'f' ? (celsius * 9) / 5 + 32 : celsius;
    return `${Math.round(val)}°${activeUnit.toUpperCase()}`;
  }

  function createWeatherSvg(code, isDay, size, onDark) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');

    const sunColor = '#ffd54f';
    const cloudColor = onDark ? '#ffffff' : '#0d6bb0';
    const rainColor = onDark ? '#bae6fd' : '#1888d6';

    const addCloud = (yOffset = 0) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute(
        'd',
        `M9 ${22 + yOffset}h14a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 11.2 11a5 5 0 0 0-2.2 11z`
      );
      path.setAttribute('fill', cloudColor);
      svg.appendChild(path);
    };

    const addSun = (cx, cy, r) => {
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', sunColor);
      svg.appendChild(circle);
    };

    if (code === 0 || code === 1) {
      if (isDay === 0) {
        const moon = document.createElementNS(ns, 'path');
        moon.setAttribute('d', 'M19.5 7.5a8.5 8.5 0 1 0 5 15.2A7 7 0 0 1 19.5 7.5z');
        moon.setAttribute('fill', sunColor);
        svg.appendChild(moon);
      } else {
        addSun(16, 16, 6.2);
        const rays = document.createElementNS(ns, 'path');
        rays.setAttribute(
          'd',
          'M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.2 2.2M22.3 22.3l2.2 2.2M24.5 7.5l-2.2 2.2M9.7 22.3l-2.2 2.2'
        );
        rays.setAttribute('stroke', sunColor);
        rays.setAttribute('stroke-width', '2');
        rays.setAttribute('stroke-linecap', 'round');
        svg.appendChild(rays);
      }
    } else if (code === 2) {
      addSun(11.5, 11.5, 4.5);
      addCloud(1);
    } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      addCloud(-2);
      const drops = document.createElementNS(ns, 'path');
      drops.setAttribute('d', 'M11 23l-1.5 4M16.5 23l-1.5 4M22 23l-1.5 4');
      drops.setAttribute('stroke', rainColor);
      drops.setAttribute('stroke-width', '2.1');
      drops.setAttribute('stroke-linecap', 'round');
      svg.appendChild(drops);
    } else if ([95, 96, 99].includes(code)) {
      addCloud(-2);
      const bolt = document.createElementNS(ns, 'path');
      bolt.setAttribute('d', 'M17 20l-3.5 5h3l-1.5 4 4.5-5.5h-3z');
      bolt.setAttribute('fill', sunColor);
      svg.appendChild(bolt);
    } else {
      addCloud(0);
    }
    return svg;
  }

  function renderWeatherUI() {
    if (!lastWeatherPayload) return;
    const { current, daily, timezone } = lastWeatherPayload;
    if (regionEl) regionEl.textContent = activeLocation.region || 'Live Coordinates';
    if (cityEl) cityEl.textContent = activeLocation.name || 'Weather';

    const updatedTime = new Date().toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (updatedEl) {
      updatedEl.textContent = `Updated ${updatedTime} · ${timezone || 'Local time'}`;
    }

    if (iconHeroEl) {
      iconHeroEl.textContent = '';
      iconHeroEl.appendChild(
        createWeatherSvg(current?.weather_code ?? 2, current?.is_day ?? 1, 44, true)
      );
    }

    if (tempMainEl) tempMainEl.textContent = formatTemp(current?.temperature_2m);
    if (condLabelEl) condLabelEl.textContent = wmoLabel(current?.weather_code);
    if (highLowEl && daily) {
      const hi = daily.temperature_2m_max?.[0];
      const lo = daily.temperature_2m_min?.[0];
      highLowEl.textContent = `High ${formatTemp(hi)} / Low ${formatTemp(lo)}`;
    }
    if (feelsEl) feelsEl.textContent = formatTemp(current?.apparent_temperature);
    if (humidityEl) {
      humidityEl.textContent =
        typeof current?.relative_humidity_2m === 'number'
          ? `${Math.round(current.relative_humidity_2m)}%`
          : '--%';
    }
    if (windEl) {
      windEl.textContent =
        typeof current?.wind_speed_10m === 'number'
          ? `${Math.round(current.wind_speed_10m)} km/h`
          : '-- km/h';
    }
    if (rainEl) {
      const prob = daily?.precipitation_probability_max?.[0];
      rainEl.textContent = typeof prob === 'number' ? `${Math.round(prob)}%` : '0%';
    }

    forecastListEl.textContent = '';
    const days = daily?.time || [];
    days.slice(0, 5).forEach((dateStr, idx) => {
      const row = document.createElement('div');
      row.className = 'weather-forecast-row';

      const daySpan = document.createElement('span');
      daySpan.className = 'weather-day-name';
      if (idx === 0) {
        daySpan.textContent = 'Today';
      } else {
        const dt = new Date(`${dateStr}T12:00:00`);
        daySpan.textContent = dt.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' });
      }

      const code = daily.weather_code?.[idx] ?? 2;
      const iconWrap = document.createElement('span');
      iconWrap.className = 'weather-day-icon';
      iconWrap.appendChild(createWeatherSvg(code, 1, 22, false));

      const condSpan = document.createElement('span');
      condSpan.className = 'weather-day-cond';
      condSpan.textContent = wmoLabel(code);

      const tempsWrap = document.createElement('span');
      tempsWrap.className = 'weather-day-temps';

      const rainSpan = document.createElement('span');
      rainSpan.className = 'weather-day-rain';
      const rainPct = daily.precipitation_probability_max?.[idx];
      rainSpan.textContent = typeof rainPct === 'number' ? `${rainPct}%` : '—';
      rainSpan.title = 'Precipitation chance';

      const hiSpan = document.createElement('span');
      hiSpan.className = 'weather-temp-hi';
      hiSpan.textContent = formatTemp(daily.temperature_2m_max?.[idx]);

      const loSpan = document.createElement('span');
      loSpan.className = 'weather-temp-lo';
      loSpan.textContent = formatTemp(daily.temperature_2m_min?.[idx]);

      tempsWrap.append(rainSpan, hiSpan, loSpan);
      row.append(daySpan, iconWrap, condSpan, tempsWrap);
      forecastListEl.appendChild(row);
    });
  }

  function renderRegionalSnapshot() {
    if (!regionalGridEl || !Array.isArray(lastSnapshotPayloads)) return;
    regionalGridEl.textContent = '';
    saSnapshotKeys.forEach((key, index) => {
      const city = cities[key];
      const payload = lastSnapshotPayloads[index];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `weather-mini-btn${activeCityKey === key ? ' active' : ''}`;
      btn.addEventListener('click', () => selectPresetCity(key));

      const nameEl = document.createElement('span');
      nameEl.textContent = city.name;
      const tempEl = document.createElement('strong');
      tempEl.textContent = formatTemp(payload?.current?.temperature_2m);
      const condEl = document.createElement('small');
      condEl.textContent = wmoLabel(payload?.current?.weather_code);

      btn.append(nameEl, tempEl, condEl);
      regionalGridEl.appendChild(btn);
    });
  }

  async function loadCityWeather(locationObj) {
    activeLocation = locationObj;
    if (updatedEl) updatedEl.textContent = 'Refreshing live conditions…';
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        locationObj.lat
      )}&longitude=${encodeURIComponent(
        locationObj.lon
      )}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      lastWeatherPayload = await res.json();
      if (feedbackEl) feedbackEl.textContent = '';
      renderWeatherUI();
      renderRegionalSnapshot();
    } catch (err) {
      if (updatedEl) updatedEl.textContent = 'Live weather feed unavailable right now.';
      forecastListEl.textContent = '';
      const errRow = document.createElement('div');
      errRow.className = 'weather-loading-row';
      errRow.textContent = 'Could not load forecast data. Please retry.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'weather-ctrl-btn sport-retry-btn';
      retry.textContent = 'Retry weather';
      retry.addEventListener('click', () => loadCityWeather(activeLocation));
      forecastListEl.append(errRow, retry);
    }
  }

  async function loadRegionalSnapshot() {
    try {
      const lats = saSnapshotKeys.map((k) => cities[k].lat).join(',');
      const lons = saSnapshotKeys.map((k) => cities[k].lon).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code&timezone=Africa%2FJohannesburg`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lastSnapshotPayloads = Array.isArray(data) ? data : [data];
      renderRegionalSnapshot();
    } catch {
      // Regional mini strip is supplementary; leave quiet on transient error
    }
  }

  function selectPresetCity(key) {
    if (!cities[key]) return;
    activeCityKey = key;
    cityTabs.forEach((tab) => {
      const isActive = tab.dataset.cityKey === key;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    loadCityWeather(cities[key]);
  }

  cityTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.cityKey;
      if (key) selectPresetCity(key);
    });
  });

  unitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeUnit = btn.dataset.unit === 'f' ? 'f' : 'c';
      unitBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderWeatherUI();
      renderRegionalSnapshot();
    });
  });

  searchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const q = cityInput?.value.trim();
    if (!q) return;
    if (feedbackEl) feedbackEl.textContent = `Searching "${q}"…`;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=1&language=en&format=json`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const match = data.results?.[0];
      if (!match) {
        if (feedbackEl) feedbackEl.textContent = `No city matched "${q}".`;
        return;
      }
      activeCityKey = '';
      cityTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      const regionParts = [match.admin1, match.country].filter(Boolean);
      loadCityWeather({
        name: match.name,
        region: regionParts.join(' · ') || 'Global Forecast',
        lat: match.latitude,
        lon: match.longitude,
      });
    } catch {
      if (feedbackEl) feedbackEl.textContent = 'City lookup failed. Try again.';
    }
  });

  locateBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (feedbackEl) feedbackEl.textContent = 'Location access unavailable in this browser.';
      return;
    }
    if (feedbackEl) feedbackEl.textContent = 'Checking your coordinates…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        activeCityKey = '';
        cityTabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        loadCityWeather({
          name: 'Your Location',
          region: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        if (feedbackEl) feedbackEl.textContent = 'Location permission declined.';
      },
      { timeout: 8000 }
    );
  });

  refreshBtn?.addEventListener('click', () => {
    loadCityWeather(activeLocation);
    loadRegionalSnapshot();
  });

  loadCityWeather(cities.johannesburg);
  loadRegionalSnapshot();
})();

// Live Sport Section (ESPN public scoreboards & news across SA, African, and global leagues)
(() => {
  const leagues = {
    bafana: {
      title: 'Bafana Bafana · AFCON 2027 Qualifiers',
      newsTitle: 'Bafana Bafana & Mofokeng News',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/caf.nations/news',
    },
    'rsa-psl': {
      title: 'South African Premiership · Matchday',
      newsTitle: 'SA Premiership Headlines',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/rsa.1/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/rsa.1/news',
    },
    'caf-cl': {
      title: 'CAF Champions League · Matchday',
      newsTitle: 'African Club Football',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/caf.champions/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/caf.champions/news',
    },
    'eng-pl': {
      title: 'English Premier League · Matchday',
      newsTitle: 'Premier League Headlines',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/news',
    },
    'uefa-cl': {
      title: 'UEFA Champions League · Matchday',
      newsTitle: 'Champions League Headlines',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/news',
    },
    'rugby-intl': {
      title: 'International Test Rugby',
      newsTitle: 'Rugby Headlines',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/rugby/289234/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/rugby/all/news',
    },
    f1: {
      title: 'Formula 1 · Grand Prix Weekend',
      newsTitle: 'Formula 1 Headlines',
      scoreboard: 'https://site.web.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard',
      news: 'https://site.web.api.espn.com/apis/site/v2/sports/racing/f1/news',
    },
  };

  const tabs = Array.from(document.querySelectorAll('.sport-tab'));
  const refreshBtn = document.getElementById('sportRefreshBtn');
  const boardTitleEl = document.getElementById('sportBoardTitle');
  const boardUpdatedEl = document.getElementById('sportBoardUpdated');
  const matchesListEl = document.getElementById('sportMatchesList');
  const newsTitleEl = document.getElementById('sportNewsTitle');
  const newsListEl = document.getElementById('sportNewsList');

  if (!matchesListEl || !newsListEl) return;

  let activeLeagueKey = 'bafana';

  function formatKickoff(isoDate) {
    if (!isoDate) return 'Scheduled';
    const dt = new Date(isoDate);
    if (Number.isNaN(dt.getTime())) return 'Scheduled';
    return dt.toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function makeTeamCrest(logoUrl, name) {
    const initials = (name || 'TM')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const fallback = () => {
      const badge = document.createElement('span');
      badge.className = 'sport-team-fallback';
      badge.textContent = initials || 'FC';
      return badge;
    };

    if (!logoUrl) return fallback();
    const img = document.createElement('img');
    img.className = 'sport-team-crest';
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.src = logoUrl;
    img.alt = '';
    img.addEventListener('error', () => {
      img.replaceWith(fallback());
    });
    return img;
  }

  function renderMatches(events) {
    matchesListEl.textContent = '';
    if (!Array.isArray(events) || events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sport-loading';
      empty.textContent = 'No upcoming fixtures or recent matches listed for this competition right now.';
      matchesListEl.appendChild(empty);
      return;
    }

    events.slice(0, 6).forEach((ev) => {
      const comp = ev.competitions?.[0];
      const statusType = ev.status?.type || {};
      const state = statusType.state || 'pre';
      const card = document.createElement('article');
      card.className = 'sport-match-card';

      const head = document.createElement('div');
      head.className = 'sport-match-head';

      const statusSpan = document.createElement('span');
      statusSpan.className = `sport-match-status${
        state === 'in' ? ' is-live' : state === 'post' ? ' is-final' : ''
      }`;
      if (state === 'in') {
        statusSpan.textContent = `LIVE · ${ev.status?.displayClock || statusType.shortDetail || ''}`;
      } else if (state === 'post') {
        statusSpan.textContent = statusType.shortDetail || 'Full Time';
      } else {
        statusSpan.textContent = formatKickoff(ev.date);
      }

      const stageSpan = document.createElement('span');
      stageSpan.textContent = ev.season?.slug ? ev.season.slug.replace(/-/g, ' ') : 'Matchday';
      head.append(statusSpan, stageSpan);
      card.appendChild(head);

      const competitors = comp?.competitors;
      if (Array.isArray(competitors) && competitors.length >= 2) {
        const sorted = [...competitors].sort((a, b) => (a.homeAway === 'home' ? -1 : 1));
        const teamsBox = document.createElement('div');
        teamsBox.className = 'sport-teams';

        sorted.slice(0, 2).forEach((teamEntry) => {
          const teamName =
            teamEntry.team?.shortDisplayName ||
            teamEntry.team?.displayName ||
            teamEntry.athlete?.shortName ||
            'TBD';
          const logo = teamEntry.team?.logo || teamEntry.athlete?.flag?.href;

          const row = document.createElement('div');
          row.className = `sport-team-row${teamEntry.winner ? ' is-winner' : ''}`;

          const idWrap = document.createElement('div');
          idWrap.className = 'sport-team-id';
          idWrap.appendChild(makeTeamCrest(logo, teamName));

          const nameSpan = document.createElement('span');
          nameSpan.className = 'sport-team-name';
          nameSpan.textContent = teamName;
          idWrap.appendChild(nameSpan);

          const scoreSpan = document.createElement('span');
          scoreSpan.className = 'sport-team-score';
          scoreSpan.textContent = state === 'pre' ? '—' : String(teamEntry.score ?? '0');

          row.append(idWrap, scoreSpan);
          teamsBox.appendChild(row);
        });
        card.appendChild(teamsBox);
      } else {
        card.classList.add('sport-event-card');
        const eventTitle = document.createElement('strong');
        eventTitle.className = 'sport-team-name';
        eventTitle.textContent = ev.name || ev.shortName || 'Scheduled Event';
        card.appendChild(eventTitle);
      }

      const foot = document.createElement('div');
      foot.className = 'sport-match-foot';
      const venueName = comp?.venue?.fullName || ev.shortName || 'Confirmed fixture';
      foot.textContent = venueName;
      card.appendChild(foot);

      matchesListEl.appendChild(card);
    });
  }

  function renderSportNews(articles, leagueLabel) {
    newsListEl.textContent = '';
    if (!Array.isArray(articles) || articles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sport-loading';
      empty.textContent = 'No recent sport headlines available.';
      newsListEl.appendChild(empty);
      return;
    }

    articles.slice(0, 5).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sport-news-item';

      const thumb = document.createElement('div');
      thumb.className = 'sport-news-thumb';
      const imgUrl = item.images?.[0]?.url;
      if (imgUrl) {
        const img = document.createElement('img');
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.src = imgUrl;
        img.alt = item.headline || '';
        img.addEventListener('error', () => {
          const fb = document.createElement('div');
          fb.className = 'sport-news-thumb-fallback';
          fb.textContent = 'SPORT';
          img.replaceWith(fb);
        });
        thumb.appendChild(img);
      } else {
        const fb = document.createElement('div');
        fb.className = 'sport-news-thumb-fallback';
        fb.textContent = 'SPORT';
        thumb.appendChild(fb);
      }

      const copy = document.createElement('div');
      copy.className = 'sport-news-copy';

      const meta = document.createElement('span');
      meta.className = 'sport-news-meta';
      const pubStr = item.published
        ? new Date(item.published).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
        : 'Latest';
      meta.textContent = `${leagueLabel} · ${pubStr}`;

      const title = document.createElement('h4');
      title.textContent = item.headline || 'Sport Dispatch';

      const desc = document.createElement('p');
      desc.textContent = item.description || 'Tap to read the full sport report.';

      copy.append(meta, title, desc);
      btn.append(thumb, copy);

      btn.addEventListener('click', () => {
        openArticleReader(
          {
            dot: 'S',
            category: `NEF123123 SPORT · ${leagueLabel.toUpperCase()}`,
            title: item.headline || 'Sport Dispatch',
            img: imgUrl || null,
            alt: item.headline || 'Sport photo',
            imgPosition: 'center',
            source: `Source: ESPN · ${pubStr}`,
            externalUrl: item.links?.web?.href || '',
            externalLabel: 'Read full coverage on ESPN →',
            paragraphs: [
              item.description || 'Live sport coverage via NEF123123 Sport Desk.',
              `Published: ${
                item.published
                  ? new Date(item.published).toLocaleString('en-ZA', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent'
              }. Follow live fixtures, scores, and regional dispatches in the NEF123123 Sport hub.`,
            ],
          },
          btn
        );
      });

      newsListEl.appendChild(btn);
    });
  }

  function renderBafanaBoard(primaryArticle) {
    matchesListEl.textContent = '';

    const spotlightImgUrl =
      primaryArticle?.images?.[0]?.url ||
      'https://a.espncdn.com/photo/2026/0624/r1679059_1296x729_16-9.jpg';
    const spotlightUrl =
      primaryArticle?.links?.web?.href ||
      'https://www.espn.com/espn/story/_/id/50512821/relebohile-mofokeng-south-africa-kenya-bafana-afcon';

    const spotlightBtn = document.createElement('button');
    spotlightBtn.type = 'button';
    spotlightBtn.className = 'sport-bafana-spotlight';

    const media = document.createElement('div');
    media.className = 'sport-spotlight-media';
    const photo = document.createElement('img');
    photo.setAttribute('referrerpolicy', 'no-referrer');
    photo.src = spotlightImgUrl;
    photo.alt = 'Relebohile Mofokeng celebrating for South Africa Bafana Bafana';
    photo.addEventListener('error', () => {
      const fb = document.createElement('div');
      fb.className = 'sport-news-thumb-fallback';
      fb.textContent = 'RSA';
      photo.replaceWith(fb);
    });
    media.appendChild(photo);

    const copy = document.createElement('div');
    copy.className = 'sport-spotlight-copy';

    const tag = document.createElement('span');
    tag.className = 'sport-spotlight-tag';
    tag.textContent = 'YESTERDAY · KENYA 1–2 SOUTH AFRICA (AFCON 2027 QUALIFIER)';

    const heading = document.createElement('h4');
    heading.textContent =
      'Relebohile Mofokeng ("President Yama 2K") bags 2 goals as Bafana Bafana beat Kenya';

    const summary = document.createElement('p');
    summary.textContent =
      'Relebohile Mofokeng struck twice in the second half (68\' and 86\') to guide Pitso Mosimane\'s South Africa past Kenya 2–1 in Nairobi, lifting Bafana back to top of Group D on 10 points.';

    const cta = document.createElement('span');
    cta.className = 'sport-spotlight-cta';
    cta.textContent = 'Read full 2-goal Mofokeng report →';

    copy.append(tag, heading, summary, cta);
    spotlightBtn.append(media, copy);

    spotlightBtn.addEventListener('click', () => {
      openArticleReader(
        {
          dot: 'S',
          category: 'NEF123123 SPORT · BAFANA BAFANA',
          title:
            'Relebohile Mofokeng ("President Yama 2K") scores two late goals in Bafana Bafana 2–1 win over Kenya',
          img: spotlightImgUrl,
          alt: 'Relebohile Mofokeng in action for Bafana Bafana',
          imgPosition: 'center top',
          source: 'Matchday Dispatch · Nyayo National Stadium, Nairobi · 17 Nov 2026',
          externalUrl: spotlightUrl,
          externalLabel: 'Read full ESPN Bafana Bafana report →',
          paragraphs: [
            'South Africa produced a decisive away performance on Tuesday, 17 November 2026 in Nairobi, defeating Harambee Stars 2–1 in Group D of the 2027 Africa Cup of Nations (AFCON) qualifiers thanks to a match-winning brace from Relebohile Mofokeng.',
            'Widely nicknamed "President Yama 2K" by South African supporters, Mofokeng broke the deadlock in the 68th minute with quick thinking inside the box before sealing all three points in the 86th minute with a sharp solo finish. Mohammed Bajaber pulled one back for Kenya in the 89th minute, but Pitso Mosimane\'s side held firm through stoppage time.',
            'The two-goal display keeps Bafana Bafana unbeaten through four Group D qualifiers and sends South Africa back to the top of the group standings on 10 points, building on Friday\'s 2–2 home draw in the reverse fixture.',
          ],
        },
        spotlightBtn
      );
    });

    matchesListEl.appendChild(spotlightBtn);

    const bafanaFixtures = [
      {
        statusText: 'Tue, 17 Nov · Full Time',
        stageText: 'AFCON 2027 · Group D',
        home: {
          name: 'Kenya',
          score: '1',
          winner: false,
          logo: 'https://a.espncdn.com/i/teamlogos/countries/500/ken.png',
        },
        away: {
          name: 'South Africa',
          score: '2',
          winner: true,
          logo: 'https://a.espncdn.com/i/teamlogos/countries/500/rsa.png',
        },
        foot: "Nyayo Stadium · Goals: Mofokeng 68', 86' (RSA) · Bajaber 89' (KEN)",
      },
      {
        statusText: 'Fri, 13 Nov · Full Time',
        stageText: 'AFCON 2027 · Group D',
        home: {
          name: 'South Africa',
          score: '2',
          winner: false,
          logo: 'https://a.espncdn.com/i/teamlogos/countries/500/rsa.png',
        },
        away: {
          name: 'Kenya',
          score: '2',
          winner: false,
          logo: 'https://a.espncdn.com/i/teamlogos/countries/500/ken.png',
        },
        foot: 'First leg · Group D Standings: South Africa 1st (10 pts)',
      },
    ];

    bafanaFixtures.forEach((fx) => {
      const card = document.createElement('article');
      card.className = 'sport-match-card';

      const head = document.createElement('div');
      head.className = 'sport-match-head';

      const statusSpan = document.createElement('span');
      statusSpan.className = 'sport-match-status is-final';
      statusSpan.textContent = fx.statusText;

      const stageSpan = document.createElement('span');
      stageSpan.textContent = fx.stageText;
      head.append(statusSpan, stageSpan);
      card.appendChild(head);

      const teamsBox = document.createElement('div');
      teamsBox.className = 'sport-teams';

      [fx.home, fx.away].forEach((teamEntry) => {
        const row = document.createElement('div');
        row.className = `sport-team-row${teamEntry.winner ? ' is-winner' : ''}`;

        const idWrap = document.createElement('div');
        idWrap.className = 'sport-team-id';
        idWrap.appendChild(makeTeamCrest(teamEntry.logo, teamEntry.name));

        const nameSpan = document.createElement('span');
        nameSpan.className = 'sport-team-name';
        nameSpan.textContent = teamEntry.name;
        idWrap.appendChild(nameSpan);

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'sport-team-score';
        scoreSpan.textContent = teamEntry.score;

        row.append(idWrap, scoreSpan);
        teamsBox.appendChild(row);
      });

      card.appendChild(teamsBox);

      const foot = document.createElement('div');
      foot.className = 'sport-match-foot';
      foot.textContent = fx.foot;
      card.appendChild(foot);

      matchesListEl.appendChild(card);
    });
  }

  async function loadLeague(key) {
    const cfg = leagues[key] || leagues.bafana;
    activeLeagueKey = key;
    if (boardTitleEl) boardTitleEl.textContent = cfg.title;
    if (newsTitleEl) newsTitleEl.textContent = cfg.newsTitle;
    if (boardUpdatedEl) boardUpdatedEl.textContent = 'UPDATING…';

    if (key === 'bafana') {
      try {
        const newsRes = await fetch(cfg.news);
        if (!newsRes.ok) throw new Error('Feed error');
        const newsJson = await newsRes.json();
        const rawArticles = Array.isArray(newsJson.articles) ? newsJson.articles : [];
        const bafanaRx = /mofokeng|yama\s*2k|bafana|south africa/i;
        const prioritized = [
          ...rawArticles.filter((a) => bafanaRx.test(`${a.headline || ''} ${a.description || ''}`)),
          ...rawArticles.filter((a) => !bafanaRx.test(`${a.headline || ''} ${a.description || ''}`)),
        ];
        const primaryMofokeng =
          prioritized.find((a) => /mofokeng|yama\s*2k/i.test(`${a.headline || ''} ${a.description || ''}`)) ||
          prioritized[0] ||
          null;

        const nowStr = new Date().toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        if (boardUpdatedEl) boardUpdatedEl.textContent = `UPDATED ${nowStr}`;
        renderBafanaBoard(primaryMofokeng);
        renderSportNews(prioritized, 'BAFANA · AFCON');
      } catch {
        if (boardUpdatedEl) boardUpdatedEl.textContent = 'MATCH REPORT';
        renderBafanaBoard(null);
        newsListEl.textContent = '';
        const newsErr = document.createElement('div');
        newsErr.className = 'sport-loading';
        newsErr.textContent = 'Headlines unavailable while offline.';
        newsListEl.appendChild(newsErr);
      }
      return;
    }

    try {
      const [scoreRes, newsRes] = await Promise.all([fetch(cfg.scoreboard), fetch(cfg.news)]);
      if (!scoreRes.ok || !newsRes.ok) throw new Error('Feed error');
      const [scoreJson, newsJson] = await Promise.all([scoreRes.json(), newsRes.json()]);

      const nowStr = new Date().toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (boardUpdatedEl) boardUpdatedEl.textContent = `UPDATED ${nowStr}`;
      renderMatches(scoreJson.events || []);
      renderSportNews(newsJson.articles || [], scoreJson.leagues?.[0]?.abbreviation || 'SPORT');
    } catch {
      if (boardUpdatedEl) boardUpdatedEl.textContent = 'UNAVAILABLE';
      matchesListEl.textContent = '';
      const box = document.createElement('div');
      box.className = 'sport-state-box';
      const errMsg = document.createElement('div');
      errMsg.className = 'sport-loading';
      errMsg.textContent = 'Unable to reach live sport feed right now.';
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'weather-ctrl-btn sport-retry-btn';
      retryBtn.textContent = 'Retry sport feed';
      retryBtn.addEventListener('click', () => loadLeague(activeLeagueKey));
      box.append(errMsg, retryBtn);
      matchesListEl.appendChild(box);
      newsListEl.textContent = '';
      const newsErr = document.createElement('div');
      newsErr.className = 'sport-loading';
      newsErr.textContent = 'Headlines unavailable while offline.';
      newsListEl.appendChild(newsErr);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.league;
      if (!key) return;
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });
      loadLeague(key);
    });
  });

  refreshBtn?.addEventListener('click', () => loadLeague(activeLeagueKey));

  loadLeague('bafana');
})();

// Global Live Markets, FX Strip, Property Value Converter & Real-Estate News
(() => {
  const quoteGridEl = document.getElementById('marketsQuoteGrid');
  const fxListEl = document.getElementById('marketsFxList');
  const updatedTextEl = document.getElementById('marketsUpdatedText');
  const globalNewsEl = document.getElementById('globalMarketsNewsList');
  const realEstateNewsEl = document.getElementById('realEstateNewsList');
  const currButtons = document.querySelectorAll('.markets-curr-btn');
  const refreshBtn = document.getElementById('marketsRefreshBtn');
  const reFormEl = document.getElementById('reConverterForm');
  const reAmountEl = document.getElementById('reAmountInput');
  const reCurrencyEl = document.getElementById('reFromCurrency');
  const reBondRateEl = document.getElementById('reBondRateSelect');
  const reResultsEl = document.getElementById('reConverterResults');
  const saPropTabs = document.querySelectorAll('#saPropertyTabs .sa-re-tab');

  if (!quoteGridEl || !fxListEl || !globalNewsEl || !realEstateNewsEl) return;

  const RSS_FEEDS = {
    markets: {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fbusiness%2Frss.xml',
      sourceLabel: 'BBC Business',
      category: 'GLOBAL MARKETS',
      fallbackTag: 'MKT',
      dot: 'M',
    },
    saRealEstate: {
      url: 'https://businesstech.co.za/news/wp-json/wp/v2/posts?categories=12755&per_page=15&_embed=1',
      sourceLabel: 'BusinessTech SA',
      category: 'SOUTH AFRICA REAL ESTATE',
      fallbackTag: 'SA',
      dot: 'Z',
    },
  };

  let quoteCurrency = 'zar';
  let marketSnapshot = null;
  let fxPerUsd = { USD: 1, ZAR: null, EUR: null, GBP: null };
  let isLoadingNews = false;
  let saPropertyPosts = [];
  let activeSaFilter = 'all';

  const htmlParser = new DOMParser();
  function stripHtml(raw) {
    if (!raw) return '';
    const doc = htmlParser.parseFromString(String(raw), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function formatNumber(val, decimals = 2) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '--';
    return val.toLocaleString('en-ZA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function formatMoney(val, currency, decimals = 2) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '--';
    const prefix = currency === 'zar' || currency === 'ZAR' ? 'R ' : '$';
    return `${prefix}${formatNumber(val, decimals)}`;
  }

  function calcPctChange(prevVal, nextVal) {
    if (
      typeof prevVal !== 'number' ||
      typeof nextVal !== 'number' ||
      !Number.isFinite(prevVal) ||
      !Number.isFinite(nextVal) ||
      prevVal === 0
    ) {
      return null;
    }
    return ((nextVal - prevVal) / prevVal) * 100;
  }

  function createDeltaEl(pct) {
    const el = document.createElement('div');
    el.className = 'market-delta';
    if (typeof pct !== 'number' || !Number.isFinite(pct)) {
      el.classList.add('is-flat');
      el.textContent = '• Live spot';
      return el;
    }
    if (Math.abs(pct) < 0.005) {
      el.classList.add('is-flat');
      el.textContent = '• 0.00%';
    } else if (pct > 0) {
      el.classList.add('is-up');
      el.textContent = `▲ +${pct.toFixed(2)}%`;
    } else {
      el.classList.add('is-down');
      el.textContent = `▼ ${pct.toFixed(2)}%`;
    }
    return el;
  }

  function renderQuoteCards() {
    if (!marketSnapshot) return;
    const { latestFx, prevFx, liveRates, crypto } = marketSnapshot;
    const isZar = quoteCurrency === 'zar';

    const usdToZarNow = liveRates?.ZAR ?? latestFx?.ZAR ?? null;
    const eurPerUsdNow = liveRates?.EUR ?? latestFx?.EUR ?? null;
    const gbpPerUsdNow = liveRates?.GBP ?? latestFx?.GBP ?? null;

    const cards = [];

    if (isZar) {
      const eurZarNow = usdToZarNow && eurPerUsdNow ? usdToZarNow / eurPerUsdNow : null;
      const eurZarPrev =
        prevFx?.ZAR && prevFx?.EUR ? prevFx.ZAR / prevFx.EUR : null;
      const gbpZarNow = usdToZarNow && gbpPerUsdNow ? usdToZarNow / gbpPerUsdNow : null;
      const gbpZarPrev =
        prevFx?.ZAR && prevFx?.GBP ? prevFx.ZAR / prevFx.GBP : null;

      cards.push(
        {
          symbol: 'USD / ZAR',
          kind: 'FOREX',
          name: 'US Dollar to Rand',
          price: usdToZarNow ? `R ${formatNumber(usdToZarNow, 2)}` : '--',
          delta: calcPctChange(prevFx?.ZAR, latestFx?.ZAR),
        },
        {
          symbol: 'EUR / ZAR',
          kind: 'FOREX',
          name: 'Euro to Rand',
          price: eurZarNow ? `R ${formatNumber(eurZarNow, 2)}` : '--',
          delta: calcPctChange(eurZarPrev, latestFx?.ZAR && latestFx?.EUR ? latestFx.ZAR / latestFx.EUR : null),
        },
        {
          symbol: 'GBP / ZAR',
          kind: 'FOREX',
          name: 'British Pound to Rand',
          price: gbpZarNow ? `R ${formatNumber(gbpZarNow, 2)}` : '--',
          delta: calcPctChange(gbpZarPrev, latestFx?.ZAR && latestFx?.GBP ? latestFx.ZAR / latestFx.GBP : null),
        }
      );
    } else {
      const zarUsdNow = usdToZarNow ? 1 / usdToZarNow : null;
      const eurUsdNow = eurPerUsdNow ? 1 / eurPerUsdNow : null;
      const gbpUsdNow = gbpPerUsdNow ? 1 / gbpPerUsdNow : null;

      cards.push(
        {
          symbol: 'ZAR / USD',
          kind: 'FOREX',
          name: 'South African Rand to USD',
          price: zarUsdNow ? `$${formatNumber(zarUsdNow, 4)}` : '--',
          delta: calcPctChange(
            prevFx?.ZAR ? 1 / prevFx.ZAR : null,
            latestFx?.ZAR ? 1 / latestFx.ZAR : null
          ),
        },
        {
          symbol: 'EUR / USD',
          kind: 'FOREX',
          name: 'Euro to US Dollar',
          price: eurUsdNow ? `$${formatNumber(eurUsdNow, 4)}` : '--',
          delta: calcPctChange(
            prevFx?.EUR ? 1 / prevFx.EUR : null,
            latestFx?.EUR ? 1 / latestFx.EUR : null
          ),
        },
        {
          symbol: 'GBP / USD',
          kind: 'FOREX',
          name: 'Pound Sterling to USD',
          price: gbpUsdNow ? `$${formatNumber(gbpUsdNow, 4)}` : '--',
          delta: calcPctChange(
            prevFx?.GBP ? 1 / prevFx.GBP : null,
            latestFx?.GBP ? 1 / latestFx.GBP : null
          ),
        }
      );
    }

    const gold = crypto?.['pax-gold'];
    const btc = crypto?.bitcoin;
    const eth = crypto?.ethereum;

    cards.push(
      {
        symbol: 'XAU / OZ',
        kind: 'GOLD SPOT',
        name: 'Gold Bullion (PAXG)',
        price: formatMoney(isZar ? gold?.zar : gold?.usd, quoteCurrency, 0),
        delta: isZar ? gold?.zar_24h_change : gold?.usd_24h_change,
      },
      {
        symbol: 'BTC',
        kind: 'DIGITAL ASSET',
        name: 'Bitcoin',
        price: formatMoney(isZar ? btc?.zar : btc?.usd, quoteCurrency, 0),
        delta: isZar ? btc?.zar_24h_change : btc?.usd_24h_change,
      },
      {
        symbol: 'ETH',
        kind: 'DIGITAL ASSET',
        name: 'Ethereum',
        price: formatMoney(isZar ? eth?.zar : eth?.usd, quoteCurrency, 0),
        delta: isZar ? eth?.zar_24h_change : eth?.usd_24h_change,
      }
    );

    quoteGridEl.textContent = '';
    cards.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'market-quote-card';

      const top = document.createElement('div');
      top.className = 'market-quote-top';
      const sym = document.createElement('span');
      sym.className = 'market-quote-symbol';
      sym.textContent = item.symbol;
      const kind = document.createElement('span');
      kind.className = 'market-quote-kind';
      kind.textContent = item.kind;
      top.append(sym, kind);

      const name = document.createElement('div');
      name.className = 'market-quote-name';
      name.textContent = item.name;

      const price = document.createElement('div');
      price.className = 'market-quote-price';
      price.textContent = item.price;

      card.append(top, name, price, createDeltaEl(item.delta));
      quoteGridEl.appendChild(card);
    });
  }

  function renderFxStrip(rates) {
    fxListEl.textContent = '';
    const pairs = [
      { code: 'NGN', label: 'USD / NGN', dec: 2 },
      { code: 'KES', label: 'USD / KES', dec: 2 },
      { code: 'GHS', label: 'USD / GHS', dec: 2 },
      { code: 'EGP', label: 'USD / EGP', dec: 2 },
      { code: 'BWP', label: 'USD / BWP', dec: 2 },
      { code: 'EUR', label: 'USD / EUR', dec: 4 },
      { code: 'GBP', label: 'USD / GBP', dec: 4 },
      { code: 'JPY', label: 'USD / JPY', dec: 2 },
    ];

    pairs.forEach((p) => {
      const cell = document.createElement('div');
      cell.className = 'markets-fx-cell';
      const lbl = document.createElement('span');
      lbl.textContent = p.label;
      const val = document.createElement('strong');
      const num = rates?.[p.code];
      val.textContent = typeof num === 'number' ? formatNumber(num, p.dec) : '--';
      cell.append(lbl, val);
      fxListEl.appendChild(cell);
    });
  }

  function formatRandsScale(amount) {
    if (!Number.isFinite(amount)) return '';
    const rounded = Math.round(amount);
    if (rounded >= 1000000) {
      const millions = (rounded / 1000000).toFixed(2).replace(/\.?0+$/, '');
      return `${millions} million Rands`;
    }
    return `${rounded.toLocaleString('en-ZA')} Rands`;
  }

  function renderPropertyConverter() {
    if (!reResultsEl) return;
    const rawAmount = parseFloat(reAmountEl?.value || '');
    const fromCode = reCurrencyEl?.value || 'ZAR';
    const ratePct = parseFloat(reBondRateEl?.value || '11');

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      reResultsEl.textContent =
        'Enter a positive property value to calculate South African Rands bond & property figures.';
      return;
    }

    if (!fxPerUsd.ZAR || !fxPerUsd.EUR || !fxPerUsd.GBP) {
      reResultsEl.textContent = 'Waiting for live exchange rates…';
      return;
    }

    const fromRate = fxPerUsd[fromCode] || 1;
    const usdBase = rawAmount / fromRate;
    const zarTotal = usdBase * fxPerUsd.ZAR;

    const monthlyRate = ratePct / 100 / 12;
    const nMonths = 240;
    const pow = Math.pow(1 + monthlyRate, nMonths);
    const monthlyBond = (zarTotal * monthlyRate * pow) / (pow - 1);
    const deposit10 = zarTotal * 0.1;

    reResultsEl.textContent = '';

    const valueSpan = document.createElement('span');
    const valueStrong = document.createElement('strong');
    valueStrong.textContent = 'Value in Rands: ';
    valueSpan.append(
      valueStrong,
      document.createTextNode(
        `R ${Math.round(zarTotal).toLocaleString('en-ZA')} (${formatRandsScale(zarTotal)})`
      )
    );
    reResultsEl.appendChild(valueSpan);

    const bondSpan = document.createElement('span');
    bondSpan.className = 're-bond-highlight';
    const bondStrong = document.createElement('strong');
    bondStrong.textContent = `20-Yr Bond (${ratePct.toFixed(2)}%): `;
    bondSpan.append(
      bondStrong,
      document.createTextNode(`R ${Math.round(monthlyBond).toLocaleString('en-ZA')} Rands/mo`)
    );
    reResultsEl.appendChild(bondSpan);

    const depSpan = document.createElement('span');
    const depStrong = document.createElement('strong');
    depStrong.textContent = '10% Deposit: ';
    depSpan.append(
      depStrong,
      document.createTextNode(`R ${Math.round(deposit10).toLocaleString('en-ZA')} Rands`)
    );
    reResultsEl.appendChild(depSpan);

    const targets = [
      { code: 'USD', prefix: '$' },
      { code: 'GBP', prefix: '£' },
      { code: 'EUR', prefix: '€' },
    ].filter((t) => t.code !== fromCode);

    targets.forEach((t) => {
      const span = document.createElement('span');
      const converted = usdBase * fxPerUsd[t.code];
      const strong = document.createElement('strong');
      strong.textContent = `${t.code}: `;
      const amountTxt = document.createTextNode(
        `${t.prefix}${Math.round(converted).toLocaleString('en-ZA')}`
      );
      span.append(strong, amountTxt);
      reResultsEl.appendChild(span);
    });
  }

  function renderRssNewsList(containerEl, items, feedMeta, onRetry) {
    containerEl.textContent = '';
    if (!items || !items.length) {
      const box = document.createElement('div');
      box.className = 'sport-state-box';
      const msg = document.createElement('div');
      msg.className = 'sport-loading';
      msg.textContent = `Unable to load ${feedMeta.sourceLabel} feed right now.`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'weather-ctrl-btn sport-retry-btn';
      btn.textContent = 'Retry feed';
      btn.addEventListener('click', onRetry);
      box.append(msg, btn);
      containerEl.appendChild(box);
      return;
    }

    items.slice(0, 5).forEach((item) => {
      const cleanTitle = stripHtml(item.title);
      const cleanDesc = stripHtml(item.description || item.content || '');
      if (!cleanTitle) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sport-news-item';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-controls', 'articleReaderModal');

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'sport-news-thumb';
      const rawImgUrl =
        item.thumbnail && /^https:\/\//i.test(item.thumbnail)
          ? item.thumbnail
          : item.enclosure?.link && /^https:\/\//i.test(item.enclosure.link)
            ? item.enclosure.link
            : '';
      const imgUrl = rawImgUrl
        ? rawImgUrl.replace(/(ichef\.bbci\.co\.uk\/(?:ace\/standard|news)\/)\d+\//i, '$1800/')
        : '';

      const makeFallback = () => {
        thumbWrap.textContent = '';
        const fb = document.createElement('div');
        fb.className = 'sport-news-thumb-fallback';
        fb.textContent = feedMeta.fallbackTag;
        thumbWrap.appendChild(fb);
      };

      if (imgUrl) {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          if (rawImgUrl && img.src !== rawImgUrl) {
            img.src = rawImgUrl;
            img.onerror = makeFallback;
          } else {
            makeFallback();
          }
        };
        thumbWrap.appendChild(img);
      } else {
        makeFallback();
      }

      const copy = document.createElement('div');
      copy.className = 'sport-news-copy';

      const meta = document.createElement('span');
      meta.className = 'sport-news-meta';
      const pubDate = item.pubDate ? new Date(item.pubDate.replace(' ', 'T') + 'Z') : null;
      const dateStr =
        pubDate && !Number.isNaN(pubDate.getTime())
          ? pubDate.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
          : 'LIVE';
      meta.textContent = `${feedMeta.sourceLabel.toUpperCase()} · ${dateStr.toUpperCase()}`;

      const h4 = document.createElement('h4');
      h4.textContent = cleanTitle;

      const p = document.createElement('p');
      p.textContent = cleanDesc || `Open ${feedMeta.sourceLabel} report.`;

      copy.append(meta, h4, p);
      btn.append(thumbWrap, copy);

      btn.addEventListener('click', () => {
        openArticleReader(
          {
            dot: feedMeta.dot,
            category: feedMeta.category,
            title: cleanTitle,
            img: imgUrl,
            alt: cleanTitle,
            source: `Source: ${feedMeta.sourceLabel}`,
            externalUrl: item.link || '',
            externalLabel: `Read full report on ${feedMeta.sourceLabel} →`,
            paragraphs: [
              cleanDesc || cleanTitle,
              `Live syndication dispatch carried in the NEF123123 Global Live Markets & Real-Estate desk (${feedMeta.sourceLabel}).`,
            ],
          },
          btn
        );
      });

      containerEl.appendChild(btn);
    });
  }

  async function loadMarketData() {
    if (updatedTextEl) updatedTextEl.textContent = 'SYNCING LIVE MARKETS…';

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const toIso = today.toISOString().slice(0, 10);
    const fromIso = weekAgo.toISOString().slice(0, 10);

    const [frankRes, erRes, cgRes] = await Promise.allSettled([
      fetch(
        `https://api.frankfurter.dev/v1/${fromIso}..${toIso}?base=USD&symbols=ZAR,EUR,GBP,JPY,CNY,AUD,CHF`
      ),
      fetch('https://open.er-api.com/v6/latest/USD'),
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin,ethereum&vs_currencies=usd,zar&include_24hr_change=true'
      ),
    ]);

    let latestFx = null;
    let prevFx = null;
    let liveRates = null;
    let crypto = null;

    if (frankRes.status === 'fulfilled' && frankRes.value.ok) {
      try {
        const fj = await frankRes.value.json();
        const dates = Object.keys(fj.rates || {}).sort();
        if (dates.length >= 1) latestFx = fj.rates[dates[dates.length - 1]];
        if (dates.length >= 2) prevFx = fj.rates[dates[dates.length - 2]];
      } catch {
        latestFx = null;
      }
    }

    if (erRes.status === 'fulfilled' && erRes.value.ok) {
      try {
        const ej = await erRes.value.json();
        if (ej && ej.rates) liveRates = ej.rates;
      } catch {
        liveRates = null;
      }
    }

    if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
      try {
        crypto = await cgRes.value.json();
      } catch {
        crypto = null;
      }
    }

    if (!latestFx && !liveRates && !crypto) {
      if (updatedTextEl) updatedTextEl.textContent = 'FEEDS TEMPORARILY UNAVAILABLE';
      quoteGridEl.textContent = '';
      const box = document.createElement('div');
      box.className = 'sport-state-box';
      const errMsg = document.createElement('div');
      errMsg.className = 'sport-loading';
      errMsg.textContent = 'Unable to reach live FX & commodity feeds right now.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'weather-ctrl-btn sport-retry-btn';
      retry.textContent = 'Retry market feeds';
      retry.addEventListener('click', loadMarketData);
      box.append(errMsg, retry);
      quoteGridEl.appendChild(box);
      return;
    }

    marketSnapshot = { latestFx, prevFx, liveRates, crypto };
    fxPerUsd = {
      USD: 1,
      ZAR: liveRates?.ZAR ?? latestFx?.ZAR ?? null,
      EUR: liveRates?.EUR ?? latestFx?.EUR ?? null,
      GBP: liveRates?.GBP ?? latestFx?.GBP ?? null,
    };

    renderQuoteCards();
    renderFxStrip(liveRates || latestFx || {});
    renderPropertyConverter();

    if (fxPerUsd.ZAR) {
      const formatZar = (amount) =>
        `R${amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      document.querySelectorAll('#news-ads .ad-price[data-usd-price]').forEach((priceEl) => {
        const usdPrice = Number(priceEl.dataset.usdPrice);
        if (!Number.isFinite(usdPrice) || usdPrice <= 0) return;
        const zarTotal = usdPrice * fxPerUsd.ZAR;
        const prefix = priceEl.dataset.pricePrefix || '';
        priceEl.textContent = `${prefix}${formatZar(zarTotal)} ZAR`;
        const unitEl = priceEl.closest('.ad-price-row')?.querySelector('.ad-price-unit[data-unit-count]');
        const unitCount = Number(unitEl?.dataset.unitCount);
        if (unitEl && Number.isFinite(unitCount) && unitCount > 0) {
          const unitLabel = unitEl.dataset.unitLabel || 'count';
          unitEl.textContent = `${formatZar(zarTotal / unitCount)} / ${unitLabel} · Amazon`;
        }
      });
    }

    const nowStr = new Date().toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (updatedTextEl) updatedTextEl.textContent = `UPDATED ${nowStr}`;
  }

  async function fetchSingleFeed(feedMeta, containerEl, retryFn) {
    try {
      const res = await fetch(feedMeta.url);
      if (!res.ok) throw new Error('Feed error');
      const data = await res.json();
      renderRssNewsList(containerEl, data.items || [], feedMeta, retryFn);
    } catch {
      renderRssNewsList(containerEl, [], feedMeta, retryFn);
    }
  }

  function renderSaPropertyNews() {
    const patterns = {
      cape: /cape|western cape|coastal|llandudno|wine|superyacht|franschhoek|stell|george|hermanus|club med/i,
      gauteng: /johannesburg|gauteng|saxonwold|sandton|pretoria|bryanston|cedar|smart city|skyscraper|midrand|waterfall/i,
      commercial: /mall|hotel|resort|development|skyscraper|retail|auction|estate|billion/i,
    };

    let filtered = saPropertyPosts;
    if (activeSaFilter !== 'all' && patterns[activeSaFilter]) {
      const matches = saPropertyPosts.filter((post) =>
        patterns[activeSaFilter].test(`${post.title} ${post.description}`)
      );
      if (matches.length > 0) filtered = matches;
    }

    renderRssNewsList(
      realEstateNewsEl,
      filtered,
      RSS_FEEDS.saRealEstate,
      fetchSouthAfricaRealEstate
    );
  }

  async function fetchSouthAfricaRealEstate() {
    try {
      const res = await fetch(RSS_FEEDS.saRealEstate.url);
      if (!res.ok) throw new Error('SA Property feed error');
      const posts = await res.json();
      if (!Array.isArray(posts)) throw new Error('Invalid SA Property payload');

      saPropertyPosts = posts.map((post) => ({
        title: post.title?.rendered || '',
        description: post.excerpt?.rendered || '',
        pubDate: post.date || '',
        link: post.link || '',
        thumbnail: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
      }));

      renderSaPropertyNews();
    } catch {
      saPropertyPosts = [];
      renderRssNewsList(realEstateNewsEl, [], RSS_FEEDS.saRealEstate, fetchSouthAfricaRealEstate);
    }
  }

  async function loadNewsFeedsSequentially() {
    if (isLoadingNews) return;
    isLoadingNews = true;
    try {
      await Promise.allSettled([
        fetchSingleFeed(RSS_FEEDS.markets, globalNewsEl, () =>
          fetchSingleFeed(RSS_FEEDS.markets, globalNewsEl, loadNewsFeedsSequentially)
        ),
        fetchSouthAfricaRealEstate(),
      ]);
    } finally {
      isLoadingNews = false;
    }
  }

  currButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextCurr = btn.dataset.currency;
      if (!nextCurr || nextCurr === quoteCurrency) return;
      quoteCurrency = nextCurr;
      currButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
      renderQuoteCards();
    });
  });

  saPropTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const filterKey = tab.dataset.saFilter || 'all';
      if (filterKey === activeSaFilter) return;
      activeSaFilter = filterKey;
      saPropTabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });
      renderSaPropertyNews();
    });
  });

  reFormEl?.addEventListener('submit', (e) => {
    e.preventDefault();
    renderPropertyConverter();
  });
  reAmountEl?.addEventListener('input', renderPropertyConverter);
  reCurrencyEl?.addEventListener('change', renderPropertyConverter);
  reBondRateEl?.addEventListener('change', renderPropertyConverter);

  refreshBtn?.addEventListener('click', () => {
    loadMarketData();
    loadNewsFeedsSequentially();
  });

  loadMarketData();
  loadNewsFeedsSequentially();
})();

