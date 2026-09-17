"use client";
import {useState} from "react";
import {SettingsForm} from "./settings-form";
import {saveDeal} from "@/app/painel/crm/actions";
type Choices={clients:{id:string;name:string;assignedTo:string|null}[];stages:{id:string;name:string}[];properties:{id:string;title:string;code:string}[];team:{id:string;name:string}[]};
export function DealEditor({choices,initial={},selected=[]}:{choices:Choices;initial?:Record<string,string>;selected?:string[]}){
 const [clientId,setClientId]=useState(initial.clientId||choices.clients[0]?.id||"");const client=choices.clients.find(c=>c.id===clientId);
 const local=initial.nextActionAt?new Date(initial.nextActionAt):null;const localValue=local?new Date(local.getTime()-local.getTimezoneOffset()*60000).toISOString().slice(0,16):"";
 return <SettingsForm action={saveDeal} label="Salvar oportunidade"><input type="hidden" name="id" value={initial.id||""}/><label>Cliente<select name="clientId" required value={clientId} onChange={e=>setClientId(e.target.value)} disabled={!!initial.id}>{choices.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{initial.id?<input type="hidden" name="clientId" value={clientId}/>:null}
 <label>Título<input name="title" required minLength={3} maxLength={180} defaultValue={initial.title}/></label><label>Etapa<select name="stageId" defaultValue={initial.stageId}>{choices.stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Valor estimado (R$)<input name="amount" type="number" min="0" step="0.01" defaultValue={initial.amount}/></label>
 <label>Próxima ação<input type="datetime-local" defaultValue={localValue} onChange={e=>{const hidden=e.currentTarget.form?.elements.namedItem("nextActionAt") as HTMLInputElement;hidden.value=e.target.value?new Date(e.target.value).toISOString():"";}}/></label><input type="hidden" name="nextActionAt" defaultValue={initial.nextActionAt||""}/>
 {choices.team.length?<label>Responsável pelo cliente<select name="assignedTo" key={clientId} defaultValue={client?.assignedTo||""}><option value="">Sem responsável</option>{choices.team.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>:<input type="hidden" name="assignedTo" value={client?.assignedTo||""}/>}
 <label className="wide">Imóveis de interesse<select name="propertyIds" multiple defaultValue={selected} size={Math.min(6,Math.max(2,choices.properties.length))}>{choices.properties.map(p=><option value={p.id} key={p.id}>{p.code} — {p.title}</option>)}</select><small>Use Ctrl/Cmd para selecionar mais de um imóvel.</small></label>
 <label className="wide">Motivo da perda (obrigatório na etapa Perdido)<textarea name="lostReason" maxLength={2000} defaultValue={initial.lostReason}/></label><label className="wide">Registrar nota<textarea name="note" maxLength={10000}/></label></SettingsForm>;
}
