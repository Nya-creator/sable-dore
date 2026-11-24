-- =====================================================================
-- SABLE DORÉ — base de données Supabase
-- À coller en une fois dans Supabase : SQL Editor → New query → Run.
-- Ensuite, remplace l'e-mail tout en bas par le tien et relance la
-- dernière ligne seule si besoin.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text not null default '#d6ae67',
  description text not null default '',
  image_url text not null default '',
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.admins ( email text primary key );

create sequence if not exists public.order_seq;

create table if not exists public.invoice_counters ( year int primary key, last int not null default 0 );

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  token text not null,
  created_at timestamptz not null default now(),
  name text not null, phone text not null, email text, address text not null, notes text,
  items jsonb not null default '[]'::jsonb,
  extras jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null, delivery_fee numeric(12,2) not null default 0, total numeric(12,2) not null,
  per_gram numeric(12,4), pack_price numeric(12,2), included_wicks int not null default 0,
  status text not null default 'en_attente' check (status in ('en_attente','preuve_recue','payee','livree','annulee')),
  proof_path text, proof_at timestamptz, proof_by_admin boolean not null default false,
  eta timestamptz, paid_at timestamptz, payment_ref text, payment_method text, invoice_number text unique, delivered_at timestamptz
);
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists included_wicks int not null default 0;
create index if not exists orders_paid_at on public.orders (paid_at);
create index if not exists orders_status on public.orders (status);

-- ---------- Qui est administrateur ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.order_open(p_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders o where o.id::text = p_id and o.status in ('en_attente','preuve_recue'));
$$;

-- ---------- Sécurité des tables (RLS) ----------
alter table public.settings enable row level security;
alter table public.colors enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;
alter table public.invoice_counters enable row level security;

drop policy if exists "lecture publique" on public.settings;
create policy "lecture publique" on public.settings for select using (true);
drop policy if exists "admin ecrit" on public.settings;
create policy "admin ecrit" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lecture publique" on public.colors;
create policy "lecture publique" on public.colors for select using (active or public.is_admin());
drop policy if exists "admin ecrit" on public.colors;
create policy "admin ecrit" on public.colors for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Les commandes ne sont visibles et modifiables QUE par l'admin.
drop policy if exists "admin seulement" on public.orders;
create policy "admin seulement" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Création d'une commande (prix recalculé côté serveur) ----------
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

-- ---------- Le client envoie sa preuve de paiement ----------
create or replace function public.submit_proof(p_order uuid, p_token text, p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h int; r record;
begin
  if p_path is null or p_path not like p_order::text || '/%' then raise exception 'Fichier invalide'; end if;
  select coalesce((data -> 'delivery' ->> 'hours')::int, 36) into h from settings where id = 1;
  update orders set proof_path = p_path, proof_at = now(), eta = now() + make_interval(hours => coalesce(h, 36)),
         status = case when status = 'en_attente' then 'preuve_recue' else status end
   where id = p_order and token = p_token and status in ('en_attente', 'preuve_recue')
   returning proof_at, eta into r;
  if not found then raise exception 'Commande introuvable ou déjà traitée'; end if;
  return jsonb_build_object('proof_at', r.proof_at, 'eta', r.eta);
end $$;

-- ---------- L'admin valide le paiement → facture numérotée ----------
drop function if exists public.validate_payment(uuid, text, text);
create or replace function public.validate_payment(p_order uuid, p_ref text, p_path text, p_method text default 'Juice') returns jsonb
language plpgsql security definer set search_path = public as $$
declare o orders; y int; n int; h int; r jsonb;
begin
  if not is_admin() then raise exception 'Réservé à l''administratrice'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if o.invoice_number is not null then return to_jsonb(o); end if;
  if o.status = 'annulee' then raise exception 'Commande annulée'; end if;
  y := extract(year from (now() at time zone 'Indian/Mauritius'))::int;
  insert into invoice_counters (year, last) values (y, 1)
    on conflict (year) do update set last = invoice_counters.last + 1 returning last into n;
  select coalesce((data -> 'delivery' ->> 'hours')::int, 36) into h from settings where id = 1;
  update orders set
    invoice_number = 'FAC-' || y || '-' || lpad(n::text, 4, '0'),
    paid_at = now(), payment_ref = nullif(p_ref, ''), payment_method = case when p_method = 'Virement bancaire' then 'Virement bancaire' else 'Juice' end, status = 'payee',
    proof_path = coalesce(p_path, proof_path),
    proof_at = case when p_path is not null then now() else proof_at end,
    proof_by_admin = proof_by_admin or p_path is not null,
    eta = coalesce(eta, now() + make_interval(hours => coalesce(h, 36)))
  where id = p_order returning to_jsonb(orders.*) into r;
  return r;
end $$;

revoke all on function public.validate_payment(uuid, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.submit_proof(uuid, text, text) to anon, authenticated;
grant execute on function public.validate_payment(uuid, text, text, text) to authenticated;

-- ---------- Stockage des fichiers ----------
insert into storage.buckets (id, name, public) values ('preuves', 'preuves', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('catalogue', 'catalogue', true) on conflict (id) do nothing;

drop policy if exists "client envoie preuve" on storage.objects;
create policy "client envoie preuve" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'preuves' and public.order_open((storage.foldername(name))[1]));
drop policy if exists "admin lit preuves" on storage.objects;
create policy "admin lit preuves" on storage.objects for select to authenticated
  using (bucket_id = 'preuves' and public.is_admin());
drop policy if exists "admin envoie preuve" on storage.objects;
create policy "admin envoie preuve" on storage.objects for insert to authenticated
  with check (bucket_id = 'preuves' and public.is_admin());
drop policy if exists "admin gere catalogue" on storage.objects;
create policy "admin gere catalogue" on storage.objects for all to authenticated
  using (bucket_id = 'catalogue' and public.is_admin()) with check (bucket_id = 'catalogue' and public.is_admin());

-- ---------- Données de départ (modifiables ensuite dans l'admin) ----------
insert into public.settings (id, data) values (1, '{"company":{"name":"KMP Distribution (Moris) Ltd","brand":"Sable Doré","brn":"C26237865","vat":"","address":"C20 Oliviers Street, Les Glaieuls, Petit Verger, Maurice","phone":"+230 5858 9125","whatsapp":"23058589125","email":"marieyanna@kmpmoris.com"},"juice":{"number":"","name":"KMP Distribution (Moris) Ltd"},"bank":{"name":"MCB","account_name":"KMP Distribution (Moris) Ltd","account_number":"000456869883","iban":"","swift":""},"pricing":{"min_grams":200,"step":100,"pack_price":750,"tiers":[{"from":200,"price":1.2},{"from":500,"price":1},{"from":1000,"price":0.85}]},"delivery":{"hours":36,"fee":0},"included_wicks":15,"extras":[{"id":"meches10","name":"Mèches supplémentaires (lot de 10)","price":100,"active":true}]}
'::jsonb) on conflict (id) do nothing;

insert into public.colors (name, hex, description, sort)
select * from (values
  ('Blanc nacré','#f8f8f6','Un blanc lumineux, comme l''écume au petit matin.',0),
  ('Crème vanille','#eee2b8','Une base douce et chaleureuse.',1),
  ('Sable naturel','#bfae8a','La couleur du sable sec, naturelle et apaisante.',2),
  ('Gris perle','#c9c1be','Un gris tendre pour les ambiances zen.',3),
  ('Jaune soleil','#ebe53a','Un éclat de soleil pour réveiller vos couches.',4),
  ('Pêche','#f8a57a','Douce et fruitée, comme un fruit mûr.',5),
  ('Rose saumon','#e8737f','Un rose corail chaleureux.',6),
  ('Rose bonbon','#f8acd8','Un rose vif et joyeux.',7),
  ('Rose poudré','#f7e1ea','Un rose pâle tout en douceur.',8),
  ('Lilas','#e6aee6','Un mauve rosé, romantique.',9),
  ('Lavande','#bdb4ef','Pour les rituels du soir et la détente.',10),
  ('Bleu pervenche','#88aef0','Un bleu doux et lumineux.',11),
  ('Bleu ciel','#55b8f3','Le bleu d''un ciel d''été.',12),
  ('Bleu lagon','#1d9be8','Le bleu franc des lagons.',13),
  ('Turquoise','#14b0a8','Le bleu-vert de l''eau claire.',14),
  ('Vert tropical','#35b86c','L''énergie des feuilles après la pluie.',15),
  ('Noir volcan','#111111','Un contraste élégant, comme la roche basaltique.',16)
) v(name, hex, description, sort)
where not exists (select 1 from public.colors);

-- ---------- TON COMPTE ADMIN ----------
-- Remplace l'adresse ci-dessous par l'e-mail de ton compte admin Supabase.
insert into public.admins (email) values ('marieyanna@kmpmoris.com') on conflict do nothing;
