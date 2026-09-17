import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { properties } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { PropertyEditor } from "@/components/property-editor";
export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis"); const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const [p] = await getDb().select().from(properties).where(eq(properties.id, id)).limit(1); if (!p) notFound();
  return <div className="admin-content"><PageHeader eyebrow="Portfólio" title="Editar imóvel" description={p.code} action={<StatusBadge value={p.status}/>}/>{p.status === "vendido" ? <section className="admin-card"><h2>Imóvel vendido</h2><p className="muted-copy">Alterações devem seguir o fluxo comercial.</p></section> : <PropertyEditor initial={{ id: p.id, code: p.code, title: p.title, slug: p.slug, type: p.type, price: (p.priceCents / 100).toFixed(2), area: p.privateArea || "", bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parkingSpaces, state: p.state, city: p.city, neighborhood: p.neighborhood, address: p.addressPrivate, description: p.description, status: p.status }}/>}</div>;
}
