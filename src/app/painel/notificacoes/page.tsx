import Link from "next/link";
import { and,desc,eq } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatOperationDateTime } from "@/lib/datetime";
export default async function Page() {
 const user=await requireUser();
 const rows=await getDb().select().from(notifications).where(and(eq(notifications.tenantId,user.tenantId),eq(notifications.userId,user.id))).orderBy(desc(notifications.createdAt)).limit(100);
 return <div className="admin-content"><header className="page-header"><h1>Notificações</h1></header><section className="admin-card">{rows.length ? rows.map(row=><article key={row.id}><h2>{row.title}</h2><p>{row.body}</p><small>{formatOperationDateTime(row.createdAt)}</small>{row.href ? <p><Link href={row.href}>Abrir agenda</Link></p>:null}</article>):<p>Nenhuma notificação por enquanto.</p>}</section></div>;
}
