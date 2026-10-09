import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Contact, Search } from "lucide-react";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { owners, propertyOwners } from "@/db/schema";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { AdminDrawerComposer } from "@/components/admin-drawer-composer";
import { OwnerForm } from "@/components/owner-form";
import { Pagination } from "@/components/list-tools";
import { PAGE_SIZE, pageNumber, type Query, value } from "@/lib/list-query";
import { formatBrazilianPhone } from "@/lib/owner-identity";

export default async function OwnersPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireModule("proprietarios");
  const query = await searchParams;
  const q = value(query, "q").trim();
  const page = pageNumber(query);
  const filters: SQL[] = [eq(owners.tenantId, user.tenantId)];
  if (q) filters.push(or(ilike(owners.name, "%" + q + "%"), ilike(owners.phone, "%" + q + "%"), ilike(owners.email, "%" + q + "%"))!);
  const where = and(...filters);
  const db = getDb();

  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(owners).where(where),
    db.select({
      id: owners.id,
      name: owners.name,
      phone: owners.phone,
      email: owners.email,
      createdAt: owners.createdAt,
      properties: count(propertyOwners.propertyId),
    }).from(owners)
      .leftJoin(propertyOwners, and(eq(propertyOwners.ownerId, owners.id), eq(propertyOwners.tenantId, user.tenantId)))
      .where(where)
      .groupBy(owners.id)
      .orderBy(desc(owners.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  return (
    <div className="admin-content">
      <PageHeader eyebrow="Captação" title="Proprietários" description="Cadastre contatos e acompanhe os imóveis vinculados." action={<AdminDrawerComposer label="Novo proprietário" title="Novo proprietário" description="Dados protegidos e restritos à equipe." showPlus><OwnerForm/></AdminDrawerComposer>}/>
      <form className="admin-inline-search" method="get" role="search">
        <Search aria-hidden="true"/>
        <input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou e-mail" aria-label="Buscar proprietários"/>
        {q ? <Link href="/painel/proprietarios">Limpar</Link> : null}
      </form>

      {rows.length ? (
        <section className="admin-card table-card">
          <div className="table-toolbar"><div><strong>{Number(totalRow.value).toLocaleString("pt-BR")} proprietários</strong><span>Cadastros da empresa</span></div></div>
          <div className="table-scroll"><table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Imóveis</th><th>Ação</th></tr></thead>
            <tbody>{rows.map((owner) => <tr key={owner.id}>
              <td><Link href={`/painel/proprietarios/${owner.id}`}><strong>{owner.name}</strong></Link></td>
              <td>{formatBrazilianPhone(owner.phone)}</td>
              <td>{owner.email || "—"}</td>
              <td>{Number(owner.properties).toLocaleString("pt-BR")}</td>
              <td><Link className="admin-button secondary compact" href={`/painel/proprietarios/${owner.id}`}>Abrir</Link></td>
            </tr>)}</tbody>
          </table></div>
        </section>
      ) : <EmptyState icon={Contact} title={q ? "Nenhum proprietário encontrado" : "Nenhum proprietário cadastrado"} description={q ? "Ajuste a busca e tente novamente." : "Cadastre o primeiro proprietário para vinculá-lo aos imóveis."}/>}
      <Pagination query={query} page={page} total={Number(totalRow.value)} size={PAGE_SIZE}/>
    </div>
  );
}
