import { z } from "zod";

// Integer cents remain the storage/API unit. This ceiling is below JS's exact-integer limit.
export const MAX_MONEY_CENTS = 99_999_999_999_999;
export function decimalToCents(value: string): number | null {
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents <= BigInt(MAX_MONEY_CENTS) ? Number(cents) : null;
}
export const moneyInput = z.string().trim().transform((value, ctx) => {
  const cents = decimalToCents(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Informe até R$ 999.999.999.999,99, com no máximo duas casas decimais." });
    return z.NEVER;
  }
  return cents;
});
export const positiveMoneyInput = moneyInput.pipe(z.number().positive());

/** User-entered search values may use Brazilian separators or canonical decimals. */
export function moneyFilterCents(value: string): number | null {
  const text = value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  const normalized = text.includes(",")
    ? (/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/.test(text) || /^\d+(?:,\d{1,2})?$/.test(text) ? text.replaceAll(".", "").replace(",", ".") : "")
    : /^\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replaceAll(".", "") : text;
  return decimalToCents(normalized);
}
