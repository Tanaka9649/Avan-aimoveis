import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { requireUser } from "@/lib/auth";
import { moduleLabels } from "@/lib/permissions";
import { membershipRoleLabels } from "@/lib/ui-labels";

export default async function ProfilePage() {
  const user = await requireUser();
  const enabled = user.access.modules.map((module) => moduleLabels[module] || module);
  return (
    <div className="admin-content">
      <PageHeader eyebrow="Conta" title="Meu perfil" description="Confira seus dados de acesso e permissões nesta empresa."/>
      <div className="dashboard-grid profile-grid">
        <section className="admin-card">
          <h2>Dados da conta</h2>
          <dl className="detail-list">
            <div><dt>Nome</dt><dd>{user.name}</dd></div>
            <div><dt>E-mail</dt><dd>{user.email}</dd></div>
            <div><dt>Empresa</dt><dd>{user.tenant.name}</dd></div>
            <div><dt>Papel</dt><dd>{membershipRoleLabels[user.membershipRole] || user.membershipRole}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value="active"/></dd></div>
          </dl>
        </section>
        <section className="admin-card">
          <h2>Acesso nesta empresa</h2>
          <p className="muted-copy">As permissões são definidas pelo administrador da empresa.</p>
          <div className="profile-permissions">
            <div><span>Clientes visíveis</span><strong>{user.access.clients === "all" ? "Todos os clientes" : "Somente clientes atribuídos"}</strong></div>
            <div><span>Módulos liberados</span><strong>{enabled.length ? enabled.join(", ") : "Nenhum módulo adicional"}</strong></div>
          </div>
        </section>
      </div>
      <section className="admin-card profile-security">
        <h2>Segurança</h2>
        <p>Para alterar senha ou recuperar acesso, utilize o fluxo seguro de autenticação da plataforma. Senhas nunca são exibidas no painel.</p>
      </section>
    </div>
  );
}
