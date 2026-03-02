import { useState, useEffect, useRef } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import {
  Wrench, Plus, X, CheckCircle, Loader, AlertCircle,
  Github, Globe, Zap, Pencil, Trash2, ExternalLink, Code2
} from 'lucide-react'

const RELAYS = ['wss://relay.damus.io','wss://nos.lol','wss://relay.nostr.band','wss://relay.primal.net']

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A', goldDark:'#8B6010',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
  green:'#22c55e', red:'#ef4444',
}

const SKILL_COLORS = {
  bitcoin:'#C9A84C', nostr:'#A78BFA', lightning:'#FCD34D', react:'#61DAFB',
  rust:'#F97316', python:'#3B82F6', typescript:'#60A5FA', design:'#EC4899',
  mobile:'#8B5CF6', web:'#22C55E', devops:'#F59E0B', solidity:'#9CA3AF',
}
const ALL_SKILLS = ['bitcoin','nostr','lightning','react','rust','python','typescript','design','mobile','web','devops','solidity']

const CATEGORIES = ['wallet','relay','client','library','bot','API','other']
const CATEGORY_COLORS = {
  wallet:'#C9A84C', relay:'#A78BFA', client:'#61DAFB', library:'#22C55E',
  bot:'#F97316', API:'#60A5FA', other:'#9CA3AF',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }
const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }
const getSkBytes  = () => { try { const n=localStorage.getItem('satscode_nsec'); if(!n) return null; const {type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch { return null } }
const timeAgo = ts => { const s=Math.floor(Date.now()/1000)-ts; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' }

function parseTool(content) {
  const lines = content.split('\n')
  const data = { name:'', description:'', category:'', stack:[], github:'', url:'', lightning:'' }
  if (lines[0]?.startsWith('TOOL:')) data.name = lines[0].replace('TOOL:','').trim()
  for (const line of lines.slice(1)) {
    const col = line.indexOf(':')
    if (col === -1) continue
    const key = line.slice(0,col).trim().toLowerCase()
    const val = line.slice(col+1).trim()
    if (key==='description') data.description = val
    if (key==='category')    data.category    = val
    if (key==='stack')       data.stack       = val.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    if (key==='github')      data.github      = val
    if (key==='url')         data.url         = val
    if (key==='lightning')   data.lightning   = val
  }
  return data
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel, busy }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onCancel()} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:S.card2, border:'1px solid rgba(239,68,68,0.3)', borderRadius:16, padding:'24px 22px', maxWidth:340, width:'100%' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.2rem', fontWeight:700, color:S.cream, marginBottom:8 }}>Remove Tool?</div>
        <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.creamFaint, marginBottom:20, lineHeight:1.6 }}>
          This will publish a deletion event. The tool will be removed from your portfolio and the registry.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'11px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', color:S.creamFaint }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ flex:1, padding:'11px', borderRadius:9, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', cursor:busy?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:S.red, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {busy ? <Loader size={13} style={{animation:'spin 1s linear infinite'}}/> : <Trash2 size={13}/>} Remove
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Tool Form ─────────────────────────────────────────────────────────────────
function ToolForm({ onClose, onSaved, editEvent=null }) {
  const parsed = editEvent ? parseTool(editEvent.content) : null
  const [name,        setName]        = useState(parsed?.name || '')
  const [description, setDescription] = useState(parsed?.description || '')
  const [category,    setCategory]    = useState(parsed?.category || '')
  const [stack,       setStack]       = useState(parsed?.stack || [])
  const [github,      setGithub]      = useState(parsed?.github || '')
  const [url,         setUrl]         = useState(parsed?.url || '')
  const [lightning,   setLightning]   = useState(parsed?.lightning || '')
  const [status,      setStatus]      = useState('idle')
  const [err,         setErr]         = useState('')
  const isEdit = !!editEvent

  const toggleStack = s => setStack(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s])

  const publish = async () => {
    if (!name.trim() || !description.trim() || !category) { setErr('Name, description and category are required'); return }
    const sk = getSkBytes()
    if (!sk) { setErr('Log in with your private key to submit'); return }
    setStatus('busy'); setErr('')
    try {
      const content = [
        'TOOL: ' + name.trim(),
        'Description: ' + description.trim(),
        'Category: ' + category,
        stack.length ? 'Stack: ' + stack.join(', ') : '',
        github ? 'GitHub: ' + github.trim() : '',
        url    ? 'URL: '    + url.trim()    : '',
        lightning ? 'Lightning: ' + lightning.trim() : '',
      ].filter(Boolean).join('\n')

      const tags = [
        ['t','satscode'], ['t','satscode-tool'], ['t',category.toLowerCase()],
        ...stack.map(s => ['t',s]),
      ]

      if (isEdit) {
        // NIP-09 delete old event
        const del5 = finalizeEvent({ kind:5, created_at:Math.floor(Date.now()/1000), tags:[['e',editEvent.id]], content:'Tool updated' }, sk)
        const del1 = finalizeEvent({ kind:1, created_at:Math.floor(Date.now()/1000), tags:[['e',editEvent.id],['t','deleted'],['t','satscode']], content:'DELETED:'+editEvent.id }, sk)
        await Promise.all([Promise.any(pool().publish(RELAYS, del5)), Promise.any(pool().publish(RELAYS, del1))])
      }

      const event = finalizeEvent({ kind:1, created_at:Math.floor(Date.now()/1000), tags, content }, sk)
      await Promise.any(pool().publish(RELAYS, event))
      setStatus('ok')
      setTimeout(() => { onSaved(event, isEdit ? editEvent.id : null); onClose() }, 700)
    } catch(e) { setErr(e.message||'Publish failed'); setStatus('err') }
  }

  const inputStyle = { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', outline:'none' }
  const labelStyle = { fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:580, background:S.card2, border:`1px solid ${S.borderMid}`, borderRadius:'18px 18px 0 0', padding:'20px 20px 44px', animation:'slideUp .25s ease', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', fontWeight:700, color:S.cream, display:'flex', alignItems:'center', gap:8 }}>
            <Wrench size={18} color={S.gold}/> {isEdit ? 'Edit Tool' : 'Submit a Tool'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:S.creamFaint }}><X size={18}/></button>
        </div>

        {/* Name */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>// tool name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Cashu Wallet, Nostr Relay Monitor..." style={inputStyle}/>
        </div>

        {/* Description */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>// description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
            placeholder="What does it do? Who is it for? What problem does it solve?"
            style={{ ...inputStyle, fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontStyle:'italic', fontWeight:300, resize:'vertical', lineHeight:1.7 }}/>
        </div>

        {/* Category */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>// category</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={()=>setCategory(c)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${category===c?(CATEGORY_COLORS[c]||S.gold)+'80':S.border}`, background:category===c?(CATEGORY_COLORS[c]||S.gold)+'14':'rgba(255,255,255,0.02)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', fontWeight:category===c?700:400, color:category===c?CATEGORY_COLORS[c]||S.gold:S.creamFaint, transition:'all .2s' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Stack */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>// tech stack</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {ALL_SKILLS.map(s => (
              <button key={s} onClick={()=>toggleStack(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${stack.includes(s)?(SKILL_COLORS[s]||S.gold)+'80':S.border}`, background:stack.includes(s)?(SKILL_COLORS[s]||S.gold)+'14':'rgba(255,255,255,0.02)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', fontWeight:600, color:stack.includes(s)?SKILL_COLORS[s]||S.gold:S.creamFaint, transition:'all .2s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* GitHub + URL */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>// github repo</label>
            <div style={{ position:'relative' }}>
              <Github size={13} color='rgba(201,168,76,0.3)' style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
              <input value={github} onChange={e=>setGithub(e.target.value)} placeholder="github.com/user/repo"
                style={{ ...inputStyle, paddingLeft:30 }}/>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>// live url</label>
            <div style={{ position:'relative' }}>
              <Globe size={13} color='rgba(201,168,76,0.3)' style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="yourapp.com"
                style={{ ...inputStyle, paddingLeft:30 }}/>
            </div>
          </div>
        </div>

        {/* Lightning */}
        <div style={{ marginBottom:18 }}>
          <label style={labelStyle}>// lightning address (optional — for donations)</label>
          <div style={{ position:'relative' }}>
            <Zap size={13} color='rgba(201,168,76,0.3)' style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={lightning} onChange={e=>setLightning(e.target.value)} placeholder="you@walletofsatoshi.com"
              style={{ ...inputStyle, paddingLeft:30, color:S.gold }}/>
          </div>
        </div>

        {err && <div style={{ padding:'9px 13px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.red, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13}/>{err}</div>}

        <button onClick={publish} disabled={status==='busy'||status==='ok'} style={{ width:'100%', padding:'13px', borderRadius:10, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', cursor:status==='busy'?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.8rem', letterSpacing:'0.1em', textTransform:'uppercase', color:S.bg, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {status==='busy' ? <><Loader size={15} style={{animation:'spin 1s linear infinite'}}/> {isEdit?'Updating…':'Submitting…'}</>
           : status==='ok'  ? <><CheckCircle size={15}/> {isEdit?'Updated!':'Submitted!'}</>
           : <><Wrench size={15}/> {isEdit?'Update Tool':'Submit Tool'}</>}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} textarea::placeholder,input::placeholder{color:rgba(245,236,215,0.2)!important}`}</style>
    </div>
  )
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ event, onEdit, onDelete }) {
  const tool = parseTool(event.content)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delBusy,    setDelBusy]    = useState(false)

  const handleDelete = async () => {
    const sk = getSkBytes(); if (!sk) return
    setDelBusy(true)
    try {
      const now = Math.floor(Date.now()/1000)
      const del5 = finalizeEvent({ kind:5, created_at:now, tags:[['e',event.id]], content:'Tool deleted' }, sk)
      const del1 = finalizeEvent({ kind:1, created_at:now, tags:[['e',event.id],['t','deleted'],['t','satscode']], content:'DELETED:'+event.id }, sk)
      await Promise.all([Promise.any(pool().publish(RELAYS, del5)), Promise.any(pool().publish(RELAYS, del1))])
      onDelete(event.id)
    } catch(e) { console.error(e) }
    setDelBusy(false)
    setConfirmDel(false)
  }

  return (
    <>
      <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px', marginBottom:12, transition:'border-color .2s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=S.borderMid}
        onMouseLeave={e=>e.currentTarget.style.borderColor=S.border}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.2rem', fontWeight:700, color:S.cream }}>{tool.name}</div>
              {tool.category && (
                <span style={{ padding:'2px 8px', borderRadius:20, background:(CATEGORY_COLORS[tool.category]||S.gold)+'14', border:`1px solid ${(CATEGORY_COLORS[tool.category]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.52rem', fontWeight:700, color:CATEGORY_COLORS[tool.category]||S.gold }}>
                  {tool.category}
                </span>
              )}
            </div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.28)' }}>{timeAgo(event.created_at)}</div>
          </div>
          {/* Edit/Delete */}
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={()=>onEdit(event)} style={{ background:'rgba(201,168,76,0.08)', border:`1px solid ${S.border}`, borderRadius:7, padding:'6px 8px', cursor:'pointer', color:S.gold, display:'flex', alignItems:'center' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,0.16)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(201,168,76,0.08)'}
            ><Pencil size={12}/></button>
            <button onClick={()=>setConfirmDel(true)} style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:7, padding:'6px 8px', cursor:'pointer', color:S.red, display:'flex', alignItems:'center' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.14)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.06)'}
            ><Trash2 size={12}/></button>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'0.95rem', color:S.creamDim, lineHeight:1.7, marginBottom:12 }}>
          {tool.description}
        </div>

        {/* Stack tags */}
        {tool.stack.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
            {tool.stack.map(s => (
              <span key={s} style={{ padding:'3px 8px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'14', border:`1px solid ${(SKILL_COLORS[s]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.52rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Links */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {tool.github && (
            <a href={tool.github.startsWith('http')?tool.github:'https://'+tool.github} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', fontWeight:600, color:S.creamFaint, textDecoration:'none', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.borderMid;e.currentTarget.style.color=S.cream}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.color=S.creamFaint}}
            ><Github size={12}/> GitHub</a>
          )}
          {tool.url && (
            <a href={tool.url.startsWith('http')?tool.url:'https://'+tool.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', fontWeight:600, color:S.creamFaint, textDecoration:'none', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.borderMid;e.currentTarget.style.color=S.cream}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.color=S.creamFaint}}
            ><ExternalLink size={12}/> Live</a>
          )}
          {tool.lightning && (
            <span style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(201,168,76,0.06)', border:`1px solid ${S.border}`, fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:S.gold }}>
              <Zap size={11}/> {tool.lightning}
            </span>
          )}
        </div>
      </div>

      {confirmDel && <DeleteConfirm onConfirm={handleDelete} onCancel={()=>setConfirmDel(false)} busy={delBusy}/>}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SubmitTool({ user }) {
  const [tools,      setTools]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const seenIds = useRef(new Set())
  const myPubkey = getMyPubkey()

  useEffect(() => {
    if (!myPubkey) { setLoading(false); return }
    const deletedIds = new Set()
    const collected  = []

    const delSub = pool().subscribe(RELAYS,
      { kinds:[5], authors:[myPubkey], since:Math.floor(Date.now()/1000)-86400*90, limit:200 },
      {
        onevent(e) { (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).forEach(t=>deletedIds.add(t[1])) },
        oneose() {
          delSub.close()
          const sub = pool().subscribe(RELAYS,
            { kinds:[1], authors:[myPubkey], '#t':['satscode-tool'], limit:100 },
            {
              onevent(e) {
                if (seenIds.current.has(e.id)) return
                if (deletedIds.has(e.id)) return
                if (!e.content.startsWith('TOOL:')) return
                seenIds.current.add(e.id)
                collected.push(e)
                collected.sort((a,b) => b.created_at - a.created_at)
                setTools([...collected])
              },
              oneose() { sub.close(); setLoading(false) }
            }
          )
          setTimeout(() => { setLoading(false) }, 8000)
        }
      }
    )

    // Live kind:5 deletion watcher
    const liveDel = pool().subscribe(RELAYS,
      { kinds:[5], authors:[myPubkey], since:Math.floor(Date.now()/1000) },
      {
        onevent(e) {
          const ids = (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).map(t=>t[1])
          if (ids.length) {
            setTools(prev => prev.filter(t => !ids.includes(t.id)))
            ids.forEach(id => seenIds.current.delete(id))
          }
        },
        oneose() {}
      }
    )

    return () => { try{delSub.close()}catch{}; try{liveDel.close()}catch{} }
  }, [myPubkey])

  const handleSaved = (event, replacedId) => {
    seenIds.current.add(event.id)
    setTools(prev => {
      const without = replacedId ? prev.filter(e=>e.id!==replacedId) : prev
      return [event, ...without]
    })
  }

  const handleDeleted = (id) => {
    setTools(prev => prev.filter(e => e.id !== id))
    seenIds.current.delete(id)
  }

  const isLoggedIn = !!myPubkey

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px 120px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} textarea::placeholder,input::placeholder{color:rgba(245,236,215,0.2)!important}`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.8rem', fontWeight:700, color:S.cream, margin:0, marginBottom:4 }}>
            Your <span style={{ color:S.gold, fontStyle:'italic' }}>Portfolio</span>
          </h1>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.3)', letterSpacing:'0.1em' }}>// ship it · show it · own it</div>
        </div>
        {isLoggedIn && (
          <button onClick={()=>setShowForm(true)} style={{ display:'flex', alignItems:'center', gap:6, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:S.bg, letterSpacing:'0.08em' }}>
            <Plus size={14}/> Submit Tool
          </button>
        )}
      </div>

      {/* Not logged in */}
      {!isLoggedIn && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Code2 size={36} color={S.goldDark} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', color:S.creamDim, marginBottom:8 }}>Log in to submit tools</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:'rgba(201,168,76,0.3)' }}>// your portfolio lives on Nostr</div>
        </div>
      )}

      {/* Loading */}
      {isLoggedIn && loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Loader size={22} color={S.gold} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 12px' }}/>
          <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', color:S.creamFaint }}>Loading your tools…</div>
        </div>
      )}

      {/* Empty */}
      {isLoggedIn && !loading && tools.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Wrench size={36} color={S.goldDark} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', color:S.creamDim, marginBottom:8 }}>No tools submitted yet</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:'rgba(201,168,76,0.3)', marginBottom:20 }}>// submit your first tool to start your portfolio</div>
          <button onClick={()=>setShowForm(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:10, padding:'11px 20px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.75rem', color:S.bg }}>
            <Plus size={14}/> Submit Your First Tool
          </button>
        </div>
      )}

      {/* Tools list */}
      <div style={{ animation:'fadeUp .3s ease' }}>
        {tools.map(e => (
          <ToolCard key={e.id} event={e}
            onEdit={ev => setEditTarget(ev)}
            onDelete={handleDeleted}
          />
        ))}
      </div>

      {/* Form modal */}
      {(showForm || editTarget) && (
        <ToolForm
          editEvent={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

