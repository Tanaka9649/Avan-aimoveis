"use client";
import { useActionState } from "react";
import { updateVisit } from "@/app/painel/visitas/actions";
import { PreservedForm } from "./preserved-form";
const labels = {agendada:"Agendada",realizada:"Realizada",cancelada:"Cancelada",nao_compareceu:"Não compareceu"};
export function VisitStatusForm({id,status,feedback}:{id:string;status:string;feedback:string|null}) {
  const [result,action,pending] = useActionState(async (_: {ok:boolean;message:string},data:FormData) => updateVisit(data),{ok:false,message:""});
  return <PreservedForm action={action} className="table-inline-form"><input type="hidden" name="id" value={id}/><select name="status" defaultValue={status} aria-label="Status da visita">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input name="feedback" defaultValue={feedback||""} placeholder="Observação ou feedback" maxLength={4000}/><button className="admin-button secondary" disabled={pending}>Salvar</button>{result.message?<small role="status">{result.message}</small>:null}</PreservedForm>;
}
