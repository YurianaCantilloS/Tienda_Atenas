/* ============================================================
   TEMÁTICAS + ORDEN DE PRODUCTOS + "NUEVOS INGRESOS"
   ------------------------------------------------
   Corre esto UNA vez en el SQL Editor de Supabase.
   No borra ni cambia nada de lo que ya tienes:
   todo es "add column if not exists".

   QUÉ HACE:
   1. "nuevo_ingreso": la estrella que enciendes desde el panel
      para marcar un producto como DESTACADO.
   2. "created_at": la fecha en que el producto se agregó a la
      base (se llena sola).
   3. "tema": el efecto por temporada que eliges en el panel.
   4. "orden_tienda": cómo se muestran los productos en la página
      (destacados | cantidad | categoria | ninguno).
   ============================================================ */

-- 1) Marca manual de "destacado" (la estrella del panel)
alter table productos
  add column if not exists nuevo_ingreso    boolean not null default false,
  add column if not exists nuevo_ingreso_at timestamptz;

-- 2) Fecha de ingreso del producto (por si la quieres usar después).
--    Se llena sola con la fecha y hora en que se crea el producto.
--    Si tu ERP ya tiene esta columna, no la toca.
alter table productos
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_productos_nuevo
  on productos(nuevo_ingreso, nuevo_ingreso_at desc);
create index if not exists idx_productos_creado
  on productos(created_at desc);

-- 3) Tema visual + 4) orden de la página (los edita el admin)
alter table configuracion
  add column if not exists tema text not null default 'none';
alter table configuracion
  add column if not exists orden_tienda text not null default 'destacados';

comment on column configuracion.tema is
  'none | valentin | carnaval | halloween | navidad';
comment on column configuracion.orden_tienda is
  'destacados | cantidad | categoria | ninguno';

-- Si ya habías corrido una versión anterior, deja los valores al día.
alter table configuracion alter column orden_tienda set default 'destacados';
update configuracion set orden_tienda = 'destacados'
  where orden_tienda in ('nuevos', 'como_estan') or orden_tienda is null;

-- Valores iniciales (si la tabla está vacía, crea la fila)
insert into configuracion (id)
values (1)
on conflict (id) do nothing;

-- Comprobación
select id, tema, orden_tienda from configuracion;
select count(*) filter (where nuevo_ingreso) as destacados,
       count(*) as total
from productos;

-- ══════════════════════════════════════════════════════════
-- LISTO. Ya puedes ir a tu panel → Apariencia:
--   • elegir la temática,
--   • elegir el orden de los productos,
--   • y marcar con la estrella los productos "destacados".
-- ══════════════════════════════════════════════════════════
