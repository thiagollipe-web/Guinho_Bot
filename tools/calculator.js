export function calculate(expression) {
  const clean = String(expression ?? "").trim();
  if (!/^[0-9+\-*/().,%\s]+$/.test(clean)) return null;
  const normalized = clean.replace(/,/g, ".").replace(/%/g, "/100");
  try {
    const value = Function('"use strict"; return (' + normalized + ')')();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
