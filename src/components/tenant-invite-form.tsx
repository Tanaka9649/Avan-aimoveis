"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";

type State = { message: string; ok: boolean; inviteUrl?: string };
type Action = (state: State, form: FormData) => Promise<State>;

export function TenantInviteForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, { message: "", ok: false });
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form action={submit} className="entity-form">
      <label>Nome<input name="name" required minLength={2} maxLength={160}/></label>
      <label>E-mail<input name="email" type="email" required maxLength={254}/></label>
      <div className="wide">
        <button className="admin-primary" disabled={pending}>{pending ? "Criando convite…" : "Criar convite"}</button>
        {state.message ? <p role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
      </div>
      {state.inviteUrl ? (
        <div className="wide">
          <label>Link de ativação<input value={state.inviteUrl} readOnly aria-label="Link de ativação"/></label>
          <button type="button" className="admin-secondary" onClick={copyInvite}>
            {copied ? <Check aria-hidden="true"/> : <Copy aria-hidden="true"/>}
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
