import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

// Opt-in, development-only integration check. Never use production data.
async function main() {
  const url = process.env.DATABASE_URL || "";
  if (new URL(url).hostname !== "ep-polished-mouse-b5478dlj-pooler.c-7.us-east-2.aws.neon.tech") throw new Error("Development database required");
  const sql = neon(url);
  const id = randomUUID();
  const slug = `smoke-${id}`;
  const email = `${id}@example.invalid`;
  const address = `PRIVATE-${id}`;
  const base = "http://localhost:3000";
  try {
    await sql`insert into properties(id, code, title, slug, type, price_cents, description, state, city, neighborhood, address_private, status, published_at) values(${id}, ${id.slice(0, 20)}, 'Imóvel sintético de teste', ${slug}, 'Casa', 10000000, 'Descrição sintética para teste automatizado.', 'SP', 'São Paulo', 'Teste', ${address}, 'disponivel', now())`;
    const page = await fetch(`${base}/imoveis/${slug}`);
    assert.equal(page.status, 200);
    assert.equal((await page.text()).includes(address), false, "private address leaked");
    const payload = { name: "Teste automatizado", email, phone: "11999999999", consent: "true", propertyId: id, message: "Contato sintético" };
    const submit = () => fetch(`${base}/api/leads`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal((await submit()).status, 201, "lead creation failed");
    const rows = await sql`select d.id from clients c join deals d on d.client_id=c.id join deal_properties dp on dp.deal_id=d.id join activities a on a.deal_id=d.id where c.email=${email} and dp.property_id=${id}`;
    assert.equal(rows.length, 1, "lead graph must be complete");
    await sql`update properties set status='pausado', published_at=null where id=${id}`;
    assert.equal((await submit()).status, 409, "hidden property accepted a lead");
    const clients = await sql`select id from clients where email=${email}`;
    assert.equal(clients.length, 1, "failed submission left an orphan client");
    assert.equal((await fetch(`${base}/imoveis/${slug}`)).status, 404);
    console.log("PASS: public page, private-field protection, atomic lead graph, hidden property rejection.");
  } finally {
    // Only this run's UUID/email can be removed. Foreign-key order is intentional.
    await sql.transaction([
      sql`delete from activities where client_id in (select id from clients where email=${email})`,
      sql`delete from deal_properties where property_id=${id}`,
      sql`delete from deals where client_id in (select id from clients where email=${email})`,
      sql`delete from clients where email=${email}`,
      sql`delete from properties where id=${id}`,
    ]);
  }
}
main().catch(() => { console.error("Smoke failed; inspect application logs without exposing credentials."); process.exitCode = 1; });
