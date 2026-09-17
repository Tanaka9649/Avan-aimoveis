import { asc, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { clients, properties, visits } from "@/db/schema";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
export default async function VisitsPage() {
  await requireModule("visitas");
  const rows = await getDb().select({ id: visits.id, scheduledAt: visits.scheduledAt, status: visits.status, client: clients.name, property: properties.title, code: properties.code }).from(visits).innerJoin(clients, eq(clients.id, visits.clientId)).innerJoin(properties, eq(properties.id, visits.propertyId)).orderBy(asc(visits.scheduledAt)).limit(100);
  return <div className="admin-content"><PageHeader eyebrow="Agenda" title="Visitas" description="Acompanhe horários, clientes, imóveis e o andamento de cada visita."/>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} visitas</strong><span>Agenda ordenada por data</span></div></div><div className="table-scroll"><table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Imóvel</th><th>Status</th></tr></thead><tbody>{rows.map((visit) => <tr key={visit.id}><td><strong>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(visit.scheduledAt)}</strong></td><td>{new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(visit.scheduledAt)}</td><td>{visit.client}</td><td>{visit.property}<small>{visit.code}</small></td><td><StatusBadge value={visit.status}/></td></tr>)}</tbody></table></div></section> : <EmptyState icon={CalendarDays} title="Nenhuma visita agendada" description="Quando uma visita for cadastrada, data, cliente e imóvel aparecerão aqui."/>}
  </div>;
}
