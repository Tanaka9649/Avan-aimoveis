import { expect, it } from "vitest";
import { canAccess, defaultAccess } from "./permissions";
it("grants all modules to the administrator", () => expect(canAccess({ role: "admin", access: { clients: "own", modules: [] } }, "clientes")).toBe(true));
it("denies modules not explicitly granted to team", () => expect(canAccess({ role: "equipe", access: { clients: "all", modules: ["imoveis"] } }, "crm")).toBe(false));
it("defaults to all clients and known modules", () => { expect(defaultAccess.clients).toBe("all"); expect(canAccess({ role: "equipe", access: defaultAccess }, "clientes")).toBe(true); });
