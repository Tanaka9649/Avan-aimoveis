"use client";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { saveProperty } from "@/app/painel/imoveis/actions";
import { FormSection } from "./admin-ui";

function Field({ name, label, type = "text", initial, required = true, min, step, className = "" }: { name: string; label: string; type?: string; initial: Record<string, string | number>; required?: boolean; min?: number; step?: string; className?: string }) {
  return <label className={className}>{label}{required ? <sup>*</sup> : null}<input name={name} type={type} required={required} defaultValue={initial[name] ?? (["bedrooms","bathrooms","parking"].includes(name) ? 0 : "")} min={min} step={step}/></label>;
}

export function PropertyEditor({ initial = {} }: { initial?: Record<string, string | number> }) {
  const [state, action, pending] = useActionState(saveProperty, { error: "" });
  return <form action={action} className="property-editor">
    <input type="hidden" name="id" value={initial.id || ""}/>
    <div className="property-form-grid">
      <FormSection number="01" title="Identificação" description="Informações usadas para reconhecer e publicar o imóvel." wide>
        <Field name="title" label="Título do anúncio" initial={initial} className="field-span-2"/>
        <Field name="code" label="Código interno" initial={initial}/>
        <Field name="slug" label="Endereço da página (slug)" initial={initial}/>
        <label>Status<sup>*</sup><select name="status" defaultValue={initial.status || "rascunho"}><option value="rascunho">Rascunho — não aparece no site</option><option value="disponivel">Disponível — publicar no site</option><option value="pausado">Pausado — ocultar do site</option><option value="reservado">Reservado — ocultar do site</option></select></label>
        <label>Tipo<sup>*</sup><select name="type" defaultValue={initial.type || "Apartamento"}>{["Apartamento","Casa","Cobertura","Studio"].map((type) => <option key={type}>{type}</option>)}</select></label>
      </FormSection>
      <FormSection number="02" title="Valores e área" description="Dados comerciais e dimensão privativa.">
        <Field name="price" label="Preço de venda (R$)" type="number" min={0} step="0.01" initial={initial}/>
        <Field name="area" label="Área privativa (m²)" type="number" min={0} step="0.01" initial={initial}/>
      </FormSection>
      <FormSection number="03" title="Características" description="Quantidades principais do imóvel.">
        <Field name="bedrooms" label="Quartos" type="number" min={0} step="1" initial={initial}/>
        <Field name="bathrooms" label="Banheiros" type="number" min={0} step="1" initial={initial}/>
        <Field name="parking" label="Vagas" type="number" min={0} step="1" initial={initial}/>
      </FormSection>
      <FormSection number="04" title="Endereço e localização" description="O endereço completo permanece restrito à equipe." wide>
        <Field name="address" label="Endereço completo" initial={initial} className="field-span-2"/>
        <Field name="neighborhood" label="Bairro" initial={initial}/>
        <Field name="city" label="Cidade" initial={initial}/>
        <Field name="state" label="UF" initial={initial}/>
      </FormSection>
      <FormSection number="05" title="Descrição pública" description="Apresente os pontos importantes com linguagem clara." wide>
        <label className="field-span-2">Descrição<sup>*</sup><textarea name="description" minLength={30} maxLength={20000} required rows={8} defaultValue={initial.description}/><small className="field-hint">Mínimo de 30 caracteres.</small></label>
      </FormSection>
      <section className="form-section form-section-wide form-placeholder"><div><strong>Fotos e documentos</strong><p>O armazenamento ainda não está conectado. Esta seção será habilitada quando o Neon Object Storage for provisionado.</p></div><span>Em preparação</span></section>
    </div>
    {state.error ? <p className="form-error admin-form-error" role="alert">{state.error}</p> : null}
    <div className="property-form-actions"><Link className="admin-button secondary" href="/painel/imoveis">Cancelar</Link><button disabled={pending} className="admin-button primary">{pending ? <><Loader2 className="spin"/> Salvando…</> : <><Check/> Salvar imóvel</>}</button></div>
  </form>;
}
