import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { applyDrizzleMigrations } from "@/test/apply-drizzle-migrations";
import { drizzle } from "drizzle-orm/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const fixture = vi.hoisted(() => ({
  db: null as unknown,
  user: {
    id: "72000000-0000-4000-8000-000000000002",
    tenantId: "72000000-0000-4000-8000-000000000001",
    role: "admin",
    globalRole: "user",
    membershipRole: "owner",
    access: { modules: ["dashboard", "imoveis", "clientes", "crm", "visitas", "propostas", "proprietarios", "analytics"], clients: "all" },
    email: "admin-b@example.invalid",
    name: "Admin B",
    tenant: { id: "72000000-0000-4000-8000-000000000001", name: "Tenant B", slug: "tenant-b", status: "active" },
  },
}));

vi.mock("@/db", () => ({ getDb: () => fixture.db }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => false, emailConfigured: () => false }));
vi.mock("@/lib/access", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/access")>();
  return {
    ...original,
    requireModule: async () => fixture.user, requireWriteModule: async () => fixture.user,
    requireAdmin: async () => fixture.user,
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { registerPresentation } from "@/app/painel/clientes/actions";
import { saveTenantModules, updateAccount } from "@/app/painel/configuracoes/actions";
import { saveOwner } from "@/app/painel/proprietarios/actions";
import { saveProposal, saveSale } from "@/app/painel/propostas/actions";
import { saveVisit } from "@/app/painel/visitas/actions";
import { canConsumeResource, canCreateResource, getUsage } from "@/lib/entitlements";
import { acceptInvitation } from "@/lib/invitations";
import { provisionTenant } from "@/lib/provisioning";
import { hashToken } from "@/lib/security";
import { repairTenantDefaults } from "@/lib/tenant-defaults";
import { visitRows, visitChoices } from "@/lib/visit-queries";
import { commercialRows } from "@/lib/commercial-queries";
import type { AuthenticatedUser } from "@/lib/auth";

const TENANT_A = "71000000-0000-4000-8000-000000000001";
const TENANT_B = fixture.user.tenantId;
const USER_A = "71000000-0000-4000-8000-000000000002";
const USER_B = fixture.user.id;
const CLIENT_A = "71000000-0000-4000-8000-000000000003";
const CLIENT_B = "72000000-0000-4000-8000-000000000003";
const PROPERTY_A = "71000000-0000-4000-8000-000000000004";
const PROPERTY_B = "72000000-0000-4000-8000-000000000004";
const STAGE_A = "71000000-0000-4000-8000-000000000005";
const STAGE_B = "72000000-0000-4000-8000-000000000005";
const WON_B = "72000000-0000-4000-8000-000000000006";
const DEAL_A = "71000000-0000-4000-8000-000000000007";
const DEAL_B = "72000000-0000-4000-8000-000000000007";
const OWNER_A = "71000000-0000-4000-8000-000000000008";
const MEMBERSHIP_A = "71000000-0000-4000-8000-000000000009";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  await applyDrizzleMigrations(pg);
  await pg.exec(`UPDATE plans SET limits = '{"max_users":null,"max_properties":null,"max_clients":null,"max_opportunities":null,"max_documents":null,"max_storage_bytes":null,"custom_domain":0}'::jsonb;`);
  const db = drizzle(pg);
  fixture.db = Object.assign(db, {
    execute: (query: SQL) => ({ toSQL: () => new PgDialect().sqlToQuery(query) }),
    batch: async (queries: { toSQL: () => { sql: string; params: unknown[] } }[]) => pg.transaction(async (transaction) => {
      const results = [];
      for (const query of queries) {
        const built = query.toSQL();
        results.push(await transaction.query(built.sql, built.params));
      }
      return results;
    }),
  });

  await pg.query("insert into tenants(id,name,slug,status,plan) values($1,'Tenant A','tenant-a','active','max'),($2,'Tenant B','tenant-b','active','max')", [TENANT_A, TENANT_B]);
  await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Admin A','admin-a@example.invalid','unused','admin'),($2,'Admin B','admin-b@example.invalid','unused','admin')", [USER_A, USER_B]);
  await pg.query("insert into tenant_memberships(id,tenant_id,user_id,role,status,permissions,activated_at) values($1,$2,$3,'owner','active',$4,now()),($5,$6,$7,'owner','active',$4,now())", [MEMBERSHIP_A, TENANT_A, USER_A, JSON.stringify(fixture.user.access), "72000000-0000-4000-8000-000000000009", TENANT_B, USER_B]);
  await pg.query("insert into clients(tenant_id,id,name,phone,origin) values($1,$2,'Cliente A','34999990001','Teste'),($3,$4,'Cliente B','34999990002','Teste')", [TENANT_A, CLIENT_A, TENANT_B, CLIENT_B]);
  await pg.query("insert into properties(tenant_id,id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private) values($1,$2,'A-1','Imóvel A','imovel-a','Casa',10000000,'A','MG','Frutal','Centro','Privado A'),($3,$4,'B-1','Imóvel B','imovel-b','Casa',20000000,'B','SP','Barretos','Centro','Privado B')", [TENANT_A, PROPERTY_A, TENANT_B, PROPERTY_B]);
  await pg.query("insert into stages(tenant_id,id,name,position,color,is_won,is_lost) values($1,$2,'Novos A',0,'#aaa',false,false),($3,$4,'Novos B',0,'#aaa',false,false),($3,$5,'Ganho B',1,'#aaa',true,false)", [TENANT_A, STAGE_A, TENANT_B, STAGE_B, WON_B]);
  await pg.query("insert into deals(tenant_id,id,client_id,stage_id,title,position) values($1,$2,$3,$4,'Negócio A',1),($5,$6,$7,$8,'Negócio B',1)", [TENANT_A, DEAL_A, CLIENT_A, STAGE_A, TENANT_B, DEAL_B, CLIENT_B, STAGE_B]);
  await pg.query("insert into owners(tenant_id,id,name,phone) values($1,$2,'Proprietário A','34999990003')", [TENANT_A, OWNER_A]);
}, 30_000);

afterAll(async () => {
  await pg.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe.sequential("authenticated tenant isolation", () => {
  it("does not register a presentation with a property from another tenant", async () => {
    await registerPresentation(form({ clientId: CLIENT_B, propertyId: PROPERTY_A, channel: "link" }));
    expect((await pg.query("select * from client_property_presentations")).rows).toHaveLength(0);
    expect((await pg.query("select * from activities where type='imovel_apresentado'")).rows).toHaveLength(0);
  });

  it("rejects cross-tenant visit, proposal and sale writes", async () => {
    const visit = await saveVisit({ ok: false, message: "" }, form({ clientId: CLIENT_B, propertyId: PROPERTY_A, dealId: DEAL_B, scheduledAt: "2026-10-10T10:00", notes: "", status: "agendada" }));
    const proposal = await saveProposal({ ok: false, message: "" }, form({ dealId: DEAL_B, propertyId: PROPERTY_A, advertised: "100000", amount: "95000", counter: "", validUntil: "", status: "enviada", notes: "" }));
    const sale = await saveSale({ ok: false, message: "" }, form({ dealId: DEAL_B, propertyId: PROPERTY_A, proposalId: "", advertised: "100000", amount: "95000", commissionPercent: "5", soldAt: "2026-10-10", notes: "" }));
    expect(visit.ok).toBe(false);
    expect(proposal.ok).toBe(false);
    expect(sale.ok).toBe(false);
    expect((await pg.query("select * from visits")).rows).toHaveLength(0);
    expect((await pg.query("select * from proposals")).rows).toHaveLength(0);
    expect((await pg.query("select * from sales")).rows).toHaveLength(0);
  });

  it("cannot update an owner or membership from another tenant", async () => {
    const owner = await saveOwner({ ok: false, message: "" }, form({ id: OWNER_A, name: "Alterado", phone: "34999999999", email: "", notes: "" }));
    const membership = await updateAccount({ ok: false, message: "" }, form({ id: MEMBERSHIP_A, scope: "all", active: "on" }));
    expect(owner.ok).toBe(false);
    expect(membership.ok).toBe(false);
    expect((await pg.query<{ name: string }>("select name from owners where id=$1", [OWNER_A])).rows[0].name).toBe("Proprietário A");
  });

  it("enforces tenant consistency at the database boundary", async () => {
    await expect(pg.query(
      "insert into client_property_presentations(tenant_id,client_id,property_id,channel) values($1,$2,$3,'link')",
      [TENANT_B, CLIENT_B, PROPERTY_A],
    )).rejects.toThrow();
    expect((await pg.query("select * from client_property_presentations")).rows).toHaveLength(0);
  });

  it("still allows valid writes within the active tenant", async () => {
    await registerPresentation(form({ clientId: CLIENT_B, propertyId: PROPERTY_B, channel: "link" }));
    expect((await pg.query("select tenant_id,client_id,property_id from client_property_presentations")).rows).toEqual([
      { tenant_id: TENANT_B, client_id: CLIENT_B, property_id: PROPERTY_B },
    ]);
  });

  it("counts pending invitations against the user quota", async () => {
    await pg.query(
      "insert into tenant_invites(tenant_id,email,name,token_hash,expires_at) values($1,'pending-b@example.invalid','Pendente B',$2,now()+interval '1 day')",
      [TENANT_B, hashToken("pending-b")],
    );
    expect(await getUsage(TENANT_B, "max_users")).toBe(2);
  });

  it("never resets the password of an existing account while accepting an invitation", async () => {
    await pg.query(
      "insert into tenant_invites(tenant_id,email,name,token_hash,expires_at) values($1,'admin-b@example.invalid','Admin B',$2,now()+interval '1 day')",
      [TENANT_A, hashToken("existing-account")],
    );
    const result = await acceptInvitation("existing-account", "senha-que-nao-e-a-atual");
    expect(result).toEqual({ ok: false, error: "Esta conta já existe. Informe a senha atual para aceitar o convite." });
    expect((await pg.query<{ password_hash: string }>("select password_hash from users where id=$1", [USER_B])).rows[0].password_hash).toBe("unused");
  });

  it("lets a tenant admin enable only a dependency-safe subset of plan modules", async () => {
    const invalid = await saveTenantModules({ ok: false, message: "" }, form({ "module:crm": "on" }));
    expect(invalid.ok).toBe(false);

    const valid = await saveTenantModules({ ok: false, message: "" }, form({ "module:clientes": "on", "module:crm": "on" }));
    expect(valid.ok).toBe(true);
    expect((await pg.query<{ module: string }>("select module from tenant_modules where tenant_id=$1 and enabled=true order by module", [TENANT_B])).rows).toEqual([
      { module: "clientes" },
      { module: "crm" },
    ]);
  });

  it("retries an identical provisioning request without duplicating the tenant", async () => {
    const input = {
      name: "Tenant C",
      slug: "tenant-c",
      plan: "max" as const,
      modules: ["dashboard", "clientes", "crm"] as const,
      admin: { name: "Admin C", email: "admin-c@example.invalid" },
    };
    const first = await provisionTenant({ ...input, modules: [...input.modules] }, USER_B);
    const retry = await provisionTenant({ ...input, modules: [...input.modules] }, USER_B);
    expect(retry.tenantId).toBe(first.tenantId);
    expect(retry.inviteUrl).not.toBe(first.inviteUrl);
    expect((await pg.query("select id from tenants where slug='tenant-c'")).rows).toHaveLength(1);
    expect((await pg.query("select id from tenant_invites where tenant_id=$1", [first.tenantId])).rows).toHaveLength(1);
    expect((await pg.query<{ attempts: number }>("select attempts from tenant_provisioning where tenant_id=$1 and step='admin_invite'", [first.tenantId])).rows[0].attempts).toBe(2);
  });

  it("enforces opportunity, document and storage overrides in the backend", async () => {
    await pg.query("update tenants set quota_overrides=$2 where id=$1", [TENANT_B, JSON.stringify({ max_opportunities: 1, max_documents: 1, max_storage_bytes: 100 })]);
    expect(await getUsage(TENANT_B, "max_opportunities")).toBe(1);
    expect(await canCreateResource(TENANT_B, "max_opportunities")).toBe(false);
    expect(await canConsumeResource(TENANT_B, "max_documents", 1)).toBe(true);
    expect(await canConsumeResource(TENANT_B, "max_storage_bytes", 100)).toBe(true);

    await pg.query("insert into property_photos(tenant_id,property_id,storage_path,alt,position,size_bytes) values($1,$2,'tenants/b/photo.webp','Foto B',0,80)", [TENANT_B, PROPERTY_B]);
    expect(await getUsage(TENANT_B, "max_storage_bytes")).toBe(80);
    expect(await canConsumeResource(TENANT_B, "max_storage_bytes", 21)).toBe(false);
  });

  it("provisions a usable funnel atomically, repairs only missing defaults and accepts activation once", async () => {
    const result = await provisionTenant({name:"Operational test",slug:"operational-test",plan:"max",modules:["imoveis","clientes","crm"],admin:{name:"Test admin",email:"operational@example.invalid"}}, USER_B);
    const token = result.inviteUrl.split("/").at(-1)!;
    const stageRows = (await pg.query<{name:string;is_won:boolean;is_lost:boolean}>("select name,is_won,is_lost from stages where tenant_id=$1 order by position",[result.tenantId])).rows;
    expect(stageRows.map(row=>row.name)).toEqual(["Novos leads","Em contato","Visita","Proposta","Ganho","Perdido"]);
    expect(stageRows.filter(row=>row.is_won)).toHaveLength(1);
    expect(stageRows.filter(row=>row.is_lost)).toHaveLength(1);
    await repairTenantDefaults(result.tenantId);
    expect((await pg.query("select id from stages where tenant_id=$1",[result.tenantId])).rows).toHaveLength(6);
    expect((await pg.query("select id from document_categories where tenant_id=$1",[result.tenantId])).rows).toHaveLength(3);
    await repairTenantDefaults(TENANT_B);
    expect((await pg.query("select id from stages where tenant_id=$1",[TENANT_B])).rows).toHaveLength(2);
    expect((await acceptInvitation(token,"synthetic-password-only")).ok).toBe(true);
    expect((await acceptInvitation(token,"synthetic-password-only")).ok).toBe(false);
    const propertyId = "73000000-0000-4000-8000-000000000010";
    await pg.query("insert into properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private,status,published_at) values($1,$2,'OP-1','Synthetic property','synthetic-property','Casa',100,'Synthetic','MG','Teste','Teste','Teste','disponivel',now())",[propertyId,result.tenantId]);
    const lead = await pg.query<{id:string}>("select intake_property_lead($1,'Synthetic lead','11999991122','synthetic@example.invalid','Test') id",[propertyId]);
    expect(lead.rows[0].id).toBeTruthy();
    expect((await pg.query("select id from deals where tenant_id=$1",[result.tenantId])).rows).toHaveLength(1);
  });

  it("never reactivates a globally disabled account through a tenant invitation", async () => {
    await pg.query("update users set active=false where id=$1",[USER_A]);
    await pg.query("insert into tenant_invites(tenant_id,email,name,token_hash,expires_at) values($1,'admin-a@example.invalid','Admin A',$2,now()+interval '1 day')",[TENANT_B,hashToken("disabled-invite")]);
    expect((await acceptInvitation("disabled-invite","synthetic-password-only")).ok).toBe(false);
    expect((await pg.query<{active:boolean;global_role:string}>("select active,global_role from users where id=$1",[USER_A])).rows[0]).toEqual({active:false,global_role:"user"});
    expect((await pg.query("select id from tenant_invites where token_hash=$1 and accepted_at is null",[hashToken("disabled-invite")])).rows).toHaveLength(1);
  });

  it("scopes commercial listings/selectors and rejects another broker's client on writes", async () => {
    const broker="72000000-0000-4000-8000-000000000080",client="72000000-0000-4000-8000-000000000081",deal="72000000-0000-4000-8000-000000000082";
    await pg.query("update tenants set quota_overrides='{}' where id=$1",[TENANT_B]);
    await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Broker two','broker-two@example.invalid','unused','equipe')",[broker]);
    await pg.query("insert into tenant_memberships(tenant_id,user_id,role,status) values($1,$2,'agent','active')",[TENANT_B,broker]);
    await pg.query("update clients set assigned_to=$1 where id=$2",[USER_B,CLIENT_B]);
    await pg.query("insert into clients(id,tenant_id,name,phone,origin,assigned_to) values($1,$2,'Other broker client','11988882222','test',$3)",[client,TENANT_B,broker]);
    await pg.query("insert into deals(id,tenant_id,client_id,stage_id,title,position) values($1,$2,$3,$4,'Other broker deal',2)",[deal,TENANT_B,client,STAGE_B]);
    await pg.query("insert into proposals(tenant_id,deal_id,property_id,amount_cents,status) values($1,$2,$3,100,'enviada'),($1,$4,$3,100,'enviada')",[TENANT_B,DEAL_B,PROPERTY_B,deal]);
    const restricted={...fixture.user,role:"equipe",membershipRole:"agent",access:{...fixture.user.access,clients:"own"}} as AuthenticatedUser;
    expect((await commercialRows(restricted))[0].map(row=>row.deal)).toEqual(["Negócio B"]);
    expect((await commercialRows({...restricted,id:broker}))[0].map(row=>row.deal)).toEqual(["Other broker deal"]);
    expect((await commercialRows(restricted))[2].map(row=>row.id)).toEqual([DEAL_B]);
    expect((await commercialRows({...restricted,id:broker}))[2].map(row=>row.id)).toEqual([deal]);
    expect((await commercialRows({...restricted,tenantId:TENANT_A}))[0]).toEqual([]);
    expect((await commercialRows({...restricted,role:"admin"}))[0]).toHaveLength(2);
    const previous={role:fixture.user.role,access:fixture.user.access};
    fixture.user.role="equipe";fixture.user.access={...fixture.user.access,clients:"own"};
    try {
      expect((await saveProposal({ok:false,message:""},form({dealId:deal,propertyId:PROPERTY_B,advertised:"100",amount:"95",counter:"",validUntil:"",status:"enviada",notes:""}))).ok).toBe(false);
      expect((await saveVisit({ok:false,message:""},form({clientId:client,propertyId:PROPERTY_B,dealId:deal,scheduledAt:"2026-12-10T10:00",notes:"",status:"agendada"}))).ok).toBe(false);
      expect((await saveSale({ok:false,message:""},form({dealId:deal,propertyId:PROPERTY_B,proposalId:"",advertised:"100",amount:"95",commissionPercent:"5",soldAt:"2026-10-13",notes:""}))).ok).toBe(false);
    } finally {fixture.user.role=previous.role;fixture.user.access=previous.access;}
  });

  it("paginates beyond 100 visits and scopes list and selectors to the owning broker", async () => {
    await pg.query("update clients set assigned_to=$1 where id=$2",[USER_B,CLIENT_B]);
    await pg.query("insert into visits(tenant_id,client_id,property_id,scheduled_at) select $1,$2,$3,now()+make_interval(days=>n) from generate_series(1,105) n",[TENANT_B,CLIENT_B,PROPERTY_B]);
    const own={...fixture.user,role:"equipe",membershipRole:"agent",globalRole:"user",access:{...fixture.user.access,clients:"own"}} as AuthenticatedUser;
    const other={...own,id:USER_A};
    expect(await visitRows(other,1,"all")).toEqual([]);
    expect((await visitChoices(other))[0]).toEqual([]);
    expect((await visitChoices(other))[2]).toEqual([]);
    expect(await visitRows(own,5,"upcoming")).toHaveLength(5);
    expect(await visitRows({...own,tenantId:TENANT_A},1,"all")).toEqual([]);
  });
});
