// Das Nachweis-Dokument (Leistungs- und Zeitnachweis): wird vom Export (Chef/Büro) UND vom Gastzugang
// (Rhenus, nur Ansicht) benutzt – damit beide exakt dasselbe Blatt sehen. Druck/PDF über @media print.
import * as P from '../lib/projekt'

export function heuteStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` }

export async function warteAufBilder() {
  const bilder = [...document.querySelectorAll('.exp-sheet img')]
  await Promise.all(bilder.map(b => (b.complete ? Promise.resolve() : new Promise(r => { b.onload = r; b.onerror = r }))))
}
export function speichereDatei(inhalt, name, typ) {
  const blob = new Blob([inhalt], { type: typ })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Ältere Nachweise haben keine `bloecke` → je Eintrag ein Block.
function bloeckeDesTages(t) {
  return t.bloecke || t.eintraege.map(e => ({ id: e.id, personen: [e.person], von: e.von, bis: e.bis, min: e.min, notiz: e.notiz, schritte: e.schritte, team: false, erfasser: e.erfasser ? [e.erfasser] : [] }))
}

// nw: Nachweis (baueNachweis) · nr: Nachweis-Nummer oder null (laufender Stand) · erstellt: 'JJJJ-MM-TT' · fotoUrls: { pfad: url }
export function NachweisBlatt({ nw, nr, erstellt, fotoUrls = {}, onFoto }) {
  const kopf = nw.kopf
  const eintraegeNachTag = nw.kw.flatMap(k => k.tage.map(t => ({ ...t, kw: k.kw })))
  // Spalte „Erfasst von“ nur, wenn der Nachweis die Angabe enthält (ältere gespeicherte Nachweise haben sie nicht)
  const zeigeErfasser = eintraegeNachTag.some(t => t.eintraege.some(e => e.erfasser))
  // „erfasst von …“ im Arbeiten-Teil nur, wenn jemand anderes den Eintrag angelegt hat als die Person selbst
  const erfasserZusatz = b => {
    const f = (b.erfasser || []).filter(Boolean)
    if (!f.length) return ''
    if (!b.team && f.length === 1 && b.personen.length === 1 && f[0] === b.personen[0]) return ''
    return ` · erfasst von ${P.namenListe(f)}`
  }
  return (
    <div className="exp-sheet">
      <header className="exp-kopf">
        <div>
          <img src="/logo_dunkel.png" alt="Elektro Pees" className="exp-logo" onError={e => { e.target.style.display = 'none' }} />
        </div>
        <div className="exp-kopf-rechts">
          <h1>Leistungs- und Zeitnachweis</h1>
          {nr && <div className="exp-nr">Nachweis {nr}</div>}
        </div>
      </header>
      <table className="exp-meta"><tbody>
        <tr><th>Baustelle</th><td>{kopf.baustelle}</td><th>Zeitraum</th><td>{kopf.von ? P.fmtDatum(kopf.von) : 'Beginn'} – {kopf.bis ? P.fmtDatum(kopf.bis) : 'heute'}</td></tr>
        <tr><th>Auftraggeber</th><td>{kopf.kunde || '—'}</td><th>Auftrags-Nr.</th><td>{kopf.auftragsnr || '—'}</td></tr>
        <tr><th>Objekt</th><td>{kopf.adresse || '—'}</td><th>Erstellt</th><td>{P.fmtDatum(erstellt)}</td></tr>
      </tbody></table>
      <p className="exp-basis">Berücksichtigt sind nur freigegebene Arbeitszeiten. {nw.optionen.pause === 'brutto' ? 'Die Arbeitszeit umfasst die bezahlte Pause (Von bis Bis).' : 'Die Arbeitszeit ist ohne Pause ausgewiesen (Von bis Bis abzüglich Pause).'}</p>

      <h2>A · Zeitnachweis</h2>
      {nw.kw.length === 0 && <p>Im gewählten Zeitraum gibt es keine freigegebenen Stunden.</p>}
      {nw.kw.map(k => (
        <section key={k.montag} className="exp-kw">
          <h3>KW {k.kw}/{k.jahr} <span>({P.fmtDatum(k.montag)} – {P.fmtDatum(k.sonntag)})</span></h3>
          <table className="exp-tab">
            <thead><tr><th>Datum</th><th>Mitarbeiter</th><th>Funktion</th><th>Von</th><th>Bis</th><th className="r">Pause</th><th className="r">Std.</th>{zeigeErfasser && <th>Erfasst von</th>}</tr></thead>
            <tbody>
              {k.tage.flatMap(t => t.eintraege.map(e => (
                <tr key={e.id}><td>{t.wt} {P.fmtDatumKurz(t.datum)}</td><td>{e.person}</td><td>{e.funktion}</td><td>{e.von}</td><td>{e.bis}</td><td className="r">{e.pause} Min</td><td className="r">{P.fmtStdKomma(e.min)}</td>{zeigeErfasser && <td>{e.erfasser || '—'}</td>}</tr>
              )))}
            </tbody>
            <tfoot><tr><td colSpan={6}>Summe KW {k.kw}</td><td className="r">{P.fmtStdKomma(k.min)}</td>{zeigeErfasser && <td />}</tr></tfoot>
          </table>
        </section>
      ))}
      {nw.kw.length > 0 && (
        <section className="exp-summen">
          <table className="exp-tab">
            <thead><tr><th>Mitarbeiter</th><th>Funktion</th><th className="r">Tage</th><th className="r">Stunden</th></tr></thead>
            <tbody>{nw.personen.map(p => <tr key={p.userId}><td>{p.name}</td><td>{p.funktion}</td><td className="r">{p.tage}</td><td className="r">{P.fmtStdKomma(p.min)}</td></tr>)}</tbody>
          </table>
          <table className="exp-tab">
            <thead><tr><th>Funktion</th><th className="r">Personen</th><th className="r">Stunden</th></tr></thead>
            <tbody>{nw.funktionen.map(f => <tr key={f.funktion}><td>{f.funktion}</td><td className="r">{f.personen}</td><td className="r">{P.fmtStdKomma(f.min)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={2}>Gesamtsumme</td><td className="r">{P.fmtStdKomma(nw.summe.min)} Std</td></tr></tfoot>
          </table>
        </section>
      )}

      {nw.kw.length > 0 && (
        <>
          <h2>B · Ausgeführte Arbeiten</h2>
          {eintraegeNachTag.map(t => (
            <section key={t.datum} className="exp-tag">
              <h3>{t.wt} {P.fmtDatum(t.datum)}</h3>
              {bloeckeDesTages(t).map(b => (
                <div key={b.id} className="exp-eintrag">
                  <div className="exp-eintrag-kopf">
                    {P.namenListe(b.personen)}
                    {b.von && b.bis ? ` · ${b.von}–${b.bis}` : ''}
                    {b.min != null ? ` · ${b.team ? 'je ' : ''}${P.fmtStdKomma(b.min)} Std` : ''}
                    {erfasserZusatz(b)}
                  </div>
                  {b.schritte.length > 0 ? (
                    <table className="exp-tab exp-tab-schritte"><tbody>
                      {b.schritte.map(s => (
                        <tr key={s.id}>
                          <td className="exp-nr-sp">{s.nr}.</td>
                          <td>{s.text}{s.keinFotoGrund && <div className="exp-kf">Kein Foto: {s.keinFotoGrund}</div>}</td>
                          <td className="r nowrap">{P.fmtMin(s.min)}</td>
                          <td className="exp-fr">{s.fotos.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  ) : <div className="exp-notiz">{b.notiz || '—'}</div>}
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      {nw.fotos.length > 0 && (
        <>
          <h2>C · Foto-Anlage</h2>
          {nw.summe.fotos > nw.summe.fotosAbgebildet && <p className="exp-basis">Abgebildet sind die ersten {nw.summe.fotosAbgebildet} von {nw.summe.fotos} Fotos; alle Fotos liegen digital vor.</p>}
          <div className="exp-fotos">
            {nw.fotos.map(f => (
              <figure key={f.id}>
                {fotoUrls[f.thumb] ? <img src={fotoUrls[f.thumb]} alt={f.nr} onClick={onFoto ? () => onFoto(f) : undefined} style={onFoto ? { cursor: 'zoom-in' } : undefined} /> : <div className="exp-foto-platz">Foto wird geladen …</div>}
                <figcaption><strong>{f.nr}</strong> · {P.fmtDatum(f.datum)} · {f.art === 'vorher' ? 'Vorher' : 'Nachher'}<br />{f.text}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      <section className="exp-sign">
        <div><div className="exp-sign-linie" /><div>Auftragnehmer · Elektro Pees<br /><span>Ort, Datum, Unterschrift</span></div></div>
        <div><div className="exp-sign-linie" /><div>Auftraggeber · {kopf.kunde || '—'}<br /><span>Name, Datum, Unterschrift</span></div></div>
      </section>
      <footer className="exp-fuss">{kopf.baustelle} · {nw.summe.eintraege} Einträge · {nw.summe.schritte} Arbeitsschritte · {nw.summe.fotos} Fotos · Summe {P.fmtStdKomma(nw.summe.min)} Std</footer>
    </div>
  )
}
