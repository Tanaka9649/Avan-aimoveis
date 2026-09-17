import Link from "next/link";
export default function NotFound(){return <section className="not-found"><span>404</span><h1>Este endereço não está disponível.</h1><p>Talvez o imóvel tenha saído do catálogo ou o link esteja incorreto.</p><Link className="button button-dark" href="/imoveis">Ver imóveis disponíveis</Link></section>}
