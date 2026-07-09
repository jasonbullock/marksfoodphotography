// Direct Airtable REST API — no backend required
// Requires VITE_AIRTABLE_TOKEN in .env

const BASE_ID = 'appE30EGZv8OzssDx';
const AT_URL  = `https://api.airtable.com/v0/${BASE_ID}`;

const TABLES = {
  CLIENTS: 'Clients',
  JOBS:    'Jobs',
  SKUS:    'Items',
  RECEIPTS: 'Receipts',
  LOCATIONS: 'Locations',
  USERS: 'Users',
  ISSUES: 'Issues',
  HISTORY: 'History',
};

const F = {
  CLIENT_NAME: 'Client',
  CLIENT_CODE_TYPE: 'Code Type',
  CLIENT_HOLD_DAYS: 'Hold Days',
  CLIENT_DISPO_DAYS: 'Dispo Days',
  CLIENT_JOB_PREFIX: 'Job Prefix',
  CLIENT_ACTIVE: 'Active',
  JOB_NAME: 'Job',
  JOB_CLIENT: 'Client',
  JOB_EXT_ID: 'Ext ID',
  JOB_OUTPUT: 'Output',
  JOB_STATUS: 'Status',
  JOB_DUE: 'Due',
  JOB_NOTES: 'Notes',
  SKU_NAME: 'Name',
  SKU_CLIENT: 'Client',
  SKU_JOB: 'Job',
  SKU_GTIN_UPC: 'ID',
  SKU_CODE_TYPE: 'Code Type',
  SKU_PRODUCT: 'Product',
  SKU_BRAND: 'Brand',
  SKU_CATEGORY: 'Category',
  SKU_MERCH_VERIFIED: 'Received',
  SKU_REC_DATE: 'Rec Date',
  SKU_LOCATION: 'Location',
  SKU_CONDITION: 'Condition',
  SKU_STATUS: 'Status',
  SKU_NOTES: 'Notes',
  SKU_EXPORTED: 'Exported',
  SKU_EXPORTED_ON: 'Exported On',
  SKU_EXPORT_ERROR: 'Export Error',
};

function token() {
  const t = import.meta.env.VITE_AIRTABLE_TOKEN;
  if (!t) throw new Error('VITE_AIRTABLE_TOKEN is not set in .env');
  return t;
}

async function at(method, path, body) {
  const res = await fetch(`${AT_URL}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Airtable error ${res.status}`);
  }
  return res.json();
}

function shapeClient(r) {
  const f = r.fields ?? {};
  return {
    id: r.id,
    name: f[F.CLIENT_NAME] ?? '',
    codeType: f[F.CLIENT_CODE_TYPE] ?? '',
    holdDays: f[F.CLIENT_HOLD_DAYS] ?? null,
    dispoDays: f[F.CLIENT_DISPO_DAYS] ?? null,
    jobPrefix: f[F.CLIENT_JOB_PREFIX] ?? '',
    active: f[F.CLIENT_ACTIVE] ?? false,
  };
}

function shapeJob(r) {
  const f = r.fields ?? {};
  return {
    id: r.id,
    name: f[F.JOB_NAME] ?? '',
    job: f[F.JOB_NAME] ?? '',
    clientIds: f[F.JOB_CLIENT] ?? [],
    extId: f[F.JOB_EXT_ID] ?? '',
    output: f[F.JOB_OUTPUT] ?? '',
    status: f[F.JOB_STATUS] ?? '',
    due: f[F.JOB_DUE] ?? '',
    deadline: f[F.JOB_DUE] ?? '',
    notes: f[F.JOB_NOTES] ?? '',
  };
}

function shapeSku(r) {
  const f = r.fields ?? {};
  const codeType = Array.isArray(f[F.SKU_CODE_TYPE]) ? (f[F.SKU_CODE_TYPE][0] ?? '') : (f[F.SKU_CODE_TYPE] ?? '');
  return {
    id: r.id,
    name: f[F.SKU_NAME] ?? '',
    clientIds: f[F.SKU_CLIENT] ?? [],
    jobIds: f[F.SKU_JOB] ?? [],
    gtinUpc: f[F.SKU_GTIN_UPC] ?? '',
    identifier: f[F.SKU_GTIN_UPC] ?? '',
    codeType,
    product: f[F.SKU_PRODUCT] ?? '',
    brand: f[F.SKU_BRAND] ?? '',
    category: f[F.SKU_CATEGORY] ?? '',
    merchVerified: f[F.SKU_MERCH_VERIFIED] ?? false,
    received: f[F.SKU_MERCH_VERIFIED] ?? false,
    recDate: f[F.SKU_REC_DATE] ?? '',
    location: '',
    locationIds: Array.isArray(f[F.SKU_LOCATION]) ? f[F.SKU_LOCATION] : [],
    condition: f[F.SKU_CONDITION] ?? '',
    status: f[F.SKU_STATUS] ?? '',
    notes: f[F.SKU_NOTES] ?? '',
  };
}

function validateItemIdentifier(identifier, codeType) {
  if (codeType === 'UPC-12' && !/^\d{12}$/.test(identifier || '')) {
    throw new Error('ID must be exactly 12 digits for UPC-12.');
  }
  if (codeType === 'GTIN-14' && !/^\d{14}$/.test(identifier || '')) {
    throw new Error('ID must be exactly 14 digits for GTIN-14.');
  }
  if (codeType === 'Item #' && !identifier) {
    throw new Error('ID is required for Item #.');
  }
}

export const api = {
  listClients: async () => {
    const d = await at('GET', `${TABLES.CLIENTS}?sort[0][field]=${F.CLIENT_NAME}&sort[0][direction]=asc`);
    return { records: d.records.map(shapeClient) };
  },

  listJobs: async (clientId) => {
    let path = `${TABLES.JOBS}?sort[0][field]=${F.JOB_DUE}&sort[0][direction]=asc`;
    if (clientId) path += `&filterByFormula=FIND("${clientId}",ARRAYJOIN({${F.JOB_CLIENT}}))`;
    const d = await at('GET', path);
    return { records: d.records.map(shapeJob) };
  },

  createJob: async ({ clientId, job, name, sgsJobNum, extId, output, status, due, deadline, notes }) => {
    const jobName = job || name || sgsJobNum;
    const fields = {
      [F.JOB_NAME]: jobName,
      [F.JOB_CLIENT]: [clientId],
    };
    if (extId) fields[F.JOB_EXT_ID] = extId;
    if (output) fields[F.JOB_OUTPUT] = output;
    if (status) fields[F.JOB_STATUS] = status;
    if (due || deadline) fields[F.JOB_DUE] = due || deadline;
    if (notes) fields[F.JOB_NOTES] = notes;
    const d = await at('POST', TABLES.JOBS, { records: [{ fields }] });
    return shapeJob(d.records[0]);
  },

  listSkus: async (jobId) => {
    let path = `${TABLES.SKUS}?sort[0][field]=${F.SKU_NAME}&sort[0][direction]=asc`;
    if (jobId) path += `&filterByFormula=FIND("${jobId}",ARRAYJOIN({${F.SKU_JOB}}))`;
    const d = await at('GET', path);
    return { records: d.records.map(shapeSku) };
  },

  createSku: async ({ clientId, jobId, gtinUpc, id, codeType, name, product, brand, category, merchVerified, status, notes }) => {
    const identifier = id || gtinUpc;
    validateItemIdentifier(identifier, codeType);
    const fields = {
      [F.SKU_NAME]: name || product || identifier,
      [F.SKU_GTIN_UPC]: identifier,
    };
    if (clientId) fields[F.SKU_CLIENT] = [clientId];
    if (jobId) fields[F.SKU_JOB] = [jobId];
    if (product)       fields[F.SKU_PRODUCT]        = product;
    if (brand)         fields[F.SKU_BRAND]          = brand;
    if (category)      fields[F.SKU_CATEGORY]       = category;
    if (merchVerified != null) fields[F.SKU_MERCH_VERIFIED] = Boolean(merchVerified);
    if (status)        fields[F.SKU_STATUS]         = status;
    if (notes)         fields[F.SKU_NOTES]          = notes;
    const d = await at('POST', TABLES.SKUS, { records: [{ fields }] });
    return shapeSku(d.records[0]);
  },

  updateSku: async (id, patch) => {
    if ('gtinUpc' in patch || 'identifier' in patch) {
      validateItemIdentifier(patch.identifier || patch.gtinUpc, patch.codeType);
    }
    const map = {
      clientIds:     F.SKU_CLIENT,
      jobIds:        F.SKU_JOB,
      gtinUpc:       F.SKU_GTIN_UPC,
      identifier:    F.SKU_GTIN_UPC,
      product:       F.SKU_PRODUCT,
      brand:         F.SKU_BRAND,
      category:      F.SKU_CATEGORY,
      merchVerified: F.SKU_MERCH_VERIFIED,
      received:      F.SKU_MERCH_VERIFIED,
      recDate:       F.SKU_REC_DATE,
      locationIds:   F.SKU_LOCATION,
      condition:     F.SKU_CONDITION,
      status:        F.SKU_STATUS,
      notes:         F.SKU_NOTES,
    };
    const fields = {};
    for (const [key, fieldId] of Object.entries(map)) {
      if (key in patch) fields[fieldId] = patch[key];
    }
    const d = await at('PATCH', `${TABLES.SKUS}/${id}`, { fields });
    return shapeSku(d);
  },

  settings: async () => ({
    settings: {
      airtableConfigured: Boolean(import.meta.env.VITE_AIRTABLE_TOKEN),
      base: BASE_ID,
      tables: {
        clients: TABLES.CLIENTS,
        jobs: TABLES.JOBS,
        items: TABLES.SKUS,
        skus: TABLES.SKUS,
        receipts: TABLES.RECEIPTS,
        locations: TABLES.LOCATIONS,
        users: TABLES.USERS,
        issues: TABLES.ISSUES,
        history: TABLES.HISTORY,
      },
    },
  }),
};

api.listItems = api.listSkus;
api.createItem = api.createSku;
api.updateItem = api.updateSku;
