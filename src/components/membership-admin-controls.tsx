"use client";

import { useActionState } from "react";
import { removeTenantMembership, updateTenantMembership } from "@/app/superadmin/actions";

type Role = "owner" | "admin" | "manager" | "agent" | "viewer";
type Status = "active" | "suspended";

const roleLabels: Record<Role,string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  agent: "Corretor",
  viewer: "Leitura",
};

export function MembershipAdminControls({
  tenantId,
  membershipId,
  role,
  status,
  userName,
}: {
  tenantId: string;
  membershipId: string;
  role: Role;
  status: Status | "invited";
  userName: string;
}) {
  const [state, action, pending] = useActionState(
    updateTenantMembership.bind(null, tenantId, membershipId),
    { ok: false, message: "" },
  );

  if (status === "invited") {
    return <span className="muted-copy">Convite pendente</span>;
  }

  return (
    <div className="membership-admin-controls">
      <form action={action}>
        <select name="role" defaultValue={role} aria-label={"Papel de " + userName}>
          {(Object.keys(roleLabels) as Role[]).map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label={"Status de " + userName}>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
        </select>
        <button className="admin-button secondary" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </form>
      {state.message ? <small className={state.ok ? "form-success-inline" : "admin-form-error"}>{state.message}</small> : null}
      <form
        action={removeTenantMembership.bind(null, tenantId, membershipId)}
        onSubmit={(event) => {
          if (!window.confirm(`Remover o acesso de ${userName} desta empresa? O usuário global não será apagado.`)) event.preventDefault();
        }}
      >
        <button className="text-action danger" type="submit">Remover acesso</button>
      </form>
    </div>
  );
}
