import { createHmac } from "node:crypto";

export function approximateCoordinate(value: number, propertyId: string, axis: "lat" | "lng", pepper = process.env.IP_HASH_PEPPER) {
  if (!pepper) return Math.round(value * 100) / 100;
  const digest = createHmac("sha256", pepper).update(`${propertyId}:${axis}`).digest();
  const normalized = digest.readUInt16BE(0) / 65535 - 0.5;
  return Number((Math.round(value * 100) / 100 + normalized * 0.006).toFixed(4));
}
