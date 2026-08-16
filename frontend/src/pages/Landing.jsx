import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Landing() {
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, isLoading, navigate])

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })
  }

  if (isLoading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      position: 'relative',
    }}>
      {/* Deep-sea ambient layers */}
      <div aria-hidden style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(ellipse 70% 60% at 50% 80%, rgba(0,229,255,0.04) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 20% 20%, rgba(124,58,237,0.06) 0%, transparent 70%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Floating particles (CSS only) */}
      <div aria-hidden className="particles" />

      {/* Hero content */}
      <div style={{ maxWidth: '560px', position: 'relative' }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(3rem, 10vw, 5.5rem)',
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #a78bfa 60%, var(--accent-teal) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '8px',
          lineHeight: 1,
        }}>
          ABYSS
        </div>

        <p style={{
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          marginBottom: '40px',
          lineHeight: 1.6,
        }}>
          Reference-free deep-sea eDNA taxonomic classification<br />
          and novel-species discovery — powered by DNABERT-S &amp; FAISS.
        </p>

        <button
          id="google-signin-btn"
          className="btn btn-primary"
          onClick={handleSignIn}
          style={{ fontSize: '1rem', padding: '14px 32px', borderRadius: '8px' }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <p style={{ marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Access your sequencing results · explore the abyss
        </p>
      </div>

      {/* Feature badges */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center',
        marginTop: '60px',
        maxWidth: '600px',
      }}>
        {[
          ['🧬', 'DNABERT-S Embeddings'],
          ['🔍', 'FAISS k-NN Search'],
          ['🌀', 'UMAP Clustering'],
          ['🐙', 'Novel Species Detection'],
        ].map(([icon, label]) => (
          <div key={label} style={{
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>{icon}</span> {label}
          </div>
        ))}
      </div>

      <style>{`
        .particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle, rgba(0,229,255,0.15) 1px, transparent 1px),
            radial-gradient(circle, rgba(124,58,237,0.1) 1px, transparent 1px);
          background-size: 120px 120px, 180px 180px;
          background-position: 0 0, 60px 60px;
          animation: drift 25s linear infinite;
          opacity: 0.4;
        }
        @keyframes drift {
          from { background-position: 0 0, 60px 60px; }
          to   { background-position: 120px 120px, 180px 180px; }
        }
      `}</style>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#000"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#000"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#000"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#000"/>
    </svg>
  )
}
