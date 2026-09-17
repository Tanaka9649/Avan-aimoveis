import { z } from "zod";

export const leadInput = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(30).refine((value) => /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 15),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  message: z.string().trim().max(1200).optional(),
  propertyId: z.uuid(),
  consent: z.literal("true"),
});
