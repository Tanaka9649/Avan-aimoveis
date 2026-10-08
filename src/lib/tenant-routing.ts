export const ROOT_TENANT_ID = "00000000-0000-4000-8000-000000000001";
export const ROOT_TENANT_SLUG = "avanca-imoveis";
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export function normalizeTenantSlug(value: string) { return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120); }
export function normalizeHostname(value: string | null) { if (!value) return null; const host=value.trim().toLowerCase().split(",")[0].replace(/:\d+$/, "").replace(/^www\./, ""); return HOST_RE.test(host)?host:null; }
