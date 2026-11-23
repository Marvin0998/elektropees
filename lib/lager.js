// Lager – reine Logik (keine Netzwerk-/Browser-Abhängigkeit, daher einfach testbar).
export const EINHEITEN = ['Stk', 'm', 'Rolle', 'Pkg']
export const EINHEIT_NAMEN = { Stk: 'Stück', m: 'Meter', Rolle: 'Rolle', Pkg: 'Packung' }
// Schnellwahl für die Menge je Einheit
export const SCHNELLWAHL = { Stk: [1, 2, 5, 10, 25], m: [5, 10, 25, 50, 100], Rolle: [1, 2, 3, 5], Pkg: [1, 2, 5, 10] }
export const BUCHUNGSARTEN = { einlagerung: 'Einlagerung', entnahme: 'Entnahme', inventur: 'Inventur', korrektur: 'Korrektur' }

// Scanner-Ergebnisse säubern: Leerraum/Steuerzeichen (Enter, Tab am Ende bei Handscannern) entfernen.
export function normalisiereCode(s) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F\s]+/g, '').slice(0, 64)
}

// "2,5" / "2.5" / " 12 " → Zahl (max. 3 Nachkommastellen); ungültig → NaN
export function parseMenge(s) {
  if (typeof s === 'number') return Number.isFinite(s) ? Math.round(s * 1000) / 1000 : NaN
  const t = String(s == null ? '' : s).trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(t) && !/^\d*\.\d{1,3}$/.test(t)) return NaN
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN
}

export function fmtZahl(n) {
  const v = Math.round((Number(n) || 0) * 1000) / 1000
  return v.toLocaleString('de-DE', { maximumFractionDigits: 3 })
}
export function fmtMenge(n, einheit) { return `${fmtZahl(n)} ${einheit || ''}`.trim() }
export function fmtMitVorzeichen(n, einheit) { const v = Number(n) || 0; return `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtZahl(Math.abs(v))} ${einheit || ''}`.trim() }

// ok | knapp (≤ Mindestbestand) | leer (≤ 0) | negativ (< 0)
export function bestandStatus(bestand, mindest) {
  const b = Number(bestand) || 0; const m = Number(mindest) || 0
  if (b < 0) return 'negativ'
  if (b === 0) return 'leer'
  if (m > 0 && b <= m) return 'knapp'
  return 'ok'
}
export const STATUS_TEXT = { ok: 'Auf Lager', knapp: 'Knapp – nachbestellen', leer: 'Leer', negativ: 'Bestand negativ – Inventur prüfen' }

// Eingabe prüfen, bevor gebucht wird.
// Rückgabe: { ok, fehler?, warnung?, menge (vorzeichenbehaftet) }
export function pruefeBuchung({ art, mengeText, artikel, bestand }) {
  const betrag = parseMenge(mengeText)
  if (!(betrag > 0)) return { ok: false, fehler: 'Bitte eine Menge größer als 0 eingeben.' }
  if (betrag > 100000) return { ok: false, fehler: 'Die Menge ist unrealistisch hoch – bitte prüfen.' }
  const ganzzahlig = artikel && artikel.einheit !== 'm'
  if (ganzzahlig && !Number.isInteger(betrag)) return { ok: false, fehler: `Für „${artikel.einheit}“ nur ganze Zahlen buchen.` }
  if (art === 'einlagerung') return { ok: true, menge: betrag }
  if (art === 'entnahme') {
    const warnung = (Number(bestand) || 0) < betrag
      ? `Laut App sind nur ${fmtMenge(Math.max(0, Number(bestand) || 0), artikel && artikel.einheit)} im Lager. Trotzdem entnehmen?`
      : null
    return { ok: true, menge: -betrag, warnung }
  }
  return { ok: false, fehler: 'Unbekannte Buchungsart.' }
}

// Liste für die Bestandsansicht: Artikel + Bestand + Codes, gefiltert und sortiert.
export function baueBestandsliste({ artikel, bestaende, codes, suche = '', filter = 'alle', nurAktiv = true }) {
  const best = new Map((bestaende || []).map(b => [b.artikel_id, Number(b.bestand) || 0]))
  const codeMap = new Map()
  ;(codes || []).forEach(c => { if (!codeMap.has(c.artikel_id)) codeMap.set(c.artikel_id, []); codeMap.get(c.artikel_id).push(c.code) })
  const q = String(suche || '').toLowerCase().trim()
  let l = (artikel || []).map(a => {
    const bestand = best.get(a.id) || 0
    return { ...a, bestand, codes: codeMap.get(a.id) || [], status: bestandStatus(bestand, a.mindestbestand) }
  })
  if (nurAktiv) l = l.filter(a => a.aktiv !== false)
  else l = l.filter(a => a.aktiv === false)
  if (filter === 'knapp') l = l.filter(a => a.status === 'knapp' || a.status === 'leer' || a.status === 'negativ')
  if (filter === 'leer') l = l.filter(a => a.status === 'leer' || a.status === 'negativ')
  if (q) l = l.filter(a => [a.name, a.artikelnr, a.lagerort, a.notiz, ...a.codes].some(x => x && String(x).toLowerCase().includes(q)))
  return l.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de', { sensitivity: 'base', numeric: true }))
}

export function findeArtikelPerCode(code, codes, artikel) {
  const c = normalisiereCode(code)
  if (!c) return null
  const hit = (codes || []).find(x => x.code === c) || (codes || []).find(x => x.code.toLowerCase() === c.toLowerCase())
  if (!hit) return null
  return (artikel || []).find(a => a.id === hit.artikel_id) || null
}

// Fehlmenge bis zum Mindestbestand (Grundlage für die Bestellliste)
export function fehlmenge(a) {
  const m = Number(a.mindestbestand) || 0
  return Math.max(0, Math.round((m - (Number(a.bestand) || 0)) * 1000) / 1000)
}

// CSV (Excel-tauglich: BOM, Semikolon, Dezimalkomma)
export function csvBestand(liste) {
  const esc = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const z = n => fmtZahl(n)
  const kopf = ['Artikel', 'Artikelnr.', 'Barcodes', 'Lagerort', 'Einheit', 'Bestand', 'Mindestbestand', 'Fehlmenge', 'Status']
  const zeilen = liste.map(a => [a.name, a.artikelnr || '', a.codes.join(' '), a.lagerort || '', a.einheit, z(a.bestand), z(a.mindestbestand), z(fehlmenge(a)), STATUS_TEXT[a.status]])
  return '﻿' + [kopf, ...zeilen].map(r => r.map(esc).join(';')).join('\r\n')
}

export function dateinameBestand(heute = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `Lagerbestand_${heute.getFullYear()}-${p(heute.getMonth() + 1)}-${p(heute.getDate())}.csv`
}

// Rückgängig nur für eigene Buchungen der letzten 10 Minuten (identisch zur Datenbank-Regel)
export function kannRueckgaengig(buchung, userId, istAdmin, jetzt = Date.now()) {
  if (istAdmin) return true
  return buchung.user_id === userId && jetzt - new Date(buchung.created_at).getTime() < 10 * 60 * 1000
}

export function fmtZeit(iso) {
  const d = new Date(iso)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}. ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Datenbankfehler → verständlicher Text
export function fehlerText(e) {
  const m = String((e && (e.message || e.details)) || e || '')
  if (e && (e.code === '23505' || /duplicate key|unique/i.test(m))) return 'Dieser Barcode ist schon vergeben.'
  if (e && e.code === '42501' || /row-level security|permission denied/i.test(m)) return 'Dafür fehlt dir die Berechtigung.'
  if (e && (e.code === '42P01' || e.code === 'PGRST205') || /does not exist|schema cache/i.test(m)) return 'Das Lager ist noch nicht eingerichtet (SQL-Datei fehlt).'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Keine Verbindung – bitte Netz prüfen und nochmal versuchen.'
  return m || 'Unbekannter Fehler'
}
