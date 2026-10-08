import { Suspense } from "react";
import { TenantPublicHome } from "@/components/tenant-public-home";
import { publicPropertyCards } from "@/lib/public-properties";
import { rootTenant } from "@/lib/tenant";
import { PublicLoading } from "@/components/public-loading";
import { PublicError } from "@/components/public-error";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Suspense fallback={<PublicLoading/>}><HomeContent/></Suspense>;
}

async function HomeContent() {
  const tenant = await rootTenant();
  if (!tenant) return <PublicError/>;
  try {
    const properties = await publicPropertyCards(tenant.id, 24);
    return <TenantPublicHome tenant={tenant} properties={properties}/>;
  } catch {
    console.error("public_home_load_failed");
    return <PublicError/>;
  }
}
