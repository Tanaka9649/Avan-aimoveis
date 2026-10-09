export const tenantStatusLabels: Record<string, string> = {
  configuring: "Configurando",
  trial: "Teste",
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

export const membershipRoleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  agent: "Corretor",
  viewer: "Leitura",
};

export const membershipStatusLabels: Record<string, string> = {
  invited: "Convidado",
  active: "Ativo",
  suspended: "Suspenso",
};

export const domainStatusLabels: Record<string, string> = {
  pending: "Pendente",
  verifying: "Verificando",
  active: "Ativo",
  error: "Com erro",
};

export const provisionStatusLabels: Record<string, string> = {
  pending: "Pendente",
  running: "Em andamento",
  complete: "Concluído",
  failed: "Falhou",
};

export const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  max: "Max",
  custom: "Personalizado",
};

export function uiLabel(value: string) {
  return tenantStatusLabels[value]
    || membershipRoleLabels[value]
    || membershipStatusLabels[value]
    || domainStatusLabels[value]
    || provisionStatusLabels[value]
    || planLabels[value]
    || value.replaceAll("_", " ");
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value >= 10 ? 1 : 2 })} ${units[index]}`;
}

export function countText(count: number, singular: string, plural = singular + "s") {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}
