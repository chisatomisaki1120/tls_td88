export function normalizePhoneToLast9(input: string) {
  const value = String(input ?? "").trim().replace(/[.\-()\s]/g, "");
  if (!value) return null;

  let normalized = value;
  if (normalized.startsWith("+84")) normalized = normalized.slice(3);
  if (normalized.startsWith("84")) normalized = normalized.slice(2);
  if (normalized.startsWith("0")) normalized = normalized.slice(1);

  if (!/^\d+$/.test(normalized)) return null;
  if (normalized.length < 9) return null;

  const last9 = normalized.slice(-9);
  return /^\d{9}$/.test(last9) ? last9 : null;
}
