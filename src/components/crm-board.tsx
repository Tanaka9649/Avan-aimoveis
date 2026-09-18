"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, MessageCircle, Phone, X } from "lucide-react";
import { useState } from "react";

type Column = { id: string; name: string; color: string };
type Card = { id: string; title: string; clientId:string;client: string; phone:string;email:string|null;stageId: string; value: string; tags: string[]; nextActionAt: string | null;nextActionType:string|null;nextActionNote:string|null;stageDays:number };

export function CrmBoard({ columns, cards }: { columns: Column[]; cards: Card[] }) {
  const [selectedStage, setSelectedStage] = useState(columns[0]?.id ?? "");
  const [active,setActive]=useState<Card|null>(null);
  return <>
    <label className="crm-stage-picker">Etapa<select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.name} ({cards.filter((card) => card.stageId === column.id).length})</option>)}</select></label>
    <div className="kanban">
      {columns.map((column) => {
        const items = cards.filter((card) => card.stageId === column.id);
        return <section className={`kanban-column${selectedStage !== column.id ? " is-mobile-hidden" : ""}`} key={column.id}>
          <header><div><i style={{ background: column.color }} /><strong>{column.name}</strong></div><span>{items.length}</span></header>
          <div className="kanban-stack">
            {items.map((card) => <button type="button" className="deal-card" onClick={()=>setActive(card)} key={card.id}>
              <div className="deal-card-top">{card.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <h3>{card.client}</h3><p>{card.title}</p><strong>{card.value}</strong>
              <small><CalendarClock />{card.nextActionAt ? `${card.nextActionType||"Próxima ação"} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(card.nextActionAt))}` : "Sem próxima atividade"}</small><em>{card.stageDays} {card.stageDays===1?"dia":"dias"} nesta etapa</em>
            </button>)}
            {items.length === 0 ? <p className="column-empty">Nenhum negócio nesta etapa</p> : null}
          </div>
        </section>;
      })}
    </div>{active?<><button className="drawer-backdrop" aria-label="Fechar ficha" onClick={()=>setActive(null)}/><aside className="crm-drawer"><header><div><small>Ficha rápida</small><h2>{active.client}</h2></div><button onClick={()=>setActive(null)} aria-label="Fechar"><X/></button></header><section><h3>Contato</h3><a href={`tel:${active.phone}`}><Phone/> {active.phone}</a><a href={`https://wa.me/55${active.phone.replace(/\D/g,"")}`} target="_blank"><MessageCircle/> Abrir WhatsApp</a>{active.email?<p>{active.email}</p>:null}</section><section><h3>Oportunidade</h3><strong>{active.title}</strong><p>{active.value}</p>{active.tags.length?<div className="drawer-tags">{active.tags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}</section><section><h3>Próxima ação</h3><p>{active.nextActionType||"Não definida"}</p><p>{active.nextActionNote||"Sem observação."}</p>{active.nextActionAt?<time>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"full",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(active.nextActionAt))}</time>:null}</section><footer><Link className="admin-button secondary" href={`/painel/crm?view=clientes&cliente=${active.clientId}`}>Ficha do cliente <ExternalLink/></Link><Link className="admin-button primary" href={`/painel/crm/${active.id}`}>Editar oportunidade</Link></footer></aside></>:null}
  </>;
}
