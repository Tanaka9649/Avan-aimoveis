"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Challenge = { type: string; domain: string; value: string };

export function DomainVerificationButton() {
  const router = useRouter();
  const [state, setState] = useState<{ loading: boolean; message: string; challenges: Challenge[] }>({ loading: false, message: "", challenges: [] });

  const verify = async () => {
    setState({ loading: true, message: "", challenges: [] });
    try {
      const response = await fetch("/api/tenant/domain/verify", { method: "POST" });
      const data = await response.json();
      setState({
        loading: false,
        message: response.ok ? (data.status === "active" ? "Domínio verificado e ativo." : "Aguardando os registros DNS abaixo.") : data.error || "Falha na verificação.",
        challenges: Array.isArray(data.verification) ? data.verification : [],
      });
      if (response.ok) router.refresh();
    } catch {
      setState({ loading: false, message: "Não foi possível verificar agora.", challenges: [] });
    }
  };

  const remove = async () => {
    if (!window.confirm("Remover este domínio do projeto e voltar ao endereço padrão da empresa?")) return;
    setState({ loading: true, message: "", challenges: [] });
    try {
      const response = await fetch("/api/tenant/domain/verify", { method: "DELETE" });
      const data = await response.json();
      setState({ loading: false, message: response.ok ? "Domínio removido com segurança." : data.error || "Falha ao remover.", challenges: [] });
      if (response.ok) router.refresh();
    } catch {
      setState({ loading: false, message: "Não foi possível remover agora.", challenges: [] });
    }
  };

  return (
    <div className="domain-verification">
      <div>
        <button type="button" className="admin-secondary" onClick={verify} disabled={state.loading}>{state.loading ? "Processando…" : "Cadastrar e verificar na Vercel"}</button>
        <button type="button" className="admin-secondary" onClick={remove} disabled={state.loading}>Remover domínio</button>
      </div>
      {state.message ? <p role="status">{state.message}</p> : null}
      {state.challenges.length ? <ul>{state.challenges.map((challenge) => <li key={`${challenge.type}:${challenge.domain}`}><strong>{challenge.type}</strong> {challenge.domain}: <code>{challenge.value}</code></li>)}</ul> : null}
    </div>
  );
}
