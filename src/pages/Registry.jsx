import { useState, useEffect, useRef } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import ProfileModal from './ProfileModal'
import BuilderProfile from './BuilderProfile'
import {
  Search, Loader, Zap, X, Users, CheckCircle,
  Plus, Code2, Globe, Send, AlertCircle, RefreshCw
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
  border: 'rgba(201,168,76,0.12)', borderMid: 'rgba(201,168,76,0.28)',
  borderHover: 'rgba(201,168,76,0.4)',
  green: '#22c55e', red: '#ef4444',
}

const REGISTRY_TAG = 'satscode-registry'

const ALL_SKILLS = [
  { id: 'bitcoin',    label: 'Bitcoin',    color: '#C9A84C' },
  { id: 'nostr',      label: 'Nostr',      color: '#A78BFA' },
  { id: 'lightning',  label: 'Lightning',  color: '#FCD34D' },
  { id: 'react',      label: 'React',      color: '#61DAFB' },
  { id: 'rust',       label: 'Rust',       color: '#F97316' },
  { id: 'python',     label: 'Python',     color: '#3B82F6' },
  { id: 'typescript', label: 'TypeScript', color: '#60A5FA' },
  { id: 'solidity',   label: 'Solidity',   color: '#9CA3AF' },
  { id: 'design',     label: 'Design',     color: '#EC4899' },
  { id: 'mobile',     label: 'Mobile',     color: '#8B5CF6' },
  { id: 'web',        label: 'Web',        color: '#22C55E' },
  { id: 'devops',     label: 'DevOps',     color: '#F59E0B' },
]

let _pool = null
const getPool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

const getCached = pk => {
  try {
    const r = localStorage.getItem('satscode_prof_' + pk)
    if (!r) return null
    const { data, ts } = JSON.parse(r)
    return Date.now() - ts < 3_600_000 ? data : null
  } catch { return null }
}
const setCache = (pk, data) => {
  try { localStorage.setItem('satscode_prof_' + pk, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const shortNpub = n => n ? n.slice(0, 10) + '\u2026' + n.slice(-4) : ''

function parseRegistrationNote(content) {
  const lines = content.split('\n')
  const data = {}
  for (const line of lines) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const val = line.slice(colon + 1).trim()
    if (key && val) data[key] = val
  }
  return {
    npub:   data.npub   || '',
    skills: data.skills ? data.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [],
    github: data.github || '',
    bio:    data.bio    || '',
  }
}

function Avatar({ profile, pubkey, size }) {
  size = size || 48
  const [err, setErr] = useState(false)
  const letter = ((profile && (profile.name || profile.display_name)) || pubkey || '?')[0].toUpperCase()
  if (profile && profile.picture && !err) {
    return (
      <img src={profile.picture} alt={letter} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(201,168,76,0.25)' }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(201,168,76,0.08)', border: '2px solid rgba(201,168,76,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cormorant Garamond,serif', fontSize: size * 0.38, fontWeight: 600, color: S.gold,
    }}>{letter}</div>
  )
}

function SkillPill({ id, active, onClick, small }) {
  const skill = ALL_SKILLS.find(s => s.id === id) || { label: id, color: S.gold }
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '3px 8px' : '4px 10px',
      borderRadius: 20,
      background: active ? skill.color + '18' : 'rgba(255,255,255,0.02)',
      border: '1px solid ' + (active ? skill.color + '55' : S.border),
      cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'Montserrat,sans-serif',
      fontSize: small ? '0.55rem' : '0.6rem',
      fontWeight: 600, letterSpacing: '0.04em',
      color: active ? skill.color : S.creamFaint,
      transition: 'all .18s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { if (onClick && !active) { e.currentTarget.style.borderColor = skill.color + '44'; e.currentTarget.style.color = skill.color } }}
      onMouseLeave={e => { if (onClick && !active) { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.creamFaint } }}
    >
      {skill.label}
    </button>
  )
}

function BuilderCard({ builder, profile, onClick, onAvatarClick }) {
  const name = (profile && (profile.name || profile.display_name)) || shortNpub(builder.npub)
  const bio  = builder.bio || (profile && profile.about) || ''

  return (
    <div onClick={onClick} style={{
      background: S.card, border: '1px solid ' + S.border,
      borderRadius: 14, padding: '16px 16px 13px',
      cursor: 'pointer', transition: 'all .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = S.borderMid; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <div onClick={e => { e.stopPropagation(); onAvatarClick && onAvatarClick(builder.pubkeyHex, profile) }} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <Avatar profile={profile} pubkey={builder.npub} size={46} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.88rem', fontWeight: 700, color: S.cream }}>{name}</span>
            {profile && profile.nip05 && <CheckCircle size={11} color={S.gold} />}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(201,168,76,0.28)', marginBottom: bio ? 5 : 0 }}>
            {shortNpub(builder.npub)}
          </div>
          {bio ? (
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.9rem', fontWeight: 300, color: S.creamFaint, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {bio}
            </div>
          ) : null}
        </div>
      </div>

      {builder.skills && builder.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {builder.skills.slice(0, 6).map(s => <SkillPill key={s} id={s} active small />)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid ' + S.border, paddingTop: 10 }}>
        {builder.github && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(201,168,76,0.3)' }}>
            <Code2 size={9} />
            {builder.github.replace('https://github.com/', 'github/')}
          </span>
        )}
        {profile && profile.lud16 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(34,197,94,0.45)' }}>
            <Zap size={9} /> lightning
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'Montserrat,sans-serif', fontSize: '0.6rem', color: S.gold, fontWeight: 600 }}>View →</span>
      </div>
    </div>
  )
}

function RegisterModal({ user, onClose, onSuccess }) {
  const [npubInput, setNpubInput] = useState((user && user.npub) || '')
  const [bio,       setBio]       = useState('')
  const [github,    setGithub]    = useState('')
  const [skills,    setSkills]    = useState([])
  const [status,    setStatus]    = useState('idle')
  const [errMsg,    setErrMsg]    = useState('')

  const toggleSkill = s => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const publish = async () => {
    if (!npubInput.trim())  { setErrMsg('Paste your npub'); return }
    if (skills.length === 0) { setErrMsg('Select at least one skill'); return }
    const nsec = localStorage.getItem('satscode_nsec')
    if (!nsec) { setErrMsg('Log in with your private key first'); return }

    setStatus('publishing'); setErrMsg('')
    try {
      const { data: skBytes } = nip19.decode(nsec.trim())
      const lines = ['npub: ' + npubInput.trim(), 'skills: ' + skills.join(', ')]
      if (github.trim()) lines.push('github: ' + github.trim())
      if (bio.trim())    lines.push('bio: ' + bio.trim())

      const ev = finalizeEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['t', REGISTRY_TAG], ['t', 'satscode']],
        content: lines.join('\n'),
      }, skBytes)

      await Promise.any(getPool().publish(RELAYS, ev))
      setStatus('done')
      setTimeout(() => { onSuccess(); onClose() }, 1600)
    } catch (e) {
      setErrMsg(e.message || 'Publish failed')
      setStatus('err')
    }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{
        width: '100%', background: S.card2,
        borderRadius: '20px 20px 0 0',
        border: '1px solid ' + S.borderMid,
        borderBottom: 'none', borderLeft: 'none', borderRight: 'none',
        padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 48px)',
        animation: 'slideUp .28s cubic-bezier(0.4,0,0.2,1)',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} input::placeholder,textarea::placeholder{color:rgba(201,168,76,0.18)!important}`}</style>

        <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />

        <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.5rem', fontWeight: 700, color: S.cream, margin: '0 0 4px' }}>Join the Registry</h2>
        <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', color: S.creamFaint, margin: '0 0 22px' }}>
          Your registration is a Nostr note — permanent, decentralized, yours.
        </p>

        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>// your npub *</label>
        <input value={npubInput} onChange={e => setNpubInput(e.target.value)} placeholder="npub1…"
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.02)', border: '1px solid ' + S.border, borderRadius: 10, padding: '11px 13px', color: S.cream, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.72rem', outline: 'none', marginBottom: 14 }}
          onFocus={e => e.target.style.borderColor = S.borderMid} onBlur={e => e.target.style.borderColor = S.border}
        />

        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>// skills * (tap all that apply)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {ALL_SKILLS.map(s => <SkillPill key={s.id} id={s.id} active={skills.includes(s.id)} onClick={() => toggleSkill(s.id)} />)}
        </div>

        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>// github profile</label>
        <input value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/yourname"
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.02)', border: '1px solid ' + S.border, borderRadius: 10, padding: '11px 13px', color: S.cream, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.72rem', outline: 'none', marginBottom: 14 }}
          onFocus={e => e.target.style.borderColor = S.borderMid} onBlur={e => e.target.style.borderColor = S.border}
        />

        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>// what you build</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
          placeholder="Building a self-custody Bitcoin wallet for mobile…"
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.02)', border: '1px solid ' + S.border, borderRadius: 10, padding: '11px 13px', color: S.cream, fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontWeight: 300, fontSize: '1rem', lineHeight: 1.6, outline: 'none', resize: 'none', marginBottom: 20 }}
          onFocus={e => e.target.style.borderColor = S.borderMid} onBlur={e => e.target.style.borderColor = S.border}
        />

        {errMsg !== '' && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, marginBottom: 14, fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', color: S.red, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} /> {errMsg}
          </div>
        )}

        {status === 'done' && (
          <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, marginBottom: 14, fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', color: S.green, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={13} /> Registered! You will appear in the registry shortly.
          </div>
        )}

        <button onClick={publish} disabled={status === 'publishing' || status === 'done'} style={{
          width: '100%', padding: '13px', borderRadius: 11, border: 'none',
          cursor: (status === 'idle' || status === 'err') ? 'pointer' : 'not-allowed',
          background: status === 'done' ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg,' + S.gold + ',' + S.goldLight + ')',
          fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.82rem',
          color: status === 'done' ? S.green : S.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .2s',
        }}>
          {status === 'publishing'
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Publishing to Nostr…</>
            : status === 'done'
            ? <><CheckCircle size={15} /> Registered!</>
            : <><Send size={15} /> Publish Registration</>
          }
        </button>

        <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.18)', textAlign: 'center', marginTop: 14, lineHeight: 1.8 }}>
          // publishes a kind:1 note tagged #satscode-registry to Nostr relays<br/>
          // no servers · no databases · fully decentralized
        </p>
      </div>
    </div>
  )
}

export default function Registry({ user }) {
  const [builders,     setBuilders]     = useState([])
  const [profiles,     setProfiles]     = useState({})
  const [loading,      setLoading]      = useState(true)
  const [query,        setQuery]        = useState('')
  const [activeSkills, setActiveSkills] = useState([])
  const [showRegister,    setShowRegister]    = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null) // { pubkey, profile }
  const [viewBuilder,     setViewBuilder]     = useState(null)  // builder object to view full profile
  const seenEvents  = useRef(new Set())
  const buildersRef = useRef([])

  const load = () => {
    setLoading(true)
    seenEvents.current = new Set()
    buildersRef.current = []
    setBuilders([])
    setProfiles({})

    const pool = getPool()
    const sub = pool.subscribe(
      RELAYS,
      { kinds: [1], '#t': [REGISTRY_TAG], limit: 500 },
      {
        onevent(e) {
          if (seenEvents.current.has(e.id)) return
          seenEvents.current.add(e.id)

          const parsed = parseRegistrationNote(e.content)
          if (!parsed.npub) return

          let pubkeyHex = ''
          try {
            const dec = nip19.decode(parsed.npub.trim())
            if (dec.type !== 'npub') return
            pubkeyHex = dec.data
          } catch { return }

          const entry = { ...parsed, pubkeyHex, eventId: e.id, eventTs: e.created_at }
          const idx = buildersRef.current.findIndex(b => b.pubkeyHex === pubkeyHex)
          if (idx >= 0) {
            if (e.created_at > buildersRef.current[idx].eventTs) buildersRef.current[idx] = entry
          } else {
            buildersRef.current.push(entry)
          }
          setBuilders([...buildersRef.current])

          const cached = getCached(pubkeyHex)
          if (cached) {
            setProfiles(p => ({ ...p, [pubkeyHex]: cached }))
          } else {
            const psub = pool.subscribe(RELAYS, { kinds: [0], authors: [pubkeyHex], limit: 1 }, {
              onevent(pe) {
                try {
                  const prof = JSON.parse(pe.content)
                  setCache(pubkeyHex, prof)
                  setProfiles(p => ({ ...p, [pubkeyHex]: prof }))
                } catch {}
              },
              oneose() { psub.close() }
            })
          }
        },
        oneose() { sub.close(); setLoading(false) }
      }
    )
    setTimeout(() => { try { sub.close() } catch {}; setLoading(false) }, 10000)
  }

  useEffect(() => { load() }, [])

  const filtered = builders.filter(b => {
    const profile = profiles[b.pubkeyHex] || {}
    const name = ((profile.name || profile.display_name) || '').toLowerCase()
    const bio  = (b.bio || profile.about || '').toLowerCase()
    const npub = (b.npub || '').toLowerCase()
    if (activeSkills.length > 0 && !activeSkills.every(s => b.skills && b.skills.includes(s))) return false
    if (query) {
      const q = query.toLowerCase()
      if (!name.includes(q) && !bio.includes(q) && !npub.includes(q)) return false
    }
    return true
  })

  const toggleSkill = s => setActiveSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const hasFilters  = activeSkills.length > 0 || query !== ''

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 14px 100px' }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
        input::placeholder,textarea::placeholder { color: rgba(201,168,76,0.18) !important }
      `}</style>

      <div style={{ padding: '20px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.8rem', fontWeight: 700, color: S.cream, margin: 0 }}>Builder Registry</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading
              ? <Loader size={14} color={S.gold} style={{ animation: 'spin 1s linear infinite' }} />
              : <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(201,168,76,0.3)', display: 'flex', padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = S.gold}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.3)'}
                ><RefreshCw size={15} /></button>
            }
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.28)' }}>
              {filtered.length}/{builders.length}
            </span>
          </div>
        </div>
        <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', color: S.creamFaint, margin: 0 }}>
          Bitcoin and Nostr builders, self-registered on-chain
        </p>
      </div>

      <button onClick={() => setShowRegister(true)} style={{
        width: '100%', padding: '12px', borderRadius: 11,
        border: '1px solid ' + S.borderMid,
        background: 'rgba(201,168,76,0.04)', cursor: 'pointer', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.78rem',
        color: S.gold, transition: 'all .2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.borderColor = S.borderHover }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; e.currentTarget.style.borderColor = S.borderMid }}
      >
        <Plus size={15} /> Add yourself to the registry
      </button>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} color='rgba(201,168,76,0.28)' style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, bio, npub…"
          style={{ width: '100%', boxSizing: 'border-box', background: S.card, border: '1px solid ' + (query ? S.borderMid : S.border), borderRadius: 10, padding: '10px 36px', color: S.cream, fontFamily: 'Montserrat,sans-serif', fontSize: '0.8rem', outline: 'none', transition: 'border-color .2s' }}
          onFocus={e => e.target.style.borderColor = S.borderMid} onBlur={e => e.target.style.borderColor = query ? S.borderMid : S.border}
        />
        {query !== '' && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: S.creamFaint, display: 'flex', padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {ALL_SKILLS.map(s => (
          <SkillPill key={s.id} id={s.id} active={activeSkills.includes(s.id)} onClick={() => toggleSkill(s.id)} small />
        ))}
        {hasFilters && (
          <button onClick={() => { setActiveSkills([]); setQuery('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.55rem', fontWeight: 600, color: S.red }}>
            <X size={9} /> Clear
          </button>
        )}
      </div>

      {loading && builders.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: S.card, border: '1px solid ' + S.border, borderRadius: 14, height: 116, animation: 'pulse 1.6s ease infinite', animationDelay: (i * 0.15) + 's' }} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp .4s ease' }}>
          <Users size={34} style={{ display: 'block', margin: '0 auto 14px', opacity: 0.2, color: S.gold }} />
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem', fontStyle: 'italic', fontWeight: 300, color: S.creamFaint, marginBottom: 8 }}>
            {hasFilters ? 'No builders match these filters' : 'No builders registered yet'}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.2)', marginBottom: 20 }}>
            {hasFilters ? '// try clearing the filters' : '// be the first to add yourself'}
          </div>
          {!hasFilters && (
            <button onClick={() => setShowRegister(true)} style={{ background: 'linear-gradient(135deg,' + S.gold + ',' + S.goldLight + ')', border: 'none', borderRadius: 10, padding: '11px 24px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.78rem', color: S.bg }}>
              Join the Registry
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(builder => (
          <BuilderCard
            key={builder.pubkeyHex}
            builder={builder}
            profile={profiles[builder.pubkeyHex] || {}}
            onClick={() => setViewBuilder({ builder, profile: profiles[builder.pubkeyHex] || {} })}
            onAvatarClick={(pk, pr) => setSelectedProfile({ pubkey: pk, profile: pr })}
          />
        ))}
      </div>

      {showRegister && (
        <RegisterModal user={user} onClose={() => setShowRegister(false)} onSuccess={load} />
      )}

      {selectedProfile && (
        <ProfileModal
          pubkey={selectedProfile.pubkey}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      {viewBuilder && (
        <BuilderProfile
          npub={viewBuilder.builder.npub}
          builder={viewBuilder.builder}
          initialProfile={viewBuilder.profile}
          onClose={() => setViewBuilder(null)}
        />
      )}
    </div>
  )
}

