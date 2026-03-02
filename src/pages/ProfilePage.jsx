import { useState, useEffect } from 'react'
import { nip19 } from 'nostr-tools'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import {
  Edit2, RefreshCw, Loader, Eye, EyeOff,
  Copy, CheckCircle, Send, Key, Lock, ExternalLink, Zap
} from 'lucide-react'

// ── NIP-98 signed upload cascade ─────────────────────────────────────────────
async function uploadImageWithNip98(file) {
  const PROVIDERS = [
    { name: 'nostr.build',    url: 'https://nostr.build/api/v2/upload/files',  field: 'fileToUpload',  getUrl: j => j?.data?.[0]?.url,            auth: true  },
    { name: 'nostrcheck.me', url: 'https://nostrcheck.me/api/v2/media',        field: 'uploadedfile',  getUrl: j => j?.url || j?.data?.url,        auth: true  },
    { name: 'nostr.build (legacy)', url: 'https://nostr.build/api/upload/image', field: 'fileToUpload', getUrl: j => j?.data?.display_url || j?.data?.url, auth: false },
  ]

  for (const p of PROVIDERS) {
    try {
      const formData = new FormData()
      formData.append(p.field, file)
      const headers = {}
      if (p.auth) {
        try {
          const nsec = localStorage.getItem('satscode_nsec')
          if (nsec) {
            const { finalizeEvent } = await import('nostr-tools/pure')
            const { nip19 } = await import('nostr-tools')
            const { data } = nip19.decode(nsec.trim())
            const ev = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now()/1000), tags: [['u', p.url], ['method', 'POST']], content: '' }, data)
            headers['Authorization'] = 'Nostr ' + btoa(JSON.stringify(ev))
          }
        } catch {}
      }
      const res = await fetch(p.url, { method: 'POST', headers, body: formData })
      if (!res.ok) continue
      const json = await res.json()
      const url = p.getUrl(json)
      if (url) return url
    } catch {}
  }
  throw new Error('All upload providers failed — check connection')
}



const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', card: '#111009', card2: '#161209',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.72)',
  creamFaint: 'rgba(245,236,215,0.35)',
  border: 'rgba(201,168,76,0.12)', borderMid: 'rgba(201,168,76,0.28)',
  green: '#22c55e', red: '#ef4444',
}

const nsecToBytes = (nsec) => {
  const { type, data } = nip19.decode(nsec.trim())
  if (type !== 'nsec') throw new Error('Not an nsec key')
  return data
}

function Avatar({ profile = {}, pubkey = '', size = 86 }) {
  const [imgErr, setImgErr] = useState(false)
  const letter = (profile.name || profile.display_name || pubkey || '?').slice(0, 1).toUpperCase()
  if (profile.picture && !imgErr) {
    return (
      <img src={profile.picture} alt={letter}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: `2.5px solid rgba(201,168,76,0.5)`,
          boxShadow: '0 0 32px rgba(201,168,76,0.25)',
          display: 'block',
        }}
        onError={() => setImgErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(201,168,76,0.06)',
      border: `2.5px solid rgba(201,168,76,0.4)`,
      boxShadow: '0 0 32px rgba(201,168,76,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cormorant Garamond,serif',
      fontSize: size * 0.38, fontWeight: 600, color: S.gold,
    }}>
      {letter}
    </div>
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  return (
    <button onClick={copy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: copied ? 'rgba(34,197,94,0.08)' : 'rgba(201,168,76,0.05)',
      border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : S.border}`,
      color: copied ? S.green : S.creamFaint,
      padding: '7px 14px', borderRadius: 7,
      fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', fontWeight: 600,
      cursor: 'pointer', transition: 'all .2s',
    }}>
      {copied ? <CheckCircle size={12}/> : <Copy size={12}/>}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        fontFamily: 'Montserrat,sans-serif', fontSize: '0.6rem',
        fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: S.goldDark, display: 'block', marginBottom: 7,
      }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${S.border}`, borderRadius: 9,
          padding: '11px 13px', color: S.cream,
          fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem',
          outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
        onBlur={e => e.target.style.borderColor = S.border}
      />
    </div>
  )
}

export default function ProfilePage({ user }) {
  const profile = user?.profile || {}
  const npub = user?.npub || ''
  const storedNsec = localStorage.getItem('satscode_nsec') || ''
  const shortNpub = npub ? `${npub.slice(0, 14)}…${npub.slice(-6)}` : 'No key'
  const displayName = profile.name || profile.display_name || 'Anonymous'

  const [editing, setEditing]     = useState(false)
  const [name, setName]           = useState(profile.name || profile.display_name || '')
  const [bio, setBio]             = useState(profile.about || '')
  const [picture, setPicture]     = useState(profile.picture || '')
  const [website, setWebsite]     = useState(profile.website || '')
  const [lud16, setLud16]         = useState(profile.lud16 || '')
  const [saving, setSaving]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg]             = useState(null) // { type: 'ok'|'err', text }
  const [showNsec, setShowNsec]   = useState(false)
  const [uploading, setUploading] = useState(false)

  // Fetch fresh kind:0 from relays on mount
  useEffect(() => {
    if (!user?.pubkey) return
    const pool = new SimplePool()
    const sub = pool.subscribe(RELAYS, { kinds: [0], authors: [user.pubkey], limit: 1 }, {
      onevent(e) {
        try {
          const fresh = JSON.parse(e.content)
          setName(fresh.name || fresh.display_name || '')
          setBio(fresh.about || '')
          setPicture(fresh.picture || '')
          setWebsite(fresh.website || '')
          setLud16(fresh.lud16 || '')
          // Update localStorage silently
          const stored = JSON.parse(localStorage.getItem('satscode_user') || '{}')
          localStorage.setItem('satscode_user', JSON.stringify({ ...stored, profile: fresh }))
        } catch {}
      },
      oneose() { try { sub.close() } catch {} }
    })
    const t = setTimeout(() => { try { sub.close() } catch {} }, 8000)
    return () => { clearTimeout(t); try { sub.close() } catch {} }
  }, [user?.pubkey])

  const uploadAvatar = async (file) => {
    if (!file?.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { setMsg({ type: 'err', text: 'Max 10MB' }); return }
    setUploading(true); setMsg(null)
    try {
      const url = await uploadImageWithNip98(file)
      setPicture(url)
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Avatar upload failed' })
    }
    setUploading(false)
  }

  const save = async () => {
    if (!name.trim()) { setMsg({ type: 'err', text: 'Display name is required' }); return }
    setSaving(true); setMsg(null)
    try {
      const nsec = localStorage.getItem('satscode_nsec')
      if (!nsec) throw new Error('No private key — log out and log in again')
      const profileData = { name: name.trim(), display_name: name.trim(), about: bio.trim(), picture: picture.trim(), website: website.trim(), lud16: lud16.trim() }
      const event = finalizeEvent({
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(profileData),
      }, nsecToBytes(nsec))
      const pool = new SimplePool()
      await Promise.any(pool.publish(RELAYS, event))
      const stored = JSON.parse(localStorage.getItem('satscode_user') || '{}')
      localStorage.setItem('satscode_user', JSON.stringify({ ...stored, profile: profileData }))
      setMsg({ type: 'ok', text: 'Profile published!' })
      setEditing(false)
      // Update local profile state so UI reflects changes immediately — no reload needed
      setProfile(profileData)
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Failed to save' }) }
    setSaving(false)
  }

  const refresh = async () => {
    if (!user?.pubkey) return
    setRefreshing(true); setMsg(null)
    try {
      const pool = new SimplePool()
      const events = await pool.querySync(RELAYS, { kinds: [0], authors: [user.pubkey], limit: 1 })
      if (!events.length) throw new Error('No profile found on relays')
      const fresh = JSON.parse(events[0].content)
      const stored = JSON.parse(localStorage.getItem('satscode_user') || '{}')
      localStorage.setItem('satscode_user', JSON.stringify({ ...stored, profile: fresh }))
      setName(fresh.name || fresh.display_name || '')
      setBio(fresh.about || '')
      setPicture(fresh.picture || '')
      setWebsite(fresh.website || '')
      setLud16(fresh.lud16 || '')
      setMsg({ type: 'ok', text: 'Refreshed from relays!' })
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Could not fetch' }) }
    setRefreshing(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(201,168,76,0.18) !important; }
        input:focus, textarea:focus { border-color: rgba(201,168,76,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 100px' }}>

        {/* ── Profile card ── */}
        <div style={{
          background: S.card,
          border: `1px solid ${S.border}`,
          borderRadius: 16, padding: '28px 24px 24px',
          textAlign: 'center', marginBottom: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Top glow */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(to right,transparent,rgba(201,168,76,0.3),transparent)` }}/>

          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Avatar profile={profile} pubkey={user?.pubkey} size={86}/>
          </div>

          <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.6rem', fontWeight: 600, color: S.cream, marginBottom: 4 }}>
            {displayName}
          </h2>

          {profile.about && (
            <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: S.creamDim, lineHeight: 1.7, marginBottom: 10 }}>
              {profile.about}
            </p>
          )}

          {profile.nip05 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: S.gold, fontFamily: 'Montserrat,sans-serif', marginBottom: 6 }}>
              <CheckCircle size={11}/> {profile.nip05}
            </div>
          )}

          {profile.lud16 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.65rem', color: S.green, fontFamily: 'JetBrains Mono,monospace', marginBottom: 6 }}>
              <Zap size={11}/> {profile.lud16}
            </div>
          )}

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: S.goldDark, fontFamily: 'Montserrat,sans-serif', marginBottom: 10, textDecoration: 'none' }}>
              <ExternalLink size={11}/> {profile.website}
            </a>
          )}

          {/* npub pill */}
          <div style={{
            display: 'inline-block',
            fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem',
            color: 'rgba(201,168,76,0.35)',
            background: 'rgba(201,168,76,0.04)',
            border: `1px solid ${S.border}`,
            borderRadius: 6, padding: '5px 10px', marginTop: 10,
            wordBreak: 'break-all', lineHeight: 1.8,
          }}>
            {npub || 'No key'}
          </div>
        </div>

        {/* ── Keys backup card ── */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '20px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Key size={14} color={S.goldDark}/>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 700, color: S.cream, letterSpacing: '0.05em' }}>
              Your Nostr Keys
            </span>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.62rem', color: S.creamFaint, fontWeight: 400 }}>
              — back these up!
            </span>
          </div>

          {/* Public key */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.green, marginBottom: 8 }}>
              Public Key — safe to share
            </div>
            <div style={{
              background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 9, padding: '10px 12px', marginBottom: 8,
              fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem',
              color: 'rgba(34,197,94,0.7)', wordBreak: 'break-all', lineHeight: 1.7,
            }}>
              {npub || 'Not available'}
            </div>
            <CopyButton text={npub} label="Copy npub"/>
          </div>

          {/* Private key */}
          <div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.red, marginBottom: 8 }}>
              Private Key — NEVER share!
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 9, padding: '10px 44px 10px 12px', minHeight: 44,
                fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem',
                color: 'rgba(239,68,68,0.65)', wordBreak: 'break-all', lineHeight: 1.7,
                display: 'flex', alignItems: 'center',
              }}>
                {showNsec ? (storedNsec || 'Not found — log out and log in again') : '••••••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
              <button onClick={() => setShowNsec(!showNsec)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}>
                {showNsec ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <CopyButton text={storedNsec} label="Copy nsec"/>
            <div style={{
              marginTop: 12, background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.12)',
              borderRadius: 8, padding: '10px 12px',
              fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic',
              fontSize: '0.9rem', fontWeight: 300, color: 'rgba(239,68,68,0.6)', lineHeight: 1.6,
            }}>
              Save your nsec in a password manager. Losing it means losing your account forever — no recovery exists.
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setEditing(!editing)} style={{
            flex: 1, padding: 12, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: editing ? 'transparent' : `linear-gradient(135deg,${S.gold},${S.goldLight})`,
            border: editing ? `1px solid ${S.border}` : 'none',
            color: editing ? S.creamFaint : S.bg,
            transition: 'all .2s',
          }}>
            <Edit2 size={13}/> {editing ? 'Cancel' : 'Edit Profile'}
          </button>

          <button onClick={refresh} disabled={refreshing} style={{
            flex: 1, padding: 12, borderRadius: 10, cursor: refreshing ? 'not-allowed' : 'pointer',
            fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'transparent', border: `1px solid ${S.border}`,
            color: S.creamFaint, opacity: refreshing ? 0.5 : 1, transition: 'all .2s',
          }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
            {refreshing ? 'Fetching…' : 'Refresh'}
          </button>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 14,
            background: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem',
            color: msg.type === 'ok' ? S.green : S.red,
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'fadeUp .3s ease',
          }}>
            {msg.type === 'ok' ? <CheckCircle size={14}/> : null}
            {msg.text}
          </div>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '22px 20px', animation: 'fadeUp .3s ease' }}>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.2rem', fontWeight: 600, color: S.cream, marginBottom: 20 }}>
              Edit Profile
            </div>

            {/* Avatar upload */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <Avatar profile={{ ...profile, picture }} pubkey={user?.pubkey} size={72}/>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    {uploading
                      ? <Loader size={18} color={S.gold} style={{ animation: 'spin 1s linear infinite' }}/>
                      : <Edit2 size={16} color={S.gold}/>
                    }
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => uploadAvatar(e.target.files?.[0])}/>
                </label>
              </div>
            </div>

            <InputField label="Display Name *" value={name} onChange={setName} placeholder="Your name"/>
            <InputField label="Lightning Address" value={lud16} onChange={setLud16} placeholder="you@wallet.com"/>
            <InputField label="Website" value={website} onChange={setWebsite} placeholder="https://…"/>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.goldDark, display: 'block', marginBottom: 7 }}>
                Bio
              </label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the guild about yourself…" rows={3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: `1px solid ${S.border}`, borderRadius: 9, padding: '11px 13px', color: S.cream, fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1rem', fontWeight: 300, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7 }}
              />
            </div>

            <button onClick={save} disabled={saving} style={{
              width: '100%', padding: 14, borderRadius: 10,
              background: saving ? 'rgba(201,168,76,0.3)' : `linear-gradient(135deg,${S.gold},${S.goldLight})`,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .2s',
            }}>
              {saving
                ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }}/> Publishing…</>
                : <><Send size={14}/> Save & Publish</>
              }
            </button>
          </div>
        )}
      </div>
    </>
  )
}

