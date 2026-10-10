import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { Pagination } from "@/components/list-tools";
import { getDb } from "@/db";
import { tenantMemberships, tenants, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { PAGE_SIZE, pageNumber, type Query } from "@/lib/list-query";
import { membershipRoleLabels } from "@/lib/ui-labels";
import { setGlobalUserActive } from "../actions";

const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function SuperAdminUsersPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = single(params.q).trim();
  const status = single(params.status);
  const page = pageNumber(params);
  const filters: SQL[] = [];

  if (q) filters.push(or(ilike(users.name, "%" + q + "%"), ilike(users.email, "%" + q + "%"), ilike(tenants.name, "%" + q + "%"))!);
  if (["invited", "active", "suspended"].includes(status)) filters.push(eq(tenantMemberships.status, status as "invited" | "active" | "suspended"));

  const where = and(...filters);
  const db = getDb();
  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(tenantMemberships).innerJoin(users, eq(users.id, tenantMemberships.userId)).innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId)).where(where),
    db.select({
      id: tenantMemberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      globalRole: users.globalRole,
      userActive: users.active,
      tenantId: tenants.id,
      tenantName: tenants.name,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      updatedAt: tenantMemberships.updatedAt,
    }).from(tenantMemberships)
      .innerJoin(users, eq(users.id, tenantMemberships.userId))
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(where)
      .orderBy(desc(tenantMemberships.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  return (
    <main className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Usuários" description="Visão global de quem tem acesso às empresas da plataforma."/>
      <section className="admin-card">
        <form className="entity-form" method="get">
          <label className="wide">Buscar<input name="q" defaultValue={q} placeholder="Nome, e-mail ou empresa"/></label>
          <label>Status<select name="status" defaultValue={status}><option value="">Todos</option><option value="active">Ativos</option><option value="invited">Convidados</option><option value="suspended">Suspensos</option></select></label>
          <div className="wide filter-actions"><button className="admin-button primary">Aplicar filtros</button>{q || status ? <Link className="admin-button secondary" href="/superadmin/usuarios">Limpar</Link> : null}</div>
        </form>
      </section>
      <section className="admin-card table-card">
        <div className="table-scroll"><table>
          <thead><tr><th>Usuário</th><th>Empresa</th><th>Papel</th><th>Status</th><th>Conta global</th><th>Ações</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><strong>{row.name}</strong><small>{row.email}</small></td>
            <td><Link href={"/superadmin/empresas/" + row.tenantId}>{row.tenantName}</Link></td>
            <td>{membershipRoleLabels[row.role] || row.role}</td>
            <td><StatusBadge value={row.status}/></td>
            <td>{row.globalRole === "super_admin" ? "Super Admin" : row.userActive ? "Usuário ativo" : "Usuário suspenso"}</td>
            <td><div className="table-row-actions"><Link className="text-action" href={"/superadmin/empresas/" + row.tenantId}>Ver empresa</Link>{row.globalRole !== "super_admin" ? <form action={setGlobalUserActive}><input type="hidden" name="userId" value={row.userId}/><input type="hidden" name="active" value={row.userActive ? "0" : "1"}/><button className="admin-button secondary">{row.userActive ? "Suspender usuário" : "Reativar usuário"}</button></form> : null}</div></td>
          </tr>)}</tbody>
        </table></div>
        {!rows.length ? <div className="table-empty roomy"><h2>Nenhum usuário encontrado</h2><p>Ajuste os filtros para ampliar a busca.</p></div> : null}
      </section>
      <Pagination query={params} page={page} total={Number(totalRow.value)} size={PAGE_SIZE}/>
    </main>
  );
}
