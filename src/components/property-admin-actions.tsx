"use client";
import { Copy, ExternalLink, MessageCircle, Share2, X } from "lucide-react";
import { useState } from "react";
export function PropertyAdminActions({
  id,
  title,
  slug,
  price,
  region,
  published,
}: {
  id: string;
  title: string;
  slug: string;
  price: string;
  region: string;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/imoveis/${slug}`;
  const message = `Olá! Separei este imóvel que pode fazer sentido para você:\n\n${title}\n${price}\n${region}\n\n${link}`;
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setOpen(false);
  }
  return (
    <>
      <button
        className="row-menu-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Share2 /> Compartilhar
      </button>
      {open ? (
        <div
          className="share-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Compartilhar imóvel"
        >
          <button
            className="drawer-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
          />
          <div>
            <header>
              <h2>Compartilhar imóvel</h2>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <p>{title}</p>
            <a href={`/api/properties/${id}/pdf`}>
              <ExternalLink /> Gerar PDF
            </a>
            {published ? (
              <>
                <button onClick={() => copy(link)}>
                  <Copy /> Copiar link
                </button>
                <button onClick={() => copy(message)}>
                  <Copy /> Copiar mensagem
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                >
                  <MessageCircle /> Abrir WhatsApp
                </a>
                <a href={`/imoveis/${slug}`} target="_blank">
                  <ExternalLink /> Ver no site
                </a>
              </>
            ) : (
              <p className="muted-copy">
                Publique o imóvel para liberar o link público.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
