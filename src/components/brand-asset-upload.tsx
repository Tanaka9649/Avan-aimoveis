"use client";

import { uploadBrandingFile } from "@/lib/branding-client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ImageUp, Trash2 } from "lucide-react";

export function BrandAssetUpload({
  label,
  value,
  onChange,
  inputName,
  favicon = false,
  stageFile,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  inputName?: string;
  favicon?: boolean;
  stageFile?: (file: File) => string;
}) {
  const [internal, setInternal] = useState(value);
  const current = onChange ? value : internal;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const commit = (next: string) => {
    setInternal(next);
    onChange?.(next);
  };

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const publicUrl = stageFile ? stageFile(file) : await uploadBrandingFile(file, favicon);
      commit(publicUrl);
      setMessage(stageFile ? "Imagem selecionada. Será enviada para a nova empresa ao concluir." : "Imagem confirmada. Salve as configurações para aplicar.");
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
          <input ref={input} className="crm-visually-hidden" type="file" accept={favicon ? "image/png,image/x-icon,image/vnd.microsoft.icon" : "image/png,image/jpeg,image/webp"} onChange={(event) => { const file=event.target.files?.[0]; if(file) void upload(file); }}/>
          <button className="admin-button secondary" type="button" disabled={busy} onClick={() => input.current?.click()}><ImageUp/> {busy ? "Enviando…" : current ? "Substituir arquivo" : "Enviar arquivo"}</button>
          {current ? <button className="text-action danger" type="button" disabled={busy} onClick={() => commit("")}><Trash2/> Remover</button> : null}
        </div>
      </div>
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
