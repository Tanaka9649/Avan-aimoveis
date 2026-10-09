"use client";
import Link from "next/link";
import { Check, Copy, ExternalLink, FileText, Globe, Link2Off, MessageCircle, MoreHorizontal, Share2, UploadCloud, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { publishProperty, unpublishProperty } from "@/app/painel/imoveis/actions";
import { registerPresentation } from "@/app/painel/clientes/actions";
import { formatMoney } from "@/lib/format";
import { isPubliclyVisible, publicPropertyPath, publicPropertyUrl, sharePropertyMessage, siteVisibility, whatsappShareUrl } from "@/lib/property-publication";
import "./property-share.css";

export type SharableProperty = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  priceCents: number;
  neighborhood: string;
  city: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
};

export type ShareClientContext = { id: string; name: string; phone?: string | null };

function useToast() {
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  return [toast, setToast] as const;
}

/**
 * Share dialog for one property.
 *
 * Every button works on the real public URL. When the listing is not published yet the dialog says
 * so and offers to publish right there, then switches to the full set of actions without a reload.
 */
export function PropertyShareDialog({ property, client, onClose }: { property: SharableProperty; client?: ShareClientContext; onClose: () => void }) {
  const [current, setCurrent] = useState(property);
  const [toast, setToast] = useToast();
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [presented, setPresented] = useState(false);
  const [pending, startTransition] = useTransition();
  const live = isPubliclyVisible(current);
  const link = publicPropertyUrl(current.slug);
  const message = sharePropertyMessage(current);

  async function copy(value: string, confirmation: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(confirmation);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  function publishNow() {
    setError("");
    setMissing([]);
    startTransition(async () => {
      const result = await publishProperty(current.id);
      if (!result.ok) {
        setError(result.message);
        setMissing(result.missing || []);
        return;
      }
      setCurrent((value) => ({ ...value, status: "disponivel", publishedAt: new Date().toISOString() }));
      setToast("Imóvel publicado no site.");
    });
  }

  function markPresented(channel: "link" | "whatsapp") {
    if (!client || presented) return;
    const data = new FormData();
    data.set("clientId", client.id);
    data.set("propertyId", current.id);
    data.set("channel", channel);
    startTransition(async () => {
      await registerPresentation(data);
      setPresented(true);
      setToast(`Registrado como apresentado para ${client.name}.`);
    });
  }

  return (
    <div className="share-dialog" role="dialog" aria-modal="true" aria-label="Compartilhar imóvel">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Fechar" />
      <div>
        <header>
          <h2>Compartilhar imóvel</h2>
          <button onClick={onClose} aria-label="Fechar"><X /></button>
        </header>
        <p className="share-property-name">{current.title}</p>
        <p className="share-property-meta">{formatMoney(current.priceCents)} · {current.neighborhood}, {current.city}</p>

        {live ? (
          <>
            <code className="share-link">{publicPropertyPath(current.slug)}</code>
            <button onClick={() => { copy(link, "Link copiado."); markPresented("link"); }}><Copy /> Copiar link</button>
            <button onClick={() => { copy(message, "Mensagem copiada."); markPresented("link"); }}><Copy /> Copiar mensagem</button>
            <a href={whatsappShareUrl(message, client?.phone)} target="_blank" rel="noreferrer" onClick={() => markPresented("whatsapp")}>
              <MessageCircle /> Abrir WhatsApp{client?.phone ? ` com ${client.name.split(" ")[0]}` : ""}
            </a>
            <a href={`/api/properties/${current.id}/pdf`}><FileText /> Gerar PDF</a>
            <a href={publicPropertyPath(current.slug)} target="_blank" rel="noreferrer"><ExternalLink /> Ver no site</a>
          </>
        ) : (
          <>
            <p className="share-warning">
              {current.publishedAt
                ? `Este imóvel está publicado, mas fora do catálogo: ${siteVisibility(current).detail.toLowerCase()}.`
                : "Este imóvel ainda não está publicado."}
            </p>
            {current.status !== "vendido" ? (
              <button className="share-primary" onClick={publishNow} disabled={pending}>
                <UploadCloud /> {pending ? "Publicando…" : "Publicar agora"}
              </button>
            ) : null}
            <a href={`/api/properties/${current.id}/pdf`}><FileText /> Gerar PDF</a>
            {missing.length ? (
              <ul className="share-missing">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
          </>
        )}

        {client && live ? (
          <p className="share-presented">
            {presented ? <><Check size={14} /> Registrado no histórico de {client.name}.</> : `Ao copiar ou enviar, marcamos este imóvel como apresentado para ${client.name}.`}
          </p>
        ) : null}
        {error ? <p className="share-error" role="alert">{error}</p> : null}
        {toast ? <p className="share-toast" role="status">{toast}</p> : null}
      </div>
    </div>
  );
}

/** "Compartilhar" button plus the dialog, for lists and detail screens. */
export function PropertyShareButton({ property, client, label = "Compartilhar" }: { property: SharableProperty; client?: ShareClientContext; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="row-menu-button" type="button" onClick={() => setOpen(true)}><Share2 /> {label}</button>
      {open ? <PropertyShareDialog property={property} client={client} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** The card's "…" menu: publish, open on the site, unpublish — without crowding the card. */
export function PropertyPublicationMenu({ property }: { property: SharableProperty }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const live = isPubliclyVisible(property);
  const published = !!property.publishedAt;

  function run(action: () => Promise<{ ok: boolean; message: string; missing?: string[] }>) {
    setFeedback("");
    startTransition(async () => {
      const result = await action();
      setFeedback(result.ok ? result.message : [result.message, ...(result.missing || [])].join(" "));
      if (result.ok) setOpen(false);
    });
  }

  return (
    <details className="property-menu" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-label="Mais ações"><MoreHorizontal /></summary>
      <div>
        {live ? (
          <>
            <Link href={publicPropertyPath(property.slug)} target="_blank" rel="noreferrer"><ExternalLink /> Ver no site</Link>
            <button type="button" disabled={pending} onClick={() => run(() => unpublishProperty(property.id))}><Link2Off /> Despublicar</button>
          </>
        ) : (
          <button type="button" disabled={pending || property.status === "vendido"} onClick={() => run(() => publishProperty(property.id))}>
            <Globe /> {published ? "Republicar no site" : "Publicar no site"}
          </button>
        )}
        <a href={`/api/properties/${property.id}/pdf`}><FileText /> Gerar PDF</a>
        {feedback ? <p role="status">{feedback}</p> : null}
      </div>
    </details>
  );
}
