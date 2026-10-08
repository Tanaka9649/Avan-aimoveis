import { notFound, redirect } from "next/navigation";
import { FavoritesList } from "@/components/favorites-list";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function TenantFavoritesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}/favoritos`);
  const tenant = resolution.tenant;
  if (!tenantOperational(tenant.status)) notFound();
  const basePath = `/empresa/${tenant.slug}`;
  return <FavoritesList properties={await publicPropertyCards(tenant.id)} basePath={basePath} tenantKey={tenant.slug}/>;
}
