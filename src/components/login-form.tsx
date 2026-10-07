"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = await response.json();

      if (response.ok) {
        router.push(data.redirectTo || "/painel");
        router.refresh();
        return;
      }

      setError(data.error || "Não foi possível entrar agora.");
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" action={submit} aria-busy={loading}>
      <div className="login-form-heading">
        <span className="login-form-kicker">Área restrita</span>
        <h1>Bem-vindo de volta</h1>
        <p>Entre com as credenciais da sua equipe para acessar a plataforma.</p>
      </div>

      <div className="login-fields">
        <label htmlFor="login-email">E-mail</label>
        <div className="login-input-wrap">
          <Mail aria-hidden="true" />
          <input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nome@avancaimoveis.com.br" aria-describedby={error ? "login-error" : undefined} required />
        </div>

        <label htmlFor="login-password">Senha</label>
        <div className="login-input-wrap">
          <LockKeyhole aria-hidden="true" />
          <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" minLength={8} aria-describedby={error ? "login-error" : undefined} required />
          <button className="login-password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
      </div>

      {error ? <p id="login-error" className="login-error" role="alert" aria-live="polite">{error}</p> : null}

      <button className="login-submit" type="submit" disabled={loading}>
        {loading ? <><Loader2 className="spin" aria-hidden="true" /> Entrando...</> : "Entrar na plataforma"}
      </button>
    </form>
  );
}
