/* ============================================================
   CATÁLOGO PDF — se genera en el navegador (jsPDF), sin backend.
   Página 1: el banner (80% de la hoja) + banda con los datos.
   Página 2: el mensaje del pedido (por mayor / al detal / pago).
   Después: una página separadora por categoría (ícono grande) y
   los productos con foto, precio centrado y su franja Al detal/Por mayor.
   Excluye los agotados y los que no se muestran en la tienda.
   ============================================================ */

const CATALOGO_CAT_LABELS = {
  capilar: 'Capilar', facial: 'Facial', corporal: 'Corporal',
  maquillaje: 'Maquillaje', accesorios: 'Accesorios', electricos: 'Eléctricos',
  varios: 'Varios', ropa: 'Ropa'
};
const CATALOGO_CAT_ORDEN = [
  'capilar', 'facial', 'corporal', 'maquillaje',
  'accesorios', 'electricos', 'varios', 'ropa'
];

const CAT = {
  W: 595, H: 842, M: 40,
  rosa: [242, 95, 164], rosaBg: [255, 240, 246],
  lila: [201, 166, 224], lilaBg: [246, 238, 251], lilaDark: [155, 95, 192],
  negro: [58, 42, 69], gris: [140, 130, 150], gris30: [236, 224, 242],
  blanco: [255, 252, 254]
};

/* Íconos vectoriales propios (no dependen de js/iconos.js) */
const CAT_ICON = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.6-6-6.6-11a6.6 6.6 0 0 1 13.2 0C18.6 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.28.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/></svg>',
  detal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>'
};

let _catalogoGenerando = false;

/* ── Imágenes a dataURL (si el navegador bloquea por CORS, devuelve null) ── */
function catCargarCuadrado(url, size) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve({ data: c.toDataURL('image/jpeg', 0.78) });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* Recorta la imagen (tipo "cover") al ancho/alto que le pidamos, sin
   deformarla: sobra por los lados, no se estira. Para la portada. */
function catCargarPortada(url, ratio, maxW) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let sw = img.width, sh = img.height;
        if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        const k = Math.min(1, maxW / sw);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(sw * k));
        c.height = Math.max(1, Math.round(sh * k));
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        resolve({ data: c.toDataURL('image/jpeg', 0.85) });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* ── Utilidades ── */
function catListaProductos() {
  try { return (typeof PRODUCTOS !== 'undefined') ? PRODUCTOS : (window.PRODUCTOS || []); }
  catch (e) { return window.PRODUCTOS || []; }
}
function catProductosTienda() {
  return catListaProductos().filter(p => p.mostrar_en_tienda !== false && Number(p.stock) > 0);
}
function catTipo(p) { return p.tipo_venta === 'detal' ? 'Al detal' : 'Por mayor'; }
function catCompararNombre(a, b) {
  return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base', numeric: true });
}
function catNegocio() {
  try { return (typeof NEGOCIO !== 'undefined' && NEGOCIO.nombre) || 'Atenas Style Shop'; }
  catch (e) { return (window.NEGOCIO && window.NEGOCIO.nombre) || 'Atenas Style Shop'; }
}
function catDatoNegocio(campo, porDefecto) {
  try { return (typeof NEGOCIO !== 'undefined' && NEGOCIO[campo]) || porDefecto || ''; }
  catch (e) { return (window.NEGOCIO && window.NEGOCIO[campo]) || porDefecto || ''; }
}
function catFormatCOP(n) {
  if (typeof formatCOP === 'function') return formatCOP(n);
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

function catBannerUrl() {
  const hero = document.getElementById('hero-banner');
  const src = hero && hero.getAttribute('src');
  if (src) return src;
  if (typeof leerApariencia === 'function') {
    const a = leerApariencia();
    if (a && a.banner_url) return a.banner_url;
  }
  return 'assets/banner-atenas.png';
}

function catAviso(msg, tipo) {
  if (typeof showToast === 'function') return showToast(msg, tipo || 'sparkle');
  if (typeof aviso === 'function') {
    return aviso(msg, tipo === 'error' ? 'error' : (tipo === 'warn' ? 'warn' : 'ok'));
  }
}

/* ── Fuente femenina (serif elegante, NO cursiva) para el catálogo ──
   Crimson Text: regular + bold + italic. Se baja una sola vez y queda
   guardada. Si no hay internet o el navegador la bloquea, caemos a
   Times cursiva: nunca se rompe el catálogo. */
let _catFuenteFem = false;
function catBytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
async function catCargarFuenteFemenina(doc) {
  if (_catFuenteFem) return true;
  try {
    const base = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/crimsontext/';
    const fuentes = [
      ['CrimsonText-Regular.ttf', 'normal'],
      ['CrimsonText-Bold.ttf', 'bold'],
      ['CrimsonText-Italic.ttf', 'italic']
    ];
    for (const [file, estilo] of fuentes) {
      const res = await fetch(base + file);
      if (!res.ok) throw new Error('fuente');
      const bytes = new Uint8Array(await res.arrayBuffer());
      doc.addFileToVFS(file, catBytesToBase64(bytes));
      doc.addFont(file, 'CatFem', estilo);
    }
    _catFuenteFem = true;
    return true;
  } catch (e) {
    _catFuenteFem = false;
    return false;
  }
}
function catFem(doc, size, negrita) {
  if (_catFuenteFem) {
    doc.setFont('CatFem', negrita ? 'bold' : 'normal');
    doc.setFontSize(size);
  } else {
    doc.setFont('times', negrita ? 'bolditalic' : 'italic');
    doc.setFontSize(size);
  }
}

/* ── Corazón y chulito vectoriales (kawaii) ── */
function catCorazon(doc, setFill, color, cx, cy, s) {
  setFill(color);
  const r = s * 0.28;
  const ly = cy - s * 0.14;
  doc.circle(cx - r, ly, r, 'F');
  doc.circle(cx + r, ly, r, 'F');
  doc.triangle(cx - 2 * r, ly, cx + 2 * r, ly, cx, cy + s * 0.5, 'F');
}
function catCheckCirculo(doc, setFill, color, cx, cy, r) {
  setFill(color); doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(r * 0.34); doc.setLineCap('round');
  doc.line(cx - r * 0.44, cy + r * 0.02, cx - r * 0.12, cy + r * 0.36);
  doc.line(cx - r * 0.12, cy + r * 0.36, cx + r * 0.48, cy - r * 0.36);
  doc.setLineCap('butt');
}

/* Convierte un SVG (con currentColor) en PNG para el PDF. */
function catRasterSVG(svg, color, size) {
  size = size || 128;
  return new Promise(resolve => {
    try {
      if (!svg) return resolve(null);
      let s = svg.replace(/currentColor/g, color).replace(/\sclass="[^"]*"/g, '');
      if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = size;
          c.getContext('2d').drawImage(img, 0, 0, size, size);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) { resolve(null); }
  });
}

/* Ícono de categoría: usa el mismo de la tienda (si está disponible). */
function catRasterIcono(categoria, color, size) {
  if (typeof svgIconFor !== 'function') return Promise.resolve(null);
  let svg;
  try { svg = svgIconFor(categoria); } catch (e) { svg = null; }
  if (!svg) return Promise.resolve(null);
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 24 24';
  const inner = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const norm = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="${color}">${inner}</svg>`;
  return catRasterSVG(norm, color, size);
}

function catBotonCargando(activo) {
  document.querySelectorAll('[data-catalogo-btn]').forEach(b => {
    if (activo) {
      if (!b.dataset.txtOriginal) b.dataset.txtOriginal = b.innerHTML;
      b.disabled = true;
      b.innerHTML = 'Generando catálogo…';
    } else {
      b.disabled = false;
      if (b.dataset.txtOriginal) b.innerHTML = b.dataset.txtOriginal;
    }
  });
}

/* ── Entrada ── */
async function generarCatalogoPDF() {
  if (_catalogoGenerando) return;
  if (!window.jspdf) { catAviso('No se pudo cargar el generador de PDF.', 'error'); return; }
  const productos = catProductosTienda();
  if (!productos.length) { catAviso('No hay productos disponibles para el catálogo.', 'warn'); return; }

  _catalogoGenerando = true;
  catBotonCargando(true);
  try {
    await _generarCatalogo(productos);
  } catch (e) {
    console.error(e);
    catAviso('No se pudo generar el catálogo.', 'error');
  } finally {
    _catalogoGenerando = false;
    catBotonCargando(false);
  }
}

/* Banda de contacto de la portada: ciudad, teléfono e Instagram con ícono. */
async function catContactoPortada(doc, setText) {
  const items = [
    { svg: CAT_ICON.pin, text: catDatoNegocio('ciudad') },
    { svg: CAT_ICON.phone, text: catDatoNegocio('telefono') },
    { svg: CAT_ICON.instagram, text: catDatoNegocio('instagram') }
  ].filter(i => i.text);
  if (!items.length) return;
  for (const it of items) it.img = await catRasterSVG(it.svg, '#9B5FC0', 64);

  const isz = 15, gapIcon = 5, gapItem = 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
  let total = 0;
  items.forEach((it, i) => {
    total += isz + gapIcon + doc.getTextWidth(it.text);
    if (i) total += gapItem;
  });
  let x = (CAT.W - total) / 2;
  const y = CAT.H - 38;
  setText(CAT.lilaDark);
  items.forEach((it, i) => {
    if (i) x += gapItem;
    if (it.img) doc.addImage(it.img, 'PNG', x, y - 11.5, isz, isz);
    doc.text(it.text, x + isz + gapIcon, y);
    x += isz + gapIcon + doc.getTextWidth(it.text);
  });
}

/* Escribe una línea con segmentos en distinto peso, centrada. */
function catTextoMixto(doc, cx, y, size, segmentos) {
  let total = 0;
  segmentos.forEach(s => { catFem(doc, size, s.b); total += doc.getTextWidth(s.t); });
  let x = cx - total / 2;
  segmentos.forEach(s => {
    catFem(doc, size, s.b);
    doc.text(s.t, x, y);
    x += doc.getTextWidth(s.t);
  });
}

/* ── Dibujo del catálogo ── */
async function _generarCatalogo(productos) {
  const W = CAT.W, H = CAT.H, M = CAT.M;
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: [W, H] });
  const setFill = c => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = c => doc.setTextColor(c[0], c[1], c[2]);

  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const fechaHoy = dd + '/' + mm + '/' + hoy.getFullYear();

  await catCargarFuenteFemenina(doc);

  /* Fotos de los productos */
  const fotoDe = new Map();
  await Promise.all(productos.map(async p => {
    fotoDe.set(p, await catCargarCuadrado(p.foto_url, 420));
  }));

  /* ── Portada: banner al 80% de la hoja ── */
  const coverH = Math.round(CAT.H * 0.8);
  const portada = await catCargarPortada(catBannerUrl(), CAT.W / coverH, 1600);
  if (portada) {
    doc.addImage(portada.data, 'JPEG', 0, 0, CAT.W, coverH);
  } else {
    setFill(CAT.lilaBg); doc.rect(0, 0, CAT.W, coverH, 'F');
  }

  /* Banda inferior con los datos */
  setFill(CAT.lilaBg); doc.rect(0, coverH, CAT.W, CAT.H - coverH, 'F');
  setFill(CAT.rosa); doc.rect(0, coverH, CAT.W, 6, 'F');

  let cy = coverH + 34;
  setText(CAT.gris); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
  doc.text('C A T Á L O G O', CAT.W / 2, cy, { align: 'center' });

  cy += 40;
  setText(CAT.rosa); doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
  doc.text(catNegocio(), CAT.W / 2, cy, { align: 'center' });

  cy += 24;
  setText(CAT.negro); doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  doc.text('Bodega Mayorsita de Belleza', CAT.W / 2, cy, { align: 'center' });

  await catContactoPortada(doc, setText);

  /* ── Página 2 · mensaje del pedido ── */
  doc.addPage();
  setFill(CAT.rosaBg); doc.rect(0, 0, CAT.W, CAT.H, 'F');
  catCorazon(doc, setFill, CAT.lila, 66, 104, 26);
  catCorazon(doc, setFill, CAT.rosa, CAT.W - 72, 132, 20);
  catCorazon(doc, setFill, CAT.lila, CAT.W - 84, CAT.H - 128, 28);
  catCorazon(doc, setFill, CAT.rosa, 78, CAT.H - 100, 18);

  let y2 = 300;
  setText(CAT.rosa); catFem(doc, 15);
  doc.text('Compra al por mayor', CAT.W / 2, y2, { align: 'center' });
  y2 += 26;
  setText(CAT.negro); catFem(doc, 17, true);
  doc.text('a partir de 10 unidades o un monto superior a $50.000', CAT.W / 2, y2, { align: 'center' });

  y2 += 60;
  setText(CAT.lilaDark);
  catTextoMixto(doc, CAT.W / 2, y2, 16, [
    { t: 'Productos al detal: ', b: false },
    { t: 'sin monto mínimo', b: true }
  ]);

  y2 += 54;
  const chkX = CAT.W / 2 - 86;
  catCheckCirculo(doc, setFill, CAT.rosa, chkX, y2 - 5, 13);
  setText(CAT.negro); catFem(doc, 17, true);
  doc.text('Pago contra entrega', chkX + 24, y2);

  /* ── Productos por categoría (3 columnas × 3 filas = 9 por página) ── */
  const cols = 3, cGap = 12, rowGap = 12;
  const cellW = (CAT.W - 2 * CAT.M - (cols - 1) * cGap) / cols;
  const photo = cellW - 22;
  const cellH = photo + 88;

  const cats = CATALOGO_CAT_ORDEN.map(v => ({ valor: v, label: CATALOGO_CAT_LABELS[v] || v }));
  const extras = [...new Set(productos.map(p => p.categoria))].filter(c => c && !CATALOGO_CAT_ORDEN.includes(c));
  extras.forEach(v => cats.push({ valor: v, label: CATALOGO_CAT_LABELS[v] || v }));
  const grupos = cats
    .map(c => ({ valor: c.valor, label: c.label, items: productos.filter(p => p.categoria === c.valor).sort(catCompararNombre) }))
    .filter(g => g.items.length);
  const sinCat = productos.filter(p => !p.categoria).sort(catCompararNombre);
  if (sinCat.length) grupos.push({ valor: '', label: 'Otros', items: sinCat });

  /* Ícono grande por categoría */
  const iconoDe = {};
  await Promise.all(grupos.map(async g => {
    iconoDe[g.label] = g.icono
      ? await catRasterSVG(g.icono, '#9B5FC0', 256)
      : await catRasterIcono(g.valor, '#9B5FC0', 256);
  }));

  for (const g of grupos) {
    doc.addPage();
    dibujarSeparador(doc, setFill, setText, g, iconoDe[g.label]);

    doc.addPage();
    let y = encabezadoCatalogo(doc, setFill, setDraw, setText);
    for (let i = 0; i < g.items.length; i += cols) {
      if (y + cellH > CAT.H - 46) {
        doc.addPage();
        y = encabezadoCatalogo(doc, setFill, setDraw, setText, 'Continuación · ' + g.label);
      }
      const fila = g.items.slice(i, i + cols);
      fila.forEach((p, c) => {
        dibujarCelda2(doc, setFill, setDraw, setText, CAT.M + c * (cellW + cGap), y, p, fotoDe, cellW, cellH, photo, catTipo, catFormatCOP);
      });
      y += cellH + rowGap;
    }
  }

  doc.save(`Catálogo ${catNegocio()} - ${fechaHoy}.pdf`);
}

/* Página separadora de cada categoría: ícono grande + nombre */
function dibujarSeparador(doc, setFill, setText, grupo, icono) {
  const W = CAT.W, H = CAT.H, cx = W / 2, cyc = 320;
  setFill(CAT.rosaBg); doc.rect(0, 0, W, H, 'F');
  setFill(CAT.rosa); doc.rect(0, 0, W, 12, 'F');
  setFill(CAT.lilaDark); doc.rect(0, H - 12, W, 12, 'F');

  setFill(CAT.blanco); doc.circle(cx, cyc, 98, 'F');
  setFill(CAT.rosaBg); doc.circle(cx, cyc, 86, 'F');
  if (icono) doc.addImage(icono, 'PNG', cx - 60, cyc - 60, 120, 120);
  else catCheckCirculo(doc, setFill, CAT.rosa, cx, cyc, 46);

  catCorazon(doc, setFill, CAT.rosa, 74, 170, 22);
  catCorazon(doc, setFill, CAT.lila, W - 78, 212, 15);
  catCorazon(doc, setFill, CAT.lila, W - 92, H - 178, 24);
  catCorazon(doc, setFill, CAT.rosa, 84, H - 156, 16);

  setText(CAT.gris); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('C A T E G O R Í A', cx, 474, { align: 'center' });

  setText(CAT.lilaDark); doc.setFont('helvetica', 'bold'); doc.setFontSize(34);
  doc.text(grupo.label, cx, 516, { align: 'center' });

  setFill(CAT.rosa); doc.roundedRect(cx - 34, 532, 68, 4, 2, 2, 'F');

  setText(CAT.gris); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  doc.text(grupo.items.length + (grupo.items.length === 1 ? ' producto' : ' productos'), cx, 562, { align: 'center' });
}

/* Encabezado de las páginas de producto */
function encabezadoCatalogo(doc, setFill, setDraw, setText, subtitulo) {
  setFill(CAT.lilaBg); doc.rect(0, 0, CAT.W, 10, 'F');
  catCorazon(doc, setFill, CAT.rosa, CAT.M + 6, 34, 16);
  setText(CAT.lilaDark); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(catNegocio(), CAT.M + 22, 40);
  setText(CAT.gris); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(subtitulo || 'Catálogo de productos', CAT.W - CAT.M, 40, { align: 'right' });
  setDraw(CAT.gris30); doc.setLineWidth(0.8);
  doc.line(CAT.M, 50, CAT.W - CAT.M, 50);
  return 70;
}

/* Tarjeta de producto: foto, nombre, precio centrado y franja de tipo */
function dibujarCelda2(doc, setFill, setDraw, setText, x, y, p, fotoDe, cellW, cellH, photo, catTipo, catFormatCOP) {
  setFill(CAT.blanco); setDraw(CAT.gris30); doc.setLineWidth(0.9);
  doc.roundedRect(x, y, cellW, cellH, 10, 10, 'FD');

  const ix = x + 10, iy = y + 10;
  setFill(CAT.lilaBg); doc.roundedRect(ix, iy, photo, photo, 8, 8, 'F');
  const foto = fotoDe.get(p);
  if (foto) {
    doc.addImage(foto.data, 'JPEG', ix, iy, photo, photo);
  } else {
    setText(CAT.lila); doc.setFont('helvetica', 'bold'); doc.setFontSize(34);
    const inicial = ((p.nombre || '?').trim()[0] || '?').toUpperCase();
    doc.text(inicial, ix + photo / 2, iy + photo / 2 + 12, { align: 'center' });
  }
  setDraw(CAT.gris30); doc.setLineWidth(0.8);
  doc.roundedRect(ix, iy, photo, photo, 8, 8, 'S');

  setText(CAT.negro); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  let lineas = doc.splitTextToSize(p.nombre || '', cellW - 20);
  if (lineas.length > 2) {
    lineas = lineas.slice(0, 2);
    lineas[1] = lineas[1].replace(/\s+\S*$/, '') + '…';
  }
  doc.text(lineas, x + cellW / 2, iy + photo + 16, { align: 'center' });

  setText(CAT.rosa); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(catFormatCOP(p.precio), x + cellW / 2, y + cellH - 32, { align: 'center' });

  const isDetal = p.tipo_venta === 'detal';
  if (isDetal) { setFill(CAT.rosaBg); setText(CAT.rosa); }
  else { setFill(CAT.lilaBg); setText(CAT.lilaDark); }
  doc.roundedRect(x + 10, y + cellH - 24, cellW - 20, 15, 7.5, 7.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2);
  doc.text(catTipo(p), x + cellW / 2, y + cellH - 13.5, { align: 'center' });
}

window.generarCatalogoPDF = generarCatalogoPDF;
