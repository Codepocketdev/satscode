// ── NIP-02 Follow System ──────────────────────────────────────────────────────
// Shared hook for follow/unfollow + follower/following counts
// Kind:3 = contact list. Full replacement on every write.

import { useState, useEffect } from 'react'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
]

let _pool = null
const pool = () => { if (!_pool) _pool = new SimplePool(); return _pool }

// ── Get current user's pubkey hex from localStorage ──────────────────────────
const getMyPubkey = () => {
  try { return JSON.parse(localStorage.getItem('satscode_user') || '{}').pubkey || null }
  catch { return null }
}

const getSkBytes = () => {
  try {
    const nsec = localStorage.getItem('satscode_nsec')
    if (!nsec) return null
    const { type, data } = nip19.decode(nsec.trim())
    return type === 'nsec' ? data : null
  } catch { return null }
}

// ── Fetch kind:3 for a pubkey → returns array of followed pubkey hex strings ──
export async function fetchContactList(pubkeyHex) {
  return new Promise((resolve) => {
    const contacts = []
    let rawEvent = null
    const sub = pool().subscribe(RELAYS,
      { kinds: [3], authors: [pubkeyHex], limit: 1 },
      {
        onevent(e) {
          // Keep most recent
          if (!rawEvent || e.created_at > rawEvent.created_at) {
            rawEvent = e
            contacts.length = 0
            for (const tag of (e.tags || [])) {
              if (tag[0] === 'p' && tag[1]) contacts.push(tag[1])
            }
          }
        },
        oneose() {
          sub.close()
          resolve({ contacts, rawEvent })
        },
      }
    )
    setTimeout(() => { try { sub.close() } catch {}; resolve({ contacts, rawEvent }) }, 6000)
  })
}

// ── Fetch follower count — how many kind:3 events contain #p: targetPubkey ───
export async function fetchFollowerCount(pubkeyHex) {
  return new Promise((resolve) => {
    const seen = new Set()
    const sub = pool().subscribe(RELAYS,
      { kinds: [3], '#p': [pubkeyHex], limit: 500 },
      {
        onevent(e) { seen.add(e.pubkey) },
        oneose() { sub.close(); resolve(seen.size) },
      }
    )
    setTimeout(() => { try { sub.close() } catch {}; resolve(seen.size) }, 8000)
  })
}

// ── Publish new kind:3 with updated contact list ──────────────────────────────
async function publishContactList(newContacts) {
  const skBytes = getSkBytes()
  if (!skBytes) throw new Error('No private key — log in first')

  const tags = newContacts.map(pk => ['p', pk, '', ''])

  const event = finalizeEvent({
    kind: 3,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  }, skBytes)

  await Promise.any(pool().publish(RELAYS, event))
  return event
}

// ── Main hook ─────────────────────────────────────────────────────────────────
// targetNpub  = npub of the profile being viewed
// targetPubHex = hex pubkey of profile being viewed
export function useFollow(targetNpub, targetPubHex) {
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followingCount, setFollowingCount] = useState(null) // how many targetPubHex follows
  const [followerCount,  setFollowerCount]  = useState(null) // how many follow targetPubHex
  const [loading,        setLoading]        = useState(false)
  const [publishing,     setPublishing]     = useState(false)
  const [error,          setError]          = useState(null)

  const myPubkey = getMyPubkey()

  // On mount: check if I follow this person + fetch counts
  useEffect(() => {
    if (!targetPubHex) return

    // Fetch follower count for target
    fetchFollowerCount(targetPubHex).then(n => setFollowerCount(n))

    // Fetch target's following count
    fetchContactList(targetPubHex).then(({ contacts }) => setFollowingCount(contacts.length))

    // Check if I follow this person
    if (myPubkey) {
      fetchContactList(myPubkey).then(({ contacts }) => {
        setIsFollowing(contacts.includes(targetPubHex))
      })
    }
  }, [targetPubHex, myPubkey])

  const toggleFollow = async () => {
    if (!myPubkey || !getSkBytes()) {
      setError('Log in with your private key to follow')
      return
    }
    setPublishing(true)
    setError(null)
    try {
      // Always fetch fresh contact list first
      const { contacts } = await fetchContactList(myPubkey)
      let updated
      if (isFollowing) {
        updated = contacts.filter(pk => pk !== targetPubHex)
      } else {
        updated = contacts.includes(targetPubHex) ? contacts : [...contacts, targetPubHex]
      }
      await publishContactList(updated)
      setIsFollowing(!isFollowing)
      // Update follower count optimistically
      setFollowerCount(n => n !== null ? (isFollowing ? Math.max(0, n - 1) : n + 1) : null)
    } catch(e) {
      setError(e.message || 'Follow failed')
    }
    setPublishing(false)
  }

  return { isFollowing, followingCount, followerCount, toggleFollow, publishing, error }
}

