import { useState, useEffect, useRef } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import ProfileModal from './ProfileModal'
import MessagesPage from './MessagesPage'
import {
  Zap, RefreshCw, Loader, Send, Hash, Globe, Users,
  CheckCircle, AlertCircle, Image as ImageIcon, Plus, X,
  Wrench, Trophy, Flame, SlidersHorizontal, ChevronDown,
  Heart, Zap as ZapIcon, MessageCircle
} from 'lucide-react'

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
]

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', card: '#111009', card2: '#161209',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.72)',
  creamFaint: 'rgba(245,236,215,0.35)',
  border: 'rgba(201,168,76,0.12)',
  borderHover: 'rgba(201,168,76,0.3)',
  green: '#22c55e', red: '#ef4444',
}

const detectType = (content = '', tags = []) => {
  const c = content.toLowerCase()
  const t = tags.map(t => (t[1] || '').toLowerCase())
  if (t.includes('bounty') || c.includes('bounty') || c.includes('sats for') || c.includes('reward:')) return 'bounty'
  if (t.includes('ship') || t.includes('shipped') || c.includes('shipped') || c.includes('just shipped') || c.includes('just launched') || c.includes('v0.') || c.includes('v1.') || c.includes('released')) return 'ship'
  if (t.includes('milestone') || c.includes('milestone') || c.includes('crossed') || c.includes('users')) return 'milestone'
  return 'post'
}

const TYPE_CONFIG = {
  ship:      { icon: Wrench, color: '#4CAF9A', label: 'Shipped' },
  bounty:    { icon: Trophy, color: '#C9A84C', label: 'Bounty'  },
  milestone: { icon: Flame,  color: '#E8944A', label: 'Milestone' },
  post:      { icon: null,   color: null,      label: null },
}

const shortKey = (npub) => npub ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : ''

const timeAgo = (ts) => {
  const s = Math.floor(Date.now() / 1000) - ts
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const nsecToBytes = (nsec) => {
  const { type, data } = nip19.decode(nsec.trim())
  if (type !== 'nsec') throw new Error('Not an nsec key')
  return data
}

let _pool = null
const getPool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

const SOURCES = [
  { id: 'satscode', label: '#satscode', icon: Hash  },
  { id: 'bitcoin',  label: '#bitcoin',  icon: Globe },
  { id: 'following',label: 'Following', icon: Users },
]

export const feedCache = {
  satscode:  { posts: [], profiles: {}, seenIds: new Set() },
  bitcoin:   { posts: [], profiles: {}, seenIds: new Set() },
  following: { posts: [], profiles: {}, seenIds: new Set() },
  custom:    { posts: [], profiles: {}, seenIds: new Set() },
}

const HIDDEN_PREFIXES = [
  'PRESENCE_ONLINE:','PRESENCE_OFFLINE:','FOLLOWING:','SOCIALS:',
  'BLOG_POST:','NEWS_DELETE:','EVENT_DELETE:','GROUP:','SUBMISSION:',
  'POW_BLOCK:','POW_DELETE:','ASSESSMENT_CREATE:','DELETED:','COURSES:',
  'BOUNTY_ACCEPTED:','I want to claim this bounty:','BOUNTY_CLAIM:',
  'TOOL:',
]

const FEED_PREFS_KEY = 'satscode_feed_prefs'
const loadFeedPrefs = () => { try { return JSON.parse(localStorage.getItem(FEED_PREFS_KEY) || '{}') } catch { return {} } }
const saveFeedPrefs = (prefs) => { try { localStorage.setItem(FEED_PREFS_KEY, JSON.stringify(prefs)) } catch {} }

function Avatar({ profile = {}, pubkey = '', size = 40 }) {
  const [imgErr, setImgErr] = useState(false)
  const letter = (profile.name || profile.display_name || pubkey || '?').slice(0, 1).toUpperCase()
  if (profile.picture && !imgErr) {
    return (
      <img src={profile.picture} alt={letter}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid rgba(201,168,76,0.3)` }}
        onError={() => setImgErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(201,168,76,0.1)', border: `1.5px solid rgba(201,168,76,0.3)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cormorant Garamond,serif', fontSize: size * 0.4, fontWeight: 600, color: S.gold,
    }}>
      {letter}
    </div>
  )
}

function useReactions(eventId) {
  const [likes, setLikes] = useState(0)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!eventId) return
    const myPubkey = (() => {
      try { return JSON.parse(localStorage.getItem('satscode_user') || '{}').pubkey } catch { return null }
    })()
    const pool = getPool()
    const seen = new Set()
    let lCount = 0

    const sub = pool.subscribe(RELAYS,
      { kinds: [7], '#e': [eventId], limit: 100 },
      {
        onevent(e) {
          if (seen.has(e.id)) return
          seen.add(e.id)
          if (e.content === '+' || e.content === '❤️' || e.content === '🤙') {
            lCount++
            setLikes(lCount)
            if (myPubkey && e.pubkey === myPubkey) setLiked(true)
          }
        },
        oneose() { sub.close() }
      }
    )
    const t = setTimeout(() => { try { sub.close() } catch {} }, 8000)
    return () => { clearTimeout(t); try { sub.close() } catch {} }
  }, [eventId])

  return { likes, liked, setLiked, setLikes }
}

function ZapModal({ event, profile, onClose }) {
  const [custom, setCustom] = useState('')
  const [status, setStatus] = useState('idle')
  const [errMsg, setErrMsg] = useState('')
  const lnAddress = profile?.lud16 || profile?.lud06 || null
  const AMOUNTS = [1, 21, 100, 500, 1000, 5000]

  const zap = async (sats) => {
    setStatus('fetching')
    try {
      let resolvedAddress = profile?.lud16 || profile?.lud06 || null
      if (!resolvedAddress) {
        const freshProfile = await new Promise((resolve) => {
          const pool = getPool()
          const sub = pool.subscribe(RELAYS, { kinds:[0], authors:[event.pubkey], limit:1 }, {
            onevent(e) { try { resolve(JSON.parse(e.content)) } catch { resolve(null) } },
            oneose() { resolve(null) }
          })
          setTimeout(() => resolve(null), 5000)
        })
        resolvedAddress = freshProfile?.lud16 || freshProfile?.lud06 || null
      }
      if (!resolvedAddress) { setErrMsg('This user has no Lightning address'); setStatus('err'); return }
      let lnurlData
      if (resolvedAddress.toLowerCase().startsWith('lnurl')) {
        const decoded = atob(resolvedAddress.replace(/lnurl1/i,'').replace(/[^a-z0-9]/gi,''))
        const lnurlRes = await fetch(decoded)
        if (!lnurlRes.ok) throw new Error('Could not reach Lightning provider')
        lnurlData = await lnurlRes.json()
      } else {
        const [user, domain] = resolvedAddress.split('@')
        if (!user || !domain) throw new Error('Invalid Lightning address format')
        const lnurlRes = await fetch(`https://${domain}/.well-known/lnurlp/${user}`)
        if (!lnurlRes.ok) throw new Error('Could not reach Lightning provider')
        lnurlData = await lnurlRes.json()
      }
      const msats = sats * 1000
      if (msats < lnurlData.minSendable || msats > lnurlData.maxSendable)
        throw new Error(`Amount must be ${lnurlData.minSendable/1000}–${lnurlData.maxSendable/1000} sats`)
      const nsec = localStorage.getItem('satscode_nsec')
      let zapRequest = null
      if (nsec) {
        const { data: skBytes } = nip19.decode(nsec.trim())
        const myPubkey = JSON.parse(localStorage.getItem('satscode_user') || '{}').pubkey || ''
        zapRequest = finalizeEvent({
          kind: 9734, created_at: Math.floor(Date.now() / 1000),
          tags: [['relays', ...RELAYS], ['amount', String(msats)], ['p', event.pubkey], ['e', event.id]],
          content: '',
        }, skBytes)
      }
      const callbackUrl = new URL(lnurlData.callback)
      callbackUrl.searchParams.set('amount', String(msats))
      if (zapRequest) callbackUrl.searchParams.set('nostr', JSON.stringify(zapRequest))
      const invRes = await fetch(callbackUrl.toString())
      const invData = await invRes.json()
      if (!invData.pr) throw new Error('No invoice returned')
      window.open(`lightning:${invData.pr}`, '_blank')
      setStatus('done')
      setTimeout(onClose, 1200)
    } catch (e) { setErrMsg(e.message || 'Zap failed'); setStatus('err') }
  }

  const handleZap = (sats) => { const n = parseInt(sats); if (!n || n < 1) { setErrMsg('Enter a valid amount'); return }; zap(n) }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, background: S.card2, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: '18px 18px 0 0', padding: '20px 20px 44px', animation: 'slideUp .25s ease' }}>
        <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.2)', borderRadius: 2, margin: '0 auto 18px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ZapIcon size={18} color={S.gold}/>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', fontWeight: 600, color: S.cream }}>Zap {profile?.name || profile?.display_name || 'this builder'}</div>
            {lnAddress && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.4)' }}>⚡ {lnAddress}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {AMOUNTS.map(amt => (
            <button key={amt} onClick={() => handleZap(amt)} disabled={status === 'fetching'}
              style={{ padding: '12px 8px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`, cursor: 'pointer', transition: 'all .2s', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.78rem', color: S.gold, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.14)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = S.border }}>
              <ZapIcon size={13} color={S.gold}/>
              <span>{amt.toLocaleString()}</span>
              <span style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', fontWeight: 400 }}>sats</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input type="number" min="1" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleZap(custom)} placeholder="Custom amount…"
            style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, borderRadius: 9, padding: '10px 13px', color: S.cream, fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', outline: 'none' }}/>
          <button onClick={() => handleZap(custom)} disabled={status === 'fetching' || !custom}
            style={{ background: custom ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.15)', border: 'none', borderRadius: 9, padding: '10px 18px', cursor: custom ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.75rem', color: custom ? S.bg : S.creamFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
            {status === 'fetching' ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <ZapIcon size={13}/>} Zap
          </button>
        </div>
        {status === 'err'  && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', color: S.red }}>{errMsg}</div>}
        {status === 'done' && <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', color: S.green, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={13}/> Zap sent — opening wallet…</div>}
        {!lnAddress && status === 'idle' && <div style={{ padding: '10px 14px', background: 'rgba(201,168,76,0.05)', border: `1px solid ${S.border}`, borderRadius: 9, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(201,168,76,0.4)' }}>// this user has no lightning address set</div>}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}

function ActionBtn({ onClick, icon, count, activeColor, active, hoverBg }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, background: active ? hoverBg : 'transparent', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', transition: 'all .18s', color: active ? activeColor : 'rgba(245,236,215,0.28)' }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = activeColor }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? hoverBg : 'transparent'; e.currentTarget.style.color = active ? activeColor : 'rgba(245,236,215,0.28)' }}>
      {icon}
      {count > 0 && <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', fontWeight: 600, color: 'inherit' }}>{count >= 1000 ? (count/1000).toFixed(1)+'k' : count}</span>}
    </button>
  )
}

function PostCard({ event, profiles, onAvatarClick, onDM, onComment }) {
  const profile = profiles[event.pubkey] || {}
  const npub = (() => { try { return nip19.npubEncode(event.pubkey) } catch { return '' } })()
  const name = profile.name || profile.display_name || shortKey(npub)
  const type = detectType(event.content, event.tags || [])
  const typeConf = TYPE_CONFIG[type]
  const { likes, liked, setLiked, setLikes } = useReactions(event.id)
  const [showZap, setShowZap] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  const flashMsg = (text, ok = true) => { setActionMsg({ text, ok }); setTimeout(() => setActionMsg(null), 2000) }

  const handleLike = async () => {
    if (liked) return
    const nsec = localStorage.getItem('satscode_nsec')
    if (!nsec) { flashMsg('Log in to like', false); return }
    try {
      const { data: skBytes } = nip19.decode(nsec.trim())
      const ev = finalizeEvent({ kind: 7, created_at: Math.floor(Date.now() / 1000), tags: [['e', event.id], ['p', event.pubkey]], content: '+' }, skBytes)
      await Promise.any(getPool().publish(RELAYS, ev))
      setLiked(true); setLikes(n => n + 1); flashMsg('Liked!')
    } catch { flashMsg('Like failed', false) }
  }

  const isImageUrl = (url) =>
    /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) ||
    url.includes('nostr.build') || url.includes('void.cat') ||
    url.includes('imgbb.com') || url.includes('imgur.com') ||
    url.includes('image.nostr.build')

  const renderContent = (text) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g)
    return parts.map((p, i) => {
      if (!p.match(/^https?:\/\//)) return <span key={i}>{p}</span>
      if (isImageUrl(p)) return <img key={i} src={p} alt="" loading="lazy" style={{ display: 'block', maxWidth: '100%', borderRadius: 10, marginTop: 10, border: `1px solid ${S.border}`, cursor: 'pointer' }} onClick={() => window.open(p, '_blank')} onError={e => e.target.style.display = 'none'}/>
      return <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: S.gold, wordBreak: 'break-all' }}>{p}</a>
    })
  }

  return (
    <>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: '16px 16px 12px', marginBottom: 12, transition: 'border-color .2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = S.borderHover}
        onMouseLeave={e => e.currentTarget.style.borderColor = S.border}>
        {typeConf.icon && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <typeConf.icon size={11} color={typeConf.color}/>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: typeConf.color }}>{typeConf.label}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <div onClick={() => onAvatarClick && onAvatarClick(event.pubkey, profile)} style={{ cursor: 'pointer' }}>
            <Avatar profile={profile} pubkey={event.pubkey} size={40}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', fontWeight: 600, color: S.cream, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {name}
              {profile.nip05 && <span style={{ fontSize: '0.58rem', color: S.gold, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={10}/> {profile.nip05}</span>}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.4)', marginTop: 2 }}>{shortKey(npub)} · {timeAgo(event.created_at)}</div>
          </div>
        </div>
        {type === 'bounty' && event.content.startsWith('BOUNTY:') ? (() => {
          const lines = event.content.split('\n')
          const title  = lines[0]?.replace('BOUNTY:','').trim() || ''
          const desc   = lines.find(l=>l.startsWith('Description:'))?.replace('Description:','').trim() || ''
          const reward = lines.find(l=>l.startsWith('Reward:'))?.replace('Reward:','').replace('sats','').trim() || ''
          const skills = lines.find(l=>l.startsWith('Skills:'))?.replace('Skills:','').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean) || []
          const days   = (() => { const dl=lines.find(l=>l.startsWith('Deadline:'))?.replace('Deadline:','').trim(); if(!dl)return null; return Math.ceil((new Date(dl)-Date.now())/86400000) })()
          const SKILL_COLORS = { bitcoin:'#C9A84C',nostr:'#A78BFA',lightning:'#FCD34D',react:'#61DAFB',rust:'#F97316',python:'#3B82F6',typescript:'#60A5FA',design:'#EC4899',mobile:'#8B5CF6',web:'#22C55E',devops:'#F59E0B',solidity:'#9CA3AF' }
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', fontWeight:700, color:S.cream, lineHeight:1.3 }}>{title}</div>
                {reward && <div style={{ textAlign:'right', flexShrink:0 }}><div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.85rem', fontWeight:700, color:S.gold }}>{parseInt(reward).toLocaleString()}</div><div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.42rem', color:'rgba(201,168,76,0.4)' }}>sats</div></div>}
              </div>
              {desc && <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'0.95rem', color:S.creamDim, lineHeight:1.7, marginBottom:10 }}>{desc}</div>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                {skills.map(s=><span key={s} style={{ padding:'3px 8px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'14', border:`1px solid ${(SKILL_COLORS[s]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.52rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold }}>{s}</span>)}
                {days!==null && <span style={{ marginLeft:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:days<=0?'rgba(201,168,76,0.3)':days<3?S.red:days<7?S.gold:'rgba(201,168,76,0.4)', display:'flex', alignItems:'center', gap:3 }}>⏱ {days<=0?'Expired':`${days}d left`}</span>}
              </div>
            </div>
          )
        })() : (
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', fontWeight: 300, color: S.creamDim, lineHeight: 1.75, wordBreak: 'break-word', marginBottom: 14 }}>
            {renderContent(event.content || '')}
          </div>
        )}
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ActionBtn onClick={() => setShowZap(true)} icon={<ZapIcon size={15}/>} count={0} activeColor={S.gold} active={false} hoverBg='rgba(201,168,76,0.08)'/>
          <ActionBtn onClick={handleLike} icon={<Heart size={15} fill={liked ? '#ef4444' : 'none'}/>} count={likes} activeColor='#ef4444' active={liked} hoverBg='rgba(239,68,68,0.06)'/>
          <ActionBtn onClick={() => onComment && onComment(event)} icon={<MessageCircle size={15}/>} count={0} activeColor={S.gold} active={false} hoverBg='rgba(201,168,76,0.06)'/>
          {actionMsg && <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.58rem', fontWeight: 600, color: actionMsg.ok ? S.green : S.red, animation: 'fadeUp .2s ease' }}>{actionMsg.text}</span>}
        </div>
      </div>
      {showZap && <ZapModal event={event} profile={profile} onClose={() => setShowZap(false)}/>}
    </>
  )
}

async function buildNip98Auth(uploadUrl, method = 'POST') {
  const nsec = localStorage.getItem('satscode_nsec')
  if (!nsec) throw new Error('No private key found')
  const { finalizeEvent } = await import('nostr-tools/pure')
  const { nip19 } = await import('nostr-tools')
  const { type, data } = nip19.decode(nsec.trim())
  if (type !== 'nsec') throw new Error('Invalid nsec')
  const authEvent = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags: [['u', uploadUrl], ['method', method]], content: '' }, data)
  return 'Nostr ' + btoa(JSON.stringify(authEvent))
}

async function uploadImage(file) {
  const PROVIDERS = [
    { name: 'nostr.build',         url: 'https://nostr.build/api/v2/upload/files',  field: 'fileToUpload',  getUrl: (j) => j?.data?.[0]?.url,                   needsAuth: true  },
    { name: 'nostrcheck.me',       url: 'https://nostrcheck.me/api/v2/media',        field: 'uploadedfile',  getUrl: (j) => j?.url || j?.data?.url,               needsAuth: true  },
    { name: 'nostr.build (legacy)',url: 'https://nostr.build/api/upload/image',      field: 'fileToUpload',  getUrl: (j) => j?.data?.display_url || j?.data?.url, needsAuth: false },
  ]
  let lastError = 'All upload providers failed'
  for (const provider of PROVIDERS) {
    try {
      const formData = new FormData()
      formData.append(provider.field, file)
      const headers = {}
      if (provider.needsAuth) { try { headers['Authorization'] = await buildNip98Auth(provider.url, 'POST') } catch {} }
      const res = await fetch(provider.url, { method: 'POST', headers, body: formData })
      if (!res.ok) { lastError = `${provider.name}: HTTP ${res.status}`; continue }
      const json = await res.json()
      const url = provider.getUrl(json)
      if (url) return url
      lastError = `${provider.name}: no URL in response`
    } catch (e) { lastError = `${provider.name}: ${e.message}` }
  }
  throw new Error(lastError)
}

function ComposeModal({ user, profiles, onClose, onPublished }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')
  const [errMsg, setErrMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [postType, setPostType] = useState('post')
  const taRef = useRef()
  useEffect(() => { setTimeout(() => taRef.current?.focus(), 100) }, [])

  const TYPE_OPTS = [
    { id: 'post', label: 'Post', Icon: null },
    { id: 'ship', label: 'Ship', Icon: Wrench },
    { id: 'bounty', label: 'Bounty', Icon: Zap },
    { id: 'milestone', label: 'Milestone', Icon: Trophy },
  ]

  const handleImagePick = async (file) => {
    if (!file?.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { setErrMsg('Max 10MB'); return }
    setUploading(true); setErrMsg('')
    try { const url = await uploadImage(file); setPreviewImg(url); setText(prev => prev ? prev + '\n' + url : url); taRef.current?.focus() }
    catch (e) { setErrMsg(e.message || 'Upload failed') }
    setUploading(false)
  }

  const publish = async () => {
    if (!text.trim() || status === 'busy') return
    setStatus('busy'); setErrMsg('')
    try {
      const tags = [['t', 'satscode'], ['t', 'bitcoin']]
      if (postType === 'ship')      tags.push(['t', 'ship'], ['t', 'shipped'])
      if (postType === 'bounty')    tags.push(['t', 'bounty'])
      if (postType === 'milestone') tags.push(['t', 'milestone'])
      const eventTemplate = { kind: 1, created_at: Math.floor(Date.now() / 1000), tags, content: text.trim() }
      let signed
      if (window.nostr && !localStorage.getItem('satscode_nsec')) { signed = await window.nostr.signEvent(eventTemplate) }
      else {
        const nsec = localStorage.getItem('satscode_nsec')
        if (!nsec) throw new Error('No private key found — log out and log in again')
        signed = finalizeEvent(eventTemplate, nsecToBytes(nsec))
      }
      await Promise.any(getPool().publish(RELAYS, signed))
      Object.values(feedCache).forEach(c => c.seenIds.add(signed.id))
      setStatus('ok')
      setTimeout(() => { onPublished(signed); onClose() }, 700)
    } catch (e) { setErrMsg(e.message || 'Publish failed'); setStatus('err') }
  }

  const profile = profiles[user?.pubkey] || {}

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: S.card2, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 640, padding: '20px 20px 40px', animation: 'slideUp .25s ease' }}>
        <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.25)', borderRadius: 2, margin: '0 auto 16px' }}/>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TYPE_OPTS.map(t => (
            <button key={t.id} onClick={() => setPostType(t.id)} style={{ flex: 1, padding: '7px 4px', background: postType === t.id ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.05)', border: `1px solid ${postType === t.id ? 'transparent' : S.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.62rem', fontWeight: postType === t.id ? 700 : 400, color: postType === t.id ? S.bg : S.creamFaint, transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {t.Icon && <t.Icon size={11}/>}{t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar profile={profile} pubkey={user?.pubkey} size={42}/>
          <div style={{ flex: 1 }}>
            <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)}
              placeholder={postType === 'ship' ? 'What did you ship? Share the link...' : postType === 'bounty' ? 'Describe the bounty and the sat reward...' : postType === 'milestone' ? 'Share your milestone...' : 'What are you building today?'}
              maxLength={280} rows={4}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: S.cream, lineHeight: 1.7, resize: 'none' }}/>
            {previewImg && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <img src={previewImg} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, border: `1px solid ${S.border}` }}/>
                <button onClick={() => { setPreviewImg(null); setText(t => t.replace(previewImg, '').trim()) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12}/></button>
              </div>
            )}
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.25)', marginTop: 6 }}>// posts with #satscode #bitcoin {postType !== 'post' && `#${postType}`}</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 14, paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.65rem', color: text.length > 250 ? S.red : 'rgba(201,168,76,0.3)' }}>{280 - text.length}</span>
            <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', color: uploading ? S.creamFaint : S.goldDark, display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', padding: '7px 12px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`, borderRadius: 8, fontFamily: 'Montserrat,sans-serif' }}>
              {uploading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <ImageIcon size={13}/>}
              Photo
              <input type="file" accept="image/*" disabled={uploading} onChange={e => handleImagePick(e.target.files?.[0])} style={{ display: 'none' }}/>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status === 'err' && <span style={{ fontSize: '0.62rem', color: S.red, display: 'flex', alignItems: 'center', gap: 4, maxWidth: 160 }}><AlertCircle size={11}/> {errMsg}</span>}
            {status === 'ok'  && <span style={{ fontSize: '0.62rem', color: S.green, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11}/> Published!</span>}
            <button onClick={onClose} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.creamFaint, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem' }}>Cancel</button>
            <button onClick={publish} disabled={!text.trim() || status === 'busy' || status === 'ok'} style={{ background: text.trim() ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.15)', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: text.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat,sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: text.trim() ? S.bg : S.creamFaint, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
              {status === 'busy' ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }}/> Posting…</> : <><Send size={13}/> Post</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ThreadSheet({ event, profiles, user, onClose }) {
  const [replies,    setReplies]    = useState([])
  const [replyProfs, setReplyProfs] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [text,       setText]       = useState('')
  const [posting,    setPosting]    = useState(false)
  const [postedOk,   setPostedOk]   = useState(false)

  const pool = getPool()
  const author = profiles[event.pubkey] || {}
  const authorName = author.name || author.display_name || event.pubkey.slice(0,10)+'…'
  const timeAgoStr = (() => { const s=Math.floor(Date.now()/1000)-event.created_at; if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' })()

  const seenReplies = useRef(new Set())
  useEffect(() => {
    seenReplies.current = new Set(); setReplies([]); setReplyProfs({}); setLoading(true)
    const authorsSeen = new Set()
    const sub = pool.subscribe(RELAYS, { kinds:[1], '#e':[event.id], limit:100 }, {
      onevent(e) {
        if (seenReplies.current.has(e.id)) return
        seenReplies.current.add(e.id)
        setReplies(prev => [...prev, e].sort((a,b) => a.created_at - b.created_at))
        if (!authorsSeen.has(e.pubkey)) {
          authorsSeen.add(e.pubkey)
          const rSub = pool.subscribe(RELAYS, { kinds:[0], authors:[e.pubkey], limit:1 }, {
            onevent(pe) { try { setReplyProfs(prev => ({...prev, [pe.pubkey]: JSON.parse(pe.content)})) } catch {} },
            oneose() { rSub.close() }
          })
        }
      },
      oneose() { setLoading(false) }
    })
    setTimeout(() => setLoading(false), 6000)
    return () => { try{sub.close()}catch{} }
  }, [event.id])

  const postReply = async () => {
    if (!text.trim() || !user) return
    setPosting(true)
    try {
      const sk = (() => { try { const n=localStorage.getItem('satscode_nsec'); if(!n)return null; const {type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch{return null} })()
      if (!sk) throw new Error('No key')
      const ev = finalizeEvent({ kind:1, created_at:Math.floor(Date.now()/1000), tags:[['e',event.id,'','reply'],['p',event.pubkey]], content:text.trim() }, sk)
      await Promise.any(pool.publish(RELAYS, ev))
      setReplies(prev => [...prev, ev]); setText(''); setPostedOk(true); setTimeout(() => setPostedOk(false), 2000)
    } catch(e) { console.error(e) }
    setPosting(false)
  }

  const S2 = { gold:'#C9A84C', goldLight:'#E8C96A', bg:'#0D0B06', card:'#111009', card2:'#161209', cream:'#F5ECD7', creamFaint:'rgba(245,236,215,0.35)', border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)' }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'flex-end' }}>
      <div style={{ width:'100%', background:S2.bg, borderRadius:'18px 18px 0 0', border:'1px solid '+S2.borderMid, maxHeight:'88vh', display:'flex', flexDirection:'column', animation:'slideUp .25s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid '+S2.border, flexShrink:0 }}>
          <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 14px' }}/>
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            {author.picture ? <img src={author.picture} onError={e=>e.target.style.display='none'} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'1px solid '+S2.border, flexShrink:0 }}/> : <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'1px solid '+S2.border, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', color:S2.gold, flexShrink:0 }}>{authorName[0].toUpperCase()}</div>}
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3 }}>
                <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.75rem', fontWeight:700, color:S2.cream }}>{authorName}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.3)' }}>{timeAgoStr}</span>
              </div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'0.95rem', color:'rgba(245,236,215,0.8)', lineHeight:1.6 }}>{event.content}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:S2.creamFaint, padding:4 }}><X size={16}/></button>
          </div>
          <div style={{ marginTop:8, fontFamily:'Montserrat,sans-serif', fontSize:'0.6rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.1em' }}>{loading ? 'Loading replies…' : `${replies.length} ${replies.length===1?'reply':'replies'}`}</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 16px' }}>
          {loading && <div style={{ textAlign:'center', padding:'24px 0' }}><Loader size={18} color={S2.gold} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }}/></div>}
          {!loading && replies.length===0 && <div style={{ textAlign:'center', padding:'24px 0', fontFamily:'Cormorant Garamond,serif', fontSize:'0.95rem', fontStyle:'italic', color:S2.creamFaint }}>No replies yet — be the first</div>}
          {replies.map(r => {
            const rp = replyProfs[r.pubkey] || {}
            const rName = rp.name || rp.display_name || r.pubkey.slice(0,10)+'…'
            const rTime = (() => { const s=Math.floor(Date.now()/1000)-r.created_at; if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' })()
            return (
              <div key={r.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid '+S2.border }}>
                {rp.picture ? <img src={rp.picture} onError={e=>e.target.style.display='none'} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'1px solid '+S2.border, flexShrink:0 }}/> : <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'1px solid '+S2.border, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:'0.9rem', color:S2.gold, flexShrink:0 }}>{rName[0].toUpperCase()}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', fontWeight:700, color:S2.cream }}>{rName}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.45rem', color:'rgba(201,168,76,0.3)' }}>{rTime}</span>
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'0.9rem', color:'rgba(245,236,215,0.75)', lineHeight:1.55 }}>{r.content}</div>
                </div>
              </div>
            )
          })}
        </div>
        {user && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid '+S2.border, flexShrink:0, paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write a reply…" rows={2} style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid '+S2.border, borderRadius:10, padding:'10px 12px', color:S2.cream, fontFamily:'Cormorant Garamond,serif', fontSize:'0.95rem', outline:'none', resize:'none', lineHeight:1.5 }}/>
              <button onClick={postReply} disabled={posting||!text.trim()} style={{ padding:'10px 16px', borderRadius:10, background:text.trim()?'linear-gradient(135deg,#C9A84C,#E8C96A)':'rgba(201,168,76,0.1)', border:'none', cursor:text.trim()?'pointer':'not-allowed', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.7rem', color:text.trim()?'#0D0B06':'rgba(245,236,215,0.3)', flexShrink:0 }}>
                {posting ? <Loader size={13} style={{animation:'spin 1s linear infinite'}}/> : postedOk ? '✓' : 'Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Feed({ user }) {
  const _prefs         = loadFeedPrefs()
  const initSource     = _prefs.source     || 'satscode'
  const initCustomTag  = _prefs.customTag  || ''
  const initTypeFilter = _prefs.typeFilter || 'all'

  const [source,          setSource]         = useState(initSource)
  const [typeFilter,      setTypeFilter]      = useState(initTypeFilter)
  const [posts,           setPosts]           = useState(feedCache[initSource]?.posts    || feedCache.satscode.posts)
  const [profiles,        setProfiles]        = useState(feedCache[initSource]?.profiles || feedCache.satscode.profiles)
  const [loading,         setLoading]         = useState((feedCache[initSource]?.posts   || feedCache.satscode.posts).length === 0)
  const [newPosts,        setNewPosts]        = useState([])
  const [showCompose,     setShowCompose]     = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [activeDMPeer,    setActiveDMPeer]    = useState(null)
  const [activeThread,    setActiveThread]    = useState(null)
  const [showSourceMenu,  setShowSourceMenu]  = useState(false)
  const [customTag,       setCustomTag]       = useState(initCustomTag)
  const [customTagInput,  setCustomTagInput]  = useState('')
  const isInitial = useRef((feedCache[initSource]?.posts || feedCache.satscode.posts).length === 0)

  const TYPE_TABS = [
    { id: 'all',       label: 'All',        Icon: null   },
    { id: 'ship',      label: 'Ships',      Icon: Wrench },
    { id: 'bounty',    label: 'Bounties',   Icon: Zap    },
    { id: 'milestone', label: 'Milestones', Icon: Trophy },
  ]

  // ── Live kind:5 deletion watcher ─────────────────────────────────────────────
  useEffect(() => {
    const pool = getPool()
    const sub = pool.subscribe(RELAYS, { kinds:[5], since: Math.floor(Date.now()/1000) - 60 }, {
      onevent(e) {
        const ids = (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).map(t=>t[1])
        if (!ids.length) return
        setPosts(prev => prev.filter(p => !ids.includes(p.id)))
        setNewPosts(prev => prev.filter(p => !ids.includes(p.id)))
        Object.values(feedCache).forEach(cache => {
          cache.posts = cache.posts.filter(p => !ids.includes(p.id))
          ids.forEach(id => cache.seenIds.delete(id))
        })
      },
      oneose() {}
    })
    return () => { try { sub.close() } catch {} }
  }, [])

  const switchSource = (newSource) => {
    if (newSource === source) return
    setNewPosts([]); setSource(newSource)
    saveFeedPrefs({ ...loadFeedPrefs(), source: newSource })
    const cached = feedCache[newSource] || feedCache.satscode
    setPosts(cached.posts); setProfiles(cached.profiles)
    setLoading(cached.posts.length === 0); isInitial.current = cached.posts.length === 0
    setShowSourceMenu(false)
  }

  const applyCustomTag = () => {
    if (!customTagInput.trim()) return
    const tag = customTagInput.trim().replace(/^#/, '')
    setCustomTag(tag)
    saveFeedPrefs({ ...loadFeedPrefs(), source: 'custom', customTag: tag })
    feedCache.custom = { posts: [], profiles: {}, seenIds: new Set() }
    switchSource('custom'); setCustomTagInput('')
  }

  const fetchProfiles = (pubkeys, src) => {
    const cache = feedCache[src] || feedCache.satscode
    const missing = pubkeys.filter(pk => !cache.profiles[pk])
    if (!missing.length) return
    const sub = getPool().subscribe(RELAYS, { kinds:[0], authors:missing, limit:missing.length }, {
      onevent(e) {
        try { const p=JSON.parse(e.content); cache.profiles[e.pubkey]=p; setProfiles(prev=>({...prev,[e.pubkey]:p})) } catch {}
      },
      oneose() { sub.close() },
    })
  }

  useEffect(() => {
    const pool = getPool()
    const cacheKey = source === 'custom' ? 'custom' : source
    const cache = feedCache[cacheKey] || feedCache.satscode
    const now = Math.floor(Date.now() / 1000)

    // ── Following feed ──────────────────────────────────────────────────────────
    if (source === 'following') {
      const myPubkey = (() => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } })()
      if (!myPubkey) { setLoading(false); return }
      let best = null
      const k3sub = pool.subscribe(RELAYS, { kinds:[3], authors:[myPubkey], limit:1 }, {
        onevent(e) { if (!best || e.created_at > best.created_at) best = e },
        oneose() {
          k3sub.close()
          const contacts = best ? (best.tags||[]).filter(t=>t[0]==='p'&&t[1]).map(t=>t[1]) : []
          if (!contacts.length) { setLoading(false); return }
          fetchProfiles(contacts, 'following')
          // Past posts
          const pastSub = pool.subscribe(RELAYS, { kinds:[1], authors:contacts, since: now - 86400*7, limit:100 }, {
            onevent(event) {
              if (!event.content?.trim() || cache.seenIds.has(event.id)) return
              cache.seenIds.add(event.id)
              fetchProfiles([event.pubkey], 'following')
              cache.posts = [...cache.posts, event].sort((a,b)=>b.created_at-a.created_at).slice(0,100)
              setPosts([...cache.posts])
            },
            oneose() { pastSub.close(); setLoading(false) }
          })
          // Live posts — persistent, never closed
          pool.subscribe(RELAYS, { kinds:[1], authors:contacts, since: now }, {
            onevent(event) {
              if (!event.content?.trim() || cache.seenIds.has(event.id)) return
              cache.seenIds.add(event.id)
              fetchProfiles([event.pubkey], 'following')
              cache.posts = [event, ...cache.posts].slice(0,100)
              setNewPosts(prev => [event, ...prev])
            },
            oneose() {} // intentionally keep alive
          })
        }
      })
      setTimeout(() => { try{k3sub.close()}catch{}; setLoading(false) }, 8000)
      return
    }

    // ── Tag-based feeds (satscode / bitcoin / custom) ─────────────────────────
    const filter =
      source === 'satscode'            ? { kinds:[1], '#t':['satscode'], since: now - 86400*3, limit:50 } :
      source === 'bitcoin'             ? { kinds:[1], '#t':['bitcoin'],  since: now - 86400,   limit:50 } :
      source === 'custom' && customTag ? { kinds:[1], '#t':[customTag],  since: now - 86400*7, limit:50 } :
      null

    if (!filter) { setLoading(false); return }

    let batchTimer
    const batch = []
    const deletedIds = new Set()

    // Shared event handler — used by both past and live subs
    const handleEvent = (event, isLive) => {
      // ── Dedup first — blocks all relay echoes ──────────────────────────────
      if (cache.seenIds.has(event.id)) return
      cache.seenIds.add(event.id)

      if (!event.content?.trim()) return
      if (HIDDEN_PREFIXES.some(p => event.content.startsWith(p))) return
      if (deletedIds.has(event.id)) return
      const evTags = (event.tags || []).map(t => t[1] || '')
      if (evTags.includes('satscode-registry')) return
      if (evTags.includes('bounty-claim')) return
      if (evTags.includes('bounty-accepted')) return
      if (evTags.includes('satscode-tool')) return

      // Deletion marker
      if (event.content.startsWith('DELETED:')) {
        const refIds = (event.tags||[]).filter(t=>t[0]==='e'&&t[1]).map(t=>t[1])
        if (refIds.length) {
          refIds.forEach(id => { deletedIds.add(id); cache.seenIds.delete(id) })
          cache.posts = cache.posts.filter(p => !refIds.includes(p.id))
          setPosts(prev => prev.filter(p => !refIds.includes(p.id)))
          setNewPosts(prev => prev.filter(p => !refIds.includes(p.id)))
        }
        return
      }

      if (isLive) {
        // Live event — show in "new posts" banner
        cache.posts = [event, ...cache.posts].slice(0, 100)
        setNewPosts(prev => [event, ...prev])
      } else {
        // Historic batch — collect and flush together
        batch.push(event)
        clearTimeout(batchTimer)
        batchTimer = setTimeout(() => {
          const toAdd = batch.splice(0)
          cache.posts = [...cache.posts, ...toAdd].sort((a,b)=>b.created_at-a.created_at).slice(0,100)
          setPosts([...cache.posts])
          fetchProfiles(toAdd.map(e=>e.pubkey), cacheKey)
        }, 300)
      }
    }

    let pastSub, liveSub, delSub

    const startSubs = () => {
      // ── Past posts sub — closes after EOSE ───────────────────────────────
      pastSub = pool.subscribe(RELAYS, filter, {
        onevent(event) { handleEvent(event, false) },
        oneose() {
          setLoading(false)
          if (batch.length) {
            const toAdd = batch.splice(0)
            cache.posts = [...cache.posts, ...toAdd].sort((a,b)=>b.created_at-a.created_at).slice(0,100)
            setPosts([...cache.posts])
            fetchProfiles(toAdd.map(e=>e.pubkey), cacheKey)
          } else {
            fetchProfiles(cache.posts.map(e=>e.pubkey), cacheKey)
          }
          try { pastSub.close() } catch {}

          // ── Live sub — starts from NOW, never closed ──────────────────────
          liveSub = pool.subscribe(RELAYS, { ...filter, since: Math.floor(Date.now()/1000), limit: undefined }, {
            onevent(event) { handleEvent(event, true) },
            oneose() {} // intentionally keep alive
          })
        },
      })
    }

    // Fetch deletions first, then start feeds
    delSub = pool.subscribe(RELAYS, { kinds:[5], since: now - 86400*30, limit:500 }, {
      onevent(e) { (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).forEach(t=>deletedIds.add(t[1])) },
      oneose() { try{delSub.close()}catch{}; startSubs() }
    })

    const timeout = setTimeout(() => setLoading(false), 12000)
    return () => {
      clearTimeout(batchTimer)
      clearTimeout(timeout)
      try { delSub?.close()  } catch {}
      try { pastSub?.close() } catch {}
      try { liveSub?.close() } catch {}
    }
  }, [source, customTag])

  const loadNew = () => {
    setPosts(prev => [...newPosts, ...prev].sort((a,b)=>b.created_at-a.created_at))
    fetchProfiles(newPosts.map(e=>e.pubkey), source)
    setNewPosts([])
  }

  const filtered = typeFilter === 'all' ? posts : posts.filter(p => detectType(p.content, p.tags||[]) === typeFilter)
  const sourceLabel = source === 'custom' && customTag ? `#${customTag}` : SOURCES.find(s=>s.id===source)?.label || '#satscode'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea::placeholder { color: rgba(245,236,215,0.2) !important; }
      `}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.8rem', fontWeight: 700, color: S.cream, marginBottom: 4 }}>Guild <span style={{ color: S.gold, fontStyle: 'italic' }}>Feed</span></h1>
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.1em' }}>// live · powered by nostr</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowSourceMenu(!showSourceMenu)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', fontWeight: 500, color: S.gold, transition: 'all .2s' }}>
              <SlidersHorizontal size={13}/> {sourceLabel} <ChevronDown size={12}/>
            </button>
            {showSourceMenu && (
              <>
                <div onClick={() => setShowSourceMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }}/>
                <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 100, background: S.card2, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 10, overflow: 'hidden', minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp .15s ease' }}>
                  {SOURCES.map(s => { const Icon = s.icon; return (
                    <button key={s.id} onClick={() => switchSource(s.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: source===s.id?'rgba(201,168,76,0.1)':'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.75rem', fontWeight: source===s.id?600:400, color: source===s.id?S.gold:S.creamFaint, borderLeft: source===s.id?`2px solid ${S.gold}`:'2px solid transparent', transition: 'all .15s' }}>
                      <Icon size={14}/> {s.label}
                    </button>
                  )})}
                  <div style={{ padding: '10px 12px', borderTop: `1px solid ${S.border}` }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.35)', marginBottom: 6 }}>// custom hashtag</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={customTagInput} onChange={e=>setCustomTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyCustomTag()} placeholder="#tag"
                        style={{ flex:1, background:'rgba(255,255,255,0.03)', border:`1px solid rgba(201,168,76,0.2)`, borderRadius:6, padding:'7px 10px', outline:'none', fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', color:S.cream }}/>
                      <button onClick={applyCustomTag} style={{ background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:6, padding:'7px 10px', cursor:'pointer', color:S.bg, fontFamily:'Montserrat,sans-serif', fontSize:'0.65rem', fontWeight:700 }}>Go</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, marginBottom: 16 }}>
          {TYPE_TABS.map(t => (
            <button key={t.id} onClick={() => { setTypeFilter(t.id); saveFeedPrefs({...loadFeedPrefs(), typeFilter: t.id}) }} style={{ background: 'none', border: 'none', fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', fontWeight: typeFilter===t.id?600:400, letterSpacing: '0.08em', textTransform: 'uppercase', color: typeFilter===t.id?S.gold:S.creamFaint, padding: '10px 12px', cursor: 'pointer', borderBottom: typeFilter===t.id?`2px solid ${S.gold}`:'2px solid transparent', marginBottom: -1, transition: 'all .2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.Icon && <t.Icon size={12}/>}{t.label}
            </button>
          ))}
        </div>

        {/* New posts banner */}
        {newPosts.length > 0 && (
          <button onClick={loadNew} style={{ width: '100%', background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.35)`, color: S.gold, padding: 10, borderRadius: 10, fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RefreshCw size={13}/>{newPosts.length} new post{newPosts.length>1?'s':''} — tap to load
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader size={22} color={S.gold} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}/>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.8rem', color: S.creamFaint, marginBottom: 6 }}>Connecting to Nostr relays…</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.2)' }}>{RELAYS[0]}</div>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Zap size={36} color={S.goldDark} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}/>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem', color: S.creamDim, marginBottom: 8 }}>{typeFilter!=='all'?`No ${typeFilter}s yet`:'No posts yet'}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.62rem', color: 'rgba(201,168,76,0.3)' }}>// be the first — tap + to post</div>
          </div>
        )}

        {/* Posts */}
        {filtered.map(e =>
          <PostCard key={e.id} event={e} profiles={profiles}
            onAvatarClick={(pk,pr) => setSelectedProfile({pubkey:pk, profile:pr})}
            onDM={(pk,pr) => setActiveDMPeer({pubkey:pk, profile:pr})}
            onComment={(ev) => setActiveThread(ev)}
          />
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowCompose(true)} style={{ position: 'fixed', bottom: 88, right: 20, width: 54, height: 54, borderRadius: '50%', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 28px rgba(201,168,76,0.45)', zIndex: 80, transition: 'transform .3s' }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <Plus size={24} color={S.bg} strokeWidth={2.5}/>
      </button>

      {selectedProfile && <ProfileModal pubkey={selectedProfile.pubkey} onClose={()=>setSelectedProfile(null)} onDM={(pk,pr)=>{setSelectedProfile(null);setActiveDMPeer({pubkey:pk,profile:pr})}}/>}
      {activeThread && <ThreadSheet event={activeThread} profiles={profiles} user={user} onClose={()=>setActiveThread(null)}/>}
      {activeDMPeer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0D0B06' }}>
          <MessagesPage user={user} initialPeer={activeDMPeer.pubkey} initialProfile={activeDMPeer.profile} onClose={()=>setActiveDMPeer(null)}/>
          <button onClick={()=>setActiveDMPeer(null)} style={{ position: 'fixed', top: 14, right: 16, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 400, color: 'rgba(245,236,215,0.5)' }}><X size={16}/></button>
        </div>
      )}
      {showCompose && <ComposeModal user={user} profiles={profiles} onClose={()=>setShowCompose(false)} onPublished={(e)=>setPosts(prev=>[e,...prev])}/>}
    </>
  )
}
