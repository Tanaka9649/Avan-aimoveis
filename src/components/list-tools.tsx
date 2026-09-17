"use client";
import { useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronDown, Search } from "lucide-react";
import "./crm-filters.css";
import { pageHref, type Query } from "@/lib/list-query";
export function ListFilters({
  scope,
  userId,
  query,
  children,
}: {
  scope: string;
  userId: string;
  query: Query;
  children?: React.ReactNode;
}) {
  const crm = scope === "crm";
  const [saved, setSaved] = useState<{ name: string; query: string }[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const key = `avanca:filters:v1:${userId}:${scope}`;
  function load() {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      setSaved(
        Array.isArray(rows)
          ? rows
              .filter(
                (x) =>
                  typeof x.name === "string" &&
                  typeof x.query === "string" &&
                  x.query.startsWith("?"),
              )
              .slice(0, 20)
          : [],
      );
    } catch {
      setMessage("Não foi possível ler os filtros salvos.");
    }
  }
  function save() {
    if (!name.trim()) return;
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (typeof v === "string" && k !== "page") qs.set(k, v);
    });
    try {
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [
        { name: name.trim().slice(0, 60), query: "?" + qs.toString() },
        ...(Array.isArray(rows) ? rows : []).filter(
          (x) => x.name !== name.trim(),
        ),
      ].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(next));
      setSaved(next);
      setName("");
      setMessage("Filtro salvo neste navegador.");
    } catch {
      setMessage("O navegador não permitiu salvar o filtro.");
    }
  }
  const actions = (
    <>
      <button type="submit" className="admin-button primary">
        Filtrar
      </button>
      <Link
        className={"admin-button secondary" + (crm ? " crm-filter-clear" : "")}
        href={`/painel/${scope}`}
      >
        Limpar
      </Link>
    </>
  );
  return (
    <section
      className={"list-tools" + (crm ? " crm-list-tools" : "")}
      aria-label={crm ? "Pesquisa e filtros do CRM" : undefined}
    >
      <form
        method="get"
        className="filter-row"
        role={crm ? "search" : undefined}
        aria-label={crm ? "Buscar oportunidades" : undefined}
      >
        <label className={crm ? "crm-search-field" : undefined}>
          <span className={crm ? "crm-visually-hidden" : undefined}>
            Buscar
          </span>
          {crm ? <Search size={18} aria-hidden="true" /> : null}
          <input
            key={crm ? String(query.q || "") : undefined}
            name="q"
            defaultValue={String(query.q || "")}
            placeholder={
              crm ? "Buscar cliente ou oportunidade" : "Nome, código ou contato"
            }
          />
        </label>
        {children}
        {crm ? <div className="crm-filter-actions">{actions}</div> : actions}
      </form>
      <details
        className={crm ? "crm-saved-filters" : undefined}
        onToggle={(e) => {
          if (e.currentTarget.open) load();
        }}
      >
        <summary>
          {crm ? <Bookmark size={14} aria-hidden="true" /> : null}Filtros salvos
          {crm ? (
            <ChevronDown
              className="crm-saved-chevron"
              size={14}
              aria-hidden="true"
            />
          ) : null}
        </summary>
        <div className="filter-row">
          <label>
            Nome do filtro
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </label>
          <button
            type="button"
            className="admin-button secondary"
            onClick={save}
          >
            Salvar filtros atuais
          </button>
          {saved.map((s, i) => (
            <Link className="text-action" key={i} href={s.query}>
              {s.name}
            </Link>
          ))}
        </div>
        {message ? <p role="status">{message}</p> : null}
      </details>
    </section>
  );
}
export function Pagination({
  query,
  page,
  total,
  size = 20,
}: {
  query: Query;
  page: number;
  total: number;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className="pagination" aria-label="Paginação">
      <span>
        {total} registros · Página {page} de {pages}
      </span>
      {page > 1 ? (
        <Link
          className="admin-button secondary"
          href={pageHref(query, page - 1)}
        >
          Anterior
        </Link>
      ) : null}
      {page < pages ? (
        <Link
          className="admin-button secondary"
          href={pageHref(query, page + 1)}
        >
          Próxima
        </Link>
      ) : null}
    </nav>
  );
}
