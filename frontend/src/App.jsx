import {
  CalendarDays,
  CheckSquare,
  Gauge,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api";

const SYNC_INTERVAL_MS = 5000;

const navigation = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "intake", label: "Intake", icon: PlusCircle },
  { id: "production", label: "Production", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageMeta = {
  overview: {
    kicker: "Studio overview",
    title: "Marks production at a glance.",
    description: "A live view of jobs, SKU readiness, and Creative Force status across every retail client.",
  },
  intake: {
    kicker: "Front door",
    title: "Create jobs and add SKUs.",
    description: "Project managers enter only the data Creative Force needs for product creation and naming conventions.",
  },
  production: {
    kicker: "Readiness",
    title: "Verify merch and schedule shoots.",
    description: "Gate 1 is merch verification. Gate 2 is GTIN / UPC data. When both pass, SKUs are ready to shoot.",
  },
  settings: {
    kicker: "Configuration",
    title: "Connection settings.",
    description: "Airtable base, table IDs, and live sync status for Marks Food Photography.",
  },
};

function useLiveStudioData() {
  const [state, setState] = useState({
    clients: [],
    jobs: [],
    skus: [],
    loading: true,
    syncing: false,
    error: "",
    lastSyncedAt: "",
  });

  const refresh = useCallback(async ({ initial = false } = {}) => {
    setState((current) => ({ ...current, loading: initial ? true : current.loading, syncing: !initial, error: "" }));
    try {
      const [clients, jobs, skus] = await Promise.all([
        api.listClients(),
        api.listJobs(),
        api.listSkus(),
      ]);
      setState({
        clients: clients.records ?? [],
        jobs: jobs.records ?? [],
        skus: skus.records ?? [],
        loading: false,
        syncing: false,
        error: "",
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, syncing: false, error: error.message }));
    }
  }, []);

  useEffect(() => {
    refresh({ initial: true });
    const interval = window.setInterval(() => refresh(), SYNC_INTERVAL_MS);
    const syncWhenVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [refresh]);

  return { ...state, refresh };
}

function clientNameForJob(job, clients) {
  const client = clients.find((candidate) => job.clientIds?.includes(candidate.id));
  return client?.name || "-";
}

function jobForSku(sku, jobs) {
  return jobs.find((job) => sku.jobIds?.includes(job.id));
}

function isReadyToShoot(sku) {
  return Boolean(sku.merchVerified && sku.gtinUpc);
}

function isComplete(sku) {
  return /complete/i.test(sku.status || "");
}

function Shell({ activePage, onNavigate, sync, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><PackageCheck size={22} strokeWidth={2.4} /></div>
          <div>
            <div className="brand-title">Marks Food</div>
            <div className="brand-subtitle">Sierra Studio Ops</div>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={item.id === activePage ? "nav-item active" : "nav-item"} onClick={() => onNavigate(item.id)} type="button">
                <Icon size={18} strokeWidth={2.2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          {sync.syncing ? "Syncing Airtable" : sync.lastSyncedAt ? `Synced ${sync.lastSyncedAt}` : "Live Airtable sync"}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function PageHeader({ meta, sync }) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{meta.kicker}</div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>
      <button className="secondary-action" type="button" onClick={() => sync.refresh()} disabled={sync.syncing}>
        <RefreshCw size={16} />
        {sync.syncing ? "Syncing" : "Refresh"}
      </button>
    </header>
  );
}

function OverviewPage({ data, setPage }) {
  const ready = data.skus.filter((sku) => isReadyToShoot(sku) && !isComplete(sku));
  const awaitingMerch = data.skus.filter((sku) => !sku.merchVerified);
  const missingData = data.skus.filter((sku) => !sku.gtinUpc);
  const complete = data.skus.filter(isComplete);

  const metrics = [
    ["Ready to shoot", ready.length, "both gates passed", "production"],
    ["Awaiting merch", awaitingMerch.length, "Gate 1 open", "production"],
    ["Missing GTIN / UPC", missingData.length, "Gate 2 open", "intake"],
    ["Complete", complete.length, "from CF status", "overview"],
  ];

  const recentJobs = data.jobs.slice(0, 8);

  return (
    <div className="page-stack">
      {data.error && <div className="error-state">{data.error}</div>}
      <section className="stat-grid">
        {metrics.map(([label, value, trend, target]) => (
          <button className="stat-card stat-card-button" key={label} type="button" onClick={() => setPage(target)}>
            <span>{label}</span>
            <strong>{data.loading ? "-" : value}</strong>
            <small>{trend}</small>
          </button>
        ))}
      </section>

      <section className="panel full">
        <div className="panel-header">
          <div>
            <h2>Active work</h2>
            <p>{data.clients.length} clients · {data.jobs.length} jobs · {data.skus.length} SKUs</p>
          </div>
          <button type="button" onClick={() => setPage("intake")}>New intake</button>
        </div>
        {data.loading && <div className="empty-state">Loading Airtable data...</div>}
        {!data.loading && recentJobs.length === 0 && <div className="empty-state">No jobs found.</div>}
        {recentJobs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Client</th><th>Period</th><th>Deadline</th><th>Status</th><th>CF Job</th></tr></thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.name}</td>
                    <td>{clientNameForJob(job, data.clients)}</td>
                    <td>{job.period || "-"}</td>
                    <td>{job.deadline || "-"}</td>
                    <td><StatusBadge value={job.status} /></td>
                    <td>{job.cfJobId || "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function IntakePage({ data, refresh }) {
  return (
    <div className="page-stack two-column-workspace">
      <NewJobForm clients={data.clients} refresh={refresh} />
      <SkuIntake data={data} refresh={refresh} />
    </div>
  );
}

function NewJobForm({ clients, refresh }) {
  const blank = { clientId: "", sgsJobNum: "", clientBatchId: "", period: "", deadline: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const job = await api.createJob(form);
      setForm(blank);
      setMessage(`${job.name} created.`);
      await refresh();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={submit}>
      <div className="panel-header"><h2>New job</h2></div>
      {message && <div className="success-state">{message}</div>}
      {error && <div className="error-state">{error}</div>}
      <Field label="Retail client *"><select required value={form.clientId} onChange={(event) => set("clientId", event.target.value)}><option value="">Select client...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
      <Field label="SGS Job # *"><input required placeholder="e.g. SGS-24-0123" value={form.sgsJobNum} onChange={(event) => set("sgsJobNum", event.target.value)} /></Field>
      <Field label="Client batch ID"><input placeholder="Client batch, PO, or period code" value={form.clientBatchId} onChange={(event) => set("clientBatchId", event.target.value)} /></Field>
      <Field label="Period"><input placeholder="e.g. July 2026" value={form.period} onChange={(event) => set("period", event.target.value)} /></Field>
      <Field label="Deadline"><input type="date" value={form.deadline} onChange={(event) => set("deadline", event.target.value)} /></Field>
      <button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving..." : "Create job"}</button>
    </form>
  );
}

function SkuIntake({ data, refresh }) {
  const [jobId, setJobId] = useState("");
  const blank = { gtinUpc: "", productDescription: "", brand: "", vendor: "", outputType: "Photo + Render", masterVariant: "Master", pickupJobNum: "", specialInstr: "", merchVerified: false };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    if (!jobId) { setError("Select a job first."); return; }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.createSku({ jobId, ...form, brand: form.productDescription || form.brand });
      setForm(blank);
      setMessage("SKU added.");
      await refresh();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="intake-form wide-form" onSubmit={submit}>
      <div className="panel-header"><h2>Add SKU</h2></div>
      {message && <div className="success-state">{message}</div>}
      {error && <div className="error-state">{error}</div>}
      <Field label="Job *"><select required value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="">Select job...</option>{data.jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}</select></Field>
      <div className="form-grid">
        <Field label="GTIN / UPC *"><input required placeholder="14-digit GTIN or 12-digit UPC" value={form.gtinUpc} onChange={(event) => set("gtinUpc", event.target.value)} /></Field>
        <Field label="Product description"><input placeholder="Human-readable name" value={form.productDescription} onChange={(event) => set("productDescription", event.target.value)} /></Field>
        <Field label="Brand"><input placeholder="Brand" value={form.brand} onChange={(event) => set("brand", event.target.value)} /></Field>
        <Field label="Vendor"><input placeholder="Vendor or material code" value={form.vendor} onChange={(event) => set("vendor", event.target.value)} /></Field>
        <Field label="Output type"><select value={form.outputType} onChange={(event) => set("outputType", event.target.value)}><option>Photo only</option><option>Render only</option><option>Photo + Render</option></select></Field>
        <Field label="Master or Variant"><select value={form.masterVariant} onChange={(event) => set("masterVariant", event.target.value)}><option>Master</option><option>Variant</option></select></Field>
      </div>
      <Field label="Pick-up Job #"><input placeholder="Required for variants" value={form.pickupJobNum} onChange={(event) => set("pickupJobNum", event.target.value)} /></Field>
      <Field label="Special instructions"><input placeholder="One combined notes field" value={form.specialInstr} onChange={(event) => set("specialInstr", event.target.value)} /></Field>
      <div className="form-row form-row--checkbox"><label><input type="checkbox" checked={form.merchVerified} onChange={(event) => set("merchVerified", event.target.checked)} />Merch received and verified</label></div>
      <button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving..." : "Add SKU"}</button>
    </form>
  );
}

function ProductionPage({ data, refresh }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState("ready");
  const visibleSkus = useMemo(() => {
    if (filter === "merch") return data.skus.filter((sku) => !sku.merchVerified);
    if (filter === "scheduled") return data.skus.filter((sku) => sku.shootDate === date);
    if (filter === "all") return data.skus;
    return data.skus.filter((sku) => isReadyToShoot(sku) && !isComplete(sku));
  }, [data.skus, date, filter]);

  async function updateSku(sku, patch) {
    await api.updateSku(sku.id, patch);
    await refresh();
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ready">Ready to shoot</option>
          <option value="merch">Needs merch verification</option>
          <option value="scheduled">Shot list by date</option>
          <option value="all">All SKUs</option>
        </select>
        {filter === "scheduled" && <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />}
      </div>
      <section className="panel full">
        {data.loading && <div className="empty-state">Loading production queue...</div>}
        {data.error && <div className="error-state">{data.error}</div>}
        {!data.loading && visibleSkus.length === 0 && <div className="empty-state">No SKUs in this view.</div>}
        {visibleSkus.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>GTIN / UPC</th><th>Job</th><th>Brand</th><th>Output</th><th>Gate 1</th><th>Gate 2</th><th>Shoot date</th><th>Status</th></tr></thead>
              <tbody>
                {visibleSkus.map((sku) => {
                  const job = jobForSku(sku, data.jobs);
                  return (
                    <tr key={sku.id}>
                      <td><code>{sku.gtinUpc || "-"}</code></td>
                      <td>{job?.name || "-"}</td>
                      <td>{sku.brand || "-"}</td>
                      <td>{sku.outputType || "-"}</td>
                      <td><button className={sku.merchVerified ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"} type="button" onClick={() => updateSku(sku, { merchVerified: !sku.merchVerified })}><CheckSquare size={14} />{sku.merchVerified ? "Verified" : "Pending"}</button></td>
                      <td><GateBadge ok={Boolean(sku.gtinUpc)} label={sku.gtinUpc ? "Present" : "Missing"} /></td>
                      <td><input className="table-input" type="date" value={sku.shootDate || ""} onChange={(event) => updateSku(sku, { shootDate: event.target.value })} /></td>
                      <td><StatusBadge value={sku.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPage({ data }) {
  const settings = data.settings;
  return (
    <section className="panel full">
      <div className="panel-header"><h2>Airtable</h2></div>
      {data.error && <div className="error-state">{data.error}</div>}
      <div className="settings-grid">
        <div className="setting-row"><span>Live refresh</span><strong>Every {SYNC_INTERVAL_MS / 1000}s</strong></div>
        <div className="setting-row"><span>Last synced</span><strong>{data.lastSyncedAt || "Pending"}</strong></div>
        <div className="setting-row"><span>Clients</span><strong>{data.clients.length}</strong></div>
        <div className="setting-row"><span>Jobs</span><strong>{data.jobs.length}</strong></div>
        <div className="setting-row"><span>SKUs</span><strong>{data.skus.length}</strong></div>
        {settings && <div className="setting-row"><span>Base ID</span><strong>{settings.base}</strong></div>}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <div className="form-row"><label>{label}</label>{children}</div>;
}

function GateBadge({ ok, label }) {
  return <span className={ok ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"}>{label}</span>;
}

function StatusBadge({ value }) {
  if (!value) return <span className="muted">Pending</span>;
  return <span className="status-badge">{value}</span>;
}

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  const studioData = useLiveStudioData();
  const settingsRes = useMemo(() => ({ base: "appE30EGZv8OzssDx" }), []);
  const data = { ...studioData, settings: settingsRes };
  const meta = pageMeta[activePage];

  const content = {
    overview: <OverviewPage data={data} setPage={setActivePage} />,
    intake: <IntakePage data={data} refresh={studioData.refresh} />,
    production: <ProductionPage data={data} refresh={studioData.refresh} />,
    settings: <SettingsPage data={data} />,
  }[activePage];

  return (
    <Shell activePage={activePage} onNavigate={setActivePage} sync={studioData}>
      <PageHeader meta={meta} sync={studioData} />
      {content}
    </Shell>
  );
}
