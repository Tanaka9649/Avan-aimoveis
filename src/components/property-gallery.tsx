"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { PublicPhoto } from "@/data/properties";
import { PHOTO_SIZES, photoUrl } from "@/lib/photos";
import "./property-gallery.css";

/**
 * Photo gallery for the public listing page.
 *
 * The grid shows medium-sized pictures; the full-resolution file is only requested when the
 * visitor actually opens the fullscreen view, and only for the photo being viewed.
 */
export function PropertyGallery({ photos, title }: { photos: PublicPhoto[]; title: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const total = photos.length;
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = openAt !== null;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const node = dialog.current;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);

  if (!total) return <div className="gallery-empty"><p>As fotos deste imóvel serão publicadas em breve.</p></div>;

  const [cover, ...rest] = photos;
  return (
    <>
      <div className="gallery">
        <button type="button" className="gallery-main" onClick={() => setOpenAt(0)} aria-label={`Ampliar foto 1 de ${total}`}>
          <Image src={cover.url} alt={cover.alt || title} fill priority sizes={PHOTO_SIZES.gallery} placeholder="blur" blurDataURL={cover.blur} unoptimized />
          <span className="gallery-expand"><Expand size={15} aria-hidden="true" /> {total} foto{total > 1 ? "s" : ""}</span>
        </button>
        {rest.slice(0, 2).map((photo, index) => (
          <button type="button" className="gallery-small" key={photo.id} onClick={() => setOpenAt(index + 1)} aria-label={`Ampliar foto ${index + 2} de ${total}`}>
            <Image src={photo.url} alt={photo.alt || title} fill loading="lazy" sizes="(max-width: 760px) 50vw, 320px" placeholder="blur" blurDataURL={photo.blur} unoptimized />
            {index === 1 && total > 3 ? <span className="gallery-more">+{total - 3}</span> : null}
          </button>
        ))}
      </div>
      {total > 3 ? (
        <div className="gallery-strip">
          {photos.slice(3).map((photo, index) => (
            <button type="button" key={photo.id} onClick={() => setOpenAt(index + 3)} aria-label={`Ampliar foto ${index + 4} de ${total}`}>
              <Image src={photoUrl(photo.id, "thumb")} alt={photo.alt || title} fill loading="lazy" sizes={PHOTO_SIZES.thumbnail} placeholder="blur" blurDataURL={photo.blur} unoptimized />
            </button>
          ))}
        </div>
      ) : null}
      {openAt !== null ? (
        <dialog ref={dialog} className="gallery-lightbox" aria-label={`Fotos de ${title}`} onCancel={() => setOpenAt(null)} onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); setOpenAt((openAt + 1) % total); }
          if (event.key === "ArrowLeft") { event.preventDefault(); setOpenAt((openAt - 1 + total) % total); }
        }}>
          <button className="gallery-close" onClick={() => setOpenAt(null)} aria-label="Fechar galeria"><X /></button>
          <button className="gallery-previous" onClick={() => setOpenAt((openAt - 1 + total) % total)} aria-label="Foto anterior"><ChevronLeft /></button>
          <figure>
            <Image
              src={photoUrl(photos[openAt].id, "full")}
              alt={photos[openAt].alt || title}
              fill
              sizes="100vw"
              placeholder="blur"
              blurDataURL={photos[openAt].blur}
              unoptimized
            />
            <figcaption>{openAt + 1} de {total}</figcaption>
          </figure>
          <button className="gallery-next" onClick={() => setOpenAt((openAt + 1) % total)} aria-label="Próxima foto"><ChevronRight /></button>
        </dialog>
      ) : null}
    </>
  );
}
