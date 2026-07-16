export const DOMAIN_TERMS = {
  product: 'Product',
  products: 'Products',
  productName: 'Product Name',
  productDetails: 'Product Details',
  productJobNumber: 'Product Job Number',
  matchedProduct: 'Matched Product',
  shipment: 'Shipment',
  shipments: 'Shipments',
  currentShipment: 'Current Shipment',
  newShipment: 'New Shipment',
  shipmentNotes: 'Shipment Notes',
  shipmentHistory: 'Shipment History',
  merchandise: 'Merchandise',
  merchandiseReview: 'Merchandise Review',
  packageName: 'Package Name',
  merchandiseIdentifier: 'Barcode or ID Number',
  quantity: 'Quantity',
  condition: 'Condition',
  storageLocation: 'Storage Location',
  technicalAirtableTable: 'Airtable table',
  technicalAirtableField: 'Airtable field',
};

const PRODUCT_FIELD_LABELS = {
  Item: DOMAIN_TERMS.productName,
  'Item Name': DOMAIN_TERMS.productName,
  Identifier: 'Identifier',
  'Product or File Name': 'Product/File Name',
  'Product/File Name': 'Product/File Name',
  'Product Name': 'Product/File Name',
  Description: 'Description',
  'Item Job Number': DOMAIN_TERMS.productJobNumber,
  'Output Type': 'Output Type',
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
  Items: DOMAIN_TERMS.products,
  Receipts: DOMAIN_TERMS.shipments,
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
