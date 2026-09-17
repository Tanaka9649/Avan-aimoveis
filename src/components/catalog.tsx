"use client";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { properties } from "@/data/properties";
import { PropertyCard } from "./property-card";

export function Catalog() {
  const [query, setQuery] = useState(""); const [type, setType] = useState(""); const [bedrooms, setBedrooms] = useState(""); const [sort, setSort] = useState("recentes");
  const list = useMemo(() => properties.filter((p) => (!query || `${p.title} ${p.neighborhood} ${p.city}`.toLowerCase().includes(query.toLowerCase())) && (!type || p.type === type) && (!bedrooms || p.bedrooms >= Number(bedrooms))).sort((a,b) => sort === "menor" ? a.priceCents-b.priceCents : sort === "maior" ? b.priceCents-a.priceCents : a.code.localeCompare(b.code)), [query,type,bedrooms,sort]);
  const clear = () => { setQuery(""); setType(""); setBedrooms(""); setSort("recentes"); };
  return <><div className="catalog-toolbar"><label className="search-field"><Search/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cidade, bairro ou palavra-chave" aria-label="Buscar imóvel"/></label><label><span>Tipo</span><select value={type} onChange={(e)=>setType(e.target.value)}><option value="">Todos</option><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Studio</option></select></label><label><span>Quartos</span><select value={bedrooms} onChange={(e)=>setBedrooms(e.target.value)}><option value="">Qualquer</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label><button className="filter-button"><SlidersHorizontal/> Mais filtros</button></div><div className="catalog-meta"><p><strong>{list.length}</strong> imóveis encontrados</p><label>Ordenar por <select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="recentes">Mais recentes</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option></select></label></div>{list.length ? <div className="property-grid">{list.map((p)=><PropertyCard property={p} key={p.id}/>)}</div> : <div className="empty-state"><Search/><h2>Nenhum imóvel encontrado</h2><p>Ajuste os filtros ou limpe a busca para ver todas as opções.</p><button className="button button-dark" onClick={clear}><X/> Limpar filtros</button></div>}</>;
}
