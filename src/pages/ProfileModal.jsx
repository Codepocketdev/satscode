import { useState, useEffect } from 'react'
import { useFollow } from './useFollow'
import { SimplePool } from 'nostr-tools/pool'
import { nip19 } from 'nostr-tools'
import {
  X, MessageSquare, Zap, Copy, CheckCircle, UserPlus, UserCheck, Loader,
  ExternalLink, QrCode, User
} from 'lucide-react'

const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', card: '#111009', card2: '#161209',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.72)',
  creamFaint: 'rgba(245,236,215,0.35)',
  border: 'rgba(201,168,76,0.12)', borderMid: 'rgba(201,168,76,0.25)',
  green: '#22c55e',
}

function QRCode({ value, size = 200 }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=111009&color=C9A84C&margin=12`}
      alt="QR"
      style={{ width: size, height: size, borderRadius: 12, display: 'block', margin: '0 auto', border: `1px solid ${S.border}` }}
    />
  )
}

function Avatar({ profile = {}, pubkey = '', size = 64 }) {
  const [imgErr, setImgErr] = useState(false)
  const letter = (profile.name || profile.display_name || pubkey || '?').slice(0, 1).toUpperCase()
  if (profile.picture && !imgErr) {
    return (
      <img src={profile.picture} alt={letter}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid rgba(201,168,76,0.4)`, boxShadow: '0 0 24px rgba(201,168,76,0.2)' }}
        onError={() => setImgErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(201,168,76,0.08)',
      border: `2px solid rgba(201,168,76,0.4)`,
      boxShadow: '0 0 24px rgba(201,168,76,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cormorant Garamond,serif',
      fontSize: size * 0.38, fontWeight: 600, color: S.gold,
    }}>
      {letter}
    </div>
  )
}

// ── Slide-up modal (shown when clicking an avatar in the feed) ─────────────────
export default function ProfileModal({ pubkey, onClose, onDM }) {

  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  const { isFollowing, followingCount, followerCount, toggleFollow, publishing, error: followErr } = useFollow(
    (() => { try { return nip19.npubEncode(pubkey) } catch { return null } })(),
    pubkey
  )
  const [copied,      setCopied]      = useState(false)


  const npub = (() => { try { return nip19.npubEncode(pubkey) } catch { return '' } })()
  const shortNpub = npub ? `${npub.slice(0, 12)}…${npub.slice(-6)}` : ''
  const name = profile.name || profile.display_name || shortNpub
  const lnAddress = profile.lud16 || profile.lud06 || null

  useEffect(() => {
    if (!pubkey) return
    const pool = new SimplePool()
    const sub = pool.subscribe(RELAYS, { kinds: [0], authors: [pubkey], limit: 1 }, {
      onevent(e) {
        try { setProfile(JSON.parse(e.content)); setLoading(false) } catch {}
      },
      oneose() { sub.close(); setLoading(false) }
    })
    const t = setTimeout(() => { try { sub.close() } catch {} setLoading(false) }, 6000)
    return () => { clearTimeout(t); try { sub.close() } catch {} }
  }, [pubkey])

  const copy = async () => {
    try { await navigator.clipboard.writeText(npub); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'stretch',
        }}
      >
        {/* Sheet */}
        <div style={{
          width: '100%',
          background: S.card2,
          borderRadius: '20px 20px 0 0',
          border: `1px solid ${S.borderMid}`,
          borderBottom: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 48px)',
          position: 'relative',
          animation: 'slideUp .28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -8px 48px rgba(201,168,76,0.08)',
          marginBottom: '-1px',
        }}>

          {/* Handle */}
          <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.2)', borderRadius: 2, margin: '0 auto 18px' }}/>

          {/* Close */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`,
            color: S.creamFaint, width: 32, height: 32,
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15}/>
          </button>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'profile', label: 'Profile',  Icon: User   },
              { id: 'qr',     label: 'QR Code',   Icon: QrCode },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '9px 8px', borderRadius: 9,
                border: `1px solid ${tab === t.id ? S.gold : S.border}`,
                background: tab === t.id ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'transparent',
                color: tab === t.id ? S.bg : S.creamFaint,
                fontFamily: 'Montserrat,sans-serif',
                fontWeight: tab === t.id ? 700 : 400,
                fontSize: '0.72rem', letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <t.Icon size={13}/> {t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <>
              {/* Avatar + name */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                <Avatar profile={profile} pubkey={pubkey} size={64}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Cormorant Garamond,serif',
                    fontSize: '1.35rem', fontWeight: 600,
                    color: S.cream, marginBottom: 3,
                  }}>
                    {loading ? '…' : name}
                  </div>
                  {profile.nip05 && (
                    <div style={{ fontSize: '0.65rem', color: S.gold, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Montserrat,sans-serif' }}>
                      <CheckCircle size={10}/> {profile.nip05}
                    </div>
                  )}
                  {lnAddress && (
                    <div style={{ fontSize: '0.65rem', color: S.green, marginTop: 3, fontFamily: 'JetBrains Mono,monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Zap size={10}/> {lnAddress}
                    </div>
                  )}
                  {/* Follower / Following counts */}
                  <div style={{ display:'flex', gap:12, marginTop:6 }}>
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

              {/* Bio */}
              {profile.about && (
                <div style={{
                  fontFamily: 'Cormorant Garamond,serif',
                  fontSize: '1rem', fontStyle: 'italic', fontWeight: 300,
                  color: S.creamDim, lineHeight: 1.7,
                  padding: '10px 14px',
                  background: 'rgba(201,168,76,0.04)',
                  border: `1px solid ${S.border}`,
                  borderRadius: 10, marginBottom: 14,
                }}>
                  {profile.about}
                </div>
              )}

              {/* npub row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                background: 'rgba(201,168,76,0.04)',
                border: `1px solid ${S.border}`,
                borderRadius: 10, marginBottom: 18,
              }}>
                <div style={{
                  flex: 1, fontFamily: 'JetBrains Mono,monospace',
                  fontSize: '0.6rem', color: 'rgba(201,168,76,0.4)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {shortNpub}
                </div>
                <button onClick={copy} style={{ background: 'none', border: 'none', color: copied ? S.green : S.creamFaint, cursor: 'pointer', padding: 4, display: 'flex', transition: 'color .2s' }}>
                  {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onDM && onDM(pubkey, profile); onClose() }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`,
                    color: S.cream, padding: '12px 8px', borderRadius: 10,
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 600,
                    fontSize: '0.72rem', cursor: 'pointer', transition: 'all .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = S.borderMid}
                  onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
                >
                  <MessageSquare size={14} color={S.gold}/> DM
                </button>

                <button
                  onClick={toggleFollow}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: isFollowing ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.06)',
                    border: `1px solid ${isFollowing ? S.borderMid : S.border}`,
                    color: isFollowing ? S.gold : S.cream, padding: '12px 8px', borderRadius: 10,
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 600,
                    fontSize: '0.72rem', cursor: 'pointer', transition: 'all .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = S.borderMid}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isFollowing ? S.borderMid : S.border}
                >
                  {publishing ? <Loader size={14} style={{animation:'spin 1s linear infinite'}}/> : isFollowing ? <UserCheck size={14} color={S.gold}/> : <UserPlus size={14} color={S.cream}/>}
                  {publishing ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>

                {lnAddress && (
                  <a href={`lightning:${lnAddress}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`,
                      color: S.cream, padding: '12px 8px', borderRadius: 10,
                      fontFamily: 'Montserrat,sans-serif', fontWeight: 600,
                      fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'none',
                      transition: 'all .2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = S.borderMid}
                    onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
                  >
                    <Zap size={14} color={S.gold}/> Zap
                  </a>
                )}

                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(201,168,76,0.06)', border: `1px solid ${S.border}`,
                      color: S.cream, padding: '12px 8px', borderRadius: 10,
                      fontFamily: 'Montserrat,sans-serif', fontWeight: 600,
                      fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'none',
                      transition: 'all .2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = S.borderMid}
                    onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
                  >
                    <ExternalLink size={14} color={S.gold}/> Web
                  </a>
                )}
              </div>
            </>
          )}

          {tab === 'qr' && npub && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(201,168,76,0.35)', letterSpacing: '0.1em', marginBottom: 18 }}>
                // scan to find on nostr
              </p>
              <QRCode value={npub} size={220}/>
              <div style={{
                margin: '14px auto 0',
                fontFamily: 'JetBrains Mono,monospace',
                fontSize: '0.55rem', color: 'rgba(201,168,76,0.3)',
                wordBreak: 'break-all', padding: '0 8px', lineHeight: 1.8,
              }}>
                {npub}
              </div>
              <button onClick={copy} style={{
                marginTop: 14,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : S.border}`,
                color: copied ? S.green : S.gold,
                padding: '9px 20px', borderRadius: 9,
                fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all .2s',
              }}>
                {copied ? <CheckCircle size={13}/> : <Copy size={13}/>}
                {copied ? 'Copied!' : 'Copy npub'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

