export const DOMAIN_TERMS = {
  product: 'Product',
  products: 'Products',
  productName: 'Product Name',
  productDetails: 'Product Details',
  productJobNumber: 'Product Job Number',
  primaryMatchKey: 'Primary Match Key',
  matchedProduct: 'Matched Product',
  shipment: 'Shipment',
  shipments: 'Shipments',
  currentShipment: 'Current Shipment',
  newShipment: 'New Shipment',
  shipmentNotes: 'Shipment Notes',
  shipmentHistory: 'Shipment History',
  merchandise: 'Merchandise',
  merchandiseReview: 'Merchandise Review',
  packageName: 'Product Name on Package',
  merchandiseIdentifier: 'UPC / ID',
  quantity: 'Quantity',
  condition: 'Condition',
  storageLocation: 'Storage Location',
  technicalAirtableTable: 'Airtable table',
  technicalAirtableField: 'Airtable field',
};

const PRODUCT_FIELD_LABELS = {
  Item: DOMAIN_TERMS.productName,
  'Item Name': DOMAIN_TERMS.productName,
  'Product Name': DOMAIN_TERMS.productName,
  Identifier: DOMAIN_TERMS.primaryMatchKey,
  'Product or File Name': 'Product/File Name',
  'Product/File Name': 'Product/File Name',
  Description: 'Description',
  'Item Job Number': DOMAIN_TERMS.productJobNumber,
  'Product Job Number': DOMAIN_TERMS.productJobNumber,
  'Master or Variant': 'Master or Variant',
  'Pickup Job Number': 'Pickup Job Number',
  Brand: 'Brand',
  'Parent Job Number': 'Parent Job Number',
  'Due Date': 'Due Date',
  Notes: 'Notes',
  'Job Name': 'Job Name',
  'Reference Data': 'Reference Data',
};

const MERCHANDISE_FIELD_LABELS = {
  'Product Name': DOMAIN_TERMS.packageName,
  'Item Name': DOMAIN_TERMS.packageName,
  'Observed Product Name': DOMAIN_TERMS.packageName,
  'Observed Package Name': DOMAIN_TERMS.packageName,
  Identifier: DOMAIN_TERMS.merchandiseIdentifier,
  'SKU / ID': DOMAIN_TERMS.merchandiseIdentifier,
  'Observed Identifier': DOMAIN_TERMS.merchandiseIdentifier,
  SKU: DOMAIN_TERMS.merchandiseIdentifier,
  Quantity: DOMAIN_TERMS.quantity,
  Condition: DOMAIN_TERMS.condition,
  Location: DOMAIN_TERMS.storageLocation,
  'Storage Location': DOMAIN_TERMS.storageLocation,
  Notes: 'Notes',
  Description: 'Description',
};

const TECHNICAL_TABLE_LABELS = {
  Products: DOMAIN_TERMS.products,
  Items: DOMAIN_TERMS.products,
  Shipments: DOMAIN_TERMS.shipments,
  Receipts: DOMAIN_TERMS.shipments,
  Merchandise: DOMAIN_TERMS.merchandise,
  'Receipt Entries': DOMAIN_TERMS.merchandise,
};

export function getFieldLabel(fieldName, context = 'product') {
  if (!fieldName) return '';
  if (context === 'merchandise') return MERCHANDISE_FIELD_LABELS[fieldName] || fieldName;
  return PRODUCT_FIELD_LABELS[fieldName] || fieldName;
}

export function labelWithTechnicalName(label, technicalName, technicalType = DOMAIN_TERMS.technicalAirtableField) {
  return `${label} (${technicalType}: ${technicalName})`;
}

export function technicalFieldLabel(fieldName, context = 'product') {
  return labelWithTechnicalName(getFieldLabel(fieldName, context), fieldName, DOMAIN_TERMS.technicalAirtableField);
}

export function technicalTableLabel(tableName) {
  const label = TECHNICAL_TABLE_LABELS[tableName] || tableName;
  return labelWithTechnicalName(label, tableName, DOMAIN_TERMS.technicalAirtableTable);
}
