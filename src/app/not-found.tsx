import Link from "next/link";
import { tenantForRequest, tenantPublicPathBase } from "@/lib/tenant";
export default async function NotFound(){
  const tenant=await tenantForRequest();
  return <section className="not-found"><span>404</span><h1>Este endereço não está disponível.</h1><p>Talvez o imóvel tenha saído do catálogo ou o link esteja incorreto.</p>{tenant?<Link className="button button-dark" href={`${tenantPublicPathBase(tenant)}/imoveis`}>Ver imóveis disponíveis</Link>:null}</section>;
}
