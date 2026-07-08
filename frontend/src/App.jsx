import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Gauge,
  Inbox,
  PackageCheck,
  PlusCircle,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api";

const navigation = [
  { id: "dashboard", label: "Studio Overview", icon: Gauge },
  { id: "new-job", label: "New Job", icon: PlusCircle },
  { id: "skus", label: "Add SKUs", icon: Tag },
  { id: "verify-merch", label: "Verify Merch", icon: CheckSquare },
  { id: "shoot-queue", label: "Shoot Queue", icon: ClipboardList },
  { id: "shot-list", label: "Shot List", icon: CalendarDays },
  { id: "client-dashboard", label: "Client Dashboard", icon: Users },
  { id: "jobs", label: "Jobs", icon: Inbox },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageMeta = {
  dashboard: {
    kicker: "Studio overview",
    title: "One front door for Marks production.",
    description: "Track intake, readiness gates, Creative Force status, and client reporting without rebuilding the downstream production pipeline.",
  },
  "new-job": {
    kicker: "Intake",
    title: "New Job",
    description: "Create the monthly client batch. Creative Force job creation will attach here once the API push is wired.",
  },
  skus: {
    kicker: "Intake",
    title: "Add SKUs",
    description: "Add product records with the minimum data Creative Force needs for product creation and naming conventions.",
  },
  "verify-merch": {
    kicker: "Gate 1",
    title: "Verify Merch",
    description: "Confirm received product is correct. This is the only merch readiness action PMs need to take.",
  },
  "shoot-queue": {
    kicker: "Readiness",
    title: "Shoot Queue",
    description: "SKUs appear here when merch is verified and GTIN / UPC data is present.",
  },
  "shot-list": {
    kicker: "Schedule",
    title: "Shot List",
    description: "Day view of scheduled SKUs for the studio coordinator.",
  },
  "client-dashboard": {
    kicker: "Reporting",
    title: "Client Dashboard",
    description: "Read-only client reporting fed by Creative Force status callbacks.",
  },
  jobs: {
    kicker: "Production",
    title: "Jobs",
    description: "All jobs sorted by deadline. Use this as the control list for monthly batches.",
  },
  settings: {
    kicker: "Configuration",
    title: "Settings",
    description: "Airtable connection status and configured Marks Food Photography table IDs.",
  },
};

function useResource(loaderFn, deps) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    loaderFn()
      .then((data) => {
        if (active) setState({ loading: false, error: "", data });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message, data: null });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

function useStudioData(refreshKey = 0) {
  const clientsRes = useResource(() => api.listClients(), [refreshKey]);
  const jobsRes = useResource(() => api.listJobs(), [refreshKey]);
  const skusRes = useResource(() => api.listSkus(), [refreshKey]);

  const clients = clientsRes.data?.records ?? [];
  const jobs = jobsRes.data?.records ?? [];
  const skus = skusRes.data?.records ?? [];

  return {
    clients,
    jobs,
    skus,
    loading: clientsRes.loading || jobsRes.loading || skusRes.loading,
    error: clientsRes.error || jobsRes.error || skusRes.error,
  };
}

function clientNameForJob(job, clients) {
  const client = clients.find((candidate) => job.clientIds?.includes(candidate.id));
  return client?.name || "—";
}

function jobForSku(sku, jobs) {
  return jobs.find((job) => sku.jobIds?.includes(job.id));
}

function isReadyToShoot(sku) {
  return Boolean(sku.merchVerified && sku.gtinUpc);
}

function Shell({ activePage, onNavigate, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <PackageCheck size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-title">Marks Food</div>
            <div className="brand-subtitle">Sierra Studio Ops</div>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={item.id === activePage ? "nav-item active" : "nav-item"}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon size={18} strokeWidth={2.2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          Airtable connected
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function PageHeader({ meta }) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{meta.kicker}</div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>
    </header>
  );
}

function DashboardPage({ onNavigate }) {
  const { clients, jobs, skus, loading, error } = useStudioData();
  const ready = skus.filter(isReadyToShoot);
  const awaitingMerch = skus.filter((sku) => !sku.merchVerified);
  const inProduction = skus.filter((sku) => /production|review|scheduled/i.test(sku.status));
  const complete = skus.filter((sku) => /complete/i.test(sku.status));

  const stats = [
    { label: "Ready to shoot", value: ready.length, trend: "both gates passed", action: "shoot-queue" },
    { label: "Awaiting merch", value: awaitingMerch.length, trend: "Gate 1 open", action: "verify-merch" },
    { label: "In production", value: inProduction.length, trend: "from CF status", action: "client-dashboard" },
    { label: "Complete", value: complete.length, trend: "ready for archive", action: "client-dashboard" },
  ];

  return (
    <div className="page-stack">
      {error && <div className="error-state">{error}</div>}
      <section className="stat-grid" aria-label="Workflow summary">
        {stats.map((stat) => (
          <button className="stat-card stat-card-button" key={stat.label} type="button" onClick={() => onNavigate(stat.action)}>
            <span>{stat.label}</span>
            <strong>{loading ? "—" : stat.value}</strong>
            <small>{stat.trend}</small>
          </button>
        ))}
      </section>

      <section className="panel full">
        <div className="panel-header">
          <div>
            <h2>Active jobs</h2>
            <p>{clients.length} clients · {jobs.length} jobs · {skus.length} SKUs</p>
          </div>
          <button type="button" onClick={() => onNavigate("new-job")}>New job</button>
        </div>
        {loading && <div className="empty-state">Loading studio overview...</div>}
        {!loading && jobs.length === 0 && <div className="empty-state">No jobs yet.</div>}
        {jobs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Client</th><th>Period</th><th>Deadline</th><th>Status</th><th>CF Job</th></tr></thead>
              <tbody>
                {jobs.slice(0, 10).map((job) => (
                  <tr key={job.id}>
                    <td>{job.name}</td>
                    <td>{clientNameForJob(job, clients)}</td>
                    <td>{job.period || "—"}</td>
                    <td>{job.deadline || "—"}</td>
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

function NewJobPage({ onNavigate }) {
  const clientsRes = useResource(() => api.listClients(), []);
  const clients = clientsRes.data?.records ?? [];

  const blank = { clientId: "", sgsJobNum: "", clientBatchId: "", period: "", deadline: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const job = await api.createJob(form);
      setSuccess(job);
      setForm(blank);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="panel narrow-panel">
        <div className="panel-header"><h2>Job created</h2></div>
        <p><strong>{success.name}</strong> is ready for SKU intake.</p>
        <div className="button-row">
          <button className="primary-action" type="button" onClick={() => onNavigate("skus", { jobId: success.id, jobName: success.name })}>Add SKUs</button>
          <button className="secondary-action" type="button" onClick={() => setSuccess(null)}>Create another</button>
        </div>
      </div>
    );
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      {clientsRes.loading && <div className="empty-state">Loading clients...</div>}
      {error && <div className="error-state">{error}</div>}
      <div className="form-row">
        <label htmlFor="clientId">Retail client *</label>
        <select id="clientId" required value={form.clientId} onChange={(event) => set("clientId", event.target.value)}>
          <option value="">Select client...</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="sgsJobNum">SGS Job # *</label>
        <input id="sgsJobNum" required placeholder="e.g. SGS-24-0123" value={form.sgsJobNum} onChange={(event) => set("sgsJobNum", event.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="clientBatchId">Client batch ID</label>
        <input id="clientBatchId" placeholder="Client batch, PO, or period code" value={form.clientBatchId} onChange={(event) => set("clientBatchId", event.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="period">Period</label>
        <input id="period" placeholder="e.g. July 2026" value={form.period} onChange={(event) => set("period", event.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="deadline">Deadline</label>
        <input id="deadline" type="date" value={form.deadline} onChange={(event) => set("deadline", event.target.value)} />
      </div>
      <button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving..." : "Create job"}</button>
    </form>
  );
}

function JobsPage({ onNavigate }) {
  const { clients, jobs, loading, error } = useStudioData();
  const [filter, setFilter] = useState("");
  const visibleJobs = filter ? jobs.filter((job) => job.clientIds?.includes(filter)) : jobs;

  return (
    <div className="page-stack">
      <Toolbar>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <button className="primary-action" type="button" onClick={() => onNavigate("new-job")}><PlusCircle size={16} /> New Job</button>
      </Toolbar>
      <section className="panel full">
        {loading && <div className="empty-state">Loading jobs...</div>}
        {error && <div className="error-state">{error}</div>}
        {!loading && visibleJobs.length === 0 && <div className="empty-state">No jobs found.</div>}
        {visibleJobs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Client</th><th>SGS #</th><th>Batch</th><th>Period</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {visibleJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.name}</td>
                    <td>{clientNameForJob(job, clients)}</td>
                    <td>{job.sgsJobNum}</td>
                    <td>{job.clientBatchId || "—"}</td>
                    <td>{job.period || "—"}</td>
                    <td>{job.deadline || "—"}</td>
                    <td><StatusBadge value={job.status} /></td>
                    <td><button className="link-btn" type="button" onClick={() => onNavigate("skus", { jobId: job.id, jobName: job.name })}>SKUs</button></td>
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

function SkusPage({ initialJobId, initialJobName }) {
  const jobsRes = useResource(() => api.listJobs(), []);
  const jobs = jobsRes.data?.records ?? [];
  const [filterJob, setFilterJob] = useState(initialJobId || "");
  const [jobName, setJobName] = useState(initialJobName || "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(Boolean(initialJobId));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const blank = { gtinUpc: "", brand: "", vendor: "", outputType: "Photo + Render", masterVariant: "Master", pickupJobNum: "", specialInstr: "", merchVerified: false };
  const [form, setForm] = useState(blank);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  const loader = useCallback(() => api.listSkus(filterJob || undefined), [filterJob, refreshKey]);
  const skusRes = useResource(loader, [filterJob, refreshKey]);
  const skus = skusRes.data?.records ?? [];

  function handleJobChange(event) {
    const id = event.target.value;
    setFilterJob(id);
    const job = jobs.find((candidate) => candidate.id === id);
    setJobName(job ? job.name : "");
  }

  async function handleAdd(event) {
    event.preventDefault();
    if (!filterJob) { setFormError("Select a job first"); return; }
    setFormError("");
    setSaving(true);
    try {
      await api.createSku({ jobId: filterJob, ...form });
      setForm(blank);
      setShowForm(false);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleMerch(sku) {
    try {
      await api.updateSku(sku.id, { merchVerified: !sku.merchVerified });
      setRefreshKey((key) => key + 1);
    } catch (_) {
      // The table will retain the current value if Airtable rejects the update.
    }
  }

  return (
    <div className="page-stack">
      <Toolbar>
        <select value={filterJob} onChange={handleJobChange}>
          <option value="">All jobs</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
        </select>
        {filterJob && <button className="primary-action" type="button" onClick={() => setShowForm((current) => !current)}><PlusCircle size={16} /> Add SKU</button>}
      </Toolbar>
      {showForm && (
        <form className="intake-form wide-form" onSubmit={handleAdd}>
          <div className="panel-header"><h2>Add SKU {jobName ? `to ${jobName}` : ""}</h2></div>
          {formError && <div className="error-state">{formError}</div>}
          <div className="form-grid">
            <Field label="GTIN / UPC *"><input required placeholder="14-digit GTIN or 12-digit UPC" value={form.gtinUpc} onChange={(event) => set("gtinUpc", event.target.value)} /></Field>
            <Field label="Product description"><input placeholder="Human-readable product name" value={form.brand} onChange={(event) => set("brand", event.target.value)} /></Field>
            <Field label="Brand"><input placeholder="Brand" value={form.brand} onChange={(event) => set("brand", event.target.value)} /></Field>
            <Field label="Vendor"><input placeholder="Vendor or Oracle/material code" value={form.vendor} onChange={(event) => set("vendor", event.target.value)} /></Field>
            <Field label="Output type"><select value={form.outputType} onChange={(event) => set("outputType", event.target.value)}><option>Photo only</option><option>Render only</option><option>Photo + Render</option></select></Field>
            <Field label="Master or Variant"><select value={form.masterVariant} onChange={(event) => set("masterVariant", event.target.value)}><option>Master</option><option>Variant</option></select></Field>
            <Field label="Pick-up Job #"><input placeholder="Required for variants" value={form.pickupJobNum} onChange={(event) => set("pickupJobNum", event.target.value)} /></Field>
          </div>
          <Field label="Special instructions"><input placeholder="One combined notes field for shoot, prep, and outlining notes" value={form.specialInstr} onChange={(event) => set("specialInstr", event.target.value)} /></Field>
          <div className="form-row form-row--checkbox"><label><input type="checkbox" checked={form.merchVerified} onChange={(event) => set("merchVerified", event.target.checked)} />Merch received and verified</label></div>
          <div className="button-row"><button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving..." : "Add SKU"}</button><button className="secondary-action" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}
      <SkuTable skus={skus} loading={skusRes.loading} error={skusRes.error} onToggleMerch={toggleMerch} />
    </div>
  );
}

function VerifyMerchPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { jobs, skus, loading, error } = useStudioData(refreshKey);
  const pending = skus.filter((sku) => !sku.merchVerified);

  async function verify(sku) {
    await api.updateSku(sku.id, { merchVerified: true });
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="panel full">
      {loading && <div className="empty-state">Loading merch verification queue...</div>}
      {error && <div className="error-state">{error}</div>}
      {!loading && pending.length === 0 && <div className="empty-state">No SKUs are waiting on merch verification.</div>}
      {pending.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>GTIN / UPC</th><th>Job</th><th>Brand</th><th>Output</th><th>Gate 2 Data</th><th></th></tr></thead>
            <tbody>
              {pending.map((sku) => {
                const job = jobForSku(sku, jobs);
                return (
                  <tr key={sku.id}>
                    <td><code>{sku.gtinUpc || "—"}</code></td>
                    <td>{job?.name || "—"}</td>
                    <td>{sku.brand || "—"}</td>
                    <td>{sku.outputType || "—"}</td>
                    <td><GateBadge ok={Boolean(sku.gtinUpc)} label={sku.gtinUpc ? "Ready" : "Missing"} /></td>
                    <td><button className="primary-action compact" type="button" onClick={() => verify(sku)}>Verify merch</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ShootQueuePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { jobs, skus, loading, error } = useStudioData(refreshKey);
  const ready = skus.filter((sku) => isReadyToShoot(sku) && !/complete/i.test(sku.status));

  async function setShootDate(sku, shootDate) {
    await api.updateSku(sku.id, { shootDate });
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="panel full">
      {loading && <div className="empty-state">Loading shoot queue...</div>}
      {error && <div className="error-state">{error}</div>}
      {!loading && ready.length === 0 && <div className="empty-state">No SKUs have both gates passed yet.</div>}
      {ready.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>GTIN / UPC</th><th>Job</th><th>Brand</th><th>Output</th><th>Status</th><th>Shoot date</th></tr></thead>
            <tbody>
              {ready.map((sku) => {
                const job = jobForSku(sku, jobs);
                return (
                  <tr key={sku.id}>
                    <td><code>{sku.gtinUpc}</code></td>
                    <td>{job?.name || "—"}</td>
                    <td>{sku.brand || "—"}</td>
                    <td>{sku.outputType || "—"}</td>
                    <td><StatusBadge value={sku.status || "Ready"} /></td>
                    <td><input className="table-input" type="date" value={sku.shootDate || ""} onChange={(event) => setShootDate(sku, event.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ShotListPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { jobs, skus, loading, error } = useStudioData();
  const scheduled = skus.filter((sku) => sku.shootDate === date);

  return (
    <div className="page-stack">
      <Toolbar><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Toolbar>
      <section className="panel full">
        {loading && <div className="empty-state">Loading shot list...</div>}
        {error && <div className="error-state">{error}</div>}
        {!loading && scheduled.length === 0 && <div className="empty-state">No SKUs are scheduled for this date.</div>}
        {scheduled.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>GTIN / UPC</th><th>Job</th><th>Brand</th><th>Output</th><th>Notes</th><th>CF ID</th></tr></thead>
              <tbody>
                {scheduled.map((sku) => {
                  const job = jobForSku(sku, jobs);
                  return <tr key={sku.id}><td><code>{sku.gtinUpc}</code></td><td>{job?.name || "—"}</td><td>{sku.brand || "—"}</td><td>{sku.outputType || "—"}</td><td>{sku.specialInstr || "—"}</td><td>{sku.cfProductId || "Pending"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ClientDashboardPage() {
  const { clients, jobs, skus, loading, error } = useStudioData();
  const [clientId, setClientId] = useState("");
  const visibleJobs = clientId ? jobs.filter((job) => job.clientIds?.includes(clientId)) : jobs;
  const visibleJobIds = new Set(visibleJobs.map((job) => job.id));
  const visibleSkus = clientId ? skus.filter((sku) => sku.jobIds?.some((id) => visibleJobIds.has(id))) : skus;
  const byStatus = useMemo(() => {
    return visibleSkus.reduce((counts, sku) => {
      const status = sku.status || "Pending";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
  }, [visibleSkus]);

  return (
    <div className="page-stack">
      <Toolbar><select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Toolbar>
      {error && <div className="error-state">{error}</div>}
      <section className="stat-grid">
        <Metric label="Jobs" value={loading ? "—" : visibleJobs.length} trend="selected scope" />
        <Metric label="SKUs" value={loading ? "—" : visibleSkus.length} trend="client reporting" />
        <Metric label="Ready" value={loading ? "—" : visibleSkus.filter(isReadyToShoot).length} trend="both gates" />
        <Metric label="Complete" value={loading ? "—" : visibleSkus.filter((sku) => /complete/i.test(sku.status)).length} trend="from CF" />
      </section>
      <section className="panel full">
        <div className="panel-header"><h2>Status from Creative Force</h2></div>
        {Object.keys(byStatus).length === 0 ? <div className="empty-state">No status records for this selection.</div> : <div className="status-grid">{Object.entries(byStatus).map(([status, count]) => <Metric key={status} label={status} value={count} trend="SKUs" />)}</div>}
      </section>
    </div>
  );
}

function SettingsPage() {
  const { data, loading, error } = useResource(() => api.settings(), []);
  const settings = data?.settings;

  return (
    <section className="panel full">
      <div className="panel-header"><h2>Connection</h2></div>
      {loading && <div className="empty-state">Loading settings...</div>}
      {error && <div className="error-state">{error}</div>}
      {settings && (
        <div className="settings-grid">
          <div className="setting-row"><span>Airtable configured</span><strong>{settings.airtableConfigured ? "Yes" : "No"}</strong></div>
          <div className="setting-row"><span>Base ID</span><strong>{settings.base}</strong></div>
          <div className="setting-row"><span>Clients table</span><strong>{settings.tables?.clients}</strong></div>
          <div className="setting-row"><span>Jobs table</span><strong>{settings.tables?.jobs}</strong></div>
          <div className="setting-row"><span>SKUs table</span><strong>{settings.tables?.skus}</strong></div>
        </div>
      )}
    </section>
  );
}

function SkuTable({ skus, loading, error, onToggleMerch }) {
  return (
    <section className="panel full">
      {loading && <div className="empty-state">Loading SKUs...</div>}
      {error && <div className="error-state">{error}</div>}
      {!loading && skus.length === 0 && <div className="empty-state">No SKUs yet.</div>}
      {skus.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>GTIN / UPC</th><th>Brand</th><th>Output</th><th>M/V</th><th>Gate 1</th><th>Gate 2</th><th>Status</th><th>CF ID</th></tr></thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id}>
                  <td><code>{sku.gtinUpc || "—"}</code></td>
                  <td>{sku.brand || "—"}</td>
                  <td>{sku.outputType || "—"}</td>
                  <td>{sku.masterVariant || "—"}</td>
                  <td><button className={sku.merchVerified ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"} type="button" onClick={() => onToggleMerch?.(sku)}><CheckSquare size={14} />{sku.merchVerified ? "Verified" : "Pending"}</button></td>
                  <td><GateBadge ok={Boolean(sku.gtinUpc)} label={sku.gtinUpc ? "Present" : "Missing"} /></td>
                  <td><StatusBadge value={sku.status} /></td>
                  <td><small className="muted">{sku.cfProductId || "—"}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }) {
  return <div className="form-row"><label>{label}</label>{children}</div>;
}

function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

function Metric({ label, value, trend }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong><small>{trend}</small></article>;
}

function GateBadge({ ok, label }) {
  return <span className={ok ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"}>{label}</span>;
}

function StatusBadge({ value }) {
  if (!value) return <span className="muted">Pending</span>;
  return <span className="status-badge">{value}</span>;
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [pageParams, setPageParams] = useState({});

  function navigate(page, params = {}) {
    setActivePage(page);
    setPageParams(params);
  }

  const content = {
    dashboard: <DashboardPage onNavigate={navigate} />,
    "new-job": <NewJobPage onNavigate={navigate} />,
    jobs: <JobsPage onNavigate={navigate} />,
    skus: <SkusPage initialJobId={pageParams.jobId} initialJobName={pageParams.jobName} />,
    "verify-merch": <VerifyMerchPage />,
    "shoot-queue": <ShootQueuePage />,
    "shot-list": <ShotListPage />,
    "client-dashboard": <ClientDashboardPage />,
    settings: <SettingsPage />,
  }[activePage];

  return (
    <Shell activePage={activePage} onNavigate={(id) => navigate(id)}>
      <PageHeader meta={pageMeta[activePage]} />
      {content}
    </Shell>
  );
}
