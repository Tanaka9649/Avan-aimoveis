export function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function ownerIdentityKey(input: { name: string; phone?: string | null; email?: string | null }) {
  const name = normalizePersonName(input.name);
  const phone = normalizePhone(input.phone || "");
  const email = normalizeEmail(input.email);
  return phone ? `phone:${phone}` : email ? `email:${email}` : `name:${name}`;
}

export function sameOwnerIdentity(
  a: { name: string; phone?: string | null; email?: string | null },
  b: { name: string; phone?: string | null; email?: string | null },
) {
  const aPhone = normalizePhone(a.phone || "");
  const bPhone = normalizePhone(b.phone || "");
  if (aPhone && bPhone) return aPhone === bPhone;

  const aEmail = normalizeEmail(a.email);
  const bEmail = normalizeEmail(b.email);
  if (aEmail && bEmail) return aEmail === bEmail;

  return normalizePersonName(a.name) === normalizePersonName(b.name);
}

export function isValidBrazilianPhone(value: string) {
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatBrazilianPhone(value?: string | null) {
  const digits = normalizePhone(value || "");
  if (!digits) return "—";
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return value || "—";
}
