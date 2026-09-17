"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useState } from "react";

type Column = { id: string; name: string; color: string };
type Card = { id: string; title: string; client: string; stageId: string; value: string; tags: string[]; nextActionAt: string | null };

export function CrmBoard({ columns, cards }: { columns: Column[]; cards: Card[] }) {
  const [selectedStage, setSelectedStage] = useState(columns[0]?.id ?? "");
  return <>
    <label className="crm-stage-picker">Etapa<select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.name} ({cards.filter((card) => card.stageId === column.id).length})</option>)}</select></label>
    <div className="kanban">
      {columns.map((column) => {
        const items = cards.filter((card) => card.stageId === column.id);
        return <section className={`kanban-column${selectedStage !== column.id ? " is-mobile-hidden" : ""}`} key={column.id}>
          <header><div><i style={{ background: column.color }} /><strong>{column.name}</strong></div><span>{items.length}</span></header>
          <div className="kanban-stack">
            {items.map((card) => <Link className="deal-card" href={`/painel/crm/${card.id}`} key={card.id}>
              <div className="deal-card-top">{card.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <h3>{card.client}</h3><p>{card.title}</p><strong>{card.value}</strong>
              <small><CalendarClock />{card.nextActionAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(card.nextActionAt)) : "Sem próxima atividade"}</small>
            </Link>)}
            {items.length === 0 ? <p className="column-empty">Nenhum negócio nesta etapa</p> : null}
          </div>
        </section>;
      })}
    </div>
  </>;
}
