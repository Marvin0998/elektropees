import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IconHome = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconHardHat = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z"/><path d="M12 2a9 9 0 019 9H3a9 9 0 019-9z"/></svg>
const IconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconStar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
const IconCounter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/></svg>
const IconSun = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>

function formatDate(d) { if(!d)return'—'; const [y,m,day]=d.split('-'); return `${day}.${m}.${y}` }
function getWeekStart(d) { const day=new Date(d); const dow=day.getDay(); const diff=dow===0?-6:1-dow; day.setDate(day.getDate()+diff); day.setHours(0,0,0,0); return day }
function calcDauer(start,end) { const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); const mins=(eh*60+em)-(sh*60+sm); return mins>0?parseFloat((mins/60).toFixed(2)):0 }
function initials(name) { return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) }
function today() { return new Date().toISOString().split('T')[0] }
function getDayName(dateStr) { const days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; return days[new Date(dateStr).getDay()] }
function countWorkdays(from,to) { let count=0; const d=new Date(from); while(d<=new Date(to)){const dow=d.getDay(); if(dow>=1&&dow<=5)count++; d.setDate(d.getDate()+1)} return count }

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
        <img src="/logo.png" alt="Elektro Pees" style={{height:'70px',width:'auto',marginBottom:'1rem'}} onError={e=>{e.target.style.display='none'}}/>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'1rem',marginTop:4,fontWeight:600}}>Stundenerfassung</p>
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

function HomePage({user,stunden,baustellen,onStunden,onDelete,isAdmin}) {
  const myStunden=stunden.filter(s=>s.user_id===user.id)
  const now=new Date(); const weekStart=getWeekStart(now); const weekEnd=new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6)
  const freigegebeneStunden=myStunden.filter(s=>s.freigabe_status==='freigegeben')
  const wocheStunden=freigegebeneStunden.filter(s=>{const d=new Date(s.datum);return d>=weekStart&&d<=weekEnd}).reduce((a,s)=>a+s.dauer,0)
  const ausstehend=myStunden.filter(s=>s.freigabe_status==='ausstehend').length
  const regelStunden=user.profile?.regel_stunden||38
  const diff=wocheStunden-regelStunden
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
          <div className="entry-site">{b?.name||'—'}{isFri&&<span className="badge badge-pending" style={{marginLeft:6,fontSize:'0.62rem'}}>Freitag</span>}</div>
          <div className="entry-meta">{getDayName(s.datum)}, {formatDate(s.datum)} · {s.start_zeit}–{s.end_zeit}{s.notiz&&` · ${s.notiz}`}</div>
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
      <div className="welcome-block">
        <div className="welcome-time">{greet}</div>
        <div className="welcome-name">{user.profile?.name||user.email}</div>
        <div className="welcome-sub">Hier kannst du deine Arbeitszeit erfassen und deine aktuellen Einträge prüfen.</div>
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
      {ausstehend>0&&(
        <div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:12,padding:'0.75rem 1rem',marginBottom:'0.75rem'}}>
          <span style={{fontSize:'0.85rem',color:'#92400e'}}>⏳ {ausstehend} Eintrag{ausstehend>1?'e':''} wartet auf Freigabe</span>
        </div>
      )}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Stunden diese Woche</div>
          <div className="stat-num">{wocheStunden.toFixed(1)}</div>
          <div className="stat-sub">von {regelStunden}.0 h Regelarbeitszeit</div>
          <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(wocheStunden/regelStunden)*100).toFixed(0)}%`}}/></div>
        </div>
        <div className={`stat-card ${diff>=0?'success':'danger'}`}>
          <div className="stat-label">{diff>=0?'Überstunden':'Fehlstunden'}</div>
          <div className={`stat-num ${diff>=0?'plus':'minus'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div>
          <div className="stat-sub">noch offen diese Woche</div>
          <div className="progress-bar"><div className={`progress-fill ${diff<0?'danger':''}`} style={{width:`${Math.min(100,Math.abs(diff)/regelStunden*100).toFixed(0)}%`}}/></div>
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

function BaustellenPage({baustellen,stunden,isAdmin,onRefresh}) {
  const [filter,setFilter]=useState('aktiv'); const [showDetail,setShowDetail]=useState(null); const [showNew,setShowNew]=useState(false); const [bsDeleteConfirm,setBsDeleteConfirm]=useState(false)
  const [form,setForm]=useState({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:''}); const [saving,setSaving]=useState(false)
  const list=baustellen.filter(b=>b.status===filter)
  async function handleSave() {
    if(!form.name||!form.kunde){alert('Name und Kunde sind Pflichtfelder!');return}
    setSaving(true); await supabase.from('baustellen').insert([{...form,status:'aktiv'}]); await onRefresh()
    setForm({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:''}); setShowNew(false); setSaving(false)
  }
  async function handleAbschliessen(id) {
    await supabase.from('baustellen').update({status:'abgeschlossen'}).eq('id',id)
    await onRefresh(); setShowDetail(null)
  }
  async function handleLoeschen(id) {
    setBsDeleteConfirm(false)
    await supabase.from('baustellen').delete().eq('id',id)
    await onRefresh(); setShowDetail(null)
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
          <div key={b.id} className="card" onClick={()=>setShowDetail(b.id)} style={{cursor:'pointer'}}>
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
          {isAdmin&&!bsDeleteConfirm&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
              {detailBs.status==='aktiv'&&(
                <button className="btn btn-danger" style={{marginBottom:0,padding:'0.6rem',fontSize:'0.85rem'}} onClick={()=>handleAbschliessen(detailBs.id)}>
                  🔒 Archivieren
                </button>
              )}
              <button className="btn" style={{marginBottom:0,padding:'0.6rem',fontSize:'0.85rem',background:'#742a2a',color:'white',gridColumn:detailBs.status==='aktiv'?'auto':'1/-1'}} onClick={()=>setBsDeleteConfirm(true)}>
                🗑️ Löschen
              </button>
            </div>
          )}
          {isAdmin&&bsDeleteConfirm&&(
            <div style={{background:'#fff5f5',border:'1px solid #feb2b2',borderRadius:10,padding:'0.75rem',marginBottom:'0.5rem'}}>
              <p style={{fontSize:'0.85rem',color:'#9b2c2c',marginBottom:'0.5rem',textAlign:'center',fontWeight:600}}>Baustelle wirklich löschen?</p>
              <p style={{fontSize:'0.75rem',color:'#c53030',marginBottom:'0.75rem',textAlign:'center'}}>Diese Aktion kann nicht rückgängig gemacht werden!</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                <button onClick={()=>handleLoeschen(detailBs.id)} style={{background:'#e53e3e',color:'white',border:'none',borderRadius:8,padding:'8px',fontSize:'0.85rem',fontWeight:700,cursor:'pointer',minHeight:36}}>✓ Ja, löschen</button>
                <button onClick={()=>setBsDeleteConfirm(false)} style={{background:'#e2e8f0',color:'#1a202c',border:'none',borderRadius:8,padding:'8px',fontSize:'0.85rem',fontWeight:600,cursor:'pointer',minHeight:36}}>Abbrechen</button>
              </div>
            </div>
          )}
          <button className="btn btn-secondary" onClick={()=>{setShowDetail(null);setBsDeleteConfirm(false)}}>Schließen</button>
        </div></div>
      )}
      {showNew&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">🏗️ Neue Baustelle</div>
          {['name','kunde','adresse','beschreibung','kontakt','telefon'].map(field=>(
            <div key={field} className="form-group">
              <label>{field==='name'?'Baustellenname *':field==='kunde'?'Kunde *':field.charAt(0).toUpperCase()+field.slice(1)}</label>
              {field==='beschreibung'?<textarea value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder="Beschreibung..."/>:<input type={field==='telefon'?'tel':'text'} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/>}
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Wird gespeichert...':'✓ Baustelle speichern'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowNew(false)}>Abbrechen</button>
        </div></div>
      )}
    </div>
  )
}

function UrlaubPage({user,isAdmin,allUsers}) {
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
      {!isAdmin&&(
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
                  <span className="list-item-sub">{a.tage} Arbeitstage{a.notiz&&` · ${a.notiz}`}</span>
                  <div style={{marginTop:3}}>{urlaubBadge(a.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {isAdmin&&(
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
                    <div className="text-sm" style={{color:'#1B52DD',fontWeight:600}}>{a.tage} Arbeitstage</div>
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
          {tage>0&&<div className="card" style={{background:'#ebf8ff',padding:'0.75rem 1rem',marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#2b6cb0',fontSize:'0.85rem'}}>Arbeitstage (Mo–Fr):</span><span style={{fontSize:'1.2rem',fontWeight:800,color:'#0A0A44'}}>{tage} Tage</span></div></div>}
          <div className="form-group"><label>Notiz (optional)</label><textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Familienurlaub..."/></div>
          <button className="btn btn-primary" onClick={handleAntrag} disabled={saving||tage<=0}>{saving?'Wird gesendet...':'✓ Antrag einreichen'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowNew(false)}>Abbrechen</button>
        </div></div>
      )}
    </div>
  )
}

function ProfilPage({user,stunden,baustellen}) {
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
            <div className="text-xs text-muted">{profile.role==='admin'?'Administrator':'Mitarbeiter'}</div>
            <div className="text-xs text-muted">{user.email}</div>
          </div>
        </div>
        <div className="stats-row" style={{marginBottom:0}}>
          <div className="stat-card"><div className="stat-num">{total.toFixed(1)}</div><div className="stat-label">Freigegebene Std.</div></div>
          <div className="stat-card"><div className="stat-num">{woche.toFixed(1)}</div><div className="stat-label">Std. diese Woche</div></div>
          <div className={`stat-card ${diff>=0?'success':'danger'}`}>
          <div className="stat-label">{diff>=0?'Überstunden':'Fehlstunden'}</div>
          <div className={`stat-num ${diff>=0?'plus':'minus'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div>
          <div className="stat-sub">noch offen diese Woche</div>
          <div className="progress-bar"><div className={`progress-fill ${diff<0?'danger':''}`} style={{width:`${Math.min(100,Math.abs(diff)/regelStunden*100).toFixed(0)}%`}}/></div>
        </div>
          <div className="stat-card"><div className="stat-num">{regelStunden}</div><div className="stat-label">Regelstunden/Wo</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">🏖️ Urlaub {new Date().getFullYear()}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',textAlign:'center',marginBottom:'0.75rem'}}>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#0A0A44'}}>{urlaubGesamt}</div><div className="text-xs text-muted">Gesamt</div></div>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#e53e3e'}}>{urlaubGenommen}</div><div className="text-xs text-muted">Genommen</div></div>
          <div><div style={{fontSize:'1.3rem',fontWeight:800,color:'#38a169'}}>{resturlaub}</div><div className="text-xs text-muted">Verbleibend</div></div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${urlaubPct}%`,background:'linear-gradient(90deg,#38a169,#68d391)'}}/></div>
        <div className="text-xs text-muted" style={{textAlign:'right',marginTop:4}}>{urlaubPct}% verbraucht</div>
      </div>
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

function AdminPage({stunden,baustellen,allUsers,onRefresh}) {
  const [tab,setTab]=useState('freigabe')
  const [showNewUser,setShowNewUser]=useState(false)
  const [selectedMitarbeiter,setSelectedMitarbeiter]=useState(null)
  const [newUser,setNewUser]=useState({name:'',email:'',password:'',regel_stunden:38,urlaub_gesamt:24})
  const [saving,setSaving]=useState(false); const [msg,setMsg]=useState('')
  const mitarbeiter=allUsers.filter(u=>u.role!=='admin')
  const ausstehend=stunden.filter(s=>s.freigabe_status==='ausstehend')

  async function handleFreigabe(id,entscheidung) {
    await supabase.from('stunden').update({freigabe_status:entscheidung}).eq('id',id)
    setMsg(entscheidung==='freigegeben'?'✓ Stunden freigegeben!':'Stunden abgelehnt.')
    await onRefresh(); setTimeout(()=>setMsg(''),3000)
  }
  async function handleAlleFreigeben() {
    if(!confirm(`Alle ${ausstehend.length} ausstehenden Einträge freigeben?`))return
    await supabase.from('stunden').update({freigabe_status:'freigegeben'}).eq('freigabe_status','ausstehend')
    setMsg(`✓ ${ausstehend.length} Einträge freigegeben!`); await onRefresh(); setTimeout(()=>setMsg(''),3000)
  }
  async function handleNewUser() {
    if(!newUser.name||!newUser.password){alert('Name und Passwort sind Pflicht!');return}
    if(newUser.password.length<6){alert('Passwort muss mindestens 6 Zeichen haben!');return}
    setSaving(true)
    // Automatische E-Mail aus dem Namen generieren
    const cleanName=newUser.name.toLowerCase().replace(/\s+/g,'.').replace(/[^a-z.]/g,'')
    const autoEmail=cleanName+'@elektropees.intern'
    const {data,error}=await supabase.auth.signUp({email:autoEmail,password:newUser.password})
    if(error){alert('Fehler: '+error.message);setSaving(false);return}
    if(data.user){
      await supabase.from('profiles').upsert({
        id:data.user.id,name:newUser.name,email:autoEmail,
        role:'mitarbeiter',regel_stunden:newUser.regel_stunden,
        urlaub_gesamt:newUser.urlaub_gesamt,urlaub_genommen:0
      })
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
                  <div key={s.id} className="freigabe-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div className="freigabe-name">{s.profiles?.name||'—'}{isFri&&<span className="badge badge-pending" style={{marginLeft:6}}>Freitag</span>}</div>
                        <div className="freigabe-meta">{getDayName(s.datum)}, {formatDate(s.datum)}</div>
                        <div className="freigabe-meta">🏗️ {b?.name||'—'} · {s.start_zeit}–{s.end_zeit}</div>
                        {s.notiz&&<div className="freigabe-meta">📝 {s.notiz}</div>}
                      </div>
                      <div className="freigabe-hours">{s.dauer.toFixed(1)}h</div>
                    </div>
                    <div className="freigabe-actions">
                      <button className="btn-approve" onClick={()=>handleFreigabe(s.id,'freigegeben')}>✓ Freigeben</button>
                      <button className="btn-reject" onClick={()=>handleFreigabe(s.id,'abgelehnt')}>✗ Ablehnen</button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
          {/* Erledigte Einträge */}
          {stunden.filter(s=>s.freigabe_status==='freigegeben'||s.freigabe_status==='abgelehnt').length>0&&(
            <div className="card" style={{marginTop:'0.75rem'}}>
              <div className="card-title" style={{fontSize:'0.85rem',color:'#4a5568'}}>✓ Erledigte Einträge</div>
              {stunden.filter(s=>s.freigabe_status!=='ausstehend').sort((a,b)=>b.datum.localeCompare(a.datum)).slice(0,10).map(s=>{
                const b=baustellen.find(b=>b.id===s.baustelle_id)
                const freigegeben=s.freigabe_status==='freigegeben'
                return (
                  <div key={s.id} style={{padding:'0.75rem 0',borderBottom:'1px solid var(--border)',opacity:0.8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div>
                        <div style={{fontWeight:500,fontSize:'0.87rem',color:'var(--dark)'}}>{s.profiles?.name||'—'}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>{getDayName(s.datum)}, {formatDate(s.datum)} · {b?.name||'—'}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>{s.start_zeit} – {s.end_zeit}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                        <span style={{fontWeight:700,color:freigegeben?'var(--blue)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{s.dauer.toFixed(1)}h</span>
                        <span style={{fontSize:'0.65rem',background:freigegeben?'var(--green-pale)':'var(--red-pale)',color:freigegeben?'var(--green)':'var(--red)',padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                          {freigegeben?'✓ Freigegeben':'✗ Abgelehnt'}
                        </span>
                        <button onClick={()=>{ supabase.from('stunden').delete().eq('id',s.id).then(()=>{ onRefresh() }) }} style={{fontSize:'0.75rem',color:'var(--red)',background:'var(--red-pale)',border:'1px solid rgba(214,62,62,0.2)',borderRadius:'var(--r-sm)',cursor:'pointer',padding:'5px 10px',fontFamily:'inherit',fontWeight:600,minHeight:32,minWidth:70}}>🗑️ Löschen</button>
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
          <div style={{marginBottom:'0.75rem',textAlign:'right'}}><button className="btn btn-outline btn-sm" onClick={()=>setShowNewUser(true)}>+ Mitarbeiter anlegen</button></div>
          {mitarbeiter.map(u=>{
            const myH=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='freigegeben').reduce((a,s)=>a+s.dauer,0)
            const now=new Date(); const ws=getWeekStart(now); const we=new Date(ws); we.setDate(we.getDate()+6)
            const woche=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='freigegeben').filter(s=>{const d=new Date(s.datum);return d>=ws&&d<=we}).reduce((a,s)=>a+s.dauer,0)
            const diff=woche-(u.regel_stunden||38)
            const offene=stunden.filter(s=>s.user_id===u.id&&s.freigabe_status==='ausstehend').length
            const isOpen=selectedMitarbeiter===u.id
            const myStunden=[...stunden.filter(s=>s.user_id===u.id)].sort((a,b)=>b.datum.localeCompare(a.datum))
            return (
              <div key={u.id} className="card" style={{padding:0,overflow:'hidden'}}>
                {/* Header - klickbar */}
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

                {/* Detail-Ansicht */}
                {isOpen&&(
                  <div style={{borderTop:'1px solid var(--border)',background:'var(--bg)'}}>
                    {/* Kurzstats */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,borderBottom:'1px solid var(--border)'}}>
                      <div style={{padding:'0.75rem',textAlign:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--blue)',fontFamily:"'DM Mono',monospace"}}>{myH.toFixed(1)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>Ges. Std.</div>
                      </div>
                      <div style={{padding:'0.75rem',textAlign:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:diff>=0?'var(--green)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{diff>=0?'+':''}{diff.toFixed(1)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{diff>=0?'Überstunden':'Fehlstunden'}</div>
                      </div>
                      <div style={{padding:'0.75rem',textAlign:'center'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,color:'#d69e2e',fontFamily:"'DM Mono',monospace"}}>{(u.urlaub_gesamt||24)-(u.urlaub_genommen||0)}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>Resturlaub</div>
                      </div>
                    </div>

                    {/* Einträge gegliedert nach Kalenderwochen + Tagen */}
                    <div style={{padding:'0.75rem 1rem'}}>
                      {myStunden.length===0
                        ?<p style={{fontSize:'0.82rem',color:'var(--text3)'}}>Noch keine Einträge.</p>
                        :(() => {
                          // Gruppiere nach Kalenderwoche
                          const byWeek = {}
                          myStunden.forEach(s => {
                            const d = new Date(s.datum)
                            const ws = getWeekStart(d)
                            const we = new Date(ws); we.setDate(we.getDate()+6)
                            const key = ws.toISOString().split('T')[0]
                            if(!byWeek[key]) byWeek[key] = {start:ws,end:we,days:{}}
                            const dayKey = s.datum
                            if(!byWeek[key].days[dayKey]) byWeek[key].days[dayKey] = []
                            byWeek[key].days[dayKey].push(s)
                          })
                          return Object.keys(byWeek).sort((a,b)=>b.localeCompare(a)).map(wk => {
                            const week = byWeek[wk]
                            const weekTotal = Object.values(week.days).flat().reduce((a,s)=>a+s.dauer,0)
                            const isCurrentWeek = getWeekStart(new Date()).toISOString().split('T')[0]===wk
                            return (
                              <div key={wk} style={{marginBottom:'1rem'}}>
                                {/* Wochen-Header */}
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:isCurrentWeek?'var(--blue-pale)':'var(--bg)',borderRadius:'var(--r-sm)',padding:'6px 10px',marginBottom:'0.5rem',border:isCurrentWeek?'1px solid rgba(27,82,221,0.15)':'1px solid var(--border)'}}>
                                  <span style={{fontSize:'0.72rem',fontWeight:700,color:isCurrentWeek?'var(--blue)':'var(--text2)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                                    {isCurrentWeek?'📅 Aktuelle Woche':'KW '+(()=>{const d=new Date(wk);const y=d.getFullYear();const s=new Date(y,0,1);return Math.ceil((((d-s)/86400000)+s.getDay()+1)/7)})()}  {formatDate(wk)} – {formatDate(new Date(new Date(wk).setDate(new Date(wk).getDate()+6)).toISOString().split('T')[0])}
                                  </span>
                                  <span style={{fontSize:'0.78rem',fontWeight:700,color:isCurrentWeek?'var(--blue)':'var(--dark)',fontFamily:"'DM Mono',monospace"}}>{weekTotal.toFixed(1)}h</span>
                                </div>
                                {/* Tage */}
                                {Object.keys(week.days).sort((a,b)=>b.localeCompare(a)).map(dayKey => {
                                  const dayEntries = week.days[dayKey]
                                  const dayTotal = dayEntries.reduce((a,s)=>a+s.dauer,0)
                                  return (
                                    <div key={dayKey} style={{marginBottom:'0.5rem'}}>
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
                                              <div style={{fontSize:'0.8rem',fontWeight:500,color:'var(--dark)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b?.name||'—'}</div>
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
                            )
                          })
                        })()
                      }
                    </div>
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

      {showNewUser&&(
        <div className="modal-overlay open"><div className="modal-sheet">
          <div className="modal-handle"/><div className="modal-title">👤 Mitarbeiter anlegen</div>
          <div className="form-group"><label>Name *</label><input value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="Max Mustermann"/></div>
          <div className="form-group"><label>Passwort *</label><input type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="Mindestens 6 Zeichen"/></div>
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

function StundenModal({user,baustellen,onClose,onSaved}) {
  const [form,setForm]=useState({datum:today(),start:'07:30',end:'17:00',baustelle_id:'',notiz:''})
  const [saving,setSaving]=useState(false); const [showNewBs,setShowNewBs]=useState(false)
  const [newBs,setNewBs]=useState({name:'',kunde:'',adresse:'',beschreibung:''})
  const aktiveBaustellen=baustellen.filter(b=>b.status==='aktiv')
  const dauer=calcDauer(form.start,form.end)
  const isFriday=new Date(form.datum).getDay()===5
  async function handleSave() {
    if(!form.baustelle_id){alert('Bitte eine Baustelle auswählen!');return}
    if(dauer<=0){alert('Endzeit muss nach der Startzeit liegen!');return}
    setSaving(true)
    // Überschneidungs-Prüfung
    const {data:existing}=await supabase.from('stunden')
      .select('start_zeit,end_zeit,baustellen(name)')
      .eq('user_id',user.id)
      .eq('datum',form.datum)
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
    await supabase.from('stunden').insert([{user_id:user.id,baustelle_id:form.baustelle_id,datum:form.datum,start_zeit:form.start,end_zeit:form.end,pause_min:45,dauer,notiz:form.notiz,freigabe_status:'ausstehend'}])
    await onSaved(); onClose(); setSaving(false)
  }
  async function handleNewBs() {
    if(!newBs.name||!newBs.kunde){alert('Name und Kunde angeben!');return}
    const {data}=await supabase.from('baustellen').insert([{...newBs,status:'aktiv'}]).select().single()
    await onSaved(); if(data)setForm(f=>({...f,baustelle_id:data.id})); setShowNewBs(false)
  }
  return (
    <div className="modal-overlay open"><div className="modal-sheet">
      <div className="modal-handle"/><div className="modal-title">⏱️ Stunden erfassen</div>
      {isFriday&&<div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:10,padding:'0.6rem 1rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#92400e'}}>🟡 <strong>Freitag</strong> — wird als Überstunden gewertet</div>}
      <div className="form-group"><label>Mitarbeiter</label><input value={user.profile?.name||user.email} readOnly style={{background:'#f7fafc',color:'#718096'}}/></div>
      <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
      <div className="form-row">
        <div className="form-group"><label>Startzeit</label><input type="time" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/></div>
        <div className="form-group"><label>Endzeit</label><input type="time" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/></div>
      </div>
      <div className="calc-box">
        <div>
          <div className="calc-label">Arbeitszeit (inkl. 45 Min Pause)</div>
          <div className="calc-note">✓ Pause ist bezahlt · Freigabe durch Chef erforderlich</div>
        </div>
        <div className="calc-value">{dauer.toFixed(2)} Std</div>
      </div>
      <div className="form-group">
        <label>Baustelle</label>
        <select value={form.baustelle_id} onChange={e=>setForm(f=>({...f,baustelle_id:e.target.value}))}>
          <option value="">— Bitte auswählen —</option>
          {aktiveBaustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div style={{marginBottom:'1rem'}}><button className="btn btn-outline btn-sm" onClick={()=>setShowNewBs(true)}>+ Neue Baustelle anlegen</button></div>
      <div className="form-group"><label>Notiz (optional)</label><textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Kabelverlegung EG..."/></div>
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

// ─── ELEKTRO SVG ICONS ───────────────────────────────
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

function CounterPage({ baustellen }) {
  const [mode, setMode] = useState('baustelle')
  const [selectedBs, setSelectedBs] = useState('')
  const [counts, setCounts] = useState({})
  const [custom, setCustom] = useState([])
  const [newCustom, setNewCustom] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)

  const materials = mode === 'baustelle' ? MATERIALS_BAUSTELLE : MATERIALS_WAERMEPUMPE
  const storageKey = 'counter_' + mode + '_' + selectedBs

  useEffect(() => {
    if (!selectedBs || typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved) { const d = JSON.parse(saved); setCounts(d.counts||{}); setCustom(d.custom||[]) }
      else { setCounts({}); setCustom([]) }
    } catch(e) { setCounts({}); setCustom([]) }
  }, [selectedBs, mode])

  function save(nc, ncu) {
    if (!selectedBs || typeof window === 'undefined') return
    try { window.localStorage.setItem(storageKey, JSON.stringify({counts:nc,custom:ncu})) } catch(e) {}
  }
  function change(id, delta) { const nc={...counts,[id]:Math.max(0,(counts[id]||0)+delta)}; setCounts(nc); save(nc,custom) }
  function addCustom() {
    if (!newCustom.trim()) return
    const ncu=[...custom,{id:'c'+Date.now(),label:newCustom.trim()}]
    setCustom(ncu); setNewCustom(''); setShowAddCustom(false); save(counts,ncu)
  }
  function removeCustom(id) { const ncu=custom.filter(c=>c.id!==id); const nc={...counts}; delete nc[id]; setCustom(ncu); setCounts(nc); save(nc,ncu) }

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
            <button className="btn btn-outline btn-sm" onClick={()=>{setCounts({});save({},custom)}} style={{color:'var(--red)',borderColor:'var(--red)'}}>Reset</button>
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

export default function App() {
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(true); const [page,setPage]=useState('home')
  const [baustellen,setBaustellen]=useState([]); const [stunden,setStunden]=useState([]); const [allUsers,setAllUsers]=useState([])
  const [showStunden,setShowStunden]=useState(false)
  const [installPrompt,setInstallPrompt]=useState(null)
  const [showInstallBanner,setShowInstallBanner]=useState(false)

  useEffect(()=>{
    // PWA Install-Prompt abfangen
    const handler = e => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    // Benachrichtigungen anfragen
    if('Notification' in window && Notification.permission==='default'){
      Notification.requestPermission()
    }
    return () => window.removeEventListener('beforeinstallprompt', handler)
  },[])

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const {data:profile}=await supabase.from('profiles').select('*').eq('id',session.user.id).single(); setUser({...session.user,profile})}
      setLoading(false)
    })
  },[])
  useEffect(()=>{if(user)loadData()},[user])
  // Auto-Refresh alle 30 Sekunden
  useEffect(()=>{
    if(!user)return
    const interval=setInterval(()=>loadData(),30000)
    return ()=>clearInterval(interval)
  },[user])

  async function loadData() {
    const [{data:bs},{data:st},{data:users}]=await Promise.all([
      supabase.from('baustellen').select('*').order('created_at',{ascending:false}),
      supabase.from('stunden').select('*, profiles(name), baustellen(name)').order('datum',{ascending:false}),
      supabase.from('profiles').select('*')
    ])
    setBaustellen(bs||[]); setStunden(st||[]); setAllUsers(users||[])
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
  const ausstehendCount=stunden.filter(s=>s.freigabe_status==='ausstehend').length
  return (
    <div className="app-container">
      {showInstallBanner&&(
        <div className="pwa-banner">
          <span>📱 App auf Homescreen installieren</span>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <button className="pwa-btn" onClick={handleInstall}>Installieren</button>
            <button className="pwa-close" onClick={()=>setShowInstallBanner(false)}>✕</button>
          </div>
        </div>
      )}
      <div style={{background:'var(--dark)'}}>
        {/* Logo zentriert oben */}
        <div style={{padding:'14px 20px 10px',display:'flex',flexDirection:'column',alignItems:'center',gap:4,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <img src="/logo.png" alt="Elektro Pees" style={{height:'52px',width:'auto',maxWidth:'180px',objectFit:'contain'}} onError={e=>{e.target.outerHTML='<div style="color:white;font-size:1.2rem;font-weight:700">Elektro Pees</div>'}}/>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'0.68rem',letterSpacing:'0.1em',textTransform:'uppercase'}}>Stundenerfassung</div>
        </div>
        {/* User + Buttons unten */}
        <div style={{padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--blue),var(--blue-light))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,color:'white',flexShrink:0}}>
              {(user.profile?.name||user.email).split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem',fontWeight:500}}>{user.profile?.name||user.email}</span>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={loadData} style={{width:30,height:30,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center'}}>↻</button>
            <button className="top-logout" onClick={handleLogout} style={{height:30,padding:'0 12px',fontSize:'0.78rem'}}>Abmelden</button>
          </div>
        </div>
      </div>
      {page==='home'&&<HomePage user={user} stunden={stunden} baustellen={baustellen} onStunden={()=>setShowStunden(true)} onDelete={handleDelete} isAdmin={isAdmin}/>}
      {page==='baustellen'&&<BaustellenPage baustellen={baustellen} stunden={stunden} isAdmin={isAdmin} onRefresh={loadData}/>}
      {page==='urlaub'&&<UrlaubPage user={user} isAdmin={isAdmin} allUsers={allUsers}/>}
      {page==='counter'&&<CounterPage baustellen={baustellen}/>}
      {page==='profil'&&<ProfilPage user={user} stunden={stunden} baustellen={baustellen}/>}
      {page==='admin'&&isAdmin&&<AdminPage stunden={stunden} baustellen={baustellen} allUsers={allUsers} onRefresh={loadData}/>}
      {showStunden&&<StundenModal user={user} baustellen={baustellen} onClose={()=>setShowStunden(false)} onSaved={loadData}/>}
      <nav className="bottom-nav">
        <button className={`nav-item ${page==='home'?'active':''}`} onClick={()=>setPage('home')}><IconHome/><span>Start</span></button>
        <button className={`nav-item ${page==='baustellen'?'active':''}`} onClick={()=>setPage('baustellen')}><IconHardHat/><span>Baustellen</span></button>
        <button className={`nav-item ${page==='urlaub'?'active':''}`} onClick={()=>setPage('urlaub')}><IconSun/><span>Urlaub</span></button>
        <button className={`nav-item ${page==='counter'?'active':''}`} onClick={()=>setPage('counter')}><IconCounter/><span>Counter</span></button>
        <button className={`nav-item ${page==='profil'?'active':''}`} onClick={()=>setPage('profil')}><IconUser/><span>Profil</span></button>
        {isAdmin&&(
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
