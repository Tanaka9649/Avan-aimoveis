import { describe, expect, it } from "vitest";
import {
  displayDateInput,
  formatOperationDateTime,
  parseOperationDateTime,
  shiftDateInput,
  timeSlots,
  toDateInput,
  toTimeInput,
  zoneOffsetLabel,
} from "./datetime";

describe("parseOperationDateTime", () => {
  it("reads a wall-clock date and time as Brasília, not as UTC", () => {
    expect(parseOperationDateTime("2026-09-22T14:00")?.toISOString()).toBe("2026-09-22T17:00:00.000Z");
  });

  it("keeps an explicit offset untouched so existing payloads stay valid", () => {
    expect(parseOperationDateTime("2026-09-22T14:00:00-03:00")?.toISOString()).toBe("2026-09-22T17:00:00.000Z");
    expect(parseOperationDateTime("2026-09-22T17:00:00.000Z")?.toISOString()).toBe("2026-09-22T17:00:00.000Z");
  });

  it("anchors a date-only value at midday so the calendar day never shifts", () => {
    const parsed = parseOperationDateTime("2026-09-22");
    expect(parsed?.toISOString()).toBe("2026-09-22T15:00:00.000Z");
    expect(toDateInput(parsed)).toBe("2026-09-22");
  });

  it("supports end of day for deadlines", () => {
    expect(parseOperationDateTime("2026-09-22", { endOfDay: true })?.toISOString()).toBe("2026-09-23T02:59:59.000Z");
    expect(toDateInput(parseOperationDateTime("2026-09-22", { endOfDay: true }))).toBe("2026-09-22");
  });

  it("rejects empty and malformed values", () => {
    expect(parseOperationDateTime("")).toBeNull();
    expect(parseOperationDateTime("   ")).toBeNull();
    expect(parseOperationDateTime("ontem")).toBeNull();
    expect(parseOperationDateTime("2026-13-01")).toBeNull();
  });

  it("round-trips through the input helpers", () => {
    const instant = parseOperationDateTime("2026-01-05T08:30");
    expect(toDateInput(instant)).toBe("2026-01-05");
    expect(toTimeInput(instant)).toBe("08:30");
    expect(formatOperationDateTime(instant!)).toBe("05/01/2026, 08:30");
  });
});

describe("helpers", () => {
  it("labels the Brasília offset", () => {
    expect(zoneOffsetLabel(new Date("2026-09-22T17:00:00Z"))).toBe("-03:00");
  });

  it("shifts days without crossing timezones", () => {
    expect(shiftDateInput("2026-02-28", 1)).toBe("2026-03-01");
    expect(shiftDateInput("2026-09-22", 7)).toBe("2026-09-29");
    expect(shiftDateInput("2026-01-01", 0)).toBe("2026-01-01");
  });

  it("shows dates in the Brazilian format", () => {
    expect(displayDateInput("2026-09-22")).toBe("22/09/2026");
    expect(displayDateInput("")).toBe("");
  });

  it("builds 30-minute slots in 24h format", () => {
    const slots = timeSlots(8, 18);
    expect(slots[0]).toBe("08:00");
    expect(slots[1]).toBe("08:30");
    expect(slots.at(-1)).toBe("18:00");
    expect(slots).toHaveLength(21);
  });
});
