"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm({ tenantSlug, tenantName }: { tenantSlug: string; tenantName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired,setMfaRequired]=useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(formData), tenantSlug }),
      });
      const data = await response.json();

      if (response.ok) {
        router.push(data.redirectTo || "/painel");
        router.refresh();
        return;
      }

      if(data.mfaRequired)setMfaRequired(true);
      setError(data.error || "Não foi possível entrar agora.");
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={(event) => { event.preventDefault(); if (!loading) void submit(new FormData(event.currentTarget)); }} aria-busy={loading}>
      <div className="login-form-heading">
        <span className="login-form-kicker">Área restrita</span>
        <h1>Bem-vindo de volta</h1>
        <p>Entre com suas credenciais para acessar o painel de {tenantName}.</p>
      </div>

      <div className="login-fields">
        <label htmlFor="login-email">E-mail</label>
        <div className="login-input-wrap">
          <Mail aria-hidden="true" />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seuemail@empresa.com.br"
            aria-describedby={error ? "login-error" : undefined}
            required
            disabled={loading}
          />
        </div>

        <label htmlFor="login-password">Senha</label>
        <div className="login-input-wrap">
          <LockKeyhole aria-hidden="true" />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            minLength={8}
            aria-describedby={error ? "login-error" : undefined}
            required
            disabled={loading}
          />
          <button
            className="login-password-toggle"
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mfaRequired?<label htmlFor="login-code">Código do autenticador ou de recuperação<input id="login-code" name="code" autoComplete="one-time-code" maxLength={39} required disabled={loading}/></label>:null}
      {error ? (
        <p id="login-error" className="login-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      <a href={`/recuperar-senha?empresa=${encodeURIComponent(tenantSlug)}`}>Esqueci minha senha</a>
      <button className="login-submit" type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="spin" aria-hidden="true" />
            Entrando...
          </>
        ) : (
          "Entrar na plataforma"
        )}
      </button>
    </form>
  );
}
