-- ════════════════════════════════════════════════════════════════════════════
-- Elektro Pees – Projekt-Modul (Rhenus Dietzenbach): Arbeitsschritte, Fotos, Nachweise
-- Im Supabase SQL-Editor als GANZES Skript ausführen (Run). Idempotent: kann mehrfach laufen.
-- Läuft in einer Transaktion: entweder wird alles angelegt oder nichts.
-- Rein additiv: neue Tabellen/Spalten/Funktionen; an bestehenden Tabellen nur neue Spalten (baustellen)
-- und zusätzliche (rein erweiternde) Policies auf `stunden`:
--   stunden_insert_admin      Admin darf Stunden für Mitarbeiter anlegen
--   stunden_insert_kollegen   Monteur darf für Kollegen AUSSTEHENDE Stunden auf Projekt-Baustellen anlegen
--   stunden_select_erfasser / stunden_delete_erfasser   der Erfasser sieht/löscht diese Einträge (solange ausstehend)
-- plus neue Spalte stunden.erfasst_von. Bestehende Policies von `stunden`/`profiles` werden nicht verändert.
-- Rollback (nur falls nötig, VORHER Export sichern): siehe Ende der Datei.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── 1. Baustellen: Projekt-Flag ────────────────────────────────────────────
alter table public.baustellen add column if not exists doku_pflicht boolean not null default false;
alter table public.baustellen add column if not exists projekt_phase text;   -- rueckbau | erneuerung | abnahme
alter table public.baustellen add column if not exists auftragsnr text;      -- Bestell-/Auftragsnr. des Kunden

-- ── 2. Rollen-Helfer (SECURITY DEFINER, damit keine RLS-Rekursion auf profiles entsteht) ──
create or replace function public.ep_rolle() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.ep_intern() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero','mitarbeiter','azubi'), false) $$;

create or replace function public.ep_leitung() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero'), false) $$;

-- Eigener, noch nicht freigegebener Stundeneintrag? (Typ von stunden.id egal → Vergleich über Text)
create or replace function public.ep_stunde_offen(p_id text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from public.stunden s
      where s.id::text = p_id and s.user_id = auth.uid() and s.freigabe_status <> 'freigegeben') $$;

-- ── 3. Tabellen (Spaltentypen für FKs werden aus dem bestehenden Schema gelesen) ──
do $mig$
declare
  t_stunden  text;
  t_baustelle text;
begin
  select format_type(a.atttypid, a.atttypmod) into t_stunden
    from pg_attribute a
   where a.attrelid = 'public.stunden'::regclass and a.attname = 'id' and not a.attisdropped;
  select format_type(a.atttypid, a.atttypmod) into t_baustelle
    from pg_attribute a
   where a.attrelid = 'public.baustellen'::regclass and a.attname = 'id' and not a.attisdropped;
  if t_stunden is null or t_baustelle is null then
    raise exception 'stunden.id oder baustellen.id nicht gefunden';
  end if;

  execute format($t$
    create table if not exists public.projekt_schritte (
      id              uuid primary key default gen_random_uuid(),
      stunden_id      %s not null references public.stunden(id) on delete cascade,
      nr              smallint not null default 1,
      taetigkeit      text,
      beschreibung    text not null check (char_length(btrim(beschreibung)) >= 8),
      dauer_min       smallint not null check (dauer_min between 1 and 720),
      bereich         text,
      phase           text,
      kein_foto_grund text,
      created_at      timestamptz not null default now(),
      updated_at      timestamptz not null default now()
    )$t$, t_stunden);

  execute format($t$
    create table if not exists public.projekt_exporte (
      id              uuid primary key default gen_random_uuid(),
      baustelle_id    %s not null references public.baustellen(id) on delete cascade,
      nr              text not null unique,
      von             date not null,
      bis             date not null,
      summe_min       integer not null default 0,
      anzahl_eintraege integer not null default 0,
      anzahl_fotos    integer not null default 0,
      optionen        jsonb,
      snapshot        jsonb not null,
      erstellt_von    uuid default auth.uid(),
      created_at      timestamptz not null default now()
    )$t$, t_baustelle);

  -- Gastzugang (Link für Rhenus-Mitarbeiter: nur Ansicht der gespeicherten Nachweise)
  execute format($t$
    create table if not exists public.projekt_gastlinks (
      id                uuid primary key default gen_random_uuid(),
      baustelle_id      %s not null references public.baustellen(id) on delete cascade,
      token             uuid not null unique default gen_random_uuid(),
      label             text not null check (char_length(btrim(label)) >= 2),
      aktiv             boolean not null default true,
      gueltig_bis       date,
      aufrufe           integer not null default 0,
      zuletzt_geoeffnet timestamptz,
      erstellt_von      uuid default auth.uid(),
      created_at        timestamptz not null default now()
    )$t$, t_baustelle);
end
$mig$;

-- Team-Einträge: ein Arbeitsschritt kann zu mehreren Stundenzeilen gehören
-- (stunden_id = erste Person, weitere_stunden_ids = Stundenzeilen der übrigen Teammitglieder, als Text).
alter table public.projekt_schritte add column if not exists weitere_stunden_ids text[] not null default '{}';
-- Foto-Pfade eines gespeicherten Nachweises (damit der Gastzugang genau diese Fotos zeigen darf)
alter table public.projekt_exporte  add column if not exists foto_pfade text[] not null default '{}';

create table if not exists public.projekt_fotos (
  id              uuid primary key default gen_random_uuid(),
  schritt_id      uuid not null references public.projekt_schritte(id) on delete cascade,
  storage_path    text not null unique,
  thumb_path      text,
  art             text not null default 'nachher' check (art in ('vorher','nachher')),
  bytes           integer,
  sort            smallint not null default 0,
  aufgenommen_am  timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create table if not exists public.projekt_historie (
  id         bigint generated always as identity primary key,
  tabelle    text not null,
  aktion     text not null,
  row_id     text,
  alt        jsonb,
  user_id    uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists projekt_schritte_stunden_idx on public.projekt_schritte (stunden_id);
create index if not exists projekt_fotos_schritt_idx    on public.projekt_fotos (schritt_id);
create index if not exists projekt_exporte_baustelle_idx on public.projekt_exporte (baustelle_id, created_at desc);
create index if not exists stunden_baustelle_datum_idx  on public.stunden (baustelle_id, datum);
create index if not exists projekt_gastlinks_baustelle_idx on public.projekt_gastlinks (baustelle_id);

-- ── 4. Trigger: updated_at + Änderungsprotokoll ─────────────────────────────
create or replace function public.projekt_touch() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists projekt_schritte_touch on public.projekt_schritte;
create trigger projekt_schritte_touch before update on public.projekt_schritte
  for each row execute function public.projekt_touch();

create or replace function public.projekt_historie_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.projekt_historie (tabelle, aktion, row_id, alt, user_id)
  values (tg_table_name, tg_op, to_jsonb(old)->>'id', to_jsonb(old), auth.uid());
  return null;
end $$;

drop trigger if exists projekt_schritte_hist on public.projekt_schritte;
create trigger projekt_schritte_hist after update or delete on public.projekt_schritte
  for each row execute function public.projekt_historie_log();
drop trigger if exists projekt_fotos_hist on public.projekt_fotos;
create trigger projekt_fotos_hist after update or delete on public.projekt_fotos
  for each row execute function public.projekt_historie_log();

-- Foto-Berechtigung hängt am Schritt → am Stundeneintrag
create or replace function public.ep_schritt_offen(p_id uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from public.projekt_schritte ps
       join public.stunden s on s.id = ps.stunden_id
      where ps.id = p_id and s.user_id = auth.uid() and s.freigabe_status <> 'freigegeben') $$;

-- ── 5. RLS: an, anon raus, vier Befehle getrennt ────────────────────────────
alter table public.projekt_schritte  enable row level security;
alter table public.projekt_fotos     enable row level security;
alter table public.projekt_exporte   enable row level security;
alter table public.projekt_historie  enable row level security;
revoke all on public.projekt_schritte, public.projekt_fotos, public.projekt_exporte, public.projekt_historie from anon;
grant select, insert, update, delete on public.projekt_schritte, public.projekt_fotos, public.projekt_exporte to authenticated;
grant select on public.projekt_historie to authenticated;

-- Schritte: lesen alle internen Rollen; schreiben Leitung immer, Mitarbeiter/Azubi nur eigene, nicht freigegebene Einträge
drop policy if exists projekt_schritte_select on public.projekt_schritte;
create policy projekt_schritte_select on public.projekt_schritte for select to authenticated
  using (public.ep_intern());
drop policy if exists projekt_schritte_insert on public.projekt_schritte;
create policy projekt_schritte_insert on public.projekt_schritte for insert to authenticated
  with check (public.ep_leitung() or public.ep_stunde_offen(stunden_id::text));
drop policy if exists projekt_schritte_update on public.projekt_schritte;
create policy projekt_schritte_update on public.projekt_schritte for update to authenticated
  using (public.ep_leitung() or public.ep_stunde_offen(stunden_id::text))
  with check (public.ep_leitung() or public.ep_stunde_offen(stunden_id::text));
drop policy if exists projekt_schritte_delete on public.projekt_schritte;
create policy projekt_schritte_delete on public.projekt_schritte for delete to authenticated
  using (public.ep_leitung() or public.ep_stunde_offen(stunden_id::text));

-- Fotos: analog über den Schritt
drop policy if exists projekt_fotos_select on public.projekt_fotos;
create policy projekt_fotos_select on public.projekt_fotos for select to authenticated
  using (public.ep_intern());
drop policy if exists projekt_fotos_insert on public.projekt_fotos;
create policy projekt_fotos_insert on public.projekt_fotos for insert to authenticated
  with check (public.ep_leitung() or public.ep_schritt_offen(schritt_id));
drop policy if exists projekt_fotos_update on public.projekt_fotos;
create policy projekt_fotos_update on public.projekt_fotos for update to authenticated
  using (public.ep_leitung() or public.ep_schritt_offen(schritt_id))
  with check (public.ep_leitung() or public.ep_schritt_offen(schritt_id));
drop policy if exists projekt_fotos_delete on public.projekt_fotos;
create policy projekt_fotos_delete on public.projekt_fotos for delete to authenticated
  using (public.ep_leitung() or public.ep_schritt_offen(schritt_id));

-- Nachweise (eingefroren): nur Leitung; löschen nur Admin
drop policy if exists projekt_exporte_select on public.projekt_exporte;
create policy projekt_exporte_select on public.projekt_exporte for select to authenticated
  using (public.ep_leitung());
drop policy if exists projekt_exporte_insert on public.projekt_exporte;
create policy projekt_exporte_insert on public.projekt_exporte for insert to authenticated
  with check (public.ep_leitung());
drop policy if exists projekt_exporte_update on public.projekt_exporte;
create policy projekt_exporte_update on public.projekt_exporte for update to authenticated
  using (public.ep_rolle() = 'admin') with check (public.ep_rolle() = 'admin');
drop policy if exists projekt_exporte_delete on public.projekt_exporte;
create policy projekt_exporte_delete on public.projekt_exporte for delete to authenticated
  using (public.ep_rolle() = 'admin');

-- Protokoll: nur lesen (Leitung); geschrieben wird ausschließlich vom Trigger
drop policy if exists projekt_historie_select on public.projekt_historie;
create policy projekt_historie_select on public.projekt_historie for select to authenticated
  using (public.ep_leitung());

-- ── 6. Storage: privater Foto-Bucket ────────────────────────────────────────
-- Pfad: {baustelle_id}/{user_id}/{foto_id}.jpg  (+ {foto_id}_t.jpg als Vorschau)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('projekt-fotos', 'projekt-fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists projekt_fotos_obj_select on storage.objects;
create policy projekt_fotos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'projekt-fotos' and public.ep_intern());
drop policy if exists projekt_fotos_obj_insert on storage.objects;
create policy projekt_fotos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'projekt-fotos' and public.ep_intern()
              and ((storage.foldername(name))[2] = auth.uid()::text or public.ep_leitung()));
drop policy if exists projekt_fotos_obj_delete on storage.objects;
create policy projekt_fotos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'projekt-fotos'
         and ((storage.foldername(name))[2] = auth.uid()::text or public.ep_leitung()));

-- ── 7. Team-Erfassung: Admin darf Stunden für Mitarbeiter anlegen ────────────
-- (wird auch für „Krank/Berufsschule nachtragen“ gebraucht; ersetzt eine frühere gleichnamige Policy)
drop policy if exists stunden_insert_admin on public.stunden;
create policy stunden_insert_admin on public.stunden for insert to authenticated
  with check (public.ep_rolle() = 'admin');

-- ── 7b. Eintragen für Kollegen (Monteur) ─────────────────────────────────────
-- Ein Monteur kann beim Erfassen Kollegen mitnehmen, die dieselbe Arbeit gemacht haben. Für die Kollegen entstehen
-- eigene Stundenzeilen – immer „ausstehend“ (der Chef gibt frei), nur auf aktiven Projekt-Baustellen, markiert mit
-- erfasst_von. Der Kollege sieht den Eintrag bei sich („von X eingetragen“) und kann ihn löschen.
alter table public.stunden add column if not exists erfasst_von uuid;   -- wer den Eintrag für eine andere Person angelegt hat (sonst NULL)

create or replace function public.ep_darf_fuer_kollegen(p_user uuid, p_baustelle text) returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() = 'mitarbeiter', false)
      and p_user is not null and p_user <> auth.uid()
      and exists (select 1 from public.baustellen b where b.id::text = p_baustelle and b.doku_pflicht and b.status = 'aktiv')
      and exists (select 1 from public.profiles p where p.id = p_user and p.role in ('admin','mitarbeiter','azubi')) $$;

drop policy if exists stunden_insert_kollegen on public.stunden;
create policy stunden_insert_kollegen on public.stunden for insert to authenticated
  with check (erfasst_von = auth.uid() and freigabe_status = 'ausstehend'
              and public.ep_darf_fuer_kollegen(user_id, baustelle_id::text));
drop policy if exists stunden_select_erfasser on public.stunden;
create policy stunden_select_erfasser on public.stunden for select to authenticated
  using (erfasst_von = auth.uid());
drop policy if exists stunden_delete_erfasser on public.stunden;
create policy stunden_delete_erfasser on public.stunden for delete to authenticated
  using (erfasst_von = auth.uid() and freigabe_status = 'ausstehend');

-- Abgleich vor dem Speichern: Wer aus der Liste hat an dem Tag schon Stunden, die sich mit von–bis überschneiden?
-- Liefert NUR die Personen (keine Uhrzeiten, Baustellen oder Notizen – damit z. B. Krankmeldungen privat bleiben).
create or replace function public.projekt_stunden_konflikte(p_user_ids text[], p_datum text, p_start text, p_end text)
returns table (user_id text)
language sql stable security definer set search_path = public as
$$ select distinct s.user_id::text
     from public.stunden s
    where public.ep_intern()
      and s.user_id::text = any (p_user_ids)
      and s.datum::text = p_datum
      and s.start_zeit is not null and s.end_zeit is not null
      and s.start_zeit::time < p_end::time and s.end_zeit::time > p_start::time $$;
revoke all on function public.projekt_stunden_konflikte(text[], text, text, text) from public, anon;
grant execute on function public.projekt_stunden_konflikte(text[], text, text, text) to authenticated;

-- ── 8. Gastzugang (Rhenus): Link-Verwaltung nur Admin, Ansicht ohne Anmeldung per Token ──
alter table public.projekt_gastlinks enable row level security;
revoke all on public.projekt_gastlinks from anon;
grant select, insert, update, delete on public.projekt_gastlinks to authenticated;
drop policy if exists projekt_gastlinks_select on public.projekt_gastlinks;
create policy projekt_gastlinks_select on public.projekt_gastlinks for select to authenticated
  using (public.ep_rolle() = 'admin');
drop policy if exists projekt_gastlinks_insert on public.projekt_gastlinks;
create policy projekt_gastlinks_insert on public.projekt_gastlinks for insert to authenticated
  with check (public.ep_rolle() = 'admin');
drop policy if exists projekt_gastlinks_update on public.projekt_gastlinks;
create policy projekt_gastlinks_update on public.projekt_gastlinks for update to authenticated
  using (public.ep_rolle() = 'admin') with check (public.ep_rolle() = 'admin');
drop policy if exists projekt_gastlinks_delete on public.projekt_gastlinks;
create policy projekt_gastlinks_delete on public.projekt_gastlinks for delete to authenticated
  using (public.ep_rolle() = 'admin');

-- Liste der gespeicherten Nachweise für einen gültigen Link (null = Link ungültig/gesperrt/abgelaufen)
create or replace function public.projekt_gast_liste(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.projekt_gastlinks; erg jsonb;
begin
  select * into g from public.projekt_gastlinks
   where token = p_token and aktiv and (gueltig_bis is null or gueltig_bis >= current_date);
  if not found then return null; end if;
  update public.projekt_gastlinks set aufrufe = aufrufe + 1, zuletzt_geoeffnet = now() where id = g.id;
  select jsonb_build_object(
           'label', g.label,
           'baustelle', jsonb_build_object('name', b.name, 'kunde', b.kunde, 'adresse', b.adresse, 'auftragsnr', b.auftragsnr),
           'nachweise', coalesce((
              select jsonb_agg(jsonb_build_object('id', e.id, 'nr', e.nr, 'von', e.von, 'bis', e.bis, 'summe_min', e.summe_min,
                                                  'anzahl_eintraege', e.anzahl_eintraege, 'anzahl_fotos', e.anzahl_fotos,
                                                  'created_at', e.created_at) order by e.created_at desc)
                from public.projekt_exporte e where e.baustelle_id = g.baustelle_id), '[]'::jsonb))
    into erg
    from public.baustellen b where b.id = g.baustelle_id;
  return erg;
end $$;

-- Ein gespeicherter Nachweis (nur wenn er zur Baustelle des Links gehört)
create or replace function public.projekt_gast_nachweis(p_token uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.projekt_gastlinks; erg jsonb;
begin
  select * into g from public.projekt_gastlinks
   where token = p_token and aktiv and (gueltig_bis is null or gueltig_bis >= current_date);
  if not found then return null; end if;
  select jsonb_build_object('id', e.id, 'nr', e.nr, 'von', e.von, 'bis', e.bis, 'created_at', e.created_at, 'snapshot', e.snapshot)
    into erg
    from public.projekt_exporte e where e.id = p_id and e.baustelle_id = g.baustelle_id;
  return erg;
end $$;

-- Darf ein Gast diese Bilddatei sehen? Nur Fotos, die in einem gespeicherten Nachweis einer Baustelle mit aktivem Link vorkommen.
create or replace function public.ep_gast_foto(p_name text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from public.projekt_exporte e
       join public.projekt_gastlinks g on g.baustelle_id = e.baustelle_id
      where g.aktiv and (g.gueltig_bis is null or g.gueltig_bis >= current_date)
        and p_name = any (e.foto_pfade)) $$;

revoke all on function public.projekt_gast_liste(uuid), public.projekt_gast_nachweis(uuid, uuid), public.ep_gast_foto(text) from public;
grant execute on function public.projekt_gast_liste(uuid), public.projekt_gast_nachweis(uuid, uuid), public.ep_gast_foto(text) to anon, authenticated;

drop policy if exists projekt_fotos_obj_gast on storage.objects;
create policy projekt_fotos_obj_gast on storage.objects for select to anon
  using (bucket_id = 'projekt-fotos' and public.ep_gast_foto(name));

commit;

-- PostgREST soll die neuen Tabellen/Spalten sofort kennen
notify pgrst, 'reload schema';

-- ── Prüfung: alle Zeilen sollten ok = true zeigen ───────────────────────────
select 'Tabelle projekt_schritte' as pruefung, to_regclass('public.projekt_schritte') is not null as ok
union all select 'Tabelle projekt_fotos',   to_regclass('public.projekt_fotos')   is not null
union all select 'Tabelle projekt_exporte', to_regclass('public.projekt_exporte') is not null
union all select 'Tabelle projekt_historie',to_regclass('public.projekt_historie') is not null
union all select 'Spalte baustellen.doku_pflicht',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='baustellen' and column_name='doku_pflicht')
union all select 'RLS aktiv (4 Tabellen)',
  (select count(*) from pg_class where relname in ('projekt_schritte','projekt_fotos','projekt_exporte','projekt_historie') and relrowsecurity) = 4
union all select 'Policies angelegt (13 Tabellen-Policies)',
  (select count(*) from pg_policies where schemaname = 'public' and tablename in ('projekt_schritte','projekt_fotos','projekt_exporte','projekt_historie')) = 13
union all select 'Storage-Bucket projekt-fotos (privat)',
  exists (select 1 from storage.buckets where id='projekt-fotos' and public = false)
union all select 'Storage-Policies (3 intern + 1 Gast)',
  (select count(*) from pg_policies where schemaname='storage' and policyname like 'projekt_fotos_obj_%') = 4
union all select 'Spalte projekt_schritte.weitere_stunden_ids (Team)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='projekt_schritte' and column_name='weitere_stunden_ids')
union all select 'Spalte projekt_exporte.foto_pfade',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='projekt_exporte' and column_name='foto_pfade')
union all select 'Tabelle projekt_gastlinks (RLS + 4 Policies)',
  to_regclass('public.projekt_gastlinks') is not null
  and (select relrowsecurity from pg_class where oid = 'public.projekt_gastlinks'::regclass)
  and (select count(*) from pg_policies where schemaname='public' and tablename='projekt_gastlinks') = 4
union all select 'Gast-Funktionen (3)',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname in ('projekt_gast_liste','projekt_gast_nachweis','ep_gast_foto')) = 3
union all select 'Policy stunden_insert_admin',
  exists (select 1 from pg_policies where schemaname='public' and tablename='stunden' and policyname='stunden_insert_admin')
union all select 'Spalte stunden.erfasst_von (Eintragen für Kollegen)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='stunden' and column_name='erfasst_von')
union all select 'Kollegen-Policies auf stunden (3)',
  (select count(*) from pg_policies where schemaname='public' and tablename='stunden'
    and policyname in ('stunden_insert_kollegen','stunden_select_erfasser','stunden_delete_erfasser')) = 3
union all select 'Kollegen-Funktionen (2)',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname in ('ep_darf_fuer_kollegen','projekt_stunden_konflikte')) = 2;

-- ── Optional: Baustelle „Rhenus“ gleich anlegen (Adresse danach in der App ergänzen) ──
-- insert into public.baustellen (name, kunde, adresse, beschreibung, status, doku_pflicht, projekt_phase)
-- select 'Rhenus Dietzenbach – Bestandshalle', 'Rhenus Freight Logistik', 'Dietzenbach',
--        'Elektrotechnische Restaurierung der Bestandshalle, Phase 1: Rückbau', 'aktiv', true, 'rueckbau'
--  where not exists (select 1 from public.baustellen where name = 'Rhenus Dietzenbach – Bestandshalle');

-- ── Rollback (nur bei Bedarf; zerstört alle Doku-Daten – vorher Nachweise exportieren!) ──
-- drop table if exists public.projekt_fotos, public.projekt_schritte, public.projekt_exporte, public.projekt_historie, public.projekt_gastlinks cascade;
-- drop function if exists public.projekt_gast_liste(uuid), public.projekt_gast_nachweis(uuid, uuid), public.ep_gast_foto(text);
-- drop policy if exists stunden_insert_kollegen on public.stunden; drop policy if exists stunden_select_erfasser on public.stunden; drop policy if exists stunden_delete_erfasser on public.stunden;
-- drop function if exists public.projekt_stunden_konflikte(text[], text, text, text), public.ep_darf_fuer_kollegen(uuid, text);
-- alter table public.stunden drop column if exists erfasst_von;
-- drop policy if exists projekt_fotos_obj_gast on storage.objects;
-- delete from storage.objects where bucket_id = 'projekt-fotos'; delete from storage.buckets where id = 'projekt-fotos';
-- alter table public.baustellen drop column if exists doku_pflicht, drop column if exists projekt_phase, drop column if exists auftragsnr;
