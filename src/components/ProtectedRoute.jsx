import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ session, loading, children }) {
  if (loading) {
    return (
      <div className="container page">
        <p className="nav-meta">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
