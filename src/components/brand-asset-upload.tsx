"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageUp, Trash2 } from "lucide-react";

export function BrandAssetUpload({
  label,
  value,
  onChange,
  inputName,
  favicon = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  inputName?: string;
  favicon?: boolean;
}) {
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const commit = (next: string) => {
    setCurrent(next);
    onChange?.(next);
  };

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const prepare = await fetch("/api/branding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      const payload = await prepare.json();
      if (!prepare.ok) throw new Error(payload.error || "Não foi possível preparar o envio.");
      const sent = await fetch(payload.uploadUrl, { method: "PUT", headers: { "content-type": payload.contentType }, body: file });
      if (!sent.ok) throw new Error("O envio da imagem falhou.");
      commit(payload.publicUrl);
      setMessage("Imagem enviada. Salve as configurações para aplicar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={"brand-asset-upload" + (favicon ? " favicon" : "")}>
      {inputName ? <input type="hidden" name={inputName} value={current}/> : null}
      <span>{label}</span>
      <div className="brand-asset-upload-row">
        <div className="brand-asset-mini-preview">
          {current ? <Image src={current} alt={"Prévia de " + label} width={favicon ? 40 : 150} height={favicon ? 40 : 54} unoptimized/> : <small>Sem imagem</small>}
        </div>
        <div>
          <input ref={input} className="crm-visually-hidden" type="file" accept={favicon ? "image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" : "image/png,image/jpeg,image/webp,image/svg+xml"} onChange={(event) => { const file=event.target.files?.[0]; if(file) void upload(file); }}/>
          <button className="admin-button secondary" type="button" disabled={busy} onClick={() => input.current?.click()}><ImageUp/> {busy ? "Enviando…" : current ? "Substituir arquivo" : "Enviar arquivo"}</button>
          {current ? <button className="text-action danger" type="button" disabled={busy} onClick={() => commit("")}><Trash2/> Remover</button> : null}
        </div>
      </div>
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
