export function PublicLoading() {
  return <section className="shell public-loading" role="status" aria-label="Carregando imóveis"><p>Preparando os imóveis para você…</p><div className="public-loading-grid" aria-hidden="true">{[0,1,2].map(n => <div className="public-loading-block" key={n}/>)}</div></section>;
}
