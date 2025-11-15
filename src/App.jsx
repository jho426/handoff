import './App.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Logs from './components/Logs'

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'logs'
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true
    let subscription = null

    const initAuth = async () => {
      try {
        // Check if supabase is initialized
        if (!supabase) {
          console.error('Supabase client not initialized')
          setLoading(false)
          return
        }

        await checkSession()

        // Listen for auth state changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return
            
            if (event === 'SIGNED_IN' && session) {
              await loadUserData(session.user)
            } else if (event === 'SIGNED_OUT') {
              setUser(null)
            }
          }
        )
        subscription = authSubscription
      } catch (error) {
        console.error('Error initializing auth:', error)
        setLoading(false)
      }
    }

    initAuth()

    // Fallback: always stop loading after 15 seconds max
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout, forcing loading to stop')
        setLoading(false)
      }
    }, 15000)

    return () => {
      mounted = false
      clearTimeout(fallbackTimeout)
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const checkSession = async () => {
    try {
      console.log('Checking session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Error getting session:', sessionError)
        setLoading(false)
        return
      }

      console.log('Session check complete, session exists:', !!session?.user)

      if (session?.user) {
        await loadUserData(session.user)
      } else {
        // No session - user needs to log in
        console.log('No active session, showing login page')
      }
    } catch (error) {
      console.error('Error checking session:', error)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const loadUserData = async (authUser) => {
    try {
      // Get the nurse record from the nurses table
      const { data: nurseData, error } = await supabase
        .from('nurses')
        .select('*')
        .or(`email.eq.${authUser.email},auth_user_id.eq.${authUser.id}`)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching nurse data:', error)
        // Fall through to create or use fallback
      }

      if (nurseData) {
        setUser({ ...nurseData, authUser })
        return
      }

      // If no nurse record exists, try to create one
      try {
        const { data: newNurse, error: createError } = await supabase
          .from('nurses')
          .insert([
            {
              email: authUser.email,
              name: authUser.user_metadata?.name || authUser.email.split('@')[0],
              auth_user_id: authUser.id,
            },
          ])
          .select()
          .single()

        if (createError) {
          console.error('Error creating nurse record:', createError)
          // Use fallback user data
          setUser({ 
            email: authUser.email, 
            name: authUser.user_metadata?.name || authUser.email.split('@')[0], 
            authUser 
          })
        } else {
          setUser({ ...newNurse, authUser })
        }
      } catch (createErr) {
        console.error('Error in create nurse:', createErr)
        // Use fallback user data
        setUser({ 
          email: authUser.email, 
          name: authUser.user_metadata?.name || authUser.email.split('@')[0], 
          authUser 
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // Still set user with auth data even if nurse record fails
      setUser({ 
        email: authUser.email, 
        name: authUser.user_metadata?.name || authUser.email.split('@')[0], 
        authUser 
      })
    }
  }

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    setView('dashboard')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setView('dashboard')
  }

  if (loading) {
    return (
      <div className="app-root" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
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

