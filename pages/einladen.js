import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Einladen() {
  const router = useRouter()
  const { token } = router.query
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    supabase.from('einladungen').select('*').eq('token', token).eq('benutzt', false).single()
      .then(({ data }) => { setInvite(data); setLoading(false) })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }
    if (password !== password2) { setError('Passwörter stimmen nicht überein.'); return }
    setSaving(true)
    const { error: signUpErr } = await supabase.auth.signUp({ email: invite.email, password })
    if (signUpErr) { setError('Fehler: ' + signUpErr.message); setSaving(false); return }
    const { error: redeemErr } = await supabase.rpc('redeem_invite', { p_token: token })
    if (redeemErr) { setError('Fehler beim Aktivieren: ' + redeemErr.message); setSaving(false); return }
    setDone(true)
    setSaving(false)
    setTimeout(() => { router.push('/') }, 2000)
  }

  if (loading) return <div className="loading">Wird geladen...</div>

  if (!invite) return (
    <div className="login-page">
      <div className="login-card">
        <h2 style={{ color: '#0A0A44', textAlign: 'center' }}>Einladung ungültig</h2>
        <p style={{ textAlign: 'center', color: '#718096', marginTop: '0.75rem' }}>
          Dieser Link wurde bereits verwendet oder existiert nicht. Bitte wende dich an Elektro Pees für einen neuen Einladungslink.
        </p>
      </div>
    </div>
  )

  if (done) return (
    <div className="login-page">
      <div className="login-card">
        <h2 style={{ color: '#0A0A44', textAlign: 'center' }}>✓ Konto aktiviert</h2>
        <p style={{ textAlign: 'center', color: '#718096', marginTop: '0.75rem' }}>
          Du wirst gleich zum Login weitergeleitet...
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
        <h2 style={{ color: '#0A0A44', fontSize: '1.2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Willkommen, {invite.name}</h2>
        <p style={{ textAlign: 'center', color: '#718096', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Vergib ein Passwort, um deinen Zugang zur Wärmepumpen-Anmeldung zu aktivieren.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" required />
          </div>
          <div className="form-group">
            <label>Passwort bestätigen</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Wird aktiviert...' : '✓ Konto aktivieren'}
          </button>
        </form>
      </div>
    </div>
  )
}
