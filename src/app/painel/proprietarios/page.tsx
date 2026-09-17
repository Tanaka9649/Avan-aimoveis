import { desc } from "drizzle-orm";
import { Contact } from "lucide-react";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { owners } from "@/db/schema";
import { EmptyState, PageHeader, PlannedAction } from "@/components/admin-ui";
export default async function OwnersPage() {
  await requireModule("proprietarios"); const rows = await getDb().select({ id: owners.id, name: owners.name, phone: owners.phone, email: owners.email, createdAt: owners.createdAt }).from(owners).orderBy(desc(owners.createdAt)).limit(100);
  return <div className="admin-content"><PageHeader eyebrow="Captação" title="Proprietários" description="Dados protegidos de proprietários e contatos vinculados aos imóveis." action={<PlannedAction label="Novo proprietário"/>}/>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} proprietários</strong><span>Cadastros mais recentes</span></div></div><div className="table-scroll"><table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th></tr></thead><tbody>{rows.map((owner) => <tr key={owner.id}><td><strong>{owner.name}</strong></td><td>{owner.phone}</td><td>{owner.email || "—"}</td><td>{new Intl.DateTimeFormat("pt-BR").format(owner.createdAt)}</td></tr>)}</tbody></table></div></section> : <EmptyState icon={Contact} title="Nenhum proprietário cadastrado" description="Os dados pessoais ficarão restritos à equipe e nunca serão exibidos no site público."/>}
  </div>;
}
