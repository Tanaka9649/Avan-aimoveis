"use client";
import { useState } from "react";

type Challenge = { type: string; domain: string; value: string };

export function DomainVerificationButton() {
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
    } catch {
      setState({ loading: false, message: "Não foi possível verificar agora.", challenges: [] });
    }
  };
  return <div className="domain-verification">
    <button type="button" className="admin-secondary" onClick={verify} disabled={state.loading}>{state.loading ? "Verificando…" : "Cadastrar e verificar na Vercel"}</button>
    {state.message ? <p role="status">{state.message}</p> : null}
    {state.challenges.length ? <ul>{state.challenges.map((challenge) => <li key={`${challenge.type}:${challenge.domain}`}><strong>{challenge.type}</strong> {challenge.domain}: <code>{challenge.value}</code></li>)}</ul> : null}
  </div>;
}
