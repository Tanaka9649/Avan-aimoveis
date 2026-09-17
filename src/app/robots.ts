import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";
export default function robots():MetadataRoute.Robots{return{rules:[{userAgent:"*",allow:"/",disallow:["/painel/","/api/"]}],sitemap:siteUrl("/sitemap.xml")}}
