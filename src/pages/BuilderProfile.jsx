import { useState, useEffect } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { nip19 } from 'nostr-tools'
import { finalizeEvent } from 'nostr-tools/pure'
import { ArrowLeft, Zap, MessageCircle, Globe, CheckCircle, Copy, Loader, Code2, X, UserPlus, UserCheck, Trophy, Wrench, Flame } from 'lucide-react'
import MessagesPage from './MessagesPage'

const RELAYS = ['wss://relay.damus.io','wss://nos.lol','wss://relay.nostr.band','wss://relay.primal.net']

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A', goldDark:'#8B6010',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
  green:'#22c55e', red:'#ef4444',
}

let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

const getCached = pk => {
  try {
    const r = localStorage.getItem('satscode_prof_' + pk)
    if (!r) return null
    const { data, ts } = JSON.parse(r)
    return Date.now() - ts < 3600000 ? data : null
  } catch { return null }
}
const setCache = (pk, data) => {
  try { localStorage.setItem('satscode_prof_' + pk, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const timeAgo = ts => {
  const s = Math.floor(Date.now() / 1000) - ts
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}

const SKILL_COLORS = {
  bitcoin:'#C9A84C', nostr:'#A78BFA', lightning:'#FCD34D', react:'#61DAFB',
  rust:'#F97316', python:'#3B82F6', typescript:'#60A5FA', design:'#EC4899',
  mobile:'#8B5CF6', web:'#22C55E', devops:'#F59E0B', solidity:'#9CA3AF',
}
const CATEGORY_COLORS = {
  wallet:'#C9A84C', relay:'#A78BFA', client:'#61DAFB', library:'#22C55E',
  bot:'#F97316', API:'#60A5FA', other:'#9CA3AF',
}
const parseTool = (content) => {
  const lines = (content||'').split('\n')
  const d = { name:'', description:'', category:'', stack:[], github:'', url:'', lightning:'' }
  if (lines[0]?.startsWith('TOOL:')) d.name = lines[0].replace('TOOL:','').trim()
  for (const line of lines.slice(1)) {
    const col = line.indexOf(':'); if (col===-1) continue
    const key = line.slice(0,col).trim().toLowerCase()
    const val = line.slice(col+1).trim()
    if (key==='description') d.description = val
    if (key==='category')    d.category    = val
    if (key==='stack')       d.stack       = val.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    if (key==='github')      d.github      = val
    if (key==='url')         d.url         = val
    if (key==='lightning')   d.lightning   = val
  }
  return d
}

const detectType = (content='', tags=[]) => {
  const c = content.toLowerCase()
  const t = tags.map(x => (x[1]||'').toLowerCase())
  if (t.includes('bounty') || c.includes('bounty') || c.includes('sats for')) return 'bounty'
  if (t.includes('ship') || c.includes('shipped') || c.includes('just shipped') || c.includes('v0.') || c.includes('v1.')) return 'ship'
  if (c.includes('milestone') || c.includes('crossed')) return 'milestone'
  return 'post'
}

// ── NIP-02 helpers (self-contained, no external hook file needed) ─────────────
const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }
const getSkBytes  = () => { try { const n=localStorage.getItem('satscode_nsec'); if(!n) return null; const {type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch { return null } }

async function fetchContactList(pubkeyHex) {
  return new Promise(resolve => {
    let best = null
    const sub = pool().subscribe(RELAYS, { kinds:[3], authors:[pubkeyHex], limit:1 }, {
      onevent(e) { if (!best || e.created_at > best.created_at) best = e },
      oneose() {
        sub.close()
        const contacts = best ? (best.tags||[]).filter(t=>t[0]==='p'&&t[1]).map(t=>t[1]) : []
        resolve({ contacts, raw: best })
      }
    })
    setTimeout(() => { try{sub.close()}catch{} ; resolve({ contacts:[], raw:null }) }, 6000)
  })
}

async function fetchFollowerCount(pubkeyHex) {
  return new Promise(resolve => {
    const seen = new Set()
    const sub = pool().subscribe(RELAYS, { kinds:[3], '#p':[pubkeyHex], limit:500 }, {
      onevent(e) { seen.add(e.pubkey) },
      oneose() { sub.close(); resolve(seen.size) }
    })
    setTimeout(() => { try{sub.close()}catch{} ; resolve(seen.size) }, 8000)
  })
}

async function publishContactList(contacts) {
  const sk = getSkBytes()
  if (!sk) throw new Error('No private key')
  const event = finalizeEvent({
    kind: 3,
    created_at: Math.floor(Date.now()/1000),
    tags: contacts.map(pk => ['p', pk, '', '']),
    content: '',
  }, sk)
  await Promise.any(pool().publish(RELAYS, event))
}

function Avatar({ profile, pubkey, size }) {
  const [err, setErr] = useState(false)
  const sz = size || 72
  const letter = ((profile && (profile.name || profile.display_name)) || pubkey || '?')[0].toUpperCase()
  if (profile && profile.picture && !err) {
    return <img src={profile.picture} alt={letter} onError={() => setErr(true)}
      style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover', border:'2.5px solid rgba(201,168,76,0.35)', boxShadow:'0 0 24px rgba(201,168,76,0.12)' }} />
  }
  return (
    <div style={{ width:sz, height:sz, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'2.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:sz*0.38, fontWeight:600, color:S.gold }}>
      {letter}
    </div>
  )
}

export default function BuilderProfile({ npub, builder, initialProfile, onClose, user }) {
  const [profile,      setProfile]      = useState(initialProfile || null)
  const [posts,        setPosts]        = useState([])
  const [repos,        setRepos]        = useState([])
  const [tab,          setTab]          = useState('builds')
  const [loadingProf,  setLoadingProf]  = useState(!initialProfile)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [showZap,      setShowZap]      = useState(false)
  const [activeDMPeer, setActiveDMPeer] = useState(null)
  const [zapStatus,    setZapStatus]    = useState('idle')
  const [zapErr,       setZapErr]       = useState('')
  const [zapCustom,    setZapCustom]    = useState('')

  // ── Follow state ────────────────────────────────────────────────────────────
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followerCount,  setFollowerCount]  = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [followBusy,     setFollowBusy]     = useState(false)
  const [followErr,      setFollowErr]      = useState('')

  const currentUser = user || (() => { try { return JSON.parse(localStorage.getItem('satscode_user')||'null') } catch { return null } })()

  const pubkeyHex = (() => {
    try { const d = nip19.decode(npub); return d.type === 'npub' ? d.data : null }
    catch { return null }
  })()

  const name   = (profile && (profile.name || profile.display_name)) || (npub ? npub.slice(0,10)+'...' : '?')
  const bio    = (builder && builder.bio) || (profile && profile.about) || ''
  const github = (builder && builder.github) ||
    (profile && profile.website && profile.website.includes('github.com') ? profile.website : '') || ''
  const skills = (builder && builder.skills) || []

  // ── Fetch follow data on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!pubkeyHex) return
    // follower count (how many follow this builder)
    fetchFollowerCount(pubkeyHex).then(n => setFollowerCount(n))
    // following count (how many this builder follows)
    fetchContactList(pubkeyHex).then(({ contacts }) => setFollowingCount(contacts.length))
    // am I following this builder?
    const myPk = getMyPubkey()
    if (myPk) {
      fetchContactList(myPk).then(({ contacts }) => setIsFollowing(contacts.includes(pubkeyHex)))
    }
  }, [pubkeyHex])

  const toggleFollow = async () => {
    const myPk = getMyPubkey()
    if (!myPk || !getSkBytes()) { setFollowErr('Log in to follow'); return }
    setFollowBusy(true); setFollowErr('')
    try {
      const { contacts } = await fetchContactList(myPk)
      const updated = isFollowing
        ? contacts.filter(pk => pk !== pubkeyHex)
        : contacts.includes(pubkeyHex) ? contacts : [...contacts, pubkeyHex]
      await publishContactList(updated)
      setIsFollowing(!isFollowing)
      setFollowerCount(n => n !== null ? (isFollowing ? Math.max(0,n-1) : n+1) : null)
    } catch(e) { setFollowErr(e.message||'Follow failed') }
    setFollowBusy(false)
  }

  // ── Profile fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pubkeyHex) return
    const cached = getCached(pubkeyHex)
    if (cached) { setProfile(cached); setLoadingProf(false) }
    const sub = pool().subscribe(RELAYS, { kinds:[0], authors:[pubkeyHex], limit:1 }, {
      onevent(e) {
        try { const p = JSON.parse(e.content); setCache(pubkeyHex, p); setProfile(p); setLoadingProf(false) } catch {}
      },
      oneose() { sub.close(); setLoadingProf(false) }
    })
    return () => { try { sub.close() } catch {} }
  }, [pubkeyHex])

  // ── Posts fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pubkeyHex) { setLoadingPosts(false); return }
    const seen = new Set()
    const collected = []
    const deletedIds = new Set()

    // Fetch deletions first, then tools
    const delSub = pool().subscribe(RELAYS,
      { kinds:[5], authors:[pubkeyHex], since:Math.floor(Date.now()/1000)-86400*90, limit:200 },
      {
        onevent(e) { (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).forEach(t=>deletedIds.add(t[1])) },
        oneose() {
          delSub.close()
          const sub = pool().subscribe(RELAYS,
            { kinds:[1], authors:[pubkeyHex], '#t':['satscode-tool'], limit:100 },
            {
              onevent(e) {
                if (seen.has(e.id)) return
                if (deletedIds.has(e.id)) return
                if (!e.content.startsWith('TOOL:')) return
                seen.add(e.id)
                collected.push(e)
                collected.sort((a,b) => b.created_at - a.created_at)
                setPosts([...collected])
              },
              oneose() { sub.close(); setLoadingPosts(false) }
            }
          )
          setTimeout(() => { setLoadingPosts(false) }, 8000)
        }
      }
    )
    // Live deletion watcher — removes tools instantly if deleted while viewing
    const liveDel = pool().subscribe(RELAYS,
      { kinds:[5], authors:[pubkeyHex], since:Math.floor(Date.now()/1000) },
      {
        onevent(e) {
          const ids = (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).map(t=>t[1])
          if (ids.length) setPosts(prev => prev.filter(t => !ids.includes(t.id)))
        },
        oneose() {}
      }
    )

    setTimeout(() => { try{delSub.close()}catch{}; setLoadingPosts(false) }, 10000)
    return () => { try{delSub.close()}catch{}; try{liveDel.close()}catch{} }
  }, [pubkeyHex])

  // ── GitHub fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Derive github directly from builder/profile inside effect to avoid stale closure
    const githubUrl = (builder && builder.github) ||
      (profile && profile.website && profile.website.includes('github.com') ? profile.website : '') || ''
    console.log('[GitHub] builder.github:', builder && builder.github)
    console.log('[GitHub] githubUrl:', githubUrl)
    if (!githubUrl) return
    const match = githubUrl.match(/github\.com\/([^/\s]+)/)
    if (!match) return
    const username = match[1].replace(/\/.*/, '')
    console.log('[GitHub] fetching repos for:', username)
    setLoadingRepos(true)
    setRepos([])
    const GITHUB_TOKEN = (() => { try { return JSON.parse(localStorage.getItem('satscode_github_token') || '""') } catch { return '' } })()
    fetch('https://api.github.com/users/' + username + '/repos?sort=updated&per_page=30&type=public', {
      headers: GITHUB_TOKEN ? { Authorization: 'token ' + GITHUB_TOKEN } : {}
    })
      .then(r => {
        console.log('[GitHub] response status:', r.status)
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then(data => {
        console.log('[GitHub] repos received:', Array.isArray(data) ? data.length : data)
        if (Array.isArray(data)) setRepos(data.filter(r => !r.fork))
        setLoadingRepos(false)
      })
      .catch(err => { console.error('[GitHub] fetch failed:', err); setLoadingRepos(false) })
  }, [builder, profile])

  const doZap = async (sats) => {
    const lnAddr = profile && (profile.lud16 || profile.lud06)
    if (!lnAddr) { setZapErr('No lightning address'); return }
    setZapStatus('fetching'); setZapErr('')
    try {
      const [u, domain] = lnAddr.split('@')
      const res  = await fetch('https://' + domain + '/.well-known/lnurlp/' + u)
      const data = await res.json()
      const msats = sats * 1000
      const cb = new URL(data.callback)
      cb.searchParams.set('amount', String(msats))
      const inv = await (await fetch(cb.toString())).json()
      if (!inv.pr) throw new Error('No invoice')
      window.open('lightning:' + inv.pr, '_blank')
      setZapStatus('done')
      setTimeout(() => { setShowZap(false); setZapStatus('idle') }, 1200)
    } catch(e) { setZapErr(e.message); setZapStatus('err') }
  }

  const shortNpub = npub ? npub.slice(0,10) + '...' + npub.slice(-6) : ''

  const renderContent = (text) => {
    return text.split(/(https?:\/\/[^\s]+)/g).map((p, i) => {
      if (!p.match(/^https?:\/\//)) return <span key={i}>{p}</span>
      if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(p) || p.includes('nostr.build') || p.includes('void.cat')) {
        return <img key={i} src={p} alt="" loading="lazy" onError={e => e.target.style.display='none'}
          style={{ display:'block', maxWidth:'100%', borderRadius:10, marginTop:8, border:'1px solid '+S.border }} />
      }
      return <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color:S.gold, wordBreak:'break-all' }}>{p}</a>
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'#0D0B06', overflowY:'auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} input::placeholder{color:rgba(201,168,76,0.2)!important}`}</style>

      <div style={{ maxWidth:620, margin:'0 auto', padding:'0 16px 120px' }}>

        <div style={{ padding:'16px 0 12px' }}>
          <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:S.creamFaint, fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem', padding:0 }}>
            <ArrowLeft size={15} /> Registry
          </button>
        </div>

        <div style={{ background:S.card, border:'1px solid '+S.border, borderRadius:16, padding:'22px 18px 18px', marginBottom:14, animation:'fadeUp .3s ease' }}>
          {loadingProf && !profile ? (
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:S.card2, animation:'pulse 1.4s ease infinite' }} />
              <div style={{ flex:1 }}>
                <div style={{ height:18, width:'40%', background:S.card2, borderRadius:6, marginBottom:8, animation:'pulse 1.4s ease infinite' }} />
                <div style={{ height:12, width:'65%', background:S.card2, borderRadius:6, animation:'pulse 1.4s ease infinite' }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:14 }}>
                <Avatar profile={profile} pubkey={npub} size={72} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.4rem', fontWeight:700, color:S.cream }}>{name}</span>
                    {profile && profile.nip05 && <CheckCircle size={14} color={S.gold} />}
                  </div>
                  {profile && profile.nip05 && (
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:S.gold, marginBottom:3 }}>✓ {profile.nip05}</div>
                  )}
                  {profile && profile.lud16 && (
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:S.green, marginBottom:4, display:'flex', alignItems:'center', gap:4 }}><Zap size={10} color={S.green} /> {profile.lud16}</div>
                  )}
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.28)', marginBottom:5 }}>{shortNpub}</div>

                  {/* Follower / Following counts */}
                  <div style={{ display:'flex', gap:14 }}>
                    {followerCount !== null && (
                      <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', color:S.creamFaint }}>
                        <span style={{ fontWeight:700, color:S.cream }}>{followerCount}</span> followers
                      </div>
                    )}
                    {followingCount !== null && (
                      <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', color:S.creamFaint }}>
                        <span style={{ fontWeight:700, color:S.cream }}>{followingCount}</span> following
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {bio ? (
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'1rem', color:S.creamDim, lineHeight:1.7, marginBottom:14, paddingBottom:14, borderBottom:'1px solid '+S.border }}>
                  {bio}
                </div>
              ) : null}

              {skills.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                  {skills.map(s => (
                    <span key={s} style={{ display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'12', border:'1px solid '+(SKILL_COLORS[s]||S.gold)+'35', fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold, letterSpacing:'0.04em' }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {profile && profile.lud16 && (
                  <button onClick={() => setShowZap(true)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 8px', borderRadius:10, background:'linear-gradient(135deg,'+S.gold+','+S.goldLight+')', border:'none', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.75rem', color:S.bg }}>
                    <Zap size={13} /> Zap
                  </button>
                )}
                <button onClick={() => setActiveDMPeer({ pubkey: pubkeyHex, profile })} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 8px', borderRadius:10, background:'rgba(201,168,76,0.06)', border:'1px solid '+S.border, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:600, fontSize:'0.75rem', color:S.creamDim, transition:'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=S.borderMid; e.currentTarget.style.color=S.cream }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=S.border; e.currentTarget.style.color=S.creamDim }}
                >
                  <MessageCircle size={13} /> DM
                </button>

                {/* Follow button */}
                <button onClick={toggleFollow} disabled={followBusy} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 8px', borderRadius:10, background:isFollowing?'rgba(201,168,76,0.14)':'rgba(201,168,76,0.06)', border:'1px solid '+(isFollowing?S.borderMid:S.border), cursor:followBusy?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:600, fontSize:'0.75rem', color:isFollowing?S.gold:S.creamDim, transition:'all .2s' }}
                  onMouseEnter={e => { if(!followBusy){ e.currentTarget.style.borderColor=S.borderMid; e.currentTarget.style.color=S.gold } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=isFollowing?S.borderMid:S.border; e.currentTarget.style.color=isFollowing?S.gold:S.creamDim }}
                >
                  {followBusy
                    ? <Loader size={13} style={{animation:'spin 1s linear infinite'}} />
                    : isFollowing ? <UserCheck size={13} color={S.gold} /> : <UserPlus size={13} />
                  }
                  {followBusy ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>

                {profile && profile.website && (
                  <button onClick={() => window.open(profile.website.startsWith('http') ? profile.website : 'https://'+profile.website, '_blank')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 8px', borderRadius:10, background:'rgba(201,168,76,0.06)', border:'1px solid '+S.border, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:600, fontSize:'0.75rem', color:S.creamDim, transition:'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=S.borderMid; e.currentTarget.style.color=S.cream }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=S.border; e.currentTarget.style.color=S.creamDim }}
                  >
                    <Globe size={13} /> Web
                  </button>
                )}
                <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(npub); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
                  style={{ padding:'11px 14px', borderRadius:10, background:copied?'rgba(34,197,94,0.08)':'rgba(201,168,76,0.04)', border:'1px solid '+(copied?'rgba(34,197,94,0.3)':S.border), cursor:'pointer', display:'flex', alignItems:'center', color:copied?S.green:S.creamFaint, transition:'all .2s' }}>
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>

              {followErr && (
                <div style={{ marginTop:8, fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', color:S.red }}>{followErr}</div>
              )}
            </>
          )}
        </div>

        <div style={{ display:'flex', gap:0, background:S.card, border:'1px solid '+S.border, borderRadius:10, padding:3, marginBottom:14 }}>
          {[
            { id:'builds', label:'Builds' + (posts.length > 0 ? ' ('+posts.length+')' : '') },
            { id:'github', label:'GitHub' },
            { id:'about',  label:'About' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer', background:tab===t.id?'linear-gradient(135deg,'+S.gold+','+S.goldLight+')':'transparent', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.7rem', color:tab===t.id?S.bg:S.creamFaint, transition:'all .2s', letterSpacing:'0.04em' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'builds' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'fadeUp .25s ease' }}>
            {loadingPosts && posts.length === 0 && [1,2,3].map(i => (
              <div key={i} style={{ background:S.card, border:'1px solid '+S.border, borderRadius:12, height:90, animation:'pulse 1.4s ease infinite', animationDelay:(i*0.15)+'s' }} />
            ))}
            {!loadingPosts && posts.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', fontFamily:'Cormorant Garamond,serif', fontSize:'1.05rem', fontStyle:'italic', fontWeight:300, color:S.creamFaint }}>
                No public builds yet
              </div>
            )}
            {posts.map(ev => {
              const tool = parseTool(ev.content)
              return (
                <div key={ev.id} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px', transition:'border-color .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=S.borderMid}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=S.border}
                >
                  {/* Tool header */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', fontWeight:700, color:S.cream }}>{tool.name}</div>
                        {tool.category && (
                          <span style={{ padding:'2px 8px', borderRadius:20, background:(CATEGORY_COLORS[tool.category]||S.gold)+'14', border:`1px solid ${(CATEGORY_COLORS[tool.category]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.5rem', fontWeight:700, color:CATEGORY_COLORS[tool.category]||S.gold }}>
                            {tool.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.28)' }}>{timeAgo(ev.created_at)}</div>
                    </div>
                  </div>
                  {/* Description */}
                  {tool.description && (
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'0.92rem', color:S.creamDim, lineHeight:1.7, marginBottom:10 }}>
                      {tool.description}
                    </div>
                  )}
                  {/* Stack */}
                  {tool.stack.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                      {tool.stack.map(s=>(
                        <span key={s} style={{ padding:'3px 8px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'14', border:`1px solid ${(SKILL_COLORS[s]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.5rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {/* Links */}
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                    {tool.github && (
                      <a href={tool.github.startsWith('http')?tool.github:'https://'+tool.github} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:600, color:S.creamFaint, textDecoration:'none' }}>
                        GitHub
                      </a>
                    )}
                    {tool.url && (
                      <a href={tool.url.startsWith('http')?tool.url:'https://'+tool.url} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:600, color:S.creamFaint, textDecoration:'none' }}>
                        Live
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'github' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'fadeUp .25s ease' }}>
            {loadingRepos && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'40px 0' }}>
                <Loader size={16} color={S.gold} style={{ animation:'spin 1s linear infinite' }} />
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:S.creamFaint }}>fetching repos…</span>
              </div>
            )}
            {!loadingRepos && repos.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <Code2 size={32} color={S.goldDark} style={{ display:'block', margin:'0 auto 12px', opacity:.3 }} />
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.05rem', fontStyle:'italic', fontWeight:300, color:S.creamFaint }}>
                  {github ? 'No public repos found' : 'No GitHub linked'}
                </div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.2)', marginTop:6 }}>
                  {github ? '// builder has no public repos' : '// builder has not linked a GitHub'}
                </div>
              </div>
            )}
            {repos.map(repo => (
              <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer"
                style={{ background:S.card, border:'1px solid '+S.border, borderRadius:12, padding:'14px 16px', textDecoration:'none', display:'block', transition:'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=S.borderMid; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=S.border; e.currentTarget.style.transform='translateY(0)' }}
              >
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:5 }}>
                  <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:700, color:S.gold }}>{repo.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    {repo.stargazers_count > 0 && <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.4)' }}>★ {repo.stargazers_count}</span>}
                    {repo.language && <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:S.creamFaint, background:'rgba(255,255,255,0.04)', border:'1px solid '+S.border, borderRadius:5, padding:'2px 7px' }}>{repo.language}</span>}
                  </div>
                </div>
                {repo.description && (
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:'0.9rem', fontWeight:300, color:S.creamFaint, lineHeight:1.5, marginBottom:7 }}>
                    {repo.description}
                  </div>
                )}
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.22)', display:'flex', alignItems:'center', gap:8 }}>
                  <Globe size={8} /> {repo.full_name}
                  {repo.forks_count > 0 && <span>⑂ {repo.forks_count}</span>}
                </div>
              </a>
            ))}
          </div>
        )}

        {tab === 'about' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'fadeUp .25s ease' }}>
            {bio && (
              <div style={{ background:S.card, border:'1px solid '+S.border, borderRadius:12, padding:'16px' }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.28)', marginBottom:10, letterSpacing:'0.1em' }}>// about</div>
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'1.05rem', color:S.creamDim, lineHeight:1.75, margin:0 }}>{bio}</p>
              </div>
            )}
            {(profile && (profile.website || profile.lud16 || profile.nip05)) && (
              <div style={{ background:S.card, border:'1px solid '+S.border, borderRadius:12, padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.28)', letterSpacing:'0.1em' }}>// links</div>
                {profile.website && <a href={profile.website.startsWith('http')?profile.website:'https://'+profile.website} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:8, color:S.gold, textDecoration:'none', fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem' }}><Globe size={12} /> {profile.website}</a>}
                {profile.lud16 && <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem', color:S.green }}><Zap size={12} /> {profile.lud16}</div>}
                {profile.nip05 && <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem', color:S.gold }}><CheckCircle size={12} /> {profile.nip05}</div>}
              </div>
            )}
            <div style={{ background:S.card, border:'1px solid '+S.border, borderRadius:12, padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.35)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{npub}</span>
              <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(npub); setCopied(true); setTimeout(()=>setCopied(false),1800) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:copied?S.green:'rgba(201,168,76,0.28)', display:'flex', alignItems:'center', flexShrink:0 }}>
                {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
              </button>
            </div>
          </div>
        )}
      </div>

      {activeDMPeer && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'#0D0B06' }}>
          <MessagesPage
            user={currentUser}
            initialPeer={activeDMPeer.pubkey}
            initialProfile={activeDMPeer.profile}
            onClose={() => setActiveDMPeer(null)}
          />
          <button onClick={() => setActiveDMPeer(null)} style={{ position:'fixed', top:14, right:16, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:400, color:'rgba(245,236,215,0.5)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {showZap && (
        <div onClick={e => e.target===e.currentTarget && setShowZap(false)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end' }}>
          <div style={{ width:'100%', background:S.card2, borderRadius:'18px 18px 0 0', border:'1px solid '+S.borderMid, borderBottom:'none', borderLeft:'none', borderRight:'none', padding:'20px 20px calc(env(safe-area-inset-bottom,0px) + 44px)', animation:'slideUp .25s ease' }}>
            <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 18px' }} />
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <Zap size={18} color={S.gold} />
              <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontWeight:600, color:S.cream }}>Zap {name}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[1,21,100,500,1000,5000].map(amt => (
                <button key={amt} onClick={() => doZap(amt)} style={{ padding:'12px 8px', borderRadius:10, background:'rgba(201,168,76,0.06)', border:'1px solid '+S.border, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.78rem', color:S.gold }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(201,168,76,0.14)'; e.currentTarget.style.borderColor='rgba(201,168,76,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor=S.border }}
                >
                  <Zap size={11} color={S.gold} />
                  <span>{amt.toLocaleString()}</span>
                  <span style={{ fontSize:'0.46rem', color:'rgba(201,168,76,0.4)', fontWeight:400 }}>sats</span>
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input type="number" value={zapCustom} onChange={e => setZapCustom(e.target.value)} placeholder="Custom amount…"
                style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid '+S.border, borderRadius:9, padding:'10px 13px', color:S.cream, fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', outline:'none' }} />
              <button onClick={() => zapCustom && doZap(parseInt(zapCustom))} style={{ background:zapCustom?'linear-gradient(135deg,'+S.gold+','+S.goldLight+')':'rgba(201,168,76,0.1)', border:'none', borderRadius:9, padding:'10px 18px', cursor:zapCustom?'pointer':'not-allowed', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.75rem', color:zapCustom?S.bg:S.creamFaint, display:'flex', alignItems:'center', gap:6 }}>
                <Zap size={13} /> Zap
              </button>
            </div>
            {zapErr && <div style={{ padding:'9px 13px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.red }}>{zapErr}</div>}
            {zapStatus==='done' && <div style={{ padding:'9px 13px', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:9, fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:S.green, display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={13}/> Opening wallet…</div>}
          </div>
        </div>
      )}
    </div>
  )
}

