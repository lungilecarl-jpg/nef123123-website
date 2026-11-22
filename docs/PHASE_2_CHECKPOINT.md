# NEF123123 — Phase 2 Reviewable Checkpoint

**Domain:** `https://www.nef123123.co.za`  
**Firebase / GCP Project:** `animated-pad-gpz3c` (Starter Tier, zero billing)  
**Pre-Phase-2 Verified Baseline:** Safe Phase 1 (12/12 automated tests passing, `vite build` clean, `npm run lint` clean, Port 3000 smoke checks verified)  

## Preserved Non-Negotiable Safeguards
- Existing Firestore Enterprise database (`ai-studio-nef123123intelli-baa86659-b5b8-401c-b248-a222e1f40a0a`) and default-deny `firestore.rules` (`allow read, write: if false;`): **100% Untouched**.
- Live subscriber registration, email verification storage, push broadcasts, Resend email delivery, and Google Search Console OAuth API: **Remain Server-Locked (`HTTP 503` / disabled)**.
- Temporary local SQLite storage: **None created**.
- Existing `www.nef123123.co.za` homepage layout, `styles.css`, `script.js`, live feeds, ZAR advertising cards, Analytics (`G-LRM7QXKF2Q`), AdSense (`ca-pub-7782426836472981`), and all 13 canonical `/news/<slug>` pages: **Preserved intact**.
- Deployment / publishing: **Not executed** (local preview verification only, awaiting separate user approval).

## Pre-Phase-2 File Checksums (SHA-256 Baseline)

| File | Pre-Phase-2 SHA-256 |
| --- | --- |
| `index.html` | `d96eebc412f2f2d2734cce5a27a2120b120ad417a4ece1c130c8eac83cb5b743` |
| `scripts/generate-seo-pages.mjs` | `2ae00fe4f87c5ac8c4bdb6a8ef4a26d0669ed0d62ab7bd3f8c42261e30190ac6` |
| `server/articles-catalog.ts` | `0e6fe84240ed1b9d9b5d7a2b5eaa2628e76f6ffd81fa80d429582bba6f92052e` |
| `server/seo-distribution.ts` | `7914b9198cf5e9dcfb1d1a832b2dd84c62de0af2103d3bb3d79635d064530eef` |
| `server.ts` | `1f949e63db8f396c484a4c0fa35de9fbdf5b52ac5a9698fcd885a40ac260ca3f` |
| `admin/index.html` | `eb593f95be5f9fe30b6c5b87397bde3b21c2891bdf11eea47f7fc7609a7e8d6b` |
| `admin/admin.js` | `5adc8b4d48e9cd8bfcb0f2c8825e1604f9b0da1b7dc5820e21ad8d815334fb58` |
| `.env.example` | `dec74fd8b66553d29ec40715ea4a6843af05e1a5225625551d9e2c6b0ac409d5` |
| `sitemap.xml` | `fba03005e3c7a4de0726aba37b24be1d07fa50980225d6477302ba90ad476520` |
| `public/sitemap.xml` | `fba03005e3c7a4de0726aba37b24be1d07fa50980225d6477302ba90ad476520` |
| `robots.txt` | `4aec3795d2175e599ae0371837ee54a955323be54affaee251bb056690609d08` |
| `public/robots.txt` | `4aec3795d2175e599ae0371837ee54a955323be54affaee251bb056690609d08` |
| `news/african-future-dignity-self-determination.html` | `365939b925d6d683aca505e34add1cdc4b2b29bceab606340971fb9498d14969` |
| `news/african-owned-supply-chains.html` | `b169f1cc4909681e17c7e66617832b6f7dd5ac0fcef5137b747039557a52e6c2` |
| `news/continental-value-addition-local-manufacturing.html` | `1a71ae33b5851a4b0deabac999915369ba129c80107216fa2548e931c75c53f3` |
| `news/da-invites-eff-mk-party-municipal-coalition-talks.html` | `b0439ee52dae4f5a10acdba1ce0cabf9a967f45430d7405c8c4165dace16ae30` |
| `news/eff-omphile-maotwe-insourcing-bill-parliament.html` | `ae1413ef02d7384a63922c69697ad974526a0566b0d1144bf2e53356bef8a345` |
| `news/eff-sihle-lonzi-weekly-parliament-youth-initiative.html` | `c024e849ed93ab083b7365caf2eff2beb167934f85fd2defa04789a4d82c1122` |
| `news/land-resources-shared-prosperity.html` | `973171dc9ebdb14e1847a052c56b3629ae669eed835649cdfa0cf954aade6f26` |
| `news/malema-challenges-helen-zille-court-venue.html` | `5540ba653e0ce77591babd2af67df143af60c0dc81e6687fee9f3f80bd8ec95e` |
| `news/malema-fires-back-at-helen-zille-mashaba-affidavit-da-emails.html` | `6c4e9217be4b4da6ae0dc5825b093cf9898232af961168d8f08e98b960780c34` |
| `news/malema-past-warning-south-africa-water-crisis.html` | `2e8dc31399d91a65b60e929eed14211875a1d3c502fe49574203d287daf2f1b1` |
| `news/project-mayibuye-spy-operation.html` | `fffb2d4a7e6855c2d409b1d7786857255be33671d59ebcc11f43fb25e1e58632` |
| `news/stokvels-and-savings-circles.html` | `d7eebf7af4305ac29a2ea1a29f53ff640b6d1f728ee13e625b32acfc263660e9` |
| `news/who-owns-future-of-african-development.html` | `de8e98f363231b4e270851cf8ee3547c38b51e816e081c79ac7221cc1d68d76e` |

## Phase 2 Stateless Deliverables
1. Unified canonical article catalog (`/data/articles-catalog.json`) shared by `/scripts/generate-seo-pages.mjs` and `/server/articles-catalog.ts`.
2. Standard XML sitemap (`/sitemap.xml`) and Google News 0.9 sitemap (`/news-sitemap.xml`) enriched with `<image:image>` tags and strict 48-hour recency window (plus `?includeAll=1` preview).
3. Complete syndication feeds: RSS 2.0 (`/rss.xml` with WebSub hub & Media RSS), Atom 1.0 (`/atom.xml`), JSON Feed 1.1 (`/feed.json`), and 4 topic RSS feeds (`/rss/south-africa.xml`, `/rss/africa.xml`, `/rss/parliament.xml`, `/rss/economy.xml`).
4. Safe-disabled-by-default WebSub hub ping publisher (`WEBSUB_PING_ENABLED=false`) + single-slug & batch IndexNow submission support.
5. Google News & Discover `<head>` metadata (`max-image-preview:large, max-snippet:-1, max-video-preview:-1`, full ISO-8601 `+02:00` timestamps, `article:modified_time`, RSS/Atom/JSON Feed `<link rel="alternate">`, enriched `NewsArticle` JSON-LD) across `index.html` and all 13 `/news/*.html` pages.
6. Upgraded `/admin` portal with Feed Directory, Google News & Discover Readiness Matrix (`/api/admin/seo/readiness`), and WebSub Hub Ping trigger (`/api/admin/seo/websub`).
7. Automated Phase 2 syndication test suite (`tests/phase-2-syndication.test.ts`) alongside all 12 Safe Phase 1 regression tests (`tests/safe-phase-1.test.ts`).
