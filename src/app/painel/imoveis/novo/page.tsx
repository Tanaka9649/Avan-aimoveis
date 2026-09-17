import { requireUser } from "@/lib/auth";
import { PropertyEditor } from "@/components/property-editor";
export default async function NewPropertyPage() {
  await requireUser();
  return <div className="admin-content"><div className="admin-page-title"><h1>Novo imóvel</h1></div><PropertyEditor/></div>;
}
