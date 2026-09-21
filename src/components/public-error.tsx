"use client";
import { PublicEmptyState } from "./public-empty-state";
export function PublicError({ reset }: { reset?: () => void }) {
  return <section className="section shell"><PublicEmptyState title="Não foi possível carregar os imóveis" description="Pode ser uma instabilidade temporária. Tente novamente em instantes."><button className="button" onClick={reset || (() => window.location.reload())}>Tentar novamente</button></PublicEmptyState></section>;
}
