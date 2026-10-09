"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

export function AdminDrawerComposer({
  label,
  title,
  description,
  showPlus = false,
  children,
  variant = "primary",
}: {
  label: string;
  title: string;
  description?: string;
  showPlus?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button className={`admin-button ${variant}`} type="button" onClick={() => setOpen(true)}>
        {showPlus ? <Plus aria-hidden="true"/> : null}
        {label}
      </button>
      {open ? (
        <>
          <button className="drawer-backdrop admin-editor-backdrop" type="button" aria-label="Fechar" onClick={() => setOpen(false)}/>
          <aside className="admin-editor-drawer" role="dialog" aria-modal="true" aria-label={title}>
            <header>
              <div><span>Cadastro</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
              <button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X/></button>
            </header>
            <div className="admin-editor-drawer-body">{children}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}
