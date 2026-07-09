import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { api } from './api';
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

// ── Client logo ──────────────────────────────────────────────────────────────
// Drop a file named {clientId}.png into frontend/public/client-logos/ and it
// appears automatically. Falls back to an initials avatar.
function ClientLogo({ clientId, clientName, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const initials = (clientName || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Cycle through common extensions
  const src = `/client-logos/${clientId}.png`;

  if (!clientId || failed) {
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
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: 5, flexShrink: 0,
        objectFit: 'contain', background: '#fff',
        border: '1px solid var(--border)',
      }}
    />
  );
}

// ── Bucket ───────────────────────────────────────────────────────────────────
function Bucket({ type, label, count, children, empty }) {
  return (
    <div className={`bucket ${type}`}>
      <div className="bucket-header">
        <span>{label}</span>
        {count > 0 && <span className="count">{count}</span>}
      </div>
      {count === 0
        ? <div className="empty-state">{empty}</div>
        : children
      }
    </div>
  );
}

// ── Mini donut chart ─────────────────────────────────────────────────────────
function DonutChart({ data, cx = 90, size = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius="58%" outerRadius="80%"
            dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' }}>{total}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>total SKUs</div>
      </div>
    </div>
  );
}

// ── Dashboard card wrapper ────────────────────────────────────────────────────
function Card({ title, action, children, style }) {
  return (
    <div className="dash-card" style={style}>
      <div className="dash-card-header">
        <span className="dash-card-title">{title}</span>
        {action && <span className="dash-card-action">{action}</span>}
      </div>
      <div className="dash-card-body">{children}</div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ navigate }) {
  const jobs    = useResource(() => api.listJobs());
  const skus    = useResource(() => api.listSkus());
  const clients = useResource(() => api.listClients());

  const jobList    = jobs.data?.records ?? [];
  const clientList = clients.data?.records ?? [];
  const [skuList, setSkuList] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (skus.data?.records) setSkuList(skus.data.records);
  }, [skus.data]);

  const noMerch    = skuList.filter(s => !s.merchVerified);
  const noGtin     = skuList.filter(s => !s.gtinUpc);
  const bothOpen   = skuList.filter(s => !s.merchVerified && !s.gtinUpc);
  const readySKUs  = skuList.filter(s => s.merchVerified && s.gtinUpc);
  const inProgress = skuList.filter(s => s.merchVerified && !s.gtinUpc);

  const upcoming = [...jobList]
    .filter(j => j.deadline)
    .sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999))
    .slice(0, 8);

  const loading = jobs.loading || skus.loading;
  const error   = jobs.error || skus.error;

  // SKU readiness donut data
  const donutData = [
    { name: 'Ready', value: readySKUs.length, color: '#16a34a' },
    { name: 'Need merch', value: noMerch.length - bothOpen.length, color: '#dc2626' },
    { name: 'Need GTIN', value: inProgress.length, color: '#d97706' },
    { name: 'Both open', value: bothOpen.length, color: '#f87171' },
  ].filter(d => d.value > 0);

  // SKUs per job bar data
  const barData = jobList.slice(0, 8).map(j => {
    const jobSkus = skuList.filter(s => s.jobIds?.includes(j.id));
    const ready   = jobSkus.filter(s => s.merchVerified && s.gtinUpc).length;
    const pending = jobSkus.length - ready;
    return {
      name: j.sgsJobNum || j.name?.slice(0, 10) || j.id.slice(0, 6),
      Ready: ready,
      Pending: pending,
    };
  }).filter(d => d.Ready + d.Pending > 0);

  async function markMerch(sku) {
    setTogglingId(sku.id);
    try {
      const updated = await api.updateSku(sku.id, { merchVerified: true });
      setSkuList(prev => prev.map(s => s.id === sku.id ? updated : s));
    } catch (e) {
      alert('Update failed: ' + e.message);
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <div className="empty-state" style={{ paddingTop: 60 }}>Loading…</div>;

  const blockedCount = noMerch.length + noGtin.length;

  return (
    <div className="dash-grid">
      {error && <div className="error-state" style={{ gridColumn: '1/-1' }}>{error}</div>}

      {/* ── Row 1: KPI strip ── */}
      <div className="dash-kpi-strip">
        {[
          { label: 'Total SKUs',      value: skuList.length,    color: 'var(--text)' },
          { label: 'Ready to shoot',  value: readySKUs.length,  color: '#16a34a' },
          { label: 'Blocked',         value: blockedCount,      color: blockedCount > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Active jobs',     value: jobList.length,    color: 'var(--text)' },
          { label: 'Need merch',      value: noMerch.length,    color: noMerch.length > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Missing GTIN',    value: noGtin.length,     color: noGtin.length > 0 ? '#d97706' : '#16a34a' },
        ].map(k => (
          <div className="dash-kpi" key={k.label}>
            <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
            <div className="dash-kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Donut + Bar + Action queue ── */}
      <Card title="SKU Readiness" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {donutData.length > 0
            ? <DonutChart data={donutData} size={160} />
            : <div className="empty-state" style={{ flex: 1 }}>No SKUs yet</div>
          }
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {[
              { label: 'Ready to shoot', value: readySKUs.length,  color: '#16a34a' },
              { label: 'Need merch',     value: noMerch.length,    color: '#dc2626' },
              { label: 'Missing GTIN',   value: noGtin.length,     color: '#d97706' },
              { label: 'Both gates open',value: bothOpen.length,   color: '#f87171' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
                {skuList.length > 0 && (
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(item.value / skuList.length * 100)}%`, height: '100%', background: item.color, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="SKUs per Job" style={{ gridColumn: 'span 5' }}>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={18} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="Ready"   stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
              <Bar dataKey="Pending" stackId="a" fill="#e5e7eb" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">No job data yet</div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          {[['#16a34a','Ready'],['#e5e7eb','Pending']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Row 3: Action queue + Deadlines ── */}
      <Card
        title="Needs action"
        action={blockedCount > 0 && <span className="badge badge-red">{blockedCount}</span>}
        style={{ gridColumn: 'span 4' }}
      >
        {noMerch.length === 0 && noGtin.length === 0 && (
          <div className="empty-state">Nothing blocked right now.</div>
        )}

        {noMerch.slice(0, 5).map(sku => (
          <div className="dash-action-row" key={'m' + sku.id}>
            <div className="dash-action-dot" style={{ background: '#dc2626' }} />
            <div className="dash-action-main">
              <div className="dash-action-title">{sku.name || sku.gtinUpc || sku.id.slice(-6)}</div>
              <div className="dash-action-sub">No merch · {sku.brand || 'unknown brand'}</div>
            </div>
            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
              disabled={togglingId === sku.id}
              onClick={() => markMerch(sku)}>
              {togglingId === sku.id ? '…' : '✓ Verify'}
            </button>
          </div>
        ))}

        {noGtin.filter(s => s.gtinUpc === '').slice(0, 5).map(sku => (
          <div className="dash-action-row" key={'g' + sku.id}>
            <div className="dash-action-dot" style={{ background: '#d97706' }} />
            <div className="dash-action-main">
              <div className="dash-action-title">{sku.name || sku.id.slice(-6)}</div>
              <div className="dash-action-sub">No GTIN — CF blocked</div>
            </div>
            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => navigate('skus', { jobId: sku.jobIds?.[0] })}>
              Add UPC
            </button>
          </div>
        ))}
        {noGtin.filter(s => !s.gtinUpc).slice(0, 5).map(sku => (
          <div className="dash-action-row" key={'g2' + sku.id}>
            <div className="dash-action-dot" style={{ background: '#d97706' }} />
            <div className="dash-action-main">
              <div className="dash-action-title">{sku.name || sku.id.slice(-6)}</div>
              <div className="dash-action-sub">No GTIN — CF blocked</div>
            </div>
            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => navigate('skus', { jobId: sku.jobIds?.[0] })}>
              Add UPC
            </button>
          </div>
        ))}
      </Card>

      <Card title="Job deadlines" style={{ gridColumn: 'span 4' }}>
        {upcoming.length === 0 && <div className="empty-state">No upcoming deadlines.</div>}
        {upcoming.map(job => {
          const days   = daysUntil(job.deadline);
          const isHot  = days !== null && days <= 3;
          const isMid  = days !== null && days <= 7;
          const client = clientList.find(c => job.clientIds?.includes(c.id));
          return (
            <div className="dash-action-row" key={job.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('skus', { jobId: job.id })}>
              <ClientLogo clientId={client?.id} clientName={client?.name} size={32} />
              <div className="dash-action-main">
                <div className="dash-action-title">{job.name}</div>
                <div className="dash-action-sub">
                  {client?.name && <>{client.name} · </>}
                  {job.deadline ? fmtDate(job.deadline) : 'No deadline'}
                  {job.period ? ` · ${job.period}` : ''}
                </div>
              </div>
              <div style={{
                minWidth: 36, textAlign: 'center', borderRadius: 5, padding: '3px 6px',
                background: isHot ? '#fef2f2' : isMid ? '#fffbeb' : 'var(--surface-2)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: isHot ? '#dc2626' : isMid ? '#d97706' : 'var(--text-2)' }}>
                  {days === null ? '—' : days < 0 ? '!' : days}
                </div>
                <div style={{ fontSize: 9, color: isHot ? '#dc2626' : 'var(--text-3)', fontWeight: 600 }}>
                  {days !== null && (days < 0 ? 'OVR' : 'd')}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* ── Row 4: Pipeline + Calendar ── */}
      <Card title="Pipeline" style={{ gridColumn: 'span 5' }}>
        <PipelineBar skus={skuList} />
      </Card>

      <Card title="Schedule" style={{ gridColumn: 'span 3' }}>
        <MiniCalendar
          deadlineDates={jobList.filter(j => j.deadline).map(j => j.deadline)}
          shootDates={skuList.filter(s => s.shootDate).map(s => s.shootDate)}
        />
      </Card>
    </div>
  );
}

// ── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ deadlineDates = [], shootDates = [] }) {
  const [offset, setOffset] = useState(0); // month offset from today
  const today = new Date();
  const viewing = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year  = viewing.getFullYear();
  const month = viewing.getMonth();

  const monthLabel = viewing.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build date → events map  (key = "YYYY-MM-DD")
  const deadlineSet = new Set(deadlineDates);
  const shootSet    = new Set(shootDates);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function dayStr(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const cells = [];
  // Leading blanks
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 13 }} onClick={() => setOffset(o => o - 1)}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{monthLabel}</span>
        <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 13 }} onClick={() => setOffset(o => o + 1)}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`blank-${i}`} />;
          const key      = dayStr(d);
          const isToday  = key === todayStr;
          const hasDeadline = deadlineSet.has(key);
          const hasShoot    = shootSet.has(key);
          const hasBoth     = hasDeadline && hasShoot;

          return (
            <div key={key} style={{
              textAlign: 'center',
              padding: '4px 2px',
              borderRadius: 5,
              background: isToday ? '#1e2a3a' : hasBoth ? '#fef2f2' : hasDeadline ? '#fef2f2' : hasShoot ? '#eff6ff' : 'transparent',
              position: 'relative',
              cursor: (hasDeadline || hasShoot) ? 'pointer' : 'default',
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: isToday ? 800 : (hasDeadline || hasShoot) ? 700 : 400,
                color: isToday ? '#fff' : hasDeadline ? '#dc2626' : hasShoot ? '#2563eb' : 'var(--text-2)',
              }}>{d}</span>

              {/* Dot indicators */}
              {(hasDeadline || hasShoot) && !isToday && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                  {hasDeadline && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#dc2626' }} />}
                  {hasShoot    && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2563eb' }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} /> Deadline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} /> Shoot date
        </div>
      </div>
    </div>
  );
}

// ── Pipeline bar ─────────────────────────────────────────────────────────────
function PipelineBar({ skus }) {
  const total = skus.length;
  if (total === 0) return <div className="empty-state">No SKUs in pipeline.</div>;

  const stages = [
    { label: 'Intake',        value: total,                                                      color: '#e5e7eb' },
    { label: 'Merch verified',value: skus.filter(s => s.merchVerified).length,                   color: '#93c5fd' },
    { label: 'GTIN added',    value: skus.filter(s => s.gtinUpc).length,                         color: '#fcd34d' },
    { label: 'Shoot ready',   value: skus.filter(s => s.merchVerified && s.gtinUpc).length,      color: '#16a34a' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stages.map(stage => (
        <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>{stage.label}</div>
          <div style={{ flex: 1, height: 16, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${Math.round(stage.value / total * 100)}%`,
              height: '100%',
              background: stage.color,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ width: 36, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--text-2)', flexShrink: 0 }}>{stage.value}</div>
          <div style={{ width: 36, fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{Math.round(stage.value / total * 100)}%</div>
        </div>
      ))}
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
              <th>SGS #</th>
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
                  <td><code>{job.sgsJobNum || '—'}</code></td>
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
    clientId: '', sgsJobNum: '', clientBatchId: '', period: '', deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.clientId)  { setError('Select a client'); return; }
    if (!form.sgsJobNum) { setError('SGS job number is required'); return; }
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
            <label>SGS Job #</label>
            <input value={form.sgsJobNum} onChange={e => set('sgsJobNum', e.target.value)} placeholder="e.g. SGS-2024-001" required />
          </div>
          <div className="field">
            <label>Client Batch ID</label>
            <input value={form.clientBatchId} onChange={e => set('clientBatchId', e.target.value)} placeholder="Optional" />
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
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('jobs')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Items page ────────────────────────────────────────────────────────────────
function SkusPage({ navigate, jobId: initJobId }) {
  const jobs = useResource(() => api.listJobs());
  const [jobFilter, setJobFilter] = useState(initJobId ?? '');
  const items = useResource(
    () => api.listSkus(jobFilter || undefined),
    [jobFilter]
  );

  const jobList = jobs.data?.records ?? [];
  const [itemList, setItemList] = useState([]);

  useEffect(() => {
    if (items.data?.records) setItemList(items.data.records);
  }, [items.data]);

  function jobNames(item) {
    const names = (item.jobIds ?? [])
      .map(id => jobList.find(job => job.id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  return (
    <div className="page-stack">
      <div className="filter-bar">
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
              <th>Item</th>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Job</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.loading && <tr><td colSpan="7" className="empty-state">Loading…</td></tr>}
            {!items.loading && itemList.length === 0 && (
              <tr><td colSpan="7" className="empty-state">No Items found</td></tr>
            )}
            {itemList.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.name || '—'}</td>
                <td>
                  {item.identifier
                    ? <code>{item.identifier}</code>
                    : <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>MISSING</span>
                  }
                </td>
                <td>{item.product || '—'}</td>
                <td>{item.brand || '—'}</td>
                <td>{jobNames(item)}</td>
                <td><StatusBadge status={item.status || 'New'} /></td>
                <td>{item.received ? <span className="badge badge-green">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Add SKU form ──────────────────────────────────────────────────────────────
function AddSkuForm({ jobId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    gtinUpc: '', brand: '', vendor: '', outputType: '', masterVariant: '',
    pickupJobNum: '', specialInstr: '', merchVerified: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.gtinUpc) { setError('GTIN/UPC is required'); return; }
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
            <label>GTIN / UPC *</label>
            <input value={form.gtinUpc} onChange={e => set('gtinUpc', e.target.value)} placeholder="012345678901" required />
          </div>
          <div className="field">
            <label>Brand</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} />
          </div>
          <div className="field">
            <label>Vendor</label>
            <input value={form.vendor} onChange={e => set('vendor', e.target.value)} />
          </div>
          <div className="field">
            <label>Output Type</label>
            <input value={form.outputType} onChange={e => set('outputType', e.target.value)} placeholder="e.g. Packshot" />
          </div>
          <div className="field">
            <label>Master / Variant</label>
            <input value={form.masterVariant} onChange={e => set('masterVariant', e.target.value)} />
          </div>
          <div className="field">
            <label>Pick-up Job #</label>
            <input value={form.pickupJobNum} onChange={e => set('pickupJobNum', e.target.value)} />
          </div>
          <div className="field full">
            <label>Special Instructions</label>
            <input value={form.specialInstr} onChange={e => set('specialInstr', e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-checkbox">
              <input type="checkbox" checked={form.merchVerified} onChange={e => set('merchVerified', e.target.checked)} />
              Merch already verified
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
  const s = data?.settings;

  return (
    <div className="page-stack">
      {error && <div className="error-state">{error}</div>}
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Airtable connection</span></div>
        <div className="settings-list">
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
        </div>
      </div>
    </div>
  );
}

// ── Intake page ──────────────────────────────────────────────────────────────
const INTAKE_TARGET_LABELS = {
  'Jobs.Job': 'Jobs.Job',
  'Jobs.Job ID': 'Jobs.Job ID',
  'Jobs.Due': 'Jobs.Due',
  'Jobs.Output Type': 'Jobs.Output Type',
  'Jobs.Notes': 'Jobs.Notes',
  'Items.Item': 'Items.Item',
  'Items.Product ID': 'Items.Product ID',
  'Items.Product Name': 'Items.Product Name',
  'Items.Brand': 'Items.Brand',
  'Items.Notes': 'Items.Notes',
};

const INTAKE_FALLBACK_TARGET_DESCRIPTIONS = {
  Ignore: 'Do not import this source column.',
  'Jobs.Job': 'Human-readable job or group name.',
  'Jobs.Job ID': 'External production job or project number.',
  'Jobs.Due': 'Job due date when present in the source spreadsheet.',
  'Jobs.Output Type': 'Photo Only, Render Only, or Photo + Render.',
  'Jobs.Notes': 'Source notes that describe the job.',
  'Items.Item': 'Readable item display name.',
  'Items.Product ID': 'Client product identifier, usually UPC or GTIN.',
  'Items.Product Name': 'Product or item description.',
  'Items.Brand': 'Product brand.',
  'Items.Notes': 'Source notes that describe the item.',
};

const INTAKE_REQUIRED_TARGETS = ['Jobs.Job ID', 'Items.Product ID', 'Items.Product Name'];
const INTAKE_TARGET_OPTIONS = [
  'Ignore',
  'Jobs.Job',
  'Jobs.Job ID',
  'Jobs.Due',
  'Jobs.Output Type',
  'Jobs.Notes',
  'Items.Item',
  'Items.Product ID',
  'Items.Product Name',
  'Items.Brand',
  'Items.Notes',
];

const KNOWN_INTAKE_MAPPINGS = {
  kroger: {
    'Job #': 'Jobs.Job ID',
    Description: 'Jobs.Job',
    UPC: 'Items.Product ID',
    Brand: 'Items.Brand',
    'Product Received': 'Items.Product Name',
    'Output Type': 'Jobs.Output Type',
    Notes: 'Items.Notes',
  },
  unfi: {
    'Project Number': 'Jobs.Job ID',
    Description: 'Items.Product Name',
    UPC: 'Items.Product ID',
    'Output Type': 'Jobs.Output Type',
    Notes: 'Items.Notes',
  },
  smithfield: {
    'Job #': 'Jobs.Job ID',
    GTIN: 'Items.Product ID',
    Brand: 'Items.Brand',
    'Product Description': 'Items.Product Name',
    Notes: 'Items.Notes',
    Output: 'Jobs.Output Type',
  },
};

const VALIDATE_COLUMN_MAPPINGS = {
  extId: 'Jobs.Job ID',
  jobName: 'Jobs.Job',
  due: 'Jobs.Due',
  output: 'Jobs.Output Type',
  jobNotes: 'Jobs.Notes',
  itemName: 'Items.Item',
  id: 'Items.Product ID',
  product: 'Items.Product Name',
  brand: 'Items.Brand',
  notes: 'Items.Notes',
};

const INTAKE_TARGET_FIELDS = {
  'Jobs.Job': 'jobName',
  'Jobs.Job ID': 'extId',
  'Jobs.Due': 'due',
  'Jobs.Output Type': 'output',
  'Jobs.Notes': 'jobNotes',
  'Items.Item': 'itemName',
  'Items.Product ID': 'id',
  'Items.Product Name': 'product',
  'Items.Brand': 'brand',
  'Items.Notes': 'notes',
};

function MappingLegend() {
  return (
    <div className="intake-map-legend" aria-label="Column mapping legend">
      <span><i className="intake-map-swatch is-mapped" />Mapped column</span>
      <span><i className="intake-map-swatch" />Unmapped column</span>
    </div>
  );
}

function MappingHeader({ children, source, target, showTarget = true, showUnmapped = false }) {
  const isMapped = Boolean(target);
  return (
    <th className={isMapped ? 'is-mapped-column' : showUnmapped ? 'is-unmapped-column' : ''}>
      <span>{source || children}</span>
      {isMapped && showTarget && <small>↓ {target}</small>}
      {!isMapped && showUnmapped && <small>Unmapped</small>}
    </th>
  );
}

function mappingTargetLabel(target) {
  return INTAKE_TARGET_LABELS[target] || '';
}

function buildInitialColumnMapping(headers, clientName) {
  const known = KNOWN_INTAKE_MAPPINGS[(clientName || '').trim().toLowerCase()] || {};
  return (headers || []).reduce((mapping, header) => {
    mapping[header] = known[header] || 'Ignore';
    return mapping;
  }, {});
}

function requiredMappingGaps(mapping) {
  const mappedTargets = new Set(Object.values(mapping || {}).filter(target => target && target !== 'Ignore'));
  return INTAKE_REQUIRED_TARGETS.filter(target => !mappedTargets.has(target));
}

function IntakePage({ navigate }) {
  const clients = useResource(() => api.intakeListClients());
  const mappingTargets = useResource(() => api.intakeMappingTargets());
  const [clientId, setClientId] = useState('');
  const [step, setStep] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [review, setReview] = useState(null);
  const [editableRows, setEditableRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [parsing, setParsing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState('10');
  const [columnMapping, setColumnMapping] = useState({});
  const [importId, setImportId] = useState('');
  const clientList = clients.data?.records ?? [];
  const selectedClient = clientList.find(client => client.id === clientId);
  const targetDescriptions = {
    ...INTAKE_FALLBACK_TARGET_DESCRIPTIONS,
    ...Object.fromEntries((mappingTargets.data?.targets ?? []).map(item => [item.target, item.description])),
  };
  const missingRequiredMappings = requiredMappingGaps(columnMapping);
  const mappedColumnCount = Object.values(columnMapping).filter(target => target && target !== 'Ignore').length;
  const unmappedColumnCount = Math.max((preview?.columnHeaders?.length ?? 0) - mappedColumnCount, 0);
  const sourceColumnMappings = Object.fromEntries(
    Object.entries(columnMapping).map(([source, target]) => [source, mappingTargetLabel(target)])
  );
  const sourceColumnByTarget = Object.entries(columnMapping).reduce((targets, [source, target]) => {
    if (target && target !== 'Ignore' && !targets[target]) targets[target] = source;
    return targets;
  }, {});

  useEffect(() => {
    if (!clientId && clientList.length) setClientId(clientList[0].id);
  }, [clientId, clientList]);

  useEffect(() => {
    if (clients.error) console.error('Failed to load Intake clients:', clients.error);
  }, [clients.error]);

  async function parseFile(file) {
    setError('');
    setNotice('');
    setPreview(null);
    setReview(null);
    setEditableRows([]);
    setSummary(null);
    setColumnMapping({});
    if (!clientId) {
      setError('Choose a client before uploading a spreadsheet.');
      return;
    }
    if (!file) return;
    setSelectedFile(file);
    setFileMeta({ name: file.name, size: file.size });
    setParsing(true);
    try {
      const data = await api.previewSpreadsheet({ clientId, file });
      setPreview({ ...data, clientName: selectedClient?.name || '', fileSize: file.size });
      setImportId(data.importId || '');
      setColumnMapping(buildInitialColumnMapping(data.columnHeaders || [], selectedClient?.name || ''));
      setStep('preview');
    } catch (e) {
      console.error('Failed to parse Intake spreadsheet:', e);
      setError(e.message);
    } finally {
      setParsing(false);
    }
  }

  function resetIntake() {
    setStep('upload');
    setPreview(null);
    setSelectedFile(null);
    setReview(null);
    setEditableRows([]);
    setSummary(null);
    setFileMeta(null);
    setColumnMapping({});
    setError('');
    setNotice('');
    setPreviewRows('10');
    setImportId('');
  }

  function changeClient(value) {
    const nextClient = clientList.find(client => client.id === value);
    setClientId(value);
    setReview(null);
    setEditableRows([]);
    setSummary(null);
    setNotice('');
    setError('');
    if (preview) setColumnMapping(buildInitialColumnMapping(preview.columnHeaders || [], nextClient?.name || ''));
    if (preview) setStep('preview');
  }

  function rowsFromReview(data) {
    return (data.rows ?? []).map(row => ({
      rowNumber: row.rowNumber,
      extId: row.extId || '',
      id: row.id || '',
      product: row.product || '',
      brand: row.brand || '',
      due: row.due || '',
      output: row.output || 'Photo + Render',
      jobNotes: row.jobNotes || '',
      notes: row.notes || '',
      status: row.status || 'New',
      jobName: row.jobName || '',
      itemName: row.itemName || '',
      category: row.category || '',
      existingItemId: row.existingItemId || null,
      action: row.action || 'create',
      errors: row.errors ?? [],
      warnings: row.warnings ?? [],
    }));
  }

  function validateRows(rows, baseReview = review) {
    const seen = {};
    const codeType = baseReview?.codeType || selectedClient?.codeType || '';
    return rows.map((row, index) => {
      const errors = [];
      const warnings = [];
      const id = String(row.id || '').trim();
      if (!String(row.extId || '').trim()) errors.push('Missing Job ID');
      if (!id) errors.push('Missing Product ID');
      if (id && codeType === 'UPC-12' && !/^\d{12}$/.test(id)) errors.push('Product ID must be exactly 12 digits for UPC-12.');
      if (id && codeType === 'GTIN-14' && !/^\d{14}$/.test(id)) errors.push('Product ID must be exactly 14 digits for GTIN-14.');
      if (codeType === 'Item #' && !id) errors.push('Product ID is required for Item #.');
      if (id) {
        if (seen[id]) warnings.push(`Duplicate Product ID also appears on row ${seen[id]}`);
        else seen[id] = row.rowNumber || index + 1;
      }
      if (!String(row.product || '').trim()) warnings.push('Blank Product Name/Description');
      return { ...row, errors, warnings };
    });
  }

  function reviewFromRows(rows) {
    const validRows = rows.filter(row => !row.errors.length);
    const jobs = {};
    const existingJobs = {};
    (review?.jobsPreview ?? []).forEach(job => { existingJobs[job.extId] = job; });
    validRows.forEach(row => {
      if (!row.extId) return;
      jobs[row.extId] = jobs[row.extId] || {
        extId: row.extId,
        jobName: row.jobName || `${selectedClient?.name || 'Client'} ${row.extId}`,
        due: row.due || '',
        output: row.output,
        notes: row.jobNotes || '',
        existingId: existingJobs[row.extId]?.existingId,
        rowCount: 0,
      };
      jobs[row.extId].rowCount += 1;
    });
    return {
      ...(review || {}),
      totalRows: rows.length,
      jobsDetected: Object.keys(jobs).length,
      itemsToCreate: validRows.filter(row => row.action !== 'update').length,
      itemsToUpdate: validRows.filter(row => row.action === 'update').length,
      errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0),
      warningCount: rows.reduce((sum, row) => sum + row.warnings.length, 0),
      jobsPreview: Object.values(jobs),
      rows,
    };
  }

  async function reviewActiveMapping() {
    if (!preview) {
      setError('Upload and preview a spreadsheet before validating.');
      return;
    }
    if (missingRequiredMappings.length) {
      setNotice(`Map required columns before validating: ${missingRequiredMappings.join(', ')}.`);
      setStep('map');
      return;
    }
    setError('');
    setNotice('');
    setReviewing(true);
    try {
      const data = await api.reviewSpreadsheetSourceRows({
        clientId,
        fileName: preview.fileName || fileMeta?.name || 'Import',
        columnHeaders: preview.columnHeaders || [],
        sourceRows: preview.rows || [],
        mapping: columnMapping,
        importId,
      });
      const rows = validateRows(rowsFromReview(data), data);
      setReview(reviewFromRows(rows));
      setEditableRows(rows);
      setStep('validate');
    } catch (e) {
      console.error('Failed to review Intake import:', e);
      setError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  function continueFromPreview() {
    if (missingRequiredMappings.length) {
      setNotice(`Map required columns before validating: ${missingRequiredMappings.join(', ')}.`);
      setStep('map');
      return;
    }
    reviewActiveMapping();
  }

  function openMapColumns() {
    setNotice('');
    setStep('map');
  }

  function updateColumnMapping(header, target) {
    setColumnMapping(mapping => ({ ...mapping, [header]: target }));
    setReview(null);
    setEditableRows([]);
    setSummary(null);
    setNotice('');
    setError('');
  }

  async function validateEditedRows() {
    const rows = validateRows(editableRows);
    setEditableRows(rows);
    setReview(reviewFromRows(rows));
    const validRows = rows.filter(row => !row.errors.length);
    if (!validRows.length) {
      setNotice('Fix at least one row before importing. Rows with unresolved errors will be skipped during import.');
      return;
    }
    setError('');
    setNotice('');
    await executeImport(rows);
  }

  async function executeImport(rowsToImport = editableRows) {
    setError('');
    setNotice('');
    setStep('importing');
    setImporting(true);
    try {
      const data = await api.executeSpreadsheetRows({ clientId, fileName: preview?.fileName || fileMeta?.name || 'Import', rows: rowsToImport, importId });
      setSummary(data.summary || {});
      setImportId(data.importId || importId);
      setReview(data);
      setStep('summary');
    } catch (e) {
      console.error('Failed to import spreadsheet:', e);
      setError(e.message);
      setStep('validate');
    } finally {
      setImporting(false);
    }
  }

  function updateEditableRow(rowNumber, field, value) {
    const rows = editableRows.map(row => row.rowNumber === rowNumber ? { ...row, [field]: value } : row);
    const validated = validateRows(rows);
    setEditableRows(validated);
    setReview(reviewFromRows(validated));
    setNotice('');
  }

  function onDrop(e) {
    e.preventDefault();
    parseFile(e.dataTransfer.files?.[0]);
  }

  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const visibleRows = (preview?.previewRows ?? []).slice(0, Number(previewRows));
  const clientError = clients.error ? `Unable to load active Clients. ${clients.error}` : '';
  const activeReview = editableRows.length ? reviewFromRows(editableRows) : review;
  const hasErrors = Boolean(activeReview?.errorCount);
  const errorRowCount = editableRows.filter(row => row.errors.length).length;
  const validImportRowCount = editableRows.filter(row => !row.errors.length).length;
  const errorRowText = `${errorRowCount} ${errorRowCount === 1 ? 'row requires' : 'rows require'} attention.`;

  function sourceValueForRow(row, columnIndex) {
    const sourceIndex = Math.max((row.rowNumber || 2) - 2, 0);
    return preview?.rows?.[sourceIndex]?.[columnIndex] || '';
  }

  function renderValidateCell(row, header, columnIndex) {
    const target = columnMapping[header] || 'Ignore';
    const field = INTAKE_TARGET_FIELDS[target];
    if (!field) {
      return <span className="intake-readonly-cell">{sourceValueForRow(row, columnIndex) || '—'}</span>;
    }
    if (field === 'output') {
      return (
        <select value={row.output} onChange={e => updateEditableRow(row.rowNumber, 'output', e.target.value)}>
          <option>Photo Only</option>
          <option>Render Only</option>
          <option>Photo + Render</option>
        </select>
      );
    }
    return (
      <input
        value={row[field] || ''}
        onChange={e => updateEditableRow(row.rowNumber, field, e.target.value)}
      />
    );
  }

  return (
    <div className="page-stack intake-page">
      <div className="intake-wizard-steps" aria-disabled={importing}>
        {['Upload', 'Preview', 'Map Columns', 'Validate & Fix', 'Import Progress', 'Summary'].map((label, index) => {
          const ids = ['upload', 'preview', 'map', 'validate', 'importing', 'summary'];
          const currentIndex = ids.indexOf(step);
          const state = index < currentIndex ? 'completed' : step === ids[index] ? 'active' : 'upcoming';
          return (
            <span className={`intake-step ${state}`} key={label}>
              {state === 'completed' ? '✓' : index + 1}. {label}
            </span>
          );
        })}
      </div>

      <div className={`intake-card ${step !== 'upload' ? 'is-compact' : ''}`}>
        <div className="intake-hero">
          <div className="field intake-client-field">
            <label>Client</label>
            <select value={clientId} onChange={e => changeClient(e.target.value)} disabled={clients.loading || importing}>
              {clients.loading && <option value="">Loading clients…</option>}
              {!clients.loading && !clientList.length && <option value="">No active clients found</option>}
              {clientList.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className="intake-compact-actions">
            <button className="link-btn" type="button" onClick={() => navigate('import-history', importId ? { importId } : {})} disabled={importing}>Import History</button>
          </div>
        </div>

        {clientError && <div className="error-state">{clientError}</div>}
        {error && <div className="error-state">{error}</div>}
        {notice && <div className="notice-state">{notice}</div>}

        {!preview && (
        <div className="intake-dropzone" onDragOver={e => e.preventDefault()} onDrop={onDrop}>
          <div className="intake-drop-icon"><Icon.Upload /></div>
          <div className="intake-drop-title">Drop your spreadsheet here</div>
          <div className="intake-drop-or">or</div>
          <label className="btn btn-primary intake-file-button">
            Choose File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => parseFile(e.target.files?.[0])}
            />
          </label>
          <div className="intake-drop-helper">Supports .xlsx, .xls, .csv files</div>
          {fileMeta && !preview && (
            <div className="intake-file-note">{fileMeta.name} · {formatFileSize(fileMeta.size)}</div>
          )}
          {parsing && <div className="empty-state">Parsing spreadsheet…</div>}
        </div>
        )}
      </div>

      {step === 'preview' && preview && (
        <div className="intake-card intake-preview-card">
          <div className="intake-preview-head">
            <div>
              <div className="intake-preview-title">{preview.fileName}</div>
              <div className="intake-preview-sub">{selectedClient?.name || preview.clientName || preview.clientId}</div>
            </div>
          </div>

          <div className="intake-summary-grid">
            <div className="intake-summary-item">
              <span>Sheets</span>
              <strong>{preview.sheetNames?.length || 1}</strong>
            </div>
            <div className="intake-summary-item">
              <span>Rows</span>
              <strong>{preview.rowCount}</strong>
            </div>
            <div className="intake-summary-item">
              <span>Columns</span>
              <strong>{preview.columnHeaders?.length ?? 0}</strong>
            </div>
            <div className="intake-summary-item">
              <span>Size</span>
              <strong>{formatFileSize(preview.fileSize)}</strong>
            </div>
          </div>

          {preview.sheetNames?.length > 1 && (
            <div className="intake-preview-controls">
              <div className="field">
              <label>Sheet</label>
              <select value={preview.selectedSheet || ''} disabled>
                <option value={preview.selectedSheet || ''}>{preview.selectedSheet || 'CSV'}</option>
              </select>
            </div>
            </div>
          )}

          <div className="table-wrap intake-preview-table">
            <table>
              <thead>
                <tr>
                  {(preview.columnHeaders ?? []).map((header, index) => (
                    <MappingHeader target={sourceColumnMappings[header]} showTarget={false} key={`${header}-${index}`}>
                      {header || '(blank)'}
                    </MappingHeader>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {(preview.columnHeaders ?? []).map((_, columnIndex) => (
                      <td key={columnIndex}>{row[columnIndex] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button className="btn" type="button" onClick={resetIntake} disabled={importing}>Cancel</button>
            <button className="btn btn-alt" type="button" onClick={openMapColumns} disabled={importing}>Map Columns</button>
            <button className="btn btn-primary" type="button" onClick={reviewActiveMapping} disabled={reviewing || importing}>
              {reviewing ? 'Validating…' : 'Validate'}
            </button>
          </div>
        </div>
      )}

      {step === 'map' && preview && (
        <div className="intake-card intake-preview-card">
          <div className="intake-preview-head">
            <div>
              <div className="intake-preview-title">Map Columns</div>
              <div className="intake-preview-sub">Match spreadsheet columns to the fields needed for validation.</div>
            </div>
          </div>

          <div className="intake-map-summary">
            <span>{mappedColumnCount} mapped</span>
            <span>{unmappedColumnCount} unmapped</span>
            {missingRequiredMappings.length > 0 ? (
              <span className="metric-error">Missing: {missingRequiredMappings.join(', ')}</span>
            ) : (
              <span className="metric-success">Required mappings complete</span>
            )}
          </div>

          <div className="table-wrap intake-preview-table intake-map-table">
            <table>
              <thead>
                <tr>
                  <th>Source Column</th>
                  <th>Maps To</th>
                  <th>Description</th>
                  <th>Requirement</th>
                </tr>
              </thead>
              <tbody>
                {(preview.columnHeaders ?? []).map((header, index) => {
                  const target = columnMapping[header] || 'Ignore';
                  const isRequired = INTAKE_REQUIRED_TARGETS.includes(target);
                  return (
                    <tr key={`${header}-${index}`}>
                      <td>{header || '(blank)'}</td>
                      <td>
                        <select value={target} onChange={e => updateColumnMapping(header, e.target.value)}>
                          {INTAKE_TARGET_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td>{targetDescriptions[target] || '—'}</td>
                      <td>
                        {isRequired
                          ? <span className="badge badge-blue">Required</span>
                          : <span className="badge badge-neutral">Optional</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn" type="button" onClick={resetIntake} disabled={importing}>Cancel</button>
            <button className="btn btn-primary" type="button" onClick={reviewActiveMapping} disabled={reviewing || importing || missingRequiredMappings.length > 0}>
              {reviewing ? 'Validating…' : 'Validate'}
            </button>
          </div>
        </div>
      )}

      {step === 'validate' && activeReview && (
        <div className="intake-card intake-preview-card">
          <div className="intake-preview-head">
            <div>
              <div className="intake-preview-title">Validate & Fix</div>
              <div className="intake-preview-sub">Edit mapped fields inline. Rows with errors stay red and will be skipped.</div>
            </div>
          </div>

          <div className="intake-summary-grid is-six">
            <div className="intake-summary-item"><span>Total rows</span><strong>{activeReview.totalRows}</strong></div>
            <div className="intake-summary-item"><span>Jobs detected</span><strong>{activeReview.jobsDetected}</strong></div>
            <div className="intake-summary-item"><span>Items create</span><strong>{activeReview.itemsToCreate}</strong></div>
            <div className="intake-summary-item"><span>Items update</span><strong>{activeReview.itemsToUpdate}</strong></div>
            <div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{activeReview.errorCount}</strong></div>
            <div className="intake-summary-item"><span>Warnings</span><strong className="metric-warning">{activeReview.warningCount}</strong></div>
          </div>

          {hasErrors ? (
            <div className="intake-callout danger">
              <div className="intake-callout-icon" aria-hidden="true">!</div>
              <div>
                <div className="intake-callout-title">Errors Found</div>
                <div className="intake-callout-text">{errorRowText}</div>
                <div className="intake-callout-text">Fix the highlighted rows below, or continue importing only the valid rows.</div>
              </div>
            </div>
          ) : (
            <div className="intake-callout success">
              <div className="intake-callout-icon" aria-hidden="true">✓</div>
              <div>
                <div className="intake-callout-title">Success</div>
                <div className="intake-callout-text">All rows passed validation.</div>
                <div className="intake-callout-text">This import is ready to be imported.</div>
              </div>
            </div>
          )}

          <div className="intake-column-section">
            <div className="intake-section-row">
              <div className="intake-section-label">Editable rows</div>
              <MappingLegend />
            </div>
            <div className="intake-inline-actions">
              <button className="btn" type="button" onClick={resetIntake} disabled={importing}>Cancel</button>
              <button className="btn btn-alt" type="button" onClick={openMapColumns} disabled={importing}>Map Columns</button>
              <button className="btn btn-primary" type="button" onClick={validateEditedRows} disabled={importing || validImportRowCount === 0}>
                Import
              </button>
            </div>
            <div className="table-wrap intake-preview-table">
              <table>
                <thead>
                  <tr>
                    {(preview.columnHeaders ?? []).map((header, index) => {
                      const target = columnMapping[header] && columnMapping[header] !== 'Ignore'
                        ? mappingTargetLabel(columnMapping[header])
                        : '';
                      return (
                        <MappingHeader target={target} showUnmapped key={`${header}-${index}`}>
                          {header || '(blank)'}
                        </MappingHeader>
                      );
                    })}
                    <th className="problem-column-header">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {editableRows.map(row => (
                    <tr className={row.errors.length ? 'row-error' : row.warnings.length ? 'row-warning' : ''} key={row.rowNumber}>
                      {(preview.columnHeaders ?? []).map((header, columnIndex) => (
                        <td key={`${row.rowNumber}-${header}-${columnIndex}`}>
                          {renderValidateCell(row, header, columnIndex)}
                        </td>
                      ))}
                      <td className="problem-column-cell">
                        <div className="problem-row-alerts">
                          {[...(row.errors ?? []), ...(row.warnings ?? [])].map((problem, index) => (
                            <span className={`badge problem-badge ${row.errors?.includes(problem) ? 'badge-red' : 'badge-amber'}`} key={`${row.rowNumber}-${index}`}>
                              <span className="problem-badge-icon" aria-hidden="true">!</span>
                              {problem}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" type="button" onClick={resetIntake} disabled={importing}>Cancel</button>
            <button className="btn btn-alt" type="button" onClick={openMapColumns} disabled={importing}>Map Columns</button>
            <button className="btn btn-primary" type="button" onClick={validateEditedRows} disabled={importing || validImportRowCount === 0}>
              Import
            </button>
          </div>
        </div>
      )}

      {step === 'summary' && summary && (
        <div className="intake-card intake-preview-card">
          <div className="intake-preview-head">
            <div>
              <div className="intake-preview-title">Import Complete</div>
              <div className="intake-preview-sub">{preview?.fileName}</div>
            </div>
            <span className="badge badge-green">Success</span>
          </div>
          <div className="intake-summary-grid">
            <div className="intake-summary-item"><span>Rows imported</span><strong>{(summary.itemsCreated ?? 0) + (summary.itemsUpdated ?? 0)}</strong></div>
            <div className="intake-summary-item"><span>Rows skipped</span><strong>{summary.rowsSkipped}</strong></div>
            <div className="intake-summary-item"><span>Jobs created</span><strong>{summary.jobsCreated}</strong></div>
            <div className="intake-summary-item"><span>Jobs reused</span><strong>{summary.jobsReused}</strong></div>
            <div className="intake-summary-item"><span>Items created</span><strong>{summary.itemsCreated}</strong></div>
            <div className="intake-summary-item"><span>Items updated</span><strong>{summary.itemsUpdated}</strong></div>
            <div className="intake-summary-item"><span>Errors skipped</span><strong className="metric-error">{summary.errors}</strong></div>
            <div className="intake-summary-item"><span>Warnings imported</span><strong className="metric-warning">{summary.warnings}</strong></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="button" onClick={resetIntake}>New Intake</button>
          </div>
        </div>
      )}

      {importing && (
        <div className="intake-modal-backdrop" role="status" aria-live="polite">
          <div className="intake-modal">
            <div className="intake-modal-spinner" />
            <div className="intake-modal-title">Importing spreadsheet...</div>
            <div className="intake-modal-sub">Creating and updating Jobs and Items in Airtable.</div>
          </div>
        </div>
      )}
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

// ── Temporary schema test panel ──────────────────────────────────────────────
function SchemaTestPage() {
  const items = useResource(() => api.adminListItems());
  const locations = useResource(() => api.adminListLocations());
  const issues = useResource(() => api.adminListIssues());
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [itemForm, setItemForm] = useState({ status: '', locationId: '', condition: '' });
  const [issueStatus, setIssueStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const itemList = items.data?.records ?? [];
  const locationList = locations.data?.records ?? [];
  const issueList = issues.data?.records ?? [];
  const selectedItem = itemList.find(item => item.id === selectedItemId);
  const selectedIssue = issueList.find(issue => issue.id === selectedIssueId);

  useEffect(() => {
    if (!selectedItemId && itemList.length) setSelectedItemId(itemList[0].id);
  }, [itemList, selectedItemId]);

  useEffect(() => {
    if (!selectedIssueId && issueList.length) setSelectedIssueId(issueList[0].id);
  }, [issueList, selectedIssueId]);

  useEffect(() => {
    if (!selectedItem) return;
    setItemForm({
      status: selectedItem.status || '',
      locationId: selectedItem.locationIds?.[0] || '',
      condition: selectedItem.condition || '',
    });
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedIssue) return;
    setIssueStatus(selectedIssue.status || '');
  }, [selectedIssue]);

  async function loadItemHistory(itemId = selectedItemId) {
    if (!itemId) return;
    const data = await api.adminListHistory({ itemId, limit: 10 });
    setHistory(data.records ?? []);
  }

  async function loadIssueHistory(issue = selectedIssue) {
    if (!issue) return;
    if (!issue.itemIds?.[0] && !issue.jobIds?.[0] && !issue.assignedIds?.[0]) {
      setHistory([]);
      return;
    }
    const data = await api.adminListHistory({
      itemId: issue.itemIds?.[0],
      jobId: issue.jobIds?.[0],
      userId: issue.assignedIds?.[0],
      limit: 10,
    });
    setHistory(data.records ?? []);
  }

  async function saveItem(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.adminUpdateItem(selectedItemId, {
        status: itemForm.status,
        locationIds: itemForm.locationId ? [itemForm.locationId] : [],
        condition: itemForm.condition,
      });
      setMessage('Item saved through backend PATCH /items. History refreshed.');
      await items.reload();
      await loadItemHistory(selectedItemId);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveIssue(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.adminUpdateIssue(selectedIssueId, { status: issueStatus });
      setMessage('Issue saved through backend PATCH /issues. History refreshed.');
      await issues.reload();
      await loadIssueHistory(selectedIssue);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const loading = items.loading || locations.loading || issues.loading;
  const error = items.error || locations.error || issues.error;

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Admin / Schema Test</span></div>
        {loading && <div className="empty-state">Loading test data…</div>}
        {error && <div className="error-state">{error}</div>}
        {message && <div className={message.startsWith('Error') ? 'error-state' : 'empty-state'}>{message}</div>}

        <div className="form-grid">
          <form className="form-section" onSubmit={saveItem}>
            <div className="form-title">Item history test</div>
            <div className="field full">
              <label>Item</label>
              <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                {itemList.map(item => (
                  <option key={item.id} value={item.id}>{item.name || item.identifier || item.id}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={itemForm.status} onChange={e => setItemForm(f => ({ ...f, status: e.target.value }))}>
                {['New', 'Waiting Merch', 'Issue', 'Ready Production', 'Production', 'Complete', 'Cancelled'].map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Location</label>
              <select value={itemForm.locationId} onChange={e => setItemForm(f => ({ ...f, locationId: e.target.value }))}>
                <option value="">No location</option>
                {locationList.map(location => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Condition</label>
              <select value={itemForm.condition} onChange={e => setItemForm(f => ({ ...f, condition: e.target.value }))}>
                {['Good', 'Damaged', 'Wrong', 'Unknown'].map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving || !selectedItemId}>Save Item</button>
              <button className="btn btn-ghost" type="button" onClick={() => loadItemHistory()}>Load Item History</button>
            </div>
          </form>

          <form className="form-section" onSubmit={saveIssue}>
            <div className="form-title">Issue history test</div>
            <div className="field full">
              <label>Issue</label>
              <select value={selectedIssueId} onChange={e => setSelectedIssueId(e.target.value)}>
                {issueList.map(issue => (
                  <option key={issue.id} value={issue.id}>{issue.name || issue.id}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={issueStatus} onChange={e => setIssueStatus(e.target.value)}>
                {['Open', 'Waiting', 'Resolved', 'Cancelled'].map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving || !selectedIssueId}>Save Issue</button>
              <button className="btn btn-ghost" type="button" onClick={() => loadIssueHistory()}>Load Issue History</button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Latest linked History</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Type</th>
                <th>Field</th>
                <th>From</th>
                <th>To</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan="7" className="empty-state">No linked History loaded.</td></tr>}
              {history.map(record => (
                <tr key={record.id}>
                  <td>{record.date || '—'}</td>
                  <td>{record.event || '—'}</td>
                  <td>{record.type || '—'}</td>
                  <td>{record.field || '—'}</td>
                  <td>{record.from || '—'}</td>
                  <td>{record.to || '—'}</td>
                  <td>{record.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const initialPage = window.location.pathname === '/admin/schema-test'
    ? 'schema-test'
    : window.location.pathname === '/intake/import-history'
      ? 'import-history'
    : window.location.pathname === '/intake'
      ? 'intake'
      : 'dashboard';
  const [page, setPage]   = useState(initialPage);
  const [params, setParams] = useState({});

  function navigate(p, pms = {}) { setPage(p); setParams(pms); }

  // Alert count for sidebar badge
  const skus = useResource(() => api.listSkus());
  const skuList    = skus.data?.records ?? [];
  const alertCount = skuList.filter(s => !s.merchVerified || !s.gtinUpc).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> },
    { id: 'intake',    label: 'Intake',    icon: <Icon.Add /> },
    { id: 'jobs',      label: 'Jobs',      icon: <Icon.Jobs /> },
    { id: 'skus',      label: 'Items',     icon: <Icon.SKUs /> },
    { id: 'new-job',   label: 'New Job',   icon: <Icon.Add /> },
    { id: 'settings',  label: 'Settings',  icon: <Icon.Settings /> },
  ];

  const pageTitle = {
    dashboard: 'Dashboard', intake: 'Intake', 'import-history': 'Import History', jobs: 'Jobs', skus: 'Items',
    'new-job': 'New Job', settings: 'Settings', 'schema-test': 'Admin / Schema Test',
  }[page] ?? '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/marks-logo.png" alt="Marks" style={{ width: 90, display: 'block', marginBottom: 4, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          <div className="brand-sub">Studio Coordinator</div>
        </div>

        <nav className="nav-section">
          <ul className="nav-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  {item.icon}
                  {item.label}
                  {item.id === 'dashboard' && alertCount > 0 && (
                    <span className="nav-badge">{alertCount}</span>
                  )}
                </button>
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
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-right">
            <button className="btn btn-ghost" onClick={() => window.location.reload()} title="Refresh">
              <Icon.Refresh />
            </button>
          </div>
        </header>

        <div className="content">
          {page === 'dashboard' && <Dashboard navigate={navigate} />}
          {page === 'intake'    && <IntakePage navigate={navigate} />}
          {page === 'import-history' && <ImportHistoryPage importId={params.importId} />}
          {page === 'jobs'      && <JobsPage  navigate={navigate} />}
          {page === 'skus'      && <SkusPage  navigate={navigate} jobId={params.jobId} />}
          {page === 'new-job'   && <NewJobPage navigate={navigate} />}
          {page === 'settings'  && <SettingsPage />}
          {page === 'schema-test' && <SchemaTestPage />}
        </div>
      </main>
    </div>
  );
}
