import type { Module } from "@/lib/permissions";

export type ModuleDefinition = {
  key: Module;
  label: string;
  description: string;
  dependencies: Module[];
};

export const moduleRegistry: readonly ModuleDefinition[] = [
  { key: "dashboard", label: "Visão geral", description: "Indicadores operacionais do tenant.", dependencies: [] },
  { key: "imoveis", label: "Imóveis", description: "Portfólio, mídia e publicação.", dependencies: [] },
  { key: "clientes", label: "Clientes", description: "Cadastro e atendimento.", dependencies: [] },
  { key: "crm", label: "CRM", description: "Funil e oportunidades.", dependencies: ["clientes"] },
  { key: "visitas", label: "Visitas", description: "Agenda e acompanhamento.", dependencies: ["clientes", "imoveis"] },
  { key: "propostas", label: "Propostas e vendas", description: "Negociação e fechamento.", dependencies: ["crm"] },
  { key: "proprietarios", label: "Proprietários", description: "Relacionamento com proprietários.", dependencies: ["imoveis"] },
  { key: "analytics", label: "Analytics", description: "Métricas do site público.", dependencies: [] },
] as const;

const byKey = new Map(moduleRegistry.map((entry) => [entry.key, entry]));
export function moduleDefinition(module: Module) { return byKey.get(module); }
export function validModuleCombination(enabled: readonly Module[]) {
  const set = new Set(enabled);
  return enabled.every((key) => moduleDefinition(key)?.dependencies.every((dependency) => set.has(dependency)));
}
