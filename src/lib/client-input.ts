import { z } from "zod";

export const optionalMoney = z.string().trim().default("").refine(v => !v || /^\d+(?:\.\d{1,2})?$/.test(v), "Valor inválido").transform(v => v ? Math.round(Number(v) * 100) : null).pipe(z.number().int().min(0).max(2147483647).nullable());
export const listInput = z.string().max(4000).default("").transform(v => [...new Set(v.split(/[,;\n]/).map(s => s.trim()).filter(Boolean))].slice(0,50));
export const clientInput = z.object({
  name: z.string().trim().min(2).max(160), phone: z.string().transform(v=>v.replace(/\D/g, "")).pipe(z.string().min(10).max(15)),
  email: z.union([z.email().max(254), z.literal("")]).transform(v=>v.toLowerCase() || null), origin: z.string().trim().min(2).max(80),
  budgetMin: optionalMoney, budgetMax: optionalMoney, desiredTypes: listInput, desiredRegions: listInput, desiredFeatures: listInput,
  minBedrooms: z.coerce.number().int().min(0).max(100), minBathrooms: z.coerce.number().int().min(0).max(100), minParkingSpaces: z.coerce.number().int().min(0).max(100),
}).refine(v => v.budgetMin === null || v.budgetMax === null || v.budgetMin <= v.budgetMax, {message:"Orçamento mínimo maior que máximo",path:["budgetMax"]});
