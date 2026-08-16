import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * /auth/callback — Supabase handles PKCE code exchange from the URL fragment/query.
 * We just need to wait for the session to be established, then redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase client automatically processes the callback URL
    // onAuthStateChange will fire with SIGNED_IN once the code is exchanged
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      }
    })

    // Also check if we already have a session (e.g. fast exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="spinner-wrap" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
        Completing sign-in…
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        You will be redirected automatically.
      </span>
    </div>
  )
}
