import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NavBar() {
  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(2, 13, 24, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container flex items-center justify-between" style={{ padding: '0 24px', height: '60px' }}>
        {/* Wordmark */}
        <Link to={session ? '/dashboard' : '/'} style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.35rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, var(--accent-cyan), #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ABYSS
          </span>
        </Link>

        {/* Right side */}
        {session && (
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {session.user?.email}
            </span>
            <button className="btn btn-ghost" onClick={handleSignOut} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
