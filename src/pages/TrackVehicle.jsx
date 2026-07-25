import { useState } from "react";
import { fetchUpdatesByCode, fetchVehicleByCode } from "../lib/api";
import { stripFormatting } from "../lib/codeGenerator";
import StatusBadge from "../components/StatusBadge";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TrackVehicle() {
  const [code, setCode] = useState("");
  const [vehicle, setVehicle] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = stripFormatting(code);
    if (clean.length !== 16) {
      setError("Tracking codes are 16 characters — double-check the code on your ticket.");
      return;
    }
    setLoading(true);
    setError("");
    setVehicle(null);
    try {
      const v = await fetchVehicleByCode(clean);
      if (!v) {
        setError("No vehicle found for that code. Check with the shop if you think this is wrong.");
        return;
      }
      const u = await fetchUpdatesByCode(clean);
      setVehicle(v);
      setUpdates(u);
    } catch (err) {
      setError(err.message || "Something went wrong looking that up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <div className="eyebrow">Owner lookup</div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 20 }}>Track your vehicle</h1>

      <form onSubmit={handleSubmit} className="card stack" style={{ marginBottom: 28 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="code">16-character tracking code</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AB3D-EF7H-JK2M-NPQR"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
            autoFocus
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Looking up…" : "View progress"}
        </button>
      </form>

      {vehicle && (
        <div className="stack">
          <div className="card">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <h3 style={{ fontSize: "1.15rem" }}>
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""}
              </h3>
              <StatusBadge status={vehicle.status} />
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
              {vehicle.customer_name}
              {vehicle.plate_number ? ` · ${vehicle.plate_number}` : ""}
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: 4 }}>
              At {vehicle.shop_name}
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Progress timeline</h3>
            {updates.length === 0 ? (
              <div className="empty-state">No updates posted yet — check back soon.</div>
            ) : (
              <ul className="timeline">
                {updates.map((u) => (
                  <li key={u.id}>
                    <div className="timeline-date">{formatDate(u.created_at)}</div>
                    <div className="timeline-message">{u.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
