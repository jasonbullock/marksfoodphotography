import { useState, useEffect, useCallback, useRef } from 'react';
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
  return ['production', 'in cf', 'in creative force'].includes(itemStatus(item));
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
    .filter(r => (r.reviewStatus || 'Needs Review') === 'Needs Review')
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

function receivingDeliveryLabel(receipt) {
  const raw = String(receipt?.receipt || receipt?.name || '').trim();
  return raw || 'Current Delivery';
}

function recordPhotoUrl(record) {
  return receivingPhotoUrl(record?.photos?.[0]) || receivingPhotoUrl(record?.photoMetadata?.[0]);
}

function RecordThumbnail({ record, className = '', count }) {
  const [failed, setFailed] = useState(false);
  const url = !failed ? recordPhotoUrl(record) : '';
  const total = count ?? Math.max(record?.photos?.length || 0, record?.photoMetadata?.length || 0);
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
  const receiptList = useResource(() => api.listReceipts({ reviewStatus: 'Needs Review' }));
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
    locationId: loadRecentReceivingLocations()[0] || '',
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
      locationId: defaultLocationId || loadRecentReceivingLocations()[0] || '',
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
      if (photo) URL.revokeObjectURL(photo.previewUrl);
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
    resetEntry(loadRecentReceivingLocations()[0] || '');
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
            {saving ? 'Starting...' : 'Start Delivery'}
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

function ReceivingPageLegacy() {
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const [mode, setMode] = useState(defaultReceivingMode);
  const [form, setForm] = useState({
    clientId: '',
    carrier: '',
    tracking: '',
    boxQuantity: 1,
    received: toDatetimeLocal(),
    notes: '',
    photos: [''],
  });
  const [entries, setEntries] = useState([emptyReceiptEntry()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const clientList = (clients.data?.records ?? []).filter(client => client.active !== false);
  const locationList = (locations.data?.records ?? []).filter(location => location.active !== false);

  if (locations.error) return <div className="error-state">{locations.error}</div>;

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setPhoto(index, value) {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((photo, photoIndex) => photoIndex === index ? value : photo),
    }));
  }

  function addPhotoField() {
    setForm(prev => ({ ...prev, photos: [...prev.photos, ''] }));
  }

  function removePhotoField(index) {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, photoIndex) => photoIndex !== index) }));
  }

  function setEntry(index, field, value) {
    setEntries(prev => prev.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, [field]: value } : entry
    )));
  }

  function addEntry() {
    setEntries(prev => [...prev, emptyReceiptEntry()]);
  }

  function removeEntry(index) {
    setEntries(prev => prev.length > 1 ? prev.filter((_, entryIndex) => entryIndex !== index) : prev);
  }

  async function submitReceiving(event) {
    event.preventDefault();
    setError('');
    setSuccess(null);
    const cleanedEntries = entries.map(entry => ({
      productName: entry.productName.trim(),
      skuId: entry.skuId.trim(),
      quantity: Number(entry.quantity),
      locationId: entry.locationId,
      condition: entry.condition,
      description: entry.description.trim(),
      notes: entry.notes.trim(),
    }));
    if (!cleanedEntries.length || cleanedEntries.some(entry => !Number.isFinite(entry.quantity) || entry.quantity < 1)) {
      setError('Each merchandise entry needs a quantity of at least 1.');
      return;
    }
    const photoUrls = form.photos.map(photo => photo.trim()).filter(Boolean);
    setSaving(true);
    try {
      const receipt = await api.createReceipt({
        clientId: form.clientId,
        carrier: form.carrier.trim(),
        tracking: form.tracking.trim(),
        boxQuantity: Number(form.boxQuantity || 1),
        received: form.received,
        notes: form.notes.trim(),
        photos: photoUrls.map(url => ({ url })),
        entries: cleanedEntries,
      });
      setSuccess(receipt);
      setForm({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal(), notes: '', photos: [''] });
      setEntries([emptyReceiptEntry()]);
    } catch (err) {
      setError(err.message || 'Receiving could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="receiving-page">
      <div className="receiving-mode-switch">
        <button type="button" className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>Quick Capture</button>
        <button type="button" className={mode === 'desktop' ? 'active' : ''} onClick={() => setMode('desktop')}>Receipt Form</button>
      </div>
      {mode === 'quick' && <QuickReceivingCapture locationList={locationList} />}
      {mode === 'desktop' && (
      <form className="receiving-card" onSubmit={submitReceiving}>
        <div className="receiving-head">
          <div>
            <h2>Receive Merchandise</h2>
            <p>Log what physically arrived. Item matching happens later in Verification.</p>
          </div>
        </div>

        {error && <div className="error-state">{error}</div>}
        {success && (
          <div className="notice-state">
            Receiving session logged and sent to Verification.
          </div>
        )}

        <div className="form-grid receiving-session-grid">
          <div className="field">
            <label>Client</label>
            <select value={form.clientId} onChange={event => setField('clientId', event.target.value)}>
              <option value="">Unknown / not identified</option>
              {clientList.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Received</label>
            <input type="datetime-local" value={form.received} onChange={event => setField('received', event.target.value)} />
          </div>
          <div className="field">
            <label>Carrier</label>
            <input value={form.carrier} onChange={event => setField('carrier', event.target.value)} />
          </div>
          <div className="field">
            <label>Tracking</label>
            <input value={form.tracking} onChange={event => setField('tracking', event.target.value)} />
          </div>
          <div className="field full">
            <label>Photos</label>
            <div className="receiving-photo-list">
              {form.photos.map((photo, index) => (
                <div className="receiving-photo-row" key={index}>
                  <input value={photo} onChange={event => setPhoto(index, event.target.value)} placeholder="Airtable attachment URL" />
                  {form.photos.length > 1 && (
                    <button className="btn btn-ghost" type="button" onClick={() => removePhotoField(index)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn btn-alt" type="button" onClick={addPhotoField}>Add Photo URL</button>
            </div>
          </div>
          <div className="field full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={event => setField('notes', event.target.value)} rows="3" />
          </div>
        </div>

        <div className="receiving-section-head">
          <h3>Merchandise Entries</h3>
          <button className="btn btn-alt" type="button" onClick={addEntry}>Add Merchandise</button>
        </div>

        <div className="receiving-entry-list">
          {entries.map((entry, index) => (
            <div className="receiving-entry-card" key={index}>
              <div className="receiving-entry-title">
                <span>Merchandise {index + 1}</span>
                {entries.length > 1 && (
                  <button className="link-btn" type="button" onClick={() => removeEntry(index)}>Remove</button>
                )}
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Product Name</label>
                  <input value={entry.productName} onChange={event => setEntry(index, 'productName', event.target.value)} />
                </div>
                <div className="field">
                  <label>SKU / ID</label>
                  <input value={entry.skuId} onChange={event => setEntry(index, 'skuId', event.target.value)} />
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input type="number" min="1" value={entry.quantity} onChange={event => setEntry(index, 'quantity', event.target.value)} />
                </div>
                <div className="field">
                  <label>Storage Location</label>
                  <select value={entry.locationId} onChange={event => setEntry(index, 'locationId', event.target.value)}>
                    <option value="">Select location...</option>
                    {locationList.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Condition</label>
                  <select value={entry.condition} onChange={event => setEntry(index, 'condition', event.target.value)}>
                    <option>Good</option>
                    <option>Damaged</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Description</label>
                  <input value={entry.description} onChange={event => setEntry(index, 'description', event.target.value)} />
                </div>
                <div className="field full">
                  <label>Notes</label>
                  <textarea value={entry.notes} onChange={event => setEntry(index, 'notes', event.target.value)} rows="2" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions receiving-actions">
          <button type="button" className="btn" onClick={() => {
            setForm({ clientId: '', carrier: '', tracking: '', received: toDatetimeLocal(), notes: '', photos: [''] });
            setEntries([emptyReceiptEntry()]);
            setError('');
            setSuccess(null);
          }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || clients.loading || locations.loading}>
            {saving ? 'Saving...' : 'Complete Receiving'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

function ReceivingPage() {
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const carrierOptions = useResource(() => api.airtableSingleSelectOptions({ tableName: 'Receipts', fieldName: 'Carrier' }));
  const [step, setStep] = useState('start');
  const [receipt, setReceipt] = useState(null);
  const [session, setSession] = useState({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal() });
  const [entry, setEntryState] = useState(() => ({
    ...emptyReceiptEntry(),
    locationId: loadRecentReceivingLocations()[0] || '',
  }));
  const [entryPhotos, setEntryPhotos] = useState([]);
  const [savedEntries, setSavedEntries] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [recentEntryIds, setRecentEntryIds] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const productNameRef = useRef(null);

  const clientList = (clients.data?.records ?? []).filter(client => client.active !== false);
  const locationList = (locations.data?.records ?? []).filter(location => location.active !== false);
  const carrierList = carrierOptions.data?.options ?? [];
  const carrierSelectOptions = session.carrier && !carrierList.includes(session.carrier)
    ? [session.carrier, ...carrierList]
    : carrierList;
  const entryCount = savedEntries.length;
  const entryCountLabel = `${entryCount} Entr${entryCount === 1 ? 'y' : 'ies'} Received`;
  const locationNameById = Object.fromEntries(locationList.map(location => [location.id, location.name]));

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 1200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function setSessionField(field, value) {
    setSession(prev => ({ ...prev, [field]: value }));
  }

  function setEntry(field, value) {
    setEntryState(prev => ({ ...prev, [field]: value }));
  }

  async function addEntryPhotos(files) {
    const localPhotos = photoFilesFromInput(files);
    if (!localPhotos.length) return;
    setEntryPhotos(prev => [...prev, ...localPhotos]);
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  function removeEntryPhoto(photoId) {
    setEntryPhotos(prev => {
      const photo = prev.find(item => item.id === photoId);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter(item => item.id !== photoId);
    });
  }

  function resetActiveEntry(defaultLocationId = entry.locationId, defaultCondition = entry.condition || 'Good') {
    setEntryPhotos(prev => {
      prev.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
    setEntryState({
      ...emptyReceiptEntry(),
      locationId: defaultLocationId || loadRecentReceivingLocations()[0] || '',
      condition: defaultCondition || 'Good',
    });
    setDetailsOpen(false);
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  async function startDelivery(event) {
    event.preventDefault();
    setError('');
    const boxQuantity = Number(session.boxQuantity);
    if (!Number.isFinite(boxQuantity) || boxQuantity < 1) {
      setError('Box Quantity must be at least 1.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.startReceivingSession({
        clientId: session.clientId,
        carrier: session.carrier.trim(),
        tracking: session.tracking.trim(),
        boxQuantity,
        received: session.received,
      });
      setReceipt(created);
      setSavedEntries(created.entries || []);
      setStep('capture');
      setTimeout(() => productNameRef.current?.focus(), 0);
    } catch (err) {
      setError(err.message || 'Could not start delivery.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNext() {
    setError('');
    if (!receipt) {
      setError('Start the delivery before adding merchandise.');
      return;
    }
    const quantity = Number(entry.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setSaving(true);
    let uploadDelay;
    try {
      let saved = await api.createReceiptEntry(receipt.id, {
        productName: entry.productName.trim(),
        skuId: entry.skuId.trim(),
        quantity,
        locationId: entry.locationId,
        condition: entry.condition || 'Good',
        description: entry.description.trim(),
        notes: entry.notes.trim(),
      });
      if (entryPhotos.length > 0) {
        try {
          uploadDelay = window.setTimeout(() => setShowUploadProgress(true), 1000);
          const uploaded = await api.uploadReceivingPhotos(entryPhotos.map(photo => photo.file), {
            receiptId: receipt.id,
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
      setSavedEntries(prev => [...prev, saved]);
      setRecentEntryIds(saved.id ? [saved.id] : []);
      window.setTimeout(() => setRecentEntryIds(current => current.includes(saved.id) ? [] : current), 3200);
      resetActiveEntry(entry.locationId, entry.condition || 'Good');
      if (!entryPhotos.length || saved.photos?.length || saved.photoMetadata?.length) {
        setToast('Entry Saved');
      }
    } catch (err) {
      if (uploadDelay) window.clearTimeout(uploadDelay);
      setShowUploadProgress(false);
      setError(err.message || 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  }

  function finishDelivery() {
    setStep('start');
    setReceipt(null);
    setSavedEntries([]);
    setSession({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal() });
    resetActiveEntry(loadRecentReceivingLocations()[0] || '', 'Good');
  }

  async function copyReceivingEntry(saved) {
    const value = receivingEntrySku(saved) || receivingEntryLabel(saved);
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setToast('Copied');
    } catch {
      setError('Could not copy this value.');
    }
  }

  if (clients.error || locations.error) return <div className="error-state">{clients.error || locations.error}</div>;

  return (
    <div className="receiving-page is-simple">
      {error && <div className="error-state">{error}</div>}
      {toast && <div className={`receiving-toast ${toast === 'Entry Saved' ? 'is-success' : ''}`} role="status">✓ {toast}</div>}
      {previewPhoto && (
        <button type="button" className="receiving-photo-preview" onClick={() => setPreviewPhoto(null)} aria-label="Close photo preview">
          <img src={previewPhoto.url} alt={previewPhoto.name || 'Receiving photo preview'} />
        </button>
      )}

      {step === 'start' && (
        <form className="receiving-card receiving-start-card" onSubmit={startDelivery}>
          <div className="receiving-head">
            <div>
              <h2>Start Delivery</h2>
            </div>
          </div>
          <div className="receiving-start-full">
            <FormSelect
              id="receiving-client"
              label="Client"
              className="receiving-start-select receiving-client-select"
              value={session.clientId}
              onChange={event => setSessionField('clientId', event.target.value)}
            >
              <option value="">Unknown / not identified</option>
              {clientList.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </FormSelect>
          </div>
          <FormSelect
            id="receiving-carrier"
            label="Carrier"
            className="receiving-start-select"
            value={session.carrier}
            onChange={event => setSessionField('carrier', event.target.value)}
          >
            <option value="">Select carrier…</option>
            {carrierSelectOptions.map(carrier => <option key={carrier} value={carrier}>{carrier}</option>)}
          </FormSelect>
          <div className="mobile-field">
            <label>Tracking</label>
            <input value={session.tracking} onChange={event => setSessionField('tracking', event.target.value)} placeholder="Optional" />
          </div>
          <div className="mobile-field receiving-start-boxes-field">
            <label>Boxes</label>
            <div className="mobile-stepper receiving-start-stepper">
              <button type="button" onClick={() => setSessionField('boxQuantity', Math.max(1, Number(session.boxQuantity || 1) - 1))}>−</button>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                required
                placeholder="0"
                value={session.boxQuantity}
                onChange={event => setSessionField('boxQuantity', event.target.value)}
              />
              <button type="button" onClick={() => setSessionField('boxQuantity', Number(session.boxQuantity || 0) + 1)}>+</button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary receiving-start-button" disabled={saving || clients.loading}>
            {saving ? 'Starting...' : 'Start Receiving'}
          </button>
        </form>
      )}

      {step === 'capture' && receipt && (
        <div className="receiving-workspace">
          <aside className="receiving-current-panel">
            <div className="receiving-current-head">
              <span>Current Delivery</span>
              <strong>{entryCountLabel}</strong>
            </div>
            <div className="receiving-current-list">
              {savedEntries.length === 0 ? (
                <div className="receiving-current-empty">No merchandise entered yet</div>
              ) : savedEntries.map((saved, index) => {
                const locationId = saved.locationIds?.[0] || saved.locationId;
                const locationName = locationNameById[locationId] || saved.locationName || '';
                const quantity = Number(saved.quantity || 1);
                const skuId = receivingEntrySku(saved);
                return (
                <div className={`receiving-current-row ${recentEntryIds.includes(saved.id) ? 'is-recent' : ''}`} role="button" tabIndex={0} key={saved.id || index}>
                  <RecordThumbnail record={saved} className="receiving-current-thumb" />
                  <span className="receiving-current-copy">
                    <strong>{receivingEntryLabel(saved)}</strong>
                    {skuId && <em>{skuId}</em>}
                    <small>Qty {Number.isFinite(quantity) ? quantity : 1}{locationName ? ` • ${locationName}` : ''}</small>
                  </span>
                  <span className="receiving-current-actions">
                    <button
                      type="button"
                      className="receiving-current-copy-button"
                      onClick={event => { event.stopPropagation(); copyReceivingEntry(saved); }}
                    >
                      Copy
                    </button>
                    <span className="receiving-current-chevron" aria-hidden="true">›</span>
                  </span>
                </div>
                );
              })}
            </div>
            <div className="receiving-current-count">
              {entryCount} merchandise entr{entryCount === 1 ? 'y' : 'ies'}
            </div>
          </aside>

          <section className="receiving-scan-panel">
            <div className="receiving-scan-head">
              <div>
                <h2>Receiving</h2>
                <span>{receivingDeliveryLabel(receipt)}</span>
              </div>
              <strong className="receiving-entry-count">{entryCountLabel}</strong>
            </div>

            <div className="receiving-scan-form">
              <div className="mobile-field receiving-photo-field">
                <label>Photo</label>
                <div className="mobile-photo-actions">
                  <button type="button" className="mobile-photo-button primary" onClick={() => cameraInputRef.current?.click()}>Take Photo</button>
                  <button type="button" className="mobile-photo-button" onClick={() => libraryInputRef.current?.click()}>Photo Library</button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={event => { addEntryPhotos(event.target.files); event.target.value = ''; }} />
                <input ref={libraryInputRef} type="file" accept="image/*" multiple hidden onChange={event => { addEntryPhotos(event.target.files); event.target.value = ''; }} />
                {entryPhotos.length > 0 && (
                  <div className="mobile-photo-strip compact">
                    {entryPhotos.map(photo => (
                      <button type="button" className="mobile-thumb" key={photo.id} onClick={() => setPreviewPhoto({ url: photo.previewUrl, name: photo.name })} title="View photo">
                        <img src={photo.previewUrl} alt="" />
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={event => { event.stopPropagation(); removeEntryPhoto(photo.id); }}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              removeEntryPhoto(photo.id);
                            }
                          }}
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showUploadProgress && (
                  <div className="receiving-upload-progress" role="status">
                    <span />
                    Uploading photos...
                  </div>
                )}
              </div>

              <div className="mobile-field receiving-product-field">
                <label>PRODUCT NAME</label>
                <input ref={productNameRef} value={entry.productName} onChange={event => setEntry('productName', event.target.value)} placeholder="Name printed on package" />
              </div>

              <div className="mobile-field receiving-quantity-field">
                <label>QTY</label>
                <div className="mobile-stepper compact">
                  <button type="button" onClick={() => setEntry('quantity', Math.max(1, Number(entry.quantity || 1) - 1))}>−</button>
                  <input type="number" min="1" inputMode="numeric" value={entry.quantity} onChange={event => setEntry('quantity', event.target.value)} />
                  <button type="button" onClick={() => setEntry('quantity', Number(entry.quantity || 0) + 1)}>+</button>
                </div>
              </div>

              <div className="mobile-field receiving-sku-field">
                <label>SKU / ID</label>
                <input value={entry.skuId} onChange={event => setEntry('skuId', event.target.value)} placeholder="Optional" />
              </div>

              <div className="mobile-field receiving-description-field">
                <label>DESCRIPTION</label>
                <input value={entry.description} onChange={event => setEntry('description', event.target.value)} placeholder="Package detail, flavor, size, or damage" />
              </div>

              <div className="receiving-location-field">
                <FormSelect
                  id="receiving-storage-location"
                  label="STORAGE LOCATION"
                  className="receiving-workspace-select"
                  value={entry.locationId}
                  onChange={event => setEntry('locationId', event.target.value)}
                >
                  <option value="">Select location...</option>
                  {locationList.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </FormSelect>
              </div>

              <button className="receiving-details-toggle" type="button" onClick={() => setDetailsOpen(open => !open)}>
                <span aria-hidden="true">{detailsOpen ? '▼' : '▶'}</span>
                More Details
              </button>

              {detailsOpen && (
                <div className="receiving-more-details">
                  <div className="mobile-field">
                    <label>Condition</label>
                    <select className="receiving-native-select" value={entry.condition} onChange={event => setEntry('condition', event.target.value)}>
                      <option>Good</option>
                      <option>Damaged</option>
                      <option>Unknown</option>
                    </select>
                  </div>
                  <div className="mobile-field">
                    <label>Notes</label>
                    <textarea value={entry.notes} onChange={event => setEntry('notes', event.target.value)} rows="2" placeholder="Optional" />
                  </div>
                </div>
              )}
            </div>

            <div className="mobile-receiving-actions">
              <button type="button" className="btn btn-alt" onClick={finishDelivery} disabled={saving}>Finish Delivery</button>
              <button type="button" className="btn btn-primary" onClick={saveNext} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Next'}
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}

// ── Jobs page ─────────────────────────────────────────────────────────────────
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
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState('');
  const [error, setError] = useState('');
  const [queueTab, setQueueTab] = useState('verify');

  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(client => [client.id, client]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const activeRecords = records.filter(record => record.verificationStatus !== 'Verified');
  const toVerifyRecords = activeRecords.filter(record => record.verificationStatus !== 'Awaiting Item Import');
  const waitingRecords = activeRecords.filter(record => record.verificationStatus === 'Awaiting Item Import');
  const queueRecords = queueTab === 'waiting' ? waitingRecords : toVerifyRecords;
  const selected = queueRecords.find(record => record.id === selectedId) || queueRecords[0];
  const selectedClientId = selected?.clientIds?.[0] || '';
  const selectedLocation = selected?.locationId ? locationMap[selected.locationId]?.name : '';

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
    const nextSelection = queueRecords.find(record => record.id !== selected.id)?.id || '';
    try {
      await api.matchVerificationEntry(selected.id, itemId);
      await entries.reload();
      setMatches([]);
      setSelectedId(nextSelection);
    } catch (err) {
      setError(err.message || 'Could not match this entry.');
    } finally {
      setMatching('');
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
    <div className="verification-page">
      {error && <div className="error-state">{error}</div>}
      <aside className="verification-queue">
        <div className="verification-tabs" role="tablist" aria-label="Verification queues">
          <button type="button" className={queueTab === 'verify' ? 'is-active' : ''} onClick={() => setQueueTab('verify')}>
            <span>To Verify</span>
            <strong>{toVerifyRecords.length}</strong>
          </button>
          <button type="button" className={queueTab === 'waiting' ? 'is-active' : ''} onClick={() => setQueueTab('waiting')}>
            <span>Waiting for Import</span>
            <strong>{waitingRecords.length}</strong>
          </button>
        </div>
        <div className="verification-entry-list">
          {queueRecords.length === 0 && (
            <div className="verification-queue-empty">
              {queueTab === 'waiting' ? 'No entries are waiting for import.' : 'No entries are ready to verify.'}
            </div>
          )}
          {queueRecords.map(record => {
            const client = clientMap[record.clientIds?.[0]];
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
                  <small>{record.brand || 'No brand'}{record.packageSize ? ` · ${record.packageSize}` : ''}</small>
                  <em>{client?.name || 'Unknown client'} · Qty {record.quantity || 1}</em>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {selected ? <section className="verification-detail">
        <div className="verification-card verification-physical-card">
          <div className="verification-photo-grid">
            {(selected.photos?.length || selected.photoMetadata?.length) ? (
              [...(selected.photos || []), ...(selected.photoMetadata || [])].slice(0, 8).map((photo, index) => {
                const url = receivingPhotoUrl(photo);
                return url ? <img src={url} alt="" key={`${url}-${index}`} /> : null;
              })
            ) : (
              <div className="verification-no-photo">No photos</div>
            )}
          </div>

          <div className="verification-card-head">
            <div>
              <h2>{selected.productName || 'Unnamed Product'}</h2>
            </div>
            <span className="verification-status">{selected.verificationStatus}</span>
          </div>

          <div className="verification-facts-grid">
            {fact('Product Name', selected.productName)}
            {fact('Brand', selected.brand)}
            {fact('Package Size', selected.packageSize)}
            {fact('SKU / ID', selected.skuId)}
            {fact('Quantity', selected.quantity || 1)}
            {fact('Storage Location', selectedLocation)}
            {fact('Condition', selected.condition)}
            {fact('Notes', selected.notes)}
          </div>
        </div>

        <div className="verification-card verification-match-card">
          <div className="verification-card-head">
            <div>
              <span>Find Item</span>
              <h2>Match imported merchandise</h2>
            </div>
          </div>
          <input
            className="verification-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search imported Items"
          />
          <div className="verification-results">
            {searching && <div className="verification-muted">Searching Items…</div>}
            {!searching && query.trim().length >= 3 && matches.length === 0 && (
              <div className="verification-muted">
                <strong>No matching item found.</strong>
                <span>This merchandise will remain in Waiting for Import until the Item is imported.</span>
              </div>
            )}
            {!searching && query.trim().length < 3 && (
              <div className="verification-muted">Type at least 3 characters to search imported Items.</div>
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
        </div>
      </section> : (
        <section className="verification-detail-empty">
          Select a work item to verify.
        </section>
      )}
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> },
  { path: '/imports', label: 'Imports', icon: <Icon.Add /> },
  { path: '/receiving', label: 'Receiving', icon: <Icon.Upload /> },
  { path: '/verification', label: 'Verification', icon: <Icon.ChevronRight /> },
  { path: '/items', label: 'Items', icon: <Icon.SKUs /> },
  { path: '/jobs', label: 'Jobs', icon: <Icon.Jobs /> },
  { path: '/clients', label: 'Clients', icon: <Icon.Settings /> },
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
  if (pathname.startsWith('/imports')) return 'Imports';
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
  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigate = (page, params = {}) => routerNavigate(routeForPage(page, params));
  const pageTitle = pageTitleForPath(location.pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef(null);
  const mobileCloseButtonRef = useRef(null);
  const mobileDrawerRef = useRef(null);

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

  return (
    <div className={`app-shell ${mobileNavOpen ? 'mobile-nav-is-open' : ''}`}>
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
          <img src="/marks-logo.png" alt="Marks Photo" style={{ width: 90, display: 'block', marginBottom: 4, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
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
            {NAV_ITEMS.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive || (item.path === '/imports' && location.pathname.startsWith('/imports/')) ? 'active' : ''}`}
                  end={item.path === '/dashboard'}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.icon}
                  {item.label}
                  {item.path === '/dashboard' && alertCount > 0 && (
                    <span className="nav-badge">{alertCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" style={{ background: skus.error ? 'var(--red)' : 'var(--green)' }} />
          <span className="status-label">
            {skus.loading ? 'Loading…' : skus.error ? 'Connection error' : 'Live'}
          </span>
        </div>
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
            <Route path="/clients" element={<SettingsPage />} />
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
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
