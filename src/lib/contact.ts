/** Store international digits; local Brazilian numbers receive country code 55. */
export function normalizeWhatsApp(value: string): string | null {
  if (/[^\d\s()+.-]/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith("55") && !/^55[1-9]\d[2-9]\d{7,8}$/.test(digits)) return null;
  return digits;
}

export function whatsappContactUrl(value: string, message = "") {
  const number = normalizeWhatsApp(value);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

export function telephoneContactUrl(value: string) {
  const number = normalizeWhatsApp(value);
  return number ? `tel:+${number}` : null;
}
