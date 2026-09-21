"use client";
import Image from "next/image";
import { FileText, GripVertical, ImagePlus, LockKeyhole, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";

type Photo = { id: string; alt: string; position: number; isCover: boolean; blurData?: string | null };
type Document = { id: string; originalName: string; mime: string; size: number };

export function PropertyMediaManager({ propertyId, initialPhotos = [], initialDocuments = [] }: { propertyId?: string; initialPhotos?: Photo[]; initialDocuments?: Document[] }) {
  const [photos, setPhotos] = useState(initialPhotos.sort((a,b)=>a.position-b.position));
  const [documents, setDocuments] = useState(initialDocuments);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const drag = useRef<string | null>(null);
  if (!propertyId) return <div className="wizard-upload"><ImagePlus size={34}/><h3>Fotos e documentos</h3><p>Salve o rascunho para liberar o envio de arquivos sem perder os dados preenchidos.</p><small>As fotos serão otimizadas automaticamente para WebP.</small></div>;
  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return; if (photos.length + files.length > 10) { setMessage("O limite é de 10 fotos por imóvel."); return; }
    setBusy(true); setMessage("Otimizando e enviando fotos…"); const body=new FormData(); [...files].forEach(f=>body.append("files",f));
    const response=await fetch(`/api/properties/${propertyId}/photos`,{method:"POST",body}); const data=await response.json();
    if(response.ok){setPhotos(old=>[...old,...data.photos]);setMessage(`${files.length} foto(s) enviada(s) com sucesso.`);}else setMessage(data.error||"Não foi possível enviar as fotos."); setBusy(false);
  }
  async function mutate(photoId:string, method:"PATCH"|"DELETE", body?:unknown){setBusy(true);const response=await fetch(`/api/properties/${propertyId}/photos/${photoId}`,{method,headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});if(response.ok){if(method==="DELETE")setPhotos(old=>old.filter(p=>p.id!==photoId));else if((body as {action?:string})?.action==="cover")setPhotos(old=>old.map(p=>({...p,isCover:p.id===photoId})));}else setMessage((await response.json()).error||"Não foi possível alterar a foto.");setBusy(false);}
  async function reorder(targetId:string){const sourceId=drag.current;if(!sourceId||sourceId===targetId)return;const next=[...photos];const from=next.findIndex(p=>p.id===sourceId),to=next.findIndex(p=>p.id===targetId);const [item]=next.splice(from,1);next.splice(to,0,item);const ordered=next.map((p,position)=>({...p,position}));setPhotos(ordered);drag.current=null;await Promise.all(ordered.map(p=>fetch(`/api/properties/${propertyId}/photos/${p.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"position",position:p.position})})));}
  async function uploadDocument(file?:File){if(!file)return;setBusy(true);setMessage("Enviando documento privado…");const body=new FormData();body.set("file",file);const response=await fetch(`/api/properties/${propertyId}/documents`,{method:"POST",body});const data=await response.json();if(response.ok){setDocuments(old=>[...old,data.document]);setMessage("Documento enviado com segurança.");}else setMessage(data.error||"Não foi possível enviar o documento.");setBusy(false);}
  async function deleteDocument(id:string){if(!confirm("Excluir este documento privado?"))return;const response=await fetch(`/api/property-documents/${id}`,{method:"DELETE"});if(response.ok)setDocuments(old=>old.filter(d=>d.id!==id));else setMessage("Não foi possível excluir o documento.");}
  return <div className="media-manager">
    <section><header><div><h3>Fotos públicas</h3><p>{photos.length}/10 fotos · JPG, PNG, WebP ou HEIC · até 15 MB</p></div><label className={`admin-button secondary ${busy||photos.length>=10?"is-disabled":""}`}><ImagePlus/> Adicionar fotos<input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy||photos.length>=10} onChange={e=>uploadPhotos(e.target.files)}/></label></header>
      {photos.length?<div className="media-grid">{photos.map(photo=><article key={photo.id} draggable onDragStart={()=>drag.current=photo.id} onDragOver={e=>e.preventDefault()} onDrop={()=>reorder(photo.id)}><Image src={photoUrl(photo.id,"thumb")} alt={photo.alt} fill sizes="180px" loading="lazy" {...(photo.blurData?{placeholder:"blur" as const,blurDataURL:photo.blurData}:{})} unoptimized/><span className="media-grip"><GripVertical/></span>{photo.isCover?<b>CAPA</b>:null}<div><button type="button" title="Definir como capa" onClick={()=>mutate(photo.id,"PATCH",{action:"cover"})}><Star fill={photo.isCover?"currentColor":"none"}/></button><button type="button" title="Excluir foto" onClick={()=>confirm("Excluir esta foto?")&&mutate(photo.id,"DELETE")}><Trash2/></button></div></article>)}</div>:<div className="media-empty"><ImagePlus/><p>Adicione boas fotos para valorizar o anúncio.</p></div>}
    </section>
    <section className="private-documents"><header><div><h3><LockKeyhole/> Documentos internos</h3><p>Privados e disponíveis somente à equipe autorizada.</p></div><label className={`admin-button secondary ${busy?"is-disabled":""}`}><Upload/> Enviar documento<input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>uploadDocument(e.target.files?.[0])}/></label></header>
      <div className="document-list">{documents.map(doc=><article key={doc.id}><FileText/><div><a href={`/api/property-documents/${doc.id}`}>{doc.originalName}</a><small>{(doc.size/1024/1024).toFixed(2)} MB</small></div><button type="button" onClick={()=>deleteDocument(doc.id)} aria-label={`Excluir ${doc.originalName}`}><Trash2/></button></article>)}</div>
    </section>{message?<p role="status" className="media-message">{message}</p>:null}
  </div>;
}
