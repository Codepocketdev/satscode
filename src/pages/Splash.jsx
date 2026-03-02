import { useState, useEffect, useRef } from 'react'

export default function Splash({ onDone }) {
  const [unlocked, setUnlocked] = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  function unlock() {
    if (unlocked) return
    setUnlocked(true)
    setDissolving(true)
    startDissolve()
    // Gold particles take ~2s to fade out — reveal content right as they finish
    setTimeout(() => onDone(), 2200)
  }

  useEffect(() => {
    const t = setTimeout(() => unlock(), 8000)
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current) }
  }, [])

  function startDissolve() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const cx = canvas.width / 2
    const cy = canvas.height / 2

    const count = 280
    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 5
      const size  = 1.5 + Math.random() * 4
      const colors = ['#C9A84C','#E8C96A','#F0D878','#8B6010','#D4A84C','#FFE066']
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.018,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.5 ? 'circle' : 'diamond',
        gravity: 0.04 + Math.random() * 0.03,
        shimmer: Math.random() > 0.6,
      }
    })

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      particlesRef.current.forEach(p => {
        if (p.alpha <= 0) return
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.99
        p.rotation += p.rotSpeed
        p.alpha -= p.decay
        if (p.alpha < 0) p.alpha = 0

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        if (p.shimmer) {
          ctx.shadowColor = '#C9A84C'
          ctx.shadowBlur = p.size * 3
        }

        ctx.fillStyle = p.color

        if (p.shape === 'diamond') {
          ctx.beginPath()
          ctx.moveTo(0, -p.size)
          ctx.lineTo(p.size * 0.6, 0)
          ctx.lineTo(0, p.size)
          ctx.lineTo(-p.size * 0.6, 0)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      })

      if (alive) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
  }

  const size = Math.min(window.innerWidth * 0.88, 400)

  return (
    <>
      <style>{`
        @keyframes spinCw   { from{transform:rotate(0deg)}   to{transform:rotate(360deg)}  }
        @keyframes spinCcw  { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
        @keyframes unlockCw  { to{transform:rotate(130deg);  opacity:0} }
        @keyframes unlockCcw { to{transform:rotate(-130deg); opacity:0} }
        @keyframes logoPulse {
          0%,100% { box-shadow:0 0 40px rgba(201,168,76,0.15),inset 0 0 30px rgba(0,0,0,0.6); }
          50%     { box-shadow:0 0 80px rgba(201,168,76,0.45),inset 0 0 30px rgba(0,0,0,0.6); }
        }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink   { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes beam1   { from{transform:rotate(0deg)}   to{transform:rotate(360deg)}  }
        @keyframes beam2   { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
        @keyframes beam3   { from{transform:rotate(45deg)}  to{transform:rotate(405deg)}  }
        @keyframes dissolveOut {
          0%   { opacity:1; filter:blur(0px);  transform:scale(1);    }
          30%  { opacity:0.8; filter:blur(2px); transform:scale(1.05); }
          60%  { opacity:0.4; filter:blur(6px); transform:scale(1.1);  }
          100% { opacity:0; filter:blur(12px); transform:scale(1.15); }
        }
        @keyframes goldPulseUnlock {
          0%   { box-shadow:0 0 40px rgba(201,168,76,0.3);  }
          50%  { box-shadow:0 0 120px rgba(201,168,76,1), 0 0 200px rgba(201,168,76,0.5); }
          100% { box-shadow:0 0 0px rgba(201,168,76,0); opacity:0; }
        }
      `}</style>

      {/* Particle canvas — zIndex above splash content */}
      <canvas ref={canvasRef} style={{
        position:'fixed', inset:0, zIndex:60,
        pointerEvents:'none',
        opacity: dissolving ? 1 : 0,
        transition:'opacity 0.1s',
      }}/>

      {/* Splash overlay — fades out after particles finish */}
      <div onClick={unlock} style={{
        position:'fixed', inset:0,
        background:'#0A0804',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        zIndex:50, cursor:'pointer',
        opacity: unlocked ? 0 : 1,
        transition: unlocked ? 'opacity 0.5s ease 1.8s' : 'none',
        pointerEvents: unlocked ? 'none' : 'all',
      }}>

        {/* Corner ornaments */}
        {[
          {top:20,left:20,borderWidth:'2px 0 0 2px'},
          {top:20,right:20,borderWidth:'2px 2px 0 0'},
          {bottom:20,left:20,borderWidth:'0 0 2px 2px'},
          {bottom:20,right:20,borderWidth:'0 2px 2px 0'},
        ].map((s,i) => (
          <div key={i} style={{
            position:'fixed', width:50, height:50,
            borderStyle:'solid', borderColor:'rgba(201,168,76,0.25)', ...s,
          }}/>
        ))}

        {/* Vault */}
        <div style={{
          position:'relative', width:size, height:size,
          display:'flex', alignItems:'center', justifyContent:'center',
          animation: dissolving ? 'dissolveOut 1.4s ease forwards' : 'none',
        }}>

          {/* Light beams */}
          {[
            {anim:'beam1 3s linear infinite', opacity:0.55},
            {anim:'beam2 5s linear infinite', opacity:0.35},
            {anim:'beam3 8s linear infinite', opacity:0.2},
          ].map((b,i) => (
            <div key={i} style={{
              position:'absolute', inset:0, borderRadius:'50%',
              animation: b.anim,
            }}>
              <div style={{
                position:'absolute', top:'50%', left:'50%',
                height:'4px', width:'50%',
                background:`linear-gradient(to right, rgba(201,168,76,${b.opacity}), transparent)`,
                transformOrigin:'left center', borderRadius:4,
              }}/>
            </div>
          ))}

          {/* Ring 1 */}
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%',
            border:'5px solid rgba(201,168,76,0.45)',
            boxShadow:'0 0 30px rgba(201,168,76,0.12),inset 0 0 30px rgba(201,168,76,0.06)',
            animation: unlocked ? 'unlockCw 0.5s ease-out forwards' : 'spinCw 18s linear infinite',
          }}>
            {[0,45,90,135,180,225,270,315].map((deg,i) => (
              <div key={i} style={{
                position:'absolute', width:9, height:9,
                background:'#C9A84C', borderRadius:'50%', opacity:.75,
                top:`calc(50% + ${Math.sin(deg*Math.PI/180)*47}% - 4.5px)`,
                left:`calc(50% + ${Math.cos(deg*Math.PI/180)*47}% - 4.5px)`,
              }}/>
            ))}
            <div style={{position:'absolute',top:7,left:'calc(50% - 2px)',width:4,height:22,background:'#C9A84C',opacity:.9,borderRadius:2}}/>
          </div>

          {/* Ring 2 */}
          <div style={{
            position:'absolute', width:'78%', height:'78%',
            borderRadius:'50%',
            border:'4px solid rgba(201,168,76,0.65)',
            boxShadow:'0 0 22px rgba(201,168,76,0.18)',
            animation: unlocked ? 'unlockCcw 0.5s ease-out 0.1s forwards' : 'spinCcw 10s linear infinite',
          }}>
            {[0,90,180,270].map((deg,i) => (
              <div key={i} style={{
                position:'absolute', width:8, height:8,
                background:'#C9A84C', borderRadius:'50%', opacity:.85,
                top:`calc(50% + ${Math.sin(deg*Math.PI/180)*47}% - 4px)`,
                left:`calc(50% + ${Math.cos(deg*Math.PI/180)*47}% - 4px)`,
              }}/>
            ))}
            <div style={{position:'absolute',top:6,left:'calc(50% - 2px)',width:4,height:18,background:'#C9A84C',borderRadius:2}}/>
          </div>

          {/* Ring 3 */}
          <div style={{
            position:'absolute', width:'57%', height:'57%',
            borderRadius:'50%',
            border:'3px solid rgba(201,168,76,0.9)',
            boxShadow:'0 0 18px rgba(201,168,76,0.28)',
            animation: unlocked ? 'unlockCw 0.5s ease-out 0.2s forwards' : 'spinCw 6s linear infinite',
          }}>
            {[0,60,120,180,240,300].map((deg,i) => (
              <div key={i} style={{
                position:'absolute', width:7, height:7,
                background:'#C9A84C', borderRadius:'50%', opacity:.95,
                top:`calc(50% + ${Math.sin(deg*Math.PI/180)*46}% - 3.5px)`,
                left:`calc(50% + ${Math.cos(deg*Math.PI/180)*46}% - 3.5px)`,
              }}/>
            ))}
            <div style={{position:'absolute',top:5,left:'calc(50% - 1.5px)',width:3,height:14,background:'#C9A84C',borderRadius:2}}/>
          </div>

          {/* Logo center */}
          <div style={{
            position:'absolute', width:'44%', height:'44%',
            borderRadius:'50%',
            background:'radial-gradient(circle,#1A1208 55%,#0F0A04 100%)',
            border:'2.5px solid rgba(201,168,76,0.7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:10, overflow:'hidden',
            animation: dissolving ? 'goldPulseUnlock 0.8s ease forwards' : 'logoPulse 3s ease-in-out infinite',
          }}>
            <img src="/logo.png" alt="SatsCode" style={{
              width:'115%', height:'115%',
              objectFit:'cover', objectPosition:'center',
              filter:'drop-shadow(0 0 10px rgba(201,168,76,0.5))',
            }}/>
          </div>
        </div>

        {/* Title */}
        <div style={{
          marginTop:32, textAlign:'center',
          animation: dissolving ? 'dissolveOut 1s ease 0.3s forwards' : 'fadeUp 1s ease 0.8s both',
        }}>
          <h1 style={{
            fontFamily:'Cinzel Decorative,serif',
            fontSize:'clamp(1.5rem,5vw,2.4rem)',
            color:'#F5ECD7', letterSpacing:'.08em',
          }}>
            Sats<span style={{color:'#C9A84C'}}>Code</span>
          </h1>
          <p style={{
            fontFamily:'Cinzel,serif', fontSize:'.6rem',
            letterSpacing:'.5em', color:'#8B6010',
            textTransform:'uppercase', marginTop:8,
          }}>
            The Bitcoin Builders Guild
          </p>
        </div>

        {/* Hint */}
        <p style={{
          marginTop:28,
          fontFamily:'JetBrains Mono,monospace',
          fontSize:'.62rem', letterSpacing:'.25em',
          color:'rgba(201,168,76,0.5)', textTransform:'uppercase',
          animation:'blink 2s ease-in-out 2s infinite, fadeUp 1s ease 1.5s both',
          opacity: dissolving ? 0 : undefined,
          transition: dissolving ? 'opacity 0.3s' : 'none',
        }}>
          [ Click to Enter ]
        </p>
      </div>
    </>
  )
}

