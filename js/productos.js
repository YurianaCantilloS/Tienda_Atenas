/* ============================================================
   PRODUCTOS: carga, render, filtros, modal y stepper
   ============================================================ */

/* Categorías por defecto. La tienda las refresca desde la tabla
   "categorias" (la misma que usa el panel y el ERP). */
let CATEGORIAS = [
 { valor: 'todos', label: 'Todos' },
  { valor: 'capilar', label: 'Capilar' },
  { valor: 'facial', label: 'Facial' },
  { valor: 'corporal', label: 'Corporal' },
  { valor: 'maquillaje', label: 'Maquillaje' },
  { valor: 'accesorios', label: 'Accesorios' },
  { valor: 'electricos', label: 'Eléctricos' },
  { valor: 'varios', label: 'Varios' },
  { valor: 'ropa', label: 'Ropa' },
];

/* Trae las categorías publicadas en la tabla "categorias".
   Si la tabla no existe (falta correr sql/categorias.sql),
   se quedan las de arriba y la tienda sigue funcionando. */
async function cargarCategoriasTienda() {
  try {
    const { data, error } = await sb.from('categorias')
      .select('valor, label, orden')
      .eq('activa', true)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });
    if (error || !data || !data.length) return;
    CATEGORIAS = [{ valor: 'todos', label: 'Todos' }]
      .concat(data.map(c => ({ valor: c.valor, label: c.label || c.valor })));
    renderFiltros();
  } catch (e) { /* sin conexión o sin tabla: se quedan los filtros por defecto */ }
}

let PRODUCTOS = [];
let filtroActivo = 'todos';
let ordenTienda = 'destacados';   /* lo elige el admin en el panel */
let productosVisibles = 18;       /* cuántos se muestran antes de "Mostrar más" */
let textoBusqueda = '';
let prodModal = null;
let qtyModal = 1;

function fechaProducto(p) {
  const t = p.created_at || p.nuevo_ingreso_at;
  const n = t ? Date.parse(t) : 0;
  return isNaN(n) ? 0 : n;
}

/* Los agotados van SIEMPRE al final. Después se aplica el orden
   que eligió el admin en el panel:
     destacados → primero los marcados con la estrella
     cantidad   → los de más stock primero
     categoria  → agrupados por categoría
     ninguno    → tal como vienen de la base */
function ordenarProductos(lista) {
  const agotado = p => (p.stock > 0 ? 0 : 1);
  const copia = [...lista];

  if (ordenTienda === 'categoria') {
    copia.sort((a, b) =>
      String(a.categoria || '').localeCompare(String(b.categoria || ''), 'es') ||
      agotado(a) - agotado(b) ||
      fechaProducto(b) - fechaProducto(a));
  } else if (ordenTienda === 'cantidad') {
    copia.sort((a, b) => agotado(a) - agotado(b) || (b.stock || 0) - (a.stock || 0));
  } else if (ordenTienda === 'destacados') {
    copia.sort((a, b) =>
      agotado(a) - agotado(b) ||
      (b.nuevo_ingreso ? 1 : 0) - (a.nuevo_ingreso ? 1 : 0) ||
      fechaProducto(b) - fechaProducto(a));
  } else {
    copia.sort((a, b) => agotado(a) - agotado(b));
  }
  return copia;
}

/* El panel manda el orden elegido; la página solo obedece. */
function setOrdenTienda(valor) {
  ordenTienda = valor || 'destacados';
  renderProductos();
}

function getDescripcion(p) {
  return p.descripcion || '';
}

function getStockInfo(stock) {
  const n = Number(stock) || 0;
  if (n <= 0) return { label: 'Sin stock', clase: 'agotado', icon: ICONS.close };
  if (n <= 10) return { label: 'Pocas unidades', clase: 'bajo', icon: ICONS.flame };
  return { label: 'Disponible', clase: 'ok', icon: ICONS.check };
}

function renderFiltros() {
  const cont = document.getElementById('filtros');
  cont.innerHTML = CATEGORIAS.map(c => `
    <button class="filtro-btn ${c.valor === filtroActivo ? 'active' : ''}" onclick="filtrar('${c.valor}', this)">
      ${svgIconFor(c.valor === 'todos' ? 'todos' : c.valor)} ${c.label}
    </button>
  `).join('');
}

function filtrar(cat, btn) {
  filtroActivo = cat;
  productosVisibles = 18;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProductos();
}

function buscarProductos(texto) {
  textoBusqueda = texto.trim().toLowerCase();
  productosVisibles = 18;
  renderProductos();
}

function renderProductos() {
  const grid = document.getElementById('productos-grid');
  let lista = filtroActivo === 'todos' ? PRODUCTOS : PRODUCTOS.filter(p => p.categoria === filtroActivo);
  if (textoBusqueda) {
    lista = lista.filter(p => p.nombre.toLowerCase().includes(textoBusqueda));
  }
  lista = ordenarProductos(lista);
  /* "Mostrar más" solo aplica en celular; en PC se muestran todos */
  const enCelular = window.innerWidth <= 600;
  const visibles = enCelular ? lista.slice(0, productosVisibles) : lista;
  const btnMas = getBtnMostrarMas();
  if (!lista.length) {
    grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gris-60);grid-column:1/-1;">No hay productos en esta categoría.</div>';
    if (btnMas) btnMas.style.display = 'none';
    return;
  }
  if (btnMas) btnMas.style.display = (enCelular && lista.length > visibles.length) ? '' : 'none';

  grid.innerHTML = visibles.map(p => {
    const agotado = p.stock === 0;
    const imgHtml = p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}">` : svgIconFor(p.categoria);
    const enCarrito = carrito.find(i => i.id === p.id);

    const controlHtml = agotado
      ? `<button class="btn-agregar" disabled>${ICONS.plus}</button>`
      : enCarrito
        ? `<div class="stepper">
             <button onclick="event.stopPropagation();cambiarCantidadCarrito('${p.id}',-1)">−</button>
             <span class="stepper-num">${enCarrito.cantidad}</span>
             <button onclick="event.stopPropagation();cambiarCantidadCarritoDesdeCard('${p.id}',1)">+</button>
           </div>`
        : `<button class="btn-agregar" onclick="event.stopPropagation();agregarRapido('${p.id}')">${ICONS.plus}</button>`;

    return `
      <div class="prod-card ${agotado ? 'sin-stock' : ''}">
        <div class="prod-img" onclick="${agotado ? 'sonidoNoDisponible()' : `abrirModal('${p.id}')`}">
          ${imgHtml}
          ${agotado ? `
          <div class="sin-stock-overlay">
            <span class="sin-stock-badge">Sin stock</span>
            <span class="sin-stock-sub">Regresaré pronto</span>
          </div>` : ''}
        </div>
        <div class="prod-info">
          <div class="prod-nombre" onclick="${agotado ? 'sonidoNoDisponible()' : `abrirModal('${p.id}')`}">${p.nombre}</div>
          <div class="prod-footer">
            <div class="prod-precio">
            ${formatCOP(p.precio)}
            <span class="prod-tipo-badge ${p.tipo_venta === 'detal' ? 'detal' : 'mayor'}">${p.tipo_venta === 'detal' ? 'Al detal' : 'Por mayor'}</span>
          </div>
            ${controlHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ── BOTÓN "MOSTRAR MÁS" (12 productos cada vez) ── */
function getBtnMostrarMas() {
  let btn = document.getElementById('btn-mostrar-mas');
  if (!btn) {
    const grid = document.getElementById('productos-grid');
    if (!grid || !grid.parentNode) return null;
    btn = document.createElement('button');
    btn.id = 'btn-mostrar-mas';
    btn.className = 'btn-mostrar-mas';
    btn.textContent = 'Mostrar más';
    btn.onclick = mostrarMasProductos;
    grid.parentNode.insertBefore(btn, grid.nextSibling);
  }
  return btn;
}

function mostrarMasProductos() {
  productosVisibles += 18;
  renderProductos();
}

/* Si la persona pasa de celular a PC (o viceversa), se ajusta el paginado */
let anchoEraCelular = window.innerWidth <= 600;
window.addEventListener('resize', () => {
  const ahoraCelular = window.innerWidth <= 600;
  if (ahoraCelular !== anchoEraCelular) {
    anchoEraCelular = ahoraCelular;
    renderProductos();
  }
});

function cambiarCantidadCarritoDesdeCard(id, delta) {
  cambiarCantidadCarrito(id, delta);
}

/* ── MODAL PRODUCTO ── */
function abrirModal(id) {
  prodModal = PRODUCTOS.find(p => p.id === id);
  if (!prodModal) return;
  qtyModal = 1;

  document.getElementById('modal-img').innerHTML = prodModal.foto_url
    ? `<img src="${prodModal.foto_url}" alt="${prodModal.nombre}">`
    : svgIconFor(prodModal.categoria);

  document.getElementById('modal-nombre').textContent = prodModal.nombre;
  document.getElementById('modal-desc').textContent = getDescripcion(prodModal);
 const tipoBadge = `<span class="prod-tipo-badge ${prodModal.tipo_venta === 'detal' ? 'detal' : 'mayor'}">${prodModal.tipo_venta === 'detal' ? 'Al detal' : 'Por mayor'}</span>`;
  document.getElementById('modal-precio').innerHTML = formatCOP(prodModal.precio) + ' ' + tipoBadge;
  document.getElementById('modal-qty').textContent = 1;

  const info = getStockInfo(prodModal.stock);
  const badge = document.getElementById('modal-stock-badge');
  badge.className = 'modal-stock-info ' + info.clase;
  badge.innerHTML = info.icon + '<span>' + info.label + '</span>';

  document.getElementById('overlay-prod').classList.add('open');
}

function cerrarModal() {
  document.getElementById('overlay-prod').classList.remove('open');
  prodModal = null;
}

function cambiarQty(delta) {
  if (!prodModal) return;
  const nueva = qtyModal + delta;
  if (nueva < 1 || nueva > prodModal.stock) return;
  qtyModal = nueva;
  document.getElementById('modal-qty').textContent = qtyModal;
}

function agregarDesdeModal() {
  if (!prodModal) return;
  agregarAlCarrito(prodModal, qtyModal);
  cerrarModal();
}

function agregarRapido(id) {
  const p = PRODUCTOS.find(x => x.id === id);
  if (p && p.stock > 0) agregarAlCarrito(p, 1);
}

/* ── INIT ── */
async function initProductos() {
  renderFiltros();
  await cargarCategoriasTienda();
  PRODUCTOS = await fetchProductos();
  renderProductos();
}
