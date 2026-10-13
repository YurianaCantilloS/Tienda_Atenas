/* ============================================================
   FACTURA PDF — se genera en el navegador del cliente (sin backend)
   Requiere jsPDF cargado desde CDN en index.html
   ============================================================ */

let _logoBase64Cache = null;

function imagenABase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function getLogoBase64() {
  if (_logoBase64Cache) return _logoBase64Cache;
  try {
    _logoBase64Cache = await imagenABase64(NEGOCIO.logo);
  } catch (e) {
    _logoBase64Cache = null;
  }
  return _logoBase64Cache;
}

async function generarFacturaPDF(cliente, items, totales, numero) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: [380, 560] });
  const centerX = 190;
  let y = 40;

  const rosaDark = [242, 95, 164];
  const negro = [58, 42, 69];
  const gris = [140, 130, 150];

  /* Logo centrado */
  const logo = await getLogoBase64();
  if (logo) {
    const size = 64;
    doc.addImage(logo, 'PNG', centerX - size / 2, y, size, size);
    y += size + 12;
  } else {
    y += 10;
  }

  /* Nombre del negocio */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...rosaDark);
  doc.text(NEGOCIO.nombre.toUpperCase(), centerX, y, { align: 'center' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.text(NEGOCIO.ciudad, centerX, y, { align: 'center' }); y += 13;
  doc.text(`${NEGOCIO.telefono}  |  ${NEGOCIO.instagram}`, centerX, y, { align: 'center' }); y += 18;

  lineaPunteada(doc, y); y += 14;

  doc.setFillColor(247, 244, 250);
  doc.rect(25, y - 9, 330, 15, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.text('COTIZACIÓN DE PEDIDO', centerX, y, { align: 'center' });
  y += 22;

  const filas = [
    ['Fecha:', new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['Cliente:', cliente.nombre],
    ['Teléfono:', cliente.tel],
    ['Método de pago:', cliente.pagoLabel],
  ];
  doc.setFontSize(9.5);
  filas.forEach(([label, valor]) => {
    doc.setTextColor(...gris);
    doc.text(label, 30, y);
    doc.setTextColor(...negro);
    doc.text(String(valor), 350, y, { align: 'right' });
    y += 16;
  });

  y += 6;
  lineaPunteada(doc, y); y += 18;

  /* Encabezado tabla */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...gris);
  doc.text('PRODUCTO', 30, y);
  doc.text('CANT.', 220, y, { align: 'center' });
  doc.text('PRECIO', 290, y, { align: 'right' });
  doc.text('TOTAL', 350, y, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...negro);
  items.forEach(i => {
    doc.text(i.nombre, 30, y, { maxWidth: 175 });
    doc.text(String(i.cantidad), 220, y, { align: 'center' });
    doc.text(formatCOP(i.precio), 290, y, { align: 'right' });
    doc.text(formatCOP(i.precio * i.cantidad), 350, y, { align: 'right' });
    y += 18;
  });

  y += 4;
  lineaPunteada(doc, y); y += 22;

  if (totales.descuento > 0) {
    doc.setFontSize(9.5);
    doc.setTextColor(...gris);
    doc.text('Descuento', 30, y);
    doc.text('-' + formatCOP(totales.descuento), 350, y, { align: 'right' });
    y += 18;
  }

  if (totales.domicilio > 0) {
    doc.setFontSize(9.5);
    doc.setTextColor(...gris);
    doc.text('Domicilio', 30, y);
    doc.text(formatCOP(totales.domicilio), 350, y, { align: 'right' });
    y += 18;
  }

  doc.setFillColor(253, 240, 248);
  doc.roundedRect(20, y - 12, 340, 20, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...rosaDark);
  doc.text('TOTAL:', 30, y);
  doc.text(formatCOP(totales.total), 350, y, { align: 'right' });
  y += 32;

  /* Badge método de pago */
  doc.setFillColor(255, 184, 218);
  doc.roundedRect(centerX - 45, y - 14, 90, 22, 11, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...negro);
  doc.text(cliente.pagoLabel, centerX, y + 1, { align: 'center' });
  y += 38;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...rosaDark);
  doc.text(NEGOCIO.instagram, centerX, y, { align: 'center' });

  const num = String(numero || '').replace(/\D/g, '') || '0';
  const fechaArchivo = new Date()
    .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
  const nombreArchivo = `Factura #${num} - ${cliente.nombre.replace(/[\\/]/g, '-')} - ${fechaArchivo}.pdf`;
  return { blob: doc.output('blob'), nombreArchivo };
}

function lineaPunteada(doc, y) {
  doc.setDrawColor(220, 210, 230);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(25, y, 355, y);
  doc.setLineDashPattern([], 0);
}

