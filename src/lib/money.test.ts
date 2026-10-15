import { describe, expect, it } from "vitest";
import { decimalToCents, moneyFilterCents, positiveMoneyInput, MAX_MONEY_CENTS } from "./money";
import { optionalMoney } from "./client-input";
import { calculateCommission, formatMoney } from "./format";

describe("exact large monetary amounts", () => {
  it.each([["21474836.48",2147483648],["350000000.57",35000000057],["999999999999.99",MAX_MONEY_CENTS],["1.01",101]])("converts %s to cents without a float roundtrip", (value, cents) => {
    expect(positiveMoneyInput.parse(value)).toBe(cents);
    expect(optionalMoney.parse(value)).toBe(cents);
  });
  it.each(["1000000000000", "90071992547409.92", "1e9", "12.001", "-1", "NaN", "Infinity"])("rejects unsafe or malformed %s", value => {
    expect(decimalToCents(value)).toBeNull();
    expect(positiveMoneyInput.safeParse(value).success).toBe(false);
  });
  it("preserves nullable budgets and zero", () => {
    expect(optionalMoney.parse("")).toBeNull();
    expect(optionalMoney.parse(undefined)).toBeNull();
    expect(optionalMoney.parse("0")).toBe(0);
  });
  it.each(["350.000.000,57", "350000000.57", "R$ 350.000.000,57"])("interprets search price %s consistently", value => expect(moneyFilterCents(value)).toBe(35000000057));
  it("keeps display and percentage commission precise", () => {
    expect(formatMoney(35000000057)).toContain("350.000.000,57");
    expect(calculateCommission(MAX_MONEY_CENTS,100)).toBe(MAX_MONEY_CENTS);
    expect(calculateCommission(35000000057,6.25)).toBe(2187500004);
    expect(()=>calculateCommission(100,NaN)).toThrow();
  });
});
