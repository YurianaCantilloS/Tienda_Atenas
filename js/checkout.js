/* ============================================================
   CHECKOUT: datos del cliente y envío del pedido
   ============================================================ */

let metodoPago = 'efectivo';
let ubicacionCartagena = null;
let domicilioActual = 0;
let nombreBarrioActual = '';
let BARRIOS = [];
let CIUDADES = [];
let nombreCiudadActual = '';

/* Regla "por mayor": si el carrito lleva algún producto por mayor, el pedido
   se permite si hay un producto al detal por más de $30.000, o si el total
   alcanza $50.000, o si el pedido lleva 10 unidades o más. */
const MAYOR_MIN_UNIDADES = 10;
const MAYOR_MIN_MONTO = 50000;
const DETAL_EXENTO_MONTO = 30000;

/* ── BARRIOS ── */
async function initBarrios() {
  BARRIOS = await fetchBarrios();
  renderOpcionesBarrio(BARRIOS);
}

function renderOpcionesBarrio(lista) {
  const cont = document.getElementById('barrio-select-opciones');
  if (!cont) return;
  cont.innerHTML = lista.map(b => `
    <div class="custom-select-item" onclick="elegirBarrio('${b.nombre.replace(/'/g, "\\'")}', ${b.valor_domicilio})">
      <span>${b.nombre}</span>
      <span class="precio">${formatCOP(b.valor_domicilio)}</span>
    </div>
  `).join('');
}

function filtrarBarrios(texto) {
  renderOpcionesBarrio(BARRIOS.filter(b => b.nombre.toLowerCase().includes(texto.toLowerCase())));
  document.getElementById('barrio-select-list').classList.add('open');
}

function abrirBarrioDropdown() {
  document.getElementById('barrio-select-list').classList.add('open');
}

function elegirBarrio(nombre, precio) {
  domicilioActual = precio;
  nombreBarrioActual = nombre;
  document.getElementById('barrio-search').value = nombre;
  document.getElementById('barrio-select-list').classList.remove('open');
  renderResumen();
}

/* ── CIUDADES ── */
async function initCiudades() {
  CIUDADES = await fetchCiudades();
  renderOpcionesCiudad(CIUDADES);
}

function renderOpcionesCiudad(lista) {
  const cont = document.getElementById('ciudad-select-opciones');
  if (!cont) return;
  cont.innerHTML = lista.map(c => `
    <div class="custom-select-item" onclick="elegirCiudad('${c.nombre.replace(/'/g, "\\'")}', '${c.departamento.replace(/'/g, "\\'")}')">
      <span>${c.nombre}</span>
      <span style="color:var(--gris-60);font-size:11px;">${c.departamento}</span>
    </div>
  `).join('');
}

function filtrarCiudades(texto) {
  renderOpcionesCiudad(CIUDADES.filter(c => c.nombre.toLowerCase().includes(texto.toLowerCase())));
  document.getElementById('ciudad-select-list').classList.add('open');
}

function abrirCiudadDropdown() {
  document.getElementById('ciudad-select-list').classList.add('open');
}

function elegirCiudad(nombre, departamento) {
  nombreCiudadActual = nombre;
  document.getElementById('ciudad-search').value = `${nombre}, ${departamento}`;
  document.getElementById('ciudad-select-list').classList.remove('open');
}

/* Cierra ambos dropdowns al hacer clic fuera */
document.addEventListener('click', (e) => {
  ['barrio-select-wrap', 'ciudad-select-wrap'].forEach(id => {
    const wrap = document.getElementById(id);
    const list = wrap?.querySelector('.custom-select-list');
    if (wrap && !wrap.contains(e.target)) list?.classList.remove('open');
  });
});

/* ── UBICACIÓN Y PAGO ── */
function seleccionarUbicacion(esCartagena) {
  ubicacionCartagena = esCartagena;
  document.getElementById('opt-ciudad-si').classList.toggle('selected', esCartagena);
  document.getElementById('opt-ciudad-no').classList.toggle('selected', !esCartagena);
  document.getElementById('bloque-cartagena').style.display = esCartagena ? 'grid' : 'none';
  document.getElementById('bloque-fuera').style.display = esCartagena ? 'none' : 'grid';
  document.getElementById('metodo-cartagena').style.display = esCartagena ? 'block' : 'none';
  document.getElementById('metodo-fuera').style.display = esCartagena ? 'none' : 'block';
  document.getElementById('aviso-envio-fuera').style.display = esCartagena ? 'none' : 'block';
  metodoPago = esCartagena ? 'efectivo' : 'contraentrega';
  document.querySelectorAll('#metodo-cartagena .pago-opt, #metodo-fuera .pago-opt').forEach(el => el.classList.remove('selected'));
  document.getElementById(esCartagena ? 'opt-efectivo' : 'opt-contraentrega').classList.add('selected');
  actualizarVisibilidadPago();
  renderResumen();
}

function seleccionarPago(tipo) {
  metodoPago = tipo;
  const grupo = ubicacionCartagena ? '#metodo-cartagena' : '#metodo-fuera';
  document.querySelectorAll(`${grupo} .pago-opt`).forEach(el => el.classList.remove('selected'));
  const idMap = {
    efectivo: 'opt-efectivo',
    transferencia: ubicacionCartagena ? 'opt-transferencia' : 'opt-transferencia-fuera',
    contraentrega: 'opt-contraentrega'
  };
  document.getElementById(idMap[tipo]).classList.add('selected');
  actualizarVisibilidadPago();
}

function actualizarVisibilidadPago() {
  document.getElementById('aviso-contraentrega').style.display = metodoPago === 'contraentrega' ? 'block' : 'none';
}

/* ── CHECKOUT ── */
function abrirCheckout() {
  if (carrito.length === 0) return;
  /* Validación de compra al por mayor: se revisa al pulsar "Finalizar pedido"
     (aquí sale el mensaje), no al enviar por WhatsApp. */
  const itemMayorInvalido = revisarCompraMayor();
  if (itemMayorInvalido) {
    abrirAvisoMayor(`Compra al por mayor: el mínimo es ${MAYOR_MIN_UNIDADES} unidades o un monto superior a ${formatCOP(MAYOR_MIN_MONTO)}.`);
    return;
  }
  cerrarCarrito();
  /* resetear campos al abrir */
  nombreBarrioActual = '';
  nombreCiudadActual = '';
  domicilioActual = 0;
  const bs = document.getElementById('barrio-search');
  const cs = document.getElementById('ciudad-search');
  if (bs) bs.value = '';
  if (cs) cs.value = '';
  renderResumen();
  document.getElementById('checkout-modal').classList.add('open');
}

function cerrarCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
}

/* Devuelve el primer producto por mayor si la compra NO cumple el mínimo
   (para avisar). Devuelve null si se puede continuar. */
function revisarCompraMayor() {
  const porMayor = carrito.filter(i => i.tipo_venta === 'mayor');
  if (!porMayor.length) return null;

  const subtotalDetal = carrito
    .filter(i => i.tipo_venta !== 'mayor')
    .reduce((a, i) => a + Number(i.precio) * i.cantidad, 0);
  if (subtotalDetal > DETAL_EXENTO_MONTO) return null;

  const totalUnidades = carrito.reduce((a, i) => a + i.cantidad, 0);
  const montoTotal = carrito.reduce((a, i) => a + Number(i.precio) * i.cantidad, 0);
  if (montoTotal >= MAYOR_MIN_MONTO || totalUnidades >= MAYOR_MIN_UNIDADES) return null;

  return porMayor[0];
}

/* Aviso centrado (por ejemplo, la regla de compra al por mayor). Se muestra
   al pulsar "Finalizar pedido" y no deja continuar con el pedido. */
function abrirAvisoMayor(msg) {
  const el = document.getElementById('aviso-mayor');
  if (!el) { showToast(msg, 'warn'); return; }
  const texto = document.getElementById('aviso-mayor-texto');
  if (texto) texto.textContent = msg;
  el.classList.add('open');
}

function cerrarAvisoMayor() {
  const el = document.getElementById('aviso-mayor');
  if (el) el.classList.remove('open');
}

function totalConDomicilio() {
  const { subtotal, descuento, total } = calcularTotales();
  const domicilio = ubicacionCartagena ? domicilioActual : 0;
  return { subtotal, descuento, domicilio, total: total + domicilio };
}

function renderResumen() {
  const { subtotal, descuento, domicilio, total } = totalConDomicilio();
  const el = document.getElementById('ch-resumen');
  el.innerHTML = `
    <h4>Resumen del pedido</h4>
    ${carrito.map(i => `
      <div class="resumen-item-row">
        <span>${i.nombre} x${i.cantidad}</span>
        <span>${formatCOP(i.precio * i.cantidad)}</span>
      </div>
    `).join('')}
    ${descuento > 0 ? `<div class="resumen-item-row" style="color:var(--verde);">
      <span>Descuento (10% por compra +${formatCOP(250000)})</span>
      <span>-${formatCOP(descuento)}</span>
    </div>` : ''}
    ${domicilio > 0 ? `<div class="resumen-item-row">
      <span>Domicilio</span>
      <span>${formatCOP(domicilio)}</span>
    </div>` : ''}
    <div class="resumen-total-row"><span>Total</span><span>${formatCOP(total)}</span></div>
  `;
}

/* ── ENVÍO DEL PEDIDO ── */
async function enviarPedido() {
  const datos = validarFormulario();
  if (!datos) return;

  const { subtotal, descuento, domicilio, total } = totalConDomicilio();
  const pagoLabel = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    contraentrega: 'Contra Entrega'
  }[metodoPago] || metodoPago;

  /* Abrimos la pestaña de WhatsApp ya, dentro del clic del usuario, para que
     el navegador no la bloquee como ventana emergente mientras se guarda el
     pedido. Luego le cambiamos la dirección al enlace de WhatsApp. */
  const ventanaWA = window.open('', '_blank');

  /* Primero se guarda en el panel (para no perderlo si cierra la pestaña),
     y el código del pedido se incluye en el mensaje de WhatsApp. */
  const codigo = await guardarPedido(
    datos,
    [...carrito],
    { subtotal, descuento, domicilio, total },
    { metodoPago: pagoLabel }
  );

  const e1 = String.fromCodePoint(0x1FA75);
  const e2 = String.fromCodePoint(0x1F4E6);
  const e3 = String.fromCodePoint(0x2728);
  const e4 = String.fromCodePoint(0x1F4CB);
  const pt = String.fromCodePoint(0x2022);
  const sep = '\u2500'.repeat(20);

  const lineas = [
    `Hola, Atenas ${e1}`,
    ``,
    `estoy interesad@ en este pedido ${e2}`,
    ``,
    `Estos son mis datos:`,
    ``,
    ...(codigo ? [`${pt} N\u00famero de pedido: *${codigo}*`] : []),
    `${pt} Nombre: ${datos.nombreCompleto}`,
    `${pt} Tel\u00e9fono: ${datos.tel}`,
    datos.cedula ? `${pt} C\u00e9dula: ${datos.cedula}` : null,
    `${pt} Ciudad: ${datos.ciudad}`,
    `${pt} Direcci\u00f3n: ${datos.direccion}`,
    `${pt} M\u00e9todo de pago: ${pagoLabel}`,
    !ubicacionCartagena ? `${pt} El env\u00edo se cotiza despu\u00e9s.` : null,
    metodoPago === 'contraentrega' ? `${pt} El env\u00edo se paga anticipado.` : null,
    ``,
    sep,
    `*Resumen del pedido* ${e4}`,
    ``,
    ...carrito.map(i => `${pt} ${i.nombre} (x${i.cantidad})  *${formatCOP(i.precio * i.cantidad)}*`),
    ``,
    descuento > 0 ? `Descuento aplicado: *-${formatCOP(descuento)}*` : null,
    domicilio > 0 ? `Domicilio: *${formatCOP(domicilio)}*` : null,
    ``,
    `*TOTAL: ${formatCOP(total)}*`,
    sep,
    ``,
    `Quedo atenta a la Confirmaci\u00f3n ${e3}`,
  ].filter(l => l !== null).join('\n');

  const urlWA = `https://api.whatsapp.com/send?phone=${NEGOCIO.whatsapp}&text=${encodeURIComponent(lineas)}`;
  if (ventanaWA && !ventanaWA.closed) ventanaWA.location.href = urlWA;
  else window.open(urlWA, '_blank');
  sonidoCaja();

  cerrarCheckout();

  window._ultimoPedido = {
    codigo,
    datosCliente: { nombre: datos.nombreCompleto, tel: datos.tel, ciudad: datos.ciudad, direccion: datos.direccion, cedula: datos.cedula, pagoLabel },
    items: [...carrito],
    totales: { subtotal, descuento, domicilio, total }
  };

  mostrarBotonFactura();
}

function mostrarBotonFactura() {
  let btn = document.getElementById('btn-factura-flotante');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-factura-flotante';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar factura PDF`;
    btn.onclick = descargarFacturaPedido;
    document.body.appendChild(btn);
  }
  btn.style.display = 'flex';
  setTimeout(() => { btn.style.display = 'none'; }, 30000);
}

async function descargarFacturaPedido() {
  if (!window._ultimoPedido) return;
  const { codigo, datosCliente, items, totales } = window._ultimoPedido;
  try {
    const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const pdfBlob = await construirFacturaPDF({
      titulo: 'Comprobante de Venta',
      fecha,
      cliente: datosCliente.nombre,
      telefono: datosCliente.tel,
      metodoPago: datosCliente.pagoLabel,
      numero: String(codigo || '').replace(/[^0-9A-Za-z]/g, '') || '000000',
      items: items.map(i => ({
        nombre: i.nombre,
        cantidad: Number(i.cantidad) || 0,
        precio: Number(i.precio) || 0,
        subtotal: Number(i.precio) * Number(i.cantidad),
        foto: i.foto_url || null,
        desc: i.categoria || ''
      })),
      descuento: Number(totales.descuento) || 0,
      domicilio: Number(totales.domicilio) || 0,
      total: Number(totales.total) || 0
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    const nombreArchivo = `Factura_${String(codigo || '').replace(/[^0-9A-Za-z]/g, '') || 'pedido'}_${datosCliente.nombre.replace(/\s+/g, '_')}.pdf`;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Factura descargada', 'check');
    document.getElementById('btn-factura-flotante').style.display = 'none';
  } catch (e) {
    showToast('Error generando la factura', 'warn');
  }
}

/* ── VALIDACIÓN ── */
function validarFormulario() {
  const nombre = document.getElementById('ch-nombre').value.trim();
  const apellido = document.getElementById('ch-apellido').value.trim();
  const tel = document.getElementById('ch-tel').value.trim();

  if (!nombre) { showToast('Falta tu nombre', 'warn'); return null; }
  if (!tel) { showToast('Falta tu WhatsApp', 'warn'); return null; }
  if (ubicacionCartagena === null) { showToast('Elige si estás en Cartagena o fuera', 'warn'); return null; }

let ciudad, direccion, cedula = '', barrio = '', referencia = '';

  if (ubicacionCartagena) {
    if (!nombreBarrioActual) { showToast('Selecciona tu barrio', 'warn'); return null; }
    const dir = document.getElementById('ch-direccion').value.trim();
    referencia = document.getElementById('ch-referencia').value.trim();
    if (!dir) { showToast('Falta la dirección', 'warn'); return null; }
    ciudad = 'Cartagena';
    barrio = nombreBarrioActual;
    direccion = `${nombreBarrioActual}, ${dir}${referencia ? ' (Punto de Referencia: ' + referencia + ')' : ''}`;
  } else {
    if (!nombreCiudadActual) { showToast('Selecciona tu ciudad', 'warn'); return null; }
    const dirFuera = document.getElementById('ch-direccion-fuera').value.trim();
    cedula = document.getElementById('ch-cedula').value.trim();
    if (!dirFuera) { showToast('Falta la dirección', 'warn'); return null; }
    if (!cedula) { showToast('Falta tu número de cédula', 'warn'); return null; }
    ciudad = nombreCiudadActual;
    barrio = nombreCiudadActual;
    direccion = dirFuera;
  }

  return {
    nombreCompleto: `${nombre} ${apellido}`.trim(),
    tel, ciudad, direccion, cedula, barrio, referencia
  };
}

function toggleBarrioDropdown() {
  document.getElementById('barrio-select-list').classList.toggle('open');
  document.getElementById('barrio-search').focus();
}
function toggleCiudadDropdown() {
  document.getElementById('ciudad-select-list').classList.toggle('open');
  document.getElementById('ciudad-search').focus();
}