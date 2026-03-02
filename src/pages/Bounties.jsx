import { useState, useEffect, useRef } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import {
  Plus, X, Zap, Clock, CheckCircle, Loader,
  MessageCircle, Users, Trophy, Send, AlertCircle,
  Pencil, Trash2
} from 'lucide-react'
import BuilderProfile from './BuilderProfile'
import { feedCache } from './Feed'
import MessagesPage from './MessagesPage'

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

// ── Helpers ───────────────────────────────────────────────────────────────────
let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }
const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }
const getSkBytes  = () => { try { const n=localStorage.getItem('satscode_nsec'); if(!n) return null; const {type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch { return null } }

const timeAgo = ts => {
  const s = Math.floor(Date.now()/1000) - ts
  if (s < 3600)  return Math.floor(s/60)+'m ago'
  if (s < 86400) return Math.floor(s/3600)+'h ago'
  return Math.floor(s/86400)+'d ago'
}

const daysLeft = deadline => {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000)
  return diff
}

function parseBounty(content) {
  const lines = content.split('\n')
  const data = { title:'', description:'', reward:'', skills:[], deadline:'', contact:'DM' }
  if (lines[0]?.startsWith('BOUNTY:')) data.title = lines[0].replace('BOUNTY:','').trim()
  for (const line of lines.slice(1)) {
    const col = line.indexOf(':')
    if (col === -1) continue
    const key = line.slice(0,col).trim().toLowerCase()
    const val = line.slice(col+1).trim()
    if (key==='description') data.description = val
    if (key==='reward')      data.reward = val.replace(/\D/g,'')
    if (key==='skills')      data.skills = val.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    if (key==='deadline')    data.deadline = val
    if (key==='contact')     data.contact = val
  }
  return data
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ profile={}, pubkey='', size=36 }) {
  const [err, setErr] = useState(false)
  const letter = (profile.name||profile.display_name||pubkey||'?')[0].toUpperCase()
  if (profile.picture && !err) return (
    <img src={profile.picture} alt={letter} onError={()=>setErr(true)}
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:'1.5px solid rgba(201,168,76,0.3)', flexShrink:0 }} />
  )
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'1.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:size*0.38, fontWeight:600, color:S.gold, flexShrink:0 }}>
      {letter}
    </div>
  )
}

// ── Post / Edit Bounty Modal ──────────────────────────────────────────────────
function BountyFormModal({ user, onClose, onPosted, editEvent=null }) {
  const parsed = editEvent ? parseBounty(editEvent.content) : null
  const [title,       setTitle]       = useState(parsed?.title || '')
  const [description, setDescription] = useState(parsed?.description || '')
  const [reward,      setReward]      = useState(parsed?.reward || '')
  const [skills,      setSkills]      = useState(parsed?.skills || [])
  const [deadline,    setDeadline]    = useState(parsed?.deadline || '')
  const [contact,     setContact]     = useState(parsed?.contact || 'DM')
  const [status,      setStatus]      = useState('idle')
  const [err,         setErr]         = useState('')
  const isEdit = !!editEvent

  const toggleSkill = s => setSkills(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s])

  const publish = async () => {
    if (!title.trim() || !description.trim() || !reward.trim()) { setErr('Title, description and reward are required'); return }
    const sk = getSkBytes()
    if (!sk) { setErr('Log in with your private key'); return }
    setStatus('busy'); setErr('')
    try {
      const content = [
        'BOUNTY: ' + title.trim(),
        'Description: ' + description.trim(),
        'Reward: ' + reward.trim() + ' sats',
        skills.length ? 'Skills: ' + skills.join(', ') : '',
        deadline ? 'Deadline: ' + deadline : '',
        'Contact: ' + contact,
      ].filter(Boolean).join('\n')

      const tags = [
        ['t','bounty'],['t','satscode'],
        ...skills.map(s=>['t',s]),
      ]

      // If editing: first delete old event (NIP-09), then publish new
      if (isEdit) {
        const delEvent = finalizeEvent({
          kind: 5,
          created_at: Math.floor(Date.now()/1000),
          tags: [['e', editEvent.id]],
          content: 'Bounty updated',
        }, sk)
        await Promise.any(pool().publish(RELAYS, delEvent))
      }

      const event = finalizeEvent({ kind:1, created_at:Math.floor(Date.now()/1000), tags, content }, sk)
      await Promise.any(pool().publish(RELAYS, event))
      setStatus('ok')
      setTimeout(() => { onPosted(event, isEdit ? editEvent.id : null); onClose() }, 700)
    } catch(e) { setErr(e.message||'Publish failed'); setStatus('err') }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:560, background:S.card2, border:`1px solid ${S.borderMid}`, borderRadius:'18px 18px 0 0', padding:'20px 20px 44px', animation:'slideUp .25s ease', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', fontWeight:700, color:S.cream, display:'flex', alignItems:'center', gap:8 }}>
            <Trophy size={18} color={S.gold}/> {isEdit ? 'Edit Bounty' : 'Post a Bounty'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:S.creamFaint }}><X size={18}/></button>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>// title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Build a Nostr relay monitor..."
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', outline:'none' }} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>// description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} placeholder="Describe what needs to be built, requirements, deliverables..."
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontStyle:'italic', fontWeight:300, outline:'none', resize:'vertical', lineHeight:1.7 }} />
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>// reward (sats)</label>
            <input type="number" value={reward} onChange={e=>setReward(e.target.value)} placeholder="21000"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'10px 13px', color:S.gold, fontFamily:'JetBrains Mono,monospace', fontSize:'0.82rem', fontWeight:700, outline:'none' }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>// deadline</label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'Montserrat,sans-serif', fontSize:'0.78rem', outline:'none', colorScheme:'dark' }} />
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>// how should applicants contact you?</label>
          <div style={{ display:'flex', gap:8 }}>
            {['DM','Nostr Reply'].map(c => (
              <button key={c} onClick={()=>setContact(c)} style={{ flex:1, padding:'9px 8px', borderRadius:8, border:`1px solid ${contact===c?S.borderMid:S.border}`, background:contact===c?'rgba(201,168,76,0.12)':'rgba(255,255,255,0.02)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', fontWeight:contact===c?700:400, color:contact===c?S.gold:S.creamFaint, transition:'all .2s' }}>
                {c==='DM'?'⚡ DM (encrypted)':'💬 Nostr Reply'}
              </button>
            ))}
          </div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.25)', marginTop:6 }}>
            {contact==='DM' ? '// applicants will DM you privately via NIP-04' : '// applicants will reply publicly to your bounty post'}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <label style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em', display:'block', marginBottom:8 }}>// skills needed</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {ALL_SKILLS.map(s => (
              <button key={s} onClick={()=>toggleSkill(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${skills.includes(s)?(SKILL_COLORS[s]||S.gold)+'80':S.border}`, background:skills.includes(s)?(SKILL_COLORS[s]||S.gold)+'14':'rgba(255,255,255,0.02)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', fontWeight:600, color:skills.includes(s)?SKILL_COLORS[s]||S.gold:S.creamFaint, transition:'all .2s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {err && <div style={{ padding:'9px 13px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.red, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13}/>{err}</div>}

        <button onClick={publish} disabled={status==='busy'||status==='ok'} style={{ width:'100%', padding:'13px', borderRadius:10, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', cursor:status==='busy'?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.8rem', letterSpacing:'0.1em', textTransform:'uppercase', color:S.bg, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {status==='busy' ? <><Loader size={15} style={{animation:'spin 1s linear infinite'}}/> {isEdit?'Updating…':'Posting…'}</>
           : status==='ok'  ? <><CheckCircle size={15}/> {isEdit?'Updated!':'Posted!'}</>
           : <><Trophy size={15}/> {isEdit?'Update Bounty':'Post Bounty'}</>}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel, busy }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onCancel()} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:S.card2, border:`1px solid rgba(239,68,68,0.3)`, borderRadius:16, padding:'24px 22px', maxWidth:340, width:'100%' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.2rem', fontWeight:700, color:S.cream, marginBottom:8 }}>Delete Bounty?</div>
        <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.creamFaint, marginBottom:20, lineHeight:1.6 }}>
          This publishes a NIP-09 deletion event. The bounty will be removed from relays that honour deletion requests.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'11px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', color:S.creamFaint }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ flex:1, padding:'11px', borderRadius:9, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', cursor:busy?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:S.red, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {busy ? <Loader size={13} style={{animation:'spin 1s linear infinite'}}/> : <Trash2 size={13}/>} Delete
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Applicants Modal ──────────────────────────────────────────────────────────
function ApplicantsModal({ bountyEvent, bountyTitle, profiles, onClose, onAccept, user }) {
  const [claims,      setClaims]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewProfile, setViewProfile] = useState(null)
  const [accepting,   setAccepting]   = useState(null)
  const myPubkey   = getMyPubkey()
  const isMyBounty = bountyEvent.pubkey === myPubkey

  useEffect(() => {
    const seen = new Set()
    const collected = []
    const sub = pool().subscribe(RELAYS,
      { kinds:[1], '#e':[bountyEvent.id], '#t':['bounty-claim'], limit:100 },
      {
        onevent(e) { if (seen.has(e.id)) return; seen.add(e.id); collected.push(e); setClaims([...collected].sort((a,b)=>a.created_at-b.created_at)) },
        oneose() { sub.close(); setLoading(false) }
      }
    )
    setTimeout(()=>{ try{sub.close()}catch{}; setLoading(false) }, 8000)
    return ()=>{ try{sub.close()}catch{} }
  }, [bountyEvent.id])

  const handleAccept = async (claimEvent) => {
    const sk = getSkBytes(); if (!sk) return
    setAccepting(claimEvent.pubkey)
    try {
      const event = finalizeEvent({
        kind:1, created_at:Math.floor(Date.now()/1000),
        tags:[['e',bountyEvent.id,RELAYS[0],'reply'],['p',claimEvent.pubkey],['t','bounty-accepted'],['t','satscode']],
        content:`BOUNTY_ACCEPTED: ${claimEvent.pubkey}\nBounty: ${bountyTitle}\nCongrats! You've been selected.`,
      }, sk)
      await Promise.any(pool().publish(RELAYS, event))
      onAccept(bountyEvent.id, claimEvent.pubkey)
      onClose()
    } catch(e) { console.error(e) }
    setAccepting(null)
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:520, background:S.card2, border:`1px solid ${S.borderMid}`, borderRadius:'18px 18px 0 0', padding:'20px 20px 44px', maxHeight:'80vh', overflowY:'auto', animation:'slideUp .25s ease' }}>
        <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontWeight:700, color:S.cream, display:'flex', alignItems:'center', gap:8 }}><Users size={16} color={S.gold}/> Applicants</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:S.creamFaint }}><X size={16}/></button>
        </div>

        {loading && <div style={{ textAlign:'center', padding:'30px 0' }}><Loader size={18} color={S.gold} style={{animation:'spin 1s linear infinite', display:'block', margin:'0 auto 10px'}}/><div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.creamFaint }}>Loading…</div></div>}
        {!loading && claims.length===0 && <div style={{ textAlign:'center', padding:'30px 0', fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontStyle:'italic', fontWeight:300, color:S.creamFaint }}>No applicants yet</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {claims.map(claim => {
            const prof = profiles[claim.pubkey] || {}
            const npub = (() => { try { return nip19.npubEncode(claim.pubkey) } catch { return '' } })()
            const name = prof.name || prof.display_name || npub.slice(0,12)+'…'
            return (
              <div key={claim.id} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'14px', display:'flex', alignItems:'center', gap:12 }}>
                <div onClick={()=>setViewProfile({ npub, profile:prof })} style={{ cursor:'pointer', flexShrink:0 }}>
                  <Avatar profile={prof} pubkey={claim.pubkey} size={44}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div onClick={()=>setViewProfile({ npub, profile:prof })} style={{ cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.78rem', fontWeight:600, color:S.cream, marginBottom:3 }}>{name}</div>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'0.88rem', fontStyle:'italic', fontWeight:300, color:S.creamFaint, lineHeight:1.5 }}>
                    {claim.content.slice(0,130)}{claim.content.length>130?'…':''}
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.28)', marginTop:4 }}>{timeAgo(claim.created_at)}</div>
                </div>
                {isMyBounty && (
                  <button onClick={()=>handleAccept(claim)} disabled={!!accepting} style={{ flexShrink:0, padding:'8px 12px', borderRadius:9, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', cursor:accepting?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.65rem', color:S.bg, display:'flex', alignItems:'center', gap:5, opacity:accepting&&accepting!==claim.pubkey?0.4:1 }}>
                    {accepting===claim.pubkey ? <Loader size={12} style={{animation:'spin 1s linear infinite'}}/> : <CheckCircle size={12}/>} Accept
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {viewProfile && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'#0D0B06' }}>
          <BuilderProfile npub={viewProfile.npub} initialProfile={viewProfile.profile} onClose={()=>setViewProfile(null)} user={user}/>
        </div>
      )}
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Claim Modal ───────────────────────────────────────────────────────────────
function ClaimModal({ bountyEvent, bountyTitle, onClose }) {
  const [pitch,  setPitch]  = useState('')
  const [status, setStatus] = useState('idle')
  const [err,    setErr]    = useState('')

  const submit = async () => {
    const sk = getSkBytes(); if (!sk) { setErr('Log in with your private key'); return }
    if (!pitch.trim()) { setErr('Add a short pitch — why are you the right person?'); return }
    setStatus('busy'); setErr('')
    try {
      const event = finalizeEvent({
        kind:1, created_at:Math.floor(Date.now()/1000),
        tags:[['e',bountyEvent.id,RELAYS[0],'reply'],['p',bountyEvent.pubkey],['t','bounty-claim'],['t','satscode']],
        content:`I want to claim this bounty: ${bountyTitle}\n\n${pitch.trim()}`,
      }, getSkBytes())
      await Promise.any(pool().publish(RELAYS, event))
      setStatus('ok')
      setTimeout(onClose, 1000)
    } catch(e) { setErr(e.message||'Failed'); setStatus('err') }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:520, background:S.card2, border:`1px solid ${S.borderMid}`, borderRadius:'18px 18px 0 0', padding:'20px 20px 44px', animation:'slideUp .25s ease' }}>
        <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Send size={16} color={S.gold}/>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontWeight:700, color:S.cream }}>Apply to Claim</div>
        </div>
        <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.creamFaint, marginBottom:14 }}>
          Pitching for: <span style={{ color:S.cream, fontWeight:600 }}>{bountyTitle}</span>
        </div>
        <textarea value={pitch} onChange={e=>setPitch(e.target.value)} rows={5}
          placeholder="I can build this because… My relevant experience includes… Here's similar work I've done…"
          style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:`1px solid ${S.border}`, borderRadius:9, padding:'12px 13px', color:S.cream, fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontStyle:'italic', fontWeight:300, outline:'none', resize:'vertical', lineHeight:1.7, marginBottom:12 }}/>
        {err && <div style={{ padding:'9px 13px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.red, marginBottom:12 }}>{err}</div>}
        <button onClick={submit} disabled={status==='busy'||status==='ok'} style={{ width:'100%', padding:'13px', borderRadius:10, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.78rem', letterSpacing:'0.1em', textTransform:'uppercase', color:S.bg, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {status==='busy'?<><Loader size={14} style={{animation:'spin 1s linear infinite'}}/> Sending…</>:status==='ok'?<><CheckCircle size={14}/> Sent!</>:<><Send size={14}/> Send Application</>}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Bounty Card ───────────────────────────────────────────────────────────────
function BountyCard({ event, profiles, acceptedMap, deletedIds, onClaim, onViewApplicants, onEdit, onDelete, user }) {
  const parsed     = parseBounty(event.content)
  const profile    = profiles[event.pubkey] || {}
  const npub       = (() => { try { return nip19.npubEncode(event.pubkey) } catch { return '' } })()
  const name       = profile.name || profile.display_name || npub.slice(0,12)+'…'
  const days       = daysLeft(parsed.deadline)
  const isExpired  = days !== null && days <= 0
  const isAccepted = !!acceptedMap[event.id]
  const myPubkey   = getMyPubkey()
  const isMyBounty = event.pubkey === myPubkey
  const [expanded,    setExpanded]    = useState(false)
  const [viewPoster,  setViewPoster]  = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [delBusy,     setDelBusy]     = useState(false)

  const handleDelete = async () => {
    const sk = getSkBytes(); if (!sk) return
    setDelBusy(true)
    try {
      const now = Math.floor(Date.now()/1000)
      // kind:5 — NIP-09 deletion request to relays
      const kind5 = finalizeEvent({
        kind: 5, created_at: now,
        tags: [['e', event.id]],
        content: 'Bounty deleted',
      }, sk)
      // kind:1 — deletion marker that live Feed subscription catches immediately
      const kind1 = finalizeEvent({
        kind: 1, created_at: now,
        tags: [['e', event.id], ['t', 'deleted'], ['t', 'satscode']],
        content: 'DELETED:' + event.id,
      }, sk)
      await Promise.all([
        Promise.any(pool().publish(RELAYS, kind5)),
        Promise.any(pool().publish(RELAYS, kind1)),
      ])
      onDelete(event.id)
    } catch(e) { console.error(e) }
    setDelBusy(false)
    setConfirmDel(false)
  }

  const borderColor = isAccepted ? 'rgba(34,197,94,0.25)' : isExpired ? 'rgba(201,168,76,0.06)' : S.border

  return (
    <>
      <div style={{ background:S.card, border:`1px solid ${borderColor}`, borderRadius:14, padding:'16px', marginBottom:12, opacity:isExpired&&!isAccepted?0.65:1, transition:'border-color .2s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=isAccepted?'rgba(34,197,94,0.4)':isExpired?'rgba(201,168,76,0.12)':S.borderMid}
        onMouseLeave={e=>e.currentTarget.style.borderColor=borderColor}
      >
        {/* Status badges */}
        <div style={{ display:'flex', gap:8, marginBottom:isAccepted||isExpired?10:0 }}>
          {isAccepted && <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.15em', color:S.green }}><CheckCircle size={11}/> CLAIMED</div>}
          {isExpired && !isAccepted && <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.15em', color:'rgba(201,168,76,0.4)' }}><Clock size={11}/> EXPIRED</div>}
        </div>

        {/* Header row */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
          <div onClick={()=>setViewPoster(true)} style={{ cursor:'pointer' }}>
            <Avatar profile={profile} pubkey={event.pubkey} size={40}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', fontWeight:700, color:S.cream, marginBottom:2 }}>{parsed.title || 'Bounty'}</div>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', color:S.creamFaint }}>{name} · {timeAgo(event.created_at)}</div>
          </div>
          {/* Reward */}
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.9rem', fontWeight:700, color:S.gold }}>{parseInt(parsed.reward||'0').toLocaleString()}</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.45rem', color:'rgba(201,168,76,0.4)' }}>sats</div>
          </div>
          {/* Edit/Delete — only for my bounties */}
          {isMyBounty && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <button onClick={()=>onEdit(event)} style={{ background:'rgba(201,168,76,0.08)', border:`1px solid ${S.border}`, borderRadius:7, padding:'5px 8px', cursor:'pointer', color:S.gold, display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,0.16)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(201,168,76,0.08)'}
              ><Pencil size={12}/></button>
              <button onClick={()=>setConfirmDel(true)} style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:7, padding:'5px 8px', cursor:'pointer', color:S.red, display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.14)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.06)'}
              ><Trash2 size={12}/></button>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'0.95rem', color:S.creamDim, lineHeight:1.7, marginBottom:12 }}>
          {expanded ? parsed.description : parsed.description.slice(0,160)+(parsed.description.length>160?'…':'')}
          {parsed.description.length>160 && (
            <button onClick={()=>setExpanded(!expanded)} style={{ background:'none', border:'none', cursor:'pointer', color:S.gold, fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', marginLeft:6 }}>
              {expanded?'less':'more'}
            </button>
          )}
        </div>

        {/* Skills + Deadline */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12, alignItems:'center' }}>
          {parsed.skills.map(s=>(
            <span key={s} style={{ padding:'3px 9px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'14', border:`1px solid ${(SKILL_COLORS[s]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.55rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold }}>
              {s}
            </span>
          ))}
          {days !== null && (
            <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:isExpired?'rgba(201,168,76,0.3)':days<3?S.red:days<7?S.gold:'rgba(201,168,76,0.45)' }}>
              <Clock size={10}/> {isExpired?'Expired':`${days}d left`}
            </span>
          )}
        </div>

        {/* Contact hint */}
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.25)', marginBottom:10 }}>
          // contact via {parsed.contact}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, borderTop:`1px solid ${S.border}`, paddingTop:12 }}>
          {!isAccepted && !isMyBounty && !isExpired && (
            <button onClick={()=>onClaim(event, parsed.title)} style={{ flex:1, padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.7rem', color:S.bg, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Send size={13}/> Apply to Claim
            </button>
          )}
          <button onClick={()=>onViewApplicants(event, parsed.title)} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(201,168,76,0.06)', border:`1px solid ${S.border}`, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:600, fontSize:'0.7rem', color:S.creamDim, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=S.borderMid;e.currentTarget.style.color=S.cream}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.color=S.creamDim}}
          >
            <Users size={13}/> {isMyBounty?'View Applicants':'See Applicants'}
          </button>
        </div>
      </div>

      {viewPoster && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'#0D0B06' }}>
          <BuilderProfile npub={npub} initialProfile={profile} onClose={()=>setViewPoster(false)} user={user}/>
        </div>
      )}
      {confirmDel && <DeleteConfirm onConfirm={handleDelete} onCancel={()=>setConfirmDel(false)} busy={delBusy}/>}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Bounties({ user }) {
  const [bounties,        setBounties]        = useState([])
  const [profiles,        setProfiles]        = useState({})
  const [loading,         setLoading]         = useState(true)
  const [acceptedMap,     setAcceptedMap]     = useState({})
  const [deletedIds,      setDeletedIds]      = useState(new Set())
  const [showPost,        setShowPost]        = useState(false)
  const [editTarget,      setEditTarget]      = useState(null)
  const [claimTarget,     setClaimTarget]     = useState(null)
  const [applicantTarget, setApplicantTarget] = useState(null)
  const [filterSkill,     setFilterSkill]     = useState('all')
  const seenIds = useRef(new Set())

  const fetchProfiles = (pubkeys) => {
    const missing = pubkeys.filter(pk => !profiles[pk])
    if (!missing.length) return
    const sub = pool().subscribe(RELAYS, { kinds:[0], authors:missing, limit:missing.length }, {
      onevent(e) { try { const p=JSON.parse(e.content); setProfiles(prev=>({...prev,[e.pubkey]:p})) } catch {} },
      oneose() { sub.close() }
    })
  }

  const fetchAccepted = (ids) => {
    if (!ids.length) return
    const sub = pool().subscribe(RELAYS, { kinds:[1], '#e':ids, '#t':['bounty-accepted'], limit:200 }, {
      onevent(e) {
        const eTags = (e.tags||[]).filter(t=>t[0]==='e').map(t=>t[1])
        const pTag  = (e.tags||[]).find(t=>t[0]==='p')
        if (pTag) eTags.forEach(bid=>setAcceptedMap(prev=>({...prev,[bid]:pTag[1]})))
      },
      oneose() { sub.close() }
    })
  }

  useEffect(() => {
    const collected = []
    const deletedSet = new Set() // kind:5 referenced event IDs

    const resort = (arr) => arr.sort((a,b) => {
      const pa = parseBounty(a.content); const pb = parseBounty(b.content)
      const expA = pa.deadline && new Date(pa.deadline) < new Date()
      const expB = pb.deadline && new Date(pb.deadline) < new Date()
      if (expA && !expB) return 1
      if (!expA && expB) return -1
      return b.created_at - a.created_at
    })

    const applyAndSet = () => {
      const visible = collected.filter(e => !deletedSet.has(e.id))
      resort(visible)
      setBounties([...visible])
    }

    // Fetch kind:5 deletions first, then kind:1 bounties
    const delSub = pool().subscribe(RELAYS,
      { kinds:[5], since:Math.floor(Date.now()/1000)-86400*30, limit:200 },
      {
        onevent(e) {
          // collect all event IDs this deletion references
          ;(e.tags||[]).filter(t=>t[0]==='e'&&t[1]).forEach(t=>deletedSet.add(t[1]))
        },
        oneose() {
          delSub.close()
          // Now fetch bounties
          const sub = pool().subscribe(RELAYS,
            { kinds:[1], '#t':['bounty'], since:Math.floor(Date.now()/1000)-86400*30, limit:50 },
            {
              onevent(e) {
                if (seenIds.current.has(e.id)) return
                if (!e.content.startsWith('BOUNTY:')) return
                if (deletedSet.has(e.id)) return  // ← filtered by kind:5
                seenIds.current.add(e.id)
                collected.push(e)
                applyAndSet()
                fetchProfiles([e.pubkey])
              },
              oneose() {
                sub.close()
                setLoading(false)
                if (collected.length) fetchAccepted(collected.map(e=>e.id))
              }
            }
          )
          setTimeout(()=>{ try{sub.close()}catch{}; setLoading(false) }, 10000)
        }
      }
    )
    setTimeout(()=>{ try{delSub.close()}catch{}; setLoading(false) }, 12000)
    return ()=>{ try{delSub.close()}catch{} }
  }, [])

  // ── Live kind:5 deletion subscription ──────────────────────────────────────
  useEffect(() => {
    const sub = pool().subscribe(RELAYS,
      { kinds: [5], since: Math.floor(Date.now()/1000) },
      {
        onevent(e) {
          const ids = (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).map(t=>t[1])
          if (!ids.length) return
          setBounties(prev => prev.filter(b => !ids.includes(b.id)))
          ids.forEach(id => seenIds.current.delete(id))
        },
        oneose() {}
      }
    )
    return () => { try { sub.close() } catch {} }
  }, [])

  const handlePosted = (event, replacedId) => {
    seenIds.current.add(event.id)
    setBounties(prev => {
      const without = replacedId ? prev.filter(e=>e.id!==replacedId) : prev
      return [event, ...without]
    })
  }

  const handleDeleted = (id) => {
    setDeletedIds(prev => new Set([...prev, id]))
    setBounties(prev => prev.filter(e => e.id !== id))
    // Immediately purge from Feed's shared cache so it disappears without refresh
    try {
      Object.values(feedCache).forEach(cache => {
        cache.posts = cache.posts.filter(p => p.id !== id)
        cache.seenIds.delete(id)
      })
    } catch {}
  }

  const visible = bounties
    .filter(e => !deletedIds.has(e.id))
    .filter(e => filterSkill==='all' || parseBounty(e.content).skills.includes(filterSkill))

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px 120px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} textarea::placeholder,input::placeholder{color:rgba(245,236,215,0.2)!important}`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.8rem', fontWeight:700, color:S.cream, margin:0, marginBottom:4 }}>Guild <span style={{ color:S.gold, fontStyle:'italic' }}>Bounties</span></h1>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.3)', letterSpacing:'0.1em' }}>// build · earn · repeat</div>
        </div>
        <button onClick={()=>setShowPost(true)} style={{ display:'flex', alignItems:'center', gap:6, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:S.bg, letterSpacing:'0.08em' }}>
          <Plus size={14}/> Post Bounty
        </button>
      </div>

      {/* Skill filter */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:18 }}>
        {['all',...ALL_SKILLS].map(s=>(
          <button key={s} onClick={()=>setFilterSkill(s)} style={{ padding:'6px 13px', borderRadius:20, border:`1px solid ${filterSkill===s?(SKILL_COLORS[s]||S.gold):S.border}`, background:filterSkill===s?(SKILL_COLORS[s]||S.gold)+'18':'rgba(255,255,255,0.02)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', fontWeight:filterSkill===s?700:400, color:filterSkill===s?SKILL_COLORS[s]||S.gold:S.creamFaint, whiteSpace:'nowrap', transition:'all .2s', flexShrink:0 }}>
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div style={{ textAlign:'center', padding:'60px 0' }}><Loader size={22} color={S.gold} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 12px' }}/><div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', color:S.creamFaint }}>Fetching bounties…</div></div>}

      {/* Empty */}
      {!loading && visible.length===0 && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Trophy size={36} color={S.goldDark} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', color:S.creamDim, marginBottom:8 }}>No bounties yet</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:'rgba(201,168,76,0.3)' }}>// be the first — post a bounty</div>
        </div>
      )}

      <div style={{ animation:'fadeUp .3s ease' }}>
        {visible.map(e=>(
          <BountyCard key={e.id} event={e} profiles={profiles} acceptedMap={acceptedMap} deletedIds={deletedIds} user={user}
            onClaim={(ev,t)=>setClaimTarget({event:ev,title:t})}
            onViewApplicants={(ev,t)=>setApplicantTarget({event:ev,title:t})}
            onEdit={(ev)=>setEditTarget(ev)}
            onDelete={handleDeleted}
          />
        ))}
      </div>

      {(showPost || editTarget) && (
        <BountyFormModal
          user={user}
          editEvent={editTarget}
          onClose={()=>{ setShowPost(false); setEditTarget(null) }}
          onPosted={handlePosted}
        />
      )}
      {claimTarget && <ClaimModal bountyEvent={claimTarget.event} bountyTitle={claimTarget.title} onClose={()=>setClaimTarget(null)}/>}
      {applicantTarget && <ApplicantsModal bountyEvent={applicantTarget.event} bountyTitle={applicantTarget.title} profiles={profiles} onClose={()=>setApplicantTarget(null)} onAccept={(id,pk)=>setAcceptedMap(prev=>({...prev,[id]:pk}))} user={user}/>}
    </div>
  )
}

