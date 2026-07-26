import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "../lib/api";
import PasswordRequirements from "../components/PasswordRequirements";
import { evaluatePassword } from "../lib/passwordPolicy";

export default function ResetPassword({ session }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const { valid } = evaluatePassword(password);
    if (!valid) {
      setError("Please meet all the password requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate("/admin", { replace: true }), 1500);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Supabase establishes a temporary "recovery" session automatically when
  // the person arrives via the emailed link. If there isn't one, the link
  // is missing, expired, or already used.
  if (!session) {
    return (
      <div className="container page" style={{ maxWidth: 440 }}>
        <div className="eyebrow">Reset password</div>
        <div className="card">
          <h1 style={{ fontSize: "1.4rem", marginBottom: 12 }}>This link isn't valid anymore</h1>
          <p className="helper-text">
            Reset links expire after a while and can only be used once. Request a fresh one from the login page.
          </p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate("/admin/login")}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container page" style={{ maxWidth: 440 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.4rem" }}>Password updated</h1>
          <p className="helper-text" style={{ marginTop: 8 }}>Taking you to your garage…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 440 }}>
      <div className="eyebrow">Reset password</div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 24 }}>Choose a new password</h1>
      <div className="card">
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <PasswordRequirements password={password} />
          <div className="field">
            <label htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
