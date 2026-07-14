import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from './api';
import { Select as FormSelect } from './design-system.jsx';
import './styles.css';

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  ),
  Jobs: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="1" width="12" height="14" rx="1.5"/>
      <line x1="5" y1="5" x2="11" y2="5"/>
      <line x1="5" y1="8" x2="11" y2="8"/>
      <line x1="5" y1="11" x2="8" y2="11"/>
    </svg>
  ),
  SKUs: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8L8 2l6 6v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8z"/>
      <rect x="5.5" y="9" width="5" height="5" rx="0.5"/>
    </svg>
  ),
  Add: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="3" x2="8" y2="13"/>
      <line x1="3" y1="8" x2="13" y2="8"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 11V3"/>
      <polyline points="4.5,6.5 8,3 11.5,6.5"/>
      <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 8A5.5 5.5 0 112.5 5"/>
      <polyline points="2,2 2.5,5 5.5,4.5"/>
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="2.5" y1="4" x2="13.5" y2="4"/>
      <line x1="2.5" y1="8" x2="13.5" y2="8"/>
      <line x1="2.5" y1="12" x2="13.5" y2="12"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="4" x2="12" y2="12"/>
      <line x1="12" y1="4" x2="4" y2="12"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="6,4 10,8 6,12"/>
    </svg>
  ),
};

// ── useResource hook ─────────────────────────────────────────────────────────
function useResource(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DeadlineBadge({ date }) {
  const days = daysUntil(date);
  if (days === null) return <span className="urgency-label urgency-later">No deadline</span>;
  if (days < 0)   return <span className="urgency-label urgency-today">OVERDUE</span>;
  if (days === 0) return <span className="urgency-label urgency-today">TODAY</span>;
  if (days <= 3)  return <span className="urgency-label urgency-today">{days}d</span>;
  if (days <= 7)  return <span className="urgency-label urgency-soon">{days}d</span>;
  return <span className="urgency-label urgency-later">{fmtDate(date)}</span>;
}

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the UI still works without persistence.
  }
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStoredValue(key, fallback));
  useEffect(() => {
    writeStoredValue(key, value);
  }, [key, value]);
  return [value, setValue];
}

function WorkspacePanel({ id, title, meta, children, defaultWidth = 360, minWidth = 300, className = '', dominant = false }) {
  const [collapsed, setCollapsed] = useStoredState(`workspace:${id}:collapsed`, 'false');
  const [storedWidth, setStoredWidth] = useStoredState(`workspace:${id}:width`, String(defaultWidth));
  const panelRef = useRef(null);
  const isCollapsed = collapsed === 'true';
  const width = Math.max(minWidth, Number(storedWidth) || defaultWidth);

  useEffect(() => {
    const node = panelRef.current;
    if (!node || isCollapsed || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => {
      const nextWidth = Math.round(entries[0]?.contentRect?.width || 0);
      if (nextWidth >= minWidth) setStoredWidth(String(nextWidth));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, isCollapsed, minWidth, setStoredWidth]);

  return (
    <section
      ref={panelRef}
      className={`workspace-panel ${dominant ? 'is-dominant' : ''} ${isCollapsed ? 'is-collapsed' : ''} ${className}`}
      style={isCollapsed ? undefined : { flexBasis: dominant ? undefined : `${width}px`, minWidth: `${minWidth}px` }}
    >
      <div className="workspace-panel-header">
        <span>
          <strong>{title}</strong>
          {meta && <em>{meta}</em>}
        </span>
        <button type="button" onClick={() => setCollapsed(isCollapsed ? 'false' : 'true')} aria-expanded={!isCollapsed}>
          {isCollapsed ? 'Open' : 'Collapse'}
        </button>
      </div>
      {!isCollapsed && <div className="workspace-panel-body">{children}</div>}
    </section>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  let cls = 'badge-neutral';
  if (s.includes('ready') || s.includes('complete') || s.includes('done')) cls = 'badge-green';
  else if (s.includes('block') || s.includes('hold') || s.includes('issue')) cls = 'badge-red';
  else if (s.includes('progress') || s.includes('active') || s.includes('review')) cls = 'badge-amber';
  else if (s.includes('new') || s.includes('intake')) cls = 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function ReadinessBadge({ readiness }) {
  if (!readiness) return null;
  const tone = readiness.state === 'ready_for_photo'
    ? 'badge-green'
    : readiness.state === 'merchandise_issue'
      ? 'badge-red'
      : 'badge-amber';
  return <span className={`badge ${tone}`}>{readiness.label}</span>;
}

function itemStatus(item) {
  return String(item?.status || '').trim().toLowerCase();
}

function isItemInCreativeForce(item) {
  return itemStatus(item) === 'in production';
}

function isItemCompleted(item) {
  return itemStatus(item) === 'complete';
}

function isItemCancelled(item) {
  return itemStatus(item) === 'cancelled';
}

function isOpenFoodHubItem(item) {
  return !isItemInCreativeForce(item) && !isItemCompleted(item) && !isItemCancelled(item);
}

const DASHBOARD_QUEUES = [
  {
    id: 'waiting_merchandise',
    title: 'Waiting for Merchandise',
    description: 'Items waiting for required merchandise to be received or matched.',
    empty: 'No items waiting for merchandise.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'waiting_for_merchandise',
  },
  {
    id: 'merchandise_issues',
    title: 'Merchandise Issues',
    description: 'Items blocked by unresolved merchandise issues.',
    empty: 'No unresolved merchandise issues.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'merchandise_issue',
  },
  {
    id: 'missing_data',
    title: 'Missing Critical Data',
    description: 'Items missing required client data for photography readiness.',
    empty: 'No items missing critical data.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'missing_data',
  },
  {
    id: 'missing_artwork',
    title: 'Missing Required Artwork',
    description: 'Items waiting for artwork required by the client.',
    empty: 'No items missing required artwork.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'missing_artwork',
  },
  {
    id: 'ready_for_photo',
    title: 'Ready for Photo',
    description: 'Items ready to send to Creative Force.',
    empty: 'No items ready for photo.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'ready_for_photo',
  },
  {
    id: 'in_creative_force',
    title: 'In Creative Force',
    description: 'Items currently in Creative Force and read-only here.',
    empty: 'No items currently in Creative Force.',
    matches: item => isItemInCreativeForce(item),
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Items completed by Walnut.',
    empty: 'No completed items yet.',
    matches: item => isItemCompleted(item),
  },
];

function queueForId(queueId) {
  return DASHBOARD_QUEUES.find(queue => queue.id === queueId);
}

function getIdentifierLabel({ client, clientId, record, clients = [], allClients = false } = {}) {
  if (allClients) return 'Identifier';
  const resolvedClient = client
    || (clientId ? clients.find(c => c.id === clientId) : null)
    || (record?.clientIds?.length === 1 ? clients.find(c => c.id === record.clientIds[0]) : null);
  return resolvedClient?.identifierLabel || 'Identifier';
}

function referenceDataEntries(item) {
  const data = item?.referenceData;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data)
    .map(([key, value]) => [String(key || '').trim(), String(value ?? '').trim()])
    .filter(([key, value]) => key && value);
}

// ── Client logo ──────────────────────────────────────────────────────────────
// Drop a file named {clientId}.png into frontend/public/client-logos/ and it
// appears automatically. Falls back to an initials avatar.
function ClientLogo({ clientId, clientName, size = 28 }) {
  const exts = ['png', 'jpg', 'svg'];
  const [extIdx, setExtIdx] = useState(0);
  const initials = (clientName || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const src = clientId ? `/client-logos/${clientId}.${exts[extIdx]}` : null;
  const failed = !clientId || extIdx >= exts.length;

  function onError() { setExtIdx(i => i + 1); }

  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 5, flexShrink: 0,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, color: 'var(--text-3)',
        letterSpacing: '-0.02em',
      }}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={clientName}
      onError={onError}
      style={{
        width: size, height: size, borderRadius: 5, flexShrink: 0,
        objectFit: 'contain', background: '#fff',
        border: '1px solid var(--border)',
      }}
    />
  );
}

// ── Dashboard card wrapper ────────────────────────────────────────────────────
function Card({ title, action, children, style, className = '', onClick }) {
  return (
    <div
      className={`dash-card ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="dash-card-header">
        <span className="dash-card-title">{title}</span>
        {action && <span className="dash-card-action">{action}</span>}
      </div>
      <div className="dash-card-body">{children}</div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
const QUEUE_COLORS = {
  waiting_merchandise: '#f59e0b',
  merchandise_issues:  '#ef4444',
  missing_data:        '#8b5cf6',
  missing_artwork:     '#f97316',
  ready_for_photo:     '#10b981',
  in_creative_force:   '#3b82f6',
  completed:           '#475569',
};

function Dashboard({ navigate }) {
  const skus = useResource(() => api.listSkus());
  const receipts = useResource(() => api.listReceipts());
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const skuList = skus.data?.records ?? [];
  const receiptList = receipts.data?.records ?? [];
  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(c => [c.id, c]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const today = new Date();

  // Queue counts
  const queueCounts = {};
  DASHBOARD_QUEUES.forEach(q => { queueCounts[q.id] = skuList.filter(q.matches).length; });

  // KPI totals
  const totalActive  = skuList.filter(s => !isItemCompleted(s) && !isItemCancelled(s)).length;
  const bottlenecked = skuList.filter(s => isOpenFoodHubItem(s) && ['waiting_for_merchandise','merchandise_issue','missing_data','missing_artwork'].includes(s.readiness?.state)).length;
  const readyToShoot = queueCounts['ready_for_photo'] ?? 0;
  const inCF         = queueCounts['in_creative_force'] ?? 0;
  const completed    = queueCounts['completed'] ?? 0;

  // The 3 production blockers producers care about
  const needsMerch   = skuList.filter(s => isOpenFoodHubItem(s) && ['waiting_for_merchandise','merchandise_issue'].includes(s.readiness?.state));
  const needsData    = skuList.filter(s => isOpenFoodHubItem(s) && s.readiness?.state === 'missing_data');
  const needsArtwork = skuList.filter(s => isOpenFoodHubItem(s) && s.readiness?.state === 'missing_artwork');

  // Donut chart data
  const donutData = DASHBOARD_QUEUES
    .map(q => ({ name: q.title, value: queueCounts[q.id] ?? 0, color: QUEUE_COLORS[q.id] }))
    .filter(d => d.value > 0);

  // Merch aging: received but not yet shot/in-CF — sorted longest wait first
  const merchSitting = skuList
    .filter(s => s.received && s.recDate && isOpenFoodHubItem(s) && !isItemCompleted(s) && !isItemInCreativeForce(s))
    .map(s => ({ ...s, daysWaiting: Math.max(0, Math.floor((today - new Date(s.recDate)) / 86400000)) }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting)
    .slice(0, 10);

  // Receiving sessions logged by Receiving and awaiting Verification.
  const reviewReceipts = receiptList
    .filter(r => (r.entries ?? []).some(e => e.merchStatus !== 'Validated'))
    .map(r => ({
      ...r,
      daysAgo: r.receivedDate ? Math.max(0, Math.floor((today - new Date(r.receivedDate)) / 86400000)) : null,
      entryCount: r.entries?.length ?? 0,
      totalQuantity: (r.entries ?? []).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
      entrySummary: (r.entries ?? []).slice(0, 2).map(entry => {
        const location = locationMap[entry.locationIds?.[0]];
        const label = receivingEntryLabel(entry);
        const place = location?.name || entry.locationIds?.[0] || 'No location';
        return `${entry.quantity || 1}x ${label} · ${place}`;
      }).join(' / '),
    }))
    .sort((a, b) => (b.daysAgo ?? -1) - (a.daysAgo ?? -1));

  if (skus.loading) return <div className="empty-state">Loading dashboard…</div>;
  if (skus.error)   return <div className="error-state">{skus.error}</div>;

  return (
    <div className="dash-wrap">

      {/* KPI Strip */}
      <div className="dash-kpi-row">
        <div className="dash-kpi-card">
          <div className="dash-kpi-num" style={{ color: '#60a5fa' }}>{totalActive}</div>
          <div className="dash-kpi-lbl">Active Items</div>
        </div>
        <div className="dash-kpi-card dash-kpi-clickable" onClick={() => navigate('skus')}>
          <div className="dash-kpi-num" style={{ color: '#f87171' }}>{bottlenecked}</div>
          <div className="dash-kpi-lbl">Bottlenecked</div>
        </div>
        <div className="dash-kpi-card dash-kpi-clickable" onClick={() => navigate('skus', { queue: 'ready_for_photo' })}>
          <div className="dash-kpi-num" style={{ color: '#34d399' }}>{readyToShoot}</div>
          <div className="dash-kpi-lbl">Ready to Shoot</div>
        </div>
        <div className="dash-kpi-card dash-kpi-clickable" onClick={() => navigate('skus', { queue: 'in_creative_force' })}>
          <div className="dash-kpi-num" style={{ color: '#60a5fa' }}>{inCF}</div>
          <div className="dash-kpi-lbl">In Creative Force</div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-num" style={{ color: '#94a3b8' }}>{completed}</div>
          <div className="dash-kpi-lbl">Completed</div>
        </div>
      </div>

      {/* 3 Production Blockers */}
      <div className="dash-blocker-row">
        <div className="dash-blocker-card dash-blocker-merch" onClick={() => navigate('skus', { queue: 'waiting_merchandise' })}>
          <div className="dash-blocker-count" style={{ color: '#fbbf24' }}>{needsMerch.length}</div>
          <div className="dash-blocker-title">Merch Blocked</div>
          <div className="dash-blocker-sub">Waiting for or issues with merchandise</div>
          <div className="dash-blocker-detail">
            <span>{queueCounts['waiting_merchandise'] ?? 0} waiting</span>
            <span>{queueCounts['merchandise_issues'] ?? 0} issues</span>
          </div>
        </div>
        <div className="dash-blocker-card dash-blocker-data" onClick={() => navigate('skus', { queue: 'missing_data' })}>
          <div className="dash-blocker-count" style={{ color: '#a78bfa' }}>{needsData.length}</div>
          <div className="dash-blocker-title">Data Blocked</div>
          <div className="dash-blocker-sub">Missing required client data fields</div>
        </div>
        <div className="dash-blocker-card dash-blocker-art" onClick={() => navigate('skus', { queue: 'missing_artwork' })}>
          <div className="dash-blocker-count" style={{ color: '#fb923c' }}>{needsArtwork.length}</div>
          <div className="dash-blocker-title">Artwork Blocked</div>
          <div className="dash-blocker-sub">Waiting for required artwork files</div>
        </div>
      </div>

      {/* Ready for Production */}
      {readyToShoot > 0 && (
        <div className="dash-card">
          <div className="dash-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Ready for Production</span>
            <span style={{ background: '#10b981', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              {readyToShoot} ready to schedule
            </span>
          </div>
          <div className="dash-aging-head" style={{ gridTemplateColumns: '36px 2fr 1fr 1fr 1fr' }}>
            <span></span><span>Item</span><span>Brand</span><span>Job #</span><span>Client</span>
          </div>
          {skuList.filter(s => isOpenFoodHubItem(s) && s.readiness?.state === 'ready_for_photo').map(s => {
            const clientId = s.clientIds?.[0];
            const client = clientMap[clientId];
            return (
              <div key={s.id} className="dash-aging-row" style={{ gridTemplateColumns: '36px 2fr 1fr 1fr 1fr' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <ClientLogo clientId={clientId} clientName={client?.name} size={26} />
                </span>
                <span className="dash-aging-name">{s.name || s.identifier || s.productId || '—'}</span>
                <span className="dash-aging-brand">{s.brand || '—'}</span>
                <span className="dash-aging-brand" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.itemJobNumber || '—'}</span>
                <span className="dash-aging-brand">{client?.name || '—'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="dash-mid-row">
        <div className="dash-card">
          <div className="dash-card-title">Item Distribution</div>
          <div className="dash-donut-wrap">
            <ResponsiveContainer width={152} height={152}>
              <PieChart>
                <Pie data={donutData} innerRadius={46} outerRadius={72} dataKey="value" paddingAngle={2} strokeWidth={0}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-legend">
              {donutData.map(d => (
                <div key={d.name} className="dash-legend-row">
                  <span className="dash-legend-dot" style={{ background: d.color }} />
                  <span className="dash-legend-name">{d.name}</span>
                  <span className="dash-legend-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Pipeline Queues — click to filter</div>
          <div className="dash-tile-grid">
            {DASHBOARD_QUEUES.map(q => (
              <div key={q.id} className="dash-tile"
                style={{ borderLeftColor: QUEUE_COLORS[q.id] }}
                onClick={() => navigate('skus', { queue: q.id })}>
                <div className="dash-tile-count" style={{ color: QUEUE_COLORS[q.id] }}>{queueCounts[q.id] ?? 0}</div>
                <div className="dash-tile-title">{q.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Queue */}
      {!receipts.loading && (
        <div className="dash-card">
          <div className="dash-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Awaiting Verification</span>
            {reviewReceipts.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                {reviewReceipts.length}
              </span>
            )}
          </div>
          {reviewReceipts.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', padding: '8px 0' }}>
              No receiving sessions are awaiting verification.
            </div>
          ) : (
            <>
              <div className="dash-aging-head" style={{ gridTemplateColumns: '44px 1.2fr 1fr 2fr 80px 80px' }}>
                <span></span><span>Receiving Logged</span><span>Client</span><span>Entries</span><span>Quantity</span><span>Days Ago</span>
              </div>
              {reviewReceipts.map(r => {
                const thumb = r.photos?.[0]?.thumbnails?.small?.url || r.photos?.[0]?.url;
                const client = clientMap[r.clientIds?.[0]];
                return (
                  <div key={r.id} className="dash-aging-row" style={{ gridTemplateColumns: '44px 1.2fr 1fr 2fr 80px 80px' }}>
                    <span>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: 36, height: 36, borderRadius: 5, objectFit: 'cover', display: 'block' }} />
                        : <span style={{ display: 'block', width: 36, height: 36, borderRadius: 5, background: 'rgba(255,255,255,0.07)' }} />
                      }
                    </span>
                    <span className="dash-aging-name">{r.name || r.receipt || r.tracking || r.id}</span>
                    <span className="dash-aging-brand">{client?.name || 'Unassigned'}</span>
                    <span className="dash-aging-brand">{r.entrySummary || `${r.entryCount} item${r.entryCount === 1 ? '' : 's'}`}</span>
                    <span className="dash-aging-brand">{r.totalQuantity || '—'}</span>
                    <span className={`dash-age ${r.daysAgo > 7 ? 'dash-age-crit' : r.daysAgo > 3 ? 'dash-age-warn' : 'dash-age-ok'}`}>
                      {r.daysAgo !== null ? `${r.daysAgo}d` : '—'}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Merch Aging Table */}
      {merchSitting.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">PM Verified Merchandise — Awaiting Photography</div>
          <div className="dash-aging-head">
            <span>Item</span><span>Brand</span><span>State</span><span>Days Sitting</span>
          </div>
          {merchSitting.map(s => (
            <div key={s.id} className="dash-aging-row">
              <span className="dash-aging-name">{s.name || s.identifier || s.productId || '—'}</span>
              <span className="dash-aging-brand">{s.brand || '—'}</span>
              <span><ReadinessBadge readiness={s.readiness} /></span>
              <span className={`dash-age ${s.daysWaiting > 14 ? 'dash-age-crit' : s.daysWaiting > 7 ? 'dash-age-warn' : 'dash-age-ok'}`}>
                {s.daysWaiting}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Receiving page ───────────────────────────────────────────────────────────
function toDatetimeLocal(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

const emptyReceiptEntry = () => ({
  productName: '',
  skuId: '',
  quantity: 1,
  locationId: '',
  condition: 'Good',
  description: '',
  notes: '',
  jobId: '',
});

function defaultReceivingMode() {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth <= 680 ? 'quick' : 'desktop';
}

const RECENT_RECEIVING_LOCATIONS_KEY = 'marksReceivingRecentLocations';

function loadRecentReceivingLocations() {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_RECEIVING_LOCATIONS_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function saveRecentReceivingLocation(locationId) {
  if (!locationId) return;
  const next = [locationId, ...loadRecentReceivingLocations().filter(id => id !== locationId)].slice(0, 4);
  window.localStorage.setItem(RECENT_RECEIVING_LOCATIONS_KEY, JSON.stringify(next));
}

function receivingEntryLabel(entry) {
  const productName = String(entry?.productName || entry?.name || '').trim();
  const description = String(entry?.description || '').trim();
  return productName || description || 'Unnamed Product';
}

function receivingEntrySku(entry) {
  return String(entry?.skuId || entry?.observedIdentifier || '').trim();
}

function receivingEntryLocationId(entry) {
  return String(entry?.locationIds?.[0] || entry?.locationId || '').trim();
}

function itemMatchTitle(item) {
  return item?.name || item?.product || 'Unnamed Item';
}

function itemMatchIdentifier(item) {
  const label = item?.identifierLabel || item?.codeType || 'Identifier';
  const value = item?.identifier || item?.productId || item?.gtinUpc || '';
  return value ? `${label}: ${value}` : '';
}

function receiptEntryHasUnsavedValues(entry, photos = []) {
  if (!entry) return false;
  return Boolean(
    String(entry.productName || '').trim()
    || String(entry.skuId || '').trim()
    || String(entry.description || '').trim()
    || String(entry.notes || '').trim()
    || String(entry.locationId || '').trim()
    || String(entry.condition || '').trim() !== 'Good'
    || Number(entry.quantity || 1) !== 1
    || (photos || []).length
  );
}

function receivingPhotoUrl(photo) {
  if (!photo) return '';
  return photo.previewUrl
    || photo.thumbnails?.small?.url
    || photo.thumbnails?.large?.url
    || photo.url
    || photo.publicUrl
    || photo.public_url
    || '';
}

function recordPhotoUrl(record) {
  return receivingPhotoUrl(recordPhotos(record)[0]);
}

function recordPhotos(record) {
  const metadata = (record?.photoMetadata || []).filter(photo => receivingPhotoUrl(photo));
  if (metadata.length) return metadata;
  return (record?.photos || []).filter(photo => receivingPhotoUrl(photo));
}

function RecordThumbnail({ record, className = '', count }) {
  const [failed, setFailed] = useState(false);
  const photos = recordPhotos(record);
  const url = !failed ? receivingPhotoUrl(photos[0]) : '';
  const total = count ?? photos.length;
  return (
    <span className={`record-thumb ${className}`}>
      {url ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>✓</span>}
      {total > 1 && <em>+{total - 1}</em>}
    </span>
  );
}

function photoFilesFromInput(files) {
  return Array.from(files || []).map(file => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

function photoPayload(photos) {
  return (photos || []).filter(photo => photo.remoteUrl).map(photo => ({
    url: photo.remoteUrl,
    filename: photo.name,
  }));
}

function QuickReceivingCapture({ locationList }) {
  const receiptList = useResource(() => api.listReceipts());
  const [receipt, setReceipt] = useState(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [session, setSession] = useState({
    carrier: '',
    tracking: '',
    boxQuantity: 1,
    received: toDatetimeLocal(),
    photos: [],
  });
  const [entry, setEntryState] = useState(() => ({
    ...emptyReceiptEntry(),
    locationId: '',
  }));
  const [entryPhotos, setEntryPhotos] = useState([]);
  const [entryCount, setEntryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const productNameRef = useRef(null);
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const deliveryCameraRef = useRef(null);
  const deliveryLibraryRef = useRef(null);
  const barcodeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const openReceipts = receiptList.data?.records ?? [];
  const recentLocationIds = loadRecentReceivingLocations();
  const recentLocations = recentLocationIds
    .map(id => locationList.find(location => location.id === id))
    .filter(Boolean);

  function setEntry(field, value) {
    setEntryState(prev => ({ ...prev, [field]: value }));
  }

  function resetEntry(defaultLocationId = entry.locationId) {
    setEntryPhotos(prev => {
      prev.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
    setEntryState({
      ...emptyReceiptEntry(),
      locationId: defaultLocationId || '',
    });
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  async function addEntryPhotos(files) {
    const localPhotos = photoFilesFromInput(files);
    if (!localPhotos.length) return;
    setEntryPhotos(prev => [...prev, ...localPhotos]);
  }

  function removeEntryPhoto(photoId) {
    setEntryPhotos(prev => {
      const photo = prev.find(item => item.id === photoId);
      if (!photo) return prev;
      if (photo.isExisting && photo.objectKey) {
        // Delete from R2 + update Airtable metadata immediately
        const rId = receipt?.id;
        const eId = editingEntryId;
        if (rId && eId) {
          api.deleteReceivingEntryPhoto(rId, eId, photo.objectKey).catch(() => {});
        }
      } else {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter(item => item.id !== photoId);
    });
  }

  async function addDeliveryPhotos(files) {
    const localPhotos = photoFilesFromInput(files);
    if (!localPhotos.length) return;
    setSession(prev => ({ ...prev, photos: [...prev.photos, ...localPhotos] }));
    try {
      const uploaded = await api.uploadReceivingPhotos(localPhotos.map(photo => photo.file));
      const uploadedPhotos = uploaded.photos || [];
      setSession(prev => ({
        ...prev,
        photos: prev.photos.map(photo => {
          const index = localPhotos.findIndex(local => local.id === photo.id);
          if (index === -1 || !uploadedPhotos[index]) return photo;
          return { ...photo, remoteUrl: uploadedPhotos[index].url };
        }),
      }));
    } catch (err) {
      setError(err.message || 'Photos could not be uploaded.');
    }
  }

  function removeDeliveryPhoto(photoId) {
    setSession(prev => {
      const photo = prev.photos.find(item => item.id === photoId);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return { ...prev, photos: prev.photos.filter(item => item.id !== photoId) };
    });
  }

  async function ensureReceipt() {
    if (receipt) return receipt;
    const created = await api.startReceivingSession({
      carrier: session.carrier.trim(),
      tracking: session.tracking.trim(),
      boxQuantity: Number(session.boxQuantity || 1),
      received: session.received,
      photos: photoPayload(session.photos),
    });
    setReceipt(created);
    setEntryCount(created.entries?.length ?? 0);
    setNotice('Delivery started.');
    return created;
  }

  async function openReceipt(receiptId) {
    if (!receiptId) return;
    setError('');
    setNotice('');
    try {
      const data = await api.getReceivingSession(receiptId);
      setReceipt(data);
      setSelectedReceiptId(receiptId);
      setEntryCount(data.entries?.length ?? 0);
      setSession(prev => ({
        ...prev,
        carrier: data.carrier || '',
        tracking: data.tracking || '',
        received: data.received ? toDatetimeLocal(data.received) : prev.received,
      }));
    } catch (err) {
      setError(err.message || 'Could not open that receipt.');
    }
  }

  async function startDelivery() {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await ensureReceipt();
    } catch (err) {
      setError(err.message || 'Could not start delivery.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNext() {
    setError('');
    setNotice('');
    const quantity = Number(entry.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setSaving(true);
    try {
      const activeReceipt = await ensureReceipt();
      let saved = await api.createReceiptEntry(activeReceipt.id, {
        productName: entry.productName.trim(),
        skuId: entry.skuId.trim(),
        quantity,
        locationId: entry.locationId,
        condition: entry.condition,
        description: entry.description.trim(),
        notes: entry.notes.trim(),
      });
      if (entryPhotos.length > 0) {
        try {
          const uploaded = await api.uploadReceivingPhotos(entryPhotos.map(photo => photo.file), {
            receiptId: activeReceipt.id,
            receiptEntryId: saved.id,
          });
          saved = uploaded.entry || { ...saved, photos: uploaded.photos || [] };
        } catch (photoError) {
          setError(photoError.message || 'Entry saved, but photos could not be uploaded.');
        }
      }
      if (entry.locationId) saveRecentReceivingLocation(entry.locationId);
      setReceipt(prev => prev ? { ...prev, entries: [...(prev.entries || []), saved] } : prev);
      setEntryCount(count => count + 1);
      resetEntry(entry.locationId);
      setNotice('Entry saved. Ready for the next item.');
    } catch (err) {
      setError(err.message || 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  }

  function finishDelivery() {
    setNotice(receipt ? 'Delivery finished and sent to Verification.' : 'No delivery has been started yet.');
    setReceipt(null);
    setSelectedReceiptId('');
    setEntryCount(0);
    setSession({ carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal(), photos: [] });
    resetEntry('');
  }

  return (
    <div className="mobile-receiving-shell">
      <div className="mobile-receiving-top">
        <div>
          <span className="mobile-kicker">Quick Capture</span>
          <h2>{receipt?.receipt || receipt?.name || receipt?.id || 'New Delivery'}</h2>
        </div>
        <strong>{entryCount} entr{entryCount === 1 ? 'y' : 'ies'}</strong>
      </div>

      {error && <div className="error-state">{error}</div>}
      {notice && <div className="notice-state">{notice}</div>}

      <div className="mobile-receiving-panel">
        <div className="mobile-field">
          <label>Open Receipt</label>
          <select value={selectedReceiptId} onChange={event => openReceipt(event.target.value)}>
            <option value="">Start a new delivery</option>
            {openReceipts.map(item => (
              <option value={item.id} key={item.id}>
                {item.receipt || item.name || item.tracking || item.id} · {item.entries?.length ?? 0} entries
              </option>
            ))}
          </select>
        </div>

        <div className="mobile-field-row">
          <div className="mobile-field">
            <label>Carrier</label>
            <input value={session.carrier} onChange={event => setSession(prev => ({ ...prev, carrier: event.target.value }))} placeholder="Optional" />
          </div>
          <div className="mobile-field">
            <label>Tracking</label>
            <input value={session.tracking} onChange={event => setSession(prev => ({ ...prev, tracking: event.target.value }))} placeholder="Optional" />
          </div>
        </div>

        <div className="mobile-field">
          <label>Delivery Photos</label>
          <div className="mobile-photo-actions">
            <button type="button" className="mobile-photo-button primary" onClick={() => deliveryCameraRef.current?.click()}>Take Photo</button>
            <button type="button" className="mobile-photo-button" onClick={() => deliveryLibraryRef.current?.click()}>Photo Library</button>
          </div>
          <input ref={deliveryCameraRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={event => { addDeliveryPhotos(event.target.files); event.target.value = ''; }} />
          <input ref={deliveryLibraryRef} type="file" accept="image/*" multiple hidden onChange={event => { addDeliveryPhotos(event.target.files); event.target.value = ''; }} />
          {session.photos.length > 0 && (
            <div className="mobile-photo-strip">
              {session.photos.map(photo => (
                <button type="button" className="mobile-thumb" key={photo.id} onClick={() => removeDeliveryPhoto(photo.id)} title="Remove photo">
                  <img src={photo.previewUrl} alt="" />
                  <span>×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!receipt && (
          <button type="button" className="btn btn-primary mobile-start-button" onClick={startDelivery} disabled={saving}>
            {saving ? 'Starting...' : 'Begin Receiving'}
          </button>
        )}
      </div>

      <div className="mobile-entry-card">
        <div className="mobile-field">
          <label>Photos</label>
          <div className="mobile-photo-actions">
            <button type="button" className="mobile-photo-button primary" onClick={() => cameraInputRef.current?.click()}>Take Photo</button>
            <button type="button" className="mobile-photo-button" onClick={() => libraryInputRef.current?.click()}>Photo Library</button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={event => { addEntryPhotos(event.target.files); event.target.value = ''; }} />
          <input ref={libraryInputRef} type="file" accept="image/*" multiple hidden onChange={event => { addEntryPhotos(event.target.files); event.target.value = ''; }} />
          {entryPhotos.length > 0 && (
            <div className="mobile-photo-strip">
              {entryPhotos.map(photo => (
                <button type="button" className="mobile-thumb" key={photo.id} onClick={() => removeEntryPhoto(photo.id)} title="Remove photo">
                  <img src={photo.previewUrl} alt="" />
                  <span>×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mobile-field">
          <label>Product Name</label>
          <div className="mobile-identifier-row">
            <input ref={productNameRef} value={entry.productName} onChange={event => setEntry('productName', event.target.value)} placeholder="Name printed on package" />
            {barcodeSupported && <button type="button" className="btn btn-alt">Scan</button>}
          </div>
          <input value={entry.skuId} onChange={event => setEntry('skuId', event.target.value)} placeholder="SKU / ID (optional)" />
        </div>

        <div className="mobile-field">
          <label>Quantity</label>
          <div className="mobile-stepper">
            <button type="button" onClick={() => setEntry('quantity', Math.max(1, Number(entry.quantity || 1) - 1))}>−</button>
            <input type="number" min="1" value={entry.quantity} onChange={event => setEntry('quantity', event.target.value)} />
            <button type="button" onClick={() => setEntry('quantity', Number(entry.quantity || 0) + 1)}>+</button>
          </div>
        </div>

        <div className="mobile-field">
          <label>Storage Location</label>
          {recentLocations.length > 0 && (
            <div className="mobile-location-chips">
              {recentLocations.map(location => (
                <button type="button" className={entry.locationId === location.id ? 'active' : ''} key={location.id} onClick={() => setEntry('locationId', location.id)}>
                  {location.name}
                </button>
              ))}
            </div>
          )}
          <select value={entry.locationId} onChange={event => setEntry('locationId', event.target.value)}>
            <option value="">Select location...</option>
            {locationList.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </div>

        <div className="mobile-field">
          <label>Condition</label>
          <select value={entry.condition} onChange={event => setEntry('condition', event.target.value)}>
            <option>Good</option>
            <option>Damaged</option>
            <option>Unknown</option>
          </select>
        </div>

        <div className="mobile-field">
          <label>Description</label>
          <input value={entry.description} onChange={event => setEntry('description', event.target.value)} placeholder="Optional" />
        </div>

        <div className="mobile-field">
          <label>Notes</label>
          <textarea value={entry.notes} onChange={event => setEntry('notes', event.target.value)} rows="2" placeholder="Optional" />
        </div>
      </div>

      <div className="mobile-receiving-actions">
        <button type="button" className="btn btn-alt" onClick={finishDelivery} disabled={saving}>Finish Delivery</button>
        <button type="button" className="btn btn-primary" onClick={saveNext} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}

function ReceivingPage() {
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const carrierOptions = useResource(() => api.airtableSingleSelectOptions({ tableName: 'Receipts', fieldName: 'Carrier' }));
  const allReceipts = useResource(() => api.listReceipts());

  const [receipt, setReceipt] = useState(null);
  const [session, setSession] = useState({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal(), notes: '' });

  const _jobClientId = receipt?.clientIds?.[0] || session.clientId || '';
  const jobsResource = useResource(
    () => _jobClientId ? api.listJobs(_jobClientId) : Promise.resolve({ records: [] }),
    [_jobClientId]
  );

  const [savedEntries, setSavedEntries] = useState([]);

  const [entry, setEntryState] = useState(() => ({
    ...emptyReceiptEntry(),
    locationId: '',
  }));
  const [entryPhotos, setEntryPhotos] = useState([]);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [recentEntryIds, setRecentEntryIds] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [pendingCopyEntry, setPendingCopyEntry] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState('');
  const [itemMatches, setItemMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchChoice, setMatchChoice] = useState({ status: 'none', item: null });
  const [prevMatchedItemId, setPrevMatchedItemId] = useState('');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [tab, setTab] = useState('new'); // 'new' | 'all'

  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const productNameRef = useRef(null);

  const clientList = (clients.data?.records ?? []).filter(c => c.active !== false);
  const locationList = (locations.data?.records ?? []).filter(l => l.active !== false);
  const carrierList = carrierOptions.data?.options ?? [];
  const carrierSelectOptions = session.carrier && !carrierList.includes(session.carrier)
    ? [session.carrier, ...carrierList]
    : carrierList;
  const locationNameById = Object.fromEntries(locationList.map(l => [l.id, l.name]));
  const clientNameById = Object.fromEntries(clientList.map(c => [c.id, c.name]));
  const receiptList = allReceipts.data?.records ?? [];
  const [allReceiptsView, setAllReceiptsView] = useState('receipts'); // 'receipts' | 'items'
  const twoDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  const isSearching = search.trim().length > 0;
  const filteredReceipts = receiptList.filter(r => {
    const hay = [r.name, r.receipt, r.carrier, r.tracking,
      (r.clientIds || []).map(id => clientNameById[id]).join(' ')].join(' ').toLowerCase();
    const matchesSearch = !isSearching || hay.includes(search.trim().toLowerCase());
    const matchesClient = !clientFilter || (r.clientIds || []).includes(clientFilter);
    const isRecent = !r.received || new Date(r.received).getTime() >= twoDaysAgo;
    return matchesSearch && matchesClient && (isSearching || isRecent);
  });

  const activeClientId = receipt?.clientIds?.[0] || session.clientId || '';
  const jobList = jobsResource.data?.records ?? [];
  const matchQuery = [entry.skuId, entry.productName].map(v => String(v || '').trim()).filter(Boolean).join(' ');
  const showMatchSuggestions = matchChoice.status !== 'matched'
    && matchChoice.status !== 'needs'
    && matchQuery.replace(/[^a-z0-9]+/gi, '').length >= 3;
  const entryCount = savedEntries.length;
  const headerReceived = receipt?.received || session.received;
  const headerReceivedLabel = headerReceived
    ? new Date(headerReceived).toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })
    : '';

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 1200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let active = true;
    if (!showMatchSuggestions) {
      setItemMatches([]);
      setMatchLoading(false);
      return () => { active = false; };
    }
    setMatchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const data = await api.searchVerificationItems({ q: matchQuery, clientId: activeClientId, includeItemId: prevMatchedItemId });
        if (active) setItemMatches(data.records ?? []);
      } catch {
        if (active) setItemMatches([]);
      } finally {
        if (active) setMatchLoading(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(t); };
  }, [showMatchSuggestions, matchQuery, activeClientId, prevMatchedItemId]);

  function setSessionField(field, value) {
    setSession(prev => ({ ...prev, [field]: value }));
  }

  async function autoSaveReceiptHeader(overrides = {}) {
    if (!receipt) return;
    try {
      const updated = await api.updateReceivingSession(receipt.id, {
        clientId: session.clientId,
        carrier: session.carrier,
        tracking: session.tracking,
        boxQuantity: Number(session.boxQuantity || 1),
        received: session.received,
        notes: session.notes || '',
        ...overrides,
      });
      setReceipt(updated);
      allReceipts.reload();
    } catch {
      // silent — don't interrupt the user
    }
  }

  function setEntry(field, value) {
    setEntryState(prev => ({ ...prev, [field]: value }));
    if ((field === 'productName' || field === 'skuId') && matchChoice.status === 'needs') {
      setMatchChoice({ status: 'none', item: null });
    }
  }

  async function addEntryPhotos(files) {
    const localPhotos = photoFilesFromInput(files);
    if (!localPhotos.length) return;
    setEntryPhotos(prev => [...prev, ...localPhotos]);
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  function removeEntryPhoto(photoId) {
    const photo = entryPhotos.find(p => p.id === photoId);
    if (!photo) return;
    if (photo.isExisting && photo.objectKey) {
      const rId = receipt?.id;
      const eId = editingEntryId;
      if (rId && eId) {
        api.deleteReceivingEntryPhoto(rId, eId, photo.objectKey).catch(() => {});
      }
    } else if (photo.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    setEntryPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  function resetActiveEntry(defaultLocationId = entry.locationId, defaultCondition = entry.condition || 'Good') {
    setEntryPhotos(prev => {
      prev.forEach(p => { if (!p.isExisting) URL.revokeObjectURL(p.previewUrl); });
      return [];
    });
    setPendingCopyEntry(null);
    setEntryState({
      ...emptyReceiptEntry(),
      locationId: defaultLocationId || '',
      condition: defaultCondition || 'Good',
      jobId: entry.jobId || '',
    });
    setItemMatches([]);
    setMatchChoice({ status: 'none', item: null });
    setPrevMatchedItemId('');
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  async function createDelivery() {
    setError('');
    setSaving('create');
    try {
      await ensureDeliveryReceipt();
      setTimeout(() => productNameRef.current?.focus(), 80);
    } catch (err) {
      setError(err.message || 'Could not create receipt.');
    } finally {
      setSaving('');
    }
  }

  async function ensureDeliveryReceipt() {
    if (receipt) return receipt;
    const boxQuantity = Number(session.boxQuantity);
    if (!Number.isFinite(boxQuantity) || boxQuantity < 1) throw new Error('Box Quantity must be at least 1.');
    const created = await api.startReceivingSession({
      clientId: session.clientId,
      carrier: session.carrier.trim(),
      tracking: session.tracking.trim(),
      boxQuantity,
      received: session.received,
    });
    setReceipt(created);
    setSavedEntries(created.entries || []);
    allReceipts.reload();
    return created;
  }

  async function saveNext() {
    setError('');
    if (!entry.productName.trim()) {
      setError('Product name is required.');
      productNameRef.current?.focus();
      return;
    }
    const quantity = Number(entry.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setSaving('entry');
    let uploadDelay;
    try {
      const activeReceipt = await ensureDeliveryReceipt();
      let saved;
      const matchPayload = {};
      if (matchChoice.status === 'matched') {
        matchPayload.itemId = matchChoice.item?.id || '';
        matchPayload.matchStatus = 'Matched';
        matchPayload.noClearMatch = false;
        if (entry.jobId) matchPayload.jobId = entry.jobId;
      } else if (matchChoice.status === 'needs' || !editingEntryId) {
        matchPayload.itemId = '';
        matchPayload.matchStatus = 'Needs Match';
        matchPayload.noClearMatch = true;
      }
      const entryPayload = {
        productName: entry.productName.trim(),
        skuId: entry.skuId.trim(),
        quantity,
        locationId: entry.locationId,
        condition: entry.condition || 'Good',
        description: entry.description.trim(),
        notes: entry.notes.trim(),
        ...matchPayload,
      };
      if (editingEntryId) {
        saved = await api.updateReceiptEntry(activeReceipt.id, editingEntryId, entryPayload);
      } else {
        saved = await api.createReceiptEntry(activeReceipt.id, entryPayload);
      }
      const newPhotos = entryPhotos.filter(p => p.file);
      if (newPhotos.length > 0) {
        try {
          uploadDelay = window.setTimeout(() => setShowUploadProgress(true), 1000);
          const uploaded = await api.uploadReceivingPhotos(newPhotos.map(p => p.file), {
            receiptId: activeReceipt.id,
            receiptEntryId: saved.id,
          });
          saved = uploaded.entry || { ...saved, photos: uploaded.photos || [] };
        } catch (photoError) {
          setError(photoError.message || 'Entry saved, but photos could not be uploaded.');
          setToast('Entry saved, photo upload failed');
        }
      }
      if (uploadDelay) window.clearTimeout(uploadDelay);
      setShowUploadProgress(false);
      if (entry.locationId) saveRecentReceivingLocation(entry.locationId);
      setSavedEntries(prev => editingEntryId
        ? prev.map(item => item.id === saved.id ? saved : item)
        : [...prev, saved]);
      setRecentEntryIds(saved.id ? [saved.id] : []);
      window.setTimeout(() => setRecentEntryIds(cur => cur.includes(saved.id) ? [] : cur), 3200);
      setEditingEntryId('');
      resetActiveEntry(entry.locationId, entry.condition || 'Good');
      if (!newPhotos.length || saved.photos?.length || saved.photoMetadata?.length) {
        setToast(editingEntryId ? 'Item updated' : 'Entry saved');
      }
    } catch (err) {
      if (uploadDelay) window.clearTimeout(uploadDelay);
      setShowUploadProgress(false);
      setError(err.message || 'Could not save entry.');
    } finally {
      setSaving('');
    }
  }

  function startNewSession() {
    setReceipt(null);
    setSavedEntries([]);
    setSession({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal(), notes: '' });
    setEditingEntryId('');
    setError('');
    resetActiveEntry('', 'Good');
  }

  async function selectReceipt(receiptId) {
    if (receipt?.id === receiptId) return;
    setError('');
    try {
      const data = await api.getReceivingSession(receiptId);
      setReceipt(data);
      setSession({
        clientId: data.clientIds?.[0] || '',
        carrier: data.carrier || '',
        tracking: data.tracking || '',
        boxQuantity: data.boxQuantity || 1,
        received: data.received ? toDatetimeLocal(data.received) : toDatetimeLocal(),
        notes: data.notes || '',
      });
      setSavedEntries(data.entries || []);
      setEditingEntryId('');
      resetActiveEntry('', 'Good');
    } catch (err) {
      setError(err.message || 'Could not load receipt.');
    }
  }

  async function saveReceiptHeader() {
    if (!receipt) return;
    setSaving('header');
    setError('');
    try {
      const updated = await api.updateReceivingSession(receipt.id, {
        clientId: session.clientId,
        carrier: session.carrier,
        tracking: session.tracking,
        boxQuantity: Number(session.boxQuantity || 1),
        received: session.received,
        notes: session.notes || '',
      });
      setReceipt(updated);
      setToast('Delivery info saved.');
      allReceipts.reload();
    } catch (err) {
      setError(err.message || 'Could not save delivery info.');
    } finally {
      setSaving('');
    }
  }

  function populateEntryFromSaved(saved) {
    setEntryPhotos(prev => {
      prev.forEach(p => { if (!p.isExisting) URL.revokeObjectURL(p.previewUrl); });
      // Load existing saved photos so they show as thumbnails in the edit modal
      const existingPhotos = (saved.photoMetadata || []).map(p => ({
        id: p.object_key || p.objectKey || p.url || p.public_url,
        previewUrl: p.public_url || p.url || '',
        objectKey: p.object_key || p.objectKey || '',
        name: p.original_filename || p.filename || '',
        isExisting: true,
      })).filter(p => p.previewUrl);
      return existingPhotos;
    });
    setEntryState({
      ...emptyReceiptEntry(),
      productName: saved.productName || saved.name || '',
      skuId: receivingEntrySku(saved),
      description: saved.description || '',
      quantity: saved.quantity || 1,
      locationId: receivingEntryLocationId(saved),
      condition: saved.condition || 'Good',
      notes: saved.notes || '',
    });
    // Restore match state so editing a matched item shows the match, not suggestions
    // API returns `merchStatus` (not matchStatus), fall back to inferring from itemIds
    const effectiveStatus = saved.matchStatus || saved.merchStatus || ((saved.itemIds || []).length ? 'Matched' : '');
    const isMatched = effectiveStatus === 'Matched' || effectiveStatus === 'Validated';
    const needsMatch = effectiveStatus === 'Needs Match' || saved.noClearMatch;
    if (isMatched && (saved.itemIds || []).length > 0) {
      setMatchChoice({
        status: 'matched',
        item: {
          id: saved.itemIds[0],
          name: saved.productName || saved.name || 'Matched Item',
          identifier: receivingEntrySku(saved),
        },
      });
    } else if (needsMatch) {
      setMatchChoice({ status: 'needs', item: null });
    } else {
      setMatchChoice({ status: 'none', item: null });
    }
    setItemMatches([]);
    setPendingCopyEntry(null);
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  function editReceivedItem(saved) {
    populateEntryFromSaved(saved);
    setEditingEntryId(saved.id || '');
    setToast('Editing received item.');
  }

  async function removeReceivedItem(saved) {
    if (!receipt || !saved?.id) return;
    if (!window.confirm(`Remove ${receivingEntryLabel(saved)} from this delivery?`)) return;
    setSaving('remove');
    setError('');
    try {
      await api.deleteReceiptEntry(receipt.id, saved.id);
      setSavedEntries(prev => prev.filter(item => item.id !== saved.id));
      if (editingEntryId === saved.id) {
        setEditingEntryId('');
        resetActiveEntry(entry.locationId, entry.condition || 'Good');
      }
      setToast('Item removed.');
    } catch (err) {
      setError(err.message || 'Could not remove item.');
    } finally {
      setSaving('');
    }
  }

  function copyReceivingEntry(saved) {
    setError('');
    if (receiptEntryHasUnsavedValues(entry, entryPhotos)) {
      setPendingCopyEntry(saved);
      return;
    }
    populateEntryFromSaved(saved);
  }

  function receivedItemMerchStatus(saved) {
    return saved.merchStatus || ((saved.itemIds || []).length ? 'Matched' : 'Received');
  }

  if (clients.error || locations.error) return <div className="error-state">{clients.error || locations.error}</div>;

  return (
    <div className="recv-page">
      {toast && <div className={`receiving-toast ${toast === 'Entry saved' ? 'is-success' : ''}`} role="status">✓ {toast}</div>}
      {previewPhoto && (
        <button type="button" className="receiving-photo-preview" onClick={() => setPreviewPhoto(null)}>
          <img src={previewPhoto.url} alt={previewPhoto.name || 'photo'} />
        </button>
      )}

      {/* Sub-page tab bar */}
      <div className="recv-tabs">
        <button
          type="button"
          className={`recv-tab ${tab === 'new' ? 'is-active' : ''}`}
          onClick={() => { if (tab === 'new' && receipt) { startNewSession(); } else { setTab('new'); } }}
        >
          {receipt ? 'Edit Receipt' : 'New Receipt'}
        </button>
        {receipt && (
          <button
            type="button"
            className="recv-tab-new-btn"
            onClick={() => { startNewSession(); setTab('new'); }}
            title="Start a new receipt"
          >
            + New
          </button>
        )}
        <button
          type="button"
          className={`recv-tab ${tab === 'all' ? 'is-active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Receipts
          {receiptList.length > 0 && <span className="recv-tab-count">{receiptList.length}</span>}
        </button>
      </div>

      {tab === 'new' ? (
        /* ── Three-panel receipt entry layout ── */
        <div className="recv-three-col">

          {/* Panel 1: Receipt Details */}
          <div className="recv-receipt-panel">
            <div className="recv-panel-head">
              <span className="recv-panel-step">1</span>
              <strong className="recv-panel-title">Receipt Details</strong>
            </div>
            <div className="recv-panel-body">
              <div className="recv-field">
                <label>Client</label>
                <select value={session.clientId} onChange={e => setSessionField('clientId', e.target.value)} onBlur={e => autoSaveReceiptHeader({ clientId: e.target.value })}>
                  <option value="">Unknown</option>
                  {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="recv-field">
                <label>Carrier</label>
                <select value={session.carrier} onChange={e => setSessionField('carrier', e.target.value)} onBlur={e => autoSaveReceiptHeader({ carrier: e.target.value })}>
                  <option value="">Unknown</option>
                  {carrierSelectOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="recv-field">
                <label>Tracking Number</label>
                <input value={session.tracking} onChange={e => setSessionField('tracking', e.target.value)} onBlur={e => autoSaveReceiptHeader({ tracking: e.target.value })} placeholder="Optional" />
              </div>
              <div className="recv-field">
                <label>Box Quantity</label>
                <input type="number" min="1" inputMode="numeric" value={session.boxQuantity} onChange={e => setSessionField('boxQuantity', e.target.value)} onBlur={e => autoSaveReceiptHeader({ boxQuantity: Number(e.target.value || 1) })} />
              </div>
              <div className="recv-field">
                <label>Date Received</label>
                <input type="datetime-local" value={session.received} onChange={e => setSessionField('received', e.target.value)} onBlur={e => autoSaveReceiptHeader({ received: e.target.value })} />
              </div>
              <div className="recv-field">
                <label>Notes</label>
                <textarea value={session.notes} onChange={e => setSessionField('notes', e.target.value)} onBlur={e => autoSaveReceiptHeader({ notes: e.target.value })} rows="2" placeholder="Optional" />
              </div>
            </div>
            {!receipt && error && <div className="recv-field-error" style={{ margin: '0 0 8px' }}>{error}</div>}
            {!receipt ? (
              <button type="button" className="recv-create-btn" onClick={createDelivery} disabled={Boolean(saving)}>
                {saving === 'create' ? 'Creating…' : 'Create Receipt →'}
              </button>
            ) : (
              <div className="recv-panel-footer">
                <div className="recv-panel-created">
                  <span>✓ Receipt saved</span>
                  <span className="recv-session-badge">{entryCount} item{entryCount !== 1 ? 's' : ''}</span>
                </div>
                {headerReceivedLabel && <span className="recv-session-time">{headerReceivedLabel}</span>}
              </div>
            )}
          </div>

          {/* Panel 2: Add Item */}
          <div className="recv-item-panel">
            <div className="recv-panel-head">
              <span className={`recv-panel-step${!receipt ? ' is-inactive' : ''}`}>2</span>
              <strong className="recv-panel-title">Add Item</strong>
            </div>
            {!receipt ? (
              <div className="recv-panel-locked">
                <span>Create a receipt first to start adding items.</span>
              </div>
            ) : (
              <>
                {editingEntryId && createPortal(
                  <div
                    className="recv-edit-backdrop"
                    onClick={() => { setEditingEntryId(''); resetActiveEntry('', entry.condition || 'Good'); }}
                  />,
                  document.body
                )}
                <div className={`recv-form${editingEntryId ? ' is-editing' : ''}`}>
                  {editingEntryId && (
                    <div className="recv-edit-modal-header">
                      <span className="recv-edit-modal-title">Edit item</span>
                      <button
                        type="button"
                        className="recv-edit-modal-close"
                        onClick={() => { setEditingEntryId(''); resetActiveEntry('', entry.condition || 'Good'); }}
                      >✕</button>
                    </div>
                  )}
                  <div className="recv-form-content">
                    {pendingCopyEntry && (
                      <div className="receiving-copy-confirm">
                        <span>Replace unsaved entry with this copy?</span>
                        <button type="button" className="btn btn-alt" onClick={() => setPendingCopyEntry(null)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={() => populateEntryFromSaved(pendingCopyEntry)}>Replace</button>
                      </div>
                    )}
                    <div className="recv-photo-row">
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { addEntryPhotos(e.target.files); e.target.value = ''; }} />
                      <input ref={libraryInputRef} type="file" accept="image/*" multiple hidden onChange={e => { addEntryPhotos(e.target.files); e.target.value = ''; }} />
                      {entryPhotos.length > 0 && (
                        <div className="recv-photo-thumbs">
                          {entryPhotos.map(photo => (
                            <button type="button" className={`mobile-thumb ${showUploadProgress ? 'is-uploading' : ''}`} key={photo.id} onClick={() => setPreviewPhoto({ url: photo.previewUrl, name: photo.name })}>
                              <img src={photo.previewUrl} alt="" />
                              <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); removeEntryPhoto(photo.id); }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); removeEntryPhoto(photo.id); } }}>×</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="recv-photo-btns">
                        <button type="button" className="recv-camera-btn" onClick={() => cameraInputRef.current?.click()}>📷 Take Photo</button>
                        <button type="button" className="recv-library-btn" onClick={() => libraryInputRef.current?.click()}>🖼 Library</button>
                      </div>
                      {showUploadProgress && <div className="receiving-upload-progress" role="status"><span />Uploading...</div>}
                    </div>
                    <div className="recv-field recv-field-product">
                      <label>Product Name</label>
                      <input ref={productNameRef} value={entry.productName} onChange={e => { setEntry('productName', e.target.value); if (error) setError(''); }} placeholder="Name printed on package" autoComplete="off" />
                    </div>
                    <div className="recv-field">
                      <label>SKU / Identifier</label>
                      <input value={entry.skuId} onChange={e => setEntry('skuId', e.target.value)} placeholder="Optional" autoComplete="off" />
                    </div>
                    <div className="receiving-match-field">
                      {matchChoice.status === 'matched' && matchChoice.item ? (
                        <div className="receiving-match-selected">
                          <span>
                            <strong>
                              {itemMatchTitle(matchChoice.item)}
                              <button
                                type="button"
                                className="recv-copy-name-btn"
                                title="Copy product name"
                                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(itemMatchTitle(matchChoice.item)); }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              </button>
                            </strong>
                            <small>{[itemMatchIdentifier(matchChoice.item), matchChoice.item.brand, matchChoice.item.parentJobNumber ? `Job ${matchChoice.item.parentJobNumber}` : ''].filter(Boolean).join(' · ')}</small>
                          </span>
                          <button type="button" onClick={() => { setPrevMatchedItemId(matchChoice.item?.id || ''); setMatchChoice({ status: 'none', item: null }); }}>Change</button>
                        </div>
                      ) : matchChoice.status === 'needs' ? (
                        <div className="receiving-match-selected is-unmatched">
                          <span><strong>No Clear Match</strong><small>Will go to PM verification.</small></span>
                          <button type="button" onClick={() => setMatchChoice({ status: 'none', item: null })}>Change</button>
                        </div>
                      ) : showMatchSuggestions ? (
                        <div className="receiving-match-panel">
                          <div className="receiving-match-panel-head">
                            <span>{matchLoading ? 'Searching items…' : itemMatches.length ? 'Suggested matches' : 'No matches found'}</span>
                            <button type="button" onClick={() => setMatchChoice({ status: 'needs', item: null })}>No clear match</button>
                          </div>
                          {itemMatches.length > 0 && (
                            <div className="receiving-match-list">
                              {itemMatches.slice(0, 5).map((item, i) => (
                                <button type="button" className={`receiving-match-option ${i === 0 ? 'is-best' : ''}`} key={item.id} onClick={() => setMatchChoice({ status: 'matched', item })}>
                                  <span>
                                    <strong>{itemMatchTitle(item)}</strong>
                                    <small>{[itemMatchIdentifier(item), item.brand, item.parentJobNumber ? `Job ${item.parentJobNumber}` : ''].filter(Boolean).join(' · ')}</small>
                                  </span>
                                  {i === 0 && <em>Best</em>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="recv-row">
                      <div className="recv-field recv-field-qty">
                        <label>Qty</label>
                        <div className="recv-stepper">
                          <button type="button" onClick={() => setEntry('quantity', Math.max(1, Number(entry.quantity || 1) - 1))}>−</button>
                          <input type="number" min="1" inputMode="numeric" value={entry.quantity} onChange={e => setEntry('quantity', e.target.value)} />
                          <button type="button" onClick={() => setEntry('quantity', Number(entry.quantity || 0) + 1)}>+</button>
                        </div>
                      </div>
                      <div className="recv-field recv-field-location">
                        <label>Storage Location</label>
                        <select value={entry.locationId} onChange={e => setEntry('locationId', e.target.value)}>
                          <option value="">Select location…</option>
                          {locationList.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <details className="recv-more">
                      <summary>More options</summary>
                      <div className="recv-more-fields">
                        <div className="recv-field">
                          <label>Condition</label>
                          <select value={entry.condition} onChange={e => setEntry('condition', e.target.value)}>
                            <option>Good</option>
                            <option>Damaged</option>
                            <option>Unknown</option>
                          </select>
                        </div>
                        <div className="recv-field">
                          <label>Description</label>
                          <input value={entry.description} onChange={e => setEntry('description', e.target.value)} placeholder="Flavor, size, damage detail…" />
                        </div>
                        <div className="recv-field">
                          <label>Notes</label>
                          <textarea value={entry.notes} onChange={e => setEntry('notes', e.target.value)} rows="2" placeholder="Optional" />
                        </div>
                      </div>
                    </details>
                    {error && <div className="recv-field-error">{error}</div>}
                    <button type="button" className="recv-save-btn" onClick={saveNext} disabled={Boolean(saving)}>
                      {saving === 'entry' ? 'Saving…' : editingEntryId ? 'Update item' : 'Save & next →'}
                    </button>
                  </div>{/* end recv-form-content */}
                </div>
              </>
            )}
          </div>

          {/* Panel 3: Items Logged */}
          <div className="recv-list">
            <div className="recv-panel-head">
              <span className={`recv-panel-step${!receipt ? ' is-inactive' : ''}`}>3</span>
              <strong className="recv-panel-title">{entryCount} Item{entryCount !== 1 ? 's' : ''} Logged</strong>
            </div>
            <div className="recv-list-items">
              {savedEntries.length === 0 ? (
                <div className="receiving-current-empty">Items you log will appear here.</div>
              ) : [...savedEntries].reverse().map((saved, index) => {
                const locationId = saved.locationIds?.[0] || saved.locationId;
                const locationName = locationNameById[locationId] || '';
                const merchStatus = receivedItemMerchStatus(saved);
                const statusClass = (merchStatus === 'Matched' || merchStatus === 'Validated') ? 'is-ok' : 'is-warn';
                const statusIcon = (merchStatus === 'Matched' || merchStatus === 'Validated') ? '✓' : '!';
                return (
                  <div
                    key={saved.id || index}
                    className={`receiving-current-row ${recentEntryIds.includes(saved.id) ? 'is-recent' : ''} ${editingEntryId === saved.id ? 'is-editing' : ''}`}
                    role="button" tabIndex={0}
                    onClick={() => editReceivedItem(saved)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editReceivedItem(saved); } }}
                  >
                    <RecordThumbnail record={saved} className="receiving-current-thumb" />
                    <span className="receiving-current-copy">
                      <strong>{receivingEntryLabel(saved)}</strong>
                      <small>Qty {saved.quantity || 1}{locationName ? ` · ${locationName}` : ''}</small>
                      <small className="receiving-status-line">
                        <span className={statusClass}>{statusIcon} {merchStatus}</span>
                      </small>
                    </span>
                    <span className="receiving-current-actions">
                      <button type="button" className="receiving-current-copy-button is-danger" onClick={e => { e.stopPropagation(); removeReceivedItem(saved); }}>×</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* ── All Receipts view ── */
        <div className="recv-all-view">
          <div className="recv-all-toolbar">
            <input
              className="recv-all-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search receipts by client, carrier, tracking…"
              autoFocus
            />
            <div className="recv-all-view-toggle">
              <button type="button" className={`recv-all-view-btn${allReceiptsView === 'receipts' ? ' is-active' : ''}`} onClick={() => setAllReceiptsView('receipts')}>By Receipt</button>
              <button type="button" className={`recv-all-view-btn${allReceiptsView === 'items' ? ' is-active' : ''}`} onClick={() => setAllReceiptsView('items')}>By Item</button>
            </div>
          </div>
          {isSearching && (
            <div className="recv-all-scope-note">{filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found · <button type="button" className="recv-all-scope-search" onClick={() => setSearch('')}>Clear</button></div>
          )}
          <div className="recv-cal-grid">
            {allReceipts.loading && <div className="empty-state" style={{gridColumn:'1/-1'}}>Loading…</div>}
            {!allReceipts.loading && (() => {
              // Build the 5 day columns (today and 4 prior days)
              const today = new Date(); today.setHours(0,0,0,0);
              const cols = Array.from({ length: 5 }, (_, i) => {
                const d = new Date(today); d.setDate(today.getDate() - (4 - i));
                return d;
              });
              function sameDay(d1, d2) {
                return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
              }
              function colLabel(d) {
                if (sameDay(d, today)) return { day: 'Today', num: d.getDate(), isToday: true };
                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                if (sameDay(d, yesterday)) return { day: 'Yesterday', num: d.getDate(), isToday: false };
                return { day: d.toLocaleDateString([], { weekday: 'short' }), num: d.getDate(), isToday: false };
              }
              // When searching, fall back to day-grouped list instead of columns
              if (isSearching) {
                const grouped = {};
                filteredReceipts.forEach(r => {
                  const key = r.received ? new Date(r.received).toDateString() : 'Unknown';
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(r);
                });
                if (filteredReceipts.length === 0) return <div className="empty-state" style={{gridColumn:'1/-1'}}>No receipts match that search.</div>;
                return (
                  <div className="recv-search-results">
                    {Object.entries(grouped).map(([dateStr, receipts]) => (
                      <div key={dateStr} className="recv-search-day">
                        <div className="recv-search-day-label">{dateStr === 'Unknown' ? 'Unknown date' : new Date(dateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        {receipts.map(r => {
                          const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                          const entries = r.entries || [];
                          const matchedCount = entries.filter(e => e.merchStatus === 'Matched' || e.merchStatus === 'Validated').length;
                          const pendingCount = entries.length - matchedCount;
                          return (
                            <button key={r.id} type="button" className="recv-search-row" onClick={() => { selectReceipt(r.id); setTab('new'); }}>
                              <div className="recv-day-row-main"><strong>{clientName}</strong><span>{[r.carrier, r.tracking].filter(Boolean).join(' · ')}</span></div>
                              <div className="recv-day-row-right">
                                {matchedCount > 0 && <span className="recv-sidebar-badge is-ok">{matchedCount} matched</span>}
                                {pendingCount > 0 && <span className="recv-sidebar-badge is-warn">{pendingCount} unmatched</span>}
                                <span className="recv-all-item-edit">Open →</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              }
              // Normal 5-column calendar view
              return cols.map(colDate => {
                const { day, num, isToday } = colLabel(colDate);
                const colReceipts = allReceiptsView === 'receipts'
                  ? receiptList.filter(r => r.received && sameDay(new Date(r.received), colDate))
                  : [];
                const colItems = allReceiptsView === 'items'
                  ? receiptList.filter(r => r.received && sameDay(new Date(r.received), colDate))
                      .flatMap(r => {
                        const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                        return (r.entries || []).map(e => ({ ...e, _clientName: clientName, _receiptId: r.id }));
                      })
                  : [];
                const cards = allReceiptsView === 'receipts' ? colReceipts : colItems;
                return (
                  <div key={colDate.toISOString()} className={`recv-cal-col${isToday ? ' is-today' : ''}`}>
                    <div className="recv-cal-col-head">
                      <span className="recv-cal-day-name">{day}</span>
                      <span className={`recv-cal-day-num${isToday ? ' is-today' : ''}`}>{num}</span>
                    </div>
                    <div className="recv-cal-col-body">
                      {cards.length === 0 && <div className="recv-cal-empty">—</div>}
                      {allReceiptsView === 'receipts' && colReceipts.map(r => {
                        const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                        const entries = r.entries || [];
                        const matchedCount = entries.filter(e => e.merchStatus === 'Matched' || e.merchStatus === 'Validated').length;
                        const pendingCount = entries.length - matchedCount;
                        return (
                          <button key={r.id} type="button" className="recv-cal-card" onClick={() => { selectReceipt(r.id); setTab('new'); }}>
                            <strong className="recv-cal-card-client">{clientName}</strong>
                            {r.carrier && <span className="recv-cal-card-meta">{[r.carrier, r.tracking].filter(Boolean).join(' · ')}</span>}
                            <div className="recv-cal-card-badges">
                              {matchedCount > 0 && <span className="recv-sidebar-badge is-ok">{matchedCount} matched</span>}
                              {pendingCount > 0 && <span className="recv-sidebar-badge is-warn">{pendingCount} unmatched</span>}
                            </div>
                          </button>
                        );
                      })}
                      {allReceiptsView === 'items' && colItems.map((item, i) => {
                        const isMatched = item.merchStatus === 'Matched' || (item.itemIds || []).length > 0;
                        return (
                          <div key={item.id || i} className={`recv-cal-card recv-cal-card--item${isMatched ? ' is-matched' : ''}`}>
                            <strong className="recv-cal-card-client">{item.productName || item.name || '—'}</strong>
                            <span className="recv-cal-card-meta">{item._clientName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {!isSearching && (
            <div className="recv-all-scope-note" style={{marginTop: 8}}>
              <button type="button" className="recv-all-scope-search" onClick={() => setSearch(' ')}>Search all history</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JobsPage({ navigate }) {
  const clients = useResource(() => api.listClients());
  const [clientFilter, setClientFilter] = useState('');
  const jobs = useResource(
    () => api.listJobs(clientFilter || undefined),
    [clientFilter]
  );

  const clientList = clients.data?.records ?? [];
  const jobList    = jobs.data?.records ?? [];

  return (
    <div className="page-stack">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-bar">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">All clients</option>
            {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('new-job')}>
          <Icon.Add /> New job
        </button>
      </div>

      {jobs.error && <div className="error-state">{jobs.error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Job</th>
              <th>Parent Job Number</th>
              <th>Period</th>
              <th>Deadline</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.loading && (
              <tr><td colSpan="7" className="empty-state">Loading…</td></tr>
            )}
            {!jobs.loading && jobList.length === 0 && (
              <tr><td colSpan="7" className="empty-state">No jobs found</td></tr>
            )}
            {jobList.map(job => {
              const client = clientList.find(c => job.clientIds?.includes(c.id));
              return (
                <tr key={job.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <ClientLogo clientId={client?.id} clientName={client?.name} size={24} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{client?.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{job.name}</td>
                  <td><code>{job.parentJobNumber || job.extId || '—'}</code></td>
                  <td>{job.period || '—'}</td>
                  <td><DeadlineBadge date={job.deadline} /></td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => navigate('skus', { jobId: job.id })}>
                      Items <Icon.ChevronRight />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── New Job form ──────────────────────────────────────────────────────────────
function NewJobPage({ navigate }) {
  const clients = useResource(() => api.listClients());
  const clientList = clients.data?.records ?? [];

  const [form, setForm] = useState({
    clientId: '', job: '', parentJobNumber: '', period: '', deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.clientId)  { setError('Select a client'); return; }
    if (!form.job) { setError('Job name is required'); return; }
    setSaving(true); setError(null);
    try {
      await api.createJob(form);
      navigate('jobs');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-wrap">
      <div className="form-title">New Job</div>
      {error && <div className="error-state">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field full">
            <label>Client</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} required>
              <option value="">Select client…</option>
              {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Job Name</label>
            <input value={form.job} onChange={e => set('job', e.target.value)} placeholder="e.g. Kroger July Job" required />
          </div>
          <div className="field">
            <label>Parent Job Number</label>
            <input value={form.parentJobNumber} onChange={e => set('parentJobNumber', e.target.value)} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Period</label>
            <input value={form.period} onChange={e => set('period', e.target.value)} placeholder="e.g. Q1 2024" />
          </div>
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </div>
        </div>
        <div className="form-actions new-job-actions">
          <button type="button" className="btn" onClick={() => navigate('jobs')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Items page ────────────────────────────────────────────────────────────────
function SkusPage({ navigate, jobId: initJobId, queue: initQueue }) {
  const jobs = useResource(() => api.listJobs());
  const clients = useResource(() => api.listClients());
  const [jobFilter, setJobFilter] = useState(initJobId ?? '');
  const [queueFilter, setQueueFilter] = useState(initQueue ?? '');
  const items = useResource(
    () => api.listSkus(jobFilter || undefined),
    [jobFilter]
  );

  const jobList = jobs.data?.records ?? [];
  const clientList = clients.data?.records ?? [];
  const selectedJob = jobList.find(job => job.id === jobFilter);
  const scopedClientId = selectedJob?.clientIds?.length === 1 ? selectedJob.clientIds[0] : '';
  const identifierLabel = getIdentifierLabel({ clientId: scopedClientId, clients: clientList, allClients: !scopedClientId });
  const [itemList, setItemList] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemDetail, setItemDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const itemReferenceEntries = referenceDataEntries(itemDetail);
  const selectedQueue = queueForId(queueFilter);
  const visibleItems = selectedQueue ? itemList.filter(selectedQueue.matches) : itemList;

  useEffect(() => {
    setJobFilter(initJobId ?? '');
  }, [initJobId]);

  useEffect(() => {
    setQueueFilter(initQueue ?? '');
  }, [initQueue]);

  useEffect(() => {
    if (items.data?.records) setItemList(items.data.records);
  }, [items.data]);

  function jobNames(item) {
    const names = (item.jobIds ?? [])
      .map(id => jobList.find(job => job.id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  async function selectItem(itemId) {
    setSelectedItemId(itemId);
    setDetailError('');
    try {
      const data = await api.getItem(itemId);
      setItemDetail(data.record);
    } catch (error) {
      setItemDetail(null);
      setDetailError(error.message);
    }
  }

  return (
    <div className="page-stack">
      <div className="filter-bar">
        <select value={queueFilter} onChange={e => setQueueFilter(e.target.value)}>
          <option value="">All queues</option>
          {DASHBOARD_QUEUES.map(queue => (
            <option key={queue.id} value={queue.id}>{queue.title}</option>
          ))}
        </select>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
          <option value="">All jobs</option>
          {jobList.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
      </div>

      {items.error && <div className="error-state">{items.error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Item</th>
              <th>{identifierLabel}</th>
              <th>Product or File Name</th>
              <th>Item Job Number</th>
              <th>Output Type</th>
              <th>Brand</th>
              <th>Job</th>
              <th>Readiness</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.loading && <tr><td colSpan="10" className="empty-state">Loading…</td></tr>}
            {!items.loading && visibleItems.length === 0 && (
              <tr><td colSpan="10" className="empty-state">No Items found</td></tr>
            )}
            {visibleItems.map(item => (
              <tr key={item.id} onClick={() => selectItem(item.id)} style={{ cursor: 'pointer' }}>
                <td className="item-thumb-cell"><RecordThumbnail record={item} className="item-list-thumb" /></td>
                <td style={{ fontWeight: 600 }}>{item.name || '—'}</td>
                <td>
                  {item.identifier
                    ? <code>{item.identifier}</code>
                    : <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>Missing {identifierLabel}</span>
                  }
                </td>
                <td>{item.product || '—'}</td>
                <td>{item.itemJobNumber || '—'}</td>
                <td>{item.output || '—'}</td>
                <td>{item.brand || '—'}</td>
                <td>{jobNames(item)}</td>
                <td><ReadinessBadge readiness={item.readiness} /></td>
                <td>{item.received ? <span className="badge badge-green">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detailError && <div className="error-state">{detailError}</div>}
      {itemDetail && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Photography Readiness</span>
            <ReadinessBadge readiness={itemDetail.readiness} />
          </div>
          <div className="settings-list">
            <div className="setting-row"><span className="setting-key">{getIdentifierLabel({ record: itemDetail, clients: clientList })}</span><span className="setting-val">{itemDetail.identifier || 'Missing'}</span></div>
            <div className="setting-row"><span className="setting-key">Product or File Name</span><span className="setting-val">{itemDetail.product || 'Missing'}</span></div>
            <div className="setting-row"><span className="setting-key">Item Job Number</span><span className="setting-val">{itemDetail.itemJobNumber || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Description</span><span className="setting-val">{itemDetail.description || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Output Type</span><span className="setting-val">{itemDetail.output || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Master or Variant</span><span className="setting-val">{itemDetail.masterOrVariant || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Pickup Job Number</span><span className="setting-val">{itemDetail.pickupJobNumber || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Merchandise</span><span className="setting-val">{itemDetail.received || itemDetail.receiptIds?.length ? 'Received' : 'Not received'}</span></div>
            <div className="setting-row"><span className="setting-key">Artwork</span><span className="setting-val">{itemDetail.artworkReceived ? 'Received' : 'Not received'}</span></div>
            {(itemDetail.readiness?.missing ?? []).map(problem => (
              <div className="setting-row" key={problem}><span className="setting-key">Blocker</span><span className="setting-val">{problem}</span></div>
            ))}
            {(itemDetail.readiness?.warnings ?? []).map(warning => (
              <div className="setting-row" key={warning}><span className="setting-key">Warning</span><span className="setting-val">{warning}</span></div>
            ))}
          </div>
          {itemReferenceEntries.length > 0 && (
            <>
              <div className="panel-header">
                <span className="panel-title">Reference Data</span>
              </div>
              <div className="settings-list">
                {itemReferenceEntries.map(([key, value]) => (
                  <div className="setting-row" key={key}>
                    <span className="setting-key">{key}</span>
                    <span className="setting-val">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add SKU form ──────────────────────────────────────────────────────────────
function AddSkuForm({ jobId, onSaved, onCancel, identifierLabel = 'Identifier' }) {
  const [form, setForm] = useState({
    productId: '', product: '', itemJobNumber: '', description: '', brand: '',
    category: '', output: '', masterOrVariant: '', pickupJobNumber: '', notes: '', merchVerified: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.productId) { setError(`${identifierLabel} is required`); return; }
    setSaving(true); setError(null);
    try {
      const sku = await api.createSku({ jobId, ...form });
      onSaved(sku);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-wrap" style={{ maxWidth: '100%' }}>
      <div className="form-title">Add SKU</div>
      {error && <div className="error-state">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>{identifierLabel} *</label>
            <input value={form.productId} onChange={e => set('productId', e.target.value)} placeholder="012345678901" required />
          </div>
          <div className="field">
            <label>Brand</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} />
          </div>
          <div className="field">
            <label>Product or File Name</label>
            <input value={form.product} onChange={e => set('product', e.target.value)} />
          </div>
          <div className="field">
            <label>Item Job Number</label>
            <input value={form.itemJobNumber} onChange={e => set('itemJobNumber', e.target.value)} />
          </div>
          <div className="field">
            <label>Output Type</label>
            <select value={form.output} onChange={e => set('output', e.target.value)}>
              <option value="">Select output...</option>
              <option>Photo Only</option>
              <option>Render Only</option>
              <option>Photo + Render</option>
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <input value={form.category} onChange={e => set('category', e.target.value)} />
          </div>
          <div className="field">
            <label>Master or Variant</label>
            <select value={form.masterOrVariant} onChange={e => set('masterOrVariant', e.target.value)}>
              <option value="">Select type...</option>
              <option>Master</option>
              <option>Variant</option>
            </select>
          </div>
          <div className="field">
            <label>Pickup Job Number</label>
            <input value={form.pickupJobNumber} onChange={e => set('pickupJobNumber', e.target.value)} />
          </div>
          <div className="field full">
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows="3" />
          </div>
          <div className="field full">
            <label>Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-checkbox">
              <input type="checkbox" checked={form.merchVerified} onChange={e => set('merchVerified', e.target.checked)} />
              PM verified merchandise
            </label>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add SKU'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const { auth } = useAuth();
  const { data, loading, error } = useResource(() => api.settings());
  const clients = useResource(() => api.listClients());
  const s = data?.settings;
  const clientList = clients.data?.records ?? [];
  const [randomizing, setRandomizing] = useState(false);
  const [randomizeSummary, setRandomizeSummary] = useState(null);
  const [randomizeError, setRandomizeError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearSummary, setClearSummary] = useState(null);
  const [clearError, setClearError] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const sectionOpen = key => !collapsedSections[key];
  const toggleSection = key => setCollapsedSections(sections => ({ ...sections, [key]: !sections[key] }));

  function SectionHeader({ id, title }) {
    const open = sectionOpen(id);
    return (
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        <button className="panel-toggle" type="button" onClick={() => toggleSection(id)} aria-expanded={open}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
    );
  }

  async function randomizeDemoData() {
    if (!window.confirm('Randomize existing demo records for dashboard and workflow testing? This updates existing Airtable records directly.')) return;
    setRandomizing(true);
    setRandomizeError('');
    setRandomizeSummary(null);
    try {
      const data = await api.randomizeDemoData();
      setRandomizeSummary(data.summary || {});
    } catch (error) {
      setRandomizeError(error.message);
    } finally {
      setRandomizing(false);
    }
  }

  async function clearCoreTables() {
    const typed = window.prompt('This will delete all rows from Airtable tables Items, History, Jobs, and Imports. Type DELETE to continue.');
    if (typed !== 'DELETE') return;
    setClearing(true);
    setClearError('');
    setClearSummary(null);
    try {
      const data = await api.clearCoreTables();
      setClearSummary(data.summary || {});
    } catch (error) {
      setClearError(error.message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="page-stack">
      {error && <div className="error-state">{error}</div>}
      <div className="panel">
        <SectionHeader id="airtable" title="Airtable connection" />
        {sectionOpen('airtable') && <div className="settings-list">
          <div className="setting-row">
            <span className="setting-key">Status</span>
            {loading
              ? <span className="setting-val">Checking…</span>
              : s?.airtableConfigured
                ? <span className="badge badge-green">✓ Connected</span>
                : <span className="badge badge-red">Not connected</span>
            }
          </div>
          {s && (
            <>
              <div className="setting-row">
                <span className="setting-key">Base ID</span>
                <span className="setting-val">{s.base}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">Clients table</span>
                <span className="setting-val">{s.tables?.clients}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">Jobs table</span>
                <span className="setting-val">{s.tables?.jobs}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">SKUs table</span>
                <span className="setting-val">{s.tables?.skus}</span>
              </div>
            </>
          )}
          {!loading && !s?.airtableConfigured && (
            <div className="setting-row">
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Add <code>VITE_AIRTABLE_TOKEN=pat…</code> to <code>frontend/.env</code> then restart Vite.
              </span>
            </div>
          )}
        </div>}
      </div>
      <div className="panel requirements-panel">
        <SectionHeader id="requirements" title="Photography Requirements" />
        {clients.error && <div className="error-state">{clients.error}</div>}
        {sectionOpen('requirements') && <div className="table-wrap requirements-table">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Identifier Type</th>
                <th>Required Fields</th>
                <th>Artwork</th>
                <th>Merchandise</th>
              </tr>
            </thead>
            <tbody>
              {clients.loading && <tr><td colSpan="5" className="empty-state">Loading clients…</td></tr>}
              {!clients.loading && clientList.map(client => (
                <tr key={client.id}>
                  <td>
                    <div className="requirements-client">
                      <span>{client.name}</span>
                      <small>{client.identifierLabel || 'Identifier'}</small>
                    </div>
                  </td>
                  <td><span className="requirements-code">{client.codeType || '—'}</span></td>
                  <td>
                    <div className="requirements-chips">
                      {((client.requiredPhotographyFields ?? []).length ? client.requiredPhotographyFields : ['Identifier']).map(field => (
                        <span className="requirements-chip" key={field}>{field}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${client.artworkRequirement === 'Required' ? 'badge-amber' : 'badge-neutral'}`}>
                      {client.artworkRequirement || 'Optional'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${client.merchandiseRequired === false ? 'badge-neutral' : 'badge-blue'}`}>
                      {client.merchandiseRequired === false ? 'Not required' : 'Required'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
      {auth?.role === 'Admin' && (
        <div className="panel">
          <SectionHeader id="users" title="Users" />
          {sectionOpen('users') && <UsersSection />}
        </div>
      )}
      {s?.development && (
        <div className="panel">
          <SectionHeader id="developer" title="Developer Tools" />
          {sectionOpen('developer') && <>
          <div className="settings-list">
            <div className="setting-row">
              <span className="setting-key">Randomize Demo Data</span>
              <span className="setting-val">Update existing demo records so dashboard queues have test data.</span>
              <button className="btn btn-primary" type="button" onClick={randomizeDemoData} disabled={randomizing}>
                {randomizing ? 'Randomizing…' : 'Randomize Demo Data'}
              </button>
            </div>
            <div className="setting-row setting-row-danger">
              <span className="setting-key">Clear Core Tables</span>
              <span className="setting-val">Delete all rows from Items, History, Jobs, and Imports.</span>
              <button className="btn btn-danger" type="button" onClick={clearCoreTables} disabled={clearing}>
                {clearing ? 'Deleting…' : 'Delete Rows'}
              </button>
            </div>
          </div>
          {randomizeError && <div className="error-state">{randomizeError}</div>}
          {randomizeSummary && (
            <div className="settings-list">
              <div className="setting-row"><span className="setting-key">Items updated</span><span className="setting-val">{randomizeSummary.itemsUpdated ?? 0}</span></div>
              <div className="setting-row"><span className="setting-key">Issues updated</span><span className="setting-val">{randomizeSummary.issuesUpdated ?? 0}</span></div>
              <div className="setting-row"><span className="setting-key">Clients updated</span><span className="setting-val">{randomizeSummary.clientsUpdated ?? 0}</span></div>
              {(randomizeSummary.warnings ?? []).map(warning => (
                <div className="setting-row" key={warning}><span className="setting-key">Warning</span><span className="setting-val">{warning}</span></div>
              ))}
            </div>
          )}
          {clearError && <div className="error-state">{clearError}</div>}
          {clearSummary && (
            <div className="settings-list">
              {Object.values(clearSummary).map(table => (
                <div className="setting-row" key={table.table}>
                  <span className="setting-key">{table.table}</span>
                  <span className="setting-val">{table.deleted ?? 0} deleted</span>
                </div>
              ))}
            </div>
          )}
          </>}
        </div>
      )}
    </div>
  );
}

// ── Intake page ──────────────────────────────────────────────────────────────
const INTAKE_TARGET_LABELS = {
  'Item Name': 'Item Name',
  Identifier: 'Identifier',
  'Product or File Name': 'Product or File Name',
  'Product/File Name': 'Product or File Name',
  'Product Name': 'Product or File Name',
  Description: 'Description',
  'Item Job Number': 'Item Job Number',
  'Output Type': 'Output Type',
  'Master or Variant': 'Master or Variant',
  'Pickup Job Number': 'Pickup Job Number',
  Brand: 'Brand',
  'Parent Job Number': 'Parent Job Number',
  'Due Date': 'Due Date',
  Notes: 'Notes',
  'Job Name': 'Job Name',
  'Reference Data': 'Reference Data',
};

const INTAKE_FALLBACK_TARGET_DESCRIPTIONS = {
  'Item Name': 'Optional item display name in the app.',
  Identifier: 'Client product identifier.',
  'Product or File Name': 'Product or file name.',
  Description: 'Longer source product or item description.',
  'Item Job Number': 'Row-level job or project number for the item.',
  'Output Type': 'Photo Only, Render Only, or Photo + Render.',
  'Master or Variant': 'Whether this item is a master or a variant.',
  'Pickup Job Number': 'Previous production job number for variant pickup work.',
  Brand: 'Product brand.',
  'Parent Job Number': 'Batch-level number edited on the selected Job.',
  'Due Date': 'Job due date when present in the source spreadsheet.',
  Notes: 'Source notes that describe the item.',
  'Job Name': 'Human-readable job or group name.',
  'Reference Data': 'Preserve source values as item reference JSON.',
};

const INTAKE_REQUIRED_TARGETS = ['Identifier'];
const KNOWN_INTAKE_MAPPINGS = {
  kroger: { 'Job #': 'Item Job Number', Description: 'Description', UPC: 'Identifier', Brand: 'Brand', 'Product Received': 'Item Name', 'Output Type': 'Output Type', Notes: 'Notes' },
  unfi: { 'Project Number': 'Item Job Number', Description: 'Description', UPC: 'Identifier', 'Output Type': 'Output Type', Notes: 'Notes' },
  smithfield: { 'Job #': 'Item Job Number', 'GAR #': 'Identifier', Brand: 'Brand', 'Product Description': 'Description', Output: 'Output Type', Notes: 'Notes' },
};
const INTAKE_TARGET_FIELDS = {
  'Job Name': 'jobName', 'Parent Job Number': 'parentJobNumber', 'Due Date': 'due',
  'Item Name': 'itemName', Identifier: 'id', 'Product or File Name': 'product', 'Product/File Name': 'product', 'Product Name': 'product', Description: 'description', 'Item Job Number': 'itemJobNumber', 'Output Type': 'output', 'Master or Variant': 'masterOrVariant', 'Pickup Job Number': 'pickupJobNumber', Brand: 'brand', Notes: 'notes',
};
const INTAKE_WIZARD_STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'map', label: 'Map Columns' },
  { id: 'validate', label: 'Validate & Fix' },
  { id: 'summary', label: 'Summary' },
];

function mappingTargetLabel(target, identifierLabel = 'Identifier') {
  if (target === 'Identifier') return identifierLabel || 'Identifier';
  return INTAKE_TARGET_LABELS[target] || target || '';
}
function normalizeHeader(header) { return String(header || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function headerMatches(header, patterns) {
  const normalized = normalizeHeader(header);
  return patterns.some(pattern => normalized === pattern || normalized.includes(pattern));
}
function firstAvailableHeader(headers, used, patterns) {
  return (headers || []).find(header => !used.has(header) && headerMatches(header, patterns));
}
function buildInitialColumnMapping(headers, clientName) {
  const known = KNOWN_INTAKE_MAPPINGS[(clientName || '').trim().toLowerCase()] || {};
  const mapping = (headers || []).reduce((next, header) => ({ ...next, [header]: 'Ignore' }), {});
  const used = new Set();
  Object.entries(known).forEach(([source, target]) => {
    if ((headers || []).includes(source)) { mapping[source] = target; used.add(source); }
  });
  if (!Object.values(mapping).includes('Item Name')) {
    const itemName = firstAvailableHeader(headers, used, ['productreceived', 'productdescription', 'itemname', 'itemdescription', 'description']);
    if (itemName) { mapping[itemName] = 'Item Name'; used.add(itemName); }
  }
  [
    ['Identifier', ['upc', 'gtin', 'gar', 'itemnumber', 'sku']],
    ['Product or File Name', ['productfilename', 'productname']],
    ['Description', ['description', 'productdescription', 'productreceived', 'itemdescription']],
    ['Item Job Number', ['jobnumber', 'jobid', 'job', 'projectnumber', 'project']],
    ['Output Type', ['outputtype', 'output']],
    ['Master or Variant', ['masterorvariant', 'mastervariant', 'varianttype']],
    ['Pickup Job Number', ['pickupjobnumber', 'pickupjob', 'previousjobnumber']],
    ['Brand', ['brand']],
    ['Notes', ['notes', 'note']],
  ].forEach(([target, patterns]) => {
    if (Object.values(mapping).includes(target)) return;
    const header = firstAvailableHeader(headers, used, patterns);
    if (header) { mapping[header] = target; used.add(header); }
  });
  return mapping;
}
function targetMappingFromSourceMapping(sourceMapping) {
  return Object.entries(sourceMapping || {}).reduce((targets, [source, target]) => {
    if (target && target !== 'Ignore' && target !== 'Reference Data' && !targets[target]) targets[target] = source;
    return targets;
  }, {});
}
function requiredMappingGaps(targetMapping) {
  const mapped = new Set(Object.entries(targetMapping || {}).filter(([, source]) => source).map(([target]) => target));
  return INTAKE_REQUIRED_TARGETS.filter(target => !mapped.has(target));
}
function mappingForApi(sourceMapping, targetMapping, importSettings = {}) {
  return {
    ...sourceMapping,
    __targetMapping: targetMapping,
    ...(importSettings.mode === 'existing' ? {
      __existingJobId: importSettings.existingJobId,
      __existingJobName: importSettings.existingJobName || '',
    } : {}),
    ...(importSettings.mode === 'single' ? { __singleJobName: importSettings.singleJobName } : {}),
    ...(importSettings.mode === 'group' ? { __jobGroupField: importSettings.groupField } : {}),
  };
}
function MappingHeader({ children, target, showUnmapped = false }) {
  const isMapped = Boolean(target);
  return (
    <th className={isMapped ? 'is-mapped-column' : showUnmapped ? 'is-unmapped-column' : ''}>
      <span>{children}</span>
      {isMapped ? <small>↓ {target}</small> : showUnmapped ? <small>Unmapped</small> : null}
    </th>
  );
}

function IntakePage({ navigate }) {
  const clients = useResource(() => api.intakeListClients());
  const mappingTargets = useResource(() => api.intakeMappingTargets());
  const clientList = clients.data?.records ?? [];
  const [clientId, setClientId] = useState('');
  const intakeJobs = useResource(() => clientId ? api.listJobs(clientId) : Promise.resolve({ records: [] }), [clientId]);
  const intakeJobList = intakeJobs.data?.records ?? [];
  const selectedClient = clientList.find(client => client.id === clientId);
  const identifierLabel = getIdentifierLabel({ client: selectedClient });
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [review, setReview] = useState(null);
  const [editableRows, setEditableRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [importId, setImportId] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [targetMapping, setTargetMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showImportSettings, setShowImportSettings] = useState(false);
  const [importSettings, setImportSettings] = useState({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });

  const targetDescriptions = { ...INTAKE_FALLBACK_TARGET_DESCRIPTIONS, ...Object.fromEntries((mappingTargets.data?.targets ?? []).map(item => [item.target, item.description])) };
  const headers = preview?.columnHeaders ?? [];
  const sourceColumnMappings = headers.reduce((labels, header) => {
    const mappedTargets = Object.entries(targetMapping).filter(([, source]) => source === header).map(([target]) => mappingTargetLabel(target, identifierLabel));
    if (columnMapping[header] === 'Reference Data') mappedTargets.push('Reference Data');
    labels[header] = mappedTargets.join(', ');
    return labels;
  }, {});

  function resetIntake() {
    setStep('upload'); setFile(null); setPreview(null); setReview(null); setEditableRows([]); setSummary(null); setImportId('');
    setColumnMapping({}); setTargetMapping({}); setError(''); setNotice(''); setShowImportSettings(false); setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
  }
  async function parseFile(nextFile) {
    setError(''); setNotice(''); setReview(null); setSummary(null);
    if (!nextFile) return;
    setFile(nextFile); setBusy(true);
    try {
      const data = await api.previewSpreadsheet({ clientId, file: nextFile });
      const mapping = buildInitialColumnMapping(data.columnHeaders || [], selectedClient?.name || '');
      setPreview({ ...data, fileSize: nextFile.size, clientName: selectedClient?.name || '' });
      setColumnMapping(mapping); setTargetMapping(targetMappingFromSourceMapping(mapping)); setImportId(data.importId || ''); setStep('upload');
      setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
      setShowImportSettings(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function updateTargetColumn(target, source) {
    setTargetMapping(mapping => ({ ...mapping, [target]: source }));
    setColumnMapping(mapping => {
      const next = { ...mapping };
      Object.entries(next).forEach(([header, mapped]) => { if (mapped === target) next[header] = 'Ignore'; });
      if (source) next[source] = target;
      return next;
    });
    setReview(null); setEditableRows([]); setSummary(null);
  }
  function updateReferenceColumn(header, keep) { setColumnMapping(mapping => ({ ...mapping, [header]: keep ? 'Reference Data' : 'Ignore' })); }
  async function reviewActiveMapping() {
    if (!preview) return;
    if (!importSettingsReady) {
      setNotice('Choose how Jobs should be created before validating.');
      setShowImportSettings(true);
      return;
    }
    if (missingMandatoryTargets.length) { setNotice(`Map required columns before validating: ${missingMandatoryTargets.map(target => mappingTargetLabel(target, identifierLabel)).join(', ')}.`); setStep('map'); return; }
    setError(''); setNotice(''); setBusy(true);
    try {
      const data = await api.reviewSpreadsheetSourceRows({ clientId, fileName: preview.fileName, columnHeaders: preview.columnHeaders || [], sourceRows: preview.rows || [], mapping: mappingForApi(columnMapping, targetMapping, importSettings), importId });
      setReview(data); setEditableRows(data.rows ?? []); setImportId(data.importId || importId); setStep('validate');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function validateEditedIdentifier(value) {
    const text = String(value || '').trim();
    const codeType = selectedClient?.codeType || review?.codeType || '';
    if (codeType === 'UPC-12' && !(text.match(/^\d{12}$/))) return `${identifierLabel} must be exactly 12 digits.`;
    if (codeType === 'GTIN-14' && !(text.match(/^\d{14}$/))) return `${identifierLabel} must be exactly 14 digits.`;
    if (codeType === 'GTIN-13' && !(text.match(/^\d{13}$/))) return `${identifierLabel} must be exactly 13 digits.`;
    if (codeType === 'GTIN-12' && !(text.match(/^\d{12}$/))) return `${identifierLabel} must be exactly 12 digits.`;
    if (codeType === 'GTIN-8' && !(text.match(/^\d{8}$/))) return `${identifierLabel} must be exactly 8 digits.`;
    if (codeType === 'Numeric' && !(text.match(/^\d+$/))) return `${identifierLabel} must contain digits only.`;
    return '';
  }
  function validateEditedRows(rows) {
    const seen = {};
    return rows.map((row, index) => {
      const rowNumber = row.rowNumber || index + 2;
      const identifier = String(row.id || '').trim();
      const errors = [];
      const warnings = [];
      if (!String(row.extId || row.existingJobId || '').trim()) errors.push('Missing Job');
      if (!identifier) {
        errors.push(`Missing ${identifierLabel}`);
      } else {
        const identifierError = validateEditedIdentifier(identifier);
        if (identifierError) errors.push(identifierError);
        if (seen[identifier]) warnings.push(`Duplicate ${identifierLabel} also appears on row ${seen[identifier]}`);
        else seen[identifier] = rowNumber;
      }
      if (normalizedClientRequiredFields.includes('Product or File Name') && !String(row.product || '').trim()) errors.push('Missing Product or File Name');
      if (normalizedClientRequiredFields.includes('Brand') && !String(row.brand || '').trim()) errors.push('Missing Brand');
      return {
        ...row,
        action: errors.length ? 'skip' : (row.existingItemId ? 'update' : 'create'),
        errors,
        warnings,
      };
    });
  }
  function updateEditableRow(rowNumber, field, value) {
    setEditableRows(rows => validateEditedRows(rows.map(row => row.rowNumber === rowNumber ? { ...row, [field]: value } : row)));
  }
  async function executeImport() {
    setError(''); setNotice(''); setImporting(true);
    try {
      const data = await api.executeSpreadsheetRows({ clientId, fileName: preview?.fileName || file?.name || 'Import', rows: editableRows, importId });
      setSummary(data.summary || {}); setReview(data); setStep('summary');
    } catch (err) { setError(err.message); } finally { setImporting(false); }
  }
  function onDrop(event) { event.preventDefault(); parseFile(event.dataTransfer.files?.[0]); }
  function targetsForSource(header) { return Object.entries(targetMapping).filter(([, source]) => source === header).map(([target]) => target); }
  function renderValidateCell(row, header, columnIndex) {
    const fields = targetsForSource(header).map(target => INTAKE_TARGET_FIELDS[target]).filter(Boolean);
    if (!fields.length) return <span className="intake-readonly-cell">{preview?.rows?.[(row.rowNumber || 2) - 2]?.[columnIndex] || '—'}</span>;
    const field = fields[0];
    if (field === 'output') return <select value={row.output || ''} onChange={event => updateEditableRow(row.rowNumber, 'output', event.target.value)}><option>Photo Only</option><option>Render Only</option><option>Photo + Render</option></select>;
    return <input value={row[field] || ''} onChange={event => updateEditableRow(row.rowNumber, field, event.target.value)} />;
  }

  const visibleRows = (preview?.previewRows ?? []).slice(0, 10);
  const clientRequiredFields = selectedClient?.requiredPhotographyFields?.length ? selectedClient.requiredPhotographyFields : ['Identifier'];
  const normalizedClientRequiredFields = clientRequiredFields.map(field => field === 'ID' ? 'Identifier' : ['Product Name', 'Product/File Name'].includes(field) ? 'Product or File Name' : field);
  const photographyTargets = ['Identifier', ...normalizedClientRequiredFields.filter(field => ['Product or File Name', 'Brand'].includes(field))].filter((target, index, list) => list.indexOf(target) === index);
  const photographyRequiredTargets = new Set(['Identifier', ...normalizedClientRequiredFields]);
  const itemMappingTargets = ['Item Name', ...photographyTargets, ...(photographyTargets.includes('Brand') ? [] : ['Brand']), 'Product or File Name', 'Description', 'Item Job Number', 'Output Type', 'Master or Variant', 'Pickup Job Number', 'Notes', 'Reference Data']
    .filter((target, index, list) => list.indexOf(target) === index);
  const itemMappingTargetSet = new Set(itemMappingTargets);
  const referenceColumns = headers.filter(header => !new Set(Object.values(targetMapping).filter(Boolean)).has(header));
  const applicationTargets = ['Ignore', ...itemMappingTargets]
    .filter((target, index, list) => list.indexOf(target) === index);
  const mandatoryTargets = [...photographyRequiredTargets]
    .filter((target, index, list) => list.indexOf(target) === index);
  const missingMandatoryTargets = mandatoryTargets.filter(target => !targetMapping[target]);
  const mappedFieldCount = headers.filter(header => {
    const mappedTarget = Object.entries(targetMapping).find(([, source]) => source === header)?.[0];
    return itemMappingTargetSet.has(mappedTarget) || columnMapping[header] === 'Reference Data';
  }).length;
  const unmappedFieldCount = Math.max(0, headers.length - mappedFieldCount);
  const validImportRowCount = editableRows.filter(row => !(row.errors ?? []).length).length;
  const hasErrors = editableRows.some(row => (row.errors ?? []).length);
  const liveReviewStats = editableRows.reduce((stats, row) => ({
    itemsToCreate: stats.itemsToCreate + (row.action === 'create' ? 1 : 0),
    itemsToUpdate: stats.itemsToUpdate + (row.action === 'update' ? 1 : 0),
    errorCount: stats.errorCount + (row.errors ?? []).length,
    warningCount: stats.warningCount + (row.warnings ?? []).length,
  }), {
    itemsToCreate: 0,
    itemsToUpdate: 0,
    errorCount: 0,
    warningCount: 0,
  });
  const importModeReady = importSettings.mode === 'existing'
    ? Boolean(importSettings.existingJobId)
    : importSettings.mode === 'group'
      ? Boolean(importSettings.groupField)
    : importSettings.mode === 'single'
      ? Boolean(importSettings.singleJobName.trim())
      : false;
  const importSettingsReady = Boolean(clientId) && importModeReady;

  function chooseImportClient(nextClientId) {
    setClientId(nextClientId);
    const nextClient = clientList.find(client => client.id === nextClientId);
    const mapping = buildInitialColumnMapping(headers, nextClient?.name || '');
    setColumnMapping(mapping);
    setTargetMapping(targetMappingFromSourceMapping(mapping));
    setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
  }

  function chooseImportMode(mode) {
    setImportSettings(settings => ({
      mode,
      existingJobId: mode === 'existing' ? settings.existingJobId : '',
      existingJobName: mode === 'existing' ? settings.existingJobName : '',
      groupField: mode === 'group' ? settings.groupField : '',
      singleJobName: mode === 'single' ? settings.singleJobName : '',
    }));
  }

  async function applyImportSettings() {
    if (!importSettingsReady) return;
    setShowImportSettings(false);
    setError('');
    setBusy(true);
    try {
      const status = await api.getImportClientStatus(clientId);
      setStep(status.hasImports ? 'preview' : 'map');
    } catch (error) {
      setError(error.message);
      setStep('map');
    } finally {
      setBusy(false);
    }
  }

  function updateSpreadsheetFieldMapping(header, target) {
    if (target === 'Reference Data') {
      setColumnMapping(mapping => ({ ...mapping, [header]: 'Reference Data' }));
      setTargetMapping(mapping => {
        const next = { ...mapping };
        Object.entries(next).forEach(([mappedTarget, source]) => {
          if (source === header) delete next[mappedTarget];
        });
        return next;
      });
      return;
    }
    if (target === 'Ignore') {
      setColumnMapping(mapping => ({ ...mapping, [header]: 'Ignore' }));
      setTargetMapping(mapping => {
        const next = { ...mapping };
        Object.entries(next).forEach(([mappedTarget, source]) => {
          if (source === header) delete next[mappedTarget];
        });
        return next;
      });
      return;
    }
    setTargetMapping(mapping => {
      const next = { ...mapping, [target]: header };
      Object.entries(next).forEach(([mappedTarget, source]) => {
        if (mappedTarget !== target && source === header) delete next[mappedTarget];
      });
      return next;
    });
    setColumnMapping(mapping => {
      const next = { ...mapping };
      Object.entries(next).forEach(([source, mapped]) => { if (mapped === target) next[source] = 'Ignore'; });
      next[header] = target;
      return next;
    });
    setReview(null); setEditableRows([]); setSummary(null);
  }

  function sourceSamples(header) {
    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0) return [];
    return (preview?.previewRows ?? [])
      .map(row => String(row[columnIndex] || '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function mappingControl(target, { required = false, helper = '' } = {}) {
    const value = targetMapping[target] || '';
    return (
      <div className={`intake-field-map ${required && !value ? 'is-missing' : ''}`} key={target}>
        <div><div className="intake-field-map-label">{mappingTargetLabel(target, identifierLabel)} {required && <span className="badge badge-blue">Required</span>}</div>{helper && <div className="intake-field-map-helper">{helper}</div>}</div>
        <select value={value} onChange={event => updateTargetColumn(target, event.target.value)}><option value="">Choose column…</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={header}>{header || '(blank)'}</option>)}</select>
      </div>
    );
  }

  return (
    <div className="intake-page page-stack">
      <div className="intake-top-row">
        <div className="intake-wizard-steps">{INTAKE_WIZARD_STEPS.map(item => <span className={`intake-step ${item.id === step ? 'active' : 'upcoming'}`} key={item.id}>{item.label}</span>)}</div>
      </div>
      <div className="intake-card intake-upload-card">
        {clients.error && <div className="error-state">Unable to load active Clients. {clients.error}</div>}{error && <div className="error-state">{error}</div>}{notice && <div className="notice-state">{notice}</div>}
        {(!preview || showImportSettings) && <div className="intake-dropzone" onDragOver={event => event.preventDefault()} onDrop={onDrop}><div className="intake-drop-icon"><Icon.Upload /></div><div className="intake-drop-title">Drop your spreadsheet here</div><div className="intake-drop-or">or</div><label className="btn btn-primary intake-file-button">Choose File<input type="file" accept=".xlsx,.xls,.csv" onChange={event => parseFile(event.target.files?.[0])} /></label><div className="intake-drop-helper">Supports .xlsx, .xls, .csv files</div>{file && <div className="intake-file-note">{file.name}</div>}{busy && <div className="empty-state">Parsing spreadsheet...</div>}</div>}
      </div>
      {showImportSettings && preview && (
        <div className="intake-modal-backdrop">
          <div className="intake-settings-modal" role="dialog" aria-modal="true" aria-labelledby="intake-settings-title">
            <button className="intake-modal-close" type="button" onClick={resetIntake} aria-label="Close">×</button>
            <div className="intake-settings-title" id="intake-settings-title">Import Settings</div>
            <div className="intake-settings-options">
              <div className="intake-settings-field">
                <label htmlFor="intake-client">Client <span>Required</span></label>
                <select id="intake-client" value={clientId} onChange={event => chooseImportClient(event.target.value)} required>
                  <option value="">Select client...</option>
                  {clientList.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </div>
              <label className={`intake-choice-row ${importSettings.mode === 'existing' ? 'is-selected' : ''}`}>
                <input type="radio" name="import-mode" checked={importSettings.mode === 'existing'} onChange={() => chooseImportMode('existing')} />
                <span>
                  <strong>Use Existing Job</strong>
                  <small>Put all imported items into an existing job.</small>
                  <select
                    className="intake-choice-control"
                    value={importSettings.existingJobId}
                    onChange={event => {
                      const job = intakeJobList.find(item => item.id === event.target.value);
                      setImportSettings(settings => ({ ...settings, mode: 'existing', existingJobId: event.target.value, existingJobName: job?.name || '' }));
                    }}
                    onFocus={() => chooseImportMode('existing')}
                    disabled={importSettings.mode !== 'existing' || !clientId}
                  >
                    <option value="">{intakeJobs.loading ? 'Loading jobs...' : 'Select job...'}</option>
                    {intakeJobList.map(job => <option value={job.id} key={job.id}>{job.name || job.parentJobNumber || job.id}</option>)}
                  </select>
                </span>
              </label>

              <label className={`intake-choice-row ${importSettings.mode === 'group' ? 'is-selected' : ''}`}>
                <input type="radio" name="import-mode" checked={importSettings.mode === 'group'} onChange={() => chooseImportMode('group')} />
                <span>
                  <strong>Create Jobs From Field</strong>
                  <small>Create or reuse jobs from matching spreadsheet values.</small>
                  <select
                    className="intake-choice-control"
                    value={importSettings.groupField}
                    onChange={event => setImportSettings(settings => ({ ...settings, mode: 'group', groupField: event.target.value }))}
                    onFocus={() => chooseImportMode('group')}
                    disabled={importSettings.mode !== 'group'}
                  >
                    <option value="">Select field to group by...</option>
                    {headers.map((header, index) => <option value={header} key={`${header}-${index}`}>{header || '(blank)'}</option>)}
                  </select>
                </span>
              </label>

              <label className={`intake-choice-row ${importSettings.mode === 'single' ? 'is-selected' : ''}`}>
                <input type="radio" name="import-mode" checked={importSettings.mode === 'single'} onChange={() => chooseImportMode('single')} />
                <span>
                  <strong>Create New Job</strong>
                  <small>Put all items into a new job.</small>
                  <input
                    className="intake-choice-control"
                    value={importSettings.singleJobName}
                    onChange={event => setImportSettings(settings => ({ ...settings, mode: 'single', singleJobName: event.target.value }))}
                    onFocus={() => chooseImportMode('single')}
                    disabled={importSettings.mode !== 'single'}
                    placeholder="Job Name"
                  />
                </span>
              </label>
            </div>
            <div className="form-actions intake-settings-actions">
              <button className="btn" type="button" onClick={resetIntake}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={applyImportSettings} disabled={!importSettingsReady}>Next</button>
            </div>
          </div>
        </div>
      )}
      {step === 'preview' && preview && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">{preview.fileName}</div><div className="intake-preview-sub">{selectedClient?.name || preview.clientName || preview.clientId}</div></div></div><div className="intake-summary-grid"><div className="intake-summary-item"><span>Sheets</span><strong>{preview.sheetNames?.length || 1}</strong></div><div className="intake-summary-item"><span>Rows</span><strong>{preview.rowCount}</strong></div><div className="intake-summary-item"><span>Columns</span><strong>{preview.columnHeaders?.length ?? 0}</strong></div><div className="intake-summary-item"><span>Size</span><strong>{preview.fileSize ? `${(preview.fileSize / 1024).toFixed(1)} KB` : '—'}</strong></div></div><div className="table-wrap intake-preview-table"><table><thead><tr>{headers.map((header, index) => <MappingHeader target={sourceColumnMappings[header]} key={`${header}-${index}`}>{header || '(blank)'}</MappingHeader>)}</tr></thead><tbody>{visibleRows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] || '—'}</td>)}</tr>)}</tbody></table></div><div className="form-actions"><button className="btn" type="button" onClick={resetIntake} disabled={busy}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')} disabled={busy}>Map Columns</button><button className="btn btn-primary" type="button" onClick={reviewActiveMapping} disabled={busy}>{busy ? 'Validating...' : 'Validate'}</button></div></div>}
      {step === 'map' && preview && (
        <div className="intake-modal-backdrop">
          <div className="intake-mapping-modal" role="dialog" aria-modal="true" aria-labelledby="intake-mapping-title">
            <button className="intake-modal-close" type="button" onClick={() => setStep('preview')} aria-label="Close">×</button>
            <div className="intake-mapping-head">
              <div>
                <div className="intake-settings-title" id="intake-mapping-title">Map Fields</div>
                <div className="intake-mapping-sub">{selectedClient?.name || preview.clientName || 'Selected client'} · {preview.fileName}</div>
              </div>
              <div className="intake-required-list">
                <span>Required</span>
                {mandatoryTargets.map(target => (
                  <strong className={targetMapping[target] ? 'is-mapped' : 'is-missing'} key={target}>{mappingTargetLabel(target, identifierLabel)}</strong>
                ))}
              </div>
            </div>
            <div className="intake-mapping-table">
              <div className="intake-mapping-table-head">
                <span>Spreadsheet Fields</span>
                <span>Application Fields</span>
              </div>
              <div className="intake-mapping-rows">
                {headers.map((header, index) => {
                  const mappedTarget = Object.entries(targetMapping).find(([target, source]) => itemMappingTargetSet.has(target) && source === header)?.[0];
                  const value = mappedTarget || (columnMapping[header] === 'Reference Data' ? 'Reference Data' : 'Ignore');
                  const samples = sourceSamples(header);
                  const mapped = value && value !== 'Ignore';
                  return (
                    <div className="intake-mapping-row" key={header || index}>
                      <div className="intake-spreadsheet-field">
                        <strong>{header || '(blank)'}</strong>
                        {samples.length > 0 && <small>{samples.join(' · ')}</small>}
                      </div>
                      <div className="intake-application-field">
                        <input className="intake-map-check" type="checkbox" checked={Boolean(mapped)} readOnly aria-label={mapped ? 'Mapped' : 'Unmapped'} />
                        <select value={value} onChange={event => updateSpreadsheetFieldMapping(header, event.target.value)}>
                          {applicationTargets.map(target => <option value={target} key={target}>{target === 'Ignore' ? 'Do not import' : mappingTargetLabel(target, identifierLabel)}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="intake-mapping-footer">
              <div className="intake-mapping-count">
                <strong>{mappedFieldCount} of {headers.length} fields mapped</strong>
                <span>{unmappedFieldCount} unmapped fields will be skipped unless mapped as Reference Data.</span>
                {missingMandatoryTargets.length > 0 && <span className="metric-error">Missing required: {missingMandatoryTargets.map(target => mappingTargetLabel(target, identifierLabel)).join(', ')}</span>}
              </div>
              <div className="form-actions">
                <button className="btn" type="button" onClick={resetIntake}>Cancel</button>
                <button className="btn btn-primary" type="button" onClick={() => setStep('preview')} disabled={missingMandatoryTargets.length > 0}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {step === 'validate' && review && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Validate & Fix</div><div className="intake-preview-sub">Fix highlighted rows or import only the valid rows.</div></div></div><div className="intake-summary-grid is-six"><div className="intake-summary-item"><span>Total rows</span><strong>{review.totalRows}</strong></div><div className="intake-summary-item"><span>Jobs detected</span><strong>{review.jobsDetected}</strong></div><div className="intake-summary-item"><span>Items to create</span><strong>{liveReviewStats.itemsToCreate}</strong></div><div className="intake-summary-item"><span>Items to update</span><strong>{liveReviewStats.itemsToUpdate}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{liveReviewStats.errorCount}</strong></div><div className="intake-summary-item"><span>Warnings</span><strong className="metric-warning">{liveReviewStats.warningCount}</strong></div></div>{hasErrors ? <div className="intake-callout danger"><div className="intake-callout-icon">!</div><div><div className="intake-callout-title">Errors Found</div><div className="intake-callout-text">Rows with unresolved errors will be skipped during import.</div></div></div> : <div className="intake-callout success"><div className="intake-callout-icon">✓</div><div><div className="intake-callout-title">Success</div><div className="intake-callout-text">All rows passed validation.</div></div></div>}<div className="intake-inline-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div><div className="table-wrap intake-preview-table"><table><thead><tr>{headers.map((header, index) => <MappingHeader target={sourceColumnMappings[header]} showUnmapped key={`${header}-${index}`}>{header || '(blank)'}</MappingHeader>)}<th className="problem-column-header">Alerts</th></tr></thead><tbody>{editableRows.map(row => <tr className={(row.errors ?? []).length ? 'row-error' : (row.warnings ?? []).length ? 'row-warning' : ''} key={row.rowNumber}>{headers.map((header, columnIndex) => <td key={`${row.rowNumber}-${header}-${columnIndex}`}>{renderValidateCell(row, header, columnIndex)}</td>)}<td className="problem-column-cell"><div className="problem-row-alerts">{[...(row.errors ?? []), ...(row.warnings ?? [])].map((problem, index) => <span className={`badge problem-badge ${(row.errors ?? []).includes(problem) ? 'badge-red' : 'badge-amber'}`} key={`${row.rowNumber}-${index}`}><span className="problem-badge-icon">!</span>{problem}</span>)}</div></td></tr>)}</tbody></table></div><div className="form-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div></div>}
      {step === 'summary' && summary && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Import Complete</div><div className="intake-preview-sub">{preview?.fileName}</div></div><span className="badge badge-green">Success</span></div><div className="intake-summary-grid is-six"><div className="intake-summary-item"><span>Rows skipped</span><strong>{summary.rowsSkipped}</strong></div><div className="intake-summary-item"><span>Jobs created</span><strong>{summary.jobsCreated}</strong></div><div className="intake-summary-item"><span>Jobs reused</span><strong>{summary.jobsReused}</strong></div><div className="intake-summary-item"><span>Items created</span><strong>{summary.itemsCreated}</strong></div><div className="intake-summary-item"><span>Items updated</span><strong>{summary.itemsUpdated}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{summary.errors}</strong></div></div><div className="form-actions"><button className="btn btn-primary" type="button" onClick={resetIntake}>New Import</button></div></div>}
      {importing && <div className="intake-modal-backdrop" role="status" aria-live="polite"><div className="intake-modal"><div className="intake-modal-spinner" /><div className="intake-modal-title">Importing spreadsheet...</div><div className="intake-modal-sub">Creating and updating Jobs and Items in Airtable.</div></div></div>}
    </div>
  );
}


function ImportHistoryPage({ importId }) {
  const imports = useResource(() => api.listImports({ limit: 50 }));
  const records = imports.data?.records ?? [];
  const [selectedId, setSelectedId] = useState(importId || '');
  const selected = records.find(record => record.id === selectedId) || records[0];

  useEffect(() => {
    if (!selectedId && records.length) setSelectedId(records[0].id);
  }, [records, selectedId]);

  function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="page-stack">
      {imports.error && <div className="error-state">{imports.error}</div>}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent imports</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>File</th>
                <th>User</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Jobs Created</th>
                <th>Jobs Reused</th>
                <th>Items Created</th>
                <th>Items Updated</th>
                <th>Errors</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {imports.loading && <tr><td colSpan="12" className="empty-state">Loading imports…</td></tr>}
              {!imports.loading && records.length === 0 && <tr><td colSpan="12" className="empty-state">No imports yet.</td></tr>}
              {records.map(record => (
                <tr className={selected?.id === record.id ? 'is-selected-row' : ''} key={record.id} onClick={() => setSelectedId(record.id)}>
                  <td>{formatDateTime(record.started)}</td>
                  <td>{record.client || '—'}</td>
                  <td>{record.file || '—'}</td>
                  <td>{record.user || '—'}</td>
                  <td><StatusBadge status={record.status} /></td>
                  <td>{record.rows ?? 0}</td>
                  <td>{record.jobsCreated ?? 0}</td>
                  <td>{record.jobsReused ?? 0}</td>
                  <td>{record.itemsCreated ?? 0}</td>
                  <td>{record.itemsUpdated ?? 0}</td>
                  <td>{record.errors ?? 0}</td>
                  <td>{record.warnings ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Import details</span></div>
          <div className="settings-list">
            <div className="setting-row"><span className="setting-key">File</span><span className="setting-val">{selected.file || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Client</span><span className="setting-val">{selected.client || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Status</span><span className="setting-val">{selected.status || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Started</span><span className="setting-val">{formatDateTime(selected.started)}</span></div>
            <div className="setting-row"><span className="setting-key">Finished</span><span className="setting-val">{formatDateTime(selected.finished)}</span></div>
            <div className="setting-row"><span className="setting-key">Rows skipped</span><span className="setting-val">{selected.rowsSkipped ?? 0}</span></div>
            <div className="setting-row"><span className="setting-key">Details</span><span className="setting-val">{selected.details || '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Verification ─────────────────────────────────────────────────────────────
function VerificationPage() {
  const entries = useResource(() => api.listVerificationEntries());
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const records = entries.data?.records ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState('');
  const [validating, setValidating] = useState('');
  const [error, setError] = useState('');
  const [queueTab, setQueueTab] = useState('verify');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoZoom, setPhotoZoom] = useState(1);

  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(client => [client.id, client]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const activeRecords = records.filter(record => record.merchStatus !== 'Validated');
  // "Received" = logged but no item match yet — needs PM to find/match the item
  // "Matched" = item linked, awaiting PM validation
  // "Issue" = flagged problem
  const toVerifyRecords = activeRecords.filter(record => record.merchStatus !== 'Received');
  const waitingRecords = activeRecords.filter(record => record.merchStatus === 'Received');
  const queueRecords = queueTab === 'waiting' ? waitingRecords : toVerifyRecords;
  const queueSearchText = queueSearch.trim().toLowerCase();
  const visibleQueueRecords = queueSearchText
    ? queueRecords.filter(record => [
        record.productName,
        record.skuId,
        record.brand,
        record.description,
        clientMap[record.clientIds?.[0]]?.name,
      ].some(value => String(value || '').toLowerCase().includes(queueSearchText)))
    : queueRecords;
  const selected = queueRecords.find(record => record.id === selectedId) || queueRecords[0];
  const selectedClientId = selected?.clientIds?.[0] || '';
  const selectedLocation = selected?.locationId ? locationMap[selected.locationId]?.name : '';
  const selectedPhotos = recordPhotos(selected);
  const activePhoto = selectedPhotos[photoIndex] || selectedPhotos[0];

  useEffect(() => {
    if (!selected) {
      setSelectedId('');
      setQuery('');
      return;
    }
    setSelectedId(selected.id);
    setQuery(selected.skuId || selected.productName || selected.description || '');
  }, [selected?.id, queueTab]);

  useEffect(() => {
    setPhotoIndex(0);
    setPhotoZoom(1);
  }, [selected?.id]);

  useEffect(() => {
    let active = true;
    async function loadMatches() {
      const cleaned = query.trim();
      setError('');
      if (cleaned.length < 3) {
        setMatches([]);
        return;
      }
      setSearching(true);
      try {
        const data = await api.searchVerificationItems({ q: cleaned, clientId: selectedClientId });
        if (active) setMatches(data.records ?? []);
      } catch (err) {
        if (active) setError(err.message || 'Could not search Items.');
      } finally {
        if (active) setSearching(false);
      }
    }
    loadMatches();
    return () => { active = false; };
  }, [query, selectedClientId]);

  async function matchItem(itemId) {
    if (!selected) return;
    setMatching(itemId);
    setError('');
    try {
      await api.matchVerificationEntry(selected.id, itemId);
      await entries.reload();
      setMatches([]);
    } catch (err) {
      setError(err.message || 'Could not match this entry.');
    } finally {
      setMatching('');
    }
  }

  async function validateEntry(status) {
    if (!selected) return;
    setValidating(status);
    setError('');
    const nextSelection = queueRecords.find(record => record.id !== selected.id)?.id || '';
    try {
      await api.validateVerificationEntry(selected.id, status);
      await entries.reload();
      setSelectedId(nextSelection);
    } catch (err) {
      setError(err.message || 'Could not update status.');
    } finally {
      setValidating('');
    }
  }

  function fact(label, value) {
    return (
      <div className="verification-fact">
        <span>{label}</span>
        <strong>{value || '—'}</strong>
      </div>
    );
  }

  if (entries.loading) return <div className="empty-state">Loading verification queue…</div>;
  if (entries.error) return <div className="error-state">{entries.error}</div>;
  if (!activeRecords.length) {
    return (
      <div className="verification-empty">
        <h2>Verification</h2>
        <p>No merchandise is awaiting verification.</p>
      </div>
    );
  }

  return (
    <div className="verification-page workspace-layout validation-workspace">
      {error && <div className="error-state">{error}</div>}
      <WorkspacePanel id="validation-queue" title="Verification" meta={`${queueRecords.length} to review`} defaultWidth={360} minWidth={300} className="verification-queue">
        <input
          className="verification-queue-search"
          value={queueSearch}
          onChange={event => setQueueSearch(event.target.value)}
          placeholder="Search received items…"
        />
        <div className="verification-tabs" role="tablist" aria-label="Verification queues">
          <button type="button" className={queueTab === 'verify' ? 'is-active' : ''} onClick={() => setQueueTab('verify')}>
            <span>Needs a Match</span>
            <strong>{toVerifyRecords.length}</strong>
          </button>
          <button type="button" className={queueTab === 'waiting' ? 'is-active' : ''} onClick={() => setQueueTab('waiting')}>
            <span>Ready to Approve</span>
            <strong>{waitingRecords.length}</strong>
          </button>
        </div>
        <div className="verification-entry-list">
          {visibleQueueRecords.length === 0 && (
            <div className="verification-queue-empty">
              {queueSearch ? 'No queue items match that search.' : queueTab === 'waiting' ? 'No entries are waiting for import.' : 'No entries are ready to verify.'}
            </div>
          )}
          {visibleQueueRecords.map(record => {
            const client = clientMap[record.clientIds?.[0]];
            const identifier = record.skuId || record.identifier || '';
            const merchStatus = record.merchStatus || 'Received';
            return (
              <button
                type="button"
                className={`verification-entry-card ${selected?.id === record.id ? 'is-active' : ''}`}
                key={record.id}
                onClick={() => setSelectedId(record.id)}
              >
                <RecordThumbnail record={record} className="verification-entry-thumb" />
                <span>
                  <strong>{record.productName || 'Unnamed Product'}</strong>
                  <small>{client?.name || 'Unknown client'}{identifier ? ` · ${identifier}` : ''}</small>
                  <em>{record.brand || 'No brand'} · Qty {record.quantity || 1}</em>
                  <span className="verification-card-badges">
                    <b>{merchStatus}</b>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </WorkspacePanel>

      {selected ? (
        <>
          <WorkspacePanel id="validation-viewer" title={selected.productName || 'Unnamed Product'} meta={selected.merchStatus} defaultWidth={820} minWidth={520} dominant className="verification-viewer-panel">
            <div className="verification-viewer">
              <div className="verification-photo-stage">
                {activePhoto && receivingPhotoUrl(activePhoto) ? (
                  <img src={receivingPhotoUrl(activePhoto)} alt="" style={{ transform: `scale(${photoZoom})` }} />
                ) : (
                  <div className="verification-no-photo">No photos</div>
                )}
              </div>
              <div className="verification-viewer-controls">
                <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.max(0, index - 1))} disabled={photoIndex <= 0}>Previous</button>
                <span>{selectedPhotos.length ? `${photoIndex + 1} / ${selectedPhotos.length}` : '0 photos'}</span>
                <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.min(selectedPhotos.length - 1, index + 1))} disabled={photoIndex >= selectedPhotos.length - 1}>Next</button>
                <button type="button" className="btn" onClick={() => setPhotoZoom(zoom => Math.max(1, Number((zoom - 0.2).toFixed(1))))}>−</button>
                <button type="button" className="btn" onClick={() => setPhotoZoom(zoom => Math.min(2.4, Number((zoom + 0.2).toFixed(1))))}>+</button>
              </div>
              {selectedPhotos.length > 1 && (
                <div className="verification-photo-strip">
                  {selectedPhotos.map((photo, index) => {
                    const url = receivingPhotoUrl(photo);
                    return url ? (
                      <button type="button" className={index === photoIndex ? 'is-active' : ''} onClick={() => setPhotoIndex(index)} key={`${url}-${index}`}>
                        <img src={url} alt="" />
                      </button>
                    ) : null;
                  })}
                </div>
              )}
              <div className="verification-facts-grid">
                {fact('Product Name', selected.productName)}
                {fact('Identifier', selected.skuId)}
                {fact('Quantity', selected.quantity || 1)}
                {fact('Storage Location', selectedLocation)}
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel id="validation-details" title="Link to Item" meta={selected.merchStatus} defaultWidth={390} minWidth={320} className="verification-match-card">
          <div className="verification-card-head">
            <div>
              <span>Received merchandise</span>
              <h2>{selected.productName || 'Unnamed Product'}</h2>
            </div>
          </div>
          <div className="verification-facts-grid is-single">
            {fact('Identifier', selected.skuId)}
            {fact('Brand', selected.brand)}
            {fact('Description', selected.description)}
            {fact('Variant', selected.packageSize)}
            {fact('Condition', selected.condition)}
            {fact('Notes', selected.notes)}
          </div>
          <input
            className="verification-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search items to link…"
          />
          <div className="verification-results">
            {searching && <div className="verification-muted">Searching…</div>}
            {!searching && query.trim().length >= 3 && matches.length === 0 && (
              <div className="verification-muted">
                <strong>No matching item found.</strong>
                <span>The item may not be imported yet. It will stay in the queue until a match is available.</span>
              </div>
            )}
            {!searching && query.trim().length < 3 && (
              <div className="verification-muted">Search by product name, SKU, or brand to find the matching item.</div>
            )}
            {matches.map(item => (
              <div className="verification-match-row" key={item.id}>
                <RecordThumbnail record={item} className="verification-match-thumb" />
                <div>
                  <strong>{item.product || item.name || item.identifier || 'Untitled Item'}</strong>
                  <small>
                    <span>{item.identifier || 'No product code'}</span>
                    <span>{item.brand || 'No brand'}</span>
                    <span>{item.packageSize || item.description || 'No package size'}</span>
                  </small>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => matchItem(item.id)} disabled={Boolean(matching)}>
                  {matching === item.id ? 'Matching…' : 'Match'}
                </button>
              </div>
            ))}
          </div>
          <div className="validation-action-stack">
            <button type="button" className="btn btn-primary" onClick={() => validateEntry('Validated')} disabled={Boolean(validating) || selected.merchStatus === 'Validated'}>
              {validating === 'Validated' ? 'Approving…' : '✓ Approve & move to production'}
            </button>
            <button type="button" className="btn btn-alt" onClick={() => validateEntry('Issue')} disabled={Boolean(validating)}>
              {validating === 'Issue' ? 'Flagging…' : 'Flag an issue'}
            </button>
          </div>
          <div className="context-card">
            <span>Previous validation history</span>
            <small>No prior validation history loaded for this item.</small>
          </div>
          </WorkspacePanel>
        </>
      ) : (
        <section className="verification-detail-empty">
          Select a work item to verify.
        </section>
      )}
    </div>
  );
}

// ── Auth ─────────────────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY = 'marks:auth';
const AVATARS = ['🦁','🐯','🦊','🐺','🐻','🐼','🦝','🦉','🦅','🦋','🐙','🦈','🐬','🦒','🦓','🦄','🐉','🌟','🎸','🍕'];

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)); } catch { return null; }
}
function saveAuth(u) { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u)); }
function clearAuth() { localStorage.removeItem(AUTH_STORAGE_KEY); }

const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

const ROLE_NAV = {
  Admin:        ['/dashboard', '/imports', '/receiving', '/verification', '/items', '/jobs', '/settings'],
  Producer:     ['/dashboard', '/imports', '/receiving', '/verification', '/items', '/jobs'],
  Merch:        ['/receiving'],
  Receiver:     ['/receiving'],
  User:         ['/dashboard', '/items', '/jobs'],
  PM:           ['/dashboard', '/items', '/jobs'],
  Photographer: ['/dashboard', '/items', '/jobs'],
  Retoucher:    ['/dashboard', '/items', '/jobs'],
  Viewer:       ['/dashboard', '/items'],
};
function allowedPaths(role) { return ROLE_NAV[role] || ROLE_NAV.User; }

// ── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef(null);

  useEffect(() => {
    api.listLoginUsers().then(d => {
      setUsers((d.records || []).filter(u => u.active));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) { setPin(''); setError(''); setTimeout(() => pinRef.current?.focus(), 60); }
  }, [selected]);

  async function attemptLogin(userId, pinVal) {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.loginUser(userId, pinVal);
      saveAuth(data.user);
      onLogin(data.user);
    } catch {
      setError('Incorrect PIN. Try again.');
      setPin('');
      setTimeout(() => pinRef.current?.focus(), 60);
    } finally {
      setSubmitting(false);
    }
  }

  function pressDigit(d) {
    if (submitting) return;
    if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    if (next.length === 4) setTimeout(() => attemptLogin(selected.id, next), 120);
  }

  return (
    <div className="login-screen">
      <div className="login-brand">
        <img src="/marks-logo.png" alt="Marks Photo" className="login-logo" />
        <span className="login-title">Marks Photo</span>
      </div>
      {!selected ? (
        <div className="login-users">
          <p className="login-prompt">Who's working today?</p>
          {loading && <div className="login-loading">Loading…</div>}
          <div className="login-user-grid">
            {users.map(u => (
              <button key={u.id} className="login-user-card" onClick={() => setSelected(u)}>
                <span className="login-avatar">{u.avatar || (u.displayName || u.name || '?')[0]}</span>
                <span className="login-user-name">{u.displayName || u.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="login-pin-panel">
          <button className="login-back" onClick={() => setSelected(null)}>← Back</button>
          <span className="login-avatar login-avatar-lg">{selected.avatar || (selected.displayName || selected.name || '?')[0]}</span>
          <p className="login-pin-name">{selected.displayName || selected.name}</p>
          <p className="login-prompt">Enter your PIN</p>
          <div className="login-pin-dots">
            {[0,1,2,3].map(i => <span key={i} className={`login-pin-dot ${pin.length > i ? 'filled' : ''}`} />)}
          </div>
          {error && <p className="login-error">{error}</p>}
          <input ref={pinRef} type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,4); setPin(v); if (v.length===4) setTimeout(() => attemptLogin(selected.id, v), 120); }}
            className="login-pin-hidden" disabled={submitting} aria-label="PIN" />
          <div className="login-numpad">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i} className={`login-numpad-btn${!d ? ' login-numpad-empty' : ''}`}
                onClick={() => d && pressDigit(d)} disabled={submitting || !d} tabIndex={-1}>
                {d}
              </button>
            ))}
          </div>
          {submitting && <p className="login-signing-in">Signing in…</p>}
        </div>
      )}
    </div>
  );
}

// ── Profile modal ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }) {
  const { auth, setAuth } = useAuth();
  const [tab, setTab] = useState('profile');
  const [avatar, setAvatar] = useState(auth.avatar || '');
  const [displayName, setDisplayName] = useState(auth.displayName || auth.name || '');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saved, setSaved] = useState('');

  async function saveProfile() {
    setSaving(true);
    try {
      const data = await api.updateCurrentUser({ avatar, displayName });
      const updated = { ...auth, ...data.user };
      saveAuth(updated);
      setAuth(updated);
      setSaved('Saved!');
      setTimeout(() => setSaved(''), 2000);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function savePin() {
    if (pin1.length < 4) { setPinError('PIN must be 4 digits'); return; }
    if (pin1 !== pin2) { setPinError('PINs do not match'); return; }
    setSaving(true); setPinError('');
    try {
      await api.updateCurrentUser({ pin: pin1 });
      setPin1(''); setPin2('');
      setSaved('PIN updated!');
      setTimeout(() => setSaved(''), 2000);
    } catch { setPinError('Failed to save PIN'); } finally { setSaving(false); }
  }

  async function logout() {
    try { await api.logoutUser(); } catch { /* session may already be gone */ }
    clearAuth();
    setAuth(null);
    onClose();
  }

  return createPortal(
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal profile-modal">
        <div className="modal-header">
          <span className="modal-title">My Profile</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="profile-tabs">
          <button className={`profile-tab${tab==='profile'?' active':''}`} onClick={() => setTab('profile')}>Profile</button>
          <button className={`profile-tab${tab==='pin'?' active':''}`} onClick={() => setTab('pin')}>Change PIN</button>
        </div>
        {tab === 'profile' && (
          <div className="profile-body">
            <div className="profile-avatar-row">
              <span className="profile-avatar-preview">{avatar || (auth.displayName||auth.name||'?')[0]}</span>
            </div>
            <p className="profile-avatar-label">Pick an avatar</p>
            <div className="profile-avatar-grid">
              {AVATARS.map(a => (
                <button key={a} className={`profile-avatar-btn${a===avatar?' selected':''}`} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
            <div className="profile-field">
              <label>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="form-input" placeholder={auth.name} />
            </div>
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saved || (saving ? 'Saving…' : 'Save')}
              </button>
              <button className="btn btn-ghost" onClick={logout}>Sign out</button>
            </div>
          </div>
        )}
        {tab === 'pin' && (
          <div className="profile-body">
            <div className="profile-field">
              <label>New PIN (4 digits)</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin1}
                onChange={e => setPin1(e.target.value.replace(/\D/g,'').slice(0,4))}
                className="form-input" placeholder="••••" />
            </div>
            <div className="profile-field">
              <label>Confirm PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin2}
                onChange={e => setPin2(e.target.value.replace(/\D/g,'').slice(0,4))}
                className="form-input" placeholder="••••" />
            </div>
            {pinError && <p className="login-error">{pinError}</p>}
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={savePin} disabled={saving}>
                {saved || (saving ? 'Saving…' : 'Update PIN')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── User management (admin) ───────────────────────────────────────────────────
const ROLES = ['Admin', 'Producer', 'Merch', 'User'];

function UserFormModal({ user, clients, onSave, onClose }) {
  const isNew = !user;
  const [name, setName] = useState(user?.name || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'User');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [pin, setPin] = useState('');
  const [allClients, setAllClients] = useState(user?.allClients ?? false);
  const [clientIds, setClientIds] = useState(user?.clientIds || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: name.trim(), firstName: firstName.trim(), lastName: lastName.trim(),
        displayName: displayName.trim(), email: email.trim(), role, avatar, allClients, clientIds };
      if (pin) payload.pin = pin;
      const data = isNew ? await api.createUser(payload) : await api.updateUser(user.id, payload);
      onSave(data.user);
    } catch (e) { setError(e.message || 'Failed to save'); } finally { setSaving(false); }
  }

  function toggleClient(id) {
    setClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  return createPortal(
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal user-form-modal">
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'Add User' : 'Edit User'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="user-form-body" onSubmit={submit}>
          <div className="user-form-avatar-row">
            <span className="profile-avatar-preview">{avatar || (name||'?')[0]}</span>
          </div>
          <div className="profile-avatar-grid">
            {AVATARS.map(a => (
              <button type="button" key={a} className={`profile-avatar-btn${a===avatar?' selected':''}`} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
          <div className="user-form-grid">
            <div className="profile-field">
              <label>Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Full name" required />
            </div>
            <div className="profile-field">
              <label>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="form-input" placeholder="Nickname or short name" />
            </div>
            <div className="profile-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="email@example.com" />
            </div>
            <div className="profile-field">
              <label>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="form-input">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="profile-field">
              <label>{isNew ? 'Initial PIN (4 digits)' : 'Reset PIN (leave blank to keep)'}</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                className="form-input" placeholder="••••" />
            </div>
          </div>
          <div className="profile-field" style={{marginTop:12}}>
            <label className="user-form-check">
              <input type="checkbox" checked={allClients} onChange={e => setAllClients(e.target.checked)} />
              Access all clients
            </label>
          </div>
          {!allClients && clients.length > 0 && (
            <div className="profile-field">
              <label>Client Access</label>
              <div className="user-form-clients">
                {clients.map(c => (
                  <label key={c.id} className="user-form-check">
                    <input type="checkbox" checked={clientIds.includes(c.id)} onChange={() => toggleClient(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="login-error">{error}</p>}
          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add User' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | user object
  const clients = useResource(() => api.listClients());
  const clientList = clients.data?.records ?? [];

  useEffect(() => {
    api.listUsers().then(d => { setUsers(d.records || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function toggleActive(user) {
    try {
      const data = await api.updateUser(user.id, { active: !user.active });
      setUsers(prev => prev.map(u => u.id === user.id ? data.user : u));
    } catch { /* ignore */ }
  }

  function onSaveUser(savedUser) {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === savedUser.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = savedUser; return next; }
      return [...prev, savedUser];
    });
    setEditing(null);
  }

  return (
    <div className="users-section">
      <div className="users-section-header">
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ Add User</button>
      </div>
      {loading && <div className="empty-state">Loading users…</div>}
      {!loading && (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Clients</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.active ? '' : 'user-inactive'}>
                  <td>
                    <div className="users-table-user">
                      <span className="users-table-avatar">{u.avatar || (u.displayName||u.name||'?')[0]}</span>
                      <div>
                        <strong>{u.displayName || u.name}</strong>
                        {u.displayName && u.displayName !== u.name && <small>{u.name}</small>}
                        {u.email && <small>{u.email}</small>}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{u.role || '—'}</span></td>
                  <td><span style={{fontSize:12,color:'var(--text-3)'}}>{u.allClients ? 'All clients' : u.clientIds?.length ? `${u.clientIds.length} client${u.clientIds.length!==1?'s':''}` : 'None'}</span></td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-neutral'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="users-table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          clients={clientList}
          onSave={onSaveUser}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> },
  { path: '/imports', label: 'Import', icon: <Icon.Add /> },
  { path: '/receiving', label: 'Receiving', icon: <Icon.Upload /> },
  { path: '/verification', label: 'Verification', icon: <Icon.ChevronRight /> },
  { path: '/items', label: 'Items', icon: <Icon.SKUs /> },
  { path: '/jobs', label: 'Jobs', icon: <Icon.Jobs /> },
  { path: '/settings', label: 'Settings', icon: <Icon.Settings /> },
];

function routeForPage(page, params = {}) {
  const query = new URLSearchParams();
  if (params.jobId) query.set('jobId', params.jobId);
  if (params.queue) query.set('queue', params.queue);
  if (params.importId) query.set('importId', params.importId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const routes = {
    dashboard: '/dashboard',
    imports: '/imports',
    intake: '/imports',
    'import-history': `/imports/history${suffix}`,
    receiving: '/receiving',
    'receiving-receipts': '/receiving/receipts',
    verification: '/verification',
    items: `/items${suffix}`,
    skus: `/items${suffix}`,
    jobs: '/jobs',
    'new-job': '/jobs/new',
    clients: '/clients',
    settings: '/settings',
    admin: '/settings',
  };
  return routes[page] || '/dashboard';
}

function pageTitleForPath(pathname) {
  if (pathname === '/imports/history') return 'Import History';
  if (pathname.startsWith('/imports')) return 'Import';
  if (pathname.startsWith('/receiving')) return 'Receiving';
  if (pathname.startsWith('/verification')) return 'Verification';
  if (pathname.startsWith('/items')) return 'Items';
  if (pathname === '/jobs/new') return 'New Job';
  if (pathname.startsWith('/jobs')) return 'Jobs';
  if (pathname.startsWith('/clients')) return 'Clients';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'Not Found';
}

function RouteItemsPage({ navigate }) {
  const [searchParams] = useSearchParams();
  return (
    <SkusPage
      navigate={navigate}
      jobId={searchParams.get('jobId') || ''}
      queue={searchParams.get('queue') || ''}
    />
  );
}

function RouteImportHistoryPage() {
  const [searchParams] = useSearchParams();
  return <ImportHistoryPage importId={searchParams.get('importId') || ''} />;
}

function NotFound() {
  return (
    <div className="empty-state">
      Page not found.
    </div>
  );
}

function AppLayout() {
  const { auth } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigate = (page, params = {}) => routerNavigate(routeForPage(page, params));
  const pageTitle = pageTitleForPath(location.pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [, setSidebarMode] = useStoredState('shell:sidebar:mode', 'expanded');
  const mobileMenuButtonRef = useRef(null);
  const mobileCloseButtonRef = useRef(null);
  const mobileDrawerRef = useRef(null);
  const workspaceRoute = location.pathname.startsWith('/receiving') || location.pathname.startsWith('/verification');
  const sidebarCollapsed = false; // always expanded — toggle removed
  const allowed = auth ? allowedPaths(auth.role) : allowedPaths('User');
  const visibleNav = NAV_ITEMS.filter(item => allowed.includes(item.path));

  // Alert count for sidebar badge
  const skus = useResource(() => api.listSkus());
  const skuList = skus.data?.records ?? [];
  const alertCount = skuList.filter(s => s.readiness && s.readiness.state !== 'ready_for_photo').length;

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    document.body.classList.add('mobile-nav-open');
    const focusTimer = window.setTimeout(() => {
      mobileCloseButtonRef.current?.focus();
      if (document.activeElement !== mobileCloseButtonRef.current) {
        mobileDrawerRef.current?.focus();
      }
    }, 0);
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.classList.remove('mobile-nav-open');
      document.removeEventListener('keydown', handleKeyDown);
      mobileMenuButtonRef.current?.focus();
    };
  }, [mobileNavOpen]);

  // Nav stays expanded on all routes now — receiving page no longer needs the space

  return (
    <div className={`app-shell ${mobileNavOpen ? 'mobile-nav-is-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} ${workspaceRoute ? 'workspace-nav-compact' : ''}`}>
      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className="sidebar"
        id="mobile-navigation-drawer"
        aria-label="Primary navigation"
        ref={mobileDrawerRef}
        tabIndex={-1}
      >
        <div className="brand">
          <img src="/marks-logo.png" alt="Marks Photo" className="brand-logo" />
          <div className="brand-sub">Marks Photo</div>
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Close navigation"
            ref={mobileCloseButtonRef}
            onClick={() => setMobileNavOpen(false)}
          >
            <Icon.Close />
          </button>
        </div>

        <nav className="nav-section" aria-label="Primary">
          <ul className="nav-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {visibleNav.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive || (item.path === '/imports' && location.pathname.startsWith('/imports/')) ? 'active' : ''}`}
                  end={item.path === '/dashboard'}
                  onClick={() => setMobileNavOpen(false)}
	                >
	                  {item.icon}
	                  <span className="nav-label">{item.label}</span>
	                  {item.path === '/dashboard' && alertCount > 0 && (
	                    <span className="nav-badge">{alertCount}</span>
                  )}
                </NavLink>
                {item.children && (
                  <ul className="nav-sublist" aria-label={`${item.label} submenu`}>
                    {item.children.map(child => (
                      <li key={child.path}>
                        <NavLink
                          to={child.path}
                          className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                          end={child.path === '/receiving'}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <button className="sidebar-footer" onClick={() => setProfileOpen(true)} title="Your profile">
          <span className="sidebar-user-avatar" aria-hidden="true">
            {auth?.avatar || (auth?.displayName || auth?.name || 'M')[0]}
          </span>
          <span className="sidebar-user-copy">
            <strong>{auth?.displayName || auth?.name || 'Marks User'}</strong>
            <small>{auth?.role || (skus.loading ? 'Loading…' : skus.error ? 'Connection error' : 'Live')}</small>
          </span>
        </button>
        {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
              aria-controls="mobile-navigation-drawer"
              aria-expanded={mobileNavOpen}
              ref={mobileMenuButtonRef}
              onClick={() => setMobileNavOpen(true)}
            >
              <Icon.Menu />
            </button>
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-right">
            {location.pathname === '/imports' && (
              <button className="btn btn-ghost" type="button" onClick={() => navigate('import-history')}>
                Import History
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => window.location.reload()} title="Refresh" aria-label="Refresh">
              <Icon.Refresh />
            </button>
          </div>
        </header>

        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard navigate={navigate} />} />
            <Route path="/imports" element={<IntakePage navigate={navigate} />} />
            <Route path="/imports/history" element={<RouteImportHistoryPage />} />
            <Route path="/receiving" element={<ReceivingPage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/items" element={<RouteItemsPage navigate={navigate} />} />
            <Route path="/jobs" element={<JobsPage navigate={navigate} />} />
            <Route path="/jobs/new" element={<NewJobPage navigate={navigate} />} />
            <Route path="/clients" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/intake" element={<Navigate to="/imports" replace />} />
            <Route path="/intake/import-history" element={<Navigate to="/imports/history" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.currentUser()
      .then(data => {
        if (cancelled) return;
        saveAuth(data.user);
        setAuth(data.user);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        setAuth(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!authReady) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      <BrowserRouter>
        {auth ? <AppLayout /> : <LoginScreen onLogin={setAuth} />}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
