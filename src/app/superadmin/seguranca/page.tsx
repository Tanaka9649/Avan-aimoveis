import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userMfa } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { MfaSettings } from "@/components/mfa-settings";
import { PageHeader } from "@/components/admin-ui";
export default async function Page(){
 const user=await requireSuperAdmin();
 const [row]=await getDb().select({enabledAt:userMfa.enabledAt}).from(userMfa).where(eq(userMfa.userId,user.id));
 return <div className="admin-content"><PageHeader title="Segurança da conta" description="Proteção adicional, sem redefinir sua senha."/><MfaSettings enabled={Boolean(row?.enabledAt)} configured={Boolean(process.env.MFA_ENCRYPTION_KEY)}/></div>;
}
