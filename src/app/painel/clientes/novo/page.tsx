import { requireModule } from "@/lib/access";
import { PageHeader } from "@/components/admin-ui";
import { ClientEditor } from "@/components/client-editor";
export default async function Page(){await requireModule("clientes");return <div className="admin-content"><PageHeader title="Novo cliente" eyebrow="Relacionamento" description="Contatos e preferências para encontrar o imóvel ideal."/><ClientEditor initial={{origin:"Cadastro manual"}}/></div>;}
