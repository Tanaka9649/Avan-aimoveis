import { getDb } from "@/db";
import { operationRuns, plans } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { emailConfigured } from "@/lib/email";
import { isPlanConfigured } from "@/lib/plan-configuration";
import { formatOperationDateTime } from "@/lib/datetime";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireSuperAdmin();
  const [runs, catalog] = await Promise.all([getDb().select().from(operationRuns), getDb().select().from(plans)]);
  return <div className="admin-content"><header className="page-header"><h1>Operação da plataforma</h1></header>
    <section className="admin-card"><h2>Configuração</h2><dl className="detail-list">
      <div><dt>E-mail transacional</dt><dd>{emailConfigured() ? "Credenciais configuradas; entrega depende do remetente validado no provedor." : "Pendente: configure a chave e o remetente do serviço de e-mail."}</dd></div>
      <div><dt>Rotinas agendadas</dt><dd>{process.env.CRON_SECRET ? "Autenticação configurada" : "Autenticação pendente"}</dd></div>
      <div><dt>Planos para novas empresas</dt><dd>{catalog.filter(p => p.active && isPlanConfigured(p.limits)).map(p => p.name).join(", ") || "Nenhum plano com limites definidos. Configure em Planos."}</dd></div>
    </dl></section>
    <section className="admin-card"><h2>Últimas execuções</h2>{runs.length ? <table><thead><tr><th>Rotina</th><th>Estado</th><th>Último sucesso</th><th>Última falha</th></tr></thead><tbody>{runs.map(run => <tr key={run.name}><td>{run.name}</td><td>{run.status === "ok" ? "Concluída" : "Falhou"}</td><td>{run.succeededAt ? formatOperationDateTime(run.succeededAt) : "Ainda não executada"}</td><td>{run.failedAt ? formatOperationDateTime(run.failedAt) : "Nenhuma registrada"}</td></tr>)}</tbody></table> : <p>Ainda não há execuções registradas nesta versão.</p>}</section>
  </div>;
}
