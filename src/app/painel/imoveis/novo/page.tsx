import { requireModule } from "@/lib/access";
import { PageHeader } from "@/components/admin-ui";
import { PropertyEditor } from "@/components/property-editor";
import { getDb } from "@/db";
import { owners } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ownerIdentityKey } from "@/lib/owner-identity";

export default async function NewPropertyPage() {
  const user = await requireModule("imoveis");
  const rawOwners = await getDb()
    .select({ id: owners.id, name: owners.name, phone: owners.phone, email: owners.email, createdAt: owners.createdAt })
    .from(owners)
    .where(eq(owners.tenantId, user.tenantId))
    .orderBy(asc(owners.createdAt));

  const rows = [...new Map(rawOwners.map((owner) => [ownerIdentityKey(owner), owner])).values()]
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="admin-content">
      <PageHeader eyebrow="Portfólio" title="Novo imóvel" description="Preencha as informações essenciais. Você poderá revisar antes de publicar."/>
      <PropertyEditor owners={rows}/>
    </div>
  );
}
