import { getDb } from "@/db";
import { desc } from "drizzle-orm";
import { operationRunEvents, operationRuns, plans } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { emailConfigured } from "@/lib/email";
import { isPlanConfigured } from "@/lib/plan-configuration";
import { formatOperationDateTime } from "@/lib/datetime";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireSuperAdmin();
  const [runs, catalog, history] = await Promise.all([getDb().select().from(operationRuns), getDb().select().from(plans), getDb().select().from(operationRunEvents).orderBy(desc(operationRunEvents.createdAt)).limit(30)]);
  return <div className="admin-content"><header className="page-header"><h1>Operação da plataforma</h1></header>
    <section className="admin-card"><h2>Configuração</h2><dl className="detail-list">
      <div><dt>E-mail transacional</dt><dd>{emailConfigured() ? "Credenciais configuradas; entrega depende do remetente validado no provedor." : "Pendente: configure a chave e o remetente do serviço de e-mail."}</dd></div>
      <div><dt>Rotinas agendadas</dt><dd>{process.env.CRON_SECRET ? "Autenticação configurada" : "Autenticação pendente"}</dd></div>
      <div><dt>Planos para novas empresas</dt><dd>{catalog.filter(p => p.active && isPlanConfigured(p.limits)).map(p => p.name).join(", ") || "Nenhum plano com limites definidos. Configure em Planos."}</dd></div>
    </dl></section>
    <section className="admin-card"><h2>Últimas execuções</h2>{runs.length ? <table><thead><tr><th>Rotina</th><th>Estado</th><th>Último sucesso</th><th>Última falha</th></tr></thead><tbody>{runs.map(run => <tr key={run.name}><td>{run.name}</td><td>{run.status === "ok" ? "Concluída" : run.status === "skipped" ? "Não executada (configuração pendente)" : run.status === "pending" ? "Pendente" : "Falhou"}</td><td>{run.succeededAt ? formatOperationDateTime(run.succeededAt) : "Ainda não executada"}</td><td>{run.failedAt ? formatOperationDateTime(run.failedAt) : "Nenhuma registrada"}</td></tr>)}</tbody></table> : <p>Ainda não há execuções registradas nesta versão.</p>}</section>
    <section className="admin-card"><h2>Histórico recente</h2><p className="muted-copy">Últimas 30 execuções; retenção de 90 dias. Os códigos abaixo não contêm dados de clientes.</p><div className="table-scroll"><table><thead><tr><th>Quando</th><th>Rotina</th><th>Estado</th><th>Código operacional</th></tr></thead><tbody>{history.map(event=><tr key={event.id}><td>{formatOperationDateTime(event.createdAt)}</td><td>{event.name}</td><td>{event.status === "ok" ? "Concluída" : event.status === "skipped" ? "Não executada" : "Falhou"}</td><td>{event.code || "—"}</td></tr>)}</tbody></table></div>{!history.length?<p>Ainda não há histórico registrado.</p>:null}</section>
  </div>;
}
