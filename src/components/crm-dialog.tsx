"use client";
import {useEffect,useId,useRef,type ReactNode} from "react";
import {X} from "lucide-react";
import "./crm-operational.css";

/** Native top layer avoids inherited stacking contexts; showModal makes the background inert. */
export function CrmDialog({title,description,children,onClose,compact=false}:{title:string;description?:string;children:ReactNode;onClose:()=>void;compact?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);const heading=useId();
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;dialog?.showModal();document.body.style.overflow="hidden";return()=>{dialog?.close();document.body.style.overflow=overflow;previous?.focus();}},[]);
 return <dialog ref={ref} className={`crm-modal${compact?" crm-modal-compact":""}`} aria-labelledby={heading} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose();}}}>
  <header className="crm-client-drawer-header"><div><small>CRM · Avança Imóveis</small><h2 id={heading}>{title}</h2>{description?<p>{description}</p>:null}</div><button type="button" aria-label="Fechar" onClick={onClose}><X/></button></header>{children}
 </dialog>;
}
