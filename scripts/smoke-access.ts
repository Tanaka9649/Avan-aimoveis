import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "../src/lib/security";
async function main() {
  const url = process.env.DATABASE_URL || "";
  if (new URL(url).hostname !== "ep-polished-mouse-b5478dlj-pooler.c-7.us-east-2.aws.neon.tech") throw new Error("Development only");
  const sql = neon(url), id = randomUUID(), owned = randomUUID(), other = randomUUID(), dealId = randomUUID();
  const email = `${id}@example.invalid`, password = randomBytes(24).toString("base64url");
  const base = "http://localhost:3000";
  const login = () => fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  try {
    await sql`insert into users(id,name,email,password_hash,role,active,access) values(${id},'Teste de acesso',${email},${await hashPassword(password)},'equipe',false,'{"modules":["clientes","crm"],"clients":"all"}'::jsonb)`;
    assert.equal((await login()).status, 401, "pending account logged in");
    await sql`update users set active=true where id=${id}`;
    const response = await login();
    assert.equal(response.status, 200, "approved account cannot log in");
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const read = (path: string) => fetch(base + path, { headers: { cookie }, redirect: "manual" });
    await sql`insert into clients(id,name,phone,origin,assigned_to) values(${owned},${"OWNED-"+owned},'11999999999','test',${id}),(${other},${"OTHER-"+other},'11999999998','test',null)`;
    await sql`insert into deals(id,client_id,stage_id,title,position) select ${dealId},${other},id,'Synthetic restricted deal',1000 from stages order by position limit 1`;
    assert.equal((await read("/painel/configuracoes")).status, 404, "team accessed admin settings");
    assert.equal((await read("/painel/imoveis")).status, 404, "blocked module was accessible");
    const all = await (await read("/painel/clientes")).text();
    assert.ok(all.includes("OTHER-"+other) && all.includes("OWNED-"+owned), "all scope failed");
    await sql`update users set access='{"modules":["clientes","crm"],"clients":"own"}'::jsonb where id=${id}`;
    const scoped = await (await read("/painel/clientes")).text();
    assert.ok(scoped.includes("OWNED-"+owned) && !scoped.includes("OTHER-"+other), "own scope leaked another client");
    assert.equal((await read("/painel/crm/"+dealId)).status, 404, "direct deal URL leaked another client");
    await sql`update users set active=false where id=${id}`;
    const blocked = await read("/painel/clientes");
    assert.ok(blocked.status === 307 || (await blocked.text()).includes('NEXT_REDIRECT'), "disabled account retained access");
    console.log("PASS: approval, login, module guards, all/own scope, direct URL isolation, suspension.");
  } finally {
    await sql.transaction([
      sql`delete from deals where id=${dealId}`,
      sql`delete from clients where id in (${owned},${other})`,
      sql`delete from sessions where user_id=${id}`,
      sql`delete from users where id=${id}`,
    ]);
  }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : "Access smoke failed (details suppressed)."); process.exitCode = 1; });
