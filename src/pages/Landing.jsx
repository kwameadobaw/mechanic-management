import { Link } from "react-router-dom";

const GALLERY = [
  {
    src: "https://images.pexels.com/photos/4116207/pexels-photo-4116207.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Mechanic working on an open engine bay with diagnostic tools",
  },
  {
    src: "https://images.pexels.com/photos/8478206/pexels-photo-8478206.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Mechanic performing maintenance on a car engine",
  },
  {
    src: "https://images.pexels.com/photos/4315575/pexels-photo-4315575.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Close-up of a mechanic's hands working on a car engine",
  },
];

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19.4 13.5c.1-.5.1-1 0-1.5l1.6-1.2-1.5-2.6-1.9.6a7.6 7.6 0 0 0-1.3-.8l-.3-2h-3l-.3 2a7.6 7.6 0 0 0-1.3.8l-1.9-.6-1.5 2.6L9.6 12c-.1.5-.1 1 0 1.5L8 14.7l1.5 2.6 1.9-.6c.4.3.8.6 1.3.8l.3 2h3l.3-2c.5-.2.9-.5 1.3-.8l1.9.6 1.5-2.6-1.6-1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="container page hero">
      <div className="float-gear">
        <GearIcon />
      </div>

      <div className="eyebrow fade-up">Repair tracking, no phone tag</div>
      <div className="hero-grid">
        <div>
          <h1 className="fade-up fade-up-delay-1" style={{ fontSize: "2.4rem", maxWidth: 560, lineHeight: 1.15 }}>
            Give every car a claim ticket. Give every owner a window into the bay.
          </h1>
          <p
            className="fade-up fade-up-delay-2"
            style={{ color: "var(--text-dim)", maxWidth: 520, marginTop: 16, fontSize: "1.05rem" }}
          >
            The shop logs each vehicle once and posts updates as work happens. The owner
            gets a 16-character code at drop-off — no account, no app, just the code —
            and can check progress any time.
          </p>

          <div className="fade-up fade-up-delay-3" style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link to="/admin/login" className="btn btn-primary">
              Shop login
            </Link>
            <Link to="/track" className="btn btn-secondary">
              Track my vehicle
            </Link>
          </div>
        </div>

        <div className="hero-photo-stack fade-up fade-up-delay-2">
          <img
            className="hero-photo hero-photo-main"
            src="https://images.pexels.com/photos/13065692/pexels-photo-13065692.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Mechanic diagnosing a car engine with a diagnostic tool"
          />
          <img
            className="hero-photo hero-photo-accent"
            src="https://images.pexels.com/photos/6870298/pexels-photo-6870298.jpeg?auto=compress&cs=tinysrgb&w=900"
            alt="Mechanic checking under the hood in a workshop"
          />
        </div>
      </div>

      <div className="gallery-strip fade-up fade-up-delay-3">
        {GALLERY.map((img) => (
          <img key={img.src} className="gallery-photo" src={img.src} alt={img.alt} />
        ))}
      </div>

      <div className="grid-cards fade-up fade-up-delay-4" style={{ marginTop: 40 }}>
        <div className="card card-hover">
          <h3>For the shop</h3>
          <p style={{ color: "var(--text-dim)", marginTop: 10, fontSize: "0.92rem" }}>
            Log in, receive a vehicle, generate a tracking code, and post progress
            updates as the repair moves along.
          </p>
          <Link to="/admin/login" className="btn btn-primary" style={{ marginTop: 18 }}>
            Shop login
          </Link>
        </div>
        <div className="card card-hover">
          <h3>For the car owner</h3>
          <p style={{ color: "var(--text-dim)", marginTop: 10, fontSize: "0.92rem" }}>
            Enter the code from your ticket to see your vehicle's status, every
            update the shop has posted, and get an email whenever a new one lands.
          </p>
          <Link to="/track" className="btn btn-secondary" style={{ marginTop: 18 }}>
            Track my vehicle
          </Link>
        </div>
      </div>
    </div>
  );
}
