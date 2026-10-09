"use client";

import { useState } from "react";

export function AdminSectionTabs({
  items,
  initial,
}: {
  items: { id: string; label: string; content: React.ReactNode }[];
  initial?: string;
}) {
  const [active, setActive] = useState(initial || items[0]?.id || "");
  const selected = items.find((item) => item.id === active) || items[0];
  if (!selected) return null;
  return (
    <div className="admin-section-tabs">
      <div className="admin-tabs admin-section-tabbar" role="tablist" aria-label="Seções">
        {items.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === selected.id} onClick={() => setActive(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="admin-section-tabcontent" role="tabpanel">{selected.content}</div>
    </div>
  );
}
