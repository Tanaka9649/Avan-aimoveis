"use client";
import {useEffect,useState} from "react";
import {dealChoices} from "@/app/painel/crm/actions";
import {DealEditor,type DealChoices} from "./deal-editor";
import {CrmDialog} from "./crm-dialog";
export function OpportunityDrawer({onClose,onSaved,clientId}:{onClose:()=>void;onSaved:()=>void;clientId?:string}){
 const[choices,setChoices]=useState<DealChoices|null>(null);const[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;dealChoices().then(data=>{if(active)setChoices(data);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
 return <CrmDialog title="Nova oportunidade" description="Um novo negócio, sem sair do CRM." onClose={onClose}>{choices?<DealEditor choices={choices} initial={{clientId:clientId||""}} onCancel={onClose} onSaved={onSaved}/>:<p className="crm-drawer-scroll" role="status">{failed?"Não foi possível carregar. Feche e tente novamente.":"Carregando clientes e imóveis…"}</p>}</CrmDialog>;
}
