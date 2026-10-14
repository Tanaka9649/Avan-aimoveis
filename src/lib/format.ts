export const formatMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
export const formatArea = (area: number) => `${new Intl.NumberFormat("pt-BR").format(area)} m²`;

export function calculateCommission(amountCents: number, percent: number) {
  if (!Number.isInteger(amountCents) || amountCents < 0 || percent < 0 || percent > 100) throw new Error("Valores inválidos");
  return Math.round(amountCents * percent / 100);
}
