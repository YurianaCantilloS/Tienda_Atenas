-- ══════════════════════════════════════════════════════════
-- PÁGINA DE ENLACES (tipo Linktree) — EDITABLE DESDE EL PANEL
-- ══════════════════════════════════════════════════════════
-- Corre esto UNA vez en el SQL Editor de Supabase.
-- Guarda en la tabla "configuracion" (la misma de la tienda)
-- todo lo de la página links.html: fondo, textos, botones y redes.
-- No borra ni cambia nada de lo que ya tienes.
-- ══════════════════════════════════════════════════════════

alter table configuracion
  add column if not exists links_cfg jsonb;

-- Si la fila única todavía no existe, la crea.
insert into configuracion (id)
values (1)
on conflict (id) do nothing;

-- Comprobación: debe aparecer la columna links_cfg
select id, links_cfg from configuracion where id = 1;
