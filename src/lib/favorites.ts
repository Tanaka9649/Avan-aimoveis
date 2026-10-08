export function favoritesStorageKey(tenantKey = "avanca-imoveis") {
  return `avan:favorites:${tenantKey}`;
}

export function readFavorites(tenantKey?: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(favoritesStorageKey(tenantKey)) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
  } catch {
    return [];
  }
}
