import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getVehicle,
  listUpdatesForVehicle,
  markVehicleRepaired,
  postUpdate,
  reopenVehicle,
} from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import CodeTicket from "../components/CodeTicket";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function VehicleDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [v, u] = await Promise.all([getVehicle(id), listUpdatesForVehicle(id)]);
    setVehicle(v);
    setUpdates(u);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePostUpdate(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postUpdate({ vehicleId: id, message: message.trim(), createdBy: session?.user?.id });
      setMessage("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleMarkRepaired() {
    setBusy(true);
    try {
      await markVehicleRepaired(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    setBusy(true);
    try {
      await reopenVehicle(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleNewCase() {
    navigate("/admin/vehicles/new", { state: { customer: vehicle.customers ? { ...vehicle.customers, id: vehicle.customer_id } : null } });
  }

  if (!vehicle) {
    return (
      <div className="container page">
        {error ? <p className="error-text">{error}</p> : <p className="nav-meta">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="row-between" style={{ marginBottom: 24, alignItems: "flex-start" }}>
        <div>
          <div className="eyebrow">Case file</div>
          <h1 style={{ fontSize: "1.8rem" }}>
            {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""}
          </h1>
          <p style={{ color: "var(--text-dim)", marginTop: 6 }}>
            {vehicle.customers?.name} {vehicle.plate_number ? `· ${vehicle.plate_number}` : ""}
            {vehicle.color ? ` · ${vehicle.color}` : ""}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Progress updates</h3>

          {updates.length === 0 ? (
            <div className="empty-state">No updates posted yet.</div>
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

          {vehicle.status === "active" && (
            <form onSubmit={handlePostUpdate} style={{ marginTop: 20 }}>
              <div className="field">
                <label htmlFor="update">Post an update</label>
                <textarea
                  id="update"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Diagnosed a worn timing belt, ordering the part now."
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={posting || !message.trim()}>
                {posting ? "Posting…" : "Post update"}
              </button>
            </form>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="stack">
          <CodeTicket code={vehicle.access_code} subLabel="Owner uses this to check progress." />

          <div className="card card-compact stack">
            {vehicle.status === "active" ? (
              <button className="btn btn-primary btn-block" onClick={handleMarkRepaired} disabled={busy}>
                Mark as repaired
              </button>
            ) : (
              <>
                <button className="btn btn-secondary btn-block" onClick={handleReopen} disabled={busy}>
                  Reopen this case
                </button>
                <button className="btn btn-primary btn-block" onClick={handleNewCase}>
                  Start new case for this owner
                </button>
              </>
            )}
            {vehicle.notes && (
              <div style={{ marginTop: 4 }}>
                <div className="ticket-label" style={{ marginBottom: 4 }}>
                  Intake notes
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-dim)" }}>{vehicle.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
