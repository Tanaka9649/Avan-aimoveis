import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { PageHeader } from "@/components/admin-ui";
import { Pagination } from "@/components/list-tools";
import { getDb } from "@/db";
import { tenantAuditLogs, tenants, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { PAGE_SIZE, pageNumber, type Query } from "@/lib/list-query";
import { auditActionLabel, auditEntityLabel } from "@/lib/ui-labels";

const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const metadataSummary = (metadata: Record<string, unknown>) => {
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return "Sem detalhes adicionais";
  return entries.slice(0, 4).map(([key, value]) => {
    const cleanKey = key.replaceAll("_", " ");
    const cleanValue = Array.isArray(value) ? value.join(", ") : typeof value === "object" ? "dados registrados" : String(value);
    return `${cleanKey}: ${cleanValue}`;
  }).join(" · ");
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = single(params.q).trim();
  const tenantId = single(params.empresa);
  const page = pageNumber(params);
  const filters: SQL[] = [];

  if (q) filters.push(or(ilike(tenantAuditLogs.action, "%" + q + "%"), ilike(tenantAuditLogs.entityType, "%" + q + "%"), ilike(users.name, "%" + q + "%"), ilike(tenants.name, "%" + q + "%"))!);
  if (tenantId) filters.push(eq(tenantAuditLogs.tenantId, tenantId));
  const where = and(...filters);
  const db = getDb();

  const [[totalRow], rows, tenantOptions] = await Promise.all([
    db.select({ value: count() }).from(tenantAuditLogs)
      .leftJoin(users, eq(users.id, tenantAuditLogs.actorUserId))
      .leftJoin(tenants, eq(tenants.id, tenantAuditLogs.tenantId))
      .where(where),
    db.select({
      id: tenantAuditLogs.id,
      action: tenantAuditLogs.action,
      entityType: tenantAuditLogs.entityType,
      metadata: tenantAuditLogs.metadata,
      createdAt: tenantAuditLogs.createdAt,
      tenantName: tenants.name,
      actorName: users.name,
    }).from(tenantAuditLogs)
      .leftJoin(users, eq(users.id, tenantAuditLogs.actorUserId))
      .leftJoin(tenants, eq(tenants.id, tenantAuditLogs.tenantId))
      .where(where)
      .orderBy(desc(tenantAuditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name)).limit(500),
  ]);

  return (
    <main className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Auditoria" description="Acompanhe alterações administrativas e ações sensíveis registradas pela plataforma."/>
      <section className="admin-card">
        <form className="entity-form" method="get">
          <label className="wide">Buscar<input name="q" defaultValue={q} placeholder="Ação, usuário ou empresa"/></label>
          <label>Empresa<select name="empresa" defaultValue={tenantId}><option value="">Todas</option>{tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <div className="wide filter-actions"><button className="admin-button primary">Aplicar filtros</button>{q || tenantId ? <a className="admin-button secondary" href="/superadmin/auditoria">Limpar</a> : null}</div>
        </form>
      </section>
      <section className="admin-card table-card">
        {rows.length ? <div className="table-scroll"><table>
          <thead><tr><th>Ação</th><th>Empresa</th><th>Responsável</th><th>Detalhes</th><th>Quando</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><strong>{auditActionLabel(row.action)}</strong><small>{auditEntityLabel(row.entityType)}</small></td>
            <td>{row.tenantName || "Plataforma"}</td>
            <td>{row.actorName || "Sistema"}</td>
            <td><small>{metadataSummary(row.metadata)}</small></td>
            <td>{row.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</td>
          </tr>)}</tbody>
        </table></div> : <div className="table-empty roomy"><h2>Nenhum registro encontrado</h2><p>Não há eventos de auditoria que correspondam aos filtros atuais.</p></div>}
      </section>
      <Pagination query={params} page={page} total={Number(totalRow.value)} size={PAGE_SIZE}/>
    </main>
  );
}
