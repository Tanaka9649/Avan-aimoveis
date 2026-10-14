import Link from "next/link";
import { canWrite } from "@/lib/permissions";
import { visitRows, visitChoices, visitPageNumber, VISIT_PAGE_SIZE } from "@/lib/visit-queries";
import { CalendarDays } from "lucide-react";
import { AdminTabs } from "@/components/admin-tabs";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
import { AdminDrawerComposer } from "@/components/admin-drawer-composer";
import { VisitForm } from "@/components/visit-form";

import { requireModule } from "@/lib/access";
import { VisitStatusForm } from "@/components/visit-status-form";

const dateFmt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeZone:"America/Sao_Paulo"});
const timeFmt=new Intl.DateTimeFormat("pt-BR",{timeStyle:"short",timeZone:"America/Sao_Paulo"});

export default async function VisitsPage({searchParams}:{searchParams:Promise<{page?:string;view?:string}>}){
 const user=await requireModule("visitas");const params=await searchParams;const page=visitPageNumber(params.page);const view=["all","history"].includes(params.view||"")?params.view!:"upcoming";
 const [result,[clientChoices,propertyChoices,dealChoices]]=await Promise.all([visitRows(user,page,view),visitChoices(user)]);
 const hasNext=result.length>VISIT_PAGE_SIZE;const rows=result.slice(0,VISIT_PAGE_SIZE);const writable=canWrite(user);
 const list=rows.length?<section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} visitas</strong><span>Agenda ordenada por data</span></div></div><div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Imóvel</th><th>Status e feedback</th></tr></thead><tbody>{rows.map(v=><tr key={v.id}><td><strong>{dateFmt.format(v.scheduledAt)}</strong><small>{timeFmt.format(v.scheduledAt)}</small></td><td>{v.client}</td><td>{v.property}<small>{v.code}</small></td><td>{writable?<VisitStatusForm key={`${v.id}:${v.status}:${v.feedback || ""}`} id={v.id} status={v.status} feedback={v.feedback}/>:<><StatusBadge value={v.status}/><small>{v.feedback}</small></>}{v.notes?<small>{v.notes}</small>:null}</td></tr>)}</tbody></table></div></section>:<EmptyState icon={CalendarDays} title="Nenhuma visita agendada" description="Agende uma visita para acompanhar o cliente."/>;
 const grouped=new Map<string,typeof rows>();for(const row of rows){const key=dateFmt.format(row.scheduledAt);grouped.set(key,[...(grouped.get(key)||[]),row]);}const calendar=rows.length?<div className="visit-calendar">{[...grouped].map(([date,items])=><section key={date}><header><CalendarDays/><strong>{date}</strong></header>{items.map(v=><article key={v.id}><time>{timeFmt.format(v.scheduledAt)}</time><div><strong>{v.client}</strong><span>{v.property}</span></div><StatusBadge value={v.status}/></article>)}</section>)}</div>:<EmptyState icon={CalendarDays} title="Calendário vazio" description="As visitas agendadas aparecerão organizadas por dia."/>;
 return <div className="admin-content"><PageHeader eyebrow="Agenda" title="Visitas" description="Agende, acompanhe e registre o resultado de cada visita." action={writable?<AdminDrawerComposer label="Agendar visita" title="Nova visita" description="Vincule cliente, imóvel e oportunidade." showPlus><VisitForm clients={clientChoices} properties={propertyChoices} deals={dealChoices}/></AdminDrawerComposer>:undefined}/><nav aria-label="Período das visitas" className="page-header-action-group"><Link href="?view=upcoming" aria-current={view==="upcoming"?"page":undefined}>Próximas</Link><Link href="?view=history" aria-current={view==="history"?"page":undefined}>Histórico e pendentes anteriores</Link><Link href="?view=all" aria-current={view==="all"?"page":undefined}>Todas</Link></nav><AdminTabs tabs={[{id:"lista",label:"Lista",content:list},{id:"calendario",label:"Calendário",content:calendar}]}/><nav aria-label="Paginação das visitas" className="page-header-action-group">{page>1?<Link href={`?view=${view}&page=${page-1}`}>Anterior</Link>:null}<span>Página {page}</span>{hasNext?<Link href={`?view=${view}&page=${page+1}`}>Próxima</Link>:null}</nav></div>;
}
