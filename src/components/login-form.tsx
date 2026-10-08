"use client";
import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm({ tenantSlug, tenantName }: { tenantSlug: string; tenantName: string }) {
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [showPassword,setShowPassword]=useState(false);
  async function submit(formData:FormData){
    setLoading(true); setError("");
    try {
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...Object.fromEntries(formData),tenantSlug})});
      const data=await response.json();
      if(response.ok){router.push(data.redirectTo||"/painel");router.refresh();return}
      setError(data.error||"Não foi possível entrar.");
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    setLoading(false);
  }
  return <form className="login-form" action={submit} aria-busy={loading}>
    <div className="login-icon"><LockKeyhole/></div>
    <div><span className="eyebrow">Área restrita</span><h1>Entre no painel</h1><p>Use suas credenciais de {tenantName}.</p></div>
    <label>E-mail<input name="email" type="email" autoComplete="email" required disabled={loading}/></label>
    <label>Senha<span className="password-field"><input name="password" type={showPassword?"text":"password"} autoComplete="current-password" minLength={8} required disabled={loading}/><button type="button" aria-label={showPassword?"Ocultar senha":"Mostrar senha"} onClick={()=>setShowPassword((value)=>!value)}>{showPassword?<EyeOff/>:<Eye/>}</button></span></label>
    {error?<p className="login-error" role="alert">{error}</p>:null}
    <button className="button button-accent" disabled={loading}>{loading?<><Loader2 className="spin"/>Entrando...</>:"Entrar com segurança"}</button>
  </form>;
}
