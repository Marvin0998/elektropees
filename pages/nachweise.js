// Gastzugang (z. B. Rhenus): NUR ANSEHEN der gespeicherten Leistungs- und Zeitnachweise einer Baustelle.
// Kein Login, kein Zugriff auf die App: der Link enthält einen geheimen Schlüssel (Token), der Server gibt nur
// die Nachweise genau dieser Baustelle heraus (siehe SQL-Funktionen projekt_gast_liste / projekt_gast_nachweis).
import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { gastClient } from '../lib/gast'
import * as P from '../lib/projekt'
import * as D from '../lib/projektdaten'
import { NachweisBlatt, warteAufBilder, speichereDatei } from '../components/NachweisBlatt'
import { FotoViewer } from '../components/Projekt'

export default function Nachweise() {
  const router = useRouter()
  const db = useMemo(() => gastClient(), [])
  const [token, setToken] = useState(null)
  const [stand, setStand] = useState({ art: 'lade', liste: null, fehler: '' })   // lade | ungueltig | fehler | ok
  const [offen, setOffen] = useState(null)       // { nr, created_at, nw }
  const [ladeNr, setLadeNr] = useState('')
  const [fotoUrls, setFotoUrls] = useState({})
  const [viewer, setViewer] = useState(null)
  const [meldung, setMeldung] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const t = String(router.query.t || '')
    if (!P.gastTokenGueltig(t)) { setStand({ art: 'ungueltig', liste: null, fehler: '' }); return }
    setToken(t)
    D.ladeGastListe(t, db).then(r => {
      if (r.error) setStand({ art: 'fehler', liste: null, fehler: r.error.message || 'Verbindungsfehler' })
      else if (!r.data) setStand({ art: 'ungueltig', liste: null, fehler: '' })
      else setStand({ art: 'ok', liste: r.data, fehler: '' })
    })
  }, [router.isReady, router.query.t, db])

  const nw = offen ? offen.nw : null
  useEffect(() => {
    let live = true
    if (!nw || !nw.fotos || !nw.fotos.length) { setFotoUrls({}); return }
    D.signierteUrls(nw.fotos.map(f => f.path), db).then(m => { if (live) setFotoUrls(m) })
    return () => { live = false }
  }, [nw, db])

  async function oeffnen(n) {
    setLadeNr(n.id); setMeldung('')
    const r = await D.ladeGastNachweis(token, n.id, db)
    setLadeNr('')
    if (r.error || !r.data) { setMeldung('Der Nachweis konnte nicht geladen werden. Bitte später erneut versuchen.'); return }
    setOffen({ nr: r.data.nr, created_at: r.data.created_at, nw: r.data.snapshot })
    setTimeout(() => window.scrollTo({ top: 0 }), 30)
  }
  async function drucken() {
    setMeldung('Bilder werden geladen …')
    await warteAufBilder()
    setMeldung('')
    window.print()
  }
  const oeffneFoto = f => setViewer({ items: nw.fotos.map(x => ({ path: x.path, caption: `${x.nr} · ${P.fmtDatum(x.datum)} · ${x.art === 'vorher' ? 'Vorher' : 'Nachher'} · ${x.text}` })), start: Math.max(0, nw.fotos.findIndex(x => x.id === f.id)) })

  const kopf = stand.liste && stand.liste.baustelle

  return (
    <>
      <Head>
        <title>Nachweise – Elektro Pees</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <div className="exp-seite gast-seite">
        <div className="exp-panel exp-noprint gast-panel">
          <img src="/logo_dunkel.png" alt="Elektro Pees" className="gast-logo" onError={e => { e.target.style.display = 'none' }} />
          {stand.art === 'lade' && <p className="exp-sub">Wird geladen …</p>}
          {stand.art === 'ungueltig' && (
            <>
              <h1>Zugang nicht möglich</h1>
              <p className="exp-sub">Dieser Link ist ungültig, abgelaufen oder wurde gesperrt. Bitte wenden Sie sich an Elektro Pees für einen neuen Zugangslink.</p>
            </>
          )}
          {stand.art === 'fehler' && (
            <>
              <h1>Verbindungsproblem</h1>
              <p className="exp-sub">Die Nachweise konnten nicht geladen werden. Bitte Seite neu laden. <span className="gast-klein">({stand.fehler})</span></p>
            </>
          )}
          {stand.art === 'ok' && (
            <>
              <h1>Leistungs- und Zeitnachweise</h1>
              <div className="gast-bs">
                <strong>{kopf.name}</strong>
                <div>{[kopf.kunde, kopf.adresse].filter(Boolean).join(' · ')}</div>
                {kopf.auftragsnr && <div>Auftrag {kopf.auftragsnr}</div>}
              </div>
              <p className="exp-sub">Nur Ansicht. Die Nachweise werden von Elektro Pees bereitgestellt; Rückfragen gern an uns.</p>

              {offen && (
                <div className="exp-aktionen">
                  <button className="proj-link" onClick={() => { setOffen(null); setMeldung('') }}>‹ Zurück zur Übersicht</button>
                  <button className="btn btn-primary" onClick={drucken}>🖨️ Drucken / als PDF speichern</button>
                  <div className="exp-aktionen-zeile">
                    <button className="btn btn-secondary" onClick={() => speichereDatei(P.csvZeiten(offen.nw), P.dateiname(offen.nw, 'Zeitnachweis'), 'text/csv;charset=utf-8')}>⬇ CSV Zeiten</button>
                    <button className="btn btn-secondary" onClick={() => speichereDatei(P.csvSchritte(offen.nw), P.dateiname(offen.nw, 'Arbeitsschritte'), 'text/csv;charset=utf-8')}>⬇ CSV Arbeiten</button>
                  </div>
                  <div className="exp-tipp">Tipp beim Drucken: „Kopf- und Fußzeilen“ ausschalten, „Hintergrundgrafiken“ einschalten.</div>
                </div>
              )}
              {meldung && <div className="exp-meldung">{meldung}</div>}

              {!offen && (
                <div className="exp-archiv">
                  <div className="proj-label">Bereitgestellte Nachweise</div>
                  {stand.liste.nachweise.length === 0 && <p className="exp-sub">Es wurde noch kein Nachweis bereitgestellt.</p>}
                  {stand.liste.nachweise.map(n => (
                    <button key={n.id} className="exp-archiv-zeile" onClick={() => oeffnen(n)} disabled={!!ladeNr}>
                      <span><strong>{n.nr}</strong> · {P.fmtDatum(n.von)}–{P.fmtDatum(n.bis)}<br /><small>Stand {P.fmtDatum(String(n.created_at).slice(0, 10))}</small></span>
                      <span>{ladeNr === n.id ? 'lädt …' : `${P.fmtStdKomma(n.summe_min)} Std · ${n.anzahl_fotos} Fotos`}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {offen && <NachweisBlatt nw={offen.nw} nr={offen.nr} erstellt={String(offen.created_at).slice(0, 10)} fotoUrls={fotoUrls} onFoto={oeffneFoto} />}
        {viewer && <FotoViewer items={viewer.items} start={viewer.start} onClose={() => setViewer(null)} db={db} />}
      </div>
    </>
  )
}
