-- ═════════════════════════════════════════════════════════════════════════
-- Elektro Pees – Lager-Konto (Rolle „lager“ für das Handscanner-iPhone)
-- Voraussetzung: sql/2026-11-lager.sql wurde bereits ausgeführt.
-- Im Supabase SQL-Editor als GANZES Skript ausführen (Run). Idempotent, läuft in einer Transaktion.
-- Wirkung: Die Rolle „lager“ darf NUR das Lager lesen und buchen (Entnahme/Einlagerung).
-- Sie zählt bewusst NICHT zu den internen Rollen → kein Zugriff auf Rhenus-Projekt & Co.
-- Artikelstamm/Barcodes pflegen weiterhin nur admin + buero.
-- ═════════════════════════════════════════════════════════════════════════
begin;

-- Falls die Tabelle profiles die erlaubten Rollen per CHECK begrenzt: „lager“ ergänzen (nur für neue Zeilen geprüft)
do $mig$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.profiles'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%role%' and pg_get_constraintdef(oid) not ilike '%lager%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
    execute 'alter table public.profiles add constraint profiles_role_check check (role in (''admin'',''buero'',''mitarbeiter'',''azubi'',''extern'',''lager'')) not valid';
  end loop;
end
$mig$;

-- Lager-Zugriff = interne Rollen + Lager-Konto
create or replace function public.ep_lager() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero','mitarbeiter','azubi','lager'), false) $$;

drop policy if exists lager_artikel_select on public.lager_artikel;
create policy lager_artikel_select on public.lager_artikel for select to authenticated using (public.ep_lager());
drop policy if exists lager_codes_select on public.lager_codes;
create policy lager_codes_select on public.lager_codes for select to authenticated using (public.ep_lager());
drop policy if exists lager_buchungen_select on public.lager_buchungen;
create policy lager_buchungen_select on public.lager_buchungen for select to authenticated using (public.ep_lager());

drop policy if exists lager_buchungen_insert on public.lager_buchungen;
create policy lager_buchungen_insert on public.lager_buchungen for insert to authenticated
  with check (public.ep_lager() and user_id = auth.uid() and (art in ('einlagerung','entnahme') or public.ep_leitung()));

drop policy if exists lager_buchungen_delete on public.lager_buchungen;
create policy lager_buchungen_delete on public.lager_buchungen for delete to authenticated
  using (public.ep_rolle() = 'admin' or (public.ep_lager() and user_id = auth.uid() and created_at > now() - interval '10 minutes'));

commit;

notify pgrst, 'reload schema';

-- ── Prüfung: alle Zeilen sollten ok = true zeigen ───────────────────────────
select 'Funktion ep_lager' as pruefung, to_regprocedure('public.ep_lager()') is not null as ok
union all select 'Policies weiterhin 10', (select count(*) = 10 from pg_policies where schemaname = 'public' and tablename like 'lager\_%')
union all select 'Lager-Policies nutzen ep_lager (5)', (select count(*) = 5 from pg_policies where schemaname = 'public' and tablename like 'lager\_%' and (coalesce(qual,'') || coalesce(with_check,'')) like '%ep_lager%');

-- ── Rollback (nur im Notfall): Policies aus 2026-11-lager.sql erneut ausführen (nutzen ep_intern) ──
