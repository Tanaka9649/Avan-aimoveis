import { describe, expect, it } from "vitest";
import { actionTiming, calendarDayOffset, formatDateTime, formatTime } from "./date-time";

describe("platform date/time", () => {
  it("formats timestamps in America/Sao_Paulo", () => {
    const value = new Date("2026-10-10T20:03:29.000Z");
    expect(formatTime(value)).toBe("17:03");
    expect(formatDateTime(value)).toContain("10/10/2026");
    expect(formatDateTime(value)).toContain("17:03");
  });

  it("classifies overdue, today and future actions by calendar day in Sao Paulo", () => {
    const now = new Date("2026-10-10T15:00:00.000Z");
    expect(calendarDayOffset("2026-10-09T15:00:00.000Z", now)).toBe(-1);
    expect(actionTiming("2026-10-09T15:00:00.000Z", now).label).toBe("Atrasada há 1 dia");
    expect(actionTiming("2026-10-10T22:00:00.000Z", now).bucket).toBe("today");
    expect(actionTiming("2026-10-11T15:00:00.000Z", now).label).toBe("Amanhã");
  });
});
