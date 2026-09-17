import {dealChoices} from "../actions";
import {DealEditor} from "@/components/deal-editor";
import {PageHeader} from "@/components/admin-ui";
import Link from "next/link";
export default async function Page({searchParams}:{searchParams:Promise<{cliente?:string}>}){const choices=await dealChoices();const q=await searchParams;return <div className="admin-content"><PageHeader title="Nova oportunidade" eyebrow="CRM"/><section className="admin-card">{choices.clients.length?<DealEditor choices={choices} initial={{clientId:choices.clients.find(c=>c.id===q.cliente)?.id||choices.clients[0].id}}/>:<p>Cadastre um cliente antes de criar uma oportunidade. <Link href="/painel/clientes/novo">Cadastrar cliente</Link></p>}</section></div>;}
