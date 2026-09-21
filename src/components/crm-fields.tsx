"use client";
import {useId,useState} from "react";
import Image from "next/image";
import {Search,X} from "lucide-react";
export function MoneyField({name,label,initial="",required=false}:{name:string;label:string;initial?:string;required?:boolean}){
 const[cents,setCents]=useState(initial?String(Math.round(Number(initial)*100)):"");
 return <label>{label}<input inputMode="decimal" required={required} value={cents?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(cents)/100):""} placeholder="R$ 0,00" onChange={e=>setCents(e.target.value.replace(/\D/g,"").slice(0,10))}/><input type="hidden" name={name} value={cents?(Number(cents)/100).toFixed(2):""}/></label>;
}
type Option={id:string;label:string;detail?:string;image?:string|null};
export function SearchPicker({label,name,options,value,onChange,multiple=false,disabled=false}:{label:string;name:string;options:Option[];value:string[];onChange:(ids:string[])=>void;multiple?:boolean;disabled?:boolean}){
 const[search,setSearch]=useState("");const[open,setOpen]=useState(false);const id=useId();
 const matches=options.filter(o=>`${o.label} ${o.detail||""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).slice(0,40);
 return <div className="crm-search-picker"><label htmlFor={id}>{label}</label>{value.map(v=><input key={v} type="hidden" name={name} value={v}/>)}{!multiple&&!value.length?<input type="hidden" name={name} value=""/>:null}<div className="crm-selected-tags">{value.map(v=>{const o=options.find(o=>o.id===v);return o?<span key={v}>{o.label}{!disabled?<button type="button" aria-label={`Remover ${o.label}`} onClick={()=>onChange(value.filter(x=>x!==v))}><X size={12}/></button>:null}</span>:null;})}</div>
 {!disabled?<><div className="crm-picker-search"><Search size={16}/><input id={id} value={search} placeholder={multiple?"Buscar imóvel…":"Buscar cliente…"} role="combobox" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-options`} onFocus={()=>setOpen(true)} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setOpen(false);}if(e.key==="ArrowDown"){e.preventDefault();document.getElementById(`${id}-options`)?.querySelector<HTMLButtonElement>("button")?.focus();}}}/></div>{open?<div id={`${id}-options`} className="crm-picker-options" role="dialog" aria-label={label}>{matches.map(o=><button type="button" key={o.id} aria-pressed={value.includes(o.id)} onClick={()=>{onChange(multiple?(value.includes(o.id)?value.filter(v=>v!==o.id):[...value,o.id]):[o.id]);setSearch("");if(!multiple)setOpen(false);}}>{o.image?<Image unoptimized src={o.image} alt="" width={48} height={40}/>:null}<span><strong>{o.label}</strong><small>{o.detail}</small></span><span>{value.includes(o.id)?"✓":"+"}</span></button>)}{!matches.length?<p>Nenhum resultado encontrado.</p>:null}<button type="button" onClick={()=>setOpen(false)}>Concluir seleção</button></div>:null}</>:null}</div>;
}
// The date picker lives in ./date-time-fields so CRM, visitas and propostas share one implementation.
export { DateField as DatePicker } from "./date-time-fields";
