export const formatMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
export const formatArea = (area: number) => `${new Intl.NumberFormat("pt-BR").format(area)} m²`;

export function calculateCommission(amountCents: number, percent: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(percent * 100 - Math.round(percent * 100)) > 0.000001) throw new Error("Valores inválidos");
  return Number((BigInt(amountCents) * BigInt(Math.round(percent * 100)) + 5000n) / 10000n);
}
