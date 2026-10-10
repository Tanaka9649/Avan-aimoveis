"use client";

import { useState } from "react";

export function AdminSectionTabs({
  items,
  initial,
  urlParam = "aba",
}: {
  items: { id: string; label: string; content: React.ReactNode }[];
  initial?: string;
  urlParam?: string;
}) {
  const initialId = items.some((item) => item.id === initial) ? initial : items[0]?.id;
  const [active, setActive] = useState(initialId || "");
  const selected = items.find((item) => item.id === active) || items[0];
  if (!selected) return null;

  const select = (id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set(urlParam, id);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="admin-section-tabs">
      <div className="admin-tabs admin-section-tabbar" role="tablist" aria-label="Seções">
        {items.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === selected.id} onClick={() => select(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="admin-section-tabcontent" role="tabpanel">{selected.content}</div>
    </div>
  );
}
