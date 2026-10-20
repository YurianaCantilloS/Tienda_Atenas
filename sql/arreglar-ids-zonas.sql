/* ============================================================
   ARREGLAR "duplicate key" AL AGREGAR BARRIOS O CIUDADES
   ------------------------------------------------------------
   El id de barrios_cartagena / ciudades_colombia es autoincremental.
   Cuando se cargaron los datos de ejemplo, se metieron los id a mano
   (1, 2, 3, ... 58) y la secuencia quedó en 1. Entonces, al agregar
   una zona nueva, la base intenta usar el id 1 y choca con uno que ya
   existe: "duplicate key value violates unique constraint ..._pkey".

   Esto pone la secuencia al día con el id más alto que ya existe.

   CÓMO USARLO:
   1. Supabase → SQL Editor → New query
   2. Pega todo este archivo y dale "Run"
   3. Listo. Ya puedes agregar barrios y ciudades desde el panel.
   ============================================================ */

do $$
declare
  s text;
begin
  s := pg_get_serial_sequence('barrios_cartagena', 'id');
  if s is not null then
    perform setval(s, coalesce((select max(id) from barrios_cartagena), 1), true);
  end if;

  s := pg_get_serial_sequence('ciudades_colombia', 'id');
  if s is not null then
    perform setval(s, coalesce((select max(id) from ciudades_colombia), 1), true);
  end if;
end $$;

-- Comprobación: deben salir los ids y nombres actuales
select id, nombre from barrios_cartagena order by id;
