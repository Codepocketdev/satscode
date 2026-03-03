import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import { X, UserPlus, UserCheck, Loader } from 'lucide-react'

const RELAYS = ['wss://relay.damus.io','wss://nos.lol','wss://relay.nostr.band','wss://relay.primal.net']

const S = {
  gold:'#C9A84C', goldLight:'#E8C96A',
  bg:'#0D0B06', card:'#111009', card2:'#161209',
  cream:'#F5ECD7', creamDim:'rgba(245,236,215,0.72)', creamFaint:'rgba(245,236,215,0.35)',
  border:'rgba(201,168,76,0.12)', borderMid:'rgba(201,168,76,0.28)',
}

let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

const getMyPubkey = () => { try { return JSON.parse(localStorage.getItem('satscode_user')||'{}').pubkey||null } catch { return null } }
const getSkBytes  = () => { try { const n=localStorage.getItem('satscode_nsec'); if(!n) return null; const {type,data}=nip19.decode(n.trim()); return type==='nsec'?data:null } catch { return null } }
const getMyContacts = () => { try { return JSON.parse(localStorage.getItem('satscode_contacts')||'[]') } catch { return [] } }
const saveMyContacts = (contacts) => { try { localStorage.setItem('satscode_contacts', JSON.stringify(contacts)) } catch {} }

// pubkeys = array of hex pubkeys to show
// title = "Followers" or "Following"
export default function FollowListModal({ pubkeys, title, onClose }) {
  const [profiles,  setProfiles]  = useState({})
  const [myContacts, setMyContacts] = useState(getMyContacts())
  const [busy, setBusy] = useState({}) // { [pubkey]: true }
  const myPubkey = getMyPubkey()

  useEffect(() => {
    if (!pubkeys.length) return
    const sub = pool().subscribe(RELAYS,
      { kinds:[0], authors:pubkeys, limit:pubkeys.length },
      {
        onevent(e) {
          try {
            const p = JSON.parse(e.content)
            setProfiles(prev => ({ ...prev, [e.pubkey]: p }))
          } catch {}
        },
        oneose() { sub.close() }
      }
    )
    return () => { try{sub.close()}catch{} }
  }, [pubkeys.join(',')])

  const toggleFollow = async (targetHex) => {
    const sk = getSkBytes()
    if (!sk || !myPubkey) return
    setBusy(prev => ({ ...prev, [targetHex]: true }))
    try {
      const isFollowing = myContacts.includes(targetHex)
      const updated = isFollowing
        ? myContacts.filter(p => p !== targetHex)
        : [...myContacts, targetHex]

      // Publish kind:3
      const k3 = finalizeEvent({
        kind: 3,
        created_at: Math.floor(Date.now()/1000),
        tags: updated.map(pk => ['p', pk, '', '']),
        content: '',
      }, sk)
      await Promise.any(pool().publish(RELAYS, k3))

      // Save to localStorage
      saveMyContacts(updated)
      setMyContacts(updated)
    } catch(e) { console.error(e) }
    setBusy(prev => ({ ...prev, [targetHex]: false }))
  }

  const shortNpub = hex => { try { return nip19.npubEncode(hex).slice(0,12)+'…' } catch { return hex.slice(0,8)+'…' } }

  const portalTarget = document.getElementById('modal-root') || document.body
  return createPortal(
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999, backgroundColor:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:560, background:S.card2, border:`1px solid ${S.borderMid}`, borderRadius:'18px 18px 0 0', padding:'20px 20px 48px', maxHeight:'80vh', display:'flex', flexDirection:'column', animation:'slideUp .25s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {/* Handle + Header */}
        <div style={{ width:36, height:3, background:'rgba(201,168,76,0.2)', borderRadius:2, margin:'0 auto 16px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.2rem', fontWeight:700, color:S.cream }}>
            {title} <span style={{ color:S.gold }}>({pubkeys.length})</span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:S.creamFaint }}><X size={18}/></button>
        </div>

        {/* List */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {pubkeys.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontStyle:'italic', color:S.creamFaint }}>
              No one here yet
            </div>
          )}
          {pubkeys.map(hex => {
            const p = profiles[hex]
            const name = p?.name || p?.display_name || shortNpub(hex)
            const avatar = p?.picture
            const letter = name.slice(0,1).toUpperCase()
            const isMe = hex === myPubkey
            const following = myContacts.includes(hex)
            const isBusy = busy[hex]

            return (
              <div key={hex} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${S.border}` }}>
                {/* Avatar */}
                {avatar
                  ? <img src={avatar} alt={letter} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:`1px solid ${S.border}`, flexShrink:0 }} onError={e=>e.target.style.display='none'}/>
                  : <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontWeight:600, color:S.gold, flexShrink:0 }}>{letter}</div>
                }

                {/* Name + npub */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.75rem', fontWeight:600, color:S.cream, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.48rem', color:'rgba(201,168,76,0.3)', marginTop:2 }}>{shortNpub(hex)}</div>
                </div>

                {/* Follow/Unfollow button — not shown for self */}
                {!isMe && myPubkey && (
                  <button onClick={()=>toggleFollow(hex)} disabled={isBusy}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:8, border:`1px solid ${following ? S.borderMid : S.gold+'60'}`, background: following ? 'rgba(201,168,76,0.08)' : `linear-gradient(135deg,${S.gold},${S.goldLight})`, cursor:isBusy?'not-allowed':'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.6rem', color: following ? S.gold : S.bg, flexShrink:0, transition:'all .2s' }}>
                    {isBusy ? <Loader size={11} style={{animation:'spin 1s linear infinite'}}/> : following ? <><UserCheck size={11}/> Following</> : <><UserPlus size={11}/> Follow</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>,
    portalTarget
  )
}

