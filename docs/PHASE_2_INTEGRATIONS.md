# NEF123123 — Future Phase 2 Integrations Documentation

This document records the planned architecture, security requirements, DNS setup, and activation checklist for the four integrations that remain **intentionally disabled during Safe Phase 1**:

1. **Resend Email Delivery** (verification emails & manually approved breaking-news alerts)
2. **Subscriber Verification & Unsubscribe Tokens** (double opt-in consent & one-click opt-out)
3. **Browser Web Push Broadcasts** (VAPID keys & Service Worker notification delivery)
4. **Google Search Console API Authentication** (automated sitemap submission via OAuth)

> **Important Safe Phase 1 Rule:** None of the credentials below are requested, stored, or active in Safe Phase 1. Do not add fake credentials or placeholder secrets to production configuration.

---

## Prerequisite 0 — Verified Durable Persistent Storage (Required Before Any Subscriber Data)

Because Google Cloud Run containers use an ephemeral local filesystem, live subscriber data **must never** be stored only on local container disk or temporary SQLite.

Before activating Phase 2, choose and verify one durable storage backend:
- **Option A — Existing Firestore Enterprise Database (`animated-pad-gpz3c` / `ai-studio-nef123123intelli-baa86659-b5b8-401c-b248-a222e1f40a0a`)**: Requires upgrading from Starter Tier and granting the runtime service account least-privilege `roles/datastore.user` in IAM while keeping `firestore.rules` default-deny (`allow read, write: if false;`) and isolating new collections under the `nef_` prefix.
- **Option B — Managed Relational Database (e.g., Cloud SQL / PostgreSQL)**: Automated daily backups + point-in-time recovery (PITR) + parameterized queries.
- **Option C — Dedicated Node.js Host with Persistent Disk + Automated Off-Host Backups**: Scheduled daily hot-backups copied to encrypted off-host storage with verified restore testing.

### Required Backup & Recovery Checklist Before Go-Live
- Automated daily backups enabled and verified with a test restore.
- Admin CSV/JSON export available for subscriber & consent records.
- Deterministic idempotency dispatch ledger (`${articleSlug}__email`, `${articleSlug}__push`) enforced at the database layer to block duplicate sends (`HTTP 409`).

---

## Integration 1 — Resend Email Delivery (`EMAIL_ALERTS_ENABLED=true`)

### Architecture
- Called strictly from the Node.js backend (`POST https://api.resend.com/emails`).
- Never invoked from browser code; API keys remain strictly server-side.
- Sends **only** to subscribers with `status = 'verified'` (skipping `pending` and `unsubscribed`).
- Paced batching (`<= 2 req/sec`) with exponential backoff retries on `429`/`5xx` responses and full delivery/failure logging.
- Every breaking-news email requires **manual Administrator preview and approval** in `/admin` before sending.

### DNS Records Required for Branded Sending (`nef123123.co.za`)
Configure in your domain registrar when ready to send from `@nef123123.co.za` (or subdomain `@news.nef123123.co.za` to keep existing `info@nef123123.co.za` MX records untouched):
- **DKIM**: Resend-generated `TXT`/`CNAME` signing records (`resend._domainkey.nef123123.co.za`).
- **SPF**: `TXT` and bounce `MX` records on Resend's sending subdomain.
- **DMARC**: `TXT` at `_dmarc.nef123123.co.za` (e.g., `v=DMARC1; p=none; rua=mailto:info@nef123123.co.za`).

### Free-Tier Limits
- **Resend Free**: 3,000 emails/month and **100 emails/day**.
- Once verified subscribers exceed 100/day, upgrading to **Resend Pro ($20/month for 50,000 emails/month)** removes the daily cap.

### Future Server-Only Environment Variables *(Phase 2 Only)*
- `RESEND_API_KEY` — Private API key (`re_...`)
- `RESEND_FROM_EMAIL` — Verified sender (e.g., `NEF123123 News <alerts@nef123123.co.za>`)

---

## Integration 2 — Subscriber Verification, Consent & Unsubscribe Tokens

### Workflow
1. Reader submits `#join` form with email, optional name, required unchecked-by-default explicit consent checkbox, and hidden anti-spam honeypot field.
2. Server enforces sliding-window rate limits (`5 signups / 15 min per IP`, `3 resends / hr per email`) and stores a `pending` record with `consentGiven = true`, `consentTimestamp`, `consentVersion`, and `consentText`.
3. Server signs an **HMAC-SHA256 verification token** (24-hour expiry) and emails `/api/subscribers/verify?token=...` via Resend.
4. Clicking the link validates the signature and expiry, transitions the subscriber to `verified`, and records `verifiedAt`.
5. Every alert email embeds a **non-expiring HMAC-SHA256 unsubscribe link** plus RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. Clicking it immediately sets `status = 'unsubscribed'` without login.

### Future Server-Only Environment Variable *(Phase 2 Only)*
- `SUBSCRIBER_TOKEN_SECRET` — 64-character cryptographically random hex string used exclusively on the Node.js server for HMAC-SHA256 signing.

---

## Integration 3 — Browser Web Push Broadcasts (`BROWSER_PUSH_ENABLED=true`)

### Architecture
- Root Service Worker shell is already prepared at `/public/sw.js` with strict URL sanitization (`https://www.nef123123.co.za` origin enforcement) and existing NEF123123 icons (`/favicon.png`, `/favicon-96x96.png`).
- Uses open W3C Web Push with P-256 **VAPID** keys (`web-push` on Node.js) — **$0/month unlimited**.
- Only `VAPID_PUBLIC_KEY` is served to browsers; `VAPID_PRIVATE_KEY` remains strictly server-side.
- Sends only after **manual Administrator preview and approval** in `/admin`.
- Automatically marks subscriptions returning HTTP `404` or `410 Gone` as `expired` and retries transient errors with exponential backoff.

### Future Server-Only Environment Variables *(Phase 2 Only)*
- `VAPID_PUBLIC_KEY` — URL-safe Base64 P-256 public key
- `VAPID_PRIVATE_KEY` — Private P-256 signing key (server-side only)
- `VAPID_SUBJECT` — `mailto:info@nef123123.co.za`

---

## Integration 4 — Google Search Console API Authentication (`GSC_API_ENABLED=true`)

### Safe Phase 1 Alternative (Available Today at $0)
During Safe Phase 1, `/sitemap.xml` and `/news-sitemap.xml` are already served dynamically and declared in `/robots.txt`. You can submit both URLs manually once inside Google Search Console with zero OAuth secrets required.

### Future Automated API Setup *(Phase 2 Only)*
When automated submission on every article publish is desired:
1. Authorize an OAuth 2.0 client with the `https://www.googleapis.com/auth/webmasters` scope for your verified `https://www.nef123123.co.za/` Search Console property.
2. Add the following **server-only** credentials to your hosting environment:
   - `GSC_SITE_URL` (`https://www.nef123123.co.za/` or `sc-domain:nef123123.co.za`)
   - `GSC_CLIENT_ID`
   - `GSC_CLIENT_SECRET`
   - `GSC_REFRESH_TOKEN`
