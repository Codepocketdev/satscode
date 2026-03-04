import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Rss, Users, Target, User, Menu,
  Zap, MessageSquare, PlusCircle, Wrench, Settings, X, Heart
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'feed',     Icon: Rss,    label: 'Feed',     path: '/feed' },
  { id: 'registry', Icon: Users,  label: 'Registry', path: '/registry' },
  { id: 'bounties', Icon: Target, label: 'Bounties', path: '/bounties' },
  { id: 'profile',  Icon: User,   label: 'Profile',  path: '/profile' },
  { id: 'more',     Icon: Menu,   label: 'More',     path: null },
]

const MORE_ITEMS = [
  { id: 'pow',         Icon: Zap,           label: 'Proof of Work', path: '/pow' },
  { id: 'messages',    Icon: MessageSquare, label: 'Messages',      path: '/messages' },
  { id: 'post-bounty', Icon: PlusCircle,    label: 'Post Bounty',   path: '/post-bounty' },
  { id: 'submit-tool', Icon: Wrench,        label: 'Submit Tool',   path: '/submit-tool' },
  { id: 'donate',      Icon: Heart,         label: 'Donate',        path: '/donate' },
  { id: 'settings',    Icon: Settings,      label: 'Settings',      path: '/settings' },
]

const S = {
  gold: '#C9A84C', goldDark: '#8B6010', goldLight: '#E8C96A',
  bg: '#0D0B06', sidebar: '#0F0C07', card: '#141008',
  cream: '#F5ECD7', creamDim: 'rgba(245,236,215,0.6)',
  border: 'rgba(201,168,76,0.12)',
  borderHover: 'rgba(201,168,76,0.35)',
}

function SideNavItem({ item, isActive, onClick }) {
  const { Icon } = item
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 20px', cursor: 'pointer',
        borderLeft: isActive ? `2px solid ${S.gold}` : '2px solid transparent',
        background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
        transition: 'all .2s',
        fontFamily: 'Montserrat,sans-serif', fontSize: '0.65rem',
        fontWeight: isActive ? 600 : 400,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: isActive ? S.gold : S.creamDim,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(201,168,76,0.04)'
          e.currentTarget.style.color = 'rgba(245,236,215,0.85)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = S.creamDim
        }
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
      {item.label}
    </div>
  )
}

export default function Layout({ children, user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  function goTo(path) {
    navigate(path)
    setMoreOpen(false)
  }

  const displayName = user?.npub
    ? user.npub.slice(0, 8) + '...' + user.npub.slice(-4)
    : 'Builder'
  const shortNpub = user?.npub
    ? user.npub.slice(0, 12) + '...'
    : 'npub1...'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: S.bg }}>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className="desktop-sidebar" style={{
        width: 230, minWidth: 230,
        background: S.sidebar,
        borderRight: `1px solid ${S.border}`,
        display: 'flex', flexDirection: 'column', height: '100vh',
      }}>
        {/* Logo */}
        <div onClick={() => goTo('/feed')} style={{ padding: '22px 20px 16px', cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem', fontWeight: 700, color: S.cream, letterSpacing: '0.06em' }}>
            Sats<span style={{ color: S.gold }}>Code</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: 'rgba(201,168,76,0.28)', letterSpacing: '0.15em', marginTop: 4 }}>
            // BITCOIN BUILDERS GUILD
          </div>
        </div>

        {/* User pill */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: `1.5px solid rgba(201,168,76,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={16} color={S.gold} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.68rem', fontWeight: 600, color: S.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', marginTop: 2 }}>
              {shortNpub}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.45rem', fontWeight: 600, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.25)', padding: '12px 20px 6px' }}>
            — Main —
          </div>
          {NAV_ITEMS.filter(n => n.path).map(item => (
            <SideNavItem key={item.id} item={item} isActive={isActive(item.path)} onClick={() => goTo(item.path)} />
          ))}
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.45rem', fontWeight: 600, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.25)', padding: '16px 20px 6px' }}>
            — Contribute —
          </div>
          {MORE_ITEMS.map(item => (
            <SideNavItem key={item.id} item={item} isActive={isActive(item.path)} onClick={() => goTo(item.path)} />
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}`, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(201,168,76,0.18)', letterSpacing: '0.1em' }}>
          // EST. 2025 · BITCOIN ONLY
        </div>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '0 20px', height: 54, borderBottom: `1px solid ${S.border}`, background: S.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.2rem', fontWeight: 700, color: S.cream, letterSpacing: '0.06em' }}>
            Sats<span style={{ color: S.gold }}>Code</span>
          </div>
          <button onClick={() => goTo('/submit-tool')} style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.bg, background: `linear-gradient(135deg,${S.gold},${S.goldLight})`, border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .3s' }}>
            <Wrench size={13} /> Submit Tool
          </button>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 72, background: S.bg }}>
          {children}
        </main>
      </div>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="mobile-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: S.sidebar, borderTop: `1px solid rgba(201,168,76,0.18)`, display: 'flex', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(item => {
          const { Icon } = item
          const active = item.path ? isActive(item.path) : moreOpen
          return (
            <div key={item.id} onClick={() => item.path ? goTo(item.path) : setMoreOpen(!moreOpen)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0 8px', cursor: 'pointer', color: active ? S.gold : 'rgba(245,236,215,0.3)', borderTop: active ? `2px solid ${S.gold}` : '2px solid transparent', transition: 'all .2s' }}>
              <Icon size={20} />
              <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: '0.45rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </nav>

      {/* ══ MORE DRAWER ══ */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'fixed', bottom: 62, left: 0, right: 0, background: S.sidebar, borderTop: `1px solid rgba(201,168,76,0.22)`, borderRadius: '14px 14px 0 0', zIndex: 49, padding: '6px 0 10px', animation: 'slideUp .25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 36, height: 3, background: 'rgba(201,168,76,0.25)', borderRadius: 2, margin: '8px auto 12px' }}/>
            {MORE_ITEMS.map(item => {
              const { Icon } = item
              const active = isActive(item.path)
              return (
                <div key={item.id} onClick={() => goTo(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem', fontWeight: active ? 600 : 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: active ? S.gold : 'rgba(245,236,215,0.65)', borderLeft: active ? `2px solid ${S.gold}` : '2px solid transparent', transition: 'all .2s' }}>
                  <Icon size={18} color={active ? S.gold : S.goldDark} />
                  {item.label}
                </div>
              )
            })}
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        .desktop-sidebar { display: flex !important; }
        .mobile-bottom-nav { display: none !important; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

