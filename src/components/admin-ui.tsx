import { Plus, type LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="page-header">
    <div>{eyebrow && <span className="page-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="page-header-action">{action}</div>}
  </header>;
}

export function MetricCard({ label, value, helper, icon: Icon, tone = "blue", featured = false }: { label: string; value: string; helper: string; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "slate"; featured?: boolean }) {
  return <article className={`metric-card${featured ? " featured" : ""}`}><div className="metric-card-top"><span>{label}</span><i className={"metric-icon " + tone}><Icon/></i></div><strong>{value}</strong><small>{helper}</small></article>;
}

export function SectionCard({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={"admin-card " + className}><header className="section-card-header"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}</header>{children}</section>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-empty"><span><Icon/></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function PlannedAction({ label }: { label: string }) {
  return <button className="admin-button secondary planned-action" type="button" disabled title="Fluxo de cadastro em preparação"><Plus />{label}<small>Em breve</small></button>;
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={"status-badge status-" + value.toLowerCase().replaceAll("_", "-")}>{value.replaceAll("_", " ")}</span>;
}

export function FormSection({ number, title, description, children, wide = false }: { number: string; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  return <fieldset className={"form-section" + (wide ? " form-section-wide" : "")}><legend><span>{number}</span><div><strong>{title}</strong>{description && <small>{description}</small>}</div></legend><div className="form-section-grid">{children}</div></fieldset>;
}
