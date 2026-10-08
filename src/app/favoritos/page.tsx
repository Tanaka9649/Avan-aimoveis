import { notFound } from "next/navigation";
import { FavoritesList } from "@/components/favorites-list";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantForRequest, tenantPublicPathBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  return <FavoritesList properties={await publicPropertyCards(tenant.id)} basePath={tenantPublicPathBase(tenant)} tenantKey={tenant.slug}/>;
}
