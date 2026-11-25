# Lager (Stufe 1) – Stand 23.11.2026

**Seite:** `/lager` (Karte „Lager“ auf der Startseite). Zugang: admin, buero, mitarbeiter, azubi. Extern: kein Zugriff.

**Ablauf:** Reiter „Scannen“ → Kamera (iPhone) liest Barcode → Buchungsfenster (Entnahme/Einlagerung, Menge, optional Baustelle + Notiz) → Toast mit „Rückgängig“.
Unbekannter Code: Büro/Admin legen den Artikel an (Code vorausgefüllt) oder ordnen den Code einem vorhandenen Artikel zu; Mitarbeiter bekommen den Hinweis, im Büro Bescheid zu geben.

**Datenmodell** (`sql/2026-11-lager.sql`, idempotent, additiv):
- `lager_artikel` (Name, Artikelnr., Einheit Stk/m/Rolle/Pkg, Mindestbestand, Lagerort, aktiv)
- `lager_codes` (beliebig viele Barcodes je Artikel, Code ist eindeutig)
- `lager_buchungen` (Menge mit Vorzeichen: + Einlagerung, − Entnahme; Art; Baustelle; Nutzer; Notiz)
- Sicht `lager_bestand` = Summe der Buchungen (security_invoker). Der Bestand wird nie überschrieben → keine Konflikte bei gleichzeitigem Buchen.

**Rechte (RLS):** lesen + buchen alle internen Rollen (nur auf den eigenen Namen); Artikel/Codes pflegen admin + buero; Inventur/Korrektur nur admin + buero (UI kommt in Stufe 3); Artikel löschen nur admin (UI archiviert stattdessen); „Rückgängig“: eigene Buchung bis 10 Minuten, Admin jederzeit.

**Weitere Funktionen:** Bestandsliste mit Suche (Name, Nr., Lagerort, Code), Filter Knapp/Leer, Status-Farben, Archiv, CSV-Export (inkl. Fehlmenge bis Mindestbestand), Verlauf, Warnung bei Entnahme über Bestand.

**Scanner:** ZXing im Browser (EAN-13/8, UPC, Code 128/39, ITF, QR, Data Matrix); Eingabefeld für Handscanner/Tastatur als Rückfall. iOS fragt die Kamera-Freigabe in der Home-Bildschirm-App ggf. bei jedem Start.

**Geplant:** Stufe 2 Etiketten-PDF, Bestellliste, Auswertung je Baustelle · Stufe 3 Inventur, Werkzeugausgabe, Offline-Warteschlange.

## Lager-Handy (Kiosk) – Konto, App-Symbol, Dauerbetrieb
- **Rolle `lager`** (SQL: `sql/2026-11-lager-konto.sql`): darf nur das Lager lesen und Entnahme/Einlagerung buchen. Kein Zugriff auf Projekte (Rhenus), keine Inventur, kein Artikelstamm. Wird in der Startseite sofort nach `/lager` geleitet und taucht nicht in Mitarbeiter-/Urlaubs-/Kalenderlisten auf.
- **Konto anlegen:** in der App als Admin „Mitarbeiter anlegen“ → Rolle „Lager-Handy (nur Lager scannen)“, Name z. B. „Lager“, Passwort selbst vergeben.
- **Eigenes App-Symbol:** `/lager` hat ein eigenes Manifest (`public/manifest-lager.json`, start_url `/lager`, Name „Lager“). In Safari `/lager` öffnen → Teilen → „Zum Home-Bildschirm“.
- **Bildschirm an:** Wake Lock auf der Lager-Seite (☀ im Titel, wenn aktiv). iOS: im Home-Bildschirm-Modus erst ab iOS 18.4 zuverlässig → zusätzlich Automatische Sperre „Nie“ + Geführter Zugriff.
- Abmelden (nur Lager-Konto): oben links, zweimal tippen.
- Lager-Konto darf Artikel anlegen/ändern/archivieren und Codes zuordnen/entfernen (`ep_lager_pflege()`); wer einen Artikel selbst angelegt hat, kann ihn 10 Minuten lang wieder löschen (Rollback bei Fehler). Mitarbeiter/Azubi bekommen weiter den Hinweis „im Büro Bescheid geben“.
