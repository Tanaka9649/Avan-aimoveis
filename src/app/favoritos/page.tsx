import { FavoritesList } from "@/components/favorites-list";
import { publicProperties } from "@/lib/public-properties";
export const dynamic = "force-dynamic";
export default async function FavoritesPage() {
  return <FavoritesList properties={await publicProperties()}/>;
}
