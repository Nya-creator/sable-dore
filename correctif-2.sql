-- SABLE DORÉ — correctif 2 : livraison Rs 100, offerte dès Rs 500 d'achat
-- À coller dans Supabase : SQL Editor → + → Create a new snippet → Run. Ne supprime rien.
create or replace function public.create_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb; p jsonb; it jsonb; e jsonb; x jsonb; col record;
  v_items jsonb := '[]'::jsonb; v_extras jsonb := '[]'::jsonb;
  g int := 0; packs int := 0; gi int; pk int; q int; min_g int;
  per numeric; pack_p numeric; loose numeric; ext numeric := 0; sub numeric; fee numeric; tot numeric;
  num text; oid uuid;
begin
  select data into s from settings where id = 1;
  if s is null then raise exception 'Boutique non configurée'; end if;
  p := s -> 'pricing';
  min_g := coalesce((p ->> 'min_grams')::int, 200);
  pack_p := coalesce((p ->> 'pack_price')::numeric, 0);

  if length(trim(coalesce(payload ->> 'name', ''))) < 2
     or length(regexp_replace(coalesce(payload ->> 'phone', ''), '\D', '', 'g')) < 7
     or length(trim(coalesce(payload ->> 'address', ''))) < 6 then
    raise exception 'Coordonnées incomplètes';
  end if;

  for it in select * from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) loop
    gi := greatest(0, coalesce((it ->> 'grams')::int, 0));
    pk := greatest(0, coalesce((it ->> 'packs')::int, 0));
    if gi = 0 and pk = 0 then continue; end if;
    select * into col from colors c where c.id::text = (it ->> 'id') and c.active;
    if not found then raise exception 'Une couleur n''est plus disponible, rechargez la page'; end if;
    if gi > 0 and gi < min_g then raise exception 'Minimum % g par couleur', min_g; end if;
    g := g + gi; packs := packs + pk;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id', col.id, 'name', col.name, 'hex', col.hex, 'grams', gi, 'packs', pk));
  end loop;

  select (t.v ->> 'price')::numeric into per from jsonb_array_elements(p -> 'tiers') as t(v)
    where (t.v ->> 'from')::int <= g order by (t.v ->> 'from')::int desc limit 1;
  if per is null then
    select (t.v ->> 'price')::numeric into per from jsonb_array_elements(p -> 'tiers') as t(v) order by (t.v ->> 'from')::int asc limit 1;
  end if;
  loose := round(g * coalesce(per, 0), 2);

  for e in select * from jsonb_array_elements(coalesce(payload -> 'extras', '[]'::jsonb)) loop
    x := null;
    select t.v into x from jsonb_array_elements(coalesce(s -> 'extras', '[]'::jsonb)) as t(v)
      where t.v ->> 'id' = e ->> 'id' and coalesce((t.v ->> 'active')::boolean, true) limit 1;
    if x is null then raise exception 'Un article n''est plus disponible, rechargez la page'; end if;
    q := least(999, greatest(0, coalesce((e ->> 'qty')::int, 0)));
    if q = 0 then continue; end if;
    ext := ext + q * (x ->> 'price')::numeric;
    v_extras := v_extras || jsonb_build_array(jsonb_build_object('id', x ->> 'id', 'name', x ->> 'name', 'price', (x ->> 'price')::numeric, 'qty', q));
  end loop;

  sub := round(loose + packs * pack_p + ext, 2);
  if sub <= 0 then raise exception 'Commande vide'; end if;
  fee := coalesce((s -> 'delivery' ->> 'fee')::numeric, 0);
  if coalesce((s -> 'delivery' ->> 'free_from')::numeric, 0) > 0 and sub >= (s -> 'delivery' ->> 'free_from')::numeric then fee := 0; end if;
  tot := sub + fee;
  num := 'SD-' || lpad(nextval('order_seq')::text, 5, '0');

  insert into orders (number, token, name, phone, email, address, notes, items, extras, subtotal, delivery_fee, total, per_gram, pack_price, included_wicks)
  values (num, left(coalesce(payload ->> 'token', encode(gen_random_bytes(16), 'hex')), 64),
          left(trim(payload ->> 'name'), 120), left(trim(payload ->> 'phone'), 40), left(nullif(trim(coalesce(payload ->> 'email', '')), ''), 160),
          left(trim(payload ->> 'address'), 500), left(nullif(trim(coalesce(payload ->> 'notes', '')), ''), 300),
          v_items, v_extras, sub, fee, tot, per, pack_p, greatest(0, coalesce((s ->> 'included_wicks')::int, 15)))
  returning id into oid;

  return jsonb_build_object('id', oid, 'number', num, 'total', tot, 'created_at', now());
end $$;

update public.settings set data = data || jsonb_build_object('delivery', coalesce(data->'delivery','{}'::jsonb) || '{"fee":100,"free_from":500}'::jsonb) where id = 1;
