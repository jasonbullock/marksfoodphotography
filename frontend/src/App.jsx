import {
  CheckSquare,
  Gauge,
  Inbox,
  PackageCheck,
  PlusCircle,
  Settings,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "./api";

// ── Navigation ─────────────────────────────────────────────────────────────

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "new-job",   label: "New Job",   icon: PlusCircle },
  { id: "jobs",      label: "Jobs",      icon: Inbox },
  { id: "skus",      label: "SKUs",      icon: Tag },
  { id: "settings",  label: "Settings",  icon: Settings },
];

const pageMeta = {
  dashboard: {
    kicker: "Command center",
    title: "Studio overview.",
    description: "Active jobs, readiness gates, and SKU status across all clients.",
  },
  "new-job": {
    kicker: "Intake",
    title: "New Job",
    description: "Create a job and link it to a client. Add SKUs after saving.",
  },
  jobs: {
    kicker: "Production",
    title: "Jobs",
    description: "All active jobs sorted by deadline. Filter by client.",
  },
  skus: {
    kicker: "Products",
    title: "SKUs",
    description: "All SKUs across jobs. Verify merch here.",
  },
  settings: {
    kicker: "Configuration",
    title: "Settings",
    description: "Airtable connection status and table configuration.",
  },
};

// ── Shared hook ─────────────────────────────────────────────────────────────

function useResource(loaderFn, deps) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: "" }));
    loaderFn()
      .then(data => { if (active) setState({ loading: false, error: "", data }); })
      .catch(e   => { if (active) setState({ loading: false, error: e.message, data: null }); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

// ── Shell ───────────────────────────────────────────────────────────────────

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
            <div className="brand-subtitle">Studio Ops</div>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map(item => {
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

// ── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage({ onNavigate }) {
  const jobsRes = useResource(() => api.listJobs(), []);
  const skusRes = useResource(() => api.listSkus(), []);
  const jobs    = jobsRes.data?.records ?? [];
  const skus    = skusRes.data?.records ?? [];

  const stats = [
    { label: "Active jobs",        value: jobs.length,                              trend: "across all clients" },
    { label: "Ready to shoot",     value: skus.filter(s => s.merchVerified && s.gtinUpc).length, trend: "merch + data verified" },
    { label: "Awaiting merch",     value: skus.filter(s => !s.merchVerified).length, trend: "Gate 1 open" },
    { label: "Missing GTIN / UPC", value: skus.filter(s => !s.gtinUpc).length,      trend: "Gate 2 open" },
  ];

  const loading = jobsRes.loading || skusRes.loading;

  return (
    <div className="page-stack">
      <section className="stat-grid" aria-label="Workflow summary">
        {stats.map(s => (
          <article className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{loading ? "—" : s.value}</strong>
            <small>{s.trend}</small>
          </article>
        ))}
      </section>

      <section className="panel full">
        <div className="panel-header">
          <div><h2>Recent jobs</h2></div>
          <button type="button" onClick={() => onNavigate("jobs")}>View all</button>
        </div>
        {jobsRes.loading && <div className="empty-state">Loading…</div>}
        {jobsRes.error   && <div className="error-state">{jobsRes.error}</div>}
        {!jobsRes.loading && jobs.length === 0 && (
          <div className="empty-state">
            No jobs yet.{" "}
            <button className="link-btn" type="button" onClick={() => onNavigate("new-job")}>
              Create one →
            </button>
          </div>
        )}
        {jobs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Period</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                {jobs.slice(0, 8).map(j => (
                  <tr key={j.id}>
                    <td>{j.name}</td>
                    <td>{j.period || "—"}</td>
                    <td>{j.deadline || "—"}</td>
                    <td><StatusBadge value={j.status} /></td>
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

// ── New Job ───────────────────────────────────────────────────────────────────

function NewJobPage({ onNavigate }) {
  const clientsRes = useResource(() => api.listClients(), []);
  const clients    = clientsRes.data?.records ?? [];

  const blank = { clientId: "", sgsJobNum: "", clientBatchId: "", period: "", deadline: "" };
  const [form, setForm]     = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState(null);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const job = await api.createJob(form);
      setSuccess(job);
      setForm(blank);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="panel-header"><h2>Job created</h2></div>
        <p style={{ marginBottom: 20 }}>
          <strong>{success.name}</strong> is ready. Add SKUs to it now.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="primary-action" type="button"
            onClick={() => onNavigate("skus", { jobId: success.id, jobName: success.name })}>
            Add SKUs →
          </button>
          <button className="primary-action" style={{ background: "#e8edde", color: "#203329" }}
            type="button" onClick={() => setSuccess(null)}>
            New job
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      {clientsRes.loading && <div className="empty-state">Loading clients…</div>}
      {error && <div className="error-state" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="form-row">
        <label htmlFor="clientId">Client *</label>
        <select id="clientId" required value={form.clientId} onChange={e => set("clientId", e.target.value)}>
          <option value="">Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="sgsJobNum">SGS Job # *</label>
        <input id="sgsJobNum" type="text" required placeholder="e.g. SGS-24-0123"
          value={form.sgsJobNum} onChange={e => set("sgsJobNum", e.target.value)} />
      </div>

      <div className="form-row">
        <label htmlFor="clientBatchId">Client Batch ID</label>
        <input id="clientBatchId" type="text" placeholder="Client's internal batch or PO"
          value={form.clientBatchId} onChange={e => set("clientBatchId", e.target.value)} />
      </div>

      <div className="form-row">
        <label htmlFor="period">Period</label>
        <input id="period" type="text" placeholder="e.g. July 2026"
          value={form.period} onChange={e => set("period", e.target.value)} />
      </div>

      <div className="form-row">
        <label htmlFor="deadline">Deadline</label>
        <input id="deadline" type="date"
          value={form.deadline} onChange={e => set("deadline", e.target.value)} />
      </div>

      <button className="primary-action" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Create Job"}
      </button>
    </form>
  );
}

// ── Jobs list ─────────────────────────────────────────────────────────────────

function JobsPage({ onNavigate }) {
  const clientsRes  = useResource(() => api.listClients(), []);
  const clients     = clientsRes.data?.records ?? [];
  const [filter, setFilter] = useState("");

  const loader  = useCallback(() => api.listJobs(filter || undefined), [filter]);
  const jobsRes = useResource(loader, [filter]);
  const jobs    = jobsRes.data?.records ?? [];

  return (
    <div className="page-stack">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-action" type="button" onClick={() => onNavigate("new-job")}>
          <PlusCircle size={16} /> New Job
        </button>
      </div>

      <section className="panel full">
        {jobsRes.loading && <div className="empty-state">Loading…</div>}
        {jobsRes.error   && <div className="error-state">{jobsRes.error}</div>}
        {!jobsRes.loading && jobs.length === 0 && <div className="empty-state">No jobs found.</div>}
        {jobs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Job</th><th>SGS #</th><th>Batch</th><th>Period</th><th>Deadline</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>{j.name}</td>
                    <td>{j.sgsJobNum}</td>
                    <td>{j.clientBatchId || "—"}</td>
                    <td>{j.period || "—"}</td>
                    <td>{j.deadline || "—"}</td>
                    <td><StatusBadge value={j.status} /></td>
                    <td>
                      <button className="link-btn" type="button"
                        onClick={() => onNavigate("skus", { jobId: j.id, jobName: j.name })}>
                        SKUs →
                      </button>
                    </td>
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

// ── SKUs ───────────────────────────────────────────────────────────────────────

function SkusPage({ initialJobId, initialJobName }) {
  const jobsRes = useResource(() => api.listJobs(), []);
  const jobs    = jobsRes.data?.records ?? [];

  const [filterJob, setFilterJob] = useState(initialJobId || "");
  const [jobName, setJobName]     = useState(initialJobName || "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const blank = { gtinUpc: "", brand: "", vendor: "", outputType: "Ecomm", masterVariant: "Master", pickupJobNum: "", specialInstr: "", merchVerified: false };
  const [form, setForm] = useState(blank);
  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  const loader  = useCallback(() => api.listSkus(filterJob || undefined), [filterJob, refreshKey]);
  const skusRes = useResource(loader, [filterJob, refreshKey]);
  const skus    = skusRes.data?.records ?? [];

  function handleJobChange(e) {
    const id = e.target.value;
    setFilterJob(id);
    const j = jobs.find(j => j.id === id);
    setJobName(j ? j.name : "");
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!filterJob) { setFormError("Select a job first"); return; }
    setFormError("");
    setSaving(true);
    try {
      await api.createSku({ jobId: filterJob, ...form });
      setForm(blank);
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleMerch(sku) {
    try {
      await api.updateSku(sku.id, { merchVerified: !sku.merchVerified });
      setRefreshKey(k => k + 1);
    } catch (_) { /* swallow */ }
  }

  return (
    <div className="page-stack">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterJob} onChange={handleJobChange} style={{ minWidth: 260 }}>
          <option value="">All jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        {filterJob && (
          <button className="primary-action" type="button" onClick={() => setShowForm(s => !s)}>
            <PlusCircle size={16} /> Add SKU
          </button>
        )}
      </div>

      {showForm && (
        <form className="intake-form" onSubmit={handleAdd} style={{ maxWidth: 700 }}>
          <div className="panel-header"><h2>Add SKU {jobName ? `to ${jobName}` : ""}</h2></div>
          {formError && <div className="error-state" style={{ marginBottom: 14 }}>{formError}</div>}
          <div className="form-grid">
            <div className="form-row">
              <label>GTIN / UPC *</label>
              <input type="text" required placeholder="14 or 12-digit" value={form.gtinUpc} onChange={e => set("gtinUpc", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Brand</label>
              <input type="text" placeholder="Brand name" value={form.brand} onChange={e => set("brand", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Vendor</label>
              <input type="text" placeholder="Vendor name" value={form.vendor} onChange={e => set("vendor", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Output type</label>
              <select value={form.outputType} onChange={e => set("outputType", e.target.value)}>
                <option>Ecomm</option>
                <option>Styled</option>
                <option>Render</option>
              </select>
            </div>
            <div className="form-row">
              <label>Master / Variant</label>
              <select value={form.masterVariant} onChange={e => set("masterVariant", e.target.value)}>
                <option>Master</option>
                <option>Variant</option>
              </select>
            </div>
            <div className="form-row">
              <label>Pick-up Job #</label>
              <input type="text" placeholder="If re-shoot" value={form.pickupJobNum} onChange={e => set("pickupJobNum", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label>Special Instructions</label>
            <input type="text" placeholder="Notes for photography or CF" value={form.specialInstr} onChange={e => set("specialInstr", e.target.value)} />
          </div>
          <div className="form-row form-row--checkbox">
            <label>
              <input type="checkbox" checked={form.merchVerified} onChange={e => set("merchVerified", e.target.checked)} />
              Merch received and verified (Gate 1)
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving…" : "Add SKU"}</button>
            <button className="primary-action" style={{ background: "#e8edde", color: "#203329" }} type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="panel full">
        {skusRes.loading && <div className="empty-state">Loading…</div>}
        {skusRes.error   && <div className="error-state">{skusRes.error}</div>}
        {!skusRes.loading && skus.length === 0 && <div className="empty-state">No SKUs yet{filterJob ? " for this job" : ""}.</div>}
        {skus.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>GTIN / UPC</th><th>Brand</th><th>Type</th><th>M/V</th><th>Gate 1 Merch</th><th>Gate 2 GTIN</th><th>Status</th><th>CF ID</th></tr>
              </thead>
              <tbody>
                {skus.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.gtinUpc || "—"}</code></td>
                    <td>{s.brand || "—"}</td>
                    <td>{s.outputType || "—"}</td>
                    <td>{s.masterVariant || "—"}</td>
                    <td>
                      <button
                        className={s.merchVerified ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"}
                        type="button" title="Toggle merch verified" onClick={() => toggleMerch(s)}>
                        <CheckSquare size={14} />
                        {s.merchVerified ? "Verified" : "Pending"}
                      </button>
                    </td>
                    <td>
                      <span className={s.gtinUpc ? "gate-btn gate-btn--ok" : "gate-btn gate-btn--open"}>
                        {s.gtinUpc ? "Present" : "Missing"}
                      </span>
                    </td>
                    <td><StatusBadge value={s.status} /></td>
                    <td><small style={{ color: "#999" }}>{s.cfProductId || "—"}</small></td>
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

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { data, loading, error } = useResource(() => api.settings(), []);
  const s = data?.settings;

  return (
    <section className="panel full">
      <div className="panel-header"><h2>Connection</h2></div>
      {loading && <div className="empty-state">Loading…</div>}
      {error   && <div className="error-state">{error}</div>}
      {s && (
        <div className="settings-grid">
          <div className="setting-row"><span>Airtable configured</span><strong>{s.airtableConfigured ? "Yes ✓" : "No"}</strong></div>
          <div className="setting-row"><span>Base ID</span><strong>{s.base}</strong></div>
          <div className="setting-row"><span>Clients table</span><strong>{s.tables?.clients}</strong></div>
          <div className="setting-row"><span>Jobs table</span><strong>{s.tables?.jobs}</strong></div>
          <div className="setting-row"><span>SKUs table</span><strong>{s.tables?.skus}</strong></div>
        </div>
      )}
    </section>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function StatusBadge({ value }) {
  if (!value) return <span style={{ color: "#999" }}>—</span>;
  return <span className="status-badge">{value}</span>;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [pageParams, setPageParams] = useState({});

  function navigate(page, params = {}) {
    setActivePage(page);
    setPageParams(params);
  }

  return (
    <Shell activePage={activePage} onNavigate={id => navigate(id)}>
      <PageHeader meta={pageMeta[activePage]} />
      {{
        dashboard: <DashboardPage onNavigate={navigate} />,
        "new-job":  <NewJobPage   onNavigate={navigate} />,
        jobs:       <JobsPage     onNavigate={navigate} />,
        skus:       <SkusPage     initialJobId={pageParams.jobId} initialJobName={pageParams.jobName} />,
        settings:   <SettingsPage />,
      }[activePage]}
    </Shell>
  );
}
