import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Splash from './pages/Splash'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Layout from './components/layout/Layout'
import Feed from './pages/Feed'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import Settings from './pages/Settings'
import Registry from './pages/Registry'
import Stack from './pages/Stack'
import Bounties from './pages/Bounties'
import ProofOfWork from './pages/ProofOfWork'

const USER_KEY = 'satscode_user'
const NSEC_KEY = 'satscode_nsec'

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveUser(userData) {
  if (!userData) {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(NSEC_KEY)
    return
  }
  // Save nsec separately so Feed.jsx can sign posts
  if (userData.nsec) {
    localStorage.setItem(NSEC_KEY, userData.nsec)
  }
  // Save user without nsec in main storage
  const { nsec, ...userWithoutNsec } = userData
  localStorage.setItem(USER_KEY, JSON.stringify(userWithoutNsec))
}

export default function App() {
  const [user, setUser] = useState(() => loadUser())
  const [phase, setPhase] = useState(() => loadUser() ? 'app' : 'landing')
  const [authMode, setAuthMode] = useState(null)
  const [splashDone, setSplashDone] = useState(false)

  function handleLogin(userData) {
    saveUser(userData)
    const { nsec, ...userWithoutNsec } = userData
    setUser(userWithoutNsec)
    setPhase('app')
  }

  function handleLogout() {
    saveUser(null)
    setUser(null)
    setPhase('landing')
  }

  return (
    <>
      <style>{`
        html, body, #root {
          background: #0D0B06 !important;
          margin: 0; padding: 0; min-height: 100vh;
          color-scheme: dark;
        }
        body > div, #root > div, #root > div > div {
          background: #0D0B06 !important;
        }
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <BrowserRouter>
        {/* Content always mounted underneath */}
        <div style={{ visibility: splashDone ? 'visible' : 'hidden' }}>

          {phase === 'landing' && (
            <Landing
              onLogin={() => { setAuthMode('login'); setPhase('auth') }}
              onJoin={()  => { setAuthMode('join');  setPhase('auth') }}
            />
          )}

          {phase === 'auth' && (
            <Login
              mode={authMode}
              onLogin={handleLogin}
              onBack={() => setPhase('landing')}
            />
          )}

          {phase === 'app' && (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/"               element={<Navigate to="/feed" />} />
                <Route path="/feed"           element={<Feed user={user} />} />
                <Route path="/registry"       element={<Registry user={user} />} />
                <Route path="/bounties"       element={<Bounties user={user} />} />
                <Route path="/pow"            element={<ProofOfWork />} />
                <Route path="/stack"          element={<Stack />} />
                <Route path="/profile"        element={<ProfilePage user={user} onUserUpdate={u => { setUser(u); localStorage.setItem('satscode_user', JSON.stringify(u)) }} />} />
                <Route path="/messages"       element={<MessagesPage user={user} />} />
                <Route path="/messages"       element={<div style={{color:'#C9A84C',padding:40,fontFamily:'Montserrat,sans-serif'}}>Messages — coming soon</div>} />
                <Route path="/settings"       element={<Settings user={user} onLogout={handleLogout} />} />
                <Route path="/post-bounty"    element={<Navigate to="/bounties" />} />
                <Route path="/submit-tool"    element={<div style={{color:'#C9A84C',padding:40,fontFamily:'Montserrat,sans-serif'}}>Submit Tool — coming soon</div>} />
                <Route path="/projects"       element={<div style={{color:'#C9A84C',padding:40,fontFamily:'Montserrat,sans-serif'}}>My Projects — coming soon</div>} />
                <Route path="*"              element={<Navigate to="/feed" />} />
              </Routes>
            </Layout>
          )}
        </div>

        {/* Splash always on top */}
        {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
      </BrowserRouter>
    </>
  )
}

