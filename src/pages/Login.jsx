import { useState } from 'react'
import { Zap, Eye, EyeOff, ArrowLeft, Key, Lock, Loader } from 'lucide-react'
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  black: '#0A0804', bg: '#0D0B06', card: '#141008',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.75)',
  border: 'rgba(201,168,76,0.2)',
}

function Divider() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
      <div style={{ flex:1, height:1, background:`linear-gradient(to right,transparent,rgba(201,168,76,.2))` }}/>
      <div style={{ width:5, height:5, background:S.goldDark, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ flex:1, height:1, background:`linear-gradient(to left,transparent,rgba(201,168,76,.2))` }}/>
    </div>
  )
}

export default function Login({ mode = 'login', onLogin, onBack }) {
  const isJoin = mode === 'join'
  const [loading, setLoading] = useState(false)
  const [nsec, setNsec] = useState('')
  const [showNsec, setShowNsec] = useState(false)
  const [error, setError] = useState('')

  async function handleExtension() {
    setLoading(true)
    setError('')
    try {
      if (!window.nostr) {
        setError('No Nostr extension found. Install Alby or nos2x.')
        setLoading(false)
        return
      }
      const pubkey = await window.nostr.getPublicKey()
      const npub = nip19.npubEncode(pubkey)
      onLogin({ pubkey, npub, isNew: isJoin })
    } catch(e) {
      setError('Connection cancelled.')
      setLoading(false)
    }
  }

  function handleNsecLogin() {
    setError('')
    try {
      if (!nsec.startsWith('nsec1')) {
        setError('Invalid key — must start with nsec1...')
        return
      }
      const { data: privkey } = nip19.decode(nsec)
      const pubkey = getPublicKey(privkey)
      const npub = nip19.npubEncode(pubkey)
      onLogin({ pubkey, npub, nsec, isNew: false })
    } catch(e) {
      setError('Invalid nsec key. Please check and try again.')
    }
  }

  function handleGenerateKeys() {
    setLoading(true)
    try {
      const privkey = generateSecretKey()
      const pubkey = getPublicKey(privkey)
      const npub = nip19.npubEncode(pubkey)
      const nsecEncoded = nip19.nsecEncode(privkey)
      onLogin({ pubkey, npub, nsec: nsecEncoded, isNew: true })
    } catch(e) {
      setError('Failed to generate keys. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400&display=swap');

        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .auth-btn {
          transition: all .3s ease; cursor: pointer; border: none;
          font-family: 'Montserrat', sans-serif;
          border-radius: 10px;
        }
        .auth-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.12); }
        .auth-btn:active:not(:disabled) { transform: translateY(0px); filter: brightness(.95); }
        .auth-btn:disabled { opacity: .6; cursor: wait; }

        .btn-gold { position: relative; overflow: hidden; }
        .btn-gold::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 3s ease infinite;
          border-radius: 10px;
        }

        .dark-btn {
          border-radius: 10px;
          transition: all .3s ease;
        }
        .dark-btn:hover:not(:disabled) {
          border-color: rgba(201,168,76,.5) !important;
          background: rgba(255,255,255,.045) !important;
          transform: translateY(-2px);
        }

        /* curved input */
        .nsec-input {
          outline: none;
          font-family: 'JetBrains Mono', monospace;
          transition: border-color .3s, box-shadow .3s;
          box-sizing: border-box;
          border-radius: 10px;
        }
        .nsec-input:focus {
          border-color: rgba(201,168,76,.65) !important;
          box-shadow: 0 0 0 3px rgba(201,168,76,.1), inset 0 2px 8px rgba(0,0,0,.3) !important;
        }
        .nsec-input::placeholder { color: rgba(201,168,76,.22); }

        .back-btn:hover { color: rgba(201,168,76,.85) !important; }

        .spin { animation: spin .8s linear infinite; }

        .noise-bg::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
      `}</style>

      <div className="noise-bg" style={{
        position:'fixed', inset:0,
        background:`
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,80,16,0.22) 0%, transparent 65%),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(100,55,8,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 20% 80%, rgba(80,45,5,0.14) 0%, transparent 55%),
          linear-gradient(170deg, #1A1108 0%, #110D05 30%, #0D0A04 60%, #130F07 100%)
        `,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        zIndex:40, padding:'16px',
        fontFamily:'Montserrat,sans-serif',
        overflowY:'auto',
      }}>

        {/* Ambient glow */}
        <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'70%', height:'35%', background:'radial-gradient(ellipse, rgba(160,100,20,0.12) 0%, transparent 70%)', pointerEvents:'none' }}/>

        {/* Corner ornaments */}
        {[
          {top:18,left:18,borderWidth:'1px 0 0 1px'},
          {top:18,right:18,borderWidth:'1px 1px 0 0'},
          {bottom:18,left:18,borderWidth:'0 0 1px 1px'},
          {bottom:18,right:18,borderWidth:'0 1px 1px 0'},
        ].map((s,i) => (
          <div key={i} style={{ position:'fixed', width:40, height:40, borderStyle:'solid', borderColor:'rgba(201,168,76,.18)', ...s, zIndex:1 }}/>
        ))}

        {/* Side lines */}
        <div style={{ position:'fixed', left:0, top:'20%', bottom:'20%', width:1, background:'linear-gradient(to bottom, transparent, rgba(201,168,76,.08), transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'fixed', right:0, top:'20%', bottom:'20%', width:1, background:'linear-gradient(to bottom, transparent, rgba(201,168,76,.08), transparent)', pointerEvents:'none' }}/>

        {/* Card wrapper */}
        <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:2, animation:'fadeUp .7s ease both' }}>

          {/* Outer glow ring */}
          <div style={{
            position:'absolute', inset:-1,
            background:'linear-gradient(145deg, rgba(201,168,76,.25), rgba(201,168,76,.05), rgba(201,168,76,.18))',
            borderRadius:12, filter:'blur(1px)', zIndex:0,
          }}/>

          {/* Card body */}
          <div style={{
            position:'relative', zIndex:1,
            background:'linear-gradient(160deg, #221806 0%, #170F04 40%, #120D04 70%, #1A1307 100%)',
            border:`1px solid rgba(201,168,76,.22)`,
            borderRadius:12,
            padding:'36px 28px 30px',
            boxShadow:`
              0 32px 80px rgba(0,0,0,0.7),
              0 8px 32px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(201,168,76,.12),
              inset 0 -1px 0 rgba(0,0,0,.5)
            `,
          }}>

            {/* Top highlight line */}
            <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:1, background:'linear-gradient(to right, transparent, rgba(201,168,76,.3), transparent)', borderRadius:12 }}/>

            <span style={{ position:'absolute', top:10, left:10, color:S.gold, fontSize:'.4rem', opacity:.45 }}>◆</span>
            <span style={{ position:'absolute', bottom:10, right:10, color:S.gold, fontSize:'.4rem', opacity:.45 }}>◆</span>

            {/* Logo + Title */}
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{
                width:88, height:88, borderRadius:'50%',
                overflow:'hidden',
                border:`2px solid rgba(201,168,76,.4)`,
                margin:'0 auto 16px',
                boxShadow:'0 0 0 4px rgba(201,168,76,.06), 0 0 40px rgba(201,168,76,.2)',
              }}>
                <img src="/logo.png" alt="SatsCode" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
              </div>

              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'2.2rem', fontWeight:600, color:S.cream, letterSpacing:'.06em', lineHeight:1, marginBottom:8 }}>
                Sats<span style={{ color:S.gold }}>Code</span>
              </h1>
              <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.68rem', fontWeight:500, letterSpacing:'0.38em', color:S.goldDark, textTransform:'uppercase' }}>
                {isJoin ? 'Join the Guild' : 'Welcome Back'}
              </p>
            </div>

            <Divider />

            {isJoin ? (
              <div>
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', fontStyle:'italic', fontWeight:300, color:S.creamDim, lineHeight:1.75, textAlign:'center', marginBottom:24 }}>
                  We'll generate a Nostr keypair for you. Your private key will be shown in your profile — save it safely.
                </p>

                {/* Generate Keys */}
                <button className="auth-btn btn-gold" onClick={handleGenerateKeys} disabled={loading} style={{
                  width:'100%', padding:'15px',
                  background:`linear-gradient(135deg, #C9A84C 0%, #E2C060 45%, #C9A84C 100%)`,
                  color:'#0D0900', fontSize:'0.82rem', fontWeight:700,
                  letterSpacing:'0.22em', textTransform:'uppercase',
                  boxShadow:'0 4px 24px rgba(201,168,76,.28), inset 0 1px 0 rgba(255,255,255,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  marginBottom:18,
                }}>
                  {loading ? <Loader size={16} className="spin"/> : <Key size={16}/>}
                  {loading ? 'Generating...' : 'Generate My Keys'}
                </button>

                <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0' }}>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,.1)' }}/>
                  <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', color:'rgba(201,168,76,.3)', letterSpacing:'0.18em' }}>OR</span>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,.1)' }}/>
                </div>

                <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.05rem', fontStyle:'italic', color:'rgba(245,236,215,.38)', textAlign:'center', marginBottom:12 }}>
                  Already have a Nostr extension?
                </p>

                {/* Connect Extension */}
                <button className="auth-btn dark-btn" onClick={handleExtension} disabled={loading} style={{
                  width:'100%', padding:'14px',
                  background:'rgba(255,255,255,.02)',
                  border:`1px solid rgba(201,168,76,.25)`,
                  color:S.cream, fontSize:'0.78rem', fontWeight:500,
                  letterSpacing:'0.2em', textTransform:'uppercase',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  boxShadow:'inset 0 1px 0 rgba(201,168,76,.06)',
                }}>
                  <Zap size={15} color={S.gold}/>
                  {loading ? 'Connecting...' : 'Connect Extension'}
                </button>
              </div>

            ) : (
              <div>
                {/* Connect Extension */}
                <button className="auth-btn dark-btn" onClick={handleExtension} disabled={loading} style={{
                  width:'100%', padding:'15px',
                  background:'rgba(255,255,255,.02)',
                  border:`1px solid rgba(201,168,76,.25)`,
                  color:S.cream, fontSize:'0.78rem', fontWeight:500,
                  letterSpacing:'0.2em', textTransform:'uppercase',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  marginBottom:18,
                  boxShadow:'inset 0 1px 0 rgba(201,168,76,.06)',
                }}>
                  <Zap size={15} color={S.gold}/>
                  {loading ? 'Connecting...' : 'Connect Nostr Extension'}
                </button>

                <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0' }}>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,.1)' }}/>
                  <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.62rem', color:'rgba(201,168,76,.3)', letterSpacing:'0.18em' }}>OR</span>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,.1)' }}/>
                </div>

                <label style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.66rem', fontWeight:600, letterSpacing:'0.22em', textTransform:'uppercase', color:S.goldDark, display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                  <Lock size={12} color={S.goldDark}/> Login with nsec key
                </label>

                {/* nsec input — curved + visible border */}
                <div style={{ position:'relative', marginBottom:6 }}>
                  <input
                    className="nsec-input"
                    type={showNsec ? 'text' : 'password'}
                    value={nsec}
                    onChange={e => setNsec(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNsecLogin()}
                    placeholder="nsec1..."
                    style={{
                      width:'100%', padding:'13px 44px 13px 14px',
                      background:'rgba(255,255,255,.025)',
                      border:`1px solid rgba(201,168,76,.38)`,
                      color:S.cream, fontSize:'0.78rem', letterSpacing:'0.04em',
                      boxShadow:'inset 0 2px 8px rgba(0,0,0,.3)',
                    }}
                  />
                  <button onClick={() => setShowNsec(!showNsec)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(201,168,76,.45)', cursor:'pointer', padding:0, display:'flex' }}>
                    {showNsec ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>

                <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.58rem', color:'rgba(201,168,76,.22)', marginBottom:16, letterSpacing:'0.06em' }}>
                  // Never share your nsec — it is your private key
                </p>

                {/* Login — gold + spinner */}
                <button className="auth-btn btn-gold" onClick={handleNsecLogin} disabled={loading} style={{
                  width:'100%', padding:'15px',
                  background:`linear-gradient(135deg, #C9A84C 0%, #E2C060 45%, #C9A84C 100%)`,
                  color:'#0D0900', fontSize:'0.82rem', fontWeight:700,
                  letterSpacing:'0.22em', textTransform:'uppercase',
                  boxShadow:'0 4px 24px rgba(201,168,76,.28), inset 0 1px 0 rgba(255,255,255,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                }}>
                  {loading ? <Loader size={16} className="spin"/> : <Zap size={16}/>}
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            )}

            {error && (
              <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', color:'#E05050', textAlign:'center', marginTop:16, letterSpacing:'0.04em', animation:'fadeUp .3s ease' }}>
                ⚠ {error}
              </p>
            )}

            <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.57rem', color:'rgba(201,168,76,.18)', textAlign:'center', marginTop:22, letterSpacing:'0.08em', lineHeight:1.9 }}>
              // NIP-07 · Your keys, your identity<br/>
              // No email · No password · No KYC
            </p>
          </div>
        </div>

        {/* Back — more visible */}
        <button className="back-btn" onClick={onBack} style={{
          marginTop:20, background:'none', border:'none',
          fontFamily:'Montserrat,sans-serif', fontSize:'0.72rem',
          fontWeight:500, letterSpacing:'0.2em', textTransform:'uppercase',
          color:'rgba(201,168,76,.45)', cursor:'pointer', transition:'color .3s',
          display:'flex', alignItems:'center', gap:8, position:'relative', zIndex:2,
        }}>
          <ArrowLeft size={14}/> Back
        </button>

      </div>
    </>
  )
}

