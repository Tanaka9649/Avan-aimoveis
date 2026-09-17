"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, activityLogs } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { propertyInput } from "@/lib/property-input";

export async function saveProperty(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  const user = await requireModule("imoveis");
  const parsed = propertyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise os campos: " + [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ") };
  const rawId = formData.get("id");
  if (rawId && !z.uuid().safeParse(rawId).success) return { error: "Identificador inválido." };
  const id = typeof rawId === "string" && rawId ? rawId : randomUUID();
  const p = parsed.data;
  const values = { code: p.code, title: p.title, slug: p.slug, type: p.type, priceCents: p.price, city: p.city, state: p.state, neighborhood: p.neighborhood, addressPrivate: p.address, description: p.description, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parkingSpaces: p.parking, privateArea: p.area.toFixed(2), status: p.status, publishedAt: p.status === "disponivel" ? new Date() : null, updatedAt: new Date() };
  try {
    const db = getDb();
    if (rawId) {
      const result = await db.update(properties).set(values).where(and(eq(properties.id, id), ne(properties.status, "vendido"))).returning({ id: properties.id });
      if (!result.length) return { error: "Imóvel não encontrado ou já vendido. A venda deve ser tratada pelo fluxo comercial." };
    } else {
      await db.batch([
        db.insert(properties).values({ id, ...values }),
        db.insert(activityLogs).values({ userId: user.id, entityType: "property", entityId: id, action: "create", details: { code: p.code } }),
      ]);
    }
  } catch { return { error: "Não foi possível salvar. Verifique se o código ou slug já existe e tente novamente." }; }
  revalidatePath("/", "layout");
  redirect("/painel/imoveis");
}
