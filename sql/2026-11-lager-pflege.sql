-- ═════════════════════════════════════════════════════════════════════════
-- Elektro Pees – Lager-Konto darf Artikel anlegen und Barcodes zuordnen
-- Voraussetzung: sql/2026-11-lager.sql und sql/2026-11-lager-konto.sql wurden ausgeführt.
-- Im Supabase SQL-Editor als GANZES Skript ausführen (Run). Idempotent, läuft in einer Transaktion.
-- Neu: Rolle „lager“ (neben admin + buero) darf Artikel anlegen/ändern/archivieren und Barcodes zuordnen/entfernen.
-- Weiterhin NICHT erlaubt für „lager“: Inventur/Korrektur buchen, Artikel löschen, Projekte/Stunden.
-- Zusätzlich: Wer einen Artikel gerade selbst angelegt hat, kann ihn innerhalb von 10 Minuten wieder löschen
-- (nötig, damit „Artikel + Barcode anlegen“ bei einem Fehler sauber zurückgerollt wird).
-- ═════════════════════════════════════════════════════════════════════════
begin;

create or replace function public.ep_lager_pflege() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero','lager'), false) $$;

drop policy if exists lager_artikel_insert on public.lager_artikel;
create policy lager_artikel_insert on public.lager_artikel for insert to authenticated with check (public.ep_lager_pflege());
drop policy if exists lager_artikel_update on public.lager_artikel;
create policy lager_artikel_update on public.lager_artikel for update to authenticated using (public.ep_lager_pflege()) with check (public.ep_lager_pflege());
drop policy if exists lager_artikel_delete on public.lager_artikel;
create policy lager_artikel_delete on public.lager_artikel for delete to authenticated
  using (public.ep_rolle() = 'admin' or (public.ep_lager_pflege() and created_by = auth.uid() and created_at > now() - interval '10 minutes'));

drop policy if exists lager_codes_insert on public.lager_codes;
create policy lager_codes_insert on public.lager_codes for insert to authenticated with check (public.ep_lager_pflege());
drop policy if exists lager_codes_delete on public.lager_codes;
create policy lager_codes_delete on public.lager_codes for delete to authenticated using (public.ep_lager_pflege());

commit;

notify pgrst, 'reload schema';

-- ── Prüfung: alle Zeilen sollten ok = true zeigen ───────────────────────────
select 'Funktion ep_lager_pflege' as pruefung, to_regprocedure('public.ep_lager_pflege()') is not null as ok
union all select 'Policies weiterhin 10', (select count(*) = 10 from pg_policies where schemaname = 'public' and tablename like 'lager\_%')
union all select 'Pflege-Policies nutzen ep_lager_pflege (5)', (select count(*) = 5 from pg_policies where schemaname = 'public' and tablename like 'lager\_%' and (coalesce(qual,'') || coalesce(with_check,'')) like '%ep_lager_pflege%');
