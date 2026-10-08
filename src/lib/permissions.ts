export const modules = ["dashboard", "imoveis", "clientes", "crm", "visitas", "propostas", "proprietarios", "analytics"] as const;
export type Module = typeof modules[number];
export type Access = { modules: Module[]; clients: "all" | "own" };
export const defaultAccess: Access = { modules: [...modules], clients: "all" };
export const moduleLabels: Record<Module, string> = {
  dashboard: "Visão geral", imoveis: "Imóveis", clientes: "Clientes", crm: "CRM",
  visitas: "Visitas", propostas: "Propostas e vendas", proprietarios: "Proprietários", analytics: "Analytics",
};
const moduleRoutes: Record<Module, string> = {
  dashboard: "/painel", imoveis: "/painel/imoveis", clientes: "/painel/clientes", crm: "/painel/crm",
  visitas: "/painel/visitas", propostas: "/painel/propostas", proprietarios: "/painel/proprietarios", analytics: "/painel/analytics",
};
export function canAccess(user: { role: string; access: Access }, module: Module) {
  return user.role === "admin" || user.access.modules.includes(module);
}
export function firstAllowedRoute(user: { role: string; access: Access }) {
  if (user.role === "admin") return "/painel";
  const selected = modules.find((candidate) => canAccess(user, candidate));
  return selected ? moduleRoutes[selected] : "/login?sem-acesso=1";
}
