// Every call goes through the Marks Photo API. The browser holds no Airtable
// credential: a VITE_* value is compiled into the public bundle, so a token
// here would be readable by anyone who loads the site.
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
  CLIENT_ACTIVE: 'Active',
  JOB_NOTES: 'Notes',
  SKU_NAME: 'Product Name',
  SKU_CLIENT: 'Client',
  SKU_IDENTIFIER: 'Identifier',
  SKU_UPC: 'UPC',
  SKU_CVID: 'CVID',
  SKU_BRAND_PREFIX: 'Brand Prefix',
  SKU_REQUEST_TYPE: 'Request Type',
  SKU_PROJECT_STATUS: 'Project Status',
  SKU_WKFT_JOB_NUMBER: 'WKFT Job Number',
  SKU_MBOX_NUMBER: 'Mbox Number',
  SKU_PRODUCT_TYPE: 'Product Type',
  SKU_FILE_NAME_DESCRIPTION: 'File Name Description',
  SKU_PREPRO_OVERLAYS: 'Link to Prepro/Overlays',
  SKU_ECOMM_PHOTO_NOTES: 'Ecomm Photo Notes',
  SKU_PATH_TO_ART: 'Path to Art',
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
    name: r.name ?? f[F.CLIENT_NAME] ?? '',
    codeType: r.codeType ?? f[F.CLIENT_IDENTIFIER_TYPE] ?? '',
    identifierLabel: r.identifierLabel ?? f['Identifier Label'] ?? 'Primary Match Key',
    primaryMatchKeyLabel: r.primaryMatchKeyLabel ?? f['Identifier Label'] ?? 'Primary Match Key',
    upc: f['UPC'] ?? f['Identifier'] ?? '',
    cvid: f['CVID'] ?? '',
    brandPrefix: f['Brand Prefix'] ?? '',
    requiredToShoot: r.requiredToShoot ?? f['Required to Shoot'] ?? ['Identifier'],
    artworkRequirement: r.artworkRequirement ?? f['Artwork Requirement'] ?? 'Optional',
    merchandiseRequired: r.merchandiseRequired ?? f['Merchandise Required'] ?? true,
    holdDays: r.holdDays ?? f[F.CLIENT_HOLD_DAYS] ?? null,
    dispoDays: r.dispoDays ?? f[F.CLIENT_DISPO_DAYS] ?? null,
    readinessProfile: r.readinessProfile ?? f.readinessProfile ?? null,
    sourceCheckRules: r.sourceCheckRules ?? f.sourceCheckRules ?? null,
    active: r.active ?? f[F.CLIENT_ACTIVE] ?? false,
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
    productId: f[F.SKU_IDENTIFIER] ?? '',
    gtinUpc: f[F.SKU_IDENTIFIER] ?? '',
    identifier: f[F.SKU_IDENTIFIER] ?? '',
    primaryMatchKey: f[F.SKU_IDENTIFIER] ?? '',
    codeType,
    upc: f[F.SKU_UPC] ?? f[F.SKU_IDENTIFIER] ?? '',
    cvid: f[F.SKU_CVID] ?? '',
    brandPrefix: f[F.SKU_BRAND_PREFIX] ?? '',
    requestType: f[F.SKU_REQUEST_TYPE] ?? '',
    projectStatus: f[F.SKU_PROJECT_STATUS] ?? '',
    wkftJobNumber: f[F.SKU_WKFT_JOB_NUMBER] ?? '',
    mboxNumber: f[F.SKU_MBOX_NUMBER] ?? '',
    productType: f[F.SKU_PRODUCT_TYPE] ?? '',
    fileNameDescription: f[F.SKU_FILE_NAME_DESCRIPTION] ?? '',
    preproOverlays: f[F.SKU_PREPRO_OVERLAYS] ?? '',
    ecommPhotoNotes: f[F.SKU_ECOMM_PHOTO_NOTES] ?? '',
    pathToArt: f[F.SKU_PATH_TO_ART] ?? '',
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

function validateItemIdentifier(identifier, codeType, label = 'Primary Match Key') {
  if (codeType === 'GTIN-14' && !/^\d{14}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 14 digits.`);
  }
  if (codeType === 'GTIN-13' && !/^\d{13}$/.test(identifier || '')) {
    throw new Error(`${label} must be exactly 13 digits.`);
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

  updateClient: async (id, payload = {}) => backend('PATCH', `/clients/${id}`, payload),

  listActivations: async ({ clientId } = {}) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    return backend('GET', `/activations${params.toString() ? `?${params.toString()}` : ''}`);
  },

  createActivation: async (payload = {}) => backend('POST', '/activations', payload),
  updateActivation: async (id, payload = {}) => backend('PATCH', `/activations/${id}`, payload),
  moveActivationToPhoto: async (id) => backend('POST', `/activations/${id}/move-to-photo`),

  listSkus: async () => backend('GET', '/items'),

  getItem: (id) => backend('GET', `/items/${id}`),

  createSku: async ({ clientId, primaryMatchKey, productId, gtinUpc, id, codeType, identifierLabel, primaryMatchKeyLabel, name, product, itemJobNumber, description, masterOrVariant, pickupJobNumber, brand, category, notes }) => {
    const identifier = primaryMatchKey || productId || id || gtinUpc;
    validateItemIdentifier(identifier, codeType, primaryMatchKeyLabel || identifierLabel);
    return backend('POST', '/items', { clientId, primaryMatchKey: identifier, productId: identifier, codeType, name, product, itemJobNumber, description, masterOrVariant, pickupJobNumber, brand, category, notes });
  },

  updateSku: async (id, patch) => {
    if ('primaryMatchKey' in patch || 'productId' in patch || 'gtinUpc' in patch || 'identifier' in patch) {
      validateItemIdentifier(patch.primaryMatchKey || patch.productId || patch.identifier || patch.gtinUpc, patch.codeType, patch.primaryMatchKeyLabel || patch.identifierLabel);
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
api.listProducts = async () => backend('GET', '/products');
api.commitStructureForms = async (payload) => backend('POST', '/intake/structure-form/commit', payload);
api.previewStructureForms = async (files) => {
  const body = new FormData();
  files.forEach(file => body.append('files', file));
  return backend('POST', '/intake/structure-form/preview', body);
};
api.topcoSourceCheck = async ({ limit = 20 } = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  return backend('GET', `/source-check/topco${params.toString() ? `?${params.toString()}` : ''}`);
};
api.resolveUpc = async ({ upc, clientId } = {}) => {
  const params = new URLSearchParams();
  if (upc) params.set('upc', upc);
  if (clientId) params.set('clientId', clientId);
  return backend('GET', `/products/resolve-upc?${params.toString()}`);
};

api.topcoSourceSuggestions = async ({ clientId, productName, upc, limit } = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (productName) params.set('productName', productName);
  if (upc) params.set('upc', upc);
  if (limit) params.set('limit', String(limit));
  return backend('GET', `/source-check/topco/suggestions${params.toString() ? `?${params.toString()}` : ''}`);
};
api.activateTopcoSourceRow = ({ sourceRowNumber, clientId }) => {
  return backend('POST', '/source-check/topco/activate', { sourceRowNumber, clientId });
};
api.refreshTopcoSourceLinkedProducts = ({ clientId, limit } = {}) => {
  return backend('POST', '/source-check/topco/refresh-linked-products', { clientId, limit });
};
api.getProduct = (id) => backend('GET', `/products/${id}`);
api.updateProduct = async (id, patch) => {
  if ('primaryMatchKey' in patch || 'productId' in patch || 'gtinUpc' in patch || 'identifier' in patch) {
    validateItemIdentifier(patch.primaryMatchKey || patch.productId || patch.identifier || patch.gtinUpc, patch.codeType, patch.primaryMatchKeyLabel || patch.identifierLabel);
  }
  return backend('PATCH', `/products/${id}`, patch);
};
api.deleteProduct = (id) => backend('DELETE', `/products/${id}`);

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

api.createReceipt = async (payload) => backend('POST', '/receiving', payload);
api.startReceivingSession = async (payload) => backend('POST', '/receiving/sessions', payload);
api.getReceivingSession = async (id) => backend('GET', `/receiving/${id}`);
api.finishReceivingSession = async (id) => backend('POST', `/receiving/${id}/finish`);
api.listPrinters = async () => backend('GET', '/printers');
api.createPrinter = async payload => backend('POST', '/printers', payload);
api.updatePrinter = async (id, payload) => backend('PATCH', `/printers/${id}`, payload);
api.selectPrinter = async id => backend('POST', `/printers/${id}/select`);
api.testPrinter = async id => backend('POST', `/printers/${id}/test`);
api.printMerchandiseTag = async (entryId, payload = {}) => backend('POST', `/merchandise/${entryId}/tag`, payload);
api.updateReceivingSession = async (id, payload) => backend('PATCH', `/receiving/${id}`, payload);
api.deleteReceivingSession = async (id) => backend('DELETE', `/shipments/${id}`);
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
api.listCommentReads = async () => backend('GET', '/comment-reads');
api.markCommentRead = async id => backend('POST', `/comment-reads/${id}`);
api.listWorkstreamCards = async () => backend('GET', '/workstream-cards');
api.createWorkstreamCard = async payload => backend('POST', '/workstream-cards', payload);
api.updateWorkstreamCard = async (id, payload) => backend('PATCH', `/workstream-cards/${id}`, payload);
api.deleteWorkstreamCard = async id => backend('DELETE', `/workstream-cards/${id}`);
api.getCreativeForceHandoff = async (id) => backend('GET', `/workstream-cards/${id}/creative-force-handoff`);
api.linkCreativeForceWorkUnit = async (id, payload) => backend('PATCH', `/workstream-cards/${id}/creative-force-link`, payload);
api.previewCreativeForceProductFeed = async () => backend('GET', '/integrations/creative-force/product-feed/preview');
api.getCreativeForceWebhookDiagnostics = async () => backend('GET', '/integrations/creative-force/webhook/diagnostics');
api.listThr3dShippingItems = async () => backend('GET', '/thr3d-shipping-items');
api.shipThr3dShippingItem = async (id, payload) => backend('POST', `/thr3d-shipping-items/${id}/ship`, payload);
api.searchVerificationItems = async ({ q, clientId, includeItemId } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (clientId) params.set('clientId', clientId);
  if (includeItemId) params.set('includeItemId', includeItemId);
  return backend('GET', `/verification/items${params.toString() ? `?${params.toString()}` : ''}`);
};
api.searchMerchandiseReviewProducts = async ({ q, clientId, includeItemId, limit } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (clientId) params.set('clientId', clientId);
  if (includeItemId) params.set('includeItemId', includeItemId);
  if (limit) params.set('limit', String(limit));
  return backend('GET', `/merchandise/products${params.toString() ? `?${params.toString()}` : ''}`);
};
api.matchVerificationEntry = async (entryId, itemId) => backend('POST', `/verification/entries/${entryId}/match`, { itemId });
api.validateVerificationEntry = async (entryId) => backend('POST', `/verification/entries/${entryId}/validate`, { status });
api.verifyMerchandise = async (entryId, payload = {}) => backend('POST', `/merchandise/review/${entryId}/verify`, payload);
api.unverifyMerchandise = async (entryId) => backend('POST', `/merchandise/review/${entryId}/unverify`);
api.matchMerchandiseReviewEntry = async (entryId, productId) => backend('POST', `/merchandise/review/${entryId}/match`, { itemId: productId });
api.activateMerchandiseSourceRow = async (entryId, { sourceRowNumber } = {}) => backend('POST', `/merchandise/${entryId}/activate-source-row`, { sourceRowNumber });
api.validateMerchandiseReviewEntry = async (entryId) => backend('POST', `/merchandise/review/${entryId}/validate`, { status });
api.removeMerchandiseReviewMatch = async (entryId) => backend('POST', `/merchandise/review/${entryId}/remove-match`);
api.updateMerchandiseIntakeDecisions = async (entryId, payload = {}) => backend('PATCH', `/merchandise/${entryId}/intake-decisions`, payload);
api.updateMerchandiseIntakeState = async (entryId, payload = {}) => backend('PATCH', `/merchandise/${entryId}/intake-state`, payload);
api.confirmAssignMerchandise = async (entryId, payload = {}) => backend('POST', `/merchandise/${entryId}/confirm-assign`, payload);
api.listMerchandiseComments = async (entryId) => backend('GET', `/merchandise/${entryId}/comments`);
api.listMerchandiseHistory = async (entryId) => backend('GET', `/merchandise/${entryId}/history`);
api.createMerchandiseComment = async (entryId, comment) => backend('POST', `/merchandise/${entryId}/comments`, { comment });
api.releaseMerchandiseToProduction = async (entryId, workstreamType = '') => backend('POST', `/merchandise/${entryId}/release`, workstreamType ? { workstreamType } : {});
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
  const params = new URLSearchParams({ tableName, fieldName });
  try {
    return await backend('GET', `/airtable/single-select-options?${params.toString()}`);
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

api.previewSpreadsheet = async ({ clientId, file, headerRow = '' }) => {
  const form = new FormData();
  form.append('clientId', clientId);
  form.append('file', file);
  if (headerRow) form.append('headerRow', headerRow);
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
