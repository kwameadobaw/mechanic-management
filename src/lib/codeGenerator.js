// Characters chosen to avoid look-alikes an owner could mistype
// when copying the code off a printed ticket: no 0/O, 1/I/L.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 16;

export function generateTrackingCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

// Formats a raw code as four groups of four for readability,
// e.g. "AB3D-EF7H-JK2M-NPQR". Storage/lookups always use the raw form.
export function formatTrackingCode(code) {
  if (!code) return "";
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function stripFormatting(input) {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
