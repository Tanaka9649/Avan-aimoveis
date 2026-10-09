import { requireModule } from "@/lib/access";
import { PageHeader } from "@/components/admin-ui";
import { PropertyEditor } from "@/components/property-editor";
import {getDb} from "@/db";
import {owners} from "@/db/schema";
import {asc, eq} from "drizzle-orm";
export default async function NewPropertyPage() { const user=await requireModule("imoveis");const rows=await getDb().select({id:owners.id,name:owners.name}).from(owners).where(eq(owners.tenantId,user.tenantId)).orderBy(asc(owners.name)); return <div className="admin-content"><PageHeader eyebrow="Portfólio" title="Novo imóvel" description="Preencha as informações essenciais. Você poderá revisar antes de publicar."/><PropertyEditor owners={rows}/></div>; }
