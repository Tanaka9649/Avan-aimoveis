import { AdminShell } from "@/components/admin-shell";
import { requireUser } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){const user=await requireUser();return <AdminShell user={user}>{children}</AdminShell>}
