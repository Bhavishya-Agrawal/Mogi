import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', form)
      signIn(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={<>New to Mogi? <Link to="/register" className="font-semibold text-ink underline decoration-pen decoration-2 underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate={false}>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="field" value={form.email} onChange={change} autoComplete="email" placeholder="you@example.com" required />
        </div>
        <PasswordField id="password" label="Password" value={form.password} onChange={change} autoComplete="current-password" />
        {error && <p role="alert" className="rounded-xl border-2 border-pen bg-pen/10 px-4 py-3 font-medium text-pen-dark">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-pen w-full">{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </AuthShell>
  )
}
