"use client";
import { useActionState } from "react";
export function SettingsForm({ action, children, label }: { action: (state: { message: string; ok: boolean }, form: FormData) => Promise<{ message: string; ok: boolean }>; children: React.ReactNode; label: string }) {
  const [state, submit, pending] = useActionState(action, { message: "", ok: false });
  return <form action={submit} className="entity-form">{children}<div className="wide"><button className="admin-primary" disabled={pending}>{pending ? "Salvando…" : label}</button>{state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}</div></form>;
}
