/* ============================================================
   CATEGORÍAS DE PRODUCTOS — COMPARTIDAS (panel, tienda y ERP)
   ============================================================
   Corre esto UNA vez en Supabase → SQL Editor → "New query" → Run.

   Crea la tabla "categorias". Es la MISMA base de datos del ERP,
   así que las categorías que agregues desde el panel (sección
   Categorías) aparecen también cuando creas un producto en el ERP,
   y en los filtros de la tienda.

   El ERP puede leer la lista así:
       select valor, label from categorias where activa order by orden;
   El campo "valor" es el que se guarda en productos.categoria.

   Puedes correrlo varias veces sin miedo.
   ============================================================ */

create table if not exists categorias (
  id     bigint generated always as identity primary key,
  valor  text not null unique,          -- slug guardado en productos.categoria
  label  text not null,                 -- nombre que ve el cliente
  orden  int  not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_categorias_orden on categorias(orden, id);

-- Seguridad (RLS): todos pueden leer, solo el panel (sesión iniciada) escribe.
alter table categorias enable row level security;

drop policy if exists "categorias lectura publica" on categorias;
create policy "categorias lectura publica"
  on categorias for select
  using (true);

drop policy if exists "categorias escritura autenticada" on categorias;
create policy "categorias escritura autenticada"
  on categorias for all
  to authenticated
  using (true)
  with check (true);

-- Categorías iniciales (las que ya usabas). No borra ni toca nada.
insert into categorias (valor, label, orden) values
  ('capilar',    'Capilar',    1),
  ('facial',     'Facial',     2),
  ('corporal',   'Corporal',   3),
  ('maquillaje', 'Maquillaje', 4),
  ('accesorios', 'Accesorios', 5),
  ('electricos', 'Eléctricos', 6),
  ('varios',     'Varios',     7),
  ('ropa',       'Ropa',       8)
on conflict (valor) do nothing;

-- Comprobación
select id, valor, label, orden, activa from categorias order by orden;
