// „Als PDF speichern“: erzeugt ein echtes PDF (auch fürs Handy). Desktop: lädt direkt herunter.
// Handy: danach erscheinen „Speichern / Teilen“ und „Öffnen“ (eigener Tipp nötig, sonst blockt das Handy).
import { useEffect, useState } from 'react'
import * as P from '../lib/projekt'
import { erzeugeNachweisPdf, liefereDatei } from '../lib/nachweisPdf'

export default function PdfButton({ nw, nr, erstellt, fotoUrls, onMeldung, label = '📄 Als PDF speichern' }) {
  const [laeuft, setLaeuft] = useState(false)
  const [fort, setFort] = useState('')
  const [pdf, setPdf] = useState(null)
  useEffect(() => () => { if (pdf && pdf.url) URL.revokeObjectURL(pdf.url) }, [pdf])
  useEffect(() => { setPdf(null) }, [nw, nr])

  async function erstellen() {
    if (!nw || laeuft) return
    const fehlend = nw.fotos.some(f => !(fotoUrls && (fotoUrls[f.path] || fotoUrls[f.thumb])))
    if (fehlend) { onMeldung && onMeldung('Die Foto-Links werden noch geladen – bitte einen Moment warten und nochmal tippen.'); return }
    setLaeuft(true); setPdf(null); setFort(''); onMeldung && onMeldung('')
    try {
      const blob = await erzeugeNachweisPdf({ nw, nr, erstellt, fotoUrls, onFortschritt: (a, b) => setFort(`Fotos ${a}/${b}`) })
      const name = P.dateiname(nw, 'Zeitnachweis', 'pdf')
      const handy = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform)))
      if (!handy) { await liefereDatei(blob, name); onMeldung && onMeldung(`✓ ${name} heruntergeladen`) }
      else setPdf({ blob, name, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024) })
    } catch (e) {
      onMeldung && onMeldung('PDF konnte nicht erstellt werden: ' + ((e && e.message) || e))
    }
    setLaeuft(false); setFort('')
  }

  return (
    <>
      <button className="btn btn-primary" onClick={erstellen} disabled={laeuft}>{laeuft ? `PDF wird erstellt … ${fort}` : label}</button>
      {pdf && (
        <div className="pdf-fertig">
          <div>✓ PDF fertig ({pdf.kb} KB)</div>
          <button className="btn btn-primary" onClick={async () => { const r = await liefereDatei(pdf.blob, pdf.name); if (r === 'geladen') onMeldung && onMeldung('✓ PDF heruntergeladen (Ordner „Downloads“)') }}>📤 Speichern / Teilen</button>
          <a className="btn btn-secondary" href={pdf.url} target="_blank" rel="noreferrer">🔍 Öffnen</a>
        </div>
      )}
    </>
  )
}
