-- ══════════════════════════════════════════════════════════
-- ZONAS DE ENVÍO — BARRIOS Y CIUDADES EDITABLES DESDE EL PANEL
-- ══════════════════════════════════════════════════════════
-- Corre esto UNA vez en el SQL Editor de Supabase.
-- Da permiso al panel para AGREGAR, EDITAR y BORRAR los barrios
-- de Cartagena (con su precio de domicilio) y las ciudades.
-- La tienda los sigue leyendo sin iniciar sesión (solo lectura).
-- No borra ni cambia los datos que ya tienes.
-- ══════════════════════════════════════════════════════════

-- 1) Asegura las columnas que usa el panel
alter table barrios_cartagena
  add column if not exists valor_domicilio numeric default 0;

alter table ciudades_colombia
  add column if not exists departamento text default '';

-- 2) Seguridad a nivel de fila (RLS)
alter table barrios_cartagena enable row level security;
alter table ciudades_colombia enable row level security;

-- Todos pueden LEER las zonas (la tienda las necesita al finalizar el pedido)
drop policy if exists "barrios: leer" on barrios_cartagena;
create policy "barrios: leer"
  on barrios_cartagena for select to anon, authenticated using (true);

drop policy if exists "ciudades: leer" on ciudades_colombia;
create policy "ciudades: leer"
  on ciudades_colombia for select to anon, authenticated using (true);

-- Solo tú (con sesión iniciada) puedes CREAR, EDITAR y BORRAR
drop policy if exists "barrios: admin" on barrios_cartagena;
create policy "barrios: admin"
  on barrios_cartagena for all to authenticated
  using (true) with check (true);

drop policy if exists "ciudades: admin" on ciudades_colombia;
create policy "ciudades: admin"
  on ciudades_colombia for all to authenticated
  using (true) with check (true);

-- 3) Permisos por tabla
grant select on barrios_cartagena, ciudades_colombia to anon;
grant select, insert, update, delete on barrios_cartagena, ciudades_colombia to authenticated;

-- Comprobación: deben salir las zonas que ya tienes
select id, nombre, valor_domicilio from barrios_cartagena order by nombre;
select id, nombre, departamento from ciudades_colombia order by nombre;
