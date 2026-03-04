import { useState, useEffect, useRef } from 'react'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import { Zap, Copy, CheckCircle, X, Loader } from 'lucide-react'

// ── SatsCode design tokens ────────────────────────────────────────────────────
const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', card: '#111009', card2: '#161209',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.72)',
  creamFaint: 'rgba(245,236,215,0.35)',
  border: 'rgba(201,168,76,0.12)',
  borderHover: 'rgba(201,168,76,0.3)',
  borderMid: 'rgba(201,168,76,0.25)',
  green: '#22c55e', red: '#ef4444',
}

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
]

// ── SatsCode donation address ─────────────────────────────────────────────────
const DONATION_LN = 'hodlcurator@blink.sv'
const BLINK_LN_URL = 'https://pay.blink.sv/hodlcurator'
const PRESETS = [21, 100, 500, 1000, 5000, 21000]

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ invoice, verifyUrl, amount, onClose, onPaid }) {
  const [copied, setCopied] = useState(false)
  const [paid, setPaid] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!verifyUrl) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(verifyUrl)
        if (!res.ok) return
        const data = await res.json()
        if (data.settled === true) {
          clearInterval(pollRef.current)
          setPaid(true)
          setTimeout(() => { onPaid?.(); onClose() }, 3000)
        }
      } catch {}
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [verifyUrl])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div onClick={e => e.target === e.currentTarget && !paid && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: paid ? 'center' : 'flex-end', justifyContent: 'center', padding: paid ? 24 : 0 }}>
      <div style={{ width: '100%', maxWidth: paid ? 400 : 480, background: S.card2, border: `1px solid ${paid ? 'rgba(201,168,76,0.5)' : S.borderMid}`, borderRadius: paid ? 20 : '20px 20px 0 0', padding: paid ? '36px 28px' : '24px 24px 48px', animation: paid ? 'popIn .3s ease' : 'slideUp .3s ease', transition: 'border-color .4s' }}>

        {/* Drag handle */}
        {/* Drag handle - only show on sheet, not popup */}
        {!paid && <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.2)', borderRadius: 2, margin: '0 auto 20px' }}/>}
        {paid ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.08)', border: `2px solid ${S.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'scaleIn .4s ease' }}>
              <CheckCircle size={40} color={S.gold} />
            </div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.8rem', fontWeight: 700, color: S.cream, marginBottom: 8 }}>
              Thank you
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)', marginBottom: 16 }}>// payment confirmed</div>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', fontWeight: 600, color: S.gold }}>
              {amount.toLocaleString()} sats received
            </div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', color: S.creamFaint, marginTop: 12, lineHeight: 1.6 }}>
              Your support keeps the guild running.<br/>Built on Bitcoin. Powered by builders.
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px rgba(201,168,76,0.3)` }}>
                  <Zap size={22} color={S.bg} fill={S.bg} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.15rem', fontWeight: 700, color: S.cream }}>{amount.toLocaleString()} sats</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(201,168,76,0.4)' }}>// scan with any lightning wallet</div>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(245,236,215,0.05)', border: `1px solid ${S.border}`, color: S.creamFaint, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            {/* QR Code */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center', border: `1px solid ${S.border}` }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(invoice)}&margin=4`}
                alt="Lightning Invoice QR"
                style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto', borderRadius: 8 }}
              />
            </div>

            {/* Waiting indicator */}
            {verifyUrl && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, padding: '9px 14px', background: 'rgba(201,168,76,0.04)', border: `1px solid ${S.border}`, borderRadius: 9 }}>
                <Loader size={12} color={S.gold} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)' }}>Waiting for payment…</span>
              </div>
            )}

            {/* Invoice string */}
            <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 9, padding: '10px 12px', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(201,168,76,0.3)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 14 }}>
              {invoice.slice(0, 72)}…
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={copy} style={{ flex: 1, background: copied ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.06)', border: `1px solid ${copied ? S.borderHover : S.border}`, color: copied ? S.gold : S.creamFaint, padding: '12px', borderRadius: 10, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .2s' }}>
                {copied ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
              <button onClick={() => window.open(`lightning:${invoice}`, '_blank')} style={{ flex: 1, background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', color: S.bg, padding: '12px', borderRadius: 10, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Zap size={13} fill={S.bg} /> Open Wallet
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <a href={BLINK_LN_URL} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.35)', textDecoration: 'none' }}>
                // or pay directly on Blink →
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Main Donate Page ──────────────────────────────────────────────────────────
export default function DonatePage() {
  const [amount, setAmount]     = useState(1000)
  const [custom, setCustom]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [invoice, setInvoice]   = useState('')
  const [verifyUrl, setVerifyUrl] = useState('')
  const [error, setError]       = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchInvoice = async () => {
    setLoading(true); setError('')
    try {
      const [user, domain] = DONATION_LN.split('@')
      const metaRes = await fetch(`https://${domain}/.well-known/lnurlp/${user}`)
      if (!metaRes.ok) throw new Error('Could not reach Lightning provider')
      const meta = await metaRes.json()
      const msats = amount * 1000
      if (msats < meta.minSendable || msats > meta.maxSendable)
        throw new Error(`Amount must be ${meta.minSendable/1000}–${meta.maxSendable/1000} sats`)
      const invRes = await fetch(`${meta.callback}?amount=${msats}`)
      if (!invRes.ok) throw new Error('Could not get invoice')
      const invData = await invRes.json()
      if (invData.status === 'ERROR') throw new Error(invData.reason)
      setInvoice(invData.pr)
      if (invData.verify) setVerifyUrl(invData.verify)
      setShowModal(true)
    } catch (e) { setError(e.message || 'Failed to get invoice') }
    setLoading(false)
  }

  const handleCustom = (val) => {
    setCustom(val)
    const n = parseInt(val)
    if (n > 0) setAmount(n)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        input[type=range] { accent-color: ${S.gold}; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 100px', animation: 'fadeUp .4s ease' }}>

        {/* Hero card */}
        <div style={{ background: S.card, border: `1px solid ${S.borderMid}`, borderRadius: 16, padding: '28px 24px', marginBottom: 14, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)`, pointerEvents: 'none' }}/>

          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: `0 0 32px rgba(201,168,76,0.35)` }}>
            <Zap size={30} color={S.bg} fill={S.bg} />
          </div>

          <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.7rem', fontWeight: 700, color: S.cream, marginBottom: 8 }}>
            Support the <span style={{ color: S.gold, fontStyle: 'italic' }}>Guild</span>
          </h2>
          <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: S.creamDim, lineHeight: 1.7, marginBottom: 16 }}>
            Help keep SatsCode running — a builder community<br/>powered by Bitcoin and Nostr.
          </p>

          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.05em' }}>
            // every sat keeps the lights on
          </div>
        </div>

        {/* Amount selector */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '20px 20px 22px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: 14 }}>Select Amount</div>

          {/* Preset buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => { setAmount(p); setCustom('') }}
                style={{ padding: '11px 8px', borderRadius: 10, background: amount === p && !custom ? `linear-gradient(135deg,${S.gold},${S.goldLight})` : 'rgba(201,168,76,0.05)', border: `1px solid ${amount === p && !custom ? 'transparent' : S.border}`, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.75rem', color: amount === p && !custom ? S.bg : S.creamFaint, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .2s' }}>
                <span>{p.toLocaleString()}</span>
                <span style={{ fontSize: '0.45rem', fontWeight: 400, opacity: 0.7 }}>sats</span>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 16 }}>
            <input type="range" min={1} max={1000000} value={amount}
              onChange={e => { setAmount(Number(e.target.value)); setCustom('') }}
              style={{ width: '100%', accentColor: S.gold, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.3)', marginTop: 4 }}>
              <span>1 sat</span><span>1,000,000 sats</span>
            </div>
          </div>

          {/* Custom input */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input type="number" min="1" value={custom} onChange={e => handleCustom(e.target.value)}
              placeholder="Custom amount…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: `1px solid ${custom ? S.borderHover : S.border}`, borderRadius: 10, padding: '13px 56px 13px 16px', color: S.cream, fontFamily: 'Montserrat,sans-serif', fontSize: '0.9rem', fontWeight: 600, outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.35)', fontWeight: 600 }}>SATS</span>
          </div>

          {/* Amount display */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2rem', fontWeight: 700, color: S.gold }}>
              {amount.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.3)' }}>
              sats · ≈ ${(amount * 0.00097).toFixed(2)} USD
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', color: S.red, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Zap button */}
          <button onClick={fetchInvoice} disabled={loading || amount < 1}
            style={{ width: '100%', background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', color: S.bg, padding: '15px', borderRadius: 12, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'opacity .2s' }}>
            {loading
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Getting Invoice…</>
              : <><Zap size={16} fill={S.bg} /> Zap {amount.toLocaleString()} sats</>
            }
          </button>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(201,168,76,0.2)', lineHeight: 1.8 }}>
            // payments via Lightning Network<br/>
            // no accounts · no KYC · instant settlement
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showModal && invoice && (
        <InvoiceModal
          invoice={invoice}
          verifyUrl={verifyUrl}
          amount={amount}
          onClose={() => { setShowModal(false); setInvoice(''); setVerifyUrl('') }}
          onPaid={() => console.log('Payment confirmed!')}
        />
      )}
    </>
  )
}

