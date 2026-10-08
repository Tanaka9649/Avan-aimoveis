import { notFound } from "next/navigation";
import { z } from "zod";
import { InvitationAcceptance } from "@/components/invitation-acceptance";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!z.string().min(20).max(200).safeParse(token).success) notFound();
  return <section className="login-page"><div className="login-panel"><InvitationAcceptance token={token}/></div></section>;
}
