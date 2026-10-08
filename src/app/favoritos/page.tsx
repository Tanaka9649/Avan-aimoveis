import { FavoritesList } from "@/components/favorites-list";
import { publicPropertyCards } from "@/lib/public-properties";
import { rootTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function FavoritesPage() {
  const tenant=await rootTenant();if(!tenant)notFound();return <FavoritesList properties={await publicPropertyCards(tenant.id)}/>;
}
