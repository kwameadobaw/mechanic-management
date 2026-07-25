import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { signInShop, signUpShop } from "../lib/api";

export default function AdminLogin({ session, onAuthChange }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Already signed in (e.g. came back to this page with a live session) —
  // skip the form entirely instead of showing a login screen that does nothing.
  if (session) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpShop({ email, password, shopName });
        setNotice("Account created. If email confirmation is enabled on your Supabase project, check your inbox before logging in.");
        setMode("signin");
      } else {
        const { session: newSession } = await signInShop({ email, password });
        // Push the session into app state right away. Without this, the
        // route guard below still sees the old (empty) session for a beat
        // and bounces straight back to this login page after navigate().
        onAuthChange?.(newSession);
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 440 }}>
      <div className="eyebrow">Shop access</div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 24 }}>
        {mode === "signin" ? "Log in to your garage" : "Set up your shop"}
      </h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="stack">
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="shopName">Shop name</label>
              <input
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Downtown Auto Repair"
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          {notice && <p className="helper-text">{notice}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "signin" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>

      <p className="helper-text" style={{ marginTop: 16, textAlign: "center" }}>
        {mode === "signin" ? "New shop? " : "Already have an account? "}
        <button
          className="btn btn-ghost"
          style={{ padding: 0, display: "inline", fontWeight: 600 }}
          onClick={() => {
            setError("");
            setNotice("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Create one" : "Log in instead"}
        </button>
      </p>
    </div>
  );
}
