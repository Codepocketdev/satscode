import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { nip04, nip19 } from 'nostr-tools'
import { finalizeEvent } from 'nostr-tools/pure'
import {
  Send, ArrowLeft, MessageCircle, Loader,
  ChevronDown, CornerUpLeft, X, Plus
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
  green: '#22c55e', red: '#ef4444',
}

const EMOJI_REACTIONS = ['⚡', '🟠', '🔥', '💪', '🎉', '🙏', '👀', '😂']

// ── Audio coin ping on send ───────────────────────────────────────────────────
function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
  } catch {}
}

// ── Reply encoding / decoding ─────────────────────────────────────────────────
function encodeReply(replyName, replyText, msgText) {
  return `REPLY:${JSON.stringify({ name: replyName, text: replyText })}\n---\n${msgText}`
}
function decodeMessage(raw) {
  if (!raw?.startsWith('REPLY:')) return { text: raw, replyName: null, replyText: null }
  try {
    const nl = raw.indexOf('\n---\n')
    if (nl === -1) return { text: raw, replyName: null, replyText: null }
    const meta = JSON.parse(raw.slice('REPLY:'.length, nl))
    return { text: raw.slice(nl + 5), replyName: meta.name, replyText: meta.text }
  } catch { return { text: raw, replyName: null, replyText: null } }
}

// ── Profile cache (1hr TTL, uses satscode_ prefix) ────────────────────────────
const PROF_TTL = 3_600_000
const getCachedProfile = (pk) => {
  try {
    const raw = localStorage.getItem('satscode_prof_' + pk)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    return Date.now() - ts < PROF_TTL ? data : null
  } catch { return null }
}
const setCachedProfile = (pk, data) => {
  try { localStorage.setItem('satscode_prof_' + pk, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const shortNpub = n => n ? `${n.slice(0, 10)}…${n.slice(-4)}` : ''
const timeAgo = ts => {
  const s = Math.floor(Date.now() / 1000) - ts
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getSkBytes() {
  try {
    const nsec = localStorage.getItem('satscode_nsec')
    if (!nsec) return null
    const { type, data } = nip19.decode(nsec.trim())
    return type === 'nsec' ? data : null
  } catch { return null }
}

// ── Pool singleton ────────────────────────────────────────────────────────────
import { SimplePool } from 'nostr-tools/pool'
let _pool = null
const getPool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

// ── NIP-42 raw WS DM fetcher ──────────────────────────────────────────────────
function fetchDMsFromRelay(relayUrl, skBytes, f1, f2, onEvent, onDone) {
  const subId = 'dm-' + Math.random().toString(36).slice(2, 8)
  let ws, done = false, authed = false

  const finish = () => {
    if (done) return; done = true
    try { ws?.close() } catch {}
    onDone()
  }
  const sendReq  = () => ws.send(JSON.stringify(['REQ', subId, f1, f2]))
  const sendAuth = (ch) => {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now() / 1000), tags: [['relay', relayUrl], ['challenge', ch]], content: '' }, skBytes)
    ws.send(JSON.stringify(['AUTH', ev]))
  }

  try {
    ws = new WebSocket(relayUrl)
    ws.onopen = () => sendReq()
    ws.onmessage = ({ data }) => {
      if (done) return
      let msg; try { msg = JSON.parse(data) } catch { return }
      const [type, ...rest] = msg
      if (type === 'AUTH') sendAuth(rest[0])
      if (type === 'OK' && !authed) { authed = true; sendReq() }
      if (type === 'EVENT' && rest[1]?.kind === 4) onEvent(rest[1])
      if (type === 'EOSE') finish()
      if (type === 'CLOSED' && !(rest[1] || '').toLowerCase().includes('auth-required')) finish()
    }
    ws.onerror = () => finish()
    ws.onclose = () => finish()
    setTimeout(() => finish(), 12000)
  } catch { finish() }

  return () => { done = true; try { ws?.close() } catch {} }
}

// ── Live WS subscription (stays open, auto-reconnects) ───────────────────────
function subscribeLiveDMs(relayUrl, skBytes, f1, f2, onEvent) {
  let ws, closed = false, authed = false
  const subId = 'dm-live-' + Math.random().toString(36).slice(2, 8)

  const sendReq  = () => ws.send(JSON.stringify(['REQ', subId, f1, f2]))
  const sendAuth = (ch) => {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now() / 1000), tags: [['relay', relayUrl], ['challenge', ch]], content: '' }, skBytes)
    ws.send(JSON.stringify(['AUTH', ev]))
  }
  const connect = () => {
    if (closed) return
    try {
      ws = new WebSocket(relayUrl)
      ws.onopen = () => { if (!closed) sendReq() }
      ws.onmessage = ({ data }) => {
        if (closed) return
        let msg; try { msg = JSON.parse(data) } catch { return }
        const [type, ...rest] = msg
        if (type === 'AUTH') sendAuth(rest[0])
        if (type === 'OK' && !authed) { authed = true; sendReq() }
        if (type === 'EVENT' && rest[1]?.kind === 4) onEvent(rest[1])
      }
      ws.onerror = () => {}
      ws.onclose = () => { if (!closed) setTimeout(connect, 3000) }
    } catch {}
  }

  connect()
  return () => { closed = true; try { ws?.close() } catch {} }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function DMAvatar({ picture, name, size = 42 }) {
  const [err, setErr] = useState(false)
  const letter = (name || '?').slice(0, 1).toUpperCase()
  if (picture && !err)
    return <img src={picture} alt={letter} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${S.borderMid}` }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(201,168,76,0.08)', border: `1.5px solid rgba(201,168,76,0.3)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cormorant Garamond,serif', fontSize: size * 0.4, fontWeight: 600, color: S.gold,
    }}>{letter}</div>
  )
}

// ── Thread — full conversation view ──────────────────────────────────────────
function Thread({ myPubkeyHex, peer, peerProfile, onBack }) {
  const [messages,     setMessages]     = useState([])
  const [text,         setText]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [replyTo,      setReplyTo]      = useState(null)
  const [reactions,    setReactions]    = useState({})
  const [showActions,  setShowActions]  = useState(null)
  const [showJump,     setShowJump]     = useState(false)
  const [swipeOffsets, setSwipeOffsets] = useState({})
  const swipeStartX   = useRef(null)
  const bottomRef     = useRef(null)
  const scrollRef     = useRef(null)
  const seenRef       = useRef(new Set())
  const msgsRef       = useRef([])
  const userScrolled  = useRef(false)
  const skBytes       = getSkBytes()

  const peerNpub = (() => { try { return nip19.npubEncode(peer) } catch { return '' } })()
  const peerName = peerProfile?.name || peerProfile?.display_name || shortNpub(peerNpub)

  useEffect(() => {
    if (!myPubkeyHex || !peer || !skBytes) { setLoading(false); return }
    let done = 0

    const onEvent = async (e) => {
      if (seenRef.current.has(e.id)) return
      const isMine = e.pubkey === myPubkeyHex
      if (isMine) { if (e.tags.find(t => t[0] === 'p')?.[1] !== peer) return }
      else { if (e.pubkey !== peer) return }
      seenRef.current.add(e.id)

      let dec
      try { dec = await nip04.decrypt(skBytes, isMine ? peer : e.pubkey, e.content) }
      catch { dec = '[could not decrypt]' }

      if (dec.startsWith('REACTION:')) {
        try {
          const d = JSON.parse(dec.slice('REACTION:'.length))
          setReactions(prev => {
            const ex = prev[d.msgId] || []
            if (ex.includes(d.emoji)) return prev
            return { ...prev, [d.msgId]: [...ex, d.emoji] }
          })
        } catch {}
        return
      }

      const decoded = decodeMessage(dec)
      msgsRef.current = [...msgsRef.current,
        { id: e.id, text: decoded.text, replyToName: decoded.replyName, replyToText: decoded.replyText, isMine, ts: e.created_at }
      ].sort((a, b) => a.ts - b.ts)
      setMessages([...msgsRef.current])
    }

    const onDone = () => { done++; if (done >= RELAYS.length) setLoading(false) }
    const fSent = { kinds: [4], authors: [myPubkeyHex], '#p': [peer], limit: 500 }
    const fRecv = { kinds: [4], authors: [peer], '#p': [myPubkeyHex], limit: 500 }
    const closers = RELAYS.map(r => fetchDMsFromRelay(r, skBytes, fSent, fRecv, onEvent, onDone))

    const now = Math.floor(Date.now() / 1000)
    const lSent = { kinds: [4], authors: [myPubkeyHex], '#p': [peer], since: now }
    const lRecv = { kinds: [4], authors: [peer], '#p': [myPubkeyHex], since: now }
    const liveClosers = RELAYS.map(r => subscribeLiveDMs(r, skBytes, lSent, lRecv, onEvent))

    return () => { closers.forEach(c => c?.()); liveClosers.forEach(c => c?.()) }
  }, [myPubkeyHex, peer])

  useEffect(() => {
    if (!userScrolled.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleScroll = (e) => {
    const el = e.target
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolled.current = dist > 200
    setShowJump(dist > 200)
  }

  const send = async () => {
    if (!text.trim() || sending || !skBytes) return
    setSending(true)
    try {
      const finalText = replyTo
        ? encodeReply(replyTo.senderName, replyTo.text, text.trim())
        : text.trim()
      const encrypted = await nip04.encrypt(skBytes, peer, finalText)
      const ev = finalizeEvent({ kind: 4, created_at: Math.floor(Date.now() / 1000), tags: [['p', peer]], content: encrypted }, skBytes)
      RELAYS.forEach(url => {
        try {
          const ws = new WebSocket(url)
          ws.onopen = () => { ws.send(JSON.stringify(['EVENT', ev])); setTimeout(() => { try { ws.close() } catch {} }, 3000) }
        } catch {}
      })
      seenRef.current.add(ev.id)
      const newMsg = { id: ev.id, text: text.trim(), isMine: true, ts: ev.created_at, replyToText: replyTo?.text || null, replyToName: replyTo?.senderName || null }
      msgsRef.current = [...msgsRef.current, newMsg]
      setMessages([...msgsRef.current])
      setText('')
      setReplyTo(null)
      playCoinSound()
    } catch (e) { alert('Send failed: ' + e.message) }
    setSending(false)
  }

  const sendReaction = async (msgId, emoji, msgText) => {
    if (!skBytes) return
    setShowActions(null)
    const payload = `REACTION:${JSON.stringify({ emoji, msgId, preview: msgText.slice(0, 60) })}`
    try {
      const encrypted = await nip04.encrypt(skBytes, peer, payload)
      const ev = finalizeEvent({ kind: 4, created_at: Math.floor(Date.now() / 1000), tags: [['p', peer]], content: encrypted }, skBytes)
      RELAYS.forEach(url => {
        try {
          const ws = new WebSocket(url)
          ws.onopen = () => { ws.send(JSON.stringify(['EVENT', ev])); setTimeout(() => { try { ws.close() } catch {} }, 3000) }
        } catch {}
      })
      seenRef.current.add(ev.id)
    } catch {}
    setReactions(prev => ({ ...prev, [msgId]: [...(prev[msgId] || []), emoji] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: S.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} textarea::placeholder{color:rgba(201,168,76,0.18)!important}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${S.border}`, flexShrink: 0, background: S.card }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: S.creamFaint, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <DMAvatar picture={peerProfile?.picture} name={peerName} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.88rem', fontWeight: 600, color: S.cream }}>{peerName}</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.35)', marginTop: 1 }}>{shortNpub(peerNpub)}</div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.25)', letterSpacing: '0.1em' }}>// nip-04 e2e</div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px 8px', position: 'relative' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0' }}>
            <Loader size={16} color={S.gold} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem', color: S.creamFaint }}>Decrypting messages…</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', animation: 'fadeUp .4s ease' }}>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', fontStyle: 'italic', fontWeight: 300, color: S.creamFaint, marginBottom: 8 }}>
              No messages yet
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(201,168,76,0.25)' }}>
              // say hello to {peerName}
            </div>
          </div>
        )}

        {messages.map(m => {
          const msgReactions = reactions[m.id] || []
          return (
            <div key={m.id}
              style={{ display: 'flex', flexDirection: 'column', alignItems: m.isMine ? 'flex-end' : 'flex-start', paddingLeft: m.isMine ? 52 : 0, paddingRight: m.isMine ? 0 : 52, marginBottom: 2 }}
              onTouchStart={e => { swipeStartX.current = e.touches[0].clientX }}
              onTouchMove={e => {
                if (swipeStartX.current === null) return
                const dx = e.touches[0].clientX - swipeStartX.current
                if (dx > 0 && dx < 80) setSwipeOffsets(p => ({ ...p, [m.id]: Math.min(dx * 0.4, 22) }))
                if (dx > 50) {
                  setReplyTo({ id: m.id, text: m.text, isMine: m.isMine, senderName: m.isMine ? 'You' : peerName })
                  setSwipeOffsets(p => ({ ...p, [m.id]: 0 }))
                  swipeStartX.current = null
                }
              }}
              onTouchEnd={() => { swipeStartX.current = null; setSwipeOffsets(p => ({ ...p, [m.id]: 0 })) }}
            >
              {/* Bubble */}
              <div
                onClick={() => setShowActions(showActions === m.id ? null : m.id)}
                onDoubleClick={() => { setReplyTo({ id: m.id, text: m.text, isMine: m.isMine, senderName: m.isMine ? 'You' : peerName }); setShowActions(null) }}
                style={{
                  padding: '10px 14px',
                  borderRadius: m.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.isMine
                    ? `linear-gradient(135deg, ${S.gold}, ${S.goldLight})`
                    : S.card,
                  border: m.isMine ? 'none' : `1px solid ${S.border}`,
                  cursor: 'pointer',
                  transform: `translateX(${swipeOffsets[m.id] || 0}px)`,
                  transition: swipeOffsets[m.id] ? 'none' : 'transform .2s ease',
                  maxWidth: '100%',
                }}
              >
                {/* Reply quote */}
                {m.replyToText && (
                  <div style={{
                    background: m.isMine ? 'rgba(0,0,0,0.15)' : 'rgba(201,168,76,0.06)',
                    borderLeft: `3px solid ${m.isMine ? 'rgba(0,0,0,0.25)' : S.gold}`,
                    borderRadius: 6, padding: '5px 9px', marginBottom: 7,
                  }}>
                    <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.6rem', fontWeight: 700, color: m.isMine ? 'rgba(0,0,0,0.4)' : S.gold, marginBottom: 2 }}>{m.replyToName}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '0.85rem', color: m.isMine ? 'rgba(0,0,0,0.4)' : S.creamFaint, lineHeight: 1.4 }}>{m.replyToText.slice(0, 80)}{m.replyToText.length > 80 ? '…' : ''}</div>
                  </div>
                )}
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.05rem', fontWeight: 300, color: m.isMine ? S.bg : S.creamDim, lineHeight: 1.65, wordBreak: 'break-word' }}>
                  {m.text}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: m.isMine ? 'rgba(13,11,6,0.45)' : 'rgba(201,168,76,0.3)', marginTop: 4, textAlign: 'right' }}>
                  {timeAgo(m.ts)}
                </div>
              </div>

              {/* Emoji reactions */}
              {msgReactions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', justifyContent: m.isMine ? 'flex-end' : 'flex-start' }}>
                  {[...new Set(msgReactions)].map(emoji => (
                    <span key={emoji} onClick={() => setReactions(p => ({ ...p, [m.id]: [...(p[m.id] || []), emoji] }))}
                      style={{ fontSize: 12, background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '2px 7px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif' }}>
                      {emoji} {msgReactions.filter(r => r === emoji).length}
                    </span>
                  ))}
                </div>
              )}

              {/* Action popup */}
              {showActions === m.id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: S.card2, border: `1px solid ${S.borderMid}`, borderRadius: 20, padding: '7px 12px', marginTop: 5, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp .15s ease', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setReplyTo({ id: m.id, text: m.text, isMine: m.isMine, senderName: m.isMine ? 'You' : peerName }); setShowActions(null) }}
                    style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid ${S.border}`, borderRadius: 12, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: S.gold, fontFamily: 'Montserrat,sans-serif', fontSize: '0.65rem', fontWeight: 700, marginRight: 4 }}>
                    <CornerUpLeft size={12} /> Reply
                  </button>
                  <div style={{ width: 1, height: 18, background: S.border, marginRight: 4 }} />
                  {EMOJI_REACTIONS.map(emoji => (
                    <span key={emoji} onClick={() => sendReaction(m.id, emoji, m.text)}
                      style={{ fontSize: 18, cursor: 'pointer', transition: 'transform .1s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    >{emoji}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div ref={bottomRef} />

        {/* Jump to bottom */}
        {showJump && (
          <button onClick={() => { userScrolled.current = false; setShowJump(false); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            style={{ position: 'sticky', bottom: 8, alignSelf: 'flex-end', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 18px rgba(201,168,76,0.35)', flexShrink: 0 }}>
            <ChevronDown size={16} color={S.bg} />
          </button>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: S.card, borderTop: `1px solid ${S.border}` }}>
          <CornerUpLeft size={13} color={S.gold} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.6rem', fontWeight: 700, color: S.gold, marginBottom: 1 }}>{replyTo.senderName}</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '0.85rem', fontStyle: 'italic', color: S.creamFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text.slice(0, 80)}{replyTo.text.length > 80 ? '…' : ''}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: S.creamFaint, cursor: 'pointer', padding: 2, display: 'flex' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px 24px', borderTop: replyTo ? 'none' : `1px solid ${S.border}`, background: S.card, flexShrink: 0 }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Write a message…" rows={2}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, borderRadius: 12, padding: '10px 14px', color: S.cream, fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1rem', fontWeight: 300, outline: 'none', resize: 'none', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = S.border}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ background: text.trim() ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.12)', border: 'none', borderRadius: 12, width: 48, flexShrink: 0, cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
          {sending
            ? <Loader size={16} color={S.bg} style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={16} color={text.trim() ? S.bg : 'rgba(201,168,76,0.3)'} />
          }
        </button>
      </div>
    </div>
  )
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
function Inbox({ myPubkeyHex, onOpen }) {
  const [conversations, setConversations] = useState({})
  const [profiles,      setProfiles]      = useState({})
  const [newNpub,       setNewNpub]       = useState('')
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)
  const seenRef = useRef(new Set())
  const convRef = useRef({})
  const skBytes = getSkBytes()

  useEffect(() => {
    if (!myPubkeyHex || !skBytes) { setLoading(false); return }
    let done = 0

    const onEvent = async (e) => {
      if (seenRef.current.has(e.id)) return
      seenRef.current.add(e.id)
      const isMine = e.pubkey === myPubkeyHex
      const peer = isMine ? e.tags.find(t => t[0] === 'p')?.[1] : e.pubkey
      if (!peer || peer === myPubkeyHex) return
      let dec
      try { dec = await nip04.decrypt(skBytes, isMine ? peer : e.pubkey, e.content) }
      catch { dec = '[encrypted]' }

      let preview = dec
      if (preview?.startsWith('REACTION:')) {
        try { const d = JSON.parse(preview.slice('REACTION:'.length)); preview = `Reacted ${d.emoji} to "${d.preview?.slice(0, 30)}…"` }
        catch { preview = 'Reacted to a message' }
      } else if (preview?.startsWith('REPLY:')) {
        try { preview = preview.split('\n---\n').slice(1).join('') || preview } catch {}
      }

      if (!convRef.current[peer] || e.created_at > convRef.current[peer].ts) {
        convRef.current[peer] = { lastMsg: preview, ts: e.created_at, isMine }
        setConversations({ ...convRef.current })
      }
    }

    const onDone = () => { done++; if (done >= RELAYS.length) setLoading(false) }
    const fSent = { kinds: [4], authors: [myPubkeyHex], limit: 500 }
    const fRecv = { kinds: [4], '#p': [myPubkeyHex], limit: 500 }
    const closers = RELAYS.map(r => fetchDMsFromRelay(r, skBytes, fSent, fRecv, onEvent, onDone))

    const now = Math.floor(Date.now() / 1000)
    const liveClosers = RELAYS.map(r => subscribeLiveDMs(r, skBytes, { kinds: [4], authors: [myPubkeyHex], since: now }, { kinds: [4], '#p': [myPubkeyHex], since: now }, onEvent))

    return () => { closers.forEach(c => c?.()); liveClosers.forEach(c => c?.()) }
  }, [myPubkeyHex])

  // Profile fetching with cache
  useEffect(() => {
    const pks = Object.keys(conversations)
    if (!pks.length) return
    const fromCache = {}
    pks.forEach(pk => { const c = getCachedProfile(pk); if (c) fromCache[pk] = c })
    if (Object.keys(fromCache).length) setProfiles(p => ({ ...p, ...fromCache }))
    const missing = pks.filter(pk => !getCachedProfile(pk))
    if (!missing.length) return
    const pool = getPool()
    const sub = pool.subscribe(RELAYS, { kinds: [0], authors: missing, limit: missing.length }, {
      onevent(e) {
        try { const p = JSON.parse(e.content); setCachedProfile(e.pubkey, p); setProfiles(prev => ({ ...prev, [e.pubkey]: p })) } catch {}
      },
      oneose() { sub.close() }
    })
  }, [Object.keys(conversations).join(',')])

  const startNew = () => {
    const val = newNpub.trim()
    if (!val) return
    try {
      const { type, data: pubkey } = nip19.decode(val)
      if (type !== 'npub') { alert('Paste a valid npub1… key'); return }
      onOpen(pubkey, profiles[pubkey] || {})
      setNewNpub(''); setShowNew(false)
    } catch { alert('Invalid npub') }
  }

  const sorted = Object.entries(conversations).sort((a, b) => b[1].ts - a[1].ts)

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '0 12px 100px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} input::placeholder{color:rgba(201,168,76,0.18)!important}`}</style>

      {/* New DM panel */}
      {showNew && (
        <div style={{ background: S.card, border: `1px solid ${S.borderMid}`, borderRadius: 12, padding: '16px', marginBottom: 16, animation: 'fadeUp .2s ease' }}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.58rem', color: 'rgba(201,168,76,0.35)', marginBottom: 10, letterSpacing: '0.1em' }}>// new direct message</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newNpub} onChange={e => setNewNpub(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startNew()}
              placeholder="npub1… recipient"
              style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.cream, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.72rem', outline: 'none' }}
            />
            <button onClick={startNew} disabled={!newNpub.trim()} style={{ background: newNpub.trim() ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.1)', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: newNpub.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.72rem', color: newNpub.trim() ? S.bg : S.creamFaint }}>
              Open
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader size={20} color={S.gold} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem', color: S.creamFaint, marginBottom: 4 }}>Connecting to relays…</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.2)' }}>{RELAYS[0]}</div>
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', animation: 'fadeUp .4s ease' }}>
          <MessageCircle size={36} color={S.goldDark} style={{ display: 'block', margin: '0 auto 14px', opacity: 0.4 }} />
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', fontStyle: 'italic', fontWeight: 300, color: S.creamFaint, marginBottom: 8 }}>No messages yet</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(201,168,76,0.25)' }}>// tap + to start a conversation</div>
        </div>
      )}

      {/* Conversation list */}
      {sorted.map(([pubkey, conv]) => {
        const prof = profiles[pubkey] || {}
        const npub = (() => { try { return nip19.npubEncode(pubkey) } catch { return '' } })()
        const name = prof.name || prof.display_name || shortNpub(npub)
        return (
          <div key={pubkey} onClick={() => onOpen(pubkey, prof)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, marginBottom: 6, cursor: 'pointer', transition: 'all .2s', marginLeft: 2, marginRight: 2 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = S.borderMid; e.currentTarget.style.transform = 'translateX(2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = 'translateX(0)' }}
          >
            <DMAvatar picture={prof.picture} name={name} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.85rem', fontWeight: 600, color: S.cream, marginBottom: 3 }}>{name}</div>
              <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '0.92rem', fontStyle: 'italic', fontWeight: 300, color: S.creamFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.isMine && <span style={{ color: S.goldDark, fontStyle: 'normal', fontSize: '0.75rem', fontFamily: 'Montserrat,sans-serif' }}>You · </span>}
                {conv.lastMsg}
              </div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.3)', flexShrink: 0 }}>{timeAgo(conv.ts)}</div>
          </div>
        )
      })}

      {/* Floating compose button */}
      <button onClick={() => setShowNew(!showNew)}
        style={{ position: 'fixed', bottom: 88, right: 20, width: 50, height: 50, borderRadius: '50%', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(201,168,76,0.4)', zIndex: 80, transition: 'transform .2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={22} color={S.bg} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ── Main MessagesPage ─────────────────────────────────────────────────────────
export default function MessagesPage({ user, initialPeer, initialProfile, onClose }) {
  const location = useLocation()
  const routeState = location?.state
  const [activePeer,    setActivePeer]    = useState(initialPeer || routeState?.peer || null)
  const [activePeerProf,setActivePeerProf]= useState(initialProfile || routeState?.profile || {})
  const myPubkeyHex = user?.pubkey || null

  // If opened via DM button on a post or navigated from BuilderProfile
  useEffect(() => {
    if (initialPeer) { setActivePeer(initialPeer); setActivePeerProf(initialProfile || {}) }
    else if (routeState?.peer) { setActivePeer(routeState.peer); setActivePeerProf(routeState.profile || {}) }
  }, [initialPeer, routeState?.peer])

  if (!myPubkeyHex || !getSkBytes()) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: S.creamFaint, fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300 }}>
        Log in with your private key to use encrypted messages.
      </div>
    )
  }

  return (
    <>
      <Inbox
        myPubkeyHex={myPubkeyHex}
        onOpen={(pk, prof) => { setActivePeer(pk); setActivePeerProf(prof) }}
      />

      {activePeer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: S.bg }}>
          <Thread
            myPubkeyHex={myPubkeyHex}
            peer={activePeer}
            peerProfile={activePeerProf}
            onBack={() => setActivePeer(null)}
          />
        </div>
      )}
    </>
  )
}

