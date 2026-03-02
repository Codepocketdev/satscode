import { useEffect, useRef } from 'react'

const S = {
  // Colors
  cream: '#F5ECD7',
  creamDark: '#E8D9BC',
  ink: '#1A1108',
  inkSoft: '#2A1F0E',
  gold: '#C9A84C',
  goldDark: '#8B6010',

  // Fonts
  deco: 'Cinzel Decorative, serif',
  cinzel: 'Cinzel, serif',
  fell: 'IM Fell English, serif',
  mono: 'JetBrains Mono, monospace',
}

function Divider({ center = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, justifyContent: center ? 'center' : 'flex-start', margin:'20px 0' }}>
      <div style={{ width:80, height:1, background:`linear-gradient(to right, transparent, ${S.goldDark})` }}/>
      <div style={{ width:6, height:6, background:S.goldDark, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ width:80, height:1, background:`linear-gradient(to left, transparent, ${S.goldDark})` }}/>
    </div>
  )
}

function SectionHeader({ tag, title }) {
  return (
    <div style={{ textAlign:'center', marginBottom:60 }}>
      <span style={{ fontFamily:S.cinzel, fontSize:'.58rem', letterSpacing:'.5em', textTransform:'uppercase', color:S.goldDark, display:'block', marginBottom:12 }}>
        {tag}
      </span>
      <h2 style={{ fontFamily:S.deco, fontSize:'clamp(1.5rem,4vw,2.4rem)', color:S.ink, fontWeight:700 }}>
        {title}
      </h2>
      <Divider center />
    </div>
  )
}

export default function Home() {
  // Scroll fade-in
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.style.cssText += 'opacity:1;transform:translateY(0)'
      })
    }, { threshold: 0.08 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ background:S.cream, color:S.ink }}>

      {/* ── HERO ── */}
      <section style={{
        minHeight:'100vh',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        textAlign:'center',
        padding:'120px 24px 80px',
        background:`linear-gradient(180deg, ${S.cream} 0%, #EDD9B0 55%, ${S.cream} 100%)`,
        position:'relative', overflow:'hidden',
      }}>
        {/* Radial glow */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse at 50% 40%, rgba(139,96,16,0.08) 0%, transparent 65%)',
          pointerEvents:'none',
        }}/>

        {/* Corner frame */}
        {[
          {top:90,left:32,borderWidth:'1px 0 0 1px'},
          {top:90,right:32,borderWidth:'1px 1px 0 0'},
          {bottom:32,left:32,borderWidth:'0 0 1px 1px'},
          {bottom:32,right:32,borderWidth:'0 1px 1px 0'},
        ].map((s,i) => (
          <div key={i} style={{
            position:'absolute', width:50, height:50,
            borderStyle:'solid', borderColor:'rgba(139,96,16,0.2)', ...s
          }}/>
        ))}

        <p className="reveal" style={{
          fontFamily:S.cinzel, fontSize:'.6rem', letterSpacing:'.45em',
          color:S.goldDark, textTransform:'uppercase', marginBottom:28,
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease',
        }}>
          — Est. 2024 · Bitcoin Only —
        </p>

        <img className="reveal" src="/logo.png" alt="SatsCode" style={{
          width:130, height:130, objectFit:'contain', marginBottom:32,
          filter:'drop-shadow(0 4px 24px rgba(139,96,16,0.3))',
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .1s',
        }}/>

        <h1 className="reveal" style={{
          fontFamily:S.deco, fontSize:'clamp(3rem,9vw,6rem)',
          fontWeight:900, color:S.ink, lineHeight:1, letterSpacing:'.04em',
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .2s',
        }}>
          Sats<span style={{color:S.gold}}>Code</span>
        </h1>

        <p className="reveal" style={{
          fontFamily:S.cinzel, fontSize:'clamp(.58rem,1.5vw,.72rem)',
          letterSpacing:'.55em', color:S.goldDark, textTransform:'uppercase', marginTop:8,
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .3s',
        }}>
          The Bitcoin Builders Guild
        </p>

        <div className="reveal" style={{ opacity:0, transform:'translateY(20px)', transition:'all .8s ease .4s' }}>
          <Divider center />
        </div>

        <p className="reveal" style={{
          fontFamily:S.fell, fontSize:'1.05rem', fontStyle:'italic',
          color:S.inkSoft, maxWidth:540, lineHeight:1.85,
          margin:'0 auto 48px', opacity:.85,
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .5s',
        }}>
          A sovereign guild for those who build on the hardest money ever created.
          No altcoins. No noise. Only signal, sats, and shipped code.
        </p>

        <div className="reveal" style={{
          display:'flex', gap:18, justifyContent:'center', flexWrap:'wrap',
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .6s',
        }}>
          <button
            onClick={() => window.location.href='/registry'}
            style={{
              fontFamily:S.cinzel, fontSize:'.68rem', letterSpacing:'.25em',
              textTransform:'uppercase', color:S.cream, background:S.ink,
              border:'none', padding:'16px 40px', cursor:'pointer',
              clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              transition:'all .3s',
            }}
            onMouseEnter={e => e.target.style.background=S.goldDark}
            onMouseLeave={e => e.target.style.background=S.ink}
          >
            Enter the Guild
          </button>
          <button
            onClick={() => window.location.href='/stack'}
            style={{
              fontFamily:S.cinzel, fontSize:'.68rem', letterSpacing:'.25em',
              textTransform:'uppercase', color:S.ink, background:'transparent',
              border:`1px solid rgba(44,31,10,.4)`, padding:'16px 40px', cursor:'pointer',
              transition:'all .3s',
            }}
            onMouseEnter={e => { e.target.style.borderColor=S.gold; e.target.style.color=S.goldDark }}
            onMouseLeave={e => { e.target.style.borderColor='rgba(44,31,10,.4)'; e.target.style.color=S.ink }}
          >
            Explore the Stack
          </button>
        </div>

        {/* Stats */}
        <div className="reveal" style={{
          display:'flex', gap:60, justifyContent:'center',
          marginTop:70, flexWrap:'wrap',
          opacity:0, transform:'translateY(20px)', transition:'all .8s ease .7s',
        }}>
          {[['47','Builders'],['12','Tools Shipped'],['2.1M','Sats in Bounties']].map(([n,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <span style={{ fontFamily:S.deco, fontSize:'2rem', color:S.gold, display:'block' }}>{n}</span>
              <span style={{ fontFamily:S.cinzel, fontSize:'.52rem', letterSpacing:'.3em', textTransform:'uppercase', color:S.inkSoft, opacity:.65, marginTop:4, display:'block' }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── REGISTRY PREVIEW ── */}
      <section style={{ padding:'100px 24px', background:S.creamDark, borderTop:`1px solid rgba(139,96,16,.15)`, borderBottom:`1px solid rgba(139,96,16,.15)` }}>
        <SectionHeader tag="— I. The Registry —" title="Guild Builders" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:22, maxWidth:1100, margin:'0 auto' }}>
          {[
            { init:'S', name:'Satoshi Builds', handle:'npub1abc...xyz', bio:'"Building Lightning tools for the sovereign individual."', tags:['Lightning','Nostr','Rust'] },
            { init:'₿', name:'BlockCraft',     handle:'npub1def...uvw', bio:'"Node infrastructure and Bitcoin-native payment rails."',  tags:['Node','BTCPay','Python'] },
            { init:'N', name:'NostrForge',     handle:'npub1ghi...rst', bio:'"Decentralized identity and Nostr tooling for builders."',  tags:['Nostr','TypeScript','NDK'] },
          ].map((b,i) => (
            <div key={i} className="reveal" style={{
              background:S.cream, border:`1px solid rgba(139,96,16,.25)`,
              padding:30, position:'relative',
              boxShadow:'2px 4px 20px rgba(139,96,16,.06)',
              transition:'all .3s, opacity .7s ease, transform .7s ease',
              opacity:0, transform:'translateY(22px)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=S.goldDark; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='2px 8px 30px rgba(139,96,16,.14)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(139,96,16,.25)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='2px 4px 20px rgba(139,96,16,.06)' }}
            >
              {/* Corner diamonds */}
              {['tl','br'].map(c => (
                <span key={c} style={{ position:'absolute', color:S.gold, fontSize:'.45rem', opacity:.6,
                  ...(c==='tl' ? {top:8,left:8} : {bottom:8,right:8}) }}>◆</span>
              ))}
              <div style={{ width:52, height:52, borderRadius:'50%', border:`1.5px solid ${S.goldDark}`, background:S.ink, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:S.cinzel, fontSize:'1.1rem', color:S.cream, marginBottom:14 }}>{b.init}</div>
              <div style={{ fontFamily:S.cinzel, fontSize:'.9rem', color:S.ink, marginBottom:3 }}>{b.name}</div>
              <div style={{ fontFamily:S.mono, fontSize:'.65rem', color:S.gold, marginBottom:10 }}>{b.handle}</div>
              <div style={{ fontSize:'.82rem', color:S.inkSoft, lineHeight:1.65, fontStyle:'italic', marginBottom:14, opacity:.8 }}>{b.bio}</div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                {b.tags.map(t => (
                  <span key={t} style={{ fontFamily:S.mono, fontSize:'.58rem', color:S.goldDark, border:`1px solid rgba(139,96,16,.35)`, padding:'3px 9px' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:48 }}>
          <button onClick={() => window.location.href='/registry'} style={{
            fontFamily:S.cinzel, fontSize:'.65rem', letterSpacing:'.25em',
            textTransform:'uppercase', color:S.goldDark, background:'transparent',
            border:`1px solid rgba(139,96,16,.4)`, padding:'13px 36px', cursor:'pointer', transition:'all .3s',
          }}
            onMouseEnter={e => { e.target.style.borderColor=S.gold; e.target.style.color=S.ink }}
            onMouseLeave={e => { e.target.style.borderColor='rgba(139,96,16,.4)'; e.target.style.color=S.goldDark }}
          >
            View All Builders →
          </button>
        </div>
      </section>

      {/* ── STACK PREVIEW ── */}
      <section style={{ padding:'100px 24px', background:S.cream }}>
        <SectionHeader tag="— II. The Stack —" title="Bitcoin Tools Directory" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:0, maxWidth:1100, margin:'0 auto', border:`1px solid rgba(139,96,16,.18)` }}>
          {[
            { n:'001', name:'LightningKit',   desc:'Modular SDK for integrating Lightning Network payments. Built for speed and sovereignty.', sats:'⚡ Free · Open Source' },
            { n:'002', name:'NostrAuth',      desc:'Decentralized authentication using Nostr keys. No email, no password, no KYC.',          sats:'⚡ Free · MIT License' },
            { n:'003', name:'SatsTracker',    desc:'Privacy-first portfolio tracker denominated entirely in sats. Zero fiat.',               sats:'⚡ 21,000 sats/yr' },
            { n:'004', name:'BTCPay Starter', desc:'One-command BTCPay Server deployment with pre-configured plugins.',                      sats:'⚡ Free · Open Source' },
          ].map((t,i) => (
            <div key={i} className="reveal" style={{
              padding:28, borderRight:`1px solid rgba(139,96,16,.12)`,
              borderBottom:`1px solid rgba(139,96,16,.12)`,
              cursor:'pointer', transition:'background .3s, opacity .7s ease, transform .7s ease',
              opacity:0, transform:'translateY(22px)',
            }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(139,96,16,.04)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <div style={{ fontFamily:S.cinzel, fontSize:'.55rem', letterSpacing:'.3em', color:'rgba(139,96,16,.5)', marginBottom:10 }}>{t.n}</div>
              <div style={{ fontFamily:S.cinzel, fontSize:'1rem', color:S.ink, marginBottom:7 }}>{t.name}</div>
              <div style={{ fontSize:'.82rem', color:S.inkSoft, lineHeight:1.6, fontStyle:'italic', opacity:.8 }}>{t.desc}</div>
              <div style={{ fontFamily:S.mono, fontSize:'.7rem', color:S.gold, marginTop:14 }}>{t.sats}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOUNTIES PREVIEW ── */}
      <section style={{ padding:'100px 24px', background:S.creamDark, borderTop:`1px solid rgba(139,96,16,.15)` }}>
        <SectionHeader tag="— III. The Bounties —" title="Build. Earn. Repeat." />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:22, maxWidth:1100, margin:'0 auto' }}>
          {[
            { amt:'500,000 sats', title:'Nostr Feed Aggregator',     desc:'Bitcoin-native feed reader. Must support NIP-01, NIP-02, NIP-65.' },
            { amt:'250,000 sats', title:'Lightning QR Widget',       desc:'Embeddable Lightning invoice widget. React + vanilla JS version.' },
            { amt:'1,000,000 sats', title:'Builder Reputation System', desc:'Nostr-based reputation layer. Verifiable proof of shipped code.' },
          ].map((b,i) => (
            <div key={i} className="reveal" style={{
              background:S.cream, border:`1px solid rgba(139,96,16,.22)`,
              padding:30, transition:'all .3s, opacity .7s ease, transform .7s ease',
              boxShadow:'2px 4px 16px rgba(139,96,16,.05)',
              opacity:0, transform:'translateY(22px)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=S.goldDark; e.currentTarget.style.transform='translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(139,96,16,.22)'; e.currentTarget.style.transform='translateY(0)' }}
            >
              <div style={{ fontFamily:S.deco, fontSize:'1.4rem', color:S.gold, marginBottom:10 }}>{b.amt}</div>
              <div style={{ fontFamily:S.cinzel, fontSize:'.9rem', color:S.ink, marginBottom:8 }}>{b.title}</div>
              <div style={{ fontSize:'.82rem', color:S.inkSoft, lineHeight:1.6, fontStyle:'italic', marginBottom:18, opacity:.8 }}>{b.desc}</div>
              <span style={{ fontFamily:S.mono, fontSize:'.58rem', letterSpacing:'.15em', textTransform:'uppercase', color:S.cream, background:S.ink, padding:'4px 12px' }}>Open</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── JOIN ── */}
      <section style={{
        padding:'120px 24px', textAlign:'center',
        background:`linear-gradient(180deg, #EDD9B0 0%, #E8D0A0 50%, #EDD9B0 100%)`,
        borderTop:`1px solid rgba(139,96,16,.2)`,
      }}>
        <div className="reveal" style={{ opacity:0, transform:'translateY(22px)', transition:'all .8s ease' }}>
          <span style={{ fontFamily:S.cinzel, fontSize:'.58rem', letterSpacing:'.5em', textTransform:'uppercase', color:S.goldDark, display:'block', marginBottom:14 }}>— The Guild Awaits —</span>
          <h2 style={{ fontFamily:S.deco, fontSize:'clamp(1.8rem,5vw,3.2rem)', color:S.ink, marginBottom:18 }}>Ready to Build?</h2>
          <Divider center />
          <p style={{ fontFamily:S.fell, fontSize:'1.05rem', fontStyle:'italic', color:S.inkSoft, maxWidth:500, margin:'0 auto 44px', lineHeight:1.85, opacity:.85 }}>
            Connect your Nostr identity. Register your tools. Claim your place in the guild's permanent record.
          </p>
          <button style={{
            fontFamily:S.cinzel, fontSize:'.68rem', letterSpacing:'.25em',
            textTransform:'uppercase', color:S.cream, background:S.ink,
            border:'none', padding:'18px 56px', cursor:'pointer',
            clipPath:'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
            transition:'all .3s',
          }}
            onMouseEnter={e => e.target.style.background=S.goldDark}
            onMouseLeave={e => e.target.style.background=S.ink}
          >
            Connect with Nostr
          </button>
          <p style={{ fontFamily:S.mono, fontSize:'.65rem', color:S.goldDark, marginTop:22, letterSpacing:'.1em', opacity:.7 }}>
            // Powered by Nostr · Verified by Lightning · Recorded on Bitcoin
          </p>
        </div>
      </section>

    </div>
  )
}
