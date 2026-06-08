import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IconHome = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconHardHat = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z"/><path d="M12 2a9 9 0 019 9H3a9 9 0 019-9z"/></svg>
const IconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconStar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
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
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setError('E-Mail oder Passwort falsch.'); setLoading(false); return}
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
          <div className="form-group"><label>E-Mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="max@elektropees.de" required/></div>
          <div className="form-group"><label>Passwort</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Wird angemeldet...':'Anmelden'}</button>
        </form>
      </div>
    </div>
  )
}

function HomePage({user,stunden,baustellen,onStunden,onDelete}) {
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

  const StundenListe=({list})=>list.map(s=>{
    const b=baustellen.find(b=>b.id===s.baustelle_id)
    const isFri=new Date(s.datum).getDay()===5
    const kannLoeschen=s.freigabe_status==='ausstehend'
    return (
      <div key={s.id} className="list-item">
        <div className="list-item-left" style={{flex:1}}>
          <span className="list-item-title">{b?.name||'—'}{isFri&&<span style={{fontSize:'0.7rem',background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:'10px',marginLeft:4}}>Freitag</span>}</span>
          <span className="list-item-sub">{getDayName(s.datum)}, {formatDate(s.datum)} · {s.start_zeit}–{s.end_zeit}</span>
          {s.notiz&&<span style={{fontSize:'0.72rem',color:'#49A7D6'}}>{s.notiz}</span>}
          <div style={{marginTop:2}}>{freigabeBadge(s.freigabe_status||'ausstehend')}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
          <span className="font-bold text-blue">{s.dauer.toFixed(1)} Std</span>
          {kannLoeschen&&(
            <button onClick={()=>onDelete(s.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#e53e3e',fontSize:'0.75rem',padding:'2px 6px',borderRadius:6,background:'#fff5f5'}}>🗑️ Löschen</button>
          )}
        </div>
      </div>
    )
  })

  return (
    <div className="page-content">
      <div style={{marginBottom:'1rem'}}>
        <p style={{fontSize:'0.8rem',color:'#718096'}}>Guten Tag,</p>
        <h2 style={{color:'#0A0A44',fontSize:'1.3rem'}}>{user.profile?.name||user.email}</h2>
      </div>
      <button className="hero-btn" onClick={onStunden}><IconClock/><div><h3>Stunden erfassen</h3><p>Arbeitszeit für heute eintragen</p></div></button>
      {ausstehend>0&&(
        <div style={{background:'#fef3c7',border:'1px solid #f6e05e',borderRadius:12,padding:'0.75rem 1rem',marginBottom:'0.75rem'}}>
          <span style={{fontSize:'0.85rem',color:'#92400e'}}>⏳ {ausstehend} Eintrag{ausstehend>1?'e':''} wartet auf Freigabe</span>
        </div>
      )}
      <div className="stats-row">
        <div className="stat-card"><div className="stat-num">{wocheStunden.toFixed(1)}</div><div className="stat-label">Std. diese Woche</div><div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(wocheStunden/regelStunden)*100).toFixed(0)}%`}}/></div></div>
        <div className="stat-card"><div className={`stat-num ${diff>=0?'plus':'minus'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div><div className="stat-label">{diff>=0?'Überstunden':'Fehlstunden'}</div></div>
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
  const [filter,setFilter]=useState('aktiv'); const [showDetail,setShowDetail]=useState(null); const [showNew,setShowNew]=useState(false)
  const [form,setForm]=useState({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:''}); const [saving,setSaving]=useState(false)
  const list=baustellen.filter(b=>b.status===filter)
  async function handleSave() {
    if(!form.name||!form.kunde){alert('Name und Kunde sind Pflichtfelder!');return}
    setSaving(true); await supabase.from('baustellen').insert([{...form,status:'aktiv'}]); await onRefresh()
    setForm({name:'',kunde:'',adresse:'',beschreibung:'',kontakt:'',telefon:''}); setShowNew(false); setSaving(false)
  }
  async function handleAbschliessen(id) {
    if(!confirm('Baustelle wirklich abschließen?'))return
    await supabase.from('baustellen').update({status:'abgeschlossen'}).eq('id',id); await onRefresh(); setShowDetail(null)
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
          {isAdmin&&detailBs.status==='aktiv'&&<button className="btn btn-danger" onClick={()=>handleAbschliessen(detailBs.id)}>🔒 Baustelle abschließen</button>}
          <button className="btn btn-secondary" onClick={()=>setShowDetail(null)}>Schließen</button>
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
          <div className="stat-card"><div className={`stat-num ${diff>=0?'plus':'minus'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div><div className="stat-label">{diff>=0?'Überstunden':'Fehlstunden'}</div></div>
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
    if(!newUser.name||!newUser.email||!newUser.password){alert('Name, E-Mail und Passwort sind Pflicht!');return}
    setSaving(true)
    const {data,error}=await supabase.auth.signUp({email:newUser.email,password:newUser.password})
    if(error){alert('Fehler: '+error.message);setSaving(false);return}
    if(data.user){await supabase.from('profiles').upsert({id:data.user.id,name:newUser.name,email:newUser.email,role:'mitarbeiter',regel_stunden:newUser.regel_stunden,urlaub_gesamt:newUser.urlaub_gesamt,urlaub_genommen:0})}
    setMsg('✓ Mitarbeiter angelegt!'); setShowNewUser(false); setSaving(false)
  }

  return (
    <div className="page-content">
      {msg&&<div className="alert alert-success">{msg}</div>}
      <div className="tab-row">
        {[['freigabe',`Freigaben ${ausstehend.length>0?`(${ausstehend.length})`:'✓'}`],['mitarbeiter','Mitarbeiter'],['auswertung','Auswertung']].map(([key,label])=>(
          <button key={key} className={`tab-btn ${tab===key?'active':''}`} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {tab==='freigabe'&&(
        <>
          {ausstehend.length===0
            ?<div className="card"><p className="text-muted text-sm">✓ Alle Stunden sind freigegeben!</p></div>
            :(
              <>
                <div style={{marginBottom:'0.75rem',display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-success btn-sm" onClick={handleAlleFreigeben}>✓ Alle freigeben ({ausstehend.length})</button>
                </div>
                {ausstehend.sort((a,b)=>b.datum.localeCompare(a.datum)).map(s=>{
                  const b=baustellen.find(b=>b.id===s.baustelle_id)
                  const isFri=new Date(s.datum).getDay()===5
                  return (
                    <div key={s.id} className="card" style={{borderLeft:'3px solid #f6e05e'}}>
                      <div style={{marginBottom:'0.75rem'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <div className="font-bold" style={{color:'#0A0A44'}}>{s.profiles?.name||'—'}</div>
                            <div className="text-sm text-muted">{getDayName(s.datum)}, {formatDate(s.datum)}{isFri&&<span style={{fontSize:'0.7rem',background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:'10px',marginLeft:4}}>Freitag</span>}</div>
                            <div className="text-sm" style={{color:'#4a5568'}}>🏗️ {b?.name||'—'}</div>
                            <div className="text-sm" style={{color:'#4a5568'}}>🕐 {s.start_zeit} – {s.end_zeit}</div>
                            {s.notiz&&<div className="text-xs text-muted">📝 {s.notiz}</div>}
                          </div>
                          <span style={{fontSize:'1.3rem',fontWeight:800,color:'#1B52DD'}}>{s.dauer.toFixed(1)}h</span>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                        <button className="btn btn-success" style={{marginBottom:0,padding:'0.6rem'}} onClick={()=>handleFreigabe(s.id,'freigegeben')}>✓ Freigeben</button>
                        <button className="btn btn-danger" style={{marginBottom:0,padding:'0.6rem'}} onClick={()=>handleFreigabe(s.id,'abgelehnt')}>✗ Ablehnen</button>
                      </div>
                    </div>
                  )
                })}
              </>
            )
          }
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
            return (
              <div key={u.id} className="card">
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem'}}>
                  <div className="employee-avatar">{initials(u.name||u.email)}</div>
                  <div>
                    <div className="font-bold" style={{color:'#0A0A44'}}>{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                    {offene>0&&<span style={{fontSize:'0.7rem',background:'#fef3c7',color:'#92400e',padding:'1px 8px',borderRadius:10}}>⏳ {offene} ausstehend</span>}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',textAlign:'center'}}>
                  <div><div className="font-bold text-blue">{myH.toFixed(1)}</div><div style={{fontSize:'0.7rem',color:'#718096'}}>Ges. Std.</div></div>
                  <div><div className={`font-bold ${diff>=0?'text-green':'text-red'}`}>{diff>=0?'+':''}{diff.toFixed(1)}</div><div style={{fontSize:'0.7rem',color:'#718096'}}>{diff>=0?'Plus':'Minus'}</div></div>
                  <div><div className="font-bold" style={{color:'#d69e2e'}}>{(u.urlaub_gesamt||24)-(u.urlaub_genommen||0)}</div><div style={{fontSize:'0.7rem',color:'#718096'}}>Resturlaub</div></div>
                </div>
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
          <div className="form-group"><label>E-Mail *</label><input type="email" value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))} placeholder="max@elektropees.de"/></div>
          <div className="form-group"><label>Passwort *</label><input type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="Mindestens 6 Zeichen"/></div>
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
      <div className="card" style={{background:'#f0f4f8',marginBottom:'0.75rem',padding:'0.75rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#4a5568',fontSize:'0.85rem'}}>Arbeitszeit (inkl. 45 Min Pause):</span>
          <span style={{fontSize:'1.2rem',fontWeight:800,color:'#0A0A44'}}>{dauer.toFixed(2)} Std</span>
        </div>
        <div style={{fontSize:'0.75rem',color:'#718096',marginTop:4}}>✓ Pause ist bezahlt · Freigabe durch Chef erforderlich</div>
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

export default function App() {
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(true); const [page,setPage]=useState('home')
  const [baustellen,setBaustellen]=useState([]); const [stunden,setStunden]=useState([]); const [allUsers,setAllUsers]=useState([])
  const [showStunden,setShowStunden]=useState(false)
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const {data:profile}=await supabase.from('profiles').select('*').eq('id',session.user.id).single(); setUser({...session.user,profile})}
      setLoading(false)
    })
  },[])
  useEffect(()=>{if(user)loadData()},[user])
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
    if(!confirm('Diesen Eintrag wirklich löschen?'))return
    await supabase.from('stunden').delete().eq('id',id)
    await loadData()
  }
  if(loading)return <div className="loading">App wird geladen...</div>
  if(!user)return <LoginPage onLogin={u=>{setUser(u)}}/>
  const isAdmin=user.profile?.role==='admin'
  const ausstehendCount=stunden.filter(s=>s.freigabe_status==='ausstehend').length
  return (
    <div className="app-container">
      <div className="top-bar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/logo.png" alt="Elektro Pees" style={{height:'36px',width:'auto'}} onError={e=>{e.target.outerHTML='<div class="top-logo">EP</div>'}}/>
          <div><div className="top-title">Elektro Pees</div><div className="top-user">{user.profile?.name||user.email}</div></div>
        </div>
        <button className="top-logout" onClick={handleLogout}>Abmelden</button>
      </div>
      {page==='home'&&<HomePage user={user} stunden={stunden} baustellen={baustellen} onStunden={()=>setShowStunden(true)} onDelete={handleDelete}/>}
      {page==='baustellen'&&<BaustellenPage baustellen={baustellen} stunden={stunden} isAdmin={isAdmin} onRefresh={loadData}/>}
      {page==='urlaub'&&<UrlaubPage user={user} isAdmin={isAdmin} allUsers={allUsers}/>}
      {page==='profil'&&<ProfilPage user={user} stunden={stunden} baustellen={baustellen}/>}
      {page==='admin'&&isAdmin&&<AdminPage stunden={stunden} baustellen={baustellen} allUsers={allUsers} onRefresh={loadData}/>}
      {showStunden&&<StundenModal user={user} baustellen={baustellen} onClose={()=>setShowStunden(false)} onSaved={loadData}/>}
      <nav className="bottom-nav">
        <button className={`nav-item ${page==='home'?'active':''}`} onClick={()=>setPage('home')}><IconHome/><span>Start</span></button>
        <button className={`nav-item ${page==='baustellen'?'active':''}`} onClick={()=>setPage('baustellen')}><IconHardHat/><span>Baustellen</span></button>
        <button className={`nav-item ${page==='urlaub'?'active':''}`} onClick={()=>setPage('urlaub')}><IconSun/><span>Urlaub</span></button>
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
