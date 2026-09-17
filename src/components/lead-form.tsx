"use client";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function LeadForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [state,setState]=useState<"idle"|"loading"|"success"|"error">("idle"); const [message,setMessage]=useState("");
  async function submit(formData: FormData) {
    setState("loading"); setMessage("");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(formData), propertyId }) });
      const data = await response.json();
      setState(response.ok ? "success" : "error");
      setMessage(response.ok ? data.message : data.error || "Não foi possível enviar.");
    } catch {
      setState("error");
      setMessage("Não foi possível confirmar o envio. Verifique sua conexão antes de tentar novamente.");
    }
  }
  if(state==="success") return <div className="form-success"><CheckCircle2/><h3>Interesse registrado</h3><p>{message}</p></div>;
  return <form className="lead-form" action={submit}><div><span className="eyebrow">Atendimento pessoal</span><h2>Quero conhecer este imóvel</h2><p>Conte como prefere ser atendido. Retornaremos em horário comercial.</p></div><label>Nome<input required name="name" autoComplete="name"/></label><label>WhatsApp<input required name="phone" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999"/></label><label>E-mail<input required name="email" type="email" autoComplete="email"/></label><label>Mensagem<textarea name="message" defaultValue={`Olá, tenho interesse em ${propertyTitle}.`}/></label><label className="check"><input required name="consent" type="checkbox" value="true"/><span>Concordo com o uso dos meus dados para este atendimento, conforme a Política de Privacidade.</span></label>{state==="error"&&<p className="form-error" role="alert">{message}</p>}<button disabled={state==="loading"} className="button button-accent">{state==="loading"?<><Loader2 className="spin"/> Enviando...</>:"Solicitar atendimento"}</button></form>;
}
