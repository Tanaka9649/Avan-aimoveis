import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  clients,
  properties,
  owners,
  propertyOwners,
  propertyPhotos,
  propertyDocuments,
} from "@/db/schema";
import { clientScope, requireModule } from "@/lib/access";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";
import { SiteBadge } from "@/components/site-badge";
import { PropertyEditor } from "@/components/property-editor";
import { propertyMatch } from "@/lib/property-match";
import { canAccess } from "@/lib/permissions";
import Link from "next/link";
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireModule("imoveis");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [p] = await getDb()
    .select()
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);
  if (!p) notFound();
  const ownerRows = await getDb()
    .select({ id: owners.id, name: owners.name })
    .from(owners);
  const linked = await getDb()
    .select({ name: owners.name })
    .from(propertyOwners)
    .innerJoin(owners, eq(owners.id, propertyOwners.ownerId))
    .where(eq(propertyOwners.propertyId, id));
  const [photos, documents] = await Promise.all([
    getDb()
      .select({
        id: propertyPhotos.id,
        alt: propertyPhotos.alt,
        position: propertyPhotos.position,
        isCover: propertyPhotos.isCover,
        blurData: propertyPhotos.blurData,
      })
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, id)),
    getDb()
      .select({
        id: propertyDocuments.id,
        originalName: propertyDocuments.originalName,
        mime: propertyDocuments.mime,
        size: propertyDocuments.size,
      })
      .from(propertyDocuments)
      .where(eq(propertyDocuments.propertyId, id)),
  ]);
  const candidates = canAccess(user, "clientes")
    ? await getDb().select().from(clients).where(clientScope(user))
    : [];
  const matches = candidates
    .map((client) => ({ ...client, ...propertyMatch(client, p) }))
    .filter((client) => client.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return (
    <div className="admin-content">
      <PageHeader
        eyebrow="Portfólio"
        title="Editar imóvel"
        description={p.code}
        action={<span className="page-header-badges"><StatusBadge value={p.status} /><SiteBadge property={p} /></span>}
      />
      {canAccess(user, "clientes") ? (
        <SectionCard
          title={`${matches.length} clientes compatíveis`}
          description="Lista ordenada por compatibilidade objetiva com este imóvel."
        >
          <div className="match-list">
            {matches.length ? matches.map((client) => (
              <Link href={`/painel/crm?view=clientes&cliente=${client.id}`} key={client.id}>
                <b>{client.score}%</b><div><strong>{client.name}</strong><small>{client.reasons.map((reason) => `${reason.done ? "✓" : "✕"} ${reason.label}`).join(" · ")}</small></div>
              </Link>
            )) : <p className="muted-copy">Nenhum cliente atingiu os critérios mínimos ainda.</p>}
          </div>
        </SectionCard>
      ) : null}
      {p.status === "vendido" ? (
        <section className="admin-card">
          <h2>Imóvel vendido</h2>
          <p className="muted-copy">
            Alterações devem seguir o fluxo comercial.
          </p>
        </section>
      ) : (
        <PropertyEditor
          owners={ownerRows}
          photos={photos}
          documents={documents}
          initial={{
            features: p.features.join("\n"),
            ownerNames: linked.map((o) => o.name).join(", "),
            id: p.id,
            code: p.code,
            title: p.title,
            slug: p.slug,
            type: p.type,
            price: (p.priceCents / 100).toFixed(2),
            area: p.privateArea || "",
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            parking: p.parkingSpaces,
            state: p.state,
            city: p.city,
            neighborhood: p.neighborhood,
            address: p.addressPrivate,
            description: p.description,
            status: p.status,
            published: p.publishedAt ? "1" : "0",
          }}
        />
      )}
    </div>
  );
}
