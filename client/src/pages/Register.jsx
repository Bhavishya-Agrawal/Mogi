import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import PasswordRules, { passwordChecks } from '../components/PasswordRules'

export default function Register() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const passwordOk = passwordChecks(form.password).every((c) => c.ok)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/register', form)
      signIn(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute. Then upload a resume and start."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-ink underline decoration-pen decoration-2 underline-offset-4">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" className="field" value={form.name} onChange={change} autoComplete="name" placeholder="Your name" maxLength={60} required />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="field" value={form.email} onChange={change} autoComplete="email" placeholder="you@example.com" required />
        </div>
        <PasswordField id="password" label="Password" value={form.password} onChange={change} autoComplete="new-password" />
        <PasswordRules password={form.password} />
        {error && <p role="alert" className="rounded-xl border-2 border-pen bg-pen/10 px-4 py-3 font-medium text-pen-dark">{error}</p>}
        <button type="submit" disabled={busy || !passwordOk || !form.name.trim()} className="btn btn-pen w-full">
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
