import React, { Component, useState, useEffect, useCallback, useRef, createContext, useContext, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Camera,
  Check,
  SquarePen,
  ChevronDown,
  ChevronUp,
  Columns3,
  ClipboardList,
  Download as DownloadIcon,
  Filter as FilterIcon,
  GripVertical,
  Group as GroupIcon,
  Images,
  LayoutGrid,
  Layers,
  MessageSquare,
  PackageOpen,
  RefreshCw,
  Rotate3d,
  Tag,
  Trash2,
  X,
  } from 'lucide-react';
  import { api } from './api';
  import { Select as FormSelect } from './design-system.jsx';
  import { DOMAIN_TERMS, getFieldLabel, technicalTableLabel } from './domainVocabulary';
  import { exportTableToXlsx, todayExportFilename } from './tableExport';
  import {
  MERCHANDISE_PLANNING_BOARD,
  QUEUE_IDS,
  DELIVERABLE_ROUTES,
  WORKSPACE_SECTIONS,
  buildPlanningCard,
  evaluateMerchandiseReviewAssignment,
  evaluateMerchandiseReviewRequirements,
  deliverableRouteFromLegacyValue,
  deliverableRouteLabel,
  planningBoardForClient,
  workspaceModeForQueue,
} from './merchandiseRouting';
import './styles.css';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught Marks Photo UI error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <strong>Marks Photo hit a display error.</strong>
          <span>{this.state.error?.message || 'Unknown interface error.'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  NavShipments: () => <PackageOpen size={20} strokeWidth={1.5} />,
  NavMerchandise: () => <ClipboardList size={20} strokeWidth={1.5} />,
  NavWork: () => <Columns3 size={20} strokeWidth={1.5} />,
  NavProduction: () => <LayoutGrid size={20} strokeWidth={1.5} />,
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

// Outlook cannot be handed HTML through a mailto:, so the draft carries a plain
// reading of the same email. The formatted copy action exists for the table,
// which is the one thing this rendering loses.
function photoReleaseEmailText(html) {
  return String(html || '')
    .replace(/<\/(p|div|ul|table|thead|tbody)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '  - ')
    .replace(/<\/(th|td)>/gi, '\t')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Addressed and titled, with no body: a mailto: cannot carry the formatting, so
// the body arrives by paste. The subject rides here rather than in the copied
// block, where it would land inside the message instead of on it.
function photoReleaseMailtoUrl({ subject = '', recipients = [] } = {}) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  return `mailto:${encodeURIComponent(recipients.join(','))}?${params.toString().replace(/\+/g, '%20')}`;
}

function escapeEmailHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The sent email is built from the same inputs the preview renders, so the two
// cannot drift. It differs in one deliberate way: the preview marks missing
// values with red placeholders to help the author, and an email that goes to a
// vendor must never contain them. Release validation already requires those
// values, so a complete release renders identically.
function buildPhotoReleaseEmail({
  clientName = 'Client',
  label = 'Photo',
  heading = '',
  projectName = '',
  itemRows = [],
  lines = [],
  columns = [],
  showArtworkPath = false,
  showUploadLocation = false,
  pathPrefixes = {},
  resolvePath = (value) => String(value || '').trim(),
  notes = '',
  deliverables = [],
}) {
  const subject = `${clientName} ${label} Photo Request - ${projectName}`.trim();
  const text = value => escapeEmailHtml(String(value ?? '').trim());
  const rowLabel = (row, index) => text(row.description) || `Item ${index + 1}`;
  const link = (value, prefix) => {
    const path = resolvePath(value, prefix);
    return path ? `<a href="${escapeEmailHtml(path)}" style="color:#2563eb;text-decoration:underline;">${escapeEmailHtml(path)}</a>` : '';
  };

  // Inlined from the preview's own CSS (.activation-email-preview-body and
  // friends), because mail clients strip stylesheets. Values are green and the
  // SKU table is the yellow block for the same reason they are on screen: this
  // is the email the user approved, not a plainer relative of it.
  const VALUE = 'color:#166534;';
  const P = 'margin:0 0 14px;';
  const UL = 'margin:0 0 18px 22px;padding:0;';
  const CELL = 'padding:5px 7px;border:1px solid #8b8f99;font-size:13px;line-height:1.2;text-align:center;';

  const parts = [];
  if (heading) parts.push(`<p style="${P}"><strong>${text(heading)}</strong></p>`);
  if (itemRows.length) {
    parts.push(`<ul style="${UL}">${itemRows.map((row, index) => {
      const cvid = deliverables.includes('Ecomm') && String(row.cvid || '').trim() ? ` ${text(row.cvid)}` : '';
      return `<li><span style="${VALUE}">${rowLabel(row, index)}${cvid}</span> - 1 SKU</li>`;
    }).join('')}</ul>`);
  }
  if (lines.length) {
    parts.push(`<p style="${P}">${lines
      .map(line => `<strong>${text(line.label)}:</strong> <span style="${VALUE}">${text(line.value)}</span>`)
      .join('<br />')}</p>`);
  }
  const pathSection = (title, field, prefix) => {
    const entries = itemRows
      .map((row, index) => ({ label: rowLabel(row, index), href: link(row[field], prefix) }))
      .filter(entry => entry.href);
    if (!entries.length) return;
    parts.push(`<p style="margin:18px 0 6px;"><strong>${title}:</strong></p><ul style="${UL}">${entries
      .map(entry => `<li><span style="${VALUE}">${entry.label}</span>: ${entry.href}</li>`).join('')}</ul>`);
  };
  if (showArtworkPath) pathSection('Path to artwork', 'artworkPath', pathPrefixes.artwork);
  if (showUploadLocation) pathSection('Location for image uploads', 'uploadLocation', pathPrefixes.upload);
  if (columns.length && itemRows.length) {
    parts.push(`<p style="margin:0 0 6px;"><strong>Sku Details</strong></p>`
      + `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:2px 0 18px;border-collapse:collapse;background:#fffec7;">`
      + `<thead><tr>${columns.map(column =>
        `<th style="${CELL}background:#ffffff;color:#111827;font-weight:900;text-transform:uppercase;">${text(column.label)}</th>`).join('')}</tr></thead>`
      + `<tbody>${itemRows.map(row => `<tr>${columns
        .map(column => `<td style="${CELL}${VALUE}">${text(column.getValue(row))}</td>`).join('')}</tr>`).join('')}</tbody>`
      + `</table>`);
  }
  parts.push(`<p style="${P}">${text(notes) || 'Once completed, please send for review/approval. Thanks!'}</p>`);

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.36;color:#111827;">`
    + parts.join('')
    + `</div>`;
  return { subject, html };
}

const ECOMM_WALNUT_SCOPE = 'Full set renders - WALNUT (PHOTO)';
const PACKAGING_WALNUT_SCOPE = 'Packaging Shots';
const DEFAULT_WALNUT_SCOPE_SUGGESTIONS = [ECOMM_WALNUT_SCOPE, PACKAGING_WALNUT_SCOPE];

// The scope follows the deliverable, so the release opens on the right one
// instead of making the user pick the only sensible value every time.
function defaultWalnutScope(deliverableType) {
  return deliverableType === 'Packaging' ? PACKAGING_WALNUT_SCOPE : ECOMM_WALNUT_SCOPE;
}
const DEFAULT_STRUCTURE_SUGGESTIONS = ['Hang Tag / Label', 'On Product (Label)'];
const DEFAULT_DUE_URGENCY_SUGGESTIONS = [];

function normalizeSuggestionText(value) {
  const text = String(value || '').trim();
  if (['full set renders', 'full set renders - walnut (photo)'].includes(text.toLowerCase())) return DEFAULT_WALNUT_SCOPE_SUGGESTIONS[0];
  return text;
}

function textSuggestions(values = [], defaults = []) {
  const seen = new Set();
  return [...defaults, ...values]
    .map(normalizeSuggestionText)
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function activationFieldSuggestions(records = [], field, defaults = []) {
  return textSuggestions((records || []).map(record => record?.[field]), defaults);
}

function activationSkuFieldSuggestions(records = [], field, defaults = []) {
  const values = (records || []).flatMap(record => (
    Array.isArray(record?.skuDetails)
      ? record.skuDetails.map(row => row?.[field])
      : []
  ));
  return textSuggestions(values, defaults);
}

function ActivationFieldLabel({ children, required = false, value, detail = '' }) {
  const complete = String(value || '').trim();
  const stateClass = required ? (complete ? 'is-complete' : 'is-required') : '';
  return (
    <span className={`activation-field-label ${stateClass}`.trim()}>
      <span className="activation-field-label-main">
        {children}
        {required && <span className="activation-required-mark" aria-hidden="true">*</span>}
      </span>
      {detail && <small className="activation-field-label-detail">{detail}</small>}
    </span>
  );
}

function SuggestiveTextInput({ label, value, onChange, placeholder = '', suggestions = [], className = '', showDropdownButton = false, required = false }) {
  const [open, setOpen] = useState(false);
  const inputId = useRef(`suggestive-input-${Math.random().toString(16).slice(2)}`).current;
  const listId = `${inputId}-options`;
  const query = String(value || '').trim().toLowerCase();
  const visibleSuggestions = suggestions
    .filter(suggestion => {
      const text = String(suggestion || '').trim();
      if (!text) return false;
      if (query && text.toLowerCase() === query) return false;
      return !query || text.toLowerCase().includes(query);
    })
    .slice(0, 6);

  return (
    <label className={`suggestive-text-field ${className}`.trim()}>
      <ActivationFieldLabel required={required} value={value}>{label}</ActivationFieldLabel>
      <input
        id={inputId}
        className="form-input"
        value={value}
        onChange={event => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={visibleSuggestions.length ? listId : undefined}
        aria-expanded={open && visibleSuggestions.length > 0}
      />
      {showDropdownButton && suggestions.length > 0 && (
        <button
          type="button"
          className="suggestive-text-toggle"
          aria-label={`Show ${label} suggestions`}
          aria-expanded={open && visibleSuggestions.length > 0}
          onMouseDown={event => event.preventDefault()}
          onClick={() => setOpen(current => !current)}
        >
          <span aria-hidden="true">&#9662;</span>
        </button>
      )}
      {open && visibleSuggestions.length > 0 && (
        <div className="suggestive-text-options" id={listId} role="listbox">
          {visibleSuggestions.map(suggestion => (
            <button
              type="button"
              role="option"
              key={suggestion}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onChange(suggestion);
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </label>
  );
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
                <span className={`subnav-count ${item.countTone ? `is-${item.countTone}` : ''}`}>{item.count}</span>
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
const APP_TIME_ZONE = 'America/Chicago';
const RECENT_COMMENT_WINDOW_MS = 4 * 60 * 60 * 1000;

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: APP_TIME_ZONE });
}

function formatCentralDateTime(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { timeZone: APP_TIME_ZONE, ...options });
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

function RequiredToShootBadge({ requiredToShoot }) {
  if (!requiredToShoot) return null;
  const tone = requiredToShoot.state === 'ready_for_photo'
    ? 'badge-green'
    : requiredToShoot.state === 'merchandise_issue'
      ? 'badge-red'
      : 'badge-amber';
  return <span className={`badge ${tone}`}>{requiredToShoot.label}</span>;
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
    description: 'Products waiting for required merchandise to be received or identified.',
    empty: 'No products waiting for merchandise.',
    matches: item => isOpenFoodHubItem(item) && item.requiredToShoot?.state === 'waiting_for_merchandise',
  },
  {
    id: 'merchandise_issues',
    title: 'Merchandise Issues',
    description: 'Products blocked by unresolved merchandise issues.',
    empty: 'No unresolved merchandise issues.',
    matches: item => isOpenFoodHubItem(item) && item.requiredToShoot?.state === 'merchandise_issue',
  },
  {
    id: 'missing_data',
    title: 'Missing Critical Data',
    description: 'Products missing Required to Shoot client data.',
    empty: 'No products missing critical data.',
    matches: item => isOpenFoodHubItem(item) && item.requiredToShoot?.state === 'missing_data',
  },
  {
    id: 'missing_artwork',
    title: 'Missing Required Artwork',
    description: 'Products waiting for artwork required by the client.',
    empty: 'No products missing required artwork.',
    matches: item => isOpenFoodHubItem(item) && item.requiredToShoot?.state === 'missing_artwork',
  },
  {
    id: 'ready_for_photo',
    title: 'Awaiting Photo Release',
    description: 'Products ready for final release to Creative Force.',
    empty: 'No products awaiting photo release.',
    matches: item => isOpenFoodHubItem(item) && item.requiredToShoot?.state === 'ready_for_photo',
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

function getPrimaryMatchKeyLabel({ client, clientId, record, clients = [], allClients = false } = {}) {
  if (allClients) return DOMAIN_TERMS.primaryMatchKey;
  const resolvedClient = client
    || (clientId ? clients.find(c => c.id === clientId) : null)
    || (record?.clientIds?.length === 1 ? clients.find(c => c.id === record.clientIds[0]) : null);
  return resolvedClient?.primaryMatchKeyLabel || resolvedClient?.identifierLabel || DOMAIN_TERMS.primaryMatchKey;
}

function clientProductIdLabel(client = {}) {
  const configured = String(client.primaryMatchKeyLabel || client.identifierLabel || '').trim();
  if (configured && !/^primary match key$|^identifier$/i.test(configured)) return configured;
  return String(client.codeType || '').toUpperCase() === 'UPC-12' || String(client.name || '').toLowerCase() === 'topco'
    ? 'UPC'
    : 'Product ID';
}

const getIdentifierLabel = getPrimaryMatchKeyLabel;

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
  const bottlenecked = skuList.filter(s => isOpenFoodHubItem(s) && ['waiting_for_merchandise','merchandise_issue','missing_data','missing_artwork'].includes(s.requiredToShoot?.state)).length;
  const readyToShoot = queueCounts['ready_for_photo'] ?? 0;
  const inCF         = queueCounts['in_creative_force'] ?? 0;
  const completed    = queueCounts['completed'] ?? 0;

  // The 3 production blockers producers care about
  const needsMerch   = skuList.filter(s => isOpenFoodHubItem(s) && ['waiting_for_merchandise','merchandise_issue'].includes(s.requiredToShoot?.state));
  const needsData    = skuList.filter(s => isOpenFoodHubItem(s) && s.requiredToShoot?.state === 'missing_data');
  const needsArtwork = skuList.filter(s => isOpenFoodHubItem(s) && s.requiredToShoot?.state === 'missing_artwork');

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

  // Shipments logged by the merchandise team and awaiting Merchandise Review.
  const reviewReceipts = receiptList
    .filter(r => (r.entries ?? []).length > 0)
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
  const newlyReceivedMerch = receiptList
    .flatMap(receipt => (receipt.entries ?? [])
      .map(entry => {
        const receivedAt = entry.dateReceived || entry.received || receipt.receivedDate || receipt.received || '';
        const client = clientMap[entry.clientIds?.[0] || receipt.clientIds?.[0]];
        const location = entry.locationId ? locationMap[entry.locationId] : null;
        const planningBoard = planningBoardForClient(entry.clientIds?.[0] || receipt.clientIds?.[0]);
        const planningCard = evaluateMerchandiseReviewAssignment(entry, {
          requestedQueueId: intakeRequestedQueueForRecord(entry),
          client,
          planningBoard,
        });
        const card = buildPlanningCard(entry, { assignment: planningCard, client, location });
        const columnId = queueIdForPlanningStatus(
          entry.planningStatus || planningStatusFromLegacyQueue(intakeRequestedQueueForRecord(entry)),
        );
        return {
          ...card,
          record: entry,
          id: entry.id,
          merchandiseId: entry.id,
          shipmentId: receipt.id,
          columnId,
          receivedAt,
          clientName: client?.name || 'Unknown client',
          title: card.title || receivingEntryLabel(entry),
          identifier: card.identifier || receivingEntrySku(entry),
          daysAgo: receivedAt ? Math.max(0, Math.floor((today - new Date(receivedAt)) / 86400000)) : null,
          photoRecord: recordPhotoUrl(entry) ? entry : receipt,
          matched: (entry.itemIds || []).length > 0 || Boolean(entry.linkedItem?.id),
        };
      }))
    .filter(entry => releaseSectionForPlanningItem(entry) === 'needsReview')
    .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0))
    .slice(0, 6);

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

      {!receipts.loading && newlyReceivedMerch.length > 0 && (
        <div className="dash-card">
          <div className="dash-section-title-row">
            <span>Newly Received Merch</span>
            <button type="button" className="dash-section-link" onClick={() => navigate('planning')}>Open Planning</button>
          </div>
          <div className="dash-new-merch-grid">
            {newlyReceivedMerch.map(entry => {
              const thumb = recordPhotoUrl(entry.photoRecord);
              return (
                <button type="button" className="dash-new-merch-card" key={entry.id || `${entry.shipmentId}-${entry.title}`} onClick={() => navigate('planning')}>
                  <span className="dash-new-merch-thumb">
                    {thumb ? <img src={thumb} alt="" /> : <span />}
                    <em>New</em>
                  </span>
                  <span className="dash-new-merch-copy">
                    <small>{entry.clientName}</small>
                    <strong>{entry.title}</strong>
                    {entry.identifier && <span>{DOMAIN_TERMS.merchandiseIdentifier} {entry.identifier}</span>}
                    <b className={entry.matched ? 'is-matched' : 'is-unmatched'}>{entry.matched ? 'Matched' : 'Unmatched'}</b>
                  </span>
                  <span className="dash-new-merch-age">{entry.daysAgo !== null ? `${entry.daysAgo}d` : 'New'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          {skuList.filter(s => isOpenFoodHubItem(s) && s.requiredToShoot?.state === 'ready_for_photo').map(s => {
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
          <div className="dash-card-title">Product Readiness Overview</div>
          <div className="dash-tile-grid">
            {DASHBOARD_QUEUES.map(q => (
              <div key={q.id} className="dash-tile"
                style={{ borderLeftColor: QUEUE_COLORS[q.id] }}
                onClick={() => navigate('skus')}>
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
                <span></span><span>Shipment Logged</span><span>Client</span><span>Merchandise</span><span>Quantity</span><span>Days Ago</span>
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
              <span><RequiredToShootBadge requiredToShoot={s.requiredToShoot} /></span>
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

// ── Shipments page ───────────────────────────────────────────────────────────
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

function itemMatchMethod(item) {
  const value = itemMatchIdentifierValue(item);
  const label = String(item?.primaryMatchKeyLabel || item?.identifierLabel || item?.codeType || '').toLowerCase();
  if (label.includes('upc') || /^\d{8,14}$/.test(String(value || ''))) return 'UPC';
  return 'Product ID';
}

function itemProductIdentifierText(item) {
  const value = itemMatchIdentifierValue(item);
  if (!value) return 'No UPC / ID on Product';
  return `Product ${itemMatchMethod(item)}: ${value}`;
}

function compactMatchValue(value) {
  return String(value || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function matchValuesConflict(observedValue, productValue) {
  const observed = compactMatchValue(observedValue);
  const product = compactMatchValue(productValue);
  if (!observed || !product || observed === product) return false;
  return true;
}

function itemMatchConfidenceBadge(item, identifierQuery = '') {
  if (item?.matchBasis === 'both-upc') return 'Possible';
  if (item?.matchBasis === 'both-product-id') return 'Possible';
  if (!['upc', 'product-id'].includes(item?.matchBasis)) return '';
  const expected = compactMatchValue(itemMatchIdentifierValue(item));
  const observed = compactMatchValue(identifierQuery);
  if (expected && observed && expected === observed) return 'Exact';
  return item.matchBasis === 'upc' ? 'UPC prefix' : 'ID prefix';
}

function itemHasExactIdentifierMatch(item, identifierQuery = '') {
  const expected = compactMatchValue(itemMatchIdentifierValue(item));
  const observed = compactMatchValue(identifierQuery);
  return Boolean(expected && observed && expected === observed);
}

function itemIdentifierBasis(item, prefix = '') {
  const method = itemMatchMethod(item) === 'UPC' ? 'upc' : 'product-id';
  return prefix ? `${prefix}-${method}` : method;
}

function combineIdentifierAndNameMatches(identifierRecords = [], nameRecords = [], identifierQuery = '') {
  const nameIds = new Set(nameRecords.map(item => item.id));
  const exactIdentifierMatches = identifierRecords.filter(item => itemHasExactIdentifierMatch(item, identifierQuery));
  if (exactIdentifierMatches.length > 0) {
    return exactIdentifierMatches.map(item => ({ ...item, matchBasis: itemIdentifierBasis(item) }));
  }
  return identifierRecords
    .filter(item => nameIds.has(item.id))
    .map(item => ({ ...item, matchBasis: itemIdentifierBasis(item, 'both') }));
}

function ProductMatchCard({
  changeLabel = 'Change',
  item,
  status = 'matched',
  title,
  meta,
  onChange,
  changeDisabled = false,
  actionDisabled = false,
}) {
  if (status === 'unmatched') {
    return (
      <div className="receiving-match-selected is-unmatched">
        <div className="receiving-match-selected-main">
          <span className="receiving-match-selected-copy">
            <strong>{title || 'No Clear Match'}</strong>
            {meta && <small>{meta}</small>}
          </span>
          {onChange && <button type="button" onClick={onChange} disabled={changeDisabled}>{changeLabel}</button>}
        </div>
      </div>
    );
  }

  const productTitle = itemMatchTitle(item);
  const productIdentifier = itemMatchIdentifierValue(item);

  return (
    <div className="receiving-match-selected">
      <div className="receiving-match-selected-main">
        <span className="receiving-match-selected-copy">
          <span className="receiving-match-eyebrow">Matched Product</span>
          <strong>
            {productTitle}
            <button
              type="button"
              className="recv-copy-name-btn"
              title="Copy product name"
              onClick={event => { event.stopPropagation(); navigator.clipboard.writeText(productTitle); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </strong>
          <small className="receiving-match-meta">
            {productIdentifier && (
              <span className="receiving-match-identifier-copy">
                {itemProductIdentifierText(item)}
                <button
                  type="button"
                  className="recv-copy-name-btn"
                  title={`Copy Product ${itemMatchMethod(item)}`}
                  aria-label={`Copy Product ${itemMatchMethod(item)}`}
                  onClick={event => { event.stopPropagation(); navigator.clipboard.writeText(productIdentifier); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </span>
            )}
            {[item?.brand, item?.parentJobNumber ? `Job ${item.parentJobNumber}` : ''].filter(Boolean).map(value => (
              <span key={value}>{value}</span>
            ))}
          </small>
        </span>
        {onChange && <button type="button" onClick={onChange} disabled={changeDisabled}>Change</button>}
      </div>
    </div>
  );
}

function PhotoProductionChecklist({ production = {} }) {
  const workstreams = ['Packaging', 'Ecomm'].filter(type => production[type]);
  const entriesFor = status => {
    const entries = [
      ...(status?.productData?.checks || []),
      ...(status?.creativeForce?.checks || []),
    ];
    const seen = new Set();
    return entries.filter(check => {
      const identity = check.key === 'productCode' ? 'productCode' : check.key;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  };
  if (!workstreams.length) return null;
  return (
    <div className="photo-production-checklist" aria-label="Photo production data checklist">
      {workstreams.map(type => {
        const checks = entriesFor(production[type] || {});
        return (
          <section key={type}>
            <h4>{type}</h4>
            <ul>
              {checks.map(check => (
                <li key={`${type}-${check.key}`} className={check.present ? 'is-present' : 'is-missing'}>
                  <span aria-hidden="true">{check.present ? '✓' : '○'}</span>
                  {check.label}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ReceivingMatchSuggestions({
  title,
  matches = [],
  limit = 5,
  identifierQuery = '',
  nameOnlyMatchSuggestions = false,
  combinedPartialMatchSuggestions = false,
  combinedMatchSearch = false,
  matchLoading = false,
  onNoClearMatch,
  onSelect,
  disabled = false,
  showNoClearMatchAction = true,
  showEmptyState = true,
}) {
  if (!matches.length && !matchLoading && !showEmptyState && !showNoClearMatchAction) return null;
  return (
    <div className="receiving-match-panel">
      <div className="receiving-match-panel-head">
        <span>{title}</span>
      </div>
      {!matchLoading && combinedMatchSearch && matches.length === 0 && (
        <div className="receiving-match-helper">Check the package name and UPC / ID. Clear one field to search by the other.</div>
      )}
      {matches.length > 0 ? (
        <div className="receiving-match-list">
          {matches.slice(0, limit).map(item => {
            const confidenceBadge = itemMatchConfidenceBadge(item, identifierQuery);
            return (
              <button
                type="button"
                className={`receiving-match-option ${confidenceBadge ? 'has-confidence' : ''}`}
                key={item.id}
                onClick={() => onSelect?.(item)}
                disabled={disabled}
              >
                <span>
                  <strong>{itemMatchTitle(item)}</strong>
                  <small>{[itemProductIdentifierText(item), item.brand, item.parentJobNumber ? `Job ${item.parentJobNumber}` : ''].filter(Boolean).join(' · ')}</small>
                </span>
                {confidenceBadge && <em>{confidenceBadge}</em>}
              </button>
            );
          })}
        </div>
      ) : showEmptyState ? (
        !matchLoading && <p className="merch-compare-empty">No matching Products found. Check the package name and UPC / ID.</p>
      ) : null}
      {matches.length > limit && (
        <div className="receiving-match-helper">
          {matches.length - limit} more — narrow the search to see them.
        </div>
      )}
      {showNoClearMatchAction && onNoClearMatch && (
        <div className="receiving-match-panel-footer">
          <button type="button" className="receiving-match-secondary-action" onClick={onNoClearMatch} disabled={disabled}>
            No clear match
          </button>
        </div>
      )}
    </div>
  );
}

function noMatchGuidance({ name = '', identifier = '' } = {}) {
  const upcDigits = String(identifier || '').replace(/\D+/g, '');
  const usableName = String(name || '').trim().length >= 3;
  if (upcDigits.length >= 8) {
    return usableName
      ? 'Nothing in the client product list matches this name or UPC. The client may not have listed it yet.'
      : 'No product with this UPC. The client may not have listed it yet.';
  }
  return usableName
    ? 'No match on name alone. Add the UPC from the package to search more precisely.'
    : 'Not enough detail from the package to search. Add the name or UPC printed on it.';
}

function SourceSheetMatchSuggestions({
  title = 'Possible Product Matches',
  matches = [],
  client,
  searchName = '',
  searchIdentifier = '',
  matchLoading = false,
  activatingRowNumber = null,
  canActivate = false,
  selectedRowNumber = null,
  onActivate,
}) {
  return (
    <div className="receiving-match-panel receiving-source-match-panel">
      <div className="receiving-match-panel-head">
        <span>{matchLoading ? 'Finding product matches...' : title}</span>
      </div>
      {matches.length > 0 ? (
        <div className="receiving-match-list">
          {matches.slice(0, 5).map(row => {
            const source = row.sourceData || {};
            const rowNumber = row.sourceRowNumber;
            const activating = activatingRowNumber === rowNumber;
            const selected = selectedRowNumber === rowNumber;
            return (
              <button
                type="button"
                className={`receiving-match-option receiving-source-match-option ${selected ? 'is-selected' : ''} ${activating ? 'is-activating' : ''}`.trim()}
                key={`${rowNumber}-${source.UPC || source['Product Name']}`}
                onClick={() => onActivate?.(row)}
                disabled={activating}
                aria-busy={activating || undefined}
              >
                <span>
                  <strong>{source['Product Name'] || 'Unnamed source row'}</strong>
                  <small>{source.UPC ? `UPC ${source.UPC}` : ''}</small>
                </span>
                <em>
                  {activating && <span className="match-option-spinner" aria-hidden="true" />}
                  {activating ? 'Matching' : selected && !canActivate ? 'Selected' : 'Match'}
                </em>
              </button>
            );
          })}
        </div>
      ) : (
        !matchLoading && <p className="merch-compare-empty">{noMatchGuidance({ name: searchName, identifier: searchIdentifier })}</p>
      )}
    </div>
  );
}

function sourceRowMatchItem(row = {}) {
  const source = row.sourceData || {};
  const sourceIdentity = row.sourceIdentity || {};
  const sourceName = source['Product Name'] || sourceIdentity.productName || '';
  const sourceUpc = source.UPC || sourceIdentity.upc || '';
  return {
    id: `source-row-${row.sourceRowNumber || sourceUpc || sourceName || 'selected'}`,
    name: sourceName || 'Selected product',
    product: sourceName || 'Selected product',
    identifier: sourceUpc || '',
    primaryMatchKey: sourceUpc || '',
    productId: sourceUpc || '',
    gtinUpc: sourceUpc || '',
    primaryMatchKeyLabel: 'UPC',
    identifierLabel: 'UPC',
    codeType: 'UPC',
    brand: '',
    matchBasis: sourceRowMatchBasis(row.matchBasis),
  };
}

function sourceRowMatchBasis(basis) {
  const value = String(basis || '').toLowerCase();
  const hasName = value.includes('name');
  const hasCode = value.includes('upc') || value.includes('id');
  if (hasName && hasCode) return 'both-upc';
  if (hasCode) return 'upc';
  if (hasName) return 'name';
  return '';
}

function itemMatchIdentifierLabel(item) {
  const label = item?.primaryMatchKeyLabel || item?.identifierLabel || item?.codeType || DOMAIN_TERMS.primaryMatchKey;
  return label;
}

function itemMatchIdentifierValue(item) {
  return item?.primaryMatchKey || item?.identifier || item?.productId || item?.gtinUpc || '';
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
  const itemPhotos = (record?.itemPhotos || []).filter(photo => receivingPhotoUrl(photo));
  const shipmentPhotos = (record?.shipmentPhotos || []).filter(photo => receivingPhotoUrl(photo));
  if (itemPhotos.length || shipmentPhotos.length) return [...itemPhotos, ...shipmentPhotos];
  const metadata = (record?.photoMetadata || []).filter(photo => receivingPhotoUrl(photo));
  if (metadata.length) return metadata;
  return (record?.photos || []).filter(photo => (photo.object_key || photo.objectKey) && receivingPhotoUrl(photo));
}

function photoSourceLabel(photo) {
  if ((photo?.source || photo?.photoType) === 'shipment') return 'Shipment Photo';
  return photo?.label || '';
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
  const skuIdRef = useRef(null);
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
            {saving ? 'Starting...' : 'Begin Shipment'}
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
          <label>{DOMAIN_TERMS.packageName}</label>
          <input ref={productNameRef} value={entry.productName} onChange={event => setEntry('productName', event.target.value)} placeholder="Name printed on package" />
        </div>

        <div className="mobile-field">
          <label>{DOMAIN_TERMS.merchandiseIdentifier} on Package</label>
          <div className="mobile-identifier-row">
            <input ref={skuIdRef} value={entry.skuId} onChange={event => setEntry('skuId', event.target.value)} placeholder="Scan or enter UPC / ID" />
            {barcodeSupported && <button type="button" className="btn btn-alt">Scan</button>}
          </div>
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
  const [searchParams] = useSearchParams();
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const carrierOptions = useResource(() => api.airtableSingleSelectOptions({ tableName: 'Shipments', fieldName: 'Carrier' }));
  const allReceipts = useResource(() => api.listShipments());
  const thr3dOutgoing = useResource(() => api.listThr3dShippingItems());

  const [receipt, setReceipt] = useState(null);
  const [session, setSession] = useState({ clientId: '', carrier: '', tracking: '', boxQuantity: 1, received: toDatetimeLocal(), notes: '' });

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
  const [shipmentPhotoPreviews, setShipmentPhotoPreviews] = useState([]);
  const [shipmentPhotoUploading, setShipmentPhotoUploading] = useState(false);
  const [shipmentPhotoError, setShipmentPhotoError] = useState('');
  const [pendingCopyEntry, setPendingCopyEntry] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState('');
  const [itemMatches, setItemMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [sourceMatches, setSourceMatches] = useState([]);
  const [sourceMatchLoading, setSourceMatchLoading] = useState(false);
  const [sourceActivatingRow, setSourceActivatingRow] = useState(null);
  const [stagedSourceRow, setStagedSourceRow] = useState(null);
  const [matchChoice, setMatchChoice] = useState({ status: 'none', item: null });
  const [editingMatchedEntryIdentity, setEditingMatchedEntryIdentity] = useState(false);
  const [prevMatchedItemId, setPrevMatchedItemId] = useState('');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [tab, setTab] = useState('incoming'); // 'incoming' | 'outgoing' | 'all'
  const [allReceiptsLayout, setAllReceiptsLayout] = useState('list'); // 'date' | 'list'
  const [allReceiptsDateScope, setAllReceiptsDateScope] = useState('this-week'); // 'previous-week' | 'this-week' | 'month'
  const [thr3dShipDrafts, setThr3dShipDrafts] = useState({});

  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const shipmentCameraInputRef = useRef(null);
  const shipmentLibraryInputRef = useRef(null);
  const shipmentPhotoPreviewsRef = useRef([]);
  const productNameRef = useRef(null);
  const skuIdRef = useRef(null);

  const clientList = (clients.data?.records ?? []).filter(c => c.active !== false);
  const topcoTestingClientId = clientList.find(client => String(client.name || '').trim().toLowerCase() === 'topco')?.id || '';
  const locationList = (locations.data?.records ?? []).filter(l => l.active !== false);
  const carrierList = carrierOptions.data?.options ?? [];
  const carrierSelectOptions = session.carrier && !carrierList.includes(session.carrier)
    ? [session.carrier, ...carrierList]
    : carrierList;
  const locationNameById = Object.fromEntries(locationList.map(l => [l.id, l.name]));
  const clientNameById = Object.fromEntries(clientList.map(c => [c.id, c.name]));
  const receiptList = allReceipts.data?.records ?? [];
  const thr3dOutgoingRecords = thr3dOutgoing.data?.records ?? [];
  const thr3dShippedRecords = thr3dOutgoing.data?.shipped ?? [];
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
  const activeClient = clientList.find(client => client.id === activeClientId);
  const matchIdentifierQuery = String(entry.skuId || '').trim();
  const matchNameQuery = String(entry.productName || '').trim();
  const matchIdentifierReady = matchIdentifierQuery.replace(/[^a-z0-9]+/gi, '').length >= 3;
  const matchNameReady = matchNameQuery.replace(/[^a-z0-9]+/gi, '').length >= 3;
  const matchChoiceProductTitle = matchChoice.status === 'matched' && matchChoice.item ? itemMatchTitle(matchChoice.item) : '';
  const matchChoiceProductIdentifier = matchChoice.status === 'matched' && matchChoice.item ? itemMatchIdentifierValue(matchChoice.item) : '';
  const matchedEntryIdentityIsClean = Boolean(
    matchChoice.status === 'matched'
    && matchChoice.item
    && matchNameQuery
    && matchIdentifierQuery
    && !matchValuesConflict(matchNameQuery, matchChoiceProductTitle)
    && !matchValuesConflict(matchIdentifierQuery, matchChoiceProductIdentifier)
  );
  const showEntryIdentityFields = !matchedEntryIdentityIsClean || editingMatchedEntryIdentity;
  const stagedSourceMatchItem = stagedSourceRow ? sourceRowMatchItem(stagedSourceRow) : null;
  const showMatchSuggestions = !stagedSourceRow
    && matchChoice.status !== 'matched'
    && matchChoice.status !== 'needs'
    && (matchIdentifierReady || matchNameReady);
  // A scanned barcode that resolves to exactly one row links itself. This is the one
  // case where receiving is the cheapest place to match: the box is in hand and no
  // judgement is involved. Anything ambiguous is left alone for a PM in Planning.
  useEffect(() => {
    const digits = String(entry.skuId || '').replace(/\D+/g, '');
    const alreadyDecided = matchChoice.status === 'matched' || matchChoice.status === 'needs' || Boolean(stagedSourceRow);
    if (alreadyDecided || digits.length < 8) return undefined;
    let active = true;
    const t = window.setTimeout(async () => {
      try {
        const data = await api.resolveUpc({ upc: digits, clientId: activeClientId });
        if (!active || !data?.resolved) return;
        if (data.via === 'source' && data.sourceRow) {
          setStagedSourceRow(data.sourceRow);
          setToast('Product matched from scan');
        } else if (data.product) {
          setMatchChoice({ status: 'matched', item: data.product });
          setToast('Product matched from scan');
        }
      } catch {
        // A scan that cannot be resolved is not an error: the item stays unmatched.
      }
    }, 320);
    return () => { active = false; window.clearTimeout(t); };
  }, [entry.skuId, activeClientId, matchChoice.status, stagedSourceRow]);

  const nameOnlyMatchSuggestions = itemMatches.length > 0 && itemMatches.every(item => item.matchBasis === 'name');
  const combinedPartialMatchSuggestions = itemMatches.length > 0 && itemMatches.every(item => String(item.matchBasis || '').startsWith('both-'));
  const combinedMatchSearch = matchIdentifierReady && matchNameReady;
  const sourceBackedMatching = Boolean(sourceCheckRulesForClient(activeClient));
  const matchedUpcKeys = new Set(
    itemMatches.map(item => String(item.primaryMatchKey || item.gtinUpc || '').replace(/\D+/g, '')).filter(Boolean),
  );
  const combinedMatches = [
    ...itemMatches,
    ...sourceMatches
      // A source row whose UPC is already a Product would otherwise appear twice.
      .filter(row => {
        const upc = String(row.sourceData?.UPC || '').replace(/\D+/g, '');
        return !upc || !matchedUpcKeys.has(upc);
      })
      .map(row => ({ ...sourceRowMatchItem(row), __sourceRow: row })),
  ];
  const matchSuggestionsTitle = (matchLoading || sourceMatchLoading)
    ? 'Searching matches…'
    : combinedMatches.length
      ? (nameOnlyMatchSuggestions || combinedPartialMatchSuggestions) ? 'Possible matches' : 'Suggested matches'
      : combinedMatchSearch ? 'No match on both fields' : 'No matches found';
  const showSourceMatchSuggestions = showMatchSuggestions && sourceBackedMatching;
  const showSourceMatchPanel = false;
  const showLocalMatchSuggestionPanel = showMatchSuggestions
    && (combinedMatches.length > 0 || matchLoading || sourceMatchLoading);
  const sourceSuggestionsTitle = sourceMatchLoading
    ? 'Searching the source sheet…'
    : sourceMatches.length
      ? 'From the source sheet — not yet a Product'
      : 'Nothing in the source sheet';
  const entryCount = savedEntries.length;
  const shipmentPhotos = recordPhotos(receipt);
  const headerReceived = receipt?.received || session.received;
  const headerReceivedLabel = headerReceived
    ? formatCentralDateTime(headerReceived, { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })
    : '';

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 1200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (receipt || session.clientId || !topcoTestingClientId) return;
    setSession(prev => prev.clientId ? prev : { ...prev, clientId: topcoTestingClientId });
  }, [receipt, session.clientId, topcoTestingClientId]);

  useEffect(() => {
    const requestedShipmentId = searchParams.get('shipmentId') || searchParams.get('receiptId') || '';
    if (!requestedShipmentId || receipt?.id === requestedShipmentId) return;
    selectReceipt(requestedShipmentId);
    setTab('incoming');
  }, [searchParams, receipt?.id]);

  useEffect(() => {
    if (matchChoice.status !== 'matched') setEditingMatchedEntryIdentity(false);
  }, [matchChoice.status, matchChoice.item?.id]);

  useEffect(() => {
    shipmentPhotoPreviewsRef.current = shipmentPhotoPreviews;
  }, [shipmentPhotoPreviews]);

  useEffect(() => () => {
    shipmentPhotoPreviewsRef.current.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
  }, []);

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
        let records = [];
        if (matchIdentifierReady && matchNameReady) {
          const [identifierData, nameData] = await Promise.all([
            api.searchMerchandiseReviewProducts({ q: matchIdentifierQuery, clientId: activeClientId, includeItemId: prevMatchedItemId, limit: 50 }),
            api.searchMerchandiseReviewProducts({ q: matchNameQuery, clientId: activeClientId, includeItemId: prevMatchedItemId, limit: 50 }),
          ]);
          records = combineIdentifierAndNameMatches(identifierData.records ?? [], nameData.records ?? [], matchIdentifierQuery);
        } else if (matchIdentifierReady) {
          const data = await api.searchMerchandiseReviewProducts({ q: matchIdentifierQuery, clientId: activeClientId, includeItemId: prevMatchedItemId });
          records = (data.records ?? []).map(item => ({ ...item, matchBasis: itemIdentifierBasis(item) }));
        }
        if (records.length === 0 && matchNameReady && !matchIdentifierReady) {
          const data = await api.searchMerchandiseReviewProducts({ q: matchNameQuery, clientId: activeClientId, includeItemId: prevMatchedItemId });
          records = (data.records ?? []).map(item => ({ ...item, matchBasis: 'name' }));
        }
        const selectedProductId = matchChoice.status === 'matched' ? matchChoice.item?.id : '';
        if (active) setItemMatches(records.filter(item => item.id !== selectedProductId));
      } catch {
        if (active) setItemMatches([]);
      } finally {
        if (active) setMatchLoading(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(t); };
  }, [showMatchSuggestions, sourceBackedMatching, matchIdentifierReady, matchIdentifierQuery, matchNameReady, matchNameQuery, activeClientId, prevMatchedItemId, matchChoice.status, matchChoice.item?.id]);

  useEffect(() => {
    let active = true;
    if (!showSourceMatchSuggestions) {
      setSourceMatches([]);
      setSourceMatchLoading(false);
      return () => { active = false; };
    }
    setSourceMatchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const data = await api.topcoSourceSuggestions({
          clientId: activeClientId,
          productName: matchNameQuery,
          upc: matchIdentifierQuery,
          limit: 5,
        });
        if (active) setSourceMatches(data.records ?? []);
      } catch {
        if (active) setSourceMatches([]);
      } finally {
        if (active) setSourceMatchLoading(false);
      }
    }, 260);
    return () => { active = false; window.clearTimeout(t); };
  }, [showSourceMatchSuggestions, activeClientId, matchNameQuery, matchIdentifierQuery]);

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

  function setEntry(field, value, options = {}) {
    setEntryState(prev => ({ ...prev, [field]: value }));
    if ((field === 'productName' || field === 'skuId') && matchChoice.status === 'needs') {
      setMatchChoice({ status: 'none', item: null });
    }
    if ((field === 'productName' || field === 'skuId') && matchChoice.status === 'matched') {
      setEditingMatchedEntryIdentity(true);
    }
    if ((field === 'productName' || field === 'skuId') && stagedSourceRow && !options.preserveStagedSourceRow) {
      setStagedSourceRow(null);
    }
  }

  async function activateSourceRowForEntry(sourceRow) {
    if (!editingEntryId) {
      setError('');
      setStagedSourceRow(sourceRow);
      setMatchChoice({ status: 'none', item: null });
      setPrevMatchedItemId('');
      setToast('Product matched');
      return;
    }
    const sourceRowNumber = sourceRow?.sourceRowNumber;
    if (!sourceRowNumber) return;
    setError('');
    setSourceActivatingRow(sourceRowNumber);
    try {
      const result = await api.activateMerchandiseSourceRow(editingEntryId, { sourceRowNumber });
      const merchandise = result.merchandise;
      const product = result.product || merchandise?.linkedItem;
      if (merchandise?.id) {
        setSavedEntries(prev => prev.map(item => item.id === merchandise.id ? merchandise : item));
      }
      if (result.pending) {
        setStagedSourceRow(sourceRow);
        setMatchChoice({ status: 'none', item: null });
        setEditingMatchedEntryIdentity(false);
        setPrevMatchedItemId('');
        allReceipts.reload();
        setToast('Product matched');
        return;
      }
      if (product) {
        setMatchChoice({ status: 'matched', item: product });
        setEditingMatchedEntryIdentity(false);
        setPrevMatchedItemId('');
      }
      setStagedSourceRow(null);
      setSourceMatches(prev => prev.map(row => row.sourceRowNumber === sourceRowNumber ? { ...row, product, matchMethod: 'Activated' } : row));
      allReceipts.reload();
      setToast('Product matched');
    } catch (err) {
      setError(err.message || 'Could not activate source row.');
    } finally {
      setSourceActivatingRow(null);
    }
  }

  function markEntryNoClearMatch() {
    setMatchChoice({ status: 'needs', item: null });
    setStagedSourceRow(null);
  }

  async function addEntryPhotos(files) {
    const localPhotos = photoFilesFromInput(files);
    if (!localPhotos.length) return;
    setEntryPhotos(prev => [...prev, ...localPhotos]);
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  async function uploadShipmentPhotoFiles(files) {
    const selected = Array.from(files || []).filter(Boolean);
    if (!selected.length) return;
    const localPreviews = photoFilesFromInput(selected);
    setShipmentPhotoError('');
    setShipmentPhotoPreviews(prev => [...prev, ...localPreviews]);
    setShipmentPhotoUploading(true);
    try {
      const activeReceipt = receipt || await createShipment({ toast: false });
      if (!activeReceipt) throw new Error('Shipment could not be saved.');
      const data = await api.uploadShipmentPhotos(activeReceipt.id, selected);
      setReceipt(data.shipment || activeReceipt);
      setToast(`${selected.length} shipment photo${selected.length === 1 ? '' : 's'} uploaded`);
      allReceipts.reload();
    } catch (err) {
      setShipmentPhotoError(err.message || 'Shipment photos could not be uploaded.');
    } finally {
      localPreviews.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
      setShipmentPhotoPreviews(prev => prev.filter(photo => !localPreviews.some(local => local.id === photo.id)));
      setShipmentPhotoUploading(false);
    }
  }

  async function removeShipmentPhoto(photo) {
    if (!receipt?.id || !photo?.photo_id) return;
    setShipmentPhotoError('');
    setShipmentPhotoUploading(true);
    try {
      const data = await api.deleteShipmentPhoto(receipt.id, photo.photo_id);
      setReceipt(data.shipment || { ...receipt, photos: shipmentPhotos.filter(item => item.photo_id !== photo.photo_id) });
      setToast('Shipment photo removed');
      allReceipts.reload();
    } catch (err) {
      setShipmentPhotoError(err.message || 'Shipment photo could not be removed.');
    } finally {
      setShipmentPhotoUploading(false);
    }
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
    });
    setItemMatches([]);
    setSourceMatches([]);
    setSourceMatchLoading(false);
    setSourceActivatingRow(null);
    setStagedSourceRow(null);
    setMatchChoice({ status: 'none', item: null });
    setPrevMatchedItemId('');
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  async function createShipment({ toast: showToast = true } = {}) {
    if (receipt) return receipt;
    const boxQuantity = Number(session.boxQuantity);
    if (!Number.isFinite(boxQuantity) || boxQuantity < 1) {
      setError('Box Quantity must be at least 1.');
      return null;
    }
    setSaving('shipment');
    setError('');
    try {
      const created = await api.startReceivingSession({
        clientId: session.clientId,
        carrier: session.carrier.trim(),
        tracking: session.tracking.trim(),
        boxQuantity,
        received: session.received,
        notes: session.notes || '',
      });
      setReceipt(created);
      setSavedEntries(created.entries || []);
      allReceipts.reload();
      if (showToast) setToast('Shipment created.');
      return created;
    } catch (err) {
      setError(err.message || 'Could not create shipment.');
      return null;
    } finally {
      setSaving('');
    }
  }

  async function saveNext() {
    setError('');
    if (!receipt) {
      setError('Add shipment photos in Shipment Details before saving merchandise.');
      return;
    }
    if (entryPhotos.length === 0) {
      setError('Add at least one photo before saving.');
      return;
    }
    if (!entry.productName.trim()) {
      setError('Product Name on Package is required.');
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
      const activeReceipt = receipt;
      let saved;
      const matchPayload = {};
      if (matchChoice.status === 'matched') {
        matchPayload.itemId = matchChoice.item?.id || '';
        matchPayload.matchStatus = 'Matched';
        matchPayload.noClearMatch = false;
      } else if (matchChoice.status === 'needs' || (!editingEntryId && !stagedSourceRow)) {
        matchPayload.itemId = '';
        matchPayload.matchStatus = 'Needs Match';
        matchPayload.noClearMatch = matchChoice.status === 'needs';
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
      if (stagedSourceRow?.sourceRowNumber && saved?.id) {
        const activation = await api.activateMerchandiseSourceRow(saved.id, {
          sourceRowNumber: stagedSourceRow.sourceRowNumber,
        });
        saved = activation.merchandise || saved;
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
      setStagedSourceRow(null);
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
    setShipmentPhotoError('');
    setShipmentPhotoPreviews(prev => {
      prev.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
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
      setSourceMatches([]);
      setSourceMatchLoading(false);
      setSourceActivatingRow(null);
      setShipmentPhotoError('');
      setShipmentPhotoPreviews(prev => {
        prev.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
        return [];
      });
      resetActiveEntry('', 'Good');
    } catch (err) {
      setError(err.message || 'Could not load shipment.');
    }
  }

  function openReceiptForEdit(receiptId) {
    selectReceipt(receiptId);
    setTab('incoming');
  }

  async function deleteShipmentFromHistory(shipment) {
    if (!shipment?.id) return;
    const entries = shipment.entries || [];
    if (entries.length) {
      setError('Remove merchandise from this Shipment before deleting it.');
      return;
    }
    const clientName = (shipment.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'this shipment';
    if (!window.confirm(`Delete ${clientName}? This cannot be undone.`)) return;
    setSaving('delete-shipment');
    setError('');
    try {
      await api.deleteReceivingSession(shipment.id);
      if (receipt?.id === shipment.id) startNewSession();
      allReceipts.reload();
      setToast('Shipment deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete shipment.');
    } finally {
      setSaving('');
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
    // Restore product-info state from the linked Product, not from physical Merch Status.
    const effectiveStatus = saved.matchStatus || '';
    const isMatched = (saved.itemIds || []).length > 0;
    if (isMatched && (saved.itemIds || []).length > 0) {
      const matchedProduct = saved.matchedProduct || saved.linkedProduct || {};
      setStagedSourceRow(null);
      setMatchChoice({
        status: 'matched',
        item: {
          id: matchedProduct.id || saved.itemIds[0],
          name: matchedProduct.name || matchedProduct.product || saved.productName || saved.name || 'Matched Product',
          product: matchedProduct.product || '',
          identifier: matchedProduct.identifier || matchedProduct.primaryMatchKey || matchedProduct.productId || matchedProduct.gtinUpc || receivingEntrySku(saved),
          primaryMatchKey: matchedProduct.primaryMatchKey || matchedProduct.identifier || matchedProduct.productId || matchedProduct.gtinUpc || receivingEntrySku(saved),
          productId: matchedProduct.productId || matchedProduct.identifier || matchedProduct.primaryMatchKey || matchedProduct.gtinUpc || receivingEntrySku(saved),
          gtinUpc: matchedProduct.gtinUpc || matchedProduct.identifier || matchedProduct.primaryMatchKey || matchedProduct.productId || receivingEntrySku(saved),
          identifierLabel: matchedProduct.identifierLabel || matchedProduct.primaryMatchKeyLabel || '',
          primaryMatchKeyLabel: matchedProduct.primaryMatchKeyLabel || matchedProduct.identifierLabel || '',
          codeType: matchedProduct.codeType || '',
        },
      });
    } else if (saved.pendingSourceMatch?.sourceRowNumber) {
      setStagedSourceRow(saved.pendingSourceMatch);
      setMatchChoice({ status: 'none', item: null });
    } else {
      setStagedSourceRow(null);
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

  function updateThr3dShipDraft(recordId, field, value) {
    setThr3dShipDrafts(prev => ({
      ...prev,
      [recordId]: {
        carrier: prev[recordId]?.carrier || carrierList[0] || 'UPS',
        tracking: prev[recordId]?.tracking || '',
        ...prev[recordId],
        [field]: value,
      },
    }));
  }

  async function shipThr3dItem(record) {
    if (!record?.id) return;
    const draft = thr3dShipDrafts[record.id] || {};
    setSaving(`thr3d-${record.id}`);
    setError('');
    try {
      await api.shipThr3dShippingItem(record.id, {
        carrier: draft.carrier || carrierList[0] || 'UPS',
        tracking: draft.tracking || '',
      });
      setThr3dShipDrafts(prev => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      await thr3dOutgoing.reload({ quiet: true });
      allReceipts.reload();
      window.dispatchEvent(new Event('thr3d-queue-updated'));
      setToast('THR3D item shipped.');
    } catch (err) {
      setError(err.message || 'Could not ship THR3D item.');
    } finally {
      setSaving('');
    }
  }

  function receivedItemMerchStatus(saved) {
    return saved.merchStatus || 'Received';
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
          if (next === 'incoming' && tab === 'incoming' && receipt) { startNewSession(); }
          else { setTab(next); }
        }}
        items={[
          { id: 'incoming', label: 'Incoming', icon: <Icon.Download /> },
          { id: 'outgoing', label: 'THR3D / Outgoing', icon: <Icon.NavShipments />, count: thr3dOutgoingRecords.length || undefined, countTone: 'thr3d' },
          { id: 'all', label: 'All Shipments', icon: <Icon.Jobs />, count: receiptList.length || undefined },
        ]}
        actions={tab === 'incoming' && receipt && (
          <button
            type="button"
            className="subnav-action"
            onClick={() => { startNewSession(); setTab('incoming'); }}
            title="Start a new shipment"
          >
            <Icon.Add /> New Shipment
          </button>
        )}
      />

      {tab === 'incoming' ? (
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
              <div className="recv-shipment-inline-row">
                <div className="recv-field">
                  <label>Tracking Number</label>
                  <input value={session.tracking} onChange={e => setSessionField('tracking', e.target.value)} onBlur={e => autoSaveReceiptHeader({ tracking: e.target.value })} placeholder="Optional" />
                </div>
                <div className="recv-field">
                  <label>Box Quantity</label>
                  <input type="number" min="1" inputMode="numeric" value={session.boxQuantity} onChange={e => setSessionField('boxQuantity', e.target.value)} onBlur={e => autoSaveReceiptHeader({ boxQuantity: Number(e.target.value || 1) })} />
                </div>
              </div>
              <div className="recv-field">
                <label>Date Received</label>
                <input type="datetime-local" value={session.received} onChange={e => setSessionField('received', e.target.value)} onBlur={e => autoSaveReceiptHeader({ received: e.target.value })} />
              </div>
              <div className="recv-field">
                <label>Notes</label>
                <textarea value={session.notes} onChange={e => setSessionField('notes', e.target.value)} onBlur={e => autoSaveReceiptHeader({ notes: e.target.value })} rows="2" placeholder="Optional" />
              </div>
              <div className="recv-field shipment-photo-field">
                <label className="recv-photo-label">
                  <span>Shipment Photos{(shipmentPhotos.length === 0 && shipmentPhotoPreviews.length === 0) && <><b aria-hidden="true">*</b><strong>Required</strong></>}</span>
                </label>
                <input ref={shipmentCameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { uploadShipmentPhotoFiles(e.target.files); e.target.value = ''; }} />
                <input ref={shipmentLibraryInputRef} type="file" accept="image/*" multiple hidden onChange={e => { uploadShipmentPhotoFiles(e.target.files); e.target.value = ''; }} />
                <div className="recv-photo-btns shipment-photo-actions">
                  <button type="button" className="recv-camera-btn" onClick={() => shipmentCameraInputRef.current?.click()} disabled={shipmentPhotoUploading || saving === 'shipment'}><Camera size={17} strokeWidth={2} aria-hidden="true" />Take Photo</button>
                  <button type="button" className="recv-library-btn" onClick={() => shipmentLibraryInputRef.current?.click()} disabled={shipmentPhotoUploading || saving === 'shipment'}><Images size={17} strokeWidth={2} aria-hidden="true" />Library</button>
                </div>
                {!receipt && <small className="recv-field-hint">Adding shipment photos saves this shipment.</small>}
                {shipmentPhotoUploading && <div className="receiving-upload-progress" role="status"><span />Uploading...</div>}
                {shipmentPhotoError && <div className="recv-field-error">{shipmentPhotoError}</div>}
                {(shipmentPhotos.length > 0 || shipmentPhotoPreviews.length > 0) && (
                  <div className="mobile-photo-strip compact">
                    {shipmentPhotoPreviews.map(photo => (
                      <button type="button" className="mobile-thumb shipment-photo-thumb is-uploading" key={photo.id} onClick={() => setPreviewPhoto({ url: photo.previewUrl, name: photo.name || 'Shipment Photo' })}>
                        <img src={photo.previewUrl} alt="" />
                      </button>
                    ))}
                    {shipmentPhotos.map((photo, index) => {
                      const url = receivingPhotoUrl(photo);
                      return url ? (
                        <button type="button" className="mobile-thumb shipment-photo-thumb" key={photo.photo_id || photo.object_key || index} onClick={() => setPreviewPhoto({ url, name: photo.original_filename || photo.filename || 'Shipment Photo' })}>
                          <img src={url} alt="" />
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Remove shipment photo"
                            onClick={e => { e.stopPropagation(); removeShipmentPhoto(photo); }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); removeShipmentPhoto(photo); } }}
                          >×</span>
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              {!receipt && error && <div className="recv-field-error">{error}</div>}
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
              <span className="recv-panel-step">2</span>
              <strong className="recv-panel-title">Add Merchandise</strong>
            </div>
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
                      <label className="recv-photo-label">
                        <span>Merchandise Photos{entryPhotos.length === 0 && <><b aria-hidden="true">*</b><strong>Required</strong></>}</span>
                      </label>
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { addEntryPhotos(e.target.files); e.target.value = ''; }} />
                      <input ref={libraryInputRef} type="file" accept="image/*" multiple hidden onChange={e => { addEntryPhotos(e.target.files); e.target.value = ''; }} />
                      <div className="recv-photo-btns">
                        <button type="button" className="recv-camera-btn" onClick={() => cameraInputRef.current?.click()}><Camera size={17} strokeWidth={2} aria-hidden="true" />Take Photo</button>
                        <button type="button" className="recv-library-btn" onClick={() => libraryInputRef.current?.click()}><Images size={17} strokeWidth={2} aria-hidden="true" />Library</button>
                      </div>
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
                      {showUploadProgress && <div className="receiving-upload-progress" role="status"><span />Uploading...</div>}
                    </div>
                    {showEntryIdentityFields && (
                      <>
                        <div className="recv-field recv-field-product">
                          <label>{DOMAIN_TERMS.packageName}</label>
                          <input ref={productNameRef} value={entry.productName} onChange={e => { setEntry('productName', e.target.value); if (error) setError(''); }} placeholder="Name printed on package" autoComplete="off" />
                        </div>
                        <div className="recv-field">
                          <label>{DOMAIN_TERMS.merchandiseIdentifier} on Package</label>
                          <input ref={skuIdRef} value={entry.skuId} onChange={e => setEntry('skuId', e.target.value)} placeholder="Scan or enter UPC / ID" autoComplete="off" />
                        </div>
                      </>
                    )}
                    <div className="receiving-match-field">
                      {stagedSourceMatchItem ? (
                        <ProductMatchCard
                          item={stagedSourceMatchItem}
                          onChange={() => setStagedSourceRow(null)}
                        />
                      ) : matchChoice.status === 'matched' && matchChoice.item ? (
                        <>
                          <ProductMatchCard
                            item={matchChoice.item}
	                            onChange={() => {
	                              setPrevMatchedItemId(matchChoice.item?.id || '');
	                              setMatchChoice({ status: 'none', item: null });
                                setStagedSourceRow(null);
	                              setEditingMatchedEntryIdentity(false);
	                            }}
                          />
                          {showLocalMatchSuggestionPanel && (
	                            <ReceivingMatchSuggestions
	                              title={matchSuggestionsTitle}
	                              matches={combinedMatches}
                              identifierQuery={matchIdentifierQuery}
                              nameOnlyMatchSuggestions={nameOnlyMatchSuggestions}
                              combinedPartialMatchSuggestions={combinedPartialMatchSuggestions}
                              combinedMatchSearch={combinedMatchSearch}
                              matchLoading={matchLoading}
                              onNoClearMatch={markEntryNoClearMatch}
                              showNoClearMatchAction={false}
                              showEmptyState={false}
	                              onSelect={item => {
	                                if (item.__sourceRow) {
	                                  // Not a Product yet — creating one is what matching means here.
	                                  activateSourceRowForEntry(item.__sourceRow);
	                                  return;
	                                }
	                                setMatchChoice({ status: 'matched', item });
                                  setStagedSourceRow(null);
	                                setEditingMatchedEntryIdentity(false);
	                                setPrevMatchedItemId('');
	                              }}
                            />
                          )}
                          {showSourceMatchPanel && (
                            <SourceSheetMatchSuggestions
                              title={sourceSuggestionsTitle}
                              matches={sourceMatches}
                              client={activeClient}
                              matchLoading={sourceMatchLoading}
                              activatingRowNumber={sourceActivatingRow}
                              canActivate={Boolean(editingEntryId)}
                              selectedRowNumber={stagedSourceRow?.sourceRowNumber || null}
                              onActivate={activateSourceRowForEntry}
                            />
                          )}
                        </>
                      ) : matchChoice.status === 'needs' ? (
                        <ProductMatchCard
                          status="unmatched"
                          title="No Clear Match"
                          meta="Will go to Merchandise Review."
                          onChange={() => {
                            setMatchChoice({ status: 'none', item: null });
                            setStagedSourceRow(null);
                          }}
                        />
	                      ) : showLocalMatchSuggestionPanel ? (
	                        <ReceivingMatchSuggestions
	                          title={matchSuggestionsTitle}
	                          matches={combinedMatches}
                          identifierQuery={matchIdentifierQuery}
                          nameOnlyMatchSuggestions={nameOnlyMatchSuggestions}
                          combinedPartialMatchSuggestions={combinedPartialMatchSuggestions}
                          combinedMatchSearch={combinedMatchSearch}
                          matchLoading={matchLoading || sourceMatchLoading}
                          onNoClearMatch={markEntryNoClearMatch}
                          showNoClearMatchAction={false}
                          showEmptyState={false}
	                          onSelect={item => {
	                            if (item.__sourceRow) {
	                              // Not a Product yet — creating one is what matching means here.
	                              activateSourceRowForEntry(item.__sourceRow);
	                              return;
	                            }
	                            setMatchChoice({ status: 'matched', item });
                              setStagedSourceRow(null);
	                            setPrevMatchedItemId('');
	                          }}
                        />
                      ) : null}
                      {matchChoice.status !== 'needs' && showSourceMatchPanel ? (
                        <SourceSheetMatchSuggestions
                          title={sourceSuggestionsTitle}
                          matches={sourceMatches}
                          client={activeClient}
                          matchLoading={sourceMatchLoading}
                          activatingRowNumber={sourceActivatingRow}
                          canActivate={Boolean(editingEntryId)}
                          selectedRowNumber={stagedSourceRow?.sourceRowNumber || null}
                          onActivate={activateSourceRowForEntry}
                        />
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
                const isConfirmedStatus = ['Received', 'Ready to Ship', 'Shipped', 'Disposed'].includes(merchStatus);
                const statusClass = isConfirmedStatus ? 'is-ok' : 'is-warn';
                const statusIcon = merchStatus === 'Received' ? '' : (isConfirmedStatus ? '✓' : '!');
                const isMatched = (saved.itemIds || []).length > 0 || Boolean(saved.matchedProduct?.id || saved.linkedProduct?.id);
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
                      <small>Qty {saved.quantity || 1} · {isMatched ? 'Matched' : 'Unmatched'}{locationName ? ` · ${locationName}` : ''}</small>
                    </span>
                    <span className="receiving-current-actions">
                      <button
                        type="button"
                        className="receiving-current-copy-button is-danger"
                        aria-label="Remove merchandise"
                        onClick={e => { e.stopPropagation(); removeReceivedItem(saved); }}
                      >
                        <X size={15} strokeWidth={2.4} aria-hidden="true" />
                      </button>
                      <span className="receiving-status-line">
                        <span className={statusClass}>{statusIcon ? `${statusIcon} ` : ''}{merchStatus}</span>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : tab === 'outgoing' ? (
        <div className="recv-outgoing-view">
          <div className="recv-outgoing-head">
            <div>
              <div className="recv-outgoing-kicker">Shipments Outgoing</div>
              <h3>THR3D Queue</h3>
              <p>THR3D shipping items from Planning appear here for the merchandise team to box and ship.</p>
            </div>
            <span className="recv-session-badge">{thr3dOutgoingRecords.length} ready</span>
          </div>
          {thr3dOutgoing.loading ? (
            <div className="empty-state">Loading THR3D queue...</div>
          ) : thr3dOutgoing.error ? (
            <div className="error-state">{thr3dOutgoing.error}</div>
          ) : (
            <div className="recv-outgoing-content">
              {thr3dOutgoingRecords.length === 0 ? (
                <div className="recv-outgoing-empty">
                  <strong>No THR3D shipping items need attention.</strong>
                  <span>Confirmed THR3D quantities from New Merch will appear here until they are shipped.</span>
                </div>
              ) : (
                <div className="recv-outgoing-list">
                  {thr3dOutgoingRecords.map(record => {
                const merch = record.receivedMerch || record;
                const clientName = (merch.clientIds || record.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown client';
                const locationName = locationNameById[merch.currentLocationId || merch.locationId] || 'Location needed';
                const shipment = merch.shipmentLinkage || merch.shipment || record.shipmentLinkage || record.shipment || {};
                const shipmentLabel = [shipment.name, shipment.tracking].filter(Boolean).join(' · ') || 'Original shipment not linked';
                const identifier = merch.skuId || merch.observedIdentifier || 'No identifier';
                const quantity = record.quantityToShip || record.quantity || merch.quantity || 1;
                const status = record.shippingStatus || 'Needs Shipment';
                const draft = thr3dShipDrafts[record.id] || {};
                const canShip = status !== 'Shipped';
                return (
                  <article className="recv-outgoing-row" key={record.id}>
                    <RecordThumbnail record={merch} className="receiving-current-thumb" />
                    <div className="recv-outgoing-main">
                      <strong>{record.name || merch.productName || merch.name || 'Unnamed THR3D item'}</strong>
                      <span>{clientName} · Qty to ship {quantity}</span>
                      <small>{identifier} · {locationName}</small>
                    </div>
                    <div className="recv-outgoing-meta">
                      <span>{status}</span>
                      <small>{merch.timeHere || 'Unknown age'} · {formatInventoryDate(merch.dateReceived || merch.received)}</small>
                      <small>{shipmentLabel}</small>
                      {canShip && (
                        <div className="recv-outgoing-ship">
                          <select
                            value={draft.carrier || carrierList[0] || 'UPS'}
                            onChange={e => updateThr3dShipDraft(record.id, 'carrier', e.target.value)}
                            disabled={saving === `thr3d-${record.id}`}
                          >
                            {(carrierList.length ? carrierList : ['UPS', 'FedEx', 'USPS', 'DHL', 'Courier', 'Freight', 'Hand Delivery', 'Internal', 'Other']).map(carrier => (
                              <option key={carrier} value={carrier}>{carrier}</option>
                            ))}
                          </select>
                          <input
                            value={draft.tracking || ''}
                            onChange={e => updateThr3dShipDraft(record.id, 'tracking', e.target.value)}
                            placeholder="Tracking"
                            disabled={saving === `thr3d-${record.id}`}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => shipThr3dItem(record)}
                            disabled={saving === `thr3d-${record.id}`}
                          >
                            {saving === `thr3d-${record.id}` ? 'Shipping...' : 'Ship'}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
                  })}
                </div>
              )}
              {thr3dShippedRecords.length > 0 && (
                <section className="recv-outgoing-shipped" aria-labelledby="thr3d-shipped-heading">
                  <div className="recv-outgoing-shipped-head">
                    <div>
                      <div className="recv-outgoing-kicker">Shipment history</div>
                      <h3 id="thr3d-shipped-heading">Shipped</h3>
                    </div>
                    <span className="recv-session-badge">{thr3dShippedRecords.length}</span>
                  </div>
                  <div className="recv-outgoing-shipped-table-wrap">
                    <table className="recv-outgoing-shipped-table">
                      <thead><tr><th>Item</th><th>Client</th><th>Qty shipped</th><th>Status</th></tr></thead>
                      <tbody>
                        {thr3dShippedRecords.map(record => {
                          const merch = record.receivedMerch || record;
                          const clientName = (merch.clientIds || record.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown client';
                          const quantity = record.quantityToShip || record.quantity || merch.quantity || 1;
                          return (
                            <tr key={record.id}>
                              <td><strong>{record.name || merch.productName || merch.name || 'Unnamed THR3D item'}</strong></td>
                              <td>{clientName}</td>
                              <td>{quantity}</td>
                              <td><span className="recv-outgoing-shipped-status">Shipped</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
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
              <button type="button" className={`recv-all-view-btn${allReceiptsLayout === 'list' ? ' is-active' : ''}`} onClick={() => setAllReceiptsLayout('list')}>List</button>
              <button type="button" className={`recv-all-view-btn${allReceiptsLayout === 'date' ? ' is-active' : ''}`} onClick={() => setAllReceiptsLayout('date')}>Date</button>
            </div>
            {allReceiptsLayout === 'date' && (
              <div className="recv-date-scope-toggle">
                <button type="button" className={`recv-all-view-btn${allReceiptsDateScope === 'previous-week' ? ' is-active' : ''}`} onClick={() => setAllReceiptsDateScope('previous-week')}>Previous Week</button>
                <button type="button" className={`recv-all-view-btn${allReceiptsDateScope === 'this-week' ? ' is-active' : ''}`} onClick={() => setAllReceiptsDateScope('this-week')}>This Week</button>
                <button type="button" className={`recv-all-view-btn${allReceiptsDateScope === 'month' ? ' is-active' : ''}`} onClick={() => setAllReceiptsDateScope('month')}>Month</button>
              </div>
            )}
          </div>
          {isSearching && (
            <div className="recv-all-scope-note">{filteredReceipts.length} shipment{filteredReceipts.length !== 1 ? 's' : ''} found · <button type="button" className="recv-all-scope-search" onClick={() => setSearch('')}>Clear</button></div>
          )}
          {allReceiptsLayout === 'list' ? (
            <div className="recv-all-list">
              <div className="recv-all-list-head" aria-hidden="true">
                <span>Client</span>
                <span>Carrier</span>
                <span>Tracking</span>
                <span>Received</span>
                <span>Items</span>
                <span></span>
              </div>
              {allReceipts.loading ? (
                <div className="empty-state">Loading...</div>
              ) : (
                (isSearching ? filteredReceipts : receiptList)
                  .slice()
                  .sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0))
                  .map(r => {
                    const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                    const entries = r.entries || [];
                    const canDelete = entries.length === 0;
                    return (
                      <div key={r.id} className="recv-all-item">
                        <button type="button" className="recv-all-item-open" onClick={() => openReceiptForEdit(r.id)} aria-label={`Edit shipment for ${clientName}`}>
                          <span className="recv-all-item-client">{clientName}</span>
                          <span className="recv-all-item-meta">{r.carrier || 'Unknown carrier'}</span>
                          <span className="recv-all-item-meta">{r.tracking || '-'}</span>
                          <span className="recv-all-item-meta">{formatInventoryDate(r.received) || '-'}</span>
                          <span className="recv-session-badge recv-all-items-badge">{entries.length} item{entries.length === 1 ? '' : 's'}</span>
                        </button>
                        <span className="recv-all-row-actions">
                          <button type="button" className="recv-all-item-edit" onClick={() => openReceiptForEdit(r.id)}>Edit</button>
                          <button
                            type="button"
                            className="recv-all-delete"
                            onClick={() => deleteShipmentFromHistory(r)}
                            disabled={!canDelete || saving === 'delete-shipment'}
                            title={canDelete ? 'Delete shipment' : 'Remove merchandise before deleting this shipment'}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    );
                  })
              )}
              {!allReceipts.loading && (isSearching ? filteredReceipts : receiptList).length === 0 && (
                <div className="empty-state">No shipments match that search.</div>
              )}
            </div>
          ) : (
          <div className={`recv-cal-grid is-${allReceiptsDateScope}`}>
            {allReceipts.loading && <div className="empty-state" style={{gridColumn:'1/-1'}}>Loading…</div>}
            {!allReceipts.loading && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              function sameDay(d1, d2) {
                return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
              }
              function startOfWeek(date) {
                const d = new Date(date);
                d.setDate(d.getDate() - d.getDay());
                d.setHours(0, 0, 0, 0);
                return d;
              }
              function weekColumns(offsetWeeks = 0) {
                const start = startOfWeek(today);
                start.setDate(start.getDate() + offsetWeeks * 7);
                return Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  return d;
                });
              }
              function monthColumns() {
                const first = new Date(today.getFullYear(), today.getMonth(), 1);
                const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return Array.from({ length: last.getDate() }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
              }
              const cols = allReceiptsDateScope === 'month'
                ? monthColumns()
                : weekColumns(allReceiptsDateScope === 'previous-week' ? -1 : 0);
              function colLabel(d) {
                if (sameDay(d, today)) return { day: 'Today', num: d.getDate(), isToday: true };
                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                if (sameDay(d, yesterday)) return { day: 'Yesterday', num: d.getDate(), isToday: false };
                return { day: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: APP_TIME_ZONE }), num: d.getDate(), isToday: false };
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
                        <div className="recv-search-day-label">{dateStr === 'Unknown' ? 'Unknown date' : new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: APP_TIME_ZONE })}</div>
                        {receipts.map(r => {
                          const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                          const entries = r.entries || [];
                          const productInfoCount = entries.filter(e => (e.itemIds || []).length > 0).length;
                          const pendingCount = entries.length - productInfoCount;
                          return (
                            <button key={r.id} type="button" className="recv-search-row" onClick={() => openReceiptForEdit(r.id)}>
                              <div className="recv-day-row-main"><strong>{clientName}</strong><span>{[r.carrier, r.tracking].filter(Boolean).join(' · ')}</span></div>
                              <div className="recv-day-row-right">
                                {productInfoCount > 0 && <span className="recv-sidebar-badge is-ok">{productInfoCount} with product info</span>}
                                {pendingCount > 0 && <span className="recv-sidebar-badge is-warn">{pendingCount} missing product info</span>}
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
                const colReceipts = receiptList.filter(r => r.received && sameDay(new Date(r.received), colDate));
                return (
                  <div key={colDate.toISOString()} className={`recv-cal-col${isToday ? ' is-today' : ''}`}>
                    <div className="recv-cal-col-head">
                      <span className="recv-cal-day-name">{day}</span>
                      <span className={`recv-cal-day-num${isToday ? ' is-today' : ''}`}>{num}</span>
                    </div>
                    <div className="recv-cal-col-body">
                      {colReceipts.length === 0 && <div className="recv-cal-empty">—</div>}
                      {colReceipts.map(r => {
                        const clientName = (r.clientIds || []).map(id => clientNameById[id]).filter(Boolean).join(', ') || 'Unknown';
                        const entries = r.entries || [];
                        const productInfoCount = entries.filter(e => (e.itemIds || []).length > 0).length;
                        const pendingCount = entries.length - productInfoCount;
                        return (
                          <button key={r.id} type="button" className="recv-cal-card" onClick={() => openReceiptForEdit(r.id)}>
                            <strong className="recv-cal-card-client">{clientName}</strong>
                            {r.carrier && <span className="recv-cal-card-meta">{[r.carrier, r.tracking].filter(Boolean).join(' · ')}</span>}
                            <div className="recv-cal-card-badges">
                              {productInfoCount > 0 && <span className="recv-sidebar-badge is-ok">{productInfoCount} with product info</span>}
                              {pendingCount > 0 && <span className="recv-sidebar-badge is-warn">{pendingCount} missing product info</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          )}
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

// ── Products page ─────────────────────────────────────────────────────────────
const DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS = [
  'client', 'name', 'upc', 'productionSummary', 'cvid', 'brandPrefix', 'requestType', 'projectStatus',
  'wkftJobNumber', 'mboxNumber', 'productType', 'productDescription',
  'preproOverlays', 'ecommPhotoNotes', 'pathToArt',
];
const PRODUCT_REQUEST_TYPE_OPTIONS = ['Ecomm only', 'Pack only', 'Thr3d only', 'Pack & Thr3d', 'Ecomm & Pack'];
const PRODUCT_TYPE_OPTIONS = ['Shelf Stable', 'Fresh/Perishable', 'Refrigeration Req', 'Freezer Req', 'Non-Food'];
const PRODUCT_GRID_ROW_HEIGHTS = ['small', 'medium', 'tall'];
const SOURCE_CHECK_VISIBLE_LIMIT = 20;
const SOURCE_CHECK_FIELD_CONFIG = {
  productName: { label: 'Product Name', marksKey: 'name', trackerKeys: ['Product Name'] },
  upc: { label: 'UPC', marksKey: 'upc', trackerKeys: ['UPC'], detail: 'Required to proceed for matching and Topco folder naming, including Ecomm.' },
  cvid: { label: 'CVID', marksKey: 'cvid', trackerKeys: ['CVID'], detail: 'Required to proceed for Ecomm file naming.' },
  brandPrefix: { label: 'Brand Prefix', marksKey: 'brandPrefix', trackerKeys: ['Brand Prefix'] },
  jobNumber: { label: 'WKFT Job Number', marksKey: 'wkftJobNumber', trackerKeys: ['WKFT #', 'WKFT Job Number'], detail: 'Required to proceed for Topco folder naming and handoff.' },
  fileNameDescription: { label: 'File Name Description', marksKey: 'productDescription', trackerKeys: ['Prod Descrip', 'Product Description'], detail: 'Source Prod Descrip is used as this packaging filename/handoff token and also shown as Product Description.' },
  productDescription: { label: 'Product Description', marksKey: 'productDescription', trackerKeys: ['Prod Descrip', 'Product Description'], detail: 'Display value from source Prod Descrip.' },
  productType: { label: 'Product Type', marksKey: 'productType', trackerKeys: ['Product Type'] },
  ecommPhotoNotes: { label: 'Ecomm Photo Notes', marksKey: 'ecommPhotoNotes', trackerKeys: ['Photo Notes', 'Ecomm Photo Notes'] },
  pathToArt: { label: 'Path to Art', marksKey: 'pathToArt', trackerKeys: ['Path to Art'] },
};
const TOPCO_SOURCE_CHECK_RULES = {
  version: 1,
  sourceIdentityFields: ['productName', 'upc'],
  activationField: 'requestType',
  requiredToProceed: {
    Packaging: ['productName', 'upc', 'jobNumber'],
    Ecomm: ['productName', 'upc', 'cvid'],
  },
  requestTypeMappings: {
    'ecomm only': { requiredDeliverables: ['Ecomm'], label: 'Ecomm required to proceed' },
    'pack only': { requiredDeliverables: ['Packaging'], label: 'Packaging required to proceed' },
    'ecomm pack': { requiredDeliverables: ['Ecomm', 'Packaging'], label: 'Ecomm + Packaging required to proceed' },
    'ecomm and pack': { requiredDeliverables: ['Ecomm', 'Packaging'], label: 'Ecomm + Packaging required to proceed' },
    'pack thr3d': { requiredDeliverables: ['Packaging'], shipmentContext: ['Thr3d'], label: 'Packaging required to proceed + Thr3d shipment context' },
    'pack and thr3d': { requiredDeliverables: ['Packaging'], shipmentContext: ['Thr3d'], label: 'Packaging required to proceed + Thr3d shipment context' },
    'thr3d only': { requiredDeliverables: [], noWalnutWorkExpected: true, alertIfReceived: true, label: 'No Walnut work expected; alert if received' },
    'not needed': { requiredDeliverables: [], noWalnutWorkExpected: true, alertIfReceived: true, label: 'No Walnut work expected; alert if received' },
  },
  sourceFieldMappings: [
    {
      sourceField: 'Prod Descrip',
      usedAs: ['File Name Description', 'Product Description'],
      note: 'For this Topco slice, Prod Descrip satisfies the packaging filename/handoff token and the display Product Description.',
    },
  ],
};
const SOURCE_CHECK_RULES_BY_CLIENT = {
  topco: TOPCO_SOURCE_CHECK_RULES,
};
const SOURCE_CHECK_REQUEST_TYPE_LABELS = {
  'ecomm only': 'Ecomm Only',
  'pack only': 'Pack Only',
  'ecomm pack': 'Ecomm & Pack',
  'ecomm and pack': 'Ecomm and Pack',
  'pack thr3d': 'Pack & Thr3d',
  'pack and thr3d': 'Pack and Thr3d',
  'thr3d only': 'Thr3d Only',
  'not needed': 'Not Needed',
};

function normalizedProductColumnOrder(order) {
  const source = Array.isArray(order) ? order : DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS;
  return [
    ...source.filter(id => DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS.includes(id)),
    ...DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS.filter(id => !source.includes(id)),
  ];
}

function loadProductGridPreferences(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return {
      visibleColumnIds: Array.isArray(parsed.visibleColumnIds) ? parsed.visibleColumnIds : DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS,
      columnOrder: normalizedProductColumnOrder(parsed.columnOrder),
      widths: parsed.widths && typeof parsed.widths === 'object' ? parsed.widths : {},
      rowHeight: PRODUCT_GRID_ROW_HEIGHTS.includes(parsed.rowHeight) ? parsed.rowHeight : 'medium',
      alternateRows: Boolean(parsed.alternateRows),
    };
  } catch {
    return { visibleColumnIds: DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS, columnOrder: DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS, widths: {}, rowHeight: 'medium', alternateRows: false };
  }
}

function saveProductGridPreferences(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The grid still works if browser storage is unavailable.
  }
}

function normalizedCompareValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function topcoReferenceValue(referenceData, keys) {
  const data = referenceData && typeof referenceData === 'object' ? referenceData : {};
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function sourceCheckRulesForClient(client) {
  const configuredRules = client?.sourceCheckRules || client?.readinessProfile?.sourceCheckRules;
  if (configuredRules && typeof configuredRules === 'object' && !Array.isArray(configuredRules)) return configuredRules;
  const key = String(client?.name || '').trim().toLowerCase();
  return SOURCE_CHECK_RULES_BY_CLIENT[key] || null;
}

function normalizedSourceCheckRequestTypeKey(value) {
  return stripSurroundingQuotes(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sourceCheckRequiredFields(client, requestTypeInfo) {
  const rules = sourceCheckRulesForClient(client) || {};
  const fields = new Set(rules.sourceIdentityFields || []);
  const requiredToProceed = rules.requiredToProceed || {};
  (requestTypeInfo.requiredDeliverables || [])
    .filter(deliverable => ['Packaging', 'Ecomm'].includes(deliverable))
    .forEach(deliverable => {
      (requiredToProceed[deliverable] || []).forEach(field => fields.add(field));
    });
  return [...fields]
    .map(field => SOURCE_CHECK_FIELD_CONFIG[field])
    .filter(Boolean);
}

function sourceCheckRequestTypeInfo(client, requestType) {
  const rules = sourceCheckRulesForClient(client) || {};
  const key = normalizedSourceCheckRequestTypeKey(requestType);
  if (!key) {
    return {
      state: 'missing-source',
      label: 'Missing in source sheet',
      requiredDeliverables: [],
      shipmentContext: [],
      noWalnutWorkExpected: false,
      alertIfReceived: false,
    };
  }
  const mapping = (rules.requestTypeMappings || {})[key];
  if (!mapping) {
    return {
      state: 'different',
      label: 'Needs review',
      requiredDeliverables: [],
      shipmentContext: [],
      noWalnutWorkExpected: false,
      alertIfReceived: false,
    };
  }
  return {
    state: 'match',
    label: mapping.label || 'Ready',
    requiredDeliverables: normalizeDeliverableList(mapping.requiredDeliverables || []),
    shipmentContext: normalizeDeliverableList(mapping.shipmentContext || []),
    noWalnutWorkExpected: Boolean(mapping.noWalnutWorkExpected),
    alertIfReceived: Boolean(mapping.alertIfReceived),
  };
}

function sourceCheckSuggestedLabel(info = {}) {
  if (info.noWalnutWorkExpected) return 'No Walnut work expected';
  const labels = [
    ...normalizeDeliverableList(info.requiredDeliverables || []),
    ...(info.shipmentContext || []).map(value => `${value} shipment`),
  ];
  return labels.length ? labels.join(' + ') : 'None';
}

function sourceCheckHasReceivedContext(item = {}) {
  const status = String(item.productionSummary?.status || '').trim();
  return Boolean(status && !['No Merchandise', 'Work Not Defined'].includes(status));
}

function topcoProductTrackerRows(items, clients) {
  const sourceCheckClients = (clients || []).filter(client => sourceCheckRulesForClient(client));
  const sourceCheckClientIds = new Set(sourceCheckClients.map(client => client.id));
  const sourceCheckClientById = Object.fromEntries(sourceCheckClients.map(client => [client.id, client]));
  return (items || [])
    .filter(item => (item.clientIds || []).some(id => sourceCheckClientIds.has(id)))
    .map(item => {
      const referenceData = item.referenceData || {};
      const client = (item.clientIds || []).map(id => sourceCheckClientById[id]).find(Boolean);
      const trackerRequestType = topcoReferenceValue(referenceData, ['Request Type']);
      const requestTypeInfo = sourceCheckRequestTypeInfo(client, trackerRequestType);
      const compareFields = sourceCheckRequiredFields(client, requestTypeInfo);
      const trackerUpc = topcoReferenceValue(referenceData, ['UPC']);
      const noWalnutWorkAlert = requestTypeInfo.alertIfReceived && sourceCheckHasReceivedContext(item);
      const requestTypeRow = {
        label: 'Request Type',
        detail: 'Activation field; suggests expected work only.',
        marksValue: item.requestType || '',
        trackerValue: trackerRequestType,
        state: noWalnutWorkAlert ? 'different' : requestTypeInfo.state,
        resultLabel: requestTypeInfo.label,
      };
      const rows = compareFields.map(field => {
        const marksValue = String(photoProductionProductValue(item, field.marksKey) || item[field.marksKey] || '').trim();
        const trackerValue = topcoReferenceValue(referenceData, field.trackerKeys);
        const marksKey = normalizedCompareValue(marksValue);
        const trackerKey = normalizedCompareValue(trackerValue);
        const state = trackerValue
          ? (marksValue ? (marksKey === trackerKey ? 'match' : 'different') : 'missing-application')
          : 'missing-source';
        return { ...field, marksValue, trackerValue, state };
      });
      const counts = [requestTypeRow, ...rows].reduce((total, row) => {
        total[row.state] = (total[row.state] || 0) + 1;
        return total;
      }, {});
      return {
        item,
        rows,
        requestTypeRow,
        counts,
        suggestedDeliverables: requestTypeInfo.requiredDeliverables,
        suggestedLabel: sourceCheckSuggestedLabel(requestTypeInfo),
        trackerRequestType,
        ambiguousMatchKey: !trackerUpc || normalizedCompareValue(trackerUpc) === 'no upc',
        noWalnutWorkExpected: requestTypeInfo.noWalnutWorkExpected,
        noWalnutWorkAlert,
        shipmentContext: requestTypeInfo.shipmentContext || [],
        sourceData: item.referenceData || {},
        ready: requestTypeInfo.state === 'match'
          && !noWalnutWorkAlert
          && !rows.some(row => ['different', 'missing-application', 'missing-source'].includes(row.state))
          && trackerUpc
          && normalizedCompareValue(trackerUpc) !== 'no upc',
      };
    })
    .filter(row => Object.keys(row.item.referenceData || {}).length > 0);
}

function topcoLiveSourceCheckRows(sourceCheck, clients) {
  const topcoClient = (clients || []).find(client => sourceCheckRulesForClient(client) && String(client.name || '').trim().toLowerCase() === 'topco')
    || (clients || []).find(client => sourceCheckRulesForClient(client));
  return (sourceCheck?.rows || []).map(row => {
    const sourceData = row.sourceData || {};
    const product = row.product || null;
    const item = product || {
      id: `source-row-${row.sourceRowNumber}`,
      name: sourceData['Product Name'] || 'Unnamed source row',
      upc: sourceData.UPC || '',
      primaryMatchKey: sourceData.UPC || '',
      requestType: '',
      referenceData: sourceData,
    };
    const trackerRequestType = sourceData['Request Type'] || '';
    const requestTypeInfo = sourceCheckRequestTypeInfo(topcoClient, trackerRequestType);
    const compareFields = sourceCheckRequiredFields(topcoClient, requestTypeInfo);
    const trackerUpc = sourceData.UPC || '';
    const noWalnutWorkAlert = requestTypeInfo.alertIfReceived && product && sourceCheckHasReceivedContext(product);
    const requestTypeRow = {
      label: 'Request Type',
      detail: 'Activation field; suggests expected work only.',
      marksValue: product?.requestType || '',
      trackerValue: trackerRequestType,
      state: noWalnutWorkAlert ? 'different' : requestTypeInfo.state,
      resultLabel: requestTypeInfo.label,
    };
    const rows = compareFields.map(field => {
      const marksValue = product
        ? String(photoProductionProductValue(product, field.marksKey) || product[field.marksKey] || '').trim()
        : '';
      const trackerValue = topcoReferenceValue(sourceData, field.trackerKeys);
      const marksKey = normalizedCompareValue(marksValue);
      const trackerKey = normalizedCompareValue(trackerValue);
      const state = trackerValue
        ? (marksValue ? (marksKey === trackerKey ? 'match' : 'different') : 'missing-application')
        : 'missing-source';
      return { ...field, marksValue, trackerValue, state };
    });
    const counts = [requestTypeRow, ...rows].reduce((total, compareRow) => {
      total[compareRow.state] = (total[compareRow.state] || 0) + 1;
      return total;
    }, {});
    return {
      item,
      rows,
      requestTypeRow,
      counts,
      sourceRowNumber: row.sourceRowNumber,
      matchMethod: row.matchMethod || '',
      matchCount: row.matchCount || 0,
      sourceData,
      hasProductData: Boolean(product),
      suggestedDeliverables: requestTypeInfo.requiredDeliverables,
      suggestedLabel: sourceCheckSuggestedLabel(requestTypeInfo),
      trackerRequestType,
      ambiguousMatchKey: !trackerUpc || normalizedCompareValue(trackerUpc) === 'no upc',
      noWalnutWorkExpected: requestTypeInfo.noWalnutWorkExpected,
      noWalnutWorkAlert,
      shipmentContext: requestTypeInfo.shipmentContext || [],
      ready: Boolean(product)
        && requestTypeInfo.state === 'match'
        && !noWalnutWorkAlert
        && !rows.some(compareRow => ['different', 'missing-application', 'missing-source'].includes(compareRow.state))
        && trackerUpc
        && normalizedCompareValue(trackerUpc) !== 'no upc',
    };
  });
}

function topcoCompareStateLabel(state) {
  if (state === 'match') return 'Ready';
  if (state === 'different') return 'Needs review';
  if (state === 'missing-application') return 'Needs review';
  if (state === 'missing-source') return 'Missing in source sheet';
  return 'Blank';
}

function normalizeProductGridCondition(condition, columns) {
  const column = columns.find(candidate => candidate.id === condition.columnId);
  const selectOperators = ['equals', 'not-equals', 'empty', 'not-empty'];
  const textOperators = ['contains', 'equals', 'empty', 'not-empty'];
  if (column?.filterType === 'select') {
    return {
      ...condition,
      operator: selectOperators.includes(condition.operator) ? condition.operator : 'equals',
    };
  }
  return {
    ...condition,
    operator: textOperators.includes(condition.operator) ? condition.operator : 'contains',
  };
}

function ProductsPage({ navigate }) {
  const { auth } = useAuth();
  const clients = useResource(() => api.listClients());
  const items = useResource(() => api.listProducts(), []);

  const clientList = clients.data?.records ?? [];
  const primaryMatchKeyLabel = getPrimaryMatchKeyLabel({ clientId: '', clients: clientList, allClients: true });
  const userPreferenceKey = `marks:products-grid:${auth?.user?.id || auth?.id || auth?.email || 'local'}`;
  const [itemList, setItemList] = useState([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false);
  const [gridSearch, setGridSearch] = useState('');
  const [gridConditions, setGridConditions] = useState([]);
  const [groupByColumnId, setGroupByColumnId] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [editDrafts, setEditDrafts] = useState({});
  const [savingCell, setSavingCell] = useState('');
  const [gridError, setGridError] = useState('');
  const [columnPrefs, setColumnPrefs] = useState(() => loadProductGridPreferences(userPreferenceKey));
  const [topcoCompareOpen, setTopcoCompareOpen] = useState(() => {
    try {
      return window.localStorage.getItem('marks:topco-tracker-compare') === '1';
    } catch {
      return false;
    }
  });
  const [topcoCompareLastChecked, setTopcoCompareLastChecked] = useState('');
  const [topcoCompareChecking, setTopcoCompareChecking] = useState(false);
  const [topcoSourceCheck, setTopcoSourceCheck] = useState(null);
  const [topcoSourceCheckError, setTopcoSourceCheckError] = useState('');
  const [sourceLookupSearch, setSourceLookupSearch] = useState('');
  const [sourceLookupNotice, setSourceLookupNotice] = useState('');
  const [activatingSourceRow, setActivatingSourceRow] = useState('');
  const [topcoProductSyncing, setTopcoProductSyncing] = useState(false);
  const [draggingColumnId, setDraggingColumnId] = useState('');
  const [columnDropTarget, setColumnDropTarget] = useState(null);
  const [fillDrag, setFillDrag] = useState(null);
  const [fillTargetItemId, setFillTargetItemId] = useState('');
  const resizeRef = useRef(null);
  const filterMenuRef = useRef(null);
  const groupMenuRef = useRef(null);
  const columnsMenuRef = useRef(null);

  useEffect(() => {
    if (items.data?.records) {
      setItemList(items.data.records);
      setGridError('');
    }
  }, [items.data]);

  useEffect(() => {
    setColumnPrefs(loadProductGridPreferences(userPreferenceKey));
  }, [userPreferenceKey]);

  useEffect(() => {
    saveProductGridPreferences(userPreferenceKey, columnPrefs);
  }, [userPreferenceKey, columnPrefs]);

  useEffect(() => {
    try {
      window.localStorage.setItem('marks:topco-tracker-compare', topcoCompareOpen ? '1' : '0');
    } catch {
      // The compare panel is still removable if browser storage is unavailable.
    }
  }, [topcoCompareOpen]);

  const loadTopcoSourceCheck = useCallback(async () => {
    const data = await api.topcoSourceCheck({ limit: SOURCE_CHECK_VISIBLE_LIMIT });
    setTopcoSourceCheck(data);
    setTopcoSourceCheckError('');
    setTopcoCompareLastChecked(new Date(data.checkedAt || Date.now()).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }));
    return data;
  }, []);

  useEffect(() => {
    if (!topcoCompareOpen || topcoSourceCheck || topcoCompareChecking) return;
    setTopcoCompareChecking(true);
    loadTopcoSourceCheck()
      .catch(error => {
        setTopcoSourceCheckError(error.message || 'Could not read source sheet.');
      })
      .finally(() => setTopcoCompareChecking(false));
  }, [loadTopcoSourceCheck, topcoCompareChecking, topcoCompareOpen, topcoSourceCheck]);

  useEffect(() => {
    function closeProductPopovers(event) {
      if (event.key === 'Escape') {
        setFilterPopoverOpen(false);
        setGroupPopoverOpen(false);
        setColumnsPopoverOpen(false);
        return;
      }
      if (event.type !== 'mousedown') return;
      const target = event.target;
      if (
        filterMenuRef.current?.contains(target)
        || groupMenuRef.current?.contains(target)
        || columnsMenuRef.current?.contains(target)
      ) return;
      setFilterPopoverOpen(false);
      setGroupPopoverOpen(false);
      setColumnsPopoverOpen(false);
    }
    document.addEventListener('mousedown', closeProductPopovers);
    document.addEventListener('keydown', closeProductPopovers);
    return () => {
      document.removeEventListener('mousedown', closeProductPopovers);
      document.removeEventListener('keydown', closeProductPopovers);
    };
  }, []);

  useEffect(() => {
    function moveResize(event) {
      const resize = resizeRef.current;
      if (!resize) return;
      const nextWidth = Math.max(96, Math.round(resize.startWidth + event.clientX - resize.startX));
      setColumnPrefs(current => ({
        ...current,
        widths: { ...(current.widths || {}), [resize.columnId]: nextWidth },
      }));
    }
    function stopResize() {
      resizeRef.current = null;
      document.body.classList.remove('is-resizing-products-grid');
    }
    document.addEventListener('mousemove', moveResize);
    document.addEventListener('mouseup', stopResize);
    return () => {
      document.removeEventListener('mousemove', moveResize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, []);

  function clientNames(item) {
    const names = (item.clientIds ?? [])
      .map(id => clientList.find(client => client.id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }
  const productGridColumns = [
    { id: 'client', header: 'Client', value: item => clientNames(item), editable: false, locked: true, defaultWidth: 150, filterType: 'select' },
    { id: 'name', header: 'Product', key: 'name', editable: true, defaultWidth: 260 },
    { id: 'upc', header: 'UPC', key: 'primaryMatchKey', patchKey: 'primaryMatchKey', editable: true, monospace: true, defaultWidth: 170 },
    { id: 'productionSummary', header: 'Production', value: item => item.productionSummary?.status || 'Not Calculated', editable: false, defaultWidth: 180, filterType: 'select' },
    { id: 'cvid', header: 'CVID', key: 'cvid', patchKey: 'cvid', editable: true, monospace: true, defaultWidth: 150 },
    { id: 'brandPrefix', header: 'Brand Prefix', key: 'brandPrefix', patchKey: 'brandPrefix', editable: true, defaultWidth: 150 },
    { id: 'requestType', header: 'Request Type', key: 'requestType', editable: true, options: PRODUCT_REQUEST_TYPE_OPTIONS, defaultWidth: 170, filterType: 'select' },
    { id: 'projectStatus', header: 'Project Status', key: 'projectStatus', editable: false, defaultWidth: 170, filterType: 'select' },
    { id: 'wkftJobNumber', header: 'WKFT Job Number', key: 'wkftJobNumber', patchKey: 'wkftJobNumber', editable: true, defaultWidth: 180 },
    { id: 'mboxNumber', header: 'Mbox Number', key: 'mboxNumber', patchKey: 'mboxNumber', editable: true, defaultWidth: 160 },
    { id: 'productType', header: 'Product Type', key: 'productType', patchKey: 'productType', editable: true, options: PRODUCT_TYPE_OPTIONS, defaultWidth: 170, filterType: 'select' },
    { id: 'productDescription', header: 'Product Description', key: 'productDescription', patchKey: 'productDescription', editable: true, defaultWidth: 260 },
    { id: 'preproOverlays', header: 'Link to Prepro/Overlays', key: 'preproOverlays', patchKey: 'preproOverlays', editable: true, defaultWidth: 240 },
    { id: 'ecommPhotoNotes', header: 'Ecomm Photo Notes', key: 'ecommPhotoNotes', patchKey: 'ecommPhotoNotes', editable: true, defaultWidth: 240 },
    { id: 'pathToArt', header: 'Path to Art', key: 'pathToArt', patchKey: 'pathToArt', editable: true, defaultWidth: 240 },
  ];
  const visibleColumnIds = columnPrefs.visibleColumnIds || DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS;
  const orderedColumnIds = normalizedProductColumnOrder(columnPrefs.columnOrder);
  const orderedProductGridColumns = orderedColumnIds
    .map(columnId => productGridColumns.find(column => column.id === columnId))
    .filter(Boolean);
  const productGridRowHeight = PRODUCT_GRID_ROW_HEIGHTS.includes(columnPrefs.rowHeight) ? columnPrefs.rowHeight : 'medium';
  const alternateProductRows = Boolean(columnPrefs.alternateRows);
  const visibleProductGridColumns = orderedProductGridColumns.filter(column => column.locked || visibleColumnIds.includes(column.id));
  const lastVisibleProductGridColumnId = visibleProductGridColumns.at(-1)?.id || '';
  const tableColumnCount = visibleProductGridColumns.length + 1;
  const productGridColumnWidths = Object.fromEntries(visibleProductGridColumns.map(column => [
    column.id,
    columnPrefs.widths?.[column.id] || column.defaultWidth || 160,
  ]));
  const productGridTableWidth = visibleProductGridColumns.reduce((total, column) => total + productGridColumnWidths[column.id], 56);
  const activeConditionCount = gridConditions.filter(condition => (
    ['empty', 'not-empty'].includes(condition.operator) || String(condition.value || '').trim()
  )).length;
  const activeFilterCount = activeConditionCount + (gridSearch.trim() ? 1 : 0);
  const productFilterOperatorLabels = {
    contains: 'contains',
    equals: 'is',
    'not-equals': 'is not',
    empty: 'is empty',
    'not-empty': 'is not empty',
  };
  const activeFilterChips = [
    ...(gridSearch.trim() ? [{ id: 'search', label: `Search: ${gridSearch.trim()}`, clear: () => setGridSearch('') }] : []),
    ...gridConditions
      .filter(condition => ['empty', 'not-empty'].includes(condition.operator) || String(condition.value || '').trim())
      .map(condition => {
        const column = visibleProductGridColumns.find(candidate => candidate.id === condition.columnId);
        const operator = productFilterOperatorLabels[condition.operator] || condition.operator;
        const value = ['empty', 'not-empty'].includes(condition.operator) ? '' : ` ${condition.value}`;
        return {
          id: condition.id,
          label: `${column?.header || 'Field'} ${operator}${value}`,
          clear: () => removeGridCondition(condition.id),
        };
      }),
  ];
  const baseVisibleItems = itemList;
  const filteredItems = baseVisibleItems.filter(item => {
    const search = gridSearch.trim().toLowerCase();
    const matchesSearch = !search || visibleProductGridColumns.some(column => (
      String(productCellValue(item, column)).toLowerCase().includes(search)
    ));
    if (!matchesSearch) return false;
    return gridConditions.every(condition => matchesGridCondition(item, condition));
  });
  const sortedItems = [...filteredItems].sort((a, b) => {
    const column = visibleProductGridColumns.find(col => col.id === sortConfig.key);
    if (!column) return 0;
    const left = String(productCellValue(a, column)).toLowerCase();
    const right = String(productCellValue(b, column)).toLowerCase();
    const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    return sortConfig.direction === 'desc' ? -result : result;
  });
  const visibleItems = sortedItems;
  const sourceLookupClient = clientList.find(client => sourceCheckRulesForClient(client) && String(client.name || '').trim().toLowerCase() === 'topco')
    || clientList.find(client => sourceCheckRulesForClient(client));
  const canSyncTopcoProducts = isAdminRole(auth?.role) && Boolean(sourceLookupClient);
  const allTopcoCompareRows = topcoSourceCheck
    ? topcoLiveSourceCheckRows(topcoSourceCheck, clientList)
    : topcoProductTrackerRows(visibleItems, clientList).slice(0, SOURCE_CHECK_VISIBLE_LIMIT);
  const sourceLookupSearchText = sourceLookupSearch.trim().toLowerCase();
  const topcoCompareRows = sourceLookupSearchText
    ? allTopcoCompareRows.filter(compare => [
        compare.item?.name,
        compare.item?.upc,
        compare.item?.primaryMatchKey,
        compare.trackerRequestType,
        compare.suggestedLabel,
        compare.sourceRowNumber,
        ...Object.values(compare.sourceData || {}),
      ].some(value => String(value || '').toLowerCase().includes(sourceLookupSearchText)))
    : allTopcoCompareRows;
  const topcoCompareTotals = topcoCompareRows.reduce((totals, row) => {
    const missingSource = row.counts['missing-source'] || 0;
    const needsReview = (row.counts.different || 0) + (row.counts['missing-application'] || 0);
    if (row.ambiguousMatchKey) totals.ambiguous += 1;
    else if (missingSource) totals.missingSource += 1;
    else if (needsReview || !row.ready) totals.needsReview += 1;
    else totals.ready += 1;
    return totals;
  }, { ready: 0, missingSource: 0, needsReview: 0, ambiguous: 0 });
  const visibleProductIndexById = Object.fromEntries(visibleItems.map((item, index) => [item.id, index]));
  const groupByColumn = visibleProductGridColumns.find(column => column.id === groupByColumnId);
  const groupedVisibleItems = groupByColumn
    ? Object.entries(visibleItems.reduce((groups, item) => {
        const label = String(productCellValue(item, groupByColumn) || '').trim() || 'Blank';
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
        return groups;
      }, {})).map(([label, records]) => ({ label, records }))
    : [{ label: '', records: visibleItems }];
  const productExportColumns = [
    ...visibleProductGridColumns.map(column => ({
      header: column.header,
      key: column.key,
      value: column.value,
    })),
  ];

  function productColumnOptions(column) {
    if (column.filterType !== 'select') return [];
    return [...new Set(itemList.map(item => String(productCellValue(item, column) || '').trim()).filter(Boolean))].sort((a, b) => (
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    ));
  }

  function productCellValue(item, column) {
    if (column.value) return column.value(item);
    return item[column.key] ?? '';
  }

  function matchesGridCondition(item, condition) {
    const column = visibleProductGridColumns.find(candidate => candidate.id === condition.columnId);
    if (!column) return true;
    const rawValue = String(productCellValue(item, column) || '');
    const value = rawValue.trim().toLowerCase();
    const target = String(condition.value || '').trim().toLowerCase();
    if (condition.operator === 'empty') return !value;
    if (condition.operator === 'not-empty') return Boolean(value);
    if (!target) return true;
    if (condition.operator === 'not-equals') return value !== target;
    if (condition.operator === 'equals') return value === target;
    return value.includes(target);
  }

  function addGridCondition() {
    setGridConditions(current => [
      ...current,
      { id: Date.now().toString(36), columnId: visibleProductGridColumns[0]?.id || 'name', operator: 'contains', value: '' },
    ]);
  }

  function updateGridCondition(conditionId, patch) {
    setGridConditions(current => current.map(condition => (
      condition.id === conditionId ? normalizeProductGridCondition({ ...condition, ...patch }, visibleProductGridColumns) : condition
    )));
  }

  function removeGridCondition(conditionId) {
    setGridConditions(current => current.filter(condition => condition.id !== conditionId));
  }

  function toggleProductSort(columnId) {
    setSortConfig(current => (
      current.key === columnId
        ? { key: columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: columnId, direction: 'asc' }
    ));
  }

  function toggleProductColumn(columnId) {
    const column = productGridColumns.find(candidate => candidate.id === columnId);
    if (!column || column.locked) return;
    setColumnPrefs(current => {
      const currentIds = current.visibleColumnIds || DEFAULT_PRODUCT_GRID_VISIBLE_COLUMNS;
      const nextIds = currentIds.includes(columnId)
        ? currentIds.filter(id => id !== columnId)
        : [...currentIds, columnId];
      return { ...current, visibleColumnIds: nextIds };
    });
  }

  function moveProductColumn(sourceColumnId, targetColumnId, placement = 'before') {
    if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return;
    setColumnPrefs(current => {
      const order = normalizedProductColumnOrder(current.columnOrder);
      const fromIndex = order.indexOf(sourceColumnId);
      const toIndex = order.indexOf(targetColumnId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const nextOrder = [...order];
      const [moved] = nextOrder.splice(fromIndex, 1);
      const targetIndex = nextOrder.indexOf(targetColumnId);
      nextOrder.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, moved);
      return { ...current, columnOrder: nextOrder };
    });
  }

  function productColumnDropPlacement(event, axis = 'x') {
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = axis === 'y' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    const pointer = axis === 'y' ? event.clientY : event.clientX;
    return pointer > midpoint ? 'after' : 'before';
  }

  function startProductColumnDrag(event, column) {
    if (resizeRef.current) return;
    setDraggingColumnId(column.id);
    setColumnDropTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', column.id);
    event.dataTransfer.setData('application/x-product-column', column.id);
  }

  function dragOverProductColumn(event, column, axis = 'x') {
    const sourceColumnId = event.dataTransfer.getData('application/x-product-column') || draggingColumnId;
    if (!sourceColumnId || sourceColumnId === column.id) return;
    event.preventDefault();
    const placement = productColumnDropPlacement(event, axis);
    setColumnDropTarget({ columnId: column.id, placement });
    event.dataTransfer.dropEffect = 'move';
  }

  function dropProductColumn(event, column, axis = 'x') {
    const sourceColumnId = event.dataTransfer.getData('application/x-product-column') || event.dataTransfer.getData('text/plain') || draggingColumnId;
    if (!sourceColumnId || sourceColumnId === column.id) return;
    event.preventDefault();
    moveProductColumn(sourceColumnId, column.id, productColumnDropPlacement(event, axis));
    setDraggingColumnId('');
    setColumnDropTarget(null);
  }

  function endProductColumnDrag() {
    setDraggingColumnId('');
    setColumnDropTarget(null);
  }

  function startColumnResize(event, column) {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      columnId: column.id,
      startX: event.clientX,
      startWidth: columnPrefs.widths?.[column.id] || column.defaultWidth || 160,
    };
    document.body.classList.add('is-resizing-products-grid');
  }

  function draftKey(itemId, columnId) {
    return `${itemId}:${columnId}`;
  }

  async function saveProductCell(item, column, rawValue) {
    const nextValue = rawValue.trim();
    const currentValue = String(item[column.key] ?? '');
    const key = draftKey(item.id, column.id);
    if (nextValue === currentValue) {
      setEditDrafts(current => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
      return;
    }
    setSavingCell(key);
    setGridError('');
    try {
      const patchKey = column.patchKey || column.key;
      const data = await api.updateProduct(item.id, {
        [patchKey]: nextValue,
        codeType: item.codeType,
        primaryMatchKeyLabel,
      });
      const updated = data.record || data;
      setItemList(current => current.map(row => row.id === item.id ? updated : row));
      setEditDrafts(current => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
    } catch (error) {
      setGridError(error.message || 'Could not save Product edit.');
    } finally {
      setSavingCell('');
    }
  }

  async function applyProductCellFill(source, targetItem) {
    if (!source?.column?.editable || !targetItem || source.itemId === targetItem.id) return;
    const column = source.column;
    const nextValue = String(source.value || '').trim();
    const sourceIndex = visibleProductIndexById[source.itemId];
    const targetIndex = visibleProductIndexById[targetItem.id];
    if (sourceIndex === undefined || targetIndex === undefined) return;
    const start = Math.min(sourceIndex, targetIndex);
    const end = Math.max(sourceIndex, targetIndex);
    const targetItems = visibleItems.slice(start, end + 1).filter(item => item.id !== source.itemId);
    if (targetItems.length === 0) return;
    setGridError('');
    try {
      const patchKey = column.patchKey || column.key;
      for (const item of targetItems) {
        const currentValue = String(item[column.key] ?? '');
        if (nextValue === currentValue) continue;
        const key = draftKey(item.id, column.id);
        setSavingCell(key);
        setEditDrafts(current => ({ ...current, [key]: nextValue }));
        const data = await api.updateProduct(item.id, {
          [patchKey]: nextValue,
          codeType: item.codeType,
          primaryMatchKeyLabel,
        });
        const updated = data.record || data;
        setItemList(current => current.map(row => row.id === item.id ? updated : row));
        setEditDrafts(current => {
          const copy = { ...current };
          delete copy[key];
          return copy;
        });
      }
    } catch (error) {
      setGridError(error.message || 'Could not fill Product cells.');
    } finally {
      setSavingCell('');
    }
  }

  function isProductFillSelected(item, column) {
    if (!fillDrag || fillDrag.column?.id !== column.id || !fillTargetItemId) return false;
    const sourceIndex = visibleProductIndexById[fillDrag.itemId];
    const targetIndex = visibleProductIndexById[fillTargetItemId];
    const itemIndex = visibleProductIndexById[item.id];
    if (sourceIndex === undefined || targetIndex === undefined || itemIndex === undefined) return false;
    return itemIndex >= Math.min(sourceIndex, targetIndex) && itemIndex <= Math.max(sourceIndex, targetIndex);
  }

  function startProductFillDrag(event, item, column, value) {
    setFillDrag({ itemId: item.id, column, value });
    setFillTargetItemId(item.id);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', value);
  }

  function enterProductFillTarget(item, column) {
    if (fillDrag?.column?.id === column.id) setFillTargetItemId(item.id);
  }

  function overProductFillTarget(event, item, column) {
    if (fillDrag?.column?.id !== column.id || fillDrag.itemId === item.id) return;
    event.preventDefault();
    setFillTargetItemId(item.id);
    event.dataTransfer.dropEffect = 'copy';
  }

  function dropProductFill(event, item, column) {
    if (fillDrag?.column?.id !== column.id) return;
    event.preventDefault();
    applyProductCellFill(fillDrag, item);
    setFillDrag(null);
    setFillTargetItemId('');
  }

  function endProductFillDrag() {
    setFillDrag(null);
    setFillTargetItemId('');
  }

  async function deleteProduct(item) {
    const label = item.name || item.product || item.identifier || 'this Product';
    if (!window.confirm(`Delete ${label}? This removes the Product reference record and cannot be undone.`)) return;
    setGridError('');
    try {
      await api.deleteProduct(item.id);
      setItemList(current => current.filter(row => row.id !== item.id));
    } catch (error) {
      setGridError(error.message || 'Could not delete Product.');
    }
  }

  async function recheckTopcoCompare() {
    setTopcoCompareChecking(true);
    setSourceLookupNotice('');
    try {
      await Promise.all([
        items.reload({ quiet: true }),
        loadTopcoSourceCheck(),
      ]);
    } catch (error) {
      setTopcoSourceCheckError(error.message || 'Could not read source sheet.');
    } finally {
      setTopcoCompareChecking(false);
    }
  }

  async function syncTopcoProductsFromSource() {
    if (!sourceLookupClient || topcoProductSyncing) return;
    setTopcoProductSyncing(true);
    setGridError('');
    setSourceLookupNotice('');
    try {
      const data = await api.refreshTopcoSourceLinkedProducts({
        clientId: sourceLookupClient.id,
        limit: sourceRefreshConfigForClient(sourceLookupClient)?.limit || 100,
      });
      await Promise.all([
        items.reload({ quiet: true }),
        topcoCompareOpen ? loadTopcoSourceCheck() : Promise.resolve(),
      ]);
      setSourceLookupNotice(`Synced ${data.updated || 0} Product${data.updated === 1 ? '' : 's'} from the source sheet.`);
    } catch (error) {
      setGridError(error.message || 'Could not sync Products from the source sheet.');
    } finally {
      setTopcoProductSyncing(false);
    }
  }

  async function activateTopcoSourceRow(compare) {
    if (!compare?.sourceRowNumber) return;
    setGridError('');
    setSourceLookupNotice('');
    setActivatingSourceRow(String(compare.sourceRowNumber));
    try {
      const data = await api.activateTopcoSourceRow({
        sourceRowNumber: compare.sourceRowNumber,
        clientId: sourceLookupClient?.id || '',
      });
      const productName = data.record?.name || compare.item?.name || `source row ${compare.sourceRowNumber}`;
      setSourceLookupNotice(`${productName} activated in Marks.`);
      await Promise.all([
        items.reload({ quiet: true }),
        loadTopcoSourceCheck(),
      ]);
    } catch (error) {
      setGridError(error.message || 'Could not activate source row in Marks.');
    } finally {
      setActivatingSourceRow('');
    }
  }

  return (
    <div className="page-stack">
      {items.error && <div className="error-state">{items.error}</div>}
      {gridError && <div className="error-state">{gridError}</div>}

      <DataTableToolbar>
        <div className="products-grid-toolbar">
          <div className="products-grid-actions">
            {activeFilterChips.length > 0 && (
              <div className="products-active-filters" aria-label="Active Product filters">
                {activeFilterChips.map(chip => (
                  <button
                    type="button"
                    className="products-active-filter-chip"
                    onClick={chip.clear}
                    title={`Clear ${chip.label}`}
                    key={chip.id}
                  >
                    <span>{chip.label}</span>
                    <X size={13} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            <div className="products-grid-filter-menu" ref={filterMenuRef}>
            <button
              type="button"
              className={`btn btn-ghost table-filter-button${activeFilterCount ? ' is-active' : ''}`}
              onClick={() => setFilterPopoverOpen(open => !open)}
            >
              <FilterIcon size={16} strokeWidth={2} />
              Filter{activeFilterCount ? ` ${activeFilterCount}` : ''}
            </button>
            {filterPopoverOpen && (
              <div className="products-filter-popover" role="dialog" aria-label="Product filters">
                <div className="products-filter-title">Filter</div>
                <input
                  className="products-filter-search"
                  value={gridSearch}
                  onChange={event => setGridSearch(event.target.value)}
                  placeholder="Describe what you want to see"
                  aria-label="Search products"
                />
                {gridConditions.length === 0 ? (
                  <div className="products-filter-empty">No filter conditions are applied</div>
                ) : (
                  <div className="products-filter-conditions">
                    {gridConditions.map(condition => {
                      const conditionColumn = visibleProductGridColumns.find(column => column.id === condition.columnId) || visibleProductGridColumns[0];
                      const isSelectFilter = conditionColumn?.filterType === 'select';
                      const valueOptions = productColumnOptions(conditionColumn);
                      return (
                        <div className="products-filter-condition" key={condition.id}>
                          <select value={condition.columnId} onChange={event => updateGridCondition(condition.id, { columnId: event.target.value, value: '' })}>
                            {visibleProductGridColumns.map(column => <option value={column.id} key={column.id}>{column.header}</option>)}
                          </select>
                          <select value={condition.operator} onChange={event => updateGridCondition(condition.id, { operator: event.target.value })}>
                            {isSelectFilter ? (
                              <>
                                <option value="equals">is</option>
                                <option value="not-equals">is not</option>
                                <option value="empty">is empty</option>
                                <option value="not-empty">is not empty</option>
                              </>
                            ) : (
                              <>
                                <option value="contains">contains</option>
                                <option value="equals">is</option>
                                <option value="empty">is empty</option>
                                <option value="not-empty">is not empty</option>
                              </>
                            )}
                          </select>
                          {!['empty', 'not-empty'].includes(condition.operator) && (
                            isSelectFilter ? (
                              <select
                                value={condition.value}
                                onChange={event => updateGridCondition(condition.id, { value: event.target.value })}
                                aria-label="Filter value"
                              >
                                <option value="">Choose value…</option>
                                {valueOptions.map(option => <option value={option} key={option}>{option}</option>)}
                              </select>
                            ) : (
                              <input
                                value={condition.value}
                                onChange={event => updateGridCondition(condition.id, { value: event.target.value })}
                                placeholder="Value"
                                aria-label="Filter value"
                              />
                            )
                          )}
                          <button type="button" className="products-filter-remove" onClick={() => removeGridCondition(condition.id)} aria-label="Remove filter">×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="products-filter-footer">
                  <button type="button" className="products-filter-add" onClick={addGridCondition}>+ Add condition</button>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      className="products-filter-clear"
                      onClick={() => {
                        setGridSearch('');
                        setGridConditions([]);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
            <div className="products-grid-filter-menu" ref={columnsMenuRef}>
            <button
              type="button"
              className="btn btn-ghost table-filter-button"
              onClick={() => setColumnsPopoverOpen(open => !open)}
            >
              <Columns3 size={16} strokeWidth={2} />
              Columns
            </button>
            {columnsPopoverOpen && (
              <div className="products-filter-popover products-columns-popover" role="dialog" aria-label="Product columns">
                <div className="products-filter-title">Columns</div>
                <div className="products-columns-list">
                  {orderedProductGridColumns.map(column => (
                    <div
                      className={[
                        'products-column-option',
                        draggingColumnId === column.id ? 'is-dragging' : '',
                        columnDropTarget?.columnId === column.id ? `is-drop-${columnDropTarget.placement}` : '',
                      ].filter(Boolean).join(' ')}
                      key={column.id}
                      draggable
                      onDragStart={event => startProductColumnDrag(event, column)}
                      onDragOver={event => dragOverProductColumn(event, column, 'y')}
                      onDragLeave={() => setColumnDropTarget(current => current?.columnId === column.id ? null : current)}
                      onDrop={event => dropProductColumn(event, column, 'y')}
                      onDragEnd={endProductColumnDrag}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={column.locked || visibleColumnIds.includes(column.id)}
                          disabled={column.locked}
                          onChange={() => toggleProductColumn(column.id)}
                        />
                        <span>{column.header}</span>
                      </label>
                      <GripVertical className="products-column-drag-handle" size={15} strokeWidth={2.4} aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <div className="products-view-options">
                  <div className="products-view-option-label">Row height</div>
                  <div className="products-row-height-control" role="group" aria-label="Product row height">
                    {PRODUCT_GRID_ROW_HEIGHTS.map(size => (
                      <button
                        type="button"
                        className={productGridRowHeight === size ? 'is-active' : ''}
                        onClick={() => setColumnPrefs(current => ({ ...current, rowHeight: size }))}
                        key={size}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <label className="products-column-option products-stripe-option">
                    <input
                      type="checkbox"
                      checked={alternateProductRows}
                      onChange={event => setColumnPrefs(current => ({ ...current, alternateRows: event.target.checked }))}
                    />
                    <span>Alternate row backgrounds</span>
                  </label>
                </div>
              </div>
            )}
            </div>
            <div className="products-grid-filter-menu" ref={groupMenuRef}>
            <button
              type="button"
              className={`btn btn-ghost table-filter-button${groupByColumnId ? ' is-active' : ''}`}
              onClick={() => setGroupPopoverOpen(open => !open)}
            >
              <GroupIcon size={16} strokeWidth={2} />
              Group{groupByColumn ? `: ${groupByColumn.header}` : ''}
            </button>
            {groupPopoverOpen && (
              <div className="products-filter-popover products-group-popover" role="dialog" aria-label="Product grouping">
                <div className="products-filter-title">Group</div>
                <div className="products-group-body">
                  <label>
                    <span>Group by</span>
                    <select value={groupByColumnId} onChange={event => setGroupByColumnId(event.target.value)}>
                      <option value="">No grouping</option>
                      {visibleProductGridColumns.map(column => <option value={column.id} key={column.id}>{column.header}</option>)}
                    </select>
                  </label>
                  {!groupByColumnId && <div className="products-filter-empty">No grouping is applied</div>}
                </div>
                {groupByColumnId && (
                  <div className="products-filter-footer">
                    <button type="button" className="products-filter-clear" onClick={() => setGroupByColumnId('')}>Clear</button>
                  </div>
                )}
              </div>
            )}
            </div>
            <button
              type="button"
              className={`btn btn-ghost table-filter-button${topcoCompareOpen ? ' is-active' : ''}`}
              onClick={() => setTopcoCompareOpen(open => !open)}
              title="Look up Topco source sheet rows"
            >
              <ClipboardList size={16} strokeWidth={2} />
              Source Lookup
            </button>
            {canSyncTopcoProducts && (
              <button
                type="button"
                className="btn btn-ghost table-filter-button"
                onClick={syncTopcoProductsFromSource}
                disabled={topcoProductSyncing}
                title="Sync existing source-linked Products from the source sheet"
              >
                <RefreshCw size={15} strokeWidth={2} />
                {topcoProductSyncing ? 'Syncing...' : 'Sync Products'}
              </button>
            )}
            <ExcelExportButton
              filename={todayExportFilename('products')}
              columns={productExportColumns}
              rows={visibleItems}
              disabled={items.loading}
            />
          </div>
        </div>
      </DataTableToolbar>

      {topcoCompareOpen && (
        <section className="topco-compare-panel" aria-label="Source Lookup">
          <div className="topco-compare-head">
            <div>
              <div className="topco-compare-title">Source Lookup</div>
              <div className="topco-compare-sub">
                {topcoSourceCheck
                  ? `Read-only lookup of ${topcoSourceCheck.source?.sheetName || 'source sheet'} ${topcoSourceCheck.source?.range || ''}.`
                  : 'Read-only lookup of the first 20 source-backed rows in this Products view.'}
              </div>
            </div>
            <div className="topco-compare-actions">
              <input
                className="topco-source-search"
                value={sourceLookupSearch}
                onChange={event => setSourceLookupSearch(event.target.value)}
                placeholder="Search source rows"
                aria-label="Search source rows"
              />
              <span>Last checked: {topcoCompareLastChecked || 'Not yet'}</span>
              <button className="btn btn-ghost table-filter-button" type="button" onClick={recheckTopcoCompare} disabled={topcoCompareChecking}>
                <RefreshCw size={15} strokeWidth={2} />
                {topcoCompareChecking ? 'Checking...' : 'Recheck source sheet'}
              </button>
              <button className="btn btn-ghost table-filter-button" type="button" onClick={() => setTopcoCompareOpen(false)}>
                <X size={15} strokeWidth={2.2} />
                Hide
              </button>
            </div>
          </div>
          <div className="topco-compare-summary" aria-label="Source Lookup summary">
            <span><strong>{topcoCompareRows.length}</strong> rows checked</span>
            <span><strong>{topcoCompareTotals.ready}</strong> ready</span>
            <span><strong>{topcoCompareTotals.missingSource}</strong> missing in source sheet</span>
            <span><strong>{topcoCompareTotals.needsReview}</strong> needs review</span>
            <span><strong>{topcoCompareTotals.ambiguous}</strong> ambiguous match</span>
          </div>
          {topcoSourceCheckError && (
            <div className="topco-compare-warning">Could not read the live source sheet. Showing stored Product source data instead. {topcoSourceCheckError}</div>
          )}
          {sourceLookupNotice && (
            <div className="topco-compare-note">{sourceLookupNotice}</div>
          )}
          {topcoCompareRows.length === 0 ? (
            <div className="topco-compare-empty">No source rows match this lookup.</div>
          ) : (
            <div className="topco-compare-list">
              {topcoCompareRows.map(compare => (
                <article className="topco-compare-card" key={compare.item.id}>
                  <div className="topco-compare-card-head">
                    <div>
                      <strong>{compare.item.name || compare.item.product || 'Unnamed Product'}</strong>
                      <span>
                        {compare.sourceRowNumber ? `Source row ${compare.sourceRowNumber} · ` : ''}
                        {compare.hasProductData === false ? 'No Product Data in application' : 'Product Data found in application'}
                        {compare.matchMethod ? ` · Matched by ${compare.matchMethod}` : ''}
                        {` · ${compare.item.upc || compare.item.primaryMatchKey || 'No UPC'}`}
                      </span>
                    </div>
                    <div className="topco-compare-deliverables">
                      <span>Expected Work</span>
                      <strong>{compare.suggestedLabel}</strong>
                    </div>
                    <div className="topco-compare-card-actions">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => activateTopcoSourceRow(compare)}
                        disabled={!compare.sourceRowNumber || compare.ambiguousMatchKey || activatingSourceRow === String(compare.sourceRowNumber)}
                        title={compare.ambiguousMatchKey ? 'Fix the UPC in the source sheet before activating in Marks.' : 'Create or update one local Product from this source row.'}
                      >
                        {activatingSourceRow === String(compare.sourceRowNumber) ? 'Activating...' : 'Activate in Marks'}
                      </button>
                    </div>
                  </div>
                  {compare.ambiguousMatchKey && (
                    <div className="topco-compare-warning">Ambiguous match: blank or NO UPC cannot confirm source identity.</div>
                  )}
                  {compare.noWalnutWorkExpected && (
                    <div className="topco-compare-warning">
                      No Walnut work expected from the source Request Type. Alert if merchandise arrives at Walnut.
                    </div>
                  )}
                  {compare.shipmentContext.length > 0 && (
                    <div className="topco-compare-note">
                      THR3D is shipment context here, not automatic Walnut routing.
                    </div>
                  )}
                  <div className="topco-compare-grid" role="table" aria-label={`Tracker comparison for ${compare.item.name || compare.item.id}`}>
                    <div className="topco-compare-row is-header" role="row">
                      <span role="columnheader">Field</span>
                      <span role="columnheader">In Application</span>
                      <span role="columnheader">In Source Sheet</span>
                      <span role="columnheader">Result</span>
                    </div>
                    <div className={`topco-compare-row is-${compare.requestTypeRow.state}`} role="row" key={`${compare.item.id}-request-type`}>
                      <span role="cell">
                        <strong>{compare.requestTypeRow.label}</strong>
                        <small>{compare.requestTypeRow.detail}</small>
                      </span>
                      <span role="cell">{compare.requestTypeRow.marksValue || '—'}</span>
                      <span role="cell">{compare.requestTypeRow.trackerValue || '—'}</span>
                      <span role="cell">{compare.requestTypeRow.resultLabel}</span>
                    </div>
                    {compare.rows.map(row => (
                      <div className={`topco-compare-row is-${row.state}`} role="row" key={row.label}>
                        <span role="cell">
                          <strong>{row.label}</strong>
                          {row.detail && <small>{row.detail}</small>}
                        </span>
                        <span role="cell">{row.marksValue || '—'}</span>
                        <span role="cell">{row.trackerValue || '—'}</span>
                        <span role="cell">{row.resultLabel || topcoCompareStateLabel(row.state)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="table-wrap products-grid-wrap">
        <table
          className={`products-grid-table is-${productGridRowHeight}-rows${alternateProductRows ? ' has-alternate-rows' : ''}`}
          style={{ width: `max(100%, ${productGridTableWidth}px)` }}
        >
          <colgroup>
            {visibleProductGridColumns.map(column => (
              <col
                key={column.id}
                style={column.id === lastVisibleProductGridColumnId ? undefined : { width: `${productGridColumnWidths[column.id]}px` }}
              />
            ))}
            <col className="products-grid-actions-col" />
          </colgroup>
          <thead>
            <tr>
              {visibleProductGridColumns.map(column => (
                <th
                  className={[
                    'products-grid-header-cell',
                    draggingColumnId === column.id ? 'is-dragging' : '',
                    columnDropTarget?.columnId === column.id ? `is-drop-${columnDropTarget.placement}` : '',
                  ].filter(Boolean).join(' ')}
                  key={column.id}
                  draggable
                  onDragStart={event => startProductColumnDrag(event, column)}
                  onDragOver={event => dragOverProductColumn(event, column)}
                  onDragLeave={() => setColumnDropTarget(current => current?.columnId === column.id ? null : current)}
                  onDrop={event => dropProductColumn(event, column)}
                  onDragEnd={endProductColumnDrag}
                  title={`Drag ${column.header} to reorder`}
                >
                  <button
                    type="button"
                    className="table-sort-button"
                    draggable={false}
                    onClick={() => toggleProductSort(column.id)}
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    {sortConfig.key === column.id && (
                      sortConfig.direction === 'asc'
                        ? <ChevronUp className="table-sort-icon" size={13} strokeWidth={2.4} aria-hidden="true" />
                        : <ChevronDown className="table-sort-icon" size={13} strokeWidth={2.4} aria-hidden="true" />
                    )}
                  </button>
                  <span
                    className="products-column-resizer"
                    onMouseDown={event => startColumnResize(event, column)}
                    draggable={false}
                    onDragStart={event => event.preventDefault()}
                    role="separator"
                    aria-label={`Resize ${column.header}`}
                  />
                </th>
              ))}
              <th className="products-grid-actions-header" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.loading && <tr><td colSpan={tableColumnCount} className="empty-state">Loading…</td></tr>}
            {!items.loading && visibleItems.length === 0 && (
              <tr><td colSpan={tableColumnCount} className="empty-state">No Products found</td></tr>
            )}
            {groupedVisibleItems.reduce((rows, group) => {
              if (groupByColumn) {
                rows.push(
                  <tr className="products-grid-group-row" key={`group-${group.label}`}>
                    <td colSpan={tableColumnCount}>
                      <span>{group.label}</span>
                      <strong>{group.records.length}</strong>
                    </td>
                  </tr>
                );
              }
              group.records.forEach(item => {
                const rowIndex = rows.filter(row => row?.props?.className !== 'products-grid-group-row').length;
                rows.push(
                  <tr className={alternateProductRows && rowIndex % 2 === 1 ? 'is-alt-row' : ''} key={item.id}>
                    {visibleProductGridColumns.map(column => {
                      const key = draftKey(item.id, column.id);
                      const value = editDrafts[key] ?? String(productCellValue(item, column) || '');
                      if (!column.editable) return <td key={column.id}>{value || '—'}</td>;
                      return (
                        <td key={column.id}>
                          <div className={`products-grid-cell-editor${isProductFillSelected(item, column) ? ' is-fill-target' : ''}`}>
                            {column.options ? (
                              <select
                                className="products-grid-cell-input"
                                value={value}
                                disabled={savingCell === key}
                                onClick={event => event.stopPropagation()}
                                onChange={event => setEditDrafts(current => ({ ...current, [key]: event.target.value }))}
                                onBlur={event => saveProductCell(item, column, event.target.value)}
                                aria-label={`${column.header} for ${item.name || item.id}`}
                              >
                                <option value="" disabled>—</option>
                                {column.options.map(option => <option value={option} key={option}>{option}</option>)}
                              </select>
                            ) : (
                              <input
                                className={`products-grid-cell-input${column.monospace ? ' is-code' : ''}`}
                                value={value}
                                disabled={savingCell === key}
                                draggable
                                onDragStart={event => startProductFillDrag(event, item, column, value)}
                                onDragEnter={() => enterProductFillTarget(item, column)}
                                onDragOver={event => overProductFillTarget(event, item, column)}
                                onDrop={event => dropProductFill(event, item, column)}
                                onDragEnd={endProductFillDrag}
                                onClick={event => event.stopPropagation()}
                                onFocus={event => event.target.select()}
                                onChange={event => setEditDrafts(current => ({ ...current, [key]: event.target.value }))}
                                onBlur={event => {
                                  if (event.currentTarget.dataset.cancelEdit === 'true') {
                                    event.currentTarget.dataset.cancelEdit = '';
                                    return;
                                  }
                                  saveProductCell(item, column, event.target.value);
                                }}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') event.currentTarget.blur();
                                  if (event.key === 'Escape') {
                                    event.currentTarget.dataset.cancelEdit = 'true';
                                    setEditDrafts(current => {
                                      const copy = { ...current };
                                      delete copy[key];
                                      return copy;
                                    });
                                    event.currentTarget.blur();
                                  }
                                }}
                                aria-label={`${column.header} for ${item.name || item.id}`}
                              />
                            )}
                            <span
                              className="products-grid-fill-handle"
                              draggable
                              onDragStart={event => startProductFillDrag(event, item, column, value)}
                              onDragEnd={endProductFillDrag}
                              aria-hidden="true"
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="products-grid-row-actions" aria-label="Actions">
                      <button
                        type="button"
                        className="products-delete-button"
                        onClick={() => deleteProduct(item)}
                        aria-label={`Delete ${item.name || item.product || 'Product'}`}
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
              });
              return rows;
            }, [])}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Add Product form ─────────────────────────────────────────────────────────
// ── Settings page ─────────────────────────────────────────────────────────────
function ClientImportProfilesModal({ client, onClose, onSaved }) {
  const profileNames = Object.keys(client?.productImportProfiles?.profiles || {});
  const [selectedName, setSelectedName] = useState(client?.productImportProfiles?.defaultProfile || profileNames[0] || '');
  const [profiles, setProfiles] = useState(() => ({ ...(client?.productImportProfiles?.profiles || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedProfile = profiles[selectedName] || { sourceHeaders: {}, targetMapping: {}, referenceDataTargets: {}, requiredTargets: [] };
  const sourceHeaders = Object.keys(selectedProfile.sourceHeaders || {}).length
    ? Object.keys(selectedProfile.sourceHeaders || {})
    : [...new Set([
      ...Object.values(selectedProfile.targetMapping || {}),
      ...Object.keys(selectedProfile.referenceDataTargets || {}),
    ])].filter(Boolean);
  const targetOptions = ['Ignore', ...Object.keys(INTAKE_FALLBACK_TARGET_DESCRIPTIONS).filter(target => !['Identifier', 'Reference Data', 'Brand', 'Product or File Name', 'Product/File Name', 'Description', 'Product Job Number', 'Master or Variant', 'Pickup Job Number', 'Notes'].includes(target))]
    .filter((target, index, list) => list.indexOf(target) === index);

  function currentTarget(source) {
    const mappedTarget = Object.entries(selectedProfile.targetMapping || {}).find(([, value]) => value === source)?.[0];
    if (mappedTarget) return mappedTarget;
    if (selectedProfile.referenceDataTargets?.[source]) return 'Ignore';
    return 'Ignore';
  }

  function updateSourceTarget(source, target) {
    setProfiles(current => {
      const nextProfile = { ...current[selectedName] };
      const targetMapping = { ...(nextProfile.targetMapping || {}) };
      const referenceDataTargets = { ...(nextProfile.referenceDataTargets || {}) };
      Object.entries(targetMapping).forEach(([mappedTarget, mappedSource]) => {
        if (mappedSource === source || mappedTarget === target) delete targetMapping[mappedTarget];
      });
      delete referenceDataTargets[source];
      if (target === 'Reference Data') referenceDataTargets[source] = 'Reference Data';
      else if (target !== 'Ignore') targetMapping[target] = source;
      return { ...current, [selectedName]: { ...nextProfile, targetMapping, referenceDataTargets } };
    });
  }

  async function save() {
    if (!selectedName) return;
    setSaving(true); setError('');
    try {
      const data = await api.updateClient(client.id, {
        productImportProfiles: {
          defaultProfile: selectedName,
          profiles,
        },
      });
      onSaved(data.client);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the mapping.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMapping() {
    if (!selectedName) return;
    if (!window.confirm(`Delete the “${selectedName}” product import mapping for ${client.name}?`)) return;
    setSaving(true); setError('');
    try {
      const profilesToSave = { ...profiles };
      delete profilesToSave[selectedName];
      const remainingNames = Object.keys(profilesToSave);
      const currentDefault = client.productImportProfiles?.defaultProfile;
      const defaultProfile = currentDefault === selectedName ? (remainingNames[0] || '') : currentDefault;
      const data = await api.updateClient(client.id, {
        productImportProfiles: {
          defaultProfile,
          profiles: profilesToSave,
        },
      });
      onSaved(data.client);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not delete the mapping.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal client-import-editor" role="dialog" aria-modal="true" aria-labelledby="client-import-editor-title">
        <div className="modal-header">
          <div>
            <div className="modal-title" id="client-import-editor-title">Edit Product Import Mapping</div>
            <div className="modal-subtitle">{client.name}</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        {profileNames.length === 0 ? <div className="empty-state">No saved mappings for this Client.</div> : (
          <>
            <div className="client-import-editor-controls">
              <label>
                Mapping
                <select value={selectedName} onChange={event => setSelectedName(event.target.value)}>
                  {profileNames.map(name => <option value={name} key={name}>{name}</option>)}
                </select>
              </label>
              <label className="client-import-default-check">
                <input type="checkbox" checked={client.productImportProfiles?.defaultProfile === selectedName} readOnly />
                Default mapping
              </label>
              <button className="btn btn-ghost client-import-delete" type="button" onClick={deleteMapping} disabled={saving} title={`Delete ${selectedName}`} aria-label={`Delete ${selectedName}`}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
            <div className="client-import-editor-table">
              <div className="client-import-editor-head"><span>Source column</span><span>Destination field</span></div>
              {sourceHeaders.map(source => (
                <div className="client-import-editor-row" key={source}>
                  <strong>{source}</strong>
                  <select value={currentTarget(source)} onChange={event => updateSourceTarget(source, event.target.value)}>
                    {targetOptions.map(target => <option value={target} key={target}>{target === 'Ignore' ? 'Do not import' : mappingTargetLabel(target, client.primaryMatchKeyLabel)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
        {error && <div className="error-state">{error}</div>}
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving || !selectedName}>{saving ? 'Saving…' : 'Save mapping'}</button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

const PHOTO_PRODUCTION_FIELD_LABELS = {
  productName: 'Product Name',
  upc: 'UPC / Product ID',
  cvid: 'CVID',
  jobNumber: 'WKFT Job Number',
  brandPrefix: 'Brand Prefix',
  fileNameDescription: 'File Name Description',
  productDescription: 'Product Description',
  productType: 'Product Type',
  ecommPhotoNotes: 'Ecomm Photo Notes',
  pathToArt: 'Valid Artwork Path',
};
const PHOTO_PRODUCTION_FIELD_OPTIONS = {
  Packaging: ['productName', 'upc', 'jobNumber', 'brandPrefix', 'fileNameDescription', 'productDescription', 'productType', 'pathToArt'],
  Ecomm: ['productName', 'upc', 'cvid', 'jobNumber', 'productDescription', 'productType', 'ecommPhotoNotes', 'pathToArt'],
};
const PHOTO_PRODUCTION_CF_PRODUCT_CODE_OPTIONS = ['productName', 'upc', 'cvid', 'jobNumber', 'brandPrefix', 'fileNameDescription', 'productDescription', 'productType'];
const PHOTO_PRODUCTION_FILENAME_OPTIONS = ['productName', 'upc', 'cvid', 'jobNumber', 'brandPrefix', 'fileNameDescription', 'productDescription', 'productType', 'view'];
const PHOTO_PRODUCTION_CF_CATEGORY_OPTIONS = [
  { value: 'clientName', label: 'Client Name' },
  { value: 'productName', label: 'Product Name' },
  { value: 'brandPrefix', label: 'Brand Prefix' },
  { value: 'productType', label: 'Product Type' },
  { value: 'custom', label: 'Custom value' },
];
const TOPCO_PHOTO_PRODUCTION_DEFAULTS = {
  version: 1,
  workstreams: {
    Packaging: {
      requiredProductFields: ['productName', 'upc', 'jobNumber', 'brandPrefix', 'fileNameDescription'],
      naming: { template: '{jobNumber}_{brandPrefix}_{fileNameDescription}', tokens: ['jobNumber', 'brandPrefix', 'fileNameDescription'], views: [] },
      creativeForce: { productCodeField: '', categoryField: 'clientName', categoryValue: '' },
    },
    Ecomm: {
      requiredProductFields: ['productName', 'upc', 'cvid'],
      naming: { template: '{cvid}_{view}', tokens: ['cvid', 'view'], views: ['front', 'back', 'left', 'right', 'top', 'bottom', 'frontelevated', 'leftelevated', 'rightelevated'] },
      creativeForce: { productCodeField: '', categoryField: 'clientName', categoryValue: '' },
    },
  },
};

function fallbackPhotoProductionStatus(type, item = {}) {
  const clientRequirements = item.clientPhotoProductionRequirements || item.client?.photoProductionRequirements || item.record?.clientPhotoProductionRequirements;
  const clientConfig = clientRequirements?.workstreams?.[type];
  const clientName = String(typeof item.client === 'string' ? item.client : item.client?.name || item.record?.clientName || '').trim().toLowerCase();
  const config = clientConfig || (clientName === 'topco' ? TOPCO_PHOTO_PRODUCTION_DEFAULTS.workstreams[type] : null);
  if (!config) return null;
  const product = productDataSourceForPlanningItem(item);
  const checks = (config.requiredProductFields || []).map(key => ({
    key,
    label: PHOTO_PRODUCTION_FIELD_LABELS[key] || key,
    present: Boolean(String(photoProductionProductValue(product, key) || '').trim()),
  }));
  return {
    workstreamType: type,
    productData: {
      checks,
      missing: checks.filter(check => !check.present).map(check => check.label),
      ready: checks.every(check => check.present),
    },
    fileNaming: {
      template: config.naming?.template || '',
      checks: [],
      missing: [],
      ready: true,
    },
    creativeForce: {
      checks: [],
      missing: [],
      ready: true,
    },
  };
}

function photoProductionStatusForItem(item = {}) {
  const record = item.record || {};
  const type = item.workstreamType || record.workstreamType || item.deliverableRoute;
  if (!['Packaging', 'Ecomm'].includes(type)) return item.photoProduction || record.photoProduction || null;
  const existing = item.photoProduction || record.photoProduction;
  const status = existing?.workstreamType ? existing : existing?.[type];
  const hasChecks = (status?.productData?.checks || []).length > 0
    || (status?.creativeForce?.checks || []).length > 0;
  const resolved = fallbackPhotoProductionStatus(type, item) || (hasChecks ? status : existing) || null;
  return resolved;
}

function evaluatedPhotoProductionStatusForType(item = {}, type) {
  if (!['Packaging', 'Ecomm'].includes(type)) return null;
  const currentType = item.workstreamType || item.record?.workstreamType || item.deliverableRoute;
  const status = fallbackPhotoProductionStatus(type, item)
    || (type === currentType ? photoProductionStatusForItem(item) : item.record?.photoProduction?.[type] || item.photoProduction?.[type]);
  if (!status) return null;

  const checks = photoProductionChecks({ [type]: status }, item).map(check => ({
    ...check,
    present: photoProductionValuePresent(
      check.key,
      photoProductionProductValue(productDataSourceForPlanningItem(item), check.key),
    ),
  }));
  return {
    ...status,
    productData: {
      ...(status.productData || {}),
      checks,
      missing: checks.filter(check => !check.present).map(check => check.label),
      ready: checks.every(check => check.present),
    },
  };
}

function ClientPhotoProductionRequirementsModal({ client, onClose, onSaved }) {
  const configured = client?.photoProductionRequirements;
  const initial = configured?.workstreams && Object.keys(configured.workstreams).length > 0
    ? configured
    : String(client?.name || '').trim().toLowerCase() === 'topco'
      ? TOPCO_PHOTO_PRODUCTION_DEFAULTS
      : { version: 1, workstreams: {} };
  const [requirements, setRequirements] = useState(() => ({
    version: 1,
    workstreams: { ...(initial.workstreams || {}) },
    ...(initial.sourceRefresh ? { sourceRefresh: initial.sourceRefresh } : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function configFor(type) {
    return requirements.workstreams?.[type] || { requiredProductFields: [], naming: { template: '', tokens: [], views: [] } };
  }

  function updateType(type, updater) {
    setRequirements(current => {
      const currentConfig = configFor(type);
      return { ...current, workstreams: { ...(current.workstreams || {}), [type]: updater(currentConfig) } };
    });
  }

  function toggleProductField(type, key) {
    updateType(type, config => {
      const fields = config.requiredProductFields || [];
      return { ...config, requiredProductFields: fields.includes(key) ? fields.filter(value => value !== key) : [...fields, key] };
    });
  }

  function updateCreativeForce(type, updates) {
    updateType(type, config => ({
      ...config,
      creativeForce: { ...(config.creativeForce || {}), ...updates },
    }));
  }

  function addFilenameField(type, key) {
    if (!key) return;
    updateType(type, config => {
      const naming = config.naming || {};
      const tokens = naming.tokens || [];
      if (tokens.includes(key)) return config;
      const separator = naming.separator ?? '_';
      const nextTokens = [...tokens, key];
      return { ...config, naming: { ...naming, tokens: nextTokens, separator, template: nextTokens.map(value => `{${value}}`).join(separator) } };
    });
  }

  function removeFilenameField(type, key) {
    updateType(type, config => {
      const naming = config.naming || {};
      const tokens = (naming.tokens || []).filter(value => value !== key);
      const separator = naming.separator ?? '_';
      return { ...config, naming: { ...naming, tokens, separator, template: tokens.map(value => `{${value}}`).join(separator) } };
    });
  }

  function updateFilenameSeparator(type, separator) {
    updateType(type, config => {
      const naming = config.naming || {};
      const tokens = naming.tokens || [];
      return { ...config, naming: { ...naming, separator, template: tokens.map(value => `{${value}}`).join(separator) } };
    });
  }

  function toggleView(type, view) {
    updateType(type, config => {
      const naming = config.naming || {};
      const views = naming.views || [];
      return { ...config, naming: { ...naming, views: views.includes(view) ? views.filter(value => value !== view) : [...views, view] } };
    });
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const data = await api.updateClient(client.id, { photoProductionRequirements: requirements });
      onSaved(data.client);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save photo production requirements.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal client-photo-requirements-editor" role="dialog" aria-modal="true" aria-labelledby="client-photo-requirements-title">
        <div className="modal-header">
          <div>
            <div className="modal-title" id="client-photo-requirements-title">Photo Production Requirements</div>
            <div className="modal-subtitle">{client.name} · Choose what must be present before each workstream is released to photo.</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="client-photo-requirements-grid">
          {['Packaging', 'Ecomm'].map(type => {
            const config = configFor(type);
            return (
              <section className="client-photo-requirement-column" key={type}>
                <h3>{type}</h3>
                <span className="client-photo-requirement-label">Required Product data</span>
                <div className="client-photo-requirement-options">
                  {PHOTO_PRODUCTION_FIELD_OPTIONS[type].map(key => (
                    <label key={key}>
                      <input type="checkbox" checked={(config.requiredProductFields || []).includes(key)} onChange={() => toggleProductField(type, key)} />
                      {PHOTO_PRODUCTION_FIELD_LABELS[key]}
                    </label>
                  ))}
                </div>
                <span className="client-photo-requirement-label">Creative Force handoff</span>
                <div className="client-photo-cf-handoff">
                  <label className="client-photo-template-field client-photo-cf-field">
                    <span>Creative Force Product Code</span>
                    <select value={config.creativeForce?.productCodeField || ''} onChange={event => updateCreativeForce(type, { productCodeField: event.target.value })}>
                      <option value="">Choose a Product field</option>
                      {PHOTO_PRODUCTION_CF_PRODUCT_CODE_OPTIONS.map(key => <option value={key} key={key}>{PHOTO_PRODUCTION_FIELD_LABELS[key]}</option>)}
                    </select>
                  </label>
                  <label className="client-photo-template-field client-photo-cf-field">
                    <span>Creative Force Category</span>
                    <select value={config.creativeForce?.categoryField || 'clientName'} onChange={event => updateCreativeForce(type, { categoryField: event.target.value, categoryValue: '' })}>
                      {PHOTO_PRODUCTION_CF_CATEGORY_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  {config.creativeForce?.categoryField === 'custom' && <label className="client-photo-template-field client-photo-cf-field">
                    <span>Custom Category value</span>
                    <input value={config.creativeForce?.categoryValue || ''} onChange={event => updateCreativeForce(type, { categoryValue: event.target.value })} placeholder="e.g. Grocery" />
                  </label>}
                </div>
                <span className="client-photo-requirement-label">Filename recipe</span>
                <div className="client-photo-filename-builder">
                  <div className="client-photo-filename-builder-controls">
                    <select defaultValue="" onChange={event => { addFilenameField(type, event.target.value); event.target.value = ''; }} aria-label={`Add ${type} filename field`}>
                      <option value="">Add Product field...</option>
                      {PHOTO_PRODUCTION_FILENAME_OPTIONS.filter(key => !(config.naming?.tokens || []).includes(key) && (key !== 'view' || type === 'Ecomm')).map(key => (
                        <option value={key} key={key}>{PHOTO_PRODUCTION_FIELD_LABELS[key] || 'View'}</option>
                      ))}
                    </select>
                    <select value={config.naming?.separator ?? '_'} onChange={event => updateFilenameSeparator(type, event.target.value)} aria-label={`${type} filename separator`}>
                      <option value="_">_ underscore</option>
                      <option value="-">- dash</option>
                      <option value=".">. period</option>
                      <option value=" ">space</option>
                      <option value="">none</option>
                    </select>
                  </div>
                  <div className="client-photo-filename-recipe">
                    {(config.naming?.tokens || []).length === 0 ? <span className="client-photo-naming-empty">Add fields in the order Creative Force should use.</span> : (config.naming.tokens || []).map((key, index) => (
                      <span className="client-photo-filename-token" key={`${key}-${index}`}>
                        {PHOTO_PRODUCTION_FIELD_LABELS[key] || 'View'}
                        <button type="button" onClick={() => removeFilenameField(type, key)} aria-label={`Remove ${PHOTO_PRODUCTION_FIELD_LABELS[key] || key}`}>×</button>
                      </span>
                    ))}
                  </div>
                  <code className="client-photo-template-preview">{(config.naming?.tokens || []).map(value => `{${value}}`).join(config.naming?.separator ?? '_') || 'Filename preview will appear here'}</code>
                </div>
                {type === 'Ecomm' && <>
                    <span className="client-photo-requirement-label">Views included in handoff</span>
                  <div className="client-photo-view-options">
                    {['front', 'back', 'left', 'right', 'top', 'bottom', 'frontelevated', 'leftelevated', 'rightelevated'].map(view => (
                      <label key={view}><input type="checkbox" checked={(config.naming?.views || []).includes(view)} onChange={() => toggleView(type, view)} />{view}</label>
                    ))}
                  </div>
                </>}
              </section>
            );
          })}
        </div>
        {error && <div className="error-state">{error}</div>}
        <div className="client-photo-requirements-footer">
          <span>These checks appear on the workstream card as Product data and Creative Force handoff validation.</span>
          <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save requirements'}</button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function sourceRefreshConfigForClient(client) {
  return client?.readinessProfile?.sourceRefresh || client?.photoProductionRequirements?.sourceRefresh || null;
}

function sourceRefreshIntervalText(config) {
  if (!config?.enabled) return 'Off';
  const seconds = Number(config.intervalSeconds || 0);
  if (!seconds) return 'On';
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `Every ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `Every ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `Every ${seconds} seconds`;
}

function ClientSourceSyncModal({ client, onClose, onSaved }) {
  const current = sourceRefreshConfigForClient(client) || {};
  const [enabled, setEnabled] = useState(Boolean(current.enabled));
  const [intervalMinutes, setIntervalMinutes] = useState(Math.max(1, Math.round(Number(current.intervalSeconds || 300) / 60)));
  const [limit, setLimit] = useState(Math.max(1, Number(current.limit || 100)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true); setError('');
    try {
      const existingRequirements = client.photoProductionRequirements?.workstreams
        ? client.photoProductionRequirements
        : String(client?.name || '').trim().toLowerCase() === 'topco'
          ? TOPCO_PHOTO_PRODUCTION_DEFAULTS
          : { version: 1, workstreams: {} };
      const sourceRefresh = {
        enabled,
        intervalSeconds: Math.max(1, Number(intervalMinutes || 1)) * 60,
        limit: Math.max(1, Number(limit || 1)),
        provider: current.provider || 'topco',
      };
      const data = await api.updateClient(client.id, {
        photoProductionRequirements: {
          ...existingRequirements,
          sourceRefresh,
        },
      });
      onSaved(data.client);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save source sync settings.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal client-source-sync-editor" role="dialog" aria-modal="true" aria-labelledby="client-source-sync-title">
        <div className="modal-header">
          <div>
            <div className="modal-title" id="client-source-sync-title">Source sync</div>
            <div className="modal-subtitle">{client.name} · Refresh existing source-linked Products from the read-only source sheet.</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="client-source-sync-form">
          <label className="client-source-sync-check">
            <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
            Refresh source-linked Products
          </label>
          <label>
            <span>Refresh interval</span>
            <div className="client-source-sync-input-row">
              <input type="number" min="1" value={intervalMinutes} onChange={event => setIntervalMinutes(event.target.value)} />
              <span>minutes</span>
            </div>
          </label>
          <label>
            <span>Products per refresh</span>
            <input type="number" min="1" value={limit} onChange={event => setLimit(event.target.value)} />
          </label>
        </div>
        {error && <div className="error-state">{error}</div>}
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save sync settings'}</button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function CreativeForceAdminSection() {
  const [refreshKey, setRefreshKey] = useState(0);
  const feed = useResource(() => api.previewCreativeForceProductFeed(), [refreshKey]);
  const diagnostics = useResource(() => api.getCreativeForceWebhookDiagnostics(), [refreshKey]);
  const preview = feed.data || {};
  const webhook = diagnostics.data?.webhook;
  const counts = preview.counts || {};
  const rows = preview.rows || [];

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-title">Latest webhook delivery</span>
            <p className="panel-subtitle">Admin-only troubleshooting view of the most recent signed Creative Force event received by Marks Photo.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={diagnostics.loading}>Refresh</button>
        </div>
        {diagnostics.loading && <div className="empty-state">Loading webhook diagnostics…</div>}
        {diagnostics.error && <div className="error-state">{diagnostics.error}</div>}
        {!diagnostics.loading && !diagnostics.error && !webhook && <div className="empty-state">No signed Creative Force webhook has been received since the backend started.</div>}
        {!diagnostics.loading && !diagnostics.error && webhook && (
          <div className="webhook-diagnostics-stack">
            <div className="webhook-diagnostics-payload">
              <div className="webhook-payload-head">
                <span>Payload</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigator.clipboard?.writeText(JSON.stringify(webhook.payload || {}, null, 2))}
                >
                  Copy
                </button>
              </div>
              <pre>{JSON.stringify(webhook.payload || {}, null, 2)}</pre>
            </div>
            <div className="webhook-diagnostics-reading">
              <div className="settings-list">
                <div className="setting-row"><span className="setting-key">Received</span><span className="setting-val">{webhook.receivedAt || '—'}</span></div>
                <div className="setting-row"><span className="setting-key">Result</span><span className="setting-val">{webhook.accepted ? (webhook.ignored ? 'Ignored — derived workflow' : webhook.duplicate ? 'Duplicate ignored' : 'Written to Workstream Card') : webhook.reason || 'Rejected'}</span></div>
                <div className="setting-row"><span className="setting-key">Workflow</span><span className="setting-val">{webhook.sync?.workflowName || '—'}</span></div>
                <div className="setting-row"><span className="setting-key">Work Unit ID</span><span className="setting-val">{webhook.workUnitId || webhook.sync?.workUnitId || '—'}</span></div>
                <div className="setting-row"><span className="setting-key">Matched card</span><span className="setting-val">{webhook.workstreamCardId || '—'}</span></div>
                <div className="setting-row"><span className="setting-key">Creative Force step</span><span className="setting-val">{webhook.creativeForceStep || webhook.sync?.stepName || '—'}{webhook.sync?.stepStatusRaw ? ` · ${webhook.sync.stepStatusRaw}` : ''}</span></div>
                <div className="setting-row"><span className="setting-key">Work unit status</span><span className="setting-val">{webhook.workUnitStatus || webhook.sync?.statusRaw || '—'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-title">Creative Force handoff</span>
            <p className="panel-subtitle">Review client-configured Product requirements and the work that can be sent to Creative Force.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={feed.loading}>Refresh</button>
        </div>
        {feed.loading && <div className="empty-state">Loading handoff preview…</div>}
        {feed.error && <div className="error-state">{feed.error}</div>}
        {!feed.loading && !feed.error && <>
          <div className="settings-list">
            <div className="setting-row"><span className="setting-key">Airtable feed table</span><span className="setting-val">{preview.table || 'Creative Force Product Feed'} {preview.tableProvisioned ? <span className="badge badge-green">Provisioned</span> : <span className="badge badge-amber">Not provisioned</span>}</span></div>
            <div className="setting-row"><span className="setting-key">Rows ready for handoff</span><span className="setting-val">{counts.ready || 0} workstream{counts.ready === 1 ? '' : 's'}</span></div>
            <div className="setting-row"><span className="setting-key">Existing feed rows</span><span className="setting-val">{counts.existing || 0}</span></div>
          </div>
          <div className="form-hint">Rows are populated automatically when an Ecomm or Packaging card is released to photo.</div>
          <div className="table-wrap requirements-table">
            <table>
              <thead><tr><th>Product</th><th>Workstream</th><th>Product Code</th><th>Category</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan="4" className="empty-state">No handoff rows are ready.</td></tr>}
                {rows.map(row => <tr key={row.sourceKey}><td>{row.fields?.Product || '—'}<small>{row.fields?.Client || ''}</small></td><td>{row.workstreamType || '—'}</td><td>{row.fields?.['Product Code'] || '—'}</td><td>{row.fields?.Category || '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>}
      </div>
    </div>
  );
}

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
  const [editingImportClient, setEditingImportClient] = useState(null);
  const [editingPhotoRequirementsClient, setEditingPhotoRequirementsClient] = useState(null);
  const [editingSourceSyncClient, setEditingSourceSyncClient] = useState(null);
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
    { header: 'Product ID', value: client => clientProductIdLabel(client) },
    { header: 'Product Imports', value: client => Object.keys(client.productImportProfiles?.profiles || {}).length ? `${Object.keys(client.productImportProfiles.profiles).length} saved` : 'Not configured' },
    { header: 'Photo Requirements', value: client => ['Packaging', 'Ecomm'].map(type => client.photoProductionRequirements?.workstreams?.[type] ? `${type}: configured` : `${type}: not configured`).join('; ') },
    { header: 'Source Lookup', value: client => sourceCheckRulesForClient(client) ? 'Configured' : 'Standard' },
  ];

  function sourceCheckFieldLabel(field) {
    return SOURCE_CHECK_FIELD_CONFIG[field]?.label || PHOTO_PRODUCTION_FIELD_LABELS[field] || field;
  }

  function sourceCheckActivationLabel(field) {
    if (field === 'requestType') return 'Request Type';
    return sourceCheckFieldLabel(field);
  }

  function sourceCheckRequestTypeLabel(key) {
    return SOURCE_CHECK_REQUEST_TYPE_LABELS[key] || key;
  }

  function sourceCheckExpectedWorkLabel(mapping = {}) {
    if (mapping.noWalnutWorkExpected) return `No Walnut work expected${mapping.alertIfReceived ? '; alert if received' : ''}`;
    const labels = [
      ...normalizeDeliverableList(mapping.requiredDeliverables || []),
      ...normalizeDeliverableList(mapping.shipmentContext || []).map(value => `${value} shipment context`),
    ];
    return labels.length ? labels.join(' + ') : 'No expected work';
  }

  function ClientReadinessProfile({ profile, client }) {
    const sourceRules = sourceCheckRulesForClient(client);
    const sourceRefresh = sourceRefreshConfigForClient(client);
    if (!profile && !sourceRules) return <span className="badge badge-neutral">Standard</span>;
    const deliverables = Object.entries(profile?.deliverables || {});
    const pathPrefixes = Object.entries(profile?.pathPrefixes || {});
    const requestTypeMappings = Object.entries(sourceRules?.requestTypeMappings || {});
    const requiredToProceed = Object.entries(sourceRules?.requiredToProceed || {});
    const sourceFieldMappings = sourceRules?.sourceFieldMappings || [];
    return (
      <div className="client-readiness-profile">
        <div className="client-readiness-summary">
          <div>
            <span className="client-readiness-label">Source sync</span>
            <strong>{sourceRefreshIntervalText(sourceRefresh)}</strong>
            {sourceRefresh?.enabled && <small>{sourceRefresh.limit || 100} Products per refresh</small>}
          </div>
          <div>
            <span className="client-readiness-label">Match by</span>
            <strong>{(sourceRules?.sourceIdentityFields || []).map(sourceCheckFieldLabel).join(' + ') || 'Standard Product match'}</strong>
          </div>
          <div>
            <span className="client-readiness-label">Activation</span>
            <strong>{sourceRules ? sourceCheckActivationLabel(sourceRules.activationField) : 'Standard'}</strong>
          </div>
          {sourceRules && <button className="btn btn-ghost btn-sm client-source-sync-button" type="button" onClick={() => setEditingSourceSyncClient(client)}>Edit sync</button>}
        </div>
        <details className="client-readiness-details">
          <summary>Details</summary>
          <div className="client-readiness-grid">
            {profile && <div>
              <span className="client-readiness-label">Photo release requires</span>
              <div className="requirements-chips">
                {(profile.readyForPhotoRequires || []).map(field => <span className="requirements-chip" key={field}>{field}</span>)}
              </div>
            </div>}
            {deliverables.map(([deliverable, config]) => (
              <div key={deliverable}>
                <span className="client-readiness-label">{deliverable}</span>
                <div className="requirements-chips">
                  {(config.requiredFields || []).map(field => <span className="requirements-chip" key={field}>{field}</span>)}
                </div>
              </div>
            ))}
            {profile && <div>
              <span className="client-readiness-label">Not required from activation</span>
              <div className="requirements-chips">
                {(profile.notRequiredFromActivation || []).map(field => <span className="requirements-chip is-muted" key={field}>{field}</span>)}
              </div>
            </div>}
            {sourceRules && <>
              <div className="client-source-check-rules">
                <span className="client-readiness-label">Request Type mapping</span>
                {requestTypeMappings.map(([key, mapping]) => (
                  <div className="client-source-check-rule" key={key}>
                    <span>{sourceCheckRequestTypeLabel(key)}</span>
                    <strong>{sourceCheckExpectedWorkLabel(mapping)}</strong>
                  </div>
                ))}
              </div>
              {sourceFieldMappings.length > 0 && (
                <div className="client-source-check-rules">
                  <span className="client-readiness-label">Source field usage</span>
                  {sourceFieldMappings.map(mapping => (
                    <div className="client-source-check-rule" key={mapping.sourceField}>
                      <span>Source {mapping.sourceField}</span>
                      <strong>Used as {(mapping.usedAs || []).join(' / ')}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="client-source-check-rules">
                <span className="client-readiness-label">Required to proceed</span>
                {requiredToProceed.map(([deliverable, fields]) => (
                  <div className="client-source-check-rule" key={deliverable}>
                    <span>{deliverable}</span>
                    <strong>{(fields || []).map(sourceCheckFieldLabel).join(', ') || 'None'}</strong>
                  </div>
                ))}
              </div>
            </>}
            {pathPrefixes.length > 0 && (
              <div className="client-readiness-paths">
                <span className="client-readiness-label">Server paths</span>
                {pathPrefixes.map(([key, value]) => (
                  <div className="client-readiness-path" key={key}>
                    <span>{key === 'artwork' ? 'Artwork prefix' : key === 'upload' ? 'Upload prefix' : key}</span>
                    <code>{value}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    );
  }

  async function randomizeDemoData() {
    if (!window.confirm('Randomize existing demo records for dashboard and Planning testing? This updates existing Airtable records directly.')) return;
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
    const typed = window.prompt('Delete all test data and Products? Type DELETE to confirm.');
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
                Set <code>AIRTABLE_API_KEY</code> and <code>AIRTABLE_BASE_ID</code> on the API service, then redeploy.
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
                <th>Product ID</th>
                <th>Product Imports</th>
                <th>Photo Production</th>
                <th>Source Lookup</th>
              </tr>
            </thead>
            <tbody>
              {clients.loading && <tr><td colSpan="5" className="empty-state">Loading clients…</td></tr>}
              {!clients.loading && clientList.map(client => (
                <Fragment key={client.id}>
                  <tr>
                    <td>
                      <div className="requirements-client">
                        <span>{client.name}</span>
                        <small>{clientProductIdLabel(client)}</small>
                      </div>
                    </td>
                    <td><span className="requirements-code">{clientProductIdLabel(client)}</span></td>
                    <td>
                      <div className="client-import-profiles">
                        {Object.keys(client.productImportProfiles?.profiles || {}).length > 0 ? (
                          <>
                            <span className="badge badge-blue">{Object.keys(client.productImportProfiles.profiles).length} saved</span>
                            <small>Default: {client.productImportProfiles.defaultProfile || 'None'}</small>
                          </>
                        ) : <span className="badge badge-neutral">None saved</span>}
                        {Object.keys(client.productImportProfiles?.profiles || {}).length > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingImportClient(client)}>Edit mapping</button>}
                      </div>
                    </td>
                    <td>
                      <div className="client-import-profiles">
                        {['Packaging', 'Ecomm'].map(type => {
                          const config = client.photoProductionRequirements?.workstreams?.[type];
                          return <small key={type}><strong>{type}:</strong> {(config?.requiredProductFields || []).map(field => PHOTO_PRODUCTION_FIELD_LABELS[field] || field).join(', ') || 'Not configured'}</small>;
                        })}
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingPhotoRequirementsClient(client)}>Edit requirements</button>
                      </div>
                    </td>
                    <td>
                      {sourceCheckRulesForClient(client)
                        ? <span className="badge badge-blue">Configured</span>
                        : <span className="badge badge-neutral">Standard</span>}
                    </td>
                  </tr>
                  {sourceCheckRulesForClient(client) && (
                    <tr className="client-readiness-row">
                      <td colSpan="5">
                        <ClientReadinessProfile profile={client.readinessProfile} client={client} />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
              <span className="setting-key">Reset Test Data</span>
              <span className="setting-val">Delete workflow/testing rows from {technicalTableLabel(s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise')}, {technicalTableLabel(s.tables?.shipments || s.tables?.receipts || 'Shipments')}, Workstream Cards, THR3D Shipping Items, Activations, Issues, Comments, History, Jobs, Imports, and referenced uploaded photos. Also deletes {technicalTableLabel(s.tables?.products || 'Products')}, which are re-importable from client source data. Clients, Users, and Locations are kept.</span>
              <button className="btn btn-danger" type="button" onClick={clearCoreTables} disabled={clearing}>
                {clearing ? 'Deleting…' : 'Reset Test Data'}
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
      {editingImportClient && (
        <ClientImportProfilesModal
          client={editingImportClient}
          onClose={() => setEditingImportClient(null)}
          onSaved={updatedClient => setEditingImportClient(updatedClient)}
        />
      )}
      {editingPhotoRequirementsClient && (
        <ClientPhotoProductionRequirementsModal
          client={editingPhotoRequirementsClient}
          onClose={() => setEditingPhotoRequirementsClient(null)}
          onSaved={updated => {
            clients.reload({ quiet: true });
            setEditingPhotoRequirementsClient(updated);
          }}
        />
      )}
      {editingSourceSyncClient && (
        <ClientSourceSyncModal
          client={editingSourceSyncClient}
          onClose={() => setEditingSourceSyncClient(null)}
          onSaved={updated => {
            clients.reload({ quiet: true });
            setEditingSourceSyncClient(updated);
          }}
        />
      )}
    </div>
  );
}

// ── Intake page ──────────────────────────────────────────────────────────────
const INTAKE_TARGET_LABELS = {
  'Product Name': getFieldLabel('Product Name', 'product'),
  Identifier: getFieldLabel('Identifier', 'product'),
  UPC: 'UPC',
  CVID: 'CVID',
  'Brand Prefix': 'Brand Prefix',
  'Request Type': 'Request Type',
  'Project Status': 'Project Status',
  'WKFT Job Number': 'WKFT Job Number',
  'Mbox Number': 'Mbox Number',
  'Product Type': 'Product Type',
  'Product Description': 'Product Description',
  'Link to Prepro/Overlays': 'Link to Prepro/Overlays',
  'Ecomm Photo Notes': 'Ecomm Photo Notes',
  'Path to Art': 'Path to Art',
  'Product or File Name': getFieldLabel('Product or File Name', 'product'),
  'Product/File Name': getFieldLabel('Product/File Name', 'product'),
  Description: getFieldLabel('Description', 'product'),
  'Product Job Number': getFieldLabel('Product Job Number', 'product'),
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
  Identifier: 'Primary value used to match received merchandise to this expected Product.',
  UPC: 'UPC match key stored separately from the internal Product record ID.',
  CVID: 'Client product reference used alongside the UPC when provided.',
  'Brand Prefix': 'Client naming prefix for this product.',
  'Request Type': 'Requested production route for this Product.',
  'Project Status': 'Client project status for this Product.',
  'WKFT Job Number': 'Client or production job reference.',
  'Mbox Number': 'Client merchandise box reference.',
  'Product Type': 'Product structure or storage category.',
  'Product Description': 'Client-provided product description.',
  'Link to Prepro/Overlays': 'Link to preproduction or overlay materials.',
  'Ecomm Photo Notes': 'Notes for Ecomm photography.',
  'Path to Art': 'Path or reference to product artwork.',
  'Product or File Name': 'Product or file name.',
  Description: 'Longer source product description.',
  'Product Job Number': 'Row-level job or project number for the product.',
  'Master or Variant': 'Whether this product is a master or a variant.',
  'Pickup Job Number': 'Previous production job number for variant pickup work.',
  Brand: 'Product brand.',
  'Parent Job Number': 'Batch-level number edited on the selected Job.',
  'Due Date': 'Job due date when present in the source spreadsheet.',
  Notes: 'Source notes that describe the product.',
  'Job Name': 'Human-readable job or group name.',
  'Reference Data': 'Preserve source values as product reference JSON.',
};

const INTAKE_REQUIRED_TARGETS = [];
const KNOWN_INTAKE_MAPPINGS = {
  topco: { 'Product Name': 'Product Name', CVID: 'CVID', UPC: 'Identifier', 'Brand Prefix': 'Brand Prefix', 'Product Type': 'Product Type' },
  kroger: { 'Job #': 'Product Job Number', Description: 'Description', UPC: 'Identifier', Brand: 'Brand', 'Product Received': 'Product Name', Notes: 'Notes' },
  unfi: { 'Project Number': 'Product Job Number', Description: 'Description', UPC: 'Identifier', Notes: 'Notes' },
  smithfield: { 'Job #': 'Product Job Number', 'GAR #': 'Identifier', Brand: 'Brand', 'Product Description': 'Description', Notes: 'Notes' },
};
const INTAKE_TARGET_FIELDS = {
  'Job Name': 'jobName', 'Parent Job Number': 'parentJobNumber', 'Due Date': 'due',
  'Product Name': 'itemName', Identifier: 'id', UPC: 'id', CVID: 'cvid', 'Brand Prefix': 'brandPrefix', 'Request Type': 'requestType', 'Project Status': 'projectStatus', 'WKFT Job Number': 'wkftJobNumber', 'Mbox Number': 'mboxNumber', 'Product Type': 'productType', 'Product Description': 'productDescription', 'Link to Prepro/Overlays': 'preproOverlays', 'Ecomm Photo Notes': 'ecommPhotoNotes', 'Path to Art': 'pathToArt', 'Product or File Name': 'product', 'Product/File Name': 'product', Description: 'description', 'Product Job Number': 'itemJobNumber', 'Master or Variant': 'masterOrVariant', 'Pickup Job Number': 'pickupJobNumber', Brand: 'brand', Notes: 'notes',
};
const INTAKE_WIZARD_STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'map', label: 'Map Columns' },
  { id: 'validate', label: 'Validate & Fix' },
  { id: 'summary', label: 'Summary' },
];

function mappingTargetLabel(target, identifierLabel = DOMAIN_TERMS.primaryMatchKey) {
  if (target === 'Identifier') return 'UPC';
  return INTAKE_TARGET_LABELS[target] || target || '';
}
function mappingTargetTechnicalLabel(target, identifierLabel = DOMAIN_TERMS.primaryMatchKey) {
  if (!target || target === 'Ignore') return '';
  if (target === 'Identifier') return 'UPC match key used to match Received Merch to expected Products.';
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
    ['CVID', ['cvid']],
    ['Brand Prefix', ['brandprefix', 'brandcode']],
    ['Product or File Name', ['productfilename', 'productname']],
    ['Description', ['description', 'productdescription', 'productreceived', 'itemdescription']],
    ['Product Job Number', ['jobnumber', 'jobid', 'job', 'projectnumber', 'project']],
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
function productImportProfileState(profile, headers) {
  const clientName = arguments[2] || '';
  const availableHeaders = new Set(headers || []);
  const targetMapping = Object.entries(profile?.targetMapping || {}).reduce((next, [target, source]) => {
    if (source && availableHeaders.has(source)) next[target] = source;
    return next;
  }, {});
  const referenceSources = Object.entries(profile?.referenceDataTargets || {})
    .filter(([source, target]) => availableHeaders.has(source) && target && target !== 'Ignore')
    .map(([source]) => source);
  const sourceMapping = (headers || []).reduce((next, header) => {
    const mappedTarget = Object.entries(targetMapping).find(([, source]) => source === header)?.[0];
    next[header] = mappedTarget || (referenceSources.includes(header) ? 'Reference Data' : 'Ignore');
    return next;
  }, {});
  if (clientName.trim().toLowerCase() === 'topco' && availableHeaders.has('Product Type') && !targetMapping['Product Type']) {
    targetMapping['Product Type'] = 'Product Type';
    sourceMapping['Product Type'] = 'Product Type';
  }
  return { sourceMapping, targetMapping };
}
function defaultImportProfileName(profileStore) {
  const profiles = profileStore?.profiles || {};
  const configured = profileStore?.defaultProfile || '';
  return profiles[configured] ? configured : Object.keys(profiles)[0] || '';
}
function productImportProfilePayload(name, headers, sourceMapping, targetMapping, requiredTargets) {
  return {
    sourceHeaders: Object.fromEntries((headers || []).map(header => [header, header])),
    targetMapping: { ...(targetMapping || {}) },
    referenceDataTargets: Object.fromEntries(
      Object.entries(sourceMapping || {})
        .filter(([, target]) => target === 'Reference Data')
        .map(([source]) => [source, 'Reference Data']),
    ),
    requiredTargets: [...(requiredTargets || [])],
  };
}
function requiredMappingGaps(targetMapping) {
  const mapped = new Set(Object.entries(targetMapping || {}).filter(([, source]) => source).map(([target]) => target));
  return INTAKE_REQUIRED_TARGETS.filter(target => !mapped.has(target));
}
function mappingForApi(sourceMapping, targetMapping) {
  return {
    ...sourceMapping,
    __targetMapping: targetMapping,
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

const STRUCTURE_FORM_REQUEST_TYPES = ['', 'Pack only', 'Ecomm & Pack', 'Pack & Thr3d', 'Thr3d only'];

function StructureFormPreview({ clients = [], files = null, onClose }) {
  const [forms, setForms] = useState(null);
  const [counts, setCounts] = useState(null);
  // Only Topco uses these forms, so there is nothing to choose.
  const topcoClient = clients.find(client => String(client.name || '').trim().toLowerCase() === 'topco');
  const clientId = topcoClient?.id || '';
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (files?.length) readForms(files);
  }, [files]);

  async function readForms(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setBusy(true); setError(''); setResult(null); setForms(null);
    try {
      const data = await api.previewStructureForms(incoming);
      setForms((data.forms || []).map(form => ({
        ...form,
        requestType: form.requestTypeProposed || '',
        rows: (form.rows || []).map(row => ({ ...row })),
      })));
      setCounts(data.counts || null);
    } catch (err) {
      setError(err.message || 'Could not read those forms.');
    } finally {
      setBusy(false);
    }
  }

  function editHeader(formIndex, patch) {
    setForms(current => current.map((form, index) => index !== formIndex ? form : {
      ...form,
      header: { ...(form.header || {}), ...patch },
    }));
  }

  function editRow(formIndex, rowIndex, patch) {
    setForms(current => current.map((form, fi) => fi !== formIndex ? form : {
      ...form,
      rows: form.rows.map((row, ri) => ri !== rowIndex ? row : { ...row, ...patch }),
    }));
  }

  const readable = (forms || []).filter(form => !form.error);
  const productCount = readable.reduce((total, form) => total + form.rows.length, 0);

  async function createProducts() {
    setSaving(true); setError(''); setResult(null);
    try {
      const rows = readable.flatMap(form => form.rows.map(row => ({
        ...row,
        ...(form.header || {}),
        fileName: form.fileName,
        project: form.header?.project || '',
        requestType: form.requestType,
      })));
      setResult(await api.commitStructureForms({ clientId, rows }));
    } catch (err) {
      setError(err.message || 'Could not create Products.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="intake-card structure-form-card">
      <div className="panel-header">
        <div>
          <span className="panel-title">Structure Forms</span>
          <p className="panel-subtitle">
            Read Topco checklists and create the Products they describe. A form says work is
            expected, not that merchandise has arrived — no shipment or match is created.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
      {busy && <div className="empty-state">Reading forms…</div>}
      {error && <div className="error-state">{error}</div>}
      {result && (
        <div className="notice-state">
          {result.summary.created} created · {result.summary.updated} updated
          {result.summary.skipped ? ` · ${result.summary.skipped} skipped` : ''}
        </div>
      )}
      {counts && !result && (
        <div className="form-hint">
          {counts.forms} form{counts.forms === 1 ? '' : 's'} · {productCount} product{productCount === 1 ? '' : 's'}
          {counts.unreadable ? ` · ${counts.unreadable} unreadable` : ''} · check each row before creating
        </div>
      )}
      {(forms || []).map((form, formIndex) => (
        <div className="structure-form-result" key={form.fileName}>
          <div className="structure-form-head">
            <strong title={form.fileName}>{form.fileName}</strong>
            {form.error
              ? <span className="structure-form-error">{form.error}</span>
              : (
                <label className="structure-form-proposal-edit">
                  Request Type
                  <select
                    value={form.requestType}
                    onChange={event => setForms(current => current.map((item, index) =>
                      index === formIndex ? { ...item, requestType: event.target.value } : item))}
                  >
                    {STRUCTURE_FORM_REQUEST_TYPES.map(option => (
                      <option key={option} value={option}>{option || 'Not set'}</option>
                    ))}
                  </select>
                </label>
              )}
          </div>
          {!form.error && (
            <>
              <div className="structure-form-fields">
                {[
                  ['Project', 'projectName', false],
                  ['Supplier', 'supplier', false],
                  ['Studio', 'studio', false],
                  ['Mbox', 'mboxNumber', true],
                  ['WKFT', 'wkftJobNumber', true],
                ].map(([label, key, mono]) => (
                  <label className="structure-form-field" key={key}>
                    <span>{label}</span>
                    <input
                      className={`structure-form-input ${mono ? 'is-code' : ''}`}
                      value={form.header?.[key] || ''}
                      placeholder="Not on form"
                      onChange={event => editHeader(formIndex, { [key]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="structure-form-reason">{form.requestTypeReason}</div>
              {(form.thr3dEvidence || []).map((item, index) => (
                <div className="structure-form-evidence" key={index}>
                  <span>{item.field}</span>{item.text}
                </div>
              ))}
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product Name</th><th>UPC</th></tr></thead>
                  <tbody>
                    {form.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>
                          <input
                            className="structure-form-input"
                            value={row.productName}
                            onChange={event => editRow(formIndex, rowIndex, { productName: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="structure-form-input is-code"
                            value={row.upc}
                            onChange={event => editRow(formIndex, rowIndex, { upc: event.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ))}
      {productCount > 0 && !result && (
        <div className="structure-form-actions">
          {clientId
            ? <span className="structure-form-client">Topco</span>
            : <span className="structure-form-error">No active Topco client found.</span>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={createProducts}
            disabled={saving || !clientId}
          >
            {saving ? 'Creating…' : `Create ${productCount} Product${productCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  );
}

function IntakePage({ navigate }) {
  const clients = useResource(() => api.intakeListClients());
  const mappingTargets = useResource(() => api.intakeMappingTargets());
  const clientList = clients.data?.records ?? [];
  const [clientOverrides, setClientOverrides] = useState({});
  const [clientId, setClientId] = useState('');
  const selectedClientBase = clientList.find(client => client.id === clientId);
  const selectedClient = selectedClientBase ? { ...selectedClientBase, ...(clientOverrides[clientId] || {}) } : null;
  const identifierLabel = getPrimaryMatchKeyLabel({ client: selectedClient });
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [headerRow, setHeaderRow] = useState('');
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
  const [profileName, setProfileName] = useState('');
  const [activeProfileName, setActiveProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

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
    setColumnMapping({}); setTargetMapping({}); setError(''); setNotice(''); setHeaderRow(''); setShowImportSettings(false); setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
    setProfileName(''); setActiveProfileName(''); setSavingProfile(false);
  }
  const [structureFiles, setStructureFiles] = useState(null);

  function acceptFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const pdfs = files.filter(item => /\.pdf$/i.test(item.name));
    if (pdfs.length) {
      setError(''); setNotice('');
      setStructureFiles(pdfs);
      return;
    }
    parseFile(files[0]);
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
      // Keep the control on Automatic; preview.headerRow records the row detection chose.
      setHeaderRow('');
      setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
      setShowImportSettings(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function changeHeaderRow(value) {
    setHeaderRow(value); setError(''); setNotice(''); setBusy(true);
    try {
      const data = await api.previewSpreadsheet({ clientId, file, headerRow: value === 'auto' ? '' : value });
      const mapping = buildInitialColumnMapping(data.columnHeaders || [], selectedClient?.name || '');
      setPreview(current => ({ ...current, ...data, fileSize: file?.size, clientName: selectedClient?.name || '' }));
      setColumnMapping(mapping); setTargetMapping(targetMappingFromSourceMapping(mapping)); setImportId(data.importId || importId);
      setReview(null); setEditableRows([]); setSummary(null);
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
      const data = await api.reviewSpreadsheetSourceRows({ clientId, fileName: preview.fileName, columnHeaders: preview.columnHeaders || [], sourceRows: preview.rows || [], mapping: mappingForApi(columnMapping, targetMapping), importId });
      setReview(data); setEditableRows(data.rows ?? []); setImportId(data.importId || importId); setStep('validate');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function validateEditedIdentifier(value) {
    const text = String(value || '').trim();
    const codeType = selectedClient?.codeType || review?.codeType || '';
    if (codeType === 'GTIN-14' && !(text.match(/^\d{14}$/))) return `${identifierLabel} must be exactly 14 digits.`;
    if (codeType === 'GTIN-13' && !(text.match(/^\d{13}$/))) return `${identifierLabel} must be exactly 13 digits.`;
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
      if (identifier) {
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
      try {
        await persistImportProfile(profileName.trim() || selectedClient?.name || 'Default');
      } catch (profileError) {
        setNotice(`Import complete, but the mapping could not be saved: ${profileError.message}`);
      }
      setSummary(data.summary || {}); setReview(data); setStep('summary');
    } catch (err) { setError(err.message); } finally { setImporting(false); }
  }
  function onDrop(event) { event.preventDefault(); acceptFiles(event.dataTransfer.files); }
  function targetsForSource(header) { return Object.entries(targetMapping).filter(([, source]) => source === header).map(([target]) => target); }
  function renderValidateCell(row, header, columnIndex) {
    const fields = targetsForSource(header).map(target => INTAKE_TARGET_FIELDS[target]).filter(Boolean);
    if (!fields.length) return <span className="intake-readonly-cell">{preview?.rows?.[(row.rowNumber || 2) - 2]?.[columnIndex] || '—'}</span>;
    const field = fields[0];
    if (field === 'output') return <select value={row.output || ''} onChange={event => updateEditableRow(row.rowNumber, 'output', event.target.value)}><option>Photo Only</option><option>Render Only</option><option>Photo + Render</option></select>;
    if (field === 'requestType') return <select value={row.requestType || ''} onChange={event => updateEditableRow(row.rowNumber, 'requestType', event.target.value)}><option value="">—</option>{PRODUCT_REQUEST_TYPE_OPTIONS.map(option => <option value={option} key={option}>{option}</option>)}</select>;
    if (field === 'productType') return <select value={row.productType || ''} onChange={event => updateEditableRow(row.rowNumber, 'productType', event.target.value)}><option value="">—</option>{PRODUCT_TYPE_OPTIONS.map(option => <option value={option} key={option}>{option}</option>)}</select>;
    return <input value={row[field] || ''} onChange={event => updateEditableRow(row.rowNumber, field, event.target.value)} />;
  }

  const visibleRows = (preview?.previewRows ?? []).slice(0, 10);
  const clientRequiredFields = selectedClient?.requiredToShoot?.length ? selectedClient.requiredToShoot : ['Identifier'];
  const normalizedClientRequiredFields = clientRequiredFields.map(field => field === 'ID' ? 'Identifier' : ['Product Name', 'Product/File Name'].includes(field) ? 'Product or File Name' : field);
  const photographyTargets = [...normalizedClientRequiredFields.filter(field => ['Product or File Name', 'Brand'].includes(field))].filter((target, index, list) => list.indexOf(target) === index);
  const photographyRequiredTargets = new Set(normalizedClientRequiredFields.filter(field => !['Identifier', 'UPC'].includes(field)));
  const itemMappingTargets = ['Product Name', ...photographyTargets.filter(target => target !== 'Identifier'), 'UPC', 'CVID', 'Brand Prefix', 'Request Type', 'Project Status', 'WKFT Job Number', 'Mbox Number', 'Product Type', 'Product Description', 'Link to Prepro/Overlays', 'Ecomm Photo Notes', 'Path to Art']
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
  const importSettingsReady = Boolean(clientId);

  function chooseImportClient(nextClientId) {
    setClientId(nextClientId);
    const nextClient = clientList.find(client => client.id === nextClientId);
    const profileStore = nextClient?.productImportProfiles || {};
    const defaultProfileName = defaultImportProfileName(profileStore);
    const defaultProfile = profileStore.profiles?.[defaultProfileName];
    if (defaultProfile && headers.length) {
      const saved = productImportProfileState(defaultProfile, headers, nextClient?.name || '');
      if (Object.keys(saved.targetMapping).length) {
        setColumnMapping(saved.sourceMapping);
        setTargetMapping(saved.targetMapping);
        setActiveProfileName(defaultProfileName);
        setProfileName(defaultProfileName);
        setNotice(`Loaded saved mapping: ${defaultProfileName}.`);
      } else {
        const mapping = buildInitialColumnMapping(headers, nextClient?.name || '');
        setColumnMapping(mapping);
        setTargetMapping(targetMappingFromSourceMapping(mapping));
        setActiveProfileName('');
        setProfileName('');
      }
    } else {
      const mapping = buildInitialColumnMapping(headers, nextClient?.name || '');
      setColumnMapping(mapping);
      setTargetMapping(targetMappingFromSourceMapping(mapping));
      setActiveProfileName('');
      setProfileName('');
    }
    setImportSettings({ mode: '', existingJobId: '', existingJobName: '', groupField: '', singleJobName: '' });
  }

  function applyImportProfile(name) {
    const profile = selectedClient?.productImportProfiles?.profiles?.[name];
    if (!profile) return;
    const saved = productImportProfileState(profile, headers, selectedClient?.name || '');
    setColumnMapping(saved.sourceMapping);
    setTargetMapping(saved.targetMapping);
    setActiveProfileName(name);
    setProfileName(name);
    setReview(null); setEditableRows([]); setSummary(null);
    setNotice(`Loaded saved mapping: ${name}. Review the source columns before validating.`);
  }

  useEffect(() => {
    if (step !== 'map' || activeProfileName || !selectedClient || !headers.length) return;
    const profileStore = selectedClient.productImportProfiles || {};
    const defaultProfileName = defaultImportProfileName(profileStore);
    const defaultProfile = profileStore.profiles?.[defaultProfileName];
    if (!defaultProfile) return;
    const saved = productImportProfileState(defaultProfile, headers, selectedClient.name || '');
    if (!Object.keys(saved.targetMapping).length) return;
    setColumnMapping(saved.sourceMapping);
    setTargetMapping(saved.targetMapping);
    setActiveProfileName(defaultProfileName);
    setProfileName(defaultProfileName);
  }, [step, activeProfileName, selectedClient?.id, headers.join('|')]);

  async function persistImportProfile(name) {
    if (!name || !clientId) return null;
    const existing = selectedClient?.productImportProfiles || { defaultProfile: '', profiles: {} };
    const profiles = { ...(existing.profiles || {}) };
    profiles[name] = productImportProfilePayload(name, headers, columnMapping, targetMapping, mandatoryTargets);
    const data = await api.updateClient(clientId, {
      productImportProfiles: { defaultProfile: name, profiles },
    });
    const updatedClient = data.client;
    if (updatedClient) setClientOverrides(current => ({ ...current, [clientId]: updatedClient }));
    setActiveProfileName(name);
    setProfileName(name);
    return updatedClient;
  }

  async function saveImportProfile() {
    const name = profileName.trim();
    if (!name || !clientId) return;
    setSavingProfile(true); setError(''); setNotice('');
    try {
      await persistImportProfile(name);
      setNotice(`Saved “${name}” as the default mapping for ${selectedClient?.name || 'this Client'}.`);
    } catch (err) {
      setError(err.message || 'Could not save the import mapping.');
    } finally {
      setSavingProfile(false);
    }
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
        {(!preview || showImportSettings) && <div className={`intake-dropzone ${structureFiles ? 'is-compact' : ''}`} onDragOver={event => event.preventDefault()} onDrop={onDrop}><div className="intake-drop-icon"><Icon.Upload /></div><div className="intake-drop-title">Drop a spreadsheet or Structure Forms here</div><div className="intake-drop-or">or</div><label className="btn btn-primary intake-file-button">Choose Files<input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={event => acceptFiles(event.target.files)} /></label><div className="intake-drop-helper">Spreadsheets (.xlsx, .xls, .csv) build the master list · Structure Form PDFs create expected Products</div>{file && <div className="intake-file-note">{file.name}</div>}{busy && <div className="empty-state">Parsing spreadsheet...</div>}</div>}
      </div>
      {structureFiles && (
        <StructureFormPreview
          clients={clientList}
          files={structureFiles}
          onClose={() => setStructureFiles(null)}
        />
      )}
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
              <div className="intake-settings-field">
                <label htmlFor="intake-header-row">Header row <span>Optional</span></label>
                <select id="intake-header-row" value={headerRow || 'auto'} onChange={event => changeHeaderRow(event.target.value)} disabled={busy}>
                  <option value="auto">Automatic</option>
                  {Array.from({ length: Math.min(20, preview?.rawRowCount || 20) }, (_, index) => <option value={String(index + 1)} key={index}>Row {index + 1}</option>)}
                </select>
                <small>Choose the spreadsheet row containing the column names.</small>
              </div>
            </div>
            <div className="form-actions intake-settings-actions">
              <button className="btn" type="button" onClick={resetIntake}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={applyImportSettings} disabled={!importSettingsReady}>Next</button>
            </div>
          </div>
        </div>
      )}
      {step === 'preview' && preview && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">{preview.fileName}</div><div className="intake-preview-sub">{selectedClient?.name || preview.clientName || preview.clientId}</div></div></div><div className="intake-preview-header-row"><div><strong>Header row</strong><span>Choose the spreadsheet row containing the column names.</span></div><select value={headerRow || 'auto'} onChange={event => changeHeaderRow(event.target.value)} disabled={busy} aria-label="Choose spreadsheet header row"><option value="auto">Automatic</option>{Array.from({ length: Math.min(20, preview?.rawRowCount || 20) }, (_, index) => <option value={String(index + 1)} key={index}>Row {index + 1}</option>)}</select><small>Currently using row {preview.headerRow || '—'}</small></div><div className="intake-summary-grid"><div className="intake-summary-item"><span>Sheets</span><strong>{preview.sheetNames?.length || 1}</strong></div><div className="intake-summary-item"><span>Rows</span><strong>{preview.rowCount}</strong></div><div className="intake-summary-item"><span>Columns</span><strong>{preview.columnHeaders?.length ?? 0}</strong></div><div className="intake-summary-item"><span>Size</span><strong>{preview.fileSize ? `${(preview.fileSize / 1024).toFixed(1)} KB` : '—'}</strong></div></div><div className="table-wrap intake-preview-table"><table><thead><tr>{headers.map((header, index) => <MappingHeader target={sourceColumnMappings[header]} key={`${header}-${index}`}>{header || '(blank)'}</MappingHeader>)}</tr></thead><tbody>{visibleRows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] || '—'}</td>)}</tr>)}</tbody></table></div><div className="form-actions"><button className="btn" type="button" onClick={resetIntake} disabled={busy}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')} disabled={busy}>Map Columns</button><button className="btn btn-primary" type="button" onClick={reviewActiveMapping} disabled={busy}>{busy ? 'Validating...' : 'Validate'}</button></div></div>}
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
            <div className="intake-profile-bar">
              <div className="intake-profile-copy">
                <strong>Saved mapping</strong>
                <span>Reuse this client’s spreadsheet setup on future imports.</span>
              </div>
              <select
                value={activeProfileName}
                onChange={event => applyImportProfile(event.target.value)}
                aria-label="Load saved product import mapping"
                disabled={!Object.keys(selectedClient?.productImportProfiles?.profiles || {}).length}
              >
                <option value="">Load saved mapping...</option>
                {Object.keys(selectedClient?.productImportProfiles?.profiles || {}).map(name => <option value={name} key={name}>{name}</option>)}
              </select>
              <input
                value={profileName}
                onChange={event => setProfileName(event.target.value)}
                aria-label="Saved mapping name"
                placeholder="Mapping name"
              />
              <button className="btn btn-alt" type="button" onClick={saveImportProfile} disabled={savingProfile || !profileName.trim()}>
                {savingProfile ? 'Saving...' : 'Save mapping'}
              </button>
            </div>
            <div className="intake-mapping-table">
              <div className="intake-mapping-table-head">
                <span>Source column</span>
                <span>Destination field</span>
              </div>
              <div className="intake-mapping-rows">
                {headers.map((header, index) => {
                  const mappedTarget = Object.entries(targetMapping).find(([target, source]) => itemMappingTargetSet.has(target) && source === header)?.[0];
                  const visibleMappedTarget = mappedTarget === 'Identifier' ? 'UPC' : mappedTarget;
                  const value = visibleMappedTarget || 'Ignore';
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
      {step === 'validate' && review && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Validate & Fix</div><div className="intake-preview-sub">Fix highlighted rows or import only the valid rows.</div></div></div><div className="intake-summary-grid is-five"><div className="intake-summary-item"><span>Total rows</span><strong>{review.totalRows}</strong></div><div className="intake-summary-item"><span>Products to create</span><strong>{liveReviewStats.itemsToCreate}</strong></div><div className="intake-summary-item"><span>Products to update</span><strong>{liveReviewStats.itemsToUpdate}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{liveReviewStats.errorCount}</strong></div><div className="intake-summary-item"><span>Warnings</span><strong className="metric-warning">{liveReviewStats.warningCount}</strong></div></div>{hasErrors ? <div className="intake-callout danger"><div className="intake-callout-icon">!</div><div><div className="intake-callout-title">Errors Found</div><div className="intake-callout-text">Rows with unresolved errors will be skipped during import.</div></div></div> : <div className="intake-callout success"><div className="intake-callout-icon">✓</div><div><div className="intake-callout-title">Success</div><div className="intake-callout-text">All rows passed validation.</div></div></div>}<div className="intake-inline-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div><div className="table-wrap intake-preview-table"><table><thead><tr>{headers.map((header, index) => <MappingHeader target={sourceColumnMappings[header]} showUnmapped key={`${header}-${index}`}>{header || '(blank)'}</MappingHeader>)}<th className="problem-column-header">Alerts</th></tr></thead><tbody>{editableRows.map(row => <tr className={(row.errors ?? []).length ? 'row-error' : (row.warnings ?? []).length ? 'row-warning' : ''} key={row.rowNumber}>{headers.map((header, columnIndex) => <td key={`${row.rowNumber}-${header}-${columnIndex}`}>{renderValidateCell(row, header, columnIndex)}</td>)}<td className="problem-column-cell"><div className="problem-row-alerts">{[...(row.errors ?? []), ...(row.warnings ?? [])].map((problem, index) => <span className={`badge problem-badge ${(row.errors ?? []).includes(problem) ? 'badge-red' : 'badge-amber'}`} key={`${row.rowNumber}-${index}`}><span className="problem-badge-icon">!</span>{problem}</span>)}</div></td></tr>)}</tbody></table></div><div className="form-actions"><button className="btn" type="button" onClick={resetIntake}>Cancel</button><button className="btn btn-alt" type="button" onClick={() => setStep('map')}>Map Columns</button><button className="btn btn-primary" type="button" onClick={executeImport} disabled={importing || validImportRowCount === 0}>{importing ? 'Importing...' : 'Import'}</button></div></div>}
      {step === 'summary' && summary && <div className="intake-card intake-preview-card"><div className="intake-preview-head"><div><div className="intake-preview-title">Import Complete</div><div className="intake-preview-sub">{preview?.fileName}</div></div><span className="badge badge-green">Success</span></div><div className="intake-summary-grid is-four"><div className="intake-summary-item"><span>Rows skipped</span><strong>{summary.rowsSkipped}</strong></div><div className="intake-summary-item"><span>Products created</span><strong>{summary.itemsCreated}</strong></div><div className="intake-summary-item"><span>Products updated</span><strong>{summary.itemsUpdated}</strong></div><div className="intake-summary-item"><span>Errors</span><strong className="metric-error">{summary.errors}</strong></div></div><div className="form-actions"><button className="btn btn-primary" type="button" onClick={resetIntake}>New Import</button></div></div>}
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
    return formatCentralDateTime(value, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const importExportColumns = [
    { header: 'Date', value: record => formatDateTime(record.started) },
    { header: 'Client', key: 'client' },
    { header: 'File', key: 'file' },
    { header: 'User', key: 'user' },
    { header: 'Status', key: 'status' },
    { header: 'Rows', key: 'rows' },
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
  return formatCentralDateTime(value, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace('—', '-');
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
              <p className="merchandise-inventory-identifier">{record.barcodeOrIdNumber || 'No UPC / ID'}</p>
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
                      {sortKey === column.key && (
                        sortDirection === 'asc'
                          ? <ChevronUp className="table-sort-icon" size={13} strokeWidth={2.4} aria-hidden="true" />
                          : <ChevronDown className="table-sort-icon" size={13} strokeWidth={2.4} aria-hidden="true" />
                      )}
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
  return record?.reviewState || (record?.merchStatus === 'Issue' ? 'Issue' : 'Needs Review');
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
                    <small>{identifier || 'No UPC / ID'}</small>
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
                    <span>Shipment photos will appear here when they are attached to this Merchandise record.</span>
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
                  <span>No useful Product Name on Package or UPC / ID was captured. Use photos and Shipment context to match later or raise an issue.</span>
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
                        <div><dt>UPC / ID</dt><dd>{linkedProduct.primaryMatchKey || linkedProduct.identifier || linkedProduct.productId || linkedProduct.gtinUpc || '-'}</dd></div>
                        <div><dt>Job Number</dt><dd>{linkedProduct.itemJobNumber || linkedProduct.pickupJobNumber || '-'}</dd></div>
                        <div><dt>Brand</dt><dd>{linkedProduct.brand || '-'}</dd></div>
                        <div><dt>Description</dt><dd>{linkedProduct.description || '-'}</dd></div>
                        <div><dt>Product Status</dt><dd>{linkedProduct.status || '-'}</dd></div>
                        <div><dt>Required To Shoot</dt><dd>{linkedProduct.requiredToShoot?.ready ? 'Ready' : linkedProduct.requiredToShoot?.missing?.length ? `Missing ${linkedProduct.requiredToShoot.missing.join(', ')}` : 'Not calculated'}</dd></div>
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
                            <small>{product.primaryMatchKey || product.identifier || 'No primary match key'} - {product.itemJobNumber || 'No job number'}</small>
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
const MERCH_REVIEW_V2_DECISIONS_KEY = 'marks:planning-board-deliverable-decisions';
const MERCH_REVIEW_V2_LEGACY_DECISIONS_KEY = 'marks:work-board-production-decisions';
const PM_QUEUE_COLUMNS = [
  { id: QUEUE_IDS.newReview, label: 'New Merch', description: 'Brand-new received merchandise ready for PM review.' },
  { id: QUEUE_IDS.waitingInformation, label: 'Needs More Information', description: 'Reviewed merchandise waiting on Product, work, or required details.' },
  { id: QUEUE_IDS.readyProduction, label: 'Awaiting Photo Release', description: 'Ready work waiting for the final photo release.' },
];
const PLANNING_QUEUE_LABELS = Object.fromEntries(PM_QUEUE_COLUMNS.map(column => [column.id, column.label]));

function commentTimestampMs(comment = {}) {
  const timestamp = new Date(comment.createdAt || comment.created || comment.updatedAt || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function hasRecentPlanningComment(comments = [], nowMs = Date.now()) {
  return comments.some(comment => {
    const timestamp = commentTimestampMs(comment);
    return timestamp > 0 && nowMs - timestamp <= RECENT_COMMENT_WINDOW_MS;
  });
}

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

function normalizeDeliverableRouteSelection(decision = {}, fallbackDeliverableRoute = '') {
  const selected = [
    ...(Array.isArray(decision.deliverableRouteIds) ? decision.deliverableRouteIds : []),
    ...(Array.isArray(decision.productionPaths) ? decision.productionPaths : []),
    decision.primaryDeliverableRoute,
    decision.deliverableRoute,
    fallbackDeliverableRoute,
  ]
    .map(value => deliverableRouteFromLegacyValue(value) || value)
    .filter(Boolean);
  return selected.filter((value, index, list) => list.indexOf(value) === index);
}

function intakeRequestedQueueForRecord(record) {
  if (record?.planningStatus === 'needs-more-information') return QUEUE_IDS.waitingInformation;
  if (record?.planningStatus === 'awaiting-photo-release') return QUEUE_IDS.readyProduction;
  if (record?.planningStatus === 'new') return QUEUE_IDS.newReview;
  return QUEUE_IDS.newReview;
}

function deliverableRouteLabelForDeliverable(deliverable) {
  const deliverableRouteId = DELIVERABLE_ROUTE_MAP[normalizeDeliverableValue(deliverable)];
  return deliverableRouteId ? deliverableRouteLabel(deliverableRouteId) : '';
}

const DELIVERABLE_ALIASES = {
  packaging: 'Packaging',
  'packaging photo': 'Packaging',
  'packaging photography': 'Packaging',
  ecomm: 'Ecomm',
  'ecomm photo': 'Ecomm',
  ecommerce: 'Ecomm',
  'ecommerce photo': 'Ecomm',
  'ecommerce photography': 'Ecomm',
  'gs1 ecomm': 'Ecomm',
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

const PRODUCT_REQUEST_TYPE_DELIVERABLE_MAP = {
  'ecomm only': ['Ecomm'],
  ecomm: ['Ecomm'],
  ecommerce: ['Ecomm'],
  'ecommerce only': ['Ecomm'],
  'pack only': ['Packaging'],
  pack: ['Packaging'],
  packaging: ['Packaging'],
  'packaging only': ['Packaging'],
  'thr3d only': ['Thr3d'],
  thr3d: ['Thr3d'],
  threed: ['Thr3d'],
  'threed only': ['Thr3d'],
  '3d': ['Thr3d'],
  '3d only': ['Thr3d'],
  'pack thr3d': ['Packaging', 'Thr3d'],
  'pack and thr3d': ['Packaging', 'Thr3d'],
  'packaging thr3d': ['Packaging', 'Thr3d'],
  'packaging and thr3d': ['Packaging', 'Thr3d'],
  'packaging threed': ['Packaging', 'Thr3d'],
  'packaging and threed': ['Packaging', 'Thr3d'],
  'packaging 3d': ['Packaging', 'Thr3d'],
  'packaging and 3d': ['Packaging', 'Thr3d'],
  'thr3d pack': ['Packaging', 'Thr3d'],
  'thr3d and pack': ['Packaging', 'Thr3d'],
  'ecomm pack': ['Ecomm', 'Packaging'],
  'ecomm and pack': ['Ecomm', 'Packaging'],
  'ecommerce pack': ['Ecomm', 'Packaging'],
  'ecommerce and pack': ['Ecomm', 'Packaging'],
  'pack ecomm': ['Ecomm', 'Packaging'],
  'pack and ecomm': ['Ecomm', 'Packaging'],
};

function productRequestTypeDeliverables(requestType) {
  const normalized = stripSurroundingQuotes(requestType).toLowerCase();
  const key = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  return normalizeDeliverableList(PRODUCT_REQUEST_TYPE_DELIVERABLE_MAP[key] || []);
}

function suggestedDeliverablesForRecord(record = {}) {
  if (deliverablesForRecord(record).length) return [];
  return productRequestTypeDeliverables(record.linkedItem?.requestType);
}

function initialReviewDeliverables(record = {}) {
  const committed = deliverablesForRecord(record);
  return committed.length ? committed : suggestedDeliverablesForRecord(record);
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
    'Required Identifier': 'UPC / ID',
    'Merchandise Verified': 'Product match',
    'Activation Information': 'Missing campaign or activation information',
  }[label] || label;
}

function wizardStateForItem(item, draftDeliverables) {
  const record = item?.record || {};
  const product = record.linkedItem || {};
  const deliverables = normalizeDeliverableList(draftDeliverables ?? record.deliverables);
  const requirements = deliverableListsEqual(deliverables, record.deliverables)
    ? item?.requiredToShoot || []
    : evaluateMerchandiseReviewRequirements({ ...record, deliverables });
  const actionableRequirements = requirements.filter(requirement => requirementBlockerLabel(requirement) !== 'Merchandise Verified');
  const blockers = visibleRequirementBlockers(actionableRequirements);
  const productLinked = Boolean(product.id || record.itemIds?.length);
  const productIdentified = productIdentifiedForPlanningItem(item);
  const missingLabels = blockers.map(requirementLabelForUser);
  return {
    productLinked,
    productIdentified,
    deliverables,
    blockers,
    missingLabels,
    thr3dOnly: isThr3dOnlyDeliverables(deliverables),
    photoDeliverables: deliverables.filter(value => value === 'Packaging' || value === 'Ecomm'),
  };
}

function clampQuantity(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function defaultThr3dAllocation(quantity = 1) {
  const totalQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
  return Math.max(1, Math.floor(totalQuantity / 2));
}

function workstreamAssignmentsForDeliverables(deliverables = [], quantity = 1, allocation = {}) {
  const normalized = enforceExclusiveGs1Deliverables(normalizeDeliverableList(deliverables));
  const totalQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const hasPackaging = normalized.includes('Packaging');
  const hasEcomm = normalized.includes('Ecomm');
  const hasThr3d = normalized.includes('Thr3d');
  const maxSplitThr3d = totalQuantity > 1 ? totalQuantity - 1 : 1;
  const thr3dQuantity = hasPackaging && hasThr3d
    ? clampQuantity(allocation.thr3d ?? defaultThr3dAllocation(totalQuantity), 1, maxSplitThr3d)
    : totalQuantity;
  const packagingQuantity = hasPackaging && hasThr3d && totalQuantity > 1
    ? Math.max(1, totalQuantity - thr3dQuantity)
    : totalQuantity;
  return {
    workstreams: [
      ...(hasEcomm ? [{ type: 'Ecomm', quantity: totalQuantity }] : []),
      ...(hasPackaging ? [{ type: 'Packaging', quantity: packagingQuantity }] : []),
    ],
    thr3d: hasThr3d ? { quantity: thr3dQuantity } : null,
  };
}

function planningActionOutcomePreview({
  isWorkstreamCard = false,
  isMerchAcceptanceReview = false,
  stepFlagged = false,
  splitNeedsMultipleUnits = false,
  wizardState = {},
  photoProductionMissingCount = 0,
  photoProductionReady = false,
  requirementBlockers = [],
} = {}) {
  if (stepFlagged) return 'Issue will keep this item out of release until resolved.';
  if (isMerchAcceptanceReview) return '';
  if (isWorkstreamCard) {
    const hasPhotoDeliverable = (wizardState.deliverables || []).some(type => type === 'Packaging' || type === 'Ecomm');
    if (!hasPhotoDeliverable) return 'Blocked by missing required info: choose Ecomm or Packaging.';
    if (!photoProductionReady) {
      const count = photoProductionMissingCount || 1;
      return `Blocked by missing required info: ${count} product field${count === 1 ? '' : 's'} still needed.`;
    }
    return 'Details complete. Ready for photo release.';
  }
  if (splitNeedsMultipleUnits) return 'Blocked by missing required info: update Qty received or choose one deliverable.';
  const deliverables = normalizeDeliverableList(wizardState.deliverables || []);
  const hasPhotoDeliverable = deliverables.some(type => type === 'Packaging' || type === 'Ecomm');
  if (wizardState.productIdentified && hasPhotoDeliverable && photoProductionReady && !requirementBlockers.length) return '';
  if (!wizardState.productIdentified) return 'Match a Product before this can move on.';
  if (!hasPhotoDeliverable) return 'Choose Ecomm or Packaging before this can move on.';
  if (requirementBlockers.some(blocker => blocker.key === 'deliverables') && deliverables.length) {
    return 'Save to confirm these deliverables before this can move on.';
  }
  if (!photoProductionReady) {
    const count = photoProductionMissingCount || 1;
    return `${count} product field${count === 1 ? '' : 's'} still needed before this can move on.`;
  }
  return `Still needed before this can move on: ${requirementBlockers.map(requirementLabelForUser).join(', ')}.`;
}

function enforceExclusiveGs1Deliverables(values = [], changedOption = '') {
  const normalized = normalizeDeliverableList(values);
  if (!normalized.includes('Ecomm') || !normalized.includes('Thr3d')) return normalized;
  const removeOption = changedOption === 'Thr3d' ? 'Ecomm' : 'Thr3d';
  return normalized.filter(value => value !== removeOption);
}

function queueIdForPlanningStatus(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'new': return QUEUE_IDS.newReview;
    case 'needs-more-information':
    case 'needs-product-work':
    case 'awaiting-info':
      return QUEUE_IDS.waitingInformation;
    case 'awaiting-photo-release': return QUEUE_IDS.readyProduction;
    default: return QUEUE_IDS.waitingInformation;
  }
}

function planningStatusFromLegacyQueue(queueId) {
  if (queueId === QUEUE_IDS.newReview) return 'new';
  if (queueId === QUEUE_IDS.readyProduction) return 'awaiting-photo-release';
  return 'needs-more-information';
}

function buildWorkstreamPlanningItem(card = {}, { clientMap = {}, locationMap = {} } = {}) {
  const record = card.receivedMerch || {};
  const type = card.type || 'Workstream';
  const client = clientMap[record.clientIds?.[0]];
  const location = record.locationId ? locationMap[record.locationId] : null;
  const baseAssignment = evaluateMerchandiseReviewAssignment(
    { ...record, deliverables: [type] },
    {
      requestedQueueId: QUEUE_IDS.waitingInformation,
      reviewState: record.reviewState || 'Needs Review',
      client,
      planningBoard: planningBoardForClient(record.clientIds?.[0]),
    },
  );
  const baseCard = buildPlanningCard(record, { assignment: baseAssignment, client, location });
  const planningStatus = card.planningStatus || 'needs-more-information';
  const columnId = queueIdForPlanningStatus(planningStatus);
  const productionStatus = fallbackPhotoProductionStatus(type, {
    client,
    clientPhotoProductionRequirements: client?.photoProductionRequirements,
    record: { ...record, manualProductInfo: card.manualProductInfo || record.manualProductInfo || '', linkedItem: card.expectedProduct || record.linkedItem || {} },
  }) || card.photoProduction || null;
  const requiredToShoot = [...(baseCard.requiredToShoot || [])];
  return {
    ...baseCard,
    requiredToShoot,
    id: card.id,
    merchandiseId: record.id,
    workstreamCardId: card.id,
    subjectType: 'workstream-card',
    title: card.expectedProduct?.product || card.expectedProduct?.name
      || record.linkedItem?.product || record.linkedItem?.name
      || record.productName || record.description || card.name || 'Received Merch',
    columnId,
    queueLabel: PLANNING_QUEUE_LABELS[columnId] || 'Needs More Information',
    deliverables: [type],
    deliverableRouteId: DELIVERABLE_ROUTE_MAP[type],
    deliverableRoute: type,
    workstreamType: type,
    creativeForceStep: card.creativeForceStep || '',
    creativeForceStatus: card.creativeForceStatus || '',
    planningStatus,
    workstreamQuantity: card.quantity || 0,
    clientPhotoProductionRequirements: client?.photoProductionRequirements || null,
    photoProduction: productionStatus,
    commentCount: 0,
    unreadComments: 0,
    quantity: card.quantity || record.quantity || 1,
    record: {
      ...record,
      deliverables: [type],
      workstreamCardId: card.id,
      workstreamType: type,
      creativeForceStep: card.creativeForceStep || '',
      creativeForceStatus: card.creativeForceStatus || '',
      planningStatus,
      workstreamQuantity: card.quantity || 0,
      manualProductInfo: card.manualProductInfo || record.manualProductInfo || '',
      photoProduction: productionStatus,
    },
  };
}

function deliverableToneClass(value) {
  return {
    Packaging: 'is-packaging-photo',
    Ecomm: 'is-ecomm-photo',
    Thr3d: 'is-thr3d',
  }[normalizeDeliverableValue(value)] || 'is-neutral';
}

const DELIVERABLE_SHORT_LABELS = { Packaging: 'Pack', Ecomm: 'Ecom', Thr3d: 'Thr3d' };

// text/html is what preserves the SKU table when pasted into Outlook; the plain
// alternative is there for clients that take only text.
async function copyPhotoReleaseEmail(email = {}) {
  const html = email.html || '';
  const plain = photoReleaseEmailText(email.html);
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    return 'Copied. Paste into a new message.';
  } catch {
    return 'Could not copy.';
  }
}

function PhotoReleaseEmailHandoff({ email, onDismiss }) {
  const [copied, setCopied] = useState('');
  const recipients = email.recipients || [];

  async function copyFormatted() {
    setCopied(await copyPhotoReleaseEmail(email));
  }

  return (
    <span className="photo-release-handoff">
      <button type="button" className="btn btn-primary" onClick={copyFormatted}>Copy email</button>
      <a className="btn" href={photoReleaseMailtoUrl(email)}>Open blank message</a>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>Dismiss</button>
      <em>
        {copied || (recipients.length
          ? 'Copy the email and paste it into a new message.'
          : 'No recipients set for this client.')}
      </em>
    </span>
  );
}

// Drawn inline rather than shipped as an asset: it is one small mark, and this
// whole line is temporary.
function CreativeForceMark({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cf-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b3fd6" />
          <stop offset="45%" stopColor="#4f46e5" />
          <stop offset="75%" stopColor="#c9a0d8" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <path
        d="M20 7.2A9 9 0 1 0 20 16.8"
        fill="none"
        stroke="url(#cf-mark)"
        strokeWidth="5.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// What another arrival of this same SKU is already doing, if anything. Only worth
// saying when that arrival is further along than this one — otherwise it is noise.
function otherArrivalNote(item, arrivalsByProduct) {
  const productId = item.record?.itemIds?.[0] || item.record?.linkedItem?.id || '';
  const siblings = (arrivalsByProduct[productId] || []).filter(other => other.id !== item.id);
  if (!productId || !siblings.length) return '';

  const released = siblings.filter(other => other.record?.released);
  if (released.length) {
    const when = formatInventoryDate(released[0].record?.releasedAt);
    return `Another arrival of this SKU was released${when ? ` ${when}` : ''}.`;
  }
  const awaiting = siblings.filter(other => releaseSectionForPlanningItem(other) === 'readyToRelease');
  if (awaiting.length) return 'Another arrival of this SKU is ready for release.';
  return `This SKU arrived ${siblings.length + 1} times.`;
}

function DeliverableBadges({ values = [], overlay = false, suggested = false, justReleased = false }) {
  const deliverables = normalizeDeliverableList(values);
  if (!deliverables.length) return null;
  return (
    <div className={`deliverable-badge-row ${overlay ? 'is-overlay' : ''}`} aria-label={suggested ? 'Suggested deliverables' : 'Deliverables'}>
      {deliverables.map(deliverable => (
        <span
          className={`deliverable-badge ${deliverableToneClass(deliverable)} ${suggested ? 'is-suggested' : ''} ${justReleased ? 'is-just-released' : ''}`}
          key={deliverable}
          title={justReleased ? `${deliverable} - just released to photo` : suggested ? `${deliverable} (suggested, not yet confirmed)` : deliverable}
        >
          {justReleased && <Check size={11} strokeWidth={3} aria-hidden="true" />}
          {deliverable === 'Packaging' && <PackageOpen size={11} strokeWidth={2.2} aria-hidden="true" />}
          {deliverable === 'Ecomm' && <Camera size={11} strokeWidth={2.2} aria-hidden="true" />}
          {deliverable === 'Thr3d' && <Rotate3d size={11} strokeWidth={2.2} aria-hidden="true" />}
          {DELIVERABLE_SHORT_LABELS[deliverable] || deliverable}
        </span>
      ))}
    </div>
  );
}

function deliverableSummaryLabel(values = []) {
  const deliverables = normalizeDeliverableList(values);
  return deliverables.join(' + ');
}

function requiredToShootSummary(item) {
  const requirements = (item.requiredToShoot || []).filter(requirement => requirement.visible !== false && requirement.tone !== 'neutral');
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

function ageBucketForItem(item) {
  const days = Number(item.record?.daysInHouse ?? item.record?.daysHere ?? item.record?.ageDays ?? 0);
  const hoursMatch = String(item.timeHere || '').match(/(\d+)\s*(?:hour|hr|h)/i);
  const dayMatch = String(item.timeHere || '').match(/(\d+)\s*(?:day|d)/i);
  const label = days >= 1
    ? `${days} ${days === 1 ? 'day' : 'days'}`
    : dayMatch
      ? `${dayMatch[1]} ${Number(dayMatch[1]) === 1 ? 'day' : 'days'}`
      : hoursMatch
        ? `${hoursMatch[1]}h`
        : 'New';
  if (days >= 14 || /\b(1[4-9]|[2-9][0-9])d\b/i.test(label)) return { label, tone: 'old' };
  if (days >= 7 || /\b([7-9]|1[0-3])d\b/i.test(label)) return { label, tone: 'aging' };
  return { label, tone: 'fresh' };
}

function CommentCountChip({ count = 0, unread = 0, recent = false, className = '', title = '', ariaLabel = '' }) {
  return (
    <span
      className={`planning-comment-signal ${recent ? 'has-recent' : ''} ${unread > 0 ? 'has-unread' : ''} ${className}`.trim()}
      aria-label={ariaLabel || `${count || 0} comments${unread > 0 ? `, ${unread} new` : ''}${recent ? ', recent activity' : ''}`}
      title={title || undefined}
    >
      {unread > 0 && <span className="planning-unread-dot" aria-hidden="true" />}
      <MessageSquare size={11} strokeWidth={2.4} aria-hidden="true" />
      {count || 0}
    </span>
  );
}

function productLinkedForPlanningItem(item = {}) {
  const record = item.record || {};
  return Boolean(record.linkedItem?.id || record.itemIds?.length);
}

function manualProductInfoObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function manualProductInfoForItem(item = {}) {
  const record = item.record || {};
  return {
    ...manualProductInfoObject(record.manualProductInfo),
    ...manualProductInfoObject(item.manualProductInfo),
  };
}

function productDataSourceForPlanningItem(item = {}, draft = {}) {
  const record = item.record || {};
  const linked = record.linkedItem || {};
  if (linked.id) return { ...linked, ...draft };
  const manual = manualProductInfoForItem(item);
  return {
    name: manual.name || manual.productName || manual.product || record.productName || '',
    product: manual.product || manual.productName || manual.name || record.productName || '',
    upc: manual.upc || manual.primaryMatchKey || manual.identifier || manual.productId || record.skuId || record.observedIdentifier || '',
    primaryMatchKey: manual.primaryMatchKey || manual.upc || manual.identifier || manual.productId || record.skuId || record.observedIdentifier || '',
    identifier: manual.identifier || manual.upc || manual.primaryMatchKey || manual.productId || record.skuId || record.observedIdentifier || '',
    cvid: manual.cvid || record.cvid || '',
    itemJobNumber: manual.itemJobNumber || manual.jobNumber || '',
    wkftJobNumber: manual.wkftJobNumber || '',
    pickupJobNumber: manual.pickupJobNumber || '',
    brandPrefix: manual.brandPrefix || '',
    fileNameDescription: manual.fileNameDescription || '',
    productDescription: manual.productDescription || manual.description || record.description || '',
    productType: manual.productType || '',
    ecommPhotoNotes: manual.ecommPhotoNotes || '',
    pathToArt: manual.pathToArt || manual.artworkPath || '',
    description: manual.description || manual.productDescription || record.description || '',
    brand: manual.brand || '',
    ...draft,
  };
}

function productIdentifiedForPlanningItem(item = {}) {
  if (productLinkedForPlanningItem(item)) return true;
  const productData = productDataSourceForPlanningItem(item);
  return Boolean(
    String(productData.name || productData.product || '').trim()
    && String(productData.upc || productData.primaryMatchKey || productData.identifier || '').trim()
  );
}

function productWorkChecklistForItem(item = {}) {
  const record = item.record || {};
  const deliverables = normalizeDeliverableList(item.deliverables || initialReviewDeliverables(record));
  const productIdentified = productIdentifiedForPlanningItem(item);
  const productLinked = productLinkedForPlanningItem(item);
  return [
    productIdentified
      ? { label: productLinked ? 'Matched' : 'Manual info', tone: 'matched', mark: 'check' }
      : { label: 'Product info missing', tone: 'needed', mark: 'none' },
    deliverables.length
      ? { label: `Deliverables: ${deliverableSummaryLabel(deliverables)}`, tone: 'matched', mark: 'check' }
      : { label: 'Deliverables missing', tone: 'needed', mark: 'none' },
  ];
}

function PhotoProductionValidationSummary({ production, compact = false }) {
  const entries = production?.workstreamType
    ? [[production.workstreamType, production]]
    : Object.entries(production || {});
  if (!entries.length) return null;
  return (
    <div className={`planning-card-photo-validation ${compact ? 'is-compact' : ''}`} aria-label="Photo production validation">
      {entries.map(([type, status]) => (
        <span key={type}>
          <strong>{type}</strong>
          <em className={status.productData?.ready ? 'is-ready' : 'is-missing'}>Product {status.productData?.ready ? 'ready' : `${status.productData?.missing?.length || 0} missing`}</em>
          {status.creativeForce?.checks?.length > 0 && <em className={status.creativeForce.ready ? 'is-ready' : 'is-missing'}>CF {status.creativeForce.ready ? 'ready' : `${status.creativeForce.missing?.length || 0} missing`}</em>}
        </span>
      ))}
    </div>
  );
}

const PHOTO_PRODUCTION_EDITABLE_FIELDS = {
  productName: { label: 'Product Name', patch: 'name' },
  upc: { label: 'UPC / Product ID', patch: 'primaryMatchKey' },
  cvid: { label: 'CVID', patch: 'cvid' },
  jobNumber: { label: 'WKFT Job Number', patch: 'itemJobNumber' },
  brandPrefix: { label: 'Brand Prefix', patch: 'brandPrefix' },
  fileNameDescription: { label: 'File Name Description', patch: 'fileNameDescription' },
  productDescription: { label: 'Product Description', patch: 'productDescription' },
  productType: { label: 'Product Type', patch: 'productType' },
  ecommPhotoNotes: { label: 'Ecomm Photo Notes', patch: 'ecommPhotoNotes' },
  pathToArt: { label: 'Valid Artwork Path', patch: 'pathToArt' },
};

function productPatchFromPhotoDraft(draft = {}) {
  const patch = {};
  Object.entries(draft).forEach(([field, value]) => {
    const definition = PHOTO_PRODUCTION_EDITABLE_FIELDS[field];
    if (!definition) return;
    patch[definition.patch] = String(value ?? '').trim();
  });
  return patch;
}

function normalizedIdentityValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchedIdentityFieldSatisfied(item = {}, field) {
  const record = item.record || {};
  const product = record.linkedItem || {};
  if (!product.id) return false;
  if (field === 'productName') {
    return Boolean(record.productName && (product.name || product.product))
      && normalizedIdentityValue(record.productName) === normalizedIdentityValue(product.name || product.product);
  }
  if (field === 'upc') {
    const observed = normalizedIdentityValue(record.skuId);
    const linked = normalizedIdentityValue(product.upc || product.primaryMatchKey || product.identifier);
    return Boolean(observed && linked) && observed === linked;
  }
  return false;
}

function photoProductionChecks(production = {}, item = {}) {
  const entries = production?.workstreamType
    ? [[production.workstreamType, production]]
    : Object.entries(production || {});
  const seen = new Set();
  return entries.flatMap(([, status]) => [
    ...(status.productData?.checks || []),
  ]).filter(check => {
    if (['productName', 'upc'].includes(check.key) && matchedIdentityFieldSatisfied(item, check.key)) return false;
    const identity = check.key === 'productCode' ? 'productCode' : check.key;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function photoProductionProductValue(product = {}, field) {
  if (field === 'productName') return product.name || product.product || product.productName || '';
  if (field === 'upc') return product.upc || product.primaryMatchKey || product.identifier || product.productId || product.skuId || '';
  if (field === 'jobNumber') return product.itemJobNumber || product.jobNumber || product.wkftJobNumber || product.pickupJobNumber || '';
  if (field === 'fileNameDescription' && product.fileNameDescription) return product.fileNameDescription;
  if (field === 'fileNameDescription') {
    return referenceDataValue(product, ['File Name Description', 'fileNameDescription', 'Prod Descrip', 'Product Description'])
      || product.productDescription
      || product.description
      || '';
  }
  return product[field] || '';
}

function photoProductionValuePresent(field, value) {
  const text = String(value || '').trim();
  return Boolean(text);
}

function PhotoProductionFieldsEditor({ item, production, onDraftChange }) {
  const product = item?.record?.linkedItem || {};
  const productDataSource = productDataSourceForPlanningItem(item);
  const entries = production?.workstreamType
    ? [[production.workstreamType, production]]
    : Object.entries(production || {});
  const fields = [...new Set(
    photoProductionChecks(production, item)
      .map(check => check.key)
      .filter(field => PHOTO_PRODUCTION_EDITABLE_FIELDS[field]),
  )];
  // Name and UPC are settled by matching or by receiving, never authored here, so
  // they are dropped from the field list rather than shown as satisfied. Every other
  // required field stays visible even when filled — people need to learn the shape of
  // what the client requires, and a list that only appears when something is wrong
  // never teaches it.
  const inheritedIdentityFields = fields.filter(field => (
    ['productName', 'upc'].includes(field)
    && photoProductionValuePresent(field, photoProductionProductValue(productDataSource, field))
  ));
  const inheritedIdentityFieldSet = new Set(inheritedIdentityFields);
  const editableFields = fields.filter(field => !inheritedIdentityFieldSet.has(field));
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const nextDraft = Object.fromEntries(fields.map(field => [field, photoProductionProductValue(productDataSource, field)]));
    setDraft(nextDraft);
    onDraftChange?.(Object.fromEntries(
      Object.entries(nextDraft).filter(([field]) => !inheritedIdentityFieldSet.has(field)),
    ));
  }, [item?.id, product.id, item?.manualProductInfo, item?.record?.manualProductInfo, item?.record?.productName, item?.record?.skuId, fields.join('|')]);

  if (!entries.length || !fields.length) return null;

    return (
    <div className="photo-production-fields-editor">
      <div className="photo-production-fields-editor-header">
      </div>
      {editableFields.length > 0 && <div className="photo-production-fields-grid">
        {editableFields.map(field => {
          const definition = PHOTO_PRODUCTION_EDITABLE_FIELDS[field];
          const present = photoProductionValuePresent(field, draft[field]);
          return (
            <label key={field}>
              <span className={`photo-production-field-label ${present ? 'is-present' : 'is-missing'}`}>
                <b aria-hidden="true">{present ? '✓' : '×'}</b>
                {definition.label}
              </span>
              <input
                value={draft[field] ?? ''}
                onChange={event => {
                  const value = event.target.value;
                  setDraft(current => ({ ...current, [field]: value }));
                  onDraftChange?.({ [field]: value });
                }}
              />
            </label>
          );
        })}
      </div>}
    </div>
  );
}

function activationSummary(activation = {}) {
  const linkedCount = (activation.linkedMerchandiseIds || activation.matchedMerchandiseIds || []).length;
  const itemCount = Array.isArray(activation.skuDetails) ? activation.skuDetails.length : 0;
  return `${linkedCount || itemCount} linked · ${normalizeDeliverableList(activation.deliverables).join(', ') || 'No deliverables'}`;
}

function activationLinkedMerchandiseIds(activation = {}) {
  const rowIds = Array.isArray(activation.skuDetails)
    ? activation.skuDetails.map(row => row?.merchandiseId)
    : [];
  return [
    ...(activation.linkedMerchandiseIds || activation.matchedMerchandiseIds || []),
    ...rowIds,
  ].filter(Boolean);
}

function activationByMerchandiseId(activations = []) {
  return activations.reduce((map, activation) => {
    activationLinkedMerchandiseIds(activation).forEach(merchandiseId => {
      if (!map[merchandiseId]) map[merchandiseId] = activation;
    });
    return map;
  }, {});
}

function PlanningActivationListModal({ activations = [], loading = false, onClose, onEdit, onAdd }) {
  const editableActivations = activations.filter(activationEditableForPhoto);
  return createPortal(
    <div className="activation-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="activation-list-modal" role="dialog" aria-modal="true" aria-label="Edit Photo Releases" onClick={event => event.stopPropagation()}>
        <header className="activation-modal-header">
          <div>
            <span className="nr-eyebrow">Topco</span>
            <h2>Edit Photo Releases</h2>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close photo releases">
            <Icon.Close />
          </button>
        </header>
        <div className="activation-list-body">
          {loading ? (
            <div className="planning-activation-empty">Loading photo releases...</div>
          ) : editableActivations.length ? (
            editableActivations.map(activation => (
              <button type="button" className="activation-list-row" onClick={() => onEdit?.(activation)} key={activation.id}>
                <span>
                  <strong>{activation.name || 'Untitled photo release'}</strong>
                  <small>{activation.dueUrgency || activation.status || 'Draft'}</small>
                </span>
                <em>{activationSummary(activation)}</em>
              </button>
            ))
          ) : (
            <div className="planning-activation-empty">No pending photo releases to edit.</div>
          )}
        </div>
        <footer className="activation-modal-footer">
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" onClick={onAdd}>New photo release</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function activationEditableForPhoto(activation = {}) {
  return !['Released', 'Cancelled', 'Complete'].includes(String(activation.status || '').trim());
}

const PLANNING_RELEASE_SECTIONS = [
  { id: 'needsReview', label: 'Newly Received Merch', description: 'View and acknowledge newly received merchandise.' },
  { id: 'needsDetails', label: 'Needs More Information', description: 'Reviewed work with outstanding validation.' },
  { id: 'readyToRelease', label: 'Awaiting Photo Release', description: 'Ready work waiting for release.' },
];

function releaseSectionForPlanningItem(item = {}) {
  if (item.columnId === QUEUE_IDS.readyProduction) return 'readyToRelease';
  if (item.columnId === QUEUE_IDS.newReview) return 'needsReview';
  return 'needsDetails';
}

function releaseInfoCompleteForPlanningItem(item = {}) {
  const productChecksComplete = productWorkChecklistForItem(item).every(check => check.mark === 'check');
  const photoProductionComplete = photoProductionReadyForPlanningItem(item);
  if (item.subjectType === 'workstream-card') {
    return productChecksComplete && photoProductionComplete;
  }
  const summary = requiredToShootSummary(item);
  const blockers = visibleRequirementBlockers(item.requiredToShoot || []);
  const requiredToShootComplete = summary.total === 0 || blockers.length === 0;
  return productChecksComplete && photoProductionComplete && requiredToShootComplete;
}

function photoProductionReadyForPlanningItem(item = {}) {
  const deliverables = normalizeDeliverableList(item.deliverables || item.record?.deliverables);
  const currentWorkstreamType = item.workstreamType || item.record?.workstreamType || item.deliverableRoute || '';
  const photoTypes = item.subjectType === 'workstream-card'
    ? [normalizeDeliverableValue(currentWorkstreamType)].filter(type => type === 'Packaging' || type === 'Ecomm')
    : deliverables.filter(type => type === 'Packaging' || type === 'Ecomm');
  if (!photoTypes.length) return true;
  const production = Object.fromEntries(
    photoTypes.map(type => {
      const status = type === normalizeDeliverableValue(currentWorkstreamType)
        ? photoProductionStatusForItem(item)
        : item.record?.photoProduction?.[type] || fallbackPhotoProductionStatus(type, item);
      return [type, status];
    }).filter(([, status]) => status)
  );
  const checks = photoProductionChecks(production, item);
  if (!checks.length) return true;
  const product = productDataSourceForPlanningItem(item);
  return checks.every(check => photoProductionValuePresent(check.key, photoProductionProductValue(product, check.key)));
}



// A span rather than a button: these sit inside the Planning card, which is itself
// a button, and a button inside a button is invalid and behaves unpredictably.
// role and the key handler keep it reachable without a keyboard user losing it.
function CopyValue({ value, label }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const copy = event => {
    event.stopPropagation();
    event.preventDefault();
    navigator.clipboard?.writeText(String(value)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  };

  return (
    <span
      role="button"
      tabIndex={0}
      className={`copy-value ${copied ? 'is-copied' : ''}`}
      title={copied ? 'Copied' : label}
      aria-label={label}
      onClick={copy}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') copy(event);
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </span>
  );
}

function ReleaseCardIdentifierLine({ item, identifier, sectionId }) {
  const matched = productLinkedForPlanningItem(item);
  return (
    <span className="planning-release-identity-line">
      <span>{identifier || 'No UPC'}</span>
      <CopyValue value={identifier} label="Copy UPC" />
      <span className={matched ? 'is-matched' : 'is-unmatched'}>{matched ? '✓ Matched' : '✗ Unmatched'}</span>
    </span>
  );
}

function releaseCardDeliverables(item = {}, sectionId = '') {
  if (sectionId === 'needsReview') return [];
  if (item.subjectType === 'workstream-card') {
    return normalizeDeliverableList(item.deliverables || item.record?.deliverables);
  }
  const committed = normalizeDeliverableList(item.record?.deliverables);
  return committed.length ? committed : initialReviewDeliverables(item.record);
}

function planningShipmentDateValue(item = {}) {
  return item.record?.receipt?.received || item.record?.dateReceived || item.record?.received || item.receivedAt || '';
}

// Board cards show elapsed time rather than a bucket label. In the first column the
// bucket label reads "New", which only restates the column title and hides the one
// fact the card cannot otherwise convey: how long this has been sitting.
function elapsedAgeForItem(item = {}) {
  const received = planningShipmentDateValue(item);
  const elapsedMs = received ? Date.now() - new Date(received).getTime() : Number.NaN;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return ageBucketForItem(item);
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const label = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : `${Math.max(minutes, 1)}m`;
  const tone = days >= 14 ? 'old' : days >= 7 ? 'aging' : 'fresh';
  return { label, tone };
}

function groupClientName(group = {}) {
  const first = (group.items || [])[0] || {};
  return String(first.client || first.record?.client || '').trim();
}

// Carrier plus the last four of the tracking number is the handle people actually
// read off a box or quote in an email, and it needs no schema of its own. The full
// number is too long for a group header and lives in Shipments, one click away.
function groupShipmentSummary(group = {}) {
  const receipt = ((group.items || [])[0] || {}).record?.receipt || {};
  const carrier = String(receipt.carrier || '').trim();
  const tracking = String(receipt.tracking || '').trim();
  const parcel = [carrier, tracking ? `···${tracking.slice(-4)}` : ''].filter(Boolean).join(' ');
  const count = (group.items || []).length;
  return [
    parcel,
    `${count} ${count === 1 ? 'item' : 'items'}`,
    group.received ? formatInventoryDate(group.received) : '',
  ].filter(Boolean).join(' · ');
}

function planningShipmentGroupLabel(item = {}) {
  const receipt = item.record?.receipt || {};
  const clientName = String(item.client || item.record?.client || '').trim();
  const label = String(receipt.name || receipt.receipt || receipt.tracking || item.shipmentId || '').trim();
  if (clientName && label.toLowerCase().startsWith(clientName.toLowerCase())) {
    const withoutClient = label.slice(clientName.length).replace(/^\s*[-–—:]\s*/, '').trim();
    return withoutClient || 'Shipment';
  }
  return label || 'Shipment';
}

function groupPlanningItemsByShipment(items = []) {
  const groups = new Map();
  items.forEach(item => {
    const receipt = item.record?.receipt || {};
    const received = planningShipmentDateValue(item);
    const key = receipt.id || item.shipmentId || `unassigned-${received || 'unknown'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        shipmentId: receipt.id || item.shipmentId || '',
        label: planningShipmentGroupLabel(item),
        received,
        items: [],
      });
    }
    const group = groups.get(key);
    if (!group.received && received) group.received = received;
    group.items.push(item);
  });
  return Array.from(groups.values())
    .map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => (
        new Date(planningShipmentDateValue(b) || 0) - new Date(planningShipmentDateValue(a) || 0)
        || String(a.title || '').localeCompare(String(b.title || ''))
      )),
    }))
    .sort((a, b) => (
      new Date(b.received || 0) - new Date(a.received || 0)
      || String(a.label || '').localeCompare(String(b.label || ''))
    ));
}

function PlanningReleaseView({
  sections,
  items,
  selectedId,
  onSelect,
  disabled = false,
  showNewCardClient = true,
  groupByShipment = true,
  selectedReleaseIds = [],
  onToggleReleaseSelection,
  onToggleReleaseGroup,
  onReleaseSelected,
  justReleasedIds = [],
  arrivalsByProduct = {},
}) {
  const justReleasedSet = new Set(justReleasedIds);
  const itemsBySection = sections.reduce((groups, section) => ({ ...groups, [section.id]: [] }), {});
  const visibleSectionIds = new Set(sections.map(section => section.id));
  items.forEach(item => {
    const sectionId = releaseSectionForPlanningItem(item);
    if (visibleSectionIds.has(sectionId)) {
      itemsBySection[sectionId]?.push(item);
    }
  });
  const selectedReleaseSet = new Set(selectedReleaseIds);
  return (
    <div className={`planning-release-view ${disabled ? 'is-frozen' : ''}`} aria-label="Planning release view">
      {sections.map(section => {
        const sectionItems = itemsBySection[section.id] || [];
        const selectedInSection = sectionItems.filter(item => selectedReleaseSet.has(item.id));
        const shouldGroupByShipment = groupByShipment;
        const shipmentGroups = shouldGroupByShipment
          ? groupPlanningItemsByShipment(sectionItems)
          : [{ key: `${section.id}-all`, items: sectionItems, received: '' }];
        return (
          <section className={`planning-release-section is-${section.id}`} key={section.id} aria-labelledby={`planning-release-${section.id}`}>
            <header className="planning-release-section-header">
              <div>
                <h2 id={`planning-release-${section.id}`}>{section.label}</h2>
                <span>{section.description}</span>
              </div>
              <div className="planning-release-section-actions">
                <strong>{sectionItems.length}</strong>
                {section.id === 'readyToRelease' && selectedInSection.length > 0 && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onReleaseSelected?.(selectedInSection)} disabled={disabled}>
                    Release to Photo ({selectedInSection.length})
                  </button>
                )}
              </div>
            </header>
            <div className="planning-release-card-list">
              {/* Emptiness is a question about items, not groups. Ungrouped sections
                  always produce one pseudo-group, so checking group count showed the
                  empty state in grouped columns and nothing at all in ungrouped ones. */}
              {sectionItems.length ? shipmentGroups.map(group => (
                <div className="planning-release-shipment-group" key={group.key}>
                  {shouldGroupByShipment && (
                    <div className="planning-release-shipment-header">
                      {showNewCardClient && groupClientName(group) && (
                        <span className="planning-release-group-client">{groupClientName(group)}</span>
                      )}
                      {group.shipmentId ? (
                        <Link to={`/shipments?shipmentId=${encodeURIComponent(group.shipmentId)}`}>
                          {groupShipmentSummary(group) || 'Open shipment'}
                        </Link>
                      ) : (
                        <span>{groupShipmentSummary(group) || 'No received date'}</span>
                      )}
                      {section.id === 'readyToRelease' && group.items.length > 1 && (
                        <button
                          type="button"
                          className="planning-release-group-select"
                          onClick={() => onToggleReleaseGroup?.(group.items.map(groupItem => groupItem.id))}
                          disabled={disabled}
                        >
                          {group.items.every(groupItem => selectedReleaseSet.has(groupItem.id)) ? 'Clear' : 'Select all'}
                        </button>
                      )}
                    </div>
                  )}
                  {group.items.map(item => {
                    const age = elapsedAgeForItem(item);
                    const clientName = String(item.client || item.record?.client || '').trim();
                    const identifier = item.identifier || item.record?.skuId || item.record?.linkedItem?.identifier || '';
                    const selectable = section.id === 'readyToRelease';
                    const checked = selectedReleaseSet.has(item.id);
                    const displayDeliverables = releaseCardDeliverables(item, section.id);
                    const showAge = Boolean(age.label);
                    // Conversation happens on these items constantly, so the board has to
                    // answer "has anything been said about this?" without opening the card.
                    // The chip appears only when there is something to say, so its presence
                    // is itself the signal and empty cards stay sparse.
                    const commentCount = item.commentCount || 0;
                    const showComments = commentCount > 0;
                    const missingRequirements = section.id === 'needsReview' ? [] : requiredToShootSummary(item).missing;
                    const otherRequirements = missingRequirements.filter(entry => entry !== 'Deliverables');
                    const awaitingVerification = missingRequirements.includes('Deliverables')
                      && otherRequirements.length === 0
                      && initialReviewDeliverables(item.record).length > 0;
                    const missingLabel = missingRequirements.length === 0
                      ? ''
                      : awaitingVerification
                        ? 'Needs verification'
                        : missingRequirements.includes('Deliverables')
                          ? 'Missing Deliverables'
                          : `Missing required data \u2013${missingRequirements.length}`;
                    return (
                      <div
                        className={`planning-release-card ${selectedId === item.id ? 'is-selected' : ''} ${selectable ? 'is-selectable' : ''}`}
                        key={item.id}
                      >
                        {selectable && (
                          <label
                            className="planning-release-select"
                            title={checked ? 'Deselect for release' : 'Select for release'}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleReleaseSelection?.(item.id)}
                              disabled={disabled}
                              aria-label={`Select ${item.title || 'merchandise'} for release`}
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          className={`planning-release-card-open ${!(displayDeliverables.length || showAge || showComments) ? 'has-no-meta' : ''}`}
                          onClick={() => !disabled && onSelect?.(item.id)}
                          disabled={disabled}
                        >
                          <span className="planning-release-thumb">
                            <RecordThumbnail record={item.record} count={1} />
                          </span>
                          <span className="planning-release-main">
                            {/* Client lives on the group header when grouping is on, so it
                                appears once per shipment instead of on every card. The
                                eyebrow is the fallback for ungrouped columns, where there
                                is no header to carry it. */}
                            {showNewCardClient && clientName && !shouldGroupByShipment && (
                              <span className="planning-release-eyebrow">{clientName}</span>
                            )}
                            <span className="planning-release-title">
                              <strong>{item.title || 'Received Merchandise'}</strong>
                              <CopyValue value={item.title} label="Copy product name" />
                            </span>
                            <ReleaseCardIdentifierLine item={item} identifier={identifier} sectionId={section.id} />
                            {item.record?.released && (item.creativeForceStep || item.creativeForceStatus) && (
                              <span className="planning-release-cf-line">
                                <CreativeForceMark />
                                <span>{[item.creativeForceStep, item.creativeForceStatus].filter(Boolean).join(' · ')}</span>
                              </span>
                            )}
                            {otherArrivalNote(item, arrivalsByProduct) && (
                              <span className="planning-release-other-arrival">
                                {otherArrivalNote(item, arrivalsByProduct)}
                              </span>
                            )}
                            {missingLabel && (
                              <span className="planning-release-missing-row">
                                <span
                                  className={`planning-release-missing ${awaitingVerification ? 'is-verify' : ''}`}
                                  title={missingRequirements.join(', ')}
                                >
                                  {missingLabel}
                                </span>
                              </span>
                            )}
                          </span>
                          {(displayDeliverables.length || showAge || showComments) && (
                            <span className="planning-release-meta">
                              <span className="planning-release-badge-row">
                                {item.record?.released && (
                                  <span
                                    className="planning-release-released-mark"
                                    title={`Released to photo${item.record?.releasedAt ? ` ${formatInventoryDate(item.record.releasedAt)}` : ''}`}
                                  >
                                    R
                                  </span>
                                )}
                                <DeliverableBadges
                                  values={displayDeliverables}
                                  suggested={awaitingVerification}
                                  justReleased={justReleasedSet.has(item.merchandiseId)}
                                />
                              </span>
                              <span className="planning-release-meta-row">
                                {showComments && (
                                  <CommentCountChip
                                    count={commentCount}
                                    unread={item.unreadComments || 0}
                                    recent={Boolean(item.recentComment)}
                                  />
                                )}
                                {showAge && <span className={`planning-release-age is-${age.tone}`}>{age.label}</span>}
                              </span>
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )) : (
                <div className="planning-release-empty">No cards here.</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function planningSearchHaystack(item) {
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

function planningSectionTitle(section) {
  return {
    [WORKSPACE_SECTIONS.merchandiseObservations]: 'Merchandise Observations',
    [WORKSPACE_SECTIONS.photos]: 'Photos',
    [WORKSPACE_SECTIONS.productIdentification]: 'Product Identification',
    [WORKSPACE_SECTIONS.productIdentificationSummary]: 'Product Identification',
    [WORKSPACE_SECTIONS.deliverables]: 'Deliverables',
    [WORKSPACE_SECTIONS.missingInformation]: 'Missing Information',
    [WORKSPACE_SECTIONS.artwork]: 'Artwork',
    [WORKSPACE_SECTIONS.artworkSummary]: 'Artwork',
    [WORKSPACE_SECTIONS.activation]: 'Activation',
    [WORKSPACE_SECTIONS.notes]: 'Notes',
    [WORKSPACE_SECTIONS.thr3dRouting]: 'THR3D Routing',
    [WORKSPACE_SECTIONS.shipment]: 'Shipment',
    [WORKSPACE_SECTIONS.issues]: 'Issues',
    [WORKSPACE_SECTIONS.history]: 'History',
    [WORKSPACE_SECTIONS.requiredToShoot]: 'Required Information',
    [WORKSPACE_SECTIONS.merchandiseSummary]: 'Merchandise',
    [WORKSPACE_SECTIONS.productSummary]: 'Product',
  }[section] || section;
}

function PlanningFact({ label, value }) {
  return <div><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function requiredToShootForItem(item = {}) {
  const requiredToShoot = item.record?.requiredToShoot;
  if (requiredToShoot?.requirements) return requiredToShoot;
  return {
    ready: false,
    complete: false,
    completeCount: 0,
    totalCount: 4,
    summary: '0 of 4 Complete',
    missing: ['Product Linked', 'Product Name', DOMAIN_TERMS.primaryMatchKey, 'Deliverables'],
    requirements: [
      { key: 'product-linked', label: 'Product Linked', ready: false, missing: 'Link a Product.' },
      { key: 'product-name', label: 'Product Name', ready: false, missing: 'Add Product Name.' },
      { key: 'identifier', label: DOMAIN_TERMS.primaryMatchKey, ready: false, missing: 'Add the Product Primary Match Key.' },
      { key: 'deliverables', label: 'Deliverables', ready: false, missing: 'Select at least one Deliverable.' },
    ],
  };
}

function RequiredToShootPanel({ item }) {
  const requiredToShoot = requiredToShootForItem(item);
  const requirements = requiredToShoot.ready
    ? requiredToShoot.requirements
    : requiredToShoot.requirements.filter(requirement => !requirement.ready);
  return (
    <section className={`production-requiredToShoot-panel ${requiredToShoot.ready ? 'is-ready' : 'is-incomplete'}`}>
      <div className="production-requiredToShoot-header">
        <h3>Required Information</h3>
        <strong>{requiredToShoot.summary}</strong>
      </div>
      {requiredToShoot.ready ? (
        <p>Required information is complete.</p>
      ) : (
        <p>Still needed</p>
      )}
      <ul className="required-to-shoot-list">
        {requirements.map(requirement => (
          <li key={requirement.key} className={requirement.ready ? 'is-ready' : 'is-missing'}>
            <span className="req-mark" aria-hidden="true" />
            <div className="req-text">
              <strong>{requirement.label}</strong>
              {!requirement.ready && <em>{requirement.missing || requirement.detail}</em>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReleaseToProductionAction({ item, onRelease, busy }) {
  const requiredToShoot = requiredToShootForItem(item);
  const released = Boolean(item.record?.released);
  const disabled = released || busy || !requiredToShoot.ready;
  return (
    <div className="release-to-production-action">
      <button type="button" className="btn btn-primary" onClick={() => onRelease?.(item)} disabled={disabled}>
        {busy ? 'Releasing...' : released ? 'Released to Photo' : 'Release to Photo'}
      </button>
      {!released && !requiredToShoot.ready && <span>Complete all required information.</span>}
      {released && <span>Released {formatInventoryDate(item.record?.releasedAt)}</span>}
    </div>
  );
}

function PlanningWorkspaceSection({ section, item, photos, activePhotoUrl, photoIndex, setPhotoIndex, override, onRefresh }) {
  const record = item.record || {};
  const product = record.linkedItem || {};
  const blockers = item.requiredToShoot.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  return (
    <section className="planning-workspace-section">
      <h3>{planningSectionTitle(section)}</h3>
      {section === WORKSPACE_SECTIONS.photos && (
        <div className="planning-photo-section">
          {activePhotoUrl ? <img src={activePhotoUrl} alt="" /> : <div className="planning-empty-inline">No R2-backed photos available.</div>}
          {photos.length > 1 && (
            <div className="planning-thumbnail-row">
              {photos.map((photo, index) => {
                const url = receivingPhotoUrl(photo);
                return url ? <button type="button" className={photoIndex === index ? 'is-active' : ''} onClick={() => setPhotoIndex(index)} key={`${url}-${index}`}><img src={url} alt="" /></button> : null;
              })}
            </div>
          )}
        </div>
      )}
      {section === WORKSPACE_SECTIONS.merchandiseObservations && (
        <div className="planning-fact-grid">
          <PlanningFact label={DOMAIN_TERMS.packageName} value={record.productName} />
          <PlanningFact label={DOMAIN_TERMS.merchandiseIdentifier} value={record.skuId} />
          <PlanningFact label="Quantity" value={record.quantity || 1} />
          <PlanningFact label="Condition" value={record.condition} />
          <PlanningFact label="Storage" value={item.location} />
          <PlanningFact label="Notes" value={record.notes} />
        </div>
      )}
      {section === WORKSPACE_SECTIONS.merchandiseSummary && (
        <>
          <div className="planning-fact-grid">
            {item.subjectType === 'workstream-card' && <PlanningFact label="Work Type" value={item.workstreamType || record.workstreamType || 'Photo'} />}
            {item.subjectType === 'workstream-card' && <PlanningFact label="Assigned Qty" value={item.workstreamQuantity || record.workstreamQuantity || item.quantity} />}
            {item.subjectType === 'workstream-card' && <PlanningFact label="Product Data" value={item.photoProduction?.productData?.ready ? 'Ready' : item.photoProduction?.productData?.missing?.join(', ') || 'Not configured'} />}
            {item.subjectType === 'workstream-card' && <PlanningFact label="Filename" value={item.photoProduction?.fileNaming?.ready ? item.photoProduction.fileNaming.template || 'Ready' : item.photoProduction?.fileNaming?.missing?.join(', ') || 'Not configured'} />}
            {item.subjectType === 'workstream-card' && item.photoProduction?.creativeForce?.checks?.length > 0 && <PlanningFact label="Creative Force" value={item.photoProduction.creativeForce.ready ? `Product Code + ${item.photoProduction.creativeForce.categoryField === 'clientName' ? 'Client Name' : 'Category'}` : item.photoProduction.creativeForce.missing?.join(', ') || 'Not configured'} />}
            <PlanningFact label={DOMAIN_TERMS.packageName} value={record.productName} />
            <PlanningFact label="Client" value={item.client} />
            <PlanningFact label="Queue" value={item.planningCard.currentQueueName} />
            <PlanningFact label="Time Here" value={item.timeHere} />
            <PlanningFact label="Storage" value={item.location} />
          </div>
          {item.subjectType !== 'workstream-card' && record.deliverables?.length > 0 && record.photoProduction && <PhotoProductionValidationSummary production={record.photoProduction} />}
          {(record.deliverables?.some(value => value === 'Packaging' || value === 'Ecomm') || item.photoProduction?.workstreamType || item.workstreamType) && photoProductionStatusForItem(item) && (
            <PhotoProductionFieldsEditor item={item} production={photoProductionStatusForItem(item)} onRefresh={onRefresh} />
          )}
        </>
      )}
      {[WORKSPACE_SECTIONS.productIdentification, WORKSPACE_SECTIONS.productIdentificationSummary, WORKSPACE_SECTIONS.productSummary].includes(section) && (
        product?.id || record.itemIds?.length ? (
          <div className="planning-fact-grid">
            <PlanningFact label="Product" value={product.product || product.name} />
            <PlanningFact label={DOMAIN_TERMS.primaryMatchKey} value={product.primaryMatchKey || product.identifier || product.productId || product.gtinUpc} />
            <PlanningFact label="Brand" value={product.brand} />
            <PlanningFact label="Job Number" value={product.itemJobNumber || product.pickupJobNumber} />
            <PlanningFact label="Required To Shoot" value={product.requiredToShoot?.ready ? 'Ready' : product.requiredToShoot?.missing?.join(', ') || 'Pending'} />
          </div>
        ) : <div className="planning-empty-inline">No Product is linked yet. Product information remains a Required to Shoot blocker.</div>
      )}
      {section === WORKSPACE_SECTIONS.deliverables && (
        <div className="planning-empty-inline">{item.deliverableRoute || 'Deliverables have not been captured in the current data.'}</div>
      )}
      {section === WORKSPACE_SECTIONS.missingInformation && (
        <ul className="planning-requirement-list">
          {(blockers.length ? blockers : item.requiredToShoot.filter(requirement => requirement.visible !== false)).map(requirement => (
            <li key={requirement.key}><strong>{requirement.label}</strong><span>{requirement.detail}</span></li>
          ))}
        </ul>
      )}
      {[WORKSPACE_SECTIONS.artwork, WORKSPACE_SECTIONS.artworkSummary].includes(section) && (
        <div className="planning-empty-inline">{item.requiredToShoot.find(requirement => requirement.key === 'artwork')?.detail || 'Artwork state is pending.'}{override ? ` Override reason: ${override.reason}` : ''}</div>
      )}
      {section === WORKSPACE_SECTIONS.activation && (
        <div className="planning-empty-inline">{item.requiredToShoot.find(requirement => requirement.key === 'activation-information')?.detail || 'Activation information is pending.'}</div>
      )}
      {section === WORKSPACE_SECTIONS.thr3dRouting && (
        <div className="planning-empty-inline">This queue marks Merchandise for the THR3D branch. Full THR3D handoff actions are deferred.</div>
      )}
      {section === WORKSPACE_SECTIONS.shipment && (
        <div className="planning-fact-grid">
          <PlanningFact label={DOMAIN_TERMS.shipment} value={record.receipt?.name} />
          <PlanningFact label="Received" value={formatInventoryDate(record.dateReceived || record.received)} />
          <PlanningFact label="Time Here" value={item.timeHere} />
        </div>
      )}
      {section === WORKSPACE_SECTIONS.issues && (
        record.blockingIssues?.length ? (
          <ul className="planning-requirement-list">
            {record.blockingIssues.map(issue => <li key={issue.id || issue.description}><strong>{issue.type || 'Issue'}</strong><span>{issue.description || issue.notes || 'Blocking issue'}</span></li>)}
          </ul>
        ) : <div className="planning-empty-inline">No blocking Merchandise issues are attached.</div>
      )}
      {section === WORKSPACE_SECTIONS.requiredToShoot && (
        <RequiredToShootPanel item={item} />
      )}
      {section === WORKSPACE_SECTIONS.history && (
        <div className="planning-empty-inline">History will appear here when durable Planning events are available.</div>
      )}
    </section>
  );
}

function requirementToneLabel(requirement = {}) {
  if (requirement.visible === false) return 'Not applicable';
  if (requirement.tone === 'green') return 'Green';
  if (requirement.tone === 'orange') return 'Orange';
  if (requirement.tone === 'red') return 'Red';
  return requirement.status || 'Pending';
}

function requirementMissingFields(requirement = {}) {
  if (requirement.satisfied || requirement.visible === false) return [];
  return String(requirement.detail || requirement.label || 'Required information')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function requirementResolution(requirement = {}) {
  if (requirement.satisfied || requirement.visible === false) return 'No action needed.';
  if (requirement.key === 'product-information') return 'Link an existing Product or complete the missing Product fields.';
  if (requirement.key === 'artwork') return 'Confirm artwork availability on the linked Product or client source.';
  if (requirement.key === 'activation-information') return 'Add the existing activation, campaign, or reporting reference information.';
  return 'Resolve the missing Required to Shoot information.';
}

function requirementBlockerLabel(requirement = {}) {
  const missing = requirementMissingFields(requirement);
  const readsAsFieldName = missing.length === 1
    && missing[0] !== requirement.label
    && missing[0].split(/\s+/).length <= 3;
  if (readsAsFieldName) return missing[0];
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
  const photoProduction = photoProductionStatusForItem(item);
  const activePhotoUrl = receivingPhotoUrl(photos[photoIndex] || photos[0]);
  const blockers = item.requiredToShoot.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  const [productQuery, setProductQuery] = useState(product.identifier || record.skuId || record.productName || '');
  const [productMatches, setProductMatches] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [localFeedback, setLocalFeedback] = useState('');
  const [productDraft, setProductDraft] = useState(() => productInformationFields(product, record));
  const [intakeDraft, setIntakeDraft] = useState(() => ({
    deliverables: deliverablesForRecord(record),
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
          setLocalFeedback('A UPC or product ID is needed before a Product can be created.');
          return;
        }
        const created = await api.createItem({
          ...productDraft,
          clientId: record.clientIds?.[0],
          codeType: product.codeType || record.codeType,
          primaryMatchKeyLabel: product.primaryMatchKeyLabel || product.identifierLabel || DOMAIN_TERMS.primaryMatchKey,
        });
        await api.matchMerchandiseReviewEntry(item.merchandiseId, created.id);
        setLocalFeedback('Product created and linked.');
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
    const cleanValue = normalizeDeliverableList(value);
    const nextDraft = { ...intakeDraft, [field]: cleanValue };
    setIntakeDraft(nextDraft);
    setIntakeSaving(field);
    setLocalFeedback('');
    if (field === 'deliverables') setDeliverablesError('');
    try {
      const payload = { deliverables: cleanValue };
      const updated = await api.updateMerchandiseIntakeDecisions(item.merchandiseId, payload);
      const updatedDeliverables = deliverablesForRecord(updated);
      setIntakeDraft({
        deliverables: updatedDeliverables,
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
      return nextDraft;
    });
  }

  const deliverablesDirty = !deliverableListsEqual(intakeDraft.deliverables, lastSavedDeliverables);

  return (
    <div className="planning-workspace-backdrop" onClick={onClose} role="presentation">
      <aside className="planning-workspace-drawer waiting-info-drawer" role="dialog" aria-modal="true" aria-label="Waiting for Information workspace" onClick={event => event.stopPropagation()}>
        <header className="planning-workspace-header">
          <div>
            <span>{item.deliverableRoute || item.planningCard.planningName}</span>
            <h2>{item.title}</h2>
            <p>{[item.client, item.planningCard.currentQueueName].filter(Boolean).join(' • ')}</p>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close Planning workspace">
            <Icon.Close />
          </button>
        </header>

        <div className="planning-workspace-summary">
          <PlanningFact label="Deliverables" value={item.deliverableRoute || item.planningCard.planningName} />
          <PlanningFact label="Merchandise" value={record.productName || item.title} />
          <PlanningFact label="Client" value={item.client} />
          <PlanningFact label="Queue" value={item.planningCard.currentQueueName} />
          <PlanningFact label="Current Required To Shoot" value={blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}` : 'Ready'} />
          <PlanningFact label="Linked Product" value={product.id ? (product.product || product.name || product.identifier) : 'Not linked'} />
        </div>

        <div className="planning-workspace-scroll">
          <section className="planning-workspace-section waiting-info-missing">
            <h3>Missing Information</h3>
            {blockers.length ? (
              <ul className="planning-requirement-list">
                {blockers.map(requirement => (
                  <li key={requirement.key} className={`is-${requirement.tone}`}>
                    <strong>{requirementBlockerLabel(requirement)}</strong>
                    <span>{requirementResolution(requirement)} {requirement.detail ? `Blocking reason: ${requirement.detail}.` : ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="planning-empty-inline">No unresolved requirements. This merchandise can move when the PM confirms the next queue.</div>
            )}
          </section>

          <section className="planning-workspace-section">
            <h3>Product</h3>
            <div className="waiting-product-search">
              <label>
                Search Product
                <input value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="Search by product, brand, or match key" />
              </label>
              {searchingProducts && <span>Searching...</span>}
              {productMatches.length > 0 && (
                <div className="waiting-product-results">
                  <strong>Link Product</strong>
                  {productMatches.slice(0, 5).map(match => (
                    <button type="button" onClick={() => linkProduct(match.id)} disabled={productSaving} key={match.id}>
                      <strong>{match.product || match.name || 'Unnamed Product'}</strong>
                      <span>{[match.primaryMatchKey || match.identifier, match.brand].filter(Boolean).join(' • ') || 'No primary match key'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="waiting-product-fields">
              <label>Product Name<input value={productDraft.name} onChange={event => updateProductDraft('name', event.target.value)} /></label>
              <label>Product/File Name<input value={productDraft.product} onChange={event => updateProductDraft('product', event.target.value)} /></label>
              <label>Primary Match Key<input value={productDraft.productId} onChange={event => updateProductDraft('productId', event.target.value)} /></label>
              <label>Brand<input value={productDraft.brand} onChange={event => updateProductDraft('brand', event.target.value)} /></label>
              <label>Description<textarea value={productDraft.description} onChange={event => updateProductDraft('description', event.target.value)} rows={2} /></label>
              <label>Product Job Number<input value={productDraft.itemJobNumber} onChange={event => updateProductDraft('itemJobNumber', event.target.value)} /></label>
            </div>
            <button type="button" className="btn btn-secondary" onClick={saveProductInformation} disabled={productSaving}>
              {product.id ? 'Save Product Information' : 'Create Product'}
            </button>
          </section>

          <section className="planning-workspace-section">
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
            <div className="planning-fact-grid">
              <PlanningFact label="Deliverables" value={item.deliverableRoute || item.planningCard.planningName} />
              <PlanningFact label="Queue" value={item.planningCard.currentQueueName} />
            </div>
            {photoProduction && (
              <PhotoProductionFieldsEditor
                item={item}
                production={photoProduction}
                onRefresh={onRefresh}
              />
            )}
          </section>

          <section className="planning-workspace-section">
            <h3>Artwork</h3>
            <div className="planning-fact-grid">
              <PlanningFact label="Artwork Required?" value={item.requiredToShoot.find(requirement => requirement.key === 'artwork')?.visible === false ? 'No' : 'Yes'} />
              <PlanningFact label="Artwork Available?" value={product.artworkReceived ? 'Yes' : 'No'} />
              <PlanningFact label="Artwork Status" value={item.requiredToShoot.find(requirement => requirement.key === 'artwork')?.detail || 'Pending'} />
            </div>
          </section>

          <section className="planning-workspace-section">
            <h3>Activation</h3>
            <div className="planning-fact-grid">
              <PlanningFact label="Job" value={product.itemJobNumber || product.pickupJobNumber} />
              <PlanningFact label="Activation" value={referenceDataValue(product, ['Activation', 'activation'])} />
              <PlanningFact label="Campaign" value={referenceDataValue(product, ['Campaign', 'campaign'])} />
              <PlanningFact label="Status" value={item.requiredToShoot.find(requirement => requirement.key === 'activation-information')?.detail || 'Pending'} />
            </div>
          </section>

          <section className="planning-workspace-section">
            <h3>Merchandise</h3>
            <div className="planning-fact-grid">
              <PlanningFact label="Storage" value={item.location} />
              <PlanningFact label="Condition" value={record.condition} />
              <PlanningFact label="Quantity" value={record.quantity || 1} />
              <PlanningFact label="Shipment" value={record.receipt?.name} />
              <PlanningFact label="Merchandise Notes" value={record.notes} />
              <PlanningFact label="Product Notes" value={product.notes} />
            </div>
          </section>

          <section className="planning-workspace-section">
        <RequiredToShootPanel item={item} />
          </section>

          {activePhotoUrl && (
            <section className="planning-workspace-section">
              <h3>Merchandise Photo</h3>
              <PlanningWorkspaceSection section={WORKSPACE_SECTIONS.photos} item={item} photos={photos} activePhotoUrl={activePhotoUrl} photoIndex={photoIndex} setPhotoIndex={setPhotoIndex} />
            </section>
          )}
        </div>

        <footer className="planning-transition-panel waiting-info-footer">
          <div>
              <strong>Valid Next Queue(s)</strong>
            {(feedback || localFeedback) && <span className={(feedback || localFeedback).startsWith('Cannot') ? 'is-error' : 'is-success'}>{localFeedback || feedback}</span>}
          </div>
          <div className="planning-transition-actions">
            <button type="button" className="btn btn-secondary" onClick={() => onSave(item)}>Save</button>
            <button type="button" className="btn btn-primary" onClick={() => onSaveContinue(item)} disabled={!nextItem}>Save & Continue</button>
            <ReleaseToProductionAction item={item} onRelease={onRelease} busy={releaseBusy} />
            {item.planningCard.validNextQueues.map(next => (
              <button type="button" className="btn btn-ghost" onClick={() => onMove(item, next.queue.id)} key={next.queue.id}>
                {next.queue.label}
              </button>
            ))}
            {item.planningCard.validNextQueues.length === 0 && <span>No valid next queues yet.</span>}
          </div>
          {item.planningCard.blockedNextQueues.length > 0 && (
            <details className="planning-blocked-transitions">
              <summary>Blocked stages</summary>
              {item.planningCard.blockedNextQueues.map(next => <p key={next.queue.id}>{next.message}</p>)}
            </details>
          )}
        </footer>
      </aside>
    </div>
  );
}

function PlanningWorkspaceDrawer({ item, onClose, onMove, onSave, onSaveContinue, onRelease, releaseBusy, onRefresh, feedback, override, photos, photoIndex, setPhotoIndex, nextItem, readonly = false }) {
  if (!item) return null;
  if (item.planningCard.currentQueue === QUEUE_IDS.waitingInformation) {
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
  const queue = item.planningCard.queue;
  const activePhotoUrl = receivingPhotoUrl(photos[photoIndex] || photos[0]);
  return (
    <div className="planning-workspace-backdrop" onClick={onClose} role="presentation">
      <aside className="planning-workspace-drawer" role="dialog" aria-modal="true" aria-label="Merchandise Planning workspace" onClick={event => event.stopPropagation()}>
        <header className="planning-workspace-header">
          <div>
            <span>{item.planningCard.planningName}</span>
            <h2>{item.title}</h2>
            <p>{item.planningCard.reason}</p>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close Planning workspace">
            <Icon.Close />
          </button>
        </header>

        <div className="planning-workspace-summary">
          <PlanningFact label="Queue" value={item.planningCard.currentQueueName} />
          <PlanningFact label="Owner" value={item.planningCard.currentOwner} />
          <PlanningFact label="Status" value={item.record.merchStatus || item.record.reviewState || 'Received'} />
          <PlanningFact label="Client" value={item.client} />
          <PlanningFact label="Shipment" value={item.record.receipt?.name} />
          <PlanningFact label="Storage" value={item.location} />
        </div>

        <section className="planning-queue-purpose">
          <strong>{queue.label}</strong>
          <span>{queue.description}</span>
        </section>

        <div className="planning-workspace-scroll">
          {(queue.workspaceSections || []).map(section => (
            <PlanningWorkspaceSection
              section={section}
              item={item}
              photos={photos}
              activePhotoUrl={activePhotoUrl}
              photoIndex={photoIndex}
              setPhotoIndex={setPhotoIndex}
              override={override}
              onRefresh={onRefresh}
              key={section}
            />
          ))}
        </div>

        {!readonly && (
          <footer className="planning-transition-panel">
            <div>
              <strong>Available moves</strong>
              {feedback && <span className={feedback.startsWith('Cannot') ? 'is-error' : 'is-success'}>{feedback}</span>}
            </div>
            <div className="planning-transition-actions">
              {item.planningCard.validNextQueues.length === 0 && <span>No valid next queues from the current state.</span>}
              <ReleaseToProductionAction item={item} onRelease={onRelease} busy={releaseBusy} />
              {item.planningCard.validNextQueues.map(next => (
                <button type="button" className="btn btn-primary" onClick={() => onMove(item, next.queue.id)} key={next.queue.id}>
                  Move to {next.queue.label}
                </button>
              ))}
            </div>
            {item.planningCard.blockedNextQueues.length > 0 && (
              <details className="planning-blocked-transitions">
                <summary>Blocked queues</summary>
                {item.planningCard.blockedNextQueues.map(next => <p key={next.queue.id}>{next.message}</p>)}
              </details>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

const INTAKE_DELIVERABLE_OPTIONS = ['Packaging', 'Ecomm', 'Thr3d'];
const ACTIVATION_DELIVERABLE_OPTIONS = ['Packaging', 'Ecomm'];
const DELIVERABLE_ROUTE_MAP = {
  Ecomm: 'ecomm-photo',
  Packaging: 'packaging-photo',
  Thr3d: 'thr3d',
};
const THR3D_SHIP_CONFIRMATION_MESSAGE = 'This item will be removed from the Walnut work queue and be shipped to Thr3d.';

function DeliverablesSelector({ values = [], onChange, disabled = false, options = INTAKE_DELIVERABLE_OPTIONS, exclusiveGs1 = true }) {
  const normalizedValues = normalizeDeliverableList(values);
  const selectedValues = new Set(normalizedValues);

  function toggle(option) {
    if (disabled) return;
    let nextValues = selectedValues.has(option)
      ? normalizedValues.filter(value => value !== option)
      : [...normalizedValues, option];
    if (exclusiveGs1) {
      nextValues = enforceExclusiveGs1Deliverables(nextValues, option);
    }
    onChange(nextValues);
  }

  return (
    <fieldset className="intake-deliverables-field">
      <legend className="sr-only">Deliverables</legend>
      <div className="intake-deliverable-options">
        {options.map(option => {
          const selected = selectedValues.has(option);
          return (
            <label
              className={`intake-deliverable-option ${deliverableToneClass(option)} ${selected ? 'is-selected' : ''}`}
              key={option}
            >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggle(option)}
            disabled={disabled}
              data-testid={`deliverable-${DELIVERABLE_ROUTE_MAP[option] || option.toLowerCase().replaceAll(' ', '-')}`}
            />
              <span className="intake-deliverable-check" aria-hidden="true" />
              <span className="intake-deliverable-label">{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// A Product assembled here is not lesser than one a Structure Form described. It
// is the same record, established from what is known — which is often all that
// will ever arrive. The fields asked for are the client's own required fields, so
// nothing about what a shoot needs is stated twice.
const PRODUCT_CREATION_DRAFT_KEYS = {
  productName: 'name',
  upc: 'productId',
  cvid: 'cvid',
  jobNumber: 'wkftJobNumber',
  brandPrefix: 'brandPrefix',
  fileNameDescription: 'fileNameDescription',
  productDescription: 'productDescription',
  productType: 'productType',
  pathToArt: 'pathToArt',
  ecommPhotoNotes: 'ecommPhotoNotes',
};

function productCreationFields(clientRecord, item) {
  const type = item?.workstreamType
    || normalizeDeliverableList(item?.deliverables).find(value => value === 'Packaging' || value === 'Ecomm')
    || '';
  const configured = clientRecord?.photoProductionRequirements?.workstreams?.[type]?.requiredProductFields;
  // Name and identifier regardless: without them there is nothing to match on later.
  const keys = ['productName', 'upc', ...(Array.isArray(configured) ? configured : [])];
  const seen = new Set();
  return keys.filter(key => {
    if (seen.has(key) || !PRODUCT_CREATION_DRAFT_KEYS[key]) return false;
    seen.add(key);
    return true;
  });
}

function NewReviewProductIdentification({ item, product, onRefresh, deferNoClearMatch = false, noClearMatchDraft, onNoClearMatchDraftChange, clientRecord = null }) {
  const record = item.record || {};
  const [matchNameQuery, setMatchNameQuery] = useState(record.productName || record.description || '');
  const [matchIdentifierQuery, setMatchIdentifierQuery] = useState(record.skuId || record.observedIdentifier || '');
  const [matches, setMatches] = useState([]);
  const [draft, setDraft] = useState(() => productInformationFields(product, record));
  const [busy, setBusy] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [noClearMatch, setNoClearMatch] = useState(false);
  const [editingLinkedProductIdentity, setEditingLinkedProductIdentity] = useState(false);
  // Clients with Source Check rules match against the read-only client sheet rather
  // than local Products, so Planning suggests the same rows Shipments does instead of
  // only finding Products that happen to have been activated already.
  const sourceBackedMatching = Boolean(sourceCheckRulesForClient(clientRecord));
  const [sourceMatches, setSourceMatches] = useState([]);
  const [sourceMatchLoading, setSourceMatchLoading] = useState(false);
  const [sourceActivatingRow, setSourceActivatingRow] = useState(null);

  useEffect(() => {
    setMatchNameQuery(record.productName || record.description || '');
    setMatchIdentifierQuery(record.skuId || record.observedIdentifier || '');
    setDraft(productInformationFields(product, record));
    setMatches([]);
    setNotice('');
    setNoClearMatch(Boolean(record.noClearMatch || record.reviewState === 'Waiting for Product Data'));
    setEditingLinkedProductIdentity(false);
  }, [item.id, product.id, record.productName, record.description, record.skuId, record.observedIdentifier, record.noClearMatch, record.reviewState]);

  useEffect(() => {
    let active = true;
    const identifierQuery = String(matchIdentifierQuery || '').trim();
    const nameQuery = String(matchNameQuery || '').trim();
    const identifierReady = compactMatchValue(identifierQuery).length >= 3;
    const nameReady = compactMatchValue(nameQuery).length >= 3;
    if (!identifierReady && !nameReady) {
      setMatches([]);
      setMatchLoading(false);
      return () => { active = false; };
    }
    setMatchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        let records = [];
        if (identifierReady && nameReady) {
          const [identifierData, nameData] = await Promise.all([
            api.searchMerchandiseReviewProducts({ q: identifierQuery, clientId: record.clientIds?.[0], includeItemId: record.itemIds?.[0], limit: 50 }),
            api.searchMerchandiseReviewProducts({ q: nameQuery, clientId: record.clientIds?.[0], includeItemId: record.itemIds?.[0], limit: 50 }),
          ]);
          records = combineIdentifierAndNameMatches(identifierData.records ?? [], nameData.records ?? [], identifierQuery);
        } else if (identifierReady) {
          const data = await api.searchMerchandiseReviewProducts({ q: identifierQuery, clientId: record.clientIds?.[0], includeItemId: record.itemIds?.[0] });
          records = (data.records ?? []).map(match => ({ ...match, matchBasis: itemIdentifierBasis(match) }));
        }
        if (records.length === 0 && nameReady && !identifierReady) {
          const data = await api.searchMerchandiseReviewProducts({ q: nameQuery, clientId: record.clientIds?.[0], includeItemId: record.itemIds?.[0] });
          records = (data.records ?? []).map(match => ({ ...match, matchBasis: 'name' }));
        }
        if (active) setMatches(records);
      } catch (error) {
        if (active) {
          setMatches([]);
          setNotice(error.message || 'Could not search Products.');
        }
      } finally {
        if (active) setMatchLoading(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(t); };
  }, [matchIdentifierQuery, matchNameQuery, item.id, record.clientIds, record.itemIds, sourceBackedMatching]);

  useEffect(() => {
    let active = true;
    const nameQuery = String(matchNameQuery || '').trim();
    const identifierQuery = String(matchIdentifierQuery || '').trim();
    const ready = compactMatchValue(identifierQuery).length >= 3 || compactMatchValue(nameQuery).length >= 3;
    if (!sourceBackedMatching || !ready) {
      setSourceMatches([]);
      setSourceMatchLoading(false);
      return () => { active = false; };
    }
    setSourceMatchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const data = await api.topcoSourceSuggestions({
          clientId: record.clientIds?.[0],
          productName: nameQuery,
          upc: identifierQuery,
          limit: 5,
        });
        if (active) setSourceMatches(data.records ?? []);
      } catch {
        if (active) setSourceMatches([]);
      } finally {
        if (active) setSourceMatchLoading(false);
      }
    }, 260);
    return () => { active = false; window.clearTimeout(t); };
  }, [sourceBackedMatching, matchNameQuery, matchIdentifierQuery, record.clientIds, item.id]);

  // Selecting a source row creates or updates the local Product from that row and
  // links it, the same idempotent activation Shipments uses.
  async function activateSourceRow(sourceRow) {
    const sourceRowNumber = sourceRow?.sourceRowNumber;
    if (!sourceRowNumber) return;
    setSourceActivatingRow(sourceRowNumber);
    setNotice('');
    try {
      await api.activateMerchandiseSourceRow(item.merchandiseId, { sourceRowNumber });
      onNoClearMatchDraftChange?.(false);
      setEditingLinkedProductIdentity(false);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not match this source row.');
    } finally {
      setSourceActivatingRow(null);
    }
  }

  function setField(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  async function linkProduct(productId) {
    setBusy(true);
    setNotice('');
    try {
      await api.matchMerchandiseReviewEntry(item.merchandiseId, productId);
      onNoClearMatchDraftChange?.(false);
      setEditingLinkedProductIdentity(false);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not link Product.');
    } finally {
      setBusy(false);
    }
  }

  async function markNoClearMatch() {
    if (deferNoClearMatch) {
      onNoClearMatchDraftChange?.(true);
      setNoClearMatch(true);
      setNotice('');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await api.markMerchandiseWaitingForProductData(item.merchandiseId, { note: 'No clear Product match from Planning.' });
      setNoClearMatch(true);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not mark this as no clear match.');
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProduct() {
    setBusy(true);
    setNotice('');
    try {
      await api.removeMerchandiseReviewMatch(item.merchandiseId);
      setEditingLinkedProductIdentity(false);
      setNoClearMatch(false);
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not unlink the Product.');
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
          // Without an identifier there is nothing to match on later, and nothing
          // stopping the next arrival from creating the same Product again.
          setNotice('A UPC or product ID is needed before a Product can be created.');
          return;
        }
        const created = await api.createItem({
          ...draft,
          clientId: record.clientIds?.[0],
          codeType: product.codeType || record.codeType,
          primaryMatchKeyLabel: product.primaryMatchKeyLabel || product.identifierLabel || DOMAIN_TERMS.primaryMatchKey,
        });
        await api.matchMerchandiseReviewEntry(item.merchandiseId, created.id);
        setNotice('Product created and linked.');
      }
      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || 'Could not save Product information.');
    } finally {
      setBusy(false);
    }
  }


  const linked = Boolean(product.id);
  const effectiveNoClearMatch = deferNoClearMatch ? Boolean(noClearMatchDraft) : noClearMatch;
  const showLinkedProductCard = linked;
  const showProductIdentityFields = (!showLinkedProductCard || editingLinkedProductIdentity) && !createOpen;
  const matchIdentifierReady = compactMatchValue(matchIdentifierQuery).length >= 3;
  const matchNameReady = compactMatchValue(matchNameQuery).length >= 3;
  const showMatchSuggestions = (!showLinkedProductCard || editingLinkedProductIdentity) && (matchIdentifierReady || matchNameReady);
  const nameOnlyMatchSuggestions = matches.length > 0 && matches.every(match => match.matchBasis === 'name');
  const combinedPartialMatchSuggestions = matches.length > 0 && matches.every(match => String(match.matchBasis || '').startsWith('both-'));
  const combinedMatchSearch = matchIdentifierReady && matchNameReady;
  // One list. A source row and a Product are the same thing to whoever is looking;
  // the only difference is whether picking it creates a Product, which is this
  // component's problem rather than the reader's.
  const matchedUpcKeys = new Set(
    matches.map(match => String(match.primaryMatchKey || match.gtinUpc || '').replace(/\D+/g, '')).filter(Boolean),
  );
  const combinedMatches = [
    ...matches,
    ...(sourceBackedMatching ? sourceMatches : [])
      // A source row whose UPC is already a Product would otherwise appear twice.
      .filter(row => {
        const upc = String(row.sourceData?.UPC || '').replace(/\D+/g, '');
        return !upc || !matchedUpcKeys.has(upc);
      })
      .map(row => ({ ...sourceRowMatchItem(row), __sourceRow: row })),
  ];
  const matchSuggestionsTitle = (matchLoading || sourceMatchLoading)
    ? 'Searching matches…'
    : combinedMatches.length
      ? (nameOnlyMatchSuggestions || combinedPartialMatchSuggestions) ? 'Possible matches' : 'Suggested matches'
      : combinedMatchSearch ? 'No match on both fields' : 'No matches found';
  // Switched off on 2026-08-13 while Planning was made product-led, which removed
  // the only way to establish a Product when none exists. Restored: creation goes
  // through the merge now, so a known identifier fills gaps instead of duplicating.
  const productCreationKeys = productCreationFields(clientRecord, item);
  const showProductCreation = !linked;

  return (
    <div className="new-review-product-id">
      {showProductIdentityFields && (
        <div className="new-review-product-search-fields">
          {/* Search inputs, not a restatement of the package. They start from what was
              recorded at receiving but are edited freely to find a Product, so they are
              labelled for what they do. The recorded values live in step 1 and never
              change here. */}

          <div className="recv-field recv-field-product">
            <label>Search by name</label>
            <input value={matchNameQuery} onChange={event => { setMatchNameQuery(event.target.value); if (linked) setEditingLinkedProductIdentity(true); }} placeholder="Type part of the product name" autoComplete="off" />
          </div>
          <div className="recv-field">
            <label>Search by UPC / ID</label>
            <input value={matchIdentifierQuery} onChange={event => { setMatchIdentifierQuery(event.target.value); if (linked) setEditingLinkedProductIdentity(true); }} placeholder="Scan or type a UPC / ID" autoComplete="off" />
          </div>
        </div>
      )}
      {showLinkedProductCard ? (
        <>
          <ProductMatchCard
            item={product}
            changeLabel="Unlink"
            onChange={unlinkProduct}
            changeDisabled={busy}
            actionDisabled={busy}
          />
          {showMatchSuggestions && (
              <ReceivingMatchSuggestions
                title={matchSuggestionsTitle}
                matches={matches}
              identifierQuery={matchIdentifierQuery}
              nameOnlyMatchSuggestions={nameOnlyMatchSuggestions}
              combinedPartialMatchSuggestions={combinedPartialMatchSuggestions}
              combinedMatchSearch={combinedMatchSearch}
              matchLoading={matchLoading}
                onSelect={match => linkProduct(match.id)}
              disabled={busy}
            />
          )}
        </>
      ) : effectiveNoClearMatch ? (
        <ProductMatchCard
          status="unmatched"
          title="No Clear Match"
          meta={deferNoClearMatch ? 'Will continue unmatched when accepted.' : 'Waiting for Product data.'}
          onChange={() => {
            setNoClearMatch(false);
            onNoClearMatchDraftChange?.(false);
          }}
          changeDisabled={busy}
        />
      ) : (
        <>
          {!createOpen && showMatchSuggestions && (combinedMatches.length > 0 || matchLoading || sourceMatchLoading) && (
            <ReceivingMatchSuggestions
              title={matchSuggestionsTitle}
              matches={combinedMatches}
              identifierQuery={matchIdentifierQuery}
              nameOnlyMatchSuggestions={nameOnlyMatchSuggestions}
              combinedPartialMatchSuggestions={combinedPartialMatchSuggestions}
              combinedMatchSearch={combinedMatchSearch}
              matchLoading={matchLoading || sourceMatchLoading}
              showNoClearMatchAction={false}
              onSelect={match => {
                if (match.__sourceRow) {
                  // Not a Product yet — picking it is what creates one.
                  activateSourceRow(match.__sourceRow);
                  return;
                }
                linkProduct(match.id);
              }}
              disabled={busy}
            />
          )}
          {showProductCreation && (
            <>
              {!createOpen ? (
                <div className="merch-create-alt">
                  <button type="button" className="merch-link-btn" onClick={() => setCreateOpen(true)}>
                    No Product exists yet? Establish one
                  </button>
                </div>
              ) : (
                <section className="product-establish">
                  <header>
                    <span>Add what you know. The rest can be filled in later.</span>
                    <button type="button" className="merch-link-btn" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </button>
                  </header>
                  <div className="waiting-product-fields">
                    {productCreationKeys.map(key => (
                      <label key={key}>
                        {PHOTO_PRODUCTION_FIELD_LABELS[key] || key}
                        <input
                          value={draft[PRODUCT_CREATION_DRAFT_KEYS[key]] || ''}
                          onChange={event => setField(PRODUCT_CREATION_DRAFT_KEYS[key], event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <footer>
                    <button type="button" className="btn btn-primary" onClick={saveProduct} disabled={busy}>
                      Create Product and link it
                    </button>
                  </footer>
                </section>
              )}
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
    { label: DOMAIN_TERMS.primaryMatchKey, merch: record.skuId || record.observedIdentifier || '', prod: product.primaryMatchKey || product.identifier || product.productId || product.gtinUpc || '', compare: alnum },
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

function CommentComposer({ onSubmit, saving }) {
  const [draft, setDraft] = useState('');
  async function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;
    const saved = await onSubmit?.(text);
    if (saved !== false) setDraft('');
  }
  return (
    <form className="conversation-composer" onSubmit={submit}>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a comment" disabled={saving} />
      {/* Deliberately not btn-primary: posting a comment is a side conversation, not
          the modal's commit action, and matching Accept made the two look equivalent. */}
      <button type="submit" className="btn btn-comment btn-sm" disabled={!draft.trim() || saving}>{saving ? 'Posting...' : 'Comment'}</button>
    </form>
  );
}

function commentAuthorName(comment = {}) {
  return comment.author?.displayName || comment.author?.name || comment.authorName || 'Unknown user';
}

function commentAuthorInitials(comment = {}) {
  if (comment.author?.avatar) return comment.author.avatar;
  if (comment.author?.initials) return comment.author.initials;
  const parts = String(commentAuthorName(comment)).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function ConversationPanel({ comments = [], onAddComment, saving, error, readThrough = '', embedded = false }) {
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [comments.length]);
  return (
    <section className="review-step is-open conversation-panel">
      {!embedded && (
        <header className="review-step-head">
          <span className="review-step-num review-step-num-plain">·</span>
          <h3>Comments</h3>
          <CommentCountChip count={comments.length} className="is-support" />
        </header>
      )}
      <div className="conversation-list" ref={listRef}>
        {comments.map(comment => (
          <article
            className={`conversation-comment ${readThrough && comment.createdAt > readThrough ? 'is-new' : ''}`.trim()}
            key={comment.id}
          >
                <span className="conversation-avatar" aria-hidden="true">{commentAuthorInitials(comment)}</span>
                <div className="conversation-bubble">
                  <header>
                    <strong className="conversation-author-name">{commentAuthorName(comment)}</strong>
                    <span className="conversation-meta-line">
                      <time>{formatInventoryDate(comment.createdAt)}</time>
                      {readThrough && comment.createdAt > readThrough && (
                        <span className="conversation-new-flag">New</span>
                      )}
                    </span>
                  </header>
                  <p>{comment.body}</p>
                </div>
          </article>
        ))}
      </div>
      {error && <p className="conversation-error">{error}</p>}
      <CommentComposer onSubmit={onAddComment} saving={saving} />
    </section>
  );
}

function HistoryPanel({ events = [], embedded = false }) {
  const visibleEvents = events.filter(event => String(event.action || event.body || '').trim().toLowerCase() !== 'added a comment.');
  return (
    <section className="review-step is-open activity-panel">
      {!embedded && <header className="review-step-head"><span className="review-step-num review-step-num-plain">·</span><h3>History</h3></header>}
      <div className="activity-list">
        {visibleEvents.length === 0 && <p className="conversation-empty">No history yet.</p>}
        {visibleEvents.map(event => (
          <div className="activity-event" key={event.id}>
            <span>{event.actor || 'System'}</span>
            <strong>{event.action || event.body}</strong>
            {event.from && event.to && (
              <em className="activity-event-change">{event.from} &rarr; {event.to}</em>
            )}
            <time>{formatInventoryDate(event.createdAt)}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewReviewSupportPanel({ comments = [], onAddComment, commentSaving, commentError, activity = [], readThrough = '' }) {
  const [tab, setTab] = useState('comments');
  const historyCount = activity.filter(
    event => String(event.action || event.body || '').trim().toLowerCase() !== 'added a comment.',
  ).length;
  // Surfaced on the tab so unread conversation is still visible while reading History.
  const unread = readThrough ? comments.filter(comment => comment.createdAt > readThrough).length : 0;
  const tabs = [
    { id: 'comments', label: 'Comments', count: comments.length, dot: unread > 0 },
    { id: 'history', label: 'History', count: historyCount, dot: false },
  ];
  return (
    <aside className="new-review-support-panel" aria-label="Comments and history">
      <div className="support-tabs" role="tablist">
        {tabs.map(entry => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={tab === entry.id ? 'is-active' : ''}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            {entry.count > 0 && <span className="support-tab-count">{entry.count}</span>}
            {entry.dot && <span className="support-tab-dot" aria-label="Unread comments" />}
          </button>
        ))}
      </div>
      <div className="new-review-support-body">
        {tab === 'comments' ? (
          <ConversationPanel
            comments={comments}
            onAddComment={onAddComment}
            saving={commentSaving}
            error={commentError}
            readThrough={readThrough}
            embedded
          />
        ) : (
          <HistoryPanel events={activity} embedded />
        )}
      </div>
    </aside>
  );
}

// Collapsing step: when its work is done it folds to a one-line summary, so the
// pane always keeps the open/actionable steps loud and the finished ones quiet.
// A merch overview rather than a fixed form: condition and storage are often blank,
// and rendering them as "Not recorded" fills the panel with absence. Facts are built
// from what exists and empty ones drop out, so the block is always substantive and
// shrinks instead of apologising. Shipment context is included because how and when
// something arrived is part of deciding whether to accept it.
const CARRIER_TRACKING_URLS = [
  { match: /usps/i, url: t => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}` },
  { match: /ups/i, url: t => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}` },
  { match: /fedex/i, url: t => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}` },
  { match: /dhl/i, url: t => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(t)}` },
];

function carrierTrackingUrl(carrier, tracking) {
  if (!tracking) return '';
  const entry = CARRIER_TRACKING_URLS.find(candidate => candidate.match.test(carrier || ''));
  return entry ? entry.url(tracking) : '';
}

// One uniform label/value list. Physical facts and observed identity were previously
// rendered in two different shapes, which made the spacing read as arbitrary. Rows
// with no value are omitted rather than showing a placeholder.
function MerchFacts({ item }) {
  const record = item?.record || {};
  const receipt = record.receipt || {};
  const carrier = String(receipt.carrier || '').trim();
  const tracking = String(receipt.tracking || '').trim();
  const condition = String(record.condition || '').trim();
  const shipmentText = [carrier, tracking].filter(Boolean).join(' ');
  const trackingUrl = carrierTrackingUrl(carrier, tracking);
  const rows = [
    { key: 'name', label: 'Name on package', value: String(record.productName || '').trim() },
    { key: 'upc', label: 'UPC / ID on package', value: String(record.skuId || record.observedIdentifier || '').trim() },
    {
      key: 'shipment',
      label: 'Shipment',
      value: shipmentText,
      href: trackingUrl,
    },
    { key: 'qty', label: 'Quantity Received', value: record.quantity || item?.quantity || '' },
    { key: 'condition', label: 'Condition', value: condition, tone: condition && condition !== 'Good' ? 'attention' : '' },
    { key: 'storage', label: 'Storage', value: item?.location || '' },
    { key: 'description', label: 'Description', value: String(record.description || '').trim() },
    { key: 'notes', label: 'Notes', value: String(record.notes || '').trim() },
  ].filter(row => row.value !== '' && row.value !== null && row.value !== undefined);
  return (
    <dl className="merch-facts">
      {rows.map(row => (
        <div key={row.key}>
          <dt>{row.label}</dt>
          <dd className={row.tone ? `is-${row.tone}` : ''}>
            {row.href ? (
              <a href={row.href} target="_blank" rel="noreferrer noopener">{row.value}</a>
            ) : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ReviewStep({ n, title, done, flagged, statusText, statusTone, summary, children, collapseWhenDone = true }) {
  const [manualOpen, setManualOpen] = useState(false);
  useEffect(() => { if (!done) setManualOpen(false); }, [done]);
  const collapsed = collapseWhenDone && done && !flagged && !manualOpen;
  const unnumbered = n === null || n === undefined;
  const mark = flagged ? '⚑' : done ? '✓' : (unnumbered ? '·' : n);
  return (
    <section className={`review-step ${collapsed ? 'is-collapsed' : 'is-open'} ${done ? 'is-done' : ''} ${flagged ? 'is-flagged' : ''}`}>
      <header
        className="review-step-head"
        onClick={collapsed ? () => setManualOpen(true) : undefined}
        role={collapsed ? 'button' : undefined}
        tabIndex={collapsed ? 0 : undefined}
        onKeyDown={collapsed ? (event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setManualOpen(true); } }) : undefined}
      >
        <span className={`review-step-num ${unnumbered && !done && !flagged ? 'review-step-num-plain' : ''}`.trim()}>{mark}</span>
        <h3>{title}</h3>
        {collapsed
          ? <span className="review-step-edit">Edit</span>
          : (statusText ? <span className={`merch-verify-status ${statusTone}`}>{statusText}</span> : null)}
      </header>
      {collapsed ? <div className="review-step-summary">{summary}</div> : <div className="review-step-body">{children}</div>}
    </section>
  );
}

function ImageLightbox({ photos, index, setIndex, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const url = receivingPhotoUrl(photos[index]);
  const sourceLabel = photoSourceLabel(photos[index]);
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
        <span className="nr-lightbox-count">{index + 1} / {photos.length}{sourceLabel ? ` · ${sourceLabel}` : ''}</span>
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
                {photoSourceLabel(photo) && <span>{photoSourceLabel(photo)}</span>}
              </button>
            ) : null;
          })}
        </div>
      )}
    </div>,
    document.body
  );
}

function NewReviewModal({ item, decision, onDecisionChange, onFinish, onReadyForPhoto, onAddDeliverable, onRemove, workstreamPhotoCardCount = 1, workstreamTypes = [], onClose, previousItem, nextItem, onSelectItem, onRefresh, photos, photoIndex, setPhotoIndex, comments, commentSaving, commentError, activity, onAddComment, onMarkCommentsRead, commentsReadThrough = '', clientRecord = null }) {
  const [readThroughSnapshot, setReadThroughSnapshot] = useState('');
  const isWorkstreamCard = item.subjectType === 'workstream-card';
  const isNewQueue = item.columnId === QUEUE_IDS.newReview;
  const isMerchAcceptanceReview = !isWorkstreamCard && isNewQueue;
  const [zoom, setZoom] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [intakeDraft, setIntakeDraft] = useState(() => ({
    deliverables: isMerchAcceptanceReview ? [] : initialReviewDeliverables(item.record),
    allocation: { thr3d: defaultThr3dAllocation(item.record?.quantity) },
  }));
  const [intakeFeedback, setIntakeFeedback] = useState('');
  const [finishState, setFinishState] = useState({ status: 'idle', message: '' });
  const [deliverableState, setDeliverableState] = useState({ status: 'idle', message: '' });
  const [photoDraftValues, setPhotoDraftValues] = useState({});
  const [issueDraftOpen, setIssueDraftOpen] = useState(false);
  const [issueType, setIssueType] = useState('Wrong Merch');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueState, setIssueState] = useState({ status: 'idle', message: '' });
  const [draftNoClearMatch, setDraftNoClearMatch] = useState(() => Boolean(item.record?.noClearMatch || item.record?.reviewState === 'Waiting for Product Data'));
  const product = item.record?.linkedItem || {};
  const committedDeliverables = deliverablesForRecord(item.record);
  const productRequestTypeSuggestion = suggestedDeliverablesForRecord(item.record);
  const showProductRequestTypeSuggestion = Boolean(product.requestType && productRequestTypeSuggestion.length && !committedDeliverables.length);
  const initialDeliverablesKey = initialReviewDeliverables(item.record).join('|');
  const activePhoto = photos[photoIndex] || photos[0];
  const activePhotoUrl = receivingPhotoUrl(activePhoto);
  const wizardState = wizardStateForItem(item, intakeDraft.deliverables);
  const finishBusy = finishState.status === 'loading';
  const totalQuantity = Math.max(1, Number.parseInt(item.record?.quantity, 10) || 1);
  const splitDeliverablesSelected = wizardState.deliverables.includes('Packaging') && wizardState.deliverables.includes('Thr3d');
  const splitNeedsMultipleUnits = splitDeliverablesSelected && totalQuantity <= 1;
  const showQuantityAllocation = splitDeliverablesSelected && totalQuantity > 1;
  const assignmentPreview = workstreamAssignmentsForDeliverables(wizardState.deliverables, totalQuantity, intakeDraft.allocation);
  const currentWorkstreamType = item.workstreamType || item.record?.workstreamType || item.deliverableRoute || '';
  const selectedPhotoProduction = isWorkstreamCard
    ? Object.fromEntries(
        wizardState.deliverables
          .filter(type => type === 'Packaging' || type === 'Ecomm')
          .map(type => {
            const status = type === currentWorkstreamType ? photoProductionStatusForItem(item) : fallbackPhotoProductionStatus(type, item);
            return [type, status];
          })
          .filter(([, status]) => status)
      )
    : Object.fromEntries(
        wizardState.deliverables
          .filter(type => type === 'Packaging' || type === 'Ecomm')
          .map(type => {
            const status = item.record?.photoProduction?.[type];
            const hasChecks = (status?.productData?.checks || []).length > 0
              || (status?.creativeForce?.checks || []).length > 0;
            return [type, hasChecks ? status : fallbackPhotoProductionStatus(type, item)];
          })
          .filter(([, status]) => status)
      );
  const photoProductionChecksForSelection = photoProductionChecks(selectedPhotoProduction, item).map(check => (
    {
      ...check,
      present: photoProductionValuePresent(
        check.key,
        Object.prototype.hasOwnProperty.call(photoDraftValues, check.key)
          ? photoDraftValues[check.key]
          : photoProductionProductValue(productDataSourceForPlanningItem(item), check.key),
      ),
    }
  ));
  const photoProductionReady = photoProductionChecksForSelection.every(check => check.present);
  const photoProductionMissingCount = photoProductionChecksForSelection.filter(check => !check.present).length;
  const packagingAllocation = assignmentPreview.workstreams.find(workstream => workstream.type === 'Packaging')?.quantity || 0;
  const thr3dAllocation = assignmentPreview.thr3d?.quantity || defaultThr3dAllocation(totalQuantity);
  const allocatedQuantity = splitDeliverablesSelected ? packagingAllocation + thr3dAllocation : totalQuantity;
  const selectedWorkstreamType = intakeDraft.deliverables.find(type => type === 'Packaging' || type === 'Ecomm') || '';
  const selectedPhotoTypes = intakeDraft.deliverables.filter(type => type === 'Packaging' || type === 'Ecomm');
  const alternateWorkstreamType = currentWorkstreamType === 'Packaging' ? 'Ecomm' : 'Packaging';
  const workstreamTypeChangeAllowed = !isWorkstreamCard || workstreamPhotoCardCount < 2;
  const workstreamAction = isWorkstreamCard && workstreamTypeChangeAllowed
    ? selectedPhotoTypes.includes(alternateWorkstreamType) && selectedPhotoTypes.includes(currentWorkstreamType)
      ? 'add'
      : selectedWorkstreamType && selectedWorkstreamType !== currentWorkstreamType
        ? 'switch'
        : ''
    : '';
  const workstreamActionType = workstreamAction ? (workstreamAction === 'add' ? alternateWorkstreamType : selectedWorkstreamType) : '';
  const workstreamTypeChanged = workstreamAction === 'switch';
  const existingPhotoTypes = workstreamTypes.filter(type => type === 'Packaging' || type === 'Ecomm');
  const addFromType = currentWorkstreamType || (existingPhotoTypes.length === 1 ? existingPhotoTypes[0] : '');
  const missingPhotoDeliverable = addFromType
    ? (addFromType === 'Packaging' ? 'Ecomm' : 'Packaging')
    : '';
  const canAddDeliverable = Boolean(
    missingPhotoDeliverable
      && existingPhotoTypes.length === 1
      && !existingPhotoTypes.includes(missingPhotoDeliverable)
      && (!isWorkstreamCard || workstreamPhotoCardCount < 2)
  );
  const canReadyForPhoto = Boolean(
    wizardState.deliverables.some(type => type === 'Packaging' || type === 'Ecomm')
      && photoProductionReady
      && !splitNeedsMultipleUnits
  );
  const stepFlagged = item.record?.reviewState === 'Issue' || item.record?.merchStatus === 'Issue' || Boolean(item.record?.blockingIssues?.length);
  const finishBlocked = isWorkstreamCard
    ? stepFlagged || !canReadyForPhoto
    : stepFlagged || splitNeedsMultipleUnits;

  useEffect(() => {
    if (isMerchAcceptanceReview) return;
    if (committedDeliverables.length) return;
    const suggested = initialReviewDeliverables(item.record);
    if (!suggested.length) return;
    setIntakeDraft(current => (
      normalizeDeliverableList(current.deliverables).length
        ? current
        : { ...current, deliverables: suggested }
    ));
  }, [item.id, initialDeliverablesKey, committedDeliverables.length, isMerchAcceptanceReview]);
  const finishDisabled = finishBusy || finishBlocked;
  // The button names the move it actually makes. When the item cannot advance yet
  // it is still a save — deliverables are chosen here, and dropping the action
  // would leave that selection with nowhere to go.
  const requirementBlockers = visibleRequirementBlockers(item.requiredToShoot || []);
  const blockersThisSaveCannotFix = requirementBlockers.filter(blocker => (
    blocker.key !== 'deliverables' && !PHOTO_PRODUCTION_EDITABLE_FIELDS[blocker.key]
  ));
  const readyToAdvance = wizardState.productIdentified
    && normalizeDeliverableList(wizardState.deliverables || []).some(type => type === 'Packaging' || type === 'Ecomm')
    && photoProductionReady
    && blockersThisSaveCannotFix.length === 0;
  const finishLabel = isWorkstreamCard
    ? 'Save Details'
    : isMerchAcceptanceReview
      ? 'Accept merchandise'
      : readyToAdvance ? 'Move to Awaiting Photo Release' : 'Save';
  const issueBusy = issueState.status === 'loading';
  const footerOutcomePreview = planningActionOutcomePreview({
    isWorkstreamCard,
    isMerchAcceptanceReview,
    stepFlagged,
    splitNeedsMultipleUnits,
    wizardState,
    photoProductionMissingCount,
    photoProductionReady,
    requirementBlockers: blockersThisSaveCannotFix,
  });
  const workstreamFooterMessage = isWorkstreamCard
    ? workstreamPhotoCardCount >= 2
      ? <><span>This merchandise already has Ecomm and Packaging workstreams.</span><br /><span>You cannot add or change one here; remove this card only to end this workstream.</span></>
      : footerOutcomePreview ? <span>{footerOutcomePreview}</span> : null
    : footerOutcomePreview ? <span>{footerOutcomePreview}</span> : null;

  useEffect(() => {
    setPhotoDraftValues({});
  }, [item.id, wizardState.deliverables.join('|')]);

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
      deliverables: isMerchAcceptanceReview ? [] : initialReviewDeliverables(item.record),
      allocation: { thr3d: defaultThr3dAllocation(item.record?.quantity) },
    });
    setIntakeFeedback('');
    setFinishState({ status: 'idle', message: '' });
    setIssueDraftOpen(false);
    setIssueType('Wrong Merch');
    setIssueDescription('');
    setIssueNotes('');
    setIssueState({ status: 'idle', message: '' });
    setDraftNoClearMatch(Boolean(item.record?.noClearMatch || item.record?.reviewState === 'Waiting for Product Data'));
    // Capture before marking read: opening the card stamps everything seen, so the
    // list needs the value from the moment of arrival to still show what is new.
    setReadThroughSnapshot(commentsReadThrough || '');
    onMarkCommentsRead?.(item.merchandiseId);
  }, [item.id, product.id, product.requestType, isMerchAcceptanceReview, item.record?.noClearMatch, item.record?.reviewState]);

  function stageDeliverables(value) {
    const cleanValue = normalizeDeliverableList(value);
    setIntakeDraft(draft => {
      const nextDraft = { ...draft, deliverables: cleanValue };
      return nextDraft;
    });
    setIntakeFeedback('');
  }

  function stageThr3dAllocation(value) {
    const maxSplitThr3d = totalQuantity > 1 ? totalQuantity - 1 : 1;
    const thr3d = clampQuantity(value, 1, maxSplitThr3d);
    setIntakeDraft(draft => ({
      ...draft,
      allocation: { ...(draft.allocation || {}), thr3d },
    }));
    setIntakeFeedback('');
  }

  async function finishCurrentVerification() {
    if (finishBusy) return;
    if (isWorkstreamCard) {
      setFinishState({ status: 'loading', message: 'Saving details...' });
      try {
        const result = await onReadyForPhoto?.(item);
        if (result?.ok === false) {
          setFinishState({ status: 'error', message: result.message || 'Could not move this card.' });
          return;
        }
        setFinishState({ status: 'success', message: result?.message || 'Details saved.' });
      } catch (error) {
        setFinishState({ status: 'error', message: error.message || 'Could not move this card.' });
      }
      return;
    }
    const latestState = wizardStateForItem(item, intakeDraft.deliverables);
    latestState.reviewOnly = latestState.productLinked && latestState.deliverables.length === 0;
    latestState.noClearMatch = Boolean(isMerchAcceptanceReview && draftNoClearMatch && !latestState.productLinked);
    latestState.assignment = workstreamAssignmentsForDeliverables(latestState.deliverables, totalQuantity, intakeDraft.allocation);
    latestState.readyToAdvance = readyToAdvance;
    latestState.photoDraft = photoDraftValues;
    const willShipToThr3d = latestState.thr3dOnly;
    if (willShipToThr3d && !window.confirm(THR3D_SHIP_CONFIRMATION_MESSAGE)) {
      setFinishState({ status: 'idle', message: 'Thr3d shipment cancelled.' });
      return;
    }
    setFinishState({ status: 'loading', message: readyToAdvance ? 'Moving...' : 'Saving...' });
    try {
      const result = await onFinish?.(item, latestState);
      if (result?.ok === false) {
        setFinishState({ status: 'error', message: result.message || 'Could not assign work. Try again.' });
        return;
      }
      setFinishState({ status: 'success', message: result?.message || 'Merch confirmed.' });
    } catch (error) {
      setFinishState({ status: 'error', message: error.message || 'Could not assign work. Try again.' });
    }
  }

  async function raiseIssue() {
    if (issueBusy) return;
    if (!issueDescription.trim()) {
      setIssueState({ status: 'error', message: 'Add a short issue description before raising it.' });
      setIssueDraftOpen(true);
      return;
    }
    setIssueState({ status: 'loading', message: 'Raising issue...' });
    try {
      await api.createMerchandiseReviewIssue(item.merchandiseId || item.id, {
        type: issueType,
        description: issueDescription.trim(),
        notes: issueNotes,
      });
      setIssueState({ status: 'success', message: 'Issue raised. This item stays out of release until resolved.' });
      await onRefresh?.();
    } catch (error) {
      setIssueState({ status: 'error', message: error.message || 'Could not raise issue.' });
    }
  }

  const identifyDone = isMerchAcceptanceReview ? false : wizardState.productLinked;
  const deliverablesDone = wizardState.deliverables.length > 0;
  const receivedDateLabel = formatInventoryDate(item.record?.dateReceived || item.record?.received);
  const shipmentRecord = item.record?.receipt || item.record?.shipment || {};
  const shipmentEditHref = shipmentRecord.id ? `/shipments?shipmentId=${encodeURIComponent(shipmentRecord.id)}` : '';
  const shipmentLabel = shipmentRecord.name || 'Shipments';
  const merchCheckStatusText = stepFlagged ? 'Issue' : wizardState.productLinked ? 'Matched' : 'Unmatched';
  const merchCheckStatusTone = stepFlagged ? 'flag' : wizardState.productLinked ? 'ok' : 'wait';

  return (
    <div className="new-review-modal-backdrop" role="presentation" onClick={() => onClose(item)}>
      <section className="new-review-modal" role="dialog" aria-modal="true" aria-label="New item intake review" onClick={event => event.stopPropagation()}>
        <header className="new-review-modal-header">
          <div className="new-review-modal-heading">
            <span className="nr-eyebrow">{item.client}</span>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={() => onClose(item)} aria-label="Close intake review">
            <Icon.Close />
          </button>
        </header>

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
                        {photoSourceLabel(photo) && (
                          <span className="new-review-thumb-label">
                            {photoSourceLabel(photo).replace(/\s*Photo$/i, '')}
                          </span>
                        )}
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
                  <div className="planning-empty-inline">No R2-backed photos available.</div>
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
            {isMerchAcceptanceReview && (
              <ReviewStep
                n={1}
                title="Check the merchandise"
                done={false}
                flagged={stepFlagged}
                statusText=""
                summary=""
                collapseWhenDone={false}
              >
                <MerchFacts item={item} />
              </ReviewStep>
            )}

            <ReviewStep
              n={isMerchAcceptanceReview ? 2 : 1}
              title={isMerchAcceptanceReview ? 'Check the product match' : 'Merch Check'}
              done={identifyDone}
              flagged={isMerchAcceptanceReview ? false : stepFlagged}
              statusText={merchCheckStatusText}
              statusTone={merchCheckStatusTone}
              summary={stepFlagged ? 'Issue keeps this item out of release.' : product.product || product.name || product.identifier || 'Confirm the received item can continue.'}
              collapseWhenDone={false}
            >
              <NewReviewProductIdentification
                item={item}
                product={product}
                clientRecord={clientRecord}
                onRefresh={onRefresh}
                deferNoClearMatch={isMerchAcceptanceReview}
                noClearMatchDraft={draftNoClearMatch}
                onNoClearMatchDraftChange={setDraftNoClearMatch}
              />
            </ReviewStep>

            {!isMerchAcceptanceReview && (
              <ReviewStep
                n={2}
                title="Deliverables"
                done={deliverablesDone}
                statusText={deliverablesDone ? '' : 'Choose at least one'}
                statusTone={deliverablesDone ? 'ok' : 'wait'}
                summary={wizardState.deliverables.join(', ') || '—'}
                collapseWhenDone={false}
              >
                <DeliverablesSelector
                  values={intakeDraft.deliverables}
                  onChange={stageDeliverables}
                  disabled={finishBusy || (isWorkstreamCard && !workstreamTypeChangeAllowed)}
                />
                {showProductRequestTypeSuggestion && (
                  <p className="deliverables-suggestion">
                    Suggested from Product Request Type: <strong>{product.requestType}</strong> → {productRequestTypeSuggestion.join(', ')}
                  </p>
                )}
                {showQuantityAllocation && (
                  <div className="quantity-allocation-panel">
                    <div className="quantity-allocation-head">
                      <strong>Split received quantity</strong>
                      <span>Qty received {totalQuantity}</span>
                    </div>
                    <div className="quantity-allocation-grid">
                      <label>
                        <span>THR3D ships</span>
                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, totalQuantity - 1)}
                          inputMode="numeric"
                          value={thr3dAllocation}
                          onChange={event => stageThr3dAllocation(event.target.value)}
                          disabled={finishBusy}
                        />
                      </label>
                      <label>
                        <span>Packaging keeps</span>
                        <input type="number" value={packagingAllocation} readOnly disabled />
                      </label>
                    </div>
                    <p className="quantity-allocation-note">
                      Assigned {allocatedQuantity} of {totalQuantity}. Packaging receives the remaining quantity.
                    </p>
                  </div>
                )}
                {splitNeedsMultipleUnits && (
                  <div className="quantity-split-warning" role="alert">
                    <strong>Received quantity cannot be split</strong>
                    <span>
                      Qty received is {totalQuantity}. Update Qty received in{' '}
                      {shipmentEditHref
                        ? <Link to={shipmentEditHref} onClick={() => onClose(item)}>{shipmentLabel}</Link>
                        : shipmentLabel}
                      , or choose one deliverable for this item.
                    </span>
                  </div>
                )}
                {wizardState.thr3dOnly && (
                  <div className="thr3d-ship-warning" role="alert">
                    <strong>Thr3d shipping path</strong>
                    <span>{THR3D_SHIP_CONFIRMATION_MESSAGE}</span>
                  </div>
                )}
                {intakeFeedback && <span className="new-review-inline-status">{intakeFeedback}</span>}
              </ReviewStep>
            )}

            {!isMerchAcceptanceReview && Object.keys(selectedPhotoProduction).length > 0 && (
              <ReviewStep
                n={3}
                title="Product data for photo"
                done={photoProductionReady}
                statusText={photoProductionReady ? '' : `${photoProductionMissingCount} missing`}
                statusTone={photoProductionReady ? 'ok' : 'wait'}
                summary={photoProductionReady ? 'All required Product data is present.' : `${photoProductionMissingCount} Product field${photoProductionMissingCount === 1 ? '' : 's'} still needed.`}
                collapseWhenDone={false}
              >
                <PhotoProductionFieldsEditor
                  item={item}
                  production={selectedPhotoProduction}
                  onDraftChange={draft => setPhotoDraftValues(current => ({ ...current, ...draft }))}
                />
              </ReviewStep>
            )}

          </aside>
          <NewReviewSupportPanel
            comments={comments}
            onAddComment={body => onAddComment?.(item.merchandiseId, body)}
            commentSaving={commentSaving}
            commentError={commentError}
            activity={activity}
            readThrough={readThroughSnapshot}
          />
        </div>

        <footer className="new-review-modal-footer">
          <div className="new-review-footer-left">
            <span className="new-review-received-date">Received {receivedDateLabel}</span>
            {isWorkstreamCard && onRemove && (
              <button type="button" className="btn btn-danger-outline" onClick={() => onRemove(item)} disabled={finishBusy}>
                Remove workstream
              </button>
            )}
            {canAddDeliverable && onAddDeliverable && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  setDeliverableState({ status: 'loading', message: '' });
                  const result = await onAddDeliverable(item, missingPhotoDeliverable);
                  setDeliverableState(result?.ok
                    ? { status: 'success', message: `${missingPhotoDeliverable} deliverable added.` }
                    : { status: 'error', message: result?.message || 'Could not add deliverable.' });
                }}
                disabled={finishBusy || deliverableState.status === 'loading' || deliverableState.status === 'success'}
                title={`Add ${missingPhotoDeliverable} without changing this card`}
              >
                {deliverableState.status === 'loading' ? 'Adding...' : deliverableState.status === 'success' ? 'Added' : 'Add Deliverable'}
              </button>
            )}
          </div>
          {!isWorkstreamCard && issueDraftOpen && (
            <div className="new-review-issue-draft">
              <label>
                <span>Issue type</span>
                <select value={issueType} onChange={event => setIssueType(event.target.value)} disabled={issueBusy}>
                  <option value="Wrong Merch">Wrong Merch</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Unknown Item">Unidentified Merchandise</option>
                  <option value="Missing Merch">Missing Merch</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span>Description</span>
                <input value={issueDescription} onChange={event => setIssueDescription(event.target.value)} placeholder="Short issue summary" disabled={issueBusy} />
              </label>
              <label className="is-wide">
                <span>Notes</span>
                <input value={issueNotes} onChange={event => setIssueNotes(event.target.value)} placeholder="Optional context" disabled={issueBusy} />
              </label>
              <button type="button" className="btn btn-danger-outline btn-sm" onClick={raiseIssue} disabled={issueBusy || !issueDescription.trim()}>
                {issueBusy ? 'Raising...' : 'Save Issue'}
              </button>
            </div>
          )}
          <div className="new-review-footer-actions">
            {!isWorkstreamCard && (
              <button
                type="button"
                className="btn btn-ghost-danger"
                onClick={() => setIssueDraftOpen(open => !open)}
                disabled={finishBusy || issueBusy}
              >
                Raise an issue
              </button>
            )}
            {finishLabel && (
              <button type="button" className="btn btn-primary" onClick={finishCurrentVerification} disabled={finishDisabled}>
                {finishBusy
                  ? (isWorkstreamCard || !readyToAdvance ? 'Saving...' : 'Moving...')
                  : finishLabel}
              </button>
            )}
          </div>
          <p className="new-review-footer-guidance">{workstreamFooterMessage}</p>
          {finishState.message && (
            <div className="new-review-finish-summary">
              <strong className={`is-${finishState.status}`}>{finishState.message}</strong>
            </div>
          )}
          {issueState.message && (
            <p className={`new-review-footer-feedback is-${issueState.status}`} role={issueState.status === 'error' ? 'alert' : 'status'}>
              {issueState.message}
            </p>
          )}
          {deliverableState.message && (
            <p className={`new-review-footer-feedback is-${deliverableState.status}`} role={deliverableState.status === 'error' ? 'alert' : 'status'}>
              {deliverableState.message}
            </p>
          )}
        </footer>
      </section>
      {lightboxOpen && activePhotoUrl && (
        <ImageLightbox photos={photos} index={photoIndex} setIndex={setPhotoIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

function PlanningActivationPackageModal({ clients = [], merchandiseOptions = [], initialClientId = '', initialMerchandiseId = '', initialMerchandiseIds = [], initialDeliverableType = '', initialActivation = null, onClose, onSaved }) {
  const topcoClient = clients.find(client => (client.name || '').trim().toLowerCase() === 'topco');
  const defaultClientId = initialClientId || topcoClient?.id || clients[0]?.id || '';
  const scopedDeliverableType = ['Packaging', 'Ecomm'].includes(initialDeliverableType) ? initialDeliverableType : '';
  const initialMerchandiseIdList = [
    ...(Array.isArray(initialMerchandiseIds) ? initialMerchandiseIds : []),
    initialMerchandiseId,
  ].filter(Boolean).filter((id, index, list) => list.indexOf(id) === index);
  const emptyItem = () => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    merchandiseId: '',
    description: '',
    upc: '',
    cvid: '',
    structure: '',
    brandPrefix: '',
    jobNumber: '',
    fileNameDescription: '',
    artworkPath: '',
    uploadLocation: '',
  });
  // The Structure Form already named the project. Prefill it only when every
  // item in the release agrees, since a release can bundle more than one.
  const projectNameForSelection = merchandiseIds => {
    const names = new Set((merchandiseIds || [])
      .map(id => merchandiseOptions.find(option => option.id === id)?.projectName || '')
      .filter(Boolean));
    return names.size === 1 ? [...names][0] : '';
  };
  const formFromActivation = activation => {
    const skuRows = Array.isArray(activation?.skuDetails)
      ? activation.skuDetails.map((row, index) => ({
          id: `${activation.id || 'activation'}-${index}-${Math.random().toString(16).slice(2)}`,
          merchandiseId: String(row?.merchandiseId || ''),
          description: String(row?.description || ''),
          upc: String(row?.upc || ''),
          cvid: String(row?.cvid || ''),
          structure: String(row?.structure || ''),
          brandPrefix: String(row?.brandPrefix || ''),
          jobNumber: String(row?.jobNumber || ''),
          fileNameDescription: String(row?.fileNameDescription || ''),
          artworkPath: String(row?.artworkPath || activation?.artworkPath || ''),
          uploadLocation: String(row?.uploadLocation || activation?.uploadLocation || ''),
        }))
      : [];
    const initialRows = skuRows.length
      ? skuRows
      : (initialMerchandiseIdList.length ? initialMerchandiseIdList : ['']).map(merchandiseId => ({ ...emptyItem(), merchandiseId }));
    const deliverables = scopedDeliverableType
      ? [scopedDeliverableType]
      : normalizeDeliverableList(activation?.deliverables || ['Ecomm']).filter(value => ACTIVATION_DELIVERABLE_OPTIONS.includes(value));
    return {
      clientId: activation?.clientIds?.[0] || defaultClientId,
      name: activation?.name || projectNameForSelection(initialRows.map(row => row.merchandiseId)),
      dueUrgency: activation?.dueUrgency || '',
      imagesPerBundle: activation ? (activation.imagesPerBundle ?? '') : 9,
      totalImages: activation ? (activation.totalImages ?? '') : 9 * initialRows.length,
      deliverables,
      walnutScope: activation?.walnutScope || defaultWalnutScope(deliverables[0]),
      artworkPath: activation?.artworkPath || '',
      uploadLocation: activation?.uploadLocation || '',
      notes: activation?.notes || '',
      skuRows: initialRows,
    };
  };
  const [form, setForm] = useState(() => formFromActivation(initialActivation));
  const [editingActivationId, setEditingActivationId] = useState(() => initialActivation?.id || '');
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState('');
  const [error, setError] = useState('');
  const activationHistory = useResource(
    () => form.clientId ? api.listActivations({ clientId: form.clientId }) : Promise.resolve({ records: [] }),
    [form.clientId]
  );

  useEffect(() => {
    setForm(current => ({ ...current, clientId: current.clientId || defaultClientId }));
  }, [defaultClientId]);

  useEffect(() => {
    setForm(formFromActivation(initialActivation));
    setEditingActivationId(initialActivation?.id || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActivation?.id, defaultClientId, initialMerchandiseIdList.join('|'), scopedDeliverableType]);

  const selectedClient = clients.find(client => client.id === form.clientId) || topcoClient;
  const selectedClientName = selectedClient?.name || 'Client';
  const pathPrefixes = selectedClient?.readinessProfile?.pathPrefixes || {};
  const walnutScopeSuggestions = DEFAULT_WALNUT_SCOPE_SUGGESTIONS;
  const dueUrgencySuggestions = activationFieldSuggestions(
    activationHistory.data?.records,
    'dueUrgency',
    DEFAULT_DUE_URGENCY_SUGGESTIONS
  ).filter(value => value.trim().toLowerCase() !== 'today');
  const structureSuggestions = activationSkuFieldSuggestions(
    activationHistory.data?.records,
    'structure',
    DEFAULT_STRUCTURE_SUGGESTIONS
  );
  const topcoMerchandiseOptions = merchandiseOptions
    .filter(item => !form.clientId || item.clientId === form.clientId)
    .filter(item => {
      const selectedDeliverables = normalizeDeliverableList(form.deliverables);
      if (!selectedDeliverables.length) return true;
      const itemDeliverables = normalizeDeliverableList(item.deliverables);
      return selectedDeliverables.some(deliverable => itemDeliverables.includes(deliverable));
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  useEffect(() => {
    setForm(current => {
      let changed = false;
      const skuRows = current.skuRows.map(row => {
        const selected = topcoMerchandiseOptions.find(item => item.id === row.merchandiseId);
        if (!selected) return row;
        const next = {
          ...row,
          description: row.description || selected.description || selected.productName || selected.title || '',
          upc: row.upc || selected.upc || selected.identifier || '',
          cvid: row.cvid || selected.cvid || '',
          brandPrefix: row.brandPrefix || selected.brandPrefix || '',
          jobNumber: row.jobNumber || selected.jobNumber || '',
          fileNameDescription: row.fileNameDescription || selected.fileNameDescription || '',
          artworkPath: fieldIsConfigured('pathToArt')
            ? row.artworkPath || selected.artworkPath || ''
            : row.artworkPath,
        };
        if (Object.keys(next).some(key => next[key] !== row[key])) changed = true;
        return next;
      });
      return changed ? { ...current, skuRows } : current;
    });
  }, [topcoMerchandiseOptions]);
  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  function useSavedActivation(activationId) {
    const saved = (activationHistory.data?.records || []).find(record => record.id === activationId);
    if (!saved) return;
    const savedForm = formFromActivation(saved);
    setEditingActivationId(saved.id);
    setForm(current => ({
      ...savedForm,
      clientId: current.clientId,
      deliverables: scopedDeliverableType ? [scopedDeliverableType] : savedForm.deliverables,
      skuRows: initialMerchandiseIdList.length
        ? initialMerchandiseIdList.map(merchandiseId => ({ ...emptyItem(), merchandiseId }))
        : savedForm.skuRows,
    }));
  }
  const updateItem = (rowId, key, value) => setForm(current => ({
    ...current,
    skuRows: current.skuRows.map(row => row.id === rowId ? { ...row, [key]: value } : row),
  }));
  const linkMerchandise = (rowId, merchandiseId) => {
    const selected = topcoMerchandiseOptions.find(item => item.id === merchandiseId);
    setForm(current => ({
      ...current,
      skuRows: current.skuRows.map(row => row.id === rowId
        ? {
            ...row,
            merchandiseId,
            description: selected?.description || selected?.productName || selected?.title || row.description,
            upc: selected?.upc || selected?.identifier || row.upc,
            cvid: selected?.cvid || row.cvid,
          }
        : row),
    }));
  };
  const addItem = () => setForm(current => {
    const nextRows = [...current.skuRows, emptyItem()];
    const defaultTotal = Number(current.imagesPerBundle || 9) * current.skuRows.length;
    const totalImages = String(current.totalImages) === String(defaultTotal)
      ? Number(current.imagesPerBundle || 9) * nextRows.length
      : current.totalImages;
    return { ...current, skuRows: nextRows, totalImages };
  });
  const removeItem = rowId => setForm(current => ({
    ...current,
    skuRows: current.skuRows.filter(row => row.id !== rowId),
  }));
  const itemRows = form.skuRows;
  const itemCount = itemRows.length;
  const selectedMerchandiseIds = new Set(itemRows.map(row => row.merchandiseId).filter(Boolean));
  const selectedDeliverables = normalizeDeliverableList(form.deliverables)
    .filter(value => ACTIVATION_DELIVERABLE_OPTIONS.includes(value));
  const selectedRequirementConfigs = selectedDeliverables.map(type => ({
    type,
    config: selectedClient?.photoProductionRequirements?.workstreams?.[type] || null,
  }));
  const normalizeRequirementKey = value => {
    const key = String(value || '').trim().toLowerCase().replace(/[\s_/-]+/g, '');
    return {
      productname: 'productName',
      description: 'productName',
      upc: 'upc',
      productid: 'upc',
      cvid: 'cvid',
      jobnumber: 'jobNumber',
      brandprefix: 'brandPrefix',
      filenamedescription: 'fileNameDescription',
      productdescription: 'productDescription',
      producttype: 'productType',
      ecommphotonotes: 'ecommPhotoNotes',
      pathtoart: 'pathToArt',
      validartworkpath: 'pathToArt',
      artworkpath: 'pathToArt',
      uploadlocation: 'uploadLocation',
      structure: 'structure',
    }[key] || value;
  };
  const configuredRequiredFields = new Set(
    selectedRequirementConfigs.flatMap(({ config }) => (
      Array.isArray(config?.requiredProductFields)
        ? config.requiredProductFields.map(normalizeRequirementKey)
        : []
    )),
  );
  const fieldIsConfigured = field => configuredRequiredFields.has(normalizeRequirementKey(field));
  const fieldShouldShow = field => fieldIsConfigured(field);
  const showStructure = selectedDeliverables.includes('Ecomm') || fieldIsConfigured('structure');
  // Image counts describe an Ecomm bundle. A Packaging release shoots the
  // package itself, so the counts are neither asked for nor stated.
  const showImageCounts = selectedDeliverables.includes('Ecomm');
  const showArtworkPath = selectedDeliverables.length > 0;
  const showUploadLocation = selectedDeliverables.length > 0;
  const previewColumnDefinitions = [
    { key: 'productName', label: 'Description', getValue: row => row.description },
    { key: 'structure', label: 'Structure', getValue: row => row.structure },
    { key: 'upc', label: 'UPC', getValue: row => row.upc },
    { key: 'cvid', label: 'CVID', getValue: row => row.cvid },
    { key: 'brandPrefix', label: 'Brand Prefix', getValue: row => row.brandPrefix },
    { key: 'jobNumber', label: 'WKFT Job Number', getValue: row => row.jobNumber },
    { key: 'fileNameDescription', label: 'File Name Description', getValue: row => row.fileNameDescription },
  ];
  const previewColumns = previewColumnDefinitions.filter(column => (
    column.key === 'structure' ? showStructure : fieldShouldShow(column.key)
  ));
  const previewLabel = selectedDeliverables.length === 1
    ? selectedDeliverables[0]
    : selectedDeliverables.join(' + ') || 'Photo';
  const previewHeading = selectedDeliverables.length === 1
    ? `${previewLabel} photography is needed for the following projects:`
    : 'Photo deliverables are needed for the following projects:';
  const previewLines = [
    { label: 'Number of SKUs', value: String(itemCount), fallback: 'Number of SKUs' },
    { label: 'Walnut scope', value: form.walnutScope, fallback: 'Walnut scope' },
    ...(showImageCounts && String(form.imagesPerBundle || '').trim()
      ? [{ label: 'Number of images per bundle', value: String(form.imagesPerBundle), fallback: 'Images per bundle' }] : []),
    ...(showImageCounts && String(form.totalImages || '').trim()
      ? [{ label: 'Total number of images', value: String(form.totalImages), fallback: 'Total images' }] : []),
    ...(String(form.dueUrgency || '').trim()
      ? [{ label: 'Due', value: form.dueUrgency, fallback: 'Due / urgency' }] : []),
  ];
  const fieldStatus = value => String(value || '').trim() ? 'is-present' : 'is-missing';
  const fieldText = (value, fallback) => String(value || '').trim() || fallback;
  const activationRequiredFields = [
    ['Name', form.name],
    ['Walnut Scope', form.walnutScope],
  ];
  const activationMissing = activationRequiredFields.filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
  const itemRequiredFields = row => [
    ['Linked Merchandise', row.merchandiseId],
    ...(fieldIsConfigured('productName') ? [['Description', row.description]] : []),
    ...(fieldIsConfigured('upc') ? [['UPC', row.upc]] : []),
    ...(fieldIsConfigured('cvid') ? [['CVID', row.cvid]] : []),
    ...(fieldIsConfigured('pathToArt') ? [['Artwork Path', row.artworkPath]] : []),
    ...(showUploadLocation ? [['Upload Location', row.uploadLocation]] : []),
    ...(fieldIsConfigured('brandPrefix') ? [['Brand Prefix', row.brandPrefix]] : []),
    ...(fieldIsConfigured('jobNumber') ? [['WKFT Job Number', row.jobNumber]] : []),
    ...(fieldIsConfigured('fileNameDescription') ? [['File Name Description', row.fileNameDescription]] : []),
  ];
  const itemMissingFields = row => itemRequiredFields(row).filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
  const itemSummaryFields = row => [
    ...(fieldIsConfigured('productName') ? [['Description', row.description]] : []),
    ...(fieldIsConfigured('upc') ? [['UPC', row.upc]] : []),
    ...(fieldIsConfigured('cvid') ? [['CVID', row.cvid]] : []),
    ...(fieldIsConfigured('brandPrefix') ? [['Brand Prefix', row.brandPrefix]] : []),
    ...(fieldIsConfigured('jobNumber') ? [['WKFT Job Number', row.jobNumber]] : []),
    ...(fieldIsConfigured('fileNameDescription') ? [['File Name Description', row.fileNameDescription]] : []),
  ];
  const modalTitle = initialActivation?.id ? 'Edit Photo Release' : 'Photo Release';
  const PreviewValue = ({ value, fallback, children }) => {
    const present = String(value || '').trim();
    return <span className={`activation-preview-token ${present ? 'is-present' : 'is-missing'}`}>{children || present || fallback}</span>;
  };
  const previewPath = (value, prefix = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
    return `${prefix || ''}${text}`;
  };
  function PreviewPath({ value, prefix, fallback }) {
    const path = previewPath(value, prefix);
    if (!path) return <PreviewValue value="" fallback={fallback} />;
    return <a className="activation-preview-link" href={path}>{path}</a>;
  }

  const releaseEmail = buildPhotoReleaseEmail({
    clientName: selectedClientName,
    label: previewLabel,
    heading: previewHeading,
    projectName: form.name,
    itemRows,
    lines: previewLines,
    columns: previewColumns,
    showArtworkPath,
    showUploadLocation,
    pathPrefixes,
    resolvePath: previewPath,
    notes: form.notes,
    deliverables: selectedDeliverables,
  });
  const [emailCopied, setEmailCopied] = useState('');
  // Held open after a release only when the user still has to send the email
  // themselves. When it sends, there is nothing left to do and the modal closes.
  const [released, setReleased] = useState(null);

  const buildActivationPayload = status => {
    const seenMerchandiseIds = new Set();
    const skuDetails = form.skuRows
      .map(({ id, ...row }) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value || '').trim()])))
      .filter(row => Object.values(row).some(Boolean))
      .filter(row => {
        if (!row.merchandiseId) return true;
        if (seenMerchandiseIds.has(row.merchandiseId)) return false;
        seenMerchandiseIds.add(row.merchandiseId);
        return true;
      });
    return {
      clientId: form.clientId,
      name: form.name.trim() || 'Topco Photo Release',
      status,
      dueUrgency: form.dueUrgency,
      imagesPerBundle: !showImageCounts || form.imagesPerBundle === '' ? null : Number(form.imagesPerBundle),
      totalImages: !showImageCounts || form.totalImages === '' ? null : Number(form.totalImages),
      deliverables: form.deliverables,
      walnutScope: form.walnutScope,
      artworkPath: form.skuRows[0]?.artworkPath || form.artworkPath,
      uploadLocation: form.skuRows[0]?.uploadLocation || form.uploadLocation,
      notes: form.notes,
      activationPackage: form.notes,
      skuDetails,
      linkedMerchandiseIds: skuDetails.map(row => row.merchandiseId).filter(Boolean),
      numberOfSkus: skuDetails.length,
      // Stored as released so the record shows what was actually sent.
      emailSubject: releaseEmail.subject,
      emailBodyHtml: releaseEmail.html,
    };
  };

  async function saveActivationPackage(action = 'draft') {
    setSaving(true);
    setSaveAction(action);
    setError('');
    try {
      const localMissing = [
        ...(action === 'move' && itemRows.length === 0 ? ['Linked Merchandise'] : []),
        ...(action === 'move' ? activationMissing : []),
        ...(action === 'move' && !form.deliverables.length ? ['Deliverables'] : []),
        ...(action === 'move' ? itemRows.flatMap((row, index) => itemMissingFields(row).map(field => `Item ${index + 1} ${field}`)) : []),
      ];
      if (localMissing.length) {
        setError(`Complete before Release to Photo: ${localMissing.join(', ')}.`);
        return;
      }
      const payload = buildActivationPayload(action === 'move' ? 'Active' : 'Draft');
      const result = editingActivationId
        ? await api.updateActivation(editingActivationId, payload)
        : await api.createActivation(payload);
      if (action === 'move') {
        const moved = await api.moveActivationToPhoto(result.record.id);
        const keepOpen = !moved.emailSent && Boolean(moved.email);
        onSaved?.(moved.activation, {
          moved: true,
          movedCount: moved.movedCount,
          movedIds: (moved.moved || []).map(entry => entry.id).filter(Boolean),
          emailSent: Boolean(moved.emailSent),
          emailDetail: moved.emailDetail || '',
          email: moved.email || null,
          keepOpen,
        });
        if (keepOpen) setReleased({ email: moved.email, movedCount: moved.movedCount });
      } else {
        onSaved?.(result.record, { moved: false });
      }
    } catch (saveError) {
      const missing = Array.isArray(saveError.payload?.missing) ? ` Missing: ${saveError.payload.missing.join(', ')}` : '';
      setError(`${saveError.message || 'Could not save photo release.'}${missing}`);
    } finally {
      setSaving(false);
      setSaveAction('');
    }
  }

  return createPortal(
    <div className="activation-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="activation-modal activation-modal-simple" role="dialog" aria-modal="true" aria-label={modalTitle} onClick={event => event.stopPropagation()}>
        <header className="activation-modal-header">
          <div>
            <span className="nr-eyebrow">Topco</span>
            <div className="activation-modal-title-row">
              <h2>{modalTitle}:</h2>
              <DeliverableBadges values={selectedDeliverables} />
            </div>
          </div>
          <button type="button" className="merchandise-detail-close" onClick={onClose} aria-label="Close photo release">
            <Icon.Close />
          </button>
        </header>
        <form className="activation-modal-body activation-simple-form" onSubmit={event => event.preventDefault()}>
          <div className="activation-builder-layout">
            <div className="activation-builder-inputs">
              <section className="activation-simple-section">
                <div className="activation-section-heading">
                  {!activationMissing.length && (
                    <span className="activation-completion-check" role="img" aria-label="Complete">✓</span>
                  )}
                </div>
                <div className="activation-simple-grid">
                  <label><ActivationFieldLabel required value={form.name}>Project name</ActivationFieldLabel><input className="form-input" value={form.name} onChange={event => updateForm('name', event.target.value)} /></label>
                  <SuggestiveTextInput
                    label="Due / Urgency"
                    value={form.dueUrgency}
                    onChange={value => updateForm('dueUrgency', value)}
                    placeholder=""
                    suggestions={dueUrgencySuggestions}
                  />
                  <SuggestiveTextInput
                    label="Walnut Scope"
                    value={form.walnutScope}
                    onChange={value => updateForm('walnutScope', value)}
                    placeholder=""
                    suggestions={walnutScopeSuggestions}
                    className="activation-walnut-scope-field"
                    showDropdownButton
                    required
                  />
                  {showImageCounts && (
                    <div className="activation-image-count-fields">
                      <label><ActivationFieldLabel value={form.imagesPerBundle}>Images/Bundle</ActivationFieldLabel><input className="form-input" type="number" min="0" value={form.imagesPerBundle} onChange={event => updateForm('imagesPerBundle', event.target.value)} /></label>
                      <label><ActivationFieldLabel value={form.totalImages}>Total Images</ActivationFieldLabel><input className="form-input" type="number" min="0" value={form.totalImages} onChange={event => updateForm('totalImages', event.target.value)} /></label>
                    </div>
                  )}
                  <label className="activation-simple-wide"><span>Notes</span><textarea className="form-input" value={form.notes} onChange={event => updateForm('notes', event.target.value)} placeholder="Once completed, please send for review/approval. Thanks!" /></label>
                </div>
              </section>

              <section className="activation-simple-section">
                <div className="activation-sku-section-header">
                  <div>
                    <span className="client-readiness-label">Items</span>
                    <p>Each row is one received item/SKU that must be linked and complete.</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm activation-add-item-button" onClick={addItem}>Add ready item</button>
                </div>
                <div className="activation-sku-rows">
                  {itemRows.length === 0 && (
                    <div className="activation-empty-items">
                    No items linked. Add an item before sending this photo release.
                    </div>
                  )}
                  {itemRows.map((row, index) => (
                    <div className="activation-sku-row activation-simple-item" key={row.id}>
                      <div className="activation-sku-row-top">
                        <div>
                          <strong>Item {index + 1}</strong>
                        </div>
                        {!itemMissingFields(row).length && (
                          <span className="activation-completion-check" role="img" aria-label="Item complete">✓</span>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(row.id)}>Remove</button>
                      </div>
                      <label className="activation-merchandise-match-field">
                        <ActivationFieldLabel required value={row.merchandiseId}>Link Merchandise</ActivationFieldLabel>
                        <select className="form-input" value={row.merchandiseId} onChange={event => linkMerchandise(row.id, event.target.value)}>
                          <option value="">Choose received merchandise...</option>
                          {topcoMerchandiseOptions
                            .filter(item => item.id === row.merchandiseId || !selectedMerchandiseIds.has(item.id))
                            .map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
                        </select>
                      </label>
                      <div className="activation-validated-summary">
                        <span className="client-readiness-label">Validated details</span>
                        <div className="activation-validated-grid">
                          {itemSummaryFields(row).map(([label, value]) => (
                            <span className={`activation-validated-field ${String(value || '').trim() ? '' : 'is-missing'}`} key={label}>
                              <small>{label}</small>
                              <strong>{String(value || '').trim() || 'Missing'}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                      {showStructure && <SuggestiveTextInput
                        label="Structure"
                        value={row.structure}
                        onChange={value => updateItem(row.id, 'structure', value)}
                        placeholder=""
                        suggestions={structureSuggestions}
                        className="activation-structure-field"
                      />}
                      {showArtworkPath && <label className="activation-path-field"><ActivationFieldLabel required={fieldIsConfigured('pathToArt')} value={row.artworkPath} detail={pathPrefixes.artwork || 'Enter artwork path'}>Artwork Path</ActivationFieldLabel><input className={`form-input ${row.artworkPath ? 'is-autofilled' : ''}`} value={row.artworkPath} onChange={event => updateItem(row.id, 'artworkPath', event.target.value)} placeholder="" /></label>}
                      {showUploadLocation && <label className="activation-path-field"><ActivationFieldLabel required value={row.uploadLocation} detail={pathPrefixes.upload || 'Enter upload location'}>Upload Location</ActivationFieldLabel><input className={`form-input ${row.uploadLocation ? 'is-autofilled' : ''}`} value={row.uploadLocation} onChange={event => updateItem(row.id, 'uploadLocation', event.target.value)} placeholder="" /></label>}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm activation-add-item-button activation-add-item-bottom" onClick={addItem}>Add ready item</button>
                </div>
              </section>
            </div>

            <aside className="activation-email-preview" aria-label="Photo release email preview">
              <div className="activation-email-preview-header">
                <span className="client-readiness-label">Email Preview</span>
                <span className="activation-email-preview-actions">
                  {emailCopied && <em>{emailCopied}</em>}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={async () => setEmailCopied(await copyPhotoReleaseEmail(releaseEmail))}
                  >
                    Copy email
                  </button>
                </span>
              </div>
              <div className="activation-email-preview-body">
                <p className="activation-email-subject"><strong>Subject:</strong> {selectedClientName} {previewLabel} Photo Request - <PreviewValue value={form.name} fallback="Photo request" /></p>
                <p><strong>{previewHeading}</strong></p>
                <ul>
                  {itemRows.map((row, index) => (
                    <li key={row.id}>
                      <PreviewValue value={row.description} fallback={`Item ${index + 1} description`} />
                      {selectedDeliverables.includes('Ecomm') && <> {' '}<PreviewValue value={row.cvid} fallback="CVID" /></>}{' - 1 SKU'}
                    </li>
                  ))}
                </ul>
                <div className="activation-preview-lines">
                  {previewLines.map((line, index) => (
                    <Fragment key={line.label}>
                      {index > 0 && <br />}
                      <strong>{line.label}:</strong> <PreviewValue value={line.value} fallback={line.fallback} />
                    </Fragment>
                  ))}
                </div>
                {showArtworkPath && <section className="activation-preview-path-section">
                  <p><strong>Path to artwork:</strong></p>
                  <ul>
                    {itemRows.map((row, index) => <li key={`${row.id}-artwork`}><PreviewValue value={row.description} fallback={`Item ${index + 1}`} />: <PreviewPath value={row.artworkPath} prefix={pathPrefixes.artwork} fallback="Artwork path" /></li>)}
                  </ul>
                </section>}
                {showUploadLocation && <section className="activation-preview-path-section">
                  <p><strong>Location for image uploads:</strong></p>
                  <ul>
                    {itemRows.map((row, index) => <li key={`${row.id}-upload`}><PreviewValue value={row.description} fallback={`Item ${index + 1}`} />: <PreviewPath value={row.uploadLocation} prefix={pathPrefixes.upload} fallback="Upload location" /></li>)}
                  </ul>
                </section>}
                {previewColumns.length > 0 && <><p className="activation-preview-table-title"><strong>Sku Details</strong></p>
                <table>
                  <thead>
                    <tr>
                      {previewColumns.map(column => <th key={column.key}>{column.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map(row => (
                      <tr key={`${row.id}-details`}>
                        {previewColumns.map(column => <td key={column.key} className={fieldStatus(column.getValue(row))}>{fieldText(column.getValue(row), column.label)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table></>}
                <p>{form.notes || 'Once completed, please send for review/approval. Thanks!'}</p>
              </div>
            </aside>
          </div>

          {error && <div className="error-state">{error}</div>}
          {released ? (
            <footer className="activation-modal-footer activation-modal-released">
              <p>
                <strong>
                  Released {released.movedCount || 0} card{released.movedCount === 1 ? '' : 's'} to photo.
                </strong>
                {' '}Copy the email and paste it into a new message.
              </p>
              <span className="activation-released-actions">
                {emailCopied && <em>{emailCopied}</em>}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => setEmailCopied(await copyPhotoReleaseEmail(released.email))}
                >
                  Copy email
                </button>
                <a className="btn" href={photoReleaseMailtoUrl(released.email)}>Open blank message</a>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
              </span>
            </footer>
          ) : (
            <footer className="activation-modal-footer">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => saveActivationPackage('move')} disabled={saving || !form.clientId}>
                {saving && saveAction === 'move' ? 'Releasing...' : 'Release to Photo'}
              </button>
            </footer>
          )}
        </form>
      </section>
    </div>,
    document.body
  );
}

function MerchandiseReviewV2Page() {
  const authContext = useAuth();
  const auth = authContext?.auth || {};
  const entries = useResource(() => api.listMerchandiseReviewEntries());
  const workstreamCards = useResource(() => api.listWorkstreamCards());
  // Needed for board membership: a THR3D-only parent has no workstream card, so a
  // shipping item is the only evidence that its child work exists.
  const thr3dShippingItems = useResource(() => api.listThr3dShippingItems());
  const clients = useResource(() => api.listClients());
  const locations = useResource(() => api.listLocations());
  const records = entries.data?.records ?? [];
  const defaultPlanningBoard = MERCHANDISE_PLANNING_BOARD;
  const planningQueues = PM_QUEUE_COLUMNS;
  const [artworkOverrides] = useState(() => loadJsonMap(MERCH_REVIEW_V2_ARTWORK_KEY));
  const [conversations, setConversations] = useState({});
  const [historyByMerchandise, setHistoryByMerchandise] = useState({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [commentReads, setCommentReads] = useState({});
  useEffect(() => {
    let cancelled = false;
    api.listCommentReads()
      .then(data => { if (!cancelled) setCommentReads(data.reads || {}); })
      // Read state is an enhancement, not a gate: on failure every comment simply
      // reads as unread rather than the board failing to render.
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentErrors, setCommentErrors] = useState({});
  const [commentSavingId, setCommentSavingId] = useState('');
  const [legacyDeliverableRouteDecisions] = useState(() => ({
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
  const [deliverableFilter, setDeliverableFilter] = useState('');
  const [groupReleaseByShipment, setGroupReleaseByShipment] = useState(true);
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  // The card stays on the board after release, so the badge carries a brief
  // confirmation rather than the board looking unchanged.
  const [justReleasedIds, setJustReleasedIds] = useState([]);
  // An unsent release is not a lost one: the composed email stays available
  // until the next release replaces it.
  const [pendingReleaseEmail, setPendingReleaseEmail] = useState(null);
  const [activationListOpen, setActivationListOpen] = useState(false);
  const [selectedActivation, setSelectedActivation] = useState(null);
  const [activationMerchandiseId, setActivationMerchandiseId] = useState('');
  const [activationMerchandiseIds, setActivationMerchandiseIds] = useState([]);
  const [activationDeliverableType, setActivationDeliverableType] = useState('');
  const [selectedReleaseItemIds, setSelectedReleaseItemIds] = useState([]);
  const [localActivations, setLocalActivations] = useState([]);

  const merchandiseIdsKey = records.map(record => record.id).sort().join('|');

  useEffect(() => {
    if (!merchandiseIdsKey) {
      setConversations({});
      return;
    }
    let cancelled = false;
    setCommentsLoading(true);
    Promise.all(records.map(record => (
      api.listMerchandiseComments(record.id)
        .then(data => [record.id, data.records || []])
        .catch(error => {
          if (!cancelled) {
            setCommentErrors(current => ({ ...current, [record.id]: error.message || 'Could not load comments.' }));
          }
          return [record.id, []];
        })
    ))).then(entries => {
      if (cancelled) return;
      setConversations(Object.fromEntries(entries));
    }).finally(() => {
      if (!cancelled) setCommentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [merchandiseIdsKey]);

  const clientMap = Object.fromEntries((clients.data?.records ?? []).map(client => [client.id, client]));
  const locationMap = Object.fromEntries((locations.data?.records ?? []).map(location => [location.id, location]));
  const topcoClientIds = new Set((clients.data?.records ?? [])
    .filter(client => (client.name || '').trim().toLowerCase() === 'topco')
    .map(client => client.id));
  const activationClientId = clientFilter && topcoClientIds.has(clientFilter)
    ? clientFilter
    : [...topcoClientIds][0] || '';
  const activations = useResource(
    () => activationClientId ? api.listActivations({ clientId: activationClientId }) : Promise.resolve({ records: [] }),
    [activationClientId]
  );
  const activationRecords = [
    ...(activations.data?.records || []),
    ...localActivations.filter(local => !(activations.data?.records || []).some(record => record.id === local.id)),
  ];
  const linkedActivationByMerchandiseId = activationByMerchandiseId(activationRecords);
  const activationLinksLoaded = Boolean(activations.data);
  // Parent merchandise leaves the board when child work actually exists, which is
  // the structural check in childWorkMerchandiseIds below. There is deliberately no
  // status-flag filter here: a flag can be set on merchandise that has no child
  // work, which would hide it in Planning with no way back onto the board.
  const activePlanningRecords = records;
  const selectedDeliverableRouteIdsByMerchandise = activePlanningRecords.reduce((map, record) => {
    const deliverableRoutes = deliverablesForRecord(record)
      .map(deliverable => DELIVERABLE_ROUTE_MAP[deliverable])
      .filter(Boolean);
    map[record.id] = deliverableRoutes.length
      ? deliverableRoutes.filter((value, index, list) => list.indexOf(value) === index)
      : normalizeDeliverableRouteSelection(legacyDeliverableRouteDecisions[record.id] || {}, "");
    return map;
  }, {});
  const receivedMerchItems = activePlanningRecords.map(record => {
    const override = artworkOverrides[record.id];
    const client = clientMap[record.clientIds?.[0]];
    const location = record.locationId ? locationMap[record.locationId] : null;
    const planningBoard = planningBoardForClient(record.clientIds?.[0]);
    const planningCard = evaluateMerchandiseReviewAssignment(record, {
      artworkOverride: override,
      requestedQueueId: intakeRequestedQueueForRecord(record),
      client,
      planningBoard,
    });
    const card = buildPlanningCard(record, { assignment: planningCard, client, location });
    const activationDriven = topcoClientIds.has(record.clientIds?.[0]) || (client?.name || '').trim().toLowerCase() === 'topco';
    const deliverables = initialReviewDeliverables(record);
    const deliverableLabels = deliverables.map(deliverableRouteLabelForDeliverable).filter(Boolean);
    const deliverableRoutes = deliverables.map(deliverable => DELIVERABLE_ROUTE_MAP[deliverable]).filter(Boolean);
    const linkedActivation = linkedActivationByMerchandiseId[record.id] || null;
    const comments = Array.isArray(conversations[record.id]) ? conversations[record.id] : [];
    const readThrough = commentReads[record.id] || '';
    const unreadComments = comments.filter(comment => comment.createdAt > readThrough).length;
    const recentComment = hasRecentPlanningComment(comments);
    const baseColumnId = queueIdForPlanningStatus(
      record.planningStatus || planningStatusFromLegacyQueue(intakeRequestedQueueForRecord(record)),
    );
    const columnId = baseColumnId;
    return {
      ...card,
      id: record.id,
      merchandiseId: record.id,
      columnId,
      queueLabel: planningQueues.find(column => column.id === columnId)?.label || card.currentQueueName,
      deliverableRouteId: deliverableRoutes[0] || card.primaryDeliverableRoute,
      selectedDeliverableRouteIds: selectedDeliverableRouteIdsByMerchandise[record.id],
      photoProduction: record.photoProduction || null,
      clientPhotoProductionRequirements: client?.photoProductionRequirements || null,
      isDraftPlanningCard: false,
      deliverables,
      activationDriven,
      activation: linkedActivation,
      commentCount: comments.length,
      unreadComments,
      recentComment,
      deliverableRoute: deliverableLabels.join(', ') || selectedDeliverableRouteIdsByMerchandise[record.id].map(deliverableRouteLabel).filter(Boolean).join(', ') || card.deliverableRoute,
    };
  });
  const workstreamItems = (workstreamCards.data?.records || []).map(card => {
    const item = buildWorkstreamPlanningItem(card, { clientMap, locationMap });
    const client = clientMap[item.record?.clientIds?.[0]];
    const activationDriven = topcoClientIds.has(item.record?.clientIds?.[0])
      || (client?.name || '').trim().toLowerCase() === 'topco';
    return {
      ...item,
      activationDriven,
      activation: activationDriven ? (linkedActivationByMerchandiseId[item.merchandiseId] || null) : null,
    };
  });
  // A parent Received Merch card leaves the board once child work exists for it.
  // Photo work becomes a workstream card that replaces the parent visually, so
  // rendering both would duplicate one item and break up Ecomm/Packaging siblings.
  // THR3D work becomes a shipping item and never produces a card, so it has to be
  // checked too or THR3D-only merchandise reappears in New Merch after assignment.
  const childWorkMerchandiseIds = new Set(
    [
      ...workstreamItems
        .filter(item => ['Packaging', 'Ecomm'].includes(item.workstreamType))
        .map(item => String(item.merchandiseId || item.record?.id || '').trim()),
      ...[
        ...(thr3dShippingItems.data?.records || []),
        ...(thr3dShippingItems.data?.shipped || []),
      ].flatMap(item => (item.receivedMerchIds || []).map(id => String(id || '').trim())),
    ].filter(Boolean),
  );
  const boardItems = [
    ...receivedMerchItems.filter(item => !childWorkMerchandiseIds.has(String(item.merchandiseId || item.record?.id || '').trim())),
    ...workstreamItems,
  ];
  // The same SKU can arrive more than once - more units, or a replacement for a
  // damaged one - and each arrival is its own Merchandise with its own photos and
  // its own path. Nothing on the board said they were the same thing, so a second
  // arrival could be shot again for no reason. This does not block anything; it
  // refuses to let that happen unnoticed.
  const arrivalsByProduct = boardItems.reduce((byProduct, item) => {
    const productId = item.record?.itemIds?.[0] || item.record?.linkedItem?.id || '';
    if (!productId) return byProduct;
    return { ...byProduct, [productId]: [...(byProduct[productId] || []), item] };
  }, {});
  const workstreamPhotoCardCounts = workstreamItems.reduce((counts, item) => {
    const key = item.merchandiseId || item.record?.id;
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const workstreamTypesByMerchandise = workstreamItems.reduce((types, item) => {
    const key = item.merchandiseId || item.record?.id;
    if (key && item.workstreamType && !types[key]?.includes(item.workstreamType)) {
      types[key] = [...(types[key] || []), item.workstreamType];
    }
    return types;
  }, {});
  // Filter options come from what is actually on the board, so a client whose
  // merchandise is all represented by workstream cards still appears.
  const clientOptions = [...new Set(boardItems.map(item => item.record?.clientIds?.[0]).filter(Boolean))]
    .map(id => ({ id, name: clientMap[id]?.name || 'Unknown client' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const locationOptions = [...new Set(boardItems.map(item => item.record?.locationId).filter(Boolean))]
    .map(id => ({ id, name: locationMap[id]?.name || 'Unknown location' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const searchText = search.trim().toLowerCase();
  const filteredItems = boardItems.filter(item => {
    const record = item.record || {};
    return (!searchText || planningSearchHaystack(item).includes(searchText))
      && (!clientFilter || record.clientIds?.[0] === clientFilter)
      && (!locationFilter || record.locationId === locationFilter)
      && (!ageFilter || record.ageGroup === ageFilter)
      && (!deliverableFilter || item.deliverableRouteId === deliverableFilter || item.selectedDeliverableRouteIds?.includes(deliverableFilter));
  });
  const selectedItem = boardItems.find(item => item.id === selectedId) || null;
  const selectedHistoryId = workspaceOpen ? (selectedItem?.merchandiseId || '') : '';

  useEffect(() => {
    if (!selectedHistoryId) return undefined;
    let cancelled = false;
    api.listMerchandiseHistory(selectedHistoryId)
      .then(data => {
        if (cancelled) return;
        setHistoryByMerchandise(current => ({ ...current, [selectedHistoryId]: data.records || [] }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedHistoryId, historyRefreshToken]);
  const selectedPhotos = recordPhotos(selectedItem?.record);
  const selectedOverride = selectedItem ? artworkOverrides[selectedItem.merchandiseId] : null;
  const selectedWorkspaceMode = workspaceModeForQueue(selectedItem?.planningCard?.queue);
  const selectedDecision = selectedItem ? { deliverableRouteIds: selectedDeliverableRouteIdsByMerchandise[selectedItem.merchandiseId] || [] } : null;
  const selectedColumnItems = selectedItem ? filteredItems.filter(item => item.columnId === selectedItem.columnId) : [];
  const selectedIndex = selectedItem ? selectedColumnItems.findIndex(item => item.id === selectedItem.id) : -1;
  const previousSelectedItem = selectedIndex > 0 ? selectedColumnItems[selectedIndex - 1] : null;
  const nextSelectedItem = selectedIndex >= 0 && selectedIndex < selectedColumnItems.length - 1 ? selectedColumnItems[selectedIndex + 1] : null;
  const showNewCardClient = auth.allClients || (auth.clientIds || []).length !== 1;
  const canCreateTopcoActivation = topcoClientIds.size > 0;
  const activationMerchandiseOptions = boardItems
    .filter(item => topcoClientIds.has(item.record?.clientIds?.[0]))
    .filter(item => item.subjectType === 'workstream-card')
    .filter(item => item.columnId === QUEUE_IDS.readyProduction
      || item.requiredToShoot?.ready
      || item.merchandiseId === activationMerchandiseId
      || activationMerchandiseIds.includes(item.merchandiseId))
    .map(item => {
      const parts = [
        item.title,
        item.identifier,
        item.timeHere,
      ].map(value => String(value || '').trim()).filter(Boolean);
      return {
        id: item.merchandiseId,
        clientId: item.record?.clientIds?.[0] || '',
        title: item.title || '',
        productName: item.record?.linkedItem?.name || item.record?.linkedItem?.product || '',
        description: item.record?.linkedItem?.description || item.record?.description || '',
        identifier: item.identifier || '',
        upc: item.record?.linkedItem?.upc || item.record?.linkedItem?.identifier || item.identifier || '',
        cvid: item.record?.linkedItem?.cvid || '',
        brand: item.record?.linkedItem?.brand || '',
        brandPrefix: item.record?.linkedItem?.brandPrefix || item.record?.linkedItem?.referenceData?.['Brand Prefix'] || '',
        jobNumber: item.record?.linkedItem?.itemJobNumber || item.record?.linkedItem?.wkftJobNumber || '',
        projectName: item.record?.linkedItem?.projectName || '',
        fileNameDescription: photoProductionProductValue(item.record?.linkedItem || {}, 'fileNameDescription'),
        artworkPath: item.record?.linkedItem?.pathToArt || item.record?.linkedItem?.referenceData?.['Path to Art'] || '',
        uploadLocation: '',
        columnId: item.columnId,
        deliverables: normalizeDeliverableList(item.deliverables || item.record?.deliverables),
        label: parts.join(' · ') || item.merchandiseId,
      };
    });

  useEffect(() => {
    const visibleReadyIds = new Set(filteredItems
      .filter(item => releaseSectionForPlanningItem(item) === 'readyToRelease')
      .map(item => item.id));
    setSelectedReleaseItemIds(current => current.filter(id => visibleReadyIds.has(id)));
  }, [filteredItems.map(item => item.id).join('|')]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [selectedId]);

  function updateSelectedDecision(nextDecision) {
    void nextDecision;
  }

  function markCommentsRead(merchandiseId) {
    if (!merchandiseId) return;
    // Optimistic so the badge clears immediately; the server value replaces it on reply.
    setCommentReads(current => ({ ...current, [merchandiseId]: localNowIso() }));
    api.markCommentRead(merchandiseId)
      .then(data => { if (data?.reads) setCommentReads(data.reads); })
      .catch(() => {});
  }

  async function addConversationComment(merchandiseId, body) {
    setCommentSavingId(merchandiseId);
    setCommentErrors(current => ({ ...current, [merchandiseId]: '' }));
    try {
      const data = await api.createMerchandiseComment(merchandiseId, body);
      const savedComment = data.comment;
      setConversations(current => ({
        ...current,
        [merchandiseId]: [
          ...(Array.isArray(current[merchandiseId]) ? current[merchandiseId] : []),
          savedComment,
        ],
      }));
      markCommentsRead(merchandiseId);
      return true;
    } catch (error) {
      setCommentErrors(current => ({ ...current, [merchandiseId]: error.message || 'Could not save comment.' }));
      return false;
    } finally {
      setCommentSavingId('');
    }
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
      closePlanningWorkspace();
    }
  }

  async function refreshV2WorkflowData({ quiet = true } = {}) {
    await Promise.all([
      entries.reload({ quiet }),
      workstreamCards.reload({ quiet }),
      thr3dShippingItems.reload({ quiet }),
    ]);
    // Anything that moves an item through the board also writes a history event.
    setHistoryRefreshToken(token => token + 1);
  }

  async function saveIntakeReadiness(item) {
    const blockers = item.requiredToShoot.filter(requirement => requirement.visible !== false && !requirement.satisfied);
    const readyGate = item.planningCard.validNextQueues[0]?.queue?.label;
    try {
      await api.updateMerchandiseIntakeState(item.merchandiseId, {
        stage: item.planningCard.currentQueue,
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
      setFeedback(`${error.message || 'Cannot release to photo.'}${missing}`);
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
      closePlanningWorkspace();
    }
  }

  function openPlanningWorkspace(id) {
    setSelectedId(id);
    setWorkspaceOpen(true);
    setFeedback('');
  }

  async function finishVerification(item, state = wizardStateForItem(item)) {
    if (finishSavingId) return { ok: false, message: 'Verification is already finishing.' };
    setFinishSavingId(item.merchandiseId);
    setFeedback('');
    if (item.subjectType === 'workstream-card' && state.workstreamCard) {
      try {
        const nextType = state.workstreamType || item.workstreamType;
        const typeChanged = state.workstreamTypeChanged && nextType && nextType !== item.workstreamType;
        if (state.workstreamAction === 'add') {
          await api.createWorkstreamCard({ merchandiseId: item.merchandiseId, workstreamType: state.workstreamActionType || nextType });
          await refreshV2WorkflowData();
          return { ok: true, message: `${state.workstreamActionType || nextType} workstream added.` };
        }
        if (typeChanged) {
          await api.updateWorkstreamCard(item.workstreamCardId, {
            workstreamType: nextType,
            planningStatus: item.planningStatus || 'needs-more-information',
          });
          await refreshV2WorkflowData();
          return { ok: true, message: `Workstream changed to ${nextType}.` };
        }
        return { ok: true, message: 'Workstream updated.' };
      } finally {
        setFinishSavingId('');
      }
    }
    const deliverables = normalizeDeliverableList(state.deliverables || item.deliverables);
    const assignment = state.assignment || workstreamAssignmentsForDeliverables(deliverables, item.record?.quantity);
    const expectedProductId = item.record?.linkedItem?.id || item.record?.itemIds?.[0] || '';
    const photoDraft = state.photoDraft || {};
    const manualProductInfo = expectedProductId ? undefined : productDataSourceForPlanningItem(item, photoDraft);
    try {
      if (expectedProductId) {
        const productPatch = productPatchFromPhotoDraft(photoDraft);
        if (Object.keys(productPatch).length) {
          await api.updateProduct(expectedProductId, productPatch);
        }
      }
      const isThr3dHandoff = deliverables.includes('Thr3d') && !deliverables.includes('Packaging') && !deliverables.includes('Ecomm');
      if (isThr3dHandoff) {
        const result = await api.confirmAssignMerchandise(item.merchandiseId, {
          expectedProductId,
          ...(manualProductInfo ? { manualProductInfo } : {}),
          workstreams: assignment.workstreams,
          thr3d: assignment.thr3d,
        });
        await refreshV2WorkflowData();
        setSelectedId('');
        setWorkspaceOpen(false);
        const message = 'Merch confirmed. Sent to THR3D shipping.';
        setFeedback(message);
        return { ok: true, message, record: result.merchandise };
      }
      const savingInPlace = !state.readyToAdvance
        && (state.reviewOnly || deliverables.length === 0 || deliverables.some(type => type === 'Packaging' || type === 'Ecomm'));
      if (savingInPlace) {
        const result = await api.updateMerchandiseIntakeState(item.merchandiseId, {
          stage: state.readyToAdvance ? QUEUE_IDS.readyProduction : QUEUE_IDS.waitingInformation,
          deliverables,
          expectedProductId,
          ...(state.noClearMatch ? { noClearMatch: true } : {}),
          ...(manualProductInfo ? { manualProductInfo } : {}),
        });
        await refreshV2WorkflowData();
        setSelectedId('');
        setWorkspaceOpen(false);
        const readyEnough = releaseInfoCompleteForPlanningItem({ ...item, record: { ...item.record, ...result }, deliverables });
        const message = state.readyToAdvance
          ? 'Moved to Awaiting Photo Release.'
          : readyEnough ? 'Saved. Waiting on Activation.' : 'Saved. Needs more information.';
        setFeedback(message);
        return { ok: true, message, record: result };
      }
      const result = await api.confirmAssignMerchandise(item.merchandiseId, {
        expectedProductId,
        ...(manualProductInfo ? { manualProductInfo } : {}),
        ...(state.readyToAdvance ? { planningStatus: 'Awaiting Photo Release' } : {}),
        workstreams: assignment.workstreams,
        thr3d: assignment.thr3d,
      });
      await refreshV2WorkflowData();
      setSelectedId('');
      setWorkspaceOpen(false);
      const workCount = result.workstreamCards?.length || 0;
      const shipCount = result.thr3dShippingItems?.length || 0;
      const created = [
        workCount ? `${workCount} photo card${workCount === 1 ? '' : 's'}` : '',
        shipCount ? `${shipCount} THR3D shipping item${shipCount === 1 ? '' : 's'}` : '',
      ].filter(Boolean).join(' and ');
      const message = state.readyToAdvance
        ? `Moved to Awaiting Photo Release: ${created || 'work assigned'}.`
        : `Workflows created: ${created || 'assignment saved'}.`;
      setFeedback(message);
      return { ok: true, message, record: result.merchandise };
    } catch (error) {
      const missing = Array.isArray(error.payload?.missing) ? ` Missing: ${error.payload.missing.join(', ')}` : '';
      const message = `${error.message || 'Could not create work.'}${missing}`;
      setFeedback(message);
      return { ok: false, message };
    } finally {
      setFinishSavingId('');
    }
  }

  async function addWorkstreamDeliverable(item, workstreamType) {
    if (!item?.merchandiseId || !['Packaging', 'Ecomm'].includes(workstreamType)) {
      return { ok: false, message: 'A photo deliverable could not be identified.' };
    }
    if ((workstreamTypesByMerchandise[item.merchandiseId] || []).includes(workstreamType)) {
      return { ok: false, message: `${workstreamType} is already present for this merchandise.` };
    }
    try {
      await api.createWorkstreamCard({ merchandiseId: item.merchandiseId, workstreamType });
      await refreshV2WorkflowData();
      setFeedback(`${workstreamType} deliverable added. The existing card stayed in its current queue.`);
      return { ok: true };
    } catch (error) {
      const message = error.message || `Could not add ${workstreamType}.`;
      setFeedback(message);
      return { ok: false, message };
    }
  }

  async function removeWorkstreamCard(item) {
    const hasSibling = workstreamPhotoCardCounts[item.merchandiseId] > 1;
    const consequence = hasSibling
      ? 'The other workstream will remain active.'
      : 'The merchandise will return to the merchandise review queue.';
    if (!window.confirm(`Remove the ${item.workstreamType || item.deliverableRoute || 'photo'} workstream for “${item.title}”? ${consequence}`)) return;
    try {
      const result = await api.deleteWorkstreamCard(item.workstreamCardId);
      setSelectedId('');
      setWorkspaceOpen(false);
      setFeedback(result.warning || (result.remainingDeliverables?.length
        ? 'Workstream removed. The remaining workstream is still active.'
        : 'Workstream removed. Merchandise returned to the merchandise review queue.'));
      try {
        await refreshV2WorkflowData();
      } catch (refreshError) {
        setFeedback(`Workstream removed, but the board could not refresh: ${refreshError.message || 'refresh it to see the updated queue.'}`);
      }
    } catch (error) {
      setFeedback(error.message || 'Could not remove workstream.');
    }
  }

  async function closePlanningWorkspace(item = selectedItem) {
    void item;
    setWorkspaceOpen(false);
    setSelectedId('');
  }

  function openActivationModal(activation = null, merchandiseId = '', deliverableType = '', merchandiseIds = []) {
    setActivationListOpen(false);
    setSelectedActivation(activation);
    setActivationMerchandiseId(merchandiseId);
    setActivationMerchandiseIds(merchandiseIds);
    setActivationDeliverableType(deliverableType);
    setActivationModalOpen(true);
  }

  function releaseDeliverableForItem(item = {}) {
    const workstreamType = normalizeDeliverableValue(item?.workstreamType || item?.record?.workstreamType || item?.deliverableRoute || '');
    if (['Packaging', 'Ecomm'].includes(workstreamType)) return workstreamType;
    const photoDeliverables = normalizeDeliverableList(item?.deliverables || item?.record?.deliverables)
      .filter(type => ['Packaging', 'Ecomm'].includes(type))
      .filter((type, index, list) => list.indexOf(type) === index);
    return photoDeliverables.length === 1 ? photoDeliverables[0] : '';
  }

  function openReadyForPhoto(item) {
    const merchandiseId = item?.merchandiseId || item?.record?.id || '';
    if (!merchandiseId) return { ok: false, message: 'This item is missing its Merchandise record.' };
    const deliverableType = releaseDeliverableForItem(item);
    if (!deliverableType) return { ok: false, message: 'Choose either Ecomm or Packaging before releasing to photo.' };
    setSelectedId('');
    setWorkspaceOpen(false);
    openActivationModal(null, merchandiseId, deliverableType);
    return { ok: true, message: 'Details saved.' };
  }

  function toggleReleaseSelection(itemId) {
    const item = boardItems.find(candidate => candidate.id === itemId);
    const itemDeliverable = releaseDeliverableForItem(item);
    if (!itemDeliverable) {
      setFeedback('Select a ready Ecomm or Packaging item before releasing.');
      return;
    }
    if (!selectedReleaseItemIds.includes(itemId)) {
      const selectedDeliverables = selectedReleaseItemIds
        .map(id => releaseDeliverableForItem(boardItems.find(candidate => candidate.id === id)))
        .filter(Boolean)
        .filter((type, index, list) => list.indexOf(type) === index);
      if (selectedDeliverables.length && selectedDeliverables[0] !== itemDeliverable) {
        setFeedback('Release Ecomm and Packaging separately. Select one deliverable type at a time.');
        return;
      }
    }
    setSelectedReleaseItemIds(current => (
      current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId]
    ));
  }

  function toggleReleaseGroup(itemIds) {
    const groupItems = itemIds
      .map(id => boardItems.find(candidate => candidate.id === id))
      .filter(item => item && releaseDeliverableForItem(item));
    if (!groupItems.length) {
      setFeedback('No ready Ecomm or Packaging items in this shipment.');
      return;
    }
    const alreadySelected = groupItems.filter(item => selectedReleaseItemIds.includes(item.id));
    if (alreadySelected.length === groupItems.length) {
      const groupIds = new Set(groupItems.map(item => item.id));
      setSelectedReleaseItemIds(current => current.filter(id => !groupIds.has(id)));
      return;
    }
    const activeDeliverable = selectedReleaseItemIds
      .map(id => releaseDeliverableForItem(boardItems.find(candidate => candidate.id === id)))
      .find(Boolean) || releaseDeliverableForItem(groupItems[0]);
    const eligible = groupItems.filter(item => releaseDeliverableForItem(item) === activeDeliverable);
    const skipped = groupItems.length - eligible.length;
    setSelectedReleaseItemIds(current => [
      ...current,
      ...eligible.map(item => item.id).filter(id => !current.includes(id)),
    ]);
    if (skipped) {
      setFeedback(`Selected the ${activeDeliverable} items. Release Ecomm and Packaging separately.`);
    }
  }

  function openSelectedReadyRelease(items) {
    const selectedItems = items.length ? items : boardItems.filter(item => selectedReleaseItemIds.includes(item.id));
    if (!selectedItems.length) {
      setFeedback('Select ready Ecomm or Packaging items before releasing.');
      return;
    }
    const clientIds = [...new Set(selectedItems.map(item => item.record?.clientIds?.[0]).filter(Boolean))];
    if (clientIds.length > 1) {
      setFeedback('Select items for one client at a time before releasing.');
      return;
    }
    const merchandiseIds = selectedItems
      .map(item => item.merchandiseId || item.record?.id)
      .filter(Boolean)
      .filter((id, index, list) => list.indexOf(id) === index);
    const deliverableTypes = selectedItems
      .map(releaseDeliverableForItem)
      .filter(Boolean)
      .filter((type, index, list) => list.indexOf(type) === index);
    if (deliverableTypes.length !== 1) {
      setFeedback(deliverableTypes.length > 1
        ? 'Release Ecomm and Packaging separately. Select one deliverable type at a time.'
        : 'Select ready Ecomm or Packaging items before releasing.');
      return;
    }
    setSelectedId('');
    setWorkspaceOpen(false);
    openActivationModal(
      null,
      merchandiseIds[0] || '',
      deliverableTypes[0],
      merchandiseIds,
    );
  }

  function closeActivationModal() {
    setActivationModalOpen(false);
    setSelectedActivation(null);
    setActivationMerchandiseId('');
    setActivationMerchandiseIds([]);
    setActivationDeliverableType('');
  }

  useEffect(() => {
    if (!justReleasedIds.length) return undefined;
    const timer = window.setTimeout(() => setJustReleasedIds([]), 6000);
    return () => window.clearTimeout(timer);
  }, [justReleasedIds]);

  async function handleActivationSaved(record, result = {}) {
    if (record?.id) {
      setLocalActivations(current => [
        record,
        ...current.filter(activation => activation.id !== record.id),
      ]);
    }
    if (!result.keepOpen) closeActivationModal();
    if (result.moved) {
      setJustReleasedIds(result.movedIds || []);
      const released = `Released ${result.movedCount || 0} linked card${result.movedCount === 1 ? '' : 's'} to photo.`;
      // Whether the email went out is worth saying plainly either way.
      setPendingReleaseEmail(result.emailSent || result.keepOpen ? null : (result.email || null));
      setFeedback(result.emailSent
        ? `${released} Email sent.`
        : result.keepOpen
          ? released
          : `${released} Send the email yourself:`);
      await activations.reload({ quiet: true }).catch(() => {});
      await refreshV2WorkflowData();
    } else {
      setFeedback(`Photo release saved: ${record?.name || 'Untitled release'}.`);
      await activations.reload({ quiet: true }).catch(() => {
        setFeedback(`Photo release saved: ${record?.name || 'Untitled release'}. Refresh if it does not appear in the list.`);
      });
      await refreshV2WorkflowData();
    }
  }

  if (entries.loading || workstreamCards.loading || thr3dShippingItems.loading) return <div className="empty-state">Loading Planning board...</div>;
  if (entries.error) return <div className="error-state">{entries.error}</div>;
  if (workstreamCards.error) return <div className="error-state">{workstreamCards.error}</div>;

  return (
    <div className="work-board-page">
      <div className="planning-board-actions">
        <div>
          {feedback && <span className="planning-board-feedback">{feedback}</span>}
          {pendingReleaseEmail && (
            <PhotoReleaseEmailHandoff
              email={pendingReleaseEmail}
              onDismiss={() => setPendingReleaseEmail(null)}
            />
          )}
        </div>
        <div className="planning-board-view-controls" aria-label="Planning view controls">
          <label className="planning-deliverable-filter">
            <select value={deliverableFilter} onChange={event => setDeliverableFilter(event.target.value)} aria-label="Filter by deliverable">
              <option value="">All deliverables</option>
              {DELIVERABLE_ROUTES.filter(route => route.id !== 'thr3d').map(route => <option value={route.id} key={route.id}>{route.label}</option>)}
            </select>
          </label>
          <label className="planning-group-toggle">
            <input
              type="checkbox"
              checked={groupReleaseByShipment}
              onChange={event => setGroupReleaseByShipment(event.target.checked)}
            />
            <span>Group by shipment</span>
          </label>
        </div>
        {canCreateTopcoActivation && (
          <div className="planning-board-action-buttons">
            <button type="button" className="btn" onClick={() => setActivationListOpen(true)}>
              <SquarePen size={13} strokeWidth={1.8} aria-hidden="true" />
              Edit Photo Releases
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openSelectedReadyRelease([])}>
              Group Ready Items
            </button>
          </div>
        )}
      </div>
      {(
        <PlanningReleaseView
          sections={PLANNING_RELEASE_SECTIONS}
          items={filteredItems}
          selectedId={selectedId}
          onSelect={openPlanningWorkspace}
          disabled={workspaceOpen}
          showNewCardClient={showNewCardClient}
          groupByShipment={groupReleaseByShipment}
          selectedReleaseIds={selectedReleaseItemIds}
          onToggleReleaseSelection={toggleReleaseSelection}
          onToggleReleaseGroup={toggleReleaseGroup}
          onReleaseSelected={openSelectedReadyRelease}
          justReleasedIds={justReleasedIds}
          arrivalsByProduct={arrivalsByProduct}
        />
      )}
      {workspaceOpen && selectedItem ? (
        <NewReviewModal
          item={selectedItem}
          decision={selectedDecision}
          onDecisionChange={updateSelectedDecision}
          onFinish={finishVerification}
          onReadyForPhoto={openReadyForPhoto}
          onAddDeliverable={addWorkstreamDeliverable}
          onRemove={selectedItem.subjectType === 'workstream-card' ? removeWorkstreamCard : undefined}
          workstreamPhotoCardCount={workstreamPhotoCardCounts[selectedItem.merchandiseId] || 1}
          workstreamTypes={workstreamTypesByMerchandise[selectedItem.merchandiseId] || []}
          onClose={closePlanningWorkspace}
          previousItem={previousSelectedItem}
          nextItem={nextSelectedItem}
          onSelectItem={openPlanningWorkspace}
          onRefresh={refreshV2WorkflowData}
          photos={selectedPhotos}
          photoIndex={photoIndex}
          setPhotoIndex={setPhotoIndex}
          comments={Array.isArray(conversations[selectedItem.merchandiseId]) ? conversations[selectedItem.merchandiseId] : []}
          commentSaving={commentSavingId === selectedItem.merchandiseId}
          commentError={commentErrors[selectedItem.merchandiseId] || ''}
          activity={Array.isArray(historyByMerchandise[selectedItem.merchandiseId]) ? historyByMerchandise[selectedItem.merchandiseId] : []}
          onAddComment={addConversationComment}
          onMarkCommentsRead={markCommentsRead}
          commentsReadThrough={commentReads[selectedItem.merchandiseId] || ''}
          clientRecord={clientMap[selectedItem.record?.clientIds?.[0]] || null}
        />
      ) : null}
      {activationListOpen && (
        <PlanningActivationListModal
          activations={activationRecords}
          loading={activations.loading}
          onClose={() => setActivationListOpen(false)}
          onEdit={openActivationModal}
          onAdd={() => {
            setActivationListOpen(false);
            openSelectedReadyRelease([]);
          }}
        />
      )}
      {activationModalOpen && (
        <PlanningActivationPackageModal
          clients={clients.data?.records || []}
          merchandiseOptions={activationMerchandiseOptions}
          initialClientId={clientFilter}
          initialMerchandiseId={activationMerchandiseId}
          initialMerchandiseIds={activationMerchandiseIds}
          initialDeliverableType={activationDeliverableType}
          initialActivation={selectedActivation}
          onClose={closeActivationModal}
          onSaved={handleActivationSaved}
        />
      )}
    </div>
  );
}

function PlanningThr3dRegressionPage() {
  const [selectedId, setSelectedId] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [finishedRecord, setFinishedRecord] = useState(null);
  const baseRecord = {
    id: 'test-thr3d-merch',
    productName: 'Regression Test Merchandise',
    quantity: 1,
    clientIds: ['test-client'],
    client: 'Test Client',
    merchStatus: 'Received',
    planningStatusLabel: finishedRecord?.planningStatusLabel || 'New',
    deliverables: finishedRecord?.deliverables || [],
    itemPhotos: [
      {
        photo_id: 'test-photo',
        object_key: 'test/thr3d-photo.jpg',
        previewUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22 viewBox=%220 0 800 600%22%3E%3Crect width=%22800%22 height=%22600%22 fill=%22%23f8fafc%22/%3E%3Crect x=%22220%22 y=%22120%22 width=%22360%22 height=%22360%22 rx=%2224%22 fill=%22%23dbeafe%22 stroke=%22%230f172a%22 stroke-width=%2212%22/%3E%3Ctext x=%22400%22 y=%22312%22 font-family=%22Arial%22 font-size=%2248%22 text-anchor=%22middle%22 fill=%22%230f172a%22%3EThr3d%3C/text%3E%3C/svg%3E',
      },
    ],
    photoMetadata: [
      { object_key: 'test/thr3d-photo.jpg', previewUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22/%3E' },
    ],
    receipt: {
      id: 'test-shipment',
      name: 'Regression Shipment',
      clientIds: ['test-client'],
    },
  };
  const record = {
    ...baseRecord,
    planningStatusLabel: finishedRecord?.planningStatusLabel || baseRecord.planningStatusLabel,
    deliverables: finishedRecord?.deliverables || baseRecord.deliverables,
  };
  const planningCard = evaluateMerchandiseReviewAssignment(record, {
    requestedQueueId: QUEUE_IDS.newReview,
    reviewState: 'Needs Review',
    client: { id: 'test-client', name: 'Test Client' },
    planningBoard: MERCHANDISE_PLANNING_BOARD,
  });
  const item = {
    ...buildPlanningCard(record, {
      assignment: planningCard,
      client: { name: 'Test Client' },
      location: { name: 'Test Shelf' },
    }),
    id: record.id,
    merchandiseId: record.id,
    queueLabel: 'New',
    deliverables: finishedRecord?.deliverables || [],
    selectedDeliverableRouteIds: [],
    requiredToShoot: undefined,
    commentCount: 0,
    unreadComments: 0,
  };
  const selectedItem = selectedId ? item : null;
  const photos = recordPhotos(record);
  const outgoingRecords = finishedRecord?.merchStatus === 'Ready to Ship'
    && finishedRecord.deliverables?.length === 1
    && finishedRecord.deliverables[0] === 'Thr3d'
    ? [finishedRecord]
    : [];

  async function finishRegressionVerification(currentItem, state) {
    const updatedRecord = {
      ...currentItem.record,
      deliverables: normalizeDeliverableList(state.deliverables),
      planningStatusLabel: 'Needs More Information',
      merchStatus: 'Ready to Ship',
      released: false,
    };
    setFinishedRecord(updatedRecord);
    setSelectedId('');
    return {
      ok: true,
      message: 'Verification finished. Routed to Thr3d Shipment.',
      stage: 'send-thr3d',
      record: updatedRecord,
    };
  }

  return (
    <div className="work-board-page" data-testid="planning-thr3d-regression">
      <PlanningReleaseView
        sections={PLANNING_RELEASE_SECTIONS}
        items={[item]}
        selectedId={selectedId}
        onSelect={setSelectedId}
        groupByShipment={false}
        disabled={Boolean(selectedItem)}
      />
      {selectedItem && (
        <NewReviewModal
          item={selectedItem}
          decision={{ deliverableRouteIds: [] }}
          onDecisionChange={() => {}}
          onFinish={finishRegressionVerification}
          onClose={() => setSelectedId('')}
          previousItem={null}
          nextItem={null}
          onSelectItem={setSelectedId}
          onRefresh={() => Promise.resolve()}
          photos={photos}
          photoIndex={photoIndex}
          setPhotoIndex={setPhotoIndex}
          comments={[]}
          commentSaving={false}
          commentError=""
          activity={[]}
          onAddComment={() => Promise.resolve(true)}
          onMarkCommentsRead={() => {}}
        />
      )}
      <section className="recv-outgoing-panel" data-testid="thr3d-outgoing-regression">
        <h2>Shipments</h2>
        <h3>THR3D / Outgoing</h3>
        {outgoingRecords.length ? (
          outgoingRecords.map(outgoing => (
            <article className="recv-outgoing-card" key={outgoing.id}>
              <strong>{outgoing.productName}</strong>
              <span>Planning Status: {outgoing.planningStatusLabel}</span>
              <span>Released: {outgoing.released ? 'true' : 'false'}</span>
            </article>
          ))
        ) : (
          <p>No THR3D merchandise is ready to ship.</p>
        )}
      </section>
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
  Admin:        ['/dashboard', '/imports', '/shipments', '/merchandise', '/planning', '/products'],
  Producer:     ['/dashboard', '/imports', '/shipments', '/merchandise', '/planning', '/products'],
  Merch:        ['/shipments', '/merchandise'],
  'Merch Receiver': ['/shipments', '/merchandise'],
  Receiver:     ['/shipments', '/merchandise'],
  User:         ['/dashboard', '/shipments', '/merchandise', '/planning', '/products'],
  PM:           ['/dashboard', '/merchandise', '/planning', '/products'],
  Photographer: ['/dashboard', '/production', '/products'],
  Retoucher:    ['/dashboard', '/production', '/products'],
  Viewer:       ['/dashboard', '/merchandise', '/products'],
};
const ROLES = ['Admin', 'Producer', 'Merch', 'User', 'Viewer'];
const ADMIN_CARD_OPTIONS = [
  { id: 'users', label: 'Users', icon: '👤', description: 'Manage users, PINs, and client access.' },
  { id: 'roles', label: 'Roles', icon: '🔐', description: 'Manage role permissions and admin access.' },
  { id: 'system', label: 'System', icon: '⚙️', description: 'Review Airtable connection and backend configuration.' },
  { id: 'clients', label: 'Clients', icon: '🏷️', description: 'Review client defaults, identifiers, and requirements.' },
  { id: 'creative-force', label: 'Creative Force', icon: '↗', description: 'Review configured handoff requirements and feed eligibility.' },
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
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef(null);

  useEffect(() => {
    api.listLoginUsers().then(d => {
      setUsers((d.records || []).filter(u => u.active));
      setLoadError('');
      setLoading(false);
    }).catch(error => {
      setLoadError(error.message || 'Could not load users.');
      setLoading(false);
    });
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
          {!loading && loadError && (
            <div className="login-load-error" role="alert">
              Could not load users. Make sure the Marks Photo backend is running.
            </div>
          )}
          {!loading && !loadError && users.length === 0 && (
            <div className="login-load-error" role="status">
              No active users are available.
            </div>
          )}
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
    if (activeCard.id === 'creative-force') return <CreativeForceAdminSection />;
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
  { path: '/shipments', label: 'Shipments', icon: <Icon.NavShipments /> },
  { path: '/merchandise', label: 'Merchandise', icon: <Icon.NavMerchandise /> },
  { path: '/planning', label: 'Planning', icon: <Icon.NavWork /> },
  { path: '/products', label: 'Products', icon: <Icon.NavProducts /> },
];

const ADMIN_NAV_ITEM = { path: ADMINISTRATION_DEFAULT_PATH, label: 'Admin', icon: <Icon.Settings /> };

function routeForPage(page, params = {}) {
  const query = new URLSearchParams();
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
    <ProductsPage navigate={navigate} />
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
  thr3dOutgoingCount = 0,
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
            {item.path === '/shipments' && thr3dOutgoingCount > 0 && (
              <span className="topbar-nav-badge" aria-label={`${thr3dOutgoingCount} THR3D items ready to ship`}>
                {thr3dOutgoingCount}
              </span>
            )}
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
  const thr3dOutgoing = useResource(() => api.listThr3dShippingItems());
  const thr3dOutgoingCount = thr3dOutgoing.data?.records?.length || 0;

  useEffect(() => {
    const reloadThr3dQueue = () => thr3dOutgoing.reload({ quiet: true });
    window.addEventListener('thr3d-queue-updated', reloadThr3dQueue);
    return () => window.removeEventListener('thr3d-queue-updated', reloadThr3dQueue);
  }, [thr3dOutgoing.reload]);

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
        thr3dOutgoingCount={thr3dOutgoingCount}
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

  if (import.meta.env.DEV && window.location.pathname === '/__test/planning-thr3d') {
    return (
      <BrowserRouter>
        <PlanningThr3dRegressionPage />
      </BrowserRouter>
    );
  }

  return (
    <AppErrorBoundary>
      <AuthContext.Provider value={{ auth, setAuth, rolePermissions, setRolePermissions }}>
        <BrowserRouter>
          {auth ? <AppLayout /> : <LoginScreen onLogin={setAuth} />}
        </BrowserRouter>
      </AuthContext.Provider>
    </AppErrorBoundary>
  );
}
