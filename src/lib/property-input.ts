import { z } from "zod";

const optionalArea = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : value,
  z.coerce.number().positive().max(99999999.99).optional(),
);

export const propertyInput = z.object({
  code: z.string().trim().min(3).max(30),
  title: z.string().trim().min(8).max(180),
  slug: z.string().trim().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(["Apartamento", "Casa", "Cobertura", "Studio", "Terreno"]),
  price: z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform((s) => {
    const [a, b = ""] = s.split(".");
    return Number(a) * 100 + Number(b.padEnd(2, "0"));
  }).pipe(z.number().int().positive().max(2147483647)),
  area: optionalArea,
  lotArea: optionalArea,
  bedrooms: z.coerce.number().int().min(0).max(100),
  suites: z.coerce.number().int().min(0).max(100),
  bathrooms: z.coerce.number().int().min(0).max(100),
  parking: z.coerce.number().int().min(0).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((s) => s.toUpperCase()),
  city: z.string().trim().min(2).max(120),
  neighborhood: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(1000),
  description: z.string().trim().min(30).max(20000),
  status: z.enum(["rascunho", "disponivel", "pausado", "reservado"]),
}).superRefine((value, ctx) => {
  if (value.type === "Terreno") {
    if (!value.lotArea) ctx.addIssue({ code: "custom", path: ["lotArea"], message: "Informe a área do terreno." });
    return;
  }
  if (!value.area) ctx.addIssue({ code: "custom", path: ["area"], message: "Informe a área construída ou privativa." });
});
