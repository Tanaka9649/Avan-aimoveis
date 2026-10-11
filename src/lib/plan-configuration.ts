export const planLimitKeys = ["max_users", "max_properties", "max_clients", "max_opportunities", "max_documents", "max_storage_bytes", "custom_domain"] as const;
export function isPlanConfigured(limits: Record<string, number | null>) {
  return planLimitKeys.every(key => Object.hasOwn(limits, key) && (limits[key] === null || (Number.isSafeInteger(limits[key]) && limits[key]! >= 0))) && [0, 1].includes(limits.custom_domain as number);
}
