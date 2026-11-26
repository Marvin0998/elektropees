// Lager: Barcode scannen → Menge → Entnahme/Einlagerung. Bestand = Summe aller Buchungen.
// Buchen dürfen alle internen Rollen; Artikelstamm und Barcodes pflegen nur Chef und Büro.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import * as L from '../lib/lager'
import * as D from '../lib/lagerdaten'
import LagerScanner from '../components/LagerScanner'
import { speichereDatei } from '../components/NachweisBlatt'

const lsGet = k => { try { return window.localStorage.getItem(k) } catch (e) { return null } }
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v) } catch (e) { /* ohne Speicher weiter */ } }

export default function Lager() {
  const [auth, setAuth] = useState({ lade: true, ok: false, grund: '', user: null, rolle: '' })
  const [daten, setDaten] = useState({ artikel: [], codes: [], bestaende: [], fehlt: false, fehler: '' })
  const [stamm, setStamm] = useState({ profile: [], baustellen: [] })
  const [tab, setTab] = useState('scan')
  const [art, setArt] = useState('entnahme')
  const [sheet, setSheet] = useState(null)        // {typ:'buchen'|'unbekannt'|'neu'|'artikel'|'zuordnen', ...}
  const [zuordnen, setZuordnen] = useState(null)  // Artikel, dem der nächste gescannte Code zugeordnet wird
  const [toast, setToast] = useState(null)        // {text, fehler?, rueckgaengig?:buchungId}
  const [manuell, setManuell] = useState('')
  const [suche, setSuche] = useState('')
  const [filter, setFilter] = useState('alle')
  const [archiv, setArchiv] = useState(false)
  const [verlauf, setVerlauf] = useState({ data: [], fehler: '', geladen: false })
  const toastTimer = useRef(null)
  const datenRef = useRef(daten); datenRef.current = daten
  const zuordnenRef = useRef(zuordnen); zuordnenRef.current = zuordnen

  const verwalten = ['admin', 'buero', 'lager'].includes(auth.rolle) // Artikel anlegen, Codes zuordnen, bearbeiten (Inventur/Löschen bleibt Leitung)
  const istAdmin = auth.rolle === 'admin'

  const zeigeToast = useCallback((t, ms = 7000) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), ms) }, [])
  const neuLaden = useCallback(async () => { const d = await D.ladeLager(); setDaten(d); return d }, [])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setAuth({ lade: false, ok: false, grund: 'Bitte zuerst in der App anmelden.' }); return }
      const { data: profil } = await supabase.from('profiles').select('id,name,role').eq('id', session.user.id).single()
      if (!profil || !['admin', 'buero', 'mitarbeiter', 'azubi', 'lager'].includes(profil.role)) { setAuth({ lade: false, ok: false, grund: 'Das Lager ist nur für das Team von Elektro Pees.' }); return }
      setAuth({ lade: false, ok: true, user: session.user, rolle: profil.role, name: profil.name })
      const sv = lsGet('lager_art'); if (sv === 'einlagerung' || sv === 'entnahme') setArt(sv)
      D.ladeStammdaten().then(setStamm)
      neuLaden()
    })()
    return () => clearTimeout(toastTimer.current)
  }, [neuLaden])

  useEffect(() => { lsSet('lager_art', art) }, [art])

  // Bildschirm anlassen, solange das Lager offen ist (Handscanner-Betrieb). Geht nicht überall – dann hilft „Automatische Sperre: Nie“.
  const [wach, setWach] = useState(false)
  const [abmeldenFrage, setAbmeldenFrage] = useState(false)
  useEffect(() => {
    if (!auth.ok) return
    let sperre = null; let weg = false
    const an = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const s = await navigator.wakeLock.request('screen')
        if (weg) { s.release().catch(() => {}); return }
        sperre = s; setWach(true)
        s.addEventListener('release', () => { if (sperre === s) { sperre = null; setWach(false) } })
      } catch (e) { setWach(false) }
    }
    const sichtbar = () => { if (document.visibilityState === 'visible' && !sperre) an() }
    an(); document.addEventListener('visibilitychange', sichtbar)
    return () => { weg = true; document.removeEventListener('visibilitychange', sichtbar); if (sperre) sperre.release().catch(() => {}) }
  }, [auth.ok])
  const abmelden = async () => { try { await supabase.auth.signOut() } catch (e) { /* weiter */ } window.location.href = '/' }
  useEffect(() => {
    if (tab !== 'verlauf' || !auth.ok) return
    D.ladeVerlauf().then(r => setVerlauf({ ...r, geladen: true }))
  }, [tab, auth.ok, daten.bestaende])

  const liste = useMemo(() => L.baueBestandsliste({ artikel: daten.artikel, bestaende: daten.bestaende, codes: daten.codes, suche, filter, nurAktiv: !archiv }), [daten, suche, filter, archiv])
  const alleMitBestand = useMemo(() => L.baueBestandsliste({ artikel: daten.artikel, bestaende: daten.bestaende, codes: daten.codes, nurAktiv: false }).concat(L.baueBestandsliste({ artikel: daten.artikel, bestaende: daten.bestaende, codes: daten.codes, nurAktiv: true })), [daten])
  const mitBestand = id => alleMitBestand.find(a => a.id === id)

  // Ein Code wurde gescannt (Kamera, Eingabefeld oder Handscanner)
  const beiCode = useCallback(async code => {
    const c = L.normalisiereCode(code)
    if (!c) return
    const d = datenRef.current
    const a = L.findeArtikelPerCode(c, d.codes, d.artikel)
    const ziel = zuordnenRef.current
    if (ziel) {
      if (a) { zeigeToast({ fehler: true, text: `Dieser Code gehört schon zu „${a.name}“.` }); return }
      const r = await D.ordneCodeZu(ziel.id, c)
      if (r.fehler) { zeigeToast({ fehler: true, text: r.fehler }); return }
      setZuordnen(null); await neuLaden(); zeigeToast({ text: `✓ Code ${c} → „${ziel.name}“ zugeordnet` }); return
    }
    if (!a) { setSheet({ typ: 'unbekannt', code: c }); return }
    setSheet({ typ: 'buchen', id: a.id })
  }, [neuLaden, zeigeToast])

  if (auth.lade) return <div className="loading">Wird geladen …</div>
  if (!auth.ok) return (
    <div className="lg-seite"><div className="lg-panel"><h1>📦 Lager</h1><p>{auth.grund}</p><a className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href="/">Zur Anmeldung</a></div></div>
  )

  return (
    <div className="lg-seite">
      <Head><title>Lager · Elektro Pees</title></Head>
      <div className="lg-kopf">
        {auth.rolle === 'lager'
          ? <button className="exp-zurueck" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => { if (abmeldenFrage) abmelden(); else { setAbmeldenFrage(true); setTimeout(() => setAbmeldenFrage(false), 4000) } }}>{abmeldenFrage ? 'Wirklich abmelden? Nochmal tippen' : 'Abmelden'}</button>
          : <a className="exp-zurueck" href="/">‹ Zurück zur App</a>}
        <h1>📦 Lager{wach && <span className="lg-wach" title="Bildschirm bleibt an"> ☀</span>}</h1>
      </div>

      {daten.fehlt && <div className="lg-panel lg-warn">Das Lager ist noch nicht eingerichtet. Bitte die Datei <b>sql/2026-11-lager.sql</b> im Supabase-SQL-Editor ausführen.</div>}
      {daten.fehler && <div className="lg-panel lg-warn">{daten.fehler}</div>}

      <div className="lg-tabs" role="tablist">
        {[['scan', '📷 Scannen'], ['bestand', '📋 Bestand'], ['verlauf', '🕘 Verlauf']].map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'aktiv' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="lg-panel">
          <div className="lg-art" role="group" aria-label="Buchungsart">
            <button className={`lg-art-btn ${art === 'entnahme' ? 'aktiv aus' : ''}`} onClick={() => setArt('entnahme')}>⬆ Entnahme</button>
            <button className={`lg-art-btn ${art === 'einlagerung' ? 'aktiv ein' : ''}`} onClick={() => setArt('einlagerung')}>⬇ Einlagerung</button>
          </div>
          {zuordnen && <div className="lg-zuordnen">Barcode für <b>{zuordnen.name}</b> scannen … <button className="proj-link" onClick={() => setZuordnen(null)}>abbrechen</button></div>}
          <LagerScanner onCode={beiCode} pausiert={!!sheet} />
          <form className="lg-manuell" onSubmit={e => { e.preventDefault(); const c = manuell; setManuell(''); beiCode(c) }}>
            <input value={manuell} onChange={e => setManuell(e.target.value)} placeholder="Code eintippen oder Handscanner" inputMode="text" autoCapitalize="off" autoCorrect="off" aria-label="Barcode eintippen" />
            <button className="btn btn-secondary btn-sm" type="submit" disabled={!L.normalisiereCode(manuell)}>OK</button>
          </form>
          <div className="lg-hinweis">Code vor die Kamera halten – das Buchungsfenster öffnet sich automatisch. Ohne Scan schaltet sich die Kamera nach 45 Sekunden selbst aus (spart Akku).</div>
        </div>
      )}

      {tab === 'bestand' && (
        <div className="lg-panel">
          <input className="lg-suche" value={suche} onChange={e => setSuche(e.target.value)} placeholder="Suchen: Name, Nummer, Lagerort, Code" aria-label="Artikel suchen" />
          <div className="lg-chips">
            {[['alle', 'Alle'], ['knapp', 'Knapp / leer'], ['leer', 'Leer']].map(([k, t]) => <button key={k} className={`proj-chip ${filter === k ? 'aktiv' : ''}`} onClick={() => setFilter(k)}>{t}</button>)}
            {verwalten && <button className={`proj-chip ${archiv ? 'aktiv' : ''}`} onClick={() => setArchiv(a => !a)}>Archiv</button>}
          </div>
          {verwalten && <div className="lg-aktionen">
            <button className="btn btn-primary btn-sm" onClick={() => setSheet({ typ: 'neu', code: '' })}>＋ Neuer Artikel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => speichereDatei(L.csvBestand(L.baueBestandsliste({ artikel: daten.artikel, bestaende: daten.bestaende, codes: daten.codes, filter, suche })), L.dateinameBestand(), 'text/csv;charset=utf-8')}>⬇ CSV</button>
          </div>}
          {liste.length === 0 && <div className="lg-leer">{daten.artikel.length === 0 ? (verwalten ? 'Noch keine Artikel. Scanne einen Barcode oder lege oben einen Artikel an.' : 'Noch keine Artikel angelegt.') : 'Nichts gefunden.'}</div>}
          <ul className="lg-liste">
            {liste.map(a => (
              <li key={a.id}>
                <button className="lg-zeile" onClick={() => setSheet({ typ: 'artikel', id: a.id })}>
                  <span className="lg-zeile-text"><b>{a.name}</b><small>{[a.lagerort, a.artikelnr].filter(Boolean).join(' · ') || ' '}</small></span>
                  <span className={`lg-bestand ${a.status}`}>{L.fmtMenge(a.bestand, a.einheit)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'verlauf' && (
        <div className="lg-panel">
          {verlauf.fehler && <div className="lg-leer">{verlauf.fehler}</div>}
          {verlauf.geladen && !verlauf.fehler && verlauf.data.length === 0 && <div className="lg-leer">Noch keine Buchungen.</div>}
          <ul className="lg-liste">
            {verlauf.data.map(b => {
              const a = daten.artikel.find(x => x.id === b.artikel_id)
              const u = stamm.profile.find(p => p.id === b.user_id)
              const bs = stamm.baustellen.find(x => String(x.id) === String(b.baustelle_id))
              return (
                <li key={b.id} className="lg-vzeile">
                  <span className={`lg-menge ${b.menge < 0 ? 'minus' : 'plus'}`}>{L.fmtMitVorzeichen(b.menge, a && a.einheit)}</span>
                  <span className="lg-zeile-text"><b>{a ? a.name : 'Gelöschter Artikel'}</b><small>{L.BUCHUNGSARTEN[b.art]} · {u ? u.name : '—'} · {L.fmtZeit(b.created_at)}{bs ? ` · ${bs.name}` : ''}</small></span>
                  {L.kannRueckgaengig(b, auth.user.id, istAdmin) && <button className="btn btn-secondary btn-sm" onClick={async () => { const r = await D.storniereBuchung(b.id); if (r.fehler) zeigeToast({ fehler: true, text: r.fehler }); else { await neuLaden(); zeigeToast({ text: '↩ Buchung rückgängig gemacht' }) } }}>↩</button>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {sheet && sheet.typ === 'buchen' && mitBestand(sheet.id) && (
        <BuchenSheet key={sheet.id} artikel={mitBestand(sheet.id)} art={art} setArt={setArt} baustellen={stamm.baustellen} verwalten={verwalten}
          onClose={() => setSheet(null)}
          onGebucht={async (buchung, text) => { setSheet(null); await neuLaden(); zeigeToast({ text, rueckgaengig: buchung.id }) }} />
      )}
      {sheet && sheet.typ === 'unbekannt' && (
        <UnbekanntSheet code={sheet.code} verwalten={verwalten} onClose={() => setSheet(null)}
          onNeu={() => setSheet({ typ: 'neu', code: sheet.code })} onZuordnen={() => setSheet({ typ: 'zuordnen', code: sheet.code })} />
      )}
      {sheet && sheet.typ === 'zuordnen' && (
        <ZuordnenSheet code={sheet.code} liste={L.baueBestandsliste({ artikel: daten.artikel, bestaende: daten.bestaende, codes: daten.codes })} onClose={() => setSheet(null)}
          onWahl={async a => { const r = await D.ordneCodeZu(a.id, sheet.code); if (r.fehler) { zeigeToast({ fehler: true, text: r.fehler }); return } await neuLaden(); setSheet({ typ: 'buchen', id: a.id }) }} />
      )}
      {sheet && sheet.typ === 'neu' && (
        <ArtikelFormSheet code={sheet.code} onClose={() => setSheet(null)}
          onFertig={async a => { await neuLaden(); setArt('einlagerung'); setSheet({ typ: 'buchen', id: a.id }); zeigeToast({ text: `✓ „${a.name}“ angelegt – jetzt die erste Menge einlagern` }) }} />
      )}
      {sheet && sheet.typ === 'artikel' && mitBestand(sheet.id) && (
        <ArtikelSheet key={sheet.id} artikel={mitBestand(sheet.id)} verwalten={verwalten} stamm={stamm} onClose={() => setSheet(null)}
          onBuchen={a => { setSheet({ typ: 'buchen', id: a.id }) }}
          onGeaendert={async () => { await neuLaden() }}
          onCodeScannen={a => { setZuordnen(a); setTab('scan'); setSheet(null) }} zeigeToast={zeigeToast} />
      )}

      {toast && (
        <div className={`lg-toast ${toast.fehler ? 'fehler' : ''}`} role="status">
          <span>{toast.text}</span>
          {toast.rueckgaengig && <button onClick={async () => { const r = await D.storniereBuchung(toast.rueckgaengig); if (r.fehler) zeigeToast({ fehler: true, text: r.fehler }); else { await neuLaden(); zeigeToast({ text: '↩ Rückgängig gemacht' }) } }}>Rückgängig</button>}
        </div>
      )}
    </div>
  )
}

function Sheet({ titel, onClose, children }) {
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" role="dialog" aria-label={titel}>
        <div className="modal-handle" />
        <div className="modal-title">{titel}</div>
        {children}
      </div>
    </div>
  )
}

function BuchenSheet({ artikel, art, setArt, baustellen, onClose, onGebucht }) {
  const [mengeText, setMengeText] = useState('')
  const [bsId, setBsId] = useState(() => lsGet('lager_bs') || '')
  const [notiz, setNotiz] = useState('')
  const [warnung, setWarnung] = useState('')
  const [fehler, setFehler] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const aktiveBs = baustellen.filter(b => b.status === 'aktiv')
  const schritt = 1
  const aendern = d => { const n = L.parseMenge(mengeText); const neu = Math.max(0, (Number.isFinite(n) ? n : 0) + d); setMengeText(neu ? String(neu).replace('.', ',') : ''); setWarnung(''); setFehler('') }

  async function buchen() {
    const p = L.pruefeBuchung({ art, mengeText, artikel, bestand: artikel.bestand })
    if (!p.ok) { setFehler(p.fehler); return }
    if (p.warnung && !warnung) { setWarnung(p.warnung); return }
    setLaeuft(true); setFehler('')
    const bs = art === 'entnahme' ? bsId : ''
    const r = await D.bucheMenge({ artikel_id: artikel.id, menge: p.menge, art, baustelle_id: bs || null, notiz })
    setLaeuft(false)
    if (r.fehler) { setFehler(r.fehler); return }
    if (art === 'entnahme') lsSet('lager_bs', bsId)
    const neuerBestand = Math.round((artikel.bestand + p.menge) * 1000) / 1000
    const bsName = bs ? (baustellen.find(b => String(b.id) === String(bs)) || {}).name : ''
    onGebucht(r.buchung, `✓ ${L.fmtMenge(Math.abs(p.menge), artikel.einheit)} ${art === 'entnahme' ? 'entnommen' : 'eingelagert'}${bsName ? ` (${bsName})` : ''} – Bestand jetzt ${L.fmtMenge(neuerBestand, artikel.einheit)}`)
  }

  return (
    <Sheet titel={artikel.name} onClose={onClose}>
      <div className="lg-info">
        <span>Bestand: <b className={`lg-bestand ${artikel.status}`}>{L.fmtMenge(artikel.bestand, artikel.einheit)}</b></span>
        {artikel.lagerort && <span>📍 {artikel.lagerort}</span>}
      </div>
      {artikel.aktiv === false && <div className="lg-warn-klein">Dieser Artikel ist archiviert.</div>}
      <div className="lg-art" role="group" aria-label="Buchungsart">
        <button className={`lg-art-btn ${art === 'entnahme' ? 'aktiv aus' : ''}`} onClick={() => { setArt('entnahme'); setWarnung('') }}>⬆ Entnahme</button>
        <button className={`lg-art-btn ${art === 'einlagerung' ? 'aktiv ein' : ''}`} onClick={() => { setArt('einlagerung'); setWarnung('') }}>⬇ Einlagerung</button>
      </div>
      <div className="form-group">
        <label>Menge ({artikel.einheit})</label>
        <div className="lg-stepper">
          <button onClick={() => aendern(-schritt)} aria-label="Eins weniger">−</button>
          <input value={mengeText} onChange={e => { setMengeText(e.target.value); setWarnung(''); setFehler('') }} inputMode="decimal" placeholder="0" aria-label="Menge" autoFocus />
          <button onClick={() => aendern(schritt)} aria-label="Eins mehr">＋</button>
        </div>
        <div className="lg-chips">{(L.SCHNELLWAHL[artikel.einheit] || L.SCHNELLWAHL.Stk).map(n => <button key={n} className="proj-chip" onClick={() => { setMengeText(String(n)); setWarnung(''); setFehler('') }}>{n}</button>)}</div>
      </div>
      {art === 'entnahme' && (
        <div className="form-group">
          <label>Für welche Baustelle? (optional)</label>
          <select value={bsId} onChange={e => setBsId(e.target.value)} aria-label="Baustelle">
            <option value="">– keine / Lager intern –</option>
            {aktiveBs.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div className="form-group"><label>Notiz (optional)</label><input value={notiz} onChange={e => setNotiz(e.target.value)} placeholder="z. B. Lieferschein-Nr." /></div>
      {fehler && <div className="lg-fehler">{fehler}</div>}
      {warnung && <div className="lg-warn-klein">{warnung}</div>}
      <button className={`btn ${art === 'entnahme' ? 'btn-primary' : 'btn-success'}`} onClick={buchen} disabled={laeuft}>
        {laeuft ? 'Wird gebucht …' : warnung ? 'Ja, trotzdem entnehmen' : art === 'entnahme' ? 'Entnahme buchen' : 'Einlagerung buchen'}
      </button>
      <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onClose}>Abbrechen</button>
    </Sheet>
  )
}

function UnbekanntSheet({ code, verwalten, onClose, onNeu, onZuordnen }) {
  return (
    <Sheet titel="Unbekannter Barcode" onClose={onClose}>
      <p className="lg-code">{code}</p>
      {verwalten ? (
        <>
          <p className="exp-sub">Dieser Code ist noch keinem Artikel zugeordnet.</p>
          <button className="btn btn-primary" onClick={onNeu}>＋ Neuen Artikel anlegen</button>
          <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onZuordnen}>Zu vorhandenem Artikel zuordnen</button>
        </>
      ) : <p className="exp-sub">Dieser Artikel ist noch nicht im Lager angelegt. Bitte kurz im Büro Bescheid geben – der Code steht oben.</p>}
      <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onClose}>Schließen</button>
    </Sheet>
  )
}

function ZuordnenSheet({ code, liste, onClose, onWahl }) {
  const [q, setQ] = useState('')
  const treffer = liste.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()) || (a.artikelnr || '').toLowerCase().includes(q.toLowerCase())).slice(0, 40)
  return (
    <Sheet titel={`Code ${code} zuordnen`} onClose={onClose}>
      <input className="lg-suche" value={q} onChange={e => setQ(e.target.value)} placeholder="Artikel suchen" autoFocus aria-label="Artikel suchen" />
      <ul className="lg-liste" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {treffer.map(a => <li key={a.id}><button className="lg-zeile" onClick={() => onWahl(a)}><span className="lg-zeile-text"><b>{a.name}</b><small>{a.artikelnr || ' '}</small></span><span className="lg-bestand ok">{L.fmtMenge(a.bestand, a.einheit)}</span></button></li>)}
        {treffer.length === 0 && <li className="lg-leer">Kein Artikel gefunden.</li>}
      </ul>
      <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onClose}>Abbrechen</button>
    </Sheet>
  )
}

function ArtikelFormSheet({ code, artikel, onClose, onFertig }) {
  const [f, setF] = useState(() => ({ name: artikel ? artikel.name : '', artikelnr: artikel ? artikel.artikelnr || '' : '', einheit: artikel ? artikel.einheit : 'Stk', mindestbestand: artikel ? String(artikel.mindestbestand || '') : '', lagerort: artikel ? artikel.lagerort || '' : '', notiz: artikel ? artikel.notiz || '' : '', code: code || '' }))
  const [fehler, setFehler] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setFehler('') }
  async function speichern() {
    if (!f.name.trim()) { setFehler('Bitte einen Namen eingeben.'); return }
    if (f.mindestbestand && !(L.parseMenge(f.mindestbestand) >= 0)) { setFehler('Mindestbestand: bitte eine Zahl eingeben.'); return }
    setLaeuft(true)
    const r = artikel ? await D.aktualisiereArtikel(artikel.id, f) : await D.legeArtikelAn(f)
    setLaeuft(false)
    if (r.fehler) { setFehler(r.fehler); return }
    onFertig(r.artikel)
  }
  return (
    <Sheet titel={artikel ? 'Artikel bearbeiten' : 'Neuer Artikel'} onClose={onClose}>
      {!artikel && <div className="form-group"><label>Barcode</label><input value={f.code} onChange={e => set('code', e.target.value)} placeholder="wird beim Scannen eingetragen" aria-label="Barcode" /></div>}
      <div className="form-group"><label>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} placeholder="z. B. NYM-J 3x1,5 mm² 50 m" autoFocus aria-label="Name" /></div>
      <div className="form-group"><label>Einheit</label>
        <div className="lg-chips">{L.EINHEITEN.map(e => <button key={e} className={`proj-chip ${f.einheit === e ? 'aktiv' : ''}`} onClick={() => set('einheit', e)}>{L.EINHEIT_NAMEN[e]}</button>)}</div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Mindestbestand</label><input value={f.mindestbestand} onChange={e => set('mindestbestand', e.target.value)} inputMode="decimal" placeholder="0" aria-label="Mindestbestand" /></div>
        <div className="form-group"><label>Lagerort</label><input value={f.lagerort} onChange={e => set('lagerort', e.target.value)} placeholder="z. B. Regal 3" aria-label="Lagerort" /></div>
      </div>
      <div className="form-group"><label>Artikelnummer (Großhandel, optional)</label><input value={f.artikelnr} onChange={e => set('artikelnr', e.target.value)} aria-label="Artikelnummer" /></div>
      <div className="form-group"><label>Notiz (optional)</label><input value={f.notiz} onChange={e => set('notiz', e.target.value)} /></div>
      {fehler && <div className="lg-fehler">{fehler}</div>}
      <button className="btn btn-primary" onClick={speichern} disabled={laeuft}>{laeuft ? 'Wird gespeichert …' : artikel ? 'Speichern' : 'Artikel anlegen'}</button>
      <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onClose}>Abbrechen</button>
    </Sheet>
  )
}

function ArtikelSheet({ artikel, verwalten, stamm, onClose, onBuchen, onGeaendert, onCodeScannen, zeigeToast }) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [verlauf, setVerlauf] = useState([])
  const [neuerCode, setNeuerCode] = useState('')
  useEffect(() => { D.ladeVerlauf({ artikelId: artikel.id, limit: 15 }).then(r => setVerlauf(r.data)) }, [artikel.id, artikel.bestand])
  if (bearbeiten) return <ArtikelFormSheet artikel={artikel} onClose={() => setBearbeiten(false)} onFertig={async () => { await onGeaendert(); setBearbeiten(false) }} />
  return (
    <Sheet titel={artikel.name} onClose={onClose}>
      <div className="lg-info">
        <span>Bestand: <b className={`lg-bestand ${artikel.status}`}>{L.fmtMenge(artikel.bestand, artikel.einheit)}</b></span>
        {artikel.mindestbestand > 0 && <span>Mindestbestand: {L.fmtMenge(artikel.mindestbestand, artikel.einheit)}</span>}
      </div>
      <div className="lg-status">{L.STATUS_TEXT[artikel.status]}</div>
      {[['📍 Lagerort', artikel.lagerort], ['Artikelnr.', artikel.artikelnr], ['Notiz', artikel.notiz]].filter(x => x[1]).map(([k, v]) => <div key={k} className="lg-feld"><span>{k}</span><span>{v}</span></div>)}
      <div className="lg-feld"><span>Barcodes</span><span className="lg-codes">{artikel.codes.length === 0 ? '—' : artikel.codes.map(c => (
        <span key={c} className="lg-codechip">{c}{verwalten && <button aria-label={`Code ${c} entfernen`} onClick={async () => { const r = await D.entferneCode(c); if (r.fehler) zeigeToast({ fehler: true, text: r.fehler }); else onGeaendert() }}>✕</button>}</span>
      ))}</span></div>
      {verwalten && (
        <div className="lg-manuell" style={{ marginTop: '0.5rem' }}>
          <input value={neuerCode} onChange={e => setNeuerCode(e.target.value)} placeholder="Weiteren Code eintippen" aria-label="Weiteren Code eintippen" />
          <button className="btn btn-secondary btn-sm" disabled={!L.normalisiereCode(neuerCode)} onClick={async () => { const r = await D.ordneCodeZu(artikel.id, neuerCode); if (r.fehler) zeigeToast({ fehler: true, text: r.fehler }); else { setNeuerCode(''); onGeaendert() } }}>＋</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onCodeScannen(artikel)}>📷</button>
        </div>
      )}
      <div className="lg-aktionen" style={{ marginTop: '0.75rem' }}>
        <button className="btn btn-primary btn-sm" onClick={() => onBuchen(artikel)}>⬆⬇ Buchen</button>
        {verwalten && <button className="btn btn-secondary btn-sm" onClick={() => setBearbeiten(true)}>✏️ Bearbeiten</button>}
        {verwalten && <button className="btn btn-secondary btn-sm" onClick={async () => { const r = await D.aktualisiereArtikel(artikel.id, { aktiv: artikel.aktiv === false }); if (r.fehler) zeigeToast({ fehler: true, text: r.fehler }); else { await onGeaendert(); onClose() } }}>{artikel.aktiv === false ? 'Reaktivieren' : 'Archivieren'}</button>}
      </div>
      <div className="lg-verlauf-titel">Letzte Buchungen</div>
      <ul className="lg-liste">
        {verlauf.length === 0 && <li className="lg-leer">Noch keine Buchungen.</li>}
        {verlauf.map(b => { const u = stamm.profile.find(p => p.id === b.user_id); const bs = stamm.baustellen.find(x => String(x.id) === String(b.baustelle_id)); return (
          <li key={b.id} className="lg-vzeile"><span className={`lg-menge ${b.menge < 0 ? 'minus' : 'plus'}`}>{L.fmtMitVorzeichen(b.menge, artikel.einheit)}</span><span className="lg-zeile-text"><small>{L.BUCHUNGSARTEN[b.art]} · {u ? u.name : '—'} · {L.fmtZeit(b.created_at)}{bs ? ` · ${bs.name}` : ''}</small></span></li>
        ) })}
      </ul>
      <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={onClose}>Schließen</button>
    </Sheet>
  )
}
