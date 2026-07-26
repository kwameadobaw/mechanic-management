import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createCustomer, createVehicle, findCustomerByPhone } from "../lib/api";
import CodeTicket from "../components/CodeTicket";

export default function NewVehicle({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillCustomer = location.state?.customer ?? null;

  const [customer, setCustomer] = useState(
    prefillCustomer
      ? { id: prefillCustomer.id, name: prefillCustomer.name, phone: prefillCustomer.phone, email: prefillCustomer.email }
      : { id: null, name: "", phone: "", email: "" }
  );
  const [lookupDone, setLookupDone] = useState(Boolean(prefillCustomer));
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plateNumber: "", color: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const shopId = session?.user?.id;

  const canSearch = useMemo(() => customer.phone && customer.phone.trim().length >= 5, [customer.phone]);

  async function handleLookup() {
    setError("");
    try {
      const found = await findCustomerByPhone(customer.phone.trim());
      if (found) {
        setCustomer({ id: found.id, name: found.name, phone: found.phone, email: found.email || "" });
      }
      setLookupDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let customerId = customer.id;
      if (!customerId) {
        const newCustomer = await createCustomer({
          shopId,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || null,
        });
        customerId = newCustomer.id;
      }

      const newVehicle = await createVehicle({
        shopId,
        customerId,
        make: vehicle.make.trim(),
        model: vehicle.model.trim(),
        year: vehicle.year.trim() || null,
        plateNumber: vehicle.plateNumber.trim() || null,
        color: vehicle.color.trim() || null,
        notes: vehicle.notes.trim() || null,
      });

      setCreated(newVehicle);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="container page" style={{ maxWidth: 480 }}>
        <div className="eyebrow">Vehicle received</div>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 24 }}>
          {vehicle.make} {vehicle.model} is logged
        </h1>
        <CodeTicket code={created.access_code} subLabel="Hand this code to the owner — it's the only thing they need to track this repair." />
        <div className="row-between" style={{ marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={() => navigate("/admin")}>
            Back to garage
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/admin/vehicles/${created.id}`)}>
            Open vehicle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <div className="eyebrow">Intake</div>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 24 }}>Receive a vehicle</h1>

      <form onSubmit={handleSubmit} className="stack">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Owner</h3>
          {prefillCustomer ? (
            <p className="helper-text">
              Starting a new case for <strong style={{ color: "var(--text)" }}>{customer.name}</strong> — their
              contact details are reused, nothing is re-entered.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  value={customer.phone}
                  maxLength={30}
                  onChange={(e) => {
                    setLookupDone(false);
                    setCustomer((c) => ({ ...c, id: null, phone: e.target.value }));
                  }}
                  placeholder="e.g. 0244000000"
                />
                <p className="helper-text">
                  We check this against existing owners so their details are never entered twice.
                </p>
              </div>
              {canSearch && !lookupDone && (
                <button type="button" className="btn btn-secondary" onClick={handleLookup}>
                  Look up owner
                </button>
              )}
              {lookupDone && customer.id && (
                <p className="helper-text" style={{ color: "var(--green)" }}>
                  Found existing owner — details filled in below.
                </p>
              )}
              {lookupDone && (
                <div style={{ marginTop: 12 }}>
                  <div className="field">
                    <label htmlFor="name">Owner name</label>
                    <input
                      id="name"
                      value={customer.name}
                      onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                      required
                      maxLength={200}
                      disabled={Boolean(customer.id)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email (optional)</label>
                    <input
                      id="email"
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                      maxLength={254}
                      disabled={Boolean(customer.id)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Vehicle</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="make">Make</label>
              <input
                id="make"
                value={vehicle.make}
                onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))}
                placeholder="Toyota"
                maxLength={60}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="model">Model</label>
              <input
                id="model"
                value={vehicle.model}
                onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))}
                placeholder="Corolla"
                maxLength={60}
                required
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="year">Year</label>
              <input
                id="year"
                value={vehicle.year}
                onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value }))}
                placeholder="2016"
                maxLength={4}
              />
            </div>
            <div className="field">
              <label htmlFor="color">Color</label>
              <input
                id="color"
                value={vehicle.color}
                onChange={(e) => setVehicle((v) => ({ ...v, color: e.target.value }))}
                placeholder="Silver"
                maxLength={40}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="plate">Plate number</label>
            <input
              id="plate"
              value={vehicle.plateNumber}
              onChange={(e) => setVehicle((v) => ({ ...v, plateNumber: e.target.value }))}
              placeholder="GT 1234-24"
              maxLength={20}
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Intake notes</label>
            <textarea
              id="notes"
              rows={3}
              value={vehicle.notes}
              onChange={(e) => setVehicle((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Reported issue, mileage, anything worth logging at drop-off"
              maxLength={2000}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={submitting || (!prefillCustomer && !lookupDone) || (!customer.id && !customer.name)}
        >
          {submitting ? "Generating code…" : "Receive vehicle & generate code"}
        </button>
      </form>
    </div>
  );
}
