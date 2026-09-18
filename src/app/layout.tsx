import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brand, siteUrl } from "@/lib/brand";
import "./globals.css";
import "./evolution.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = { metadataBase: new URL(siteUrl()), title: { default: `${brand.name} — imóveis selecionados`, template: `%s | ${brand.name}` }, description: brand.tagline, icons: { icon: "/icon.png", apple: "/apple-icon.png" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body className={sans.variable}><SiteHeader/><main>{children}</main>{brand.whatsapp && <a className="whatsapp-float" href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Conversar pelo WhatsApp"><MessageCircle/></a>}<SiteFooter/></body></html> }
