import Image from "next/image";
import Link from "next/link";
import { Building2, Check, Copy, Plus, X } from "lucide-react";
import { ListFilters, Pagination } from "@/components/list-tools";
import { value, pageNumber, PAGE_SIZE, type Query } from "@/lib/list-query";
import {
  and,
  count,
  ilike,
  or,
  gte,
  lte,
  desc,
  sql,
  inArray,
} from "drizzle-orm";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import {
  properties,
  propertyPhotos,
  propertyDocuments,
  propertyOwners,
} from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
import { propertyCompleteness } from "@/lib/property-completeness";
import { PropertyAdminActions } from "@/components/property-admin-actions";
import { duplicateProperty } from "./actions";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const user = await requireModule("imoveis");
  const query = await searchParams;
  const page = pageNumber(query);
  const search = value(query, "q");
  const low = Number(value(query, "min"));
  const high = Number(value(query, "max"));
  const where = and(
    search
      ? or(
          ilike(properties.title, `%${search}%`),
          ilike(properties.code, `%${search}%`),
        )
      : undefined,
    value(query, "city")
      ? ilike(properties.city, `%${value(query, "city")}%`)
      : undefined,
    value(query, "neighborhood")
      ? ilike(properties.neighborhood, `%${value(query, "neighborhood")}%`)
      : undefined,
    value(query, "type")
      ? ilike(properties.type, value(query, "type"))
      : undefined,
    value(query, "status")
      ? sql`${properties.status}::text = ${value(query, "status")}`
      : undefined,
    Number.isFinite(low) && low > 0
      ? gte(properties.priceCents, Math.min(2147483647, Math.round(low * 100)))
      : undefined,
    Number.isFinite(high) && high > 0
      ? lte(properties.priceCents, Math.min(2147483647, Math.round(high * 100)))
      : undefined,
  );
  const db = getDb();
  const [total] = await db
    .select({ value: count() })
    .from(properties)
    .where(where);
  const rows = await db
    .select({
      id: properties.id,
      code: properties.code,
      slug: properties.slug,
      title: properties.title,
      type: properties.type,
      status: properties.status,
      city: properties.city,
      neighborhood: properties.neighborhood,
      price: properties.priceCents,
      address: properties.addressPrivate,
      description: properties.description,
      features: properties.features,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      parking: properties.parkingSpaces,
      updatedAt: properties.updatedAt,
    })
    .from(properties)
    .where(where)
    .orderBy(desc(properties.updatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const ids = rows.map((r) => r.id);
  const [photos, documents, ownerLinks] = ids.length
    ? await Promise.all([
        db
          .select({
            id: propertyPhotos.id,
            propertyId: propertyPhotos.propertyId,
            isCover: propertyPhotos.isCover,
          })
          .from(propertyPhotos)
          .where(inArray(propertyPhotos.propertyId, ids)),
        db
          .select({ propertyId: propertyDocuments.propertyId })
          .from(propertyDocuments)
          .where(inArray(propertyDocuments.propertyId, ids)),
        db
          .select({ propertyId: propertyOwners.propertyId })
          .from(propertyOwners)
          .where(inArray(propertyOwners.propertyId, ids)),
      ])
    : [[], [], []];
  return (
    <div className="admin-content">
      <PageHeader
        eyebrow="Portfólio"
        title="Imóveis"
        description="Gerencie o portfólio, a qualidade dos cadastros e a publicação no site."
        action={
          <Link className="admin-button primary" href="/painel/imoveis/novo">
            <Plus /> Novo imóvel
          </Link>
        }
      />
      <ListFilters scope="imoveis" userId={user.id} query={query}>
        <label>
          Status
          <select name="status" defaultValue={value(query, "status")}>
            <option value="">Todos</option>
            {["rascunho", "disponivel", "reservado", "vendido", "pausado"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        {[
          ["city", "Cidade"],
          ["neighborhood", "Bairro"],
          ["type", "Tipo"],
          ["min", "Preço mínimo (R$)"],
          ["max", "Preço máximo (R$)"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input name={key} defaultValue={value(query, key)} />
          </label>
        ))}
      </ListFilters>
      {rows.length ? (
        <section className="property-admin-grid">
          {rows.map((p) => {
            const media = photos.filter((x) => x.propertyId === p.id);
            const cover = media.find((x) => x.isCover) || media[0];
            const complete = propertyCompleteness({
              title: p.title,
              priceCents: p.price,
              address: p.address,
              neighborhood: p.neighborhood,
              description: p.description,
              features: p.features,
              ownerCount: ownerLinks.filter((x) => x.propertyId === p.id)
                .length,
              photoCount: media.length,
              documentCount: documents.filter((x) => x.propertyId === p.id)
                .length,
            });
            return (
              <article className="admin-property-card" key={p.id}>
                <Link
                  className="admin-property-photo"
                  href={`/painel/imoveis/${p.id}`}
                >
                  {cover ? (
                    <Image
                      src={`/api/property-photos/${cover.id}`}
                      alt={p.title}
                      fill
                      sizes="320px"
                      unoptimized
                    />
                  ) : (
                    <Building2 />
                  )}
                  <StatusBadge value={p.status} />
                </Link>
                <div className="admin-property-body">
                  <small>
                    {p.code} · {p.type}
                  </small>
                  <h2>
                    <Link href={`/painel/imoveis/${p.id}`}>{p.title}</Link>
                  </h2>
                  <p>
                    {p.neighborhood} · {p.city}
                  </p>
                  <strong>{formatMoney(p.price)}</strong>
                  <div className="admin-property-specs">
                    <span>{p.bedrooms} quartos</span>
                    <span>{p.bathrooms} banheiros</span>
                    <span>{p.parking} vagas</span>
                  </div>
                  <details className="completeness">
                    <summary>
                      <span>
                        <i style={{ width: `${complete.percent}%` }} />
                      </span>
                      <b>Cadastro {complete.percent}% completo</b>
                    </summary>
                    <ul>
                      {complete.checks.map((item) => (
                        <li key={item.label}>
                          {item.done ? <Check /> : <X />}
                          {item.label}
                        </li>
                      ))}
                      <li>
                        {complete.optionalDocuments ? (
                          <Check />
                        ) : (
                          <span>○</span>
                        )}
                        Documentos (opcional)
                      </li>
                    </ul>
                  </details>
                  <footer>
                    <Link
                      className="admin-button secondary"
                      href={`/painel/imoveis/${p.id}`}
                    >
                      Editar
                    </Link>
                    <form action={duplicateProperty}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="row-menu-button">
                        <Copy /> Duplicar
                      </button>
                    </form>
                    <PropertyAdminActions
                      id={p.id}
                      title={p.title}
                      slug={p.slug}
                      price={formatMoney(p.price)}
                      region={`${p.neighborhood}, ${p.city}`}
                      published={p.status === "disponivel"}
                    />
                  </footer>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={Building2}
          title="Nenhum imóvel cadastrado"
          description="Cadastre o primeiro imóvel para iniciar seu portfólio."
          action={
            <Link className="admin-button primary" href="/painel/imoveis/novo">
              <Plus /> Novo imóvel
            </Link>
          }
        />
      )}
      <Pagination query={query} page={page} total={total.value} />
    </div>
  );
}
