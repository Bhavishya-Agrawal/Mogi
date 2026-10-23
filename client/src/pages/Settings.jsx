import { useState } from 'react'
import { Lock } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import PasswordField from '../components/PasswordField'
import PasswordRules, { passwordChecks } from '../components/PasswordRules'

export default function Settings() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const changingPassword = newPassword.length > 0
  const passwordOk = passwordChecks(newPassword).every((c) => c.ok)
  const canSave =
    !busy && name.trim() && (name.trim() !== user.name || (changingPassword && passwordOk && currentPassword))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setBusy(true)
    try {
      const body = { name }
      if (changingPassword) Object.assign(body, { currentPassword, newPassword })
      const { data } = await api.put('/auth/me', body)
      setUser(data.user)
      setName(data.user.name)
      setCurrentPassword('')
      setNewPassword('')
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not save your changes.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-lg px-5 py-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Settings</h1>
        <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border-2 border-ink bg-sheet p-6 sm:p-8">
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input id="name" className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <input id="email" className="field pr-11" value={user.email} disabled aria-describedby="email-note" />
              <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            </div>
            <p id="email-note" className="mt-1.5 text-sm text-ink-soft">Your email is locked and cannot be changed.</p>
          </div>

          <fieldset className="space-y-4 border-t-2 border-paper-deep pt-6">
            <legend className="font-display text-lg font-bold">Change password</legend>
            <p className="text-sm text-ink-soft">Leave these empty to keep your current password.</p>
            <PasswordField id="newPassword" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required={false} />
            {changingPassword && (
              <>
                <PasswordRules password={newPassword} />
                <PasswordField id="currentPassword" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </>
            )}
          </fieldset>

          {error && <p role="alert" className="rounded-xl border-2 border-pen bg-pen/10 px-4 py-3 font-medium text-pen-dark">{error}</p>}
          {saved && <p role="status" className="rounded-xl border-2 border-ink bg-paper px-4 py-3 font-medium">Changes saved.</p>}

          <button type="submit" disabled={!canSave} className="btn btn-pen w-full">{busy ? 'Saving...' : 'Save changes'}</button>
        </form>
      </main>
    </div>
  )
}
