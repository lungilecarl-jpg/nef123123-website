import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

const firebaseWebConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'animated-pad-gpz3c').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
};

const isFirebaseWebConfigReady = Boolean(
  firebaseWebConfig.apiKey &&
    firebaseWebConfig.authDomain &&
    firebaseWebConfig.projectId &&
    firebaseWebConfig.appId
);

const globalNotice = document.getElementById('globalNotice');
const firebasePlaceholderBox = document.getElementById('firebasePlaceholderBox');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authStatusText = document.getElementById('authStatusText');
const adminWorkspace = document.getElementById('adminWorkspace');
const kpiArticles = document.getElementById('kpiArticles');
const kpiReady = document.getElementById('kpiReady');
const kpiRecent48h = document.getElementById('kpiRecent48h');
const readinessList = document.getElementById('readinessList');
const readinessTableBody = document.getElementById('readinessTableBody');
const submissionsTableBody = document.getElementById('submissionsTableBody');
const triggerIndexNowBtn = document.getElementById('triggerIndexNowBtn');
const triggerWebSubBtn = document.getElementById('triggerWebSubBtn');
const triggerGscBtn = document.getElementById('triggerGscBtn');
const seoActionResult = document.getElementById('seoActionResult');
const bridgeStateBadge = document.getElementById('bridgeStateBadge');
const bridgeStatusList = document.getElementById('bridgeStatusList');
const triggerBridgeSyncBtn = document.getElementById('triggerBridgeSyncBtn');
const bridgeSyncResult = document.getElementById('bridgeSyncResult');

let authInstance = null;
let activeUser = null;

function showNotice(text, variant = 'warn') {
  if (!globalNotice) return;
  globalNotice.textContent = text;
  globalNotice.className = `banner banner-${variant}`;
}

function clearNotice() {
  if (!globalNotice) return;
  globalNotice.className = 'banner hidden';
  globalNotice.textContent = '';
}

function createTextCell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function createBadge(text, variant) {
  const span = document.createElement('span');
  span.className = `badge badge-${variant}`;
  span.textContent = text;
  return span;
}

async function adminFetch(endpoint, options = {}) {
  if (!activeUser) {
    throw new Error('Administrator sign-in required.');
  }
  const idToken = await activeUser.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(endpoint, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

function renderReadiness(meData) {
  if (!readinessList) return;
  readinessList.textContent = '';
  const items = [
    ['Firebase Project ID', meData.integrations?.firebaseProjectId || 'animated-pad-gpz3c', true],
    ['Server Admin Verification', 'Active (verifyIdToken + ADMIN_EMAIL)', true],
    ['Existing Firestore Database & Rules', 'Untouched (Default-Deny Preserved)', true],
    ['XML, Google News, RSS, Atom, JSON Feeds', 'Active (Stateless Phase 2)', true],
    [
      'IndexNow Key (Optional)',
      meData.integrations?.indexNowConfigured ? 'Configured' : 'Optional / Idle',
      Boolean(meData.integrations?.indexNowConfigured),
    ],
    [
      'WebSub Hub Pings (Optional)',
      meData.integrations?.webSubPingEnabled ? 'Enabled' : 'Safe-Disabled Default',
      Boolean(meData.integrations?.webSubPingEnabled),
    ],
    [
      'External Publishing Bridge (Option 1)',
      meData.integrations?.externalPublishingBridgeEnabled
        ? 'Active (Verified)'
        : `Standby (${meData.integrations?.externalPublishingBridgeState || 'disabled'})`,
      Boolean(meData.integrations?.externalPublishingBridgeEnabled),
    ],
    ['Google Search Console API Auth', 'Disabled (Awaiting Approval)', false],
    ['Resend Email & Subscriber Tokens', 'Disabled (Durable DB Required)', false],
    ['Browser Web Push Broadcasts', 'Disabled (Durable DB Required)', false],
  ];

  for (const [label, value, ok] of items) {
    const row = document.createElement('div');
    row.className = 'status-line';
    const left = document.createElement('span');
    left.textContent = label;
    const right = createBadge(value, ok ? 'ok' : 'lock');
    row.append(left, right);
    readinessList.appendChild(row);
  }
}

function renderPublishingBridgeStatus(bridge) {
  if (!bridgeStatusList || !bridge) return;
  bridgeStatusList.textContent = '';

  if (bridgeStateBadge) {
    const isActive = Boolean(bridge.outboundFetchesAllowed);
    bridgeStateBadge.className = `badge ${isActive ? 'badge-ok' : 'badge-lock'}`;
    bridgeStateBadge.textContent = isActive
      ? `Active · ${bridge.state}`
      : `Standby · ${bridge.state || 'disabled'}`;
  }

  const rows = [
    ['Contract Version', bridge.contractVersion || 'nef123123-publishing/v1', true],
    [
      'Outbound Fetches Gate',
      bridge.outboundFetchesAllowed ? 'Allowed (3-Key Verified)' : 'Blocked (Safe Standby)',
      Boolean(bridge.outboundFetchesAllowed),
    ],
    [
      'Approved Feed URL',
      bridge.feedUrlConfigured ? `Configured (${bridge.feedHost || 'verified'})` : 'Not Configured',
      Boolean(bridge.feedUrlConfigured),
    ],
    [
      'Server Approval Signature Secret',
      bridge.approvalSecretConfigured ? 'Configured (HMAC-SHA256)' : 'Not Configured',
      Boolean(bridge.approvalSecretConfigured),
    ],
    [
      'Ingested Approved / Rejected',
      `${bridge.approvedCount ?? 0} approved · ${bridge.rejectedCount ?? 0} rejected · ${bridge.removedCount ?? 0} retracted`,
      true,
    ],
    [
      'Last Sync Outcome',
      bridge.lastSyncAt ? `${bridge.lastSyncOutcome} (${bridge.lastSyncAt})` : 'Never (Zero Outbound Calls)',
      bridge.lastSyncOutcome === 'synced' || bridge.lastSyncOutcome === 'not_modified',
    ],
  ];

  for (const [label, value, ok] of rows) {
    const row = document.createElement('div');
    row.className = 'status-line';
    const left = document.createElement('span');
    left.textContent = label;
    const right = createBadge(value, ok ? 'ok' : 'lock');
    row.append(left, right);
    bridgeStatusList.appendChild(row);
  }
}

function renderSubmissions(submissions) {
  if (!submissionsTableBody) return;
  submissionsTableBody.textContent = '';
  if (!Array.isArray(submissions) || submissions.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'muted';
    td.textContent = 'No submissions triggered yet in this session.';
    tr.appendChild(td);
    submissionsTableBody.appendChild(tr);
    return;
  }

  for (const item of submissions) {
    const tr = document.createElement('tr');
    tr.append(
      createTextCell(item.timestamp || ''),
      createTextCell(item.engine || ''),
      createTextCell(item.status || ''),
      createTextCell(item.httpStatus != null ? String(item.httpStatus) : '—'),
      createTextCell(String(item.attempts ?? 0)),
      createTextCell(item.message || '')
    );
    submissionsTableBody.appendChild(tr);
  }
}

function renderReadinessMatrix(readiness) {
  if (!readinessTableBody) return;
  readinessTableBody.textContent = '';

  const rows = Array.isArray(readiness?.articles) ? readiness.articles : [];
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'muted';
    td.textContent = 'No canonical articles found.';
    tr.appendChild(td);
    readinessTableBody.appendChild(tr);
    return;
  }

  for (const item of rows) {
    const tr = document.createElement('tr');

    const titleTd = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = `/news/${encodeURIComponent(item.slug || '')}`;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = item.title || item.slug;
    titleTd.appendChild(titleLink);

    const catTd = createTextCell(item.category || '');
    const dateTd = createTextCell(item.publishedDate || '');

    const checksTd = document.createElement('td');
    const pillWrap = document.createElement('div');
    pillWrap.className = 'check-pills';
    const checkSpecs = [
      ['Canonical', item.checks?.canonicalHttps],
      ['Headline ≤110', item.checks?.headlineWithin110Chars],
      ['ISO TZ', item.checks?.isoTimezoneTimestamp],
      ['Discover Img', item.checks?.discoverImageAdvisoryPass],
      ['NewsArticle LD', item.checks?.newsArticleSchemaReady],
    ];
    for (const [label, pass] of checkSpecs) {
      pillWrap.appendChild(createBadge(label, pass ? 'ok' : 'warn'));
    }
    checksTd.appendChild(pillWrap);

    const statusTd = document.createElement('td');
    statusTd.appendChild(
      createBadge(
        item.status === 'ready' ? 'Ready' : 'Advisory',
        item.status === 'ready' ? 'ok' : 'warn'
      )
    );
    if (Array.isArray(item.notes) && item.notes.length > 0) {
      const noteEl = document.createElement('div');
      noteEl.className = 'muted';
      noteEl.style.fontSize = '11px';
      noteEl.style.marginTop = '4px';
      noteEl.textContent = item.notes.join(' ');
      statusTd.appendChild(noteEl);
    }

    const actionTd = document.createElement('td');
    const pingBtn = document.createElement('button');
    pingBtn.type = 'button';
    pingBtn.className = 'btn btn-secondary btn-sm';
    pingBtn.textContent = 'Ping IndexNow';
    pingBtn.addEventListener('click', () => {
      runSeoAction('/api/admin/seo/indexnow', `IndexNow ping for ${item.slug}`, {
        slug: item.slug,
      });
    });
    actionTd.appendChild(pingBtn);

    tr.append(titleTd, catTd, dateTd, checksTd, statusTd, actionTd);
    readinessTableBody.appendChild(tr);
  }
}

async function loadAdminDashboard() {
  try {
    const [meData, overviewData] = await Promise.all([
      adminFetch('/api/admin/me'),
      adminFetch('/api/admin/overview'),
    ]);
    clearNotice();
    if (authStatusText) {
      authStatusText.textContent = `Signed in and server-verified as ${meData.admin?.email || 'Administrator'}`;
    }
    if (kpiArticles) {
      kpiArticles.textContent = String(overviewData.articlesPublished ?? 0);
    }
    if (kpiReady && overviewData.readiness) {
      kpiReady.textContent = `${overviewData.readiness.readyCount} / ${overviewData.readiness.totalArticles}`;
    }
    if (kpiRecent48h && overviewData.readiness) {
      kpiRecent48h.textContent = `${overviewData.readiness.recent48hCount} in 48h Google News window`;
    }
    renderReadiness(meData);
    renderPublishingBridgeStatus(overviewData.publishingBridge || meData.publishingBridge);
    renderSubmissions(overviewData.searchSubmissions || []);
    renderReadinessMatrix(overviewData.readiness);
    adminWorkspace?.classList.remove('hidden');
    signOutBtn?.classList.remove('hidden');
  } catch (err) {
    adminWorkspace?.classList.add('hidden');
    showNotice(err instanceof Error ? err.message : 'Server rejected administrator access.', 'warn');
  }
}

if (!isFirebaseWebConfigReady) {
  firebasePlaceholderBox?.classList.remove('hidden');
  if (googleSignInBtn) {
    googleSignInBtn.disabled = true;
    googleSignInBtn.textContent = 'Google Sign-In (Awaiting Firebase Web App Config)';
  }
  if (authStatusText) {
    authStatusText.textContent =
      'Provide VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to enable sign-in.';
  }
} else {
  const app = initializeApp(firebaseWebConfig);
  authInstance = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  onAuthStateChanged(authInstance, (user) => {
    activeUser = user;
    if (user) {
      loadAdminDashboard();
    } else {
      adminWorkspace?.classList.add('hidden');
      signOutBtn?.classList.add('hidden');
      if (authStatusText) authStatusText.textContent = 'Not signed in.';
    }
  });

  googleSignInBtn?.addEventListener('click', async () => {
    if (!authInstance) return;
    clearNotice();
    try {
      await signInWithPopup(authInstance, provider);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Google Sign-In cancelled or failed.', 'warn');
    }
  });

  signOutBtn?.addEventListener('click', async () => {
    if (!authInstance) return;
    await signOut(authInstance);
    showNotice('Signed out cleanly.', 'ok');
  });
}

async function runSeoAction(endpoint, label, payload = {}) {
  if (!seoActionResult) return;
  seoActionResult.className = 'banner banner-lock';
  seoActionResult.textContent = `Running ${label}...`;
  try {
    const data = await adminFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    const sub = data.submission;
    seoActionResult.className = `banner ${sub?.status === 'success' ? 'banner-ok' : 'banner-warn'}`;
    seoActionResult.textContent = `[${sub?.status || 'done'}] ${sub?.message || 'Completed.'}`;
    const hist = await adminFetch('/api/admin/search-submissions');
    renderSubmissions(hist.submissions || []);
  } catch (err) {
    seoActionResult.className = 'banner banner-warn';
    seoActionResult.textContent = err instanceof Error ? err.message : 'Submission request failed.';
  }
}

triggerIndexNowBtn?.addEventListener('click', () =>
  runSeoAction('/api/admin/seo/indexnow', 'IndexNow URL submission')
);

triggerWebSubBtn?.addEventListener('click', () =>
  runSeoAction('/api/admin/seo/websub', 'WebSub hub notification')
);

triggerGscBtn?.addEventListener('click', () =>
  runSeoAction('/api/admin/seo/gsc-sitemaps', 'Google Search Console sitemap submission')
);

triggerBridgeSyncBtn?.addEventListener('click', async () => {
  if (!bridgeSyncResult) return;
  bridgeSyncResult.className = 'banner banner-lock';
  bridgeSyncResult.textContent = 'Checking external publishing bridge...';
  try {
    const data = await adminFetch('/api/admin/publishing/sync', { method: 'POST' });
    const sync = data.sync;
    const variant = sync?.outcome === 'synced' || sync?.outcome === 'not_modified' ? 'ok' : 'warn';
    bridgeSyncResult.className = `banner banner-${variant}`;
    bridgeSyncResult.textContent = `[${sync?.outcome || 'done'}] ${sync?.message || 'Sync complete.'}`;
    if (data.publishingBridge) {
      renderPublishingBridgeStatus(data.publishingBridge);
    }
  } catch (err) {
    bridgeSyncResult.className = 'banner banner-warn';
    bridgeSyncResult.textContent =
      err instanceof Error ? err.message : 'Publishing bridge sync failed.';
  }
});
