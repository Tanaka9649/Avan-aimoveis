"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { readFavorites } from "@/lib/favorites";
import { PublicEmptyState } from "./public-empty-state";
import type { PublicPropertyCard } from "@/data/properties";
import { PropertyCard } from "@/components/property-card";
export function FavoritesList({ properties }: { properties: PublicPropertyCard[] }){const[ids,setIds]=useState<string[]>([]);useEffect(()=>{const load=()=>setIds(readFavorites());load();window.addEventListener("favorites:changed",load);return()=>window.removeEventListener("favorites:changed",load)},[]);const list=properties.filter((p)=>ids.includes(p.id));return <section className="section page-top shell"><div className="catalog-title"><span className="eyebrow">Sua seleção</span><h1>Imóveis favoritos</h1><p>Salvos somente neste navegador.</p></div>{list.length?<div className="property-grid">{list.map((p,index)=><PropertyCard property={p} key={p.id} priority={index<3}/>)}</div>:<PublicEmptyState title="Sua lista ainda está vazia" description="Use o coração nos imóveis para reuni-los aqui."><Link className="button button-dark" href="/imoveis">Explorar imóveis</Link></PublicEmptyState>}</section>}
