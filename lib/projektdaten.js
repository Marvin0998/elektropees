// Projekt-Modul: alles, was mit Supabase spricht (Laden, Speichern, Foto-Upload).
// Die Datenbank wird als Parameter `db` übergeben (Standard: der App-Client) – so ist die
// Speicher-Reihenfolge ohne echte Datenbank testbar.
import { supabase } from './supabase'
import * as P from './projekt'

export const BUCKET = 'projekt-fotos'

// ─── Signierte Foto-Links (1 Std. gültig, im Speicher zwischengemerkt) ────────
const urlCache = new Map()
export async function signierteUrls(paths, db = supabase) {
  const jetzt = Date.now()
  const gewollt = [...new Set((paths || []).filter(Boolean))]
  const fehlend = gewollt.filter(p => { const c = urlCache.get(p); return !(c && c.exp > jetzt + 60000) })
  for (let i = 0; i < fehlend.length; i += 100) {
    const teil = fehlend.slice(i, i + 100)
    try {
      const { data } = await db.storage.from(BUCKET).createSignedUrls(teil, 3600)
      ;(data || []).forEach(d => { if (d && d.signedUrl && d.path) urlCache.set(d.path, { url: d.signedUrl, exp: jetzt + 3600 * 1000 }) })
    } catch (e) { /* Foto bleibt ohne Link – die Oberfläche zeigt dann einen Platzhalter */ }
  }
  const out = {}
  gewollt.forEach(p => { const c = urlCache.get(p); if (c) out[p] = c.url })
  return out
}

// ─── Seitenweise laden (Supabase liefert pro Abfrage nur begrenzt viele Zeilen) ──
// bauFrage(von, bis) muss .select(..., {count:'exact'}) und .range(von, bis) enthalten.
export async function ladeAlle(bauFrage, seite = 1000) {
  const alle = []; let total = null; let von = 0
  for (let i = 0; i < 200; i++) {
    const { data, error, count } = await bauFrage(von, von + seite - 1)
    if (error) return { data: null, error, total }
    if (total === null && count != null) total = count
    if (!data || data.length === 0) break
    alle.push(...data); von += data.length
    if (total !== null ? von >= total : data.length < seite) break
  }
  if (total !== null && alle.length !== total) return { data: null, error: { message: `Unvollständig geladen (${alle.length} von ${total} Zeilen). Bitte nochmal versuchen.` }, total }
  return { data: alle, error: null, total }
}

const STUNDEN_FELDER = 'id,user_id,baustelle_id,datum,start_zeit,end_zeit,pause_min,dauer,notiz,freigabe_status'
const SCHRITT_FELDER = 'id,stunden_id,nr,taetigkeit,beschreibung,dauer_min,bereich,phase,kein_foto_grund,created_at,weitere_stunden_ids'
const FOTO_FELDER = 'id,schritt_id,storage_path,thumb_path,art,sort,aufgenommen_am'

// Alle Daten einer Baustelle für den Export: Stunden, Profile, Schritte, Fotos.
// Der Zeitnachweis funktioniert auch ohne Projekt-Tabellen (dokuFehlt = true).
export async function ladeExportDaten({ baustelleId, von, bis }, db = supabase) {
  const stundenQ = felder => (a, b) => {
    let q = db.from('stunden').select(felder, { count: 'exact' }).eq('baustelle_id', baustelleId)
    if (von) q = q.gte('datum', von)
    if (bis) q = q.lte('datum', bis)
    return q.order('datum', { ascending: true }).order('id', { ascending: true }).range(a, b)
  }
  let st = await ladeAlle(stundenQ(`${STUNDEN_FELDER},erfasst_von`))
  let erfasserBekannt = true
  // Spalte erfasst_von fehlt (SQL „2026-11-projekt-modul“ noch nicht erneut ausgeführt) → ohne sie laden, der Export geht trotzdem
  if (st.error && /erfasst_von/.test(String(st.error.message || ''))) { st = await ladeAlle(stundenQ(STUNDEN_FELDER)); erfasserBekannt = false }
  if (st.error) return { error: st.error }
  const { data: prof } = await db.from('profiles').select('id,name,role')
  const profile = {}; (prof || []).forEach(p => { profile[p.id] = { name: p.name, role: p.role } })

  const schrittQ = (a, b) => {
    let q = db.from('projekt_schritte').select(`${SCHRITT_FELDER}, stunden!inner(baustelle_id,datum), projekt_fotos(${FOTO_FELDER})`, { count: 'exact' }).eq('stunden.baustelle_id', baustelleId)
    if (von) q = q.gte('stunden.datum', von)
    if (bis) q = q.lte('stunden.datum', bis)
    return q.order('id', { ascending: true }).range(a, b)
  }
  const sc = await ladeAlle(schrittQ)
  let schritte = []; let fotos = []; let dokuFehlt = false; let dokuFehler = null
  if (sc.error) {
    if (P.istTabelleFehlt(sc.error)) dokuFehlt = true
    else dokuFehler = sc.error
  } else {
    schritte = sc.data.map(r => { const { projekt_fotos, stunden, ...rest } = r; return rest })
    sc.data.forEach(r => (r.projekt_fotos || []).forEach(f => fotos.push(f)))
  }
  return { stunden: st.data, profile, schritte, fotos, dokuFehlt, dokuFehler, erfasserBekannt }
}

// Für die Projektseite: Schritte (mit Fotos) einer Baustelle, neueste zuerst.
export async function ladeProjektSchritte(baustelleId, db = supabase) {
  const q = (a, b) => db.from('projekt_schritte')
    .select(`${SCHRITT_FELDER}, projekt_fotos(${FOTO_FELDER}), stunden!inner(id,user_id,datum,start_zeit,end_zeit,pause_min,dauer,freigabe_status,baustelle_id)`, { count: 'exact' })
    .eq('stunden.baustelle_id', baustelleId).order('id', { ascending: true }).range(a, b)
  const r = await ladeAlle(q)
  if (r.error) return { error: r.error, fehlt: P.istTabelleFehlt(r.error), schritte: [] }
  const schritte = r.data.map(x => ({ ...x, fotos: (x.projekt_fotos || []).slice().sort((a, b) => (a.art === b.art ? (a.sort || 0) - (b.sort || 0) : (a.art === 'vorher' ? -1 : 1))), eintrag: x.stunden }))
  schritte.sort((a, b) => (b.eintrag.datum.localeCompare(a.eintrag.datum)) || String(b.eintrag.start_zeit).localeCompare(String(a.eintrag.start_zeit)) || (a.nr || 0) - (b.nr || 0))
  return { schritte, fehlt: false, error: null }
}

// Nachweis-Archiv
export async function ladeNachweise(baustelleId, db = supabase) {
  const { data, error } = await db.from('projekt_exporte').select('id,nr,von,bis,summe_min,anzahl_eintraege,anzahl_fotos,created_at,erstellt_von').eq('baustelle_id', baustelleId).order('created_at', { ascending: false }).limit(100)
  return { data: data || [], error, fehlt: P.istTabelleFehlt(error) }
}
export async function speichereNachweis({ baustelleId, nw, userId }, db = supabase) {
  const { data: vorhanden } = await db.from('projekt_exporte').select('nr').like('nr', `LN-${new Date().getFullYear()}-%`)
  let jahr = new Date().getFullYear()
  let nrs = (vorhanden || []).map(x => x.nr)
  for (let versuch = 0; versuch < 4; versuch++) {
    const nr = P.naechsteNachweisNr(jahr, nrs)
    const { data, error } = await db.from('projekt_exporte').insert([{
      baustelle_id: baustelleId, nr, von: nw.kopf.von, bis: nw.kopf.bis,
      summe_min: nw.summe.min, anzahl_eintraege: nw.summe.eintraege, anzahl_fotos: nw.summe.fotos,
      optionen: nw.optionen, snapshot: nw, erstellt_von: userId, foto_pfade: P.fotoPfadeAusNachweis(nw),
    }]).select('id,nr').single()
    if (!error) return { ok: true, id: data.id, nr: data.nr }
    if (/duplicate|unique|23505/i.test(`${error.code} ${error.message}`)) { nrs = [...nrs, nr]; continue }
    return { ok: false, fehler: error.message, tabelleFehlt: P.istTabelleFehlt(error) }
  }
  return { ok: false, fehler: 'Keine freie Nachweis-Nummer gefunden.' }
}
export async function ladeNachweis(id, db = supabase) {
  const { data, error } = await db.from('projekt_exporte').select('*').eq('id', id).single()
  return { data, error }
}

// ─── Fotos: verkleinern + hochladen ──────────────────────────────────────────
function warte(ms) { return new Promise(r => setTimeout(r, ms)) }
export async function bereiteFotoVor(file) {
  if (!file || !/^image\//.test(file.type || 'image/jpeg')) throw new Error('Das ist kein Foto.')
  return P.verkleinereBild(file)
}
export async function ladeFotoHoch({ blob, thumb, id, baustelleId, userId }, db = supabase) {
  const pf = P.fotoPfade(baustelleId, userId, id)
  const opt = { contentType: 'image/jpeg', cacheControl: '3600' }
  const hoch = async (pfad, b) => {
    let r = await db.storage.from(BUCKET).upload(pfad, b, { ...opt, upsert: false })
    if (r.error) { await warte(700); r = await db.storage.from(BUCKET).upload(pfad, b, { ...opt, upsert: true }) }
    return r
  }
  const r1 = await hoch(pf.full, blob)
  if (r1.error) return { ok: false, fehler: r1.error.message }
  const r2 = await hoch(pf.thumb, thumb)
  if (r2.error) return { ok: false, fehler: r2.error.message }
  return { ok: true, path: pf.full, thumbPath: pf.thumb, bytes: blob.size }
}
export async function loescheFotoDateien(fotos, db = supabase) {
  const pfade = []
  ;(fotos || []).forEach(f => { const p = f.path || f.storage_path; const t = f.thumbPath || f.thumb_path; if (p) pfade.push(p); if (t) pfade.push(t) })
  if (!pfade.length) return
  try { await db.storage.from(BUCKET).remove(pfade) } catch (e) { /* Aufräumen ist best effort */ }
}

// ─── Speichern: Stundeneintrag + Schritte + Fotos ────────────────────────────
// Reihenfolge: Eintrag → Schritte → Foto-Zeilen. Scheitert ein späterer Schritt, wird der
// Eintrag wieder gelöscht (cascade räumt Schritte/Fotos-Zeilen), damit nie ein „halber“
// Eintrag stehen bleibt. Die hochgeladenen Bilddateien bleiben für den nächsten Versuch.
function fotoZeilenAus(schritte, zeilen) {
  const out = []
  schritte.forEach((s, i) => (s.fotos || []).filter(f => f.status === 'ok').forEach((f, j) => out.push({
    id: f.id, schritt_id: zeilen[i].id, storage_path: f.path, thumb_path: f.thumbPath || null, art: f.art || 'nachher',
    bytes: f.bytes || null, sort: j, aufgenommen_am: f.aufgenommen || new Date().toISOString(),
  })))
  return out
}
export async function speichereDoku(db, { userId, baustelleId, datum, start, end, dauer, pause, notizExtra, schritte, phase }) {
  const notiz = P.notizAusSchritten(schritte) + (notizExtra && notizExtra.trim() ? ' | ' + notizExtra.trim() : '')
  const ins = await db.from('stunden').insert([{ user_id: userId, baustelle_id: baustelleId, datum, start_zeit: start, end_zeit: end, pause_min: pause, dauer, notiz, freigabe_status: 'ausstehend' }]).select('id').single()
  if (ins.error || !ins.data) return { ok: false, stufe: 'stunden', fehler: (ins.error && ins.error.message) || 'Der Eintrag konnte nicht gespeichert werden.' }
  const stundenId = ins.data.id
  const rueckgaengig = () => db.from('stunden').delete().eq('id', stundenId)
  const zeilen = P.schritteZeilen(schritte, stundenId, phase)
  const r2 = await db.from('projekt_schritte').insert(zeilen)
  if (r2.error) { await rueckgaengig(); return { ok: false, stufe: 'schritte', fehler: r2.error.message, tabelleFehlt: P.istTabelleFehlt(r2.error) } }
  const fotoZeilen = fotoZeilenAus(schritte, zeilen)
  if (fotoZeilen.length) {
    const r3 = await db.from('projekt_fotos').insert(fotoZeilen)
    if (r3.error) { await rueckgaengig(); return { ok: false, stufe: 'fotos', fehler: r3.error.message } }
  }
  return { ok: true, stundenId }
}

// Eintrag für mehrere Personen (Chef oder Monteur): je Person eine Stundenzeile (gleiche Zeiten), die Schritte + Fotos hängen EINMAL an der
// Zeile der ersten Person; weitere_stunden_ids verweist auf die Zeilen der übrigen. Alles-oder-nichts:
// die Stundenzeilen entstehen in einer einzigen Anweisung, scheitert danach etwas, werden sie alle wieder gelöscht.
export async function speichereTeamDoku(db, { mitglieder, baustelleId, datum, start, end, dauer, pause, notizExtra, schritte, phase, status = 'freigegeben', erfasserId = null }) {
  const ids = [...new Set((mitglieder || []).map(String))]
  if (ids.length === 0) return { ok: false, stufe: 'team', fehler: 'Keine Person ausgewählt.' }
  const notiz = P.notizAusSchritten(schritte) + (notizExtra && notizExtra.trim() ? ' | ' + notizExtra.trim() : '')
  // erfasst_von nur setzen, wenn jemand ANDERES den Eintrag anlegt (eigene Zeile bleibt wie immer ohne diese Angabe)
  const zeilenStunden = ids.map(uid => ({ user_id: uid, baustelle_id: baustelleId, datum, start_zeit: start, end_zeit: end, pause_min: pause, dauer, notiz, freigabe_status: status,
    ...(erfasserId && String(uid) !== String(erfasserId) ? { erfasst_von: erfasserId } : {}) }))
  const ins = await db.from('stunden').insert(zeilenStunden).select('id,user_id')
  if (ins.error || !ins.data || ins.data.length === 0) return { ok: false, stufe: 'stunden', fehler: (ins.error && ins.error.message) || 'Die Stunden konnten nicht gespeichert werden.' }
  const stundenIds = ins.data.map(r => r.id)
  const rueckgaengig = () => db.from('stunden').delete().in('id', stundenIds)
  if (ins.data.length !== ids.length) { await rueckgaengig(); return { ok: false, stufe: 'stunden', fehler: 'Es wurden nicht alle Stundenzeilen angelegt – nichts gespeichert.' } }
  const traeger = ins.data.find(r => String(r.user_id) === ids[0]) || ins.data[0]
  const weitere = ins.data.filter(r => r !== traeger).map(r => String(r.id))
  const zeilen = P.schritteZeilen(schritte, traeger.id, phase).map(z => ({ ...z, weitere_stunden_ids: weitere }))
  const r2 = await db.from('projekt_schritte').insert(zeilen)
  if (r2.error) { await rueckgaengig(); return { ok: false, stufe: 'schritte', fehler: r2.error.message, tabelleFehlt: P.istTabelleFehlt(r2.error) } }
  const fotoZeilen = fotoZeilenAus(schritte, zeilen)
  if (fotoZeilen.length) {
    const r3 = await db.from('projekt_fotos').insert(fotoZeilen)
    if (r3.error) { await rueckgaengig(); return { ok: false, stufe: 'fotos', fehler: r3.error.message } }
  }
  return { ok: true, stundenIds, traegerId: traeger.id }
}

// Abgleich für Monteure: welche der Personen haben an dem Tag schon Stunden, die sich mit von–bis überschneiden?
// (Datenbank-Funktion liefert nur die Personen – keine Uhrzeiten/Notizen anderer.)
export async function ladeKonflikteRpc(db, { userIds, datum, start, end }) {
  const { data, error } = await db.rpc('projekt_stunden_konflikte', { p_user_ids: (userIds || []).map(String), p_datum: datum, p_start: start, p_end: end })
  if (error) return { data: [], error }
  return { data: (data || []).map(r => String(typeof r === 'string' ? r : r.user_id)), error: null }
}

// Vorhandene Einträge der gewählten Personen an einem Tag (für die Überschneidungs-Warnung).
export async function ladeTagesEintraege(db, { userIds, datum }) {
  if (!userIds || !userIds.length || !datum) return { data: [], error: null }
  const { data, error } = await db.from('stunden').select('id,user_id,start_zeit,end_zeit,notiz,baustelle_id').in('user_id', userIds).eq('datum', datum)
  return { data: data || [], error }
}

// Einen bestehenden Schritt ändern (nur eigene, noch nicht freigegebene Einträge bzw. Leitung).
// schritt: UI-Objekt mit dbId; entfernteFotos: Foto-Zeilen, die gelöscht werden sollen.
export async function aktualisiereSchritt(db, { schritt, stundenId, phase, entfernteFotos = [] }) {
  const z = P.schritteZeilen([schritt], stundenId, phase)[0]
  const { id, stunden_id, nr, phase: _phase, ...felder } = z
  const u = await db.from('projekt_schritte').update(felder).eq('id', schritt.dbId)
  if (u.error) return { ok: false, fehler: u.error.message }
  const neu = (schritt.fotos || []).filter(f => f.status === 'ok' && f.neu)
  if (neu.length) {
    const r = await db.from('projekt_fotos').insert(neu.map((f, j) => ({ id: f.id, schritt_id: schritt.dbId, storage_path: f.path, thumb_path: f.thumbPath || null, art: f.art || 'nachher', bytes: f.bytes || null, sort: 100 + j, aufgenommen_am: f.aufgenommen || new Date().toISOString() })))
    if (r.error) return { ok: false, fehler: r.error.message }
  }
  if (entfernteFotos.length) {
    const d = await db.from('projekt_fotos').delete().in('id', entfernteFotos.map(f => f.id))
    if (d.error) return { ok: false, fehler: d.error.message }
    await loescheFotoDateien(entfernteFotos, db)
  }
  return { ok: true }
}
export async function loescheSchritt(db, schritt) {
  const d = await db.from('projekt_schritte').delete().eq('id', schritt.id)
  if (d.error) return { ok: false, fehler: d.error.message }
  await loescheFotoDateien(schritt.fotos || [], db)
  return { ok: true }
}
// Notiz des Stundeneintrags nach einer Schritt-Änderung nachziehen (Zusatz-Notiz bleibt erhalten).
export async function notizNachziehen(db, { stundenId, notizAlt, schritteAlt, schritteNeu }) {
  const neu = P.notizNachBearbeitung(notizAlt, schritteAlt, schritteNeu)
  if (neu == null) return
  await db.from('stunden').update({ notiz: neu }).eq('id', stundenId)
}

// Beim Löschen eines Stundeneintrags: Foto-Dateien mit entfernen (Zeilen gehen per cascade).
export async function fotoPfadeEinesEintrags(stundenId, db = supabase) {
  try {
    const { data, error } = await db.from('projekt_schritte').select('projekt_fotos(storage_path,thumb_path)').eq('stunden_id', stundenId)
    if (error || !data) return []
    const out = []; data.forEach(s => (s.projekt_fotos || []).forEach(f => out.push({ storage_path: f.storage_path, thumb_path: f.thumb_path })))
    return out
  } catch (e) { return [] }
}

// ─── Gastzugang ──────────────────────────────────────────────────────────────
// Verwaltung (nur Admin, per Anmeldung)
export async function ladeGastlinks(baustelleId, db = supabase) {
  const { data, error } = await db.from('projekt_gastlinks').select('*').eq('baustelle_id', baustelleId).order('created_at', { ascending: false })
  return { data: data || [], error, fehlt: P.istTabelleFehlt(error) }
}
export async function erstelleGastlink({ baustelleId, label, gueltigBis }, db = supabase) {
  const { data, error } = await db.from('projekt_gastlinks').insert([{ baustelle_id: baustelleId, label: String(label || '').trim(), gueltig_bis: gueltigBis || null }]).select('*').single()
  return { data, error }
}
export async function aendereGastlink(id, patch, db = supabase) { return db.from('projekt_gastlinks').update(patch).eq('id', id) }
export async function loescheGastlink(id, db = supabase) { return db.from('projekt_gastlinks').delete().eq('id', id) }
// Abruf durch den Gast (ohne Anmeldung): db = eigener Client ohne Sitzung. null = Link ungültig/gesperrt/abgelaufen.
export async function ladeGastListe(token, db) {
  const { data, error } = await db.rpc('projekt_gast_liste', { p_token: token })
  return { data: data || null, error }
}
export async function ladeGastNachweis(token, id, db) {
  const { data, error } = await db.rpc('projekt_gast_nachweis', { p_token: token, p_id: id })
  return { data: data || null, error }
}
