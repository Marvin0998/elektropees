// Projekt-Sparte (z.B. Rhenus Dietzenbach): Projektseite, Arbeitsschritt-Erfassung mit Fotos,
// Foto-Betrachter, Projekt-Einstellungen. Regeln: docs/projekt-rhenus-ratsbeschluss.md
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as P from '../lib/projekt'
import * as D from '../lib/projektdaten'

// ─── Kleinteile ──────────────────────────────────────────────────────────────
export function useSignedUrls(paths, db) {
  const key = (paths || []).filter(Boolean).join('|')
  const [map, setMap] = useState({})
  useEffect(() => {
    let live = true
    if (!key) { setMap({}); return }
    D.signierteUrls(key.split('|'), db).then(m => { if (live) setMap(m) })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return map
}
export function PhasePill({ phase }) {
  const p = P.phaseInfo(phase)
  return p ? <span className={`proj-pill proj-pill-${p.farbe}`}>{p.label}</span> : null
}
function stdKomma(h) { return (Number(h) || 0).toFixed(1).replace('.', ',') }
function istProjekt(b) { return !!(b && b.doku_pflicht === true) }
export { istProjekt }

// ─── Karte (Start + Baustellen) ──────────────────────────────────────────────
export function ProjektKarte({ baustelle: b, stunden, onOpen, onErfassen, onTeam }) {
  const std = stunden.filter(s => s.baustelle_id === b.id && s.freigabe_status === 'freigegeben' && !P.istAbwesenheit(s)).reduce((a, s) => a + (Number(s.dauer) || 0), 0)
  return (
    <div className="proj-karte">
      <button className="proj-karte-main" onClick={onOpen}>
        <div className="proj-karte-top"><span className="proj-karte-label">PROJEKT</span><PhasePill phase={b.projekt_phase} /></div>
        <div className="proj-karte-name">{b.name}</div>
        <div className="proj-karte-sub">{b.kunde}{b.adresse ? ` · ${b.adresse}` : ''}</div>
        <div className="proj-karte-foot"><span>{stdKomma(std)} Std freigegeben</span><span className="proj-karte-go">Öffnen ›</span></div>
      </button>
      {onErfassen && <button className="proj-karte-cta" onClick={onErfassen}>⏱️ Stunden + Arbeitsschritte erfassen</button>}
      {onTeam && <button className="proj-karte-cta proj-karte-cta2" onClick={onTeam}>👥 Team-Stunden erfassen</button>}
    </div>
  )
}

// ─── Foto-Betrachter ─────────────────────────────────────────────────────────
// items: [{ path, caption }]
export function FotoViewer({ items, start = 0, onClose, db }) {
  const [i, setI] = useState(start)
  const aktuell = items[i]
  const urls = useSignedUrls([items[i]?.path, items[i + 1]?.path, items[i - 1]?.path], db)
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(x => Math.min(items.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1)) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [items.length, onClose])
  if (!aktuell) return null
  return (
    <div className="proj-viewer" onClick={onClose}>
      <button className="proj-viewer-x" onClick={onClose} aria-label="Schließen">✕</button>
      <div className="proj-viewer-bild" onClick={e => e.stopPropagation()}>
        {urls[aktuell.path] ? <img src={urls[aktuell.path]} alt={aktuell.caption || 'Foto'} /> : <div className="proj-viewer-lade">Foto wird geladen …</div>}
      </div>
      <div className="proj-viewer-fuss" onClick={e => e.stopPropagation()}>
        <div className="proj-viewer-cap">{aktuell.caption}</div>
        {items.length > 1 && (
          <div className="proj-viewer-nav">
            <button disabled={i === 0} onClick={() => setI(i - 1)}>‹ Zurück</button>
            <span>{i + 1} / {items.length}</span>
            <button disabled={i === items.length - 1} onClick={() => setI(i + 1)}>Weiter ›</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ein Foto in der Erfassung ───────────────────────────────────────────────
function FotoThumb({ foto, url, onRemove, onRetry, onOpen }) {
  const src = foto.preview || url
  return (
    <div className={`proj-thumb ${foto.status}`}>
      {src ? <img src={src} alt={foto.art === 'vorher' ? 'Vorher-Foto' : 'Nachher-Foto'} onClick={onOpen} /> : <div className="proj-thumb-leer">📷</div>}
      <span className="proj-thumb-art">{foto.art === 'vorher' ? 'Vorher' : 'Nachher'}</span>
      {foto.status === 'laedt' && <div className="proj-thumb-state">⏳ lädt …</div>}
      {foto.status === 'fehler' && (foto.blob ? <button className="proj-thumb-state err" onClick={onRetry}>↻ Erneut</button> : <div className="proj-thumb-state err">Fehler</div>)}
      {foto.status === 'ok' && <div className="proj-thumb-ok">✓</div>}
      <button className="proj-thumb-x" onClick={onRemove} aria-label="Foto entfernen">✕</button>
    </div>
  )
}

// ─── Ein Arbeitsschritt (Karte) ──────────────────────────────────────────────
// onChange(fn): fn bekommt den aktuellen Schritt und liefert den neuen (async-sicher).
// modus: 'alle' (Standard) · 'text' (Beschreibung + Dauer) · 'fotos' (nur Fotos, mit kurzer Zusammenfassung) – für den Team-Assistenten
export function SchrittEditor({ schritt: s, index, anzahl, onChange, onRemove, phase, bereiche, ctx, restMin, onFotoEntfernt, zeigeFehler, modus = 'alle' }) {
  const kat = useMemo(() => P.katalogFuerPhase(phase), [phase])
  const [kachelnOffen, setKachelnOffen] = useState(!s.taetigkeit)
  const [weitere, setWeitere] = useState(false)
  const [neuerBereich, setNeuerBereich] = useState(null)
  const kameraRef = useRef(null); const galerieRef = useRef(null); const artRef = useRef('nachher')
  const k = P.katalogEintrag(s.taetigkeit)
  const thumbPfade = s.fotos.filter(f => !f.preview && f.thumbPath).map(f => f.thumbPath)
  const urls = useSignedUrls(thumbPfade)
  const okFotos = s.fotos.filter(f => f.status === 'ok').length
  const fehler = zeigeFehler ? P.pruefeSchritte([s], 0, { teil: modus === 'alle' ? 'alle' : modus }).fehler : []
  const zeigeText = modus !== 'fotos'; const zeigeFotos = modus !== 'text'

  const set = patch => onChange(x => ({ ...x, ...patch }))
  const setFoto = (id, patch) => onChange(x => ({ ...x, fotos: x.fotos.map(f => (f.id === id ? { ...f, ...patch } : f)) }))

  async function hochladen(id, blob, thumb) {
    setFoto(id, { status: 'laedt' })
    const r = await D.ladeFotoHoch({ blob, thumb, id, baustelleId: ctx.baustelleId, userId: ctx.userId })
    if (r.ok) setFoto(id, { status: 'ok', path: r.path, thumbPath: r.thumbPath, bytes: r.bytes, blob: null, thumb: null })
    else setFoto(id, { status: 'fehler', fehler: r.fehler })
  }
  async function fotoHinzu(file, art) {
    if (!file) return
    const id = P.uuid()
    onChange(x => ({ ...x, keinFoto: false, fotos: [...x.fotos, { id, art, status: 'laedt', neu: true, aufgenommen: new Date().toISOString(), preview: null }] }))
    try {
      const v = await D.bereiteFotoVor(file)
      setFoto(id, { preview: URL.createObjectURL(v.thumb), blob: v.blob, thumb: v.thumb })
      await hochladen(id, v.blob, v.thumb)
    } catch (e) { setFoto(id, { status: 'fehler', fehler: e.message }) }
  }
  function fotoEntfernen(f) {
    onChange(x => ({ ...x, fotos: x.fotos.filter(g => g.id !== f.id) }))
    if (f.preview) { try { URL.revokeObjectURL(f.preview) } catch (e) { /* egal */ } }
    if (f.status === 'ok') { if (f.neu) D.loescheFotoDateien([f]); else if (onFotoEntfernt) onFotoEntfernt(f) }
  }
  function waehleBereich(b) { set({ bereich: s.bereich === b ? '' : b }) }
  function bereichUebernehmen() { const b = P.normBereich(neuerBereich); if (b) set({ bereich: b }); setNeuerBereich(null) }

  return (
    <div className={`proj-schritt ${fehler.length ? 'proj-schritt-fehler' : ''}`}>
      <div className="proj-schritt-kopf">
        <span className="proj-schritt-nr">Schritt {index + 1}</span>
        {anzahl > 1 && onRemove && zeigeText && <button className="proj-icon-btn" onClick={onRemove} aria-label="Schritt entfernen">🗑️</button>}
      </div>

      {!zeigeText && <div className="proj-schritt-zusammen"><strong>{P.schrittText(s) || 'Ohne Beschreibung'}</strong><span>⏱ {P.fmtMin(s.min)}</span></div>}

      {/* Tätigkeit */}
      {zeigeText && (<>
      {k && !kachelnOffen ? (
        <div className="proj-gewaehlt"><span>{k.icon} {k.freitext ? 'Sonstiges' : k.label}</span><button onClick={() => setKachelnOffen(true)}>Ändern</button></div>
      ) : (
        <>
          <div className="proj-label">Was wurde gemacht?</div>
          <div className="proj-kacheln">
            {kat.haupt.map(t => <button key={t.id} className={`proj-kachel ${s.taetigkeit === t.id ? 'aktiv' : ''}`} onClick={() => { set({ taetigkeit: t.id }); setKachelnOffen(false) }}><span>{t.icon}</span>{t.label}</button>)}
          </div>
          {kat.weitere.length > 0 && <button className="proj-link" onClick={() => setWeitere(w => !w)}>{weitere ? 'Weniger anzeigen ▴' : 'Weitere Tätigkeiten ▾'}</button>}
          {weitere && <div className="proj-kacheln">{kat.weitere.map(t => <button key={t.id} className={`proj-kachel ${s.taetigkeit === t.id ? 'aktiv' : ''}`} onClick={() => { set({ taetigkeit: t.id }); setKachelnOffen(false) }}><span>{t.icon}</span>{t.label}</button>)}</div>}
        </>
      )}

      {/* Freitext */}
      {k && k.freitext
        ? <div className="form-group proj-fg"><label>Beschreibung (Pflicht)</label><textarea value={s.zusatz} onChange={e => set({ zusatz: e.target.value })} placeholder="Was genau wurde gemacht? (mind. 2 Wörter)" /></div>
        : k && <div className="form-group proj-fg"><label>Genauer (optional)</label><input value={s.zusatz} onChange={e => set({ zusatz: e.target.value })} placeholder="z. B. alte NYM-Leitungen Reihe 4" /></div>}

      {/* Bereich */}
      <div className="proj-label">Wo? (Bereich)</div>
      <div className="proj-chips">
        {bereiche.slice(0, 8).map(b => <button key={b} className={`proj-chip ${s.bereich === b ? 'aktiv' : ''}`} onClick={() => waehleBereich(b)}>{b}</button>)}
        {s.bereich && !bereiche.slice(0, 8).includes(s.bereich) && <button className="proj-chip aktiv" onClick={() => waehleBereich(s.bereich)}>{s.bereich}</button>}
        {neuerBereich === null
          ? <button className="proj-chip proj-chip-neu" onClick={() => setNeuerBereich('')}>＋ Neu</button>
          : <span className="proj-neu-zeile"><input autoFocus value={neuerBereich} maxLength={40} onChange={e => setNeuerBereich(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') bereichUebernehmen() }} placeholder="z. B. Halle 3 Ost" /><button onClick={bereichUebernehmen}>OK</button></span>}
      </div>

      {/* Dauer */}
      <div className="proj-label">Wie lange? </div>
      <div className="proj-stepper">
        <button onClick={() => set({ min: Math.max(5, (Number(s.min) || 0) - 15) })} aria-label="15 Minuten weniger">−</button>
        <div className="proj-stepper-mitte">
          <input inputMode="numeric" value={s.min === 0 ? '' : s.min} onChange={e => set({ min: Math.min(720, parseInt(String(e.target.value).replace(/\D/g, ''), 10) || 0) })} aria-label="Minuten" />
          <span>Min · {P.fmtMin(s.min)}</span>
        </div>
        <button onClick={() => set({ min: Math.min(720, (Number(s.min) || 0) + 15) })} aria-label="15 Minuten mehr">+</button>
      </div>
      {restMin > 0 && restMin !== s.min && restMin <= 720 && <button className="proj-link" onClick={() => set({ min: restMin })}>= Rest der Arbeitszeit übernehmen ({P.fmtMin(restMin)})</button>}
      </>)}

      {/* Fotos */}
      {zeigeFotos && (<>
      <div className="proj-label">Fotos {okFotos === 0 && !s.keinFoto && <span className="proj-pflicht">Pflicht</span>}</div>
      <div className="proj-fotobtns">
        <button className="proj-foto-btn" onClick={() => { artRef.current = 'vorher'; kameraRef.current && kameraRef.current.click() }}>📷 Vorher</button>
        <button className="proj-foto-btn proj-foto-btn-primary" onClick={() => { artRef.current = 'nachher'; kameraRef.current && kameraRef.current.click() }}>📷 Nachher</button>
      </div>
      <button className="proj-link" onClick={() => { artRef.current = 'nachher'; galerieRef.current && galerieRef.current.click() }}>🖼️ Aus der Galerie wählen</button>
      <input ref={kameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; fotoHinzu(f, artRef.current) }} />
      <input ref={galerieRef} type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ''; fs.forEach(f => fotoHinzu(f, artRef.current)) }} />
      {s.fotos.length > 0 && (
        <div className="proj-thumbs">
          {s.fotos.map(f => <FotoThumb key={f.id} foto={f} url={urls[f.thumbPath]} onRemove={() => fotoEntfernen(f)} onRetry={() => f.blob && f.thumb && hochladen(f.id, f.blob, f.thumb)} />)}
        </div>
      )}
      {okFotos === 0 && (
        <label className="proj-check"><input type="checkbox" checked={!!s.keinFoto} onChange={e => set({ keinFoto: e.target.checked })} /> Kein Foto möglich</label>
      )}
      {okFotos === 0 && s.keinFoto && <input className="proj-grund" value={s.keinFotoGrund} onChange={e => set({ keinFotoGrund: e.target.value })} placeholder="Warum? (z. B. Fotoverbot, zu dunkel)" />}
      </>)}

      {fehler.length > 0 && <ul className="proj-fehlerliste">{fehler.map(f => <li key={f}>{f}</li>)}</ul>}
    </div>
  )
}

// ─── Formular im Stunden-Dialog ──────────────────────────────────────────────
// modus: 'alle' (Stunden-Dialog) · 'text' / 'fotos' (Team-Assistent: Beschreibung und Fotos getrennt) · info: eigener Hinweistext
export function ProjektSchrittForm({ schritte, setSchritte, netto, brutto, pause, phase, ctx, zeigeFehler, modus = 'alle', info, personenText }) {
  const [vorhandene, setVorhandene] = useState([])
  useEffect(() => {
    let live = true
    supabase.from('projekt_schritte').select('bereich, stunden!inner(baustelle_id)').eq('stunden.baustelle_id', ctx.baustelleId).not('bereich', 'is', null).limit(1000)
      .then(({ data }) => { if (live && data) setVorhandene(data) }, () => {})
    return () => { live = false }
  }, [ctx.baustelleId])
  const lokal = useMemo(() => P.bereicheLokal(ctx.baustelleId), [ctx.baustelleId])
  const bereiche = useMemo(() => P.bereichVorschlaege(vorhandene, lokal), [vorhandene, lokal])
  const summe = schritte.reduce((a, s) => a + (Number(s.min) || 0), 0)
  const rest = netto - summe
  const tol = P.PROJEKT_TOLERANZ_MIN
  const stufe = netto <= 0 ? 'neutral' : summe > netto ? 'rot' : rest > tol ? 'gelb' : 'gruen'
  const pct = netto > 0 ? Math.min(100, Math.round((summe / netto) * 100)) : 0
  const update = (key, fn) => setSchritte(l => l.map(s => (s.key === key ? fn(s) : s)))
  if (modus === 'fotos') {
    return (
      <div className="proj-form">
        {schritte.map((s, i) => (
          <SchrittEditor key={s.key} schritt={s} index={i} anzahl={schritte.length} phase={phase} bereiche={bereiche} ctx={ctx} zeigeFehler={zeigeFehler} modus="fotos"
            restMin={0} onChange={fn => update(s.key, fn)} />
        ))}
      </div>
    )
  }
  return (
    <div className="proj-form">
      <div className="proj-form-titel">📋 Arbeitsschritte <span className="proj-pflicht">Pflicht</span></div>
      <div className="proj-form-info">{info || 'Beschreibe, was du gemacht hast – jeweils mit Foto und Dauer. Zusammen müssen die Schritte deine Arbeitszeit abdecken.'}</div>
      <div className={`proj-summe proj-summe-${stufe}`}>
        <div className="proj-summe-zeile">
          <span>Beschrieben: <strong>{P.fmtMin(summe)}</strong> von {P.fmtMin(netto)}</span>
          <span>{stufe === 'rot' ? `${P.fmtMin(-rest)} zu viel` : rest > 0 ? `noch ${P.fmtMin(rest)}` : '✓'}</span>
        </div>
        <div className="proj-bar"><div style={{ width: `${pct}%` }} /></div>
        <div className="proj-summe-hinweis">Arbeitszeit ohne Pause ({P.fmtMin(brutto)} − {pause} Min Pause){personenText ? ` · ${personenText}` : ''}</div>
      </div>
      {schritte.map((s, i) => (
        <SchrittEditor key={s.key} schritt={s} index={i} anzahl={schritte.length} phase={phase} bereiche={bereiche} ctx={ctx} zeigeFehler={zeigeFehler} modus={modus}
          restMin={netto - (summe - (Number(s.min) || 0))}
          onChange={fn => update(s.key, fn)}
          onRemove={() => { D.loescheFotoDateien(s.fotos.filter(f => f.status === 'ok' && f.neu)); setSchritte(l => l.filter(x => x.key !== s.key)) }} />
      ))}
      <button className="btn btn-secondary proj-add" onClick={() => setSchritte(l => [...l, P.neuerSchritt(P.vorschlagMinuten(netto, l))])}>＋ Weiteren Arbeitsschritt hinzufügen</button>
    </div>
  )
}

// Entwurf (localStorage): überlebt Schließen der App und Funkloch. Nur hochgeladene Fotos werden gemerkt.
export function useDokuEntwurf({ aktiv, userId, baustelleId, snapshot, onRestore, onInit }) {
  const key = aktiv ? P.entwurfKey(userId, baustelleId) : null
  const bereit = useRef(null)
  const [wiederhergestellt, setWiederhergestellt] = useState(false)
  const initRef = useRef(onInit); const restoreRef = useRef(onRestore)
  initRef.current = onInit; restoreRef.current = onRestore
  useEffect(() => {
    if (!key) { bereit.current = null; return }
    const d = P.entwurfLaden(key)
    if (d && d.schritte.length) { restoreRef.current(d); setWiederhergestellt(true) } else { setWiederhergestellt(false); initRef.current() }
    bereit.current = key
  }, [key])
  const snapRef = useRef(snapshot); snapRef.current = snapshot
  const mapFotos = fl => fl.filter(f => f.status === 'ok').map(f => ({ id: f.id, art: f.art, status: 'ok', path: f.path, thumbPath: f.thumbPath, bytes: f.bytes, aufgenommen: f.aufgenommen, neu: true }))
  const json = useMemo(() => JSON.stringify({ f: snapshot && snapshot.form, z: snapshot && snapshot.zusatz, s: ((snapshot && snapshot.schritte) || []).map(s => ({ ...s, fotos: mapFotos(s.fotos) })) }), [snapshot])
  useEffect(() => {
    if (!key || bereit.current !== key) return
    const t = setTimeout(() => {
      const snap = snapRef.current; if (!snap) return
      const leer = snap.schritte.every(s => !s.taetigkeit && s.fotos.length === 0 && !s.zusatz) && !snap.zusatz
      if (leer) { P.entwurfLoeschen(key); return }
      P.entwurfSpeichern(key, {
        form: snap.form, zusatz: snap.zusatz,
        schritte: snap.schritte.map(s => ({ ...s, fotos: mapFotos(s.fotos) })),
      })
    }, 500)
    return () => clearTimeout(t)
  }, [json, key])
  return {
    key, wiederhergestellt,
    loeschen: () => { bereit.current = null; if (key) P.entwurfLoeschen(key) },        // nach erfolgreichem Speichern
    leeren: () => { setWiederhergestellt(false); if (key) P.entwurfLoeschen(key) },   // „Entwurf verwerfen“, Bearbeiten geht weiter
  }
}

// ─── Einen gespeicherten Schritt ansehen / bearbeiten ────────────────────────
function SchrittSheet({ row, eintragSchritte, alleSchritte, kannBearbeiten, personName, phase, ctx, onClose, onGeaendert, onFoto }) {
  const [modus, setModus] = useState('ansicht')
  const [s, setS] = useState(null)
  const [entfernt, setEntfernt] = useState([])
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState('')
  const [zeigeFehler, setZeigeFehler] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  const e = row.eintrag
  const thumbs = useSignedUrls(row.fotos.map(f => f.thumb_path || f.storage_path))

  function starten() { setS(P.schrittAusZeile(row, row.fotos)); setEntfernt([]); setModus('bearbeiten') }
  async function abbrechen() {
    if (s) await D.loescheFotoDateien(s.fotos.filter(f => f.status === 'ok' && f.neu))
    setModus('ansicht'); setS(null)
  }
  async function speichern() {
    setZeigeFehler(true)
    const p = P.pruefeSchritte([s], 0)
    if (!p.ok) return
    setSaving(true); setFehler('')
    const r = await D.aktualisiereSchritt(supabase, { schritt: s, stundenId: e.id, phase: row.phase, entfernteFotos: entfernt.map(f => ({ id: f.id, storage_path: f.path, thumb_path: f.thumbPath })) })
    if (!r.ok) { setFehler(r.fehler || 'Speichern fehlgeschlagen.'); setSaving(false); return }
    try {
      const { data: st } = await supabase.from('stunden').select('notiz').eq('id', e.id).single()
      const neuZeile = { ...row, beschreibung: P.schrittText(s), dauer_min: Math.round(Number(s.min)) }
      await D.notizNachziehen(supabase, { stundenId: e.id, notizAlt: st && st.notiz, schritteAlt: eintragSchritte, schritteNeu: eintragSchritte.map(x => (x.id === row.id ? neuZeile : x)) })
    } catch (err) { /* Notiz ist nur Komfort */ }
    P.bereichMerken(ctx.baustelleId, s.bereich)
    setSaving(false); onGeaendert()
  }
  async function loeschenJa() {
    setSaving(true)
    const r = await D.loescheSchritt(supabase, { id: row.id, fotos: row.fotos })
    if (!r.ok) { setFehler(r.fehler); setSaving(false); return }
    try {
      const { data: st } = await supabase.from('stunden').select('notiz').eq('id', e.id).single()
      await D.notizNachziehen(supabase, { stundenId: e.id, notizAlt: st && st.notiz, schritteAlt: eintragSchritte, schritteNeu: eintragSchritte.filter(x => x.id !== row.id) })
    } catch (err) { /* egal */ }
    setSaving(false); onGeaendert()
  }

  return (
    <div className="modal-overlay open" style={{ zIndex: 250 }}><div className="modal-sheet">
      <div className="modal-handle" />
      {modus === 'ansicht' ? (
        <>
          <div className="modal-title">Arbeitsschritt</div>
          <div className="proj-detail-text">{row.beschreibung}</div>
          <div className="proj-detail-meta">
            <div>👤 {personName} · {P.wochentagKurz(e.datum)} {P.fmtDatum(e.datum)}</div>
            <div>🕐 {P.hhmm(e.start_zeit)}–{P.hhmm(e.end_zeit)} · ⏱ {P.fmtMin(row.dauer_min)}{row.bereich ? ` · 📍 ${row.bereich}` : ''}</div>
            <div>{e.freigabe_status === 'freigegeben' ? '✓ Freigegeben' : e.freigabe_status === 'abgelehnt' ? '✗ Abgelehnt' : '⏳ Wartet auf Freigabe'}</div>
          </div>
          {row.fotos.length > 0
            ? <div className="proj-thumbs proj-thumbs-gross">{row.fotos.map((f, i) => (
                <div key={f.id} className="proj-thumb ok"><img src={thumbs[f.thumb_path || f.storage_path]} alt="" onClick={() => onFoto(row, i)} /><span className="proj-thumb-art">{f.art === 'vorher' ? 'Vorher' : 'Nachher'}</span></div>
              ))}</div>
            : <div className="proj-keinfoto">{row.kein_foto_grund ? `Kein Foto: ${row.kein_foto_grund}` : 'Kein Foto vorhanden.'}</div>}
          {fehler && <div className="proj-fehlerbox">{fehler}</div>}
          {kannBearbeiten && !loeschen && <button className="btn btn-primary" onClick={starten}>✏️ Bearbeiten</button>}
          {kannBearbeiten && !loeschen && <button className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={() => setLoeschen(true)}>🗑️ Schritt löschen</button>}
          {loeschen && <div className="delete-confirm"><p>Schritt samt Fotos löschen?</p><div className="delete-confirm-btns"><button disabled={saving} onClick={loeschenJa} style={{ background: 'var(--red)', color: 'white', fontWeight: 700 }}>✓ Ja, löschen</button><button onClick={() => setLoeschen(false)} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border2)' }}>Abbrechen</button></div></div>}
          <button className="btn btn-secondary" onClick={onClose}>Schließen</button>
        </>
      ) : (
        <>
          <div className="modal-title">Schritt bearbeiten</div>
          <SchrittEditor schritt={s} index={0} anzahl={1} phase={phase} bereiche={P.bereichVorschlaege(alleSchritte, P.bereicheLokal(ctx.baustelleId))} ctx={ctx} zeigeFehler={zeigeFehler}
            restMin={0} onChange={fn => setS(fn)} onFotoEntfernt={f => setEntfernt(l => [...l, f])} />
          {fehler && <div className="proj-fehlerbox">{fehler}</div>}
          <button className="btn btn-primary" disabled={saving || s.fotos.some(f => f.status === 'laedt')} onClick={speichern}>{saving ? 'Wird gespeichert …' : '✓ Speichern'}</button>
          <button className="btn btn-secondary" disabled={saving} onClick={abbrechen}>Abbrechen</button>
        </>
      )}
    </div></div>
  )
}

// ─── Projekt-Einstellungen (Admin) ───────────────────────────────────────────
export function ProjektModusAdmin({ baustelle: b, onRefresh }) {
  const verfuegbar = 'doku_pflicht' in b
  const [an, setAn] = useState(!!b.doku_pflicht)
  const [phase, setPhase] = useState(b.projekt_phase || 'rueckbau')
  const [nr, setNr] = useState(b.auftragsnr || '')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setAn(!!b.doku_pflicht); setPhase(b.projekt_phase || 'rueckbau'); setNr(b.auftragsnr || ''); setMsg('') }, [b.id, b.doku_pflicht, b.projekt_phase, b.auftragsnr])
  if (!verfuegbar) return <div className="proj-admin proj-admin-hint">🏗️ <strong>Projekt-Modus</strong> ist noch nicht freigeschaltet: Das Datenbank-Update (SQL „2026-11-projekt-modul“) muss einmal im Supabase-SQL-Editor ausgeführt werden.</div>
  async function speichere(patch) {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('baustellen').update(patch).eq('id', b.id)
    if (error) setMsg('Speichern fehlgeschlagen: ' + error.message); else { setMsg('✓ Gespeichert'); await onRefresh() }
    setSaving(false)
  }
  return (
    <div className="proj-admin">
      <div className="proj-admin-kopf">
        <div><strong>🏗️ Projekt-Modus</strong><div className="proj-admin-sub">Arbeitsschritte mit Foto sind Pflicht · eigener Projektbereich · Export</div></div>
        <button className={`proj-schalter ${an ? 'an' : ''}`} disabled={saving} onClick={() => { const neu = !an; setAn(neu); speichere({ doku_pflicht: neu, projekt_phase: phase }) }} aria-pressed={an} aria-label="Projekt-Modus"><span /></button>
      </div>
      {an && (
        <>
          <div className="proj-label">Aktuelle Phase</div>
          <div className="proj-chips">{P.PROJEKT_PHASEN.map(p => <button key={p.id} className={`proj-chip ${phase === p.id ? 'aktiv' : ''}`} onClick={() => { setPhase(p.id); speichere({ projekt_phase: p.id }) }}>{p.label}</button>)}</div>
          <div className="proj-label">Bestell-/Auftragsnummer des Kunden</div>
          <div className="proj-nr-zeile"><input value={nr} onChange={e => setNr(e.target.value)} placeholder="z. B. 4500123456" /><button className="btn btn-outline btn-sm" disabled={saving || nr.trim() === (b.auftragsnr || '')} onClick={() => speichere({ auftragsnr: nr.trim() || null })}>Speichern</button></div>
        </>
      )}
      {msg && <div className="proj-admin-msg">{msg}</div>}
    </div>
  )
}

// ─── Gastzugang (Admin): Link für Rhenus-Mitarbeiter – nur Ansicht der gespeicherten Nachweise ─────
export function ProjektGastzugang({ baustelle: b }) {
  const [st, setSt] = useState({ lade: true, links: [], fehlt: false, fehler: '' })
  const [label, setLabel] = useState('')
  const [gueltig, setGueltig] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const laden = useCallback(async () => {
    const r = await D.ladeGastlinks(b.id)
    setSt({ lade: false, links: r.data, fehlt: r.fehlt, fehler: r.error && !r.fehlt ? r.error.message : '' })
  }, [b.id])
  useEffect(() => { laden() }, [laden])
  const heuteIso = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` }
  const url = t => P.gastLinkUrl(typeof window !== 'undefined' ? window.location.origin : '', t)
  const abgelaufen = l => !!l.gueltig_bis && String(l.gueltig_bis).slice(0, 10) < heuteIso()
  async function kopieren(t) {
    try { await navigator.clipboard.writeText(url(t)); setMsg('✓ Link kopiert') } catch (e) { window.prompt('Link zum Kopieren:', url(t)) }
  }
  async function erstellen() {
    if (label.trim().length < 2) { setMsg('Bitte einen Namen angeben, z. B. „Rhenus – Einkauf“.'); return }
    setSaving(true); setMsg('')
    let bis = null
    if (gueltig) { const d = new Date(); d.setDate(d.getDate() + Number(gueltig)); bis = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    const r = await D.erstelleGastlink({ baustelleId: b.id, label, gueltigBis: bis })
    setSaving(false)
    if (r.error || !r.data) { setMsg('Link konnte nicht erstellt werden: ' + ((r.error && r.error.message) || 'unbekannter Fehler')); return }
    setLabel(''); await laden()
    await kopieren(r.data.token)
  }
  async function umschalten(l) { const r = await D.aendereGastlink(l.id, { aktiv: !l.aktiv }); if (r.error) setMsg('Fehler: ' + r.error.message); await laden() }
  async function loeschen(l) {
    if (!window.confirm(`Link „${l.label}“ endgültig löschen? Wer ihn bekommen hat, kommt danach nicht mehr rein.`)) return
    const r = await D.loescheGastlink(l.id); if (r.error) setMsg('Fehler: ' + r.error.message); await laden()
  }
  if (st.fehlt) return <div className="proj-admin proj-admin-hint">👥 <strong>Gastzugang</strong> ist noch nicht freigeschaltet: Das Datenbank-Update (SQL „2026-11-projekt-modul“) muss einmal (erneut) im Supabase-SQL-Editor ausgeführt werden.</div>
  return (
    <div className="proj-admin gast-admin">
      <div className="proj-admin-kopf"><div><strong>👥 Gastzugang für den Kunden</strong><div className="proj-admin-sub">Mitarbeiter von {b.kunde || 'Kunde'} sehen per Link nur die gespeicherten Nachweise – kein Login, nur Ansicht.</div></div></div>
      {st.fehler && <div className="proj-fehlerbox">Laden fehlgeschlagen: {st.fehler}</div>}
      {st.links.map(l => (
        <div key={l.id} className={`gast-link ${l.aktiv && !abgelaufen(l) ? '' : 'inaktiv'}`}>
          <div className="gast-link-kopf">
            <strong>{l.label}</strong>
            <span className={`proj-status ${l.aktiv && !abgelaufen(l) ? 'proj-status-freigegeben' : 'proj-status-abgelehnt'}`}>{!l.aktiv ? 'gesperrt' : abgelaufen(l) ? 'abgelaufen' : 'aktiv'}</span>
          </div>
          <div className="gast-link-meta">
            {l.aufrufe > 0 ? `${l.aufrufe}× geöffnet · zuletzt ${P.fmtDatum(String(l.zuletzt_geoeffnet).slice(0, 10))}` : 'noch nicht geöffnet'}
            {l.gueltig_bis ? ` · gültig bis ${P.fmtDatum(l.gueltig_bis)}` : ''}
          </div>
          <div className="gast-link-btns">
            <button className="btn btn-outline btn-sm" onClick={() => kopieren(l.token)}>🔗 Link kopieren</button>
            <button className="btn btn-outline btn-sm" onClick={() => umschalten(l)}>{l.aktiv ? '⏸ Sperren' : '▶ Aktivieren'}</button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)' }} onClick={() => loeschen(l)}>🗑️</button>
          </div>
        </div>
      ))}
      {!st.lade && st.links.length === 0 && <p className="text-muted text-sm" style={{ margin: '0.5rem 0' }}>Noch kein Link angelegt.</p>}
      <div className="proj-label">Neuen Link erstellen</div>
      <div className="proj-nr-zeile"><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name, z. B. Rhenus – Einkauf" maxLength={60} /></div>
      <div className="proj-nr-zeile" style={{ marginTop: 6 }}>
        <select value={gueltig} onChange={e => setGueltig(e.target.value)} aria-label="Gültigkeit">
          <option value="">Unbegrenzt gültig</option><option value="30">30 Tage gültig</option><option value="90">90 Tage gültig</option><option value="365">1 Jahr gültig</option>
        </select>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={erstellen}>{saving ? '…' : '＋ Erstellen'}</button>
      </div>
      <div className="proj-admin-sub" style={{ marginTop: 6 }}>Der Gast sieht nur Nachweise, die du im Export mit „Als Nachweis speichern“ eingefroren hast. Link weitergeben = Zugang gewähren; bei Bedarf einfach sperren.</div>
      {msg && <div className="proj-admin-msg">{msg}</div>}
    </div>
  )
}

// ─── Projektseite ────────────────────────────────────────────────────────────
export function ProjektPage({ baustelle: b, user, allUsers, stunden, isAdmin, isBuero, onBack, onErfassen, onTeam, onRefresh }) {
  const [tab, setTab] = useState('uebersicht')
  const [daten, setDaten] = useState({ lade: true, schritte: [], fehlt: false, fehler: null })
  const [nurMeine, setNurMeine] = useState(false)
  const [detail, setDetail] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [fotoLimit, setFotoLimit] = useState(60)
  const leitung = isAdmin || isBuero
  const nameVon = id => (allUsers.find(u => u.id === id) || {}).name || '—'
  const personenText = row => [nameVon(row.eintrag.user_id), ...mitglieder(row).map(m => nameVon(m.user_id))].join(', ')

  const bsStunden = useMemo(() => stunden.filter(s => s.baustelle_id === b.id && !P.istAbwesenheit(s)), [stunden, b.id])
  const sig = bsStunden.map(s => `${s.id}${s.freigabe_status[0]}`).join(',')
  // Team-Einträge: Schritt hängt an der Zeile der ersten Person, weitere_stunden_ids nennt die übrigen
  const stundeNachId = useMemo(() => new Map(bsStunden.map(x => [String(x.id), x])), [bsStunden])
  const mitglieder = row => (row.weitere_stunden_ids || []).map(id => stundeNachId.get(String(id))).filter(Boolean)
  const laden = useCallback(async () => {
    const r = await D.ladeProjektSchritte(b.id)
    setDaten({ lade: false, schritte: r.schritte, fehlt: !!r.fehlt, fehler: r.error && !r.fehlt ? r.error.message : null })
  }, [b.id])
  useEffect(() => { laden() }, [laden, sig])

  const frei = bsStunden.filter(s => s.freigabe_status === 'freigegeben')
  const brutto = frei.reduce((a, s) => a + (Number(s.dauer) || 0), 0)
  const netto = frei.reduce((a, s) => a + P.eintragNetto(s), 0)
  const offen = bsStunden.filter(s => s.freigabe_status === 'ausstehend').length
  const fotoAnzahl = daten.schritte.reduce((a, s) => a + s.fotos.length, 0)
  const bereiche = useMemo(() => P.aggregiereBereiche(daten.schritte.map(s => ({ bereich: s.bereich, dauer_min: s.dauer_min * (1 + mitglieder(s).length), fotoAnzahl: s.fotos.length }))), [daten.schritte, stundeNachId]) // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = { baustelleId: b.id, userId: user.id }

  const eintraege = useMemo(() => {
    const m = new Map()
    daten.schritte.forEach(s => { const l = m.get(s.eintrag.id) || { eintrag: s.eintrag, schritte: [] }; l.schritte.push(s); m.set(s.eintrag.id, l) })
    let liste = [...m.values()]
    liste.forEach(l => l.schritte.sort((a, c) => (a.nr || 0) - (c.nr || 0)))
    if (nurMeine) liste = liste.filter(l => l.eintrag.user_id === user.id || mitglieder(l.schritte[0]).some(m => m.user_id === user.id))
    return liste.sort((a, c) => c.eintrag.datum.localeCompare(a.eintrag.datum) || String(c.eintrag.start_zeit).localeCompare(String(a.eintrag.start_zeit)))
  }, [daten.schritte, nurMeine, user.id, stundeNachId]) // eslint-disable-line react-hooks/exhaustive-deps

  const alleFotos = useMemo(() => {
    const out = []
    eintraege.forEach(l => l.schritte.forEach(s => s.fotos.forEach(f => out.push({ f, s, e: l.eintrag }))))
    return out
  }, [eintraege])
  const fotoPfade = alleFotos.slice(0, fotoLimit).map(x => x.f.thumb_path || x.f.storage_path)
  const fotoUrls = useSignedUrls(tab === 'fotos' ? fotoPfade : [])
  const bildTexte = x => `${P.fmtDatum(x.e.datum)} · ${nameVon(x.e.user_id)} · ${x.f.art === 'vorher' ? 'Vorher' : 'Nachher'} · ${x.s.beschreibung}`

  const kannBearbeiten = row => leitung || (row.eintrag.user_id === user.id && row.eintrag.freigabe_status !== 'freigegeben')
  const detailEintrag = detail ? (eintraege.find(l => l.eintrag.id === detail.eintrag.id) || { schritte: [detail] }) : null
  const oeffneFoto = (row, i) => setViewer({ items: row.fotos.map(f => ({ path: f.storage_path, caption: `${P.fmtDatum(row.eintrag.datum)} · ${nameVon(row.eintrag.user_id)} · ${f.art === 'vorher' ? 'Vorher' : 'Nachher'} · ${row.beschreibung}` })), start: i })

  return (
    <div className="proj-seite">
      <div className="proj-kopf">
        <button className="proj-zurueck" onClick={onBack}>‹ Baustellen</button>
        <div className="proj-kopf-top"><span className="proj-karte-label">PROJEKT</span><PhasePill phase={b.projekt_phase} /></div>
        <h1>{b.name}</h1>
        <div className="proj-kopf-sub">{b.kunde}{b.adresse ? ` · ${b.adresse}` : ''}</div>
        {b.auftragsnr && <div className="proj-kopf-sub">Auftrag {b.auftragsnr}</div>}
      </div>
      <div className="page-content" style={{ paddingTop: '1rem' }}>
        <button className="btn btn-primary proj-cta" onClick={onErfassen}>⏱️ Stunden + Arbeitsschritte erfassen</button>
        {isAdmin && onTeam && <button className="btn btn-secondary proj-cta" onClick={() => onTeam(b)}>👥 Team-Stunden erfassen (mehrere Mitarbeiter)</button>}
        <div className="tab-row">
          {[['uebersicht', 'Übersicht'], ['schritte', 'Schritte'], ['fotos', `Fotos${fotoAnzahl ? ` (${fotoAnzahl})` : ''}`]].map(([id, l]) => <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{l}</button>)}
        </div>

        {daten.fehlt && <div className="proj-fehlerbox">Die Projekt-Datenbank ist noch nicht eingerichtet (SQL „2026-11-projekt-modul“ fehlt). Stunden lassen sich trotzdem wie gewohnt erfassen.</div>}
        {daten.fehler && <div className="proj-fehlerbox">Laden fehlgeschlagen: {daten.fehler}{/weitere_stunden_ids/.test(daten.fehler) ? ' – bitte das aktualisierte SQL „2026-11-projekt-modul“ im Supabase-SQL-Editor noch einmal ausführen.' : ''} <button className="proj-link" onClick={laden}>Nochmal versuchen</button></div>}

        {tab === 'uebersicht' && (
          <>
            <div className="proj-kpis">
              <div className="stat-card proj-kpi"><div className="proj-kpi-zahl">{stdKomma(brutto)}</div><div className="proj-kpi-label">Std freigegeben</div><div className="proj-kpi-sub">netto {stdKomma(netto / 60)} ohne Pause</div></div>
              <div className="stat-card proj-kpi"><div className="proj-kpi-zahl">{daten.schritte.length}</div><div className="proj-kpi-label">Arbeitsschritte</div><div className="proj-kpi-sub">{fotoAnzahl} Fotos</div></div>
              <div className="stat-card proj-kpi"><div className="proj-kpi-zahl">{offen}</div><div className="proj-kpi-label">in Prüfung</div><div className="proj-kpi-sub">warten auf Freigabe</div></div>
            </div>
            <div className="section-header" style={{ marginTop: '1rem' }}><span className="section-title">Bereiche</span></div>
            {bereiche.length === 0
              ? <p className="text-muted text-sm">Noch keine Arbeitsschritte erfasst.</p>
              : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{bereiche.map(x => (
                  <div key={x.bereich} className="proj-bereich"><div><div className="proj-bereich-name">{x.bereich}</div><div className="proj-bereich-sub">{x.schritte} Schritte · {x.fotos} Fotos</div></div><div className="proj-bereich-std">{P.fmtMin(x.min)}</div></div>
                ))}</div>}
            {leitung && (
              <>
                <a className="btn btn-secondary proj-export" href={`/projekt-export?b=${b.id}`}>📄 Zeitnachweis &amp; Dokumentation exportieren</a>
                {isAdmin && <ProjektModusAdmin baustelle={b} onRefresh={onRefresh} />}
                {isAdmin && <ProjektGastzugang baustelle={b} />}
              </>
            )}
          </>
        )}

        {tab === 'schritte' && (
          <>
            <div className="proj-chips" style={{ marginBottom: '0.75rem' }}>
              <button className={`proj-chip ${!nurMeine ? 'aktiv' : ''}`} onClick={() => setNurMeine(false)}>Alle</button>
              <button className={`proj-chip ${nurMeine ? 'aktiv' : ''}`} onClick={() => setNurMeine(true)}>Meine</button>
            </div>
            {daten.lade && <p className="text-muted text-sm">Wird geladen …</p>}
            {!daten.lade && eintraege.length === 0 && <p className="text-muted text-sm">Noch keine Arbeitsschritte{nurMeine ? ' von dir' : ''}.</p>}
            {eintraege.map(l => (
              <div key={l.eintrag.id} className="card proj-eintrag">
                <div className="proj-eintrag-kopf">
                  <div><div className="proj-eintrag-tag">{P.wochentagKurz(l.eintrag.datum)} {P.fmtDatum(l.eintrag.datum)}</div><div className="proj-eintrag-sub">{mitglieder(l.schritte[0]).length > 0 ? '👥 ' : ''}{personenText(l)} · {P.hhmm(l.eintrag.start_zeit)}–{P.hhmm(l.eintrag.end_zeit)}</div></div>
                  <span className={`proj-status proj-status-${l.eintrag.freigabe_status}`}>{l.eintrag.freigabe_status === 'freigegeben' ? '✓ Freigegeben' : l.eintrag.freigabe_status === 'abgelehnt' ? '✗ Abgelehnt' : '⏳ Ausstehend'}</span>
                </div>
                {l.schritte.map(s => (
                  <button key={s.id} className="proj-zeile" onClick={() => setDetail(s)}>
                    <span className="proj-zeile-text">{s.beschreibung}</span>
                    <span className="proj-zeile-meta"><span>⏱ {P.fmtMin(s.dauer_min)}</span>{s.fotos.length > 0 ? <span>📷 {s.fotos.length}</span> : <span className="proj-warn">{s.kein_foto_grund ? 'ohne Foto (begründet)' : '⚠ ohne Foto'}</span>}</span>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {tab === 'fotos' && (
          <>
            {!daten.lade && alleFotos.length === 0 && <p className="text-muted text-sm">Noch keine Fotos.</p>}
            <div className="proj-galerie">
              {alleFotos.slice(0, fotoLimit).map((x, i) => (
                <button key={x.f.id} className="proj-galerie-bild" onClick={() => setViewer({ items: alleFotos.map(y => ({ path: y.f.storage_path, caption: bildTexte(y) })), start: i })}>
                  {fotoUrls[x.f.thumb_path || x.f.storage_path] ? <img src={fotoUrls[x.f.thumb_path || x.f.storage_path]} alt={x.s.beschreibung} loading="lazy" /> : <span>📷</span>}
                  <em>{x.f.art === 'vorher' ? 'Vorher' : 'Nachher'}</em>
                </button>
              ))}
            </div>
            {alleFotos.length > fotoLimit && <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setFotoLimit(n => n + 60)}>Mehr Fotos laden ({alleFotos.length - fotoLimit} weitere)</button>}
          </>
        )}
      </div>

      {detail && detailEintrag && (
        <SchrittSheet row={detail} eintragSchritte={detailEintrag.schritte} kannBearbeiten={kannBearbeiten(detail)} personName={personenText(detail)}
          phase={detail.phase || b.projekt_phase} ctx={ctx} alleSchritte={daten.schritte}
          onClose={() => setDetail(null)} onGeaendert={async () => { setDetail(null); await laden(); await onRefresh() }} onFoto={oeffneFoto} />
      )}
      {viewer && <FotoViewer items={viewer.items} start={viewer.start} onClose={() => setViewer(null)} />}
    </div>
  )
}
