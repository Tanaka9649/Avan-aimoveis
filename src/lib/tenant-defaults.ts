import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/** Run in a batch. Non-empty customized funnels/categories are never overwritten. */
export function tenantDefaultQueries(db: ReturnType<typeof getDb>, tenantId: string) {
  return [
    db.execute(sql`select id from tenants where id=${tenantId}::uuid for update`),
    db.execute(sql`
      insert into stages(tenant_id,name,position,color,is_won,is_lost)
      select ${tenantId}::uuid,name,position,color,is_won,is_lost from (values
        ('Novos leads',10,'#5477bf',false,false),
        ('Em contato',20,'#d49a42',false,false),
        ('Visita',30,'#8b69b1',false,false),
        ('Proposta',40,'#329477',false,false),
        ('Ganho',50,'#24664f',true,false),
        ('Perdido',60,'#8a5555',false,true)
      ) defaults(name,position,color,is_won,is_lost)
      where not exists(select 1 from stages where tenant_id=${tenantId}::uuid)
    `),
    db.execute(sql`
      insert into document_categories(tenant_id,name,entity_type)
      select ${tenantId}::uuid,name,entity_type from (values
        ('Matrícula','property'),('IPTU','property'),('Documento pessoal','owner')
      ) defaults(name,entity_type)
      where not exists(select 1 from document_categories where tenant_id=${tenantId}::uuid)
    `),
  ] as const;
}

export async function repairTenantDefaults(tenantId: string) {
  const db = getDb();
  await db.batch(tenantDefaultQueries(db, tenantId));
}
