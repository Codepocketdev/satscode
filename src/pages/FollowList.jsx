import { useState, useEffect } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserCheck, Loader } from 'lucide-react'

const RELAYS = ['wss://relay.damus.io','wss://nos.lol','wss://relay.nostr.band','wss://relay.primal.net']

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A', goldDark:'#8B6010',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
}

let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }
const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }
const getSkBytes  = () => { try { const n=localStorage.getItem('satscode_nsec'); if(!n)return null; const{type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch { return null } }
const getMyContacts = () => { try { return JSON.parse(localStorage.getItem('satscode_contacts')||'[]') } catch { return [] } }
const saveMyContacts = c => { try { localStorage.setItem('satscode_contacts', JSON.stringify(c)) } catch {} }

export default function FollowList() {
  const { type, npub } = useParams() // type = 'followers' | 'following'
  const navigate = useNavigate()

  const [pubkeys,   setPubkeys]   = useState([])
  const [profiles,  setProfiles]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [myContacts,setMyContacts]= useState(getMyContacts())
  const [busy,      setBusy]      = useState({})
  const myPubkey = getMyPubkey()

  // Decode target pubkey
  const targetHex = (() => {
    try { const d = nip19.decode(npub); return d.type==='npub'?d.data:null } catch { return null }
  })()

  useEffect(() => {
    if (!targetHex) { setLoading(false); return }

    if (type === 'following') {
      // Fetch who this person follows — kind:3 from them
      const sub = pool().subscribe(RELAYS,
        { kinds:[3], authors:[targetHex], limit:1 },
        {
          onevent(e) {
            const contacts = (e.tags||[]).filter(t=>t[0]==='p'&&t[1]).map(t=>t[1])
            setPubkeys(contacts)
          },
          oneose() { sub.close(); setLoading(false) }
        }
      )
      setTimeout(()=>setLoading(false), 7000)
      return () => { try{sub.close()}catch{} }

    } else {
      // Fetch followers — kind:3 events that contain #p: targetHex
      const seen = new Set()
      const sub = pool().subscribe(RELAYS,
        { kinds:[3], '#p':[targetHex], limit:500 },
        {
          onevent(e) { seen.add(e.pubkey) },
          oneose() {
            sub.close()
            setPubkeys([...seen])
            setLoading(false)
          }
        }
      )
      setTimeout(()=>{ setPubkeys([...seen]); setLoading(false) }, 7000)
      return () => { try{sub.close()}catch{} }
    }
  }, [targetHex, type])

  // Fetch profiles once pubkeys are known
  useEffect(() => {
    if (!pubkeys.length) return
    const sub = pool().subscribe(RELAYS,
      { kinds:[0], authors:pubkeys, limit:pubkeys.length },
      {
        onevent(e) {
          try { setProfiles(prev=>({...prev,[e.pubkey]:JSON.parse(e.content)})) } catch {}
        },
        oneose() { sub.close() }
      }
    )
    return () => { try{sub.close()}catch{} }
  }, [pubkeys.join(',')])

  const toggleFollow = async (targetPk) => {
    const sk = getSkBytes()
    if (!sk || !myPubkey) return
    setBusy(prev=>({...prev,[targetPk]:true}))
    try {
      const isFollowing = myContacts.includes(targetPk)
      const updated = isFollowing
        ? myContacts.filter(p=>p!==targetPk)
        : [...myContacts, targetPk]
      const k3 = finalizeEvent({
        kind:3, created_at:Math.floor(Date.now()/1000),
        tags: updated.map(pk=>['p',pk,'','']),
        content:'',
      }, sk)
      await Promise.any(pool().publish(RELAYS, k3))
      saveMyContacts(updated)
      setMyContacts(updated)
    } catch(e) { console.error(e) }
    setBusy(prev=>({...prev,[targetPk]:false}))
  }

  const shortNpub = hex => { try { return nip19.npubEncode(hex).slice(0,14)+'…' } catch { return hex.slice(0,10)+'…' } }

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'0 0 120px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px 0' }}>
        <button onClick={()=>navigate(-1)}
          style={{ background:'rgba(201,168,76,0.08)', border:`1px solid ${S.border}`, borderRadius:10, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:S.gold, flexShrink:0 }}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.4rem', fontWeight:700, color:S.cream, textTransform:'capitalize' }}>{type}</div>
          {!loading && <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.5rem', color:'rgba(201,168,76,0.35)' }}>{pubkeys.length} people</div>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Loader size={22} color={S.gold} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 12px' }}/>
          <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', color:S.creamFaint }}>Loading…</div>
        </div>
      )}

      {/* Empty */}
      {!loading && pubkeys.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontStyle:'italic', color:S.creamFaint }}>
          Nobody here yet
        </div>
      )}

      {/* List */}
      {!loading && pubkeys.length > 0 && (
        <div style={{ padding:'16px', animation:'fadeUp .25s ease' }}>
          {pubkeys.map(hex => {
            const p = profiles[hex]
            const name = p?.name || p?.display_name || shortNpub(hex)
            const avatar = p?.picture
            const letter = name.slice(0,1).toUpperCase()
            const isMe = hex === myPubkey
            const following = myContacts.includes(hex)
            const isBusy = busy[hex]

            return (
              <div key={hex} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:`1px solid ${S.border}` }}>
                {/* Avatar */}
                {avatar
                  ? <img src={avatar} alt={letter} onError={e=>e.target.style.display='none'}
                      style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:`1px solid ${S.border}`, flexShrink:0 }}/>
                  : <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontWeight:600, color:S.gold, flexShrink:0 }}>{letter}</div>
                }

                {/* Name + npub */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.8rem', fontWeight:600, color:S.cream, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.3)', marginTop:2 }}>{shortNpub(hex)}</div>
                </div>

                {/* Follow button */}
                {!isMe && myPubkey && (
                  <button onClick={()=>toggleFollow(hex)} disabled={isBusy}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:9, border:`1px solid ${following?S.borderMid:S.gold+'80'}`, background: following?'rgba(201,168,76,0.08)':`linear-gradient(135deg,${S.gold},${S.goldLight})`, cursor:isBusy?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.62rem', color:following?S.gold:S.bg, flexShrink:0, transition:'all .2s' }}>
                    {isBusy
                      ? <Loader size={12} style={{animation:'spin 1s linear infinite'}}/>
                      : following
                        ? <><UserCheck size={12}/> Following</>
                        : <><UserPlus size={12}/> Follow</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

