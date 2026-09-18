"use client";

import Link from "next/link";
import {useActionState,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ChevronDown,Edit3,Mail,MessageCircle,Phone,Plus,Search,UserRound} from "lucide-react";
import {CrmDialog} from "./crm-dialog";
import {OpportunityDrawer} from "./opportunity-drawer";
import {saveCrmClient,type CrmClientState} from "@/app/painel/crm/actions";
import {PageHeader} from "@/components/admin-ui";
import {ListFilters,Pagination} from "@/components/list-tools";
import {CrmBoard} from "@/components/crm-board";
import {TagInput} from "@/components/tag-input";
import type {Query} from "@/lib/list-query";
import {maskPhone,moneyDigits} from "@/lib/crm-input";

type Column={id:string;name:string;color:string;isWon:boolean;isLost:boolean};
type DealCard={id:string;title:string;clientId:string;client:string;phone:string;email:string|null;stageId:string;value:string;tags:string[];nextActionAt:string|null;nextActionType:string|null;nextActionNote:string|null;stageDays:number};
export type CrmClient={id:string;name:string;phone:string;email:string|null;origin:string;budgetMin:number|null;budgetMax:number|null;desiredTypes:string[];desiredRegions:string[];desiredFeatures:string[];minBedrooms:number;minBathrooms:number;minParkingSpaces:number;opportunities:number;favorites:number;presented:number;visits:number;proposals:number;history:number;matches:number;nextActionAt:string|null;nextActionType:string|null};

type Drawer={mode:"new"}|{mode:"view"|"edit";client:CrmClient};
const initialState:CrmClientState={ok:false,message:""};
const originOptions=["WhatsApp","Instagram","Facebook","Indicação","Site","Portal imobiliário","Ligação","Cadastro manual"];

function digits(value:string){return value.replace(/\D/g,"");}
function moneyDisplay(value:string|number|null|undefined){if(value===null||value===undefined||value==="")return"";const raw=typeof value==="number"?String(Math.round(value)):digits(String(value));return raw?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(Number(raw)):"";}
function moneyRaw(value:string){return moneyDigits(value)||"";}
function money(value:number|null){return value===null?"Não informado":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(value/100);}

export function ClientForm({client,onClose,onSaved}:{client?:CrmClient;onClose:()=>void;onSaved?:(id:string)=>void}){
 const router=useRouter();
 const[state,action,pending]=useActionState(async(previous:CrmClientState,form:FormData)=>{const result=await saveCrmClient(previous,form);if(result.ok&&result.clientId&&onSaved)onSaved(result.clientId);return result;},initialState);
 const[phone,setPhone]=useState(()=>maskPhone(client?.phone||""));
 const[minBudget,setMinBudget]=useState(()=>moneyDisplay(client&&client.budgetMin!==null?client.budgetMin/100:null));
 const[maxBudget,setMaxBudget]=useState(()=>moneyDisplay(client&&client.budgetMax!==null?client.budgetMax/100:null));
 const hasPreferences=Boolean(client&&(client.budgetMin!==null||client.budgetMax!==null||client.desiredTypes.length||client.desiredRegions.length||client.desiredFeatures.length||client.minBedrooms||client.minBathrooms||client.minParkingSpaces));
 const[preferencesOpen,setPreferencesOpen]=useState(hasPreferences);
 useEffect(()=>{if(state.ok)router.refresh()},[state.ok,router]);
 return <form action={action} className="crm-client-form">
  <input type="hidden" name="id" value={client?.id||""}/>
  <div className="crm-drawer-scroll">
   {state.message?<div className={state.ok?"crm-toast success":"crm-form-message error"} role={state.ok?"status":"alert"}>{state.message}</div>:null}
   {state.ok&&state.clientId?<div className="crm-success-actions"><Link className="admin-button primary" href={`/painel/crm/novo?cliente=${state.clientId}`}>Criar oportunidade agora</Link><button type="button" className="admin-button secondary" onClick={onClose}>Continuar no CRM</button></div>:null}
   {state.duplicate?<div className="duplicate-client"><strong>{state.duplicate.name}</strong><span>Este contato já está cadastrado.</span><div><Link className="admin-button secondary" href={`/painel/crm?view=clientes&cliente=${state.duplicate.id}`}>Abrir cliente</Link><Link className="admin-button primary" href={`/painel/crm/novo?cliente=${state.duplicate.id}`}>Criar oportunidade</Link></div></div>:null}
   <section className="crm-form-section"><header><span>Dados principais</span><p>O essencial para registrar o contato rapidamente.</p></header><div className="crm-form-grid">
    <label>Nome<input name="name" required minLength={2} maxLength={160} defaultValue={client?.name||""} autoComplete="name"/></label>
    <label>Telefone / WhatsApp<input value={phone} onChange={event=>setPhone(maskPhone(event.target.value))} name="phone" required inputMode="tel" placeholder="(34) 99999-9999" autoComplete="tel"/></label>
    <label>E-mail <small>opcional</small><input name="email" type="email" defaultValue={client?.email||""} autoComplete="email"/></label>
    <label>Origem<select name="origin" required defaultValue={client?.origin||"WhatsApp"}>{client?.origin&&!originOptions.includes(client.origin)?<option>{client.origin}</option>:null}{originOptions.map(item=><option key={item}>{item}</option>)}</select></label>
   </div></section>
   <details className="crm-preferences" open={preferencesOpen} onToggle={event=>setPreferencesOpen(event.currentTarget.open)}><summary><div><strong>Adicionar preferências de imóvel</strong><span>Orçamento, tipos, regiões e características.</span></div><ChevronDown/></summary><div className="crm-preferences-body">
    <section className="crm-form-section"><header><span>O que o cliente procura?</span></header><div className="crm-form-grid">
     <label>Orçamento mínimo<input value={minBudget} onChange={event=>setMinBudget(moneyDisplay(event.target.value))} inputMode="numeric" placeholder="R$ 300.000"/><input type="hidden" name="budgetMin" value={moneyRaw(minBudget)}/></label>
     <label>Orçamento máximo<input value={maxBudget} onChange={event=>setMaxBudget(moneyDisplay(event.target.value))} inputMode="numeric" placeholder="R$ 500.000"/><input type="hidden" name="budgetMax" value={moneyRaw(maxBudget)}/></label>
     <TagInput name="desiredTypes" label="Tipos de imóvel" initial={client?.desiredTypes.join(", ")||""} suggestions={["Casa","Apartamento","Terreno","Cobertura","Studio"]}/>
     <TagInput name="desiredRegions" label="Bairros e regiões" initial={client?.desiredRegions.join(", ")||""} suggestions={["Centro","Cidade das Águas"]}/>
    </div></section>
    <section className="crm-form-section"><header><span>Preferências</span></header><div className="crm-form-grid crm-small-fields">
     <label>Quartos<input name="minBedrooms" type="number" min="0" max="100" defaultValue={client?.minBedrooms||0}/></label><label>Banheiros<input name="minBathrooms" type="number" min="0" max="100" defaultValue={client?.minBathrooms||0}/></label><label>Vagas<input name="minParkingSpaces" type="number" min="0" max="100" defaultValue={client?.minParkingSpaces||0}/></label>
     <TagInput name="desiredFeatures" label="Características desejadas" initial={client?.desiredFeatures.join(", ")||""} suggestions={["Piscina","Área gourmet","Varanda","Elevador","Energia solar","Quintal"]}/>
    </div></section>
   </div></details>
  </div>
  <footer className="crm-drawer-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Cancelar</button><button className="admin-button primary" disabled={pending||state.ok}>{pending?"Salvando…":client?"Salvar alterações":"Salvar cliente"}</button></footer>
 </form>;
}

function ClientSummary({client,onEdit}:{client:CrmClient;onEdit:()=>void}){
 return <div className="crm-drawer-scroll client-summary">
  <section><h3>Contato</h3><a href={`tel:${client.phone}`}><Phone/> {maskPhone(client.phone)}</a><a href={`https://wa.me/55${digits(client.phone)}`} target="_blank" rel="noreferrer"><MessageCircle/> Abrir WhatsApp</a>{client.email?<a href={`mailto:${client.email}`}><Mail/> {client.email}</a>:<p>Sem e-mail</p>}<p>Origem: {client.origin}</p></section>
  <section><h3>O que procura</h3><p>Orçamento: {money(client.budgetMin)} a {money(client.budgetMax)}</p><p>Tipos: {client.desiredTypes.join(", ")||"Não informado"}</p><p>Regiões: {client.desiredRegions.join(", ")||"Não informado"}</p><p>Preferências: {client.desiredFeatures.join(", ")||"Não informado"}</p></section>
  <section><h3>Relacionamento</h3><div className="client-stat-grid"><span><b>{client.matches}</b>Match</span><span><b>{client.favorites}</b>Favoritos</span><span><b>{client.presented}</b>Apresentados</span><span><b>{client.history}</b>Histórico</span><span><b>{client.visits}</b>Visitas</span><span><b>{client.proposals}</b>Propostas</span></div></section>
  <section><h3>Próxima ação</h3>{client.nextActionAt?<><p>{client.nextActionType||"Próxima ação"}</p><time>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(client.nextActionAt))}</time></>:<p>Nenhuma ação agendada.</p>}</section>
  <footer className="crm-drawer-actions"><button type="button" className="admin-button secondary" onClick={onEdit}><Edit3/> Editar cliente</button><Link className="admin-button primary" href={`/painel/crm/novo?cliente=${client.id}`}>Nova oportunidade</Link></footer>
 </div>;
}

function ClientDrawer({drawer,onClose,onEdit}:{drawer:Drawer;onClose:()=>void;onEdit:(client:CrmClient)=>void}){
 const client="client" in drawer?drawer.client:undefined;
 return <CrmDialog title={drawer.mode==="new"?"Novo cliente":client?.name||"Cliente"} description={drawer.mode==="view"?"Contato, preferências e relacionamento em um só lugar.":"Cadastre os dados essenciais e complemente as preferências quando quiser."} onClose={onClose}>{drawer.mode==="view"&&client?<ClientSummary client={client} onEdit={()=>onEdit(client)}/>:<ClientForm key={`${drawer.mode}-${client?.id||"new"}`} client={client} onClose={onClose}/>}</CrmDialog>;
}

export function CrmWorkspace({userId,query,view,columns,cards,clients,dealTotal,clientTotal,selectedClientId,openNew}:{userId:string;query:Query;view:"funil"|"clientes";columns:Column[];cards:DealCard[];clients:CrmClient[];dealTotal:number;clientTotal:number;selectedClientId?:string;openNew?:boolean}){
 const selected=useMemo(()=>clients.find(client=>client.id===selectedClientId),[clients,selectedClientId]);
 const[drawer,setDrawer]=useState<Drawer|null>(()=>openNew?{mode:"new"}:selected?{mode:"view",client:selected}:null);
 const[opportunity,setOpportunity]=useState(false);const[notice,setNotice]=useState(query.criado?"Oportunidade criada com sucesso.":"");
 const queryText=typeof query.q==="string"?query.q:"";
 const queryForFilters:Query=queryText?{q:queryText}:{};
 return <div className="admin-content crm-center">
  <PageHeader eyebrow="Relacionamento" title="CRM comercial" description={view==="funil"?`${dealTotal} negócios no funil. Acompanhe cada oportunidade por etapa.`:`${clientTotal} contatos na base comercial.`} action={<div className="crm-header-actions"><button className="admin-button primary" onClick={()=>setDrawer({mode:"new"})}><Plus/> Novo cliente</button><button className="admin-button secondary" onClick={()=>setOpportunity(true)}>Nova oportunidade</button></div>}/>
  {notice?<div role="status" className="crm-toast success">{notice}<button type="button" onClick={()=>setNotice("")} aria-label="Dispensar mensagem">×</button></div>:null}
  <nav className="crm-view-tabs" aria-label="Visualização do CRM"><Link className={view==="funil"?"active":""} href={queryText?`/painel/crm?q=${encodeURIComponent(queryText)}`:"/painel/crm"}>Funil</Link><Link className={view==="clientes"?"active":""} href={`/painel/crm?view=clientes${queryText?`&q=${encodeURIComponent(queryText)}`:""}`}>Clientes</Link></nav>
  <ListFilters scope="crm" userId={userId} query={queryForFilters}><input type="hidden" name="view" value={view}/></ListFilters>
  {view==="funil"?<CrmBoard columns={columns} cards={cards}/>:clients.length?<section className="crm-client-list" aria-label="Clientes do CRM">{clients.map(client=><article key={client.id}><button className="client-row-main" onClick={()=>setDrawer({mode:"view",client})}><span className="client-avatar"><UserRound/></span><div><strong>{client.name}</strong><small>{maskPhone(client.phone)} · {client.email||"Sem e-mail"}</small></div></button><span className="source-tag">{client.origin}</span><div className="client-row-meta"><span>{money(client.budgetMax)}</span><small>{client.desiredRegions.join(", ")||"Região não informada"}</small></div><div className="client-row-meta"><span>{client.opportunities} oportunidade(s)</span><small>{client.nextActionAt?`${client.nextActionType||"Próxima ação"} · ${new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(client.nextActionAt))}`:"Sem próxima ação"}</small></div><div className="client-row-actions"><button type="button" onClick={()=>setDrawer({mode:"view",client})}>Abrir</button><button type="button" onClick={()=>setDrawer({mode:"edit",client})}>Editar</button><Link href={`/painel/crm/novo?cliente=${client.id}`}>Criar oportunidade</Link></div></article>)}</section>:<section className="crm-clients-empty"><Search/><h2>Nenhum cliente cadastrado</h2><p>Cadastre o primeiro contato para começar o atendimento.</p><button className="admin-button primary" onClick={()=>setDrawer({mode:"new"})}><Plus/> Novo cliente</button></section>}
  {view==="clientes"?<Pagination query={{...query,view}} page={Number(query.page)||1} total={clientTotal}/>:null}
  {drawer?<ClientDrawer drawer={drawer} onClose={()=>setDrawer(null)} onEdit={client=>setDrawer({mode:"edit",client})}/>:null}
  {opportunity?<OpportunityDrawer onClose={()=>setOpportunity(false)} onSaved={()=>{setOpportunity(false);setNotice("Oportunidade criada com sucesso.");}}/>:null}
 </div>;
}
