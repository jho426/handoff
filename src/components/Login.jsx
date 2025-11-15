import { useState } from 'react'
import './Login.css'

const Login = ({ onLogin }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = { name: name || 'Nurse', email }
    // In a real app you'd call an auth endpoint. This is a mock login.
    onLogin(user)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Nurse Login</h2>
        <p className="login-sub">Sign in to access the Handoff dashboard</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" />
          </label>
          <button type="submit" className="btn-primary">Sign in</button>
        </form>
        <div className="login-note">Use any name/email to try the demo.</div>
      </div>
    </div>
  )
}

export default Login
