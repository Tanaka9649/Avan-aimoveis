import { beforeEach, expect, it, vi } from "vitest";
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ requireAdmin: guard.requireAdmin }));
vi.mock("@/db", () => ({ getDb: guard.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createAccount, updateAccount, saveReminders, assignClient } from "./actions";
beforeEach(() => { vi.clearAllMocks(); guard.requireAdmin.mockRejectedValue(new Error("Denied")); });
for (const [name, action] of Object.entries({ createAccount, updateAccount, saveReminders, assignClient })) {
  it(name + " refuses mutations before database access without admin authorization", async () => {
    await expect(action({ message: "", ok: false }, new FormData())).rejects.toThrow("Denied");
    expect(guard.getDb).not.toHaveBeenCalled();
  });
}
