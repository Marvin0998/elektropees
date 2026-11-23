-- ═════════════════════════════════════════════════════════════════════════
-- Elektro Pees – Lager (Stufe 1): Artikelstamm, Barcodes, Buchungen, Bestand
-- Im Supabase SQL-Editor als GANZES Skript ausführen (Run). Idempotent: kann mehrfach laufen.
-- Läuft in einer Transaktion: entweder wird alles angelegt oder nichts.
-- Rein additiv: nur neue Tabellen/Sicht/Funktionen. Bestehende Tabellen und Policies bleiben unberührt.
-- Modell: Der Bestand wird NIE von Hand überschrieben, sondern ist die Summe aller Buchungen
-- (Einlagerung +, Entnahme −, Inventur-Korrektur ±). Dadurch keine Konflikte bei gleichzeitigem Buchen.
-- Rechte: lesen + buchen alle internen Rollen (admin, buero, mitarbeiter, azubi); Artikelstamm/Barcodes pflegen admin + buero.
-- Rollback (nur falls nötig): siehe Ende der Datei.
-- ═════════════════════════════════════════════════════════════════════════
begin;

-- Rollen-Helfer (gleich wie im Projekt-Modul; create or replace ist unschädlich)
create or replace function public.ep_rolle() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.ep_intern() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero','mitarbeiter','azubi'), false) $$;

create or replace function public.ep_leitung() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.ep_rolle() in ('admin','buero'), false) $$;

-- ── 1. Artikelstamm ─────────────────────────────────────────────────────────
create table if not exists public.lager_artikel (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) > 0),
  artikelnr     text,                                   -- Artikelnummer des Großhändlers (optional)
  einheit       text not null default 'Stk' check (einheit in ('Stk','m','Rolle','Pkg')),
  mindestbestand numeric(12,3) not null default 0 check (mindestbestand >= 0),
  lagerort      text,
  notiz         text,
  aktiv         boolean not null default true,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

-- ── 2. Barcodes (ein Artikel kann mehrere haben: Hersteller-EAN, Großhändler-Code, eigenes Etikett) ──
create table if not exists public.lager_codes (
  code        text primary key check (length(btrim(code)) > 0),
  artikel_id  uuid not null references public.lager_artikel(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists lager_codes_artikel_idx on public.lager_codes(artikel_id);

-- ── 3. Buchungen (menge ist vorzeichenbehaftet: + Einlagerung, − Entnahme) ──────────────────
do $mig$
declare t_baustelle text;
begin
  select format_type(a.atttypid, a.atttypmod) into t_baustelle
    from pg_attribute a
   where a.attrelid = 'public.baustellen'::regclass and a.attname = 'id' and not a.attisdropped;
  if t_baustelle is null then raise exception 'baustellen.id nicht gefunden'; end if;

  execute format($t$
    create table if not exists public.lager_buchungen (
      id            uuid primary key default gen_random_uuid(),
      artikel_id    uuid not null references public.lager_artikel(id) on delete cascade,
      menge         numeric(12,3) not null check (menge <> 0),
      art           text not null check (art in ('einlagerung','entnahme','inventur','korrektur')),
      baustelle_id  %s references public.baustellen(id) on delete set null,
      user_id       uuid not null default auth.uid(),
      notiz         text,
      created_at    timestamptz not null default now(),
      check ((art = 'einlagerung' and menge > 0) or (art = 'entnahme' and menge < 0) or art in ('inventur','korrektur'))
    )$t$, t_baustelle);
end
$mig$;
create index if not exists lager_buchungen_artikel_idx on public.lager_buchungen(artikel_id, created_at desc);
create index if not exists lager_buchungen_baustelle_idx on public.lager_buchungen(baustelle_id) where baustelle_id is not null;
create index if not exists lager_buchungen_zeit_idx on public.lager_buchungen(created_at desc);

-- ── 4. Bestand = Summe der Buchungen (Sicht läuft mit den Rechten des Aufrufers → RLS greift) ──
create or replace view public.lager_bestand with (security_invoker = true) as
select a.id as artikel_id,
       coalesce(sum(b.menge), 0)::numeric(12,3) as bestand,
       max(b.created_at) as letzte_buchung
  from public.lager_artikel a
  left join public.lager_buchungen b on b.artikel_id = a.id
 group by a.id;

-- ── 5. Rechte + RLS ─────────────────────────────────────────────────────────
alter table public.lager_artikel   enable row level security;
alter table public.lager_codes     enable row level security;
alter table public.lager_buchungen enable row level security;
revoke all on public.lager_artikel, public.lager_codes, public.lager_buchungen, public.lager_bestand from anon;
grant select, insert, update, delete on public.lager_artikel, public.lager_codes, public.lager_buchungen to authenticated;
grant select on public.lager_bestand to authenticated;

drop policy if exists lager_artikel_select on public.lager_artikel;
create policy lager_artikel_select on public.lager_artikel for select to authenticated using (public.ep_intern());
drop policy if exists lager_artikel_insert on public.lager_artikel;
create policy lager_artikel_insert on public.lager_artikel for insert to authenticated with check (public.ep_leitung());
drop policy if exists lager_artikel_update on public.lager_artikel;
create policy lager_artikel_update on public.lager_artikel for update to authenticated using (public.ep_leitung()) with check (public.ep_leitung());
drop policy if exists lager_artikel_delete on public.lager_artikel;
create policy lager_artikel_delete on public.lager_artikel for delete to authenticated using (public.ep_rolle() = 'admin');

drop policy if exists lager_codes_select on public.lager_codes;
create policy lager_codes_select on public.lager_codes for select to authenticated using (public.ep_intern());
drop policy if exists lager_codes_insert on public.lager_codes;
create policy lager_codes_insert on public.lager_codes for insert to authenticated with check (public.ep_leitung());
drop policy if exists lager_codes_delete on public.lager_codes;
create policy lager_codes_delete on public.lager_codes for delete to authenticated using (public.ep_leitung());

drop policy if exists lager_buchungen_select on public.lager_buchungen;
create policy lager_buchungen_select on public.lager_buchungen for select to authenticated using (public.ep_intern());
-- buchen darf jeder interne Nutzer, aber nur auf den eigenen Namen; Inventur/Korrektur nur Leitung
drop policy if exists lager_buchungen_insert on public.lager_buchungen;
create policy lager_buchungen_insert on public.lager_buchungen for insert to authenticated
  with check (public.ep_intern() and user_id = auth.uid() and (art in ('einlagerung','entnahme') or public.ep_leitung()));
-- „Rückgängig“: eigene Buchung innerhalb von 10 Minuten; Admin jederzeit
drop policy if exists lager_buchungen_delete on public.lager_buchungen;
create policy lager_buchungen_delete on public.lager_buchungen for delete to authenticated
  using (public.ep_rolle() = 'admin' or (public.ep_intern() and user_id = auth.uid() and created_at > now() - interval '10 minutes'));

commit;

-- PostgREST soll die neuen Tabellen sofort kennen
notify pgrst, 'reload schema';

-- ── Prüfung: alle Zeilen sollten ok = true zeigen ───────────────────────────
select 'Tabelle lager_artikel' as pruefung, to_regclass('public.lager_artikel') is not null as ok
union all select 'Tabelle lager_codes',     to_regclass('public.lager_codes')     is not null
union all select 'Tabelle lager_buchungen', to_regclass('public.lager_buchungen') is not null
union all select 'Sicht lager_bestand',     to_regclass('public.lager_bestand')   is not null
union all select 'RLS aktiv (3 Tabellen)', (select count(*) = 3 from pg_class where oid in ('public.lager_artikel'::regclass,'public.lager_codes'::regclass,'public.lager_buchungen'::regclass) and relrowsecurity)
union all select 'Policies angelegt (10)', (select count(*) = 10 from pg_policies where schemaname = 'public' and tablename like 'lager\_%');

-- ── Rollback (nur im Notfall; löscht ALLE Lagerdaten – vorher exportieren!) ─────────────────
-- drop view if exists public.lager_bestand;
-- drop table if exists public.lager_buchungen, public.lager_codes, public.lager_artikel;
