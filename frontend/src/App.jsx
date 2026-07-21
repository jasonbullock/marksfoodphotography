import { useState, useEffect, useCallback, useRef, createContext, useContext, Fragment, memo } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ClipboardList,
  Download as DownloadIcon,
  Layers,
  PackageOpen,
  Tag,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { api } from './api';
import { Select as FormSelect } from './design-system.jsx';
import { DOMAIN_TERMS, getFieldLabel, technicalTableLabel } from './domainVocabulary';
import { exportTableToXlsx, todayExportFilename } from './tableExport';
import {
  MERCHANDISE_REVIEW_WORKFLOW,
  GATE_IDS,
  WORKSTREAMS,
  WORKSPACE_SECTIONS,
  buildWorkOrderCard,
  evaluateMerchandiseReviewAssignment,
  evaluateMerchandiseReviewRequirements,
  gatesForBoard,
  workstreamFromLegacyValue,
  workstreamLabel,
  workflowForClient,
  workspaceModeForGate,
} from './workflowEngine';
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
  NavImport: () => <DownloadIcon size={20} strokeWidth={1.5} />,
  NavReceiving: () => <PackageOpen size={20} strokeWidth={1.5} />,
  NavMerchandise: () => <ClipboardList size={20} strokeWidth={1.5} />,
  NavWork: () => <WorkflowIcon size={20} strokeWidth={1.5} />,
  NavJobs: () => <Layers size={20} strokeWidth={1.5} />,
  NavProducts: () => <Tag size={20} strokeWidth={1.5} />,
  Upload: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 11V3"/>
      <polyline points="4.5,6.5 8,3 11.5,6.5"/>
      <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v8"/>
      <polyline points="4.5,7.5 8,11 11.5,7.5"/>
      <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/>
    </svg>
  ),
  Verify: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6"/>
      <path d="M5 8.3l2 2 4-4"/>
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

  // quiet: true revalidates in the background without flipping `loading`, so callers that
  // gate on `loading` (e.g. full-page spinners) don't unmount open UI on an in-place save.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState(s => ({ data: quiet ? s.data : null, loading: false, error: e.message }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

function valueForExport(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function ExcelExportButton({ filename, columns, rows, disabled, label = 'Export to Excel' }) {
  return (
    <button
      type="button"
      className="btn btn-ghost table-export-button"
      disabled={disabled || !rows.length}
      onClick={() => exportTableToXlsx({
        filename,
        rows,
        columns: columns.map(column => ({
          header: column.header,
          key: column.key,
          value: row => valueForExport(column.exportValue ? column.exportValue(row) : (column.value ? column.value(row) : row[column.key])),
        })),
      })}
    >
      <Icon.Download /> {label}
    </button>
  );
}

function ViewToggle({ value, onChange, label = 'View mode' }) {
  return (
    <div className="card-list-toggle" aria-label={label}>
      <button type="button" className={value === 'cards' ? 'is-active' : ''} onClick={() => onChange('cards')}>
        Cards
      </button>
      <button type="button" className={value === 'list' ? 'is-active' : ''} onClick={() => onChange('list')}>
        List
      </button>
    </div>
  );
}

function DataTableToolbar({ children }) {
  return <div className="data-table-toolbar">{children}</div>;
}

function CountBadge({ count, label }) {
  return <span className="count-badge" aria-label={label}>{count}</span>;
}

function EmptyState({ title = 'Nothing here yet.', children }) {
  return (
    <div className="empty-state shell-empty-state">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

function LoadingState({ label = 'Loading...' }) {
  return <div className="empty-state shell-loading-state" role="status">{label}</div>;
}

function ErrorState({ message = 'Something went wrong.' }) {
  return <div className="error-state shell-error-state" role="alert">{message}</div>;
}

function PanelCollapseButton({ collapsed, onClick, label }) {
  return (
    <button
      type="button"
      className="panel-collapse-button"
      aria-label={label}
      aria-expanded={!collapsed}
      onClick={onClick}
    >
      {collapsed ? <Icon.ChevronRight /> : <Icon.Close />}
    </button>
  );
}

function SearchControl({ value = '', onChange, placeholder = 'Search', label = 'Search' }) {
  return (
    <label className="search-control">
      <span className="sr-only">{label}</span>
      <input
        className="ui-input"
        type="search"
        value={value}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function FilterControl({ label, value = '', onChange, options = [] }) {
  return (
    <label className="filter-control">
      <span className="sr-only">{label}</span>
      <select className="ui-select" value={value} onChange={event => onChange?.(event.target.value)} aria-label={label}>
        {options.map(option => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewSwitcher({ value, onChange, options = [], label = 'View' }) {
  return (
    <div className="view-switcher" aria-label={label}>
      {options.map(option => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ── SubNav ───────────────────────────────────────────────────────────────────
// Reusable in-page section navigation. `items`: [{ id, label, icon?, count?, disabled?, onClick? }].
// `actions` renders page-level utilities on the right.
function SubNav({ items, value, onChange, actions, className = '', label = 'Section navigation' }) {
  return (
    <div className={`subnav ${className}`}>
      <div className="subnav-tabs" role="tablist" aria-label={label}>
        {items.map(item => {
          const isActive = value === item.id;
          const isDisabled = Boolean(item.disabled);
          return (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              className={`subnav-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                if (isDisabled) return;
                item.onClick?.(item);
                onChange?.(item.id, item);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && item.count !== null && (
                <span className="subnav-count">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {actions && <div className="subnav-actions">{actions}</div>}
    </div>
  );
}

function CardShell({ children, className = '' }) {
  return <article className={`card-shell ${className}`}>{children}</article>;
}

function MediaThumbnail({ src, alt = '', children }) {
  return (
    <div className="media-thumbnail">
      {src ? <img src={src} alt={alt} /> : <span>{children || 'No media'}</span>}
    </div>
  );
}

function MetadataRow({ items = [] }) {
  return (
    <div className="metadata-row">
      {items.filter(Boolean).map(item => (
        <span key={`${item.label}-${item.value}`}>
          <em>{item.label}</em>
          {item.value}
        </span>
      ))}
    </div>
  );
}

function ActionBar({ children }) {
  return <div className="action-bar">{children}</div>;
}

function WorkspaceHeader({
  title,
  description,
  count,
  search,
  filters,
  primaryAction,
  secondaryActions,
  viewControls,
}) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-copy">
        <div className="workspace-title-row">
          <h1>{title}</h1>
          {count !== undefined && <CountBadge count={count} label={`${count} records`} />}
        </div>
        {description && <p>{description}</p>}
      </div>
      <div className="workspace-header-controls">
        {search}
        {filters}
        {viewControls}
        {secondaryActions}
        {primaryAction}
      </div>
    </header>
  );
}

function QueuePanel({ title, views = [], activeView, onSelectView, footer, loading, error, empty = 'No queues yet.' }) {
  const [collapsed, setCollapsed] = useStoredState('workspace:queue-panel:collapsed', 'false');
  const isCollapsed = collapsed === 'true';
  return (
    <aside className={`queue-panel ${isCollapsed ? 'is-collapsed' : ''}`} aria-label={title}>
      <div className="workspace-panel-top">
        <strong>{title}</strong>
        <PanelCollapseButton collapsed={isCollapsed} label={isCollapsed ? 'Expand queue panel' : 'Collapse queue panel'} onClick={() => setCollapsed(isCollapsed ? 'false' : 'true')} />
      </div>
      {!isCollapsed && (
        <>
          {loading && <LoadingState label="Loading queues..." />}
          {error && <ErrorState message={error} />}
          {!loading && !error && views.length === 0 && <EmptyState title={empty} />}
          {!loading && !error && views.length > 0 && (
            <div className="queue-list">
              {views.map(view => (
                <button
                  type="button"
                  key={view.id}
                  className={`queue-item ${activeView === view.id ? 'is-active' : ''}`}
                  onClick={() => onSelectView?.(view.id)}
                >
                  <span>{view.label}</span>
                  {view.count !== undefined && <CountBadge count={view.count} label={`${view.count} ${view.label}`} />}
                </button>
              ))}
            </div>
          )}
          {footer && <div className="queue-footer">{footer}</div>}
        </>
      )}
    </aside>
  );
}

function WorkspaceCanvas({ children, className = '' }) {
  return <section className={`workspace-canvas ${className}`}>{children}</section>;
}

function InspectorPanel({ title = 'Inspector', selected, children, empty = 'Select a record to inspect details.' }) {
  const [collapsed, setCollapsed] = useStoredState('workspace:inspector-panel:collapsed', 'false');
  const isCollapsed = collapsed === 'true';
  return (
    <aside className={`inspector-panel ${isCollapsed ? 'is-collapsed' : ''}`} aria-label={title}>
      <div className="workspace-panel-top">
        <strong>{title}</strong>
        <PanelCollapseButton collapsed={isCollapsed} label={isCollapsed ? 'Expand inspector panel' : 'Collapse inspector panel'} onClick={() => setCollapsed(isCollapsed ? 'false' : 'true')} />
      </div>
      {!isCollapsed && (
        <div className="inspector-body">
          {selected || children ? children : <EmptyState title={empty} />}
        </div>
      )}
    </aside>
  );
}

function WorkspaceLayout({ queue, children, inspector, className = '' }) {
  return (
    <div className={`workspace-shell-layout ${className}`}>
      {queue}
      <WorkspaceCanvas>{children}</WorkspaceCanvas>
      {inspector}
    </div>
  );
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
    description: 'Products waiting for required merchandise to be received or matched.',
    empty: 'No products waiting for merchandise.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'waiting_for_merchandise',
  },
  {
    id: 'merchandise_issues',
    title: 'Merchandise Issues',
    description: 'Products blocked by unresolved merchandise issues.',
    empty: 'No unresolved merchandise issues.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'merchandise_issue',
  },
  {
    id: 'missing_data',
    title: 'Missing Critical Data',
    description: 'Products missing required client data for photography readiness.',
    empty: 'No products missing critical data.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'missing_data',
  },
  {
    id: 'missing_artwork',
    title: 'Missing Required Artwork',
    description: 'Products waiting for artwork required by the client.',
    empty: 'No products missing required artwork.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'missing_artwork',
  },
  {
    id: 'ready_for_photo',
    title: 'Ready for Photo',
    description: 'Products ready to send to Creative Force.',
    empty: 'No products ready for photo.',
    matches: item => isOpenFoodHubItem(item) && item.readiness?.state === 'ready_for_photo',
  },
  {
    id: 'in_creative_force',
    title: 'In Creative Force',
    description: 'Products currently in Creative Force and read-only here.',
    empty: 'No products currently in Creative Force.',
    matches: item => isItemInCreativeForce(item),
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Products completed by Walnut.',
    empty: 'No completed products yet.',
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
  const skus = useResource(() => api.listProducts());
  const receipts = useResource(() => api.listShipments());
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

  // Shipments logged by Receiving and awaiting Merchandise Review.
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
          <div className="dash-kpi-lbl">Active Products</div>
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
            <span></span><span>Product</span><span>Brand</span><span>Job #</span><span>Client</span>
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
          <div className="dash-card-title">Product Distribution</div>
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

      {/* Merchandise Review Queue */}
      {!receipts.loading && (
        <div className="dash-card">
          <div className="dash-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Awaiting Merchandise Review</span>
            {reviewReceipts.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                {reviewReceipts.length}
              </span>
            )}
          </div>
          {reviewReceipts.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', padding: '8px 0' }}>
              No shipments have merchandise awaiting review.
            </div>
          ) : (
            <>
              <div className="dash-aging-head" style={{ gridTemplateColumns: '44px 1.2fr 1fr 2fr 80px 80px' }}>
                <span></span><span>Receiving Logged</span><span>Client</span><span>Merchandise</span><span>Quantity</span><span>Days Ago</span>
              </div>
              {reviewReceipts.map(r => {
                const thumb = recordPhotoUrl(r);
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
                    <span className="dash-aging-brand">{r.entrySummary || `${r.entryCount} merchandise record${r.entryCount === 1 ? '' : 's'}`}</span>
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
            <span>Product</span><span>Brand</span><span>State</span><span>Days Sitting</span>
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
  return item?.name || item?.product || 'Unnamed Product';
}

function itemMatchIdentifier(item) {
  const value = itemMatchIdentifierValue(item);
  return value ? `${itemMatchIdentifierLabel(item)}: ${value}` : '';
}

function itemMatchIdentifierLabel(item) {
  const label = item?.identifierLabel || item?.codeType || 'Identifier';
  return label;
}

function itemMatchIdentifierValue(item) {
  return item?.identifier || item?.productId || item?.gtinUpc || '';
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
  if (photo.previewUrl) return photo.previewUrl;
  const objectKey = photo.object_key || photo.objectKey || '';
  if (!objectKey) return '';
  return photo.url || photo.publicUrl || photo.public_url || '';
}

function recordPhotoUrl(record) {
  return receivingPhotoUrl(recordPhotos(record)[0]);
}

function recordPhotos(record) {
  const metadata = (record?.photoMetadata || []).filter(photo => receivingPhotoUrl(photo));
  if (metadata.length) return metadata;
  return (record?.photos || []).filter(photo => (photo.object_key || photo.objectKey) && receivingPhotoUrl(photo));
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

function QuickReceivingCapture({ locationList }) {
  const receiptList = useResource(() => api.listShipments());
  const [receipt, setReceipt] = useState(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [session, setSession] = useState({
    carrier: '',
    tracking: '',
    boxQuantity: 1,
    received: toDatetimeLocal(),
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

  async function ensureReceipt() {
    if (receipt) return receipt;
    const created = await api.startReceivingSession({
      carrier: session.carrier.trim(),
      tracking: session.tracking.trim(),
      boxQuantity: Number(session.boxQuantity || 1),
      received: session.received,
    });
    setReceipt(created);
    setEntryCount(created.entries?.length ?? 0);
    setNotice('Shipment started.');
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
      setError(err.message || 'Could not open that shipment.');
    }
  }

  async function startDelivery() {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await ensureReceipt();
    } catch (err) {
      setError(err.message || 'Could not start shipment.');
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
          setError(photoError.message || 'Merchandise saved, but photos could not be uploaded.');
        }
      }
      if (entry.locationId) saveRecentReceivingLocation(entry.locationId);
      setReceipt(prev => prev ? { ...prev, entries: [...(prev.entries || []), saved] } : prev);
      setEntryCount(count => count + 1);
      resetEntry(entry.locationId);
      setNotice('Merchandise saved. Ready for the next merchandise record.');
    } catch (err) {
      setError(err.message || 'Could not save merchandise.');
    } finally {
      setSaving(false);
    }
  }

  function finishDelivery() {
    setNotice(receipt ? 'Shipment finished and sent to Merchandise Review.' : 'No shipment has been started yet.');
    setReceipt(null);
    setSelectedReceiptId('');
    setEntryCount(0);
    setSession({ carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal() });
    resetEntry('');
  }

  return (
    <div className="mobile-receiving-shell">
      <div className="mobile-receiving-top">
        <div>
          <span className="mobile-kicker">Quick Capture</span>
          <h2>{receipt?.receipt || receipt?.name || receipt?.id || 'New Shipment'}</h2>
        </div>
          <strong>{entryCount} merchandise record{entryCount === 1 ? '' : 's'}</strong>
      </div>

      {error && <div className="error-state">{error}</div>}
      {notice && <div className="notice-state">{notice}</div>}

      <div className="mobile-receiving-panel">
        <div className="mobile-field">
          <label>Open Shipment</label>
          <select value={selectedReceiptId} onChange={event => openReceipt(event.target.value)}>
            <option value="">Start a new shipment</option>
            {openReceipts.map(item => (
              <option value={item.id} key={item.id}>
                {item.receipt || item.name || item.tracking || item.id} · {item.entries?.length ?? 0} merchandise records
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
          <label>Package Name</label>
          <div className="mobile-identifier-row">
            <input ref={productNameRef} value={entry.productName} onChange={event => setEntry('productName', event.target.value)} placeholder="Name printed on package" />
            {barcodeSupported && <button type="button" className="btn btn-alt">Scan</button>}
          </div>
          <input value={entry.skuId} onChange={event => setEntry('skuId', event.target.value)} placeholder="Barcode or ID Number (optional)" />
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
        <button type="button" className="btn btn-alt" onClick={finishDelivery} disabled={saving}>Finish Shipment</button>
        <button type="button" className="btn btn-primary" onClick={saveNext} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}

function ShipmentsPage() {
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const carrierOptions = useResource(() => api.airtableSingleSelectOptions({ tableName: 'Shipments', fieldName: 'Carrier' }));
  const allReceipts = useResource(() => api.listShipments());

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
        const data = await api.searchMerchandiseReviewProducts({ q: matchQuery, clientId: activeClientId, includeItemId: prevMatchedItemId });
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
      setError(err.message || 'Could not create shipment.');
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
    if (entryPhotos.length === 0) {
      setError('Add at least one photo before saving.');
      return;
    }
    if (!entry.productName.trim()) {
      setError('Package Name is required.');
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
          setError(photoError.message || 'Merchandise saved, but photos could not be uploaded.');
          setToast('Merchandise saved, photo upload failed');
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
        setToast(editingEntryId ? 'Merchandise updated' : 'Merchandise saved');
      }
    } catch (err) {
      if (uploadDelay) window.clearTimeout(uploadDelay);
      setShowUploadProgress(false);
      setError(err.message || 'Could not save merchandise.');
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
      setError(err.message || 'Could not load shipment.');
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
      setToast('Shipment info saved.');
      allReceipts.reload();
    } catch (err) {
      setError(err.message || 'Could not save shipment info.');
    } finally {
      setSaving('');
    }
  }

  function populateEntryFromSaved(saved) {
    setEntryPhotos(prev => {
      prev.forEach(p => { if (!p.isExisting) URL.revokeObjectURL(p.previewUrl); });
      // Load existing R2-backed photos so they show as previews in the edit modal.
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
          name: saved.productName || saved.name || 'Matched Product',
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
    setToast('Editing merchandise.');
  }

  async function removeReceivedItem(saved) {
    if (!receipt || !saved?.id) return;
    if (!window.confirm(`Remove ${receivingEntryLabel(saved)} from this shipment?`)) return;
    setSaving('remove');
    setError('');
    try {
      await api.deleteReceiptEntry(receipt.id, saved.id);
      setSavedEntries(prev => prev.filter(item => item.id !== saved.id));
      if (editingEntryId === saved.id) {
        setEditingEntryId('');
        resetActiveEntry(entry.locationId, entry.condition || 'Good');
      }
      setToast('Merchandise removed.');
    } catch (err) {
      setError(err.message || 'Could not remove merchandise.');
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
      {toast && <div className={`receiving-toast ${toast === 'Merchandise saved' ? 'is-success' : ''}`} role="status">✓ {toast}</div>}
      {previewPhoto && (
        <button type="button" className="receiving-photo-preview" onClick={() => setPreviewPhoto(null)}>
          <img src={previewPhoto.url} alt={previewPhoto.name || 'photo'} />
        </button>
      )}

      {/* Sub-page navigation */}
      <SubNav
        value={tab}
        onChange={next => {
          if (next === 'new' && tab === 'new' && receipt) { startNewSession(); }
          else { setTab(next); }
        }}
        items={[
          { id: 'new', label: receipt ? 'Edit Shipment' : 'New Shipment', icon: <Icon.Download /> },
          { id: 'all', label: 'All Shipments', icon: <Icon.Jobs />, count: receiptList.length || undefined },
        ]}
        actions={receipt && (
          <button
            type="button"
            className="subnav-action"
            onClick={() => { startNewSession(); setTab('new'); }}
            title="Start a new shipment"
          >
            <Icon.Add /> New Shipment
          </button>
        )}
      />

      {tab === 'new' ? (
        /* ── Three-panel merchandise entry layout ── */
        <div className="recv-three-col">

          {/* Panel 1: Shipment Details */}
          <div className="recv-receipt-panel">
            <div className="recv-panel-head">
              <span className="recv-panel-step">1</span>
              <strong className="recv-panel-title">Shipment Details</strong>
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
              {!receipt && error && <div className="recv-field-error">{error}</div>}
              {!receipt && (
                <button type="button" className="recv-create-btn" onClick={createDelivery} disabled={Boolean(saving)}>
                  {saving === 'create' ? 'Creating...' : 'Create Shipment'}
                </button>
              )}
            </div>
            {receipt && (
              <div className="recv-panel-footer">
                <div className="recv-panel-created">
                  <span>✓ Shipment saved</span>
                  <span className="recv-session-badge">{entryCount} merchandise record{entryCount !== 1 ? 's' : ''}</span>
                </div>
                {headerReceivedLabel && <span className="recv-session-time">{headerReceivedLabel}</span>}
              </div>
            )}
          </div>

          {/* Panel 2: Add Merchandise */}
          <div className="recv-item-panel">
            <div className="recv-panel-head">
              <span className={`recv-panel-step${!receipt ? ' is-inactive' : ''}`}>2</span>
              <strong className="recv-panel-title">Add Merchandise</strong>
            </div>
            {!receipt ? (
              <div className="recv-panel-locked">
                <span>Create a shipment first to start adding merchandise.</span>
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
                      <span className="recv-edit-modal-title">Edit merchandise</span>
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
                      <label>Package Name</label>
                      <input ref={productNameRef} value={entry.productName} onChange={e => { setEntry('productName', e.target.value); if (error) setError(''); }} placeholder="Name printed on package" autoComplete="off" />
                    </div>
                    <div className="recv-field">
                      <label>{DOMAIN_TERMS.merchandiseIdentifier}</label>
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
                            <small className="receiving-match-meta">
                              {itemMatchIdentifierValue(matchChoice.item) && (
                                <span className="receiving-match-identifier-copy">
                                  {itemMatchIdentifierLabel(matchChoice.item)}: {itemMatchIdentifierValue(matchChoice.item)}
                                  <button
                                    type="button"
                                    className="recv-copy-name-btn"
                                    title="Copy identifier"
                                    aria-label="Copy matched identifier"
                                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(itemMatchIdentifierValue(matchChoice.item)); }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                  </button>
                                </span>
                              )}
                              {[matchChoice.item.brand, matchChoice.item.parentJobNumber ? `Job ${matchChoice.item.parentJobNumber}` : ''].filter(Boolean).map(value => (
                                <span key={value}>{value}</span>
                              ))}
                            </small>
                          </span>
                          <button type="button" onClick={() => { setPrevMatchedItemId(matchChoice.item?.id || ''); setMatchChoice({ status: 'none', item: null }); }}>Change</button>
                        </div>
                      ) : matchChoice.status === 'needs' ? (
                        <div className="receiving-match-selected is-unmatched">
                          <span><strong>No Clear Match</strong><small>Will go to Merchandise Review.</small></span>
                          <button type="button" onClick={() => setMatchChoice({ status: 'none', item: null })}>Change</button>
                        </div>
                      ) : showMatchSuggestions ? (
                        <div className="receiving-match-panel">
                          <div className="receiving-match-panel-head">
                            <span>{matchLoading ? 'Searching products…' : itemMatches.length ? 'Suggested products' : 'No matches found'}</span>
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
                    <button type="button" className="recv-save-btn" onClick={saveNext} disabled={Boolean(saving) || entryPhotos.length === 0}>
                      {saving === 'entry' ? 'Saving…' : editingEntryId ? 'Update merchandise' : 'Save & next →'}
                    </button>
                  </div>{/* end recv-form-content */}
                </div>
              </>
            )}
          </div>

          {/* Panel 3: Merchandise Logged */}
          <div className="recv-list">
            <div className="recv-panel-head">
              <span className={`recv-panel-step${!receipt ? ' is-inactive' : ''}`}>3</span>
              <strong className="recv-panel-title">{entryCount} Merchandise Record{entryCount !== 1 ? 's' : ''} Logged</strong>
            </div>
            <div className="recv-list-items">
              {savedEntries.length === 0 ? (
                <div className="receiving-current-empty">Merchandise you log will appear here.</div>
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
        /* ── All Shipments view ── */
        <div className="recv-all-view">
          <div className="recv-all-toolbar">
            <input
              className="recv-all-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shipments by client, carrier, tracking…"
              autoFocus
            />
            <div className="recv-all-view-toggle">
              <button type="button" className={`recv-all-view-btn${allReceiptsView === 'receipts' ? ' is-active' : ''}`} onClick={() => setAllReceiptsView('receipts')}>By Shipment</button>
              <button type="button" className={`recv-all-view-btn${allReceiptsView === 'items' ? ' is-active' : ''}`} onClick={() => setAllReceiptsView('items')}>By Merchandise</button>
            </div>
          </div>
          {isSearching && (
            <div className="recv-all-scope-note">{filteredReceipts.length} shipment{filteredReceipts.length !== 1 ? 's' : ''} found · <button type="button" className="recv-all-scope-search" onClick={() => setSearch('')}>Clear</button></div>
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
                if (filteredReceipts.length === 0) return <div className="empty-state" style={{gridColumn:'1/-1'}}>No shipments match that search.</div>;
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
  const jobExportColumns = [
    { header: 'Client', value: job => clientList.find(c => job.clientIds?.includes(c.id))?.name || '' },
    { header: 'Job', key: 'name' },
    { header: 'Parent Job Number', value: job => job.parentJobNumber || job.extId || '' },
    { header: 'Period', key: 'period' },
    { header: 'Deadline', key: 'deadline' },
    { header: 'Status', key: 'status' },
  ];

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

      <DataTableToolbar>
        <ExcelExportButton
          filename={todayExportFilename('jobs')}
          columns={jobExportColumns}
          rows={jobList}
          disabled={jobs.loading}
        />
      </DataTableToolbar>

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
                      Products <Icon.ChevronRight />
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

// ── Products page ─────────────────────────────────────────────────────────────
function ProductsPage({ navigate, jobId: initJobId, queue: initQueue }) {
  const jobs = useResource(() => api.listJobs());
  const clients = useResource(() => api.listClients());
  const [jobFilter, setJobFilter] = useState(initJobId ?? '');
  const [queueFilter, setQueueFilter] = useState(initQueue ?? '');
  const items = useResource(
    () => api.listProducts(jobFilter || undefined),
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
  const productExportColumns = [
    { header: 'Product', key: 'name' },
    { header: identifierLabel, key: 'identifier' },
    { header: 'Product or File Name', key: 'product' },
    { header: DOMAIN_TERMS.productJobNumber, key: 'itemJobNumber' },
    { header: 'Workstream', key: 'workstream' },
    { header: 'Brand', key: 'brand' },
    { header: 'Job', value: item => jobNames(item) },
    { header: 'Readiness', value: item => item.readiness?.label || item.readiness?.state || '' },
    { header: 'Received', key: 'received' },
  ];

  async function selectItem(itemId) {
    setSelectedItemId(itemId);
    setDetailError('');
    try {
      const data = await api.getProduct(itemId);
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

      <DataTableToolbar>
        <ExcelExportButton
          filename={todayExportFilename('products')}
          columns={productExportColumns}
          rows={visibleItems}
          disabled={items.loading}
        />
      </DataTableToolbar>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>{identifierLabel}</th>
              <th>Product or File Name</th>
              <th>{DOMAIN_TERMS.productJobNumber}</th>
              <th>Workstream</th>
              <th>Brand</th>
              <th>Job</th>
              <th>Readiness</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.loading && <tr><td colSpan="10" className="empty-state">Loading…</td></tr>}
            {!items.loading && visibleItems.length === 0 && (
              <tr><td colSpan="10" className="empty-state">No Products found</td></tr>
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
                <td>{item.workstream || item.output || '—'}</td>
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
            <div className="setting-row"><span className="setting-key">{DOMAIN_TERMS.productJobNumber}</span><span className="setting-val">{itemDetail.itemJobNumber || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Description</span><span className="setting-val">{itemDetail.description || '—'}</span></div>
            <div className="setting-row"><span className="setting-key">Workstream</span><span className="setting-val">{itemDetail.workstream || itemDetail.output || '—'}</span></div>
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

// ── Add Product form ─────────────────────────────────────────────────────────
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
      <div className="form-title">Add Product</div>
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
            <label>{DOMAIN_TERMS.productJobNumber}</label>
            <input value={form.itemJobNumber} onChange={e => set('itemJobNumber', e.target.value)} />
          </div>
          <div className="field">
            <label>Workstream</label>
            <select value={form.output} onChange={e => set('output', e.target.value)}>
              <option value="">Select workstream...</option>
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
            {saving ? 'Saving…' : 'Add Product'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────
function SettingsPage({ cards = null } = {}) {
  const { data, loading, error } = useResource(() => api.settings());
  const clients = useResource(() => api.listClients({ all: true }));
  const s = data?.settings;
  const clientList = clients.data?.records ?? [];
  const [randomizing, setRandomizing] = useState(false);
  const [randomizeSummary, setRandomizeSummary] = useState(null);
  const [randomizeError, setRandomizeError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearSummary, setClearSummary] = useState(null);
  const [clearError, setClearError] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const hasCard = id => !cards || cards.includes(id);
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
  const clientRequirementsExportColumns = [
    { header: 'Client', key: 'name' },
    { header: 'Identifier Type', value: client => client.codeType || client.identifierLabel || '' },
    { header: 'Required Fields', value: client => (client.requiredPhotographyFields ?? []).join(', ') || 'Identifier' },
    { header: 'Artwork', value: client => client.artworkRequirement || 'Optional' },
    { header: 'Merchandise', value: client => client.merchandiseRequired === false ? 'Not required' : 'Required' },
  ];

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
    const merchandiseTable = s?.tables?.merchandise || s?.tables?.receiptEntries || 'Merchandise';
    const shipmentsTable = s?.tables?.shipments || s?.tables?.receipts || 'Shipments';
    const productsTable = s?.tables?.products || s?.tables?.items || 'Products';
    const typed = window.prompt(`This will delete all rows from ${technicalTableLabel(merchandiseTable)}, ${technicalTableLabel(shipmentsTable)}, ${technicalTableLabel(productsTable)}, History, Jobs, and Imports. Type DELETE to continue.`);
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
      {hasCard('system') && <div className="panel">
        <SectionHeader id="airtable" title="System Settings" />
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
                <span className="setting-key">Clients</span>
                <span className="setting-val">{s.tables?.clients}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">Jobs</span>
                <span className="setting-val">{s.tables?.jobs}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">{DOMAIN_TERMS.products}</span>
                <span className="setting-val">{technicalTableLabel(s.tables?.products || s.tables?.skus || 'Products')}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">{DOMAIN_TERMS.shipments}</span>
                <span className="setting-val">{technicalTableLabel(s.tables?.shipments || s.tables?.receipts || 'Shipments')}</span>
              </div>
              <div className="setting-row">
                <span className="setting-key">{DOMAIN_TERMS.merchandise}</span>
                <span className="setting-val">{technicalTableLabel(s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise')}</span>
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
      </div>}
      {hasCard('clients') && <div className="panel requirements-panel">
        {clients.error && <div className="error-state">{clients.error}</div>}
        <DataTableToolbar>
          <ExcelExportButton
            filename={todayExportFilename('client-requirements')}
            columns={clientRequirementsExportColumns}
            rows={clientList}
            disabled={clients.loading}
          />
        </DataTableToolbar>
        <div className="table-wrap requirements-table">
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
        </div>
      </div>}
      {hasCard('developer') && s?.development && (
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
              <span className="setting-val">Delete all rows from {technicalTableLabel(s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise')}, {technicalTableLabel(s.tables?.shipments || s.tables?.receipts || 'Shipments')}, {technicalTableLabel(s.tables?.products || s.tables?.items || 'Products')}, History, Jobs, and Imports.</span>
              <button className="btn btn-danger" type="button" onClick={clearCoreTables} disabled={clearing}>
                {clearing ? 'Deleting…' : 'Delete Rows'}
              </button>
            </div>
          </div>
          {randomizeError && <div className="error-state">{randomizeError}</div>}
          {randomizeSummary && (
            <div className="settings-list">
              <div className="setting-row"><span className="setting-key">Products updated</span><span className="setting-val">{randomizeSummary.itemsUpdated ?? 0}</span></div>
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
  'Product Name': getFieldLabel('Product Name', 'product'),
  Identifier: getFieldLabel('Identifier', 'product'),
  'Product or File Name': getFieldLabel('Product or File Name', 'product'),
  'Product/File Name': getFieldLabel('Product/File Name', 'product'),
  Description: getFieldLabel('Description', 'product'),
  'Product Job Number': getFieldLabel('Product Job Number', 'product'),
  Workstream: getFieldLabel('Workstream', 'product'),
  'Master or Variant': getFieldLabel('Master or Variant', 'product'),
  'Pickup Job Number': getFieldLabel('Pickup Job Number', 'product'),
  Brand: getFieldLabel('Brand', 'product'),
  'Parent Job Number': getFieldLabel('Parent Job Number', 'product'),
  'Due Date': getFieldLabel('Due Date', 'product'),
  Notes: getFieldLabel('Notes', 'product'),
  'Job Name': getFieldLabel('Job Name', 'product'),
  'Reference Data': getFieldLabel('Reference Data', 'product'),
};

const INTAKE_FALLBACK_TARGET_DESCRIPTIONS = {
  'Product Name': 'Optional product display name in the app.',
  Identifier: 'Client product identifier.',
  'Product or File Name': 'Product or file name.',
  Description: 'Longer source product description.',
  'Product Job Number': 'Row-level job or project number for the product.',
  Workstream: 'Production workstream or legacy Photo/Render routing value.',
  'Master or Variant': 'Whether this product is a master or a variant.',
  'Pickup Job Number': 'Previous production job number for variant pickup work.',
  Brand: 'Product brand.',
  'Parent Job Number': 'Batch-level number edited on the selected Job.',
  'Due Date': 'Job due date when present in the source spreadsheet.',
  Notes: 'Source notes that describe the product.',
  'Job Name': 'Human-readable job or group name.',
  'Reference Data': 'Preserve source values as product reference JSON.',
};

const INTAKE_REQUIRED_TARGETS = ['Identifier'];
const KNOWN_INTAKE_MAPPINGS = {
  kroger: { 'Job #': 'Product Job Number', Description: 'Description', UPC: 'Identifier', Brand: 'Brand', 'Product Received': 'Product Name', 'Output Type': 'Workstream', Notes: 'Notes' },
  unfi: { 'Project Number': 'Product Job Number', Description: 'Description', UPC: 'Identifier', 'Output Type': 'Workstream', Notes: 'Notes' },
  smithfield: { 'Job #': 'Product Job Number', 'GAR #': 'Identifier', Brand: 'Brand', 'Product Description': 'Description', Output: 'Workstream', Notes: 'Notes' },
};
const INTAKE_TARGET_FIELDS = {
  'Job Name': 'jobName', 'Parent Job Number': 'parentJobNumber', 'Due Date': 'due',
  'Product Name': 'itemName', Identifier: 'id', 'Product or File Name': 'product', 'Product/File Name': 'product', Description: 'description', 'Product Job Number': 'itemJobNumber', Workstream: 'output', 'Output Type': 'output', 'Master or Variant': 'masterOrVariant', 'Pickup Job Number': 'pickupJobNumber', Brand: 'brand', Notes: 'notes',
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
function mappingTargetTechnicalLabel(target, identifierLabel = 'Identifier') {
  if (!target || target === 'Ignore') return '';
  if (target === 'Identifier') return labelWithFieldMeaning(target, identifierLabel || 'Identifier');
  return labelWithFieldMeaning(target, mappingTargetLabel(target, identifierLabel));
}
function labelWithFieldMeaning(fieldName, label) {
  return `${label} (Airtable field: ${fieldName})`;
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
  if (!Object.values(mapping).includes('Product Name')) {
    const itemName = firstAvailableHeader(headers, used, ['productreceived', 'productdescription', 'itemname', 'itemdescription', 'description']);
    if (itemName) { mapping[itemName] = 'Product Name'; used.add(itemName); }
  }
  [
    ['Identifier', ['upc', 'gtin', 'gar', 'itemnumber', 'sku']],
    ['Product or File Name', ['productfilename', 'productname']],
    ['Description', ['description', 'productdescription', 'productreceived', 'itemdescription']],
    ['Product Job Number', ['jobnumber', 'jobid', 'job', 'projectnumber', 'project']],
    ['Workstream', ['workstream', 'outputtype', 'output']],
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

function MappingTargetHelp({ target, description, identifierLabel }) {
  if (!target || target === 'Ignore') return null;
  return (
    <small>
      <span>{description || 'Imported product field.'}</span>
      <span>{mappingTargetTechnicalLabel(target, identifierLabel)}</span>
    </small>
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
  const itemMappingTargets = ['Product Name', ...photographyTargets, ...(photographyTargets.includes('Brand') ? [] : ['Brand']), 'Product or File Name', 'Description', 'Product Job Number', 'Workstream', 'Master or Variant', 'Pickup Job Number', 'Notes', 'Reference Data']
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
        <div><div className="intake-field-map-label">{mappingTargetLabel(target, identifierLabel)} {required && <span className="badge badge-blue">Required</span>}</div>{helper && <div className="intake-field-map-helper">{helper}</div>}<div className="intake-field-map-helper">{mappingTargetTechnicalLabel(target, identifierLabel)}</div></div>
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
                  <small>Put all imported products into an existing job.</small>
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
                  <small>Put all imported products into a new job.</small>
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
                <span>Source column</span>
                <span>Destination field</span>
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
                        <select value={value} onChange={event => updateSpreadsheetFieldMapping(header, event.target.value)} aria-label={`Map source column ${header || 'blank'}`}>
                          {applicationTargets.map(target => <option value={target} key={target}>{target === 'Ignore' ? 'Do not import' : mappingTargetLabel(target, identifierLabel)}</option>)}
                        </select>
                        {value !== 'Ignore' && (
                          <MappingTargetHelp
                            target={value}
                            description={targetDescriptions[value]}
                            identifierLabel={identifierLabel}
                          />
                        )}
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
      {step === 'validate' && review && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Validate & Fix</div><div className="intake-preview-sub">Fix highlighted rows or import only the valid rows.</div></div></div><div className="intake-summary-grid is-six"><div className="intake-summary-item"><span>Total rows</span><strong>{review.totalRows}</strong></div><div className="intake-summary-item"><span>Jobs detected</span><strong>{review.jobsDetected}</strong></div><div className="intake-summary-item"><span>Products to create</span><strong>{liveReviewStats.itemsToCreate}</strong></div><div className="intake-summary-item"><span>Products to update</span><strong>{liveReviewStats.itemsToUpdate}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{liveReviewStats.errorCount}</strong></div><div className="intake-summary-item"><span>Warnings</span><strong className="metric-warning">{liveReviewStats.warningCount}</strong></div></div>{hasErrors ? <div className="intake-callout danger"><div className="intake-callout-icon">!</div><div><div className="intake-callout-title">Errors Found</div><div className="intake-callout-text">Rows with unresolved errors will be skipped during import.</div></div></div> : <div className="intake-callout success"><div className="intake-callout-icon">✓</div><div><div className="intake-callout-title">Success</div><div className="intake-callout-text">All rows passed validation.</div></div></div>}<div className="intake-inline-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div><div className="table-wrap intake-preview-table"><table><thead><tr>{headers.map((header, index) => <MappingHeader target={sourceColumnMappings[header]} showUnmapped key={`${header}-${index}`}>{header || '(blank)'}</MappingHeader>)}<th className="problem-column-header">Alerts</th></tr></thead><tbody>{editableRows.map(row => <tr className={(row.errors ?? []).length ? 'row-error' : (row.warnings ?? []).length ? 'row-warning' : ''} key={row.rowNumber}>{headers.map((header, columnIndex) => <td key={`${row.rowNumber}-${header}-${columnIndex}`}>{renderValidateCell(row, header, columnIndex)}</td>)}<td className="problem-column-cell"><div className="problem-row-alerts">{[...(row.errors ?? []), ...(row.warnings ?? [])].map((problem, index) => <span className={`badge problem-badge ${(row.errors ?? []).includes(problem) ? 'badge-red' : 'badge-amber'}`} key={`${row.rowNumber}-${index}`}><span className="problem-badge-icon">!</span>{problem}</span>)}</div></td></tr>)}</tbody></table></div><div className="form-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div></div>}
      {step === 'summary' && summary && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Import Complete</div><div className="intake-preview-sub">{preview?.fileName}</div></div><span className="badge badge-green">Success</span></div><div className="intake-summary-grid is-six"><div className="intake-summary-item"><span>Rows skipped</span><strong>{summary.rowsSkipped}</strong></div><div className="intake-summary-item"><span>Jobs created</span><strong>{summary.jobsCreated}</strong></div><div className="intake-summary-item"><span>Jobs reused</span><strong>{summary.jobsReused}</strong></div><div className="intake-summary-item"><span>Products created</span><strong>{summary.itemsCreated}</strong></div><div className="intake-summary-item"><span>Products updated</span><strong>{summary.itemsUpdated}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{summary.errors}</strong></div></div><div className="form-actions"><button className="btn btn-primary" type="button" onClick={resetIntake}>New Import</button></div></div>}
      {importing && <div className="intake-modal-backdrop" role="status" aria-live="polite"><div className="intake-modal"><div className="intake-modal-spinner" /><div className="intake-modal-title">Importing spreadsheet...</div><div className="intake-modal-sub">Creating and updating Jobs and Products in Airtable.</div></div></div>}
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
  const importExportColumns = [
    { header: 'Date', value: record => formatDateTime(record.started) },
    { header: 'Client', key: 'client' },
    { header: 'File', key: 'file' },
    { header: 'User', key: 'user' },
    { header: 'Status', key: 'status' },
    { header: 'Rows', key: 'rows' },
    { header: 'Jobs Created', key: 'jobsCreated' },
    { header: 'Jobs Reused', key: 'jobsReused' },
    { header: 'Products Created', key: 'itemsCreated' },
    { header: 'Products Updated', key: 'itemsUpdated' },
    { header: 'Errors', key: 'errors' },
    { header: 'Warnings', key: 'warnings' },
  ];

  return (
    <div className="page-stack">
      {imports.error && <div className="error-state">{imports.error}</div>}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent imports</span>
        </div>
        <DataTableToolbar>
          <ExcelExportButton
            filename={todayExportFilename('import-history')}
            columns={importExportColumns}
            rows={records}
            disabled={imports.loading}
          />
        </DataTableToolbar>
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
                <th>Products Created</th>
                <th>Products Updated</th>
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

// ── Merchandise Inventory ───────────────────────────────────────────────────
const AGE_FILTERS = [
  { value: 'all', label: 'All ages' },
  { value: '0-7', label: '0-7 days' },
  { value: '8-14', label: '8-14 days' },
  { value: '15-30', label: '15-30 days' },
  { value: '30-plus', label: 'More than 30 days' },
  { value: 'unknown', label: 'Unknown' },
];

function formatInventoryDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function uniqueInventoryOptions(records, getter) {
  return Array.from(new Set(records.map(getter).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function MerchandiseInventoryPage({ navigate }) {
  const merchandise = useResource(() => api.listMerchandise());
  const records = merchandise.data?.records ?? [];
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [viewMode, setViewMode] = useStoredState('merchandise-inventory:view-mode', 'cards');
  const [sortKey, setSortKey] = useState('daysHere');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const clients = uniqueInventoryOptions(records, record => record.client);
  const statuses = uniqueInventoryOptions(records, record => record.status);
  const locations = uniqueInventoryOptions(records, record => record.storageLocation);
  const conditions = uniqueInventoryOptions(records, record => record.condition);
  const inventorySummary = {
    total: records.length,
    old: records.filter(record => record.ageGroup === '30-plus').length,
    locations: locations.length,
    unknownAge: records.filter(record => record.ageGroup === 'unknown').length,
  };
  const filtersActive = [search, clientFilter, statusFilter, locationFilter, conditionFilter, ageFilter]
    .some(value => value && value !== 'all');
  const searchText = search.trim().toLowerCase();
  const visibleRecords = records.filter(record => {
    if (clientFilter !== 'all' && record.client !== clientFilter) return false;
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (locationFilter !== 'all' && record.storageLocation !== locationFilter) return false;
    if (conditionFilter !== 'all' && record.condition !== conditionFilter) return false;
    if (ageFilter !== 'all' && record.ageGroup !== ageFilter) return false;
    if (!searchText) return true;
    return [
      record.packageName,
      record.barcodeOrIdNumber,
      record.client,
      record.matchedProduct?.name,
      record.matchedProduct?.identifier,
      record.shipment?.name,
      record.shipment?.tracking,
      record.storageLocation,
      record.status,
      record.condition,
    ].some(value => String(value || '').toLowerCase().includes(searchText));
  });
  const selectedInventoryRecord = records.find(record => record.id === selectedInventoryId) || null;
  const merchandiseTableColumns = [
    { key: 'packageName', header: DOMAIN_TERMS.packageName, value: record => record.packageName || '' },
    { key: 'barcodeOrIdNumber', header: DOMAIN_TERMS.merchandiseIdentifier, value: record => record.barcodeOrIdNumber || '' },
    { key: 'client', header: 'Client', value: record => record.client || '' },
    { key: 'quantity', header: DOMAIN_TERMS.quantity, value: record => record.quantity ?? '' },
    { key: 'storageLocation', header: DOMAIN_TERMS.storageLocation, value: record => record.storageLocation || '' },
    { key: 'status', header: 'Status', value: record => record.status || 'Received' },
    { key: 'daysHere', header: 'Days Here', value: record => record.daysHere ?? '' },
    { key: 'timeHere', header: 'Time Here', value: record => record.timeHere || 'Unknown' },
    { key: 'dateReceived', header: 'Date Received', value: record => formatInventoryDate(record.dateReceived) },
    { key: 'matchedProduct', header: DOMAIN_TERMS.matchedProduct, value: record => record.matchedProduct?.name || '' },
    { key: 'matchedProductIdentifier', header: 'Matched Product ID', value: record => record.matchedProduct?.identifier || '' },
    { key: 'shipment', header: DOMAIN_TERMS.shipment, value: record => record.shipment?.name || '' },
    { key: 'tracking', header: 'Tracking', value: record => record.shipment?.tracking || '' },
    { key: 'condition', header: DOMAIN_TERMS.condition, value: record => record.condition || '' },
  ];
  const sortedVisibleRecords = [...visibleRecords].sort((a, b) => {
    const column = merchandiseTableColumns.find(item => item.key === sortKey);
    const getValue = record => column?.value ? column.value(record) : record[sortKey];
    const aValue = getValue(a);
    const bValue = getValue(b);
    if (sortKey === 'daysHere') {
      const aDays = a.daysHere ?? -1;
      const bDays = b.daysHere ?? -1;
      return sortDirection === 'asc' ? aDays - bDays : bDays - aDays;
    }
    return sortDirection === 'asc'
      ? String(aValue || '').localeCompare(String(bValue || ''), undefined, { numeric: true })
      : String(bValue || '').localeCompare(String(aValue || ''), undefined, { numeric: true });
  });

  function toggleInventorySort(key) {
    if (sortKey === key) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'daysHere' ? 'desc' : 'asc');
  }

  function compactAgeBadgeLabel(record) {
    return record.daysHere === null || record.daysHere === undefined ? '—' : `${record.daysHere}d`;
  }

  return (
    <div className="merchandise-inventory-page page-stack">
      {merchandise.error && <div className="error-state">{merchandise.error}</div>}

      <div className="merchandise-inventory-toolbar ui-filter-bar">
        <input
          className="ui-input"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search merchandise"
          aria-label="Search merchandise"
        />
        <select className="ui-select" value={clientFilter} onChange={event => setClientFilter(event.target.value)} aria-label="Client">
          <option value="all">Client</option>
          {clients.map(client => <option key={client} value={client}>{client}</option>)}
        </select>
        <select className="ui-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Status">
          <option value="all">Status</option>
          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="ui-select" value={locationFilter} onChange={event => setLocationFilter(event.target.value)} aria-label="Storage Location">
          <option value="all">Storage Location</option>
          {locations.map(location => <option key={location} value={location}>{location}</option>)}
        </select>
        <select className="ui-select" value={conditionFilter} onChange={event => setConditionFilter(event.target.value)} aria-label="Condition">
          <option value="all">Condition</option>
          {conditions.map(condition => <option key={condition} value={condition}>{condition}</option>)}
        </select>
        <select className="ui-select" value={ageFilter} onChange={event => setAgeFilter(event.target.value)} aria-label="Age">
          {AGE_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!filtersActive}
          onClick={() => {
            setSearch('');
            setClientFilter('all');
            setStatusFilter('all');
            setLocationFilter('all');
            setConditionFilter('all');
            setAgeFilter('all');
          }}
        >
          Clear
        </button>
      </div>

      <DataTableToolbar>
        <ViewToggle value={viewMode} onChange={setViewMode} label="Merchandise inventory view" />
        <ExcelExportButton
            filename={todayExportFilename('merchandise-inventory')}
            columns={merchandiseTableColumns}
            rows={sortedVisibleRecords}
            disabled={merchandise.loading}
            label="Export to Excel"
          />
      </DataTableToolbar>

      <div className="merchandise-inventory-summary-grid">
        <div><span>Total on Shelf</span><strong>{inventorySummary.total}</strong></div>
        <div><span>More Than 30 Days</span><strong>{inventorySummary.old}</strong></div>
        <div><span>Storage Locations</span><strong>{inventorySummary.locations}</strong></div>
        <div><span>Unknown Age</span><strong>{inventorySummary.unknownAge}</strong></div>
      </div>

      <div className="merchandise-inventory-count">
        <strong>{visibleRecords.length}</strong>
        <span>{visibleRecords.length === 1 ? 'record' : 'records'} currently shown</span>
      </div>

      {merchandise.loading && <div className="empty-state">Loading merchandise inventory...</div>}
      {!merchandise.loading && visibleRecords.length === 0 && (
        <div className="empty-state">No merchandise matches these filters.</div>
      )}

      {viewMode === 'cards' && (
      <div className="merchandise-inventory-card-grid">
        {sortedVisibleRecords.map(record => {
          const thumbnail = recordPhotoUrl(record);
          return (
          <article
            className={`merchandise-inventory-card ui-card age-${record.ageGroup || 'unknown'}`}
            key={record.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedInventoryId(record.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedInventoryId(record.id);
              }
            }}
          >
            <div className="merchandise-inventory-image" aria-label="Merchandise thumbnail">
              {thumbnail ? (
                <img src={thumbnail} alt={record.packageName ? `${record.packageName} thumbnail` : 'Merchandise thumbnail'} />
              ) : (
                <span>No photo</span>
              )}
              <span className={`merchandise-age-badge age-${record.ageGroup || 'unknown'}`}>{compactAgeBadgeLabel(record)}</span>
              <span className="merchandise-image-status-badge">
                <StatusBadge status={record.status || 'Received'} />
              </span>
            </div>
            <div className="merchandise-inventory-card-body">
              <div className="merchandise-inventory-title-row">
                <h2>{record.packageName || 'Unnamed Merchandise'}</h2>
              </div>
              <p className="merchandise-inventory-identifier">{record.barcodeOrIdNumber || 'No barcode or ID number'}</p>
              <div className="merchandise-inventory-divider" />
              <div className="merchandise-inventory-meta-row">
                <span><span className="merchandise-inventory-meta-label">Client:</span> {record.client || '-'}</span>
                <span aria-hidden="true" className="merchandise-inventory-meta-divider">|</span>
                <span><span className="merchandise-inventory-meta-label">Qty:</span> {record.quantity ?? 0}</span>
              </div>
              <div className="merchandise-inventory-location">
                <span className="merchandise-inventory-meta-label">Storage Location:</span> {record.storageLocation || '-'}
              </div>
            </div>
          </article>
          );
        })}
      </div>
      )}

      {viewMode === 'list' && (
        <div className="table-wrap merchandise-inventory-table-wrap">
          <table className="data-table merchandise-inventory-table">
            <thead>
              <tr>
                {merchandiseTableColumns.map(column => (
                  <th key={column.key}>
                    <button type="button" className="table-sort-button" onClick={() => toggleInventorySort(column.key)}>
                      {column.header}
                      {sortKey === column.key && <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedVisibleRecords.map(record => (
                <tr key={record.id}>
                  {merchandiseTableColumns.map(column => (
                    <td key={column.key}>{column.value(record) || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedInventoryRecord && (
        <div className="merchandise-detail-backdrop" role="presentation" onClick={() => setSelectedInventoryId('')}>
          <aside
            className="merchandise-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Merchandise details"
            onClick={event => event.stopPropagation()}
          >
            <div className="merchandise-detail-header">
              <div>
                <span>Merchandise</span>
                <h2>{selectedInventoryRecord.packageName || 'Unnamed Merchandise'}</h2>
              </div>
              <button type="button" className="merchandise-detail-close" onClick={() => setSelectedInventoryId('')} aria-label="Close details">
                <Icon.Close />
              </button>
            </div>
            <div className="merchandise-detail-body">
              <div><span>Status</span><strong>{selectedInventoryRecord.status || 'Received'}</strong></div>
              <div><span>Time Here</span><strong>{selectedInventoryRecord.timeHere || 'Unknown'}</strong></div>
              <div><span>Client</span><strong>{selectedInventoryRecord.client || '-'}</strong></div>
              <div><span>Quantity</span><strong>{selectedInventoryRecord.quantity ?? 0}</strong></div>
              <div><span>{DOMAIN_TERMS.merchandiseIdentifier}</span><strong>{selectedInventoryRecord.barcodeOrIdNumber || '-'}</strong></div>
              <div><span>Storage Location</span><strong>{selectedInventoryRecord.storageLocation || '-'}</strong></div>
              <div><span>Condition</span><strong>{selectedInventoryRecord.condition || '-'}</strong></div>
              <div><span>Date Received</span><strong>{formatInventoryDate(selectedInventoryRecord.dateReceived)}</strong></div>
              <div><span>{DOMAIN_TERMS.matchedProduct}</span><strong>{selectedInventoryRecord.matchedProduct?.name || '-'}</strong></div>
              <div><span>{DOMAIN_TERMS.shipment}</span><strong>{selectedInventoryRecord.shipment?.name || '-'}</strong></div>
            </div>
            <div className="merchandise-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('merchandise-review')}>
                Open Merchandise Review
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Merchandise Review ──────────────────────────────────────────────────────
const MERCHANDISE_REVIEW_STATES = ['Needs Review', 'Waiting for Product Data', 'Validated', 'Issue'];
const MERCHANDISE_REVIEW_AGE_OPTIONS = [
  { value: '', label: 'All ages' },
  { value: '0-7', label: '0-7 days' },
  { value: '8-14', label: '8-14 days' },
  { value: '15-30', label: '15-30 days' },
  { value: '30-plus', label: 'More than 30 days' },
  { value: 'unknown', label: 'Unknown age' },
];

function reviewStateFor(record) {
  return record?.reviewState || (record?.merchStatus === 'Validated' ? 'Validated' : record?.merchStatus === 'Issue' ? 'Issue' : 'Needs Review');
}

function MerchandiseReviewPage() {
  const entries = useResource(() => api.listMerchandiseReviewEntries());
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const records = (entries.data?.records ?? []).filter(record => !record.released);
  const [selectedId, setSelectedId] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [queueState, setQueueState] = useState('Needs Review');
  const [ageFilter, setAgeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState('');
  const [validating, setValidating] = useState(false);
  const [actionName, setActionName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [waitingNote, setWaitingNote] = useState('');
  const [issueType, setIssueType] = useState('Unknown Item');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(client => [client.id, client]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const stateCounts = MERCHANDISE_REVIEW_STATES.reduce((counts, state) => {
    counts[state] = records.filter(record => reviewStateFor(record) === state).length;
    return counts;
  }, {});
  const clientOptions = [...new Set(records.map(record => record.clientIds?.[0]).filter(Boolean))]
    .map(id => ({ id, name: clientMap[id]?.name || 'Unknown client' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const locationOptions = [...new Set(records.map(record => record.locationId).filter(Boolean))]
    .map(id => ({ id, name: locationMap[id]?.name || 'Unknown location' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const queueSearchText = queueSearch.trim().toLowerCase();
  const visibleQueueRecords = records.filter(record => {
    const clientName = clientMap[record.clientIds?.[0]]?.name || '';
    const locationName = record.locationId ? locationMap[record.locationId]?.name || '' : '';
    const linkedProduct = record.linkedItem || {};
    const haystack = [
      record.productName,
      record.skuId,
      record.brand,
      record.description,
      record.notes,
      record.receipt?.name,
      clientName,
      locationName,
      linkedProduct.product,
      linkedProduct.name,
      linkedProduct.identifier,
      linkedProduct.itemJobNumber,
    ].join(' ').toLowerCase();
    return reviewStateFor(record) === queueState
      && (!queueSearchText || haystack.includes(queueSearchText))
      && (!clientFilter || record.clientIds?.[0] === clientFilter)
      && (!ageFilter || record.ageGroup === ageFilter)
      && (!locationFilter || record.locationId === locationFilter);
  });
  const selected = visibleQueueRecords.find(record => record.id === selectedId)
    || records.find(record => record.id === selectedId && reviewStateFor(record) === queueState)
    || visibleQueueRecords[0];
  const selectedClientId = selected?.clientIds?.[0] || '';
  const selectedClient = selectedClientId ? clientMap[selectedClientId] : null;
  const selectedLocation = selected?.locationId ? locationMap[selected.locationId]?.name : '';
  const selectedPhotos = recordPhotos(selected);
  const activePhoto = selectedPhotos[photoIndex] || selectedPhotos[0];
  const activePhotoUrl = receivingPhotoUrl(activePhoto);
  const linkedProduct = selected?.linkedItem || null;
  const hasLinkedProduct = Boolean(selected?.itemIds?.length || linkedProduct?.id);
  const hasBlockingIssue = Boolean(selected?.blockingIssues?.length);
  const unidentified = Boolean(selected?.isUnidentified);

  useEffect(() => {
    if (!selected) {
      setSelectedId('');
      setQuery('');
      return;
    }
    setSelectedId(selected.id);
    setQuery(selected.skuId || selected.productName || selected.description || '');
    setWaitingNote('');
    setIssueDescription(selected.productName ? `${selected.productName} needs review` : 'Merchandise issue');
    setIssueNotes('');
  }, [selected?.id, queueState]);

  useEffect(() => {
    setPhotoIndex(0);
    setPhotoZoom(1);
    setLightboxOpen(false);
  }, [selected?.id]);

  useEffect(() => {
    let active = true;
    async function loadMatches() {
      const cleaned = query.trim();
      setError('');
      if (cleaned.length < 3 || !selected) {
        setMatches([]);
        return;
      }
      setSearching(true);
      try {
        const data = await api.searchMerchandiseReviewProducts({
          q: cleaned,
          clientId: selectedClientId,
          includeItemId: selected.itemIds?.[0],
        });
        if (active) setMatches(data.records ?? []);
      } catch (err) {
        if (active) setError(err.message || 'Could not search Products.');
      } finally {
        if (active) setSearching(false);
      }
    }
    loadMatches();
    return () => { active = false; };
  }, [query, selectedClientId, selected?.id, selected?.itemIds]);

  function moveToNext(currentId = selected?.id) {
    const nextSelection = visibleQueueRecords.find(record => record.id !== currentId)?.id || '';
    setSelectedId(nextSelection);
  }

  function moveToNextNeedsReview(currentId = selected?.id) {
    const nextSelection = records.find(record => record.id !== currentId && reviewStateFor(record) === 'Needs Review')?.id || '';
    setQueueState('Needs Review');
    setSelectedId(nextSelection);
  }

  async function runAction(name, callback, successMessage, { advance = false } = {}) {
    if (!selected) return;
    setActionName(name);
    setError('');
    setNotice('');
    try {
      await callback();
      await entries.reload();
      setNotice(successMessage);
      if (advance) moveToNext(selected.id);
    } catch (err) {
      setError(err.message || 'Could not update merchandise review.');
    } finally {
      setActionName('');
    }
  }

  async function matchProduct(productId) {
    if (!selected) return;
    setMatching(productId);
    setError('');
    setNotice('');
    try {
      await api.matchMerchandiseReviewEntry(selected.id, productId);
      await entries.reload();
      setMatches([]);
      setNotice('Product match updated.');
    } catch (err) {
      setError(err.message || 'Could not match this merchandise.');
    } finally {
      setMatching('');
    }
  }

  async function validateSelected() {
    if (!selected) return;
    setValidating(true);
    await runAction(
      'validate',
      () => api.validateMerchandiseReviewEntry(selected.id, 'Validated'),
      'Merchandise validated.',
    );
    moveToNextNeedsReview(selected.id);
    setValidating(false);
  }

  const reviewActionBlockedReason = !hasLinkedProduct
    ? 'Link a Product before validating.'
    : hasBlockingIssue
      ? 'Resolve the blocking Merchandise issue before validating.'
      : reviewStateFor(selected) === 'Validated'
        ? 'This Merchandise is already validated.'
        : '';

  function reviewFact(label, value, className = '') {
    return (
      <div className={`merch-review-fact ${className}`}>
        <span>{label}</span>
        <strong>{value || '-'}</strong>
      </div>
    );
  }

  if (entries.loading) return <div className="empty-state">Loading merchandise review queue...</div>;
  if (entries.error) return <div className="error-state">{entries.error}</div>;
  if (!records.length) {
    return (
      <div className="verification-empty">
        <h2>Merchandise Review</h2>
        <p>No merchandise has been received for review.</p>
      </div>
    );
  }

  return (
    <div className={`merch-review-shell ${focusMode ? 'is-focus-mode' : ''}`}>
      <SubNav
        className="merch-review-subnav"
        value={queueState}
        onChange={setQueueState}
        items={MERCHANDISE_REVIEW_STATES.map(state => ({
          id: state,
          label: state === 'Waiting for Product Data' ? 'Waiting for Product' : state === 'Issue' ? 'Issues' : state,
          count: stateCounts[state] || 0,
        }))}
        actions={(
          <>
          {(error || notice) && <strong className={error ? 'is-error' : 'is-success'}>{error || notice}</strong>}
          <button type="button" className="btn btn-ghost" onClick={() => setFocusMode(current => !current)}>
            {focusMode ? 'Restore Panels' : 'Focus Photos'}
          </button>
          </>
        )}
      />

      <div className="merch-review-queue-filters">
        <input
          value={queueSearch}
          onChange={event => setQueueSearch(event.target.value)}
          placeholder="Search merchandise..."
          aria-label="Search merchandise"
        />
        <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} aria-label="Client">
          <option value="">All clients</option>
          {clientOptions.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}
        </select>
        <select value={locationFilter} onChange={event => setLocationFilter(event.target.value)} aria-label="Storage Location">
          <option value="">All locations</option>
          {locationOptions.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}
        </select>
        <select value={ageFilter} onChange={event => setAgeFilter(event.target.value)} aria-label="Age">
          {MERCHANDISE_REVIEW_AGE_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="merch-review-workspace">
        <aside className="merch-review-queue-panel" aria-label="Merchandise review queue">
          <div className="merch-review-queue-list">
            {visibleQueueRecords.length === 0 && (
              <div className="merch-review-empty-list">No merchandise matches these filters.</div>
            )}
            {visibleQueueRecords.map(record => {
              const client = clientMap[record.clientIds?.[0]];
              const identifier = record.skuId || record.identifier || '';
              const state = reviewStateFor(record);
              const locationName = record.locationId ? locationMap[record.locationId]?.name || '' : '';
              return (
                <button
                  type="button"
                  className={`merch-review-queue-card ${selected?.id === record.id ? 'is-active' : ''}`}
                  key={record.id}
                  onClick={() => setSelectedId(record.id)}
                >
                  <RecordThumbnail record={record} className="merch-review-queue-thumb" />
                  <span className="merch-review-queue-text">
                    <strong>{record.productName || (record.isUnidentified ? 'Unidentified Merchandise' : 'Unnamed Merchandise')}</strong>
                    <small>{identifier || 'No barcode or ID number'}</small>
                    <em>{client?.name || 'Unknown client'} - {record.timeHere || 'Unknown age'}</em>
                    <em>{locationName || 'No storage location'}</em>
                  </span>
                  <span className={`merch-review-state-dot state-${state.toLowerCase().replaceAll(' ', '-')}`} aria-label={state} />
                </button>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <>
            <main className="merch-review-inspection-panel" aria-label="Merchandise inspection">
              <div className="merch-review-identity-bar">
                <div>
                  <span>{unidentified ? 'Unidentified Merchandise' : DOMAIN_TERMS.packageName}</span>
                  <h2>{unidentified ? 'Unidentified Merchandise' : selected.productName || 'Unnamed Merchandise'}</h2>
                </div>
                <strong>{reviewStateFor(selected)}</strong>
              </div>

              <section className="merch-review-photo-stage">
                {activePhotoUrl ? (
                  <button type="button" className="merch-review-main-photo" onClick={() => setLightboxOpen(true)} style={{ '--photo-zoom': photoZoom }}>
                    <img src={activePhotoUrl} alt="" />
                  </button>
                ) : (
                  <div className="merch-review-no-photo">
                    <strong>No merchandise photos</strong>
                    <span>Receiving photos will appear here when they are attached to this Merchandise record.</span>
                  </div>
                )}
              </section>

              <div className="merch-review-photo-controls">
                <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.max(0, index - 1))} disabled={photoIndex <= 0}>Previous</button>
                <span>{selectedPhotos.length ? `${photoIndex + 1} / ${selectedPhotos.length}` : '0 photos'}</span>
                <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.min(selectedPhotos.length - 1, index + 1))} disabled={photoIndex >= selectedPhotos.length - 1}>Next</button>
                <button type="button" className="btn" onClick={() => setPhotoZoom(zoom => Math.max(1, Number((zoom - 0.2).toFixed(1))))}>-</button>
                <button type="button" className="btn" onClick={() => setPhotoZoom(zoom => Math.min(2.4, Number((zoom + 0.2).toFixed(1))))}>+</button>
              </div>

              {selectedPhotos.length > 1 && (
                <div className="merch-review-thumbnail-strip">
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

              {unidentified && (
                <div className="merch-review-note is-warning">
                  <strong>Unidentified Merchandise</strong>
                  <span>No useful Package Name or Barcode or ID Number was captured. Use photos and Shipment context to match later or raise an issue.</span>
                </div>
              )}

              <section className="merch-review-merch-details" aria-label="Merchandise details">
                {reviewFact(DOMAIN_TERMS.merchandiseIdentifier, selected.skuId)}
                {reviewFact('Client', selectedClient?.name)}
                {reviewFact(DOMAIN_TERMS.shipment, selected.receipt?.name)}
                {reviewFact('Date Received', formatInventoryDate(selected.dateReceived || selected.received))}
                {reviewFact('Time Here', selected.timeHere)}
                {reviewFact('Quantity', selected.quantity || 1)}
                {reviewFact('Storage Location', selectedLocation)}
                {reviewFact('Condition', selected.condition)}
                {reviewFact('Notes', selected.notes, 'is-wide')}
              </section>
            </main>

            <aside className="merch-review-decision-panel" aria-label="Merchandise decision workspace">
              <div className="merch-review-decision-scroll">
                <section className="merch-review-decision-section">
                  <div className="merch-review-section-heading">
                    <span>Current Product</span>
                    {hasLinkedProduct && (
                      <button type="button" className="link-btn" onClick={() => document.getElementById('merchandise-product-search')?.focus()}>
                        Change Product
                      </button>
                    )}
                  </div>
                  {linkedProduct ? (
                    <div className="merch-review-product-summary">
                      <h3>{linkedProduct.product || linkedProduct.name || 'Untitled Product'}</h3>
                      <dl>
                        <div><dt>Product Code</dt><dd>{linkedProduct.identifier || linkedProduct.productId || linkedProduct.gtinUpc || '-'}</dd></div>
                        <div><dt>Job Number</dt><dd>{linkedProduct.itemJobNumber || linkedProduct.pickupJobNumber || '-'}</dd></div>
                        <div><dt>Brand</dt><dd>{linkedProduct.brand || '-'}</dd></div>
                        <div><dt>Description</dt><dd>{linkedProduct.description || '-'}</dd></div>
                        <div><dt>Product Status</dt><dd>{linkedProduct.status || '-'}</dd></div>
                        <div><dt>Readiness</dt><dd>{linkedProduct.readiness?.ready ? 'Ready for Photo' : linkedProduct.readiness?.missing?.length ? `Missing ${linkedProduct.readiness.missing.join(', ')}` : 'Not calculated'}</dd></div>
                      </dl>
                    </div>
                  ) : (
                    <div className="merch-review-no-product">
                      <strong>No Product Matched</strong>
                      <span>Find the Product below. Do not create Products from this workspace.</span>
                    </div>
                  )}
                </section>

                <section className="merch-review-decision-section">
                  <div className="merch-review-section-heading">
                    <span>Product Search</span>
                    {searching && <em>Searching...</em>}
                  </div>
                  <input
                    id="merchandise-product-search"
                    className="merch-review-search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search name, code, barcode, or job number..."
                  />
                  <div className="merch-review-results">
                    {!searching && query.trim().length >= 3 && matches.length === 0 && (
                      <div className="merch-review-note">
                        <strong>No matching Product found.</strong>
                        <span>Mark this as Waiting for Product Data if it is identifiable but not imported yet.</span>
                      </div>
                    )}
                    {!searching && query.trim().length < 3 && (
                      <div className="merch-review-note">Enter at least 3 characters to search Products available to this client.</div>
                    )}
                    {matches.map(product => {
                      const isCurrent = selected.itemIds?.includes(product.id) || linkedProduct?.id === product.id;
                      return (
                        <button type="button" className={`merch-review-product-result ${isCurrent ? 'is-current' : ''}`} onClick={() => matchProduct(product.id)} disabled={Boolean(matching)} key={product.id}>
                          <RecordThumbnail record={product} className="merch-review-product-thumb" />
                          <span>
                            <strong>{product.product || product.name || product.identifier || 'Untitled Product'}</strong>
                            <small>{product.identifier || 'No product code'} - {product.itemJobNumber || 'No job number'}</small>
                            <small>{product.brand || 'No brand'}</small>
                          </span>
                          <em>{matching === product.id ? 'Matching...' : isCurrent ? 'Current' : hasLinkedProduct ? 'Change' : 'Match'}</em>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="merch-review-decision-section">
                  <div className="merch-review-section-heading">
                    <span>Review State</span>
                  </div>
                  <div className="merch-review-current-state">
                    <strong>{reviewStateFor(selected)}</strong>
                    <span>{hasBlockingIssue ? 'Blocked by unresolved Merchandise issue.' : hasLinkedProduct ? 'Product match is available for validation.' : 'Waiting for a Product match.'}</span>
                  </div>
                  {hasBlockingIssue && (
                    <div className="merch-review-note is-warning">
                      <strong>Blocking issue</strong>
                      <span>Resolve the linked Merchandise issue before validating this record.</span>
                    </div>
                  )}
                </section>

                <details className="merch-review-secondary-detail">
                  <summary>Waiting for Product Data</summary>
                  <small>Use this when the merchandise is identifiable but the Product is not imported yet.</small>
                  <textarea value={waitingNote} onChange={event => setWaitingNote(event.target.value)} placeholder="Optional note" />
                </details>

                <details className="merch-review-secondary-detail">
                  <summary>Raise Issue</summary>
                  <small>Creates an existing Issue record and records R2 image references as context.</small>
                  <select value={issueType} onChange={event => setIssueType(event.target.value)}>
                    <option value="Unknown Item">Unidentified Merchandise</option>
                    <option>Damaged</option>
                    <option>Wrong Merch</option>
                    <option>Missing Merch</option>
                    <option>Other</option>
                  </select>
                  <input value={issueDescription} onChange={event => setIssueDescription(event.target.value)} placeholder="Short description" />
                  <textarea value={issueNotes} onChange={event => setIssueNotes(event.target.value)} placeholder="Notes" />
                </details>
              </div>

              <div className="merch-review-action-bar">
                {reviewActionBlockedReason && <span>{reviewActionBlockedReason}</span>}
                <button type="button" className="btn btn-primary" onClick={validateSelected} disabled={validating || Boolean(reviewActionBlockedReason)}>
                  {actionName === 'validate' ? 'Validating...' : 'Validate Merchandise'}
                </button>
                <div className="merch-review-secondary-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => runAction('waiting', () => api.markMerchandiseWaitingForProductData(selected.id, { note: waitingNote }), 'Marked as Waiting for Product Data.', { advance: true })} disabled={Boolean(actionName)}>
                    {actionName === 'waiting' ? 'Saving...' : 'Mark Waiting'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => runAction('issue', () => api.createMerchandiseReviewIssue(selected.id, { type: issueType, description: issueDescription, notes: issueNotes }), 'Issue raised.', { advance: true })} disabled={Boolean(actionName) || !issueDescription.trim()}>
                    {actionName === 'issue' ? 'Raising...' : 'Raise Issue'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => runAction('remove-match', () => api.removeMerchandiseReviewMatch(selected.id), 'Product match removed.')} disabled={!hasLinkedProduct || Boolean(actionName)}>
                    Remove Match
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => moveToNext()} disabled={visibleQueueRecords.length <= 1}>
                    Skip for Now
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : (
          <section className="merch-review-empty-selection">
            Select merchandise to review.
          </section>
        )}
      </div>

      {lightboxOpen && activePhotoUrl && (
        <div className="merch-review-lightbox" role="dialog" aria-modal="true" aria-label="Merchandise photo preview" onClick={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)}>Close</button>
          <img src={activePhotoUrl} alt="" />
        </div>
      )}
    </div>
  );
}

// ── Experimental Work ──────────────────────────────────────
const MERCH_REVIEW_V2_STORAGE_KEY = 'marks:work-board-board';
const MERCH_REVIEW_V2_ARTWORK_KEY = 'marks:work-board-artwork-overrides';
const MERCH_REVIEW_V2_DECISIONS_KEY = 'marks:work-board-workstream-decisions';
const MERCH_REVIEW_V2_LEGACY_DECISIONS_KEY = 'marks:work-board-production-decisions';
const PM_QUEUE_STORAGE_KEY = 'marks:planning-board-queues';
const PM_CONVERSATION_STORAGE_KEY = 'marks:planning-board-conversations';
const PM_ACTIVITY_STORAGE_KEY = 'marks:planning-board-activity';
const PM_COMMENT_READ_STORAGE_KEY = 'marks:planning-board-comment-reads';
const PM_LOCAL_QUEUE_IDS = {
  planning: GATE_IDS.waitingActivation,
};
const PM_QUEUE_COLUMNS = [
  { id: GATE_IDS.newReview, label: 'New', description: 'New merchandise for PM pickup.' },
  { id: PM_LOCAL_QUEUE_IDS.planning, label: 'Planning', description: 'Active PM planning work.' },
  { id: GATE_IDS.waitingInformation, label: 'Waiting', description: 'Waiting on answers, files, or decisions.' },
  { id: GATE_IDS.readyProduction, label: 'Ready for Photo', description: 'Shared handoff queue for Production.' },
];

function loadJsonMap(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveJsonMap(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function localNowIso() {
  return new Date().toISOString();
}

function pmCommentUserDisplayName(user) {
  return user?.displayName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Team';
}

function normalizeWorkstreamSelection(decision = {}, fallbackWorkstream = '') {
  const selected = [
    ...(Array.isArray(decision.workstreamIds) ? decision.workstreamIds : []),
    ...(Array.isArray(decision.productionPaths) ? decision.productionPaths : []),
    decision.primaryWorkstream,
    decision.workstream,
    fallbackWorkstream,
  ]
    .map(value => workstreamFromLegacyValue(value) || value)
    .filter(Boolean);
  return selected.filter((value, index, list) => list.indexOf(value) === index);
}

function intakeRequestedGateForRecord(record) {
  const deliverables = deliverablesForRecord(record);
  if (deliverables.length === 1 && deliverables[0] === 'Thr3d') return GATE_IDS.sendThr3d;
  if (record?.intakeStatus === 'Waiting on Information') return GATE_IDS.waitingInformation;
  if (record?.intakeStatus === 'Ready to Release') return GATE_IDS.readyProduction;
  if (record?.intakeStatus === 'Needs Review') return GATE_IDS.newReview;
  const reviewState = reviewStateFor(record);
  if (reviewState === 'Validated') return GATE_IDS.readyProduction;
  if (record?.merchStatus === 'Matched') return GATE_IDS.waitingActivation;
  return GATE_IDS.newReview;
}

function deliverableWorkstreamLabel(deliverable) {
  const workstreamId = DELIVERABLE_WORKSTREAM_MAP[normalizeDeliverableValue(deliverable)];
  return workstreamId ? workstreamLabel(workstreamId) : '';
}

const DELIVERABLE_ALIASES = {
  packaging: 'Packaging Photo',
  'packaging photo': 'Packaging Photo',
  'packaging photography': 'Packaging Photo',
  ecomm: 'Ecomm Photo',
  'ecomm photo': 'Ecomm Photo',
  ecommerce: 'Ecomm Photo',
  'ecommerce photo': 'Ecomm Photo',
  'ecommerce photography': 'Ecomm Photo',
  'gs1 ecomm': 'Ecomm Photo',
  thr3d: 'Thr3d',
  '3d': 'Thr3d',
  thread: 'Thr3d',
};

function stripSurroundingQuotes(value) {
  let text = String(value ?? '').trim();
  while (text.length >= 2 && text[0] === text[text.length - 1] && ['"', "'"].includes(text[0])) {
    text = text.slice(1, -1).trim();
  }
  if (text && [...text].every(character => ['"', "'"].includes(character))) return '';
  return text;
}

function flattenDeliverableValues(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(flattenDeliverableValues);
  if (typeof value === 'object') {
    return flattenDeliverableValues(value.name || value.label || value.value || '');
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('"') && text.endsWith('"'))) {
      try {
        const parsed = JSON.parse(text);
        if (parsed !== text) return flattenDeliverableValues(parsed);
      } catch {
        // Fall through to quote stripping.
      }
    }
    if (text.includes(',')) return text.split(',').flatMap(flattenDeliverableValues);
    return [stripSurroundingQuotes(text)];
  }
  return [stripSurroundingQuotes(value)];
}

function normalizeDeliverableValue(value) {
  const text = stripSurroundingQuotes(value);
  return DELIVERABLE_ALIASES[text.toLowerCase()] || text;
}

function normalizeDeliverableList(value) {
  const normalized = flattenDeliverableValues(value)
    .map(normalizeDeliverableValue)
    .filter(value => INTAKE_DELIVERABLE_OPTIONS.includes(value));
  return normalized.filter((item, index, list) => list.indexOf(item) === index);
}

function deliverableListsEqual(left = [], right = []) {
  const normalizedLeft = normalizeDeliverableList(left);
  const normalizedRight = normalizeDeliverableList(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function deliverablesSaveErrorMessage(error) {
  if (import.meta.env.PROD) return 'Could not save Deliverables. Try again.';
  const detail = error?.status
    ? `HTTP ${error.status}${error.message ? `: ${error.message}` : ''}`
    : (error?.message || 'Unknown error');
  return `Could not save Deliverables. ${detail}`;
}

function deliverablesForRecord(record = {}) {
  const deliverables = normalizeDeliverableList(record.deliverables);
  if (deliverables.length) return deliverables;
  return [];
}

function isThr3dOnlyDeliverables(deliverables = []) {
  const normalized = normalizeDeliverableList(deliverables);
  return normalized.length === 1 && normalized[0] === 'Thr3d';
}

function visibleRequirementBlockers(requirements = []) {
  return requirements.filter(requirement => requirement.visible !== false && !requirement.satisfied);
}

function requirementLabelForUser(requirement = {}) {
  const label = requirementBlockerLabel(requirement);
  return {
    'Product Information': 'Product not identified',
    'Required Identifier': 'Package ID / Barcode / SKU',
    'Merchandise Verified': 'Verify merchandise',
    'Activation Information': 'Missing campaign or activation information',
  }[label] || label;
}

function wizardStateForItem(item, draftDeliverables) {
  const record = item?.record || {};
  const product = record.linkedItem || {};
  const deliverables = normalizeDeliverableList(draftDeliverables ?? record.deliverables);
  const requirements = deliverableListsEqual(deliverables, record.deliverables)
    ? item?.readiness || []
    : evaluateMerchandiseReviewRequirements({ ...record, deliverables });
  const blockers = visibleRequirementBlockers(requirements);
  const productLinked = Boolean(product.id || record.itemIds?.length);
  const merchandiseVerified = Boolean(record.merchandiseVerified) && record.reviewState !== 'Issue' && record.merchStatus !== 'Issue';
  const missingLabels = blockers.map(requirementLabelForUser);
  return {
    merchandiseVerified,
    productLinked,
    deliverables,
    blockers,
    missingLabels,
    thr3dOnly: isThr3dOnlyDeliverables(deliverables),
    photoDeliverables: deliverables.filter(value => value === 'Packaging Photo' || value === 'Ecomm Photo'),
  };
}

function deliverableToneClass(value) {
  return {
    'Packaging Photo': 'is-packaging-photo',
    'Ecomm Photo': 'is-ecomm-photo',
    Thr3d: 'is-thr3d',
  }[normalizeDeliverableValue(value)] || 'is-neutral';
}

function DeliverableBadges({ values = [] }) {
  const deliverables = normalizeDeliverableList(values);
  if (!deliverables.length) return null;
  return (
    <div className="deliverable-badge-row" aria-label="Deliverables">
      {deliverables.map(deliverable => (
        <span className={`deliverable-badge ${deliverableToneClass(deliverable)}`} key={deliverable}>
          {deliverable}
        </span>
      ))}
    </div>
  );
}

function ReadinessIndicators({ items }) {
  const visibleItems = (items || []).filter(item => item.visible !== false && item.tone !== 'neutral');
  if (!visibleItems.length) return null;
  const doneCount = visibleItems.filter(item => item.satisfied).length;
  return (
    <div className="readiness-indicators" aria-label={`${doneCount} of ${visibleItems.length} steps complete`}>
      {visibleItems.map(item => (
        <span
          key={item.key}
          className={`readiness-dot ${item.satisfied ? 'is-done' : 'is-todo'}`}
          title={`${item.label}: ${item.satisfied ? 'Complete' : (item.detail || 'Not done')}`}
        />
      ))}
    </div>
  );
}

function requiredToShootSummary(item) {
  const requirements = (item.readiness || []).filter(requirement => requirement.visible !== false && requirement.tone !== 'neutral');
  const complete = requirements.filter(requirement => requirement.satisfied).length;
  const total = requirements.length;
  const missing = requirements.filter(requirement => !requirement.satisfied).map(requirementLabelForUser);
  return {
    complete,
    total,
    missing,
    label: total ? `${complete} / ${total}` : 'Not set',
  };
}

function compactRequirementKey(label = '') {
  if (/product|identifier|barcode|sku/i.test(label)) return 'Product';
  if (/deliverable/i.test(label)) return 'Deliverables';
  if (/artwork/i.test(label)) return 'Artwork';
  if (/activation|campaign|client/i.test(label)) return 'Client Req';
  if (/merchandise|verify/i.test(label)) return 'Merch';
  return label.split(/\s+/).slice(0, 2).join(' ');
}

function RequiredToShootPreview({ item, ready }) {
  const requirements = (item.readiness || [])
    .filter(requirement => requirement.visible !== false && requirement.tone !== 'neutral')
    .slice(0, 4);
  if (!requirements.length) return (
    <div className="kanban-required-checks is-empty">
      <span>Required to Shoot</span>
      <strong>Not set</strong>
    </div>
  );
  return (
    <div className={`kanban-required-checks ${ready ? 'is-ready' : ''}`} aria-label="Required to Shoot">
      {requirements.map(requirement => (
        <span className={requirement.satisfied ? 'is-complete' : 'is-missing'} key={requirement.key}>
          <i aria-hidden="true">{requirement.satisfied ? '✓' : '×'}</i>
          {compactRequirementKey(requirementLabelForUser(requirement))}
        </span>
      ))}
    </div>
  );
}

function ageBucketForItem(item) {
  const days = Number(item.record?.daysInHouse ?? item.record?.daysHere ?? item.record?.ageDays ?? 0);
  const label = item.timeHere || (days ? `${days}d` : '—');
  if (days >= 14 || /\b(1[4-9]|[2-9][0-9])d\b/i.test(label)) return { label, tone: 'old' };
  if (days >= 7 || /\b([7-9]|1[0-3])d\b/i.test(label)) return { label, tone: 'aging' };
  return { label, tone: 'fresh' };
}

function KanbanCardComponent({ item, selected, onSelect }) {
  const blockers = visibleRequirementBlockers(item.readiness || []);
  const flagged = item.issueBadge === 'Issue';
  const validated = !flagged && item.statusBadge === 'Validated';
  const ready = !flagged && blockers.length === 0;
  const required = requiredToShootSummary(item);
  const age = ageBucketForItem(item);
  const status = flagged ? 'flag' : ready ? 'ready' : 'todo';
  const statusLabel = flagged
    ? 'Flagged'
    : ready
      ? 'Required to Shoot complete'
      : `${blockers.length} still needed`;
  const quantity = item.record?.quantity || 1;
  return (
    <button
      type="button"
      className={`kanban-card status-${status} ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect?.(item.id)}
      draggable
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      aria-label={`Open ${item.title}${flagged ? ' (flagged)' : ''}`}
    >
      <div className="kanban-card-media">
        <RecordThumbnail record={item.record} />
        {flagged && <span className="kanban-card-flag" aria-label="Flagged for an issue">⚑ Flagged</span>}
        {validated && <span className="kanban-card-validated">✓ Validated</span>}
        <ReadinessIndicators items={item.readiness} />
      </div>
      <div className="kanban-card-body">
        <h3>{item.title}</h3>
        <p className="kanban-card-meta">
          <span>{item.client || 'Unknown client'}</span>
          <span>Qty {quantity}</span>
        </p>
        {item.deliverables?.length ? <DeliverableBadges values={item.deliverables} /> : (item.workstream && <strong className="kanban-card-workstream">{item.workstream}</strong>)}
        <RequiredToShootPreview item={item} ready={ready} />
        <div className="kanban-card-footer">
          <span className={`kanban-status-chip is-${status}`}>{statusLabel}</span>
          <span className="kanban-card-signals">
            <span className={`kanban-age-badge is-${age.tone}`} aria-label={`Age ${age.label}`}>{age.label}</span>
            <span className={`kanban-comment-signal ${item.unreadComments > 0 ? 'has-unread' : ''}`} aria-label={`${item.commentCount || 0} comments${item.unreadComments > 0 ? `, ${item.unreadComments} new` : ''}`}>
              {item.unreadComments > 0 && <span className="kanban-unread-dot" aria-hidden="true" />}
              <span aria-hidden="true">💬</span>
              {item.commentCount || 0}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

const KanbanCard = memo(KanbanCardComponent);

function KanbanColumn({ column, items, selectedId, onSelect, onMove }) {
  const [dragState, setDragState] = useState('');
  const title = column.label || column.displayName || column.title || column.name;
  const missingArtwork = items.filter(item => requiredToShootSummary(item).missing.some(label => /artwork/i.test(label))).length;
  const withComments = items.filter(item => item.commentCount > 0).length;
  return (
    <section
      className={`kanban-column ${dragState ? `is-${dragState}` : ''}`}
      aria-label={title}
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragState('drag-target');
      }}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragState('');
      }}
      onDrop={event => {
        event.preventDefault();
        setDragState('');
        const itemId = event.dataTransfer.getData('text/plain');
        if (itemId) onMove?.(itemId, column.id);
      }}
    >
      <header className="kanban-column-header">
        <div>
          <h2>{title}</h2>
          <p title={column.description}>{column.description}</p>
          <div className="kanban-column-summary">
            <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
            {missingArtwork > 0 && <span>{missingArtwork} missing artwork</span>}
            {withComments > 0 && <span>{withComments} with comments</span>}
          </div>
        </div>
      </header>
      <div className="kanban-column-list">
        {items.length === 0 && <div className="kanban-empty">No cards in this queue.</div>}
        {items.map(item => (
          <KanbanCard item={item} key={item.id} selected={selectedId === item.id} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function KanbanBoard({ columns, itemsByColumn, selectedId, onSelect, onMove }) {
  return (
    <div className="kanban-board" role="list" aria-label="Planning Board">
      {columns.map(column => (
        <KanbanColumn
          column={column}
          items={itemsByColumn[column.id] || []}
          key={column.id}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

function workflowSearchHaystack(item) {
  const record = item.record || {};
  const product = record.linkedItem || {};
  return [
    item.title,
    item.client,
    item.identifier,
    item.location,
    record.productName,
    record.skuId,
    record.brand,
    record.description,
    record.notes,
    record.receipt?.name,
    product.product,
    product.name,
    product.identifier,
    product.itemJobNumber,
  ].join(' ').toLowerCase();
}

function workflowSectionTitle(section) {
  return {
    [WORKSPACE_SECTIONS.merchandiseObservations]: 'Merchandise Observations',
    [WORKSPACE_SECTIONS.photos]: 'Photos',
    [WORKSPACE_SECTIONS.productIdentification]: 'Product Identification',
    [WORKSPACE_SECTIONS.productIdentificationSummary]: 'Product Identification',
    [WORKSPACE_SECTIONS.workstream]: 'Workstream',
    [WORKSPACE_SECTIONS.missingInformation]: 'Missing Information',
    [WORKSPACE_SECTIONS.artwork]: 'Artwork',
    [WORKSPACE_SECTIONS.artworkSummary]: 'Artwork',
    [WORKSPACE_SECTIONS.activation]: 'Activation',
    [WORKSPACE_SECTIONS.notes]: 'Notes',
    [WORKSPACE_SECTIONS.thr3dRouting]: 'THR3D Routing',
    [WORKSPACE_SECTIONS.shipment]: 'Shipment',
    [WORKSPACE_SECTIONS.issues]: 'Issues',
    [WORKSPACE_SECTIONS.history]: 'History',
    [WORKSPACE_SECTIONS.readinessSummary]: 'Required Information',
    [WORKSPACE_SECTIONS.merchandiseSummary]: 'Merchandise',
    [WORKSPACE_SECTIONS.productSummary]: 'Product',
  }[section] || section;
}

function WorkflowFact({ label, value }) {
  return <div><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function productionReadinessForItem(item = {}) {
  const readiness = item.record?.productionReadiness;
  if (readiness?.requirements) return readiness;
  return {
    ready: false,
    complete: false,
    completeCount: 0,
    totalCount: 5,
    summary: '0 of 5 Complete',
    missing: ['Product Linked', 'Product Name', 'Identifier', 'Deliverables', 'Merchandise Resolution'],
    requirements: [
      { key: 'product-linked', label: 'Product Linked', ready: false, missing: 'Link a Product.' },
      { key: 'product-name', label: 'Product Name', ready: false, missing: 'Add Product Name.' },
      { key: 'identifier', label: 'Identifier', ready: false, missing: 'Add the Product Identifier.' },
      { key: 'deliverables', label: 'Deliverables', ready: false, missing: 'Select at least one Deliverable.' },
      { key: 'merchandise-resolution', label: 'Merchandise Resolution', ready: false, missing: 'Select Merchandise Resolution.' },
    ],
  };
}

function ProductionReadinessPanel({ item }) {
  const readiness = productionReadinessForItem(item);
  const requirements = readiness.ready
    ? readiness.requirements
    : readiness.requirements.filter(requirement => !requirement.ready);
  return (
    <section className={`production-readiness-panel ${readiness.ready ? 'is-ready' : 'is-incomplete'}`}>
      <div className="production-readiness-header">
        <h3>Required Information</h3>
        <strong>{readiness.summary}</strong>
      </div>
      {readiness.ready ? (
        <p>Required information is complete.</p>
      ) : (
        <p>Still needed</p>
      )}
      <ul className="production-readiness-list">
        {requirements.map(requirement => (
          <li key={requirement.key} className={requirement.ready ? 'is-ready' : 'is-missing'}>
            <span aria-hidden="true">{requirement.ready ? '✓' : '×'}</span>
            <strong>{requirement.label}</strong>
            {!requirement.ready && <em>{requirement.missing || requirement.detail}</em>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReleaseToProductionAction({ item, onRelease, busy }) {
  const readiness = productionReadinessForItem(item);
  const released = Boolean(item.record?.released);
  const disabled = released || busy || !readiness.ready;
  return (
    <div className="release-to-production-action">
      <button type="button" className="btn btn-primary" onClick={() => onRelease?.(item)} disabled={disabled}>
        {busy ? 'Releasing...' : released ? 'Released to Production' : 'Release to Production'}
      </button>
      {!released && !readiness.ready && <span>Complete all readiness requirements.</span>}
      {released && <span>Released {formatInventoryDate(item.record?.releasedAt)}</span>}
    </div>
  );
}

function WorkflowWorkspaceSection({ section, item, photos, activePhotoUrl, photoIndex, setPhotoIndex, override }) {
  const record = item.record || {};
  const product = record.linkedItem || {};
  const blockers = item.readiness.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  return (
    <section className="workflow-workspace-section">
      <h3>{workflowSectionTitle(section)}</h3>
      {section === WORKSPACE_SECTIONS.photos && (
        <div className="workflow-photo-section">
          {activePhotoUrl ? <img src={activePhotoUrl} alt="" /> : <div className="workflow-empty-inline">No R2-backed photos available.</div>}
          {photos.length > 1 && (
            <div className="workflow-thumbnail-row">
              {photos.map((photo, index) => {
                const url = receivingPhotoUrl(photo);
                return url ? <button type="button" className={photoIndex === index ? 'is-active' : ''} onClick={() => setPhotoIndex(index)} key={`${url}-${index}`}><img src={url} alt="" /></button> : null;
              })}
            </div>
          )}
        </div>
      )}
      {section === WORKSPACE_SECTIONS.merchandiseObservations && (
        <div className="workflow-fact-grid">
          <WorkflowFact label={DOMAIN_TERMS.packageName} value={record.productName} />
          <WorkflowFact label={DOMAIN_TERMS.merchandiseIdentifier} value={record.skuId} />
          <WorkflowFact label="Quantity" value={record.quantity || 1} />
          <WorkflowFact label="Condition" value={record.condition} />
          <WorkflowFact label="Storage" value={item.location} />
          <WorkflowFact label="Notes" value={record.notes} />
        </div>
      )}
      {section === WORKSPACE_SECTIONS.merchandiseSummary && (
        <>
          <div className="workflow-fact-grid">
            <WorkflowFact label={DOMAIN_TERMS.packageName} value={record.productName} />
            <WorkflowFact label="Client" value={item.client} />
            <WorkflowFact label="Current Stage" value={item.workOrder.currentGateName} />
            <WorkflowFact label="Status" value={record.merchStatus || record.reviewState} />
            <WorkflowFact label="Time Here" value={item.timeHere} />
            <WorkflowFact label="Storage" value={item.location} />
            <WorkflowFact label="Merchandise Resolution" value={record.merchandiseResolution} />
          </div>
        </>
      )}
      {[WORKSPACE_SECTIONS.productIdentification, WORKSPACE_SECTIONS.productIdentificationSummary, WORKSPACE_SECTIONS.productSummary].includes(section) && (
        product?.id || record.itemIds?.length ? (
          <div className="workflow-fact-grid">
            <WorkflowFact label="Product" value={product.product || product.name} />
            <WorkflowFact label="Identifier" value={product.identifier || product.productId || product.gtinUpc} />
            <WorkflowFact label="Brand" value={product.brand} />
            <WorkflowFact label="Job Number" value={product.itemJobNumber || product.pickupJobNumber} />
            <WorkflowFact label="Readiness" value={product.readiness?.ready ? 'Ready' : product.readiness?.missing?.join(', ') || 'Pending'} />
          </div>
        ) : <div className="workflow-empty-inline">No Product is linked yet. Product information remains a readiness blocker.</div>
      )}
      {section === WORKSPACE_SECTIONS.workstream && (
        <div className="workflow-empty-inline">{item.workstream || product.workstream || product.output || 'Workstream has not been captured in the current data.'}</div>
      )}
      {section === WORKSPACE_SECTIONS.missingInformation && (
        <ul className="workflow-requirement-list">
          {(blockers.length ? blockers : item.readiness.filter(requirement => requirement.visible !== false)).map(requirement => (
            <li key={requirement.key}><strong>{requirement.label}</strong><span>{requirement.detail}</span></li>
          ))}
        </ul>
      )}
      {[WORKSPACE_SECTIONS.artwork, WORKSPACE_SECTIONS.artworkSummary].includes(section) && (
        <div className="workflow-empty-inline">{item.readiness.find(requirement => requirement.key === 'artwork')?.detail || 'Artwork state is pending.'}{override ? ` Override reason: ${override.reason}` : ''}</div>
      )}
      {section === WORKSPACE_SECTIONS.activation && (
        <div className="workflow-empty-inline">{item.readiness.find(requirement => requirement.key === 'activation-information')?.detail || 'Activation information is pending.'}</div>
      )}
      {section === WORKSPACE_SECTIONS.thr3dRouting && (
        <div className="workflow-empty-inline">This gate marks Merchandise for the THR3D branch. Full THR3D handoff actions are deferred.</div>
      )}
      {section === WORKSPACE_SECTIONS.shipment && (
        <div className="workflow-fact-grid">
          <WorkflowFact label={DOMAIN_TERMS.shipment} value={record.receipt?.name} />
          <WorkflowFact label="Received" value={formatInventoryDate(record.dateReceived || record.received)} />
          <WorkflowFact label="Time Here" value={item.timeHere} />
        </div>
      )}
      {section === WORKSPACE_SECTIONS.issues && (
        record.blockingIssues?.length ? (
          <ul className="workflow-requirement-list">
            {record.blockingIssues.map(issue => <li key={issue.id || issue.description}><strong>{issue.type || 'Issue'}</strong><span>{issue.description || issue.notes || 'Blocking issue'}</span></li>)}
          </ul>
        ) : <div className="workflow-empty-inline">No blocking Merchandise issues are attached.</div>
      )}
      {section === WORKSPACE_SECTIONS.readinessSummary && (
        <ProductionReadinessPanel item={item} />
      )}
      {section === WORKSPACE_SECTIONS.history && (
        <div className="workflow-empty-inline">History will appear here when durable workflow events are available.</div>
      )}
    </section>
  );
}

function readinessToneLabel(requirement = {}) {
  if (requirement.visible === false) return 'Not applicable';
  if (requirement.tone === 'green') return 'Green';
  if (requirement.tone === 'orange') return 'Orange';
  if (requirement.tone === 'red') return 'Red';
  return requirement.status || 'Pending';
}

function readinessMissingFields(requirement = {}) {
  if (requirement.satisfied || requirement.visible === false) return [];
  return String(requirement.detail || requirement.label || 'Required information')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function readinessResolution(requirement = {}) {
  if (requirement.satisfied || requirement.visible === false) return 'No action needed.';
  if (requirement.key === 'product-information') return 'Link an existing Product or complete the missing Product fields.';
  if (requirement.key === 'artwork') return 'Confirm artwork availability on the linked Product or client source.';
  if (requirement.key === 'activation-information') return 'Add the existing activation, campaign, or reporting reference information.';
  return 'Resolve the missing readiness information.';
}

function requirementBlockerLabel(requirement = {}) {
  const missing = readinessMissingFields(requirement);
  if (missing.length === 1 && missing[0] !== requirement.label) return missing[0];
  return requirement.label || 'Missing information';
}

function productInformationFields(product = {}, record = {}) {
  return {
    name: product.name || record.productName || '',
    product: product.product || record.productName || '',
    productId: product.identifier || product.productId || product.gtinUpc || record.skuId || '',
    brand: product.brand || record.brand || '',
    description: product.description || record.description || '',
    itemJobNumber: product.itemJobNumber || '',
    pickupJobNumber: product.pickupJobNumber || '',
  };
}

function referenceDataValue(product = {}, labels = []) {
  const source = product.referenceData || {};
  const lowered = Object.fromEntries(Object.entries(source).map(([key, value]) => [String(key).toLowerCase(), value]));
  for (const label of labels) {
    const direct = source[label];
    if (direct) return direct;
    const lower = lowered[String(label).toLowerCase()];
    if (lower) return lower;
  }
  return '';
}

function WaitingInformationWorkspace({ item, onClose, onMove, onSave, onSaveContinue, onRelease, releaseBusy, onRefresh, feedback, photos, photoIndex, setPhotoIndex, nextItem }) {
  const record = item.record || {};
  const product = record.linkedItem || {};
  const activePhotoUrl = receivingPhotoUrl(photos[photoIndex] || photos[0]);
  const blockers = item.readiness.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  const [productQuery, setProductQuery] = useState(product.identifier || record.skuId || record.productName || '');
  const [productMatches, setProductMatches] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [localFeedback, setLocalFeedback] = useState('');
  const [productDraft, setProductDraft] = useState(() => productInformationFields(product, record));
  const [intakeDraft, setIntakeDraft] = useState(() => ({
    deliverables: deliverablesForRecord(record),
    merchandiseResolution: record.merchandiseResolution || '',
  }));
  const [lastSavedDeliverables, setLastSavedDeliverables] = useState(() => deliverablesForRecord(record));
  const [intakeSaving, setIntakeSaving] = useState('');
  const intakeSaveInFlight = useRef(false);
  const [deliverablesError, setDeliverablesError] = useState('');

  useEffect(() => {
    setProductQuery(product.identifier || record.skuId || record.productName || '');
    setProductDraft(productInformationFields(product, record));
    setIntakeDraft({
      deliverables: deliverablesForRecord(record),
      merchandiseResolution: record.merchandiseResolution || '',
    });
    setLastSavedDeliverables(deliverablesForRecord(record));
    setDeliverablesError('');
    setProductMatches([]);
    setLocalFeedback('');
  }, [item.id]);

  useEffect(() => {
    let active = true;
    const cleaned = productQuery.trim();
    if (cleaned.length < 3) {
      setProductMatches([]);
      return () => { active = false; };
    }
    setSearchingProducts(true);
    api.searchMerchandiseReviewProducts({
      q: cleaned,
      clientId: record.clientIds?.[0],
      includeItemId: record.itemIds?.[0],
    }).then(data => {
      if (active) setProductMatches(data.records ?? []);
    }).catch(error => {
      if (active) setLocalFeedback(error.message || 'Could not search Products.');
    }).finally(() => {
      if (active) setSearchingProducts(false);
    });
    return () => { active = false; };
  }, [productQuery, item.id]);

  async function linkProduct(productId) {
    setProductSaving(true);
    setLocalFeedback('');
    try {
      await api.matchMerchandiseReviewEntry(item.merchandiseId, productId);
      await onRefresh?.();
      setLocalFeedback('Product linked.');
    } catch (error) {
      setLocalFeedback(error.message || 'Could not link Product.');
    } finally {
      setProductSaving(false);
    }
  }

  async function saveProductInformation() {
    setProductSaving(true);
    setLocalFeedback('');
    try {
      if (product.id) {
        await api.updateItem(product.id, productDraft);
        setLocalFeedback('Product information saved.');
      } else {
        if (!productDraft.productId) {
          setLocalFeedback('Cannot create an incomplete Product until an identifier is available.');
          return;
        }
        const created = await api.createItem({
          ...productDraft,
          clientId: record.clientIds?.[0],
          codeType: product.codeType || record.codeType,
          identifierLabel: product.identifierLabel || 'Identifier',
        });
        await api.matchMerchandiseReviewEntry(item.merchandiseId, created.id);
        setLocalFeedback('Incomplete Product created and linked.');
      }
      await onRefresh?.();
    } catch (error) {
      setLocalFeedback(error.message || 'Could not save Product information.');
    } finally {
      setProductSaving(false);
    }
  }

  function updateProductDraft(field, value) {
    setProductDraft(draft => ({ ...draft, [field]: value }));
  }

  async function saveIntakeDecision(field, value) {
    if (intakeSaveInFlight.current) return;
    intakeSaveInFlight.current = true;
    const previousDraft = intakeDraft;
    const cleanValue = field === 'deliverables' ? normalizeDeliverableList(value) : value;
    const nextDraft = { ...intakeDraft, [field]: cleanValue };
    if (field === 'deliverables' && cleanValue.includes('Thr3d') && !nextDraft.merchandiseResolution) {
      nextDraft.merchandiseResolution = 'Ship to Kentucky';
    }
    setIntakeDraft(nextDraft);
    setIntakeSaving(field);
    setLocalFeedback('');
    if (field === 'deliverables') setDeliverablesError('');
    try {
      const payload = field === 'deliverables'
        ? { deliverables: cleanValue }
        : { merchandiseResolution: value };
      const updated = await api.updateMerchandiseIntakeDecisions(item.merchandiseId, payload);
      const updatedDeliverables = deliverablesForRecord(updated);
      setIntakeDraft({
        deliverables: updatedDeliverables,
        merchandiseResolution: updated.merchandiseResolution || '',
      });
      if (field === 'deliverables') {
        setLastSavedDeliverables(updatedDeliverables);
        setDeliverablesError('');
      }
      await onRefresh?.();
      setLocalFeedback('Planning decision saved.');
    } catch (error) {
      if (field === 'deliverables') {
        setDeliverablesError(deliverablesSaveErrorMessage(error));
      } else {
        setIntakeDraft(previousDraft);
        setLocalFeedback(error.message || 'Could not save Planning decision.');
      }
    } finally {
      intakeSaveInFlight.current = false;
      setIntakeSaving('');
    }
  }

  function stageDeliverables(value) {
    const cleanValue = normalizeDeliverableList(value);
    setIntakeDraft(draft => {
      const nextDraft = { ...draft, deliverables: cleanValue };
      if (cleanValue.includes('Thr3d') && !nextDraft.merchandiseResolution) {
        nextDraft.merchandiseResolution = 'Ship to Kentucky';
      }
      return nextDraft;
    });
  }

  const deliverablesDirty = !deliverableListsEqual(intakeDraft.deliverables, lastSavedDeliverables);

  return (
    <div className="workflow-workspace-backdrop" onClick={onClose} role="presentation">
      <aside className="workflow-workspace-drawer waiting-info-drawer" role="dialog" aria-modal="true" aria-label="Waiting for Information workspace" onClick={event => event.stopPropagation()}>
        <header className="workflow-workspace-header">
          <div>
            <span>{item.workstream || item.workOrder.workflowName}</span>
            <h2>{item.title}</h2>
            <p>{[item.client, item.workOrder.currentGateName].filter(Boolean).join(' • ')}</p>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close workflow workspace">
            <Icon.Close />
          </button>
        </header>

        <div className="workflow-workspace-summary">
          <WorkflowFact label="Workstream" value={item.workstream || item.workOrder.workflowName} />
          <WorkflowFact label="Merchandise" value={record.productName || item.title} />
          <WorkflowFact label="Client" value={item.client} />
          <WorkflowFact label="Current Stage" value={item.workOrder.currentGateName} />
          <WorkflowFact label="Current Readiness" value={blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}` : 'Ready'} />
          <WorkflowFact label="Linked Product" value={product.id ? (product.product || product.name || product.identifier) : 'Not linked'} />
        </div>

        <div className="workflow-workspace-scroll">
          <section className="workflow-workspace-section waiting-info-missing">
            <h3>Missing Information</h3>
            {blockers.length ? (
              <ul className="workflow-requirement-list">
                {blockers.map(requirement => (
                  <li key={requirement.key} className={`is-${requirement.tone}`}>
                    <strong>{requirementBlockerLabel(requirement)}</strong>
                    <span>{readinessResolution(requirement)} {requirement.detail ? `Blocking reason: ${requirement.detail}.` : ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="workflow-empty-inline">No unresolved requirements. This Work Order can move when the PM confirms the next stage.</div>
            )}
          </section>

          <section className="workflow-workspace-section">
            <h3>Product</h3>
            <div className="waiting-product-search">
              <label>
                Search Product
                <input value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="Search by product, brand, or identifier" />
              </label>
              {searchingProducts && <span>Searching...</span>}
              {productMatches.length > 0 && (
                <div className="waiting-product-results">
                  <strong>Link Product</strong>
                  {productMatches.slice(0, 5).map(match => (
                    <button type="button" onClick={() => linkProduct(match.id)} disabled={productSaving} key={match.id}>
                      <strong>{match.product || match.name || 'Unnamed Product'}</strong>
                      <span>{[match.identifier, match.brand].filter(Boolean).join(' • ') || 'No identifier'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="waiting-product-fields">
              <label>Product Name<input value={productDraft.name} onChange={event => updateProductDraft('name', event.target.value)} /></label>
              <label>Product/File Name<input value={productDraft.product} onChange={event => updateProductDraft('product', event.target.value)} /></label>
              <label>Identifier<input value={productDraft.productId} onChange={event => updateProductDraft('productId', event.target.value)} /></label>
              <label>Brand<input value={productDraft.brand} onChange={event => updateProductDraft('brand', event.target.value)} /></label>
              <label>Description<textarea value={productDraft.description} onChange={event => updateProductDraft('description', event.target.value)} rows={2} /></label>
              <label>Product Job Number<input value={productDraft.itemJobNumber} onChange={event => updateProductDraft('itemJobNumber', event.target.value)} /></label>
            </div>
            <button type="button" className="btn btn-secondary" onClick={saveProductInformation} disabled={productSaving}>
              {product.id ? 'Save Product Information' : 'Create Incomplete Product'}
            </button>
          </section>

          <section className="workflow-workspace-section">
            <h3>Deliverables</h3>
            <DeliverablesSelector
              values={intakeDraft.deliverables}
              onChange={stageDeliverables}
              disabled={false}
            />
            <div className="deliverables-save-row">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => saveIntakeDecision('deliverables', intakeDraft.deliverables)}
                disabled={intakeSaving === 'deliverables' || !deliverablesDirty}
              >
                {intakeSaving === 'deliverables' ? 'Saving...' : 'Save Deliverables'}
              </button>
              {deliverablesDirty && <span className="deliverables-save-hint">Unsaved changes</span>}
            </div>
            {deliverablesError && (
              <div className="deliverables-inline-error">
                <span>{deliverablesError}</span>
                <button type="button" onClick={() => saveIntakeDecision('deliverables', intakeDraft.deliverables)} disabled={intakeSaving === 'deliverables'}>
                  Retry
                </button>
              </div>
            )}
            <div className="workflow-fact-grid">
              <WorkflowFact label="Workstream" value={item.workstream || item.workOrder.workflowName} />
              <WorkflowFact label="Current Stage" value={item.workOrder.currentGateName} />
            </div>
          </section>

          <section className="workflow-workspace-section">
            <h3>Artwork</h3>
            <div className="workflow-fact-grid">
              <WorkflowFact label="Artwork Required?" value={item.readiness.find(requirement => requirement.key === 'artwork')?.visible === false ? 'No' : 'Yes'} />
              <WorkflowFact label="Artwork Available?" value={product.artworkReceived ? 'Yes' : 'No'} />
              <WorkflowFact label="Artwork Status" value={item.readiness.find(requirement => requirement.key === 'artwork')?.detail || 'Pending'} />
            </div>
          </section>

          <section className="workflow-workspace-section">
            <h3>Activation</h3>
            <div className="workflow-fact-grid">
              <WorkflowFact label="Job" value={product.itemJobNumber || product.pickupJobNumber} />
              <WorkflowFact label="Activation" value={referenceDataValue(product, ['Activation', 'activation'])} />
              <WorkflowFact label="Campaign" value={referenceDataValue(product, ['Campaign', 'campaign'])} />
              <WorkflowFact label="Status" value={item.readiness.find(requirement => requirement.key === 'activation-information')?.detail || 'Pending'} />
            </div>
          </section>

          <section className="workflow-workspace-section">
            <h3>Merchandise</h3>
            <IntakeDecisionSelect
              label="Merchandise Resolution"
              value={intakeDraft.merchandiseResolution}
              placeholder="Select resolution"
              options={INTAKE_MERCHANDISE_RESOLUTION_OPTIONS}
              onChange={value => saveIntakeDecision('merchandiseResolution', value)}
              disabled={Boolean(intakeSaving)}
            />
            <div className="workflow-fact-grid">
              <WorkflowFact label="Storage" value={item.location} />
              <WorkflowFact label="Condition" value={record.condition} />
              <WorkflowFact label="Quantity" value={record.quantity || 1} />
              <WorkflowFact label="Shipment" value={record.receipt?.name} />
              <WorkflowFact label="Merchandise Notes" value={record.notes} />
              <WorkflowFact label="Product Notes" value={product.notes} />
            </div>
          </section>

          <section className="workflow-workspace-section">
            <ProductionReadinessPanel item={item} />
          </section>

          {activePhotoUrl && (
            <section className="workflow-workspace-section">
              <h3>Merchandise Photo</h3>
              <WorkflowWorkspaceSection section={WORKSPACE_SECTIONS.photos} item={item} photos={photos} activePhotoUrl={activePhotoUrl} photoIndex={photoIndex} setPhotoIndex={setPhotoIndex} />
            </section>
          )}
        </div>

        <footer className="workflow-transition-panel waiting-info-footer">
          <div>
              <strong>Valid Next Stage(s)</strong>
            {(feedback || localFeedback) && <span className={(feedback || localFeedback).startsWith('Cannot') ? 'is-error' : 'is-success'}>{localFeedback || feedback}</span>}
          </div>
          <div className="workflow-transition-actions">
            <button type="button" className="btn btn-secondary" onClick={() => onSave(item)}>Save</button>
            <button type="button" className="btn btn-primary" onClick={() => onSaveContinue(item)} disabled={!nextItem}>Save & Continue</button>
            <ReleaseToProductionAction item={item} onRelease={onRelease} busy={releaseBusy} />
            {item.workOrder.validNextGates.map(next => (
              <button type="button" className="btn btn-ghost" onClick={() => onMove(item, next.gate.id)} key={next.gate.id}>
                {next.gate.label}
              </button>
            ))}
            {item.workOrder.validNextGates.length === 0 && <span>No valid next gates yet.</span>}
          </div>
          {item.workOrder.blockedNextGates.length > 0 && (
            <details className="workflow-blocked-transitions">
              <summary>Blocked stages</summary>
              {item.workOrder.blockedNextGates.map(next => <p key={next.gate.id}>{next.message}</p>)}
            </details>
          )}
        </footer>
      </aside>
    </div>
  );
}

function WorkflowWorkspaceDrawer({ item, onClose, onMove, onSave, onSaveContinue, onRelease, releaseBusy, onRefresh, feedback, override, photos, photoIndex, setPhotoIndex, nextItem, readonly = false }) {
  if (!item) return null;
  if (item.workOrder.currentGate === GATE_IDS.waitingInformation) {
    return (
      <WaitingInformationWorkspace
        item={item}
        onClose={onClose}
        onMove={onMove}
        onSave={onSave}
        onSaveContinue={onSaveContinue}
        onRelease={onRelease}
        releaseBusy={releaseBusy}
        onRefresh={onRefresh}
        feedback={feedback}
        photos={photos}
        photoIndex={photoIndex}
        setPhotoIndex={setPhotoIndex}
        nextItem={nextItem}
      />
    );
  }
  const gate = item.workOrder.gate;
  const activePhotoUrl = receivingPhotoUrl(photos[photoIndex] || photos[0]);
  return (
    <div className="workflow-workspace-backdrop" onClick={onClose} role="presentation">
      <aside className="workflow-workspace-drawer" role="dialog" aria-modal="true" aria-label="Merchandise workflow workspace" onClick={event => event.stopPropagation()}>
        <header className="workflow-workspace-header">
          <div>
            <span>{item.workOrder.workflowName}</span>
            <h2>{item.title}</h2>
            <p>{item.workOrder.reason}</p>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close workflow workspace">
            <Icon.Close />
          </button>
        </header>

        <div className="workflow-workspace-summary">
          <WorkflowFact label="Current Stage" value={item.workOrder.currentGateName} />
          <WorkflowFact label="Owner" value={item.workOrder.currentOwner} />
          <WorkflowFact label="Status" value={item.record.merchStatus || item.record.reviewState || 'Received'} />
          <WorkflowFact label="Client" value={item.client} />
          <WorkflowFact label="Shipment" value={item.record.receipt?.name} />
          <WorkflowFact label="Storage" value={item.location} />
        </div>

        <section className="workflow-gate-purpose">
          <strong>{gate.label}</strong>
          <span>{gate.description}</span>
        </section>

        <div className="workflow-workspace-scroll">
          {(gate.workspaceSections || []).map(section => (
            <WorkflowWorkspaceSection
              section={section}
              item={item}
              photos={photos}
              activePhotoUrl={activePhotoUrl}
              photoIndex={photoIndex}
              setPhotoIndex={setPhotoIndex}
              override={override}
              key={section}
            />
          ))}
        </div>

        {!readonly && (
          <footer className="workflow-transition-panel">
            <div>
              <strong>Available transitions</strong>
              {feedback && <span className={feedback.startsWith('Cannot') ? 'is-error' : 'is-success'}>{feedback}</span>}
            </div>
            <div className="workflow-transition-actions">
              {item.workOrder.validNextGates.length === 0 && <span>No valid next gates from the current state.</span>}
              <ReleaseToProductionAction item={item} onRelease={onRelease} busy={releaseBusy} />
              {item.workOrder.validNextGates.map(next => (
                <button type="button" className="btn btn-primary" onClick={() => onMove(item, next.gate.id)} key={next.gate.id}>
                  Move to {next.gate.label}
                </button>
              ))}
            </div>
            {item.workOrder.blockedNextGates.length > 0 && (
              <details className="workflow-blocked-transitions">
                <summary>Blocked gates</summary>
                {item.workOrder.blockedNextGates.map(next => <p key={next.gate.id}>{next.message}</p>)}
              </details>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function WorkstreamSelector({ values = [], options = WORKSTREAMS, onChange }) {
  return (
    <section className="production-decision-section">
      <h3>Production</h3>
      <p>Select one or more Workstreams for this merchandise.</p>
      <div className="production-choice-grid">
        {options.map(option => {
          const optionId = option.id || option.key;
          const checked = values.includes(optionId);
          return (
            <label className={`production-choice ${checked ? 'is-selected' : ''}`} key={optionId}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = checked ? values.filter(value => value !== optionId) : [...values, optionId];
                  onChange(next);
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

const INTAKE_DELIVERABLE_OPTIONS = ['Packaging Photo', 'Ecomm Photo', 'Thr3d'];
const INTAKE_MERCHANDISE_RESOLUTION_OPTIONS = ['Keep at Walnut', 'Ship to Kentucky', 'Hold', 'Replacement Requested', 'Return to Client', 'Dispose'];
const DELIVERABLE_WORKSTREAM_MAP = {
  'Ecomm Photo': 'ecomm-photo',
  'Packaging Photo': 'packaging-photo',
  Thr3d: 'thr3d',
};

function DeliverablesSelector({ values = [], onChange, disabled = false }) {
  const normalizedValues = normalizeDeliverableList(values);
  const selectedValues = new Set(normalizedValues);

  function toggle(option) {
    if (disabled) return;
    const nextValues = selectedValues.has(option)
      ? normalizedValues.filter(value => value !== option)
      : [...normalizedValues, option];
    onChange(nextValues);
  }

  return (
    <fieldset className="intake-deliverables-field">
      <legend className="sr-only">Deliverables</legend>
      <div className="intake-deliverable-options">
        {INTAKE_DELIVERABLE_OPTIONS.map(option => {
          const selected = selectedValues.has(option);
          return (
            <label
              className={`intake-deliverable-option ${selected ? 'is-selected' : ''}`}
              key={option}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(option)}
                disabled={disabled}
              />
              <span className="intake-deliverable-check" aria-hidden="true" />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function IntakeDecisionSelect({ label, value, placeholder, options, onChange, disabled = false }) {
  return (
    <label className="intake-decision-field">
      <span>{label}</span>
      <select value={value || ''} onChange={event => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map(option => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function NewReviewProductIdentification({ item, product, onRefresh }) {
  const record = item.record || {};
  const [query, setQuery] = useState(product.identifier || record.skuId || record.productName || '');
  const [matches, setMatches] = useState([]);
  const [draft, setDraft] = useState(() => productInformationFields(product, record));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setQuery(product.identifier || record.skuId || record.productName || '');
    setDraft(productInformationFields(product, record));
    setMatches([]);
    setNotice('');
  }, [item.id, product.id]);

  useEffect(() => {
    let active = true;
    const cleaned = query.trim();
    if (cleaned.length < 3) {
      setMatches([]);
      return () => { active = false; };
    }
    setBusy(true);
    api.searchMerchandiseReviewProducts({
      q: cleaned,
      clientId: record.clientIds?.[0],
      includeItemId: record.itemIds?.[0],
    }).then(data => {
      if (active) setMatches(data.records ?? []);
    }).catch(error => {
      if (active) setNotice(error.message || 'Could not search Products.');
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [query, item.id]);

  function setField(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  async function linkProduct(productId) {
    setBusy(true);
    setNotice('');
    try {
      await api.matchMerchandiseReviewEntry(item.merchandiseId, productId);
      await onRefresh?.();
      setNotice('Product linked.');
    } catch (error) {
      setNotice(error.message || 'Could not link Product.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct() {
    setBusy(true);
    setNotice('');
    try {
      if (product.id) {
        await api.updateItem(product.id, draft);
        setNotice('Product information saved.');
      } else {
        if (!draft.productId) {
          setNotice('Add an identifier before creating an incomplete Product.');
          return;
        }
        const created = await api.createItem({
          ...draft,
          clientId: record.clientIds?.[0],
          codeType: product.codeType || record.codeType,
          identifierLabel: product.identifierLabel || 'Identifier',
        });
        await api.matchMerchandiseReviewEntry(item.merchandiseId, created.id);
        setNotice('Incomplete Product created and linked.');
      }
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not save Product information.');
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProduct() {
    setBusy(true);
    setNotice('');
    try {
      await api.removeMerchandiseReviewMatch(item.merchandiseId);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not unlink Product.');
    } finally {
      setBusy(false);
    }
  }

  const linked = Boolean(product.id);
  const compareRows = linked ? productMatchRows(record, product) : [];
  const warnings = compareRows.filter(row => row.status === 'warn');
  const cleanedQuery = query.trim();

  return (
    <div className="new-review-product-id">
      {!linked && <p className="review-step-lead">Match this item to a Product record so downstream work knows what it is. Can’t find it? Create an incomplete one.</p>}

      {linked ? (
        <div className="merch-compare">
          <div className="merch-compare-grid" role="table" aria-label="Merch versus product record">
            <span className="mc-h" role="columnheader">Field</span>
            <span className="mc-h" role="columnheader">Merch observed</span>
            <span className="mc-h" role="columnheader">Product record</span>
            <span className="mc-h" aria-hidden="true"></span>
            {compareRows.map(row => (
              <Fragment key={row.label}>
                <span className="mc-label">{row.label}</span>
                <span className="mc-val">{row.merch || '—'}</span>
                <span className="mc-val">{row.prod || '—'}</span>
                <span className={`mc-mark is-${row.status}`} title={row.status}>{row.status === 'match' ? '✓' : row.status === 'warn' ? '⚠' : '·'}</span>
              </Fragment>
            ))}
          </div>
          {warnings.length > 0 && (
            <p className="merch-compare-warn">⚠ {warnings.map(row => row.label).join(', ')} differ{warnings.length === 1 ? 's' : ''} between the merch and the linked Product. Confirm this is the right match.</p>
          )}
          <div className="merch-compare-foot">
            <button type="button" className="btn btn-sm" onClick={unlinkProduct} disabled={busy}>Unlink</button>
          </div>
        </div>
      ) : (
        <>
          <label>
            Match to a Product record
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by barcode, product, or brand" />
          </label>
          {cleanedQuery.length >= 3 && (
            matches.length > 0 ? (
              <div className="waiting-product-results">
                <strong>{matches.length} match{matches.length > 1 ? 'es' : ''} for “{cleanedQuery}”</strong>
                {matches.slice(0, 4).map(match => (
                  <button type="button" onClick={() => linkProduct(match.id)} disabled={busy} key={match.id}>
                    <strong>{match.product || match.name || 'Unnamed Product'}</strong>
                    <span>{[match.identifier, match.brand].filter(Boolean).join(' • ') || 'No identifier'}</span>
                  </button>
                ))}
              </div>
            ) : (
              !busy && <p className="merch-compare-empty">No Products match “{cleanedQuery}”. Create one below.</p>
            )
          )}
          <div className="merch-create-alt">
            <button type="button" className="merch-link-btn" onClick={() => setCreateOpen(open => !open)}>
              {createOpen ? 'Hide' : 'Can’t find it? Create an incomplete Product'}
            </button>
          </div>
          {createOpen && (
            <>
              <div className="waiting-product-fields">
                <label>Product Name<input value={draft.name} onChange={event => setField('name', event.target.value)} /></label>
                <label>Product/File Name<input value={draft.product} onChange={event => setField('product', event.target.value)} /></label>
                <label>Identifier<input value={draft.productId} onChange={event => setField('productId', event.target.value)} /></label>
                <label>Brand<input value={draft.brand} onChange={event => setField('brand', event.target.value)} /></label>
              </div>
              <button type="button" className="btn btn-secondary" onClick={saveProduct} disabled={busy}>Create &amp; Link Incomplete Product</button>
            </>
          )}
        </>
      )}
      {notice && <span className="new-review-inline-status">{notice}</span>}
    </div>
  );
}

function productMatchRows(record, product) {
  const alnum = value => String(value || '').replace(/[^0-9a-z]/gi, '').toLowerCase();
  const norm = value => String(value || '').trim().toLowerCase();
  const rows = [
    { label: 'Barcode', merch: record.skuId || record.observedIdentifier || '', prod: product.identifier || product.productId || product.gtinUpc || '', compare: alnum },
    { label: 'Name', merch: record.productName || record.description || '', prod: product.product || product.name || '', compare: norm },
    { label: 'Brand', merch: record.brand || '', prod: product.brand || '', compare: norm },
  ];
  return rows.map(row => {
    const merchKey = row.compare(row.merch);
    const prodKey = row.compare(row.prod);
    let status = 'info';
    if (merchKey && prodKey) status = merchKey === prodKey ? 'match' : 'warn';
    return { label: row.label, merch: row.merch, prod: row.prod, status };
  });
}

function ReadinessStrip({ item, state }) {
  const flagged = item.record?.reviewState === 'Issue' || item.record?.merchStatus === 'Issue' || Boolean(item.record?.blockingIssues?.length);
  const requiredDone = state.deliverables.length > 0 && (state.thr3dOnly || state.blockers.length === 0);
  const chips = [
    {
      label: 'Verify merchandise',
      done: state.merchandiseVerified && !flagged,
      issue: flagged,
      hint: flagged ? 'Resolve the issue' : state.merchandiseVerified ? 'Confirmed' : 'Confirm the item',
    },
    {
      label: 'Identify product',
      done: state.productLinked,
      hint: state.productLinked ? 'Linked' : 'Link a product',
    },
    {
      label: 'Choose deliverables',
      done: state.deliverables.length > 0,
      hint: state.deliverables.length ? state.deliverables.join(', ') : 'Pick at least one',
    },
    {
      label: 'Required to Shoot',
      done: state.deliverables.length > 0 && requiredDone,
      hint: state.deliverables.length === 0
        ? 'Choose deliverables first'
        : state.thr3dOnly
          ? 'Thr3d route'
          : state.blockers.length === 0
            ? 'Complete'
            : `${state.blockers.length} still needed`,
    },
  ];
  const remaining = chips.filter(chip => !chip.done && !chip.issue).length;
  const hasIssue = chips.some(chip => chip.issue);
  const summary = hasIssue
    ? 'Resolve the flagged issue to continue'
    : remaining === 0
      ? 'Everything checks out - ready to finish'
      : `${remaining} ${remaining === 1 ? 'step' : 'steps'} left to finish`;
  return (
    <div className="new-review-readiness">
      <div className={`readiness-summary ${hasIssue ? 'is-issue' : remaining === 0 ? 'is-ready' : ''}`}>
        <span aria-hidden="true">{hasIssue ? '⚑' : remaining === 0 ? '✓' : '○'}</span>
        {summary}
      </div>
      <ol className="new-review-readiness-strip" aria-label="Required to Shoot">
        {chips.map(chip => (
          <li className={chip.issue ? 'is-issue' : chip.done ? 'is-done' : 'is-todo'} key={chip.label}>
            <span className="readiness-mark" aria-hidden="true">{chip.issue ? '!' : chip.done ? '✓' : ''}</span>
            <span className="readiness-text"><strong>{chip.label}</strong><small>{chip.hint}</small></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CommentComposer({ onSubmit }) {
  const [draft, setDraft] = useState('');
  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSubmit?.(text);
    setDraft('');
  }
  return (
    <form className="conversation-composer" onSubmit={submit}>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a comment" />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>Comment</button>
    </form>
  );
}

function initialsForName(name = 'Team') {
  const parts = String(name || 'Team').trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'T') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
}

function ConversationPanel({ comments = [], onAddComment }) {
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [comments.length]);
  return (
    <section className="review-step is-open conversation-panel">
      <header className="review-step-head">
        <span className="review-step-num review-step-num-plain">·</span>
        <h3>Conversation</h3>
        {comments.length > 0 && <span className="conversation-count">{comments.length}</span>}
      </header>
      <div className="conversation-list" ref={listRef}>
        {comments.length === 0 && <p className="conversation-empty">No comments yet.</p>}
        {comments.map(comment => (
          <article className="conversation-comment" key={comment.id}>
            <span className="conversation-avatar" aria-hidden="true">{initialsForName(comment.authorName)}</span>
            <div className="conversation-bubble">
              <header><strong>{comment.authorName}</strong><span>{formatInventoryDate(comment.createdAt)}</span></header>
              <p>{comment.body}</p>
            </div>
          </article>
        ))}
      </div>
      <CommentComposer onSubmit={onAddComment} />
    </section>
  );
}

function ActivityPanel({ events = [] }) {
  return (
    <section className="review-step is-open activity-panel">
      <header className="review-step-head"><span className="review-step-num review-step-num-plain">·</span><h3>Activity</h3></header>
      <div className="activity-list">
        {events.length === 0 && <p className="conversation-empty">No activity yet.</p>}
        {events.map(event => (
          <div className="activity-event" key={event.id}>
            <span>{event.actor || 'System'}</span>
            <strong>{event.action || event.body}</strong>
            <time>{formatInventoryDate(event.createdAt)}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

// Collapsing step: when its work is done it folds to a one-line summary, so the
// pane always keeps the open/actionable steps loud and the finished ones quiet.
function ReviewStep({ n, title, done, flagged, statusText, statusTone, summary, children }) {
  const [manualOpen, setManualOpen] = useState(false);
  useEffect(() => { if (!done) setManualOpen(false); }, [done]);
  const collapsed = done && !flagged && !manualOpen;
  const mark = flagged ? '⚑' : done ? '✓' : n;
  return (
    <section className={`review-step ${collapsed ? 'is-collapsed' : 'is-open'} ${done ? 'is-done' : ''} ${flagged ? 'is-flagged' : ''}`}>
      <header
        className="review-step-head"
        onClick={collapsed ? () => setManualOpen(true) : undefined}
        role={collapsed ? 'button' : undefined}
        tabIndex={collapsed ? 0 : undefined}
        onKeyDown={collapsed ? (event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setManualOpen(true); } }) : undefined}
      >
        <span className="review-step-num">{mark}</span>
        <h3>{title}</h3>
        {collapsed
          ? <span className="review-step-edit">Edit</span>
          : (statusText ? <span className={`merch-verify-status ${statusTone}`}>{statusText}</span> : null)}
      </header>
      {collapsed ? <div className="review-step-summary">{summary}</div> : <div className="review-step-body">{children}</div>}
    </section>
  );
}

const MERCH_FLAG_REASONS = ['Wrong item', 'Damaged', 'Missing barcode', 'Quantity mismatch', 'Duplicate', 'Other'];

function MerchandiseVerifyPanel({ item, onRefresh, onFeedback }) {
  const record = item.record || {};
  const flagged = record.reviewState === 'Issue' || record.merchStatus === 'Issue' || Boolean(record.blockingIssues?.length);
  const verified = Boolean(record.merchandiseVerified) && !flagged;
  const [draft, setDraft] = useState(() => ({
    packageName: record.productName || record.description || '',
    identifier: record.skuId || record.observedIdentifier || '',
  }));
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState(MERCH_FLAG_REASONS[0]);
  const [flagNote, setFlagNote] = useState('');

  useEffect(() => {
    setDraft({
      packageName: record.productName || record.description || '',
      identifier: record.skuId || record.observedIdentifier || '',
    });
    setNotice('');
    setFlagOpen(false);
    setFlagNote('');
  }, [item.id]);

  async function confirmMerchandise() {
    setBusy('confirm');
    setNotice('');
    try {
      await api.verifyMerchandise(item.merchandiseId, { packageName: draft.packageName, identifier: draft.identifier });
      await onRefresh?.();
      onFeedback?.('Merchandise verified.');
    } catch (error) {
      setNotice(error.message || 'Could not verify merchandise.');
    } finally {
      setBusy('');
    }
  }

  async function undoVerification() {
    setBusy('undo');
    setNotice('');
    try {
      await api.unverifyMerchandise(item.merchandiseId);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not undo verification.');
    } finally {
      setBusy('');
    }
  }

  async function submitFlag() {
    setBusy('flag');
    setNotice('');
    try {
      await api.createMerchandiseReviewIssue(item.merchandiseId, {
        type: flagReason,
        description: `${flagReason}${flagNote ? ` — ${flagNote}` : ''}`,
        notes: flagNote,
      });
      await onRefresh?.();
      onFeedback?.(`Flagged: ${flagReason}.`);
      setFlagOpen(false);
    } catch (error) {
      setNotice(error.message || 'Could not flag merchandise.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <p className="review-step-lead">Confirm the item in the photos matches what we recorded — correct the name or barcode if needed, then confirm. Flag it if something's wrong.</p>
      <div className="merch-verify-fields">
        <label>Package Name
          <input value={draft.packageName} onChange={event => setDraft(d => ({ ...d, packageName: event.target.value }))} disabled={verified} />
        </label>
        <label>Barcode / SKU
          <input value={draft.identifier} onChange={event => setDraft(d => ({ ...d, identifier: event.target.value }))} disabled={verified} />
        </label>
      </div>
      <p className="review-context">
        <span>{record.receipt?.name || '—'}</span>
        <span>Qty {record.quantity || 1}</span>
        {record.condition && <span>{record.condition}</span>}
        {item.timeHere && <span>Here {item.timeHere}</span>}
      </p>

      {verified ? (
        <div className="merch-verify-actions">
          <span className="merch-verify-stamp">✓ Verified{record.merchandiseVerifiedAt ? ` · ${formatInventoryDate(record.merchandiseVerifiedAt)}` : ''}</span>
          <button type="button" className="btn btn-sm" onClick={undoVerification} disabled={busy === 'undo'}>{busy === 'undo' ? 'Undoing…' : 'Undo'}</button>
        </div>
      ) : flagged ? (
        <div className="merch-verify-actions">
          <span className="merch-verify-stamp is-flag">⚑ Flagged — resolve the issue, then re-verify.</span>
          <button type="button" className="btn btn-green btn-sm" onClick={confirmMerchandise} disabled={busy === 'confirm'}>{busy === 'confirm' ? 'Verifying…' : 'Re-verify'}</button>
        </div>
      ) : (
        <div className="merch-verify-actions">
          <button type="button" className="btn btn-green" onClick={confirmMerchandise} disabled={busy === 'confirm'}>{busy === 'confirm' ? 'Verifying…' : '✓ Confirm Merchandise'}</button>
          <button type="button" className="btn btn-flag" onClick={() => setFlagOpen(open => !open)} disabled={busy === 'flag'}>⚑ Flag Issue</button>
        </div>
      )}

      {flagOpen && !verified && !flagged && (
        <div className="merch-flag-form">
          <label>Reason
            <select value={flagReason} onChange={event => setFlagReason(event.target.value)}>
              {MERCH_FLAG_REASONS.map(reason => <option value={reason} key={reason}>{reason}</option>)}
            </select>
          </label>
          <input placeholder="Add detail (optional)" value={flagNote} onChange={event => setFlagNote(event.target.value)} />
          <button type="button" className="btn btn-danger btn-sm" onClick={submitFlag} disabled={busy === 'flag'}>{busy === 'flag' ? 'Flagging…' : 'Flag'}</button>
        </div>
      )}
      {notice && <span className="new-review-inline-status">{notice}</span>}
    </>
  );
}

function NewReviewRequiredInformation({ item, state }) {
  const requirements = item.readiness.filter(requirement => requirement.visible !== false);
  if (state.thr3dOnly) {
    return <p className="review-step-lead">Thr3d-only merchandise needs no photo production info. Once it is verified, it belongs in the Thr3d shipping path.</p>;
  }
  if (state.deliverables.length === 0) {
    return <p className="review-step-lead">Choose deliverables above to see what production needs.</p>;
  }
  return (
    <ul className="production-readiness-list">
      {requirements.map(requirement => (
        <li key={requirement.key} className={requirement.satisfied ? 'is-ready' : 'is-missing'}>
          <span className="req-mark" aria-hidden="true">{requirement.satisfied ? '✓' : '!'}</span>
          <div className="req-text">
            <strong>{requirementLabelForUser(requirement)}</strong>
            {!requirement.satisfied && <em>{requirement.detail || requirement.missing}</em>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ImageLightbox({ photos, index, setIndex, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const url = receivingPhotoUrl(photos[index]);
  const clamp = value => Math.min(5, Math.max(1, Number(value.toFixed(2))));

  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, [index]);
  useEffect(() => { if (zoom <= 1) setOffset({ x: 0, y: 0 }); }, [zoom]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      else if (event.key === 'ArrowRight') setIndex(i => Math.min(photos.length - 1, i + 1));
      else if (event.key === '+' || event.key === '=') setZoom(z => clamp(z + 0.25));
      else if (event.key === '-') setZoom(z => clamp(z - 0.25));
      else if (event.key === '0') setZoom(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length, onClose, setIndex]);

  function onWheel(event) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      setZoom(z => clamp(z - event.deltaY * 0.01));
    } else if (zoom > 1) {
      setOffset(o => ({ x: o.x - event.deltaX, y: o.y - event.deltaY }));
    } else {
      setZoom(z => clamp(z + (event.deltaY < 0 ? 0.2 : -0.2)));
    }
  }
  function onPointerDown(event) {
    if (zoom <= 1) return;
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + (event.clientX - drag.current.x), y: drag.current.oy + (event.clientY - drag.current.y) });
  }
  function endDrag() { drag.current = null; }

  if (!url) return null;

  return createPortal(
    <div className="nr-lightbox" role="dialog" aria-modal="true" aria-label="Merchandise image viewer" onClick={event => event.stopPropagation()}>
      <div className="nr-lightbox-topbar">
        <span className="nr-lightbox-count">{index + 1} / {photos.length}</span>
        <div className="nr-lightbox-zoom">
          <button type="button" onClick={() => setZoom(z => clamp(z - 0.25))} disabled={zoom <= 1} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(z => clamp(z + 0.25))} disabled={zoom >= 5} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} disabled={zoom === 1}>Reset</button>
        </div>
        <button type="button" className="nr-lightbox-close" onClick={onClose} aria-label="Close image viewer">✕</button>
      </div>
      <div className="nr-lightbox-stage" onWheel={onWheel} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        {index > 0 && <button type="button" className="nr-lightbox-nav prev" onClick={() => setIndex(i => Math.max(0, i - 1))} aria-label="Previous image">‹</button>}
        <img
          src={url}
          alt=""
          className={`nr-lightbox-img ${zoom > 1 ? 'is-zoomed' : ''}`}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => setZoom(z => (z > 1 ? 1 : 2))}
          draggable={false}
        />
        {index < photos.length - 1 && <button type="button" className="nr-lightbox-nav next" onClick={() => setIndex(i => Math.min(photos.length - 1, i + 1))} aria-label="Next image">›</button>}
      </div>
      {photos.length > 1 && (
        <div className="nr-lightbox-thumbs">
          {photos.map((photo, i) => {
            const thumb = receivingPhotoUrl(photo);
            return thumb ? (
              <button type="button" className={i === index ? 'is-active' : ''} onClick={() => setIndex(i)} key={`${thumb}-${i}`}>
                <img src={thumb} alt="" />
              </button>
            ) : null;
          })}
        </div>
      )}
    </div>,
    document.body
  );
}

function NewReviewModal({ item, decision, onDecisionChange, onFinish, onClose, previousItem, nextItem, onSelectItem, onRefresh, photos, photoIndex, setPhotoIndex, comments, activity, onAddComment, onMarkCommentsRead }) {
  const auth = useAuth();
  const [zoom, setZoom] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [intakeDraft, setIntakeDraft] = useState(() => ({
    deliverables: deliverablesForRecord(item.record),
    merchandiseResolution: item.record?.merchandiseResolution || '',
  }));
  const [intakeSaving, setIntakeSaving] = useState('');
  const intakeSaveInFlight = useRef(false);
  const deliverablesAutosaveTimer = useRef(null);
  const [intakeFeedback, setIntakeFeedback] = useState('');
  const [deliverablesError, setDeliverablesError] = useState('');
  const [finishState, setFinishState] = useState({ status: 'idle', message: '' });
  const product = item.record?.linkedItem || {};
  const activePhoto = photos[photoIndex] || photos[0];
  const activePhotoUrl = receivingPhotoUrl(activePhoto);
  const wizardState = wizardStateForItem(item, intakeDraft.deliverables);
  const finishBusy = finishState.status === 'loading';
  const routeDestination = wizardState.thr3dOnly && wizardState.blockers.length === 0
    ? 'Ready for Thr3d'
    : wizardState.blockers.length === 0 && wizardState.photoDeliverables.length
    ? 'Ready for Photo'
      : 'Waiting for Information';
  const finishDisabled = finishBusy || intakeSaving === 'deliverables' || !wizardState.merchandiseVerified || wizardState.deliverables.length === 0;
  const finishLabel = !wizardState.merchandiseVerified
    ? 'Verify to continue'
    : wizardState.deliverables.length === 0
      ? 'Choose deliverables'
      : `Finish → ${routeDestination}`;

  useEffect(() => {
    function handleKeyDown(event) {
      const targetTag = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(targetTag)) return;
      if (lightboxOpen) return; // the lightbox owns keyboard control while open
      if (event.key === 'Escape') {
        onClose(item);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPhotoIndex(index => Math.max(0, index - 1));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPhotoIndex(index => Math.min(Math.max(photos.length - 1, 0), index + 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, lightboxOpen, onClose, photos.length, setPhotoIndex]);

  useEffect(() => {
    setIntakeDraft({
      deliverables: deliverablesForRecord(item.record),
      merchandiseResolution: item.record?.merchandiseResolution || '',
    });
    setIntakeFeedback('');
    setDeliverablesError('');
    setFinishState({ status: 'idle', message: '' });
    onMarkCommentsRead?.(item.merchandiseId);
  }, [item.id]);

  useEffect(() => () => {
    if (deliverablesAutosaveTimer.current) clearTimeout(deliverablesAutosaveTimer.current);
  }, []);

  async function saveIntakeDecision(field, value) {
    if (intakeSaveInFlight.current) return;
    intakeSaveInFlight.current = true;
    const previousDraft = intakeDraft;
    const cleanValue = field === 'deliverables' ? normalizeDeliverableList(value) : value;
    const nextDraft = { ...intakeDraft, [field]: cleanValue };
    if (field === 'deliverables' && cleanValue.includes('Thr3d') && !nextDraft.merchandiseResolution) {
      nextDraft.merchandiseResolution = 'Ship to Kentucky';
    }
    setIntakeDraft(nextDraft);
    setIntakeSaving(field);
    setIntakeFeedback('');
    if (field === 'deliverables') setDeliverablesError('');
    try {
      const payload = field === 'deliverables'
        ? { deliverables: cleanValue }
        : { merchandiseResolution: value };
      const updated = await api.updateMerchandiseIntakeDecisions(item.merchandiseId, payload);
      const updatedDeliverables = deliverablesForRecord(updated);
      setIntakeDraft({
        deliverables: updatedDeliverables,
        merchandiseResolution: updated.merchandiseResolution || '',
      });
      if (field === 'deliverables') {
        setDeliverablesError('');
      }
      await onRefresh?.();
      setIntakeFeedback(field === 'deliverables' ? 'Deliverables saved.' : 'Saved.');
    } catch (error) {
      if (field === 'deliverables') {
        setDeliverablesError(deliverablesSaveErrorMessage(error));
      } else {
        setIntakeDraft(previousDraft);
        setIntakeFeedback(error.message || 'Could not save Planning decision.');
      }
    } finally {
      intakeSaveInFlight.current = false;
      setIntakeSaving('');
    }
  }

  function stageDeliverables(value) {
    const cleanValue = normalizeDeliverableList(value);
    setIntakeDraft(draft => {
      const nextDraft = { ...draft, deliverables: cleanValue };
      if (cleanValue.includes('Thr3d') && !nextDraft.merchandiseResolution) {
        nextDraft.merchandiseResolution = 'Ship to Kentucky';
      }
      return nextDraft;
    });
    setDeliverablesError('');
    setIntakeFeedback('Saving...');
    if (deliverablesAutosaveTimer.current) clearTimeout(deliverablesAutosaveTimer.current);
    deliverablesAutosaveTimer.current = setTimeout(() => {
      saveIntakeDecision('deliverables', cleanValue);
    }, 350);
  }

  async function flushPendingDeliverablesSave() {
    if (deliverablesAutosaveTimer.current) {
      clearTimeout(deliverablesAutosaveTimer.current);
      deliverablesAutosaveTimer.current = null;
      await saveIntakeDecision('deliverables', intakeDraft.deliverables);
    }
  }

  async function finishCurrentVerification() {
    if (finishBusy) return;
    setFinishState({ status: 'loading', message: 'Finishing verification...' });
    try {
      await flushPendingDeliverablesSave();
      const result = await onFinish?.(item, wizardStateForItem(item, intakeDraft.deliverables));
      if (result?.ok === false) {
        setFinishState({ status: 'error', message: result.message || 'Could not finish verification. Try again.' });
        return;
      }
      setFinishState({ status: 'success', message: result?.message || 'Verification finished.' });
    } catch (error) {
      setFinishState({ status: 'error', message: error.message || 'Could not finish verification. Try again.' });
    }
  }

  const stepFlagged = item.record?.reviewState === 'Issue' || item.record?.merchStatus === 'Issue' || Boolean(item.record?.blockingIssues?.length);
  const identifyWarnings = product.id ? productMatchRows(item.record || {}, product).filter(row => row.status === 'warn').length : 0;
  const verifyDone = wizardState.merchandiseVerified && !stepFlagged;
  const identifyDone = wizardState.productLinked && identifyWarnings === 0;
  const deliverablesDone = wizardState.deliverables.length > 0;
  const requiredDone = deliverablesDone && (wizardState.thr3dOnly || wizardState.blockers.length === 0);

  return (
    <div className="new-review-modal-backdrop" role="presentation" onClick={() => onClose(item)}>
      <section className="new-review-modal" role="dialog" aria-modal="true" aria-label="New item intake review" onClick={event => event.stopPropagation()}>
        <header className="new-review-modal-header">
          <div className="new-review-modal-heading">
            <span className="nr-eyebrow">{item.client}</span>
            <h2>{item.title}</h2>
            <span className="nr-gate-pill">Queue: {item.queueLabel || item.workOrder.currentGateName}</span>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={() => onClose(item)} aria-label="Close intake review">
            <Icon.Close />
          </button>
        </header>

        <ReadinessStrip item={item} state={wizardState} />

        <div className="new-review-modal-body">
          <section className="new-review-image-pane" aria-label="Merchandise images">
            <div className="new-review-image-layout">
              {photos.length > 1 && (
                <div className="new-review-thumbnail-strip" aria-label="Merchandise photo thumbnails">
                  {photos.map((photo, index) => {
                    const url = receivingPhotoUrl(photo);
                    return url ? (
                      <button type="button" className={photoIndex === index ? 'is-active' : ''} onClick={() => setPhotoIndex(index)} key={`${url}-${index}`}>
                        <img src={url} alt="" />
                      </button>
                    ) : null;
                  })}
                </div>
              )}
              <div className="new-review-image-stage">
                {activePhotoUrl ? (
                  <button type="button" className="new-review-main-image" onClick={() => setLightboxOpen(true)} style={{ '--review-zoom': zoom }}>
                    <img src={activePhotoUrl} alt="" />
                  </button>
                ) : (
                  <div className="workflow-empty-inline">No R2-backed photos available.</div>
                )}
              </div>
            </div>
            <div className="new-review-image-controls">
              <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.max(0, index - 1))} disabled={photoIndex <= 0}>Previous</button>
              <span>{photos.length ? `${photoIndex + 1} / ${photos.length}` : '0 images'}</span>
              <button type="button" className="btn" onClick={() => setPhotoIndex(index => Math.min(photos.length - 1, index + 1))} disabled={photoIndex >= photos.length - 1}>Next</button>
              <button type="button" className="btn" onClick={() => setZoom(value => Math.max(1, Number((value - 0.2).toFixed(1))))}>-</button>
              <button type="button" className="btn" onClick={() => setZoom(value => Math.min(2.4, Number((value + 0.2).toFixed(1))))}>+</button>
            </div>
          </section>

          <aside className="new-review-decision-pane" aria-label="Planning decision">
            <ReviewStep
              n={1}
              title="Verify Merchandise"
              done={verifyDone}
              flagged={stepFlagged}
              statusText={stepFlagged ? '⚑ Flagged' : verifyDone ? '✓ Verified' : 'Not verified'}
              statusTone={stepFlagged ? 'flag' : verifyDone ? 'ok' : 'wait'}
              summary={`${item.record?.productName || item.record?.description || 'Unnamed'} · ${item.record?.skuId || 'no barcode'}`}
            >
              <MerchandiseVerifyPanel item={item} onRefresh={onRefresh} onFeedback={setIntakeFeedback} />
            </ReviewStep>

            <ReviewStep
              n={2}
              title="Identify Product"
              done={identifyDone}
              statusText={wizardState.productLinked ? (identifyWarnings ? `✓ Linked · ${identifyWarnings} warning${identifyWarnings > 1 ? 's' : ''}` : '✓ Linked') : 'Not linked'}
              statusTone={wizardState.productLinked && !identifyWarnings ? 'ok' : 'wait'}
              summary={product.product || product.name || product.identifier || '—'}
            >
              <NewReviewProductIdentification item={item} product={product} onRefresh={onRefresh} />
            </ReviewStep>

            <ReviewStep
              n={3}
              title="Deliverables"
              done={deliverablesDone}
              statusText={deliverablesDone ? `✓ ${wizardState.deliverables.length} chosen` : 'Choose at least one'}
              statusTone={deliverablesDone ? 'ok' : 'wait'}
              summary={wizardState.deliverables.join(', ') || '—'}
            >
              <DeliverablesSelector
                values={intakeDraft.deliverables}
                onChange={stageDeliverables}
                disabled={intakeSaving === 'deliverables'}
              />
              {deliverablesError && (
                <div className="deliverables-inline-error">
                  <span>{deliverablesError}</span>
                  <button type="button" onClick={() => saveIntakeDecision('deliverables', intakeDraft.deliverables)} disabled={intakeSaving === 'deliverables'}>
                    Retry
                  </button>
                </div>
              )}
              {intakeFeedback && <span className="new-review-inline-status">{intakeFeedback}</span>}
            </ReviewStep>

            <ReviewStep
              n={4}
              title="Required to Shoot"
              done={requiredDone}
              statusText={requiredDone ? '✓ Complete' : `${wizardState.blockers.length} still needed`}
              statusTone={requiredDone ? 'ok' : 'wait'}
              summary="All required info complete"
            >
              <NewReviewRequiredInformation item={item} state={wizardState} />
            </ReviewStep>

            <ConversationPanel
              comments={comments}
              onAddComment={body => onAddComment?.(item.merchandiseId, {
                body,
                authorId: auth?.user?.id || '',
                authorName: pmCommentUserDisplayName(auth?.user),
              })}
            />
            <ActivityPanel events={activity} />
          </aside>
        </div>

        <footer className="new-review-modal-footer">
          <button type="button" className="btn" onClick={() => previousItem && onSelectItem(previousItem.id)} disabled={!previousItem}>Previous Merchandise</button>
          <div className="new-review-finish-summary">
            <span>Routes to <strong>{routeDestination}</strong></span>
            {finishState.message && <strong className={`is-${finishState.status}`}>{finishState.message}</strong>}
          </div>
          <button type="button" className="btn btn-primary" onClick={finishCurrentVerification} disabled={finishDisabled}>
            {finishBusy ? 'Finishing...' : finishLabel}
          </button>
          <button type="button" className="btn" onClick={() => nextItem && onSelectItem(nextItem.id)} disabled={!nextItem}>Next Merchandise</button>
        </footer>
      </section>
      {lightboxOpen && activePhotoUrl && (
        <ImageLightbox photos={photos} index={photoIndex} setIndex={setPhotoIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

function MerchandiseReviewV2Page() {
  const entries = useResource(() => api.listMerchandiseReviewEntries());
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const records = entries.data?.records ?? [];
  const defaultWorkflow = MERCHANDISE_REVIEW_WORKFLOW;
  const workflowGates = PM_QUEUE_COLUMNS;
  const [artworkOverrides] = useState(() => loadJsonMap(MERCH_REVIEW_V2_ARTWORK_KEY));
  const [queueOverrides, setQueueOverrides] = useState(() => loadJsonMap(PM_QUEUE_STORAGE_KEY));
  const [conversations, setConversations] = useState(() => loadJsonMap(PM_CONVERSATION_STORAGE_KEY));
  const [activityByMerchandise, setActivityByMerchandise] = useState(() => loadJsonMap(PM_ACTIVITY_STORAGE_KEY));
  const [commentReads, setCommentReads] = useState(() => loadJsonMap(PM_COMMENT_READ_STORAGE_KEY));
  const [legacyWorkstreamDecisions] = useState(() => ({
    ...loadJsonMap(MERCH_REVIEW_V2_LEGACY_DECISIONS_KEY),
    ...loadJsonMap(MERCH_REVIEW_V2_DECISIONS_KEY),
  }));
  const [feedback, setFeedback] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [releaseSavingId, setReleaseSavingId] = useState('');
  const [finishSavingId, setFinishSavingId] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [workstreamFilter, setWorkstreamFilter] = useState('');

  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(client => [client.id, client]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const selectedWorkstreamIdsByMerchandise = records.reduce((map, record) => {
    const deliverableWorkstreams = deliverablesForRecord(record)
      .map(deliverable => DELIVERABLE_WORKSTREAM_MAP[deliverable])
      .filter(Boolean);
    map[record.id] = deliverableWorkstreams.length
      ? deliverableWorkstreams.filter((value, index, list) => list.indexOf(value) === index)
      : normalizeWorkstreamSelection(legacyWorkstreamDecisions[record.id] || {}, record.linkedItem?.workstream || record.linkedItem?.output);
    return map;
  }, {});
  const boardItems = records.map(record => {
    const override = artworkOverrides[record.id];
    const client = clientMap[record.clientIds?.[0]];
    const location = record.locationId ? locationMap[record.locationId] : null;
    const workflow = workflowForClient(record.clientIds?.[0]);
    const workOrder = evaluateMerchandiseReviewAssignment(record, {
      artworkOverride: override,
      requestedGateId: intakeRequestedGateForRecord(record),
      reviewState: reviewStateFor(record),
      client,
      workflow,
    });
    const card = buildWorkOrderCard(record, { assignment: workOrder, client, location });
    const deliverables = deliverablesForRecord(record);
    const deliverableLabels = deliverables.map(deliverableWorkstreamLabel).filter(Boolean);
    const deliverableWorkstreams = deliverables.map(deliverable => DELIVERABLE_WORKSTREAM_MAP[deliverable]).filter(Boolean);
    const comments = Array.isArray(conversations[record.id]) ? conversations[record.id] : [];
    const readThrough = commentReads[record.id] || '';
    const unreadComments = comments.filter(comment => comment.createdAt > readThrough).length;
    const overriddenQueue = queueOverrides[record.id];
    const columnId = record.intakeStatus === 'Ready to Release'
      ? GATE_IDS.readyProduction
      : overriddenQueue && PM_QUEUE_COLUMNS.some(column => column.id === overriddenQueue)
        ? overriddenQueue
        : card.columnId;
    return {
      ...card,
      id: record.id,
      merchandiseId: record.id,
      columnId,
      queueLabel: workflowGates.find(column => column.id === columnId)?.label || card.currentGateName,
      workstreamId: deliverableWorkstreams[0] || card.primaryWorkstream,
      selectedWorkstreamIds: selectedWorkstreamIdsByMerchandise[record.id],
      isDraftWorkOrder: false,
      deliverables,
      commentCount: comments.length,
      unreadComments,
      workstream: deliverableLabels.join(', ') || selectedWorkstreamIdsByMerchandise[record.id].map(workstreamLabel).filter(Boolean).join(', ') || card.workstream,
    };
  });
  const clientOptions = [...new Set(records.map(record => record.clientIds?.[0]).filter(Boolean))]
    .map(id => ({ id, name: clientMap[id]?.name || 'Unknown client' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const locationOptions = [...new Set(records.map(record => record.locationId).filter(Boolean))]
    .map(id => ({ id, name: locationMap[id]?.name || 'Unknown location' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const searchText = search.trim().toLowerCase();
  const filteredItems = boardItems.filter(item => {
    const record = item.record || {};
    return (!searchText || workflowSearchHaystack(item).includes(searchText))
      && (!clientFilter || record.clientIds?.[0] === clientFilter)
      && (!locationFilter || record.locationId === locationFilter)
      && (!ageFilter || record.ageGroup === ageFilter)
      && (!workstreamFilter || item.workstreamId === workstreamFilter || item.selectedWorkstreamIds?.includes(workstreamFilter) || workstreamFromLegacyValue(record.linkedItem?.workstream || record.linkedItem?.output) === workstreamFilter);
  });
  const itemsByColumn = workflowGates.reduce((groups, column) => ({ ...groups, [column.id]: [] }), {});
  filteredItems.forEach(item => {
    itemsByColumn[item.columnId]?.push(item);
  });
  const selectedItem = boardItems.find(item => item.id === selectedId) || null;
  const selectedPhotos = recordPhotos(selectedItem?.record);
  const selectedOverride = selectedItem ? artworkOverrides[selectedItem.merchandiseId] : null;
  const selectedWorkspaceMode = workspaceModeForGate(selectedItem?.workOrder?.gate);
  const selectedDecision = selectedItem ? { workstreamIds: selectedWorkstreamIdsByMerchandise[selectedItem.merchandiseId] || [] } : null;
  const selectedColumnItems = selectedItem ? filteredItems.filter(item => item.columnId === selectedItem.columnId) : [];
  const selectedIndex = selectedItem ? selectedColumnItems.findIndex(item => item.id === selectedItem.id) : -1;
  const previousSelectedItem = selectedIndex > 0 ? selectedColumnItems[selectedIndex - 1] : null;
  const nextSelectedItem = selectedIndex >= 0 && selectedIndex < selectedColumnItems.length - 1 ? selectedColumnItems[selectedIndex + 1] : null;

  useEffect(() => {
    setPhotoIndex(0);
  }, [selectedId]);

  function updateSelectedDecision(nextDecision) {
    void nextDecision;
  }

  function recordActivity(merchandiseId, body, options = {}) {
    setActivityByMerchandise(current => {
      const next = {
        ...current,
        [merchandiseId]: [
          {
            id: `${merchandiseId}:${Date.now()}`,
            actor: options.actor || 'System',
            action: options.action || body,
            body,
            createdAt: localNowIso(),
          },
          ...(Array.isArray(current[merchandiseId]) ? current[merchandiseId] : []),
        ].slice(0, 40),
      };
      saveJsonMap(PM_ACTIVITY_STORAGE_KEY, next);
      return next;
    });
  }

  function markCommentsRead(merchandiseId) {
    setCommentReads(current => {
      const next = { ...current, [merchandiseId]: localNowIso() };
      saveJsonMap(PM_COMMENT_READ_STORAGE_KEY, next);
      return next;
    });
  }

  function addConversationComment(merchandiseId, comment) {
    setConversations(current => {
      const next = {
        ...current,
        [merchandiseId]: [
          ...(Array.isArray(current[merchandiseId]) ? current[merchandiseId] : []),
          {
            id: `${merchandiseId}:comment:${Date.now()}`,
            body: comment.body,
            authorId: comment.authorId,
            authorName: comment.authorName,
            createdAt: localNowIso(),
          },
        ],
      };
      saveJsonMap(PM_CONVERSATION_STORAGE_KEY, next);
      return next;
    });
    recordActivity(merchandiseId, 'Added a comment.', { actor: comment.authorName || 'Team', action: 'Added a comment.' });
    markCommentsRead(merchandiseId);
  }

  async function moveItemToGate(item, columnId) {
    const destination = workflowGates.find(column => column.id === columnId);
    if (!destination || item.columnId === columnId) return;
    if (columnId === GATE_IDS.readyProduction) {
      const blockers = visibleRequirementBlockers(item.readiness || []);
      if (blockers.length) {
        setFeedback(`Cannot move to Ready for Photo. Missing: ${blockers.map(requirementLabelForUser).join(', ')}`);
        return;
      }
    }
    try {
      if ([GATE_IDS.newReview, GATE_IDS.waitingInformation, GATE_IDS.readyProduction].includes(columnId)) {
        await api.updateMerchandiseIntakeState(item.merchandiseId, {
          stage: columnId,
          blockingRequirements: item.readiness.filter(requirement => requirement.visible !== false && !requirement.satisfied).map(requirementLabelForUser),
        });
      }
      setQueueOverrides(current => {
        const next = { ...current };
        if ([PM_LOCAL_QUEUE_IDS.planning].includes(columnId)) next[item.merchandiseId] = columnId;
        else delete next[item.merchandiseId];
        saveJsonMap(PM_QUEUE_STORAGE_KEY, next);
        return next;
      });
      recordActivity(item.merchandiseId, `Moved to ${destination.label}.`, { actor: 'Planning', action: `Moved to ${destination.label}.` });
      await refreshV2WorkflowData();
      setSelectedId(item.merchandiseId);
      setFeedback(`Moved ${item.title || 'merchandise'} to ${destination.label}.`);
    } catch (error) {
      setFeedback(error.message || 'Could not move Merchandise.');
    }
  }

  function moveBoardItem(itemId, columnId) {
    const item = boardItems.find(candidate => candidate.id === itemId);
    if (!item) return;
    moveItemToGate(item, columnId);
  }

  async function saveIntakeItem(item, { keepSelection = true } = {}) {
    try {
      await refreshV2WorkflowData();
      if (keepSelection) {
        setSelectedId(item.merchandiseId);
        setWorkspaceOpen(true);
      }
      setFeedback('Planning saved. Merchandise refreshed.');
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    }
  }

  async function saveIntakeItemAndContinue(item) {
    const saved = await saveIntakeItem(item, { keepSelection: false });
    if (!saved) return;
    if (nextSelectedItem) {
      setSelectedId(nextSelectedItem.id);
      setWorkspaceOpen(true);
    } else {
      closeWorkflowWorkspace();
    }
  }

  async function refreshV2WorkflowData({ quiet = true } = {}) {
    await entries.reload({ quiet });
  }

  async function saveIntakeReadiness(item) {
    const blockers = item.readiness.filter(requirement => requirement.visible !== false && !requirement.satisfied);
    const readyGate = item.workOrder.validNextGates[0]?.gate?.label;
    try {
      await api.updateMerchandiseIntakeState(item.merchandiseId, {
        stage: item.workOrder.currentGate,
        blockingRequirements: blockers.map(requirement => requirement.label),
      });
      await refreshV2WorkflowData();
      setFeedback(readyGate ? `Saved. Ready for: ${readyGate}.` : 'Saved. Still waiting for information.');
      return true;
    } catch (error) {
      setFeedback(error.message || 'Could not save this Merchandise.');
      return false;
    }
  }

  async function releaseIntakeItem(item) {
    setReleaseSavingId(item.merchandiseId);
    setFeedback('');
    try {
      await api.releaseMerchandiseToProduction(item.merchandiseId);
      await refreshV2WorkflowData();
      setSelectedId('');
      setWorkspaceOpen(false);
      setFeedback(`${item.title || 'Merchandise'} released to production.`);
      return true;
    } catch (error) {
      const missing = Array.isArray(error.missing) ? ` Missing: ${error.missing.join(', ')}` : '';
      setFeedback(`${error.message || 'Cannot release to production.'}${missing}`);
      return false;
    } finally {
      setReleaseSavingId('');
    }
  }

  async function saveIntakeReadinessAndContinue(item) {
    const saved = await saveIntakeReadiness(item);
    if (!saved) return;
    if (nextSelectedItem) {
      setSelectedId(nextSelectedItem.id);
      setWorkspaceOpen(true);
    } else {
      closeWorkflowWorkspace();
    }
  }

  function openWorkflowWorkspace(id) {
    setSelectedId(id);
    setWorkspaceOpen(true);
    setFeedback('');
  }

  async function finishVerification(item, state = wizardStateForItem(item)) {
    if (finishSavingId) return { ok: false, message: 'Verification is already finishing.' };
    setFinishSavingId(item.merchandiseId);
    setFeedback('');
    const blockers = state.blockers || visibleRequirementBlockers(item.readiness || []);
    const deliverables = normalizeDeliverableList(state.deliverables || item.deliverables);
    const stage = state.thr3dOnly && blockers.length === 0
      ? GATE_IDS.sendThr3d
      : blockers.length === 0 && state.photoDeliverables.length
        ? GATE_IDS.readyProduction
        : GATE_IDS.waitingInformation;
    try {
      const updated = await api.updateMerchandiseIntakeState(item.merchandiseId, {
        stage,
        deliverables,
        blockingRequirements: blockers.map(requirementLabelForUser),
      });
      await refreshV2WorkflowData();
      setSelectedId('');
      setWorkspaceOpen(false);
      const routedLabel = stage === GATE_IDS.sendThr3d
        ? 'Thr3d Shipping'
        : workflowGates.find(column => column.id === stage)?.label || 'Planning';
      const message = stage === GATE_IDS.waitingInformation
        ? `Verification saved. Still needed: ${blockers.map(requirementLabelForUser).join(', ') || 'more information'}.`
        : `Verification finished. Routed to ${routedLabel}.`;
      setFeedback(message);
      return { ok: true, message, stage, record: updated };
    } catch (error) {
      const missing = Array.isArray(error.payload?.missing) ? ` Missing: ${error.payload.missing.join(', ')}` : '';
      const message = `${error.message || 'Could not finish verification.'}${missing}`;
      setFeedback(message);
      return { ok: false, message };
    } finally {
      setFinishSavingId('');
    }
  }

  async function closeWorkflowWorkspace(item = selectedItem) {
    void item;
    setWorkspaceOpen(false);
  }

  if (entries.loading) return <div className="empty-state">Loading Planning board...</div>;
  if (entries.error) return <div className="error-state">{entries.error}</div>;

  return (
    <div className="work-board-page">
      <header className="work-board-header">
        <div>
          <h1>Planning</h1>
          <p>Resolve what is required to shoot and hand ready work to Production.</p>
        </div>
      </header>
      <div className="work-board-toolbar">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search merchandise..." aria-label="Search merchandise" />
        <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} aria-label="Client">
          <option value="">All clients</option>
          {clientOptions.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}
        </select>
        <select value={locationFilter} onChange={event => setLocationFilter(event.target.value)} aria-label="Storage Location">
          <option value="">All locations</option>
          {locationOptions.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}
        </select>
        <select value={ageFilter} onChange={event => setAgeFilter(event.target.value)} aria-label="Age">
          {MERCHANDISE_REVIEW_AGE_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
        <select value={workstreamFilter} onChange={event => setWorkstreamFilter(event.target.value)} aria-label="Workstream">
          <option value="">All workstreams</option>
          {WORKSTREAMS.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}
        </select>
        {feedback && <strong className={feedback.startsWith('Cannot') ? 'is-error' : 'is-success'}>{feedback}</strong>}
      </div>
      <KanbanBoard
        columns={workflowGates}
        itemsByColumn={itemsByColumn}
        selectedId={selectedId}
        onSelect={openWorkflowWorkspace}
        onMove={moveBoardItem}
      />
      {workspaceOpen && selectedItem ? (
        <NewReviewModal
          item={selectedItem}
          decision={selectedDecision}
          onDecisionChange={updateSelectedDecision}
          onFinish={finishVerification}
          onClose={closeWorkflowWorkspace}
          previousItem={previousSelectedItem}
          nextItem={nextSelectedItem}
          onSelectItem={openWorkflowWorkspace}
          onRefresh={refreshV2WorkflowData}
          photos={selectedPhotos}
          photoIndex={photoIndex}
          setPhotoIndex={setPhotoIndex}
          comments={Array.isArray(conversations[selectedItem.merchandiseId]) ? conversations[selectedItem.merchandiseId] : []}
          activity={Array.isArray(activityByMerchandise[selectedItem.merchandiseId]) ? activityByMerchandise[selectedItem.merchandiseId] : []}
          onAddComment={addConversationComment}
          onMarkCommentsRead={markCommentsRead}
        />
      ) : selectedItem ? (
        <WorkflowWorkspaceDrawer
          item={workspaceOpen ? selectedItem : null}
          onClose={closeWorkflowWorkspace}
          onMove={moveItemToGate}
          onSave={saveIntakeReadiness}
          onSaveContinue={saveIntakeReadinessAndContinue}
          onRelease={releaseIntakeItem}
          releaseBusy={selectedItem ? releaseSavingId === selectedItem.merchandiseId : false}
          onRefresh={refreshV2WorkflowData}
          feedback={feedback}
          override={selectedOverride}
          photos={selectedPhotos}
          photoIndex={photoIndex}
          setPhotoIndex={setPhotoIndex}
          nextItem={nextSelectedItem}
          readonly={selectedWorkspaceMode === 'readonly'}
        />
      ) : null}
    </div>
  );
}

// ── Auth ─────────────────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY = 'marks:auth';
const ROLE_PERMISSION_STORAGE_KEY = 'marks:role-permissions';
const ADMINISTRATION_PATH = '/admin';
const ADMINISTRATION_DEFAULT_PATH = '/admin/users';
const AVATARS = ['🦁','🐯','🦊','🐺','🐻','🐼','🦝','🦉','🦅','🦋','🐙','🦈','🐬','🦒','🦓','🦄','🐉','🌟','🎸','🍕'];

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)); } catch { return null; }
}
function saveAuth(u) { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u)); }
function clearAuth() { localStorage.removeItem(AUTH_STORAGE_KEY); }

const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

const ROLE_NAV = {
  Admin:        ['/dashboard', '/imports', '/shipments', '/merchandise', '/planning', '/products', '/jobs'],
  Producer:     ['/dashboard', '/imports', '/shipments', '/merchandise', '/planning', '/products', '/jobs'],
  Merch:        ['/shipments', '/merchandise'],
  'Merch Receiver': ['/shipments', '/merchandise'],
  Receiver:     ['/shipments', '/merchandise'],
  User:         ['/dashboard', '/shipments', '/merchandise', '/planning', '/products', '/jobs'],
  PM:           ['/dashboard', '/merchandise', '/planning', '/products', '/jobs'],
  Photographer: ['/dashboard', '/production', '/products', '/jobs'],
  Retoucher:    ['/dashboard', '/production', '/products', '/jobs'],
  Viewer:       ['/dashboard', '/merchandise', '/products'],
};
const ROLES = ['Admin', 'Producer', 'Merch', 'User', 'Viewer'];
const ADMIN_CARD_OPTIONS = [
  { id: 'users', label: 'Users', icon: '👤', description: 'Manage users, PINs, and client access.' },
  { id: 'roles', label: 'Roles', icon: '🔐', description: 'Manage role permissions and admin access.' },
  { id: 'system', label: 'System', icon: '⚙️', description: 'Review Airtable connection and backend configuration.' },
  { id: 'clients', label: 'Clients', icon: '🏷️', description: 'Review client defaults, identifiers, and requirements.' },
  { id: 'developer', label: 'Developer Tools', icon: '🛠️', description: 'Run local utilities and maintenance tools.' },
];
const DEFAULT_ADMIN_CARDS = {
  Admin: ADMIN_CARD_OPTIONS.map(card => card.id),
};
function defaultRolePermissions() {
  return Object.fromEntries(ROLES.map(role => [role, {
    paths: ROLE_NAV[role] || ROLE_NAV.User,
    adminCards: DEFAULT_ADMIN_CARDS[role] || [],
  }]));
}
function normalizeRolePermission(role, config, defaults) {
  if (isAdminRole(role)) {
    return {
      paths: ROLE_NAV.Admin,
      adminCards: DEFAULT_ADMIN_CARDS.Admin,
    };
  }
  return {
    ...defaults[role],
    ...(config || {}),
    paths: (config?.paths || defaults[role].paths)
      .map(path => path === '/settings' ? ADMINISTRATION_PATH : path)
      .map(path => path === '/administration' ? ADMINISTRATION_PATH : path)
      .map(path => path === '/verification' ? '/merchandise/review' : path)
      .map(path => path === '/merchandise-review-v2' || path === '/work' || path === '/intake' ? '/planning' : path)
      .map(path => path === '/receiving' || path === '/receipts' ? '/shipments' : path)
      .map(path => path === '/items' ? '/products' : path)
      .filter(path => path !== ADMINISTRATION_PATH)
      .filter((path, index, paths) => paths.indexOf(path) === index),
    adminCards: normalizeAdminCards(config?.adminCards || defaults[role].adminCards),
  };
}
function normalizeAdminCards(cards = []) {
  const next = new Set();
  cards.forEach(card => {
    if (card === 'users-roles') {
      next.add('users');
      next.add('roles');
      return;
    }
    next.add(card);
  });
  return ADMIN_CARD_OPTIONS.filter(card => next.has(card.id)).map(card => card.id);
}
function loadRolePermissions() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY));
    const defaults = defaultRolePermissions();
    return Object.fromEntries(ROLES.map(role => [role, normalizeRolePermission(role, saved?.[role], defaults)]));
  } catch {
    return defaultRolePermissions();
  }
}
function saveRolePermissions(value) { localStorage.setItem(ROLE_PERMISSION_STORAGE_KEY, JSON.stringify(value)); }
function adminCardsForRole(role, rolePermissions) {
  if (isAdminRole(role)) return DEFAULT_ADMIN_CARDS.Admin;
  return normalizeAdminCards(rolePermissions?.[role]?.adminCards || DEFAULT_ADMIN_CARDS[role] || []);
}
function roleHasAdminAccess(role, rolePermissions) {
  return adminCardsForRole(role, rolePermissions).length > 0;
}
function allowedPaths(role, rolePermissions) {
  const paths = isAdminRole(role) ? ROLE_NAV.Admin : rolePermissions?.[role]?.paths || ROLE_NAV[role] || ROLE_NAV.User;
  return paths.filter(path => path !== ADMINISTRATION_PATH);
}
function isAdminRole(role) { return ['Admin', 'Administrator'].includes(role); }
function userDisplayName(user) {
  return user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || user?.email || 'User';
}
function userFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || userDisplayName(user);
}

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
          <button className="login-back" onClick={() => setSelected(null)}>← Back</button>
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
  const [firstName, setFirstName] = useState(auth.firstName || '');
  const [lastName, setLastName] = useState(auth.lastName || '');
  const [email, setEmail] = useState(auth.email || '');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saved, setSaved] = useState('');

  async function saveProfile() {
    setSaving(true);
    try {
      const data = await api.updateCurrentUser({ avatar, displayName, firstName, lastName, email });
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
            <div className="user-form-grid">
              <div className="profile-field">
                <label>First Name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" placeholder="First name" />
              </div>
              <div className="profile-field">
                <label>Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" placeholder="Last name" />
              </div>
            </div>
            <div className="profile-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="email@example.com" />
            </div>
            <div className="profile-readonly-grid">
              <div>
                <span>Role</span>
                <strong>{auth.role || 'No role'}</strong>
              </div>
              <div>
                <span>Clients</span>
                <strong>{auth.allClients ? 'All clients' : auth.clientIds?.length ? `${auth.clientIds.length} assigned` : 'None assigned'}</strong>
              </div>
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

function clientAccessLabel(user, clients = []) {
  if (user?.allClients) return 'All clients';
  const ids = user?.clientIds || [];
  if (!ids.length) return 'No clients assigned';
  const names = ids.map(id => clients.find(client => client.id === id)?.name).filter(Boolean);
  if (!names.length) return `${ids.length} client${ids.length !== 1 ? 's' : ''}`;
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function PermissionPreview({ role, allClients, clientIds, clients = [], showClients = true }) {
  const { rolePermissions } = useAuth();
  const visible = NAV_ITEMS.filter(item => allowedPaths(role, rolePermissions).includes(item.path));
  const adminCards = adminCardsForRole(role, rolePermissions);
  return (
    <div className="permission-preview">
      <div>
        <span className="permission-preview-label">Visible navigation</span>
        <div className="permission-chip-row">
          {visible.map(item => <span key={item.path} className="permission-chip">{item.label}</span>)}
        </div>
      </div>
      {adminCards.length > 0 && (
        <div>
          <span className="permission-preview-label">Admin access</span>
          <div className="permission-list">
            {adminCards.map(cardId => <span key={cardId}>{ADMIN_CARD_OPTIONS.find(card => card.id === cardId)?.label || cardId}</span>)}
          </div>
        </div>
      )}
      {showClients && (
        <div>
          <span className="permission-preview-label">Accessible clients</span>
          <p>{allClients ? 'All clients' : clientAccessLabel({ clientIds }, clients)}</p>
        </div>
      )}
    </div>
  );
}

function UserFormModal({ user, clients, onSave, onClose }) {
  const { auth } = useAuth();
  const isNew = !user;
  const canAssignAdmin = isAdminRole(auth?.role);
  const roleOptions = canAssignAdmin ? ROLES : ROLES.filter(roleOption => !isAdminRole(roleOption));
  const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(user?.firstName || nameParts[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || nameParts.slice(1).join(' ') || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(roleOptions.includes(user?.role) ? user.role : 'Viewer');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [pin, setPin] = useState('');
  const [allClients, setAllClients] = useState(user?.allClients ?? false);
  const [clientIds, setClientIds] = useState(user?.clientIds || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (isNew && !firstName.trim()) { setError('First Name is required'); return; }
    if (isNew && !lastName.trim()) { setError('Last Name is required'); return; }
    if (isNew && pin.length < 4) { setError('Initial PIN is required'); return; }
    if (!canAssignAdmin && isAdminRole(role)) { setError('Only administrators can assign Admin access.'); return; }
    setSaving(true); setError('');
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || displayName.trim() || email.trim();
      const payload = { name, firstName: firstName.trim(), lastName: lastName.trim(),
        displayName: displayName.trim(), email: email.trim(), role, avatar, allClients, clientIds };
      if (pin) payload.pin = pin;
      const data = isNew ? await api.createUser(payload) : await api.updateUser(user.id, payload);
      onSave(data.user);
    } catch (e) { setError(e.message || 'Failed to save user.'); } finally { setSaving(false); }
  }

  function toggleClient(id) {
    setClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  return (
    <section className="user-form-panel">
      <div className="user-form-panel-header">
        <div>
          <h3>{isNew ? 'Add User' : 'Edit User'}</h3>
          <p>{isNew ? 'Create a user, assign a role, and set their initial PIN.' : 'Update profile details, role, clients, or reset their PIN.'}</p>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Close</button>
      </div>
      <form className="user-form-body user-form-body-inline" onSubmit={submit}>
        <div className="user-form-avatar-panel">
          <div className="user-form-avatar-row">
            <span className="profile-avatar-preview">{avatar || (displayName || firstName || email || '?')[0]}</span>
          </div>
          <div className="profile-avatar-grid">
            {AVATARS.map(a => (
              <button type="button" key={a} className={`profile-avatar-btn${a===avatar?' selected':''}`} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
        </div>
        <div className="user-form-main">
          <div className="user-form-grid">
            <div className="profile-field">
              <label>First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" placeholder="First name" required={isNew} />
            </div>
            <div className="profile-field">
              <label>Last Name *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" placeholder="Last name" required={isNew} />
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
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="profile-field">
              <label>{isNew ? 'Initial PIN (4 digits)' : 'Reset PIN (leave blank to keep)'}</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                className="form-input" placeholder="••••" />
            </div>
          </div>
          <PermissionPreview role={role} allClients={allClients} clientIds={clientIds} clients={clients} />
          <div className="profile-field">
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
          {error && <div className="error-state user-form-error">{error}</div>}
          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add User' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </form>
    </section>
  );
}

const WORKFLOW_STAGE_TYPES = ['start', 'active', 'waiting', 'blocked', 'complete', 'cancelled'];

function blankWorkflowTemplate() {
  return {
    id: '',
    name: '',
    description: '',
    active: true,
    default: false,
    version: 1,
    stages: [],
  };
}

function blankWorkflowStage(order = 10) {
  return {
    id: '',
    name: '',
    stageKey: '',
    displayOrder: order,
    colorToken: '',
    stageType: 'active',
    isComplete: false,
    isTerminal: false,
    active: true,
    description: '',
  };
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | user object
  const [viewMode, setViewMode] = useState('cards');
  const clients = useResource(() => api.listClients({ all: true }));
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
  const userExportColumns = [
    { header: 'User', value: user => userDisplayName(user) },
    { header: 'Email', value: user => user.email || '' },
    { header: 'Full Name', value: user => userFullName(user) },
    { header: 'Role', key: 'role' },
    { header: 'Clients', value: user => clientAccessLabel(user, clientList) },
    { header: 'Status', value: user => user.active ? 'Active' : 'Inactive' },
  ];

  return (
    <div className="users-section">
      <div className="users-section-header">
        <div>
          <h3>Users</h3>
        </div>
        <div className="users-section-actions">
          <ViewToggle value={viewMode} onChange={setViewMode} label="User view" />
          <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ Add User</button>
        </div>
      </div>
      {loading && <div className="empty-state">Loading users…</div>}
      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          clients={clientList}
          onSave={onSaveUser}
          onClose={() => setEditing(null)}
        />
      )}
      {!loading && viewMode === 'cards' && (
        <div className="users-card-grid">
          {users.map(u => (
            <article
              key={u.id}
              className={`user-card ${u.active ? '' : 'is-inactive'}`}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(u)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setEditing(u);
                }
              }}
            >
              <span className="user-card-avatar">{u.avatar || userDisplayName(u)[0]}</span>
              <span className="user-card-main">
                <strong>{userDisplayName(u)}</strong>
                <small>{u.email || userFullName(u)}</small>
              </span>
              <span className="user-card-meta">
                <span className="badge badge-neutral">{u.role || 'No role'}</span>
                <span>{clientAccessLabel(u, clientList)}</span>
              </span>
              <span className={`badge ${u.active ? 'badge-green' : 'badge-neutral'}`}>{u.active ? 'Active' : 'Inactive'}</span>
              <span className="user-card-actions" onClick={event => event.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(u)}>Edit</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleActive(u)}>
                  {u.active ? 'Deactivate' : 'Activate'}
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
      {!loading && viewMode === 'list' && (
        <>
        <DataTableToolbar>
          <ExcelExportButton
            filename={todayExportFilename('users')}
            columns={userExportColumns}
            rows={users}
            disabled={loading}
          />
        </DataTableToolbar>
        <div className="table-wrap users-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Clients</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <button className="user-list-person" type="button" onClick={() => setEditing(u)}>
                      <span className="user-card-avatar">{u.avatar || userDisplayName(u)[0]}</span>
                      <span>
                        <strong>{userDisplayName(u)}</strong>
                        <small>{u.email || userFullName(u)}</small>
                      </span>
                    </button>
                  </td>
                  <td><span className="badge badge-neutral">{u.role || 'No role'}</span></td>
                  <td>{clientAccessLabel(u, clientList)}</td>
                  <td><span className={`badge ${u.active ? 'badge-green' : 'badge-neutral'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="user-list-actions">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(u)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleActive(u)}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function RolesSection() {
  const { rolePermissions, setRolePermissions } = useAuth();
  function updateRole(role, updater) {
    if (isAdminRole(role)) return;
    setRolePermissions(current => {
      const base = current || defaultRolePermissions();
      const nextRole = updater(base[role] || { paths: [], adminCards: [] });
      const next = { ...base, [role]: nextRole };
      saveRolePermissions(next);
      return next;
    });
  }
  function togglePath(role, path) {
    updateRole(role, config => {
      const paths = config.paths || [];
      const nextPaths = paths.includes(path) ? paths.filter(item => item !== path) : [...paths, path];
      return { ...config, paths: nextPaths };
    });
  }
  function toggleAdminCard(role, cardId) {
    updateRole(role, config => {
      const adminCards = config.adminCards || [];
      const nextAdminCards = adminCards.includes(cardId)
        ? adminCards.filter(item => item !== cardId)
        : [...adminCards, cardId];
      return { ...config, adminCards: nextAdminCards };
    });
  }
  return (
    <section className="roles-section">
      <div className="users-section-header">
        <div>
          <h3>Roles</h3>
        </div>
      </div>
      <div className="role-card-grid">
        {ROLES.map(role => (
          <article key={role} className="role-card">
            <div className="role-card-header">
              <strong>{role}</strong>
            </div>
            <div className="role-edit-block">
              <span className="permission-preview-label">Can see</span>
              <div className="role-toggle-grid">
                {NAV_ITEMS.map(item => (
                  <label key={item.path} className="role-toggle">
                    <input
                      type="checkbox"
                      checked={isAdminRole(role) || allowedPaths(role, rolePermissions).includes(item.path)}
                      onChange={() => togglePath(role, item.path)}
                      disabled={isAdminRole(role)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="role-edit-block">
              <span className="permission-preview-label">Admin access</span>
              <div className="role-toggle-grid">
                  {ADMIN_CARD_OPTIONS.map(card => (
                    <label key={card.id} className="role-toggle">
                      <input
                        type="checkbox"
                        checked={isAdminRole(role) || adminCardsForRole(role, rolePermissions).includes(card.id)}
                        onChange={() => toggleAdminCard(role, card.id)}
                        disabled={isAdminRole(role)}
                      />
                    {card.label}
                  </label>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdministrationPage() {
  const { auth, rolePermissions } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const adminCards = adminCardsForRole(auth?.role, rolePermissions);
  const availableCards = ADMIN_CARD_OPTIONS.filter(card => adminCards.includes(card.id));
  const sectionSlug = location.pathname.startsWith('/clients')
    ? 'clients'
    : location.pathname.startsWith('/settings')
      ? 'system'
      : location.pathname.split('/')[2] || availableCards[0]?.id || 'users';
  const activeCard = availableCards.find(card => card.id === sectionSlug) || availableCards[0];

  useEffect(() => {
    if (activeCard && sectionSlug !== activeCard.id && location.pathname.startsWith(ADMINISTRATION_PATH)) {
      routerNavigate(`${ADMINISTRATION_PATH}/${activeCard.id}`, { replace: true });
    }
  }, [activeCard, location.pathname, routerNavigate, sectionSlug]);

  function renderActiveCard() {
    if (!activeCard) return <div className="empty-state">No Administration sections assigned.</div>;
    if (activeCard.id === 'users') return <UsersSection />;
    if (activeCard.id === 'roles') return <RolesSection />;
    return <SettingsPage cards={[activeCard.id]} />;
  }

  if (!availableCards.length) {
    return (
      <div className="empty-state">
        Administrator access required.
      </div>
    );
  }

  return (
    <div className="administration-page">
      <div className="admin-section-nav" aria-label="Administration sections">
        {availableCards.map(card => (
          <button
            type="button"
            key={card.id}
            className={`admin-section-tab ${activeCard?.id === card.id ? 'is-active' : ''}`}
            onClick={() => routerNavigate(card.id === 'clients' ? '/clients' : `${ADMINISTRATION_PATH}/${card.id}`)}
          >
            <span aria-hidden="true">{card.icon}</span>
            {card.label}
          </button>
        ))}
      </div>

      <div className="admin-active-section">
        {renderActiveCard()}
      </div>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Icon.Dashboard /> },
  { path: '/imports', label: 'Import', icon: <Icon.NavImport /> },
  { path: '/shipments', label: 'Receiving', icon: <Icon.NavReceiving /> },
  { path: '/merchandise', label: 'Merchandise', icon: <Icon.NavMerchandise /> },
  { path: '/planning', label: 'Planning', icon: <Icon.NavWork /> },
  { path: '/jobs', label: 'Jobs', icon: <Icon.NavJobs /> },
  { path: '/products', label: 'Products', icon: <Icon.NavProducts /> },
];

const ADMIN_NAV_ITEM = { path: ADMINISTRATION_DEFAULT_PATH, label: 'Admin', icon: <Icon.Settings /> };

function routeForPage(page, params = {}) {
  const query = new URLSearchParams();
  if (params.jobId) query.set('jobId', params.jobId);
  if (params.queue) query.set('queue', params.queue);
  if (params.importId) query.set('importId', params.importId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const routes = {
    dashboard: '/dashboard',
    imports: '/imports',
    intake: '/planning',
    'import-history': `/imports/history${suffix}`,
    receiving: '/shipments',
    shipments: '/shipments',
    receipts: '/shipments',
    'receiving-receipts': '/shipments',
    merchandise: '/merchandise',
    verification: '/merchandise/review',
    'merchandise-review': '/merchandise/review',
    'merchandise-review-v2': '/planning',
    work: '/planning',
    planning: '/planning',
    production: '/production',
    items: `/products${suffix}`,
    products: `/products${suffix}`,
    skus: `/products${suffix}`,
    jobs: '/jobs',
    'new-job': '/jobs/new',
    clients: '/clients',
    settings: `${ADMINISTRATION_PATH}/system`,
    admin: ADMINISTRATION_DEFAULT_PATH,
    administration: ADMINISTRATION_DEFAULT_PATH,
  };
  return routes[page] || '/dashboard';
}

function pageTitleForPath(pathname) {
  if (pathname === '/imports/history') return 'Import History';
  if (pathname.startsWith('/imports')) return 'Imports';
  if (pathname.startsWith('/shipments')) return DOMAIN_TERMS.shipments;
  if (pathname.startsWith('/receiving') || pathname.startsWith('/receipts')) return DOMAIN_TERMS.shipments;
  if (pathname.startsWith('/merchandise/review')) return DOMAIN_TERMS.merchandiseReview;
  if (pathname.startsWith('/planning') || pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2')) return 'Planning';
  if (pathname === '/merchandise') return DOMAIN_TERMS.merchandise;
  if (pathname.startsWith('/verification')) return DOMAIN_TERMS.merchandiseReview;
  if (pathname.startsWith('/production')) return 'Production';
  if (pathname.startsWith('/products')) return DOMAIN_TERMS.products;
  if (pathname.startsWith('/items')) return DOMAIN_TERMS.products;
  if (pathname === '/jobs/new') return 'New Job';
  if (pathname.startsWith('/jobs')) return 'Jobs';
  if (pathname.startsWith('/clients')) return 'Clients';
  if (pathname.startsWith('/admin')) return 'Admin';
  if (pathname.startsWith('/administration')) return 'Admin';
  if (pathname.startsWith('/settings')) return 'Admin';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'Not Found';
}

function RouteProductsPage({ navigate }) {
  const [searchParams] = useSearchParams();
  return (
    <ProductsPage
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

function isPrimaryNavActive(item, pathname) {
  if (item.path === '/dashboard') return pathname === '/dashboard';
  if (item.path === '/imports') return pathname.startsWith('/imports');
  if (item.path === '/shipments') return pathname.startsWith('/shipments') || pathname.startsWith('/receiving') || pathname.startsWith('/receipts');
  if (item.path === '/merchandise') return pathname === '/merchandise';
  if (item.path === '/planning') return pathname.startsWith('/planning') || pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2');
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function isTopNavVisible(item, allowed) {
  return allowed.includes(item.path) || (item.aliases || []).some(path => allowed.includes(path));
}

function ProductionPage() {
  return (
    <div className="page-stack shell-workspace-page">
      <WorkspaceHeader
        title="Production"
        description="Track where active merchandise is in production."
      />
      <WorkspaceLayout
        queue={<QueuePanel title="Production Queue" empty="Production queues are not connected yet." />}
        inspector={<InspectorPanel title="Production Inspector" />}
      >
        <EmptyState title="Production workspace not implemented yet.">
          This shell is ready for photography, THR3D routing, and disposition work in a later phase.
        </EmptyState>
      </WorkspaceLayout>
    </div>
  );
}

function TopNavigation({
  items,
  adminItem,
  showAdmin,
  location,
  mobileOpen,
  setMobileOpen,
  profileMenuOpen,
  setProfileMenuOpen,
  onOpenProfile,
  onSignOut,
  auth,
}) {
  const showAdminShortcut = showAdmin && !items.some(item => item.path === adminItem?.path);
  const primaryNav = (
    <nav className="topbar-primary-nav" aria-label="Primary navigation">
      {items.map(item => {
        const isActive = isPrimaryNavActive(item, location.pathname);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`topbar-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <button
          type="button"
          className="topbar-menu-button"
          aria-label="Open navigation"
          aria-controls="mobile-primary-navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Icon.Menu />
        </button>
        <img src="/marks-logo.png" alt="Marks Photo" className="topbar-brand-logo" />
        <span className="topbar-brand-name">Marks Photo</span>
      </div>

      <div className="topbar-desktop-nav">
        {primaryNav}
        {showAdminShortcut && (
          <NavLink
            to={adminItem.path}
            className={({ isActive }) => `topbar-admin-link ${isActive || location.pathname.startsWith('/admin') || location.pathname.startsWith('/administration') || location.pathname.startsWith('/clients') ? 'active' : ''}`}
          >
            {adminItem.icon}
            <span>{adminItem.label}</span>
          </NavLink>
        )}
      </div>

      <div className="topbar-user-area">
        <button
          type="button"
          className="topbar-profile-button"
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen}
          onClick={() => setProfileMenuOpen(open => !open)}
        >
          <span className="topbar-user-avatar" aria-hidden="true">{auth?.avatar || userDisplayName(auth)[0] || 'M'}</span>
          <span className="topbar-user-copy">
            <strong>{userDisplayName(auth)}</strong>
            <small>{auth?.role || 'User'}</small>
          </span>
        </button>
        {profileMenuOpen && (
          <div className="topbar-user-popover" role="menu">
            <button type="button" role="menuitem" onClick={onOpenProfile}>Profile</button>
            {showAdminShortcut && (
              <NavLink to={ADMINISTRATION_DEFAULT_PATH} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                Admin
              </NavLink>
            )}
            <button type="button" role="menuitem" onClick={onSignOut}>Sign Out</button>
          </div>
        )}
      </div>

      {mobileOpen && (
        <>
          <button type="button" className="topbar-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <div className="topbar-mobile-panel" id="mobile-primary-navigation">
            <div className="topbar-mobile-header">
              <strong>Marks Photo</strong>
              <button type="button" className="topbar-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <Icon.Close />
              </button>
            </div>
            {primaryNav}
            {showAdmin && (
              <NavLink
                to={adminItem.path}
                className={({ isActive }) => `topbar-admin-link ${isActive || location.pathname.startsWith('/admin') || location.pathname.startsWith('/administration') || location.pathname.startsWith('/clients') ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {adminItem.icon}
                <span>{adminItem.label}</span>
              </NavLink>
            )}
          </div>
        </>
      )}
    </header>
  );
}

function AppLayout() {
  const { auth, setAuth, rolePermissions } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigate = (page, params = {}) => routerNavigate(routeForPage(page, params));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const allowed = auth ? allowedPaths(auth.role, rolePermissions) : allowedPaths('User', rolePermissions);
  const visibleNav = NAV_ITEMS.filter(item => isTopNavVisible(item, allowed));
  const hasAdminAccess = auth ? roleHasAdminAccess(auth.role, rolePermissions) : false;

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    document.body.classList.add('mobile-nav-open');
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('mobile-nav-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  async function signOut() {
    try { await api.logoutUser(); } catch { /* session may already be gone */ }
    clearAuth();
    setAuth(null);
  }

  return (
    <div className={`app-shell app-shell-topnav ${mobileNavOpen ? 'mobile-nav-is-open' : ''}`}>
      <TopNavigation
        items={visibleNav}
        adminItem={ADMIN_NAV_ITEM}
        showAdmin={hasAdminAccess}
        location={location}
        mobileOpen={mobileNavOpen}
        setMobileOpen={setMobileNavOpen}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        onOpenProfile={() => {
          setProfileMenuOpen(false);
          setProfileOpen(true);
        }}
        onSignOut={signOut}
        auth={auth}
      />
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      <main className="main">
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard navigate={navigate} />} />
            <Route path="/imports" element={<IntakePage navigate={navigate} />} />
            <Route path="/imports/history" element={<RouteImportHistoryPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/receiving" element={<Navigate to="/shipments" replace />} />
            <Route path="/receipts" element={<Navigate to="/shipments" replace />} />
            <Route path="/verification" element={<Navigate to="/merchandise/review" replace />} />
            <Route path="/merchandise" element={<MerchandiseInventoryPage navigate={navigate} />} />
            <Route path="/merchandise/review" element={<MerchandiseReviewPage />} />
            <Route path="/planning" element={<MerchandiseReviewV2Page />} />
            <Route path="/intake" element={<Navigate to="/planning" replace />} />
            <Route path="/work" element={<Navigate to="/planning" replace />} />
            <Route path="/merchandise-review-v2" element={<Navigate to="/planning" replace />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/products" element={<RouteProductsPage navigate={navigate} />} />
            <Route path="/items" element={<Navigate to="/products" replace />} />
            <Route path="/jobs" element={<JobsPage navigate={navigate} />} />
            <Route path="/jobs/new" element={<NewJobPage navigate={navigate} />} />
            <Route path="/clients" element={<AdministrationPage />} />
            <Route path="/settings" element={<Navigate to={`${ADMINISTRATION_PATH}/system`} replace />} />
            <Route path="/admin" element={<Navigate to={ADMINISTRATION_DEFAULT_PATH} replace />} />
            <Route path="/admin/:section" element={<AdministrationPage />} />
            <Route path="/administration" element={<Navigate to={ADMINISTRATION_DEFAULT_PATH} replace />} />
            <Route path="/administration/:section" element={<AdministrationPage />} />
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
  const [rolePermissions, setRolePermissions] = useState(loadRolePermissions);

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
    <AuthContext.Provider value={{ auth, setAuth, rolePermissions, setRolePermissions }}>
      <BrowserRouter>
        {auth ? <AppLayout /> : <LoginScreen onLogin={setAuth} />}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
