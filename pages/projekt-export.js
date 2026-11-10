// Export für die Rechnungsstellung: Zeitnachweis + Arbeitsschritte + Foto-Anlage (nur admin/buero).
// Eigene Seite statt Popup: Druck/PDF über den Browser, CSV für Excel, eingefrorene Nachweise im Archiv.
import { useState, useEffect, useMemo, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import * as P from '../lib/projekt'
import * as D from '../lib/projektdaten'
import { NachweisBlatt, warteAufBilder, speichereDatei, heuteStr } from '../components/NachweisBlatt'

const FUNKTIONEN = ['Meister / Leitung', 'Geselle', 'Monteur', 'Helfer', 'Auszubildende/r', 'Büro']

export default function ProjektExport() {
  const router = useRouter()
  const [auth, setAuth] = useState({ lade: true, ok: false, user: null, grund: '' })
  const [baustellen, setBaustellen] = useState([])
  const [bsId, setBsId] = useState('')
  const [von, setVon] = useState(''); const [bis, setBis] = useState(heuteStr())
  const [opt, setOpt] = useState({ pause: 'brutto', namen: 'voll', mitFotos: true, funktionen: {} })
  const [daten, setDaten] = useState(null)
  const [lade, setLade] = useState(false)
  const [fehler, setFehler] = useState('')
  const [archiv, setArchiv] = useState({ liste: [], fehlt: false })
  const [gesicht, setGesicht] = useState(null)      // geöffneter gespeicherter Nachweis {nr, created_at, nw}
  const [fotoUrls, setFotoUrls] = useState({})
  const [meldung, setMeldung] = useState('')
  const [speichere, setSpeichere] = useState(false)
  const gestartet = useRef(false)

  // ── Zugang: nur angemeldete admin/buero ───────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setAuth({ lade: false, ok: false, grund: 'Bitte zuerst in der App anmelden.' }); return }
      const { data: profil } = await supabase.from('profiles').select('id,name,role').eq('id', session.user.id).single()
      if (!profil || !['admin', 'buero'].includes(profil.role)) { setAuth({ lade: false, ok: false, grund: 'Dieser Export ist nur für Chef und Büro.' }); return }
      const { data: bs } = await supabase.from('baustellen').select('*').order('created_at', { ascending: false }).limit(1000)
      const liste = (bs || []).filter(b => b.name !== 'Büro')
      liste.sort((a, b) => (b.doku_pflicht === true) - (a.doku_pflicht === true) || (a.status === 'aktiv' ? 0 : 1) - (b.status === 'aktiv' ? 0 : 1))
      setBaustellen(liste)
      setAuth({ lade: false, ok: true, user: { ...session.user, profil } })
    })()
  }, [])

  useEffect(() => {
    if (!auth.ok || !router.isReady || gestartet.current) return
    const b = router.query.b
    if (b && baustellen.some(x => String(x.id) === String(b))) setBsId(String(b))
    else if (baustellen.length) setBsId(String(baustellen[0].id))
    gestartet.current = true
  }, [auth.ok, router.isReady, router.query.b, baustellen])

  const bs = baustellen.find(b => String(b.id) === String(bsId)) || null
  useEffect(() => {
    setDaten(null); setGesicht(null); setFehler(''); setMeldung('')
    if (!bs) return
    setOpt(o => ({ ...o, mitFotos: bs.doku_pflicht === true, funktionen: {} }))
    D.ladeNachweise(bs.id).then(r => setArchiv({ liste: r.data, fehlt: r.fehlt }))
  }, [bsId]) // eslint-disable-line react-hooks/exhaustive-deps

  function zeitraum(art) {
    const n = new Date(); const y = n.getFullYear(); const m = n.getMonth()
    const iso = (yy, mm, dd) => `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    if (art === 'alles') { setVon(''); setBis(heuteStr()) }
    if (art === 'monat') { setVon(iso(y, m, 1)); setBis(iso(y, m, new Date(y, m + 1, 0).getDate())) }
    if (art === 'vormonat') { const d = new Date(y, m - 1, 1); setVon(iso(d.getFullYear(), d.getMonth(), 1)); setBis(iso(d.getFullYear(), d.getMonth(), new Date(y, m, 0).getDate())) }
  }

  async function erstellen() {
    if (!bs) return
    setLade(true); setFehler(''); setGesicht(null); setMeldung('')
    const r = await D.ladeExportDaten({ baustelleId: bs.id, von, bis })
    setLade(false)
    if (r.error) { setFehler(r.error.message || 'Daten konnten nicht geladen werden.'); return }
    if (r.dokuFehler) { setFehler('Arbeitsschritte konnten nicht geladen werden: ' + r.dokuFehler.message); return }
    setDaten(r)
  }

  const nw = useMemo(() => {
    if (gesicht) return gesicht.nw
    if (!daten || !bs) return null
    return P.baueNachweis({ baustelle: bs, stunden: daten.stunden, schritte: daten.schritte, fotos: daten.fotos, profile: daten.profile, optionen: { von, bis, ...opt } })
  }, [gesicht, daten, bs, opt, von, bis])

  const pruefliste = useMemo(() => (gesicht || !daten || !bs) ? [] : P.pruefliste({ baustelle: bs, stunden: daten.stunden, schritte: daten.schritte, fotos: daten.fotos, von, bis, profile: daten.profile }), [gesicht, daten, bs, von, bis])

  // Foto-Links (Vorschaubilder) für die Anlage
  useEffect(() => {
    let live = true
    if (!nw || !nw.fotos.length) { setFotoUrls({}); return }
    D.signierteUrls(nw.fotos.map(f => f.thumb)).then(m => { if (live) setFotoUrls(m) })
    return () => { live = false }
  }, [nw])

  async function drucken() {
    setMeldung('Bilder werden geladen …')
    await warteAufBilder()
    setMeldung('')
    window.print()
  }
  async function nachweisSpeichern() {
    if (!nw || !bs) return
    if (!confirm('Diesen Stand als Nachweis einfrieren?\n\nEr bleibt danach unverändert im Archiv (z. B. für die Rechnung), auch wenn sich Stunden später ändern.')) return
    setSpeichere(true)
    const r = await D.speichereNachweis({ baustelleId: bs.id, nw, userId: auth.user.id })
    setSpeichere(false)
    if (!r.ok) { setMeldung(r.tabelleFehlt ? 'Archiv noch nicht eingerichtet (SQL „2026-11-projekt-modul“ fehlt).' : 'Speichern fehlgeschlagen: ' + r.fehler); return }
    setMeldung(`✓ Als ${r.nr} gespeichert`)
    const l = await D.ladeNachweise(bs.id); setArchiv({ liste: l.data, fehlt: l.fehlt })
  }
  async function archivOeffnen(a) {
    const r = await D.ladeNachweis(a.id)
    if (r.error || !r.data) { setFehler('Nachweis konnte nicht geladen werden.'); return }
    setGesicht({ nr: r.data.nr, created_at: r.data.created_at, nw: r.data.snapshot }); setFehler(''); setMeldung('')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  if (auth.lade) return <div className="loading">Wird geladen …</div>
  if (!auth.ok) return (
    <div className="exp-seite"><div className="exp-panel"><h1>Zeitnachweis-Export</h1><p>{auth.grund}</p><a className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href="/">Zur App</a></div></div>
  )

  const personen = nw ? nw.personen : []

  return (
    <>
      <Head><title>Zeitnachweis-Export – Elektro Pees</title><meta name="robots" content="noindex" /></Head>
      <div className="exp-seite">
        <div className="exp-panel exp-noprint">
          <a className="exp-zurueck" href="/">‹ Zurück zur App</a>
          <h1>📄 Zeitnachweis &amp; Dokumentation</h1>
          <p className="exp-sub">Für die Rechnung: Zeiten, Arbeitsschritte und Fotos einer Baustelle – als PDF (Drucken), CSV oder eingefrorener Nachweis.</p>

          <div className="form-group"><label>Baustelle</label>
            <select value={bsId} onChange={e => setBsId(e.target.value)}>
              {baustellen.map(b => <option key={b.id} value={b.id}>{b.doku_pflicht ? '🏗️ ' : ''}{b.name}{b.status !== 'aktiv' ? ' (archiviert)' : ''}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Von</label><input type="date" value={von} onChange={e => setVon(e.target.value)} /></div>
            <div className="form-group"><label>Bis</label><input type="date" value={bis} onChange={e => setBis(e.target.value)} /></div>
          </div>
          <div className="proj-chips" style={{ marginBottom: '1rem' }}>
            <button className="proj-chip" onClick={() => zeitraum('alles')}>Alles</button>
            <button className="proj-chip" onClick={() => zeitraum('monat')}>Dieser Monat</button>
            <button className="proj-chip" onClick={() => zeitraum('vormonat')}>Letzter Monat</button>
          </div>

          <div className="exp-optionen">
            <div>
              <div className="proj-label">Pause</div>
              <label className="exp-radio"><input type="radio" name="pause" checked={opt.pause === 'brutto'} onChange={() => setOpt(o => ({ ...o, pause: 'brutto' }))} /> Mitberechnen (brutto) <em>Standard</em></label>
              <label className="exp-radio"><input type="radio" name="pause" checked={opt.pause === 'netto'} onChange={() => setOpt(o => ({ ...o, pause: 'netto' }))} /> Abziehen (netto)</label>
            </div>
            <div>
              <div className="proj-label">Namen</div>
              <label className="exp-radio"><input type="radio" name="namen" checked={opt.namen === 'voll'} onChange={() => setOpt(o => ({ ...o, namen: 'voll' }))} /> Voller Name</label>
              <label className="exp-radio"><input type="radio" name="namen" checked={opt.namen === 'kurz'} onChange={() => setOpt(o => ({ ...o, namen: 'kurz' }))} /> Vorname N.</label>
            </div>
            <div>
              <div className="proj-label">Anlage</div>
              <label className="exp-radio"><input type="checkbox" checked={opt.mitFotos} onChange={e => setOpt(o => ({ ...o, mitFotos: e.target.checked }))} /> Fotos abbilden (max. {P.PROJEKT_MAX_FOTOS_ANLAGE})</label>
            </div>
          </div>
          {nw && !gesicht && personen.length > 0 && (
            <details className="exp-funktionen">
              <summary>Funktion je Mitarbeiter anpassen</summary>
              {personen.map(p => (
                <div key={p.userId} className="exp-fz"><span>{p.name}</span>
                  <select value={opt.funktionen[p.userId] || ''} onChange={e => setOpt(o => ({ ...o, funktionen: { ...o.funktionen, [p.userId]: e.target.value } }))}>
                    <option value="">{p.funktion} (Standard)</option>
                    {FUNKTIONEN.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              ))}
            </details>
          )}

          <button className="btn btn-primary" onClick={erstellen} disabled={lade || !bs}>{lade ? 'Wird geladen …' : daten || gesicht ? '↻ Neu berechnen' : 'Nachweis erstellen'}</button>
          {fehler && <div className="proj-fehlerbox">{fehler}</div>}
          {daten && daten.dokuFehlt && <div className="proj-fehlerbox">Die Projekt-Datenbank ist noch nicht eingerichtet – der Nachweis enthält nur die Zeiten.</div>}

          {gesicht && <div className="exp-hinweis">🔒 Du siehst den gespeicherten Nachweis <strong>{gesicht.nr}</strong> vom {P.fmtDatum(String(gesicht.created_at).slice(0, 10))} – unveränderlich. <button className="proj-link" onClick={() => setGesicht(null)}>Zurück zum aktuellen Stand</button></div>}

          {pruefliste.length > 0 && (
            <div className="exp-pruefliste">
              <div className="proj-label">Vor dem Export prüfen</div>
              {pruefliste.map((x, i) => (
                <details key={i} className={`exp-pr exp-pr-${x.stufe}`}>
                  <summary>{x.stufe === 'fehler' ? '⛔' : x.stufe === 'warnung' ? '⚠️' : 'ℹ️'} {x.text}</summary>
                  {x.details.length > 0 && <ul>{x.details.slice(0, 40).map((d, j) => <li key={j}>{d}</li>)}{x.details.length > 40 && <li>… und {x.details.length - 40} weitere</li>}</ul>}
                </details>
              ))}
            </div>
          )}

          {nw && (
            <div className="exp-aktionen">
              <button className="btn btn-primary" onClick={drucken}>🖨️ Drucken / als PDF speichern</button>
              <div className="exp-aktionen-zeile">
                <button className="btn btn-secondary" onClick={() => speichereDatei(P.csvZeiten(nw), P.dateiname(nw, 'Zeitnachweis'), 'text/csv;charset=utf-8')}>⬇ CSV Zeiten</button>
                <button className="btn btn-secondary" onClick={() => speichereDatei(P.csvSchritte(nw), P.dateiname(nw, 'Arbeitsschritte'), 'text/csv;charset=utf-8')}>⬇ CSV Arbeitsschritte</button>
              </div>
              {!gesicht && <button className="btn btn-outline" style={{ width: '100%' }} onClick={nachweisSpeichern} disabled={speichere}>{speichere ? 'Wird gespeichert …' : '💾 Als Nachweis speichern (einfrieren)'}</button>}
              <div className="exp-tipp">Tipp beim Drucken: „Kopf- und Fußzeilen“ ausschalten, „Hintergrundgrafiken“ einschalten.</div>
            </div>
          )}
          {meldung && <div className="exp-meldung">{meldung}</div>}

          {archiv.liste.length > 0 && (
            <div className="exp-archiv">
              <div className="proj-label">Gespeicherte Nachweise</div>
              {archiv.liste.map(a => (
                <button key={a.id} className="exp-archiv-zeile" onClick={() => archivOeffnen(a)}>
                  <span><strong>{a.nr}</strong> · {P.fmtDatum(a.von)}–{P.fmtDatum(a.bis)}</span>
                  <span>{P.fmtStdKomma(a.summe_min)} Std · {a.anzahl_fotos} Fotos</span>
                </button>
              ))}
            </div>
          )}
          {archiv.fehlt && <div className="exp-tipp">Archiv: Tabelle fehlt noch (SQL „2026-11-projekt-modul“).</div>}
        </div>

        {/* ───────── Das Dokument (wird gedruckt) ───────── */}
        {nw && <NachweisBlatt nw={nw} nr={gesicht ? gesicht.nr : null} erstellt={(gesicht ? String(gesicht.created_at) : heuteStr()).slice(0, 10)} fotoUrls={fotoUrls} />}
      </div>
    </>
  )
}
