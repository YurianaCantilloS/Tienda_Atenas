/* ============================================================
   CONEXIÓN A SUPABASE — TRAE PRODUCTOS Y STOCK REAL
   ============================================================

   IMPORTANTE: la tabla "productos" debe tener una columna
   "categoria" con alguno de estos valores exactos:
   capilar | facial | corporal | maquillaje | accesorios | electricos | varios | ropa

   Si la columna no existe todavía, créala en Supabase:
   ALTER TABLE productos ADD COLUMN categoria text;
   ============================================================ */

/* Columnas base (siempre existen) y las nuevas que llegan con
   sql/tematicas-y-nuevos.sql. Si esa migración todavía no se corrió,
   la consulta con "nuevo_ingreso" falla y se reintenta sin ella,
   para que la tienda NUNCA se quede en blanco. */
const CAMPOS_PROD_BASE =
  'id, referencia, nombre, precio, stock, categoria, foto_url, descripcion, tipo_venta, producto_padre_id';
const CAMPOS_PROD_NUEVO = CAMPOS_PROD_BASE + ', nuevo_ingreso, nuevo_ingreso_at, created_at';

async function fetchProductos() {
  let { data, error } = await sb
    .from('productos')
    .select(CAMPOS_PROD_NUEVO)
    .eq('mostrar_en_tienda', true)
    .order('stock', { ascending: false });

  if (error && /column|does not exist/i.test(error.message || '')) {
    ({ data, error } = await sb
      .from('productos')
      .select(CAMPOS_PROD_BASE)
      .eq('mostrar_en_tienda', true)
      .order('stock', { ascending: false }));
  }

  if (error) {
    console.error('Error cargando productos de Supabase:', error);
    showToast('No se pudieron cargar los productos', 'warn');
    return [];
  }

  return aplicarStockDePiezas(data || []);
}

/* Una "pieza" es una parte de un pack (por ejemplo las 3 piezas de un
   vestido x3). La pieza no tiene stock propio: usa el del pack, que vive
   oculto en la base de datos. Por eso hay que buscar los packs aparte. */
async function aplicarStockDePiezas(productos) {
  const idsDePack = [...new Set(productos
    .filter(p => p.producto_padre_id)
    .map(p => p.producto_padre_id))];

  if (!idsDePack.length) return productos;

  const { data: packs, error } = await sb
    .from('productos')
    .select('id, nombre, stock')
    .in('id', idsDePack);

  if (error) {
    console.error('Error cargando los packs de las piezas:', error);
    return productos;
  }

  const porId = new Map((packs || []).map(p => [p.id, p]));
  productos.forEach(p => {
    if (!p.producto_padre_id) return;
    const pack = porId.get(p.producto_padre_id);
    if (!pack) return;
    p.stock = pack.stock;
    p.es_pieza = true;
    p.nombre_pack = pack.nombre;
  });

  return productos;
}

async function fetchBarrios() {
  const { data, error } = await sb.from('barrios_cartagena').select('*').order('nombre');
  if (error) { console.error('Error cargando barrios:', error); return []; }
  return data || [];
}
async function fetchCiudades() {
  const { data, error } = await sb
    .from('ciudades_colombia')
    .select('nombre, departamento')
    .order('nombre');
  if (error) { console.error('Error cargando ciudades:', error); return []; }
  return data || [];
}

/* Guarda el pedido en la tabla "pedidos" para que aparezca en el panel.
   IMPORTANTE: la tabla solo deja LEER al admin (ver sql/panel-admin.sql),
   así que NO se puede pedir la fila de vuelta con .select(): Supabase
   cancelaría el insert completo del cliente (error de política RLS).
   Para conservar el número real de pedido (ATH-1001, ATH-1002, ...) se usa
   la función "crear_pedido" de sql/guardar-pedido.sql, que guarda y devuelve
   el número. Si esa función todavía no se ha creado, se guarda igual con un
   número de respaldo: el pedido nunca deja de llegar por WhatsApp. */
async function guardarPedido(datos, items, totales, extra = {}) {
  const productos = items.map(i => ({
    id: i.id,
    nombre: i.nombre,
    categoria: i.categoria,
    precio: Number(i.precio),
    cantidad: i.cantidad
  }));

  /* Camino recomendado: la función de la base guarda y devuelve el número. */
  try {
    const { data, error } = await sb.rpc('crear_pedido', {
      p_cliente: datos.nombreCompleto,
      p_telefono: datos.tel,
      p_cedula: datos.cedula || null,
      p_ciudad: datos.ciudad,
      p_barrio: datos.barrio || null,
      p_direccion: datos.direccion,
      p_referencia: datos.referencia || null,
      p_metodo_pago: extra.metodoPago,
      p_productos: productos,
      p_subtotal: totales.subtotal,
      p_descuento: totales.descuento,
      p_domicilio: totales.domicilio,
      p_total: totales.total
    });
    if (!error) return data || null;
    const noExiste = /PGRST202|could not find|schema cache|does not exist/i.test(error.message || '');
    if (!noExiste) { console.warn('El pedido no se guardó en el panel:', error.message); return null; }
  } catch (e) {
    /* la función no está todavía: seguimos con el respaldo */
  }

  /* Respaldo: insert directo, sin pedir la fila de vuelta (solo números). */
  const codigo = 'ATH-' + String(Date.now()).slice(-7);
  try {
    const { error } = await sb.from('pedidos').insert({
      codigo,
      cliente: datos.nombreCompleto,
      telefono: datos.tel,
      cedula: datos.cedula || null,
      ciudad: datos.ciudad,
      barrio: datos.barrio || null,
      direccion: datos.direccion,
      referencia: datos.referencia || null,
      metodo_pago: extra.metodoPago,
      productos,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      domicilio: totales.domicilio,
      total: totales.total
    });

    if (error) { console.warn('El pedido no se guardó en el panel:', error.message); return null; }
    return codigo;
  } catch (e) {
    console.warn('El pedido no se guardó en el panel:', e);
    return null;
  }
}