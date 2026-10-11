import { notFound } from "next/navigation";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";
import { PrivacyNotice } from "@/components/privacy-notice";
export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) { const { tenantSlug } = await params; const result = await tenantBySlug(tenantSlug); if (!result || !tenantOperational(result.tenant.status)) notFound(); return <PrivacyNotice tenant={result.tenant}/>; }
