import { asc, desc, eq } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { SettingsForm } from "@/components/settings-form";
import { getDb } from "@/db";
import { clients, reminderSettings, users } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { moduleLabels, modules } from "@/lib/permissions";
import { assignClient, createAccount, saveReminders, updateAccount } from "./actions";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const db = getDb();
  const [team, preferences, customers] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, access: users.access })
      .from(users)
      .orderBy(asc(users.name)),
    db.select().from(reminderSettings).where(eq(reminderSettings.key, "visits")).limit(1),
    db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(desc(clients.createdAt)).limit(200),
  ]);
  const settings = preferences[0];

  return (
    <div className="admin-content">
      <PageHeader
        eyebrow="Somente administrador"
        title="Equipe, acessos e lembretes"
        description="Controle quem entra na plataforma, o que cada pessoa pode consultar e como os alertas são distribuídos."
      />

      <section className="admin-card">
        <h2>Criar acesso</h2>
        <p>Novas contas ficam pendentes até você marcar “Acesso aprovado”. Não há cadastro público automático.</p>
        <SettingsForm action={createAccount} label="Criar conta pendente">
          <label>Nome<input name="name" required minLength={2} /></label>
          <label>E-mail de login<input name="email" type="email" required /></label>
          <label className="wide">Senha inicial<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>
        </SettingsForm>
      </section>

      <section className="admin-card">
        <h2>Contas e permissões</h2>
        <p>{team.length} {team.length === 1 ? "conta cadastrada" : "contas cadastradas"}.</p>
        {team.map((person) => (
          <article key={person.id} className="account-settings">
            <header className="account-heading">
              <div><h3>{person.name}</h3><p>{person.email}</p></div>
              <StatusBadge value={person.role === "admin" ? "administrador" : person.active ? "ativo" : "pendente"} />
            </header>
            {person.role === "equipe" && (
              <SettingsForm action={updateAccount} label="Salvar acesso">
                <input type="hidden" name="id" value={person.id} />
                <label className="check"><input type="checkbox" name="active" defaultChecked={person.active} />Acesso aprovado</label>
                <label>Clientes visíveis<select name="scope" defaultValue={person.access.clients}><option value="all">Todos os clientes disponíveis</option><option value="own">Somente clientes atribuídos</option></select></label>
                <fieldset className="wide"><legend>Módulos liberados</legend>{modules.map((module) => <label className="check" key={module}><input type="checkbox" name="modules" value={module} defaultChecked={person.access.modules.includes(module)} />{moduleLabels[module]}</label>)}</fieldset>
              </SettingsForm>
            )}
          </article>
        ))}
      </section>

      <section className="admin-card">
        <h2>Atribuir cliente a uma pessoa</h2>
        <p>Usado quando a pessoa pode ver somente clientes atribuídos. A lista mostra os 200 cadastros mais recentes.</p>
        <SettingsForm action={assignClient} label="Atribuir responsável">
          <label>Cliente<select name="clientId" required><option value="">Selecione</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
          <label>Responsável<select name="userId" required><option value="">Selecione</option>{team.filter((person) => person.active).map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
        </SettingsForm>
      </section>

      <section className="admin-card">
        <h2>Lembretes de visitas</h2>
        <p>As preferências ficam salvas. A agenda e o serviço de envio ainda estão em implementação; nenhum e-mail será marcado como enviado sem confirmação.</p>
        <SettingsForm action={saveReminders} label="Salvar preferências">
          <label className="check"><input name="panel" type="checkbox" defaultChecked={settings?.panel ?? true} />No painel</label>
          <label className="check"><input name="email" type="checkbox" defaultChecked={settings?.email ?? true} />Por e-mail</label>
          <label className="wide">Destinatários — um por linha (até 50)<textarea name="recipients" rows={4} required defaultValue={(settings?.recipients ?? [admin.email]).join("\n")} /></label>
        </SettingsForm>
      </section>
    </div>
  );
}
