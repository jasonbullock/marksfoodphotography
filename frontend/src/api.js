// Direct Airtable REST API — no backend required
// Set VITE_AIRTABLE_TOKEN in .env

const BASE_ID   = 'appE30EGZv8OzssDx';
const AT_URL    = `https://api.airtable.com/v0/${BASE_ID}`;

const TABLES = {
  CLIENTS: 'tblQe6Fn5yAfqM6H7',
  JOBS:    'tbliPzjwAh96ZA4vS',
  SKUS:    'tblC9Tu69BEOIy6Q4',
};

const F = {
  // Clients
  CLIENT_NAME:               'fldPDaLYrBzgd7UeH',
  CLIENT_JOB_CODE_PREFIX:    'fldMycolmfMPd2URa',
  CLIENT_GTIN_LENGTH:        'flduyn6PNava5wNUX',
  CLIENT_CF_STYLE_GUIDE:     'fld65cAsTYvB0aUDP',
  CLIENT_DELIVERY_PLATFORM:  'fldkLeYO9iTFcIkim',
  // Jobs
  JOB_NAME:            'fldJ7jGXuU5O5HbXO',
  JOB_CLIENT:          'fldrU6lN2EJ5suawK',
  JOB_SGS_JOB_NUM:     'fldE1JZrdsAgrkxPt',
  JOB_CLIENT_BATCH_ID: 'fldGN52XjmW1Hk4pM',
  JOB_PERIOD:          'fld89iGOcHvUhqvq1',
  JOB_DEADLINE:        'fldnOcRSw5w4F9QBH',
  JOB_STATUS:          'fldAQYGVZ1DGWK5et',
  JOB_CF_JOB_ID:       'fldGJUUCLcj7nHRz1',
  // SKUs
  SKU_NAME:           'fld96N7hMpncFfXhJ',
  SKU_JOB:            'fldTkQ5R14otWYKfb',
  SKU_GTIN_UPC:       'fldN2Teu3TDxqMDzx',
  SKU_BRAND:          'fldrb2JaNvtNmL7S5',
  SKU_VENDOR:         'fldnok3l1TUpBhoPv',
  SKU_OUTPUT_TYPE:    'fldQBxwewvqYrxzDI',
  SKU_MASTER_VARIANT: 'fldkenv3gFLizbpyu',
  SKU_PICKUP_JOB_NUM: 'fldiSiaLXDPTGmZAW',
  SKU_SPECIAL_INSTR:  'fldxUE4VQU1vPI1Gv',
  SKU_MERCH_VERIFIED: 'fldCAM9d4Btzlu4pe',
  SKU_SHOOT_DATE:     'fldH2VMN1mpJWS6GX',
  SKU_STATUS:         'fldIBIo4rw2Qhm444',
  SKU_CF_PRODUCT_ID:  'fld2SzRZrHQOMnLXg',
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

// ── Clients ───────────────────────────────────────────────────────────────

function shapeClient(r) {
  const f = r.fields ?? {};
  return {
    id:               r.id,
    name:             f[F.CLIENT_NAME]              ?? '',
    jobCodePrefix:    f[F.CLIENT_JOB_CODE_PREFIX]   ?? '',
    gtinLength:       f[F.CLIENT_GTIN_LENGTH]        ?? null,
    cfStyleGuide:     f[F.CLIENT_CF_STYLE_GUIDE]    ?? '',
    deliveryPlatform: f[F.CLIENT_DELIVERY_PLATFORM] ?? '',
  };
}

// ── Jobs ──────────────────────────────────────────────────────────────────

function shapeJob(r) {
  const f = r.fields ?? {};
  return {
    id:            r.id,
    name:          f[F.JOB_NAME]            ?? '',
    clientIds:     f[F.JOB_CLIENT]          ?? [],
    sgsJobNum:     f[F.JOB_SGS_JOB_NUM]    ?? '',
    clientBatchId: f[F.JOB_CLIENT_BATCH_ID] ?? '',
    period:        f[F.JOB_PERIOD]          ?? '',
    deadline:      f[F.JOB_DEADLINE]        ?? '',
    status:        f[F.JOB_STATUS]          ?? '',
    cfJobId:       f[F.JOB_CF_JOB_ID]      ?? '',
  };
}

// ── SKUs ──────────────────────────────────────────────────────────────────

function shapeSku(r) {
  const f = r.fields ?? {};
  return {
    id:            r.id,
    name:          f[F.SKU_NAME]           ?? '',
    jobIds:        f[F.SKU_JOB]            ?? [],
    gtinUpc:       f[F.SKU_GTIN_UPC]       ?? '',
    brand:         f[F.SKU_BRAND]          ?? '',
    vendor:        f[F.SKU_VENDOR]         ?? '',
    outputType:    f[F.SKU_OUTPUT_TYPE]    ?? '',
    masterVariant: f[F.SKU_MASTER_VARIANT] ?? '',
    pickupJobNum:  f[F.SKU_PICKUP_JOB_NUM] ?? '',
    specialInstr:  f[F.SKU_SPECIAL_INSTR]  ?? '',
    merchVerified: f[F.SKU_MERCH_VERIFIED] ?? false,
    shootDate:     f[F.SKU_SHOOT_DATE]     ?? '',
    status:        f[F.SKU_STATUS]         ?? '',
    cfProductId:   f[F.SKU_CF_PRODUCT_ID]  ?? '',
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export const api = {
  // Clients
  listClients: async () => {
    const d = await at('GET', `${TABLES.CLIENTS}?sort[0][field]=${F.CLIENT_NAME}&sort[0][direction]=asc`);
    return { records: d.records.map(shapeClient) };
  },

  // Jobs
  listJobs: async (clientId) => {
    let path = `${TABLES.JOBS}?sort[0][field]=${F.JOB_DEADLINE}&sort[0][direction]=asc`;
    if (clientId) path += `&filterByFormula=FIND("${clientId}",ARRAYJOIN({${F.JOB_CLIENT}}))`;
    const d = await at('GET', path);
    return { records: d.records.map(shapeJob) };
  },

  createJob: async ({ clientId, sgsJobNum, clientBatchId, period, deadline }) => {
    const name = sgsJobNum + (period ? ` — ${period}` : '');
    const fields = {
      [F.JOB_NAME]:            name,
      [F.JOB_CLIENT]:          [clientId],
      [F.JOB_SGS_JOB_NUM]:    sgsJobNum,
      [F.JOB_CLIENT_BATCH_ID]: clientBatchId,
      [F.JOB_PERIOD]:          period,
    };
    if (deadline) fields[F.JOB_DEADLINE] = deadline;
    const d = await at('POST', TABLES.JOBS, { records: [{ fields }] });
    return shapeJob(d.records[0]);
  },

  // SKUs
  listSkus: async (jobId) => {
    let path = `${TABLES.SKUS}?sort[0][field]=${F.SKU_NAME}&sort[0][direction]=asc`;
    if (jobId) path += `&filterByFormula=FIND("${jobId}",ARRAYJOIN({${F.SKU_JOB}}))`;
    const d = await at('GET', path);
    return { records: d.records.map(shapeSku) };
  },

  createSku: async ({ jobId, gtinUpc, brand, vendor, outputType, masterVariant, pickupJobNum, specialInstr, merchVerified }) => {
    const fields = {
      [F.SKU_NAME]:    gtinUpc,
      [F.SKU_JOB]:     [jobId],
      [F.SKU_GTIN_UPC]: gtinUpc,
    };
    if (brand)         fields[F.SKU_BRAND]          = brand;
    if (vendor)        fields[F.SKU_VENDOR]         = vendor;
    if (outputType)    fields[F.SKU_OUTPUT_TYPE]    = outputType;
    if (masterVariant) fields[F.SKU_MASTER_VARIANT] = masterVariant;
    if (pickupJobNum)  fields[F.SKU_PICKUP_JOB_NUM] = pickupJobNum;
    if (specialInstr)  fields[F.SKU_SPECIAL_INSTR]  = specialInstr;
    if (merchVerified != null) fields[F.SKU_MERCH_VERIFIED] = Boolean(merchVerified);
    const d = await at('POST', TABLES.SKUS, { records: [{ fields }] });
    return shapeSku(d.records[0]);
  },

  updateSku: async (id, patch) => {
    const map = {
      gtinUpc:       F.SKU_GTIN_UPC,
      brand:         F.SKU_BRAND,
      vendor:        F.SKU_VENDOR,
      outputType:    F.SKU_OUTPUT_TYPE,
      masterVariant: F.SKU_MASTER_VARIANT,
      pickupJobNum:  F.SKU_PICKUP_JOB_NUM,
      specialInstr:  F.SKU_SPECIAL_INSTR,
      merchVerified: F.SKU_MERCH_VERIFIED,
      shootDate:     F.SKU_SHOOT_DATE,
      status:        F.SKU_STATUS,
    };
    const fields = {};
    for (const [key, fieldId] of Object.entries(map)) {
      if (key in patch) fields[fieldId] = patch[key];
    }
    const d = await at('PATCH', `${TABLES.SKUS}/${id}`, { fields });
    return shapeSku(d);
  },

  // Settings (local — no backend call needed)
  settings: async () => ({
    settings: {
      airtableConfigured: Boolean(import.meta.env.VITE_AIRTABLE_TOKEN),
      base: BASE_ID,
      tables: { clients: TABLES.CLIENTS, jobs: TABLES.JOBS, skus: TABLES.SKUS },
    },
  }),
};
