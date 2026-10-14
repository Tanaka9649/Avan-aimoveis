import { brandingExtension, MAX_BRANDING_BYTES } from "./branding-upload";
export function validateBrandingFile(file: File) {
  if (!brandingExtension(file.type) || file.size <= 0 || file.size > MAX_BRANDING_BYTES) throw new Error("Use PNG, JPG, WEBP ou ICO com até 5 MB.");
}
export async function uploadBrandingFile(file: File, favicon = false, tenantId?: string) {
  validateBrandingFile(file);
  const scope = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const metadata = {name:file.name,type:file.type,size:file.size};
  const prepare = await fetch(`/api/branding${scope}`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(metadata)});
  const payload = await prepare.json();
  if (!prepare.ok) throw new Error(payload.error || "Não foi possível preparar o envio.");
  const sent = await fetch(payload.uploadUrl,{method:"PUT",headers:{"content-type":payload.contentType},body:file});
  if (!sent.ok) throw new Error("O envio da imagem falhou.");
  const confirmed = await fetch(`/api/branding/confirm${scope}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...metadata,favicon,asset:payload.publicUrl.split("/").pop()})});
  const result = await confirmed.json();
  if(!confirmed.ok) throw new Error(result.error || "Não foi possível confirmar a imagem.");
  return result.publicUrl as string;
}
