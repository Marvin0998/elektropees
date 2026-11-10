// ════════════════════════════════════════════════════════════════════════════
// Projekt-Modul (z.B. Rhenus Dietzenbach): reine Logik ohne React/Supabase-Import.
// Alles hier ist testbar (siehe docs/projekt-rhenus-ratsbeschluss.md für die Regeln).
// ════════════════════════════════════════════════════════════════════════════

// ─── Kataloge ────────────────────────────────────────────────────────────────
export const PROJEKT_PHASEN = [
  { id: 'rueckbau',   label: 'Rückbau',    farbe: 'amber' },
  { id: 'erneuerung', label: 'Erneuerung', farbe: 'blue' },
  { id: 'abnahme',    label: 'Abnahme',    farbe: 'green' },
]
export function phaseInfo(id) { return PROJEKT_PHASEN.find(p => p.id === id) || null }

// Kachel-Katalog: phasen = in welchen Phasen die Kachel vorn erscheint ('alle' = immer).
// Die Beschriftung wird beim Speichern in `projekt_schritte.taetigkeit` kopiert, damit
// alte Nachweise auch dann stimmen, wenn der Katalog später geändert wird.
export const PROJEKT_TAETIGKEITEN = [
  { id: 'freischalten',   icon: '🔌', label: 'Freischalten / Spannungsfreiheit prüfen', phasen: ['rueckbau', 'erneuerung'] },
  { id: 'leitung_rueck',  icon: '✂️', label: 'Leitungen zurückbauen',                   phasen: ['rueckbau'] },
  { id: 'geraet_rueck',   icon: '💡', label: 'Leuchten / Geräte demontieren',           phasen: ['rueckbau'] },
  { id: 'trasse_rueck',   icon: '🪜', label: 'Kabeltrassen / Kanäle demontieren',       phasen: ['rueckbau'] },
  { id: 'verteiler_rueck',icon: '🗄️', label: 'Verteiler / Schaltschränke demontieren',  phasen: ['rueckbau'] },
  { id: 'entsorgung',     icon: '🚛', label: 'Sammeln / Abtransport / Entsorgung',      phasen: ['rueckbau', 'erneuerung'] },
  { id: 'bestand',        icon: '📋', label: 'Bestand aufnehmen / beschriften',         phasen: ['rueckbau', 'erneuerung', 'abnahme'] },
  { id: 'ruesten',        icon: '🏗️', label: 'Rüsten (Hubsteiger / Gerüst / Material)', phasen: ['alle'] },
  { id: 'leitung_neu',    icon: '🧵', label: 'Leitungen verlegen',                      phasen: ['erneuerung'] },
  { id: 'montage_neu',    icon: '🔧', label: 'Montage Leuchten / Geräte / Installation',phasen: ['erneuerung'] },
  { id: 'verteiler_neu',  icon: '🧰', label: 'Verteiler aufbauen / verdrahten',         phasen: ['erneuerung'] },
  { id: 'messen',         icon: '📏', label: 'Messen / Prüfen / Protokollieren',        phasen: ['erneuerung', 'abnahme'] },
  { id: 'sonstiges',      icon: '✏️', label: 'Sonstiges (selbst beschreiben)',          phasen: ['alle'], freitext: true },
]
export function katalogEintrag(id) { return PROJEKT_TAETIGKEITEN.find(t => t.id === id) || null }
// Kacheln für die Phase zuerst, der Rest danach; „Sonstiges“ immer zuletzt.
export function katalogFuerPhase(phase) {
  const p = phase || 'rueckbau'
  const passt = t => t.phasen.includes('alle') || t.phasen.includes(p)
  const vorn = PROJEKT_TAETIGKEITEN.filter(t => passt(t) && !t.freitext)
  const hinten = PROJEKT_TAETIGKEITEN.filter(t => !passt(t) && !t.freitext)
  return { haupt: [...vorn, ...PROJEKT_TAETIGKEITEN.filter(t => t.freitext)], weitere: hinten }
}

export const STANDARD_BEREICHE = ['Halle', 'Außenbereich']
export const PROJEKT_TOLERANZ_MIN = 15      // so viel Nettozeit darf unbeschrieben bleiben
export const PROJEKT_MAX_FOTOS_ANLAGE = 150 // Obergrenze Foto-Anlage im Nachweis

// ─── Datum/Zeit (bewusst UTC-basiert, wie in der App: keine Zeitumstellungs-Fehler) ──
export const TAG_MS = 86400000
export function utcTag(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) }
export function tagString(ms) { return new Date(ms).toISOString().slice(0, 10) }
export function montagVonDatum(datum) { const t = utcTag(datum); return tagString(t - ((new Date(t).getUTCDay() + 6) % 7) * TAG_MS) }
export function isoKalenderwoche(montag) { const donnerstag = utcTag(montag) + 3 * TAG_MS; const jahr = new Date(donnerstag).getUTCFullYear(); return Math.floor((donnerstag - Date.UTC(jahr, 0, 1)) / (7 * TAG_MS)) + 1 }
export function isoJahr(montag) { return new Date(utcTag(montag) + 3 * TAG_MS).getUTCFullYear() }
export function addTage(datum, n) { return tagString(utcTag(datum) + n * TAG_MS) }
const WT_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export function wochentagKurz(datum) { return WT_KURZ[new Date(utcTag(datum)).getUTCDay()] }
export function fmtDatum(d) { if (!d) return '—'; const [y, m, t] = String(d).slice(0, 10).split('-'); return `${t}.${m}.${y}` }
export function fmtDatumKurz(d) { if (!d) return '—'; const [, m, t] = String(d).slice(0, 10).split('-'); return `${t}.${m}.` }
export function zeitMin(z) { if (!z) return 0; const [h, m] = String(z).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export function hhmm(z) { return z ? String(z).slice(0, 5) : '' }

// ─── Minuten & Formatierung ──────────────────────────────────────────────────
// Dauer eines Stundeneintrags in Minuten (brutto = Ende − Start, inkl. bezahlter Pause).
export function eintragBrutto(s) {
  if (s && s.start_zeit && s.end_zeit) { const m = zeitMin(s.end_zeit) - zeitMin(s.start_zeit); if (m > 0) return m }
  return Math.round((Number(s && s.dauer) || 0) * 60)
}
export function eintragNetto(s) { return Math.max(0, eintragBrutto(s) - (Number(s && s.pause_min) || 0)) }
export function nettoMinuten(dauerStd, pauseMin) { return Math.max(0, Math.round((Number(dauerStd) || 0) * 60) - (Number(pauseMin) || 0)) }
export function fmtMin(min) {
  const m = Math.max(0, Math.round(Number(min) || 0)); const h = Math.floor(m / 60); const r = m % 60
  if (h === 0) return `${r} Min`
  return r === 0 ? `${h} Std` : `${h} Std ${r} Min`
}
export function fmtHM(min) { const m = Math.max(0, Math.round(Number(min) || 0)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
export function fmtStdKomma(min, stellen = 2) { return (Math.round(Number(min) || 0) / 60).toFixed(stellen).replace('.', ',') }

// ─── Arbeitsschritte: Text & Prüfung ─────────────────────────────────────────
// Schritt-Objekt (UI): { key, taetigkeit:id, bereich, zusatz, min, fotos:[{id,art,status,path,thumbPath}], keinFoto, keinFotoGrund }
export function schrittText(s) {
  const k = katalogEintrag(s && s.taetigkeit)
  const teile = []
  if (k && !k.freitext) teile.push(k.label)
  if (s && s.bereich && s.bereich.trim()) teile.push(s.bereich.trim())
  let text = teile.join(' – ')
  const z = ((s && s.zusatz) || '').trim()
  if (z) text = text ? `${text}: ${z}` : z
  return text
}
export function taetigkeitLabel(s) { const k = katalogEintrag(s && s.taetigkeit); return k ? (k.freitext ? 'Sonstiges' : k.label) : '' }
export function notizAusSchritten(schritte) { return (schritte || []).map(s => `${schrittText(s)} (${fmtMin(s.min)})`).join('; ') }
export function woerter(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length }

// teil: 'alle' (Standard) · 'text' (nur Beschreibung/Dauer/Abdeckung) · 'fotos' (nur Foto-Pflicht) – für den
// Team-Assistenten, der Beschreibung und Fotos in getrennten Schritten abfragt.
export function pruefeSchritte(schritte, netto, { toleranz = PROJEKT_TOLERANZ_MIN, teil = 'alle' } = {}) {
  const mitText = teil !== 'fotos'; const mitFotos = teil !== 'text'
  const fehler = []
  const liste = schritte || []
  if (liste.length === 0) fehler.push('Mindestens ein Arbeitsschritt ist nötig.')
  let summe = 0
  liste.forEach((s, i) => {
    const nr = i + 1
    const min = Math.round(Number(s.min) || 0)
    summe += Math.max(0, min)
    if (mitText) {
      if (!(min >= 1 && min <= 720)) fehler.push(`Schritt ${nr}: Dauer angeben (1–720 Min).`)
      const k = katalogEintrag(s.taetigkeit)
      if (!k) fehler.push(`Schritt ${nr}: Tätigkeit wählen.`)
      else if (k.freitext) {
        const z = (s.zusatz || '').trim()
        if (z.length < 10 || woerter(z) < 2) fehler.push(`Schritt ${nr}: Bei „Sonstiges“ bitte kurz beschreiben (mind. 2 Wörter).`)
      }
      if (k && schrittText(s).trim().length < 8) fehler.push(`Schritt ${nr}: Beschreibung ist zu kurz.`)
    }
    if (mitFotos) {
      const fotos = s.fotos || []
      if (fotos.some(f => f.status === 'laedt')) fehler.push(`Schritt ${nr}: Ein Foto lädt noch hoch.`)
      if (fotos.some(f => f.status === 'fehler')) fehler.push(`Schritt ${nr}: Ein Foto konnte nicht hochgeladen werden – nochmal versuchen oder entfernen.`)
      const ok = fotos.filter(f => f.status === 'ok')
      if (ok.length === 0) {
        if (s.keinFoto) { if ((s.keinFotoGrund || '').trim().length < 5) fehler.push(`Schritt ${nr}: Grund für „Kein Foto möglich“ angeben.`) }
        else fehler.push(`Schritt ${nr}: Foto fehlt (oder „Kein Foto möglich“ wählen).`)
      }
    }
  })
  const n = Math.max(0, Math.round(Number(netto) || 0))
  if (mitText && n > 0 && liste.length > 0) {
    if (summe > n) fehler.push(`Die Schritte (${fmtMin(summe)}) sind länger als die Arbeitszeit (${fmtMin(n)}).`)
    else if (n - summe > toleranz) fehler.push(`Noch ${fmtMin(n - summe)} der Arbeitszeit sind nicht beschrieben.`)
  }
  return { ok: fehler.length === 0, fehler, summe, rest: n - summe }
}

// Vorbelegung für den nächsten Schritt: Rest der Arbeitszeit, auf 15 Min gerundet, mindestens 15.
export function vorschlagMinuten(netto, bisher) {
  const rest = Math.max(0, Math.round(Number(netto) || 0) - (bisher || []).reduce((a, s) => a + (Math.round(Number(s.min)) || 0), 0))
  return Math.max(15, Math.min(720, Math.round(rest / 15) * 15 || 15))
}
export function neuerSchritt(min = 60) {
  return { key: uuid(), taetigkeit: '', bereich: '', zusatz: '', min, minManuell: false, fotos: [], keinFoto: false, keinFotoGrund: '' }
}

// Umkehrung: gespeicherte Zeile (+ Fotos) → UI-Schritt zum Bearbeiten.
export function schrittAusZeile(row, fotos = []) {
  const bereich = row.bereich || ''
  const text = row.beschreibung || ''
  const k = PROJEKT_TAETIGKEITEN.find(t => !t.freitext && t.label === row.taetigkeit)
  let taetigkeit = 'sonstiges'; let zusatz = text
  if (k && text.startsWith(k.label)) {
    taetigkeit = k.id
    let rest = text.slice(k.label.length)
    if (bereich && rest.startsWith(' – ' + bereich)) rest = rest.slice(3 + bereich.length)
    zusatz = rest.startsWith(': ') ? rest.slice(2) : ''
  } else if (bereich && text.startsWith(bereich + ': ')) zusatz = text.slice(bereich.length + 2)
  else if (bereich && text === bereich) zusatz = ''
  return {
    key: row.id, dbId: row.id, taetigkeit, bereich, zusatz, min: row.dauer_min,
    fotos: (fotos || []).map(f => ({ id: f.id, art: f.art, status: 'ok', path: f.storage_path, thumbPath: f.thumb_path, neu: false })),
    keinFoto: !(fotos || []).length && !!row.kein_foto_grund, keinFotoGrund: row.kein_foto_grund || '',
  }
}
// Nach dem Bearbeiten von Schritten: neue Notiz des Stundeneintrags (Zusatz-Notiz bleibt) –
// oder null, wenn die Notiz nicht mehr aus den alten Schritten stammt (dann nichts anfassen).
export function notizNachBearbeitung(notizAlt, schritteAlt, schritteNeu) {
  const kopf = l => (l || []).map(s => `${s.beschreibung} (${fmtMin(s.dauer_min)})`).join('; ')
  const alt = kopf(schritteAlt)
  const n = String(notizAlt || '')
  if (!alt || !n.startsWith(alt)) return null
  const rest = n.slice(alt.length)
  if (rest !== '' && !rest.startsWith(' | ')) return null
  return kopf(schritteNeu) + rest
}

// Zeilen für die Datenbank (projekt_schritte) aus den UI-Schritten.
export function schritteZeilen(schritte, stundenId, phase) {
  return schritte.map((s, i) => ({
    id: s.dbId || uuid(),
    stunden_id: stundenId,
    nr: i + 1,
    taetigkeit: taetigkeitLabel(s),
    beschreibung: schrittText(s),
    dauer_min: Math.round(Number(s.min)),
    bereich: (s.bereich || '').trim() || null,
    phase: phase || null,
    kein_foto_grund: (s.fotos || []).some(f => f.status === 'ok') ? null : ((s.keinFotoGrund || '').trim() || null),
  }))
}

// ─── Bereiche (Hallenbereiche) ───────────────────────────────────────────────
export function normBereich(b) { return String(b || '').replace(/\s+/g, ' ').trim().slice(0, 40) }
// Vorschläge: bewusst nur die Standard-Bereiche (Halle, Außenbereich); alles andere über „+ Neu“.
// Parameter bleiben für Aufrufer erhalten; ein bereits gewählter eigener Bereich wird im Formular als aktiver Chip gezeigt.
export function bereichVorschlaege() {
  return STANDARD_BEREICHE.slice()
}
// schritte: Zeilen mit dauer_min, bereich, fotoAnzahl (optional)
export function aggregiereBereiche(schritte) {
  const m = new Map()
  ;(schritte || []).forEach(s => {
    const b = normBereich(s.bereich) || 'Ohne Bereich'
    const k = b.toLowerCase()
    const e = m.get(k) || { bereich: b, min: 0, schritte: 0, fotos: 0 }
    e.min += Number(s.dauer_min) || 0; e.schritte += 1; e.fotos += Number(s.fotoAnzahl) || 0
    m.set(k, e)
  })
  return [...m.values()].sort((a, b) => b.min - a.min)
}

// ─── Namen & Funktionen ──────────────────────────────────────────────────────
export function anzeigeName(name, modus = 'voll') {
  const n = String(name || '—').trim()
  if (modus !== 'kurz') return n
  const t = n.split(/\s+/)
  return t.length < 2 ? n : `${t[0][0].toUpperCase()}. ${t.slice(1).join(' ')}`
}
// „A“, „A und B“, „A, B und C“
export function namenListe(namen) {
  const l = (namen || []).filter(Boolean)
  return l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} und ${l[l.length - 1]}`
}
export function funktionLabel(role) {
  return ({ admin: 'Meister / Leitung', buero: 'Büro', mitarbeiter: 'Monteur', azubi: 'Auszubildende/r' })[role] || 'Monteur'
}
export function istAbwesenheit(s) { const n = String((s && s.notiz) || ''); return n.startsWith('🤒') || n.startsWith('🎓') }

// ─── Team-Einträge: ein Schritt gehört zu mehreren Stundenzeilen ─────────────
// Ein Schritt hängt an der Stundenzeile der ersten Person (stunden_id); weitere_stunden_ids nennt die
// Stundenzeilen der übrigen Teammitglieder. Ergebnis: Stunden-ID (Text) → Liste der Schritte.
export function stundenIdsDesSchritts(s) {
  return [s && s.stunden_id, ...(((s && s.weitere_stunden_ids) || []))].filter(x => x != null).map(String)
}
export function schritteJeStundeMap(schritte) {
  const m = new Map()
  ;(schritte || []).forEach(s => stundenIdsDesSchritts(s).forEach(k => { const l = m.get(k) || []; if (!l.includes(s)) l.push(s); m.set(k, l) }))
  return m
}
// Einträge eines Tages zu Blöcken zusammenfassen: gleiche Schritte (Team) → ein Block mit mehreren Personen.
export function baueBloecke(eintraege) {
  const byKey = new Map(); const out = []
  ;(eintraege || []).forEach(e => {
    const k = e.schrittKey || `e:${e.id}`
    let b = byKey.get(k)
    if (!b) { b = { key: k, eintraege: [] }; byKey.set(k, b); out.push(b) }
    b.eintraege.push(e)
  })
  return out.map(b => {
    const f = b.eintraege[0]
    const gleich = fn => b.eintraege.every(e => fn(e) === fn(f))
    return {
      id: f.id, personen: b.eintraege.map(e => e.person),
      von: gleich(e => e.von) ? f.von : null, bis: gleich(e => e.bis) ? f.bis : null, min: gleich(e => e.min) ? f.min : null,
      summeMin: b.eintraege.reduce((a, e) => a + e.min, 0),
      notiz: f.notiz, schritte: f.schritte, team: b.eintraege.length > 1,
      erfasser: [...new Set(b.eintraege.map(e => e.erfasser).filter(Boolean))],
    }
  })
}

// ─── Nachweis (Zeitnachweis + Arbeitsschritte + Foto-Anlage) ─────────────────
// stunden: Zeilen von `stunden` (alle Status) der Baustelle · schritte: projekt_schritte-Zeilen ·
// fotos: projekt_fotos-Zeilen · profile: { userId: {name, role} }
export function baueNachweis({ baustelle = {}, stunden = [], schritte = [], fotos = [], profile = {}, optionen = {} }) {
  const o = { von: '', bis: '', pause: 'brutto', namen: 'voll', funktionen: {}, mitFotos: true, maxFotos: PROJEKT_MAX_FOTOS_ANLAGE, erfasserBekannt: true, ...optionen }
  const imRahmen = s => (!o.von || s.datum >= o.von) && (!o.bis || s.datum <= o.bis)
  const basis = (stunden || []).filter(s => imRahmen(s) && !istAbwesenheit(s))
  const freigegeben = basis.filter(s => s.freigabe_status === 'freigegeben')
    .sort((a, b) => a.datum.localeCompare(b.datum) || String(a.start_zeit).localeCompare(String(b.start_zeit)) || String(a.user_id).localeCompare(String(b.user_id)))

  const fotosJeSchritt = new Map()
  ;(fotos || []).forEach(f => { const l = fotosJeSchritt.get(f.schritt_id) || []; l.push(f); fotosJeSchritt.set(f.schritt_id, l) })
  const schritteJeStunde = schritteJeStundeMap(schritte)

  let fotoNr = 0
  const fotoListe = []
  const schrittCache = new Map() // Schritt-ID → fertiger Schritt (Foto-Nummern nur einmal vergeben, auch bei Team-Einträgen)
  const eintraege = freigegeben.map(s => {
    const p = profile[s.user_id] || {}
    const brutto = eintragBrutto(s); const netto = eintragNetto(s)
    const min = o.pause === 'brutto' ? brutto : netto
    const person = anzeigeName(p.name || (s.profiles && s.profiles.name), o.namen)
    const funktion = (o.funktionen && o.funktionen[s.user_id]) || funktionLabel(p.role)
    // Wer hat den Eintrag angelegt? (erfasst_von = Kollege/Chef hat ihn eingetragen, sonst die Person selbst)
    const ep = profile[s.erfasst_von || s.user_id] || {}
    const erfasser = !o.erfasserBekannt ? '' : (ep.name ? anzeigeName(ep.name, o.namen) : (s.erfasst_von ? '' : person))
    const liste = (schritteJeStunde.get(String(s.id)) || []).slice().sort((a, b) => (a.nr || 0) - (b.nr || 0))
    const schrittOut = liste.map(sc => {
      if (schrittCache.has(sc.id)) return schrittCache.get(sc.id)
      const fl = (fotosJeSchritt.get(sc.id) || []).slice().sort((a, b) => (a.art === b.art ? (a.sort || 0) - (b.sort || 0) : (a.art === 'vorher' ? -1 : 1)))
      const fotoRefs = fl.map(f => {
        fotoNr += 1
        const ref = { nr: `F${fotoNr}`, id: f.id, path: f.storage_path, thumb: f.thumb_path || f.storage_path, art: f.art, datum: s.datum, person, text: sc.beschreibung }
        fotoListe.push(ref)
        return ref.nr
      })
      const out = { id: sc.id, nr: sc.nr, taetigkeit: sc.taetigkeit, text: sc.beschreibung, bereich: sc.bereich || '', min: sc.dauer_min, fotos: fotoRefs, keinFotoGrund: sc.kein_foto_grund || '' }
      schrittCache.set(sc.id, out)
      return out
    })
    const schrittMin = schrittOut.reduce((a, x) => a + (x.min || 0), 0)
    return {
      id: s.id, userId: s.user_id, datum: s.datum, person, funktion, erfasser,
      von: hhmm(s.start_zeit), bis: hhmm(s.end_zeit), pause: Number(s.pause_min) || 0,
      brutto, netto, min, notiz: s.notiz || '', schritte: schrittOut, schrittMin,
      schrittKey: liste.length ? liste.map(x => x.id).join('|') : '',
      abweichung: liste.length ? brutto - schrittMin : null,
    }
  })

  // Wochenblöcke
  const kwMap = new Map()
  eintraege.forEach(e => {
    const montag = montagVonDatum(e.datum)
    const kw = kwMap.get(montag) || { montag, sonntag: addTage(montag, 6), kw: isoKalenderwoche(montag), jahr: isoJahr(montag), tage: new Map(), min: 0 }
    const tag = kw.tage.get(e.datum) || { datum: e.datum, wt: wochentagKurz(e.datum), eintraege: [], min: 0 }
    tag.eintraege.push(e); tag.min += e.min; kw.min += e.min
    kw.tage.set(e.datum, tag); kwMap.set(montag, kw)
  })
  const kwListe = [...kwMap.values()].sort((a, b) => a.montag.localeCompare(b.montag)).map(k => ({ ...k, tage: [...k.tage.values()].sort((a, b) => a.datum.localeCompare(b.datum)).map(t => ({ ...t, bloecke: baueBloecke(t.eintraege) })) }))

  // Summen
  const personenMap = new Map(); const funkMap = new Map()
  eintraege.forEach(e => {
    const pe = personenMap.get(e.userId) || { userId: e.userId, name: e.person, funktion: e.funktion, min: 0, tage: new Set() }
    pe.min += e.min; pe.tage.add(e.datum); personenMap.set(e.userId, pe)
    const fe = funkMap.get(e.funktion) || { funktion: e.funktion, min: 0, personen: new Set() }
    fe.min += e.min; fe.personen.add(e.userId); funkMap.set(e.funktion, fe)
  })
  const personen = [...personenMap.values()].map(p => ({ userId: p.userId, name: p.name, funktion: p.funktion, min: p.min, tage: p.tage.size })).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const funktionen = [...funkMap.values()].map(f => ({ funktion: f.funktion, min: f.min, personen: f.personen.size })).sort((a, b) => a.funktion.localeCompare(b.funktion, 'de'))
  const summeMin = eintraege.reduce((a, e) => a + e.min, 0)
  const schrittAnzahl = new Set(eintraege.flatMap(e => e.schritte.map(x => x.id))).size
  const abgebildet = o.mitFotos ? fotoListe.slice(0, o.maxFotos) : []

  return {
    version: 1,
    kopf: {
      baustelle: baustelle.name || '', kunde: baustelle.kunde || '', adresse: baustelle.adresse || '',
      auftragsnr: baustelle.auftragsnr || '', phase: baustelle.projekt_phase || '',
      von: o.von, bis: o.bis,
    },
    optionen: { pause: o.pause, namen: o.namen, mitFotos: !!o.mitFotos, funktionen: o.funktionen || {} },
    kw: kwListe, personen, funktionen,
    summe: { min: summeMin, eintraege: eintraege.length, tage: new Set(eintraege.map(e => e.datum)).size, schritte: schrittAnzahl, fotos: fotoListe.length, fotosAbgebildet: abgebildet.length },
    fotos: abgebildet,
  }
}

// Alle Einträge (Wochenblöcke aufgeklappt) – praktisch für CSV und Prüfliste.
export function nachweisEintraege(nw) { const out = []; (nw.kw || []).forEach(k => k.tage.forEach(t => t.eintraege.forEach(e => out.push({ ...e, kw: k.kw, jahr: k.jahr })))); return out }

// Vor-dem-Export-Prüfliste. stunden = alle Einträge der Baustelle im Zeitraum (alle Status).
export function pruefliste({ baustelle = {}, stunden = [], schritte = [], fotos = [], von = '', bis = '', profile = {} }) {
  const out = []
  const basis = (stunden || []).filter(s => (!von || s.datum >= von) && (!bis || s.datum <= bis) && !istAbwesenheit(s))
  const frei = basis.filter(s => s.freigabe_status === 'freigegeben')
  const offen = basis.filter(s => s.freigabe_status === 'ausstehend')
  const name = s => anzeigeName((profile[s.user_id] || {}).name || (s.profiles && s.profiles.name), 'voll')
  const zeile = s => `${fmtDatum(s.datum)} · ${name(s)} · ${hhmm(s.start_zeit)}–${hhmm(s.end_zeit)}`
  if (frei.length === 0) out.push({ stufe: 'fehler', text: 'Im Zeitraum gibt es keine freigegebenen Stunden.', details: [] })
  if (offen.length) out.push({ stufe: 'warnung', text: `${offen.length} Eintrag/Einträge noch nicht freigegeben – sie sind im Nachweis NICHT enthalten.`, details: offen.map(zeile) })
  const sJe = schritteJeStundeMap(schritte)
  const fJe = new Map(); (fotos || []).forEach(f => { fJe.set(f.schritt_id, (fJe.get(f.schritt_id) || 0) + 1) })
  if (baustelle.doku_pflicht) {
    const ohne = frei.filter(s => !(sJe.get(String(s.id)) || []).length)
    if (ohne.length) out.push({ stufe: 'warnung', text: `${ohne.length} freigegebene Eintrag/Einträge ohne Arbeitsschritte.`, details: ohne.map(zeile) })
    const abw = frei.filter(s => { const l = sJe.get(String(s.id)) || []; if (!l.length) return false; return Math.abs(eintragBrutto(s) - l.reduce((a, x) => a + (x.dauer_min || 0), 0)) > PROJEKT_TOLERANZ_MIN })
    if (abw.length) out.push({ stufe: 'warnung', text: `${abw.length} Eintrag/Einträge: Summe der Schritte weicht um mehr als ${PROJEKT_TOLERANZ_MIN} Min von der Arbeitszeit ab.`, details: abw.map(zeile) })
    const freiIds = new Set(frei.map(s => String(s.id)))
    const alleSchritte = (schritte || []).filter(s => stundenIdsDesSchritts(s).some(id => freiIds.has(id)))
    const ohneFoto = alleSchritte.filter(s => !fJe.get(s.id) && !s.kein_foto_grund)
    if (ohneFoto.length) out.push({ stufe: 'warnung', text: `${ohneFoto.length} Arbeitsschritt(e) ohne Foto und ohne Begründung.`, details: ohneFoto.map(s => s.beschreibung) })
    const begr = alleSchritte.filter(s => !fJe.get(s.id) && s.kein_foto_grund)
    if (begr.length) out.push({ stufe: 'info', text: `${begr.length} Arbeitsschritt(e) bewusst ohne Foto (im Nachweis markiert).`, details: begr.map(s => `${s.beschreibung} – ${s.kein_foto_grund}`) })
  }
  if (!String(baustelle.auftragsnr || '').trim()) out.push({ stufe: 'warnung', text: 'Keine Bestell-/Auftragsnummer des Kunden hinterlegt (für die Rechnung meist nötig).', details: [] })
  return out
}

// Laufende Nummer LN-JJJJ-nnn
export function naechsteNachweisNr(jahr, vorhandene = []) {
  const re = new RegExp(`^LN-${jahr}-(\\d+)$`)
  const max = vorhandene.reduce((a, nr) => { const m = re.exec(String(nr)); return m ? Math.max(a, Number(m[1])) : a }, 0)
  return `LN-${jahr}-${String(max + 1).padStart(3, '0')}`
}

// ─── CSV (Excel-deutsch: ; · UTF-8-BOM · Dezimalkomma · Formel-Schutz) ───────
function csvRoh(s) { return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
export function csvText(v) {
  let s = v == null ? '' : String(v).replace(/\r?\n/g, ' ')
  if (/^[=+\-@\t]/.test(s)) s = "'" + s
  return csvRoh(s)
}
export function csvZahl(n, stellen = 2) { return n == null || n === '' || isNaN(Number(n)) ? '' : Number(n).toFixed(stellen).replace('.', ',') }
export function csvBauen(zeilen) { return '﻿' + zeilen.map(z => z.join(';')).join('\r\n') + '\r\n' }

export function csvZeiten(nw) {
  const kopf = ['KW', 'Datum', 'Wochentag', 'Mitarbeiter', 'Funktion', 'Von', 'Bis', 'Pause (Min)', 'Brutto (Std)', 'Netto (Std)', 'Abgerechnet (Std)', 'Tätigkeit', 'Erfasst von']
  const z = [kopf.map(csvText)]
  nachweisEintraege(nw).forEach(e => z.push([
    csvText(`${e.kw}/${e.jahr}`), csvText(fmtDatum(e.datum)), csvText(wochentagKurz(e.datum)), csvText(e.person), csvText(e.funktion),
    csvText(e.von), csvText(e.bis), csvZahl(e.pause, 0), csvZahl(e.brutto / 60), csvZahl(e.netto / 60), csvZahl(e.min / 60),
    csvText(e.schritte.length ? e.schritte.map(s => s.text).join(' | ') : e.notiz), csvText(e.erfasser || ''),
  ]))
  z.push([csvText('Summe'), '', '', '', '', '', '', '', '', '', csvZahl(nw.summe.min / 60), '', ''])
  return csvBauen(z)
}
export function csvSchritte(nw) {
  const kopf = ['KW', 'Datum', 'Mitarbeiter', 'Nr.', 'Tätigkeit', 'Bereich', 'Beschreibung', 'Dauer (Min)', 'Dauer (Std)', 'Fotos', 'Hinweis']
  const z = [kopf.map(csvText)]
  nachweisEintraege(nw).forEach(e => e.schritte.forEach(s => z.push([
    csvText(`${e.kw}/${e.jahr}`), csvText(fmtDatum(e.datum)), csvText(e.person), csvZahl(s.nr, 0), csvText(s.taetigkeit), csvText(s.bereich), csvText(s.text),
    csvZahl(s.min, 0), csvZahl(s.min / 60), csvText(s.fotos.join(', ')), csvText(s.keinFotoGrund ? `Kein Foto: ${s.keinFotoGrund}` : ''),
  ])))
  return csvBauen(z)
}
export function dateiname(nw, art, endung = 'csv') {
  const b = String(nw.kopf.baustelle || 'Baustelle').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'Baustelle'
  return `${b}_${art}_${nw.kopf.von || 'start'}_${nw.kopf.bis || 'heute'}.${endung}`
}

// ─── Team-Erfassung (Admin legt Stunden für mehrere Mitarbeiter an) ──────────
// Stunden (Dezimal) genau wie in der Stundenerfassung: Ende − Start, auf 2 Stellen.
export function dauerStunden(start, end) { const m = zeitMin(end) - zeitMin(start); return m > 0 ? parseFloat((m / 60).toFixed(2)) : 0 }
// Überschneidungen mit vorhandenen Einträgen (je Person); vorhandene: [{user_id,start_zeit,end_zeit,...}]
export function ueberschneidungen(start, end, vorhandene) {
  const a = zeitMin(start); const b = zeitMin(end)
  return (vorhandene || []).filter(e => !(b <= zeitMin(e.start_zeit) || a >= zeitMin(e.end_zeit)))
}
// Prüfung der Eingaben aus Schritt „Team“ + „Zeit“ (Texte für die Oberfläche).
export function pruefeTeamZeit({ mitglieder, datum, start, end, pause }) {
  const fehler = []
  if (!mitglieder || mitglieder.length === 0) fehler.push('Bitte mindestens eine Person auswählen.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ''))) fehler.push('Bitte ein Datum wählen.')
  const brutto = zeitMin(end) - zeitMin(start)
  if (!start || !end || brutto <= 0) fehler.push('Die Endzeit muss nach der Startzeit liegen.')
  const p = Number(pause)
  if (!(p >= 0) || (brutto > 0 && p >= brutto)) fehler.push('Die Pause passt nicht zur Arbeitszeit.')
  return { ok: fehler.length === 0, fehler, brutto: Math.max(0, brutto), netto: Math.max(0, brutto - (p >= 0 ? p : 0)) }
}
// Wer darf ins Team? Interne Rollen; Partnerfirmen (extern) nicht.
// nurMonteure = true: Auswahl für einen Monteur (Chef, Monteure, Azubis – kein Büro); sonst alle internen Personen
export function teamKandidaten(users, { nurMonteure = false } = {}) {
  const rollen = nurMonteure ? ['admin', 'mitarbeiter', 'azubi'] : ['admin', 'buero', 'mitarbeiter', 'azubi']
  return (users || []).filter(u => rollen.includes(u.role)).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'))
}
export function teamNamen(users, ids) {
  const m = new Map((users || []).map(u => [String(u.id), u.name || '—']))
  return (ids || []).map(id => m.get(String(id))).filter(Boolean)
}
export function teamMerken(userId, ids) { try { localStorage.setItem(`ep_projekt_team_${userId}`, JSON.stringify((ids || []).map(String))) } catch (e) { /* egal */ } }
export function teamErinnern(userId) { try { const l = JSON.parse(localStorage.getItem(`ep_projekt_team_${userId}`) || '[]'); return Array.isArray(l) ? l.map(String) : [] } catch (e) { return [] } }

// ─── Gastzugang ──────────────────────────────────────────────────────────────
export function gastLinkUrl(origin, token) { return `${String(origin || '').replace(/\/$/, '')}/nachweise?t=${token}` }
export function gastTokenGueltig(t) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(t || '')) }
// Alle Bilddateien (Original + Vorschau), die ein gespeicherter Nachweis zeigt – nur diese darf der Gast sehen.
export function fotoPfadeAusNachweis(nw) {
  const set = new Set()
  ;((nw && nw.fotos) || []).forEach(f => { if (f.path) set.add(f.path); if (f.thumb) set.add(f.thumb) })
  return [...set]
}

// ─── Pfade, IDs, Entwürfe (Browser) ──────────────────────────────────────────
export function uuid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch (e) { /* fallthrough */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16) })
}
export function fotoPfade(baustelleId, userId, fotoId) {
  return { full: `${baustelleId}/${userId}/${fotoId}.jpg`, thumb: `${baustelleId}/${userId}/${fotoId}_t.jpg` }
}
export function istTabelleFehlt(error) {
  if (!error) return false
  const t = `${error.code || ''} ${error.message || ''}`
  return /PGRST20[0-9]|42P01|does not exist|schema cache|Could not find/i.test(t)
}

const ENTWURF_MAX_ALTER = 14 * TAG_MS
export function entwurfKey(userId, baustelleId) { return `ep_doku_entwurf_v1_${userId}_${baustelleId}` }
export function entwurfLaden(key) {
  try {
    const r = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (!r) return null
    const d = JSON.parse(r)
    if (!d || d.v !== 1 || !Array.isArray(d.schritte)) return null
    if (Date.now() - (d.ts || 0) > ENTWURF_MAX_ALTER) { localStorage.removeItem(key); return null }
    return d
  } catch (e) { return null }
}
export function entwurfSpeichern(key, daten) { try { localStorage.setItem(key, JSON.stringify({ v: 1, ts: Date.now(), ...daten })) } catch (e) { /* voll/privat: egal */ } }
export function entwurfLoeschen(key) { try { localStorage.removeItem(key) } catch (e) { /* egal */ } }
export function bereicheLokal(baustelleId) { try { const l = JSON.parse(localStorage.getItem(`ep_projekt_bereiche_${baustelleId}`) || '[]'); return Array.isArray(l) ? l : [] } catch (e) { return [] } }
export function bereichMerken(baustelleId, bereich) {
  const b = normBereich(bereich); if (!b) return
  try { const l = bereicheLokal(baustelleId).filter(x => x.toLowerCase() !== b.toLowerCase()); l.unshift(b); localStorage.setItem(`ep_projekt_bereiche_${baustelleId}`, JSON.stringify(l.slice(0, 12))) } catch (e) { /* egal */ }
}

// ─── Bilder verkleinern (Browser): 1600 px / JPEG 0,72 + Vorschau 640 px ─────
async function ladeBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch (e) { /* Fallback */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Bild nicht lesbar')); i.src = url })
    return img
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000) }
}
function zeichne(bmp, maxPx, q) {
  const w0 = bmp.width || bmp.naturalWidth; const h0 = bmp.height || bmp.naturalHeight
  const f = Math.min(1, maxPx / Math.max(w0, h0))
  const w = Math.max(1, Math.round(w0 * f)); const h = Math.max(1, Math.round(h0 * f))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h)
  return new Promise((res, rej) => c.toBlob(b => (b ? res({ blob: b, w, h }) : rej(new Error('Bild konnte nicht verkleinert werden'))), 'image/jpeg', q))
}
export async function verkleinereBild(file, maxPx = 1600, qualitaet = 0.72, thumbPx = 640) {
  const bmp = await ladeBitmap(file)
  try {
    const full = await zeichne(bmp, maxPx, qualitaet)
    const thumb = await zeichne(bmp, thumbPx, 0.7)
    return { blob: full.blob, thumb: thumb.blob, width: full.w, height: full.h }
  } finally { if (bmp && typeof bmp.close === 'function') bmp.close() }
}
