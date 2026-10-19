/* ============================================================
   NÚMERO DE PEDIDO (ATH-1001, ATH-1002, ...)
   ------------------------------------------------------------
   La tienda necesita guardar el pedido y recibir su número.
   Como la tabla "pedidos" solo deja LEER al admin, la tienda no
   puede leer la fila que acaba de crear (Supabase cancela el insert).

   Esta función hace las dos cosas de una: guarda el pedido y
   devuelve el número generado, SIN dejar que nadie lea los pedidos.

   CÓMO USARLA:
   1. Supabase → SQL Editor → New query
   2. Pega todo este archivo y dale "Run"
   3. Listo (una sola vez)

   Si no la corres, la tienda igual guarda los pedidos, solo que
   con un número de respaldo en vez de ATH-1001.
   ============================================================ */

create or replace function crear_pedido(
  p_cliente     text,
  p_telefono    text,
  p_cedula      text,
  p_ciudad      text,
  p_barrio      text,
  p_direccion   text,
  p_referencia  text,
  p_metodo_pago text,
  p_productos   jsonb,
  p_subtotal    numeric,
  p_descuento   numeric,
  p_domicilio   numeric,
  p_total       numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  insert into pedidos (
    cliente, telefono, cedula, ciudad, barrio, direccion, referencia,
    metodo_pago, productos, subtotal, descuento, domicilio, total
  ) values (
    p_cliente, p_telefono, p_cedula, p_ciudad, p_barrio, p_direccion, p_referencia,
    p_metodo_pago, coalesce(p_productos, '[]'::jsonb),
    coalesce(p_subtotal, 0), coalesce(p_descuento, 0),
    coalesce(p_domicilio, 0), coalesce(p_total, 0)
  )
  returning codigo into v_codigo;

  return v_codigo;
end;
$$;

/* Solo se permite EJECUTAR la función; leer los pedidos sigue siendo
   exclusivo del admin. */
revoke all on function crear_pedido(text, text, text, text, text, text, text, text, jsonb, numeric, numeric, numeric, numeric) from public;
grant execute on function crear_pedido(text, text, text, text, text, text, text, text, jsonb, numeric, numeric, numeric, numeric) to anon, authenticated;
