// Direct Airtable REST API — no backend required
// Requires VITE_AIRTABLE_TOKEN in .env

const BASE_ID = 'appE30EGZv8OzssDx';
const AT_URL  = `https://api.airtable.com/v0/${BASE_ID}`;
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5057/api';

const TABLES = {
  CLIENTS: 'Clients',
  JOBS:    'Jobs',
  SKUS:    'Items',
  RECEIPTS: 'Receipts',
  LOCATIONS: 'Locations',
  USERS: 'Users',
  ISSUES: 'Issues',
  HISTORY: 'History',
  IMPORTS: 'Imports',
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
  JOB_EXT_ID: 'Job ID',
  JOB_OUTPUT: 'Output Type',
  JOB_STATUS: 'Status',
  JOB_DUE: 'Due',
  JOB_NOTES: 'Notes',
  SKU_NAME: 'Item',
  SKU_CLIENT: 'Client',
  SKU_JOB: 'Job',
  SKU_GTIN_UPC: 'Product ID',
  SKU_CODE_TYPE: 'Code Type',
  SKU_PRODUCT: 'Product Name',
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

async function backend(method, path, body) {
  const isFormData = body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BACKEND_API_URL}${path}`, {
      method,
      headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    throw new Error('Backend API is not running.');
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Backend error ${res.status}`);
  }
  return payload;
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
    productId: f[F.SKU_GTIN_UPC] ?? '',
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
    throw new Error('Product ID must be exactly 12 digits for UPC-12.');
  }
  if (codeType === 'GTIN-14' && !/^\d{14}$/.test(identifier || '')) {
    throw new Error('Product ID must be exactly 14 digits for GTIN-14.');
  }
  if (codeType === 'Item #' && !identifier) {
    throw new Error('Product ID is required for Item #.');
  }
}

export const api = {
  listClients: async () => {
    return backend('GET', '/clients');
  },

  listJobs: async (clientId) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    return backend('GET', `/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  },

  createJob: async ({ clientId, job, name, sgsJobNum, extId, output, status, due, deadline, notes }) => {
    const jobName = job || name || sgsJobNum;
    return backend('POST', '/jobs', { clientId, job: jobName, extId, output, status, due: due || deadline, notes });
  },

  listSkus: async (jobId) => {
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    return backend('GET', `/items${params.toString() ? `?${params.toString()}` : ''}`);
  },

  createSku: async ({ clientId, jobId, productId, gtinUpc, id, codeType, name, product, brand, category, merchVerified, status, notes }) => {
    const identifier = productId || id || gtinUpc;
    validateItemIdentifier(identifier, codeType);
    return backend('POST', '/items', { clientId, jobId, productId: identifier, codeType, name, product, brand, category, merchVerified, status, notes });
  },

  updateSku: async (id, patch) => {
    if ('productId' in patch || 'gtinUpc' in patch || 'identifier' in patch) {
      validateItemIdentifier(patch.productId || patch.identifier || patch.gtinUpc, patch.codeType);
    }
    return backend('PATCH', `/items/${id}`, patch);
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
        imports: TABLES.IMPORTS,
      },
    },
  }),
};

api.listItems = api.listSkus;
api.createItem = api.createSku;
api.updateItem = api.updateSku;

api.adminListItems = () => backend('GET', '/items');
api.adminListLocations = () => backend('GET', '/locations');
api.adminListIssues = () => backend('GET', '/issues');
api.adminUpdateItem = (id, patch) => backend('PATCH', `/items/${id}`, patch);
api.adminUpdateIssue = (id, patch) => backend('PATCH', `/issues/${id}`, patch);
api.adminListHistory = ({ itemId, jobId, userId, limit = 10 } = {}) => {
  const params = new URLSearchParams();
  if (itemId) params.set('itemId', itemId);
  if (jobId) params.set('jobId', jobId);
  if (userId) params.set('userId', userId);
  params.set('limit', String(limit));
  return backend('GET', `/history?${params.toString()}`);
};

api.listImports = ({ limit = 25 } = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  return backend('GET', `/imports?${params.toString()}`);
};

api.getImport = (id) => backend('GET', `/imports/${id}`);

api.intakeListClients = async () => {
  const data = await backend('GET', '/clients');
  return { records: (data.records ?? []).filter(client => client.active) };
};

api.intakeMappingTargets = async () => backend('GET', '/intake/mapping-targets');

api.previewSpreadsheet = async ({ clientId, file }) => {
  const form = new FormData();
  form.append('clientId', clientId);
  form.append('file', file);
  try {
    return await backend('POST', '/intake/preview', form);
  } catch (e) {
    if (e.message === 'Backend API is not running.') {
      throw new Error('Spreadsheet preview service is not running. Start the backend, then try the upload again.');
    }
    throw e;
  }
};

api.reviewSpreadsheetImport = ({ clientId, file, importId }) => {
  const form = new FormData();
  form.append('clientId', clientId);
  form.append('file', file);
  if (importId) form.append('importId', importId);
  return backend('POST', '/intake/review', form);
};

api.executeSpreadsheetImport = ({ clientId, file, importId }) => {
  const form = new FormData();
  form.append('clientId', clientId);
  form.append('file', file);
  if (importId) form.append('importId', importId);
  return backend('POST', '/intake/import', form);
};

api.reviewSpreadsheetRows = ({ clientId, fileName, rows, importId }) => {
  return backend('POST', '/intake/review', { clientId, fileName, rows, importId });
};

api.executeSpreadsheetRows = ({ clientId, fileName, rows, importId }) => {
  return backend('POST', '/intake/import', { clientId, fileName, rows, importId });
};

api.reviewSpreadsheetSourceRows = ({ clientId, fileName, columnHeaders, sourceRows, mapping, importId }) => {
  return backend('POST', '/intake/review', { clientId, fileName, columnHeaders, sourceRows, mapping, importId });
};

api.executeSpreadsheetSourceRows = ({ clientId, fileName, columnHeaders, sourceRows, mapping, importId }) => {
  return backend('POST', '/intake/import', { clientId, fileName, columnHeaders, sourceRows, mapping, importId });
};
