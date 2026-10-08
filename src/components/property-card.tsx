"use client";
import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Building2, Car, Heart, MapPin, MoveUpRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { PublicPropertyCard } from "@/data/properties";
import { formatArea, formatMoney } from "@/lib/format";
import { PHOTO_SIZES } from "@/lib/photos";
import { publicPropertyPath } from "@/lib/property-publication";
import { favoritesStorageKey, readFavorites } from "@/lib/favorites";

type Props = {
  property: PublicPropertyCard;
  priority?: boolean;
  basePath?: string;
  tenantKey?: string;
};

/**
 * Catalogue card. Only the cover thumbnail is rendered and every browser-side
 * favorite is namespaced by tenant, preventing selections from crossing sites.
 */
export function PropertyCard({ property, priority = false, basePath = "", tenantKey }: Props) {
  const favoriteScope = tenantKey || "avanca-imoveis";
  const eventName = `favorites:changed:${favoriteScope}`;
  const saved = useSyncExternalStore(
    (callback) => {
      window.addEventListener(eventName, callback);
      return () => window.removeEventListener(eventName, callback);
    },
    () => readFavorites(favoriteScope).includes(property.id),
    () => false,
  );
  const toggle = () => {
    const current = readFavorites(favoriteScope);
    const next = current.includes(property.id)
      ? current.filter((id) => id !== property.id)
      : [...current, property.id];
    localStorage.setItem(favoritesStorageKey(favoriteScope), JSON.stringify(next));
    window.dispatchEvent(new Event(eventName));
    if (!saved) {
      const anonymousSessionId = sessionStorage.getItem("avan:anonymous-session") || crypto.randomUUID();
      sessionStorage.setItem("avan:anonymous-session", anonymousSessionId);
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantSlug: favoriteScope, propertyId: property.id, eventType: "favorite_add", anonymousSessionId, path: window.location.pathname }),
        keepalive: true,
      });
    }
  };
  const href = publicPropertyPath(property.slug, basePath);
  return (
    <article className="property-card">
      <div className="property-image">
        <Link href={href} aria-label={`Ver fotos e detalhes de ${property.title}`}>
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
        </Link>
        <button className={`favorite ${saved ? "saved" : ""}`} onClick={toggle} aria-pressed={saved} aria-label={saved ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="property-code">{property.code}</span>
      </div>
      <div className="property-card-body">
        <div className="eyebrow"><MapPin size={14} />{property.neighborhood} · {property.city}</div>
        <h3><Link href={href}>{property.title}</Link></h3>
        <div className="property-specs">
          <span aria-label={`${property.bedrooms} quartos`}><BedDouble aria-hidden="true"/> {property.bedrooms}</span>
          <span aria-label={`${property.bathrooms} banheiros`}><Bath aria-hidden="true"/> {property.bathrooms}</span>
          <span aria-label={`${property.parkingSpaces} vagas`}><Car aria-hidden="true"/> {property.parkingSpaces}</span>
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
