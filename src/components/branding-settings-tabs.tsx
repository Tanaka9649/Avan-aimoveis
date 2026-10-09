"use client";

import { useState, type ReactNode } from "react";

export function BrandingSettingsTabs({ details, logos }: { details: ReactNode; logos: ReactNode }) {
  const [tab, setTab] = useState<"details" | "logos">("details");
  return (
    <div className="branding-settings-tabs">
      <div className="admin-tabs branding-tab-buttons" role="tablist" aria-label="Configurações de identidade">
        <button type="button" role="tab" aria-selected={tab === "details"} className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>Dados e site</button>
        <button type="button" role="tab" aria-selected={tab === "logos"} className={tab === "logos" ? "active" : ""} onClick={() => setTab("logos")}>Logos do site</button>
      </div>
      <div role="tabpanel">{tab === "details" ? details : logos}</div>
    </div>
  );
}
