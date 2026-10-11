import { PasswordForm } from "@/components/password-form";
export const metadata = { title: "Definir nova senha", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
 const { empresa } = await searchParams;
 return <main className="shell section"><h1>Definir nova senha</h1><PasswordForm mode="reset" tenantSlug={empresa}/></main>;
}
