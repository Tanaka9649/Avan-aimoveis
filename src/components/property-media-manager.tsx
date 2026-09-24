"use client";

import Image from "next/image";
import { FileText, GripVertical, ImagePlus, Loader2, LockKeyhole, RotateCcw, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";

type Photo = { id: string; alt: string; position: number; isCover: boolean; blurData?: string | null; processingStatus?: string };
type Document = { id: string; originalName: string; mime: string; size: number };
type Reservation = { photoId: string; uploadUrl: string; contentType: string; position: number; isCover: boolean };

export function PropertyMediaManager({ propertyId, initialPhotos = [], initialDocuments = [] }: { propertyId?: string; initialPhotos?: Photo[]; initialDocuments?: Document[] }) {
  const [photos, setPhotos] = useState(() => [...initialPhotos].sort((a, b) => a.position - b.position));
  const [documents, setDocuments] = useState(initialDocuments);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const drag = useRef<string | null>(null);

  useEffect(() => {
    if (!propertyId || !photos.some((photo) => photo.processingStatus === "processing" || photo.processingStatus === "uploading")) return;
    const timer = window.setInterval(async () => {
      const pending = photos.filter((photo) => photo.processingStatus === "processing" || photo.processingStatus === "uploading");
      const updates = await Promise.all(pending.map(async (photo) => {
        const response = await fetch(`/api/properties/${propertyId}/photos/${photo.id}`, { cache: "no-store" });
        return response.ok ? { id: photo.id, ...(await response.json()) as { processingStatus: string; blurData?: string | null } } : null;
      }));
      setPhotos((current) => current.map((photo) => {
        const update = updates.find((candidate) => candidate?.id === photo.id);
        return update ? { ...photo, processingStatus: update.processingStatus, blurData: update.blurData } : photo;
      }));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [photos, propertyId]);

  if (!propertyId) return <div className="wizard-upload"><ImagePlus size={34}/><h3>Fotos e documentos</h3><p>Salve o rascunho para liberar o envio de arquivos sem perder os dados preenchidos.</p><small>O original será preservado e a visualização será preparada sem bloquear seu trabalho.</small></div>;

  async function uploadPhotos(list: FileList | null) {
    const files = list ? [...list] : [];
    if (!files.length) return;
    if (photos.length + files.length > 10) { setMessage("O limite é de 10 fotos por imóvel."); return; }
    setBusy(true);
    setMessage("Preparando envio seguro…");
    try {
      const reservationResponse = await fetch(`/api/properties/${propertyId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
      });
      const reservationData = await reservationResponse.json();
      if (!reservationResponse.ok) throw new Error(reservationData.error || "Não foi possível preparar o envio.");
      const uploaded: Photo[] = [];
      for (const [index, reservation] of (reservationData.uploads as Reservation[]).entries()) {
        try {
          await putFile(reservation.uploadUrl, files[index], (percent) => setMessage(`Enviando foto ${index + 1} de ${files.length} · ${percent}%`));
          const complete = await fetch(`/api/properties/${propertyId}/photos/${reservation.photoId}/complete`, { method: "POST" });
          const completed = await complete.json();
          if (!complete.ok) throw new Error(completed.error || "Não foi possível confirmar a foto.");
          uploaded.push(completed.photo);
          setPhotos((current) => [...current, completed.photo].sort((a, b) => a.position - b.position));
        } catch (error) {
          await fetch(`/api/properties/${propertyId}/photos/${reservation.photoId}`, { method: "DELETE" }).catch(() => undefined);
          throw error;
        }
      }
      setMessage(`${uploaded.length} foto(s) enviada(s). Preparando visualização em segundo plano…`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar as fotos.");
    } finally {
      setBusy(false);
    }
  }

  async function retry(photoId: string) {
    setMessage("Preparando a visualização novamente…");
    const response = await fetch(`/api/properties/${propertyId}/photos/${photoId}/complete`, { method: "POST" });
    const data = await response.json();
    if (response.ok) setPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, processingStatus: "processing" } : photo));
    setMessage(response.ok ? "Foto enviada. Preparando visualização…" : data.error || "Não foi possível tentar novamente.");
  }

  async function mutate(photoId: string, method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    const response = await fetch(`/api/properties/${propertyId}/photos/${photoId}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (response.ok) {
      if (method === "DELETE") setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      else if ((body as { action?: string })?.action === "cover") setPhotos((current) => current.map((photo) => ({ ...photo, isCover: photo.id === photoId })));
    } else setMessage((await response.json()).error || "Não foi possível alterar a foto.");
    setBusy(false);
  }

  async function reorder(targetId: string) {
    const sourceId = drag.current;
    if (!sourceId || sourceId === targetId) return;
    const next = [...photos];
    const from = next.findIndex((photo) => photo.id === sourceId), to = next.findIndex((photo) => photo.id === targetId);
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const ordered = next.map((photo, position) => ({ ...photo, position }));
    setPhotos(ordered);
    drag.current = null;
    await Promise.all(ordered.map((photo) => fetch(`/api/properties/${propertyId}/photos/${photo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "position", position: photo.position }) })));
  }

  async function uploadDocument(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("Enviando documento privado…");
    const body = new FormData(); body.set("file", file);
    const response = await fetch(`/api/properties/${propertyId}/documents`, { method: "POST", body });
    const data = await response.json();
    if (response.ok) { setDocuments((current) => [...current, data.document]); setMessage("Documento enviado com segurança."); }
    else setMessage(data.error || "Não foi possível enviar o documento.");
    setBusy(false);
  }

  async function deleteDocument(id: string) {
    if (!confirm("Excluir este documento privado?")) return;
    const response = await fetch(`/api/property-documents/${id}`, { method: "DELETE" });
    if (response.ok) setDocuments((current) => current.filter((document) => document.id !== id));
    else setMessage("Não foi possível excluir o documento.");
  }

  return <div className="media-manager">
    <section><header><div><h3>Fotos públicas</h3><p>{photos.length}/10 fotos · JPG, JPEG, PNG, WebP, HEIF ou HEIC · até 15 MB</p></div><label className={`admin-button secondary ${busy || photos.length >= 10 ? "is-disabled" : ""}`}><ImagePlus/> Adicionar fotos<input hidden type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy || photos.length >= 10} onChange={(event) => { void uploadPhotos(event.target.files); event.target.value = ""; }}/></label></header>
      {photos.length ? <div className="media-grid">{photos.map((photo) => {
        const pending = Boolean(photo.processingStatus && photo.processingStatus !== "ready");
        return <article key={photo.id} draggable={!pending} onDragStart={() => { drag.current = photo.id; }} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(photo.id)}>
          <Image key={photo.processingStatus} src={`${photoUrl(photo.id, "thumb")}&status=${photo.processingStatus || "ready"}`} alt={photo.alt} fill sizes="180px" loading="lazy" {...(photo.blurData ? { placeholder: "blur" as const, blurDataURL: photo.blurData } : {})} unoptimized/>
          <span className="media-grip"><GripVertical/></span>{photo.isCover ? <b>CAPA</b> : null}
          {photo.processingStatus === "processing" || photo.processingStatus === "uploading" ? <span className="media-processing"><Loader2 className="spin"/> Preparando</span> : null}
          {photo.processingStatus === "failed" ? <span className="media-processing is-error">Falha na visualização</span> : null}
          <div>{photo.processingStatus === "failed" ? <button type="button" title="Tentar preparar novamente" onClick={() => retry(photo.id)}><RotateCcw/></button> : null}<button type="button" title="Definir como capa" disabled={pending} onClick={() => mutate(photo.id, "PATCH", { action: "cover" })}><Star fill={photo.isCover ? "currentColor" : "none"}/></button><button type="button" title="Excluir foto" onClick={() => confirm("Excluir esta foto?") && mutate(photo.id, "DELETE")}><Trash2/></button></div>
        </article>;
      })}</div> : <div className="media-empty"><ImagePlus/><p>Adicione boas fotos para valorizar o anúncio.</p></div>}
    </section>
    <section className="private-documents"><header><div><h3><LockKeyhole/> Documentos internos</h3><p>Privados e disponíveis somente à equipe autorizada.</p></div><label className={`admin-button secondary ${busy ? "is-disabled" : ""}`}><Upload/> Enviar documento<input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => uploadDocument(event.target.files?.[0])}/></label></header>
      <div className="document-list">{documents.map((document) => <article key={document.id}><FileText/><div><a href={`/api/property-documents/${document.id}`}>{document.originalName}</a><small>{(document.size / 1024 / 1024).toFixed(2)} MB</small></div><button type="button" onClick={() => deleteDocument(document.id)} aria-label={`Excluir ${document.originalName}`}><Trash2/></button></article>)}</div>
    </section>{message ? <p role="status" className="media-message">{message}</p> : null}
  </div>;
}

function putFile(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("O armazenamento recusou a foto."));
    request.onerror = () => reject(new Error("A conexão foi interrompida durante o envio."));
    request.send(file);
  });
}
