import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps protected routes. Shows spinner while loading,
 * redirects to / if unauthenticated, renders children otherwise.
 */
export default function ProtectedRoute({ children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
        <span>Loading session…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}
