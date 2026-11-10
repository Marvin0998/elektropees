// Echtes PDF des Leistungs- und Zeitnachweises (jsPDF) – funktioniert auch auf dem Handy,
// wo window.print() oft nichts tut (iOS, Home-Bildschirm-App). Gleicher Inhalt wie NachweisBlatt.
import * as P from './projekt'

const A4 = { b: 210, h: 297 }
const R = { l: 12, r: 12, o: 14, u: 16 }
const BREITE = A4.b - R.l - R.r
const DUNKEL = [18, 26, 66]
const GRAU = [95, 105, 125]
const LINIE = [200, 208, 222]
const KOPF = [236, 240, 248]

// Standard-PDF-Schrift (Helvetica/WinAnsi): alles außerhalb Latin-1 + gängiger Satzzeichen entfernen.
const sauber = s => String(s == null ? '' : s).replace(/[^\n -~ -ÿ–—‘-„•…€]/g, '').replace(/\s*\n\s*/g, '\n').trim()

async function ladeDatei(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Bild nicht ladbar')
  return r.blob()
}
// Bild verkleinern (PDF bleibt handlich) und als JPEG-DataURL liefern.
async function bildFuerPdf(blob, maxPx = 1200, q = 0.8) {
  const bmp = await createImageBitmap(blob)
  try {
    const f = Math.min(1, maxPx / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * f)); const h = Math.max(1, Math.round(bmp.height * f))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(bmp, 0, 0, w, h)
    return { data: c.toDataURL('image/jpeg', q), w, h }
  } finally { if (bmp.close) bmp.close() }
}

function bloeckeDesTages(t) {
  return t.bloecke || t.eintraege.map(e => ({ id: e.id, personen: [e.person], von: e.von, bis: e.bis, min: e.min, notiz: e.notiz, schritte: e.schritte, team: false, erfasser: e.erfasser ? [e.erfasser] : [] }))
}
function erfasserZusatz(b) {
  const f = (b.erfasser || []).filter(Boolean)
  if (!f.length) return ''
  if (!b.team && f.length === 1 && b.personen.length === 1 && f[0] === b.personen[0]) return ''
  return ` · erfasst von ${P.namenListe(f)}`
}

export async function erzeugeNachweisPdf({ nw, nr, erstellt, fotoUrls = {}, onFortschritt }) {
  const [{ jsPDF }, at] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = at.autoTable || at.default
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const kopf = nw.kopf
  let y = R.o
  const unten = A4.h - R.u
  const platz = h => { if (y + h > unten) { doc.addPage(); y = R.o } }
  const farbe = c => doc.setTextColor(c[0], c[1], c[2])
  const text = (t, x, yy, opt) => doc.text(sauber(t), x, yy, opt)
  const tabelle = opt => {
    autoTable(doc, {
      margin: { left: R.l, right: R.r, top: R.o, bottom: R.u },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: DUNKEL, lineColor: LINIE, lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: KOPF, textColor: DUNKEL, fontStyle: 'bold' },
      footStyles: { fillColor: KOPF, textColor: DUNKEL, fontStyle: 'bold' },
      rowPageBreak: 'avoid',
      ...opt,
      startY: y,
    })
    y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y) + 3
  }
  const h2 = t => { platz(16); y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(12); farbe(DUNKEL); text(t, R.l, y + 4); doc.setDrawColor(...LINIE); doc.setLineWidth(0.3); doc.line(R.l, y + 6, A4.b - R.r, y + 6); y += 10 }
  const h3 = (t, extra) => {
    platz(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); farbe(DUNKEL); text(t, R.l, y + 3.5)
    if (extra) { const w = doc.getTextWidth(sauber(t)); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); farbe(GRAU); text(extra, R.l + w + 1.8, y + 3.5) }
    y += 6
  }
  const absatz = (t, { size = 8.5, bold = false, col = GRAU } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); farbe(col)
    const zeilen = doc.splitTextToSize(sauber(t), BREITE)
    platz(zeilen.length * (size * 0.43) + 2)
    doc.text(zeilen, R.l, y + size * 0.35); y += zeilen.length * (size * 0.43) + 2
  }

  // ── Kopf ────────────────────────────────────────────────────────────────
  try {
    const logo = await bildFuerPdf(await ladeDatei('/logo_dunkel.png'), 900, 0.92)
    const lw = 52; doc.addImage(logo.data, 'JPEG', R.l, y - 1, lw, lw * logo.h / logo.w)
  } catch (e) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); farbe(DUNKEL); text('ELEKTRO PEES', R.l, y + 6) }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); farbe(DUNKEL); text('Leistungs- und Zeitnachweis', A4.b - R.r, y + 6, { align: 'right' })
  if (nr) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); farbe(GRAU); text(`Nachweis ${nr}`, A4.b - R.r, y + 11.5, { align: 'right' }) }
  y += 17; doc.setDrawColor(...DUNKEL); doc.setLineWidth(0.6); doc.line(R.l, y, A4.b - R.r, y); y += 3
  tabelle({
    theme: 'plain', styles: { fontSize: 9, cellPadding: 1.2, textColor: DUNKEL },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 26, textColor: GRAU }, 1: { cellWidth: 70 }, 2: { fontStyle: 'bold', cellWidth: 24, textColor: GRAU } },
    body: [
      ['Baustelle', sauber(kopf.baustelle), 'Zeitraum', `${kopf.von ? P.fmtDatum(kopf.von) : 'Beginn'} – ${kopf.bis ? P.fmtDatum(kopf.bis) : 'heute'}`],
      ['Auftraggeber', sauber(kopf.kunde || '—'), 'Auftrags-Nr.', sauber(kopf.auftragsnr || '—')],
      ['Objekt', sauber(kopf.adresse || '—'), 'Erstellt', P.fmtDatum(erstellt)],
    ].map(r => r.map(sauber)),
  })
  absatz('Berücksichtigt sind nur freigegebene Arbeitszeiten.' + (nw.optionen && nw.optionen.pause === 'netto' ? ' Die Arbeitszeit ist ohne Pause ausgewiesen (Von bis Bis abzüglich Pause).' : ''))

  // ── A · Zeitnachweis ────────────────────────────────────────────────────
  const tage = nw.kw.flatMap(k => k.tage.map(t => ({ ...t, kw: k.kw })))
  const zeigeErfasser = tage.some(t => t.eintraege.some(e => e.erfasser))
  h2('A · Zeitnachweis')
  if (nw.kw.length === 0) absatz('Im gewählten Zeitraum gibt es keine freigegebenen Stunden.', { size: 9, col: DUNKEL })
  nw.kw.forEach(k => {
    h3(`KW ${k.kw}/${k.jahr}`, `(${P.fmtDatum(k.montag)} – ${P.fmtDatum(k.sonntag)})`)
    const spalten = ['Datum', 'Mitarbeiter', 'Funktion', 'Von', 'Bis', 'Std.'].concat(zeigeErfasser ? ['Erfasst von'] : [])
    tabelle({
      head: [spalten],
      body: k.tage.flatMap(t => t.eintraege.map(e => [`${t.wt} ${P.fmtDatumKurz(t.datum)}`, e.person, e.funktion, e.von, e.bis, P.fmtStdKomma(e.min)].concat(zeigeErfasser ? [e.erfasser || '—'] : []).map(sauber))),
      foot: [[`Summe KW ${k.kw}`, '', '', '', '', P.fmtStdKomma(k.min)].concat(zeigeErfasser ? [''] : [])],
      showFoot: 'lastPage',
      columnStyles: { 5: { halign: 'right' } },
      didParseCell: d => { if (d.section === 'foot' && d.column.index === 0) d.cell.colSpan = 5; if (d.column.index === 5 && d.section !== 'body') d.cell.styles.halign = 'right' },
    })
  })
  if (nw.kw.length > 0) {
    y += 1
    tabelle({
      head: [['Mitarbeiter', 'Funktion', 'Tage', 'Stunden']],
      body: nw.personen.map(p => [p.name, p.funktion, String(p.tage), P.fmtStdKomma(p.min)].map(sauber)),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      didParseCell: d => { if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = 'right' },
    })
    tabelle({
      head: [['Funktion', 'Personen', 'Stunden']],
      body: nw.funktionen.map(f => [f.funktion, String(f.personen), P.fmtStdKomma(f.min)].map(sauber)),
      foot: [['Gesamtsumme', '', `${P.fmtStdKomma(nw.summe.min)} Std`]],
      showFoot: 'lastPage',
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      didParseCell: d => { if (d.section === 'foot' && d.column.index === 0) d.cell.colSpan = 2; if (d.section !== 'body' && d.column.index >= 1) d.cell.styles.halign = 'right' },
    })

    // ── B · Ausgeführte Arbeiten ──────────────────────────────────────────
    h2('B · Ausgeführte Arbeiten')
    tage.forEach(t => {
      h3(`${t.wt} ${P.fmtDatum(t.datum)}`)
      bloeckeDesTages(t).forEach(b => {
        const zeile = `${P.namenListe(b.personen)}${b.von && b.bis ? ` · ${b.von}–${b.bis}` : ''}${b.min != null ? ` · ${b.team ? 'je ' : ''}${P.fmtStdKomma(b.min)} Std` : ''}${erfasserZusatz(b)}`
        platz(22)
        absatz(zeile, { size: 9, bold: true, col: DUNKEL })
        if (b.schritte.length > 0) {
          tabelle({
            theme: 'plain', styles: { fontSize: 8.5, cellPadding: { top: 1, bottom: 1, left: 1.2, right: 1.2 } },
            body: b.schritte.map(s => [`${s.nr}.`, sauber(s.text) + (s.keinFotoGrund ? `\nKein Foto: ${sauber(s.keinFotoGrund)}` : ''), P.fmtMin(s.min), (s.fotos || []).join(', ')]),
            columnStyles: { 0: { cellWidth: 8, textColor: GRAU }, 2: { cellWidth: 24, halign: 'right' }, 3: { cellWidth: 26, textColor: GRAU, font: 'courier', fontSize: 7.5 } },
            didDrawCell: d => { if (d.section === 'body') { doc.setDrawColor(...LINIE); doc.setLineWidth(0.1); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height) } },
          })
        } else absatz(b.notiz || '—', { size: 8.5, col: DUNKEL })
        y += 1
      })
    })
  }

  // ── C · Foto-Anlage ──────────────────────────────────────────────────────
  if (nw.fotos.length > 0) {
    doc.addPage(); y = R.o
    h2('C · Foto-Anlage')
    if (nw.summe.fotos > nw.summe.fotosAbgebildet) absatz(`Abgebildet sind die ersten ${nw.summe.fotosAbgebildet} von ${nw.summe.fotos} Fotos; alle Fotos liegen digital vor.`)
    const spaltenB = (BREITE - 6) / 2; const maxH = 92
    for (let i = 0; i < nw.fotos.length; i += 2) {
      const paar = nw.fotos.slice(i, i + 2)
      if (onFortschritt) onFortschritt(Math.min(i + 2, nw.fotos.length), nw.fotos.length)
      const geladen = []
      for (const f of paar) {
        const url = fotoUrls[f.path] || fotoUrls[f.thumb]
        try { geladen.push(url ? await bildFuerPdf(await ladeDatei(url)) : null) } catch (e) { geladen.push(null) }
      }
      doc.setFontSize(7.5)
      const items = paar.map((f, j) => {
        const bild = geladen[j]
        const maxW = spaltenB - 2
        let bw = maxW; let bh = bild ? bw * bild.h / bild.w : 20
        if (bild && bh > maxH) { bh = maxH; bw = bh * bild.w / bild.h }
        const cap = doc.splitTextToSize(sauber(`${f.nr} · ${P.fmtDatum(f.datum)} · ${f.art === 'vorher' ? 'Vorher' : 'Nachher'}\n${f.text || ''}`), maxW).slice(0, 4)
        return { f, bild, bw, bh, cap }
      })
      const zeilenH = Math.max(...items.map(it => it.bh + it.cap.length * 3.2 + 5))
      platz(zeilenH + 3)
      items.forEach((it, j) => {
        const x = R.l + j * (spaltenB + 6)
        doc.setDrawColor(...LINIE); doc.setLineWidth(0.2); doc.rect(x, y, spaltenB, zeilenH)
        if (it.bild) doc.addImage(it.bild.data, 'JPEG', x + 1 + (spaltenB - 2 - it.bw) / 2, y + 1, it.bw, it.bh)
        else { doc.setFont('helvetica', 'italic'); doc.setFontSize(8); farbe(GRAU); text('Foto nicht verfügbar', x + 3, y + 8) }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); farbe(DUNKEL)
        doc.text(it.cap, x + 1.5, y + it.bh + 4.2)
      })
      y += zeilenH + 3
    }
  }

  // ── Unterschriften + Fuß ────────────────────────────────────────────────
  platz(34); y += 14
  doc.setDrawColor(...DUNKEL); doc.setLineWidth(0.3)
  const sw = (BREITE - 14) / 2
  ;[['Auftragnehmer · Elektro Pees', 'Ort, Datum, Unterschrift'], [`Auftraggeber · ${kopf.kunde || '—'}`, 'Name, Datum, Unterschrift']].forEach(([a, b], j) => {
    const x = R.l + j * (sw + 14)
    doc.line(x, y, x + sw, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); farbe(DUNKEL); text(a, x, y + 4.5)
    doc.setFontSize(7.5); farbe(GRAU); text(b, x, y + 8.5)
  })
  y += 14
  absatz(`${kopf.baustelle} · ${nw.summe.eintraege} Einträge · ${nw.summe.schritte} Arbeitsschritte · ${nw.summe.fotos} Fotos · Summe ${P.fmtStdKomma(nw.summe.min)} Std`, { size: 8 })

  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); farbe(GRAU)
    text(`${kopf.baustelle} · Leistungs- und Zeitnachweis${nr ? ' ' + nr : ''}`, R.l, A4.h - 8)
    text(`Seite ${i} / ${n}`, A4.b - R.r, A4.h - 8, { align: 'right' })
  }
  return doc.output('blob')
}

// Handy: Teilen-Dialog (Speichern in Dateien, WhatsApp, Mail …); sonst normaler Download.
export async function liefereDatei(blob, name) {
  try {
    const file = new File([blob], name, { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) { await navigator.share({ files: [file], title: name }); return 'geteilt' }
  } catch (e) { if (e && e.name === 'AbortError') return 'abgebrochen' }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return 'geladen'
}
