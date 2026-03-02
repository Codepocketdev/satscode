import { useState, useEffect, useRef } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { nip19 } from 'nostr-tools'
import { Zap, Flame, TrendingUp, Calendar, Loader, Wrench, Github, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const RELAYS = ['wss://relay.damus.io','wss://nos.lol','wss://relay.nostr.band','wss://relay.primal.net']

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A', goldDark:'#8B6010',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
}

const SKILL_COLORS = {
  bitcoin:'#C9A84C', nostr:'#A78BFA', lightning:'#FCD34D', react:'#61DAFB',
  rust:'#F97316', python:'#3B82F6', typescript:'#60A5FA', design:'#EC4899',
  mobile:'#8B5CF6', web:'#22C55E', devops:'#F59E0B', solidity:'#9CA3AF',
}
const CATEGORY_COLORS = {
  wallet:'#C9A84C', relay:'#A78BFA', client:'#61DAFB', library:'#22C55E',
  bot:'#F97316', API:'#60A5FA', other:'#9CA3AF',
}

let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }
const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }

const timeAgo = ts => {
  const s = Math.floor(Date.now()/1000) - ts
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return new Date(ts*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
}

const parseTool = (content) => {
  const lines = (content||'').split('\n')
  const d = { name:'', description:'', category:'', stack:[], github:'', url:'' }
  if (lines[0]?.startsWith('TOOL:')) d.name = lines[0].replace('TOOL:','').trim()
  for (const line of lines.slice(1)) {
    const col = line.indexOf(':'); if (col===-1) continue
    const key = line.slice(0,col).trim().toLowerCase()
    const val = line.slice(col+1).trim()
    if (key==='description') d.description = val
    if (key==='category')    d.category    = val
    if (key==='stack')       d.stack       = val.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    if (key==='github')      d.github      = val
    if (key==='url')         d.url         = val
  }
  return d
}

// ── Contribution Graph ────────────────────────────────────────────────────────
function ContribGraph({ activityEvents }) {
  const today = new Date()
  today.setHours(0,0,0,0)

  // Count all satscode activity per day
  const dayMap = {}
  activityEvents.forEach(e => {
    const d = new Date(e.created_at * 1000)
    d.setHours(0,0,0,0)
    const key = d.toISOString().slice(0,10)
    dayMap[key] = (dayMap[key]||0) + 1
  })

  // Start from today aligned to Sunday, go 364 days forward
  const start = new Date(today)
  start.setDate(start.getDate() - start.getDay()) // align to Sunday

  const end = new Date(start)
  end.setDate(end.getDate() + 363)

  const weeks = []
  const cur = new Date(start)
  while (cur <= end) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0,10)
      const isFuture = new Date(cur) > today
      week.push({
        key,
        count: dayMap[key]||0,
        isFuture,
        date: new Date(cur)
      })
      cur.setDate(cur.getDate()+1)
    }
    weeks.push(week)
  }

  const getColor = (count, isFuture) => {
    if (isFuture) return 'rgba(201,168,76,0.03)'  // road ahead — very faint
    if (count===0) return 'rgba(201,168,76,0.08)' // past empty
    if (count===1) return 'rgba(201,168,76,0.28)'
    if (count===2) return 'rgba(201,168,76,0.5)'
    if (count<=4)  return 'rgba(201,168,76,0.72)'
    return '#C9A84C'
  }

  // Month labels
  const monthLabels = []
  weeks.forEach((week, wi) => {
    const first = week[0]
    if (first && first.date.getDate() <= 7)
      monthLabels.push({ wi, label: first.date.toLocaleString('en',{month:'short'}) })
  })

  return (
    <div style={{ overflowX:'auto', paddingBottom:4 }}>
      {/* Month labels */}
      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
        {weeks.map((_,wi) => {
          const ml = monthLabels.find(m=>m.wi===wi)
          return (
            <div key={wi} style={{ width:11, flexShrink:0, fontFamily:'JetBrains Mono,monospace', fontSize:'0.42rem', color:'rgba(201,168,76,0.35)' }}>
              {ml ? ml.label : ''}
            </div>
          )
        })}
      </div>
      {/* Grid */}
      <div style={{ display:'flex', gap:3 }}>
        {weeks.map((week,wi) => (
          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {week.map((day,di) => (
              <div key={di}
                title={day.isFuture ? '' : day.count>0 ? `${day.key}: ${day.count} action${day.count!==1?'s':''}` : `${day.key}: no activity`}
                style={{ width:11, height:11, borderRadius:2, background:getColor(day.count, day.isFuture), flexShrink:0 }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, justifyContent:'flex-end' }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.42rem', color:'rgba(201,168,76,0.3)' }}>less</span>
        {[0,1,2,3,5].map(i=>(
          <div key={i} style={{ width:11, height:11, borderRadius:2, background:getColor(i, false) }}/>
        ))}
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.42rem', color:'rgba(201,168,76,0.3)' }}>more</span>
      </div>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsRow({ activityEvents, toolEvents }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const daySet = new Set(activityEvents.map(e => {
    const d = new Date(e.created_at*1000); d.setHours(0,0,0,0); return d.toISOString().slice(0,10)
  }))

  // Current streak
  let streak = 0
  const check = new Date(today)
  while (daySet.has(check.toISOString().slice(0,10))) {
    streak++
    check.setDate(check.getDate()-1)
  }

  // Longest streak
  const days = [...daySet].sort()
  let longest = 0, cur = 1
  for (let i=1; i<days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i-1])) / 86400000
    if (diff===1) { cur++; longest = Math.max(longest,cur) }
    else cur = 1
  }
  longest = Math.max(longest, streak, days.length>0?1:0)

  const firstShip = toolEvents.length
    ? new Date(Math.min(...toolEvents.map(e=>e.created_at))*1000)
        .toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})
    : '—'

  const stats = [
    { Icon: Wrench,     color: S.gold,     label:'Tools Shipped',  value: toolEvents.length },
    { Icon: Flame,      color:'#E8944A',   label:'Active Days',    value: daySet.size },
    { Icon: TrendingUp, color: S.gold,     label:'Current Streak', value: streak + 'd' },
    { Icon: Calendar,   color: S.gold,     label:'First Ship',     value: firstShip },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
      {stats.map((s,i) => (
        <div key={i} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <s.Icon size={13} color={s.color}/>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.4)', letterSpacing:'0.06em' }}>{s.label}</span>
          </div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.4rem', fontWeight:700, color:S.cream }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ event }) {
  const tool = parseTool(event.content)
  return (
    <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px', marginBottom:12, transition:'border-color .2s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=S.borderMid}
      onMouseLeave={e=>e.currentTarget.style.borderColor=S.border}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', fontWeight:700, color:S.cream }}>{tool.name}</div>
            {tool.category && (
              <span style={{ padding:'2px 8px', borderRadius:20, background:(CATEGORY_COLORS[tool.category]||S.gold)+'14', border:`1px solid ${(CATEGORY_COLORS[tool.category]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.5rem', fontWeight:700, color:CATEGORY_COLORS[tool.category]||S.gold }}>
                {tool.category}
              </span>
            )}
          </div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.28)' }}>{timeAgo(event.created_at)}</div>
        </div>
      </div>
      {tool.description && (
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontWeight:300, fontSize:'0.92rem', color:S.creamDim, lineHeight:1.7, marginBottom:10 }}>
          {tool.description}
        </div>
      )}
      {tool.stack.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
          {tool.stack.map(s=>(
            <span key={s} style={{ padding:'3px 8px', borderRadius:20, background:(SKILL_COLORS[s]||S.gold)+'14', border:`1px solid ${(SKILL_COLORS[s]||S.gold)}35`, fontFamily:'Montserrat,sans-serif', fontSize:'0.5rem', fontWeight:600, color:SKILL_COLORS[s]||S.gold }}>{s}</span>
          ))}
        </div>
      )}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        {tool.github && (
          <a href={tool.github.startsWith('http')?tool.github:'https://'+tool.github} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 11px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:600, color:S.creamFaint, textDecoration:'none' }}>
            <Github size={11}/> GitHub
          </a>
        )}
        {tool.url && (
          <a href={tool.url.startsWith('http')?tool.url:'https://'+tool.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 11px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${S.border}`, fontFamily:'Montserrat,sans-serif', fontSize:'0.58rem', fontWeight:600, color:S.creamFaint, textDecoration:'none' }}>
            <ExternalLink size={11}/> Live
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProofOfWork({ user }) {
  const [toolEvents,     setToolEvents]     = useState([])
  const [activityEvents, setActivityEvents] = useState([])
  const [loading,        setLoading]        = useState(true)
  const navigate = useNavigate()
  const myPubkey = getMyPubkey()
  const seenIds = useRef(new Set())

  useEffect(() => {
    if (!myPubkey) { setLoading(false); return }

    const deletedIds = new Set()
    const tools = []
    const activity = []

    const delSub = pool().subscribe(RELAYS,
      { kinds:[5], authors:[myPubkey], since: Math.floor(Date.now()/1000)-86400*365, limit:500 },
      {
        onevent(e) { (e.tags||[]).filter(t=>t[0]==='e'&&t[1]).forEach(t=>deletedIds.add(t[1])) },
        oneose() {
          delSub.close()
          const actSub = pool().subscribe(RELAYS,
            { kinds:[1], authors:[myPubkey], '#t':['satscode'], limit:500, since: Math.floor(Date.now()/1000)-86400*365 },
            {
              onevent(e) {
                if (seenIds.current.has(e.id)) return
                if (deletedIds.has(e.id)) return
                seenIds.current.add(e.id)
                activity.push(e)
                setActivityEvents([...activity])
                if (e.content.startsWith('TOOL:')) {
                  tools.push(e)
                  tools.sort((a,b)=>b.created_at-a.created_at)
                  setToolEvents([...tools])
                }
              },
              oneose() { actSub.close(); setLoading(false) }
            }
          )
          setTimeout(()=>setLoading(false), 8000)
        }
      }
    )

    return () => { try{delSub.close()}catch{} }
  }, [myPubkey])

  const isLoggedIn = !!myPubkey

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px 120px' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.8rem', fontWeight:700, color:S.cream, margin:0, marginBottom:4 }}>
            Proof of <span style={{ color:S.gold, fontStyle:'italic' }}>Work</span>
          </h1>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem', color:'rgba(201,168,76,0.3)', letterSpacing:'0.1em' }}>// your activity on satscode</div>
        </div>
        {isLoggedIn && (
          <button onClick={()=>navigate('/submit-tool')}
            style={{ display:'flex', alignItems:'center', gap:6, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:S.bg, letterSpacing:'0.08em' }}>
            <Wrench size={14}/> Submit Tool
          </button>
        )}
      </div>

      {/* Not logged in */}
      {!isLoggedIn && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Wrench size={36} color={S.goldDark} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', color:S.creamDim, marginBottom:6 }}>Log in to view your proof of work</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'rgba(201,168,76,0.3)' }}>// your activity lives on Nostr</div>
        </div>
      )}

      {/* Loading */}
      {isLoggedIn && loading && (
        <div style={{ textAlign:'center', padding:'50px 0' }}>
          <Loader size={22} color={S.gold} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 12px' }}/>
          <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', color:S.creamFaint }}>Loading your activity…</div>
        </div>
      )}

      {isLoggedIn && !loading && (
        <>
          {/* Contribution graph */}
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px', marginBottom:16 }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.35)', letterSpacing:'0.1em', marginBottom:12 }}>
              // {activityEvents.length} actions · next 12 months
            </div>
            <ContribGraph activityEvents={activityEvents}/>
          </div>

          {/* Stats */}
          <StatsRow activityEvents={activityEvents} toolEvents={toolEvents}/>

          {/* Tools section */}
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.52rem', color:'rgba(201,168,76,0.35)', letterSpacing:'0.1em', marginBottom:14 }}>
            // shipped tools ({toolEvents.length})
          </div>

          {toolEvents.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontStyle:'italic', color:S.creamFaint, marginBottom:16 }}>No tools submitted yet</div>
              <button onClick={()=>navigate('/submit-tool')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, background:`linear-gradient(135deg,${S.gold},${S.goldLight})`, border:'none', borderRadius:10, padding:'11px 20px', cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.75rem', color:S.bg }}>
                <Wrench size={14}/> Submit Your First Tool
              </button>
            </div>
          ) : (
            <div style={{ animation:'fadeUp .3s ease' }}>
              {toolEvents.map(e => <ToolCard key={e.id} event={e}/>)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
