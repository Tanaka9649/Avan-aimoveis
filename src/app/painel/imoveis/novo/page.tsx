import { requireModule } from "@/lib/access";
import { PropertyEditor } from "@/components/property-editor";
export default async function NewPropertyPage() {
  await requireModule("imoveis");
  return <div className="admin-content"><div className="admin-page-title"><h1>Novo imóvel</h1></div><PropertyEditor/></div>;
}
