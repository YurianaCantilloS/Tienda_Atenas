/* ============================================================
   PANEL DE ADMINISTRACIÓN — ATENAS STYLE SHOP
   ------------------------------------------------
   QUÉ TIENE QUE HACER:
   1. Abre Supabase → botón izquierdo "SQL Editor" → "New query"
   2. Copia TODO este archivo y pégalo ahí
   3. Presiona "Run" (o el botón ▶)

   Puedes correrlo varias veces sin miedo: todo está protegido
   con "if not exists" / "drop policy if exists".
   ============================================================ */


/* ───────────────────────────────────────────────
   PARTE 1 — Packs (un producto que son varias piezas)
   ───────────────────────────────────────────────
   Tu caso del "Vestido de baño x3 piezas":
   el PADRE se queda en el ERP (oculto, con su stock real)
   y las 3 PIEZAS son filas nuevas que heredan ese stock.
   ─────────────────────────────────────────────── */

alter table productos
  add column if not exists producto_padre_id uuid
    references productos(id) on delete set null;

-- marca los productos que nacieron en el panel (no en el ERP)
alter table productos
  add column if not exists creado_en_tienda boolean default false;

create index if not exists idx_productos_padre
  on productos(producto_padre_id);


/* ───────────────────────────────────────────────
   PARTE 2 — Compatibilidad
   ───────────────────────────────────────────────
   Para que el panel pueda crear productos sin que la base
   de datos los rechace. No cambia tus datos, solo permite
   que las columnas vacías se guarden sin problema.
   ─────────────────────────────────────────────── */

alter table productos alter column referencia      drop not null;
alter table productos alter column nombre          drop not null;
alter table productos alter column categoria       drop not null;
alter table productos alter column precio          drop not null;
alter table productos alter column stock           drop not null;
alter table productos alter column tipo_venta      drop not null;
alter table productos alter column mostrar_en_tienda drop not null;
alter table productos alter column origen          drop not null;

alter table productos alter column stock           set default 0;
alter table productos alter column stock_inicial   set default 0;
alter table productos alter column orden           set default 0;
alter table productos alter column tipo_venta      set default 'detal';
alter table productos alter column mostrar_en_tienda set default true;
alter table productos alter column origen          set default 'propio';
alter table productos alter column creado_en_tienda set default false;

-- OJO: aquí NO se le pone valor por defecto a "referencia".
-- Si el ERP inserta productos sin ese campo y le ponemos un default
-- desde la base, el ERP empezaría a inventar referencias propias.
-- Las referencias de los productos del panel se numeran desde admin.js.

-- tu categoría "Corporal" existe en el código pero faltaba en la nota
comment on column productos.categoria is
  'capilar | facial | corporal | maquillaje | accesorios | electricos | varios | ropa';


/* ───────────────────────────────────────────────
   PARTE 3 — Tabla de pedidos
   ───────────────────────────────────────────────
   Cada compra que hacen tus clientes se guarda aquí con
   todos sus datos. Luego tú le pones el estado desde el panel.
   ─────────────────────────────────────────────── */

create sequence if not exists seq_pedidos_codigo start 1001;

create table if not exists pedidos (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique
                   default ('ATH-' || lpad(nextval('seq_pedidos_codigo')::text, 4, '0')),
  cliente        text,
  telefono       text,
  cedula         text,
  ciudad         text,
  barrio         text,
  direccion      text,
  referencia     text,
  metodo_pago    text,
  productos      jsonb default '[]'::jsonb,
  subtotal       numeric default 0,
  descuento      numeric default 0,
  domicilio      numeric default 0,
  total          numeric default 0,
  estado         text default 'nuevo',
  notas          text,
  created_at     timestamptz default now()
);

create index if not exists idx_pedidos_fecha  on pedidos(created_at desc);
create index if not exists idx_pedidos_estado on pedidos(estado);

-- posibles estados de un pedido
comment on column pedidos.estado is
  'nuevo | confirmado | entregado | cancelado';


/* ───────────────────────────────────────────────
   PARTE 4 — Permisos (lo que hace segura la página)
   ───────────────────────────────────────────────
   - Cualquiera que visite la tienda puede registrar un pedido
     (así los clientes no necesitan crear cuenta)
   - SOLO tú, con tu sesión iniciada, puedes ver los pedidos
     y modificar productos
   ─────────────────────────────────────────────── */

alter table pedidos enable row level security;

/* los clientes sí pueden dejar su pedido */
drop policy if exists "pedidos: cualquiera puede crear" on pedidos;
create policy "pedidos: cualquiera puede crear"
  on pedidos for insert to anon, authenticated with check (true);

/* pero los pedidos solo los ves tú */
drop policy if exists "pedidos: solo admin puede ver" on pedidos;
create policy "pedidos: solo admin puede ver"
  on pedidos for select to authenticated using (true);

drop policy if exists "pedidos: solo admin puede editar" on pedidos;
create policy "pedidos: solo admin puede editar"
  on pedidos for update to authenticated using (true) with check (true);

drop policy if exists "pedidos: solo admin puede borrar" on pedidos;
create policy "pedidos: solo admin puede borrar"
  on pedidos for delete to authenticated using (true);


/* ───────────────────────────────────────────────
   PARTE 5 — Tu acceso al panel
   ───────────────────────────────────────────────
   NOTA IMPORTANTE:
   La tabla "productos" NO se bloquea aquí a propósito,
   porque tu ERP la necesita abierta para seguir funcionando.

   Con esto lo que SÍ queda bloqueado es la tabla "pedidos":
   nadie puede ver los datos de tus clientes sin tu clave.

   Para que el panel pueda crear y editar productos desde
   tu sesión iniciada, ejecuta esto (si tu ERP usa la clave
   "service_role" o "anon", esto no le afecta):
   ─────────────────────────────────────────────── */

drop policy if exists "productos: admin puede crear" on productos;
create policy "productos: admin puede crear"
  on productos for insert to authenticated with check (true);

drop policy if exists "productos: admin puede editar" on productos;
create policy "productos: admin puede editar"
  on productos for update to authenticated using (true) with check (true);

drop policy if exists "productos: admin puede borrar" on productos;
create policy "productos: admin puede borrar"
  on productos for delete to authenticated using (true);


/* ───────────────────────────────────────────────
   PARTE 6 — Permisos de tabla
   ───────────────────────────────────────────────
   OJO: esto es distinto a las políticas de la Parte 4.
   Las políticas dicen QUIÉN puede; los permisos dicen SI PUEDE.
   Sin esta parte el panel te va a decir "permission denied".
   ─────────────────────────────────────────────── */

grant usage on schema public to anon, authenticated;

-- la tienda (público) solo necesita leer productos
grant select on productos to anon, authenticated;
grant select on barrios_cartagena to anon, authenticated;
grant select on ciudades_colombia to anon, authenticated;

-- el panel (tú, con tu sesión) sí puede crear y modificar productos
grant insert, update, delete on productos to authenticated;

-- pedidos: el cliente solo lo crea, tú lo lees y lo cambias
grant insert on pedidos to anon, authenticated;
grant select, update, delete on pedidos to authenticated;

-- los contadores también los necesita el panel.
-- nextval() exige permiso de uso sobre la secuencia, y los clientes
-- (anon) insertan pedidos, así que la del código va para los dos.
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;


/* ============================================================
   FIN — Si corrias esto sin errores, ya puedes usar admin.html
   ============================================================ */

