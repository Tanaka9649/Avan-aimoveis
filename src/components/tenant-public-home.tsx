import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Home, MapPin, MessageCircle, Search, ShieldCheck, Trees } from "lucide-react";
import type { PublicPropertyCard } from "@/data/properties";
import { PropertyCard } from "@/components/property-card";
import { NEUTRAL_BLUR, PHOTO_SIZES, photoUrl } from "@/lib/photos";

type Props = {
  tenant: { slug: string; name: string; whatsapp: string | null };
  properties: PublicPropertyCard[];
  basePath?: string;
};

export function TenantPublicHome({ tenant, properties, basePath = "" }: Props) {
  const hero = properties[0];
  const portfolio = `${basePath}/imoveis`;
  return (
    <>
      <section className="modern-hero">
        <div className="modern-hero-photo">
          <Image src={hero?.cover ? photoUrl(hero.cover.id, "medium") : "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=2000&q=88"} alt={hero?.title || "Imóvel contemporâneo"} fill priority sizes={PHOTO_SIZES.hero} placeholder="blur" blurDataURL={hero?.cover?.blur || NEUTRAL_BLUR} unoptimized={Boolean(hero?.cover)} />
          <div />
        </div>
        <div className="shell modern-hero-content">
          <span>{tenant.name}</span>
          <h1>Encontre o imóvel certo para você.</h1>
          <p>Busca simples, informações claras e acompanhamento próximo para avançar com segurança.</p>
          <form action={portfolio} className="modern-search">
            <label><MapPin/><input name="q" placeholder="Bairro, cidade ou código" aria-label="Localização ou código"/></label>
            <select name="type" aria-label="Tipo de imóvel"><option value="">Todos os tipos</option><option>Casa</option><option>Apartamento</option><option>Cobertura</option><option>Studio</option></select>
            <button><Search/> Buscar imóveis</button>
          </form>
        </div>
      </section>
      <section className="section shell modern-section">
        <div className="modern-heading"><div><span>Seleção</span><h2>Imóveis em destaque</h2><p>Opções que merecem entrar na sua busca.</p></div><Link href={portfolio}>Ver todo o portfólio <ArrowRight/></Link></div>
        {properties.length ? (
          <div className="property-grid modern-property-grid">{properties.slice(0, 3).map((property, index) => <PropertyCard property={property} key={property.id} priority={index === 0} basePath={basePath} tenantKey={tenant.slug} />)}</div>
        ) : (
          <div className="public-empty"><Building2/><h3>Novos imóveis chegando</h3><p>O portfólio está sendo preparado. Fale com nossa equipe para uma busca personalizada.</p></div>
        )}
      </section>
      <section className="section shell modern-section">
        <div className="modern-heading"><div><span>Encontre do seu jeito</span><h2>Comece pelo tipo de imóvel</h2></div></div>
        <div className="modern-categories">
          <Link href={`${portfolio}?type=Casa`}><Home/><strong>Casas</strong><span>Espaço, privacidade e liberdade</span></Link>
          <Link href={`${portfolio}?type=Apartamento`}><Building2/><strong>Apartamentos</strong><span>Praticidade para a rotina</span></Link>
          <Link href={`${portfolio}?type=Terreno`}><Trees/><strong>Terrenos</strong><span>Para construir novos planos</span></Link>
          <Link href={portfolio}><ArrowRight/><strong>Outros tipos</strong><span>Explore todo o portfólio</span></Link>
        </div>
      </section>
      {properties.length > 3 ? (
        <section className="section recent-strip"><div className="shell"><div className="modern-heading"><div><span>Acabaram de chegar</span><h2>Imóveis recentes</h2></div></div><div className="property-grid">{properties.slice(3, 6).map((property) => <PropertyCard property={property} key={property.id} basePath={basePath} tenantKey={tenant.slug} />)}</div></div></section>
      ) : null}
      <section className="section shell why-avanca">
        <div><span>Por que escolher nossa equipe</span><h2>Uma jornada imobiliária mais clara.</h2><p>Da primeira conversa até a decisão, você sabe o que está acontecendo e qual é o próximo passo.</p><Link className="button" href={`${basePath}/sobre`}>Conheça nossa história</Link></div>
        <div><article><ShieldCheck/><h3>Informação clara</h3><p>Dados organizados e comunicação sem complicação.</p></article><article><CheckCircle2/><h3>Atendimento próximo</h3><p>Entendemos suas prioridades antes de apresentar opções.</p></article><article><Building2/><h3>Curadoria de imóveis</h3><p>Opções selecionadas para aproximar sua busca do que faz sentido para você.</p></article></div>
      </section>
      <section className="final-cta"><div className="shell"><div><span>Vamos conversar?</span><h2>Encontrou algo interessante?</h2><p>Nossa equipe ajuda você a entender os detalhes e organizar a próxima visita.</p></div><div><Link className="button button-accent" href={portfolio}>Ver imóveis</Link>{tenant.whatsapp ? <a className="button button-outline-light" href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle/> Falar pelo WhatsApp</a> : null}</div></div></section>
    </>
  );
}
