// Lager – Datenzugriff (Supabase). Bestand kommt aus der Sicht lager_bestand (Summe aller Buchungen).
import { supabase } from './supabase'
import * as L from './lager'

const FEHLT = e => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(String(e.message || '')))

export async function ladeLager() {
  const [a, c, b] = await Promise.all([
    supabase.from('lager_artikel').select('*').order('name').limit(5000),
    supabase.from('lager_codes').select('code,artikel_id').limit(20000),
    supabase.from('lager_bestand').select('artikel_id,bestand,letzte_buchung').limit(5000),
  ])
  const err = a.error || c.error || b.error
  if (err) return { fehlt: FEHLT(err), fehler: FEHLT(err) ? '' : L.fehlerText(err), artikel: [], codes: [], bestaende: [] }
  return { fehlt: false, fehler: '', artikel: a.data || [], codes: c.data || [], bestaende: b.data || [] }
}

export async function ladeStammdaten() {
  const [p, bs] = await Promise.all([
    supabase.from('profiles').select('id,name').limit(500),
    supabase.from('baustellen').select('id,name,status').order('created_at', { ascending: false }).limit(1000),
  ])
  return { profile: p.data || [], baustellen: (bs.data || []).filter(b => b.name !== 'Büro') }
}

export async function ladeVerlauf({ artikelId = null, limit = 120 } = {}) {
  let q = supabase.from('lager_buchungen').select('id,artikel_id,menge,art,baustelle_id,user_id,notiz,created_at').order('created_at', { ascending: false }).limit(limit)
  if (artikelId) q = q.eq('artikel_id', artikelId)
  const r = await q
  return { data: r.data || [], fehler: r.error ? L.fehlerText(r.error) : '' }
}

// Artikel + ersten Barcode in einem Schritt anlegen; schlägt der Code fehl (z. B. schon vergeben), wird der Artikel wieder entfernt.
export async function legeArtikelAn({ name, artikelnr, einheit, mindestbestand, lagerort, notiz, code }) {
  const r = await supabase.from('lager_artikel').insert({
    name: String(name).trim(), artikelnr: (artikelnr || '').trim() || null, einheit: einheit || 'Stk',
    mindestbestand: L.parseMenge(mindestbestand || 0) || 0, lagerort: (lagerort || '').trim() || null, notiz: (notiz || '').trim() || null,
  }).select('*').single()
  if (r.error) return { fehler: L.fehlerText(r.error) }
  const c = L.normalisiereCode(code)
  if (c) {
    const rc = await supabase.from('lager_codes').insert({ code: c, artikel_id: r.data.id })
    if (rc.error) { await supabase.from('lager_artikel').delete().eq('id', r.data.id); return { fehler: L.fehlerText(rc.error) } }
  }
  return { artikel: r.data }
}

export async function aktualisiereArtikel(id, f) {
  const felder = {}
  if ('name' in f) felder.name = String(f.name).trim()
  if ('artikelnr' in f) felder.artikelnr = (f.artikelnr || '').trim() || null
  if ('einheit' in f) felder.einheit = f.einheit
  if ('mindestbestand' in f) felder.mindestbestand = L.parseMenge(f.mindestbestand || 0) || 0
  if ('lagerort' in f) felder.lagerort = (f.lagerort || '').trim() || null
  if ('notiz' in f) felder.notiz = (f.notiz || '').trim() || null
  if ('aktiv' in f) felder.aktiv = !!f.aktiv
  const r = await supabase.from('lager_artikel').update(felder).eq('id', id).select('*').single()
  return r.error ? { fehler: L.fehlerText(r.error) } : { artikel: r.data }
}

export async function ordneCodeZu(artikelId, code) {
  const c = L.normalisiereCode(code)
  if (!c) return { fehler: 'Kein Barcode angegeben.' }
  const r = await supabase.from('lager_codes').insert({ code: c, artikel_id: artikelId })
  return r.error ? { fehler: L.fehlerText(r.error) } : {}
}
export async function entferneCode(code) {
  const r = await supabase.from('lager_codes').delete().eq('code', code)
  return r.error ? { fehler: L.fehlerText(r.error) } : {}
}

// menge ist bereits vorzeichenbehaftet (Entnahme negativ)
export async function bucheMenge({ artikel_id, menge, art, baustelle_id = null, notiz = null }) {
  const r = await supabase.from('lager_buchungen').insert({ artikel_id, menge, art, baustelle_id: baustelle_id || null, notiz: (notiz || '').trim() || null })
    .select('id,artikel_id,menge,art,baustelle_id,user_id,notiz,created_at').single()
  return r.error ? { fehler: L.fehlerText(r.error) } : { buchung: r.data }
}

export async function storniereBuchung(id) {
  const r = await supabase.from('lager_buchungen').delete().eq('id', id).select('id')
  if (r.error) return { fehler: L.fehlerText(r.error) }
  if (!r.data || r.data.length === 0) return { fehler: 'Rückgängig nicht mehr möglich (nur eigene Buchungen innerhalb von 10 Minuten).' }
  return {}
}
