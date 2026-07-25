import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listVehicles } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { formatTrackingCode } from "../lib/codeGenerator";

export default function AdminDashboard() {
  const [tab, setTab] = useState("active");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listVehicles({ status: tab })
      .then((data) => {
        if (!cancelled) setVehicles(data);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="container page">
      <div className="row-between" style={{ marginBottom: 28 }}>
        <div>
          <div className="eyebrow">Garage</div>
          <h1 style={{ fontSize: "1.8rem" }}>Vehicles</h1>
        </div>
        <Link to="/admin/vehicles/new" className="btn btn-primary">
          + Receive a vehicle
        </Link>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          In progress
        </button>
        <button className={`tab ${tab === "repaired" ? "active" : ""}`} onClick={() => setTab("repaired")}>
          Repaired
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="nav-meta">Loading vehicles…</p>}

      {!loading && vehicles.length === 0 && (
        <div className="empty-state">
          <p>
            {tab === "active"
              ? "No vehicles in progress. Receive a vehicle to generate its first tracking code."
              : "No repaired vehicles yet."}
          </p>
        </div>
      )}

      <div className="grid-cards">
        {vehicles.map((v) => (
          <Link
            key={v.id}
            to={`/admin/vehicles/${v.id}`}
            className="card card-compact"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="row-between" style={{ marginBottom: 10 }}>
              <h3 style={{ fontSize: "1.05rem" }}>
                {v.make} {v.model}
              </h3>
              <StatusBadge status={v.status} />
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", margin: "0 0 6px" }}>
              {v.customers?.name} {v.plate_number ? `· ${v.plate_number}` : ""}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--steel)" }}>
              {formatTrackingCode(v.access_code)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
