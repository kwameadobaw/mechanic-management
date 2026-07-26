// Single source of truth for what counts as a strong password, so the
// signup form, the reset-password form, and any future form all agree.
export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (pw) => pw.length >= 10 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "One number (0-9)", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", label: "One special character (e.g. ! @ # $ %)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function evaluatePassword(password) {
  const safe = password || "";
  const results = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(safe),
  }));
  return { results, valid: results.every((r) => r.met) };
}
