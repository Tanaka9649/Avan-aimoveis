import { notFound } from "next/navigation";
import { tenantForRequest } from "@/lib/tenant";
import { PrivacyNotice } from "@/components/privacy-notice";
export default async function Page() { const tenant = await tenantForRequest(); if (!tenant) notFound(); return <PrivacyNotice tenant={tenant}/>; }
