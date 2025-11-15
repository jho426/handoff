import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Login.css'

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Get the nurse record from the nurses table
      const { data: nurseData, error: nurseError } = await supabase
        .from('nurses')
        .select('*')
        .eq('email', email)
        .single()

      if (nurseError) {
        // If nurse doesn't exist in nurses table, create one
        // This handles the case where auth account exists but nurse record doesn't
        const { data: newNurse, error: createError } = await supabase
          .from('nurses')
          .insert([
            {
              email: authData.user.email,
              name: authData.user.user_metadata?.name || authData.user.email.split('@')[0],
            },
          ])
          .select()
          .single()

        if (createError) throw createError
        onLogin({ ...newNurse, authUser: authData.user })
      } else {
        // Link auth user ID to nurse record if not already linked
        if (!nurseData.auth_user_id && authData.user.id) {
          await supabase
            .from('nurses')
            .update({ auth_user_id: authData.user.id })
            .eq('id', nurseData.id)
        }
        onLogin({ ...nurseData, authUser: authData.user })
      }
    } catch (err) {
      console.error('Login error:', err)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to sign in. Please check your email and password.'
      
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.'
        } else if (err.message.includes('User not found')) {
          errorMessage = 'No account found with this email address.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Nurse Login</h2>
        <p className="login-sub">Sign in to access the Handoff dashboard</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" style={{ 
              color: '#e74c3c', 
              fontSize: '14px', 
              marginBottom: '16px',
              padding: '10px',
              backgroundColor: '#fee',
              borderRadius: '6px',
              border: '1px solid #e74c3c'
            }}>
              {error}
            </div>
          )}
          <label>
            Email
            <input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@hospital.org"
              required
              disabled={loading}
            />
          </label>
          <label>
            Password
            <input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="login-note">
          Contact your administrator if you need to create an account.
        </div>
      </div>
    </div>
  )
}

export default Login
