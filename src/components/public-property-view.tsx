import Link from "next/link";
import { Bath, BedDouble, Car, DoorOpen, MapPin, Ruler } from "lucide-react";
import type { PublicPropertyCard, PublicPropertyDetail } from "@/data/properties";
import { formatArea, formatMoney } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { publicPropertyUrl, sharePropertyMessage } from "@/lib/property-publication";
import { brand, siteUrl } from "@/lib/brand";
import { LeadForm } from "./lead-form";
import { PropertyCard } from "./property-card";
import { PropertyEvents } from "./property-events";
import { PropertyGallery } from "./property-gallery";

export function PublicPropertyView({ property, similar }: { property: PublicPropertyDetail; similar: PublicPropertyCard[] }) {
  const message = sharePropertyMessage(property);
  const region = `${property.neighborhood}, ${property.city} — ${property.state}`;
  const specs = [
    { icon: BedDouble, value: property.bedrooms, label: property.bedrooms === 1 ? "quarto" : "quartos", show: property.bedrooms > 0 },
    { icon: DoorOpen, value: property.suites, label: property.suites === 1 ? "suíte" : "suítes", show: property.suites > 0 },
    { icon: Bath, value: property.bathrooms, label: property.bathrooms === 1 ? "banheiro" : "banheiros", show: property.bathrooms > 0 },
    { icon: Car, value: property.parkingSpaces, label: property.parkingSpaces === 1 ? "vaga" : "vagas", show: property.parkingSpaces > 0 },
  ].filter((spec) => spec.show);

  // Structured data mirrors only what the page already shows in public — no address, no coordinates.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description.slice(0, 500),
    url: publicPropertyUrl(property.slug),
    sku: property.code,
    datePosted: property.publishedAt,
    ...(property.gallery.length ? { image: property.gallery.slice(0, 6).map((photo) => siteUrl(photoUrl(photo.id, "medium"))) } : {}),
    offers: { "@type": "Offer", price: (property.priceCents / 100).toFixed(2), priceCurrency: "BRL", availability: "https://schema.org/InStock", url: publicPropertyUrl(property.slug) },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    ...(property.area > 0 ? { floorSize: { "@type": "QuantitativeValue", value: property.area, unitCode: "MTK" } } : {}),
    address: { "@type": "PostalAddress", addressLocality: property.city, addressRegion: property.state, addressCountry: "BR", ...(property.neighborhood ? { addressNeighborhood: property.neighborhood } : {}) },
  };

  return <>
    <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="detail-top shell">
      <Link href="/imoveis">← Todos os imóveis</Link>
      <div className="detail-title">
        <div>
          <span className="eyebrow">{property.type} · {property.code}</span>
          <h1>{property.title}</h1>
          <p><MapPin aria-hidden="true" /> {region}</p>
        </div>
      </div>
    </section>
    <section className="gallery-section shell">
      <PropertyGallery photos={property.gallery} title={property.title} />
    </section>
    <section className="detail-layout shell">
      <article>
        <div className="detail-price">
          <span>Valor do imóvel</span>
          <strong>{formatMoney(property.priceCents)}</strong>
        </div>
        <div className="spec-grid">
          {specs.map((spec) => (
            <div key={spec.label}><spec.icon aria-hidden="true" /><strong>{spec.value}</strong><span>{spec.label}</span></div>
          ))}
          {property.area > 0 ? <div><Ruler aria-hidden="true" /><strong>{formatArea(property.area)}</strong><span>área privativa</span></div> : null}
        </div>
        <div className="prose">
          <h2>Sobre este imóvel</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{property.description}</p>
          {property.features.length ? <>
            <h2>Características e diferenciais</h2>
            <ul>{property.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </> : null}
          <h2>A região</h2>
          <p>
            Este imóvel fica em {property.neighborhood}, {property.city}/{property.state}. Por privacidade do proprietário,
            o endereço completo é informado apenas no agendamento da visita — fale com a equipe para conhecer as
            proximidades, o acesso e a vizinhança.
          </p>
        </div>
      </article>
      <aside>
        <PropertyEvents propertyId={property.id} whatsapp={brand.whatsapp} message={message} />
        <LeadForm propertyId={property.id} propertyTitle={property.title} />
      </aside>
    </section>
    {similar.length ? (
      <section className="section shell similar-properties">
        <div className="modern-heading"><div><span>Talvez combine com você</span><h2>Imóveis semelhantes</h2></div><Link href="/imoveis">Ver todo o portfólio →</Link></div>
        <div className="property-grid">{similar.map((item) => <PropertyCard property={item} key={item.id} />)}</div>
      </section>
    ) : null}
  </>;
}

