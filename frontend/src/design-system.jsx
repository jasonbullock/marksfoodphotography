import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageCheck,
  Upload,
  Search,
  X,
} from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function iconNode(Icon, size = 16) {
  return Icon ? <Icon aria-hidden="true" size={size} strokeWidth={2.2} /> : null;
}

export function AppShell({ brand = "Food Hub", subtitle = "Operations", icon: Icon = PackageCheck, nav, search, actions, footer, children }) {
  return (
    <div className="ds-app-shell">
      <header className="ds-app-shell__bar">
        <div className="ds-brand">
          <span className="ds-brand__mark">{iconNode(Icon, 22)}</span>
          <span>
            <strong className="ds-brand__title">{brand}</strong>
            {subtitle && <span className="ds-brand__subtitle">{subtitle}</span>}
          </span>
        </div>
        {nav && <nav className="ds-app-shell__nav" aria-label="Primary">{nav}</nav>}
        {search && <div className="ds-app-shell__search">{search}</div>}
        {actions && <Toolbar>{actions}</Toolbar>}
      </header>
      <main className="ds-app-shell__main">{children}</main>
      {footer}
    </div>
  );
}

export function Page({ children, width = "default" }) {
  return <div className={cx("ds-page", `ds-page--${width}`)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions, meta, density = "normal" }) {
  return (
    <section className={cx("ds-page-header", `ds-page-header--${density}`)}>
      <div className="ds-page-header__copy">
        {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(actions || meta) && (
        <div className="ds-page-header__aside">
          {meta && <span className="ds-page-header__meta">{meta}</span>}
          {actions}
        </div>
      )}
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, actions, titleId }) {
  return (
    <div className="ds-section-header">
      <div>
        {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
        <h2 id={titleId}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </div>
  );
}

function ButtonBase({ children, variant, icon: Icon, trailingIcon: TrailingIcon, type = "button", className, ...props }) {
  return (
    <button className={cx("ds-button", `ds-button--${variant}`, className)} type={type} {...props}>
      {iconNode(Icon)}
      <span>{children}</span>
      {iconNode(TrailingIcon)}
    </button>
  );
}

export function PrimaryButton(props) {
  return <ButtonBase variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <ButtonBase variant="secondary" {...props} />;
}

export function TertiaryButton(props) {
  return <ButtonBase variant="tertiary" {...props} />;
}

export function IconButton({ label, icon: Icon = X, variant = "subtle", type = "button", ...props }) {
  return (
    <button className={cx("ds-icon-button", `ds-icon-button--${variant}`)} type={type} aria-label={label} title={label} {...props}>
      {iconNode(Icon, 18)}
    </button>
  );
}

export function TextInput({ label, description, error, id, className, ...props }) {
  return (
    <Field label={label} description={description} error={error} id={id}>
      <input className={cx("ds-input", className)} id={id} aria-invalid={error ? "true" : undefined} {...props} />
    </Field>
  );
}

export function TextArea({ label, description, error, id, className, ...props }) {
  return (
    <Field label={label} description={description} error={error} id={id}>
      <textarea className={cx("ds-input", className)} id={id} aria-invalid={error ? "true" : undefined} {...props} />
    </Field>
  );
}

export function SearchInput({ label = "Search", id, size = "normal", className, ...props }) {
  return (
    <Field label={label} id={id} hideLabel>
      <div className={cx("ds-search-input", `ds-search-input--${size}`)}>
        {iconNode(Search)}
        <input className={cx("ds-input", className)} id={id} type="search" placeholder="Search" {...props} />
      </div>
    </Field>
  );
}

export function Select({ label, description, error, id, children, className, ...props }) {
  return (
    <Field label={label} description={description} error={error} id={id}>
      <span className="ds-select">
        <select className={cx("ds-input", className)} id={id} aria-invalid={error ? "true" : undefined} {...props}>
          {children}
        </select>
        {iconNode(ChevronDown)}
      </span>
    </Field>
  );
}

export function FileInput({ label, description, id, multiple, accept, onChange }) {
  return (
    <Field label={label} description={description} id={id}>
      <label className="ds-file-input" htmlFor={id}>
        <span className="ds-file-input__icon">{iconNode(Upload, 18)}</span>
        <span>
          <strong>Choose file{multiple ? "s" : ""}</strong>
          <span>or drag photos into this area</span>
        </span>
        <input id={id} type="file" multiple={multiple} accept={accept} onChange={onChange} />
      </label>
    </Field>
  );
}

export function Checkbox({ label, description, id, checked, onChange, ...props }) {
  return (
    <label className="ds-check-control" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} {...props} />
      <span className="ds-check-control__box">{checked && iconNode(Check, 14)}</span>
      <span>
        <span className="ds-check-control__label">{label}</span>
        {description && <span className="ds-check-control__description">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ label, description, id, checked, onChange, hideLabel, ...props }) {
  return (
    <label className="ds-toggle" htmlFor={id}>
      <span className={hideLabel ? "ds-sr-only" : undefined}>
        <span className="ds-toggle__label">{label}</span>
        {description && <span className="ds-toggle__description">{description}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={onChange} {...props} />
      <span className="ds-toggle__track"><span className="ds-toggle__thumb" /></span>
    </label>
  );
}

export function Badge({ children, tone = "neutral", icon: Icon }) {
  return (
    <span className={cx("ds-badge", `ds-badge--${tone}`)}>
      {iconNode(Icon, 13)}
      {children}
    </span>
  );
}

export function StatusPill({ children, tone = "neutral" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function Card({ children, padding = "normal", tone = "neutral", className }) {
  return <section className={cx("ds-card", `ds-card--${padding}`, `ds-card--${tone}`, className)}>{children}</section>;
}

export function SectionGrid({ children, emphasis = "none" }) {
  return <div className={cx("ds-section-grid", `ds-section-grid--${emphasis}`)}>{children}</div>;
}

export function SettingsLayout({ sidebar, children }) {
  return (
    <div className="ds-settings-layout">
      <aside className="ds-settings-layout__sidebar">{sidebar}</aside>
      <section className="ds-settings-layout__main">{children}</section>
    </div>
  );
}

export function SelectionList({ label, children }) {
  return (
    <div className="ds-selection-list" role="listbox" aria-label={label}>
      {children}
    </div>
  );
}

export function SelectionListItem({ selected, children, onClick }) {
  return (
    <button
      className={cx("ds-selection-list__item", selected && "is-selected")}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SearchHero({ children }) {
  return <section className="ds-search-hero">{children}</section>;
}

export function SearchResults({ children }) {
  return <section className="ds-search-results" aria-label="Search results">{children}</section>;
}

export function GlobalSearch({ groups, onResultSelect, placeholder = "Search anything..." }) {
  return (
    <div className="ds-global-search">
      <SearchInput
        id="global-search"
        label="Global search"
        placeholder={placeholder}
        size="global"
      />
      <div className="ds-global-search__results">
        <SearchResults>
          {groups.map((group) => (
            <ResultSection key={group.title} title={group.title}>
              {group.results.slice(0, 5).map((result) => (
                <ResultItem
                  key={`${group.title}-${result.title}`}
                  title={result.title}
                  subtitle={result.subtitle}
                  detail={result.detail}
                  onSelect={() => onResultSelect?.(result)}
                />
              ))}
            </ResultSection>
          ))}
        </SearchResults>
      </div>
    </div>
  );
}

export function ResultSection({ title, children }) {
  return (
    <section className="ds-result-section">
      <h2>{title}</h2>
      <div className="ds-result-section__list">{children}</div>
    </section>
  );
}

export function ResultItem({ title, subtitle, detail, onSelect }) {
  return (
    <button className="ds-result-item" type="button" onClick={onSelect}>
      <span>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </span>
      {detail && <em>{detail}</em>}
    </button>
  );
}

export function QueueCard({ title, subtitle, meta, badge, actions, children }) {
  return (
    <article className="ds-queue-card">
      <div className="ds-queue-card__main">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge}
      </div>
      {(meta || actions) && (
        <div className="ds-queue-card__meta">
          {meta && <div>{meta}</div>}
          {actions}
        </div>
      )}
      {children && <div className="ds-queue-card__body">{children}</div>}
    </article>
  );
}

export function InfoList({ items }) {
  return (
    <dl className="ds-info-list">
      {items.map((item) => (
        <div className="ds-info-item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SettingsGroup({ title, children }) {
  return (
    <section className="ds-settings-group">
      <h3>{title}</h3>
      <div className="ds-settings-group__fields">{children}</div>
    </section>
  );
}

export function SettingsField({ label, value }) {
  return (
    <div className="ds-settings-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ReadinessList({ items }) {
  return (
    <div className="ds-readiness-list">
      {items.map((item) => (
        <div className="ds-readiness-item" key={item.label}>
          <span>{item.label}</span>
          <Badge tone={item.ready ? "success" : "warning"}>{item.ready ? "Ready" : "Needed"}</Badge>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ items }) {
  return (
    <ol className="ds-timeline">
      {items.map((item) => (
        <li className="ds-timeline-item" key={`${item.time}-${item.title}`}>
          <time>{item.time}</time>
          <span>
            <strong>{item.title}</strong>
            {item.description && <em>{item.description}</em>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Toolbar({ children, align = "end" }) {
  return <div className={cx("ds-toolbar", `ds-toolbar--${align}`)}>{children}</div>;
}

export function FilterBar({ search, filters, actions }) {
  return (
    <Card className="ds-filter-bar" padding="compact">
      {search}
      {filters && <div className="ds-filter-bar__filters">{filters}</div>}
      {actions && <Toolbar>{actions}</Toolbar>}
    </Card>
  );
}

export function DataTable({ columns, rows, getRowKey, emptyMessage = "No records found." }) {
  return (
    <div className="ds-table-wrap">
      <table className="ds-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.header} scope="col">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>{emptyMessage}</td></tr>
          ) : rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : index}>
              {columns.map((column) => (
                <td key={column.key || column.header}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ds-data-list">
        {rows.length === 0 ? (
          <div className="ds-data-list__empty">{emptyMessage}</div>
        ) : rows.map((row, index) => (
          <article className="ds-data-list__item" key={getRowKey ? getRowKey(row) : index}>
            {columns.map((column) => (
              <div className="ds-data-list__field" key={column.key || column.header}>
                <span>{column.header}</span>
                <strong>{column.render ? column.render(row) : row[column.key]}</strong>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

export function Form({ children, id, onSubmit }) {
  return <form className="ds-form" id={id} onSubmit={onSubmit}>{children}</form>;
}

export function FormGrid({ children, columns = "two" }) {
  return <div className={cx("ds-form-grid", `ds-form-grid--${columns}`)}>{children}</div>;
}

export function EmptyState({ title, description, icon: Icon, action, size = "normal" }) {
  return (
    <Card className={cx("ds-empty-state", `ds-empty-state--${size}`)}>
      {Icon && <span className="ds-empty-state__icon">{iconNode(Icon, 28)}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </Card>
  );
}

export function LoadingState({ label = "Loading" }) {
  return (
    <div className="ds-loading-state" role="status" aria-live="polite">
      {iconNode(Loader2, 18)}
      <span>{label}</span>
    </div>
  );
}

export function Dialog({ open, title, description, children, footer, onClose, labelledBy = "ds-dialog-title" }) {
  if (!open) return null;

  return (
    <div className="ds-modal-backdrop" role="presentation">
      <section className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <SectionHeader
          title={title}
          titleId={labelledBy}
          description={description}
          actions={onClose && <IconButton label="Close dialog" icon={X} onClick={onClose} />}
        />
        <div className="ds-dialog__body">{children}</div>
        {footer && <footer className="ds-dialog__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function Drawer({ open, title, description, children, footer, onClose, side = "right" }) {
  if (!open) return null;

  return (
    <div className="ds-modal-backdrop ds-modal-backdrop--drawer" role="presentation">
      <aside className={cx("ds-drawer", `ds-drawer--${side}`)} role="dialog" aria-modal="true" aria-label={title}>
        <SectionHeader
          title={title}
          description={description}
          actions={onClose && <IconButton label="Close drawer" icon={X} onClick={onClose} />}
        />
        <div className="ds-drawer__body">{children}</div>
        {footer && <footer className="ds-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Tabs({ tabs, activeId, onChange, label = "Sections" }) {
  return (
    <div className="ds-tabs">
      <div className="ds-tabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cx("ds-tabs__tab", tab.id === activeId && "is-active")}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            aria-controls={`${tab.id}-panel`}
            id={`${tab.id}-tab`}
            onClick={() => onChange?.(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${tab.id}-tab`}
          hidden={tab.id !== activeId}
        >
          {tab.id === activeId && tab.children}
        </div>
      ))}
    </div>
  );
}

export function Footer({ children, previousLabel, nextLabel, onPrevious, onNext }) {
  return (
    <footer className="ds-footer">
      <div>{children}</div>
      {(previousLabel || nextLabel) && (
        <Toolbar>
          {previousLabel && <SecondaryButton icon={ChevronLeft} onClick={onPrevious}>{previousLabel}</SecondaryButton>}
          {nextLabel && <PrimaryButton trailingIcon={ChevronRight} onClick={onNext}>{nextLabel}</PrimaryButton>}
        </Toolbar>
      )}
    </footer>
  );
}

function Field({ label, description, error, id, hideLabel, children }) {
  if (!label) return children;

  return (
    <div className="ds-field">
      <label className={cx("ds-field__label", hideLabel && "ds-sr-only")} htmlFor={id}>{label}</label>
      {children}
      {description && <span className="ds-field__description">{description}</span>}
      {error && <span className="ds-field__error">{error}</span>}
    </div>
  );
}
