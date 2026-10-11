import { type TenantRecord, tenantPublicPathBase } from "@/lib/tenant";
export function PrivacyNotice({ tenant }: { tenant: TenantRecord }) {
 const custom = typeof tenant.settings.privacyNotice === "string" ? tenant.settings.privacyNotice : "";
 return <main className="shell section prose"><h1>Privacidade e uso dos dados</h1><p>Responsável pelo atendimento: {tenant.name}.</p>
 {custom ? <p style={{ whiteSpace: "pre-wrap" }}>{custom}</p> : <><p>Ao enviar o formulário de interesse, seu nome, telefone, e-mail e mensagem são registrados para que a equipe entre em contato sobre o imóvel e acompanhe o atendimento.</p><p>O acesso aos registros de atendimento é restrito à equipe autorizada. Para solicitar informações, correção ou exclusão dos seus dados, entre em contato com a empresa.</p><p>O site utiliza cookies para autenticação da equipe e armazenamento local para preferências e favoritos. Eventos de navegação podem ser registrados para avaliar o interesse nos imóveis.</p></>}
 <a href={`${tenantPublicPathBase(tenant)}/contato`}>Contato da empresa</a></main>;
}
