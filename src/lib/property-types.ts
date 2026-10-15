/** Shared options for validation, editors, CRM preferences and public/internal filters. */
export const PROPERTY_TYPES = [
  "Apartamento", "Casa", "Cobertura", "Studio", "Terreno", "Sobrado",
  "Comercial", "Sala comercial", "Loja", "Galpão", "Rural", "Fazenda", "Sítio", "Chácara",
] as const;
export const requiresLotArea = (type: string) => ["Terreno", "Rural", "Fazenda", "Sítio", "Chácara"].includes(type);
