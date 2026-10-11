"use client";
import { MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { whatsappContactUrl } from "@/lib/contact";

export function PropertyEvents({ propertyId, tenantSlug, whatsapp, message }: { propertyId: string; tenantSlug: string; whatsapp: string; message: string }) {
  useEffect(() => {
    const key = `avan:view:${tenantSlug}:${propertyId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/property-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, tenantSlug, type: "view" }),
    });
  }, [propertyId, tenantSlug]);
  const href = whatsappContactUrl(whatsapp, message);
  if (!href) return null;
  return <a className="button button-accent property-whatsapp" href={href} target="_blank" rel="noreferrer" onClick={() => {
    void fetch("/api/property-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, tenantSlug, type: "whatsapp", source: "property-detail" }),
      keepalive: true,
    });
  }}><MessageCircle/> Falar pelo WhatsApp</a>;
}
