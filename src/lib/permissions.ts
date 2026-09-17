export const modules = ["imoveis", "clientes", "crm", "visitas", "propostas", "proprietarios"] as const;
export type Module = typeof modules[number];
export type Access = { modules: Module[]; clients: "all" | "own" };
export const defaultAccess: Access = { modules: [...modules], clients: "all" };
export function canAccess(user: { role: string; access: Access }, module: Module) {
  return user.role === "admin" || user.access.modules.includes(module);
}
