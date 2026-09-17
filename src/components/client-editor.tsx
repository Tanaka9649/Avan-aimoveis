import { SettingsForm } from "./settings-form";
import { saveClient } from "@/app/painel/clientes/actions";
type Initial=Record<string,string|number|null>;
export function ClientEditor({initial={}}:{initial?:Initial}){
  const field=(name:string,label:string,type="text",required=false)=><label key={name}>{label}<input name={name} type={type} required={required} min={0} step={type==="number"?"0.01":undefined} defaultValue={initial[name]??""}/></label>;
  return <section className="admin-card"><SettingsForm action={saveClient} label="Salvar cliente"><input type="hidden" name="id" value={initial.id||""}/>
    {field("name","Nome","text",true)}{field("phone","Telefone / WhatsApp","tel",true)}{field("email","E-mail","email")}{field("origin","Origem do contato","text",true)}
    {field("budgetMin","Orçamento mínimo (R$)","number")}{field("budgetMax","Orçamento máximo (R$)","number")}
    {field("desiredTypes","Tipos de imóvel (separados por vírgula)")}{field("desiredRegions","Bairros / regiões (separados por vírgula)")}
    {field("minBedrooms","Mínimo de quartos","number")}{field("minBathrooms","Mínimo de banheiros","number")}{field("minParkingSpaces","Mínimo de vagas","number")}
    <label className="wide">Características desejadas<textarea name="desiredFeatures" defaultValue={initial.desiredFeatures||""} placeholder="Varanda, elevador, piscina…"/></label>
  </SettingsForm></section>;
}
