import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Einladen() {
  const router = useRouter()
  const { token } = router.query
  const [status, setStatus] = useState('lädt') // lädt | fehler | fertig

  useEffect(() => {
    if (!token) return
    login()
  }, [token])

  async function login() {
    const { data: inv } = await supabase.from('einladungen').select('*').eq('token', token).eq('aktiv', true).single()
    if (!inv) { setStatus('fehler'); return }

    // Erst versuchen, sich mit dem hinterlegten Zugang anzumelden (falls schon einmal erstellt)
    let { error: signInErr } = await supabase.auth.signInWithPassword({ email: inv.email, password: inv.passwort })

    if (signInErr) {
      // Existiert noch nicht -> Zugang jetzt automatisch anlegen
      const { error: signUpErr } = await supabase.auth.signUp({ email: inv.email, password: inv.passwort })
      if (signUpErr) { setStatus('fehler'); return }
      // Nach signUp nochmal einloggen, um sicherzustellen, dass eine Session besteht
      await supabase.auth.signInWithPassword({ email: inv.email, password: inv.passwort })
    }

    const { error: redeemErr } = await supabase.rpc('redeem_invite', { p_token: token })
    if (redeemErr) { setStatus('fehler'); return }

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
