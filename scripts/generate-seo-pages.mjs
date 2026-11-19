import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const newsDir = path.join(rootDir, 'news');
const publicDir = path.join(rootDir, 'public');

const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';
const LASTMOD = '2026-04-15';

const ARTICLES = [
  {
    slug: 'african-owned-supply-chains',
    seoTitle: 'African-Owned Supply Chains & Continental Trade | NEF123123',
    metaDescription:
      'How African-owned supply chains, local beneficiation, and intra-continental logistics build sovereign wealth and economic freedom across Africa.',
    publishedDate: '2026-04-15',
    category: 'AFRICA · ECONOMIC FREEDOM',
    title: 'African-Owned Supply Chains: Building Continental Value & Sovereign Trade',
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1100&q=85',
    ogImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1100&q=85',
    alt: 'Container logistics and freight corridors powering African-owned supply chains',
    source: 'NEF123123 Editorial Desk · Economic Sovereignty',
    paragraphs: [
      'Across Africa, true economic freedom depends on more than extracting raw materials—it requires African ownership and control over the entire supply chain, from local sourcing and industrial processing to freight logistics, cold-chain storage, and cross-border wholesale distribution.',
      'For decades, colonial-era trade corridors were designed to move unprocessed minerals, timber, and agricultural harvests directly to ports for export, leaving African producers locked out of packaging, refining, shipping, and retail margins.',
      'Building African-owned supply chains under the African Continental Free Trade Area (AfCFTA) framework means investing in regional rail networks, cooperative aggregation hubs, domestic agro-processing plants, and African-financed trade credit so smallholder farmers and local manufacturers can supply continental supermarkets and state procurement directly.',
      'Within the Seven Pillars of Navigant Economic Freedom, strengthening African-owned supply chains retains capital inside local communities, reduces import vulnerability, creates skilled jobs across logistics and manufacturing, and anchors long-term continental wealth sovereignty.',
    ],
  },
  {
    slug: 'stokvels-and-savings-circles',
    seoTitle: 'Stokvels and Savings Circles: Collective Capital | NEF123123',
    metaDescription:
      'Exploring how South African stokvels and community savings circles pool grassroots capital to fund cooperative enterprise and shared wealth.',
    publishedDate: '2026-04-15',
    category: 'ECONOMIC FREEDOM · FINANCE',
    title: 'Stokvels and Savings Circles: Mobilising Collective African Capital',
    img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1100&q=85',
    ogImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1100&q=85',
    alt: 'Community savings and collective investment capital growth representing stokvels',
    source: 'NEF123123 Editorial Desk · Cooperative Finance',
    paragraphs: [
      'South Africa’s stokvels and Africa’s rotating savings circles represent one of the continent’s most resilient, trusted grassroots financial institutions—mobilising tens of billions of rand every year through disciplined collective saving, mutual accountability, and Ubuntu.',
      'Traditionally used for groceries, burials, and education expenses, modern investment stokvels are increasingly channelling pooled community capital into bulk procurement, property acquisition, agricultural cooperatives, renewable energy micro-projects, and community-owned retail outlets.',
      'By formalising transparent constitutions, collective bargaining with wholesalers, and cooperative banking partnerships, stokvels can negotiate lower input costs and retain financial returns inside townships and rural economies rather than losing wealth to predatory high-interest lending.',
      'Within Navigant Economic Freedom, stokvels and savings circles demonstrate that African communities already possess the social trust and capital discipline required to build democratic, community-owned wealth from the ground up.',
    ],
  },
  {
    slug: 'project-mayibuye-spy-operation',
    seoTitle: 'Project Mayibuye Spy Operation & Accountability | NEF123123',
    metaDescription:
      'Inside the declassified State Security Agency Project Mayibuye operation, intelligence oversight concerns, and calls for democratic accountability.',
    publishedDate: '2026-04-15',
    category: 'SOUTH AFRICA · INVESTIGATIONS',
    title: 'Project Mayibuye Spy Operation: Declassified Records & Accountability',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1100&q=85',
    ogImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1100&q=85',
    alt: 'Parliamentary accountability and legal oversight gavel representing public scrutiny',
    source: 'NEF123123 News Desk · South Africa Oversight',
    paragraphs: [
      'Public disclosures and testimony surrounding the State Security Agency’s (SSA) covert "Project Mayibuye" operation have renewed national scrutiny over how South Africa’s intelligence services operated, how secret funds were authorised, and whether covert programmes strayed beyond their constitutional mandate.',
      'Records cited in parliamentary oversight and inquiry proceedings indicate that Project Mayibuye operated within the SSA’s Special Operations structures, raising urgent questions from civil society, opposition parties, and legal analysts about domestic surveillance, political interference, and weak oversight controls.',
      'Constitutional law experts and accountability advocates emphasise that Section 199 of South Africa’s Constitution prohibits security services from furthering any partisan political interest or prejudicing legitimate political activity, making independent parliamentary review and declassification essential to public trust.',
      'Calls continue for full transparency, strengthened powers for the Inspector-General of Intelligence, and clear legislative safeguards to ensure state intelligence institutions protect national sovereignty and citizens’ constitutional rights rather than factional agendas.',
    ],
  },
  {
    slug: 'malema-challenges-helen-zille-court-venue',
    seoTitle: 'Malema Challenges Helen Zille Over Court Venue | NEF123123',
    metaDescription:
      'EFF leader Julius Malema challenges Helen Zille over her push to move their High Court legal dispute from Johannesburg to Cape Town.',
    publishedDate: '2026-04-15',
    category: 'NEF123123 NEWS | SOUTH AFRICA',
    title: 'Malema Challenges Helen Zille Over Court Venue as Legal Battle Intensifies',
    img: '../src/assets/images/regenerated_image_1794932529148.jpg',
    ogImage: `${OFFICIAL_ORIGIN}/src/assets/images/regenerated_image_1794932529148.jpg`,
    alt: 'EFF leader Julius Malema smiling in a red beret while speaking with journalists',
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
  {
    slug: 'da-invites-eff-mk-party-municipal-coalition-talks',
    seoTitle: 'DA Invites EFF & MK to Municipal Coalition Talks | NEF123123',
    metaDescription:
      'In a major political shift, the Democratic Alliance formally invites the EFF and MK Party to municipal coalition talks across South Africa.',
    publishedDate: '2026-04-15',
    category: 'SOUTH AFRICA · POLITICS',
    title: 'DA Makes U-Turn, Invites EFF and MK Party to Municipal Coalition Talks',
    img: '../src/assets/images/assets/aistudio/image_e921a8c9.png',
    ogImage: `${OFFICIAL_ORIGIN}/src/assets/images/assets/aistudio/image_e921a8c9.png`,
    alt: 'EFF leader Julius Malema waving in an EFF cap surrounded by supporters',
    source: 'Sources cited: TimesLIVE & SABC',
    paragraphs: [
      'In a surprising political shift, the Democratic Alliance (DA) has formally initiated coalition discussions with both the Economic Freedom Fighters (EFF) and the uMkhonto weSizwe (MK) Party as political parties scramble to form municipal coalition governments.',
      'According to confirmation from the EFF to TimesLIVE, the party received an official letter from the DA expressing interest in working together at the municipal level. EFF leadership has reportedly already held an initial meeting with the DA regarding the proposal, though the party stated it has not yet issued a formal response.',
      "Simultaneously, the DA is preparing to sit down with the MK Party within the next 48 hours. Speaking to the SABC, the MK Party’s national negotiator, Advocate Dali Mpofu, confirmed that the party has officially accepted the DA's invitation to begin coalition talks.",
      'The move has sparked wide debate across the political landscape, given the DA\'s long-standing public stance against partnering with either party. The DA previously entered the Government of National Unity (GNU) explicitly to keep the EFF and MK Party out of national governance, frequently warning voters against what it termed a "doomsday coalition" involving the ANC, EFF, and MK Party. With meetings now underway and scheduled, all eyes are on how these unexpected negotiations will reshape local governance.',
    ],
  },
  {
    slug: 'eff-omphile-maotwe-insourcing-bill-parliament',
    seoTitle: 'Omphile Maotwe Urges Insourcing Bill Progress | NEF123123',
    metaDescription:
      'EFF Treasurer-General Hon. Omphile Maotwe urges Parliament to advance the Insourcing Bill to the desirability stage after four years.',
    publishedDate: '2026-04-15',
    category: 'NEF123123 NEWS | PARLIAMENT',
    title: 'EFF’s Omphile Maotwe Urges Swift Progress on Insourcing Bill After Four Years',
    img: '../src/assets/images/eff-insourcing-bill-maotwe.jpg',
    ogImage: `${OFFICIAL_ORIGIN}/src/assets/images/eff-insourcing-bill-maotwe.jpg`,
    alt: 'EFF Treasurer-General and MP Hon. Omphile Maotwe speaking outside Parliament on the EFF Insourcing Bill',
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
  {
    slug: 'eff-sihle-lonzi-weekly-parliament-youth-initiative',
    seoTitle: 'Hon. Sihle Lonzi Invites Youth Into Parliament | NEF123123',
    metaDescription:
      'EFF MP Hon. Sihle Lonzi launches a weekly initiative inviting South African students and young professionals to observe Parliamentary committees.',
    publishedDate: '2026-04-15',
    category: 'NEF123123 NEWS | PARLIAMENT',
    title: 'EFF MP Hon. Sihle Lonzi Invites Students & Young Professionals Into Parliament Weekly',
    img: '/assets/aistudio/Screenshot_2026-11-19_093542_1cad536d.png',
    ogImage: `${OFFICIAL_ORIGIN}/assets/aistudio/Screenshot_2026-11-19_093542_1cad536d.png`,
    alt: 'EFF Member of Parliament Hon. Sihle Lonzi posing with students and young professionals in front of the Parliament of South Africa backdrop',
    source: 'Economic Freedom Fighters · Parliament Video',
    externalUrl: 'https://www.facebook.com/share/v/1KMb6CGar7/',
    externalLabel: 'Watch Video on Facebook →',
    paragraphs: [
      'Standing on the steps of Parliament, Economic Freedom Fighters (EFF) Member of Parliament Hon. Sihle Lonzi announced a weekly initiative welcoming students and young professionals from across South Africa to attend and observe Parliamentary Portfolio Committee proceedings.',
      'Hon. Lonzi explained that the programme is designed to give young citizens firsthand exposure to how Parliament operates, how oversight of government departments takes place, and how legislation and public budgets are interrogated.',
      'He emphasised that youth must be brought closer to Parliament and given meaningful opportunities to participate in decisions shaping their future, rather than having their future discussed behind closed doors without their involvement.',
    ],
  },
  {
    slug: 'malema-past-warning-south-africa-water-crisis',
    seoTitle: 'Julius Malema’s Warning as SA Water Crisis Grows | NEF123123',
    metaDescription:
      'Julius Malema’s past warning on water shortages resurfaces as Bronkhorstspruit, Tshwane, and Johannesburg face escalating water restrictions.',
    publishedDate: '2026-04-15',
    category: 'NEF123123 NEWS | SOUTH AFRICA',
    title: 'Julius Malema’s Past Warning Comes True as South Africa’s Water Crisis Escalates',
    img: '../src/assets/images/malema-water-crisis-warning.jpg',
    ogImage: `${OFFICIAL_ORIGIN}/src/assets/images/malema-water-crisis-warning.jpg`,
    alt: 'NEF123123 video report featuring Julius Malema and Bronkhorstspruit residents facing a worsening water crisis',
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
  {
    slug: 'african-future-dignity-self-determination',
    seoTitle: 'African Future Rooted in Dignity & Self-Rule | NEF123123',
    metaDescription:
      'Examining how accountable institutions, regional trade corridors, and economic agency build an African future rooted in dignity and self-determination.',
    publishedDate: '2026-04-15',
    category: 'AFRICA',
    title: 'Building an African future rooted in dignity and self-determination',
    img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80',
    ogImage: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80',
    alt: 'African landscape',
    source: 'NEF123123 Perspective · Africa in Focus',
    paragraphs: [
      'Across the continent, a renewed conversation is taking shape around what true self-determination requires in the twenty-first century: institutions built to serve citizens, regional trade corridors controlled by African producers, and civic education rooted in shared accountability.',
      'Economists and community organisers point out that political independence reaches its full promise only when accompanied by economic agency—where households, workers, and local enterprises participate directly in value creation.',
      'Strengthening cross-border partnerships between African universities, cooperatives, and municipal planners is creating practical pathways to share technical skills, lower barriers to intra-African commerce, and build resilient public institutions.',
      'At the heart of this vision is human dignity: ensuring that policy decisions prioritise safe neighbourhoods, quality education, reliable infrastructure, and opportunities that allow young people to build lasting prosperity at home.',
    ],
  },
  {
    slug: 'who-owns-future-of-african-development',
    seoTitle: 'Who Owns the Future of African Development? | NEF123123',
    metaDescription:
      'As infrastructure reshapes African cities, domestic procurement, local engineering, and transparent financing determine who owns long-term value.',
    publishedDate: '2026-04-15',
    category: 'DEVELOPMENT',
    title: 'Who owns the future of African development?',
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    ogImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    alt: 'Modern city buildings',
    source: 'NEF123123 Perspective · Development & Infrastructure',
    paragraphs: [
      'From ports and power grids to digital backbone networks and urban transit, infrastructure investment is reshaping African cities at unprecedented speed. Yet a critical question remains at the centre of every project: who captures the long-term economic value?',
      'When public-interest safeguards, domestic procurement rules, and local engineering participation are embedded from the outset, major capital projects build lasting domestic industrial capacity rather than leaving behind debt and imported dependency.',
      'Regional development specialists advocate transparent financing terms, municipal technical capacity building, and stronger participation by local pension funds and development banks so communities share in the returns of productive assets.',
      'Owning the future of development means measuring success not merely by ribbon-cutting ceremonies, but by reliable energy for small manufacturers, affordable logistics for local producers, and durable public value for generations.',
    ],
  },
  {
    slug: 'land-resources-shared-prosperity',
    seoTitle: 'Land, Resources & Shared African Prosperity | NEF123123',
    metaDescription:
      'How equitable land tenure, local mineral beneficiation, and stewardship turn Africa’s natural wealth into durable, shared prosperity.',
    publishedDate: '2026-04-15',
    category: 'LAND & RESOURCES',
    title: 'Land, resources and the promise of shared prosperity',
    img: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=900&q=80',
    ogImage: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=900&q=80',
    alt: 'Hands holding soil and a seedling',
    source: 'NEF123123 Perspective · Land & Resources',
    paragraphs: [
      'Land and natural resources form the foundation of Africa’s economic potential—spanning fertile arable soils, freshwater basins, critical transition minerals, and renewable energy corridors.',
      'For decades, raw resource extraction without local beneficiation exported jobs and industrial margins abroad while leaving host communities vulnerable to ecological strain and volatile boom-and-bust cycles.',
      'A stewardship-driven model places equitable land tenure, environmental restoration, and domestic mineral and agricultural processing at the centre of national development strategies.',
      'By pairing fair ownership frameworks with accessible credit, extension services, and community equity stakes, Africa’s natural wealth can anchor broad-based opportunity and shared prosperity across both rural and urban communities.',
    ],
  },
  {
    slug: 'continental-value-addition-local-manufacturing',
    seoTitle: 'Continental Value Addition & Manufacturing | NEF123123',
    metaDescription:
      'Why shifting from raw commodity exports to African beneficiation and local manufacturing strengthens jobs, currencies, and economic sovereignty.',
    publishedDate: '2026-04-15',
    category: 'INDUSTRIALISATION',
    title: 'Continental Value Addition & Local Manufacturing',
    img: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1100&q=85',
    ogImage: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1100&q=85',
    alt: 'Industrial production facility',
    source: 'NEF123123 Editorial Desk · Industrialisation',
    paragraphs: [
      'Across Africa’s industrial corridors, policy attention is increasingly shifting away from exporting raw commodities and toward domestic beneficiation, component assembly, and finished-goods manufacturing.',
      'Economists note that exporting unprocessed minerals and agricultural crops transfers the highest-margin stages of production—and the skilled engineering, logistics, and fabrication jobs tied to them—to external markets.',
      'Expanding special industrial zones powered by reliable electricity, regional rail links, and technical training colleges enables domestic enterprises to turn local raw materials into construction steel, processed foods, pharmaceuticals, and clean-energy hardware.',
      'Retaining value addition on the continent strengthens currency stability, widens the tax base for public services, and creates durable pathways for youth employment and technological sovereignty.',
    ],
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
        image: [article.ogImage],
        datePublished: article.publishedDate,
        dateModified: article.publishedDate,
        articleSection: article.category,
        url: canonicalUrl,
        author: {
          '@type': 'Organization',
          name: 'NEF123123 Editorial Desk',
          url: `${OFFICIAL_ORIGIN}/`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'NEF123123 — Navigant Economic Freedom',
          logo: {
            '@type': 'ImageObject',
            url: `${OFFICIAL_ORIGIN}/favicon.png`,
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
  <meta name="robots" content="index, follow">
  <link rel="canonical" id="canonicalLink" href="${canonicalUrl}">
  <meta property="og:site_name" content="NEF123123">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.seoTitle)}">
  <meta property="og:description" content="${escapeHtml(article.metaDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(article.ogImage)}">
  <meta property="article:published_time" content="${article.publishedDate}">
  <meta property="article:section" content="${escapeHtml(article.category)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(article.metaDescription)}">
  <meta name="twitter:image" content="${escapeHtml(article.ogImage)}">
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
            <span>Published: <time datetime="${article.publishedDate}">${article.publishedDate}</time></span>
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
    {
      loc: `${OFFICIAL_ORIGIN}/`,
      lastmod: LASTMOD,
      changefreq: 'daily',
      priority: '1.0',
    },
    ...ARTICLES.map((article) => ({
      loc: `${OFFICIAL_ORIGIN}/news/${article.slug}`,
      lastmod: article.publishedDate || LASTMOD,
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ];

  const entries = urls
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${OFFICIAL_ORIGIN}/sitemap.xml
`;
}

fs.mkdirSync(newsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const article of ARTICLES) {
  const html = buildArticleHtml(article);
  fs.writeFileSync(path.join(newsDir, `${article.slug}.html`), html, 'utf8');
}

const sitemapXml = buildSitemapXml();
fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');

const robotsTxt = buildRobotsTxt();
fs.writeFileSync(path.join(rootDir, 'robots.txt'), robotsTxt, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');

console.log(`Generated ${ARTICLES.length} static news pages, sitemap.xml, and robots.txt.`);
