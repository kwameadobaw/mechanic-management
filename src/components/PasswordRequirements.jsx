import { evaluatePassword } from "../lib/passwordPolicy";

export default function PasswordRequirements({ password }) {
  const { results } = evaluatePassword(password);

  return (
    <ul className="password-requirements">
      {results.map((r) => (
        <li key={r.id} className={r.met ? "met" : ""}>
          <span className="check" aria-hidden="true">{r.met ? "✓" : "○"}</span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}
