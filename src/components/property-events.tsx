"use client";
import { MessageCircle } from "lucide-react";
import { useEffect } from "react";

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
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  return <a className="button button-accent property-whatsapp" href={href} target="_blank" rel="noreferrer" onClick={() => {
    void fetch("/api/property-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, tenantSlug, type: "whatsapp", source: "property-detail" }),
      keepalive: true,
    });
  }}><MessageCircle/> Falar pelo WhatsApp</a>;
}
