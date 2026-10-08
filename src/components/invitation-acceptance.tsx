"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(form: FormData) {
    setState("loading");
    setMessage("");
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setState("error");
      setMessage("As senhas não coincidem.");
      return;
    }
    try {
      const response = await fetch("/api/invites/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) {
        setState("error");
        setMessage(data.error || "Não foi possível aceitar o convite.");
        return;
      }
      router.replace(`/empresa/${data.tenantSlug}/painel/login?convite=aceito`);
    } catch {
      setState("error");
      setMessage("Não foi possível confirmar o convite agora.");
    }
  }
  return <form action={submit} className="login-form">
    <div className="login-form-heading"><CheckCircle2 aria-hidden="true"/><span className="eyebrow">Ativação segura</span><h1>Crie sua senha</h1><p>Conclua o convite para acessar a empresa.</p></div>
    <label>Senha<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label>
    <label>Confirmar senha<input name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label>
    {state === "error" ? <p className="form-error" role="alert">{message}</p> : null}
    <button className="button" disabled={state === "loading"}>{state === "loading" ? <><Loader2 className="spin"/> Ativando…</> : "Ativar acesso"}</button>
  </form>;
}
