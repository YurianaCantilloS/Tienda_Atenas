/* ============================================================
   PANEL DE ADMINISTRACIÓN — ATENAS STYLE SHOP
   ------------------------------------------------
   - Login con Supabase Auth (solo tú puedes entrar)
   - Productos: ver ERP + externos, mostrar/ocultar, crear
   - Pedidos: los que dejaron los clientes, con estado
   - Resumen: gráficas de ventas
   - Apariencia: banner y avisos de la página, sin tocar código

   Autorización real: la tabla "pedidos" solo deja leer y
   modificar a quien tenga sesión iniciada (ver sql/panel-admin.sql)
   ============================================================ */

const CATEGORIAS = [
  'capilar', 'facial', 'corporal', 'maquillaje',
  'accesorios', 'electricos', 'varios', 'ropa'
];

/* Cada estado tiene su ícono y su color.
   Cambiar un estado es un click: no hay que confirmar nada. */
const ICONO = {
  nuevo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4L12 2z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/></svg>',
  entregado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>',
  cancelado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
};

const ICONO_WHATSAPP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12 12 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.99 2.898 9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.548 4.142 1.588 5.945L0 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.585 0 11.946-5.359 11.949-11.945a11.87 11.87 0 0 0-3.421-8.399"/></svg>';

const ESTADOS = [
  { valor: 'nuevo',      label: 'Nuevo' },
  { valor: 'entregado',  label: 'Entregado' }
];

const CAMPOS_BASE = 'id, referencia, nombre, categoria, costo, precio, stock, foto_url, descripcion, origen, mostrar_en_tienda, tipo_venta, creado_en_tienda, producto_padre_id';
const CAMPOS = CAMPOS_BASE + ', nuevo_ingreso, nuevo_ingreso_at';

/* ¿La base ya tiene la columna "nuevo_ingreso"? Arranca en true y
   se apaga solo si Supabase responde que la columna no existe
   (falta correr sql/tematicas-y-nuevos.sql). */
let TIENE_NUEVO = true;

let PRODUCTOS = [];
let PEDIDOS = [];
let filtroProd = 'todos';
let filtroPed = 'todos';
let paginaPed = 0;
const POR_PAGINA = 15;

/* ── Utilidades ──────────────────────────────── */

function formatCOP(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

/* Escribe 10000 y se ve 10.000 */
function miles(input) {
  const soloCifras = input.value.replace(/\D/g, '');
  input.value = soloCifras ? Number(soloCifras).toLocaleString('es-CO') : '';
}

/* Lee un campo con puntos de miles como número */
function leerMonto(id) {
  return Number(String(document.getElementById(id).value).replace(/\D/g, '')) || 0;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* Iconos de notificación (mismo estilo de la tienda) */
const T_ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.22 14.03-3.6-3.6 1.42-1.42 2.18 2.18 5.18-5.18 1.42 1.42-6.6 6.6Z"/></svg>',
  warn:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM11 9a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V9Zm1 8.6a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.54 12.12-1.42 1.42L12 13.42l-2.12 2.12-1.42-1.42L10.58 12 8.46 9.88l1.42-1.42L12 10.58l2.12-2.12 1.42 1.42L13.42 12l2.12 2.12Z"/></svg>'
};

let toastTimer;
function aviso(msg, tipo = 'ok', estado = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  const tipoFinal = tipo === 'error' ? 'error' : (tipo === 'warn' ? 'warn' : 'check');
  const icono = estado && ICONO[estado] ? ICONO[estado] : (T_ICONS[tipoFinal] || T_ICONS.check);
  t.classList.remove('show', 't-check', 't-warn', 't-error', 'st-nuevo', 'st-entregado', 'st-cancelado');
  void t.offsetWidth; /* fuerza reflow para reiniciar la animación */
  t.innerHTML = '<span class="toast-ico">' + icono + '</span><span class="toast-msg">' + msg + '</span>';
  t.classList.add('show', 't-' + tipoFinal);
  if (estado) t.classList.add('st-' + estado);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), tipoFinal === 'error' || tipoFinal === 'warn' ? 3400 : 2400);
}

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function fechaLarga(iso) {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function claveFecha(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/* ── Login ──────────────────────────────────── */

/* Muestra u oculta la contraseña escrita (el ojito). */
function toggleClave(btn) {
  const input = btn.parentElement.querySelector('input');
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  btn.classList.toggle('ver', mostrar);
  btn.title = mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña';
  btn.setAttribute('aria-label', btn.title);
}

/* ── Recuperar contraseña (correo con código) ── */
let _recEmail = '';

/* Muestra el formulario de recuperación (paso 1: correo). */
function mostrarRecuperar(desdeEnlace) {
  document.getElementById('login-normal').style.display = 'none';
  document.getElementById('recuperar').style.display = 'block';
  document.getElementById('rec-codigo-error').innerHTML = '';
  document.getElementById('rec-error').innerHTML = '';
  document.getElementById('rec-aviso').innerHTML = '';

  /* Si llegó desde el enlace del correo ya hay sesión: solo pide la nueva clave. */
  if (desdeEnlace) {
    document.getElementById('rec-paso1').style.display = 'none';
    document.getElementById('rec-paso2').style.display = 'block';
    document.getElementById('rec-codigo').closest('.field').style.display = 'none';
    return;
  }

  document.getElementById('rec-paso1').style.display = 'block';
  document.getElementById('rec-paso2').style.display = 'none';
  document.getElementById('rec-codigo').closest('.field').style.display = 'block';
  const em = document.getElementById('login-email').value.trim();
  if (em) document.getElementById('rec-email').value = em;
  setTimeout(() => document.getElementById('rec-email').focus(), 60);
}

function cancelarRecuperar(e) {
  if (e) e.preventDefault();
  document.getElementById('recuperar').style.display = 'none';
  document.getElementById('login-normal').style.display = 'block';
  document.getElementById('login-error').innerHTML = '';
}

/* Traduce el error de límite de correos de Supabase. */
function mensajeCorreo(m) {
  if (/rate limit/i.test(m)) return 'Se enviaron muchos correos seguidos. Espera unos minutos e inténtalo otra vez.';
  return m;
}

/* Paso 1: envía el correo con el código. */
async function enviarCodigo(e) {
  if (e) e.preventDefault();
  const err = document.getElementById('rec-codigo-error');
  const email = document.getElementById('rec-email').value.trim();
  if (!email) {
    err.innerHTML = '<div class="aviso aviso-rojo">Escribe tu correo.</div>';
    document.getElementById('rec-email').focus();
    return;
  }
  err.innerHTML = '';
  const btn = document.querySelector('#rec-paso1 .btn');
  const txt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) {
      err.innerHTML = `<div class="aviso aviso-rojo">${esc(mensajeCorreo(error.message))}</div>`;
      return;
    }
    _recEmail = email;
    document.getElementById('rec-paso1').style.display = 'none';
    document.getElementById('rec-paso2').style.display = 'block';
    document.getElementById('rec-codigo').closest('.field').style.display = 'block';
    document.getElementById('rec-aviso').innerHTML = `<div class="aviso aviso-verde">Te enviamos un código a <strong>${esc(email)}</strong>. Revisa tu correo (y spam).</div>`;
    setTimeout(() => document.getElementById('rec-codigo').focus(), 60);
  } catch (ex) {
    err.innerHTML = `<div class="aviso aviso-rojo">${esc(ex?.message || 'No se pudo enviar el correo')}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = txt;
  }
}

/* Paso 2: verifica el código y guarda la nueva contraseña. */
async function confirmarNuevaClave(e) {
  if (e) e.preventDefault();
  const err = document.getElementById('rec-error');
  const codigo = document.getElementById('rec-codigo').value.trim();
  const p1 = document.getElementById('rec-pass').value;
  const p2 = document.getElementById('rec-pass2').value;
  const email = _recEmail || document.getElementById('rec-email').value.trim();
  err.innerHTML = '';
  if (p1.length < 6) {
    err.innerHTML = '<div class="aviso aviso-rojo">La contraseña debe tener al menos 6 caracteres.</div>';
    return;
  }
  if (p1 !== p2) {
    err.innerHTML = '<div class="aviso aviso-rojo">Las contraseñas no coinciden.</div>';
    return;
  }
  const btn = document.querySelector('#rec-paso2 .btn');
  const txt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      if (!codigo) {
        err.innerHTML = '<div class="aviso aviso-rojo">Escribe el código que llegó a tu correo.</div>';
        return;
      }
      const { error } = await sb.auth.verifyOtp({ email, token: codigo, type: 'recovery' });
      if (error) {
        err.innerHTML = `<div class="aviso aviso-rojo">${esc(/invalid|expired|incorrect|token/i.test(error.message) ? 'Código incorrecto o vencido.' : error.message)}</div>`;
        return;
      }
    }
    const { error: e2 } = await sb.auth.updateUser({ password: p1 });
    if (e2) {
      err.innerHTML = `<div class="aviso aviso-rojo">${esc(e2.message)}</div>`;
      return;
    }
    err.innerHTML = '<div class="aviso aviso-verde">¡Contraseña actualizada! Entrando al panel...</div>';
    setTimeout(() => revisarSesion(), 900);
  } catch (ex) {
    err.innerHTML = `<div class="aviso aviso-rojo">${esc(ex?.message || 'No se pudo guardar la contraseña')}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = txt;
  }
}

async function iniciarSesion(e) {
  e.preventDefault();

  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-error');

  err.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });

    if (error) {
      err.innerHTML = `<div class="aviso aviso-rojo">${esc(
        /invalid login credentials/i.test(error.message)
          ? 'Correo o contraseña incorrectos'
          : error.message
      )}</div>`;
      return false;
    }

    /* Entra sin recargar la página */
    const entro = await revisarSesion();
    if (!entro) {
      err.innerHTML = '<div class="aviso aviso-rojo">No se pudo abrir el panel. Recarga la página.</div>';
    }
  } catch (ex) {
    err.innerHTML = `<div class="aviso aviso-rojo">${esc(
      ex?.message || 'No se pudo conectar. Revisa tu internet.'
    )}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar al panel';
  }

  return false;
}

async function cerrarSesion() {
  await sb.auth.signOut();
  location.reload();
}

async function revisarSesion() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return false;

  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('app').classList.add('visible');

  llenarCategorias();
  cargarAjustes();
  await Promise.all([cargarProductos(), cargarPedidos()]);
  cargarResumen();
  return true;
}

/* ── Navegación ─────────────────────────────── */

function irA(pagina) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pagina).classList.add('active');
  document.querySelectorAll('.nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pagina);
  });
  if (pagina === 'resumen') cargarResumen();
  if (pagina === 'envios') cargarEnvios();
  if (pagina === 'enlaces') repintarLinks();
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════
   PRODUCTOS
   ══════════════════════════════════════════════ */

function llenarCategorias() {
  const sel = document.getElementById('mp-categoria');
  sel.innerHTML = CATEGORIAS.map(c =>
    `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');
}

async function cargarProductos() {
  const cont = document.getElementById('lista-productos');
  cont.innerHTML = '<div class="cargando"><div class="spinner"></div>Cargando productos...</div>';

  let { data, error } = await sb.from('productos').select(CAMPOS).order('orden', { ascending: true });

  /* Si todavía no corriste sql/tematicas-y-nuevos.sql, reintenta sin
     las columnas nuevas para que el panel siga funcionando. */
  if (error && /column|does not exist/i.test(error.message || '')) {
    TIENE_NUEVO = false;
    ({ data, error } = await sb.from('productos').select(CAMPOS_BASE).order('orden', { ascending: true }));
  }

  if (error) {
    const faltaSql = /column|does not exist/i.test(error.message);
    cont.innerHTML = `<div class="aviso aviso-rojo">
      No se pudieron cargar los productos: ${esc(error.message)}
      ${faltaSql ? `<br><br>Falta correr <code>sql/panel-admin.sql</code> en el SQL Editor de Supabase.
                    Si ya lo corriste, revisa que la tabla <code>productos</code> tenga las columnas
                    <code>origen</code> y <code>creado_en_tienda</code>.` : ''}
    </div>`;
    return;
  }
  PRODUCTOS = data || [];
  renderChipsProductos();
  filtrarProductos();
  repintarPreviews(); /* las vistas previas de Apariencia usan estos productos */
}

function renderChipsProductos() {
  const n = {
    todos: PRODUCTOS.length,
    publicados: PRODUCTOS.filter(p => p.mostrar_en_tienda).length,
    ocultos: PRODUCTOS.filter(p => !p.mostrar_en_tienda).length,
    externos: PRODUCTOS.filter(p => p.origen === 'externo').length,
    sinstock: PRODUCTOS.filter(p => !p.stock).length,
    destacados: PRODUCTOS.filter(p => p.nuevo_ingreso).length
  };
  const items = [
    ['todos', 'Todos'], ['publicados', 'Publicados'], ['ocultos', 'Ocultos'],
    ['externos', 'Externos'], ['sinstock', 'Sin stock']
  ];
  if (TIENE_NUEVO) items.push(['destacados', 'Destacados']);
  document.getElementById('chips-productos').innerHTML = items.map(([v, label]) =>
    `<button class="chip ${filtroProd === v ? 'active' : ''}" onclick="setFiltroProd('${v}')">
       ${label}<b>${n[v]}</b>
     </button>`).join('');
}

function setFiltroProd(v) { filtroProd = v; renderChipsProductos(); filtrarProductos(); }

function filtrarProductos() {
  const txt = document.getElementById('buscar-prod').value.trim().toLowerCase();

  let lista = PRODUCTOS.filter(p => {
    switch (filtroProd) {
      case 'publicados': return p.mostrar_en_tienda;
      case 'ocultos':    return !p.mostrar_en_tienda;
      case 'externos':   return p.origen === 'externo';
      case 'sinstock':   return !p.stock;
      case 'destacados': return !!p.nuevo_ingreso;
      default:           return true;
    }
  });

  if (txt) {
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(txt) ||
      (p.referencia || '').toLowerCase().includes(txt));
  }

  const cont = document.getElementById('lista-productos');

  if (!lista.length) {
    cont.innerHTML = `<div class="vacio">
      <div class="big">🔍</div>
      <h3>No hay productos aquí</h3>
      <p>Prueba con otro filtro o crea un producto nuevo.</p>
    </div>`;
    return;
  }

  cont.innerHTML = `
    <div class="grid-productos">
      ${lista.map(tarjetaProducto).join('')}
    </div>`;
}

function tarjetaProducto(p) {
  const flags = [];
  if (!p.mostrar_en_tienda) flags.push('<span class="flag flag-oculto">Oculto</span>');
  if (!p.stock)             flags.push('<span class="flag flag-sinstock">Sin stock</span>');

  /* Estrella sobre la foto: marca/desmarca el "destacado".
     Discreta cuando no está destacado; dorada cuando sí. */
  const estrella = `
        <button class="btn-estrella ${p.nuevo_ingreso ? 'activa' : ''}"
                onclick="alternarDestacado('${p.id}', this)"
                title="${p.nuevo_ingreso ? 'Quitar de destacados' : 'Marcar como destacado'}"
                aria-label="Destacar producto">
          <svg viewBox="0 0 24 24" fill="${p.nuevo_ingreso ? 'currentColor' : 'none'}"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l2.9 6.26 6.6.56-5 4.35 1.5 6.45L12 16.9 5.99 19.6l1.5-6.45-5-4.35 6.6-.56L12 2z"/>
          </svg>
        </button>`;

  return `
    <div class="card-prod ${p.mostrar_en_tienda ? '' : 'oculto'}">
      <div class="card-img">
        ${p.foto_url
          ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nombre)}" loading="lazy"
                 onerror="this.outerHTML='<div class=ph>&#128230;</div>'">`
          : '<div class="ph">&#128230;</div>'}
        ${estrella}
        <div class="card-flags">${flags.join('')}</div>
      </div>
      <div class="card-body">
        <div class="card-nombre">${esc(p.nombre)}</div>
        <div class="card-ref">${esc(p.referencia || 'sin ref')} · ${esc(p.categoria || '')}</div>
        <div class="card-meta">
          <span class="card-precio">${formatCOP(p.precio)}</span>
          <span class="card-stock">stock <b>${p.stock ?? 0}</b></span>
        </div>
      </div>
      <div class="card-acciones">
        <label class="switch" title="${p.mostrar_en_tienda ? 'Ocultar de la página' : 'Publicar en la página'}">
          <input type="checkbox" ${p.mostrar_en_tienda ? 'checked' : ''}
                 onchange="alternarPublicacion('${p.id}', this)">
          <span class="slider"></span>
        </label>
        <button class="btn btn-linea btn-mini" onclick="editarProducto('${p.id}')">Editar</button>
        <button class="btn-icono btn-peligro" onclick="pedirBorrar('${p.id}')"
                title="Borrar de la base de datos" aria-label="Borrar producto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
}

/* La estrella: marca o desmarca un producto como "destacado" */
async function alternarDestacado(id, btn) {
  const p = PRODUCTOS.find(x => x.id === id);
  if (!p) return;
  const nuevo = !p.nuevo_ingreso;

  if (btn) btn.disabled = true;
  const { error } = await sb.from('productos').update({
    nuevo_ingreso: nuevo,
    nuevo_ingreso_at: nuevo ? new Date().toISOString() : null
  }).eq('id', id);

  if (error) {
    if (btn) btn.disabled = false;
    const faltaSql = /column|does not exist/i.test(error.message || '');
    return aviso(faltaSql
      ? 'Falta correr sql/tematicas-y-nuevos.sql para usar destacados'
      : 'No se pudo destacar: ' + error.message, 'error');
  }

  p.nuevo_ingreso = nuevo;
  p.nuevo_ingreso_at = nuevo ? new Date().toISOString() : null;
  renderChipsProductos();
  filtrarProductos();
  repintarPreviews();
  aviso(nuevo ? 'Producto destacado ★' : 'Producto quitado de destacados');
}

async function alternarPublicacion(id, checkbox) {
  checkbox.disabled = true;
  const nuevo = checkbox.checked;
  const { error } = await sb.from('productos').update({ mostrar_en_tienda: nuevo }).eq('id', id);

  if (error) {
    checkbox.checked = !nuevo;
    checkbox.disabled = false;
    return aviso('No se pudo cambiar: ' + error.message, 'error');
  }

  const p = PRODUCTOS.find(x => x.id === id);
  if (p) p.mostrar_en_tienda = nuevo;
  checkbox.disabled = false;
  filtrarProductos();
  repintarPreviews(); /* la página de la vista previa se actualiza sola */
  aviso(nuevo ? 'Publicado en la página' : 'Oculto de la página');
}

/* ── Crear / editar producto ─────────────────── */

function abrirModalProducto() {
  document.getElementById('mp-titulo').textContent = 'Crear producto';
  document.getElementById('mp-sub').textContent =
    'Producto que solo vive en la tienda. No entra al inventario del ERP.';
  document.getElementById('mp-id').value = '';
  document.getElementById('mp-nombre').value = '';
  document.getElementById('mp-precio').value = '';
  document.getElementById('mp-costo').value = '';
  document.getElementById('mp-stock').value = '';
  document.getElementById('mp-foto').value = '';
  vaciarZonaZonaFoto();
  document.getElementById('mp-descripcion').value = '';
  document.getElementById('mp-origen').value = 'externo';
  document.getElementById('mp-tipo').value = 'detal';
  document.getElementById('mp-mostrar').value = 'true';
  document.getElementById('mp-categoria').value = CATEGORIAS[0];
  abrirModal('modal-producto');
}

function editarProducto(id) {
  const p = PRODUCTOS.find(x => x.id === id);
  if (!p) return;

  document.getElementById('mp-titulo').textContent = 'Editar producto';
  document.getElementById('mp-sub').textContent = p.creado_en_tienda
    ? 'Creado en este panel.'
    : 'Este producto viene del ERP. Si cambias el stock aquí, el ERP puede sobrescribirlo.';
  document.getElementById('mp-id').value = p.id;
  document.getElementById('mp-nombre').value = p.nombre || '';
  document.getElementById('mp-precio').value = p.precio ? Number(p.precio).toLocaleString('es-CO') : '';
  document.getElementById('mp-costo').value  = p.costo  ? Number(p.costo).toLocaleString('es-CO')  : '';
  document.getElementById('mp-stock').value = p.stock ?? 0;
  document.getElementById('mp-categoria').value = p.categoria || CATEGORIAS[0];
  document.getElementById('mp-foto').value = p.foto_url || '';
  if (p.foto_url) mostrarFotoEnZona(document.querySelector('.drop[data-destino="mp-foto"]'), p.foto_url);
  else vaciarZonaZonaFoto();
  document.getElementById('mp-descripcion').value = p.descripcion || '';
  document.getElementById('mp-origen').value = p.origen || 'propio';
  document.getElementById('mp-tipo').value = p.tipo_venta || 'detal';
  document.getElementById('mp-mostrar').value = String(!!p.mostrar_en_tienda);
  abrirModal('modal-producto');
}

/* Las referencias de lo que se crea aquí son EXT-0001, EXT-0002...
   Se numeran desde el panel y no desde la base, para no tocar
   el comportamiento del ERP. */
let refOffset = 0;

function siguienteReferenciaExt() {
  const mayores = PRODUCTOS
    .map(p => /^EXT-(\d+)$/.exec(p.referencia || ''))
    .filter(Boolean)
    .map(m => Number(m[1]));
  const n = (mayores.length ? Math.max(...mayores) : 0) + 1 + refOffset;
  refOffset++;
  return 'EXT-' + String(n).padStart(4, '0');
}

async function guardarProducto() {
  const btn = document.getElementById('mp-guardar-btn');
  const id = document.getElementById('mp-id').value;

  const nombre = document.getElementById('mp-nombre').value.trim();
  const precio = leerMonto('mp-precio');

  if (!nombre)  return aviso('Escribe el nombre del producto', 'error');
  if (!precio || precio <= 0) return aviso('Escribe el precio de venta', 'error');

  const datos = {
    nombre,
    precio,
    costo: leerMonto('mp-costo'),
    stock: Number(document.getElementById('mp-stock').value) || 0,
    categoria: document.getElementById('mp-categoria').value,
    foto_url: document.getElementById('mp-foto').value.trim() || null,
    descripcion: document.getElementById('mp-descripcion').value.trim() || null,
    origen: document.getElementById('mp-origen').value,
    tipo_venta: document.getElementById('mp-tipo').value,
    mostrar_en_tienda: document.getElementById('mp-mostrar').value === 'true'
  };

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  let res;
  if (id) {
    res = await sb.from('productos').update(datos).eq('id', id);
  } else {
    res = await sb.from('productos').insert({
      ...datos,
      referencia: siguienteReferenciaExt(),
      stock_inicial: datos.stock,
      creado_en_tienda: true,
      orden: 0
    });
  }

  btn.disabled = false;
  btn.textContent = 'Guardar';

  if (res.error) return aviso('Error: ' + res.error.message, 'error');

  modalCerrar();
  aviso(id ? 'Producto actualizado' : 'Producto creado');
  await cargarProductos();
}

/* ── Borrar ─────────────────────────────────── */

let idABorrar = null;

function pedirBorrar(id) {
  const p = PRODUCTOS.find(x => x.id === id);
  idABorrar = id;
  document.getElementById('conf-titulo').textContent = '¿Borrar producto?';
  document.getElementById('conf-texto').textContent =
    `Se va a borrar "${p?.nombre || ''}" de la base de datos. Si solo quieres que no aparezca en la página, apaga el interruptor en vez de borrarlo.`;
  document.getElementById('conf-btn').textContent = 'Sí, borrar';
  document.getElementById('conf-btn').onclick = borrarProducto;
  abrirModal('modal-confirmar');
}

async function borrarProducto() {
  const { error } = await sb.from('productos').delete().eq('id', idABorrar);
  modalCerrar();
  if (error) return aviso('Error: ' + error.message, 'error');
  aviso('Producto borrado');
  await cargarProductos();
}

const CAMPOS_PEDIDO =
  'id, codigo, cliente, telefono, cedula, ciudad, barrio, direccion, referencia, ' +
  'metodo_pago, productos, subtotal, descuento, domicilio, total, estado, created_at';

async function cargarPedidos() {
  const cont = document.getElementById('lista-pedidos');

  const { data, error } = await sb.from('pedidos')
    .select(CAMPOS_PEDIDO)
    .order('created_at', { ascending: false });

  if (error) {
    const faltaTabla = /relation|does not exist/i.test(error.message);
    if (cont) {
      cont.innerHTML = `<div class="aviso aviso-rojo">
        No se pudieron cargar los pedidos: ${esc(error.message)}
        ${faltaTabla ? '<br><br>Falta correr <code>sql/panel-admin.sql</code> en el SQL Editor de Supabase.' : ''}
      </div>`;
    }
    return;
  }

  PEDIDOS = data || [];
  renderChipsPedidos();
  renderPedidos();
  marcarBadge();
}

function renderChipsPedidos() {
  const n = { todos: PEDIDOS.length };
  ESTADOS.forEach(e => { n[e.valor] = PEDIDOS.filter(p => (p.estado || 'nuevo') === e.valor).length; });

  document.getElementById('chips-pedidos').innerHTML =
    [{ valor: 'todos', label: 'Todos' }, ...ESTADOS].map(e =>
      `<button class="chip ${filtroPed === e.valor ? 'active' : ''}" onclick="setFiltroPed('${e.valor}')">
         ${e.label}<b>${n[e.valor] || 0}</b>
       </button>`).join('');
}

function setFiltroPed(v) { filtroPed = v; paginaPed = 0; renderChipsPedidos(); renderPedidos(); }

function renderPedidos() {
  const cont = document.getElementById('lista-pedidos');

  let lista = filtroPed === 'todos'
    ? PEDIDOS
    : PEDIDOS.filter(p => (p.estado || 'nuevo') === filtroPed);

  if (!lista.length) {
    cont.innerHTML = `<div class="vacio">
      <div class="big">&#129534;</div>
      <h3>No hay pedidos aquí</h3>
      <p>Cuando alguien compre en la tienda, el pedido aparece en esta lista.</p>
    </div>`;
    return;
  }

  const visibles = lista.slice(0, paginaPed + POR_PAGINA);

  cont.innerHTML = visibles.map(tarjetaPedido).join('') +
    (lista.length > visibles.length
      ? `<div style="text-align:center;margin-top:16px;">
           <button class="btn btn-linea" onclick="paginaPed += 15; renderPedidos()">
             Ver más (${lista.length - visibles.length} restantes)
           </button>
         </div>` : '');
}

function tarjetaPedido(p) {
  const estado = p.estado || 'nuevo';
  return `
    <div class="card-pedido" id="ped-${p.id}">
      <div class="ped-top" onclick="abrirPedido('${p.id}')">
        <span class="ped-codigo">${esc(p.codigo || '—')}</span>
        <div class="ped-info-mini">
          <div class="ped-cliente">${esc(p.cliente || 'Sin nombre')}</div>
          <div class="ped-fecha">${esc(fechaLarga(p.created_at))} · ${esc(p.ciudad || '')}</div>
        </div>
        <span class="ped-total">${formatCOP(p.total)}</span>
        <span class="badge-estado e-${esc(estado)}"><span class="ic">${ICONO[estado] || ''}</span>${esc(estado)}</span>
      </div>
      <div class="ped-detalle">${detallePedido(p)}</div>
    </div>`;
}

function detallePedido(p) {
  const estado = p.estado || 'nuevo';
  const items = Array.isArray(p.productos) ? p.productos : [];
  const telDigitos = String(p.telefono || '').replace(/\D/g, '');
  const telValido = telDigitos.length >= 7;

  const filas = items.map(i => `
    <tr>
      <td>${esc(i.nombre)}</td>
      <td class="num">${i.cantidad}</td>
      <td class="num">${formatCOP(i.precio)}</td>
      <td class="num">${formatCOP(i.precio * i.cantidad)}</td>
    </tr>`).join('');

  return `
    <div class="ped-detalle-seccion">
      <h4>Cliente</h4>
      <div class="ped-kv">
        <div><span>Nombre:</span> ${esc(p.cliente || '—')}</div>
        <div><span>Teléfono:</span> ${esc(p.telefono || '—')}</div>
        ${p.cedula ? `<div><span>Cédula:</span> ${esc(p.cedula)}</div>` : ''}
        <div><span>Ciudad:</span> ${esc(p.ciudad || '—')}</div>
      </div>
    </div>

    <div class="ped-detalle-seccion">
      <h4>Entrega</h4>
      <div class="ped-kv">
        ${p.barrio ? `<div><span>Barrio:</span> ${esc(p.barrio)}</div>` : ''}
        <div><span>Dirección:</span> ${esc(p.direccion || '—')}</div>
        ${p.referencia ? `<div><span>Referencia:</span> ${esc(p.referencia)}</div>` : ''}
        <div><span>Método de pago:</span> ${esc(p.metodo_pago || '—')}</div>
      </div>
    </div>

    <div class="ped-detalle-seccion">
      <h4>Productos</h4>
      <table class="tabla-items">
        <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4">Sin productos registrados</td></tr>'}</tbody>
        <tfoot>
          ${p.descuento > 0 ? `<tr><td colspan="3" class="num">Subtotal</td><td class="num">${formatCOP(p.subtotal)}</td></tr>` : ''}
          ${p.descuento > 0 ? `<tr><td colspan="3" class="num">Descuento</td><td class="num" style="color:var(--verde);">-${formatCOP(p.descuento)}</td></tr>` : ''}
          ${p.domicilio > 0 ? `<tr><td colspan="3" class="num">Domicilio</td><td class="num">${formatCOP(p.domicilio)}</td></tr>` : ''}
          <tr><td colspan="3" class="num"><b>Total</b></td><td class="num"><b>${formatCOP(p.total)}</b></td></tr>
        </tfoot>
      </table>
    </div>

    <div class="ped-acciones">
      <button class="ped-btn ped-btn-entregado"
              onclick="event.stopPropagation();cambiarEstado('${p.id}','entregado')">
        <span class="ic">${ICONO.entregado}</span> ENTREGADO
      </button>

      <button class="ped-btn ped-btn-cancelar"
              onclick="event.stopPropagation();pedirBorrarPedido('${p.id}')">
        <span class="ic">${ICONO.cancelado}</span> CANCELAR
      </button>

      <button class="ped-btn ped-btn-wa${telValido ? '' : ' ped-btn-off'}"
              onclick="event.stopPropagation();escribirWhatsApp('${p.id}')"
              title="${telValido ? 'Escribir al ' + esc(p.telefono) : 'Este pedido no tiene celular'}">
        <span class="ic">${ICONO_WHATSAPP}</span> Enviar por WhatsApp
      </button>

      <button class="ped-btn ped-btn-factura"
              onclick="event.stopPropagation();generarFacturaPedido('${p.id}')">
        <span class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span> Factura
      </button>
    </div>`;
}

function abrirPedido(id) {
  document.getElementById('ped-' + id)?.classList.toggle('abierto');
}

/* Escribe al cliente por WhatsApp. Si el celular quedó mal (menos de 7
   dígitos) avisa en vez de abrir un chat roto. Los números de 10 dígitos
   se completan con el código de Colombia (57). */
function escribirWhatsApp(id) {
  const p = PEDIDOS.find(x => x.id === id);
  if (!p) return;
  const tel = String(p.telefono || '').replace(/\D/g, '');
  if (tel.length < 7) {
    return aviso('Este pedido no tiene un celular válido para WhatsApp.', 'warn');
  }
  const numero = tel.length === 10 ? '57' + tel : tel;
  const msg = 'Hola ' + (p.cliente || '') + ', te escribimos de Atenas Style Shop ' +
    'sobre tu pedido ' + (p.codigo || '') + '.';
  window.open('https://api.whatsapp.com/send?phone=' + numero + '&text=' + encodeURIComponent(msg), '_blank');
}

function pedirBorrarPedido(id) {
  const p = PEDIDOS.find(x => x.id === id);
  document.getElementById('conf-titulo').textContent = '¿Borrar este pedido?';
  document.getElementById('conf-texto').textContent =
    `Se va a borrar el pedido ${p?.codigo || ''} de ${p?.cliente || 'el cliente'}. ` +
    `No se puede deshacer.`;
  document.getElementById('conf-btn').textContent = 'Sí, borrar';
  document.getElementById('conf-btn').onclick = () => borrarPedido(id);
  abrirModal('modal-confirmar');
}

async function borrarPedido(id) {
  const { error } = await sb.from('pedidos').delete().eq('id', id);
  modalCerrar();
  if (error) return aviso('Error: ' + error.message, 'error');

  PEDIDOS = PEDIDOS.filter(x => x.id !== id);
  renderChipsPedidos();
  renderPedidos();
  marcarBadge();
  cargarResumen();
  aviso('Pedido borrado');
}

async function cambiarEstado(id, estado) {
  const { error } = await sb.from('pedidos').update({ estado }).eq('id', id);
  if (error) return aviso('Error: ' + error.message, 'error');

  const p = PEDIDOS.find(x => x.id === id);
  if (p) p.estado = estado;

  const card = document.getElementById('ped-' + id);
  if (card) {
    const badge = card.querySelector('.badge-estado');
    if (badge) {
      badge.className = 'badge-estado e-' + estado;
      badge.innerHTML = '<span class="ic">' + (ICONO[estado] || '') + '</span>' + estado;
    }
    const detalle = card.querySelector('.ped-detalle');
    if (detalle && p) detalle.innerHTML = detallePedido(p);
  }

  renderChipsPedidos();
  marcarBadge();
  aviso(((estado || '').charAt(0).toUpperCase() + (estado || '').slice(1)) + (p && p.nombre ? ': ' + p.nombre : ''), 'ok', estado);
}

function marcarBadge() {
  const nuevos = PEDIDOS.filter(p => (p.estado || 'nuevo') === 'nuevo').length;
  const badge = document.getElementById('badge-pedidos');
  badge.textContent = nuevos;
  badge.style.display = nuevos ? '' : 'none';
}

/* ══════════════════════════════════════════════
   RESUMEN (gráficas)
   ══════════════════════════════════════════════ */

const COLORES = {
  lila: '#9B5FC0', lilaSuave: '#C9A6E0', rosa: '#F25FA4', rosaSuave: '#FFB8DA',
  verde: '#1DB954', amarillo: '#F59E0B', gris: '#9C8DA8', crema: '#FFFCFE'
};
const COLOR_ESTADO = {
  nuevo: COLORES.amarillo,
  entregado: COLORES.verde, cancelado: COLORES.gris
};

let graficas = {};

Chart.defaults.font.family = "'Jost', sans-serif";
Chart.defaults.color = '#9C8DA8';

function configGrafica(tipo, extra = {}) {
  return Object.assign({
    type: tipo,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Jost', size: 11.5, weight: '500' },
            usePointStyle: true, pointStyle: 'circle', padding: 16, boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(58,42,69,.94)',
          padding: 12,
          cornerRadius: 12,
          titleFont: { family: 'Jost', size: 12, weight: '600' },
          bodyFont: { family: 'Jost', size: 12.5 },
          displayColors: false,
          borderColor: 'rgba(255,255,255,.12)',
          borderWidth: 1
        }
      },
      scales: tipo === 'doughnut' ? undefined : {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: 'Jost', size: 10.5 }, maxRotation: 0, autoSkipPadding: 12 }
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: 'rgba(156,141,168,.16)', drawTicks: false },
          ticks: {
            font: { family: 'Jost', size: 10.5 }, padding: 8,
            callback: v => v >= 1000000 ? (v / 1000000) + 'M'
                       : v >= 1000 ? (v / 1000) + 'k' : v
          }
        }
      }
    }
  }, extra);
}

function pintarGrafica(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === 'undefined') return;
  if (graficas[id]) graficas[id].destroy();
  graficas[id] = new Chart(canvas, config);
}

function cargarResumen() {
  if (!PEDIDOS.length) {
    document.getElementById('kpis').innerHTML = '';
    document.getElementById('resumen-periodo').textContent = 'Todavía no hay pedidos registrados.';
    ['grafica-ventas', 'grafica-estados', 'grafica-categorias'].forEach(id => {
      pintarGrafica(id, configGrafica('doughnut', { data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#ECE0F2'] }] } }));
    });
    topVendidos([]);
    return;
  }

  const dias = Number(document.getElementById('filtro-rango').value);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const enRango = PEDIDOS.filter(p => new Date(p.created_at) >= desde);
  const validos = enRango;

  const vendido = validos.reduce((a, p) => a + Number(p.total || 0), 0);
  const ticket = validos.length ? vendido / validos.length : 0;
  const pendientes = PEDIDOS.filter(p => (p.estado || 'nuevo') === 'nuevo').length;

  document.getElementById('resumen-periodo').textContent =
    `Últimos ${dias} días · ${enRango.length} pedidos`;

  document.getElementById('kpis').innerHTML = `
    <div class="kpi kpi-rosa">
      <div class="kpi-label">Vendido</div>
      <div class="kpi-valor">${formatCOP(vendido)}</div>
      <div class="kpi-pie">en ${validos.length} pedidos válidos</div>
    </div>
    <div class="kpi kpi-lila">
      <div class="kpi-label">Pedidos</div>
      <div class="kpi-valor">${enRango.length}</div>
      <div class="kpi-pie">${enRango.length - validos.length} cancelados</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Ticket promedio</div>
      <div class="kpi-valor">${formatCOP(ticket)}</div>
      <div class="kpi-pie">por pedido</div>
    </div>
    <div class="kpi kpi-amarillo">
      <div class="kpi-label">Sin confirmar</div>
      <div class="kpi-valor">${pendientes}</div>
      <div class="kpi-pie">${pendientes ? 'te están esperando' : 'todo al día'}</div>
    </div>`;

  graficaVentas(validos, dias);
  graficaEstados(enRango);
  topVendidos(validos);
  graficaCategorias(validos);
}

function graficaVentas(pedidos, dias) {
  const mapa = new Map();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    mapa.set(claveFecha(d.toISOString()), 0);
  }
  pedidos.forEach(p => {
    const k = claveFecha(p.created_at);
    if (mapa.has(k)) mapa.set(k, mapa.get(k) + Number(p.total || 0));
  });

  const valores = [...mapa.values()];
  const maximo = Math.max(...valores, 0);
  const ctx = document.getElementById('grafica-ventas')?.getContext('2d');

  /* degradado rosa bajo la curva */
  let fondo;
  if (ctx) {
    fondo = ctx.createLinearGradient(0, 0, 0, 270);
    fondo.addColorStop(0, 'rgba(242,95,164,.38)');
    fondo.addColorStop(.55, 'rgba(201,166,224,.20)');
    fondo.addColorStop(1, 'rgba(201,166,224,0)');
  }

  pintarGrafica('grafica-ventas', configGrafica('line', {
    data: {
      labels: [...mapa.keys()].map(fechaCorta),
      datasets: [{
        label: 'Vendido por día',
        data: valores,
        borderColor: COLORES.rosa,
        backgroundColor: fondo || 'rgba(242,95,164,.15)',
        fill: true,
        tension: .4,
        borderWidth: 3,
        pointRadius: dias <= 14 ? 4 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: COLORES.crema,
        pointBorderColor: COLORES.rosa,
        pointBorderWidth: 2.5,
        pointHoverBackgroundColor: COLORES.rosa
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(58,42,69,.94)',
          padding: 12, cornerRadius: 12, displayColors: false,
          titleFont: { family: 'Jost', size: 12, weight: '600' },
          bodyFont: { family: 'Jost', size: 13.5 },
          callbacks: { label: c => formatCOP(c.raw) }
        }
      },
      scales: {
        x: {
          grid: { display: false }, border: { display: false },
          ticks: { font: { family: 'Jost', size: 10.5 }, maxRotation: 0, autoSkipPadding: 14 }
        },
        y: {
          beginAtZero: true, border: { display: false },
          grid: { color: 'rgba(156,141,168,.16)', drawTicks: false },
          ticks: {
            font: { family: 'Jost', size: 10.5 }, padding: 8,
            callback: v => v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M'
                       : v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v
          }
        }
      }
    }
  }));
}

function graficaEstados(pedidos) {
  const conteo = ESTADOS.map(e => ({
    label: e.label,
    valor: pedidos.filter(p => (p.estado || 'nuevo') === e.valor).length
  })).filter(e => e.valor > 0);

  pintarGrafica('grafica-estados', configGrafica('doughnut', {
    data: {
      labels: conteo.map(c => c.label),
      datasets: [{
        data: conteo.map(c => c.valor),
        backgroundColor: conteo.map(c => COLOR_ESTADO[c.label.toLowerCase()] || COLORES.lila),
        borderColor: COLORES.crema,
        borderWidth: 4,
        hoverOffset: 10
      }]
    }
  }));
}

/* Los 5 más vendidos, como en el ERP: con la foto del producto */
function topVendidos(pedidos) {
  const unidades = new Map();
  pedidos.forEach(p => {
    const items = Array.isArray(p.productos) ? p.productos : [];
    items.forEach(i => {
      const actual = unidades.get(i.nombre) || { unidades: 0, dinero: 0, foto: null };
      actual.unidades += Number(i.cantidad || 0);
      actual.dinero += Number(i.precio || 0) * Number(i.cantidad || 0);
      unidades.set(i.nombre, actual);
    });
  });

  /* la foto se busca en los productos que ya tenemos cargados */
  const top = [...unidades.entries()]
    .sort((a, b) => b[1].unidades - a[1].unidades)
    .slice(0, 5)
    .map(([nombre, d]) => {
      const prod = PRODUCTOS.find(p => p.nombre === nombre);
      return { nombre, ...d, foto: (prod && prod.foto_url) || null };
    });

  const cont = document.getElementById('top-vendidos');
  if (!cont) return;

  if (!top.length) {
    cont.innerHTML = `<div class="top-vacio">
      <div class="big">&#128230;</div>
      <p>Cuando lleguen pedidos, aquí verás los 5 productos más vendidos.</p>
    </div>`;
    return;
  }

  const maximo = top[0].unidades;

  cont.innerHTML = top.map((t, i) => `
    <div class="top-item">
      <span class="top-puesto ${i < 3 ? 'medalla' : ''}">${i + 1}</span>
      <div class="top-foto">
        ${t.foto
          ? `<img src="${esc(t.foto)}" alt="" loading="lazy"
                  onerror="this.outerHTML='<span>&#128230;</span>'">`
          : '<span>&#128230;</span>'}
      </div>
      <div class="top-datos">
        <div class="top-nombre">${esc(t.nombre)}</div>
        <div class="top-barra"><span style="width:${Math.round(t.unidades / maximo * 100)}%"></span></div>
      </div>
      <div class="top-cifras">
        <b>${t.unidades}</b>
        <span>und</span>
        <small>${formatCOP(t.dinero)}</small>
      </div>
    </div>`).join('');
}

function graficaCategorias(pedidos) {
  const porCat = new Map();
  pedidos.forEach(p => {
    const items = Array.isArray(p.productos) ? p.productos : [];
    items.forEach(i => {
      const cat = i.categoria || 'sin categoría';
      porCat.set(cat, (porCat.get(cat) || 0) + Number(i.precio || 0) * Number(i.cantidad || 0));
    });
  });

  const lista = [...porCat.entries()].sort((a, b) => b[1] - a[1]);
  const paleta = [COLORES.rosa, COLORES.lila, COLORES.verde, COLORES.amarillo, COLORES.lilaSuave, COLORES.rosaSuave, COLORES.gris];

  pintarGrafica('grafica-categorias', configGrafica('doughnut', {
    data: {
      labels: lista.map(l => l[0]),
      datasets: [{
        data: lista.map(l => l[1]),
        backgroundColor: lista.map((_, i) => paleta[i % paleta.length]),
        borderColor: COLORES.crema,
        borderWidth: 4,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Jost', size: 11 }, usePointStyle: true,
            pointStyle: 'circle', boxWidth: 8, padding: 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(58,42,69,.94)',
          padding: 12, cornerRadius: 12, displayColors: false,
          titleFont: { family: 'Jost', size: 12, weight: '600' },
          bodyFont: { family: 'Jost', size: 13 },
          callbacks: { label: c => formatCOP(c.raw) }
        }
      }
    }
  }));
}

/* ══════════════════════════════════════════════
   AJUSTES
   ══════════════════════════════════════════════ */

function leerAjustes() {
  try { return JSON.parse(localStorage.getItem('atenas_ajustes') || '{}'); }
  catch { return {}; }
}

/* Traído del ERP (Atenas Acounts/frontend/assets/js/app.js:59)
   → ya existe, no hay que crear nada en Cloudinary */
const CLOUDINARY = {
  cloudName: 'wf9vrurd',
  uploadPreset: 'preset_productos'
};

function ajustes() {
  const a = leerAjustes();
  return {
    nombre: a.nombre || '', ciudad: a.ciudad || '', telefono: a.telefono || '',
    whatsapp: a.whatsapp || '', instagram: a.instagram || '',
    /* La subida de fotos siempre sale de CLOUDINARY, que es la que ya
       funciona. Lo que haya quedado guardado en este navegador desde la
       pantalla vieja de Cloudinary ya no manda nada. */
    cloudinary: { ...CLOUDINARY }
  };
}

/* La configuración de subida de fotos vive fija en js/config.js.
   Aquí solo cargamos lo que sí cambia la usuaria. */
function cargarAjustes() {
  cargarApariencia();
  cargarLinks();
}

/* ══════════════════════════════════════════════════════════
   APARIENCIA DE LA PÁGINA (banner + avisos)
   Se guarda en la tabla "configuracion" de Supabase, la misma
   que usa el ERP. Así la tienda la lee sin pedirte nada.
   ══════════════════════════════════════════════════════════ */

const APARIENCIA_DEF = {
  banner_url: '',
  banner_activo: true,
  aviso_texto: '',
  aviso_activo: true,
  aviso_color: 'lila',
  orden_tienda: 'destacados'
};

function leerApariencia() {
  try {
    return { ...APARIENCIA_DEF, ...(JSON.parse(localStorage.getItem('atenas_apariencia')) || {}) };
  } catch (e) {
    return { ...APARIENCIA_DEF };
  }
}

function marcarFaltaSql(mensaje) {
  const box = document.getElementById('aviso-apariencia');
  if (box) box.style.display = 'block';
  return aviso(mensaje, 'error');
}

async function cargarApariencia() {
  let fila = null;
  try {
    const { data, error } = await sb.from('configuracion').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    fila = data;
  } catch (e) {
    /* La tabla existe pero faltan las columnas nuevas, o no hay permiso.
       Mientras tanto usamos lo último que se guardó en este navegador. */
    const avisoBox = document.getElementById('aviso-apariencia');
    if (avisoBox) avisoBox.style.display = 'block';
  }

  /* Lo que hay guardado ahora mismo en la base de datos */
  const hoy = { ...APARIENCIA_DEF, ...(fila || {}) };

  const a = { ...hoy, ...leerApariencia() };

  document.getElementById('ap-banner-url').value        = a.banner_url || '';
  document.getElementById('ap-banner-activo').checked   = a.banner_activo !== false;

  document.getElementById('set-nombre').value    = a.negocio_nombre    || NEGOCIO.nombre    || '';
  document.getElementById('set-ciudad').value    = a.negocio_ciudad    || NEGOCIO.ciudad    || '';
  document.getElementById('set-telefono').value  = a.negocio_telefono  || NEGOCIO.telefono  || '';
  document.getElementById('set-whatsapp').value  = a.negocio_whatsapp  || NEGOCIO.whatsapp  || '';
  document.getElementById('set-instagram').value = a.negocio_instagram || NEGOCIO.instagram || '';

  marcarOrden(a.orden_tienda || 'destacados');

  enviarPreview({ ...hoy, ...cfgDeFormulario() });
  const avisoBox = document.getElementById('aviso-apariencia');
  if (avisoBox) avisoBox.style.display = (fila ? 'none' : 'block');

  preverBanner();
  preverAviso();
  preverContacto();
}

/* ══════════════════════════════════════════════
   VISTA PREVIA REAL
   Los dos marcos de la derecha cargan preview-tienda.html,
   que es la misma página de la tienda con el mismo CSS.
   Aquí solo le pasamos los datos para que se repinte.
   ══════════════════════════════════════════════ */

let CFG_PREVIEW = null;

/* Se manda por postMessage y NO se entra al iframe con propiedades:
   si el panel está abierto con doble clic (file://) o el marco falla,
   el navegador lanza "Failed to read a named property…" y eso no debe
   romper ni la subida de la foto ni nada más. */
function mandarAlPreview(msg) {
  const f = document.getElementById('ap-if-ahora');
  if (!f || !f.contentWindow) return false;
  try { f.contentWindow.postMessage(msg, '*'); return true; }
  catch (e) { console.warn('[vista previa]', e); return false; }
}

function enviarPreview(cfg) {
  CFG_PREVIEW = cfg;
  return mandarAlPreview({ tipo: 'apariencia', cfg });
}

/* Se llama cuando el marco termina de cargar y cuando llegan los productos */
function repintarPreviews() {
  if (CFG_PREVIEW) enviarPreview(CFG_PREVIEW);
  mandarAlPreview({ tipo: 'pintar' });
}

/* Lo que la tienda mostraría si le diera Guardar ahora mismo */
function cfgDeFormulario() {
  return {
    banner_url:    document.getElementById('ap-banner-url').value.trim(),
    banner_activo: document.getElementById('ap-banner-activo').checked,

    negocio_nombre:    document.getElementById('set-nombre').value.trim(),
    negocio_ciudad:    document.getElementById('set-ciudad').value.trim(),
    negocio_telefono:  document.getElementById('set-telefono').value.trim(),
    negocio_whatsapp:  document.getElementById('set-whatsapp').value.trim(),
    negocio_instagram: document.getElementById('set-instagram').value.trim(),

    orden_tienda: leerOrdenSeleccionado()
  };
}

/* ── Orden de los productos ───────────────────── */
function leerOrdenSeleccionado() {
  const el = document.querySelector('input[name="orden"]:checked');
  return el ? el.value : 'destacados';
}

function marcarOrden(valor) {
  valor = valor || 'destacados';
  document.querySelectorAll('input[name="orden"]').forEach(r => { r.checked = r.value === valor; });
  document.querySelectorAll('.orden-opcion').forEach(o => {
    o.classList.toggle('active', o.dataset.orden === valor);
  });
}

function elegirOrden(valor) {
  marcarOrden(valor);
  preverTodo();
}

function preverTodo() {
  enviarPreview(cfgDeFormulario());
}


async function guardarApariencia() {
  const datos = {
    banner_url:    document.getElementById('ap-banner-url').value.trim() || null,
    banner_activo: document.getElementById('ap-banner-activo').checked,

    /* Datos de contacto: los usa la página, el pedido y la factura */
    negocio_nombre:    document.getElementById('set-nombre').value.trim(),
    negocio_ciudad:    document.getElementById('set-ciudad').value.trim(),
    negocio_telefono:  document.getElementById('set-telefono').value.trim(),
    negocio_whatsapp:  document.getElementById('set-whatsapp').value.trim().replace(/\D/g, ''),
    negocio_instagram: document.getElementById('set-instagram').value.trim(),

    /* Orden de los productos de la página */
    orden_tienda: leerOrdenSeleccionado()
  };

  /* Se guardan también en este navegador, por si falta correr el SQL */
  const a = ajustes();
  a.nombre = datos.negocio_nombre;
  a.ciudad = datos.negocio_ciudad;
  a.telefono = datos.negocio_telefono;
  a.whatsapp = datos.negocio_whatsapp;
  a.instagram = datos.negocio_instagram;
  localStorage.setItem('atenas_ajustes', JSON.stringify(a));

  localStorage.setItem('atenas_apariencia', JSON.stringify(datos));

  let { error } = await sb.from('configuracion').update(datos).eq('id', 1);

  /* Si todavía no corriste sql/tematicas-y-nuevos.sql, la columna
     "orden_tienda" no existe: guarda el resto igual y avisa. */
  let ordenOmitido = false;
  if (error && /column|orden_tienda/i.test(error.message || '')) {
    ordenOmitido = true;
    const sinNuevas = { ...datos };
    delete sinNuevas.orden_tienda;
    ({ error } = await sb.from('configuracion').update(sinNuevas).eq('id', 1));
  }

  if (error) {
    return marcarFaltaSql(
      'Se guardó solo en este computador. Falta correr el SQL para que lo vean los clientes: ' +
      error.message
    );
  }

  const box = document.getElementById('aviso-apariencia');
  if (box) box.style.display = 'none';

  if (ordenOmitido) {
    /* El resto quedó guardado, pero el orden no */
    if (box) {
      box.style.display = 'block';
      box.innerHTML = 'El banner y los datos quedaron guardados. ' +
        'Para que el <b>orden de productos</b> se vea en la página, ' +
        'corre <code>sql/tematicas-y-nuevos.sql</code> en Supabase y vuelve a darle Guardar.';
    }
    aviso('Falta correr sql/tematicas-y-nuevos.sql', 'warn');
  } else {
    aviso('Apariencia guardada. Ya la ven los clientes.');
  }

  cargarApariencia(); /* el lado "así está hoy" ya no es el mismo */
}

function usarBannerOriginal() {
  document.getElementById('ap-banner-url').value = '';
  preverBanner();
}

function preverBanner() {
  const zona = document.getElementById('drop-banner');
  const img  = document.getElementById('ap-banner-url').value.trim();
  if (img) mostrarFotoEnZona(zona, img);
  else vaciarZona(zona);
  preverTodo();
}

function preverAviso() { preverTodo(); }

/* El pie de la vista previa: a quién le llega el WhatsApp y el Instagram */
function preverContacto() { preverTodo(); }

/* ══════════════════════════════════════════════════════════
   PÁGINA DE ENLACES (tipo Linktree)
   Todo vive en la columna links_cfg (jsonb) de "configuracion".
   La publica links.html, que lee esa misma fila.
   ══════════════════════════════════════════════════════════ */

const LINKS_DEF = {
  fondo: '',
  marca: 'Atenas Style Shop',
  handle: '@atenas.style_ctg',
  tagline: 'Bodega mayorista de productos de belleza',
  subtagline: 'Compra fácil · Paga al recibir',
  pie: 'Elegancia que se siente, estilo que se vive.',
  items: [
    { icono: 'tienda',   titulo: 'Tienda online',         sub: 'Compra fácil desde tu celular',        url: 'https://tienda-atenas.vercel.app/', activo: true },
    { icono: 'whatsapp', titulo: 'Atención por WhatsApp', sub: 'Escríbenos para atención personalizada', url: 'https://wa.me/573184346975', activo: true },
    { icono: 'pdf',      titulo: 'Catálogo PDF',          sub: 'Mira todos los productos y precios',   url: '', activo: true },
    { icono: 'grupo',    titulo: 'Grupo mayorista',       sub: 'Únete a nuestro grupo exclusivo',      url: '', activo: true }
  ],
  sociales: [
    { icono: 'instagram', url: 'https://www.instagram.com/atenas.style_ctg' },
    { icono: 'tiktok',    url: 'https://www.tiktok.com/@atenas_style' }
  ]
};

let LINKS_CFG = null;

const LK_UP   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
const LK_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
const LK_DEL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function leerLinksLocal() {
  try { return JSON.parse(localStorage.getItem('atenas_links')) || null; } catch (e) { return null; }
}

function normalizarLinks(c) {
  const base = { ...LINKS_DEF, ...(c || {}) };
  base.items = (Array.isArray(base.items) ? base.items : LINKS_DEF.items).map(it => ({
    icono: (it && it.icono) || 'link',
    titulo: (it && it.titulo) || '',
    sub: (it && it.sub) || '',
    url: (it && it.url) || '',
    activo: !it || it.activo !== false
  }));
  base.sociales = (Array.isArray(base.sociales) ? base.sociales : LINKS_DEF.sociales).map(r => ({
    icono: (r && r.icono) || 'link',
    url: (r && r.url) || ''
  }));
  return base;
}

async function cargarLinks() {
  let fila = null, faltoSql = false;
  try {
    const { data, error } = await sb.from('configuracion').select('links_cfg').eq('id', 1).maybeSingle();
    if (error) throw error;
    fila = data;
  } catch (e) {
    faltoSql = true;
  }

  const guardado = (fila && fila.links_cfg) ? fila.links_cfg : leerLinksLocal();
  const cfg = normalizarLinks(guardado || LINKS_DEF);
  LINKS_CFG = cfg;

  document.getElementById('lk-fondo').value      = cfg.fondo || '';
  document.getElementById('lk-marca').value      = cfg.marca || '';
  document.getElementById('lk-handle').value     = cfg.handle || '';
  document.getElementById('lk-tagline').value    = cfg.tagline || '';
  document.getElementById('lk-subtagline').value = cfg.subtagline || '';
  document.getElementById('lk-pie').value        = cfg.pie || '';

  renderEditorItems();
  renderEditorRedes();
  preverLinks();

  const box = document.getElementById('aviso-links');
  if (box) box.style.display = faltoSql ? 'block' : 'none';

  /* Enlace público real: el de Vercel, no la ruta local. */
  const sitio = (typeof SITIO_URL !== 'undefined' && SITIO_URL) ? SITIO_URL.replace(/\/+$/, '') : '';
  const urlPublica = sitio ? (sitio + '/links.html') : 'links.html';
  const url = document.getElementById('lk-url');
  if (url) { url.href = urlPublica; url.textContent = urlPublica; }
  const ver = document.getElementById('lk-ver');
  if (ver) ver.href = urlPublica;
}

function cfgDeFormularioLinks() {
  return {
    fondo:      (document.getElementById('lk-fondo').value || '').trim(),
    marca:      document.getElementById('lk-marca').value,
    handle:     document.getElementById('lk-handle').value,
    tagline:    document.getElementById('lk-tagline').value,
    subtagline: document.getElementById('lk-subtagline').value,
    pie:        document.getElementById('lk-pie').value,
    items:      LINKS_CFG ? LINKS_CFG.items : [],
    sociales:   LINKS_CFG ? LINKS_CFG.sociales : []
  };
}

function preverLinks() {
  const zona = document.querySelector('.drop[data-destino="lk-fondo"]');
  const img  = (document.getElementById('lk-fondo').value || '').trim();
  if (zona) { if (img) mostrarFotoEnZona(zona, img); else vaciarZona(zona); }
  mandarAlPreviewLinks({ tipo: 'links', cfg: cfgDeFormularioLinks() });
}

function repintarLinks() {
  if (!LINKS_CFG) return;
  mandarAlPreviewLinks({ tipo: 'links', cfg: cfgDeFormularioLinks() });
}

/* La vista previa de Enlaces vive en su propio marco (lk-if). */
function mandarAlPreviewLinks(msg) {
  const f = document.getElementById('lk-if');
  if (!f || !f.contentWindow) return false;
  try { f.contentWindow.postMessage(msg, '*'); return true; }
  catch (e) { console.warn('[vista previa enlaces]', e); return false; }
}

function quitarFondoLinks() {
  document.getElementById('lk-fondo').value = '';
  preverLinks();
}

/* ── Editor de botones ───────────────────────── */

function lkSelect(i, actual, handler) {
  return '<select class="lk-sel" onchange="' + handler + '(' + i + ', this.value)">' +
    LINK_ICONOS_LISTA.map(o =>
      '<option value="' + o.id + '"' + (o.id === actual ? ' selected' : '') + '>' + o.nombre + '</option>'
    ).join('') + '</select>';
}

function renderEditorItems() {
  const box = document.getElementById('lk-lista-editor');
  if (!box || !LINKS_CFG) return;
  if (!LINKS_CFG.items.length) {
    box.innerHTML = '<p class="lk-vacio">Todavía no tienes botones. Dale a "Agregar botón".</p>';
    return;
  }
  box.innerHTML = LINKS_CFG.items.map((it, i) => `
    <div class="lk-row">
      <div class="lk-row-ico">${svgLinkIconFor(it.icono)}</div>
      <div class="lk-row-campos">
        <div class="lk-row-top">
          ${lkSelect(i, it.icono, 'lkItemIcono')}
          <label class="switch lk-mini" title="Mostrar en la página">
            <input type="checkbox" ${it.activo ? 'checked' : ''} onchange="lkItemActivo(${i}, this.checked)">
            <span class="slider"></span>
          </label>
          <div class="lk-row-tools">
            <button type="button" class="lk-tool" onclick="moverLink(${i},-1)" title="Subir">${LK_UP}</button>
            <button type="button" class="lk-tool" onclick="moverLink(${i},1)" title="Bajar">${LK_DOWN}</button>
            <button type="button" class="lk-tool lk-tool-del" onclick="quitarLink(${i})" title="Borrar">${LK_DEL}</button>
          </div>
        </div>
        <input class="lk-inp" type="text" value="${esc(it.titulo)}" placeholder="Título (ej: Catálogo)" oninput="lkItemCampo(${i},'titulo',this.value)">
        <input class="lk-inp" type="text" value="${esc(it.sub)}" placeholder="Descripción corta (opcional)" oninput="lkItemCampo(${i},'sub',this.value)">
        <input class="lk-inp lk-inp-url" type="text" value="${esc(it.url)}" placeholder="Pega aquí el link: https://..." oninput="lkItemCampo(${i},'url',this.value)" autocomplete="off">
      </div>
    </div>
  `).join('');
}

function lkItemCampo(i, campo, valor) {
  if (!LINKS_CFG || !LINKS_CFG.items[i]) return;
  LINKS_CFG.items[i][campo] = valor;
  preverLinks();
}

function lkItemIcono(i, v) {
  if (!LINKS_CFG || !LINKS_CFG.items[i]) return;
  LINKS_CFG.items[i].icono = v;
  renderEditorItems();
  preverLinks();
}

function lkItemActivo(i, v) {
  if (!LINKS_CFG || !LINKS_CFG.items[i]) return;
  LINKS_CFG.items[i].activo = v;
  preverLinks();
}

function agregarLink() {
  if (!LINKS_CFG) LINKS_CFG = normalizarLinks(LINKS_DEF);
  LINKS_CFG.items.push({ icono: 'link', titulo: '', sub: '', url: '', activo: true });
  renderEditorItems();
  preverLinks();
  const rows = document.querySelectorAll('#lk-lista-editor .lk-row');
  const last = rows[rows.length - 1];
  if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function quitarLink(i) {
  if (!LINKS_CFG) return;
  LINKS_CFG.items.splice(i, 1);
  renderEditorItems();
  preverLinks();
}

function moverLink(i, dir) {
  if (!LINKS_CFG) return;
  const j = i + dir, a = LINKS_CFG.items;
  if (j < 0 || j >= a.length) return;
  const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  renderEditorItems();
  preverLinks();
}

/* ── Editor de redes sociales ────────────────── */

function renderEditorRedes() {
  const box = document.getElementById('lk-redes-editor');
  if (!box || !LINKS_CFG) return;
  if (!LINKS_CFG.sociales.length) {
    box.innerHTML = '<p class="lk-vacio">Sin redes. Dale a "Agregar red".</p>';
    return;
  }
  box.innerHTML = LINKS_CFG.sociales.map((r, i) => `
    <div class="lk-row lk-row-red">
      <div class="lk-row-ico">${svgLinkIconFor(r.icono)}</div>
      <div class="lk-row-campos">
        ${lkSelect(i, r.icono, 'lkRedIcono')}
        <input class="lk-inp lk-inp-url" type="text" value="${esc(r.url)}" placeholder="https://..." oninput="lkRedUrl(${i},this.value)" autocomplete="off">
      </div>
      <button type="button" class="lk-tool lk-tool-del" onclick="quitarRed(${i})" title="Borrar">${LK_DEL}</button>
    </div>
  `).join('');
}

function lkRedIcono(i, v) {
  if (!LINKS_CFG || !LINKS_CFG.sociales[i]) return;
  LINKS_CFG.sociales[i].icono = v;
  renderEditorRedes();
  preverLinks();
}

function lkRedUrl(i, v) {
  if (!LINKS_CFG || !LINKS_CFG.sociales[i]) return;
  LINKS_CFG.sociales[i].url = v;
  preverLinks();
}

function agregarRed() {
  if (!LINKS_CFG) LINKS_CFG = normalizarLinks(LINKS_DEF);
  LINKS_CFG.sociales.push({ icono: 'instagram', url: '' });
  renderEditorRedes();
  preverLinks();
}

function quitarRed(i) {
  if (!LINKS_CFG) return;
  LINKS_CFG.sociales.splice(i, 1);
  renderEditorRedes();
  preverLinks();
}

async function guardarLinks() {
  const cfg = normalizarLinks(cfgDeFormularioLinks());
  LINKS_CFG = cfg;
  localStorage.setItem('atenas_links', JSON.stringify(cfg));

  const { error } = await sb.from('configuracion').update({ links_cfg: cfg }).eq('id', 1);
  const box = document.getElementById('aviso-links');

  if (error) {
    if (box) box.style.display = 'block';
    return aviso('Se guardó solo en este computador. Falta correr sql/pagina-links.sql: ' + error.message, 'error');
  }
  if (box) box.style.display = 'none';
  aviso('¡Listo! Tu página de enlaces ya está publicada.');
}

/* ══════════════════════════════════════════════
   FOTOS A CLOUDINARY (arrastrar y soltar)
   ══════════════════════════════════════════════ */

/* Muchos archivos llegan sin tipo MIME (fotos del iPhone, archivos
   recientes…): si no trae tipo, miramos la extensión. */
function esImagen(archivo) {
  if (archivo.type && archivo.type.startsWith('image/')) return true;
  if (!archivo.type) return /\.(png|jpe?g|gif|webp|avif|heic|heif|bmp|svg)$/i.test(archivo.name || '');
  return false;
}

/* Todo error se traduce a un mensaje corto que se pueda leer en el recuadro */
function mensajeSubida(err) {
  const m = String((err && err.message) || err || '');
  console.error('[subida de foto]', err);
  if (/upload preset|configur/i.test(m)) return 'Falta configurar la subida de fotos';
  if (/imagen|image|mime/i.test(m)) return 'Ese archivo no es una imagen';
  if (/failed to fetch|network|conexi|load failed/i.test(m)) return 'Revisa tu conexión a internet';
  if (/too large|file size|mb/i.test(m)) return 'La foto pesa demasiado';
  return 'No se pudo subir: ' + (m || 'error desconocido');
}

async function subirFotoACloudinary(archivo) {
  const { cloudName, uploadPreset } = ajustes().cloudinary;

  if (!uploadPreset) throw new Error('Falta el upload preset de Cloudinary');
  if (!esImagen(archivo)) throw new Error('El archivo no es una imagen');

  const cuerpo = new FormData();
  cuerpo.append('file', archivo);
  cuerpo.append('upload_preset', uploadPreset);

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cuerpo
    });
  } catch (e) {
    throw new Error('Failed to fetch');
  }

  let datos = null;
  try { datos = await res.json(); } catch (e) { /* la respuesta no era JSON */ }

  if (!res.ok || !datos || datos.error) {
    throw new Error(datos?.error?.message || ('Cloudinary respondió ' + res.status));
  }
  if (!datos.secure_url) throw new Error('Cloudinary no devolvió la foto');
  return datos.secure_url;
}

function zonaDe(e) {
  let n = e.target;
  while (n && n !== document.body) {
    if (n.classList && n.classList.contains('drop')) return n;
    n = n.parentElement;
  }
  return null;
}

function pintarZona(zona, texto, esError = false) {
  const estado = zona.querySelector('.drop-estado');
  if (!estado) return;
  estado.textContent = texto || '';
  estado.classList.toggle('visible', !!texto);
  estado.classList.toggle('error', esError);
  zona.classList.toggle('con-error', !!esError);
}

function mostrarFotoEnZona(zona, url) {
  if (!zona) return;
  const prev = zona.querySelector('.drop-prev');
  const msg  = zona.querySelector('.drop-msg');
  if (prev) { prev.src = url; prev.hidden = false; }
  if (msg) msg.style.display = 'none';
  zona.classList.add('tiene-foto');
}

/* La zona vuelve a mostrar "Arrastra la foto…" y esconde el botón de cambiar */
function vaciarZona(zona) {
  if (!zona) return;
  const prev = zona.querySelector('.drop-prev');
  const msg  = zona.querySelector('.drop-msg');
  if (prev) { prev.removeAttribute('src'); prev.hidden = true; }
  if (msg) msg.style.display = '';
  const estado = zona.querySelector('.drop-estado');
  if (estado) { estado.textContent = ''; estado.classList.remove('visible', 'error'); }
  zona.classList.remove('tiene-foto', 'con-error');
}

function vaciarZonaZonaFoto() {
  vaciarZona(document.querySelector('.drop[data-destino="mp-foto"]'));
}

/* Mientras editas un producto, su foto nueva ya se muestra en la
   vista previa de la página sin tener que guardar. */
function reflejarFotoProducto(url) {
  const id = document.getElementById('mp-id').value;
  if (!id) return;
  const p = PRODUCTOS.find(x => x.id === id);
  if (p) p.foto_url = url;
}

function procesandoZona(zona, archivo) {
  const destino = zona.dataset.destino;

  pintarZona(zona, ''); /* sin texto: mientras sube solo se ve el brillo */
  zona.classList.add('subiendo');

  subirFotoACloudinary(archivo)
    .then(url => {
      /* Sin mensajes: aparece la foto nada más */
      pintarZona(zona, '');
      mostrarFotoEnZona(zona, url);

      try {
        const input = destino && document.getElementById(destino);
        if (input) input.value = url;

        if (destino === 'mp-foto') reflejarFotoProducto(url);
        if (destino === 'ap-banner-url') preverBanner();
        if (destino === 'lk-fondo') preverLinks();

        repintarPreviews();
      } catch (e) {
        /* la foto sí se subió; si la vista previa falla, no es un error de subida */
        console.warn('[vista previa]', e);
      }
    })
    .catch(err => {
      const mensaje = mensajeSubida(err);
      pintarZona(zona, mensaje, true);
      aviso(mensaje, 'error');
    })
    .finally(() => zona.classList.remove('subiendo'));
}

/* clicks, arrastrar y soltar, en cualquier zona de la página */
document.addEventListener('click', e => {
  const zona = zonaDe(e);
  if (!zona) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  if (e.target.closest('a')) return;

  /* La zona puede no traer su <input type=file> (la del banner se redibuja
     sola al prever), así que lo creamos si hace falta. */
  let input = zona.querySelector('input[type=file]');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    zona.appendChild(input);
  }
  input.click();
});

document.addEventListener('change', e => {
  const zona = zonaDe(e);
  if (!zona || e.target.type !== 'file') return;
  const archivo = e.target.files[0];
  if (archivo) procesandoZona(zona, archivo);
  e.target.value = '';
});

['dragenter', 'dragover'].forEach(evt => {
  document.addEventListener(evt, e => {
    const zona = zonaDe(e);
    if (!zona) return;
    e.preventDefault();
    zona.classList.add('sobre');
  });
});

['dragleave', 'drop'].forEach(evt => {
  document.addEventListener(evt, e => {
    const zona = zonaDe(e);
    if (!zona) return;
    e.preventDefault();
    zona.classList.remove('sobre');
  });
});

document.addEventListener('drop', e => {
  const zona = zonaDe(e);
  if (!zona) return;
  const archivo = e.dataTransfer?.files?.[0];
  if (archivo) procesandoZona(zona, archivo);
});

/* ══════════════════════════════════════════════
   MODALES
   ══════════════════════════════════════════════ */

function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}

function modalCerrar() {
  document.querySelectorAll('.modal-fondo.open').forEach(m => m.classList.remove('open'));
}

/* ══════════════════════════════════════════════
   ENVÍOS: barrios de Cartagena y ciudades
   Se guardan en barrios_cartagena y ciudades_colombia,
   las mismas tablas que lee el checkout de la tienda.
   Requiere correr sql/zonas-envio.sql una vez.
   ══════════════════════════════════════════════ */

let BARRIOS_ADMIN = [];
let CIUDADES_ADMIN = [];

const ENV_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ENV_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function avisoEnviosFalta() {
  const box = document.getElementById('aviso-envios');
  if (box) box.style.display = 'block';
}

async function cargarEnvios() {
  const avisoBox = document.getElementById('aviso-envios');
  if (avisoBox) avisoBox.style.display = 'none';

  const lb = document.getElementById('lista-barrios');
  const lc = document.getElementById('lista-ciudades');
  const cargando = '<div class="cargando"><div class="spinner"></div>Cargando...</div>';
  if (lb) lb.innerHTML = cargando;
  if (lc) lc.innerHTML = cargando;

  const [rb, rc] = await Promise.all([
    sb.from('barrios_cartagena').select('*').order('nombre'),
    sb.from('ciudades_colombia').select('*').order('nombre')
  ]);

  if (rb.error || rc.error) {
    const msg = (rb.error || rc.error).message || 'error';
    const cont = `<div class="aviso aviso-rojo">No se pudieron cargar las zonas: ${esc(msg)}</div>`;
    if (lb) lb.innerHTML = cont;
    if (lc) lc.innerHTML = '';
    return;
  }

  BARRIOS_ADMIN = rb.data || [];
  CIUDADES_ADMIN = rc.data || [];
  renderBarriosAdmin();
  renderCiudadesAdmin();
}

function renderBarriosAdmin() {
  const cont = document.getElementById('lista-barrios');
  const n = document.getElementById('envios-n-barrios');
  if (n) n.textContent = BARRIOS_ADMIN.length ? `(${BARRIOS_ADMIN.length})` : '';
  if (!cont) return;
  if (!BARRIOS_ADMIN.length) {
    cont.innerHTML = '<div class="envios-vacio">Todavía no hay barrios.</div>';
    return;
  }
  cont.innerHTML = BARRIOS_ADMIN.map(b => `
    <div class="envios-row">
      <div class="envios-row-info">
        <span class="envios-nombre">${esc(b.nombre)}</span>
        <span class="envios-valor">${formatCOP(b.valor_domicilio || 0)}</span>
      </div>
      <div class="envios-row-acciones">
        <button class="envios-editar" title="Editar" onclick="abrirZona('barrio','${b.id}')">${ENV_EDIT}</button>
        <button class="envios-del" title="Eliminar" onclick="pedirBorrarZona('barrio','${b.id}')">${ENV_DEL}</button>
      </div>
    </div>`).join('');
}

function renderCiudadesAdmin() {
  const cont = document.getElementById('lista-ciudades');
  const n = document.getElementById('envios-n-ciudades');
  if (n) n.textContent = CIUDADES_ADMIN.length ? `(${CIUDADES_ADMIN.length})` : '';
  if (!cont) return;
  if (!CIUDADES_ADMIN.length) {
    cont.innerHTML = '<div class="envios-vacio">Todavía no hay ciudades.</div>';
    return;
  }
  cont.innerHTML = CIUDADES_ADMIN.map(c => `
    <div class="envios-row">
      <div class="envios-row-info">
        <span class="envios-nombre">${esc(c.nombre)}</span>
        <span class="envios-valor">${esc(c.departamento || '')}</span>
      </div>
      <div class="envios-row-acciones">
        <button class="envios-editar" title="Editar"
                onclick="abrirZona('ciudad','${c.id}')">${ENV_EDIT}</button>
        <button class="envios-del" title="Eliminar"
                onclick="pedirBorrarZona('ciudad','${c.id}')">${ENV_DEL}</button>
      </div>
    </div>`).join('');
}

/* Ejecuta una escritura y confirma que sí se guardó. Si el permiso
   no existe (falta correr sql/zonas-envio.sql) avisa y no deja creer
   que se guardó. */
async function guardarEnvios(promesa, msgOk) {
  const { data, error } = await promesa.select('id');
  if (error) {
    avisoEnviosFalta();
    aviso('No se pudo guardar: ' + (error.message || 'error'), 'error');
    return false;
  }
  if (!data || !data.length) {
    avisoEnviosFalta();
    aviso('No se pudo guardar. Corre sql/zonas-envio.sql', 'error');
    return false;
  }
  if (msgOk) aviso(msgOk);
  return true;
}

/* ── Modal para agregar / editar una zona ── */

let zonaBorrar = null;

function abrirZona(tipo, id) {
  const esBarrio = tipo === 'barrio';
  const lista = esBarrio ? BARRIOS_ADMIN : CIUDADES_ADMIN;
  const item = id ? lista.find(x => String(x.id) === String(id)) : null;

  document.getElementById('zona-tipo').value = tipo;
  document.getElementById('zona-id').value = id || '';

  const nombre = document.getElementById('zona-nombre');
  const extra = document.getElementById('zona-extra');

  document.getElementById('zona-titulo').textContent =
    (item ? 'Editar ' : 'Agregar ') + (esBarrio ? 'barrio' : 'ciudad');
  document.getElementById('zona-sub').textContent = esBarrio
    ? 'El valor del domicilio que se cobra en Cartagena para ese barrio.'
    : 'Ciudades fuera de Cartagena. El envío se cotiza aparte.';
  document.getElementById('zona-nombre-label').textContent =
    esBarrio ? 'Nombre del barrio' : 'Ciudad / Municipio';
  document.getElementById('zona-extra-label').textContent =
    esBarrio ? 'Valor del domicilio' : 'Departamento';

  nombre.value = item ? (item.nombre || '') : '';
  if (esBarrio) {
    extra.placeholder = '10.000';
    extra.inputMode = 'numeric';
    extra.oninput = function () { miles(extra); };
    extra.value = item ? Number(item.valor_domicilio || 0).toLocaleString('es-CO') : '';
  } else {
    extra.placeholder = 'Ej: Bolívar';
    extra.inputMode = 'text';
    extra.oninput = null;
    extra.value = item ? (item.departamento || '') : '';
  }

  abrirModal('modal-zona');
  setTimeout(() => nombre.focus(), 60);
}

async function guardarZona() {
  const tipo = document.getElementById('zona-tipo').value;
  const id = document.getElementById('zona-id').value;
  const esBarrio = tipo === 'barrio';
  const nombre = document.getElementById('zona-nombre').value.trim();
  if (!nombre) { aviso(esBarrio ? 'Escribe el nombre del barrio' : 'Escribe la ciudad', 'warn'); return; }

  const btn = document.getElementById('zona-guardar');
  btn.disabled = true;

  let ok;
  if (esBarrio) {
    const valor = Number(String(document.getElementById('zona-extra').value).replace(/\D/g, '')) || 0;
    const datos = { nombre, valor_domicilio: valor };
    ok = await guardarEnvios(
      id ? sb.from('barrios_cartagena').update(datos).eq('id', id)
         : sb.from('barrios_cartagena').insert(datos),
      id ? 'Barrio actualizado' : 'Barrio agregado'
    );
  } else {
    const departamento = document.getElementById('zona-extra').value.trim();
    const datos = { nombre, departamento };
    ok = await guardarEnvios(
      id ? sb.from('ciudades_colombia').update(datos).eq('id', id)
         : sb.from('ciudades_colombia').insert(datos),
      id ? 'Ciudad actualizada' : 'Ciudad agregada'
    );
  }

  btn.disabled = false;
  if (ok) { modalCerrar(); await cargarEnvios(); }
}

function pedirBorrarZona(tipo, id) {
  zonaBorrar = { tipo, id };
  const esBarrio = tipo === 'barrio';
  const lista = esBarrio ? BARRIOS_ADMIN : CIUDADES_ADMIN;
  const item = lista.find(x => String(x.id) === String(id));
  document.getElementById('conf-titulo').textContent =
    esBarrio ? '¿Eliminar este barrio?' : '¿Eliminar esta ciudad?';
  document.getElementById('conf-texto').textContent =
    `Se quitará "${item?.nombre || ''}" de las zonas de envío. Esta acción no se puede deshacer.`;
  document.getElementById('conf-btn').textContent = 'Sí, eliminar';
  document.getElementById('conf-btn').onclick = borrarZonaConfirmada;
  abrirModal('modal-confirmar');
}

async function borrarZonaConfirmada() {
  if (!zonaBorrar) return;
  const { tipo, id } = zonaBorrar;
  const esBarrio = tipo === 'barrio';
  const tabla = esBarrio ? 'barrios_cartagena' : 'ciudades_colombia';
  const ok = await guardarEnvios(
    sb.from(tabla).delete().eq('id', id),
    esBarrio ? 'Barrio eliminado' : 'Ciudad eliminada'
  );
  zonaBorrar = null;
  modalCerrar();
  await cargarEnvios();
}

/* ── Arranque ────────────────────────────────── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') modalCerrar();
});

/* Si el usuario llega desde el enlace del correo, Supabase avisa aquí. */
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') mostrarRecuperar(true);
});

revisarSesion();
