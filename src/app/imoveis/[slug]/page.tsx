import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Bath, BedDouble, Car, DoorOpen, MapPin, Ruler } from "lucide-react";
import { publicProperty, similarProperties } from "@/lib/public-properties";
import { formatArea, formatMoney } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { publicPropertyUrl, sharePropertyMessage } from "@/lib/property-publication";
import { LeadForm } from "@/components/lead-form";
import { PropertyCard } from "@/components/property-card";
import { PropertyEvents } from "@/components/property-events";
import { PropertyGallery } from "@/components/property-gallery";
import { brand, siteUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

/**
 * Only publicly visible properties are ever loaded here, so an unpublished, paused or sold
 * listing answers 404 for both the page and its metadata — nothing about it leaks.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await publicProperty(slug);
  if (!property) return { title: "Imóvel não encontrado", robots: { index: false, follow: false } };
  const description = `${property.type} em ${property.neighborhood}, ${property.city}/${property.state} — ${formatMoney(property.priceCents)}. ${property.description.replace(/\s+/g, " ")}`.slice(0, 160);
  const image = property.gallery[0] ? siteUrl(photoUrl(property.gallery[0].id, "medium")) : undefined;
  const canonical = publicPropertyUrl(property.slug);
  return {
    title: `${property.title} — ${property.neighborhood}, ${property.city}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: brand.name,
      title: `${property.title} — ${formatMoney(property.priceCents)}`,
      description,
      locale: "pt_BR",
      ...(image ? { images: [{ url: image, width: 1280, height: 853, alt: property.title }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: property.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const property = await publicProperty(slug);
  if (!property) notFound();
  const similar = await similarProperties(property);
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
