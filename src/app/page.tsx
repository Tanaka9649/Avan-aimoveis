import { Suspense } from "react";
import { TenantPublicHome } from "@/components/tenant-public-home";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantForRequest, tenantPublicPathBase } from "@/lib/tenant";
import { PublicLoading } from "@/components/public-loading";
import { PublicError } from "@/components/public-error";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Suspense fallback={<PublicLoading/>}><HomeContent/></Suspense>;
}

async function HomeContent() {
  const tenant = await tenantForRequest();
  if (!tenant) return <PublicError/>;
  let properties;
  try {
    properties = await publicPropertyCards(tenant.id, 24);
  } catch {
    console.error("public_home_load_failed");
    return <PublicError/>;
  }
  return <TenantPublicHome tenant={tenant} properties={properties} basePath={tenantPublicPathBase(tenant)}/>;
}
