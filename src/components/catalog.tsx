"use client";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicPropertyCard } from "@/data/properties";
import { PropertyCard } from "./property-card";
import { PublicEmptyState } from "./public-empty-state";

type Filters = { q: string; type: string; city: string; neighborhood: string; bedrooms: string; max: string };
const EMPTY: Filters = { q: "", type: "", city: "", neighborhood: "", bedrooms: "", max: "" };

/**
 * Catalogue filters run over the published listings the server already sent, so a property
 * published a minute ago is filterable the moment it appears — there is no second catalogue
 * and no index to rebuild.
 */
export function Catalog({ properties, initial = {} }: { properties: PublicPropertyCard[]; initial?: Partial<Filters> }) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...initial });
  const [sort, setSort] = useState("recentes");
  const set = (key: keyof Filters) => (event: { target: { value: string } }) => setFilters((old) => ({ ...old, [key]: event.target.value }));

  const cities = useMemo(() => [...new Set(properties.map((property) => property.city))].sort((a, b) => a.localeCompare(b, "pt-BR")), [properties]);
  const neighborhoods = useMemo(
    () => [...new Set(properties.filter((property) => !filters.city || property.city === filters.city).map((property) => property.neighborhood))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [properties, filters.city],
  );

  const list = useMemo(() => {
    const term = filters.q.trim().toLocaleLowerCase("pt-BR");
    const ceiling = Number(filters.max.replace(/\D/g, "")) * 100;
    return properties
      .filter((property) =>
        (!term || `${property.title} ${property.neighborhood} ${property.city} ${property.code}`.toLocaleLowerCase("pt-BR").includes(term)) &&
        (!filters.type || property.type === filters.type) &&
        (!filters.city || property.city === filters.city) &&
        (!filters.neighborhood || property.neighborhood === filters.neighborhood) &&
        (!filters.bedrooms || property.bedrooms >= Number(filters.bedrooms)) &&
        (!ceiling || property.priceCents <= ceiling))
      .sort((a, b) => (sort === "menor" ? a.priceCents - b.priceCents : sort === "maior" ? b.priceCents - a.priceCents : 0));
  }, [properties, filters, sort]);

  return (
    <>
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search />
          <input value={filters.q} onChange={set("q")} placeholder="Cidade, bairro, código ou palavra-chave" aria-label="Buscar imóvel" />
        </label>
        <label>
          <span>Tipo</span>
          <select value={filters.type} onChange={set("type")}>
            <option value="">Todos</option>
            {[...new Set(["Apartamento", "Casa", "Cobertura", "Studio", "Terreno", ...properties.map(p => p.type)])].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span>Cidade</span>
          <select value={filters.city} onChange={(event) => setFilters((old) => ({ ...old, city: event.target.value, neighborhood: "" }))}>
            <option value="">Todas</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label>
          <span>Bairro</span>
          <select value={filters.neighborhood} onChange={set("neighborhood")}>
            <option value="">Todos</option>
            {neighborhoods.map((neighborhood) => <option key={neighborhood}>{neighborhood}</option>)}
          </select>
        </label>
        <label>
          <span>Quartos</span>
          <select value={filters.bedrooms} onChange={set("bedrooms")}>
            <option value="">Qualquer</option>
            {["1", "2", "3", "4"].map((value) => <option key={value} value={value}>{value}+</option>)}
          </select>
        </label>
        <label>
          <span>Até R$</span>
          <input value={filters.max} onChange={set("max")} inputMode="numeric" placeholder="Sem limite" aria-label="Preço máximo" />
        </label>
      </div>
      <div className="catalog-meta">
        <p role="status" aria-live="polite"><strong>{list.length}</strong> {list.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}</p>
        {Object.values(filters).some(Boolean) ? <button className="catalog-clear" onClick={() => { setFilters(EMPTY); setSort("recentes"); }}>Limpar filtros</button> : null}
        <label>
          Ordenar por
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
        </label>
      </div>
      {list.length ? (
        <div className="property-grid">{list.map((property, index) => <PropertyCard property={property} key={property.id} priority={index < 3} />)}</div>
      ) : (
        <PublicEmptyState title="Nenhum imóvel encontrado" description="Tente ajustar os filtros para visualizar outras opções.">
          <button className="button button-dark" onClick={() => { setFilters(EMPTY); setSort("recentes"); }}><X /> Limpar filtros</button>
        </PublicEmptyState>
      )}
    </>
  );
}
