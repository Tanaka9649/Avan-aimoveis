import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, reminderSettings, clients } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { modules } from "@/lib/permissions";
import { SettingsForm } from "@/components/settings-form";
import { createAccount, updateAccount, saveReminders, assignClient } from "./actions";
export default async function SettingsPage() {
  const admin = await requireAdmin();
  const db = getDb();
  const [team, preferences, customers] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, access: users.access }).from(users).orderBy(asc(users.name)),
    db.select().from(reminderSettings).where(eq(reminderSettings.key, "visits")).limit(1),
    db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(desc(clients.createdAt)).limit(200),
  ]);
  const settings = preferences[0];
  return <div className="admin-content"><div className="admin-page-title"><div><span>Somente administrador</span><h1>Equipe, acessos e lembretes</h1></div></div>
    <section className="admin-card"><h2>Criar acesso</h2><p>Novas contas ficam pendentes até você marcar “Acesso aprovado”. Não há cadastro público automático.</p><SettingsForm action={createAccount} label="Criar conta pendente"><label>Nome<input name="name" required minLength={2}/></label><label>E-mail de login<input name="email" type="email" required/></label><label>Senha inicial<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label></SettingsForm></section>
    <section className="admin-card"><h2>Contas e permissões</h2>{team.map((person) => <article key={person.id} className="account-settings"><h3>{person.name}</h3><p>{person.email} · {person.role === "admin" ? "Administrador" : person.active ? "Aprovado" : "Pendente ou suspenso"}</p>{person.role === "equipe" && <SettingsForm action={updateAccount} label="Salvar acesso"><input type="hidden" name="id" value={person.id}/><label className="check"><input type="checkbox" name="active" defaultChecked={person.active}/>Acesso aprovado</label><label>Clientes visíveis<select name="scope" defaultValue={person.access.clients}><option value="all">Todos os clientes disponíveis</option><option value="own">Somente clientes atribuídos</option></select></label><fieldset className="wide"><legend>Módulos liberados (consulta e operações disponíveis)</legend>{modules.map((module) => <label className="check" key={module}><input type="checkbox" name="modules" value={module} defaultChecked={person.access.modules.includes(module)}/>{module}</label>)}</fieldset></SettingsForm>}</article>)}</section>
    <section className="admin-card"><h2>Atribuir cliente a uma pessoa</h2><p>Usado pela opção “Somente clientes atribuídos”. Lista dos 200 clientes mais recentes.</p><SettingsForm action={assignClient} label="Atribuir responsável"><label>Cliente<select name="clientId" required><option value="">Selecione</option>{customers.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Responsável<select name="userId" required><option value="">Selecione</option>{team.filter((p) => p.active).map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label></SettingsForm></section>
    <section className="admin-card"><h2>Lembretes de visitas</h2><p>As preferências ficam salvas. A agenda e o serviço de envio ainda estão em implementação; nenhum e-mail será marcado como enviado sem confirmação.</p><SettingsForm action={saveReminders} label="Salvar preferências"><label className="check"><input name="panel" type="checkbox" defaultChecked={settings?.panel ?? true}/>No painel</label><label className="check"><input name="email" type="checkbox" defaultChecked={settings?.email ?? true}/>Por e-mail</label><label className="wide">Destinatários — um por linha (até 50)<textarea name="recipients" rows={4} required defaultValue={(settings?.recipients ?? [admin.email]).join("\n")}/></label></SettingsForm></section>
  </div>;
}
