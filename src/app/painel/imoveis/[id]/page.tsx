import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { properties } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PropertyEditor } from "@/components/property-editor";
export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [p] = await getDb().select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!p) notFound();
  return <div className="admin-content"><div className="admin-page-title"><h1>Editar imóvel</h1></div>{p.status === "vendido" ? <p>Imóvel vendido. Alterações devem seguir o fluxo de venda.</p> : <PropertyEditor initial={{ id: p.id, code: p.code, title: p.title, slug: p.slug, type: p.type, price: (p.priceCents / 100).toFixed(2), area: p.privateArea || "", bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parkingSpaces, state: p.state, city: p.city, neighborhood: p.neighborhood, address: p.addressPrivate, description: p.description, status: p.status }}/> }</div>;
}
