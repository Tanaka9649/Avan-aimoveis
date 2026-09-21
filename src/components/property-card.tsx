"use client";
import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Building2, Car, Heart, MapPin, MoveUpRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { PublicPropertyCard } from "@/data/properties";
import { formatArea, formatMoney } from "@/lib/format";
import { PHOTO_SIZES } from "@/lib/photos";
import { publicPropertyPath } from "@/lib/property-publication";
import { readFavorites } from "@/lib/favorites";

const FAVORITES_KEY = "avan:favorites";

/**
 * Catalogue card. It renders the cover thumbnail only — never the gallery — and paints the stored
 * blur while that thumbnail decodes, so the grid never reflows. `priority` is reserved for the
 * cards that are above the fold; everything else loads lazily.
 */
export function PropertyCard({ property, priority = false }: { property: PublicPropertyCard; priority?: boolean }) {
  const saved = useSyncExternalStore(
    (callback) => { window.addEventListener("favorites:changed", callback); return () => window.removeEventListener("favorites:changed", callback); },
    () => readFavorites().includes(property.id),
    () => false,
  );
  const toggle = () => {
    const current = readFavorites();
    const next = current.includes(property.id) ? current.filter((id) => id !== property.id) : [...current, property.id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("favorites:changed"));
  };
  const href = publicPropertyPath(property.slug);
  return (
    <article className="property-card">
      <div className="property-image">
        {property.cover ? (
          <Image
            src={property.cover.url}
            alt={property.cover.alt || `Fachada e ambientes de ${property.title}`}
            fill
            sizes={PHOTO_SIZES.card}
            placeholder="blur"
            blurDataURL={property.cover.blur}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            unoptimized
          />
        ) : (
          <span className="property-image-empty"><Building2 aria-hidden="true" /></span>
        )}
        <button className={`favorite ${saved ? "saved" : ""}`} onClick={toggle} aria-label={saved ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="property-code">{property.code}</span>
      </div>
      <div className="property-card-body">
        <div className="eyebrow"><MapPin size={14} />{property.neighborhood} · {property.city}</div>
        <h3><Link href={href}>{property.title}</Link></h3>
        <div className="property-specs">
          <span><BedDouble /> {property.bedrooms}</span>
          <span><Bath /> {property.bathrooms}</span>
          <span><Car /> {property.parkingSpaces}</span>
          {property.area > 0 ? <span>{formatArea(property.area)}</span> : null}
        </div>
        <div className="property-price">
          <strong>{formatMoney(property.priceCents)}</strong>
          <Link href={href} aria-label={`Ver ${property.title}`}><MoveUpRight /></Link>
        </div>
      </div>
    </article>
  );
}
