import { useEffect, useState } from "react";
import { getShopProfile, updateShopProfile } from "../lib/api";

export default function ShopSettings({ session }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getShopProfile(session.user.id)
      .then((data) => {
        setProfile(data);
        setForm({ name: data.name || "", phone: data.phone || "", address: data.address || "" });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await updateShopProfile({ shopId: session.user.id, ...form });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <p className="nav-meta">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 520 }}>
      <div className="eyebrow">Shop profile</div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Shop details</h1>
      <p className="helper-text" style={{ marginBottom: 24 }}>
        These live in the <code>shops</code> table in your Supabase project — visible and editable from
        the Supabase table editor too, not just here.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="name">Shop name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label>Login email</label>
            <input value={profile?.email || ""} disabled />
            <p className="helper-text">Managed through your account sign-in, not editable here.</p>
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 024 000 0000"
            />
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Shop location"
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          {saved && <p className="helper-text" style={{ color: "var(--green)" }}>Saved.</p>}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
