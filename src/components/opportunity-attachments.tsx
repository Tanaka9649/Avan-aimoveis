"use client";

import { Download, Eye, FileText, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { attachmentCategories, type OpportunityAttachment } from "@/lib/opportunity-attachments";

type Reservation = { attachmentId: string; uploadUrl: string; contentType: string };

export function OpportunityAttachments({ opportunityId, initialAttachments = [], onCountChange }: { opportunityId: string; initialAttachments?: OpportunityAttachment[]; onCountChange?: (count: number) => void }) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [category, setCategory] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => { onCountChangeRef.current = onCountChange; }, [onCountChange]);

  useEffect(() => {
    let active = true;
    fetch(`/api/opportunities/${opportunityId}/attachments`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((data: { attachments: OpportunityAttachment[] }) => { if (active) { setAttachments(data.attachments); onCountChangeRef.current?.(data.attachments.length); } })
      .catch(() => { if (active) setNotice("Não foi possível carregar os arquivos."); });
    return () => { active = false; };
  }, [opportunityId]);

  function replace(next: OpportunityAttachment[]) {
    setAttachments(next);
    onCountChangeRef.current?.(next.length);
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setNotice("Preparando envio seguro…");
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size, category: category || null })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível preparar o envio.");
      const completed: OpportunityAttachment[] = [];
      for (const [index, reservation] of (data.uploads as Reservation[]).entries()) {
        try {
          await putFile(reservation.uploadUrl, files[index], (percent) => setNotice(`Enviando arquivo ${index + 1} de ${files.length} · ${percent}%`));
          const finish = await fetch(`/api/opportunities/${opportunityId}/attachments/${reservation.attachmentId}/complete`, { method: "POST" });
          const result = await finish.json();
          if (!finish.ok) throw new Error(result.error || "Não foi possível confirmar o arquivo.");
          completed.push(result.attachment);
        } catch (error) {
          await fetch(`/api/opportunities/${opportunityId}/attachments/${reservation.attachmentId}`, { method: "DELETE" }).catch(() => undefined);
          throw error;
        }
      }
      setAttachments((current) => {
        const next = [...completed.reverse(), ...current];
        onCountChangeRef.current?.(next.length);
        return next;
      });
      setNotice(`${completed.length} arquivo(s) adicionado(s) com segurança.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar os arquivos.");
    } finally {
      setBusy(false);
    }
  }

  async function edit(attachment: OpportunityAttachment, nextCategory = attachment.category) {
    const displayName = nextCategory === attachment.category ? window.prompt("Nome de exibição", attachment.displayName)?.trim() : attachment.displayName;
    if (!displayName) return;
    const response = await fetch(`/api/opportunities/${opportunityId}/attachments/${attachment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, category: nextCategory || null }),
    });
    const data = await response.json();
    if (response.ok) replace(attachments.map((item) => item.id === attachment.id ? data.attachment : item));
    else setNotice(data.error || "Não foi possível atualizar o arquivo.");
  }

  async function remove(attachment: OpportunityAttachment) {
    if (!window.confirm(`Excluir “${attachment.displayName}”? Essa ação removerá o arquivo privado.`)) return;
    setBusy(true);
    const response = await fetch(`/api/opportunities/${opportunityId}/attachments/${attachment.id}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) { replace(attachments.filter((item) => item.id !== attachment.id)); setNotice("Arquivo removido."); }
    else setNotice(data.error || "Não foi possível excluir o arquivo.");
    setBusy(false);
  }

  return <section className="opportunity-files">
    <header><div><h3>Arquivos</h3><p>{attachments.length} {attachments.length === 1 ? "anexo" : "anexos"}</p></div><label>Categoria para novos arquivos<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Sem categoria</option>{attachmentCategories.map((item) => <option key={item}>{item}</option>)}</select></label></header>
    <button type="button" className={`attachment-drop${dragging ? " is-dragging" : ""}`} disabled={busy} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload([...event.dataTransfer.files]); }}>
      <Upload/><span><strong>Adicionar arquivos</strong><small>Arraste aqui ou selecione PDF, JPG, JPEG, PNG ou WebP · até 20 MB cada</small></span>
    </button>
    <input ref={inputRef} hidden type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { void upload([...(event.target.files || [])]); event.target.value = ""; }}/>
    {attachments.length ? <div className="opportunity-file-list">{attachments.map((attachment) => <article key={attachment.id}>
      <FileText/><div><strong>{attachment.displayName}</strong><small>{formatType(attachment.mimeType)} · {formatBytes(attachment.sizeBytes)}{attachment.category ? ` · ${attachment.category}` : ""}</small></div>
      <select aria-label={`Categoria de ${attachment.displayName}`} value={attachment.category || ""} onChange={(event) => void edit(attachment, event.target.value)}><option value="">Sem categoria</option>{attachmentCategories.map((item) => <option key={item}>{item}</option>)}</select>
      <span className="attachment-actions"><a href={`/api/opportunities/${opportunityId}/attachments/${attachment.id}?view=1`} target="_blank" rel="noreferrer" title="Visualizar" aria-label={`Visualizar ${attachment.displayName}`}><Eye/></a><a href={`/api/opportunities/${opportunityId}/attachments/${attachment.id}`} title="Baixar" aria-label={`Baixar ${attachment.displayName}`}><Download/></a><button type="button" title="Renomear" aria-label={`Renomear ${attachment.displayName}`} onClick={() => void edit(attachment)}><Pencil/></button><button type="button" title="Excluir" aria-label={`Excluir ${attachment.displayName}`} disabled={busy} onClick={() => void remove(attachment)}><Trash2/></button></span>
    </article>)}</div> : <p className="attachment-empty"><Paperclip/> Nenhum arquivo anexado.</p>}
    {notice ? <p className="attachment-notice" role="status" aria-live="polite">{notice}</p> : null}
  </section>;
}

function putFile(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("O armazenamento recusou o arquivo."));
    request.onerror = () => reject(new Error("A conexão foi interrompida durante o envio."));
    request.send(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatType(mime: string) {
  if (mime === "application/pdf") return "PDF";
  return mime.split("/")[1]?.toUpperCase() || "Arquivo";
}
