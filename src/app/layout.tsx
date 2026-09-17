import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brand, siteUrl } from "@/lib/brand";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const serif = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"] });

export const metadata: Metadata = { metadataBase: new URL(siteUrl()), title: { default: `${brand.name} — imóveis selecionados`, template: `%s | ${brand.name}` }, description: brand.tagline, icons: { icon: "/favicon.svg" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body className={`${sans.variable} ${serif.variable}`}><SiteHeader/><main>{children}</main><a className="whatsapp-float" href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Conversar pelo WhatsApp"><MessageCircle/></a><SiteFooter/></body></html> }
