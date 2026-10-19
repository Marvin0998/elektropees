import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const FOTO_SCHRITTE = [
  {
    typ: 'schrank_komplett',
    titel: 'Zählerschrank komplett',
    hinweis: 'Bitte die Tür öffnen und den gesamten Schrank fotografieren.'
  },
  {
    typ: 'zaehlerplaetze_frontal',
    titel: 'Zählerplätze frontal',
    hinweis: 'Direkt von vorne auf die Zähler fotografieren.'
  },
  {
    typ: 'bereich_unterhalb',
    titel: 'Bereich unterhalb der Zähler',
    hinweis: 'Den Platz unterhalb der Zählerplätze zeigen.'
  },
  {
    typ: 'bereich_oberhalb',
    titel: 'Bereich oberhalb der Zähler',
    hinweis: 'Den Platz oberhalb der Zählerplätze zeigen.'
  }
]

export default function ZaehlerschrankPruefung() {
  const router = useRouter()
  const { token } = router.query

  const [schritt, setSchritt] = useState(0) // 0 = Formular, 1..4 = Fotos, 5 = fertig
  const [speichern, setSpeichern] = useState(false)
  const [fehler, setFehler] = useState('')
  const [pruefungId, setPruefungId] = useState(null)
  const [hochgeladen, setHochgeladen] = useState({})

  const [form, setForm] = useState({
    vorname: '', nachname: '', strasse: '', hausnummer: '', plz: '', ort: '',
    telefon: '', email: '', eingereicht_von_firma: '',
    wp_hersteller: '', wp_modell: '', wp_leistung_kw: '', wp_heizstab: true,
    wp_schnittstelle: '', notiz: ''
  })

  function update(feld, wert) {
    setForm(f => ({ ...f, [feld]: wert }))
  }

  async function handleFormAbsenden() {
    setFehler('')
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setFehler('Bitte Vor- und Nachname des Kunden angeben.')
      return
    }
    if (!token) {
      setFehler('Kein gültiger Link. Bitte den Zugangslink erneut öffnen.')
      return
    }
    setSpeichern(true)
    // ID selbst erzeugen statt sie per RETURNING zurückzulesen: anonyme
    // Besucher dürfen laut RLS zwar eine Zeile einfügen, aber nicht lesen
    // (nur admin/büro dürfen zs_pruefungen lesen). Würde man .select()
    // anhängen, verlangt Postgres zusätzlich zur INSERT- auch die
    // SELECT-Policy auf der zurückgegebenen Zeile — die für anon fehlt —
    // und lehnt den kompletten Insert mit derselben RLS-Fehlermeldung ab.
    const neueId = crypto.randomUUID()
    const { error } = await supabase.from('zs_pruefungen').insert([{
      id: neueId,
      link_token: token,
      vorname: form.vorname.trim(),
      nachname: form.nachname.trim(),
      strasse: form.strasse.trim() || null,
      hausnummer: form.hausnummer.trim() || null,
      plz: form.plz.trim() || null,
      ort: form.ort.trim() || null,
      telefon: form.telefon.trim() || null,
      email: form.email.trim() || null,
      eingereicht_von_firma: form.eingereicht_von_firma.trim() || null,
      wp_hersteller: form.wp_hersteller.trim() || null,
      wp_modell: form.wp_modell.trim() || null,
      wp_leistung_kw: form.wp_leistung_kw ? parseFloat(form.wp_leistung_kw) : null,
      wp_heizstab: form.wp_heizstab,
      wp_schnittstelle: form.wp_schnittstelle.trim() || null,
      notiz: form.notiz.trim() || null
    }])

    setSpeichern(false)
    if (error) {
      setFehler('Fehler beim Speichern: ' + error.message + ' — Bitte prüfe, ob der Link noch aktiv ist.')
      return
    }
    setPruefungId(neueId)
    setSchritt(1)
  }

  async function handleFotoUpload(file, typ) {
    if (!file || !pruefungId) return
    setFehler('')
    setSpeichern(true)
    const ext = file.name.split('.').pop()
    const path = `${pruefungId}/${typ}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('zs-fotos').upload(path, file)
    if (upErr) {
      setSpeichern(false)
      setFehler('Foto-Upload fehlgeschlagen: ' + upErr.message)
      return
    }
    const { error: dbErr } = await supabase.from('zs_fotos').insert([{
      pruefung_id: pruefungId, foto_typ: typ, storage_path: path
    }])
    setSpeichern(false)
    if (dbErr) {
      setFehler('Foto konnte nicht zugeordnet werden: ' + dbErr.message)
      return
    }
    setHochgeladen(h => ({ ...h, [typ]: true }))
  }

  function naechsterSchritt() {
    if (schritt < FOTO_SCHRITTE.length) setSchritt(schritt + 1)
    else setSchritt(FOTO_SCHRITTE.length + 1)
  }

  // ── Formular-Schritt ──────────────────────────────────────────────────────
  if (schritt === 0) {
    return (
      <div className="login-page">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Elektro Pees" style={{ height: '70px', width: 'auto', display: 'block', margin: '0 auto 1rem' }} onError={e=>{e.target.style.display='none'}}/>
          <h2 style={{ color: '#0A0A44' }}>Zählerschrank-Prüfung</h2>
          <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Kunden- und Anlagendaten eintragen, danach Fotos hochladen
          </p>
        </div>
        <div className="login-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="form-group"><label>Vorname Kunde *</label><input value={form.vorname} onChange={e=>update('vorname', e.target.value)} /></div>
          <div className="form-group"><label>Nachname Kunde *</label><input value={form.nachname} onChange={e=>update('nachname', e.target.value)} /></div>
          <div className="form-group"><label>Straße</label><input value={form.strasse} onChange={e=>update('strasse', e.target.value)} /></div>
          <div className="form-group"><label>Hausnummer</label><input value={form.hausnummer} onChange={e=>update('hausnummer', e.target.value)} /></div>
          <div className="form-group"><label>PLZ</label><input value={form.plz} onChange={e=>update('plz', e.target.value)} /></div>
          <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>update('ort', e.target.value)} /></div>
          <div className="form-group"><label>Telefon</label><input value={form.telefon} onChange={e=>update('telefon', e.target.value)} /></div>
          <div className="form-group"><label>E-Mail</label><input value={form.email} onChange={e=>update('email', e.target.value)} /></div>
          <div className="form-group"><label>Deine Firma</label><input value={form.eingereicht_von_firma} onChange={e=>update('eingereicht_von_firma', e.target.value)} placeholder="z.B. Mustermann Heizungsbau" /></div>

          <div style={{ borderTop: '1px solid var(--border2)', margin: '1rem 0 0.75rem', paddingTop: '0.75rem', fontWeight: 600, color: '#0A0A44', fontSize: '0.85rem' }}>
            Wärmepumpe (laut Datenblatt)
          </div>
          <div className="form-group"><label>Hersteller</label><input value={form.wp_hersteller} onChange={e=>update('wp_hersteller', e.target.value)} /></div>
          <div className="form-group"><label>Modell</label><input value={form.wp_modell} onChange={e=>update('wp_modell', e.target.value)} /></div>
          <div className="form-group"><label>Leistung (kW)</label><input type="number" step="0.1" value={form.wp_leistung_kw} onChange={e=>update('wp_leistung_kw', e.target.value)} /></div>
          <div className="form-group">
            <label>Heizstab?</label>
            <select value={form.wp_heizstab ? 'ja' : 'nein'} onChange={e=>update('wp_heizstab', e.target.value === 'ja')}>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </div>
          <div className="form-group"><label>Schnittstelle (optional)</label><input value={form.wp_schnittstelle} onChange={e=>update('wp_schnittstelle', e.target.value)} /></div>
          <div className="form-group"><label>Kommentar / Sonstiges</label><textarea value={form.notiz} onChange={e=>update('notiz', e.target.value)} rows={3} /></div>

          {fehler && <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{fehler}</div>}

          <button className="btn btn-primary" onClick={handleFormAbsenden} disabled={speichern} style={{ width: '100%' }}>
            {speichern ? 'Wird gespeichert...' : 'Weiter zu den Fotos →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Fertig ─────────────────────────────────────────────────────────────────
  if (schritt > FOTO_SCHRITTE.length) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h2 style={{ color: '#0A0A44' }}>Vielen Dank!</h2>
          <p style={{ color: '#718096', marginTop: '0.5rem' }}>
            Die Zählerschrank-Prüfung für {form.vorname} {form.nachname} wurde übermittelt.
            Elektro Pees prüft die Fotos und meldet sich bei Bedarf.
          </p>
        </div>
      </div>
    )
  }

  // ── Foto-Schritte ────────────────────────────────────────────────────────
  const aktuell = FOTO_SCHRITTE[schritt - 1]
  const istHochgeladen = !!hochgeladen[aktuell.typ]

  return (
    <div className="login-page">
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" alt="Elektro Pees" style={{ height: '60px', width: 'auto', display: 'block', margin: '0 auto 0.75rem' }} onError={e=>{e.target.style.display='none'}}/>
        <div style={{ color: '#718096', fontSize: '0.78rem' }}>Foto {schritt} von {FOTO_SCHRITTE.length}</div>
      </div>
      <div className="login-card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <h3 style={{ color: '#0A0A44' }}>{aktuell.titel}</h3>
        <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.4rem', marginBottom: '1.25rem' }}>{aktuell.hinweis}</p>

        {istHochgeladen ? (
          <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 10, padding: '1rem', marginBottom: '1rem', color: '#276749', fontWeight: 600 }}>
            ✓ Foto hochgeladen
          </div>
        ) : (
          <label className="btn btn-outline" style={{ display: 'inline-block', cursor: 'pointer', marginBottom: '1rem' }}>
            📷 Foto aufnehmen / auswählen
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => handleFotoUpload(e.target.files[0], aktuell.typ)} disabled={speichern} />
          </label>
        )}

        {fehler && <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{fehler}</div>}

        <button className="btn btn-primary" onClick={naechsterSchritt} disabled={!istHochgeladen} style={{ width: '100%' }}>
          {schritt === FOTO_SCHRITTE.length ? 'Abschließen ✓' : 'Weiter →'}
        </button>
      </div>
    </div>
  )
}
