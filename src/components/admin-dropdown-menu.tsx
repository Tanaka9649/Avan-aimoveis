"use client";

import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Position = { top: number; left: number };

export function AdminDropdownMenu({
  label = "Mais ações",
  className = "",
  buttonClassName = "",
  width = 220,
  children,
}: {
  label?: string;
  className?: string;
  buttonClassName?: string;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);
    const left = Math.min(Math.max(margin, rect.right - menuRect.width), maxLeft);
    const roomBelow = window.innerHeight - rect.bottom - margin;
    const roomAbove = rect.top - margin;
    const top = roomBelow >= menuRect.height || roomBelow >= roomAbove
      ? Math.min(window.innerHeight - menuRect.height - margin, rect.bottom + 6)
      : Math.max(margin, rect.top - menuRect.height - 6);
    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const reposition = () => place();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    requestAnimationFrame(() => {
      place();
      const first = menuRef.current?.querySelector<HTMLElement>("button:not(:disabled),a[href],[tabindex]:not([tabindex='-1'])");
      first?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [close, open, place]);

  return (
    <span className={"admin-dropdown " + className}>
      <button
        ref={triggerRef}
        type="button"
        className={"admin-dropdown-trigger " + buttonClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
          <>
            <button className="admin-dropdown-backdrop" type="button" aria-label="Fechar menu" onClick={close} />
            <div
              ref={menuRef}
              className="admin-dropdown-menu"
              role="menu"
              style={{ top: position.top, left: position.left, width }}
              onClick={(event) => event.stopPropagation()}
            >
              {children(close)}
            </div>
          </>,
          document.querySelector(".admin-app") || document.body,
        )
        : null}
    </span>
  );
}
