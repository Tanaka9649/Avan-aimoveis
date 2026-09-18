import { SettingsForm } from "./settings-form";
import { saveClient } from "@/app/painel/clientes/actions";
import { TagInput } from "./tag-input";
type Initial=Record<string,string|number|null>;
export function ClientEditor({initial={}}:{initial?:Initial}){
  const field=(name:string,label:string,type="text",required=false)=><label key={name}>{label}<input name={name} type={type} required={required} min={0} step={type==="number"?"0.01":undefined} defaultValue={initial[name]??""}/></label>;
  return <section className="admin-card client-editor"><SettingsForm action={saveClient} label="Salvar cliente"><input type="hidden" name="id" value={initial.id||""}/>
    <h3 className="form-group-title">Dados do cliente</h3>{field("name","Nome","text",true)}{field("phone","Telefone / WhatsApp","tel",true)}{field("email","E-mail","email")}{field("origin","Origem do contato","text",true)}
    <h3 className="form-group-title">O que ele procura?</h3>{field("budgetMin","Orçamento mínimo (R$)","number")}{field("budgetMax","Orçamento máximo (R$)","number")}
    <TagInput name="desiredTypes" label="Tipos de imóvel" initial={String(initial.desiredTypes||"")} suggestions={["Apartamento","Casa","Cobertura","Studio","Terreno"]}/><TagInput name="desiredRegions" label="Bairros e regiões" initial={String(initial.desiredRegions||"")}/>
    <h3 className="form-group-title">Preferências</h3>{field("minBedrooms","Mínimo de quartos","number")}{field("minBathrooms","Mínimo de banheiros","number")}{field("minParkingSpaces","Mínimo de vagas","number")}
    <TagInput name="desiredFeatures" label="Características desejadas" initial={String(initial.desiredFeatures||"")} suggestions={["Piscina","Varanda","Área gourmet","Elevador","Portaria","Quintal"]}/>
  </SettingsForm></section>;
}
