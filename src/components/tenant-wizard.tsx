"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Building2, Palette, Globe2, Boxes, UserRound, ClipboardCheck } from "lucide-react";
import { modules, moduleLabels, type Module } from "@/lib/permissions";
import { BrandLogosEditor } from "@/components/brand-logos-editor";
import type { BrandLogoEntry } from "@/lib/branding";

const steps = [
  { label: "Empresa", icon: Building2 },
  { label: "Identidade", icon: Palette },
  { label: "Site", icon: Globe2 },
  { label: "Recursos", icon: Boxes },
  { label: "Administrador", icon: UserRound },
  { label: "Revisão", icon: ClipboardCheck },
] as const;

type Draft = {
  name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  email: string;
  logos: BrandLogoEntry[];
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  plan: "starter" | "pro" | "max" | "custom";
  modules: Module[];
  adminName: string;
  adminEmail: string;
};

const initial: Draft = {
  name: "",
  slug: "",
  phone: "",
  whatsapp: "",
  email: "",
  logos: [{ id: "primary", name: "Marca principal", logoLight: "", logoDark: "" }],
  favicon: "",
  primaryColor: "#2563eb",
  secondaryColor: "#111827",
  accentColor: "#3b82f6",
  plan: "starter",
  modules: ["dashboard", "imoveis", "clientes", "crm"],
  adminName: "",
  adminEmail: "",
};

const slugify = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 120);

const emailOk = (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function TenantWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error?: string; inviteUrl?: string } | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggle = (module: Module) => set("modules", draft.modules.includes(module) ? draft.modules.filter((item) => item !== module) : [...draft.modules, module]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<keyof Draft, string>> = {};
    if (step === 0) {
      if (draft.name.trim().length < 2) errors.name = "Informe o nome da empresa.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.slug = "Informe um endereço válido para a empresa.";
      if (!emailOk(draft.email)) errors.email = "Informe um e-mail comercial válido.";
    }
    if (step === 4) {
      if (draft.adminName.trim().length < 2) errors.adminName = "Informe o nome do administrador.";
      if (!emailOk(draft.adminEmail) || !draft.adminEmail) errors.adminEmail = "Informe um e-mail válido para o administrador.";
    }
    return errors;
  }, [draft, step]);

  const validation = useMemo(() => {
    if (step === 0) {
      if (draft.name.trim().length < 2) return "Informe o nome da empresa.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) return "Informe um endereço válido para a empresa.";
      if (!emailOk(draft.email)) return "Revise o e-mail comercial.";
    }
    if (step === 3 && draft.modules.length === 0) return "Selecione pelo menos um módulo.";
    if (step === 4) {
      if (draft.adminName.trim().length < 2) return "Informe o nome do administrador.";
      if (!emailOk(draft.adminEmail) || !draft.adminEmail) return "Informe um e-mail válido para o administrador.";
    }
    return "";
  }, [draft, step]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function next() {
    if (validation) {
      setMessage(validation);
      requestAnimationFrame(() => {
        const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.focus();
      });
      return;
    }
    setMessage("");
    setStep((value) => Math.min(5, value + 1));
  }

  function back() {
    setMessage("");
    setStep((value) => Math.max(0, value - 1));
  }

  async function create() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setMessage("");
    try {
      const response = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          phone: draft.phone,
          whatsapp: draft.whatsapp,
          email: draft.email,
          plan: draft.plan,
          modules: draft.modules,
          branding: {
            logos: draft.logos,
            logoLight: draft.logos[0]?.logoLight,
            logoDark: draft.logos[0]?.logoDark,
            favicon: draft.favicon,
          },
          site: {
            primaryColor: draft.primaryColor,
            secondaryColor: draft.secondaryColor,
            accentColor: draft.accentColor,
            title: draft.name,
          },
          admin: { name: draft.adminName, email: draft.adminEmail },
        }),
      });
      const data = await response.json();
      setResult(response.ok ? { inviteUrl: data.inviteUrl } : { error: data.error || "Não foi possível criar a empresa." });
    } catch {
      setResult({ error: "Não foi possível conectar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card tenant-wizard">
      <ol className="tenant-wizard-stepper" aria-label="Etapas da criação">
        {steps.map(({ label, icon: Icon }, index) => (
          <li key={label} className={index === step ? "active" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? <Check size={12}/> : <Icon size={12}/>}</span>
            <b>{label}</b>
          </li>
        ))}
      </ol>

      <div className="tenant-wizard-card">
        {step === 0 ? (
          <div className="entity-form">
            <label>Nome da empresa<input aria-invalid={Boolean(fieldErrors.name)} value={draft.name} onChange={(event) => {
              const name = event.target.value;
              set("name", name);
              if (!slugTouched) set("slug", slugify(name));
            }} placeholder="Ex.: XP Imóveis"/>{fieldErrors.name ? <small className="admin-field-error">{fieldErrors.name}</small> : null}</label>
            <label>Endereço da empresa<input aria-invalid={Boolean(fieldErrors.slug)} value={draft.slug} onChange={(event) => { setSlugTouched(true); set("slug", slugify(event.target.value)); }} placeholder="xp-imoveis"/>{fieldErrors.slug ? <small className="admin-field-error">{fieldErrors.slug}</small> : null}<small className="field-hint">Será usado em /empresa/{draft.slug || "nome-da-empresa"}.</small></label>
            <label>Telefone<input value={draft.phone} onChange={(event) => set("phone", event.target.value)} placeholder="(00) 0000-0000"/></label>
            <label>WhatsApp<input value={draft.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} placeholder="(00) 00000-0000"/></label>
            <label className="wide">E-mail comercial<input aria-invalid={Boolean(fieldErrors.email)} type="email" value={draft.email} onChange={(event) => set("email", event.target.value)} placeholder="contato@empresa.com.br"/>{fieldErrors.email ? <small className="admin-field-error">{fieldErrors.email}</small> : null}</label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="entity-form">
            <BrandLogosEditor initialLogos={draft.logos} onChange={(logos) => set("logos", logos)}/>
            <label className="wide">Favicon — URL<input type="url" value={draft.favicon} onChange={(event) => set("favicon", event.target.value)} placeholder="https://..."/></label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="entity-form">
            <label>Cor principal<input type="color" value={draft.primaryColor} onChange={(event) => set("primaryColor", event.target.value)}/></label>
            <label>Cor secundária<input type="color" value={draft.secondaryColor} onChange={(event) => set("secondaryColor", event.target.value)}/></label>
            <label>Cor de destaque<input type="color" value={draft.accentColor} onChange={(event) => set("accentColor", event.target.value)}/></label>
            <div className="wide tenant-site-preview" style={{ "--preview-primary": draft.primaryColor, "--preview-secondary": draft.secondaryColor, "--preview-accent": draft.accentColor } as React.CSSProperties}>
              <small>Prévia das cores</small><strong>{draft.name || "Nome da empresa"}</strong><button type="button">Botão de destaque</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="entity-form">
            <label>Plano<select value={draft.plan} onChange={(event) => set("plan", event.target.value as Draft["plan"])}><option value="starter">Starter</option><option value="pro">Pro</option><option value="max">Max</option><option value="custom">Personalizado</option></select></label>
            <fieldset className="wide"><legend>Módulos</legend>{modules.map((module) => <label className="check" key={module}><input type="checkbox" checked={draft.modules.includes(module)} onChange={() => toggle(module)}/><span>{moduleLabels[module]}</span></label>)}</fieldset>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="entity-form">
            <label>Nome do administrador<input aria-invalid={Boolean(fieldErrors.adminName)} value={draft.adminName} onChange={(event) => set("adminName", event.target.value)} placeholder="Nome completo"/>{fieldErrors.adminName ? <small className="admin-field-error">{fieldErrors.adminName}</small> : null}</label>
            <label>E-mail do administrador<input aria-invalid={Boolean(fieldErrors.adminEmail)} type="email" value={draft.adminEmail} onChange={(event) => set("adminEmail", event.target.value)} placeholder="admin@empresa.com.br"/>{fieldErrors.adminEmail ? <small className="admin-field-error">{fieldErrors.adminEmail}</small> : null}</label>
            <p className="wide muted-copy">O administrador receberá um convite temporário para definir a própria senha. Nenhuma senha é criada pelo Super Admin.</p>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="tenant-review-grid">
            <button type="button" className="tenant-review-card" onClick={() => setStep(0)}><small>Empresa</small><strong>{draft.name}</strong><span>/empresa/{draft.slug}</span></button>
            <button type="button" className="tenant-review-card" onClick={() => setStep(1)}><small>Identidade</small><strong>{draft.logos.filter((logo) => logo.logoLight || logo.logoDark).length || 0} logo(s)</strong><span>{draft.favicon ? "Favicon configurado" : "Sem favicon"}</span></button>
            <button type="button" className="tenant-review-card" onClick={() => setStep(3)}><small>Plano e recursos</small><strong>{draft.plan === "custom" ? "Personalizado" : draft.plan[0].toUpperCase() + draft.plan.slice(1)}</strong><span>{draft.modules.map((item) => moduleLabels[item]).join(", ")}</span></button>
            <button type="button" className="tenant-review-card" onClick={() => setStep(4)}><small>Administrador</small><strong>{draft.adminName}</strong><span>{draft.adminEmail}</span></button>
          </div>
        ) : null}

        {message ? <p role="alert" className="admin-form-error tenant-wizard-message">{message}</p> : null}
        {result?.error ? <p role="alert" className="admin-form-error tenant-wizard-message">{result.error}</p> : null}
        {result?.inviteUrl ? <div role="status" className="tenant-created-message"><strong>Empresa criada em configuração.</strong><p>Compartilhe o link de convite por um canal seguro:</p><output>{result.inviteUrl}</output></div> : null}
      </div>

      <div className="tenant-wizard-actions">
        <button className="admin-button secondary" type="button" disabled={step === 0 || busy} onClick={back}><ArrowLeft/> Voltar</button>
        <div>
          {step < 5 ? <button className="admin-button primary" type="button" onClick={next}>Continuar <ArrowRight/></button> : <button className="admin-button primary" type="button" disabled={busy || Boolean(result?.inviteUrl)} onClick={create}>{busy ? "Criando..." : result?.inviteUrl ? "Empresa criada" : "Criar empresa"}</button>}
        </div>
      </div>
    </section>
  );
}
