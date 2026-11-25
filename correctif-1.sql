-- SABLE DORÉ — correctif : accès du site + coordonnées de la société
-- À coller dans Supabase : SQL Editor → New query → Run. Ne supprime rien.
-- ---------- Accès de la boutique (lecture publique du catalogue et des réglages) ----------
grant usage on schema public to anon, authenticated;
grant select on public.settings, public.colors to anon, authenticated;
grant select, insert, update, delete on public.settings, public.colors, public.orders to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.order_open(text) to anon, authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.submit_proof(uuid, text, text) to anon, authenticated;
grant execute on function public.validate_payment(uuid, text, text, text) to authenticated;

update public.settings set data = data
  || jsonb_build_object('company', coalesce(data->'company','{}'::jsonb) || '{"name":"KMP Distribution Moris Ltd","address":"Les Glaieuls, Petit Verger, Pointe aux Sables","phone":"5858 9125","email":"marieyanna@kmpmoris.com","brn":"C26237865"}'::jsonb)
  || jsonb_build_object('juice', coalesce(data->'juice','{}'::jsonb) || '{"name":"KMP Distribution Moris Ltd"}'::jsonb)
  || jsonb_build_object('bank', coalesce(data->'bank','{}'::jsonb) || '{"name":"MCB","account_name":"KMP Distribution Moris Ltd","account_number":"000456869883"}'::jsonb)
where id = 1;
