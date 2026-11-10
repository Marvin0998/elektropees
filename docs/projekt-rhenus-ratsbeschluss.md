# Projekt-Sparte „Rhenus Dietzenbach“ – Ratsbeschluss (10.11.2026)

Beraten haben fünf Blickwinkel: Abrechnung/Kunde, Monteur-UX, Daten-Architekt, Design/IA, Skeptiker.

## Aufbau
- **Kein neuer Tab.** Die Sparte ist ein Projektbereich (`page='projekt'`) mit Zurück-Pfeil. Einstiege: Karte auf Start, angepinnte Karte oben in Baustellen, und der normale Stunden-Dialog schaltet bei einer Projekt-Baustelle in den Doku-Modus.
- **Projekt = normale Baustelle mit Flag** `baustellen.doku_pflicht` (+ `projekt_phase`, `auftragsnr`). Ohne Migration verhält sich alles wie bisher.
- **`stunden` bleibt die einzige Zeitquelle.** Arbeitsschritte hängen per `stunden_id` (FK, cascade) an genau einem Stundeneintrag. Kein Timer, keine doppelte Zeiteingabe.
- Neue Tabellen: `projekt_schritte`, `projekt_fotos`, `projekt_exporte` (eingefrorene Nachweise), `projekt_historie` (Trigger-Protokoll), `projekt_gastlinks` (Kundenzugang). Privater Bucket `projekt-fotos`.

## Erfassung (Monteur)
- Arbeitsschritt = Tätigkeit (Kachel-Katalog) + Bereich (Chips, zuletzt benutzt) + Minuten (Stepper, Vorbelegung = Resthöhe) + Fotos (Kamera direkt, Vorher/Nachher). Text entsteht aus Tätigkeit + Bereich + optionalem Zusatz; „Sonstiges“ verlangt Freitext (≥ 10 Zeichen, 2 Wörter).
- Pflicht greift an **einer** Stelle: beim Einreichen der Stunden. Σ Schritt-Minuten muss die Nettozeit (Dauer − Pause) abdecken (Toleranz 15 Min, nie darüber). Je Schritt mind. 1 Foto, Ausweg „Kein Foto möglich“ + Grund (wird im Export markiert).
- Fotos werden sofort verkleinert (1600 px / JPEG 0,72, dazu Vorschaubild 640 px) und einzeln hochgeladen; „Einreichen“ ist gesperrt, bis alle Fotos grün sind. Entwurf (Text, Minuten, hochgeladene Pfade) liegt in localStorage.
- Eigene Schritte sind bearbeit-/löschbar, solange der Eintrag nicht freigegeben ist.

## Stunden für mehrere Personen (Chef und Monteure, Wunsch Marvin 10.11.2026)
- Knopf „👥 Stunden für mehrere erfassen“ auf der Projektkarte und der Projektseite (Chef und Monteure; nicht Büro/Azubi/Extern). Assistent in 5 Schritten: **Personen** (Dropdown aus der Mitarbeiter-Datenbank, Chips, „Letzte Auswahl übernehmen“) → **Zeit** (Datum, Von–Bis, Pause, Rechner) → **Arbeiten** (Beschreibung, Minuten) → **Fotos** → **Abschluss** (Zusammenfassung, „Direkt freigeben“).
- Datenmodell ohne Umbau von `stunden`: **je Person eine Stundenzeile** mit identischen Zeiten. Schritte und Fotos werden **einmal** an der Zeile der ersten gewählten Person gespeichert; `projekt_schritte.weitere_stunden_ids` verweist auf die Zeilen der übrigen. Löscht jemand die Träger-Zeile, geht die Doku mit (Prüfliste weist darauf hin).
- Speichern alles-oder-nichts: alle Stundenzeilen in **einer** Anweisung, danach Schritte, dann Fotos; scheitert etwas, werden alle Zeilen wieder gelöscht, Eingaben und Fotos bleiben im Entwurf.
- Doppelbuchungen: Überschneidung je Person und Tag blockiert das Speichern (Name + vorhandene Zeit werden genannt).
- Export: pro Tag werden gleiche Schrittlisten zu einem Block zusammengefasst („A und B · 07:30–17:00 · je 9,50 Std · erfasst von X“, ohne das Wort „Team“); Zeitnachweis mit Spalte „Erfasst von“ (auch CSV; ohne neue SQL-Spalte entfällt sie), Foto-Nummern und Schrittzähler zählen einmal. Das Zeitnachweis-Blatt bleibt je Person eine Zeile.
- Rechte: Admin darf für andere Personen Stundenzeilen anlegen (`stunden_insert_admin`, im SQL).
- **Monteur trägt für Kollegen ein:** er selbst ist immer dabei (seine Zeile trägt die Doku und bleibt von ihm bearbeitbar), Kollegen (Monteur, Azubi, Chef; kein Büro/Extern) kommen dazu. Alle Zeilen bleiben „ausstehend“ (kein Selbstfreigeben), nur auf aktiven Projekt-Baustellen. Die Zeilen der Kollegen tragen `stunden.erfasst_von`; der Kollege sieht bei sich „✍️ von Max eingetragen“ und kann den Eintrag löschen, der Chef sieht es in der Freigabe-Karte. Policies: `stunden_insert_kollegen`, `stunden_select_erfasser`, `stunden_delete_erfasser`.
- **Abgleich:** Doppelbuchungen werden für alle gewählten Personen (inkl. anderer Baustellen) vor dem Speichern geprüft. Monteure sehen fremde Stunden nicht – die Datenbank-Funktion `projekt_stunden_konflikte` meldet nur WER sich überschneidet (keine Zeiten, Notizen, Krankmeldungen).
- Wer etwas anderes gemacht hat, legt einen eigenen Vorgang an → eigener Block im Export.

## Gastzugang für den Kunden (Rhenus)
- Ziel: Mitarbeiter des Kunden sehen **nur die exportierten Nachweise**, ohne Konto. Admin erstellt auf der Projektseite (Übersicht → „Gastzugang für den Kunden“) einen Link `/nachweise?t=<Schlüssel>` mit Namen, optionaler Gültigkeit (30/90/365 Tage oder unbegrenzt); sperren, wieder aktivieren, löschen jederzeit; Zähler „n× geöffnet“.
- Der Gast sieht ausschließlich **gespeicherte** Nachweise (`LN-…`, unveränderlich) **dieser einen Baustelle**: Liste, Nachweisblatt, Fotos, Drucken/PDF, CSV. Keine Navigation, keine Bearbeitung, kein Zugriff auf Stunden, Personen oder andere Baustellen.
- Sicherheit: kein Login, kein Supabase-Zugriff auf Tabellen. Der Browser ruft nur zwei Funktionen mit dem Schlüssel auf (`projekt_gast_liste`, `projekt_gast_nachweis`); sie liefern bei ungültigem, gesperrtem, abgelaufenem Link oder fremder Baustelle `null`. Fotos: `projekt_exporte.foto_pfade` wird beim Speichern des Nachweises gefüllt; eine Storage-Regel erlaubt dem anonymen Nutzer nur genau diese Dateien (signierte Links, 1 Std.). Seite mit `noindex`, `no-referrer`, ohne Service-Worker/Mitteilungs-Abfrage.
- Grenze: Wer den Link weitergibt, gibt den Zugang weiter – deshalb sperrbar und befristbar. Nachweise, die nicht mit „Als Nachweis speichern“ eingefroren wurden, sind für den Gast unsichtbar (Chef steuert, was der Kunde sieht).

## Export (nur admin/buero)
- Eigene Seite `/projekt-export` (kein Popup/`document.write`). PDF über die Druckfunktion des Browsers, dazu CSV (`;`, UTF-8-BOM, Dezimalkomma, Formel-Schutz).
- Nur **freigegebene** Stunden; Krank/Berufsschule nie; keine Preise; keine Freitag-/Überstunden-Marker.
- Teil A Zeitnachweis (KW-Blöcke, Summen je KW/Person/Funktion), Teil B Arbeitsschritte, Teil C Foto-Anlage (optional, max. 150 Fotos), Gegenzeichnung.
- Pause: Standard **brutto** (Von–Bis inkl. bezahlter Pause, Entscheidung Marvin 10.11.2026; Hinweis im Kopf des Nachweises). Ausnahme-Schalter „Abziehen (netto)“ bleibt im Export.
- „Als Nachweis speichern“ friert den Stand ein (`projekt_exporte`, Nr. `LN-JJJJ-nnn`).
- Prüfliste vor dem Export: nicht freigegebene Einträge, freigegebene ohne Doku, Abweichung Σ Schritte vs. Nettozeit > 5 Min, Schritte ohne Foto.
- Paginierte Abfrage (`range`) mit Kontrollsumme, weil `loadData` nur 2000 Zeilen lädt. Zeitnachweis funktioniert für **jede** Baustelle, auch ohne Migration.

## Design
- Bestehendes Designsystem (DM Sans/Mono, #0A0A44, #1B52DD, Karten, Bottom-Sheets). Eigenes Gesicht nur im dunklen Projektkopf und den Phasen-Pills (Rückbau amber, Erneuerung blau, Abnahme grün; immer mit Text).
- Touch-Ziele ≥ 48 px, Eingabefelder 16 px.
- Fortschritt je Hallenbereich als Zahlen (Std., Schritte, Fotos), kein Pseudo-Prozentwert.

## Bewusst NICHT in Version 1
Eigener Tab, XLSX/PDF-Bibliothek, Offline-Queue mit IndexedDB-Fotos, Leistungsverzeichnis/Preise, Kundenunterschrift digital, Bereichsstatus (Offen/Erledigt), „Mit wem?“-Pflicht für Azubis, Datenbank-Trigger „keine Freigabe ohne Doku“. Team-Assistent nur für Admin (nicht Büro); Gastzugang nur Ansicht (keine Kommentare/Freigabe durch den Kunden).

## Offene Entscheidungen für Marvin
1. ~~Pause netto oder brutto~~ → entschieden: brutto (Pause wird mitgerechnet).
2. Darf bei Rhenus fotografiert werden? (sonst „Fotos exportieren“ ausschalten / Hinweis beachten)
3. Muss der Nachweis Namen voll oder „Vorname N.“ zeigen?
4. Bestell-/Auftragsnummer von Rhenus eintragen (Pflicht für den Final-Export).

## Umsetzung (Stand 10.11.2026, Branch `projekt-rhenus`)
- `sql/2026-11-projekt-modul.sql` – einmal im Supabase-SQL-Editor ausführen (idempotent, eine Transaktion, am Ende Prüftabelle „alles t“).
- `lib/projekt.js` (Logik, getestet) · `lib/projektdaten.js` (Datenbank/Fotos) · `components/Projekt.js` (Projektseite, Erfassung, Foto-Betrachter, Gastzugang-Verwaltung) · `components/ProjektTeam.js` (Team-Assistent) · `components/NachweisBlatt.js` (Nachweis-Dokument, gemeinsam für Export und Gast) · `pages/projekt-export.js` (Export) · `pages/nachweise.js` + `lib/gast.js` (Gastseite) · Hooks in `pages/index.js` (Start, Baustellen, Stunden-Dialog, Freigabe) · Styles `proj-*`/`exp-*` in `styles/globals.css`.
- Geprüft: 175 Logik-Tests (3 Zeitzonen) + 59 Daten-Tests + 20 Pfad-Tests, Speicher-Reihenfolge mit Rückabwicklung (auch für Team-Einträge), Browser-Durchläufe (Mitarbeiter, Admin, Export, PDF, CSV, Archiv, Team-Assistent, Gastlink erstellen/öffnen/sperren/ablaufen, ungültige Links), Verhalten VOR dem SQL, SQL zweimal auf PostgreSQL 16 (uuid- und bigint-IDs) inkl. Rechte-Tests (RLS, Storage, Constraints, Cascade, Protokoll, Gast-Funktionen, Gast-Storage). Nicht gegen echtes Supabase geprüft: anonyme signierte Foto-Links (Storage-Regel `projekt_fotos_obj_gast`) – beim ersten echten Gastlink kurz kontrollieren.
- Rückfall: Tag `vor-rhenus` auf dem alten Stand von `main`; Projekt-Modus ist je Baustelle abschaltbar.
