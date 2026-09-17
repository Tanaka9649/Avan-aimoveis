"use client";

import { useState, type ReactNode } from "react";

export function AdminTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  return <>
    <div className="admin-tabs" role="tablist" aria-label="Visualização">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)}>{tab.label}</button>)}
    </div>
    {tabs.map((tab) => <div key={tab.id} role="tabpanel" hidden={active !== tab.id}>{tab.content}</div>)}
  </>;
}
