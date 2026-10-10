"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import type { BrandLogoEntry } from "@/lib/branding";

type EditableLogo = Required<Pick<BrandLogoEntry, "id">> & {
  name: string;
  logoLight: string;
  logoDark: string;
};

const emptyLogo = (index: number): EditableLogo => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `logo-${Date.now()}-${index}`,
  name: index === 0 ? "Marca principal" : `Parceiro ${index + 1}`,
  logoLight: "",
  logoDark: "",
});

function editable(logo: BrandLogoEntry, index: number): EditableLogo {
  return {
    id: logo.id || `logo-${index + 1}`,
    name: logo.name || (index === 0 ? "Marca principal" : `Parceiro ${index + 1}`),
    logoLight: logo.logoLight || "",
    logoDark: logo.logoDark || "",
  };
}

export function BrandLogosEditor({
  initialLogos = [],
  inputName = "logosJson",
  onChange,
  maxLogos = 8,
}: {
  initialLogos?: BrandLogoEntry[];
  inputName?: string;
  onChange?: (logos: BrandLogoEntry[]) => void;
  maxLogos?: number;
}) {
  const [logos, setLogos] = useState<EditableLogo[]>(() => initialLogos.length ? initialLogos.map(editable) : [emptyLogo(0)]);
  const [active, setActive] = useState(0);

  function commit(next: EditableLogo[], nextActive = Math.min(active, next.length - 1)) {
    setLogos(next);
    setActive(Math.max(0, nextActive));
    onChange?.(next);
  }

  function update<K extends keyof EditableLogo>(key: K, value: EditableLogo[K]) {
    const next = logos.map((logo, index) => index === active ? { ...logo, [key]: value } : logo);
    commit(next, active);
  }

  function add() {
    if (logos.length >= maxLogos) return;
    const next = [...logos, emptyLogo(logos.length)];
    commit(next, next.length - 1);
  }

  function remove() {
    if (logos.length === 1) {
      commit([{ ...logos[0], name: "Marca principal", logoLight: "", logoDark: "" }], 0);
      return;
    }
    const next = logos.filter((_, index) => index !== active);
    commit(next, Math.max(0, active - 1));
  }

  function move(direction: -1 | 1) {
    const target = active + direction;
    if (target < 0 || target >= logos.length) return;
    const next = [...logos];
    [next[active], next[target]] = [next[target], next[active]];
    commit(next, target);
  }

  const current = logos[active];

  return (
    <div className="brand-logos-editor wide">
      <input type="hidden" name={inputName} value={JSON.stringify(logos)} />
      <div className="brand-logo-editor-heading">
        <div>
          <strong>Logos exibidas no site</strong>
          <p>Use uma aba para cada empresa ou marca parceira. A ordem aqui será a ordem exibida no site.</p>
        </div>
        <button className="admin-button secondary" type="button" onClick={add} disabled={logos.length >= maxLogos}>
          <Plus size={16}/> Adicionar logo
        </button>
      </div>

      <div className="brand-logo-tabs" role="tablist" aria-label="Logos do site">
        {logos.map((logo, index) => (
          <button
            key={logo.id}
            type="button"
            role="tab"
            aria-selected={active === index}
            className={active === index ? "active" : ""}
            onClick={() => setActive(index)}
          >
            {logo.name.trim() || `Logo ${index + 1}`}
          </button>
        ))}
      </div>

      {current ? (
        <div className="brand-logo-panel" role="tabpanel">
          <div className="brand-logo-fields">
            <label>
              Nome da empresa ou marca
              <input value={current.name} maxLength={80} onChange={(event) => update("name", event.target.value)} placeholder="Ex.: Avança Imóveis"/>
            </label>
            <label>
              Logo para fundo claro — URL
              <input value={current.logoLight} type="url" onChange={(event) => update("logoLight", event.target.value)} placeholder="https://..."/>
            </label>
            <label>
              Logo para fundo escuro/transparente — URL
              <input value={current.logoDark} type="url" onChange={(event) => update("logoDark", event.target.value)} placeholder="https://..."/>
            </label>
          </div>

          <div className="brand-logo-preview-grid">
            <div className="brand-logo-preview light">
              <span>Fundo claro</span>
              {current.logoLight || current.logoDark ? <Image src={current.logoLight || current.logoDark} alt="Prévia da logo em fundo claro" width={240} height={82} unoptimized/> : <small>Adicione uma URL para visualizar.</small>}
            </div>
            <div className="brand-logo-preview dark">
              <span>Fundo escuro</span>
              {current.logoDark || current.logoLight ? <Image src={current.logoDark || current.logoLight} alt="Prévia da logo em fundo escuro" width={240} height={82} unoptimized/> : <small>Adicione uma URL para visualizar.</small>}
            </div>
          </div>

          <div className="brand-logo-actions">
            <button type="button" onClick={() => move(-1)} disabled={active === 0}><ArrowLeft size={15}/> Mover</button>
            <button type="button" onClick={() => move(1)} disabled={active === logos.length - 1}>Mover <ArrowRight size={15}/></button>
            <button type="button" className="danger" onClick={remove}><Trash2 size={15}/> {logos.length === 1 ? "Limpar logo" : "Remover logo"}</button>
          </div>
        </div>
      ) : null}

      <p className="brand-logo-count">{logos.length}/{maxLogos} logos configuráveis.</p>
    </div>
  );
}
