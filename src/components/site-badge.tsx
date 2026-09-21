import { Globe, Link2Off } from "lucide-react";
import { siteVisibility, type PublicationState } from "@/lib/property-publication";

/** Answers "esse imóvel está visível no site?" at a glance, next to the commercial status. */
export function SiteBadge({ property }: { property: PublicationState }) {
  const state = siteVisibility(property);
  return (
    <span className={`site-badge ${state.published ? "is-live" : "is-offline"}`} title={state.detail}>
      {state.published ? <Globe size={12} aria-hidden="true" /> : <Link2Off size={12} aria-hidden="true" />}
      {state.label}
    </span>
  );
}
