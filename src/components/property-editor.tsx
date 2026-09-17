"use client";
import { useActionState } from "react";
import { saveProperty } from "@/app/painel/imoveis/actions";

export function PropertyEditor({ initial = {} }: { initial?: Record<string, string | number> }) {
  const [state, action, pending] = useActionState(saveProperty, { error: "" });
  const fields = [
    ["code", "Código interno", "text"], ["title", "Título", "text"], ["slug", "Slug (letras minúsculas e hífens)", "text"],
    ["price", "Preço (R$)", "number"], ["area", "Área privativa (m²)", "number"], ["bedrooms", "Quartos", "number"], ["bathrooms", "Banheiros", "number"], ["parking", "Vagas", "number"],
    ["state", "UF", "text"], ["city", "Cidade", "text"], ["neighborhood", "Bairro", "text"], ["address", "Endereço completo (somente equipe)", "text"],
  ];
  return <form action={action} className="admin-card entity-form">
    <input type="hidden" name="id" value={initial.id || ""}/>
    {fields.map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} required defaultValue={initial[name] ?? (["bedrooms", "bathrooms", "parking"].includes(name) ? 0 : "")} min={type === "number" ? 0 : undefined} step={type === "number" ? (["price", "area"].includes(name) ? "0.01" : "1") : undefined}/></label>)}
    <label>Tipo<select name="type" defaultValue={initial.type || "Apartamento"}>{["Apartamento", "Casa", "Cobertura", "Studio"].map((type) => <option key={type}>{type}</option>)}</select></label>
    <label>Status<select name="status" defaultValue={initial.status || "rascunho"}><option value="rascunho">Rascunho — não aparece no site</option><option value="disponivel">Disponível — publicar no site</option><option value="pausado">Pausado — ocultar do site</option><option value="reservado">Reservado — ocultar do site</option></select></label>
    <label className="wide">Descrição pública<textarea name="description" minLength={30} maxLength={20000} required rows={6} defaultValue={initial.description}/></label>
    {state.error && <p className="wide form-error" role="alert">{state.error}</p>}
    <div className="entity-form-actions"><button disabled={pending} className="admin-primary">{pending ? "Salvando…" : "Salvar imóvel"}</button></div>
  </form>;
}
