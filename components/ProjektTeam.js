// Stunden für mehrere Personen gleichzeitig anlegen (Chef oder Monteur) – Schritt für Schritt:
// 1 Personen wählen · 2 Datum + Uhrzeit · 3 Arbeiten beschreiben · 4 Fotos hochladen · 5 Abschließen.
// Je Person entsteht eine Stundenzeile (gleiche Zeiten); Arbeitsschritte + Fotos werden einmal für alle gespeichert.
// Chef: beliebige Personen, auf Wunsch direkt freigegeben. Monteur: er selbst ist immer dabei (seine Zeile trägt die Doku),
// Kollegen kommen dazu; alles bleibt „ausstehend“ bis der Chef freigibt; Abgleich gegen vorhandene Stunden.
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as P from '../lib/projekt'
import * as D from '../lib/projektdaten'
import { ProjektSchrittForm, useDokuEntwurf } from './Projekt'

const SCHRITT_NAMEN = ['Personen', 'Zeit', 'Arbeiten', 'Fotos', 'Abschluss']
const ROLLEN = { admin: 'Chef', buero: 'Büro', mitarbeiter: 'Monteur', azubi: 'Azubi' }
function heute() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` }

export default function TeamErfassung({ baustelle: b, user, allUsers, isAdmin = false, onClose, onSaved }) {
  const monteur = !isAdmin
  const meineId = String(user.id)
  const kandidaten = useMemo(() => P.teamKandidaten(allUsers, { nurMonteure: monteur }), [allUsers, monteur])
  // Monteur: immer selbst dabei und an erster Stelle (seine Zeile trägt die Arbeitsschritte)
  const mitSelbst = liste => (monteur ? [meineId, ...liste.filter(x => x !== meineId)] : liste)
  const gueltig = id => kandidaten.some(u => String(u.id) === String(id))
  const [schritt, setSchritt] = useState(0)
  const [team, setTeam] = useState(() => (isAdmin ? [] : [String(user.id)]))
  const [datum, setDatum] = useState(heute())
  const [start, setStart] = useState('07:30'); const [end, setEnd] = useState('17:00'); const [pause, setPause] = useState(45)
  const [schritte, setSchritte] = useState([])
  const [zusatz, setZusatz] = useState('')
  const [direkt, setDirekt] = useState(true)
  const [zeigeFehler, setZeigeFehler] = useState(false)
  const [fehlerListe, setFehlerListe] = useState([])
  const [pruefe, setPruefe] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fertig, setFertig] = useState(null)
  const merk = useMemo(() => mitSelbst(P.teamErinnern(user.id).map(String).filter(gueltig)), [kandidaten]) // eslint-disable-line react-hooks/exhaustive-deps

  const z = P.pruefeTeamZeit({ mitglieder: team, datum, start, end, pause })
  const dauer = P.dauerStunden(start, end)
  const netto = z.netto
  const fotosLaden = schritte.some(s => s.fotos.some(f => f.status === 'laedt'))
  const ctx = { baustelleId: b.id, userId: user.id }
  const namen = P.teamNamen(allUsers, team)
  const istFreitag = datum && new Date(`${datum}T12:00:00`).getDay() === 5

  // Entwurf: überlebt Schließen/Funkloch (nur hochgeladene Fotos werden gemerkt)
  const entwurf = useDokuEntwurf({
    aktiv: !fertig, userId: `${user.id}_team`, baustelleId: b.id,
    snapshot: { form: { team, datum, start, end, pause, direkt, schritt }, zusatz, schritte },
    onRestore: d => {
      const f = d.form || {}
      if (Array.isArray(f.team)) setTeam(mitSelbst(f.team.map(String).filter(gueltig)))
      if (f.datum) setDatum(f.datum); if (f.start) setStart(f.start); if (f.end) setEnd(f.end)
      if (f.pause != null) setPause(f.pause); if (f.direkt != null) setDirekt(!!f.direkt)
      if (Number.isInteger(f.schritt)) setSchritt(Math.min(4, Math.max(0, f.schritt)))
      setZusatz(d.zusatz || ''); setSchritte(d.schritte)
    },
    onInit: () => {},
  })
  async function entwurfVerwerfen() {
    await D.loescheFotoDateien(schritte.flatMap(s => s.fotos.filter(f => f.status === 'ok' && f.neu)))
    entwurf.leeren(); setSchritte([]); setZusatz(''); setSchritt(0); setTeam(mitSelbst([])); setFehlerListe([]); setZeigeFehler(false)
  }

  // Eine angezeigte Fehlermeldung verschwindet, sobald die Eingabe geändert wird (sonst bleibt sie nach der Korrektur stehen)
  useEffect(() => { setFehlerListe([]) }, [team, datum, start, end, pause, schritte])

  const nachOben = () => setTimeout(() => { const el = document.getElementById('team-fehler'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 60)
  function fehlerZeigen(liste) { setFehlerListe(liste); nachOben() }

  async function konflikte() {
    if (monteur) {
      // Monteur sieht fremde Stunden nicht direkt: die Datenbank meldet nur, WER sich überschneidet
      const rr = await D.ladeKonflikteRpc(supabase, { userIds: team, datum, start, end })
      if (rr.error) return { fehler: ['Abgleich mit den vorhandenen Stunden nicht möglich: ' + rr.error.message + (/konflikte|function|schema cache/i.test(rr.error.message || '') ? ' – das SQL „2026-11-projekt-modul“ muss (erneut) im Supabase-SQL-Editor ausgeführt werden.' : '')] }
      return { fehler: rr.data.map(id => `${id === meineId ? 'Du hast' : (P.teamNamen(allUsers, [id])[0] || 'Eine Person') + ' hat'} am ${P.fmtDatum(datum)} schon Stunden eingetragen, die sich mit ${start}–${end} überschneiden.`) }
    }
    const r = await D.ladeTagesEintraege(supabase, { userIds: team, datum })
    if (r.error) return { fehler: ['Prüfung auf doppelte Einträge fehlgeschlagen: ' + r.error.message] }
    const k = P.ueberschneidungen(start, end, r.data)
    return { fehler: k.map(e => `${P.teamNamen(allUsers, [e.user_id])[0] || 'Person'} hat am ${P.fmtDatum(datum)} schon Stunden von ${P.hhmm(e.start_zeit)} bis ${P.hhmm(e.end_zeit)} eingetragen.`) }
  }

  async function weiter() {
    setFehlerListe([])
    if (schritt === 0) {
      if (!team.length) { fehlerZeigen(['Bitte mindestens eine Person auswählen.']); return }
      setSchritt(1); return
    }
    if (schritt === 1) {
      if (!z.ok) { fehlerZeigen(z.fehler); return }
      setPruefe(true); const k = await konflikte(); setPruefe(false)
      if (k.fehler.length) { fehlerZeigen(k.fehler); return }
      if (!schritte.length) setSchritte([P.neuerSchritt(P.vorschlagMinuten(netto, []))])
      setZeigeFehler(false); setSchritt(2); return
    }
    if (schritt === 2) {
      const p = P.pruefeSchritte(schritte, netto, { teil: 'text' })
      if (!p.ok) { setZeigeFehler(true); fehlerZeigen(p.fehler); return }
      setZeigeFehler(false); setSchritt(3); return
    }
    if (schritt === 3) {
      const p = P.pruefeSchritte(schritte, netto, { teil: 'fotos' })
      if (!p.ok) { setZeigeFehler(true); fehlerZeigen(p.fehler); return }
      setZeigeFehler(false); setSchritt(4) }
  }
  function zurueck() { setFehlerListe([]); setZeigeFehler(false); setSchritt(s => Math.max(0, s - 1)) }

  async function abschliessen() {
    setFehlerListe([])
    const p = P.pruefeSchritte(schritte, netto)
    if (!z.ok || !p.ok) { fehlerZeigen([...z.fehler, ...p.fehler]); return }
    setSaving(true)
    const k = await konflikte()
    if (k.fehler.length) { setSaving(false); fehlerZeigen(k.fehler); return }
    const r = await D.speichereTeamDoku(supabase, { mitglieder: team, baustelleId: b.id, datum, start, end, dauer, pause: Number(pause) || 0, notizExtra: zusatz, schritte, phase: b.projekt_phase, status: isAdmin && direkt ? 'freigegeben' : 'ausstehend', erfasserId: user.id })
    if (!r.ok) {
      setSaving(false)
      const rls = /row-level security|permission|erfasst_von|schema cache/i.test(r.fehler || '')
      fehlerZeigen([`Nicht gespeichert: ${r.fehler}`, rls ? 'Es fehlt die Berechtigung in der Datenbank. Bitte das SQL „2026-11-projekt-modul“ im Supabase-SQL-Editor (erneut) ausführen.' : (r.tabelleFehlt ? 'Die Projekt-Datenbank ist noch nicht (vollständig) eingerichtet – SQL „2026-11-projekt-modul“ (erneut) ausführen.' : 'Deine Eingaben und Fotos bleiben erhalten – bitte nochmal versuchen.')])
      return
    }
    P.teamMerken(user.id, team)
    schritte.forEach(s => P.bereichMerken(b.id, s.bereich))
    const fotos = schritte.reduce((a, s) => a + s.fotos.filter(f => f.status === 'ok').length, 0)
    entwurf.loeschen()
    try { await onSaved() } catch (e) { /* Anzeige aktualisiert sich beim nächsten Laden */ }
    setFertig({ personen: team.length, schritte: schritte.length, fotos, std: dauer * team.length, freigegeben: isAdmin && direkt, datum })
    setSaving(false)
  }
  function nochEiner() {
    setFertig(null); setSchritte([]); setZusatz(''); setFehlerListe([]); setZeigeFehler(false)
    setDatum(P.addTage(datum, 1)); setSchritt(1)
  }

  const addMitglied = id => { if (id && !team.includes(id)) setTeam(t => [...t, id]) }
  const alleNochFrei = kandidaten.filter(u => !team.includes(String(u.id)))
  const summe = schritte.reduce((a, s) => a + (Number(s.min) || 0), 0)

  return (
    <div className="modal-overlay open" style={{ zIndex: 220 }}><div className="modal-sheet team-sheet">
      <div className="modal-handle" />
      <div className="modal-title">👥 Stunden für mehrere erfassen</div>
      <div className="team-bs">{b.name}</div>

      {fertig ? (
        <>
          <div className="team-ok">
            <div className="team-ok-gross">✓ Gespeichert</div>
            <div>{fertig.personen} {fertig.personen === 1 ? 'Person' : 'Personen'} · {P.fmtDatum(fertig.datum)} · zusammen {String(fertig.std.toFixed(2)).replace('.', ',')} Std</div>
            <div>{fertig.schritte} Arbeitsschritte · {fertig.fotos} Fotos</div>
            <div className="team-ok-klein">{fertig.freigegeben ? 'Die Stunden sind direkt freigegeben.' : 'Die Stunden warten auf Freigabe.'}</div>
          </div>
          <button className="btn btn-primary" onClick={nochEiner}>＋ Weiteren Tag für dieselben Personen erfassen</button>
          <button className="btn btn-secondary" onClick={onClose}>Fertig</button>
        </>
      ) : (
        <>
          <div className="team-steps" role="list">
            {SCHRITT_NAMEN.map((n, i) => (
              <button key={n} role="listitem" className={`team-step ${i === schritt ? 'aktiv' : ''} ${i < schritt ? 'fertig' : ''}`} disabled={i > schritt} onClick={() => { setFehlerListe([]); setSchritt(i) }}>
                <span>{i < schritt ? '✓' : i + 1}</span>{n}
              </button>
            ))}
          </div>
          {entwurf.wiederhergestellt && <div className="proj-entwurf">📝 Entwurf wiederhergestellt — Eingaben und Fotos sind noch da. <button onClick={entwurfVerwerfen}>Verwerfen</button></div>}

          {schritt === 0 && (
            <>
              <div className="proj-label">Wer hat gearbeitet?</div>
              <select className="team-select" value="" onChange={e => addMitglied(e.target.value)} aria-label="Mitarbeiter hinzufügen">
                <option value="">＋ Mitarbeiter auswählen …</option>
                {alleNochFrei.map(u => <option key={u.id} value={String(u.id)}>{u.name} · {ROLLEN[u.role] || u.role}</option>)}
              </select>
              {team.length > 0 && (
                <div className="proj-chips team-chips">
                  {team.map(id => (monteur && id === meineId)
                    ? <button key={id} className="proj-chip aktiv" aria-label="Du bist immer dabei" title="Du bist immer dabei" style={{ cursor: 'default' }}>{P.teamNamen(allUsers, [id])[0]} · du</button>
                    : <button key={id} className="proj-chip aktiv" onClick={() => setTeam(t => t.filter(x => x !== id))} aria-label="Entfernen">{P.teamNamen(allUsers, [id])[0]} ✕</button>)}
                </div>
              )}
              {merk.length > (monteur ? 1 : 0) && merk.join() !== team.join() && (
                <button className="proj-link" onClick={() => setTeam(merk)}>↺ Letzte Auswahl übernehmen ({P.teamNamen(allUsers, merk).join(', ')})</button>
              )}
              <div className="team-info">{monteur
                ? 'Du bist dabei. Füge Kollegen hinzu, die dieselbe Arbeit gemacht haben: Jeder bekommt einen eigenen Stundeneintrag mit denselben Zeiten, Beschreibung und Fotos erfasst du einmal für alle. Der Chef gibt alles frei. Wer etwas anderes gemacht hat, legt seinen eigenen Eintrag an.'
                : 'Jede Person bekommt eine eigene Stundenzeile mit denselben Zeiten. Beschreibung und Fotos erfasst du danach einmal für alle.'}</div>
            </>
          )}

          {schritt === 1 && (
            <>
              <div className="form-group"><label>Datum</label><input type="date" value={datum} onChange={e => setDatum(e.target.value)} /></div>
              <div className="form-row">
                <div className="form-group"><label>Von</label><input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
                <div className="form-group"><label>Bis</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
              </div>
              <div className="form-group"><label>Pause (Min, bezahlt)</label><input inputMode="numeric" value={pause} onChange={e => setPause(String(e.target.value).replace(/\D/g, '').slice(0, 3))} /></div>
              {istFreitag && <div className="team-freitag">🟡 <strong>Freitag</strong> — wird als Überstunden gewertet</div>}
              <div className="calc-box">
                <div>
                  <div className="calc-label">Arbeitszeit je Person (inkl. {Number(pause) || 0} Min Pause)</div>
                  <div className="calc-note">Pause ist bezahlt und wird mitgerechnet · {team.length} {team.length === 1 ? 'Person' : 'Personen'}: {String((dauer * team.length).toFixed(2)).replace('.', ',')} Std</div>
                </div>
                <div className="calc-value">{dauer.toFixed(2)} Std</div>
              </div>
              <div className="team-info">Personen: {P.namenListe(namen)}</div>
            </>
          )}

          {schritt === 2 && (
            <ProjektSchrittForm modus="text" schritte={schritte} setSchritte={setSchritte} netto={netto} brutto={z.brutto} pause={Number(pause) || 0} phase={b.projekt_phase} ctx={ctx} zeigeFehler={zeigeFehler}
              info={`Was wurde gemacht? Gilt für alle ${team.length} ${team.length === 1 ? 'Person' : 'Personen'} – die Dauer ist die Arbeitszeit je Person. Zusammen müssen die Schritte die Arbeitszeit abdecken.`}
              personenText={`${team.length} ${team.length === 1 ? 'Person' : 'Personen'}`} />
          )}

          {schritt === 3 && (
            <>
              <div className="proj-form-titel">📷 Fotos hochladen <span className="proj-pflicht">Pflicht</span></div>
              <div className="proj-form-info">Pro Arbeitsschritt mindestens ein Foto (vorher/nachher) – oder „Kein Foto möglich“ mit Grund.</div>
              <ProjektSchrittForm modus="fotos" schritte={schritte} setSchritte={setSchritte} netto={netto} brutto={z.brutto} pause={Number(pause) || 0} phase={b.projekt_phase} ctx={ctx} zeigeFehler={zeigeFehler} />
            </>
          )}

          {schritt === 4 && (
            <>
              <div className="team-zus">
                <div className="team-zus-zeile"><span>Datum</span><strong>{P.wochentagKurz(datum)} {P.fmtDatum(datum)}</strong></div>
                <div className="team-zus-zeile"><span>Zeit</span><strong>{start}–{end} · Pause {Number(pause) || 0} Min</strong></div>
                <div className="team-zus-zeile"><span>Personen</span><strong>{P.namenListe(namen)}</strong></div>
                <div className="team-zus-zeile"><span>Stunden</span><strong>{String(dauer.toFixed(2)).replace('.', ',')} Std je Person · {String((dauer * team.length).toFixed(2)).replace('.', ',')} Std gesamt</strong></div>
              </div>
              <div className="proj-label">Arbeiten ({P.fmtMin(summe)} je Person)</div>
              {schritte.map((s, i) => (
                <div key={s.key} className="team-zus-schritt">
                  <div>{i + 1}. {P.schrittText(s)}</div>
                  <div className="team-zus-meta">⏱ {P.fmtMin(s.min)} · {s.fotos.filter(f => f.status === 'ok').length > 0 ? `📷 ${s.fotos.filter(f => f.status === 'ok').length}` : `kein Foto: ${s.keinFotoGrund}`}</div>
                </div>
              ))}
              <div className="form-group" style={{ marginTop: '0.75rem' }}><label>Zusätzliche Notiz (optional)</label><textarea value={zusatz} onChange={e => setZusatz(e.target.value)} placeholder="z. B. Material fehlt, nächste Schritte …" /></div>
              {isAdmin
                ? <label className="proj-check"><input type="checkbox" checked={direkt} onChange={e => setDirekt(e.target.checked)} /> Direkt freigeben (sonst warten die Stunden auf deine Freigabe)</label>
                : <div className="team-info">Die Stunden aller Personen warten auf die Freigabe durch den Chef. Die Kollegen sehen bei sich „von {P.teamNamen(allUsers, [meineId])[0] || 'dir'} eingetragen“ und können den Eintrag löschen, falls etwas nicht stimmt.</div>}
            </>
          )}

          {fehlerListe.length > 0 && <div id="team-fehler" className="proj-fehlerbox"><ul>{fehlerListe.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}

          <div className="team-nav">
            {schritt > 0 ? <button className="btn btn-secondary" onClick={zurueck} disabled={saving}>‹ Zurück</button> : <span />}
            {schritt < 4
              ? <button className="btn btn-primary" onClick={weiter} disabled={pruefe || fotosLaden}>{pruefe ? 'Prüfe …' : fotosLaden ? 'Fotos laden hoch …' : 'Weiter ›'}</button>
              : <button className="btn btn-primary" onClick={abschliessen} disabled={saving || fotosLaden}>{saving ? 'Wird gespeichert …' : fotosLaden ? 'Fotos laden hoch …' : '✓ Abschließen'}</button>}
          </div>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Abbrechen</button>
          <div className="team-info" style={{ textAlign: 'center' }}>Dein Entwurf bleibt gespeichert, falls du abbrichst.</div>
        </>
      )}
    </div></div>
  )
}
