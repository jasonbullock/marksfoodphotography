// Direct Airtable REST API — no backend required
// Requires VITE_AIRTABLE_TOKEN in .env

const BASE_ID = 'appE30EGZv8OzssDx';
const AT_URL  = `https://api.airtable.com/v0/${BASE_ID}`;
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5057/api';

const TABLES = {
  CLIENTS: 'Clients',
  JOBS:    'Jobs',
  PRODUCTS: 'Products',
  SHIPMENTS: 'Shipments',
  MERCHANDISE: 'Merchandise',
  LOCATIONS: 'Locations',
  USERS: 'Users',
  ISSUES: 'Issues',
  HISTORY: 'History',
  IMPORTS: 'Imports',
};

TABLES.SKUS = TABLES.PRODUCTS;
TABLES.RECEIPTS = TABLES.SHIPMENTS;

const F = {
  CLIENT_NAME: 'Client',
  CLIENT_IDENTIFIER_TYPE: 'Identifier Type',
  CLIENT_HOLD_DAYS: 'Hold Days',
  CLIENT_DISPO_DAYS: 'Dispo Days',
  CLIENT_JOB_PREFIX: 'Job Prefix',
  CLIENT_ACTIVE: 'Active',
  JOB_NAME: 'Job',
  JOB_CLIENT: 'Client',
  JOB_PARENT_NUMBER: 'Parent Job Number',
  JOB_PERIOD: 'Period',
  JOB_STATUS: 'Status',
  JOB_DUE: 'Due',
  JOB_NOTES: 'Notes',
  SKU_NAME: 'Product Name',
  SKU_CLIENT: 'Client',
  SKU_JOB: 'Job',
  SKU_IDENTIFIER: 'Identifier',
  SKU_IDENTIFIER_TYPE: 'Identifier Type',
  SKU_PRODUCT: 'Product or File Name',
  SKU_ITEM_JOB_NUMBER: 'Product Job Number',
  SKU_DESCRIPTION: 'Description',
  SKU_MASTER_VARIANT: 'Master or Variant',
  SKU_PICKUP_JOB_NUMBER: 'Pickup Job Number',
  SKU_BRAND: 'Brand',
  SKU_CATEGORY: 'Category',
  SKU_NOTES: 'Notes',
  SKU_REFERENCE_DATA: 'Reference Data',
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

async function airtableMeta(path) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}${path}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Airtable metadata error ${res.status}`);
  }
  return res.json();
}

function fieldChoiceNames(field) {
  const choices = field?.options?.choices;
  return Array.isArray(choices)
    ? choices.map(choice => choice?.name).filter(Boolean)
    : [];
}

async function backend(method, path, body) {
  const isFormData = body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BACKEND_API_URL}${path}`, {
      method,
      headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    throw new Error('Backend API is not running.');
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(payload?.error || `Backend error ${res.status}`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function shapeClient(r) {
  const f = r.fields ?? {};
  return {
    id: r.id,
    name: f[F.CLIENT_NAME] ?? '',
    codeType: f[F.CLIENT_IDENTIFIER_TYPE] ?? '',
    identifierLabel: f['Identifier Label'] ?? 'Identifier',
    requiredPhotographyFields: f['Required Photography Fields'] ?? ['Identifier'],
    artworkRequirement: f['Artwork Requirement'] ?? 'Optional',
    merchandiseRequired: f['Merchandise Required'] ?? true,
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
    parentJobNumber: f[F.JOB_PARENT_NUMBER] ?? '',
    extId: f[F.JOB_PARENT_NUMBER] ?? '',
    period: f[F.JOB_PERIOD] ?? '',
    status: f[F.JOB_STATUS] ?? '',
    due: f[F.JOB_DUE] ?? '',
    deadline: f[F.JOB_DUE] ?? '',
    notes: f[F.JOB_NOTES] ?? '',
  };
}

function parseReferenceData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { Raw: String(raw) };
  } catch {
    console.warn('Malformed Reference Data JSON', raw);
    return { Raw: String(raw) };
  }
}

function shapeSku(r) {
  const f = r.fields ?? {};
  const codeType = Array.isArray(f[F.SKU_IDENTIFIER_TYPE]) ? (f[F.SKU_IDENTIFIER_TYPE][0] ?? '') : (f[F.SKU_IDENTIFIER_TYPE] ?? '');
  return {
    id: r.id,
    name: f[F.SKU_NAME] ?? '',
    clientIds: f[F.SKU_CLIENT] ?? [],
    jobIds: f[F.SKU_JOB] ?? [],
    productId: f[F.SKU_IDENTIFIER] ?? '',
    gtinUpc: f[F.SKU_IDENTIFIER] ?? '',
    identifier: f[F.SKU_IDENTIFIER] ?? '',
    codeType,
    product: f[F.SKU_PRODUCT] ?? '',
    itemJobNumber: f[F.SKU_ITEM_JOB_NUMBER] ?? '',
    description: f[F.SKU_DESCRIPTION] ?? '',
    masterOrVariant: f[F.SKU_MASTER_VARIANT] ?? '',
    pickupJobNumber: f[F.SKU_PICKUP_JOB_NUMBER] ?? '',
    brand: f[F.SKU_BRAND] ?? '',
    category: f[F.SKU_CATEGORY] ?? '',
    artworkReceived: f['Artwork Received'] ?? false,
    notes: f[F.SKU_NOTES] ?? '',
    referenceDataRaw: r.referenceDataRaw ?? f[F.SKU_REFERENCE_DATA] ?? '',
    referenceData: r.referenceData ?? parseReferenceData(f[F.SKU_REFERENCE_DATA] ?? ''),
  };
}

function validateItemIdentifier(identifier, codeType, label = 'Identifier') {
  if (codeType === 'UPC-12' && !/^\d{12}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 12 digits.`);
  }
  if (codeType === 'GTIN-14' && !/^\d{14}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 14 digits.`);
  }
  if (codeType === 'GTIN-13' && !/^\d{13}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 13 digits.`);
  }
  if (codeType === 'GTIN-12' && !/^\d{12}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 12 digits.`);
  }
  if (codeType === 'GTIN-8' && !/^\d{8}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 8 digits.`);
  }
  if (codeType === 'Numeric' && !/^\d+$/.test(identifier || '')) {
    throw new Error(`${label} must contain digits only.`);
  }
  if ((codeType === 'Text' || codeType === 'Item #') && !identifier) {
    throw new Error(`${label} is required.`);
  }
}

export const api = {
  listClients: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.all) params.set('all', '1');
    return backend('GET', `/clients${params.toString() ? `?${params.toString()}` : ''}`);
  },

  listActivations: async ({ clientId } = {}) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    return backend('GET', `/activations${params.toString() ? `?${params.toString()}` : ''}`);
  },

  createActivation: async (payload = {}) => backend('POST', '/activations', payload),
  updateActivation: async (id, payload = {}) => backend('PATCH', `/activations/${id}`, payload),

  listJobs: async (clientId) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    return backend('GET', `/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  },

  createJob: async ({ clientId, job, name, sgsJobNum, parentJobNumber, extId, period, due, deadline, notes }) => {
    const jobName = job || name || sgsJobNum;
    return backend('POST', '/jobs', { clientId, job: jobName, parentJobNumber: parentJobNumber || extId, period, due: due || deadline, notes });
  },

  listSkus: async (jobId) => {
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    return backend('GET', `/items${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getItem: (id) => backend('GET', `/items/${id}`),

  createSku: async ({ clientId, jobId, productId, gtinUpc, id, codeType, identifierLabel, name, product, itemJobNumber, description, masterOrVariant, pickupJobNumber, brand, category, notes }) => {
    const identifier = productId || id || gtinUpc;
    validateItemIdentifier(identifier, codeType, identifierLabel);
    return backend('POST', '/items', { clientId, jobId, productId: identifier, codeType, name, product, itemJobNumber, description, masterOrVariant, pickupJobNumber, brand, category, notes });
  },

  updateSku: async (id, patch) => {
    if ('productId' in patch || 'gtinUpc' in patch || 'identifier' in patch) {
      validateItemIdentifier(patch.productId || patch.identifier || patch.gtinUpc, patch.codeType, patch.identifierLabel);
    }
    return backend('PATCH', `/items/${id}`, patch);
  },

  settings: async () => backend('GET', '/settings'),
  randomizeDemoData: async () => backend('POST', '/dev/randomize-demo-data'),
  clearCoreTables: async () => backend('POST', '/dev/clear-core-tables'),
};

api.listItems = api.listSkus;
api.createItem = api.createSku;
api.updateItem = api.updateSku;
api.listProducts = async (jobId) => {
  const params = new URLSearchParams();
  if (jobId) params.set('jobId', jobId);
  return backend('GET', `/products${params.toString() ? `?${params.toString()}` : ''}`);
};
api.getProduct = (id) => backend('GET', `/products/${id}`);

api.listReceipts = async ({ clientId, unassignedClient } = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (unassignedClient) params.set('unassignedClient', 'true');
  return backend('GET', `/receipts${params.toString() ? `?${params.toString()}` : ''}`);
};
api.listShipments = async ({ clientId, unassignedClient } = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (unassignedClient) params.set('unassignedClient', 'true');
  return backend('GET', `/shipments${params.toString() ? `?${params.toString()}` : ''}`);
};
api.listThr3dOutgoing = async () => backend('GET', '/shipments/thr3d-outgoing');

api.createReceipt = async (payload) => backend('POST', '/receiving', payload);
api.startReceivingSession = async (payload) => backend('POST', '/receiving/sessions', payload);
api.getReceivingSession = async (id) => backend('GET', `/receiving/${id}`);
api.updateReceivingSession = async (id, payload) => backend('PATCH', `/receiving/${id}`, payload);
api.createReceiptEntry = async (receiptId, payload) => backend('POST', `/receiving/${receiptId}/entries`, payload);
api.updateReceiptEntry = async (receiptId, entryId, payload) => backend('PATCH', `/receiving/${receiptId}/entries/${entryId}`, payload);
api.deleteReceiptEntry = async (receiptId, entryId) => backend('DELETE', `/receiving/${receiptId}/entries/${entryId}`);
api.uploadReceivingPhotos = async (files, { receiptId, receiptEntryId } = {}) => {
  const form = new FormData();
  Array.from(files || []).forEach(file => form.append('photos', file));
  if (receiptId) form.append('receiptId', receiptId);
  if (receiptEntryId) form.append('receiptEntryId', receiptEntryId);
  return backend('POST', '/receiving/photos', form);
};
api.deleteReceivingPhoto = async (objectKey) => backend('DELETE', '/receiving/photos', { objectKey });
api.deleteReceivingEntryPhoto = async (receiptId, entryId, objectKey) => backend('DELETE', `/receiving/${receiptId}/entries/${entryId}/photos`, { objectKey });
api.receivingPhotoStorageStatus = async () => backend('GET', '/receiving/photo-storage/status');
api.listShipmentPhotos = async (shipmentId) => backend('GET', `/shipments/${shipmentId}/photos`);
api.uploadShipmentPhotos = async (shipmentId, files) => {
  const form = new FormData();
  Array.from(files || []).forEach(file => form.append('photos', file));
  return backend('POST', `/shipments/${shipmentId}/photos`, form);
};
api.deleteShipmentPhoto = async (shipmentId, photoId) => backend('DELETE', `/shipments/${shipmentId}/photos/${photoId}`);
api.listMerchandise = async () => backend('GET', '/merchandise');
api.listVerificationEntries = async () => backend('GET', '/verification/entries');
api.listMerchandiseReviewEntries = async () => backend('GET', '/merchandise/review');
api.searchVerificationItems = async ({ q, clientId, includeItemId } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (clientId) params.set('clientId', clientId);
  if (includeItemId) params.set('includeItemId', includeItemId);
  return backend('GET', `/verification/items${params.toString() ? `?${params.toString()}` : ''}`);
};
api.searchMerchandiseReviewProducts = async ({ q, clientId, includeItemId } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (clientId) params.set('clientId', clientId);
  if (includeItemId) params.set('includeItemId', includeItemId);
  return backend('GET', `/merchandise/products${params.toString() ? `?${params.toString()}` : ''}`);
};
api.matchVerificationEntry = async (entryId, itemId) => backend('POST', `/verification/entries/${entryId}/match`, { itemId });
api.validateVerificationEntry = async (entryId) => backend('POST', `/verification/entries/${entryId}/validate`, { status });
api.verifyMerchandise = async (entryId, payload = {}) => backend('POST', `/merchandise/review/${entryId}/verify`, payload);
api.unverifyMerchandise = async (entryId) => backend('POST', `/merchandise/review/${entryId}/unverify`);
api.matchMerchandiseReviewEntry = async (entryId, productId) => backend('POST', `/merchandise/review/${entryId}/match`, { itemId: productId });
api.validateMerchandiseReviewEntry = async (entryId) => backend('POST', `/merchandise/review/${entryId}/validate`, { status });
api.removeMerchandiseReviewMatch = async (entryId) => backend('POST', `/merchandise/review/${entryId}/remove-match`);
api.updateMerchandiseIntakeDecisions = async (entryId, payload = {}) => backend('PATCH', `/merchandise/${entryId}/intake-decisions`, payload);
api.updateMerchandiseIntakeState = async (entryId, payload = {}) => backend('PATCH', `/merchandise/${entryId}/intake-state`, payload);
api.listMerchandiseComments = async (entryId) => backend('GET', `/merchandise/${entryId}/comments`);
api.createMerchandiseComment = async (entryId, comment) => backend('POST', `/merchandise/${entryId}/comments`, { comment });
api.releaseMerchandiseToProduction = async (entryId) => backend('POST', `/merchandise/${entryId}/release`);
api.markMerchandiseWaitingForProductData = async (entryId, payload = {}) => backend('POST', `/merchandise/review/${entryId}/waiting-product-data`, payload);
api.createMerchandiseReviewIssue = async (entryId, payload = {}) => backend('POST', `/merchandise/review/${entryId}/issue`, payload);
api.listLocations = async () => backend('GET', '/locations');

api.listUsers = async () => backend('GET', '/users');
api.listLoginUsers = async () => backend('GET', '/auth/users');
api.loginUser = async (userId, pin) => backend('POST', '/auth/login', { userId, pin });
api.currentUser = async () => backend('GET', '/auth/me');
api.updateCurrentUser = async (data) => backend('PUT', '/auth/me', data);
api.logoutUser = async () => backend('POST', '/auth/logout');
api.createUser = async (data) => backend('POST', '/users', data);
api.updateUser = async (id, data) => backend('PUT', `/users/${id}`, data);

api.airtableSingleSelectOptions = async ({ tableName, fieldName }) => {
  try {
    const metadata = await airtableMeta('/tables');
    const table = (metadata.tables || []).find(item => item.name === tableName);
    const field = (table?.fields || []).find(item => item.name === fieldName);
    return { options: fieldChoiceNames(field) };
  } catch {
    return { options: [] };
  }
};

api.listImports = ({ limit = 25 } = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  return backend('GET', `/imports?${params.toString()}`);
};

api.getImport = (id) => backend('GET', `/imports/${id}`);

api.getImportClientStatus = (clientId) => {
  const params = new URLSearchParams();
  params.set('clientId', clientId);
  return backend('GET', `/imports/client-status?${params.toString()}`);
};

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
