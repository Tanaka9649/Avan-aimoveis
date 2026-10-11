"use client";
import { useState } from "react";
export function PasswordForm({ mode, tenantSlug }: { mode: "request" | "reset" | "change"; tenantSlug?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  async function submit(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const body = Object.fromEntries(form);
      if (mode !== "request" && body.password !== body.confirmPassword) { setMessage("As senhas não coincidem."); return; }
      const response = await fetch(mode === "change" ? "/api/auth/password" : "/api/auth/password-reset", {
        method: mode === "reset" ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, tenantSlug, ...(mode === "reset" ? { token: window.location.hash.slice(1) } : {}) }),
      });
      const result = await response.json(); setMessage(result.message || result.error);
      if (response.ok) setComplete(true);
    } catch { setMessage("Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <form action={submit} className="entity-form">
    {mode === "request" ? <label>E-mail<input name="email" type="email" autoComplete="email" required/></label> : <>
      {mode === "change" ? <label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required/></label> : null}
      <label>Nova senha<input name="password" type="password" minLength={12} maxLength={200} autoComplete="new-password" required/></label>
      <label>Confirme a nova senha<input name="confirmPassword" type="password" minLength={12} maxLength={200} autoComplete="new-password" required/></label>
    </>}
    {message ? <p role="status" className="wide">{message}</p> : null}
    <button className="admin-button primary" disabled={busy || complete}>{busy ? "Aguarde…" : mode === "request" ? "Enviar instruções" : "Alterar senha"}</button>
    {complete && mode !== "request" ? <a href={tenantSlug ? `/empresa/${tenantSlug}/painel/login` : "/login"}>Entrar novamente</a> : null}
  </form>;
}
