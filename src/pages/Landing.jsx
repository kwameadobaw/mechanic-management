import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="container page">
      <div className="eyebrow">Repair tracking, no phone tag</div>
      <h1 style={{ fontSize: "2.4rem", maxWidth: 560, lineHeight: 1.15 }}>
        Give every car a claim ticket. Give every owner a window into the bay.
      </h1>
      <p style={{ color: "var(--text-dim)", maxWidth: 520, marginTop: 16, fontSize: "1.05rem" }}>
        The shop logs each vehicle once and posts updates as work happens. The owner
        gets a 16-character code at drop-off — no account, no app, just the code —
        and can check progress any time.
      </p>

      <div className="grid-cards" style={{ marginTop: 40 }}>
        <div className="card">
          <h3>For the shop</h3>
          <p style={{ color: "var(--text-dim)", marginTop: 10, fontSize: "0.92rem" }}>
            Log in, receive a vehicle, generate a tracking code, and post progress
            updates as the repair moves along.
          </p>
          <Link to="/admin/login" className="btn btn-primary" style={{ marginTop: 18 }}>
            Shop login
          </Link>
        </div>
        <div className="card">
          <h3>For the car owner</h3>
          <p style={{ color: "var(--text-dim)", marginTop: 10, fontSize: "0.92rem" }}>
            Enter the code from your ticket to see your vehicle's status and every
            update the shop has posted.
          </p>
          <Link to="/track" className="btn btn-secondary" style={{ marginTop: 18 }}>
            Track my vehicle
          </Link>
        </div>
      </div>
    </div>
  );
}
