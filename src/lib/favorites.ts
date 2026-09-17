export function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("avan:favorites") || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
  } catch { return []; }
}
