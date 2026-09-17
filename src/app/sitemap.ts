import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";
import { properties } from "@/data/properties";
export default function sitemap():MetadataRoute.Sitemap{return ["","/imoveis","/sobre","/contato"].map((path)=>({url:siteUrl(path),lastModified:new Date()})).concat(properties.map((p)=>({url:siteUrl(`/imoveis/${p.slug}`),lastModified:new Date()})))}
