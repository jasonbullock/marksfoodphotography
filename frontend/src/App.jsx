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
                      SKUs <Icon.ChevronRight />
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

// ── SKUs page ─────────────────────────────────────────────────────────────────
function SkusPage({ navigate, jobId: initJobId }) {
  const jobs = useResource(() => api.listJobs());
  const [jobFilter, setJobFilter] = useState(initJobId ?? '');
  const skus = useResource(
    () => api.listSkus(jobFilter || undefined),
    [jobFilter]
  );

  const jobList = jobs.data?.records ?? [];
  const [skuList, setSkuList]   = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (skus.data?.records) setSkuList(skus.data.records);
  }, [skus.data]);

  async function toggleMerch(sku) {
    setTogglingId(sku.id);
    try {
      const updated = await api.updateSku(sku.id, { merchVerified: !sku.merchVerified });
      setSkuList(prev => prev.map(s => s.id === sku.id ? updated : s));
    } catch (e) {
      alert('Update failed: ' + e.message);
    } finally {
      setTogglingId(null);
    }
  }

  function gateStatus(sku) {
    const g1 = sku.merchVerified;
    const g2 = Boolean(sku.gtinUpc);
    if (g1 && g2)  return <span className="badge badge-green">✓ Cleared</span>;
    if (!g1 && !g2) return <span className="badge badge-red">Both gates open</span>;
    if (!g1)        return <span className="badge badge-red">No merch</span>;
    return <span className="badge badge-amber">No GTIN</span>;
  }

  return (
    <div className="page-stack">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-bar">
          <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
            <option value="">All jobs</option>
            {jobList.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(f => !f)}>
          <Icon.Add /> {showForm ? 'Cancel' : 'Add SKU'}
        </button>
      </div>

      {showForm && jobFilter && (
        <AddSkuForm
          jobId={jobFilter}
          onSaved={sku => { setSkuList(prev => [...prev, sku]); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {showForm && !jobFilter && (
        <div className="error-state">Select a job before adding a SKU.</div>
      )}

      {skus.error && <div className="error-state">{skus.error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU / Name</th>
              <th>GTIN / UPC</th>
              <th>Brand</th>
              <th>Output</th>
              <th>Gate status</th>
              <th>Merch</th>
            </tr>
          </thead>
          <tbody>
            {skus.loading && <tr><td colSpan="6" className="empty-state">Loading…</td></tr>}
            {!skus.loading && skuList.length === 0 && (
              <tr><td colSpan="6" className="empty-state">No SKUs found</td></tr>
            )}
            {skuList.map(sku => (
              <tr key={sku.id}>
                <td style={{ fontWeight: 600 }}>{sku.name || '—'}</td>
                <td>
                  {sku.gtinUpc
                    ? <code>{sku.gtinUpc}</code>
                    : <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>MISSING</span>
                  }
                </td>
                <td>{sku.brand || '—'}</td>
                <td>{sku.outputType || '—'}</td>
                <td>{gateStatus(sku)}</td>
                <td>
                  <button
                    className={`gate-toggle ${sku.merchVerified ? 'verified' : 'pending'}`}
                    disabled={togglingId === sku.id}
                    onClick={() => toggleMerch(sku)}
                  >
                    {togglingId === sku.id ? '…' : sku.merchVerified ? '✓ Verified' : 'Verify'}
                  </button>
                </td>
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

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]   = useState('dashboard');
  const [params, setParams] = useState({});

  function navigate(p, pms = {}) { setPage(p); setParams(pms); }

  // Alert count for sidebar badge
  const skus = useResource(() => api.listSkus());
  const skuList    = skus.data?.records ?? [];
  const alertCount = skuList.filter(s => !s.merchVerified || !s.gtinUpc).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> },
    { id: 'jobs',      label: 'Jobs',      icon: <Icon.Jobs /> },
    { id: 'skus',      label: 'SKUs',      icon: <Icon.SKUs /> },
    { id: 'new-job',   label: 'New Job',   icon: <Icon.Add /> },
    { id: 'settings',  label: 'Settings',  icon: <Icon.Settings /> },
  ];

  const pageTitle = {
    dashboard: 'Dashboard', jobs: 'Jobs', skus: 'SKUs',
    'new-job': 'New Job', settings: 'Settings',
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
          {page === 'jobs'      && <JobsPage  navigate={navigate} />}
          {page === 'skus'      && <SkusPage  navigate={navigate} jobId={params.jobId} />}
          {page === 'new-job'   && <NewJobPage navigate={navigate} />}
          {page === 'settings'  && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
