import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Einladen() {
  const router = useRouter()
  const { token } = router.query
  const [status, setStatus] = useState('lädt') // lädt | fehler | fertig
  const [debugMsg, setDebugMsg] = useState('')

  useEffect(() => {
    if (!token) return
    login()
  }, [token])

  async function login() {
    const { data: inv, error: invErr } = await supabase.from('einladungen').select('*').eq('token', token).eq('aktiv', true).single()
    if (invErr || !inv) { setStatus('fehler'); setDebugMsg('Einladung nicht gefunden: ' + (invErr?.message||'')); return }

    // Schritt 1: Existiert der Account schon? Versuch Login.
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: inv.email, password: inv.passwort })

    let session = signInData?.session

    if (!session) {
      // Schritt 2: Account existiert noch nicht -> anlegen
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: inv.email, password: inv.passwort })
      if (signUpErr) { setStatus('fehler'); setDebugMsg('signUp Fehler: ' + signUpErr.message); return }

      session = signUpData?.session

      if (!session) {
        // Manche Supabase-Konfigurationen liefern bei signUp keine Session direkt zurück -> explizit nachfassen
        const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({ email: inv.email, password: inv.passwort })
        if (retryErr) { setStatus('fehler'); setDebugMsg('Login nach Erstellung fehlgeschlagen: ' + retryErr.message); return }
        session = retryData?.session
      }
    }

    if (!session) { setStatus('fehler'); setDebugMsg('Keine Session zustande gekommen.'); return }

    // Sicherstellen, dass der Client die Session wirklich aktiv gesetzt hat, bevor wir die Funktion aufrufen
    await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })

    const { error: redeemErr } = await supabase.rpc('redeem_invite', { p_token: token })
    if (redeemErr) { setStatus('fehler'); setDebugMsg('redeem_invite Fehler: ' + redeemErr.message); return }

    setStatus('fertig')
    router.push('/')
  }

  if (status === 'fehler') return (
    <div className="login-page">
      <div className="login-card">
        <h2 style={{ color: '#0A0A44', textAlign: 'center' }}>Zugang nicht möglich</h2>
        <p style={{ textAlign: 'center', color: '#718096', marginTop: '0.75rem' }}>
          Dieser Link ist ungültig oder wurde gesperrt. Bitte wende dich an Elektro Pees für einen neuen Zugangslink.
        </p>
        {debugMsg && <p style={{ textAlign: 'center', color: '#cbd5e0', marginTop: '0.75rem', fontSize: '0.72rem' }}>{debugMsg}</p>}
      </div>
    </div>
  )

  return (
    <div className="login-page">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/logo.png" alt="Elektro Pees" style={{ height: '90px', width: 'auto', display: 'block', margin: '0 auto 1.25rem' }} onError={e=>{e.target.style.display='none'}}/>
      </div>
      <div className="login-card">
        <p style={{ textAlign: 'center', color: '#718096' }}>Zugang wird eingerichtet...</p>
      </div>
    </div>
  )
}
