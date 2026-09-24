import { expect, it } from "vitest";
import { canAccess, defaultAccess, firstAllowedRoute } from "./permissions";
it("grants all modules to the administrator", () => expect(canAccess({ role: "admin", access: { clients: "own", modules: [] } }, "clientes")).toBe(true));
it("denies modules not explicitly granted to team", () => expect(canAccess({ role: "equipe", access: { clients: "all", modules: ["imoveis"] } }, "crm")).toBe(false));
it("defaults to all clients and known modules", () => { expect(defaultAccess.clients).toBe("all"); expect(canAccess({ role: "equipe", access: defaultAccess }, "clientes")).toBe(true); });
it("includes the dashboard in every newly-created full-access account", () => expect(defaultAccess.modules).toContain("dashboard"));
it("sends a user without dashboard permission to their first allowed route", () => expect(firstAllowedRoute({ role: "equipe", access: { clients: "own", modules: ["crm"] } })).toBe("/painel/crm"));
it("keeps administrators on the dashboard", () => expect(firstAllowedRoute({ role: "admin", access: { clients: "own", modules: [] } })).toBe("/painel"));
