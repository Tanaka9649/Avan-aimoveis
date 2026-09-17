import { requireModule } from "@/lib/access";
import { PageHeader } from "@/components/admin-ui";
import { PropertyEditor } from "@/components/property-editor";
export default async function NewPropertyPage() { await requireModule("imoveis"); return <div className="admin-content"><PageHeader eyebrow="Portfólio" title="Novo imóvel" description="Preencha as informações essenciais. Você poderá revisar antes de publicar."/><PropertyEditor/></div>; }
