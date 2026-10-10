import { describe, expect, it } from "vitest";
import { floatingMenuPosition } from "./floating-menu";

describe("floating menu position", () => {
  it("keeps a menu inside a narrow viewport", () => {
    const result = floatingMenuPosition({
      rect: { top: 120, bottom: 155, right: 210 },
      viewportWidth: 240,
      viewportHeight: 500,
      width: 220,
      height: 260,
    });
    expect(result.left).toBe(8);
    expect(result.top).toBeGreaterThanOrEqual(8);
  });

  it("opens above when there is not enough room below", () => {
    const result = floatingMenuPosition({
      rect: { top: 430, bottom: 465, right: 1000 },
      viewportWidth: 1150,
      viewportHeight: 600,
      width: 220,
      height: 260,
    });
    expect(result.placement).toBe("top");
    expect(result.top).toBeLessThan(430);
  });
});
