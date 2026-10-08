import { notFound, redirect } from "next/navigation";
import { PublicError } from "@/components/public-error";
import { TenantPublicHome } from "@/components/tenant-public-home";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function TenantHomePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}`);
  const tenant = resolution.tenant;
  if (!tenantOperational(tenant.status)) notFound();
  try {
    const properties = await publicPropertyCards(tenant.id, 24);
    return <TenantPublicHome tenant={tenant} properties={properties} basePath={`/empresa/${tenant.slug}`}/>;
  } catch {
    console.error("tenant_public_home_load_failed", { tenantId: tenant.id });
    return <PublicError/>;
  }
}
