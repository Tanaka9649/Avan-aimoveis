import { PasswordForm } from "@/components/password-form";
export const metadata = { title: "Recuperar acesso", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
 const { empresa } = await searchParams;
 return <main className="shell section"><h1>Recuperar acesso</h1><PasswordForm mode="request" tenantSlug={empresa}/></main>;
}
