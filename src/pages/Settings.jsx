import { useState, useEffect } from 'react'
import { nip19 } from 'nostr-tools'
import {
  Github, Radio, User, Bell, Copy, CheckCircle,
  Eye, EyeOff, LogOut, Save, Plus, X, AlertCircle
} from 'lucide-react'

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A', goldDark:'#8B6010',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
  green:'#22c55e', red:'#ef4444',
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
]

const STORAGE = {
  githubToken: 'satscode_github_token',
  relays:      'satscode_relays',
  notifs:      'satscode_notifs',
}

const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ background:S.card, border:'1px solid '+S.border, borderRadius:14, overflow:'hidden', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'1px solid '+S.border }}>
        <Icon size={15} color={S.gold} />
        <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:S.cream }}>
          {title}
        </span>
      </div>
      <div style={{ padding:'16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

function Toast({ msg, ok }) {
  return (
    <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', zIndex:500, background:ok?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)', border:'1px solid '+(ok?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'), borderRadius:10, padding:'10px 18px', display:'flex', alignItems:'center', gap:8, fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', fontWeight:600, color:ok?S.green:S.red, whiteSpace:'nowrap', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', animation:'fadeUp .2s ease' }}>
      {ok ? <CheckCircle size={14}/> : <AlertCircle size={14}/>} {msg}
    </div>
  )
}

export default function Settings({ user, onLogout }) {
  // ── GitHub token ────────────────────────────────────────────────────────────
  const [githubToken,     setGithubToken]     = useState(() => load(STORAGE.githubToken, ''))
  const [showToken,       setShowToken]        = useState(false)
  const [tokenSaved,      setTokenSaved]       = useState(false)

  // ── Relays ──────────────────────────────────────────────────────────────────
  const [relays,          setRelays]           = useState(() => load(STORAGE.relays, DEFAULT_RELAYS))
  const [newRelay,        setNewRelay]         = useState('')
  const [relaysSaved,     setRelaysSaved]      = useState(false)

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifs,          setNotifs]           = useState(() => load(STORAGE.notifs, { zaps: true, dms: true, follows: true }))

  // ── Account ─────────────────────────────────────────────────────────────────
  const [copied,          setCopied]           = useState(false)
  const [toast,           setToast]            = useState(null)

  const npub = user?.npub || ''
  const shortNpub = npub ? npub.slice(0,14) + '...' + npub.slice(-6) : '—'

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2200) }

  // ── Save GitHub token ────────────────────────────────────────────────────────
  const saveToken = () => {
    save(STORAGE.githubToken, githubToken.trim())
    setTokenSaved(true)
    setTimeout(() => setTokenSaved(false), 2000)
    flash('GitHub token saved')
  }

  // ── Save relays ──────────────────────────────────────────────────────────────
  const addRelay = () => {
    const r = newRelay.trim()
    if (!r) return
    const url = r.startsWith('wss://') || r.startsWith('ws://') ? r : 'wss://' + r
    if (relays.includes(url)) { flash('Relay already added', false); return }
    setRelays(prev => [...prev, url])
    setNewRelay('')
  }

  const removeRelay = (url) => setRelays(prev => prev.filter(r => r !== url))

  const saveRelays = () => {
    save(STORAGE.relays, relays)
    setRelaysSaved(true)
    setTimeout(() => setRelaysSaved(false), 2000)
    flash('Relays saved — restart to apply')
  }

  const resetRelays = () => { setRelays(DEFAULT_RELAYS); flash('Relays reset to defaults') }

  // ── Save notif prefs ─────────────────────────────────────────────────────────
  const toggleNotif = (key) => {
    const updated = { ...notifs, [key]: !notifs[key] }
    setNotifs(updated)
    save(STORAGE.notifs, updated)
  }

  // ── Copy npub ────────────────────────────────────────────────────────────────
  const copyNpub = () => {
    navigator.clipboard?.writeText(npub)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    flash('npub copied')
  }

  return (
    <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px 120px' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} input::placeholder{color:rgba(201,168,76,0.2)!important}`}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.8rem', fontWeight:700, color:S.cream, margin:0, marginBottom:4 }}>
          Settings
        </h1>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.3)', letterSpacing:'0.1em' }}>
          // configure your satscode experience
        </div>
      </div>

      {/* ── GitHub Token ── */}
      <Section icon={Github} title="GitHub Token">
        <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', color:S.creamFaint, margin:'0 0 14px', lineHeight:1.6 }}>
          Add a personal access token to fetch GitHub repos without hitting the 60 req/hr rate limit. No scopes needed — read-only public data.
        </p>
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <div style={{ flex:1, position:'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveToken()}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.03)', border:'1px solid '+S.border, borderRadius:9, padding:'10px 40px 10px 13px', color:S.cream, fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', outline:'none' }}
            />
            <button onClick={() => setShowToken(!showToken)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(201,168,76,0.4)', display:'flex' }}>
              {showToken ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          <button onClick={saveToken} style={{ background:githubToken?`linear-gradient(135deg,${S.gold},${S.goldLight})`:'rgba(201,168,76,0.1)', border:'none', borderRadius:9, padding:'10px 16px', cursor:githubToken?'pointer':'not-allowed', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.7rem', color:githubToken?S.bg:S.creamFaint, display:'flex', alignItems:'center', gap:6, transition:'all .2s', whiteSpace:'nowrap' }}>
            <Save size={13}/> Save
          </button>
        </div>
        <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.35)', textDecoration:'none' }}>
          // github.com/settings/tokens/new → no scopes needed
        </a>
      </Section>

      {/* ── Custom Relays ── */}
      <Section icon={Radio} title="Nostr Relays">
        <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', color:S.creamFaint, margin:'0 0 14px', lineHeight:1.6 }}>
          Relays used for fetching and publishing. Changes apply after refresh.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
          {relays.map(r => (
            <div key={r} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.02)', border:'1px solid '+S.border, borderRadius:8, padding:'9px 12px' }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:S.creamDim }}>{r}</span>
              {relays.length > 1 && (
                <button onClick={() => removeRelay(r)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(239,68,68,0.4)', display:'flex', padding:2 }}
                  onMouseEnter={e => e.currentTarget.style.color=S.red}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(239,68,68,0.4)'}
                >
                  <X size={13}/>
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input
            value={newRelay}
            onChange={e => setNewRelay(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRelay()}
            placeholder="wss://relay.example.com"
            style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid '+S.border, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem', outline:'none' }}
          />
          <button onClick={addRelay} style={{ background:'rgba(201,168,76,0.08)', border:'1px solid '+S.borderMid, borderRadius:9, padding:'10px 14px', cursor:'pointer', color:S.gold, display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', fontWeight:600 }}>
            <Plus size={13}/> Add
          </button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={saveRelays} style={{ flex:1, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:9, padding:'10px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.7rem', color:S.bg, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Save size={13}/> Save Relays
          </button>
          <button onClick={resetRelays} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid '+S.border, borderRadius:9, padding:'10px 14px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', color:S.creamFaint }}>
            Reset
          </button>
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section icon={Bell} title="Notifications">
        <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', color:S.creamFaint, margin:'0 0 14px', lineHeight:1.6 }}>
          Choose what activity you want to be notified about.
        </p>
        {[
          { key:'zaps',    label:'Zaps',        desc:'When someone zaps your posts' },
          { key:'dms',     label:'DMs',         desc:'When you receive a direct message' },
          { key:'follows', label:'New Followers',desc:'When someone follows you' },
        ].map(({ key, label, desc }) => (
          <div key={key} onClick={() => toggleNotif(key)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid '+S.border, cursor:'pointer' }}>
            <div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', fontWeight:600, color:S.cream, marginBottom:2 }}>{label}</div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', color:S.creamFaint }}>{desc}</div>
            </div>
            {/* Toggle switch */}
            <div style={{ width:40, height:22, borderRadius:11, background:notifs[key]?S.gold:'rgba(255,255,255,0.08)', border:'1px solid '+(notifs[key]?S.gold:S.border), position:'relative', transition:'all .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:2, left:notifs[key]?20:2, width:16, height:16, borderRadius:'50%', background:notifs[key]?S.bg:'rgba(201,168,76,0.3)', transition:'left .2s' }}/>
            </div>
          </div>
        ))}
      </Section>

      {/* ── Account ── */}
      <Section icon={User} title="Account">
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* npub */}
          <div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.3)', marginBottom:6, letterSpacing:'0.1em' }}>// your npub</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.02)', border:'1px solid '+S.border, borderRadius:9, padding:'10px 13px' }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:S.creamDim, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{npub || 'Not logged in'}</span>
              <button onClick={copyNpub} style={{ background:'none', border:'none', cursor:'pointer', color:copied?S.green:'rgba(201,168,76,0.3)', display:'flex', flexShrink:0, transition:'color .2s' }}>
                {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
              </button>
            </div>
          </div>

          {/* Logout */}
          <button onClick={onLogout} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:600, fontSize:'0.72rem', color:S.red, transition:'all .2s', letterSpacing:'0.08em' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.2)' }}
          >
            <LogOut size={15}/> Log Out
          </button>
        </div>
      </Section>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}

