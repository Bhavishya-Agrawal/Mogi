import { Link, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'
import Results from './pages/Results'
import Settings from './pages/Settings'
import Logo from './components/Logo'

function NotFound() {
  return (
    <div className="dots grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo />
        <h1 className="mt-8 text-4xl font-extrabold">That page is not on the resume.</h1>
        <p className="mt-3 text-ink-soft">The link may be wrong or the page may have moved.</p>
        <Link to="/" className="btn btn-pen mt-8">Back to home</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
