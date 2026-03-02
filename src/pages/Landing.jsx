import { useEffect, useState, useRef } from 'react'
import { Shield, Code2, Zap, Lock, Flame, ChevronDown } from 'lucide-react'

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', card: '#111009', card2: '#161209',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.72)',
  border: 'rgba(201,168,76,0.16)',
}

function Divider() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, justifyContent:'center', margin:'22px 0' }}>
      <div style={{ width:60, height:1, background:`linear-gradient(to right,transparent,${S.goldDark})` }}/>
      <div style={{ width:6, height:6, background:S.goldDark, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ width:60, height:1, background:`linear-gradient(to left,transparent,${S.goldDark})` }}/>
    </div>
  )
}

function RevealSection({ children, delay = 0 }) {
  const ref = useRef()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting) setVisible(true) }, { threshold:0.1 })
    if(ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .8s ease ${delay}s, transform .8s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

const values = [
  {
    icon: Shield,
    n: 'I',
    title: 'Sovereignty First',
    desc: 'We believe every human deserves financial sovereignty. No bank, no government, no corporation should control your money. Bitcoin makes this possible — and we build the tools that make Bitcoin accessible.',
  },
  {
    icon: Code2,
    n: 'II',
    title: 'Build in the Open',
    desc: 'Great software is built by builders who show their work. Every tool we ship, every line of code we write, every sat we earn — it all lives on a transparent, verifiable, immutable record.',
  },
  {
    icon: Zap,
    n: 'III',
    title: 'Earn in Sats',
    desc: 'The guild pays in the hardest money ever created. No fiat, no promises, no equity. When you ship something the guild needs, you get paid in sats — instantly, borderlessly, permissionlessly.',
  },
  {
    icon: Lock,
    n: 'IV',
    title: 'Identity on Nostr',
    desc: 'Your identity belongs to you, not to us. We use Nostr — a decentralized protocol where your keypair is your passport. No email, no password, no KYC. Your keys, your guild membership.',
  },
]

export default function Landing({ onLogin, onJoin }) {
  const [heroVisible, setHeroVisible] = useState(false)
  useEffect(() => { setTimeout(() => setHeroVisible(true), 100) }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse     { 0%,100%{opacity:.3;transform:translateX(-50%) scaleX(1)} 50%{opacity:.7;transform:translateX(-50%) scaleX(1.1)} }
        @keyframes glow      { 0%,100%{opacity:.25} 50%{opacity:.6} }
        @keyframes scrollBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }

        .land-btn {
          transition: all .3s ease; cursor: pointer; border: none;
          border-radius: 10px;
        }
        .land-btn:hover { transform: translateY(-3px); filter: brightness(1.1); }

        .btn-gold-land {
          position: relative; overflow: hidden;
        }
        .btn-gold-land::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 3s ease infinite;
          border-radius: 10px;
        }

        .val-card { transition: all .35s ease; border-radius: 10px; }
        .val-card:hover { border-color:rgba(201,168,76,.4) !important; background:rgba(201,168,76,.03) !important; transform:translateY(-5px) !important; }
      `}</style>

      <div style={{ background:S.bg, minHeight:'100vh', overflowX:'hidden', fontFamily:'Montserrat,sans-serif' }}>

        {/* ─── HERO ─── */}
        <section style={{
          minHeight:'100vh', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          textAlign:'center', padding:'100px 28px 80px',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.055) 0%,transparent 65%)', pointerEvents:'none' }}/>

          {[{top:24,left:24,bw:'1px 0 0 1px'},{top:24,right:24,bw:'1px 1px 0 0'},{bottom:24,left:24,bw:'0 0 1px 1px'},{bottom:24,right:24,bw:'0 1px 1px 0'}].map((s,i) => (
            <div key={i} style={{ position:'fixed', width:44, height:44, borderStyle:'solid', borderWidth:s.bw, borderColor:'rgba(201,168,76,.16)' }}/>
          ))}

          <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', fontWeight:500, letterSpacing:'0.45em', color:S.goldDark, textTransform:'uppercase', marginBottom:32, opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease both':'none' }}>
            — Est. 2025 · The Guild of Sovereign Builders —
          </p>

          <div style={{ width:100, height:100, borderRadius:'50%', overflow:'hidden', border:`2px solid rgba(201,168,76,.4)`, margin:'0 auto 30px', boxShadow:'0 0 60px rgba(201,168,76,.18)', opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .1s both':'none' }}>
            <img src="/logo.png" alt="SatsCode" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          </div>

          <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(3.5rem,11vw,6.5rem)', fontWeight:700, lineHeight:.95, letterSpacing:'.04em', color:S.cream, marginBottom:10, opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .2s both':'none' }}>
            Sats<span style={{color:S.gold}}>Code</span>
          </h1>

          <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:500, letterSpacing:'0.45em', color:S.goldDark, textTransform:'uppercase', marginBottom:8, opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .3s both':'none' }}>
            The Bitcoin Builders Guild
          </p>

          <Divider />

          <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(1.4rem,4vw,1.75rem)', fontStyle:'italic', fontWeight:300, color:S.creamDim, maxWidth:580, lineHeight:1.85, margin:'0 auto 48px', opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .4s both':'none' }}>
            A sovereign guild for those who build on the hardest money ever created.
            No altcoins. No noise. Only signal, sats, and shipped code.
          </p>

          {/* CTAs — rounded, no clipPath, shimmer on gold */}
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .5s both':'none' }}>
            <button className="land-btn" onClick={onLogin} style={{
              fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:500,
              letterSpacing:'0.22em', textTransform:'uppercase',
              color:S.cream, background:'transparent',
              border:`1px solid rgba(201,168,76,.35)`,
              padding:'16px 48px',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <Zap size={16}/> Login
            </button>
            <button className="land-btn btn-gold-land" onClick={onJoin} style={{
              fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:700,
              letterSpacing:'0.22em', textTransform:'uppercase',
              color:S.bg, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`,
              padding:'16px 48px',
              boxShadow:'0 6px 36px rgba(201,168,76,.3)',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <Shield size={16}/> Join the Guild
            </button>
          </div>

          <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem', color:'rgba(201,168,76,.28)', marginTop:20, letterSpacing:'0.1em', opacity: heroVisible?1:0, animation: heroVisible?'fadeUp .9s ease .6s both':'none' }}>
            // No email · No password · Your Nostr keys
          </p>

          <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, animation:'glow 2.5s ease 2s infinite' }}>
            <div style={{ width:1, height:36, background:'linear-gradient(to bottom,rgba(201,168,76,.4),transparent)', animation:'scrollBob 2s ease-in-out infinite' }}/>
            <ChevronDown size={16} color='rgba(201,168,76,.4)'/>
            <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.55rem', fontWeight:500, letterSpacing:'0.4em', color:'rgba(201,168,76,.35)', textTransform:'uppercase' }}>Scroll</span>
          </div>
        </section>

        {/* ─── MISSION ─── */}
        <section style={{ padding:'110px 28px', borderTop:`1px solid ${S.border}`, position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:400, height:1, background:`linear-gradient(to right,transparent,${S.gold},transparent)`, opacity:.2, animation:'pulse 4s ease-in-out infinite' }}/>
          <div style={{ maxWidth:780, margin:'0 auto', textAlign:'center' }}>
            <RevealSection>
              <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.5em', color:S.goldDark, textTransform:'uppercase', marginBottom:18 }}>
                — Our Mission —
              </p>
              <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(2.2rem,6vw,4rem)', fontWeight:700, color:S.cream, lineHeight:1.1, marginBottom:10 }}>
                Build the tools that<br/>
                <span style={{color:S.gold, fontStyle:'italic'}}>free the world.</span>
              </h2>
              <Divider />
              <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(1.25rem,3vw,1.45rem)', fontStyle:'italic', fontWeight:300, color:S.creamDim, lineHeight:1.95, marginBottom:24 }}>
                Bitcoin is the most important monetary invention in human history. But technology alone is not enough — it needs builders. It needs a guild of sovereign individuals who dedicate their craft to building the infrastructure of financial freedom.
              </p>
              <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(1.25rem,3vw,1.45rem)', fontStyle:'italic', fontWeight:300, color:S.creamDim, lineHeight:1.95 }}>
                SatsCode exists to unite those builders. To fund their work, record their contributions, and give them the tools they need to ship faster, earn more, and build the sovereign future — together.
              </p>
            </RevealSection>
          </div>
        </section>

        {/* ─── MANIFESTO QUOTE ─── */}
        <section style={{ padding:'80px 28px', background:'rgba(201,168,76,.03)', borderTop:`1px solid ${S.border}`, borderBottom:`1px solid ${S.border}` }}>
          <RevealSection>
            <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center' }}>
              <Flame size={30} color={S.goldDark} style={{ margin:'0 auto 18px', display:'block', opacity:.7 }}/>
              <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(1.5rem,4.5vw,2.2rem)', fontStyle:'italic', fontWeight:300, color:S.cream, lineHeight:1.75, letterSpacing:'.02em' }}>
                "The most subversive act in the twenty-first century is to build tools that make central authority irrelevant."
              </p>
              <Divider />
              <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.7rem', fontWeight:500, letterSpacing:'0.35em', color:S.goldDark, textTransform:'uppercase' }}>
                — The SatsCode Guild Manifesto
              </p>
            </div>
          </RevealSection>
        </section>

        {/* ─── VALUES ─── */}
        <section style={{ padding:'110px 28px', borderBottom:`1px solid ${S.border}` }}>
          <div style={{ maxWidth:1020, margin:'0 auto' }}>
            <RevealSection>
              <div style={{ textAlign:'center', marginBottom:68 }}>
                <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.5em', color:S.goldDark, textTransform:'uppercase', marginBottom:16 }}>
                  — What We Stand For —
                </p>
                <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:700, color:S.cream }}>
                  The Guild's Principles
                </h2>
                <Divider />
              </div>
            </RevealSection>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:20 }}>
              {values.map((v,i) => {
                const Icon = v.icon
                return (
                  <RevealSection key={i} delay={i*0.1}>
                    <div className="val-card" style={{ background:S.card2, border:`1px solid ${S.border}`, padding:'32px 26px', position:'relative', height:'100%' }}>
                      <span style={{ position:'absolute', top:10, left:10, color:S.gold, fontSize:'0.4rem', opacity:.4 }}>◆</span>
                      <span style={{ position:'absolute', bottom:10, right:10, color:S.gold, fontSize:'0.4rem', opacity:.4 }}>◆</span>
                      <Icon size={24} color={S.goldDark} style={{ marginBottom:10, opacity:.85 }}/>
                      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'2.4rem', fontWeight:300, color:'rgba(201,168,76,.2)', lineHeight:1, marginBottom:14 }}>{v.n}</div>
                      <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'1rem', fontWeight:600, color:S.cream, marginBottom:14, letterSpacing:'0.04em' }}>{v.title}</div>
                      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.2rem', fontStyle:'italic', fontWeight:300, color:S.creamDim, lineHeight:1.8 }}>{v.desc}</div>
                    </div>
                  </RevealSection>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section style={{ padding:'110px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.05) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <RevealSection>
            <p style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.5em', color:S.goldDark, textTransform:'uppercase', marginBottom:18 }}>
              — The Guild Awaits —
            </p>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(2.2rem,6vw,4.2rem)', fontWeight:700, color:S.cream, lineHeight:1.1, marginBottom:10 }}>
              Are you ready<br/>
              <span style={{color:S.gold, fontStyle:'italic'}}>to build?</span>
            </h2>
            <Divider />
            <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(1.25rem,3vw,1.45rem)', fontStyle:'italic', fontWeight:300, color:S.creamDim, maxWidth:500, margin:'0 auto 44px', lineHeight:1.9 }}>
              Connect your Nostr identity. Register as a builder. Ship tools. Claim bounties. Earn sats. Leave your mark on the permanent record.
            </p>
            <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:20 }}>
              <button className="land-btn" onClick={onLogin} style={{
                fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:500,
                letterSpacing:'0.22em', textTransform:'uppercase',
                color:S.cream, background:'transparent',
                border:`1px solid rgba(201,168,76,.35)`,
                padding:'16px 48px',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <Zap size={16}/> Login
              </button>
              <button className="land-btn btn-gold-land" onClick={onJoin} style={{
                fontFamily:'Montserrat,sans-serif', fontSize:'0.82rem', fontWeight:700,
                letterSpacing:'0.22em', textTransform:'uppercase',
                color:S.bg, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`,
                padding:'16px 48px',
                boxShadow:'0 6px 40px rgba(201,168,76,.3)',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <Shield size={16}/> Join the Guild
              </button>
            </div>
            <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'rgba(201,168,76,.22)', letterSpacing:'0.1em' }}>
              // Powered by Nostr · Verified by Lightning · Recorded on Bitcoin
            </p>
          </RevealSection>
        </section>

      </div>
    </>
  )
}

