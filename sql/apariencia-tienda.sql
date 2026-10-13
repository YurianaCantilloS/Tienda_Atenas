-- ══════════════════════════════════════════════════════════
-- BANNER Y AVISOS DE LA PÁGINA — EDITABLES DESDE EL PANEL
-- ══════════════════════════════════════════════════════════
-- Corre esto UNA vez en el SQL Editor de Supabase.
-- Agrega columnas a la tabla "configuracion" que ya usas en el ERP.
-- No borra ni cambia nada de lo que ya tienes.
-- ══════════════════════════════════════════════════════════

-- 1) Banner de la página (la imagen de arriba)
alter table configuracion
  add column if not exists banner_url text,
  add column if not exists banner_activo boolean not null default true;

-- 2) Avisos del frente de la página
--    Cada línea del texto es un aviso distinto.
--    Déjalo vacío ('') para no mostrar ninguno.
alter table configuracion
  add column if not exists aviso_texto text not null default '',
  add column if not exists aviso_activo boolean not null default true,
  add column if not exists aviso_color text not null default 'lila';

-- 3) Textos del pie de página
alter table configuracion
  add column if not exists pie_frase text not null default 'Elegancia que se siente, estilo que se vive.',
  add column if not exists pie_instagram text not null default '@atenas.style_ctg';

-- 3b) Datos de contacto (los editas en Panel → La página)
--     Los usa el botón de WhatsApp, el pedido al cliente y la factura PDF.
alter table configuracion
  add column if not exists negocio_nombre    text not null default 'Atenas Style Shop',
  add column if not exists negocio_ciudad    text not null default 'Cartagena, Colombia',
  add column if not exists negocio_telefono  text not null default '318 434 6975',
  add column if not exists negocio_whatsapp  text not null default '573184346975',
  add column if not exists negocio_instagram text not null default '@atenas.style_ctg';

-- 4) Valores iniciales (si la tabla está vacía, crea la fila)
insert into configuracion (id)
values (1)
on conflict (id) do nothing;

-- 5) Permisos: la tienda (público) solo LEE esta tabla.
--    Es una tabla de una fila, no guarda datos de clientes.
grant select on configuracion to anon, authenticated;

-- 6) Comprobación: debe aparecer 1 fila
select id, banner_activo, aviso_activo, aviso_color,
       negocio_whatsapp, negocio_instagram
from configuracion;

-- ══════════════════════════════════════════════════════════
-- LISTO. Ya puedes ir a tu panel → Ajustes → Apariencia
-- y cambiar el banner y los avisos sin tocar código.
-- ══════════════════════════════════════════════════════════