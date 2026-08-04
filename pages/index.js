import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const IconHome = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconHardHat = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z"/><path d="M12 2a9 9 0 019 9H3a9 9 0 019-9z"/></svg>
const IconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconStar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
const IconCounter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/></svg>
const IconBuch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>
const IconKalender = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconSun = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>

function formatDate(d) { if(!d)return'—'; const [y,m,day]=d.split('-'); return `${day}.${m}.${y}` }
function getWeekStart(d) { const day=new Date(d); const dow=day.getDay(); const diff=dow===0?-6:1-dow; day.setDate(day.getDate()+diff); day.setHours(0,0,0,0); return day }
function calcDauer(start,end) { const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); const mins=(eh*60+em)-(sh*60+sm); return mins>0?parseFloat((mins/60).toFixed(2)):0 }
function initials(name) { return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) }
function today() { return new Date().toISOString().split('T')[0] }
function getDayName(dateStr) { const days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; return days[new Date(dateStr).getDay()] }
function countWorkdays(from,to) { let count=0; const d=new Date(from); while(d<=new Date(to)){const dow=d.getDay(); if(dow>=1&&dow<=4)count++; d.setDate(d.getDate()+1)} return count }
function fmtStd(h) {
  // Deutsche Stundenformatierung: 9,5 Std. / 0,0 Std.
  return h.toFixed(1).replace('.',',') + ' Std.'
}
function istLaufendeWoche(weekStart) {
  const heute = new Date(); heute.setHours(0,0,0,0)
  const ws = new Date(weekStart); ws.setHours(0,0,0,0)
  const we = new Date(ws); we.setDate(we.getDate()+6)
  return heute >= ws && heute <= we
}
function vergangeneArbeitstageDieseWoche() {
  const heute = new Date()
  const dow = heute.getDay() // 0=So,1=Mo,...,6=Sa
  // Mo-Do zählen, bis heute
  if(dow === 0) return 0 // Sonntag
  return Math.min(dow, 4) // max 4 (Do)
}

// ─── STUNDENKONTO ─────────────────────────────────────────────────────────────
function berechneStundenkonto(stunden) {
  const freigegeben = stunden.filter(s => s.freigabe_status === 'freigegeben')
  const wochenMap = {}
  freigegeben.forEach(s => {
    const d = new Date(s.datum)
    const montag = new Date(d)
    const tag = d.getDay()
    const diffZumMontag = (tag === 0 ? -6 : 1 - tag)
    montag.setDate(d.getDate() + diffZumMontag)
    const key = montag.toISOString().split('T')[0]
    if (!wochenMap[key]) wochenMap[key] = { geleistet: 0, montag: new Date(montag) }
    wochenMap[key].geleistet += parseFloat(s.dauer) || 0
  })
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  let saldo = 0
  const verlauf = []
  Object.entries(wochenMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, { geleistet, montag }]) => {
      const donnerstag = new Date(montag)
      donnerstag.setDate(montag.getDate() + 3)
      let regelstunden = 38
      if (montag > heute) {
        regelstunden = 0
      } else if (donnerstag >= heute) {
        const wochentag = heute.getDay()
        const vergangeneArbeitstage = Math.min(wochentag === 0 ? 4 : Math.min(wochentag, 4), 4)
        regelstunden = vergangeneArbeitstage * 9.5
      }
      const differenz = geleistet - regelstunden
      saldo += differenz
      const label = `KW ${montag.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}–${donnerstag.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
      verlauf.push({ key, label, geleistet, regelstunden, differenz })
    })
  return { saldo, verlauf }
}

const freigabeBadge=(s)=>{
  if(s==='freigegeben')return <span style={{background:'#c6f6d5',color:'#276749',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>✓ Freigegeben</span>
  if(s==='abgelehnt')return <span style={{background:'#fed7d7',color:'#9b2c2c',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>✗ Abgelehnt</span>
  return <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>⏳ Ausstehend</span>
}
const urlaubBadge=(s)=>{
  if(s==='genehmigt')return <span style={{background:'#c6f6d5',color:'#276749',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>✓ Genehmigt</span>
  if(s==='abgelehnt')return <span style={{background:'#fed7d7',color:'#9b2c2c',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>✗ Abgelehnt</span>
  return <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:20,fontSize:'0.68rem',fontWeight:600}}>⏳ Ausstehend</span>
}

function LoginPage({onLogin}) {
  const [profiles,setProfiles]=useState([])
  const [selectedEmail,setSelectedEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  useEffect(()=>{
    supabase.from('profiles').select('name, email').order('name').then(({data})=>{
      setProfiles(data||[])
    })
  },[])

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    if(!selectedEmail){setError('Bitte einen Namen auswaehlen.'); setLoading(false); return}
    const {data,error}=await supabase.auth.signInWithPassword({email:selectedEmail,password})
    if(error){setError('Passwort falsch. Bitte erneut versuchen.'); setLoading(false); return}
    const {data:profile}=await supabase.from('profiles').select('*').eq('id',data.user.id).single()
    onLogin({...data.user,profile}); setLoading(false)
  }

  return (
    <div className="login-page">
      <div style={{textAlign:'center',marginBottom:'2rem'}}>
        <img src="/logo.png" alt="Elektro Pees" style={{height:'90px',width:'auto',display:'block',margin:'0 auto 1.25rem'}} onError={e=>{e.target.style.display='none'}}/>
      </div>
      <div className="login-card">
        <h2 style={{color:'#0A0A44',fontSize:'1.2rem',marginBottom:'1.5rem',textAlign:'center'}}>Anmelden</h2>
        {error&&<div className="alert alert-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Name auswaehlen</label>
            <select value={selectedEmail} onChange={e=>setSelectedEmail(e.target.value)} required style={{fontSize:'1rem'}}>
              <option value="">Bitte auswaehlen</option>
              {profiles.map(p=>(
                <option key={p.email} value={p.email}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Passwort eingeben" required/>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Wird angemeldet...':'Anmelden'}</button>
        </form>
      </div>
    </div>
  )
}

function HomePage({user,stunden,baustellen,onStunden,onDelete,isAdmin,isBuero,onKrank}) {
  const myStunden=stunden.filter(s=>s.user_id===user.id)
  const now=new Date(); const weekStart=getWeekStart(now); const weekEnd=new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6)
  const freigegebeneStunden=myStunden.filter(s=>s.freigabe_status==='freigegeben')
  const wocheStunden=freigegebeneStunden.filter(s=>{const d=new Date(s.datum);return d>=weekStart&&d<=weekEnd}).reduce((a,s)=>a+s.dauer,0)
  const ausstehend=myStunden.filter(s=>s.freigabe_status==='ausstehend').length
  const regelStunden=user.profile?.regel_stunden||38
  const diff=wocheStunden-regelStunden
  // Nur vergangene Arbeitstage als Soll berechnen (laufende Woche)
  const laufend=istLaufendeWoche(weekStart)
  const vergangTage=laufend?vergangeneArbeitstageDieseWoche():4
  const sollBisHeute=laufend?(vergangTage*9.5):regelStunden
  const echteFehlstunden=wocheStunden-sollBisHeute
  const pct=Math.min(100,(wocheStunden/regelStunden)*100)
  const [showAll,setShowAll]=useState(false)
  const sorted=[...myStunden].sort((a,b)=>b.datum.localeCompare(a.datum))
  const recent=showAll?sorted:sorted.slice(0,4)
  const [deleteConfirm,setDeleteConfirm]=useState(null)

  const StundenListe=({list})=>list.map(s=>{
    const b=baustellen.find(b=>b.id===s.baustelle_id)
    const isFri=new Date(s.datum).getDay()===5
    const kannLoeschen=isAdmin===true||s.freigabe_status==='ausstehend'
    const isDeleting=deleteConfirm===s.id
    const dotClass = s.freigabe_status==='freigegeben'?'approved':s.freigabe_status==='abgelehnt'?'rejected':'pending'
    return (
      <div key={s.id} className="entry-item">
        <div className={`entry-dot ${dotClass}`}/>
        <div className="entry-info">
          <div className="entry-site">
            {s.notiz==='🤒 Krank'?<span style={{color:'#c53030',fontWeight:700}}>🤒 Krankmeldung</span>:(b?.name||'—')}
            {isFri&&s.notiz!=='🤒 Krank'&&<span className="badge badge-pending" style={{marginLeft:6,fontSize:'0.62rem'}}>Freitag</span>}
          </div>
          <div className="entry-meta">{getDayName(s.datum)}, {formatDate(s.datum)} · {s.start_zeit}–{s.end_zeit}{s.notiz&&s.notiz!=='🤒 Krank'?` · ${s.notiz}`:''}</div>
        </div>
        <div className="entry-right">
          <div className="entry-hours">{s.dauer.toFixed(1)}h</div>
          <div className={`entry-badge ${dotClass}`}>{s.freigabe_status==='freigegeben'?'✓ Freigegeben':s.freigabe_status==='abgelehnt'?'✗ Abgelehnt':'⏳ Ausstehend'}</div>
        </div>
        {kannLoeschen&&!isDeleting&&(
          <button onClick={()=>setDeleteConfirm(s.id)} style={{marginTop:'0.625rem',background:'var(--red-pale)',border:'1px solid rgba(214,62,62,0.2)',color:'var(--red)',borderRadius:'var(--r-sm)',padding:'7px 14px',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',width:'100%',minHeight:36,fontFamily:'inherit'}}>
            🗑️ Eintrag löschen
          </button>
        )}
        {kannLoeschen&&isDeleting&&(
          <div className="delete-confirm">
            <p>Wirklich löschen?</p>
            <div className="delete-confirm-btns">
              <button onClick={()=>{onDelete(s.id);setDeleteConfirm(null)}} style={{background:'var(--red)',color:'white',fontWeight:700}}>✓ Ja, löschen</button>
              <button onClick={()=>setDeleteConfirm(null)} style={{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border2)'}}>Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    )
  })

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="page-content">
      <div style={{marginBottom:'0.75rem',paddingTop:'0.25rem'}}>
        <div style={{fontSize:'0.8rem',color:'var(--text3)'}}>{greet},</div>
        <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--dark)'}}>{(user.profile?.name||user.email).split(' ')[0]}</div>
      </div>
      <button className="hero-btn" onClick={onStunden}>
        <div className="hero-icon"><IconClock/></div>
        <div className="hero-text">
          <div className="hero-label">Hauptaktion</div>
          <div className="hero-title">Stunden erfassen</div>
          <div className="hero-sub">Arbeitszeit für heute eintragen</div>
        </div>
        <div className="hero-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </button>
      {!isBuero&&<button onClick={onKrank} style={{width:'100%',display:'flex',alignItems:'center',gap:'0.75rem',background:'white',border:'1px solid #fecaca',borderRadius:'var(--r-lg)',padding:'0.625rem 1rem',marginBottom:'0.75rem',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>🤒</div>
        <div style={{flex:1}}>
          <div style={{fontSize:'0.85rem',fontWeight:600,color:'#b91c1c'}}>Krank / Abwesenheit melden</div>
          <div style={{fontSize:'0.72rem',color:'#9ca3af',marginTop:1}}>Arbeitszeit wird nach Prüfung berücksichtigt</div>
        </div>
        <span style={{color:'#fca5a5',fontSize:'1rem'}}>›</span>
      </button>}
      {ausstehend>0&&(
        <div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:12,padding:'0.75rem 1rem',marginBottom:'0.75rem'}}>
          <span style={{fontSize:'0.85rem',color:'#92400e'}}>⏳ {ausstehend} Eintrag{ausstehend>1?'e':''} wartet auf Freigabe</span>
        </div>
      )}
      <div className="card" style={{marginBottom:'0.75rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Diese Woche</div>
            <div style={{fontSize:'1.4rem',fontWeight:800,color:'var(--dark)',fontFamily:"'DM Mono',monospace",marginTop:2}}>
              {wocheStunden.toFixed(1).replace('.',',')} <span style={{fontSize:'0.85rem',fontWeight:400,color:'var(--text3)'}}>von {regelStunden.toFixed(0)},0 Std.</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            {echteFehlstunden>=0
              ? <div style={{fontSize:'0.82rem',fontWeight:700,color:'var(--green)'}}>+{echteFehlstunden.toFixed(1).replace('.',',')} Std.</div>
              : laufend&&vergangTage===0
                ? <div style={{fontSize:'0.78rem',color:'var(--text3)'}}>Woche beginnt heute</div>
                : laufend
                  ? <div style={{fontSize:'0.82rem',color:'var(--blue)',fontWeight:600}}>{Math.abs(echteFehlstunden).toFixed(1).replace('.',',')} Std. offen</div>
                  : <div style={{fontSize:'0.82rem',fontWeight:700,color:'var(--red)'}}>−{Math.abs(diff).toFixed(1).replace('.',',')} Fehlstunden</div>
            }
            <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:2}}>{laufend?`${vergangTage} von 4 Tagen`:'Woche abgeschlossen'}</div>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{width:`${pct.toFixed(0)}%`,background:pct>=100?'var(--green)':'var(--blue)'}}/>
        </div>
        <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:4}}>
          {laufend&&echteFehlstunden<0?`Noch ${Math.abs(diff).toFixed(1).replace('.',',')} Std. bis Wochenziel`:`${pct.toFixed(0)} % des Wochenziels`}
        </div>
      </div>
      <div className="card">
        <div className="section-header">
          <span className="section-title">Meine Einträge ({myStunden.length})</span>
          {myStunden.length>4&&<button className="btn btn-outline btn-sm" onClick={()=>setShowAll(!showAll)}>{showAll?'Weniger anzeigen':'Alle anzeigen'}</button>}
        </div>
        {sorted.length===0?<p className="text-muted text-sm">Noch keine Einträge.</p>:<StundenListe list={recent}/>}
      </div>
    </div>
  )
}

function BaustellenCounterOverview({baustelleId}) {
  const LABELS_B = {steckdose:'Steckdose',rahmen1:'1-Fach Rahmen',rahmen2:'2-Fach Rahmen',rahmen3:'3-Fach Rahmen',rahmen4:'4-Fach Rahmen',rahmen5:'5-Fach Rahmen',wechsel:'Aus/Wechselschalter',kontroll:'Kontrollschalter',serien:'Serienschalter',kreuz:'Kreuzschalter',netzwerk:'Netzwerkdose',sat:'Sat-Dose'}
  const LABELS_W = {m16:'M16 Rohr',m20:'M20 Rohr',m25:'M25 Rohr',m32:'M32 Rohr',m40:'M40 Rohr',m50:'M50 Rohr',kk2030:'Kabelkanal 20×30',kk4040:'Kabelkanal 40×40',kk4060:'Kabelkanal 40×60',ap1:'AP-Steckdose 1-fach',ap2:'AP-Steckdose 2-fach',ap3:'AP-Steckdose 3-fach',k315:'Kabel 3×1,5mm²',k515:'Kabel 5×1,5mm²',k54:'Kabel 5×4mm²',k54nyy:'Kabel 5×4 NYY',k2bus:'2×0,75 Bus',k510:'Kabel 5×10mm²'}
  const UNITS_W = {m16:'m',m20:'m',m25:'m',m32:'m',m40:'m',m50:'m',kk2030:'m',kk4040:'m',kk4060:'m',ap1:'Stk',ap2:'Stk',ap3:'Stk',k315:'m',k515:'m',k54:'m',k54nyy:'m',k2bus:'m',k510:'m'}
  const [counterData, setCounterData] = useState(null)
  useEffect(()=>{
    if(!baustelleId) return
    supabase.from('counter_saves').select('counts,custom,mode,updated_at').eq('baustelle_id', baustelleId).order('updated_at',{ascending:false}).limit(10).then(({data})=>{
      if(data&&data.length>0) setCounterData(data)
      else setCounterData([])
    })
  },[baustelleId])
  if(!counterData||counterData.length===0) return null
  return (
    <div style={{marginBottom:'0.75rem'}}>
      <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--dark)',marginBottom:8}}>📦 Material-Counter</div>
      {counterData.map((row,i)=>{
        const allLabels = row.mode==='waermepumpe'?LABELS_W:LABELS_B
        const allUnits = row.mode==='waermepumpe'?UNITS_W:{}
        const eintraege = Object.entries(row.counts||{}).filter(([k,v])=>v>0)
        const customEintraege = (row.custom||[]).filter(c=>row.counts[c.id]>0)
        if(eintraege.length===0&&customEintraege.length===0) return null
        return (
          <div key={i} className="card" style={{padding:'0.75rem',marginBottom:6,background:'#f7fafc'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:6}}>{row.mode==='waermepumpe'?'🌡️ Wärmepumpe':'🏗️ Elektro-Material'}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {eintraege.map(([k,v])=>(
                <span key={k} style={{fontSize:'0.78rem',background:'var(--blue-pale)',color:'var(--blue)',padding:'3px 10px',borderRadius:20,fontWeight:600}}>
                  {allLabels[k]||k}: {v}{allUnits[k]?' '+allUnits[k]:''}
                </span>
              ))}
              {customEintraege.map(c=>(
                <span key={c.id} style={{fontSize:'0.78rem',background:'#f0fff4',color:'#276749',padding:'3px 10px',borderRadius:20,fontWeight:600}}>
                  {c.label}: {row.counts[c.id]}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BaustellenPage({baustellen,stunden,isAdmin,isBuero,onRefresh,user,allUsers}) {
  const [filter,setFilter]=useState('aktiv'); const [showDetail,setShowDetail]=useState(null); const [showNew,setShowNew]=useState(false); const [bsDeleteConfirm,setBsDeleteConfirm]=useState(false)
  const [editMode,setEditMode]=useState(false); const [editForm,setEditForm]=useState({})
  const [showVerschieben,setShowVerschieben]=useState(false); const [verschiebeZiel,setVerschiebeZiel]=useState(''); const [verschiebing,setVerschiebing]=useState(false)
  const [form,setForm]=useState({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:'',foto_link:''}); const [saving,setSaving]=useState(false)
  const kannBueroBaustelle=isAdmin||isBuero
  const list=baustellen.filter(b=>b.status===filter&&(kannBueroBaustelle||b.name!=='Büro'))
  async function handleSave() {
    if(!form.name||!form.kunde){alert('Name und Kunde sind Pflichtfelder!');return}
    setSaving(true); await supabase.from('baustellen').insert([{...form,status:'aktiv',erstellt_von:user?.id}]); await onRefresh()
    setForm({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:''}); setShowNew(false); setSaving(false)
  }
  async function handleAbschliessen(id) {
    await supabase.from('baustellen').update({status:'abgeschlossen'}).eq('id',id)
    await onRefresh(); setShowDetail(null)
  }
  async function handleEdit(id) {
    await supabase.from('baustellen').update({name:editForm.name,kunde:editForm.kunde,adresse:editForm.adresse,beschreibung:editForm.beschreibung,kontakt:editForm.kontakt,telefon:editForm.telefon,foto_link:editForm.foto_link||''}).eq('id',id)
    await onRefresh(); setEditMode(false)
  }
  async function handleLoeschen(id) {
    setBsDeleteConfirm(false)
    await supabase.from('baustellen').delete().eq('id',id)
    await onRefresh(); setShowDetail(null)
  }
  async function handleVerschieben(vonId, nachId) {
    if(!nachId){alert('Bitte eine Ziel-Baustelle auswaehlen!');return}
    setVerschiebing(true)
    await supabase.from('stunden').update({baustelle_id:nachId}).eq('baustelle_id',vonId)
    await onRefresh()
    setShowVerschieben(false); setVerschiebeZiel(''); setVerschiebing(false)
    alert('Stunden wurden verschoben! Duplikat kann jetzt geloescht werden.')
  }
  const detailBs=baustellen.find(b=>b.id===showDetail)
  const detailStunden=stunden.filter(s=>s.baustelle_id===showDetail&&s.freigabe_status==='freigegeben')
  const detailTotal=detailStunden.reduce((a,s)=>a+s.dauer,0)
  return (
    <div className="page-content">
      <div className="section-header"><span className="section-title">Baustellen</span><button className="btn btn-outline btn-sm" onClick={()=>setShowNew(true)}>+ Neu</button></div>
      <div className="tab-row">{['aktiv','abgeschlossen'].map(f=><button key={f} className={`tab-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f==='aktiv'?'Aktiv':'Archiv'}</button>)}</div>
      {list.length===0?<p className="text-muted text-sm">Keine Baustellen.</p>:list.map(b=>{
        const hours=stunden.filter(s=>s.baustelle_id===b.id&&s.freigabe_status==='freigegeben').reduce((a,s)=>a+s.dauer,0)
        return (
          <div key={b.id} className="card" onClick={()=>{setShowDetail(b.id);setEditMode(false);setEditForm({name:b.name,kunde:b.kunde,adresse:b.adresse||'',beschreibung:b.beschreibung||'',kontakt:b.kontakt||'',telefon:b.telefon||'',foto_link:b.foto_link||''})}} style={{cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{flex:1}}><div className="font-bold" style={{color:'#0A0A44'}}>{b.name}</div><div className="text-xs text-muted" style={{marginTop:3}}>{b.kunde} · {b.adresse}</div></div>
              <span className={`badge ${b.status==='aktiv'?'badge-active':'badge-done'}`}>{b.status==='aktiv'?'Aktiv':'Fertig'}</span>
            </div>
            <div style={{marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between'}}>
              <span className="text-sm text-muted">Freigegebene Stunden</span><span className="font-bold text-blue">{hours.toFixed(1)} Std</span>
            </div>
          </div>
        )
      })}
      {showDetail&&detailBs&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">{detailBs.name}</div>
          <span className={`badge ${detailBs.status==='aktiv'?'badge-active':'badge-done'}`} style={{marginBottom:'0.75rem',display:'inline-block'}}>{detailBs.status==='aktiv'?'Aktiv':'Abgeschlossen'}</span>
          <div className="card" style={{background:'#f7fafc',padding:'0.75rem 1rem',marginBottom:'0.75rem',fontSize:'0.82rem',color:'#4a5568',lineHeight:1.8}}>
            <div>👤 <strong>Kunde:</strong> {detailBs.kunde}</div><div>📍 <strong>Adresse:</strong> {detailBs.adresse}</div>
            {detailBs.kontakt&&<div>📞 <strong>Kontakt:</strong> {detailBs.kontakt} {detailBs.telefon&&`· ${detailBs.telefon}`}</div>}
            {detailBs.beschreibung&&<div>📝 {detailBs.beschreibung}</div>}
            {detailBs.erstellt_von&&<div>🧑‍💼 <strong>Erstellt von:</strong> {allUsers.find(u=>u.id===detailBs.erstellt_von)?.name||'—'}</div>}
            {detailBs.foto_link&&<div style={{marginTop:4}}><a href={detailBs.foto_link} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontWeight:600,fontSize:'0.82rem',display:'inline-flex',alignItems:'center',gap:4}}>📷 Fotogalerie öffnen</a></div>}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
            <span className="text-sm text-muted">Freigegebene Stunden</span><span style={{fontSize:'1.3rem',fontWeight:800,color:'#1B52DD'}}>{detailTotal.toFixed(1)} Std</span>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:'0.75rem'}}>
            {detailStunden.length===0?<p className="text-muted text-sm" style={{padding:'1rem'}}>Noch keine freigegebenen Stunden.</p>:detailStunden.sort((a,b)=>b.datum.localeCompare(a.datum)).map(s=>(
              <div key={s.id} className="list-item" style={{padding:'0.6rem 1rem'}}>
                <div className="list-item-left">
                  <span className="list-item-title text-sm">{s.profiles?.name||'—'}</span>
                  <span className="list-item-sub">{getDayName(s.datum)}, {formatDate(s.datum)} · {s.start_zeit}–{s.end_zeit}</span>
                  {s.notiz&&<span style={{fontSize:'0.72rem',color:'#49A7D6'}}>{s.notiz}</span>}
                </div>
                <span className="font-bold text-blue">{s.dauer.toFixed(1)}h</span>
              </div>
            ))}
          </div>
          <BaustellenCounterOverview baustelleId={showDetail}/>
          {!editMode&&(
            <button className="btn btn-secondary" style={{marginBottom:'0.5rem'}} onClick={()=>setEditMode(true)}>✏️ Baustelle bearbeiten</button>
          )}
          {editMode&&(
            <div style={{background:'var(--bg)',borderRadius:'var(--r-md)',padding:'1rem',marginBottom:'0.75rem',border:'1px solid var(--border2)'}}>
              <div style={{fontWeight:600,color:'var(--dark)',marginBottom:'0.75rem',fontSize:'0.9rem'}}>✏️ Bearbeiten</div>
              {['name','kunde','adresse','beschreibung','kontakt','telefon','foto_link'].map(field=>(
                <div key={field} className="form-group" style={{marginBottom:'0.5rem'}}>
                  <label style={{fontSize:'0.68rem',fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:3}}>{field==='name'?'Name':field==='kunde'?'Kunde':field==='adresse'?'Adresse':field==='beschreibung'?'Beschreibung':field==='kontakt'?'Kontakt':field==='telefon'?'Telefon':'Foto-Link (URL)'}</label>
                  <input style={{width:'100%',padding:'0.5rem 0.75rem',border:'1.5px solid var(--border2)',borderRadius:'var(--r-sm)',fontSize:'0.85rem',fontFamily:'inherit'}} value={editForm[field]||''} onChange={e=>setEditForm(f=>({...f,[field]:e.target.value}))}/>
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginTop:'0.5rem'}}>
                <button className="btn btn-primary" style={{marginBottom:0,padding:'0.6rem',fontSize:'0.85rem'}} onClick={()=>handleEdit(detailBs.id)}>✓ Speichern</button>
                <button className="btn btn-secondary" style={{marginBottom:0,padding:'0.6rem',fontSize:'0.85rem'}} onClick={()=>setEditMode(false)}>Abbrechen</button>
              </div>
            </div>
          )}
          {detailBs.status==='aktiv'&&!editMode&&(
            <button className="btn btn-danger" style={{marginBottom:'0.5rem'}} onClick={()=>handleAbschliessen(detailBs.id)}>🔒 Archivieren</button>
          )}
          {isAdmin&&!editMode&&!bsDeleteConfirm&&(
            <button className="btn" style={{marginBottom:'0.5rem',background:'#742a2a',color:'white',border:'none',borderRadius:'var(--r-sm)',padding:'0.875rem',width:'100%',fontFamily:'inherit',fontWeight:600,fontSize:'0.95rem',cursor:'pointer'}} onClick={()=>setBsDeleteConfirm(true)}>🗑️ Löschen</button>
          )}
          {isAdmin&&bsDeleteConfirm&&(
            <div className="delete-confirm" style={{marginBottom:'0.5rem'}}>
              <p>Baustelle wirklich löschen?</p>
              <div className="delete-confirm-btns">
                <button onClick={()=>handleLoeschen(detailBs.id)} style={{background:'var(--red)',color:'white',fontWeight:700}}>✓ Ja, löschen</button>
                <button onClick={()=>setBsDeleteConfirm(false)} style={{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border2)'}}>Abbrechen</button>
              </div>
            </div>
          )}
          {isAdmin&&!editMode&&!showVerschieben&&(
            <button className="btn btn-outline btn-sm" style={{marginBottom:'0.5rem',width:'100%',padding:'0.75rem',fontSize:'0.85rem',color:'var(--blue)',borderColor:'var(--blue)'}} onClick={()=>{setShowVerschieben(true);setVerschiebeZiel('')}}>🔀 Stunden verschieben (Duplikat)</button>
          )}
          {isAdmin&&showVerschieben&&(
            <div style={{background:'#ebf8ff',border:'1px solid #bee3f8',borderRadius:'var(--r-md)',padding:'1rem',marginBottom:'0.5rem'}}>
              <div style={{fontWeight:600,color:'#2b6cb0',marginBottom:'0.5rem',fontSize:'0.88rem'}}>🔀 Alle Stunden verschieben nach:</div>
              <div style={{fontSize:'0.78rem',color:'#4a5568',marginBottom:'0.75rem'}}>Alle {stunden.filter(s=>s.baustelle_id===detailBs.id).length} Einträge dieser Baustelle werden auf die Ziel-Baustelle umgehängt.</div>
              <select value={verschiebeZiel} onChange={e=>setVerschiebeZiel(e.target.value)} style={{width:'100%',padding:'0.6rem 0.75rem',border:'1.5px solid #bee3f8',borderRadius:'var(--r-sm)',fontSize:'0.85rem',fontFamily:'inherit',marginBottom:'0.75rem',background:'white'}}>
                <option value="">— Ziel-Baustelle auswählen —</option>
                {baustellen.filter(b=>b.id!==detailBs.id).map(b=><option key={b.id} value={b.id}>{b.name} {b.status!=='aktiv'?'(Archiv)':''}</option>)}
              </select>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                <button onClick={()=>handleVerschieben(detailBs.id,verschiebeZiel)} disabled={!verschiebeZiel||verschiebing} style={{padding:'0.6rem',background:'var(--blue)',color:'white',border:'none',borderRadius:'var(--r-sm)',fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem',opacity:(!verschiebeZiel||verschiebing)?0.5:1}}>{verschiebing?'Wird verschoben...':'✓ Verschieben'}</button>
                <button onClick={()=>{setShowVerschieben(false);setVerschiebeZiel('')}} style={{padding:'0.6rem',background:'white',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:'var(--r-sm)',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem'}}>Abbrechen</button>
              </div>
            </div>
          )}
          <button className="btn btn-secondary" onClick={()=>{setShowDetail(null);setBsDeleteConfirm(false);setEditMode(false);setShowVerschieben(false);setVerschiebeZiel('')}}>Schließen</button>
        </div></div>
      )}
      {showNew&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">🏗️ Neue Baustelle</div>
          {['name','kunde','adresse','beschreibung','kontakt','telefon','foto_link'].map(field=>(
            <div key={field} className="form-group">
              <label>{field==='name'?'Baustellenname *':field==='kunde'?'Kunde *':field==='foto_link'?'Foto-Link (URL)':field.charAt(0).toUpperCase()+field.slice(1)}</label>
              {field==='beschreibung'?<textarea value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder="Beschreibung..."/>:<input type={field==='telefon'?'tel':field==='foto_link'?'url':'text'} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder={field==='foto_link'?'https://...':''}/>}
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Wird gespeichert...':'✓ Baustelle speichern'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowNew(false)}>Abbrechen</button>
        </div></div>
      )}
    </div>
  )
}

function UrlaubPage({user,isAdmin,isBuero,allUsers}) {
  const [antraege,setAntraege]=useState([])
  const [showNew,setShowNew]=useState(false)
  const [form,setForm]=useState({von:'',bis:'',notiz:''})
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState({text:'',type:''})
  useEffect(()=>{loadAntraege()},[])
  async function loadAntraege() {
    const {data}=await supabase.from('urlaubsantraege').select('*, profiles(name,urlaub_gesamt,urlaub_genommen)').order('created_at',{ascending:false})
    setAntraege(data||[])
  }
  const tage=form.von&&form.bis?countWorkdays(form.von,form.bis):0
  const myAntraege=antraege.filter(a=>a.user_id===user.id)
  async function handleAntrag() {
    if(!form.von||!form.bis){alert('Bitte Von- und Bis-Datum angeben!');return}
    if(tage<=0){alert('Ungültiger Zeitraum!');return}
    setSaving(true)
    await supabase.from('urlaubsantraege').insert([{user_id:user.id,von_datum:form.von,bis_datum:form.bis,tage,notiz:form.notiz,status:'ausstehend'}])
    setMsg({text:'✓ Urlaubsantrag wurde eingereicht!',type:'success'})
    setForm({von:'',bis:'',notiz:''}); setShowNew(false); await loadAntraege(); setSaving(false)
    setTimeout(()=>setMsg({text:'',type:''}),3000)
  }
  async function handleEntscheidung(id,userId,tage,entscheidung) {
    await supabase.from('urlaubsantraege').update({status:entscheidung}).eq('id',id)
    if(entscheidung==='genehmigt'){
      const {data:profile}=await supabase.from('profiles').select('urlaub_genommen').eq('id',userId).single()
      await supabase.from('profiles').update({urlaub_genommen:(profile?.urlaub_genommen||0)+tage}).eq('id',userId)
    }
    setMsg({text:entscheidung==='genehmigt'?'✓ Urlaub genehmigt!':'Urlaub abgelehnt.',type:entscheidung==='genehmigt'?'success':'error'})
    await loadAntraege(); setTimeout(()=>setMsg({text:'',type:''}),3000)
  }
  return (
    <div className="page-content">
      {msg.text&&<div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      {!(isAdmin||isBuero)&&(
        <>
          <div className="section-header"><span className="section-title">Mein Urlaub</span><button className="btn btn-outline btn-sm" onClick={()=>setShowNew(true)}>+ Beantragen</button></div>
          <div className="card">
            <div className="card-title">🏖️ Urlaubskonto {new Date().getFullYear()}</div>
            {allUsers.filter(u2=>u2.id===user.id).map(u2=>{
              const ug=u2.urlaub_gesamt||24; const un=u2.urlaub_genommen||0; const rest=ug-un; const pct=((un/ug)*100).toFixed(0)
              return (
                <div key={u2.id}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',textAlign:'center',marginBottom:'0.75rem'}}>
                    <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#0A0A44'}}>{ug}</div><div className="text-xs text-muted">Gesamt</div></div>
                    <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#e53e3e'}}>{un}</div><div className="text-xs text-muted">Genommen</div></div>
                    <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#38a169'}}>{rest}</div><div className="text-xs text-muted">Verbleibend</div></div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,#38a169,#68d391)'}}/></div>
                  <div className="text-xs text-muted" style={{textAlign:'right',marginTop:4}}>{pct}% verbraucht</div>
                </div>
              )
            })}
          </div>
          <div className="card">
            <div className="card-title">📋 Meine Anträge</div>
            {myAntraege.length===0?<p className="text-muted text-sm">Noch keine Anträge.</p>:myAntraege.map(a=>(
              <div key={a.id} className="list-item">
                <div className="list-item-left">
                  <span className="list-item-title text-sm">{formatDate(a.von_datum)} – {formatDate(a.bis_datum)}</span>
                  <span className="list-item-sub">{a.tage} Arbeitstage (Mo–Do){a.notiz&&` · ${a.notiz}`}</span>
                  <div style={{marginTop:3}}>{urlaubBadge(a.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {(isAdmin||isBuero)&&(
        <>
          <div className="section-header"><span className="section-title">Urlaubsanträge</span></div>
          {antraege.filter(a=>a.status==='ausstehend').length===0
            ?<div className="card"><p className="text-muted text-sm">Keine ausstehenden Anträge. ✓</p></div>
            :antraege.filter(a=>a.status==='ausstehend').map(a=>(
              <div key={a.id} className="card" style={{borderLeft:'3px solid #f6e05e'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
                  <div>
                    <div className="font-bold" style={{color:'#0A0A44'}}>{a.profiles?.name||'—'}</div>
                    <div className="text-sm text-muted">{formatDate(a.von_datum)} – {formatDate(a.bis_datum)}</div>
                    <div className="text-sm" style={{color:'#1B52DD',fontWeight:600}}>{a.tage} Arbeitstage (Mo–Do)</div>
                    {a.notiz&&<div className="text-xs text-muted" style={{marginTop:2}}>📝 {a.notiz}</div>}
                  </div>
                  {urlaubBadge(a.status)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                  <button className="btn btn-success" style={{marginBottom:0,padding:'0.6rem'}} onClick={()=>handleEntscheidung(a.id,a.user_id,a.tage,'genehmigt')}>✓ Genehmigen</button>
                  <button className="btn btn-danger" style={{marginBottom:0,padding:'0.6rem'}} onClick={()=>handleEntscheidung(a.id,a.user_id,a.tage,'abgelehnt')}>✗ Ablehnen</button>
                </div>
              </div>
            ))
          }
          <div className="card" style={{marginTop:'0.75rem'}}>
            <div className="card-title">📋 Entschiedene Anträge</div>
            {antraege.filter(a=>a.status!=='ausstehend').length===0?<p className="text-muted text-sm">Noch keine.</p>:antraege.filter(a=>a.status!=='ausstehend').map(a=>(
              <div key={a.id} className="list-item">
                <div className="list-item-left">
                  <span className="list-item-title text-sm">{a.profiles?.name||'—'}</span>
                  <span className="list-item-sub">{formatDate(a.von_datum)} – {formatDate(a.bis_datum)} · {a.tage} Tage</span>
                  <div style={{marginTop:3}}>{urlaubBadge(a.status)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{marginTop:'0.75rem'}}>
            <div className="card-title">🏖️ Urlaubsübersicht</div>
            {allUsers.filter(u=>u.role!=='admin').map(u=>{
              const ug=u.urlaub_gesamt||24; const un=u.urlaub_genommen||0; const rest=ug-un; const pct=((un/ug)*100).toFixed(0)
              return (
                <div key={u.id} style={{marginBottom:'1rem',paddingBottom:'1rem',borderBottom:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span className="font-bold">{u.name}</span><span className="text-sm text-muted">{un}/{ug} Tage</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',marginTop:4}}>
                    <span className="text-muted">Verbraucht: {pct}%</span><span className="text-green font-bold">Rest: {rest} Tage</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {showNew&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">🏖️ Urlaub beantragen</div>
          <div className="form-row">
            <div className="form-group"><label>Von *</label><input type="date" value={form.von} onChange={e=>setForm(f=>({...f,von:e.target.value}))}/></div>
            <div className="form-group"><label>Bis *</label><input type="date" value={form.bis} onChange={e=>setForm(f=>({...f,bis:e.target.value}))}/></div>
          </div>
          {tage>0&&<div className="card" style={{background:'#ebf8ff',padding:'0.75rem 1rem',marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#2b6cb0',fontSize:'0.85rem'}}>Arbeitstage (Mo–Do):</span><span style={{fontSize:'1.2rem',fontWeight:800,color:'#0A0A44'}}>{tage} Tage</span></div></div>}
          <div className="form-group"><label>Notiz (optional)</label><textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Familienurlaub..."/></div>
          <button className="btn btn-primary" onClick={handleAntrag} disabled={saving||tage<=0}>{saving?'Wird gesendet...':'✓ Antrag einreichen'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowNew(false)}>Abbrechen</button>
        </div></div>
      )}
    </div>
  )
}

function ProfilPage({user,stunden,baustellen,isBuero,setPage}) {
  const profile=user.profile||{}
  const myStunden=stunden.filter(s=>s.user_id===user.id)
  const freigegebene=myStunden.filter(s=>s.freigabe_status==='freigegeben')
  const total=freigegebene.reduce((a,s)=>a+s.dauer,0)
  const regelStunden=profile.regel_stunden||38
  const now=new Date(); const weekStart=getWeekStart(now); const weekEnd=new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6)
  const woche=freigegebene.filter(s=>{const d=new Date(s.datum);return d>=weekStart&&d<=weekEnd}).reduce((a,s)=>a+s.dauer,0)
  const diff=woche-regelStunden
  const urlaubGesamt=profile.urlaub_gesamt||24; const urlaubGenommen=profile.urlaub_genommen||0
  const resturlaub=urlaubGesamt-urlaubGenommen; const urlaubPct=((urlaubGenommen/urlaubGesamt)*100).toFixed(0)
  const recent=[...myStunden].sort((a,b)=>b.datum.localeCompare(a.datum)).slice(0,8)
  return (
    <div className="page-content">
      <div className="card">
        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.25rem'}}>
          <div className="employee-avatar" style={{width:56,height:56,fontSize:'1.1rem'}}>{initials(profile.name||user.email)}</div>
          <div>
            <div className="font-bold" style={{fontSize:'1.1rem',color:'#0A0A44'}}>{profile.name||user.email}</div>
            <div className="text-xs text-muted">{profile.role==='admin'?'Administrator':profile.role==='buero'?'Büro / Minijob':profile.role==='azubi'?'Azubi':'Mitarbeiter'}</div>
            <div className="text-xs text-muted">{user.email}</div>
          </div>
        </div>
        <div className="stats-row" style={{marginBottom:0}}>
          <div className="stat-card"><div className="stat-num">{total.toFixed(1)}</div><div className="stat-label">Freigegebene Std.</div></div>
          <div className="stat-card"><div className="stat-num">{woche.toFixed(1)}</div><div className="stat-label">Std. diese Woche</div></div>
          {!isBuero&&<div className={`stat-card ${diff>=0?'success':'danger'}`}>
            <div className="stat-label">{diff>=0?'Überstunden':'Fehlstunden'}</div>
            <div className={`stat-num ${diff>=0?'plus':'minus'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div>
          </div>}
          {!isBuero&&<div className="stat-card"><div className="stat-num">{regelStunden}</div><div className="stat-label">Regelstunden/Wo</div></div>}
          {isBuero&&<div className="stat-card"><div className="stat-num" style={{fontSize:'0.85rem',color:'var(--blue)'}}>Minijob</div><div className="stat-label">Flex-Arbeitszeit</div></div>}
        </div>
      </div>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="card-title" style={{marginBottom:0}}>🏖️ Urlaub {new Date().getFullYear()}</div>
          {!isBuero&&<button onClick={()=>setPage('urlaub')} style={{fontSize:'0.75rem',padding:'4px 12px',background:'var(--blue)',color:'white',border:'none',borderRadius:20,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>+ Beantragen</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',textAlign:'center',marginBottom:'0.75rem'}}>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#0A0A44'}}>{urlaubGesamt}</div><div className="text-xs text-muted">Gesamt</div></div>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#e53e3e'}}>{urlaubGenommen}</div><div className="text-xs text-muted">Genommen</div></div>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#38a169'}}>{resturlaub}</div><div className="text-xs text-muted">Verbleibend</div></div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${urlaubPct}%`,background:'linear-gradient(90deg,#38a169,#68d391)'}}/></div>
        <div className="text-xs text-muted" style={{textAlign:'right',marginTop:4}}>{urlaubPct}% verbraucht</div>
      </div>

      {/* ── STUNDENKONTO ── */}
      {!isBuero&&(()=>{
        const { saldo, verlauf } = berechneStundenkonto(myStunden)
        const positiv = saldo >= 0
        return (
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div className="card-title" style={{marginBottom:0}}>⏱ Stundenkonto</div>
              <span style={{
                fontWeight:800, fontSize:'1.3rem',
                color: positiv ? 'var(--green)' : 'var(--red)',
                background: positiv ? '#e8f8f0' : '#fdeaea',
                borderRadius:10, padding:'3px 14px'
              }}>
                {positiv ? '+' : ''}{saldo.toFixed(1)}h
              </span>
            </div>
            <div style={{fontSize:'0.72rem',color:'#888',marginBottom:10}}>
              Alle freigegebenen Stunden vs. Regelarbeitszeit (38h/Woche Mo–Do)
            </div>
            {verlauf.length === 0
              ? <p className="text-muted text-sm">Noch keine freigegebenen Einträge.</p>
              : <div style={{maxHeight:220,overflowY:'auto'}}>
                  {verlauf.slice().reverse().map(w => {
                    const pos = w.differenz >= 0
                    return (
                      <div key={w.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f0f0f0',fontSize:'0.82rem'}}>
                        <span style={{color:'#555'}}>{w.label}</span>
                        <div style={{display:'flex',gap:10,alignItems:'center'}}>
                          <span style={{color:'#aaa',fontFamily:"'DM Mono',monospace"}}>{w.geleistet.toFixed(1)}h</span>
                          <span style={{fontWeight:700,minWidth:54,textAlign:'right',color:pos?'var(--green)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>
                            {pos?'+':''}{w.differenz.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        )
      })()}

      {/* Büro: Tätigkeitsprotokoll */}
      {isBuero&&(
        <div className="card" style={{background:'#ebf8ff',border:'1px solid #bee3f8'}}>
          <div className="card-title">📋 Tätigkeitsprotokoll</div>
          <div style={{fontSize:'0.78rem',color:'#4a5568',marginBottom:8}}>Alle deine Einträge werden mit Tätigkeit gespeichert und sind für Betriebsprüfungen nachvollziehbar.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,textAlign:'center',padding:'8px 0'}}>
            <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'var(--blue)'}}>{myStunden.filter(s=>s.freigabe_status==='freigegeben').length}</div><div style={{fontSize:'0.7rem',color:'#888'}}>Freigegebene Einträge</div></div>
            <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'var(--dark)'}}>{myStunden.filter(s=>s.freigabe_status==='ausstehend').length}</div><div style={{fontSize:'0.7rem',color:'#888'}}>Ausstehend</div></div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">📋 Meine Einträge</div>
        {recent.length===0?<p className="text-muted text-sm">Noch keine Einträge.</p>:recent.map(s=>{
          const b=baustellen?.find(b=>b.id===s.baustelle_id)
          const isFri=new Date(s.datum).getDay()===5
          return (
            <div key={s.id} className="list-item">
              <div className="list-item-left">
                <span className="list-item-title text-sm">{b?.name||s.baustellen?.name||'—'}{isFri&&<span style={{fontSize:'0.7rem',background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:'10px',marginLeft:4}}>Freitag</span>}</span>
                <span className="list-item-sub">{getDayName(s.datum)}, {formatDate(s.datum)} · {s.start_zeit}–{s.end_zeit}</span>
                <div style={{marginTop:2}}>{freigabeBadge(s.freigabe_status||'ausstehend')}</div>
              </div>
              <span className="font-bold text-blue">{s.dauer.toFixed(1)}h</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminPage({stunden,baustellen,allUsers,onRefresh,currentUser,isAdmin}) {
  const [tab,setTab]=useState('freigabe')
  const [showNewUser,setShowNewUser]=useState(false)
  const [selectedMitarbeiter,setSelectedMitarbeiter]=useState(null)
  const [weekOffsets,setWeekOffsets]=useState({})
  const [newUser,setNewUser]=useState({name:'',email:'',password:'',rolle:'mitarbeiter',regel_stunden:38,urlaub_gesamt:24})
  const [saving,setSaving]=useState(false); const [msg,setMsg]=useState('')
  const [stundenDetail,setStundenDetail]=useState(null)
  const mitarbeiter=allUsers.filter(u=>u.role!=='admin')
  const bueroUserId=allUsers.find(u=>u.role==='buero')?.id
  const ausstehend=stunden.filter(s=>{
    if(s.freigabe_status!=='ausstehend') return false
    // Büro-User darf keine eigenen Stunden freigeben, Admin darf alles
    const istBueroStunde=allUsers.find(u=>u.id===s.user_id)?.role==='buero'
    if(!isAdmin&&istBueroStunde) return false
    return true
  })

  async function handleFreigabe(id,entscheidung) {
    await supabase.from('stunden').update({freigabe_status:entscheidung}).eq('id',id)
    setMsg(entscheidung==='freigegeben'?'✓ Stunden freigegeben!':'Stunden abgelehnt.')
    await onRefresh(); setTimeout(()=>setMsg(''),3000)
  }
  async function handleAlleFreigeben() {
    if(isAdmin) {
      // Admin gibt alles frei
      await supabase.from('stunden').update({freigabe_status:'freigegeben'}).eq('freigabe_status','ausstehend')
    } else {
      // Büro gibt nur Monteur-Stunden frei (nicht Büro-Stunden)
      const monteurIds=allUsers.filter(u=>u.role==='mitarbeiter').map(u=>u.id)
      for(const id of monteurIds) {
        await supabase.from('stunden').update({freigabe_status:'freigegeben'}).eq('freigabe_status','ausstehend').eq('user_id',id)
      }
    }
    setMsg(`✓ ${ausstehend.length} Einträge freigegeben!`); await onRefresh(); setTimeout(()=>setMsg(''),3000)
  }
  async function handleNewUser() {
    if(!newUser.name||!newUser.password){alert('Name und Passwort sind Pflicht!');return}
    if(newUser.password.length<6){alert('Passwort muss mindestens 6 Zeichen haben!');return}
    setSaving(true)
    const cleanName=newUser.name.toLowerCase().replace(/\s+/g,'.').replace(/[^a-z.]/g,'')
    const autoEmail=cleanName+'@elektropees.de'
    const {data,error}=await supabase.auth.signUp({email:autoEmail,password:newUser.password})
    if(error){alert('Fehler: '+error.message);setSaving(false);return}
    if(data.user){
      await supabase.from('profiles').upsert({id:data.user.id,name:newUser.name,email:autoEmail,role:newUser.rolle||'mitarbeiter',regel_stunden:newUser.regel_stunden,urlaub_gesamt:newUser.urlaub_gesamt,urlaub_genommen:0})
    }
    setMsg('✓ Mitarbeiter "'+newUser.name+'" wurde angelegt!')
    setNewUser({name:'',password:'',regel_stunden:38,urlaub_gesamt:24})
    setShowNewUser(false); setSaving(false)
  }

  return (
    <div className="page-content">
      {msg&&<div className="alert alert-success">{msg}</div>}
      <div className="tab-row">
        {[['freigabe',ausstehend.length>0?`Freigaben (${ausstehend.length})`:'Freigaben ✓'],['mitarbeiter','Mitarbeiter'],['auswertung','Auswertung']].map(([key,label])=>(
          <button key={key} className={`tab-btn ${tab===key?'active':''}`} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {tab==='freigabe'&&(
        <>
          {ausstehend.length===0&&(
            <div className="card" style={{borderLeft:'3px solid #38a169',background:'#f0fff4'}}>
              <p style={{color:'#276749',fontWeight:600}}>✓ Alle Stunden sind freigegeben!</p>
            </div>
          )}
          {ausstehend.length>0&&(
            <>
              <div style={{marginBottom:'0.75rem',display:'flex',justifyContent:'flex-end'}}>
                <button className="btn btn-success btn-sm" onClick={handleAlleFreigeben}>✓ Alle freigeben ({ausstehend.length})</button>
              </div>
              {ausstehend.sort((a,b)=>b.datum.localeCompare(a.datum)).map(s=>{
                const b=baustellen.find(b=>b.id===s.baustelle_id)
                const isFri=new Date(s.datum).getDay()===5
                return (
                  <div key={s.id} className="freigabe-card" style={{cursor:'pointer'}} onClick={()=>setStundenDetail(s)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div className="freigabe-name">
                          {s.profiles?.name||'—'}
                          {s.notiz==='🤒 Krank'&&<span style={{marginLeft:6,fontSize:'0.72rem',background:'#fed7d7',color:'#c53030',padding:'1px 8px',borderRadius:10,fontWeight:700}}>🤒 Krank</span>}
                          {isFri&&s.notiz!=='🤒 Krank'&&<span className="badge badge-pending" style={{marginLeft:6}}>Freitag</span>}
                        </div>
                        <div className="freigabe-meta">{getDayName(s.datum)}, {formatDate(s.datum)}</div>
                        <div className="freigabe-meta">🏗️ {b?.name||'—'} · {s.start_zeit}–{s.end_zeit}</div>
                        {s.notiz&&s.notiz!=='🤒 Krank'&&<div className="freigabe-meta" style={{color:'var(--blue)',fontWeight:500}}>📋 {s.notiz.length>60?s.notiz.slice(0,60)+'…':s.notiz}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                        <div className="freigabe-hours">{s.dauer.toFixed(1)}h</div>
                        <span style={{fontSize:'0.65rem',color:'var(--blue)',fontWeight:600}}>📄 Details</span>
                      </div>
                    </div>
                    <div className="freigabe-actions" onClick={e=>e.stopPropagation()}>
                      <button className="btn-approve" onClick={()=>handleFreigabe(s.id,'freigegeben')}>✓ Freigeben</button>
                      <button className="btn-reject" onClick={()=>handleFreigabe(s.id,'abgelehnt')}>✗ Ablehnen</button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
          {stunden.filter(s=>s.freigabe_status==='freigegeben'||s.freigabe_status==='abgelehnt').length>0&&(
            <div className="card" style={{marginTop:'0.75rem'}}>
              <div className="card-title" style={{fontSize:'0.85rem',color:'#4a5568'}}>✓ Erledigte Einträge</div>
              {stunden.filter(s=>s.freigabe_status!=='ausstehend').sort((a,b)=>b.datum.localeCompare(a.datum)).slice(0,20).map(s=>{
                const b=baustellen.find(b=>b.id===s.baustelle_id)
                const freigegeben=s.freigabe_status==='freigegeben'
                return (
                  <div key={s.id} style={{padding:'0.75rem 0',borderBottom:'1px solid var(--border)',opacity:0.8,cursor:'pointer'}} onClick={()=>setStundenDetail(s)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div>
                        <div style={{fontWeight:500,fontSize:'0.87rem',color:'var(--dark)'}}>{s.profiles?.name||'—'}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>{getDayName(s.datum)}, {formatDate(s.datum)} · {b?.name||'—'}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>{s.start_zeit} – {s.end_zeit}</div>
                        {s.notiz&&s.notiz!=='🤒 Krank'&&<div style={{fontSize:'0.72rem',color:'var(--blue)',marginTop:2,fontWeight:500}}>📋 {s.notiz.length>50?s.notiz.slice(0,50)+'…':s.notiz}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                        <span style={{fontWeight:700,color:freigegeben?'var(--blue)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{s.dauer.toFixed(1)}h</span>
                        <span style={{fontSize:'0.65rem',background:freigegeben?'var(--green-pale)':'var(--red-pale)',color:freigegeben?'var(--green)':'var(--red)',padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                          {freigegeben?'✓ Freigegeben':'✗ Abgelehnt'}
                        </span>
                        {(isAdmin||(currentUser?.profile?.role==='buero'&&allUsers.find(u=>u.id===s.user_id)?.role!=='buero'))&&(
                          <button onClick={()=>{ supabase.from('stunden').delete().eq('id',s.id).then(()=>onRefresh()) }} style={{fontSize:'0.75rem',color:'var(--red)',background:'var(--red-pale)',border:'1px solid rgba(214,62,62,0.2)',borderRadius:'var(--r-sm)',cursor:'pointer',padding:'5px 10px',fontFamily:'inherit',fontWeight:600,minHeight:32,minWidth:70}}>🗑️ Löschen</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab==='mitarbeiter'&&(
        <>
          {isAdmin&&<div style={{marginBottom:'0.75rem',textAlign:'right'}}><button className="btn btn-outline btn-sm" onClick={()=>setShowNewUser(true)}>+ Mitarbeiter anlegen</button></div>}
          {mitarbeiter.map(u=>{
            const myH=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='freigegeben').reduce((a,s)=>a+s.dauer,0)
            const now=new Date(); const ws=getWeekStart(now); const we=new Date(ws); we.setDate(we.getDate()+6)
            const woche=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='freigegeben').filter(s=>{const d=new Date(s.datum);return d>=ws&&d<=we}).reduce((a,s)=>a+s.dauer,0)
            const diff=woche-(u.regel_stunden||38)
            const offene=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='ausstehend').length
            const isOpen=selectedMitarbeiter===u.id
            const myStunden=[...stunden.filter(s=>s.user_id===u.id)].sort((a,b)=>b.datum.localeCompare(a.datum))
            // Stundenkonto für diesen Mitarbeiter
            const { saldo: maKonto } = berechneStundenkonto(myStunden)
            const maKontoPos = maKonto >= 0
            return (
              <div key={u.id} className="card" style={{padding:0,overflow:'hidden'}}>
                <div onClick={()=>setSelectedMitarbeiter(isOpen?null:u.id)} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'1rem 1.25rem',cursor:'pointer',userSelect:'none'}}>
                  <div className="employee-avatar">{initials(u.name||u.email)}</div>
                  <div style={{flex:1}}>
                    <div className="font-bold" style={{color:'var(--dark)'}}>{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                    {offene>0&&<span style={{fontSize:'0.68rem',background:'#fef3c7',color:'#92400e',padding:'1px 8px',borderRadius:10,marginTop:2,display:'inline-block'}}>⏳ {offene} ausstehend</span>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                    <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--blue)',fontFamily:"'DM Mono',monospace"}}>{myH.toFixed(1)}h</span>
                    <span style={{fontSize:'0.7rem',color:diff>=0?'var(--green)':'var(--red)',fontWeight:600}}>{diff>=0?'+':''}{diff.toFixed(1)} Wo</span>
                  </div>
                  <span style={{color:'var(--text3)',fontSize:'0.85rem',marginLeft:4}}>{isOpen?'▲':'▼'}</span>
                </div>
                {isOpen&&(
                  <div style={{borderTop:'1px solid var(--border)',background:'var(--bg)'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:0,borderBottom:'1px solid var(--border)'}}>
                      <div style={{padding:'0.75rem',textAlign:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--blue)',fontFamily:"'DM Mono',monospace"}}>{myH.toFixed(1)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>Ges. Std.</div>
                      </div>
                      <div style={{padding:'0.75rem',textAlign:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:diff>=0?'var(--green)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{diff>=0?'+':''}{diff.toFixed(1)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{diff>=0?'Überstunden':'Fehlstunden'}</div>
                      </div>
                      <div style={{padding:'0.75rem',textAlign:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:'#d69e2e',fontFamily:"'DM Mono',monospace"}}>{(u.urlaub_gesamt||24)-(u.urlaub_genommen||0)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>Resturlaub</div>
                      </div>
                      <div style={{padding:'0.75rem',textAlign:'center'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:maKontoPos?'var(--green)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{maKontoPos?'+':''}{maKonto.toFixed(1)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>⏱ Konto</div>
                      </div>
                    </div>
                    {(()=>{
                      const byWeek = {}
                      myStunden.forEach(s => {
                        const ws = getWeekStart(new Date(s.datum))
                        const key = ws.toISOString().split('T')[0]
                        if(!byWeek[key]) byWeek[key] = {days:{}}
                        if(!byWeek[key].days[s.datum]) byWeek[key].days[s.datum] = []
                        byWeek[key].days[s.datum].push(s)
                      })
                      const weekKeys = Object.keys(byWeek).sort((a,b)=>b.localeCompare(a))
                      if(weekKeys.length===0) return <p style={{fontSize:'0.82rem',color:'var(--text3)',padding:'0.75rem 1rem'}}>Noch keine Einträge.</p>

                      const currentWkKey = getWeekStart(new Date()).toISOString().split('T')[0]
                      const defaultIdx = weekKeys.indexOf(currentWkKey) >= 0 ? weekKeys.indexOf(currentWkKey) : 0
                      const wkIdx = weekOffsets[u.id] ?? defaultIdx
                      const safeIdx = Math.min(Math.max(wkIdx,0), weekKeys.length-1)
                      const wk = weekKeys[safeIdx]
                      const week = byWeek[wk]
                      const weekTotal = Object.values(week.days).flat().reduce((a,s)=>a+s.dauer,0)
                      const weEnd = new Date(new Date(wk).setDate(new Date(wk).getDate()+6)).toISOString().split('T')[0]
                      const isCurrentWeek = wk===currentWkKey

                      return (
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:8,padding:'0.75rem 1rem',borderBottom:'1px solid var(--border)'}}>
                            <button onClick={e=>{e.stopPropagation();setWeekOffsets(o=>({...o,[u.id]:safeIdx+1}))}} disabled={safeIdx>=weekKeys.length-1} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',color:safeIdx>=weekKeys.length-1?'var(--text3)':'var(--dark)',flexShrink:0}}>‹</button>
                            <div style={{flex:1,textAlign:'center'}}>
                              <div style={{fontSize:'0.72rem',fontWeight:700,color:isCurrentWeek?'var(--blue)':'var(--text2)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                                {isCurrentWeek?'📅 Aktuelle Woche':'KW '+safeIdx} · {formatDate(wk)} – {formatDate(weEnd)}
                              </div>
                              <div style={{fontSize:'1rem',fontWeight:700,color:'var(--dark)',fontFamily:"'DM Mono',monospace"}}>{weekTotal.toFixed(1)}h</div>
                            </div>
                            <button onClick={e=>{e.stopPropagation();setWeekOffsets(o=>({...o,[u.id]:safeIdx-1}))}} disabled={safeIdx<=0} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',color:safeIdx<=0?'var(--text3)':'var(--dark)',flexShrink:0}}>›</button>
                          </div>
                          <div style={{padding:'0.75rem 1rem'}}>
                            {Object.keys(week.days).sort((a,b)=>b.localeCompare(a)).map(dayKey => {
                              const dayEntries = week.days[dayKey]
                              const dayTotal = dayEntries.reduce((a,s)=>a+s.dauer,0)
                              return (
                                <div key={dayKey} style={{marginBottom:'0.75rem'}}>
                                  <div style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text2)',padding:'4px 0',borderBottom:'1px solid var(--border2)',marginBottom:'4px',display:'flex',justifyContent:'space-between'}}>
                                    <span>{getDayName(dayKey)}, {formatDate(dayKey)}</span>
                                    <span style={{color:'var(--dark)',fontFamily:"'DM Mono',monospace"}}>{dayTotal.toFixed(1)}h</span>
                                  </div>
                                  {dayEntries.map(s=>{
                                    const b=baustellen.find(b=>b.id===s.baustelle_id)
                                    const statusColor=s.freigabe_status==='freigegeben'?'var(--green)':s.freigabe_status==='abgelehnt'?'var(--red)':'#d69e2e'
                                    return (
                                      <div key={s.id} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'4px 0 4px 8px'}}>
                                        <div style={{width:5,height:5,borderRadius:'50%',background:statusColor,flexShrink:0}}/>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:'0.8rem',fontWeight:500,color:s.notiz==='🤒 Krank'?'#c53030':'var(--dark)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notiz==='🤒 Krank'?'🤒 Kranktag':(b?.name||'—')}</div>
                                          <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{s.start_zeit}–{s.end_zeit}</div>
                                        </div>
                                        <span style={{fontSize:'0.8rem',fontWeight:600,color:'var(--dark)',fontFamily:"'DM Mono',monospace",flexShrink:0}}>{s.dauer.toFixed(1)}h</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {tab==='auswertung'&&(
        <>
          <div className="card">
            <div className="card-title">📊 Stunden je Baustelle</div>
            {[...baustellen].sort((a,b)=>{
              const ha=stunden.filter(s=>s.baustelle_id===a.id&&s.freigabe_status==='freigegeben').reduce((x,s)=>x+s.dauer,0)
              const hb=stunden.filter(s=>s.baustelle_id===b.id&&s.freigabe_status==='freigegeben').reduce((x,s)=>x+s.dauer,0)
              return hb-ha
            }).map(b=>{
              const h=stunden.filter(s=>s.baustelle_id===b.id&&s.freigabe_status==='freigegeben').reduce((a,s)=>a+s.dauer,0)
              return (<div key={b.id} className="list-item"><div className="list-item-left"><span className="list-item-title text-sm">{b.name}</span><span className="list-item-sub">{b.kunde} · <span className={`badge ${b.status==='aktiv'?'badge-active':'badge-done'}`}>{b.status}</span></span></div><span className="font-bold text-blue">{h.toFixed(1)}h</span></div>)
            })}
          </div>
          <div className="card">
            <div className="card-title">👷 Stunden je Mitarbeiter</div>
            {mitarbeiter.map(u=>{
              const h=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='freigegeben').reduce((a,s)=>a+s.dauer,0)
              return (<div key={u.id} className="list-item"><div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}><div className="employee-avatar" style={{width:32,height:32,fontSize:'0.75rem'}}>{initials(u.name||'')}</div><span className="font-bold">{u.name}</span></div><span className="font-bold text-blue">{h.toFixed(1)}h</span></div>)
            })}
          </div>
        </>
      )}

      {stundenDetail&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/>
          <div className="modal-title">📋 Stunden-Detail</div>
          {(()=>{
            const s=stundenDetail
            const b=baustellen.find(b=>b.id===s.baustelle_id)
            const isFri=new Date(s.datum).getDay()===5
            const istKrank=s.notiz==='🤒 Krank'
            const freigegeben=s.freigabe_status==='freigegeben'
            const abgelehnt=s.freigabe_status==='abgelehnt'
            return (
              <div>
                <div style={{background:'var(--bg)',borderRadius:12,padding:'1rem',marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'1rem',color:'var(--dark)'}}>{s.profiles?.name||'—'}</div>
                      <div style={{fontSize:'0.82rem',color:'var(--text3)',marginTop:2}}>{getDayName(s.datum)}, {formatDate(s.datum)}{isFri&&<span style={{marginLeft:6,fontSize:'0.72rem',background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:8}}>Freitag</span>}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--blue)',fontFamily:"'DM Mono',monospace"}}>{s.dauer.toFixed(1)}h</div>
                      <span style={{fontSize:'0.65rem',background:freigegeben?'var(--green-pale)':abgelehnt?'var(--red-pale)':'#fef3c7',color:freigegeben?'var(--green)':abgelehnt?'var(--red)':'#92400e',padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                        {freigegeben?'✓ Freigegeben':abgelehnt?'✗ Abgelehnt':'⏳ Ausstehend'}
                      </span>
                    </div>
                  </div>
                  <div style={{fontSize:'0.82rem',color:'var(--text3)',lineHeight:1.9}}>
                    <div>🏗️ <strong>Baustelle:</strong> {b?.name||'—'}</div>
                    <div>⏰ <strong>Zeit:</strong> {s.start_zeit} – {s.end_zeit} · {s.pause_min||0} Min Pause</div>
                  </div>
                </div>
                {istKrank?(
                  <div style={{background:'#fff5f5',border:'1px solid #feb2b2',borderRadius:12,padding:'1rem',marginBottom:12,textAlign:'center'}}>
                    <div style={{fontSize:'2rem',marginBottom:4}}>🤒</div>
                    <div style={{fontWeight:700,color:'#c53030'}}>Krankmeldung</div>
                  </div>
                ):(
                  <div style={{background:'#ebf8ff',border:'1px solid #bee3f8',borderRadius:12,padding:'1rem',marginBottom:12}}>
                    <div style={{fontSize:'0.72rem',fontWeight:700,color:'#2b6cb0',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>📋 Ausgeführte Arbeiten</div>
                    <div style={{fontSize:'0.9rem',color:'var(--dark)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{s.notiz||'—'}</div>
                  </div>
                )}
                {s.freigabe_status==='ausstehend'&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
                    <button className="btn btn-success" style={{marginBottom:0}} onClick={()=>{handleFreigabe(s.id,'freigegeben');setStundenDetail(null)}}>✓ Freigeben</button>
                    <button className="btn btn-danger" style={{marginBottom:0}} onClick={()=>{handleFreigabe(s.id,'abgelehnt');setStundenDetail(null)}}>✗ Ablehnen</button>
                  </div>
                )}
              </div>
            )
          })()}
          <button className="btn btn-secondary" onClick={()=>setStundenDetail(null)}>Schließen</button>
        </div></div>
      )}
      {showNewUser&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">👤 Mitarbeiter anlegen</div>
          <div className="form-group"><label>Name *</label><input value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="Max Mustermann"/></div>
          <div className="form-group"><label>Passwort *</label><input type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="Mindestens 6 Zeichen"/></div>
          <div className="form-group">
            <label>Rolle</label>
            <select value={newUser.rolle} onChange={e=>setNewUser(u=>({...u,rolle:e.target.value}))}>
              <option value="mitarbeiter">Mitarbeiter (Elektriker)</option>
              <option value="azubi">Azubi</option>
              <option value="buero">Büro (Minijob / Flex)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{background:'#f7fafc',borderRadius:8,padding:'0.6rem 0.8rem',fontSize:'0.78rem',color:'#718096',marginBottom:'0.75rem'}}>
            💡 Der Mitarbeiter meldet sich mit seinem Namen und diesem Passwort an.
          </div>
          <div className="form-row">
            <div className="form-group"><label>Wochenstunden</label><input type="number" value={newUser.regel_stunden} onChange={e=>setNewUser(u=>({...u,regel_stunden:parseInt(e.target.value)}))}/></div>
            <div className="form-group"><label>Urlaubstage/Jahr</label><input type="number" value={newUser.urlaub_gesamt} onChange={e=>setNewUser(u=>({...u,urlaub_gesamt:parseInt(e.target.value)}))}/></div>
          </div>
          <button className="btn btn-primary" onClick={handleNewUser} disabled={saving}>{saving?'Wird gespeichert...':'✓ Speichern'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowNewUser(false)}>Abbrechen</button>
        </div></div>
      )}
    </div>
  )
}


function KrankModal({user,baustellen,onClose,onSaved}) {
  const [datum,setDatum]=useState(today())
  const [saving,setSaving]=useState(false)
  const [confirm,setConfirm]=useState(false)
  const tagName=getDayName(datum)
  const dow=new Date(datum).getDay()
  const istWerktag=dow>=1&&dow<=4 // Mo=1 bis Do=4
  const krankBaustelle=baustellen.find(b=>b.name==='Büro')||baustellen.find(b=>b.status==='aktiv')

  async function handleSave() {
    if(!istWerktag){alert('Krank kann nur Mo–Do eingetragen werden!');return}
    // Prüfen ob schon ein Eintrag für diesen Tag existiert
    const {data:existing}=await supabase.from('stunden').select('id').eq('user_id',user.id).eq('datum',datum)
    if(existing&&existing.length>0){alert('Für diesen Tag gibt es bereits einen Eintrag!');return}
    setSaving(true)
    await supabase.from('stunden').insert([{
      user_id:user.id,
      baustelle_id:krankBaustelle?.id||null,
      datum,
      start_zeit:'07:30',
      end_zeit:'17:00',
      pause_min:45,
      dauer:9.5,
      notiz:'🤒 Krank',
      freigabe_status:'ausstehend'
    }])
    await onSaved(); onClose(); setSaving(false)
  }

  return (
    <div className="modal-overlay open"><div className="modal-sheet">
      <div className="modal-handle"/>
      <div className="modal-title">🤒 Krank melden</div>
      <div style={{background:'#fff5f5',border:'1px solid #feb2b2',borderRadius:10,padding:'0.75rem 1rem',marginBottom:'1rem',fontSize:'0.85rem',color:'#c53030'}}>
        Es werden automatisch <strong>9,5 Stunden</strong> als Kranktag eingetragen und müssen vom Admin freigegeben werden.
      </div>
      <div className="form-group">
        <label>Datum des Kranktages</label>
        <input type="date" value={datum} onChange={e=>{setDatum(e.target.value);setConfirm(false)}}/>
      </div>
      {datum&&(
        <div style={{background:istWerktag?'#f0fff4':'#fff5f5',border:`1px solid ${istWerktag?'#9ae6b4':'#feb2b2'}`,borderRadius:10,padding:'0.75rem 1rem',marginBottom:'1rem',fontSize:'0.85rem',color:istWerktag?'#276749':'#c53030',textAlign:'center',fontWeight:600}}>
          {istWerktag?`✓ ${tagName}, ${formatDate(datum)} — Werktag`:`✗ ${tagName} — nur Mo–Do möglich`}
        </div>
      )}
      {istWerktag&&!confirm&&(
        <button className="btn btn-primary" style={{background:'#c53030',marginBottom:'0.5rem'}} onClick={()=>setConfirm(true)}>
          🤒 Kranktag eintragen
        </button>
      )}
      {istWerktag&&confirm&&(
        <div style={{background:'#fff5f5',border:'1px solid #feb2b2',borderRadius:10,padding:'1rem',marginBottom:'0.75rem'}}>
          <div style={{fontWeight:600,color:'#742a2a',marginBottom:'0.5rem',fontSize:'0.9rem'}}>Wirklich für {formatDate(datum)} krank melden?</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <button onClick={handleSave} disabled={saving} style={{padding:'0.6rem',background:'#c53030',color:'white',border:'none',borderRadius:'var(--r-sm)',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'Wird gespeichert...':'✓ Ja, bestätigen'}
            </button>
            <button onClick={()=>setConfirm(false)} style={{padding:'0.6rem',background:'white',border:'1px solid var(--border2)',borderRadius:'var(--r-sm)',cursor:'pointer',fontFamily:'inherit'}}>Abbrechen</button>
          </div>
        </div>
      )}
      <button className="btn btn-secondary" onClick={onClose}>Schließen</button>
    </div></div>
  )
}

function StundenModal({user,baustellen,onClose,onSaved,isBuero}) {
  const bueroBaustelle=baustellen.find(b=>b.name==='Büro'&&b.status==='aktiv')
  const [form,setForm]=useState({datum:today(),start:'07:30',end:'17:00',baustelle_id:isBuero&&bueroBaustelle?bueroBaustelle.id:'',notiz:'',taetigkeit:'',arbeiten:''})
  const [saving,setSaving]=useState(false); const [showNewBs,setShowNewBs]=useState(false)
  const [newBs,setNewBs]=useState({name:'',kunde:'',adresse:'',beschreibung:''})
  const aktiveBaustellen=baustellen.filter(b=>b.status==='aktiv')
  const dauer=calcDauer(form.start,form.end)
  const isFriday=new Date(form.datum).getDay()===5
  async function handleSave() {
    if(!form.baustelle_id){alert('Bitte eine Baustelle auswählen!');return}
    if(dauer<=0){alert('Endzeit muss nach der Startzeit liegen!');return}
    if(isBuero&&!form.taetigkeit.trim()){alert('Bitte Tätigkeit beschreiben!');return}
    if(!isBuero&&!form.arbeiten.trim()){alert('Bitte ausgeführte Arbeiten beschreiben!');return}
    setSaving(true)
    const {data:existing}=await supabase.from('stunden').select('start_zeit,end_zeit,baustellen(name)').eq('user_id',user.id).eq('datum',form.datum)
    if(existing&&existing.length>0) {
      const newStart=form.start.replace(':',''); const newEnd=form.end.replace(':','')
      const overlap=existing.find(e=>{
        const eStart=e.start_zeit.slice(0,5).replace(':','')
        const eEnd=e.end_zeit.slice(0,5).replace(':','')
        return !(newEnd<=eStart||newStart>=eEnd)
      })
      if(overlap){
        setSaving(false)
        alert(`Überschneidung! Du hast an diesem Tag bereits Stunden von ${overlap.start_zeit.slice(0,5)} bis ${overlap.end_zeit.slice(0,5)} eingetragen.`)
        return
      }
    }
    const notizFinal=isBuero?form.taetigkeit:(form.arbeiten+(form.notiz?(' | '+form.notiz):''))
    await supabase.from('stunden').insert([{user_id:user.id,baustelle_id:form.baustelle_id,datum:form.datum,start_zeit:form.start,end_zeit:form.end,pause_min:isBuero?0:45,dauer,notiz:notizFinal,freigabe_status:'ausstehend'}])
    await onSaved(); onClose(); setSaving(false)
  }
  async function handleNewBs() {
    if(!newBs.name||!newBs.kunde){alert('Name und Kunde angeben!');return}
    const {data}=await supabase.from('baustellen').insert([{...newBs,status:'aktiv'}]).select().single()
    await onSaved(); if(data)setForm(f=>({...f,baustelle_id:data.id})); setShowNewBs(false)
  }
  return (
    <div className="modal-overlay open"><div className="modal-sheet">
      <div className="modal-handle"/><div className="modal-title">{isBuero?'📋 Bürostunden erfassen':'⏱️ Stunden erfassen'}</div>
      {isBuero&&<div style={{background:'#ebf8ff',border:'1px solid #bee3f8',borderRadius:10,padding:'0.6rem 1rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#2b6cb0'}}>📋 <strong>Büro-Modus</strong> — Tätigkeit wird als Pflichtfeld erfasst</div>}
      {!isBuero&&isFriday&&<div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:10,padding:'0.6rem 1rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#92400e'}}>🟡 <strong>Freitag</strong> — wird als Überstunden gewertet</div>}
      <div className="form-group"><label>Mitarbeiter</label><input value={user.profile?.name||user.email} readOnly style={{background:'#f7fafc',color:'#718096'}}/></div>
      <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
      <div className="form-row">
        <div className="form-group"><label>Startzeit</label><input type="time" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/></div>
        <div className="form-group"><label>Endzeit</label><input type="time" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/></div>
      </div>
      <div className="calc-box">
        <div>
          <div className="calc-label">Arbeitszeit{isBuero?' (ohne Pausenabzug)':' (inkl. 45 Min Pause)'}</div>
          <div className="calc-note">{isBuero?'📋 Büro-Zeiterfassung · Freigabe erforderlich':'✓ Pause ist bezahlt · Freigabe durch Chef erforderlich'}</div>
        </div>
        <div className="calc-value">{dauer.toFixed(2)} Std</div>
      </div>
      {isBuero?(
        <div className="form-group">
          <label>Was wurde getan? *</label>
          <textarea value={form.taetigkeit} onChange={e=>setForm(f=>({...f,taetigkeit:e.target.value}))} placeholder="z.B. Rechnungen bearbeitet, Angebote geschrieben, Telefonate, Buchhaltung..." style={{minHeight:90,border:!form.taetigkeit.trim()?'1.5px solid #fc8181':'1.5px solid var(--green)'}}/>
          {!form.taetigkeit.trim()&&<div style={{fontSize:'0.72rem',color:'var(--red)',marginTop:3}}>Pflichtfeld — bitte ausfüllen</div>}
        </div>
      ):(
        <>
          <div className="form-group">
            <label>Baustelle</label>
            <select value={form.baustelle_id} onChange={e=>setForm(f=>({...f,baustelle_id:e.target.value}))}>
              <option value="">— Bitte auswählen —</option>
              {aktiveBaustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}><button className="btn btn-outline btn-sm" onClick={()=>setShowNewBs(true)}>+ Neue Baustelle anlegen</button></div>
          <div className="form-group">
            <label>Ausgeführte Arbeiten *</label>
            <textarea value={form.arbeiten} onChange={e=>setForm(f=>({...f,arbeiten:e.target.value}))} placeholder="Kurze Beschreibung reicht, z.B. Kabelverlegung EG, Steckdosen montiert, Verteilung verdrahtet..." style={{minHeight:80,border:!form.arbeiten.trim()?'1.5px solid #fc8181':'1.5px solid var(--green)'}}/>
            {!form.arbeiten.trim()&&<div style={{fontSize:'0.72rem',color:'var(--red)',marginTop:3}}>Pflichtfeld — eine kurze Beschreibung reicht</div>}
          </div>
          <div className="form-group"><label>Zusätzliche Notiz (optional)</label><textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Material fehlt, nächste Schritte..."/></div>
        </>
      )}
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Wird gespeichert...':'✓ Stunden einreichen'}</button>
      <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
      {showNewBs&&(
        <div className="modal-overlay open" style={{zIndex:300}}><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">🏗️ Neue Baustelle</div>
          <div className="form-group"><label>Baustellenname *</label><input value={newBs.name} onChange={e=>setNewBs(b=>({...b,name:e.target.value}))}/></div>
          <div className="form-group"><label>Kunde *</label><input value={newBs.kunde} onChange={e=>setNewBs(b=>({...b,kunde:e.target.value}))}/></div>
          <div className="form-group"><label>Adresse</label><input value={newBs.adresse} onChange={e=>setNewBs(b=>({...b,adresse:e.target.value}))}/></div>
          <div className="form-group"><label>Beschreibung</label><textarea value={newBs.beschreibung} onChange={e=>setNewBs(b=>({...b,beschreibung:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={handleNewBs}>✓ Baustelle speichern</button>
          <button className="btn btn-secondary" onClick={()=>setShowNewBs(false)}>Abbrechen</button>
        </div></div>
      )}
    </div></div>
  )
}

const EI = {
  steckdose: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><circle cx="20" cy="21" r="6" stroke="#1B52DD" strokeWidth="1.5"/><rect x="17" y="11" width="2.5" height="6" rx="1.2" fill="#1B52DD"/><rect x="21" y="11" width="2.5" height="6" rx="1.2" fill="#1B52DD"/></svg>,
  rahmen1: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="2" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  rahmen2: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="3" y="7" width="34" height="26" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="7" y="11" width="11" height="18" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="22" y="11" width="11" height="18" rx="2" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  rahmen3: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="2" y="4" width="36" height="32" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="5" y="8" width="9" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="16" y="8" width="9" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="27" y="8" width="9" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  rahmen4: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="1" y="4" width="38" height="32" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="3" y="8" width="7" height="24" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="12" y="8" width="7" height="24" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="21" y="8" width="7" height="24" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="30" y="8" width="7" height="24" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  rahmen5: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="1" y="5" width="38" height="30" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="3" y="9" width="5.5" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="10" y="9" width="5.5" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="17" y="9" width="5.5" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="24" y="9" width="5.5" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="31" y="9" width="5.5" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  schalter: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="13" y="13" width="14" height="8" rx="2" fill="#1B52DD" fillOpacity="0.15" stroke="#1B52DD" strokeWidth="1.5"/></svg>,
  kontroll: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="20" cy="20" r="4" fill="#1B52DD"/><circle cx="20" cy="20" r="2" fill="white"/></svg>,
  serien: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="3" y="3" width="34" height="34" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="7" y="7" width="26" height="26" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="10" y="11" width="8" height="18" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="12" y="13" width="4" height="7" rx="1.5" fill="#1B52DD" fillOpacity="0.25" stroke="#1B52DD" strokeWidth="1"/><rect x="22" y="11" width="8" height="18" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="24" y="13" width="4" height="7" rx="1.5" fill="#1B52DD" fillOpacity="0.25" stroke="#1B52DD" strokeWidth="1"/></svg>,
  kreuz: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><line x1="14" y1="14" x2="26" y2="26" stroke="#1B52DD" strokeWidth="2" strokeLinecap="round"/><line x1="26" y1="14" x2="14" y2="26" stroke="#1B52DD" strokeWidth="2" strokeLinecap="round"/></svg>,
  netzwerk: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="3" y="3" width="34" height="34" rx="3" stroke="#1B52DD" strokeWidth="2"/><rect x="7" y="7" width="26" height="26" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="10" y="12" width="8" height="12" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><line x1="12" y1="15" x2="12" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="14" y1="15" x2="14" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="16" y1="15" x2="16" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><rect x="22" y="12" width="8" height="12" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><line x1="24" y1="15" x2="24" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="26" y1="15" x2="26" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="28" y1="15" x2="28" y2="21" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/></svg>,
  sat: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><rect x="8" y="10" width="24" height="16" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="10" y="12" width="20" height="12" rx="1" stroke="#1B52DD" strokeWidth="1" fill="#1B52DD" fillOpacity="0.08"/><line x1="15" y1="26" x2="13" y2="31" stroke="#1B52DD" strokeWidth="1.5" strokeLinecap="round"/><line x1="25" y1="26" x2="27" y2="31" stroke="#1B52DD" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="31" x2="28" y2="31" stroke="#1B52DD" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  rohr: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><ellipse cx="20" cy="20" rx="9" ry="9" stroke="#1B52DD" strokeWidth="1.5"/><ellipse cx="20" cy="20" rx="5" ry="5" stroke="#1B52DD" strokeWidth="1.5" fill="#1B52DD" fillOpacity="0.1"/><line x1="7" y1="20" x2="11" y2="20" stroke="#1B52DD" strokeWidth="2" strokeLinecap="round"/><line x1="29" y1="20" x2="33" y2="20" stroke="#1B52DD" strokeWidth="2" strokeLinecap="round"/></svg>,
  kabelkanal: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><rect x="7" y="14" width="26" height="12" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><rect x="7" y="14" width="26" height="4" rx="2" fill="#1B52DD" fillOpacity="0.15"/><line x1="12" y1="20" x2="12" y2="26" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="17" y1="20" x2="17" y2="26" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="22" y1="20" x2="22" y2="26" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/><line x1="27" y1="20" x2="27" y2="26" stroke="#1B52DD" strokeWidth="1" strokeLinecap="round"/></svg>,
  ap1: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="2" stroke="#1B52DD" strokeWidth="2"/><rect x="8" y="8" width="24" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="20" cy="21" r="5" stroke="#1B52DD" strokeWidth="1.5"/><rect x="18" y="13" width="2" height="5" rx="1" fill="#1B52DD"/><rect x="21" y="13" width="2" height="5" rx="1" fill="#1B52DD"/></svg>,
  ap2: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="2" y="4" width="36" height="32" rx="2" stroke="#1B52DD" strokeWidth="2"/><rect x="5" y="8" width="13" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="11.5" cy="22" r="4" stroke="#1B52DD" strokeWidth="1.5"/><rect x="10" y="13" width="1.8" height="4" rx="0.9" fill="#1B52DD"/><rect x="12.5" y="13" width="1.8" height="4" rx="0.9" fill="#1B52DD"/><rect x="22" y="8" width="13" height="24" rx="2" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="28.5" cy="22" r="4" stroke="#1B52DD" strokeWidth="1.5"/><rect x="27" y="13" width="1.8" height="4" rx="0.9" fill="#1B52DD"/><rect x="29.5" y="13" width="1.8" height="4" rx="0.9" fill="#1B52DD"/></svg>,
  ap3: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="1" y="5" width="38" height="30" rx="2" stroke="#1B52DD" strokeWidth="2"/><rect x="3" y="9" width="10" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="8" cy="22" r="3" stroke="#1B52DD" strokeWidth="1.2"/><rect x="6.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/><rect x="8.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/><rect x="15" y="9" width="10" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="20" cy="22" r="3" stroke="#1B52DD" strokeWidth="1.2"/><rect x="18.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/><rect x="20.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/><rect x="27" y="9" width="10" height="22" rx="1.5" stroke="#1B52DD" strokeWidth="1.5"/><circle cx="32" cy="22" r="3" stroke="#1B52DD" strokeWidth="1.2"/><rect x="30.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/><rect x="32.5" y="13" width="1.5" height="3.5" rx="0.7" fill="#1B52DD"/></svg>,
  kabel: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><path d="M8 20 Q14 12 20 20 Q26 28 32 20" stroke="#1B52DD" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="8" cy="20" r="2" fill="#1B52DD"/><circle cx="32" cy="20" r="2" fill="#1B52DD"/></svg>,
  kabel_nyy: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><path d="M8 18 Q14 10 20 18 Q26 26 32 18" stroke="#1B52DD" strokeWidth="2.5" fill="none" strokeLinecap="round"/><circle cx="8" cy="18" r="2" fill="#1B52DD"/><circle cx="32" cy="18" r="2" fill="#1B52DD"/><text x="20" y="32" textAnchor="middle" fontSize="7" fill="#1B52DD" fontWeight="bold" fontFamily="sans-serif">NYY</text></svg>,
  kabel_bus: <svg viewBox="0 0 40 40" fill="none" width="22" height="22"><rect x="4" y="4" width="32" height="32" rx="4" stroke="#1B52DD" strokeWidth="2"/><path d="M8 16 L32 16" stroke="#1B52DD" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 24 L32 24" stroke="#1B52DD" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="16" r="2" fill="#1B52DD"/><circle cx="32" cy="16" r="2" fill="#1B52DD"/><circle cx="8" cy="24" r="2" fill="#1B52DD"/><circle cx="32" cy="24" r="2" fill="#1B52DD"/><line x1="14" y1="16" x2="14" y2="24" stroke="#1B52DD" strokeWidth="1" strokeDasharray="2,2"/><line x1="20" y1="16" x2="20" y2="24" stroke="#1B52DD" strokeWidth="1" strokeDasharray="2,2"/><line x1="26" y1="16" x2="26" y2="24" stroke="#1B52DD" strokeWidth="1" strokeDasharray="2,2"/></svg>,
}

const MATERIALS_BAUSTELLE = [
  { id: 'steckdose', label: 'Steckdose', icon: 'steckdose', unit: 'Stk' },
  { id: 'rahmen1', label: '1-Fach Rahmen', icon: 'rahmen1', unit: 'Stk' },
  { id: 'rahmen2', label: '2-Fach Rahmen', icon: 'rahmen2', unit: 'Stk' },
  { id: 'rahmen3', label: '3-Fach Rahmen', icon: 'rahmen3', unit: 'Stk' },
  { id: 'rahmen4', label: '4-Fach Rahmen', icon: 'rahmen4', unit: 'Stk' },
  { id: 'rahmen5', label: '5-Fach Rahmen', icon: 'rahmen5', unit: 'Stk' },
  { id: 'wechsel', label: 'Aus/Wechselschalter', icon: 'schalter', unit: 'Stk' },
  { id: 'kontroll', label: 'Kontrollschalter', icon: 'kontroll', unit: 'Stk' },
  { id: 'serien', label: 'Serienschalter', icon: 'serien', unit: 'Stk' },
  { id: 'kreuz', label: 'Kreuzschalter', icon: 'kreuz', unit: 'Stk' },
  { id: 'netzwerk', label: 'Netzwerkdose', icon: 'netzwerk', unit: 'Stk' },
  { id: 'sat', label: 'Sat-Dose', icon: 'sat', unit: 'Stk' },
]

const MATERIALS_WAERMEPUMPE = [
  { id: 'm16', label: 'M16 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'm20', label: 'M20 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'm25', label: 'M25 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'm32', label: 'M32 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'm40', label: 'M40 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'm50', label: 'M50 Rohr', icon: 'rohr', unit: 'm' },
  { id: 'kk2030', label: 'Kabelkanal 20×30', icon: 'kabelkanal', unit: 'm' },
  { id: 'kk4040', label: 'Kabelkanal 40×40', icon: 'kabelkanal', unit: 'm' },
  { id: 'kk4060', label: 'Kabelkanal 40×60', icon: 'kabelkanal', unit: 'm' },
  { id: 'ap1', label: 'AP-Steckdose 1-fach', icon: 'ap1', unit: 'Stk' },
  { id: 'ap2', label: 'AP-Steckdose 2-fach', icon: 'ap2', unit: 'Stk' },
  { id: 'ap3', label: 'AP-Steckdose 3-fach', icon: 'ap3', unit: 'Stk' },
  { id: 'k315', label: 'Kabel 3×1,5 mm²', icon: 'kabel', unit: 'm' },
  { id: 'k515', label: 'Kabel 5×1,5 mm²', icon: 'kabel', unit: 'm' },
  { id: 'k54', label: 'Kabel 5×4 mm²', icon: 'kabel', unit: 'm' },
  { id: 'k54nyy', label: 'Kabel 5×4 NYY mm²', icon: 'kabel_nyy', unit: 'm' },
  { id: 'k2bus', label: '2×0,75 Busleitung mm²', icon: 'kabel_bus', unit: 'm' },
  { id: 'k510', label: 'Kabel 5×10 mm²', icon: 'kabel', unit: 'm' },
]

function CounterPage({ baustellen, user }) {
  const [mode, setMode] = useState('baustelle')
  const [selectedBs, setSelectedBs] = useState('')
  const [counts, setCounts] = useState({})
  const [custom, setCustom] = useState([])
  const [newCustom, setNewCustom] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)

  const [cloudStatus, setCloudStatus] = useState('') // 'saved' | 'error' | 'saving'
  const saveTimerRef = useRef(null)

  const materials = mode === 'baustelle' ? MATERIALS_BAUSTELLE : MATERIALS_WAERMEPUMPE
  const storageKey = 'counter_' + mode + '_' + selectedBs

  // Laden: gemeinsamer Eintrag pro Baustelle+Mode (neuester Stand, egal wer gespeichert hat)
  useEffect(() => {
    if (!selectedBs) return
    async function loadCounter() {
      setCloudStatus('')
      // Neuesten Eintrag fuer diese Baustelle laden (egal von welchem User)
      const { data: rows } = await supabase.from('counter_saves')
        .select('counts,custom,updated_at,user_id')
        .eq('baustelle_id', selectedBs)
        .eq('mode', mode)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (rows && rows.length > 0) {
        setCounts(rows[0].counts||{}); setCustom(rows[0].custom||[]); return
      }
      // localStorage Fallback wenn gar nichts in Supabase
      if (typeof window !== 'undefined') {
        try {
          const saved = window.localStorage.getItem(storageKey)
          if (saved) { const d = JSON.parse(saved); setCounts(d.counts||{}); setCustom(d.custom||[]) }
          else { setCounts({}); setCustom([]) }
        } catch(e) { setCounts({}); setCustom([]) }
      }
    }
    loadCounter()
  }, [selectedBs, mode])

  function saveLocal(nc, ncu) {
    if (!selectedBs || typeof window === 'undefined') return
    try { window.localStorage.setItem(storageKey, JSON.stringify({counts:nc,custom:ncu})) } catch(e) {}
  }

  async function saveCloud(nc, ncu) {
    if (!user?.id || !selectedBs) return
    setCloudStatus('saving')
    const { error } = await supabase.from('counter_saves').upsert(
      { user_id: user.id, baustelle_id: selectedBs, mode, counts: nc, custom: ncu, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,baustelle_id,mode' }
    )
    if (error) { setCloudStatus('error') } else { setCloudStatus('saved') }
    setTimeout(() => setCloudStatus(''), 3000)
  }

  function autoSave(nc, ncu) {
    // localStorage sofort
    saveLocal(nc, ncu)
    // Supabase mit 800ms Debounce (wartet auf letzten Klick)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveCloud(nc, ncu), 800)
  }

  function change(id, delta) {
    const nc={...counts,[id]:Math.max(0,(counts[id]||0)+delta)}
    setCounts(nc); autoSave(nc,custom)
  }
  function addCustom() {
    if (!newCustom.trim()) return
    const ncu=[...custom,{id:'c'+Date.now(),label:newCustom.trim()}]
    setCustom(ncu); setNewCustom(''); setShowAddCustom(false); autoSave(counts,ncu)
  }
  function removeCustom(id) {
    const ncu=custom.filter(c=>c.id!==id); const nc={...counts}; delete nc[id]
    setCustom(ncu); setCounts(nc); autoSave(nc,ncu)
  }

  const aktiveBaustellen = baustellen.filter(b => b.status === 'aktiv')

  return (
    <div className="page-content">
      <div style={{display:'flex',background:'white',borderRadius:'var(--r-xl)',padding:4,marginBottom:'1rem',boxShadow:'var(--shadow-sm)',border:'1px solid var(--border)'}}>
        <button onClick={()=>{setMode('baustelle');setCounts({});setCustom([])}} style={{flex:1,padding:'0.625rem',borderRadius:'var(--r-lg)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem',fontWeight:600,transition:'all 0.2s',background:mode==='baustelle'?'var(--dark)':'transparent',color:mode==='baustelle'?'white':'var(--text2)'}}>🏗️ Baustelle</button>
        <button onClick={()=>{setMode('waermepumpe');setCounts({});setCustom([])}} style={{flex:1,padding:'0.625rem',borderRadius:'var(--r-lg)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem',fontWeight:600,transition:'all 0.2s',background:mode==='waermepumpe'?'var(--dark)':'transparent',color:mode==='waermepumpe'?'white':'var(--text2)'}}>🌡️ Wärmepumpe</button>
      </div>
      <div className="form-group" style={{marginBottom:'1rem'}}>
        <label>Baustelle auswählen</label>
        <select value={selectedBs} onChange={e=>setSelectedBs(e.target.value)}>
          <option value="">— Bitte auswählen —</option>
          {aktiveBaustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {!selectedBs&&(
        <div className="empty-state">
          <div className="empty-icon"><IconCounter/></div>
          <div className="empty-title">Baustelle auswählen</div>
          <div className="empty-sub">Wähle eine Baustelle um den Counter zu starten.</div>
        </div>
      )}
      {selectedBs&&(
        <>
          <div className="section-header" style={{marginBottom:'0.75rem'}}>
            <span className="section-title">{mode==='baustelle'?'Elektro-Material':'Wärmepumpen-Material'}</span>
            <div style={{display:'flex',gap:6}}>
              <button className="btn btn-outline btn-sm" onClick={()=>{setCounts({});autoSave({},custom)}} style={{color:'var(--red)',borderColor:'var(--red)'}}>Reset</button>
              <span style={{fontSize:'0.72rem',fontWeight:600,padding:'4px 10px',borderRadius:20,transition:'all 0.3s',
                background:cloudStatus==='saved'?'#c6f6d5':cloudStatus==='error'?'#fed7d7':cloudStatus==='saving'?'#ebf8ff':'#f0f0f0',
                color:cloudStatus==='saved'?'#276749':cloudStatus==='error'?'#9b2c2c':cloudStatus==='saving'?'#2b6cb0':'#999'}}>
                {cloudStatus==='saved'?'☁️ Gespeichert':cloudStatus==='error'?'✗ Sync-Fehler':cloudStatus==='saving'?'⏳ Sync...':'☁️ Auto-Sync'}
              </span>
            </div>
          </div>
          <div className="card" style={{padding:'0.5rem 0.75rem'}}>
            {materials.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.625rem 0.25rem',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:'var(--blue-pale)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{EI[m.icon]}</div>
                <span style={{flex:1,fontSize:'0.85rem',fontWeight:500,color:'var(--dark)',lineHeight:1.3}}>{m.label}</span>
                <div style={{display:'flex',alignItems:'center',flexShrink:0}}>
                  <button onClick={()=>change(m.id,-1)} style={{width:34,height:34,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',fontSize:'1.3rem',fontWeight:700,cursor:'pointer',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
                  <div style={{width:48,textAlign:'center'}}>
                    <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--dark)',fontFamily:"'DM Mono',monospace",lineHeight:1}}>{counts[m.id]||0}</div>
                    <div style={{fontSize:'0.6rem',color:'var(--text3)',marginTop:1}}>{m.unit}</div>
                  </div>
                  <button onClick={()=>change(m.id,1)} style={{width:34,height:34,borderRadius:'50%',border:'none',background:'var(--blue)',fontSize:'1.3rem',fontWeight:700,cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{marginTop:'0.875rem'}}>
            <div className="card-title">🔧 Benutzerdefiniert</div>
            {custom.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.625rem 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:'var(--bg)',border:'1.5px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',color:'var(--text3)',flexShrink:0}}>▪</div>
                <span style={{flex:1,fontSize:'0.85rem',fontWeight:500,color:'var(--dark)'}}>{c.label}</span>
                <div style={{display:'flex',alignItems:'center',flexShrink:0}}>
                  <button onClick={()=>change(c.id,-1)} style={{width:34,height:34,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',fontSize:'1.3rem',cursor:'pointer',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
                  <span style={{width:48,textAlign:'center',fontSize:'1.1rem',fontWeight:700,color:'var(--dark)',fontFamily:"'DM Mono',monospace"}}>{counts[c.id]||0}</span>
                  <button onClick={()=>change(c.id,1)} style={{width:34,height:34,borderRadius:'50%',border:'none',background:'var(--blue)',fontSize:'1.3rem',cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
                </div>
                <button onClick={()=>removeCustom(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'1rem',padding:4}}>✕</button>
              </div>
            ))}
            {showAddCustom?(
              <div style={{paddingTop:'0.75rem',display:'flex',gap:'0.5rem'}}>
                <input value={newCustom} onChange={e=>setNewCustom(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()} placeholder="Position benennen..." style={{flex:1,padding:'0.6rem 0.875rem',border:'1.5px solid var(--blue)',borderRadius:'var(--r-sm)',fontSize:'0.85rem',fontFamily:'inherit'}} autoFocus/>
                <button onClick={addCustom} style={{padding:'0.6rem 1rem',background:'var(--blue)',color:'white',border:'none',borderRadius:'var(--r-sm)',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
              </div>
            ):(
              <button onClick={()=>setShowAddCustom(true)} className="btn btn-outline" style={{marginTop:'0.75rem',marginBottom:0}}>+ Eigene Position</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}


const TYP_CONFIG = {
  termin:   { label: 'Termin',   farbe: '#1B52DD', emoji: '📅' },
  deadline: { label: 'Deadline', farbe: '#D63E3E', emoji: '🔴' },
  baustelle:{ label: 'Baustelle',farbe: '#d69e2e', emoji: '🏗️' },
  outlook:  { label: 'Outlook',  farbe: '#0078d4', emoji: '📧' },
}

function KalenderMonat({termine,ankerDatum,setAnkerDatum,heute,setShowDetail}) {
  const jahr=ankerDatum.getFullYear(); const monat=ankerDatum.getMonth()
  const ersterTag=new Date(jahr,monat,1); const letzterTag=new Date(jahr,monat+1,0)
  const startDow=ersterTag.getDay()===0?6:ersterTag.getDay()-1
  const tage=[]
  for(let i=0;i<startDow;i++) tage.push(null)
  for(let d=1;d<=letzterTag.getDate();d++) tage.push(new Date(jahr,monat,d))
  const monatNamen=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={()=>setAnkerDatum(new Date(ankerDatum.getFullYear(),ankerDatum.getMonth()-1,1))} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
        <span style={{fontWeight:700,color:'var(--dark)',fontSize:'1rem'}}>{monatNamen[monat]} {jahr}</span>
        <button onClick={()=>setAnkerDatum(new Date(ankerDatum.getFullYear(),ankerDatum.getMonth()+1,1))} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=><div key={d} style={{textAlign:'center',fontSize:'0.65rem',fontWeight:700,color:'var(--text3)',padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {tage.map((tag,i)=>{
          if(!tag) return <div key={i}/>
          const tagStr=tag.toISOString().split('T')[0]
          const tagTermine=termine.filter(t=>t.datum===tagStr)
          const istHeute=tagStr===heute.toISOString().split('T')[0]
          const istWE=tag.getDay()===0||tag.getDay()===6
          return (
            <div key={i} onClick={()=>{if(tagTermine.length>0)setShowDetail(tagTermine)}} style={{minHeight:52,padding:3,borderRadius:6,background:istHeute?'var(--blue)':istWE?'#f7f7f7':'white',border:istHeute?'none':'1px solid #eee',cursor:tagTermine.length>0?'pointer':'default'}}>
              <div style={{fontSize:'0.72rem',fontWeight:istHeute?700:400,color:istHeute?'white':istWE?'#aaa':'var(--dark)',textAlign:'center'}}>{tag.getDate()}</div>
              <div style={{display:'flex',flexDirection:'column',gap:1,marginTop:2}}>
                {tagTermine.slice(0,2).map(t=>(
                  <div key={t.id} style={{fontSize:'0.55rem',background:TYP_CONFIG[t.typ]?.farbe||'var(--blue)',color:'white',borderRadius:3,padding:'1px 3px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',fontWeight:600}}>
                    {TYP_CONFIG[t.typ]?.emoji} {t.titel}
                  </div>
                ))}
                {tagTermine.length>2&&<div style={{fontSize:'0.55rem',color:'var(--text3)',textAlign:'center'}}>+{tagTermine.length-2}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KalenderWoche({termine,ankerDatum,setAnkerDatum,heute,setShowDetail}) {
  const wochenStart=getWeekStart(new Date(ankerDatum))
  const tage=[]
  for(let i=0;i<7;i++){const d=new Date(wochenStart);d.setDate(d.getDate()+i);tage.push(d)}
  const tagNamen=['Mo','Di','Mi','Do','Fr','Sa','So']
  const wochenEnd=new Date(wochenStart);wochenEnd.setDate(wochenStart.getDate()+6)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={()=>{const d=new Date(ankerDatum);d.setDate(d.getDate()-7);setAnkerDatum(d)}} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
        <span style={{fontWeight:700,color:'var(--dark)',fontSize:'0.9rem'}}>{formatDate(wochenStart.toISOString().split('T')[0])} – {formatDate(wochenEnd.toISOString().split('T')[0])}</span>
        <button onClick={()=>{const d=new Date(ankerDatum);d.setDate(d.getDate()+7);setAnkerDatum(d)}} style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid var(--border2)',background:'white',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
        {tage.map((tag,i)=>{
          const tagStr=tag.toISOString().split('T')[0]
          const tagTermine=termine.filter(t=>t.datum===tagStr)
          const istHeute=tagStr===heute.toISOString().split('T')[0]
          const istWE=i>=5
          return (
            <div key={i} style={{background:istHeute?'#ebf8ff':istWE?'#fafafa':'white',borderRadius:10,padding:'6px 4px',border:`1.5px solid ${istHeute?'var(--blue)':'#eee'}`,minHeight:80}}>
              <div style={{textAlign:'center',marginBottom:4}}>
                <div style={{fontSize:'0.6rem',color:istWE?'#aaa':'var(--text3)',fontWeight:600}}>{tagNamen[i]}</div>
                <div style={{fontSize:'0.85rem',fontWeight:700,width:24,height:24,borderRadius:'50%',background:istHeute?'var(--blue)':'transparent',color:istHeute?'white':istWE?'#bbb':'var(--dark)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>{tag.getDate()}</div>
              </div>
              {tagTermine.map(t=>(
                <div key={t.id} onClick={()=>setShowDetail([t])} style={{fontSize:'0.6rem',background:TYP_CONFIG[t.typ]?.farbe||'var(--blue)',color:'white',borderRadius:4,padding:'2px 4px',marginBottom:2,cursor:'pointer',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {TYP_CONFIG[t.typ]?.emoji} {t.titel}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KalenderListe({termine,heute,baustellen,allUsers,user,setShowDetail}) {
  const heuteStr=heute.toISOString().split('T')[0]
  const kommend=termine.filter(t=>t.datum>=heuteStr).slice(0,50)
  const vergangen=termine.filter(t=>t.datum<heuteStr).sort((a,b)=>b.datum.localeCompare(a.datum)).slice(0,20)
  const TerminItem=({t})=>{
    const bs=baustellen.find(b=>b.id===t.baustelle_id)
    const zugewiesen=allUsers.filter(u=>t.zugewiesen_an?.includes(u.id))
    const cfg=TYP_CONFIG[t.typ]||TYP_CONFIG.termin
    const istMeiner=t.zugewiesen_an?.includes(user.id)||t.erstellt_von===user.id
    return (
      <div onClick={()=>setShowDetail([t])} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',opacity:t.datum<heuteStr?0.6:1}}>
        <div style={{width:40,flexShrink:0,textAlign:'center'}}>
          <div style={{fontSize:'1.3rem'}}>{cfg.emoji}</div>
          <div style={{fontSize:'0.55rem',background:cfg.farbe,color:'white',borderRadius:4,padding:'1px 3px',fontWeight:700,marginTop:2}}>{cfg.label}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--dark)',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {t.titel}
            {istMeiner&&<span style={{fontSize:'0.6rem',background:'var(--blue-pale)',color:'var(--blue)',padding:'1px 6px',borderRadius:10,fontWeight:600}}>Mein Termin</span>}
          </div>
          <div style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:2}}>
            📅 {formatDate(t.datum)}{t.uhrzeit&&` · ${t.uhrzeit.slice(0,5)} Uhr`}
            {t.bis_datum&&t.bis_datum!==t.datum&&` – ${formatDate(t.bis_datum)}`}
          </div>
          {bs&&<div style={{fontSize:'0.72rem',color:'var(--blue)',marginTop:2}}>🏗️ {bs.name}</div>}
          {zugewiesen.length>0&&<div style={{fontSize:'0.7rem',color:'var(--text3)',marginTop:2}}>👷 {zugewiesen.map(u=>u.name).join(', ')}</div>}
          {t.beschreibung&&<div style={{fontSize:'0.72rem',color:'#666',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.beschreibung}</div>}
        </div>
      </div>
    )
  }
  return (
    <div>
      {kommend.length===0&&vergangen.length===0&&<p className="text-muted text-sm">Noch keine Termine.</p>}
      {kommend.length>0&&(
        <div style={{marginBottom:12}}>
          <div className="card-title">📅 Kommende Termine ({kommend.length})</div>
          {kommend.map(t=><TerminItem key={t.id} t={t}/>)}
        </div>
      )}
      {vergangen.length>0&&(
        <div>
          <div className="card-title" style={{color:'var(--text3)'}}>✓ Vergangene Termine</div>
          {vergangen.map(t=><TerminItem key={t.id} t={t}/>)}
        </div>
      )}
    </div>
  )
}

function KalenderDetailModal({showDetail,setShowDetail,baustellen,allUsers,kannBearbeiten,handleDelete}) {
  if(!showDetail) return null
  const liste=Array.isArray(showDetail)?showDetail:[showDetail]
  const savedFarben = typeof window!=='undefined' ? JSON.parse(window.localStorage.getItem('ms_kategorien_farben')||'{}') : {}
  return (
    <div className="modal-overlay open"><div className="modal-sheet">
      <div className="modal-handle"/>
      <div className="modal-title">📅 {liste.length>1?`${liste.length} Termine`:'Termin'}</div>
      {liste.map(t=>{
        const cfg=TYP_CONFIG[t.typ]||TYP_CONFIG.termin
        const bs=baustellen.find(b=>b.id===t.baustelle_id)
        const ersteller=allUsers.find(u=>u.id===t.erstellt_von)
        const zugewiesen=allUsers.filter(u=>t.zugewiesen_an?.includes(u.id))
        return (
          <div key={t.id} style={{background:'var(--bg)',borderRadius:12,padding:'1rem',marginBottom:12,border:`2px solid ${cfg.farbe}22`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:'1.5rem'}}>{cfg.emoji}</span>
              <div>
                <div style={{fontWeight:700,fontSize:'1rem',color:'var(--dark)'}}>{t.titel}</div>
                <span style={{fontSize:'0.68rem',background:cfg.farbe,color:'white',padding:'1px 8px',borderRadius:10,fontWeight:600}}>{cfg.label}</span>
              </div>
            </div>
            <div style={{fontSize:'0.82rem',color:'var(--text3)',lineHeight:1.9}}>
              <div>📅 {formatDate(t.datum)}{t.uhrzeit&&` · ${t.uhrzeit.slice(0,5)} Uhr`}{t.bis_datum&&t.bis_datum!==t.datum&&` bis ${formatDate(t.bis_datum)}`}{t.bis_uhrzeit&&` ${t.bis_uhrzeit.slice(0,5)} Uhr`}</div>
              {bs&&<div>🏗️ Baustelle: <strong>{bs.name}</strong></div>}
              {zugewiesen.length>0&&<div>👷 Zugewiesen: <strong>{zugewiesen.map(u=>u.name).join(', ')}</strong></div>}
              {ersteller&&<div>✍️ Erstellt von: {ersteller.name}</div>}
              {t.beschreibung&&<div style={{marginTop:4,color:'var(--text)',background:'white',borderRadius:8,padding:'6px 10px',fontSize:'0.82rem'}}>📝 {t.beschreibung}</div>}
            </div>
            {kannBearbeiten&&<button onClick={()=>handleDelete(t.id)} style={{marginTop:8,width:'100%',padding:'6px',background:'var(--red-pale)',color:'var(--red)',border:'1px solid rgba(214,62,62,0.2)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.78rem'}}>🗑️ Termin löschen</button>}
          </div>
        )
      })}
      <button className="btn btn-secondary" onClick={()=>setShowDetail(null)}>Schließen</button>
    </div></div>
  )
}

function KalenderNeuModal({form,setForm,saving,handleSave,handleClose,baustellen,allUsers,toggleZuweisung}) {
  return (
    <div className="modal-overlay open"><div className="modal-sheet" style={{maxHeight:'90vh',overflowY:'auto'}}>
      <div className="modal-handle"/>
      <div className="modal-title">📅 Neuer Termin</div>
      {getMsToken()&&(
        <div style={{background:'#ebf8ff',border:'1px solid #bee3f8',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:'0.78rem',color:'#2b6cb0'}}>
          📧 Outlook verbunden — Termin wird in Outlook + App gespeichert
        </div>
      )}
      <div className="form-group">
        <label>Typ</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:4}}>
          {Object.entries(TYP_CONFIG).map(([key,cfg])=>(
            <button key={key} onClick={()=>setForm(f=>({...f,typ:key,farbe:cfg.farbe}))} style={{padding:'8px 4px',borderRadius:8,border:`2px solid ${form.typ===key?cfg.farbe:'var(--border2)'}`,background:form.typ===key?cfg.farbe+'22':'white',cursor:'pointer',fontFamily:'inherit',fontSize:'0.78rem',fontWeight:600,color:form.typ===key?cfg.farbe:'var(--text2)',textAlign:'center'}}>
              {cfg.emoji}<br/>{cfg.label}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(f=>({...f,titel:e.target.value}))} placeholder="z.B. Abnahme Heusenstamm"/></div>
      <div className="form-group"><label>Beschreibung</label><textarea value={form.beschreibung} onChange={e=>setForm(f=>({...f,beschreibung:e.target.value}))} placeholder="Details..."/></div>
      <div className="form-row">
        <div className="form-group"><label>Datum *</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
        <div className="form-group"><label>Uhrzeit</label><input type="time" value={form.uhrzeit} onChange={e=>setForm(f=>({...f,uhrzeit:e.target.value}))}/></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Bis Datum</label><input type="date" value={form.bis_datum} onChange={e=>setForm(f=>({...f,bis_datum:e.target.value}))}/></div>
        <div className="form-group"><label>Bis Uhrzeit</label><input type="time" value={form.bis_uhrzeit} onChange={e=>setForm(f=>({...f,bis_uhrzeit:e.target.value}))}/></div>
      </div>
      <div className="form-group">
        <label>Baustelle (optional)</label>
        <select value={form.baustelle_id} onChange={e=>setForm(f=>({...f,baustelle_id:e.target.value}))}>
          <option value="">— Keine —</option>
          {baustellen.filter(b=>b.status==='aktiv'&&b.name!=='Büro').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Mitarbeiter zuweisen</label>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
          {allUsers.filter(u=>u.role!=='admin').map(u=>(
            <label key={u.id} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'6px 10px',borderRadius:8,background:form.zugewiesen_an.includes(u.id)?'var(--blue-pale)':'var(--bg)',border:`1px solid ${form.zugewiesen_an.includes(u.id)?'var(--blue)':'var(--border2)'}`}}>
              <input type="checkbox" checked={form.zugewiesen_an.includes(u.id)} onChange={()=>toggleZuweisung(u.id)} style={{accentColor:'var(--blue)'}}/>
              <div className="employee-avatar" style={{width:24,height:24,fontSize:'0.6rem'}}>{initials(u.name)}</div>
              <span style={{fontSize:'0.85rem',fontWeight:500}}>{u.name}</span>
              <span style={{fontSize:'0.7rem',color:'var(--text3)',marginLeft:'auto'}}>{u.role==='buero'?'Büro':'Monteur'}</span>
            </label>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Wird gespeichert...':'✓ Termin speichern'}</button>
      <button className="btn btn-secondary" onClick={handleClose}>Abbrechen</button>
    </div></div>
  )
}


// ─── MICROSOFT GRAPH / OUTLOOK KALENDER ──────────────────────────────────────
const MS_CLIENT_ID = '1e97973c-d452-4f3d-8aa7-681576a4648e'
const MS_TENANT_ID = 'common'
const MS_SCOPES = 'User.Read Calendars.ReadWrite'
const MS_REDIRECT = typeof window !== 'undefined' ? window.location.origin : 'https://elektropees.vercel.app'

function getMsToken() {
  if(typeof window==='undefined') return null
  const exp = localStorage.getItem('ms_token_exp')
  if(exp && Date.now() > parseInt(exp)) { clearMsToken(); return null }
  return localStorage.getItem('ms_access_token')
}
function clearMsToken() {
  if(typeof window==='undefined') return
  localStorage.removeItem('ms_access_token')
  localStorage.removeItem('ms_token_exp')
  localStorage.removeItem('ms_user_name')
}
function saveMsToken(token, expiresIn) {
  if(typeof window==='undefined') return
  localStorage.setItem('ms_access_token', token)
  localStorage.setItem('ms_token_exp', String(Date.now() + expiresIn * 1000 - 60000))
}

function msLogin() {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'token',
    redirect_uri: MS_REDIRECT,
    scope: MS_SCOPES,
    response_mode: 'fragment',
    state: 'outlook_sync',
    nonce: Math.random().toString(36)
  })
  window.location.href = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?${params}`
}

function parseMsTokenFromUrl() {
  if(typeof window==='undefined') return false
  const hash = window.location.hash.substring(1)
  if(!hash) return false
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  const expiresIn = params.get('expires_in')
  const state = params.get('state')
  if(token && state === 'outlook_sync') {
    saveMsToken(token, parseInt(expiresIn)||3600)
    window.history.replaceState({}, document.title, window.location.pathname)
    return true
  }
  return false
}

async function msGraphGet(url) {
  const token = getMsToken()
  if(!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  if(!res.ok) { if(res.status===401) clearMsToken(); return null }
  return res.json()
}

async function msGraphPost(url, body) {
  const token = getMsToken()
  if(!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if(!res.ok) { if(res.status===401) clearMsToken(); return null }
  return res.json()
}

async function msGraphDelete(url) {
  const token = getMsToken()
  if(!token) return false
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.ok
}

async function ladeOutlookTermine(von, bis) {
  // Outlook Kalender-Events laden
  const params = new URLSearchParams({
    startDateTime: von + 'T00:00:00',
    endDateTime: bis + 'T23:59:59',
    $select: 'id,subject,start,end,bodyPreview,categories,isAllDay',
    $top: '100',
    $orderby: 'start/dateTime'
  })
  const data = await msGraphGet(`/me/calendarView?${params}`)
  return data?.value || []
}

async function erstelleOutlookTermin(termin, zugewieseneNamen) {
  // Termin in Outlook anlegen mit Kategorien für Mitarbeiter-Zuweisung
  const body = {
    subject: termin.titel,
    body: { contentType: 'text', content: termin.beschreibung || '' },
    start: {
      dateTime: `${termin.datum}T${termin.uhrzeit||'08:00'}:00`,
      timeZone: 'Europe/Berlin'
    },
    end: {
      dateTime: `${termin.bis_datum||termin.datum}T${termin.bis_uhrzeit||termin.uhrzeit||'09:00'}:00`,
      timeZone: 'Europe/Berlin'
    },
    categories: zugewieseneNamen, // Mitarbeiternamen als Outlook-Kategorien
    showAs: 'busy'
  }
  return msGraphPost('/me/events', body)
}

function KalenderPage({user,baustellen,allUsers,isAdmin,isBuero}) {
  const [termine,setTermine]=useState([])
  const [outlookTermine,setOutlookTermine]=useState([])
  const [msVerbunden,setMsVerbunden]=useState(false)
  const [msSyncing,setMsSyncing]=useState(false)
  const [ansicht,setAnsicht]=useState('monat')
  const [heute]=useState(new Date())
  const [ankerDatum,setAnkerDatum]=useState(new Date())
  const [showNeu,setShowNeu]=useState(false)
  const [showDetail,setShowDetail]=useState(null)
  const [form,setForm]=useState({titel:'',beschreibung:'',datum:today(),uhrzeit:'',bis_datum:'',bis_uhrzeit:'',typ:'termin',baustelle_id:'',zugewiesen_an:[],farbe:'#1B52DD'})
  const [saving,setSaving]=useState(false)
  const kannBearbeiten=isAdmin||isBuero

  useEffect(()=>{
    // URL-Token nach OAuth-Redirect parsen
    parseMsTokenFromUrl()
    setMsVerbunden(!!getMsToken())
    loadTermine()
  },[])

  async function loadTermine() {
    const {data}=await supabase.from('termine').select('*').order('datum',{ascending:true}).limit(500)
    setTermine(data||[])
  }

  async function syncOutlook() {
    if(!getMsToken()) { msLogin(); return }
    setMsSyncing(true)
    // Kategorien + Farben laden
    const katData = await msGraphGet('/me/outlook/masterCategories')
    const kategorienFarben = {}
    if(katData?.value) {
      katData.value.forEach(k => {
        // Outlook Farbnamen → HEX
        const farbMap = {
          'preset0':'#e74856','preset1':'#ff8c00','preset2':'#ffb900','preset3':'#fff100',
          'preset4':'#00b294','preset5':'#008272','preset6':'#00b7c3','preset7':'#0099bc',
          'preset8':'#0078d4','preset9':'#4b0082','preset10':'#881798','preset11':'#c239b3',
          'preset12':'#e3008c','preset13':'#ea005e','preset14':'#da3b01','preset15':'#ef6950',
          'preset16':'#d13438','preset17':'#ff4343','preset18':'#69797e','preset19':'#767676',
          'preset20':'#a0aeb2','preset21':'#69797e','preset22':'#4c4a48','preset23':'#767676',
          'none':'#888888'
        }
        kategorienFarben[k.displayName] = farbMap[k.color] || '#1B52DD'
      })
    }
    if(typeof window!=='undefined') {
      window.localStorage.setItem('ms_kategorien_farben', JSON.stringify(kategorienFarben))
    }
    // Aktuellen Monat + nächste 3 Monate laden
    const von = new Date(); von.setDate(1)
    const bis = new Date(); bis.setMonth(bis.getMonth()+3)
    const events = await ladeOutlookTermine(
      von.toISOString().split('T')[0],
      bis.toISOString().split('T')[0]
    )
    // Outlook-Events in App-Format umwandeln
    const savedFarben = typeof window!=='undefined' ? JSON.parse(window.localStorage.getItem('ms_kategorien_farben')||'{}') : {}
    // Kategorien → User-IDs mappen
    const kategorieZuUserId = {}
    allUsers.forEach(u => {
      // Exakter Match oder Vorname-Match
      kategorieZuUserId[u.name] = u.id
      kategorieZuUserId[u.name.split(' ')[0]] = u.id
    })

    const mapped = events.map(e => {
      const erstKat = e.categories?.[0]
      const farbe = erstKat ? (savedFarben[erstKat] || '#0078d4') : '#0078d4'
      // Zugewiesene User-IDs aus Kategorien ermitteln
      const zugewiesen_an = (e.categories||[])
        .map(k => kategorieZuUserId[k])
        .filter(Boolean)
      return {
        id: 'outlook_'+e.id,
        titel: e.subject,
        beschreibung: e.bodyPreview||'',
        datum: e.start.dateTime?.split('T')[0] || e.start.date,
        bis_datum: e.end.dateTime?.split('T')[0] || e.end.date,
        uhrzeit: e.start.dateTime?.split('T')[1]?.slice(0,5) || '',
        bis_uhrzeit: e.end.dateTime?.split('T')[1]?.slice(0,5) || '',
        typ: 'outlook',
        farbe,
        zugewiesen_an,
        erstellt_von: user.id,
        _outlookId: e.id,
        _kategorien: e.categories||[]
      }
    })
    setOutlookTermine(mapped)

    // ── Automatisch in Supabase importieren ──────────────────────────────────
    // Bestehende Outlook-Termine aus Supabase holen (die wir schon importiert haben)
    const {data: vorhandene} = await supabase
      .from('termine')
      .select('id, outlook_id')
      .not('outlook_id', 'is', null)

    const vorhandeneIds = new Set((vorhandene||[]).map(t => t.outlook_id))

    for(const e of mapped) {
      const outlookId = e._outlookId
      if(!outlookId || !e.datum) continue

      const supabaseData = {
        titel: e.titel,
        beschreibung: e.beschreibung||'',
        datum: e.datum,
        bis_datum: e.bis_datum||e.datum,
        uhrzeit: e.uhrzeit||'',
        bis_uhrzeit: e.bis_uhrzeit||'',
        typ: 'outlook',
        farbe: e.farbe,
        zugewiesen_an: e.zugewiesen_an,
        erstellt_von: user.id,
        outlook_id: outlookId
      }

      if(vorhandeneIds.has(outlookId)) {
        // Update bestehenden Eintrag
        await supabase.from('termine').update(supabaseData).eq('outlook_id', outlookId)
      } else {
        // Neu einfügen
        await supabase.from('termine').insert([supabaseData])
      }
    }

    // Gelöschte Outlook-Termine aus Supabase entfernen
    const aktuelleOutlookIds = new Set(mapped.map(e => e._outlookId).filter(Boolean))
    for(const v of (vorhandene||[])) {
      if(v.outlook_id && !aktuelleOutlookIds.has(v.outlook_id)) {
        await supabase.from('termine').delete().eq('id', v.id)
      }
    }

    // App-Termine neu laden (enthält jetzt auch die importierten Outlook-Termine)
    await loadTermine()
    setMsVerbunden(true)
    setMsSyncing(false)
  }

  // Alle Termine kombiniert (App + Outlook)
  const alleTermine = [...termine, ...outlookTermine].sort((a,b)=>a.datum.localeCompare(b.datum))

  async function handleSave() {
    if(!form.titel.trim()){alert('Bitte Titel eingeben!');return}
    if(!form.datum){alert('Bitte Datum angeben!');return}
    setSaving(true)
    // In Supabase speichern
    await supabase.from('termine').insert([{...form,erstellt_von:user.id,zugewiesen_an:form.zugewiesen_an}])
    // Auch in Outlook anlegen wenn verbunden
    if(getMsToken()) {
      const zugewieseneNamen = allUsers.filter(u=>form.zugewiesen_an.includes(u.id)).map(u=>u.name)
      await erstelleOutlookTermin(form, zugewieseneNamen)
    }
    await loadTermine()
    if(getMsToken()) await syncOutlook()
    setShowNeu(false)
    setForm({titel:'',beschreibung:'',datum:today(),uhrzeit:'',bis_datum:'',bis_uhrzeit:'',typ:'termin',baustelle_id:'',zugewiesen_an:[],farbe:'#1B52DD'})
    setSaving(false)
  }
  async function handleDelete(id) {
    if(id.startsWith('outlook_')) {
      // Outlook-Event löschen
      const outlookId = outlookTermine.find(t=>t.id===id)?._outlookId
      if(outlookId) await msGraphDelete(`/me/events/${outlookId}`)
      setOutlookTermine(o=>o.filter(t=>t.id!==id))
    } else {
      await supabase.from('termine').delete().eq('id',id)
      await loadTermine()
    }
    setShowDetail(null)
  }
  function toggleZuweisung(uid) {
    setForm(f=>({...f,zugewiesen_an:f.zugewiesen_an.includes(uid)?f.zugewiesen_an.filter(x=>x!==uid):[...f.zugewiesen_an,uid]}))
  }
  const baldFaellig=alleTermine.filter(t=>{
    const d=new Date(t.datum); const diff=(d-heute)/(1000*60*60*24)
    return diff>=0&&diff<=7&&(t.zugewiesen_an?.includes(user.id)||t.erstellt_von===user.id)
  }).length

  return (
    <div className="page-content">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span className="section-title">Kalender</span>
        {kannBearbeiten&&<button className="btn btn-outline btn-sm" onClick={()=>setShowNeu(true)}>+ Termin</button>}
      </div>
      {baldFaellig>0&&(
        <div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:10,padding:'8px 14px',marginBottom:12,fontSize:'0.82rem',color:'#92400e'}}>
          📅 {baldFaellig} Termin{baldFaellig>1?'e':''} in den nächsten 7 Tagen
        </div>
      )}
      <div style={{display:'flex',background:'white',borderRadius:'var(--r-xl)',padding:3,marginBottom:12,boxShadow:'var(--shadow-sm)',border:'1px solid var(--border)'}}>
        {[['monat','📆 Monat'],['woche','📅 Woche'],['liste','📋 Liste']].map(([key,label])=>(
          <button key={key} onClick={()=>setAnsicht(key)} style={{flex:1,padding:'0.5rem 4px',borderRadius:'var(--r-lg)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'0.75rem',fontWeight:600,background:ansicht===key?'var(--dark)':'transparent',color:ansicht===key?'white':'var(--text2)',transition:'all 0.2s'}}>{label}</button>
        ))}
      </div>
      <div className="card">
        {ansicht==='monat'&&<KalenderMonat termine={termine} ankerDatum={ankerDatum} setAnkerDatum={setAnkerDatum} heute={heute} setShowDetail={setShowDetail}/>}
        {ansicht==='woche'&&<KalenderWoche termine={termine} ankerDatum={ankerDatum} setAnkerDatum={setAnkerDatum} heute={heute} setShowDetail={setShowDetail}/>}
        {ansicht==='liste'&&<KalenderListe termine={termine} heute={heute} baustellen={baustellen} allUsers={allUsers} user={user} setShowDetail={setShowDetail}/>}
      </div>
      {showDetail&&<KalenderDetailModal showDetail={showDetail} setShowDetail={setShowDetail} baustellen={baustellen} allUsers={allUsers} kannBearbeiten={kannBearbeiten} handleDelete={handleDelete}/>}
      {showNeu&&kannBearbeiten&&<KalenderNeuModal form={form} setForm={setForm} saving={saving} handleSave={handleSave} handleClose={()=>setShowNeu(false)} baustellen={baustellen} allUsers={allUsers} toggleZuweisung={toggleZuweisung}/>}
    </div>
  )
}

// ─── BERICHTSHEFT KOMPONENTE ──────────────────────────────────────────────────

function getWochenMontagVon(datum) {
  const d = new Date(datum)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d.toISOString().split('T')[0]
}

function SignaturCanvas({onSave, onCancel, title}) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
    setHasDrawn(true)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0A0A44'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw(e) {
    e.preventDefault()
    setDrawing(false)
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function save() {
    const canvas = canvasRef.current
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="modal-overlay open" style={{zIndex:400}}>
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-title">✍️ {title}</div>
        <div style={{fontSize:'0.82rem',color:'var(--text3)',marginBottom:12,textAlign:'center'}}>
          Bitte hier unterschreiben
        </div>
        <div style={{border:'2px solid var(--border2)',borderRadius:12,overflow:'hidden',background:'white',touchAction:'none',userSelect:'none'}}>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            style={{width:'100%',height:160,display:'block',cursor:'crosshair'}}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={clear} className="btn btn-secondary" style={{flex:1,marginBottom:0,padding:'0.6rem'}}>🗑️ Löschen</button>
          <button onClick={save} disabled={!hasDrawn} className="btn btn-primary" style={{flex:2,marginBottom:0,padding:'0.6rem',opacity:hasDrawn?1:0.5}}>✓ Unterschrift speichern</button>
        </div>
        <button onClick={onCancel} className="btn btn-secondary" style={{marginTop:8}}>Abbrechen</button>
      </div>
    </div>
  )
}

function BerichtsheftPage({user, allUsers, isAdmin, isBuero}) {
  const isAzubi = user.profile?.role === 'azubi'
  const kannSignieren = isAdmin || isBuero
  const [hefte, setHefte] = useState([])
  const [ansicht, setAnsicht] = useState('liste') // 'liste'|'bearbeiten'|'detail'
  const [aktuellesHeft, setAktuellesHeft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showSignatur, setShowSignatur] = useState(false) // 'azubi'|'ausbilder'|false
  const [filterUser, setFilterUser] = useState(isAzubi ? user.id : 'alle')
  const [showNachtrag, setShowNachtrag] = useState(false)
  const [nachtragDatum, setNachtragDatum] = useState('')
  const [form, setForm] = useState({
    montag:'', dienstag:'', mittwoch:'', donnerstag:'', freitag:'', schulung:'', bemerkungen:''
  })

  const heute = new Date()
  const aktuelleWoche = getWochenMontagVon(heute)

  useEffect(() => { loadHefte() }, [])

  async function loadHefte() {
    const {data, error} = await supabase.from('berichtshefte')
      .select('*')
      .order('woche_start', {ascending: false})
      .limit(500)
    if(error) console.error('Berichtshefte Fehler:', error.message)
    setHefte(data || [])
    // Aktives Heft auch aktualisieren damit Signatur nicht verloren geht
    if (aktuellesHeft) {
      const aktuell = (data||[]).find(h => h.id === aktuellesHeft.id)
      if (aktuell) setAktuellesHeft(aktuell)
    }
  }

  async function neuesHeft(wocheStart = aktuelleWoche) {
    // Prüfen ob Heft für diese Woche schon existiert
    const {data: exists} = await supabase.from('berichtshefte')
      .select('id').eq('user_id', user.id).eq('woche_start', wocheStart).single()
    if (exists) {
      // Existierendes öffnen - frisch aus Supabase laden
      const {data} = await supabase.from('berichtshefte').select('*').eq('id', exists.id).single()
      setAktuellesHeft(data)
      setForm({
        montag: data.montag||'', dienstag: data.dienstag||'', mittwoch: data.mittwoch||'',
        donnerstag: data.donnerstag||'', freitag: data.freitag||'',
        schulung: data.schulung||'', bemerkungen: data.bemerkungen||''
      })
      // Signiertes/Eingereichtes Heft -> Detailansicht, Entwurf -> Bearbeiten
      setAnsicht(data.status === 'entwurf' ? 'bearbeiten' : 'detail')
      return
    }
    // Neues anlegen
    const wocheEnd = new Date(wocheStart)
    wocheEnd.setDate(wocheEnd.getDate() + 4)
    const {data} = await supabase.from('berichtshefte').insert([{
      user_id: user.id,
      woche_start: wocheStart,
      woche_end: wocheEnd.toISOString().split('T')[0],
      status: 'entwurf'
    }]).select().single()
    setAktuellesHeft(data)
    setForm({montag:'', dienstag:'', mittwoch:'', donnerstag:'', freitag:'', schulung:'', bemerkungen:''})
    setAnsicht('bearbeiten')
  }

  async function heftOeffnen(heft) {
    // Immer frisch aus Supabase laden damit Signatur aktuell ist
    const {data} = await supabase.from('berichtshefte').select('*').eq('id', heft.id).single()
    const h = data || heft
    setAktuellesHeft(h)
    setForm({
      montag: h.montag||'', dienstag: h.dienstag||'', mittwoch: h.mittwoch||'',
      donnerstag: h.donnerstag||'', freitag: h.freitag||'',
      schulung: h.schulung||'', bemerkungen: h.bemerkungen||''
    })
    // Ansicht nach Status wählen
    if (h.status === 'entwurf' && !kannSignieren) {
      setAnsicht('bearbeiten')
    } else {
      setAnsicht('detail')
    }
  }

  async function handleSave(einreichen = false) {
    if (!aktuellesHeft) return
    setSaving(true)
    const update = {
      ...form,
      status: einreichen ? 'eingereicht' : 'entwurf',
      updated_at: new Date().toISOString()
    }
    await supabase.from('berichtshefte').update(update).eq('id', aktuellesHeft.id)
    await loadHefte()
    setSaving(false)
    if (einreichen) {
      setAnsicht('detail')
      const {data} = await supabase.from('berichtshefte').select('*').eq('id', aktuellesHeft.id).single()
      setAktuellesHeft(data)
    }
  }

  async function handleSignatur(dataUrl) {
    if (!aktuellesHeft) return
    setSaving(true)
    const update = showSignatur === 'azubi'
      ? { azubi_signatur: dataUrl, azubi_signiert_am: new Date().toISOString(), status: 'eingereicht' }
      : { ausbilder_signatur: dataUrl, ausbilder_signiert_am: new Date().toISOString(), ausbilder_id: user.id, status: 'signiert' }
    await supabase.from('berichtshefte').update(update).eq('id', aktuellesHeft.id)
    const {data} = await supabase.from('berichtshefte').select('*').eq('id', aktuellesHeft.id).single()
    setAktuellesHeft(data)
    await loadHefte()
    setShowSignatur(false)
    setSaving(false)
  }

  function exportPDF(heft) {
    const azubiName = allUsers.find(u => u.id === heft.user_id)?.name || 'Azubi'
    const ausbilderName = allUsers.find(u => u.id === heft.ausbilder_id)?.name || 'Marvin Pees'
    const wocheLabel = `${formatDate(heft.woche_start)} – ${formatDate(heft.woche_end)}`
    const jahr = new Date(heft.woche_start).getFullYear()
    const istSigniert = heft.status === 'signiert'

    const tage = [
      {tag: 'Montag', text: heft.montag, frei: false},
      {tag: 'Dienstag', text: heft.dienstag, frei: false},
      {tag: 'Mittwoch', text: heft.mittwoch, frei: false},
      {tag: 'Donnerstag', text: heft.donnerstag, frei: false},
      {tag: 'Freitag', text: heft.freitag, frei: true},
    ]

    function esc(t) { return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

    const tageHtml = tage.map(({tag, text, frei}) => `
<div class="tag-block">
  <div class="tag-header">
    <span class="tag-dot"></span>
    <span class="tag-name">${tag}</span>
  </div>
  <div class="tag-body">${text ? esc(text) : frei ? '<span class="kein-eintrag">Betriebsfrei &ndash; 4-Tage-Woche</span>' : '<span class="kein-eintrag">Kein Eintrag</span>'}</div>
</div>`).join('')

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Ausbildungsnachweis – ${azubiName} – ${wocheLabel}</title>
<style>
  /* ── RESET & BROWSER-PRINT ── */
  @page {
    size: A4 portrait;
    margin: 14mm 16mm 18mm 16mm;
    /* Browser-Kopf/Fußzeilen unterdrücken */
  }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-footer { position: running(footer); }
    .tag-block { page-break-inside: avoid; break-inside: avoid; }
    .sig-section { page-break-inside: avoid; break-inside: avoid; }
  }

  /* ── BASE ── */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    color: #1a1a2e;
    background: #fff;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
    line-height: 1.5;
  }

  /* ── HEADER ── */
  .doc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 3px solid #1B52DD;
    margin-bottom: 14px;
  }
  .logo-block {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-img {
    height: 52px;
    width: auto;
    object-fit: contain;
  }
  .logo-text {
    font-size: 9pt;
    font-weight: 700;
    color: #0A0A44;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .logo-sub {
    font-size: 7.5pt;
    color: #6b7280;
    font-weight: 400;
    letter-spacing: 0.04em;
  }
  .header-title {
    text-align: right;
  }
  .header-title h1 {
    font-size: 15pt;
    font-weight: 700;
    color: #0A0A44;
    letter-spacing: 0.01em;
    line-height: 1.2;
  }
  .header-title .doc-sub {
    font-size: 9pt;
    color: #4b5563;
    margin-top: 3px;
  }
  .status-pill {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 700;
    background: ${istSigniert ? '#dcfce7' : '#fef9c3'};
    color: ${istSigniert ? '#166534' : '#854d0e'};
    border: 1px solid ${istSigniert ? '#86efac' : '#fde047'};
  }

  /* ── STAMMDATEN ── */
  .stammdaten {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #d1d5db;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 16px;
    font-size: 9.5pt;
  }
  .sd-row {
    display: contents;
  }
  .sd-label {
    background: #f3f4f6;
    color: #6b7280;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 6px 10px;
    border-bottom: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
  }
  .sd-val {
    background: #fff;
    color: #111827;
    font-weight: 600;
    padding: 6px 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  .sd-label, .sd-val { border-bottom: 1px solid #bfdbfe; }
  .sd-label:nth-last-child(2), .sd-val:last-child { border-bottom: none; }

  /* ── WOCHEN-ABSCHNITT ── */
  .woche-titel {
    font-size: 9pt;
    font-weight: 700;
    color: #1B52DD;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #e5e7eb;
  }

  .tag-block {
    display: flex;
    margin-bottom: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  .tag-header {
    width: 90px;
    min-width: 90px;
    background: #0A0A44;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 6px 10px 8px;
    gap: 5px;
  }
  .tag-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #1B52DD;
    margin-top: 2px;
  }
  .tag-name {
    color: #fff;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
  }
  .tag-body {
    flex: 1;
    padding: 9px 12px;
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    color: #1f2937;
    background: #fff;
  }
  .kein-eintrag {
    color: #9ca3af;
    font-style: italic;
    font-size: 9pt;
  }

  /* ── BEMERKUNGEN ── */
  .bemerkungen-block {
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
    page-break-inside: avoid;
  }
  .bem-header {
    background: #374151;
    color: #fff;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 6px 12px;
  }
  .bem-body {
    padding: 9px 12px;
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    color: #1f2937;
  }

  /* ── SIGNATUREN ── */
  .sig-section {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 2px solid #1B52DD;
  }
  .sig-titel {
    font-size: 8pt;
    font-weight: 700;
    color: #1B52DD;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }
  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .sig-box {
    text-align: center;
  }
  .sig-label {
    font-size: 8pt;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
  }
  .sig-img-wrap {
    height: 68px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 4px;
  }
  .sig-img {
    max-width: 200px;
    max-height: 64px;
    object-fit: contain;
  }
  .sig-line {
    border-bottom: 1.5px solid #374151;
    margin-bottom: 4px;
    height: 68px;
  }
  .sig-datum {
    font-size: 8pt;
    color: #6b7280;
    margin-top: 3px;
  }
  .sig-hinweis {
    font-size: 7.5pt;
    color: #9ca3af;
    margin-top: 2px;
  }
  .sig-leer {
    font-size: 8.5pt;
    color: #d1d5db;
    font-style: italic;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px dashed #e5e7eb;
    border-radius: 4px;
    margin-bottom: 4px;
  }

  /* ── FUSSZEILE ── */
  .doc-footer {
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    color: #9ca3af;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="doc-header">
  <div class="logo-block">
    <img class="logo-img" src="https://elektropees.vercel.app/logo_dunkel.png" alt="Elektro Pees"/>
  </div>
  <div class="header-title">
    <h1>Ausbildungsnachweis</h1>
    <div class="doc-sub">Wöchentliches Berichtsheft</div>
    <div class="status-pill">${istSigniert ? '&#10003; Digital signiert' : '&#9998; Eingereicht'}</div>
  </div>
</div>

<!-- STAMMDATEN -->
<div class="stammdaten">
  <div class="sd-label">Auszubildender</div>
  <div class="sd-val">${esc(azubiName)}</div>
  <div class="sd-label">Ausbilder</div>
  <div class="sd-val">${esc(ausbilderName)}</div>
  <div class="sd-label">Ausbildungsjahr</div>
  <div class="sd-val">${jahr}</div>
  <div class="sd-label">Ausbildungsbetrieb</div>
  <div class="sd-val">Elektro Pees</div>
  <div class="sd-label">Ausbildungswoche</div>
  <div class="sd-val">${wocheLabel}</div>
  <div class="sd-label">Ausbildungsberuf</div>
  <div class="sd-val">Elektroniker/in für Energie- und Gebäudetechnik</div>
</div>

<!-- WOCHENUEBERSICHT -->
<div class="woche-titel">Wochenuebersicht – Taetigkeiten</div>
${tageHtml}

${heft.bemerkungen ? `<div class="bemerkungen-block"><div class="bem-header">Bemerkungen</div><div class="bem-body">${esc(heft.bemerkungen)}</div></div>` : ''}

<!-- SIGNATUREN -->
<div class="sig-section">
  <div class="sig-titel">Unterschriften</div>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-label">Auszubildender/e</div>
      ${heft.azubi_signatur
        ? `<div class="sig-img-wrap"><img class="sig-img" src="${heft.azubi_signatur}" alt="Unterschrift Azubi"/></div>
           <div style="border-bottom:1.5px solid #374151;margin-bottom:4px;"></div>
           <div class="sig-datum">${heft.azubi_signiert_am ? new Date(heft.azubi_signiert_am).toLocaleDateString('de-DE') : ''}</div>
           <div class="sig-hinweis">Digital unterzeichnet</div>`
        : `<div class="sig-leer">Nicht unterzeichnet</div>
           <div style="border-bottom:1.5px solid #d1d5db;margin-bottom:4px;"></div>`
      }
      <div style="margin-top:4px;font-size:8.5pt;color:#374151;">${esc(azubiName)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Ausbilder/in</div>
      ${heft.ausbilder_signatur
        ? `<div class="sig-img-wrap"><img class="sig-img" src="${heft.ausbilder_signatur}" alt="Unterschrift Ausbilder"/></div>
           <div style="border-bottom:1.5px solid #374151;margin-bottom:4px;"></div>
           <div class="sig-datum">${heft.ausbilder_signiert_am ? new Date(heft.ausbilder_signiert_am).toLocaleDateString('de-DE') : ''}</div>
           <div class="sig-hinweis">Digital unterzeichnet</div>`
        : `<div class="sig-leer">Nicht unterzeichnet</div>
           <div style="border-bottom:1.5px solid #d1d5db;margin-bottom:4px;"></div>`
      }
      <div style="margin-top:4px;font-size:8.5pt;color:#374151;">${esc(ausbilderName)}</div>
    </div>
  </div>
</div>

<!-- FUSSZEILE -->
<div class="doc-footer">
  <span>Elektro Pees &middot; Digitaler Ausbildungsnachweis</span>
  <span>${wocheLabel}</span>
</div>

</body>
</html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 600)
  }

  const statusConfig = {
    entwurf: { label: 'Entwurf', bg: '#e2e8f0', color: '#4a5568' },
    eingereicht: { label: '⏳ Eingereicht', bg: '#fef3c7', color: '#92400e' },
    signiert: { label: '✓ Signiert', bg: '#c6f6d5', color: '#276749' },
  }

  const azubis = allUsers.filter(u => u.role === 'azubi')

  // ── NACHTRAG MODAL ─────────────────────────────────────────────────────────
  if (showNachtrag) return (
    <div className="page-content">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        <button onClick={()=>setShowNachtrag(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'1.2rem',padding:0}}>‹</button>
        <span className="section-title" style={{margin:0}}>📋 Nachtrag anlegen</span>
      </div>
      <div className="card">
        <div style={{fontSize:'0.82rem',color:'var(--text3)',marginBottom:12}}>
          Wähle ein beliebiges Datum aus der Woche für die du einen Nachtrag erstellen möchtest.
        </div>
        <div className="form-group">
          <label>Datum in der gewünschten Woche</label>
          <input type="date" value={nachtragDatum} onChange={e=>setNachtragDatum(e.target.value)} style={{width:'100%'}}/>
        </div>
        {nachtragDatum&&(
          <div style={{background:'var(--blue-pale)',borderRadius:8,padding:'8px 12px',fontSize:'0.82rem',color:'var(--blue)',marginBottom:12}}>
            📅 Woche: {formatDate(getWochenMontagVon(nachtragDatum))} – {(()=>{const d=new Date(getWochenMontagVon(nachtragDatum));d.setDate(d.getDate()+4);return formatDate(d.toISOString().split('T')[0])})()}
          </div>
        )}
        <button className="btn btn-primary" disabled={!nachtragDatum||saving} onClick={async()=>{const ws=getWochenMontagVon(nachtragDatum);setShowNachtrag(false);setNachtragDatum('');await neuesHeft(ws)}}>
          ✓ Nachtrag anlegen
        </button>
        <button className="btn btn-secondary" onClick={()=>setShowNachtrag(false)}>Abbrechen</button>
      </div>
    </div>
  )

  // ── LISTENANSICHT ───────────────────────────────────────────────────────────
  if (ansicht === 'liste') return (
    <div className="page-content">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span className="section-title">📋 Berichtshefte</span>
        {isAzubi && <div style={{display:'flex',gap:6}}>
          <button className="btn btn-outline btn-sm" onClick={()=>neuesHeft()}>+ Aktuelle Woche</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setShowNachtrag(true)}>+ Nachtrag</button>
        </div>}
      </div>

      {(isAdmin || isBuero) && azubis.length > 1 && (
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          <button onClick={()=>setFilterUser('alle')} style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid var(--border2)',background:filterUser==='alle'?'var(--dark)':'white',color:filterUser==='alle'?'white':'var(--text2)',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Alle</button>
          {azubis.map(a=>(
            <button key={a.id} onClick={()=>setFilterUser(a.id)} style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid var(--border2)',background:filterUser===a.id?'var(--dark)':'white',color:filterUser===a.id?'white':'var(--text2)',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{a.name}</button>
          ))}
        </div>
      )}

      {(()=>{
        const gefilterteHefte = filterUser==='alle' ? hefte : hefte.filter(h=>h.user_id===filterUser)
        if(gefilterteHefte.length === 0) return (
          <div className="empty-state">
            <div style={{fontSize:'3rem',marginBottom:12}}>📋</div>
            <div className="empty-title">Noch keine Berichtshefte</div>
            <div className="empty-sub">{isAzubi ? 'Klicke auf "+ Aktuelle Woche" um dein erstes Berichtsheft anzulegen.' : 'Noch keine Berichtshefte vorhanden.'}</div>
          </div>
        )
        return gefilterteHefte.map(h => {
          const cfg = statusConfig[h.status] || statusConfig.entwurf
          const azubiName = allUsers.find(u => u.id === h.user_id)?.name || '—'
          return (
            <div key={h.id} className="card" style={{cursor:'pointer'}} onClick={()=>heftOeffnen(h)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  {(isAdmin||isBuero) && <div style={{fontSize:'0.75rem',color:'var(--blue)',fontWeight:600,marginBottom:2}}>👤 {azubiName}</div>}
                  <div style={{fontWeight:700,color:'var(--dark)'}}>KW {formatDate(h.woche_start)} – {formatDate(h.woche_end)}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:2}}>
                    {h.azubi_signatur ? '✍️ Azubi signiert' : '○ Azubi nicht signiert'} · {h.ausbilder_signatur ? '✍️ Ausbilder signiert' : '○ Ausbilder nicht signiert'}
                  </div>
                </div>
                <span style={{fontSize:'0.72rem',fontWeight:700,padding:'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
              </div>
            </div>
          )
        })
      })()}
    </div>
  )

  // ── BEARBEITEN ──────────────────────────────────────────────────────────────
  if (ansicht === 'bearbeiten' && aktuellesHeft) return (
    <div className="page-content">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        <button onClick={()=>setAnsicht('liste')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'1.2rem',padding:0}}>‹</button>
        <span className="section-title" style={{margin:0}}>Berichtsheft {formatDate(aktuellesHeft.woche_start)} – {formatDate(aktuellesHeft.woche_end)}</span>
      </div>

      <div style={{background:'#ebf8ff',border:'1px solid #bee3f8',borderRadius:10,padding:'8px 14px',marginBottom:16,fontSize:'0.78rem',color:'#2b6cb0'}}>
        💡 Beschreibe kurz was du an jedem Tag gemacht hast. Stichpunkte reichen.
      </div>

      {[
        {key:'montag', label:'Montag'},
        {key:'dienstag', label:'Dienstag'},
        {key:'mittwoch', label:'Mittwoch'},
        {key:'donnerstag', label:'Donnerstag'},
        {key:'freitag', label:'Freitag (optional)'},
      ].map(({key, label}) => (
        <div key={key} className="card" style={{padding:'0.75rem 1rem',marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--dark)',marginBottom:6}}>📅 {label}</div>
          <textarea
            value={form[key]}
            onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
            placeholder={`Was hast du am ${label} gemacht?`}
            style={{width:'100%',minHeight:70,padding:'8px',border:'1.5px solid var(--border2)',borderRadius:8,fontSize:'0.85rem',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}
          />
        </div>
      ))}



      <div className="card" style={{padding:'0.75rem 1rem',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--dark)',marginBottom:6}}>📝 Bemerkungen (optional)</div>
        <textarea value={form.bemerkungen} onChange={e=>setForm(f=>({...f,bemerkungen:e.target.value}))} placeholder="Sonstiges..." style={{width:'100%',minHeight:60,padding:'8px',border:'1.5px solid var(--border2)',borderRadius:8,fontSize:'0.85rem',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/>
      </div>

      <button className="btn btn-secondary" onClick={()=>handleSave(false)} disabled={saving} style={{marginBottom:8}}>{saving?'Speichert...':'💾 Entwurf speichern'}</button>
      <button className="btn btn-primary" onClick={()=>setShowSignatur('azubi')} style={{marginBottom:8}}>✍️ Unterschreiben & Einreichen</button>
      <button className="btn btn-secondary" onClick={()=>setAnsicht('liste')}>Zurück</button>

      {showSignatur==='azubi' && (
        <SignaturCanvas
          title="Azubi-Unterschrift"
          onSave={async (dataUrl) => {
            // Erst Textinhalte speichern, dann Signatur in einem kombinierten Update
            setSaving(true)
            await supabase.from('berichtshefte').update({
              ...form,
              azubi_signatur: dataUrl,
              azubi_signiert_am: new Date().toISOString(),
              status: 'eingereicht',
              updated_at: new Date().toISOString()
            }).eq('id', aktuellesHeft.id)
            const {data} = await supabase.from('berichtshefte').select('*').eq('id', aktuellesHeft.id).single()
            setAktuellesHeft(data)
            await loadHefte()
            setShowSignatur(false)
            setSaving(false)
            setAnsicht('detail')
          }}
          onCancel={() => setShowSignatur(false)}
        />
      )}
    </div>
  )

  // ── DETAILANSICHT ───────────────────────────────────────────────────────────
  if (ansicht === 'detail' && aktuellesHeft) {
    const h = aktuellesHeft
    const azubiName = allUsers.find(u => u.id === h.user_id)?.name || '—'
    const ausbilderName = allUsers.find(u => u.id === h.ausbilder_id)?.name || '—'
    const cfg = statusConfig[h.status] || statusConfig.entwurf
    const tage = [
      {label:'Montag', text: h.montag},
      {label:'Dienstag', text: h.dienstag},
      {label:'Mittwoch', text: h.mittwoch},
      {label:'Donnerstag', text: h.donnerstag},
      {label:'Freitag', text: h.freitag},
    ]
    return (
      <div className="page-content">
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
          <button onClick={()=>setAnsicht('liste')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'1.2rem',padding:0}}>‹</button>
          <span className="section-title" style={{margin:0}}>Berichtsheft</span>
          <span style={{fontSize:'0.72rem',fontWeight:700,padding:'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color,marginLeft:'auto'}}>{cfg.label}</span>
        </div>

        <div className="card" style={{marginBottom:8}}>
          <div style={{fontSize:'0.78rem',color:'var(--text3)',lineHeight:2}}>
            <div>👤 <strong>Azubi:</strong> {azubiName}</div>
            <div>📅 <strong>Woche:</strong> {formatDate(h.woche_start)} – {formatDate(h.woche_end)}</div>
            <div>🏢 <strong>Betrieb:</strong> Elektro Pees</div>
          </div>
        </div>

        {tage.filter(t=>t.text).map(({label,text})=>(
          <div key={label} className="card" style={{marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:'0.82rem',color:'var(--dark)',marginBottom:6}}>📅 {label}</div>
            <div style={{fontSize:'0.85rem',color:'var(--text)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{text}</div>
          </div>
        ))}

        {h.bemerkungen&&<div className="card" style={{marginBottom:8}}><div style={{fontWeight:700,fontSize:'0.82rem',color:'var(--dark)',marginBottom:6}}>📝 Bemerkungen</div><div style={{fontSize:'0.85rem',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{h.bemerkungen}</div></div>}

        {/* Signaturen */}
        <div className="card" style={{marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--dark)',marginBottom:12}}>✍️ Signaturen</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'0.72rem',color:'var(--text3)',marginBottom:6,fontWeight:600}}>AZUBI</div>
              {h.azubi_signatur
                ? <><img src={h.azubi_signatur} alt="Azubi" style={{maxWidth:'100%',maxHeight:70,borderBottom:'1px solid #333',padding:'0 0 4px'}}/><div style={{fontSize:'0.65rem',color:'var(--text3)',marginTop:4}}>{new Date(h.azubi_signiert_am).toLocaleDateString('de-DE')}</div></>
                : <div style={{height:60,borderBottom:'1px solid #ccc',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc',fontSize:'0.72rem'}}>Nicht signiert</div>
              }
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'0.72rem',color:'var(--text3)',marginBottom:6,fontWeight:600}}>AUSBILDER</div>
              {h.ausbilder_signatur
                ? <><img src={h.ausbilder_signatur} alt="Ausbilder" style={{maxWidth:'100%',maxHeight:70,borderBottom:'1px solid #333',padding:'0 0 4px'}}/><div style={{fontSize:'0.65rem',color:'var(--text3)',marginTop:4}}>{new Date(h.ausbilder_signiert_am).toLocaleDateString('de-DE')} · {ausbilderName}</div></>
                : <div style={{height:60,borderBottom:'1px solid #ccc',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc',fontSize:'0.72rem'}}>Nicht signiert</div>
              }
            </div>
          </div>
        </div>

        {/* Aktionen */}
        {isAzubi && h.status==='entwurf' && (
          <button className="btn btn-primary" onClick={()=>setAnsicht('bearbeiten')} style={{marginBottom:8}}>✏️ Bearbeiten</button>
        )}
        {isAzubi && !h.azubi_signatur && (
          <button className="btn btn-primary" style={{background:'#276749',marginBottom:8}} onClick={()=>setShowSignatur('azubi')}>✍️ Als Azubi unterschreiben</button>
        )}
        {kannSignieren && h.azubi_signatur && !h.ausbilder_signatur && (
          <button className="btn btn-primary" style={{marginBottom:8}} onClick={()=>setShowSignatur('ausbilder')}>✍️ Als Ausbilder signieren</button>
        )}
        <button className="btn btn-secondary" style={{marginBottom:8}} onClick={()=>exportPDF(h)}>📄 Als PDF exportieren</button>
        {kannSignieren&&(
          <button onClick={async()=>{
            if(!confirm('Berichtsheft wirklich löschen?')) return
            await supabase.from('berichtshefte').delete().eq('id',h.id)
            await loadHefte()
            setAnsicht('liste')
          }} style={{width:'100%',padding:'0.875rem',background:'var(--red-pale)',color:'var(--red)',border:'1px solid rgba(214,62,62,0.2)',borderRadius:'var(--r-sm)',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.95rem',marginBottom:8}}>🗑️ Berichtsheft löschen</button>
        )}
        <button className="btn btn-secondary" onClick={()=>setAnsicht('liste')}>Zurück zur Liste</button>

        {showSignatur && (
          <SignaturCanvas
            title={showSignatur==='azubi'?'Azubi-Unterschrift':'Ausbilder-Signatur'}
            onSave={handleSignatur}
            onCancel={()=>setShowSignatur(false)}
          />
        )}
      </div>
    )
  }

  return null
}

export default function App() {
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(true); const [page,setPage]=useState('home')
  const [baustellen,setBaustellen]=useState([]); const [stunden,setStunden]=useState([]); const [allUsers,setAllUsers]=useState([])
  const [termine,setTermine]=useState([])
  const [showStunden,setShowStunden]=useState(false)
  const [showKrank,setShowKrank]=useState(false)
  const [installPrompt,setInstallPrompt]=useState(null)
  const [showInstallBanner,setShowInstallBanner]=useState(false)

  useEffect(()=>{
    if(typeof window!=='undefined'&&window.localStorage.getItem('pwa_banner_dismissed')) return
    const handler = e => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  },[])

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const {data:profile}=await supabase.from('profiles').select('*').eq('id',session.user.id).single(); setUser({...session.user,profile})}
      setLoading(false)
    })
  },[])
  useEffect(()=>{if(user)loadData()},[user])
  useEffect(()=>{
    if(!user)return
    const interval=setInterval(()=>loadData(),30000)
    return ()=>clearInterval(interval)
  },[user])

  async function loadData() {
    const [{data:bs},{data:st},{data:users},{data:term}]=await Promise.all([
      supabase.from('baustellen').select('*').order('created_at',{ascending:false}).limit(1000),
      supabase.from('stunden').select('*, profiles(name), baustellen(name)').order('datum',{ascending:false}).limit(2000),
      supabase.from('profiles').select('*'),
      supabase.from('termine').select('*').order('datum',{ascending:true}).limit(500)
    ])
    setBaustellen(bs||[]); setStunden(st||[]); setAllUsers(users||[]); setTermine(term||[])
  }
  async function handleLogout(){await supabase.auth.signOut(); setUser(null); setPage('home')}
  async function handleDelete(id) {
    await supabase.from('stunden').delete().eq('id',id)
    await loadData()
  }
  async function handleInstall() {
    if(!installPrompt)return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if(result.outcome==='accepted') setShowInstallBanner(false)
  }

  if(loading)return <div className="loading">App wird geladen...</div>
  if(!user)return <LoginPage onLogin={u=>{setUser(u)}}/>
  const isAdmin=user.profile?.role==='admin'
  const isBuero=user.profile?.role==='buero'
  const isAzubi=user.profile?.role==='azubi'
  const ausstehendCount=stunden.filter(s=>s.freigabe_status==='ausstehend').length
  const kalenderBadge=termine.filter(t=>{const d=new Date(t.datum);const diff=(d-new Date())/(1000*60*60*24);return diff>=0&&diff<=2&&(t.zugewiesen_an?.includes(user.id)||t.erstellt_von===user.id)}).length
  return (
    <div className="app-container">
      {showInstallBanner&&(
        <div className="pwa-banner">
          <span>📱 App auf Homescreen installieren</span>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <button className="pwa-btn" onClick={handleInstall}>Installieren</button>
            <button className="pwa-close" onClick={()=>{setShowInstallBanner(false);if(typeof window!=='undefined')window.localStorage.setItem('pwa_banner_dismissed','1')}}>✕</button>
          </div>
        </div>
      )}
      <div style={{background:'var(--dark)',padding:'6px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <img src="/logo.png" alt="Elektro Pees" style={{height:'36px',width:'auto',maxWidth:'140px',objectFit:'contain'}} onError={e=>{e.target.outerHTML='<div style="color:white;font-size:0.9rem;font-weight:700">Elektro Pees</div>'}}/>
        <div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'flex-end'}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--blue),var(--blue-light))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,color:'white',flexShrink:0}}>
            {(user.profile?.name||user.email).split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.2}}>
            <span style={{color:'rgba(255,255,255,0.9)',fontSize:'0.8rem',fontWeight:600}}>{(user.profile?.name||user.email).split(' ')[0]}</span>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.6rem'}}>{user.profile?.role==='admin'?'Admin':user.profile?.role==='buero'?'Büro':user.profile?.role==='azubi'?'Azubi':'Monteur'}</span>
          </div>
          <button onClick={loadData} style={{width:30,height:30,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.6)',borderRadius:6,cursor:'pointer',fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:4}}>↻</button>
          <button onClick={handleLogout} style={{height:30,padding:'0 10px',fontSize:'0.72rem',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Abmelden</button>
        </div>
      </div>
      {page==='home'&&<HomePage user={user} stunden={stunden} baustellen={baustellen} onStunden={()=>setShowStunden(true)} onDelete={handleDelete} isAdmin={isAdmin} isBuero={isBuero} onKrank={()=>setShowKrank(true)}/>}
      {page==='baustellen'&&<BaustellenPage baustellen={baustellen} stunden={stunden} isAdmin={isAdmin} isBuero={isBuero} onRefresh={loadData} user={user} allUsers={allUsers}/>}
      {page==='urlaub'&&<UrlaubPage user={user} isAdmin={isAdmin} isBuero={isBuero} allUsers={allUsers}/>}
      {page==='counter'&&<CounterPage baustellen={baustellen} user={user}/>}
      {page==='profil'&&<ProfilPage user={user} stunden={stunden} baustellen={baustellen} isBuero={isBuero} setPage={setPage}/>}
      {page==='kalender'&&<KalenderPage user={user} baustellen={baustellen} allUsers={allUsers} isAdmin={isAdmin} isBuero={isBuero}/>}
      {page==='admin'&&(isAdmin||isBuero)&&<AdminPage stunden={stunden} baustellen={baustellen} allUsers={allUsers} onRefresh={loadData} currentUser={user} isAdmin={isAdmin}/>}
      {page==='berichtsheft'&&<BerichtsheftPage user={user} allUsers={allUsers} isAdmin={isAdmin} isBuero={isBuero}/>}
      {showStunden&&<StundenModal user={user} baustellen={baustellen} onClose={()=>setShowStunden(false)} onSaved={loadData} isBuero={isBuero}/>}
      {showKrank&&<KrankModal user={user} baustellen={baustellen} onClose={()=>setShowKrank(false)} onSaved={loadData}/>}
      <nav className="bottom-nav">
        <button className={`nav-item ${page==='home'?'active':''}`} onClick={()=>setPage('home')}><IconHome/><span>Start</span></button>
        <button className={`nav-item ${page==='baustellen'?'active':''}`} onClick={()=>setPage('baustellen')}><IconHardHat/><span>Baustellen</span></button>
        <button className={`nav-item ${page==='counter'?'active':''}`} onClick={()=>setPage('counter')}><IconCounter/><span>Counter</span></button>
        <button className={`nav-item ${page==='kalender'?'active':''}`} onClick={()=>setPage('kalender')} style={{position:'relative'}}>
          <IconKalender/>
          {kalenderBadge>0&&<span style={{position:'absolute',top:4,right:'50%',transform:'translateX(8px)',background:'#d69e2e',color:'white',borderRadius:'50%',width:16,height:16,fontSize:'0.6rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{kalenderBadge}</span>}
          <span>Kalender</span>
        </button>
        <button className={`nav-item ${page==='profil'?'active':''}`} onClick={()=>setPage('profil')}><IconUser/><span>Profil</span></button>
        {(isAzubi||isAdmin||isBuero)&&<button className={`nav-item ${page==='berichtsheft'?'active':''}`} onClick={()=>setPage('berichtsheft')}><IconBuch/><span>Heft</span></button>}
        {(isAdmin||isBuero)&&<button className={`nav-item ${page==='urlaub'?'active':''}`} onClick={()=>setPage('urlaub')}><IconSun/><span>Urlaub</span></button>}
        {(isAdmin||isBuero)&&(
          <button className={`nav-item ${page==='admin'?'active':''}`} onClick={()=>setPage('admin')} style={{position:'relative'}}>
            <IconStar/>
            {ausstehendCount>0&&<span style={{position:'absolute',top:4,right:'50%',transform:'translateX(8px)',background:'#e53e3e',color:'white',borderRadius:'50%',width:16,height:16,fontSize:'0.6rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{ausstehendCount}</span>}
            <span>Admin</span>
          </button>
        )}
      </nav>
    </div>
  )
}
