import './App.css'
import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Logs from './components/Logs'

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'logs'

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    setView('dashboard')
  }

  const handleLogout = () => {
    setUser(null)
    setView('dashboard')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title">Handoff - Nurse Portal</div>
        <div className="app-nav">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${view === 'logs' ? 'active' : ''}`} onClick={() => setView('logs')}>Logs</button>
          <span className="nav-spacer" />
          <span className="welcome">{user.name}</span>
          <button className="nav-btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        {view === 'dashboard' && <Dashboard />}
        {view === 'logs' && <Logs />}
      </main>
    </div>
  )
}

export default App

