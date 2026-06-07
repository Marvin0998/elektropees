-- ============================================================
-- ELEKTRO PEES - Datenbank Setup
-- Diesen Code in Supabase > SQL Editor einfügen und ausführen
-- ============================================================

-- 1. PROFILES TABELLE (Mitarbeiterdaten)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text,
  role text default 'mitarbeiter' check (role in ('admin', 'mitarbeiter')),
  regel_stunden integer default 38,
  urlaub_gesamt integer default 25,
  urlaub_genommen integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 2. BAUSTELLEN TABELLE
create table public.baustellen (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  kunde text not null,
  adresse text,
  beschreibung text,
  kontakt text,
  telefon text,
  status text default 'aktiv' check (status in ('aktiv', 'abgeschlossen')),
  created_at timestamp with time zone default timezone('utc', now())
);

-- 3. STUNDEN TABELLE
create table public.stunden (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  baustelle_id uuid references public.baustellen(id) on delete cascade not null,
  datum date not null,
  start_zeit time not null,
  end_zeit time not null,
  pause_min integer default 30,
  dauer numeric(5,2) not null,
  notiz text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ============================================================
-- SICHERHEIT: Row Level Security (RLS) einschalten
-- ============================================================

alter table public.profiles enable row level security;
alter table public.baustellen enable row level security;
alter table public.stunden enable row level security;

-- PROFILES: Jeder sieht alle Profile (für Admin-Auswertung)
create policy "Profiles sind lesbar" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Eigenes Profil bearbeiten" on public.profiles
  for update using (auth.uid() = id);

-- BAUSTELLEN: Alle eingeloggten Nutzer können lesen und schreiben
create policy "Baustellen lesen" on public.baustellen
  for select using (auth.role() = 'authenticated');

create policy "Baustellen anlegen" on public.baustellen
  for insert with check (auth.role() = 'authenticated');

create policy "Baustellen bearbeiten" on public.baustellen
  for update using (auth.role() = 'authenticated');

-- STUNDEN: Alle lesen, jeder schreibt seine eigenen
create policy "Stunden lesen" on public.stunden
  for select using (auth.role() = 'authenticated');

create policy "Eigene Stunden eintragen" on public.stunden
  for insert with check (auth.uid() = user_id);

create policy "Eigene Stunden bearbeiten" on public.stunden
  for update using (auth.uid() = user_id);

-- ============================================================
-- AUTOMATISCH: Profil anlegen wenn neuer User sich registriert
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    'mitarbeiter'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DEMO DATEN (optional - kannst du weglassen)
-- ============================================================

-- Beispiel-Baustellen einfügen
insert into public.baustellen (name, kunde, adresse, beschreibung, status) values
  ('Neubau Familie Müller', 'Familie Müller', 'Rosenstraße 5, 12345 Musterstadt', 'Komplette Elektroinstallation EFH', 'aktiv'),
  ('Bürosanierung Meier GmbH', 'Meier GmbH', 'Industrieweg 12, 54321 Teststadt', 'EDV-Verkabelung und Beleuchtung', 'aktiv');
