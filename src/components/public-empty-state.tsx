import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function PublicEmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><Search aria-hidden="true"/><h2>{title}</h2><p>{description}</p>{children}</div>;
}
