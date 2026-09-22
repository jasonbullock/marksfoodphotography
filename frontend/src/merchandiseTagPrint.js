import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function barcodeSvg(value) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: false,
    height: 68,
    margin: 0,
    width: 2,
  });
  return new XMLSerializer().serializeToString(svg);
}

function labelDocument(tag, qrDataUrl) {
  const client = escapeHtml(tag.client || 'No client');
  const productName = escapeHtml(tag.productName || 'Unidentified merchandise');
  const marksId = escapeHtml(tag.marksId);
  const upc = escapeHtml(tag.upc || 'Not provided');
  const quantityReceived = escapeHtml(tag.quantityReceived || 'Not recorded');
  const shipToThr3d = escapeHtml(tag.shipToThr3d || '');
  const received = escapeHtml(tag.received || 'Not recorded');
  const barcode = barcodeSvg(tag.marksId);
  const qr = qrDataUrl
    ? `<img class="qr" src="${qrDataUrl}" alt="QR code to this merchandise item">`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${marksId} merchandise label</title>
    <style>
      @page { size: 3in 5in; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: 3in; height: 5in; margin: 0; padding: 0; }
      body { color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
      .label { width: 3in; height: 5in; padding: .16in .18in .14in; display: flex; flex-direction: column; overflow: hidden; }
      .client { font-size: 21pt; font-weight: 800; line-height: 1.02; overflow-wrap: anywhere; }
      .rule { border: 0; border-top: 2px solid #111; margin: .08in 0 .1in; }
      .product { min-height: .58in; font-size: 15pt; font-weight: 700; line-height: 1.08; overflow: hidden; }
      .identity { display: grid; grid-template-columns: 1.05in minmax(0, 1fr); align-items: center; gap: .1in; margin-top: .05in; }
      .qr { display: block; width: 1.05in; height: 1.05in; }
      .numbers { min-width: 0; }
      .number-label { color: #555; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
      .mp { margin: .02in 0 .09in; font-size: 14pt; font-weight: 800; line-height: 1; overflow-wrap: anywhere; }
      .upc { margin-top: .02in; font-size: 9pt; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
      .cf-scan { margin-top: .27in; color: #555; font-size: 8pt; font-weight: 800; line-height: 1.2; text-align: center; text-transform: uppercase; }
      .barcode { height: .5in; margin: .05in 0 .08in; display: flex; align-items: center; justify-content: center; }
      .barcode svg { width: 100%; height: 100%; }
      .received { margin-top: auto; padding: .1in .11in; border: 2px solid #111; }
      .received-label { display: block; font-size: 9pt; font-weight: 800; text-transform: uppercase; }
      .received-value { display: block; margin-top: .025in; font-size: 13pt; font-weight: 800; line-height: 1.05; }
      .received-quantities { display: flex; gap: .14in; margin-top: .07in; color: #333; font-size: 8.5pt; font-weight: 700; }
      .shot { display: flex; align-items: flex-end; gap: .08in; margin-top: .13in; font-size: 11pt; font-weight: 800; }
      .shot-line { flex: 1; height: .2in; border-bottom: 2px solid #111; }
      @media screen { body { margin: 0; } }
    </style>
  </head>
  <body>
    <main class="label">
      <div class="client">${client}</div>
      <hr class="rule">
      <div class="product">${productName}</div>
      <div class="identity">
        ${qr}
        <div class="numbers">
          <div class="number-label">MP #</div>
          <div class="mp">${marksId}</div>
          <div class="number-label">UPC</div>
          <div class="upc">${upc}</div>
        </div>
      </div>
      <div class="cf-scan">Creative Force Scan</div>
      <div class="barcode">${barcode}</div>
      <div class="received">
        <span class="received-label">Received</span>
        <span class="received-value">${received}</span>
        <span class="received-quantities">
          <span>Quantity received: ${quantityReceived}</span>
          ${shipToThr3d ? `<span>Ship to THR3D: ${shipToThr3d}</span>` : ''}
        </span>
      </div>
      <div class="shot"><span>Shot date</span><span class="shot-line"></span></div>
    </main>
  </body>
</html>`;
}

export async function printMerchandiseTagWithSystemDialog(api, entryId) {
  const result = await api.previewMerchandiseTag(entryId);
  const tag = result?.tag || {};
  if (!tag.marksId) throw new Error('This merchandise has no Marks number yet, so it cannot be tagged.');

  const qrDataUrl = tag.qrUrl
    ? await QRCode.toDataURL(tag.qrUrl, { errorCorrectionLevel: 'H', margin: 0, width: 360 })
    : '';
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.style.opacity = '0';
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(labelDocument(tag, qrDataUrl));
  printDocument.close();

  await new Promise(resolve => {
    if (printDocument.readyState === 'complete') resolve();
    else frame.addEventListener('load', resolve, { once: true });
  });
  await Promise.all(Array.from(printDocument.images).map(image => (
    typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve()
  )));
  printWindow.focus();
  printWindow.print();
  window.setTimeout(() => frame.remove(), 60_000);
  return tag;
}
