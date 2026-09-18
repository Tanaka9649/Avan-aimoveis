import {redirect} from "next/navigation";

export default function ClientsLegacyPage(){
 redirect("/painel/crm?view=clientes");
}
