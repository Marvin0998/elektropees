# Projekt-Sparte „Rhenus Dietzenbach“ – Ratsbeschluss (10.11.2026)

Beraten haben fünf Blickwinkel: Abrechnung/Kunde, Monteur-UX, Daten-Architekt, Design/IA, Skeptiker.

## Aufbau
- **Kein neuer Tab.** Die Sparte ist ein Projektbereich (`page='projekt'`) mit Zurück-Pfeil. Einstiege: Karte auf Start, angepinnte Karte oben in Baustellen, und der normale Stunden-Dialog schaltet bei einer Projekt-Baustelle in den Doku-Modus.
- **Projekt = normale Baustelle mit Flag** `baustellen.doku_pflicht` (+ `projekt_phase`, `auftragsnr`). Ohne Migration verhält sich alles wie bisher.
- **`stunden` bleibt die einzige Zeitquelle.** Arbeitsschritte hängen per `stunden_id` (FK, cascade) an genau einem Stundeneintrag. Kein Timer, keine doppelte Zeiteingabe.
- Neue Tabellen: `projekt_schritte`, `projekt_fotos`, `projekt_exporte` (eingefrorene Nachweise), `projekt_historie` (Trigger-Protokoll). Privater Bucket `projekt-fotos`.

## Erfassung (Monteur)
- Arbeitsschritt = Tätigkeit (Kachel-Katalog) + Bereich (Chips, zuletzt benutzt) + Minuten (Stepper, Vorbelegung = Resthöhe) + Fotos (Kamera direkt, Vorher/Nachher). Text entsteht aus Tätigkeit + Bereich + optionalem Zusatz; „Sonstiges“ verlangt Freitext (≥ 10 Zeichen, 2 Wörter).
- Pflicht greift an **einer** Stelle: beim Einreichen der Stunden. Σ Schritt-Minuten muss die Nettozeit (Dauer − Pause) abdecken (Toleranz 15 Min, nie darüber). Je Schritt mind. 1 Foto, Ausweg „Kein Foto möglich“ + Grund (wird im Export markiert).
- Fotos werden sofort verkleinert (1600 px / JPEG 0,72, dazu Vorschaubild 640 px) und einzeln hochgeladen; „Einreichen“ ist gesperrt, bis alle Fotos grün sind. Entwurf (Text, Minuten, hochgeladene Pfade) liegt in localStorage.
- Eigene Schritte sind bearbeit-/löschbar, solange der Eintrag nicht freigegeben ist.

## Export (nur admin/buero)
- Eigene Seite `/projekt-export` (kein Popup/`document.write`). PDF über die Druckfunktion des Browsers, dazu CSV (`;`, UTF-8-BOM, Dezimalkomma, Formel-Schutz).
- Nur **freigegebene** Stunden; Krank/Berufsschule nie; keine Preise; keine Freitag-/Überstunden-Marker.
- Teil A Zeitnachweis (KW-Blöcke, Summen je KW/Person/Funktion), Teil B Arbeitsschritte, Teil C Foto-Anlage (optional, max. 150 Fotos), Gegenzeichnung.
- Pause: Standard **netto** (Von − Bis − Pause), Schalter „Pause mitberechnen“ (dann Hinweis im Kopf). Entscheidung gegenüber Rhenus liegt bei Marvin.
- „Als Nachweis speichern“ friert den Stand ein (`projekt_exporte`, Nr. `LN-JJJJ-nnn`).
- Prüfliste vor dem Export: nicht freigegebene Einträge, freigegebene ohne Doku, Abweichung Σ Schritte vs. Nettozeit > 5 Min, Schritte ohne Foto.
- Paginierte Abfrage (`range`) mit Kontrollsumme, weil `loadData` nur 2000 Zeilen lädt. Zeitnachweis funktioniert für **jede** Baustelle, auch ohne Migration.

## Design
- Bestehendes Designsystem (DM Sans/Mono, #0A0A44, #1B52DD, Karten, Bottom-Sheets). Eigenes Gesicht nur im dunklen Projektkopf und den Phasen-Pills (Rückbau amber, Erneuerung blau, Abnahme grün; immer mit Text).
- Touch-Ziele ≥ 48 px, Eingabefelder 16 px.
- Fortschritt je Hallenbereich als Zahlen (Std., Schritte, Fotos), kein Pseudo-Prozentwert.

## Bewusst NICHT in Version 1
Eigener Tab, XLSX/PDF-Bibliothek, Offline-Queue mit IndexedDB-Fotos, Leistungsverzeichnis/Preise, Kundenunterschrift digital, Bereichsstatus (Offen/Erledigt), „Mit wem?“-Pflicht für Azubis, Datenbank-Trigger „keine Freigabe ohne Doku“.

## Offene Entscheidungen für Marvin
1. Pause netto oder brutto abrechnen (Voreinstellung netto).
2. Darf bei Rhenus fotografiert werden? (sonst „Fotos exportieren“ ausschalten / Hinweis beachten)
3. Muss der Nachweis Namen voll oder „Vorname N.“ zeigen?
4. Bestell-/Auftragsnummer von Rhenus eintragen (Pflicht für den Final-Export).

## Umsetzung (Stand 10.11.2026, Branch `projekt-rhenus`)
- `sql/2026-11-projekt-modul.sql` – einmal im Supabase-SQL-Editor ausführen (idempotent, eine Transaktion, am Ende Prüftabelle „alles t“).
- `lib/projekt.js` (Logik, getestet) · `lib/projektdaten.js` (Datenbank/Fotos) · `components/Projekt.js` (Projektseite, Erfassung, Foto-Betrachter) · `pages/projekt-export.js` (Export) · Hooks in `pages/index.js` (Start, Baustellen, Stunden-Dialog, Freigabe) · Styles `proj-*`/`exp-*` in `styles/globals.css`.
- Geprüft: 140 Logik-Tests (3 Zeitzonen), Speicher-Reihenfolge mit Rückabwicklung, kompletter Browser-Durchlauf (Mitarbeiter, Admin, Export, PDF, CSV, Archiv), Verhalten VOR dem SQL, SQL zweimal auf PostgreSQL 16 (uuid- und bigint-IDs) inkl. 45 Rechte-Tests (RLS, Storage, Constraints, Cascade, Protokoll).
- Rückfall: Tag `vor-rhenus` auf dem alten Stand von `main`; Projekt-Modus ist je Baustelle abschaltbar.
