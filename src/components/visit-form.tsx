"use client";
import { useActionState } from "react";
import { saveVisit } from "@/app/painel/visitas/actions";
export function VisitForm({clients,properties,deals}:{clients:{id:string;name:string}[];properties:{id:string;title:string;code:string}[];deals:{id:string;title:string}[]}){
 const[state,action,pending]=useActionState(saveVisit,{ok:false,message:""});return <form action={action} className="entity-form operational-form">
  <label>Cliente<select name="clientId" required defaultValue=""><option value="">Selecione</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  <label>Imóvel<select name="propertyId" required defaultValue=""><option value="">Selecione</option>{properties.map(x=><option key={x.id} value={x.id}>{x.code} — {x.title}</option>)}</select></label>
  <label>Oportunidade<select name="dealId" defaultValue=""><option value="">Sem oportunidade vinculada</option>{deals.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
  <label>Data e horário<input name="scheduledAt" type="datetime-local" required/></label>
  <label>Status<select name="status" defaultValue="agendada"><option value="agendada">Agendada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option><option value="nao_compareceu">Não compareceu</option></select></label>
  <label className="wide">Observações<textarea name="notes" rows={3} maxLength={4000}/></label>
  {state.message?<p className={state.ok?"form-success-inline":"admin-form-error"} role="status">{state.message}</p>:null}<button className="admin-button primary" disabled={pending}>{pending?"Salvando…":"Agendar visita"}</button>
 </form>;
}
