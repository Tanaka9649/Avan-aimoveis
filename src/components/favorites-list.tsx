"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readFavorites } from "@/lib/favorites";
import { PublicEmptyState } from "./public-empty-state";
import type { PublicPropertyCard } from "@/data/properties";
import { PropertyCard } from "@/components/property-card";

type Props = {
  properties: PublicPropertyCard[];
  basePath?: string;
  tenantKey?: string;
};

export function FavoritesList({ properties, basePath = "", tenantKey = "avanca-imoveis" }: Props) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const eventName = `favorites:changed:${tenantKey}`;
    const load = () => setIds(readFavorites(tenantKey));
    load();
    window.addEventListener(eventName, load);
    return () => window.removeEventListener(eventName, load);
  }, [tenantKey]);
  const list = properties.filter((property) => ids.includes(property.id));
  return (
    <section className="section page-top shell">
      <div className="catalog-title"><span className="eyebrow">Sua seleção</span><h1>Imóveis favoritos</h1><p>Salvos somente neste navegador.</p></div>
      {list.length ? (
        <div className="property-grid">{list.map((property, index) => <PropertyCard property={property} key={property.id} priority={index < 3} basePath={basePath} tenantKey={tenantKey} />)}</div>
      ) : (
        <PublicEmptyState title="Sua lista ainda está vazia" description="Use o coração nos imóveis para reuni-los aqui.">
          <Link className="button button-dark" href={`${basePath}/imoveis`}>Explorar imóveis</Link>
        </PublicEmptyState>
      )}
    </section>
  );
}
