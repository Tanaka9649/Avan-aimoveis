# Auditoria corretiva — 13/10/2026

## Resultado e limites desta entrega

Código corrigido e validado localmente na branch `feat/saas-multitenant`. **Não há Preview consolidado publicado nesta rodada; não há aprovação de release.** Production não recebeu escrita, migration, alteração de credenciais, push, promoção ou deploy por esta execução.

A integração Vercel retornou 404 nas consultas anteriores com escopo explícito. Atualização antes da reinicialização: consultas de deployment por hostname e listagem por projectId **funcionaram omitindo teamId e slug**, sem reconexão. Portanto, não há bloqueio geral de leitura de deployments nem evidência de limite do plano causando aquele 404. O controle do navegador falhou com `helper_unknown_error: setup refresh had errors`; a alternativa de computer-use também encerrou o processo confiável. Não contornei autenticação ou proteção de deployment.

A base Git foi atualizada para `ace1ea7`, que contém `cd8fbd3` e `ace1ea7`. Os commits abaixo são **locais, não enviados**. Production foi reconfirmada em consulta somente leitura: `imoveisplatform.vercel.app`, deployment `dpl_8w3WsvFyMiTbsA24fpUAJJXrjtCx`, target production, READY, SHA `48ccfa461e24896827739bad2cc5dcb2dcfee445`. O pedido mais recente é salvar antes de reiniciar, sem deploy/migrations. Instruções exatas e pendências no [checkpoint](saas/CURRENT_CHECKPOINT.md).

## Rastreabilidade F01–F24

O anexo recebido apresenta requisitos por grupos de IDs, mas não contém a descrição individual de cada achado do relatório original. Por isso, os grupos C/D/E/G/H abaixo reproduzem o pedido e **não atribuem arbitrariamente um título individual a cada número**. “Corrigido localmente” não significa homologado em Preview/Production. Nenhum achado foi chamado de “não reproduzido” apenas por indisponibilidade de acesso.

| ID | Referência no pedido | Estado / evidência |
| --- | --- | --- |
| F01 | A — PDF | Corrigido localmente; regressão real reproduzida, oito rotas locais 200, oito PDFs válidos, 12 páginas inspecionadas. HTTP do release em Preview bloqueado. |
| F02 | B — Provisionamento | Corrigido localmente; defaults atômicos, retry, reparação idempotente, ativação e lead testados em PostgreSQL efêmero. |
| F03 | E — Contatos/rotinas | Código corrigido; pendente de configuração externa do WhatsApp real e dos segredos/agendamento. Ver E. |
| F04 | E — Contatos/rotinas | Código corrigido; cron autenticado/idempotente simulado. Execução agendada real bloqueada. Ver E. |
| F05 | C — Permissões | Corrigido localmente; consultas e escritas testadas com dois corretores, admin e outra empresa. |
| F06 | D — Identidade/dados públicos | Corrigido localmente; branding neutro, DTO público mínimo e URLs revisados. Homologação visual bloqueada. |
| F07 | D — Identidade/dados públicos | Corrigido localmente; mesma cobertura do grupo D, sem inferir o título individual ausente. |
| F08 | C — Permissões | Corrigido localmente; somente leitura não move CRM nem escreve propostas/vendas/visitas/anexos. |
| F09 | D — Identidade/dados públicos | Corrigido localmente; mesma cobertura do grupo D; testes de contato e ambiente aprovados. |
| F10 | D — Identidade/dados públicos | Corrigido localmente; mesma cobertura do grupo D; validação visual/Preview bloqueada. |
| F11 | G — Operação/segurança | Parcial; MFA e observabilidade testados. Fechamento do grupo bloqueado por Preview/restore/configuração. |
| F12 | G — Operação/segurança | Parcial; ver G, migrations e bloqueios externos. Título individual não recebido. |
| F13 | G — Operação/segurança | Parcial; ver G, migrations e bloqueios externos. Título individual não recebido. |
| F14 | G — Operação/segurança | Parcial; ver G, migrations e bloqueios externos. Título individual não recebido. |
| F15 | H — Agenda/uploads/UX/abuso | Código corrigido; paginação após 100 registros, leases, quotas e cache testados; visual/concor­rência Neon bloqueados. |
| F16 | H — Agenda/uploads/UX/abuso | Mesma situação do grupo H; não se atribui título individual ausente. |
| F17 | C — Convites | Corrigido localmente; conta global desativada não é reativada, senha e papel global preservados. |
| F18 | G — Operação/segurança | Parcial; ver G; encerramento individual depende também do relatório original. |
| F19 | H — Agenda/uploads/UX/abuso | Mesma situação do grupo H; regressões de duplicidade e preservação aprovadas. |
| F20 | H — Agenda/uploads/UX/abuso | Mesma situação do grupo H; acabamento estrutural corrigido, inspeção visual bloqueada. |
| F21 | G — Operação/segurança | Parcial; ver G; links corrigidos e fixture sintética pronta, Preview bloqueado. |
| F22 | H — Agenda/uploads/UX/abuso | Mesma situação do grupo H; privacidade/cache, abuso PDF/login e limite de dez revisados. |
| F23 | H — Agenda/uploads/UX/abuso | Mesma situação do grupo H; teste externo completo ainda necessário. |
| F24 | G — Operação/segurança | Parcial; documentação atualizada, histórico reconciliado sem reescrita; release não homologado. |

## Evidências por requisito

### A — PDFs

- O caminho antigo usava Helvetica diretamente com emojis/caracteres invisíveis e limitava descrição a 700 caracteres/oito linhas. A regressão reproduz a falha de encoding com descrições reais.
- Conversão somente de apresentação: NFC, remoção de controles invisíveis, fallback explícito `[?]` por símbolo não renderizável; acentos e m² preservados. O cadastro original não é modificado.
- Quebra de linhas por largura real, palavras longas, múltiplas páginas, foto proporcional e numeração.
- Limitadores distribuídos por origem e por renderização de imóvel, cache em memória limitado e requisições simultâneas agrupadas. Autorização/publicação verificadas antes do cache; resposta PDF `private, no-store`.
- Oito imóveis reais lidos no Neon; somente campos públicos copiados para fixture local ignorada pelo Git. Capas obtidas por GET público. O handler corrigido foi executado **localmente**, não no deployment.
- Todos retornaram 200/application-pdf e arquivos válidos; extração textual confirmou a descrição inteira após excluir rodapés. Inspeção visual das 12 páginas confirmou legibilidade, imagens, acentos e ausência de cortes.
- Arquivos gerados em `test-results/pdf-audit/`, não commitados. Fixture/reprodutor opt-in: `src/lib/real-property-pdf.audit.test.ts`.

| Imóvel | Páginas | Resultado local |
| --- | --- | --- |
| Casa Cidade das Águas | 2 | 200 / válido / texto completo |
| Casa do Dino | 1 | 200 / válido / texto completo |
| Casa do Marquinho | 1 | 200 / válido / texto completo |
| Casa Jardim das Américas | 2 | 200 / válido / texto completo |
| Casa Jardim do Bosque Alto Padrão | 1 | 200 / válido / texto completo |
| Casa Jardim do Bosque | 2 | 200 / válido / texto completo |
| Casa no bairro Vô Chiquinho | 1 | 200 / válido / texto completo |
| Sobrado no bairro Nossa Senhora Aparecida | 2 | 200 / válido / texto completo |

### B — Empresa operacional

`tenant-defaults.ts` insere seis etapas (quatro abertas, ganho e perda) e categorias iniciais na mesma transação do provisionamento. Retry e reparação não duplicam nem sobrescrevem funis personalizados. Super Admin dispõe de reparação auditada de configurações ausentes. A UI identifica plano não configurado antes da criação; limites comerciais reais não foram inventados.

Teste integra provisionamento → convite/ativação de uso único → cadastro sintético → lead → oportunidade. O teste usa banco efêmero; não substitui o fluxo pela interface.

### C — Permissões e convites

Consultas de Visitas e Propostas/Vendas centralizadas com `clientScope`; seletores, fechamento e ações verificam servidor. Paginação de visitas usa 25 registros mais sentinela, com período e ordenação explícitos. Usuários somente leitura não recebem formulário mutável nessas telas. CRM e anexos passaram a exigir escrita.

Testes de dois corretores restritos, administrador, outra empresa e guards reais somente leitura; isolamento relacional também no banco. Convite não altera `users.active`, senha ou papel global de conta existente, e consumo único é transacional.

### D — Identidade, privacidade e links

Fallback de marca baseado no nome/monograma da própria empresa; branding configurado da Avança preservado. Header cliente recebe apenas nome/slug/branding, não plano/limites/contatos internos. 404 mantém contexto. Ícones estáticos foram movidos para `public` para não sobrescrever o favicon dinâmico de outros tenants.

Telefone/WhatsApp adiciona 55 exatamente uma vez, inclusive DDD 55. Preview usa `VERCEL_URL` e aceita `VERCEL_BRANCH_URL` exato, sem wildcard genérico de hosts. Domínio personalizado de Production não substitui os links do Preview. O alias fixo real do branch ainda não pôde ser consultado no projeto Vercel.

### E — Contato e rotinas

Pergunta obrigatória de WhatsApp preservada no wizard e atualização disponível nas configurações. Leitura do tenant Avança encontrou WhatsApp não configurado; número oficial foi solicitado e não foi inventado. Links sem WhatsApp usam alternativa de contato válida.

Cron exige Bearer exato e falha fechado sem `CRON_SECRET`. Fila/painel de visitas não envia e-mails. Entrega por e-mail é um job separado, com lease, chave idempotente e rechecagem de visita, tenant e destinatários. Estado sem transporte configurado é `skipped`, não falha.

Quatro horários diários UTC em `vercel.json`: analytics 03:15, limpeza 03:30, fila de visitas 05:00, e-mails 06:10. **Agendamento diário não garante lembrete para visitas criadas entre execuções ou retentativas rápidas.** Frequência maior depende de plano/decisão operacional; nada foi contratado. Cron automático da Vercel roda em Production, portanto Preview exige acionamento manual autorizado exclusivamente com fixtures.

### F — Planos e domínios

Validação antecipada de limites, módulos e dependências, sem escolher preços comerciais. Domínio só fica ativo com vínculo no projeto, verificação de propriedade e DNS `misconfigured=false`. DNS recomendado vem da API, não de IP/CNAME inventados. Reatribuição exige remover o vínculo anterior. Respostas de provider não expõem credenciais.

Cinco testes simulam verificação e recusa. Falta validar DNS real com `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` (ou nome) e `VERCEL_TEAM_ID` do projeto correto. Nenhum domínio foi registrado, comprado ou ativado externamente.

### G — Operação e segurança

- MFA opcional do Super Admin com `otplib@13.5.0` (única dependência adicionada), AES-256-GCM/AAD por usuário, segredo temporário com expiração, confirmação TOTP antes de ativar, proteção contra replay e códigos de recuperação de uso único armazenados somente como hash. Ativar/desativar exige senha atual e registra auditoria; sessões anteriores são revogadas. Nenhum usuário real foi inscrito.
- `MFA_ENCRYPTION_KEY`: 32 bytes aleatórios em base64, segredo somente servidor, distinto no Preview. Não regenerar depois da inscrição sem plano de rotação. Não registrar chave, TOTP ou códigos em logs.
- Logs allowlisted para PDF/uploads/provisionamento/jobs, histórico operacional por 90 dias e últimas 30 execuções no Super Admin. Sem exceções completas, tokens ou conteúdo de clientes nos novos logs.
- Fixture protegida `scripts/seed-audit-preview.ts`: duas empresas, seis contas `@example.invalid`, limites explicitamente temporários e e-mail desligado. Recusa banco já preenchido. Testada apenas localmente.
- Neon lido: plano `free_v3`, retenção 21.600 segundos (6 horas), dez branches presentes/limite dez, nenhum snapshot retornado. Existem branches antigas de backup, mas **isso não comprova restauração atual nem backup do Object Storage**. Não removi backups para abrir vaga, nem executei restore externo.
- Jobs anteriores de recuperação de conta: conforme instrução do usuário, encerrados intencionalmente sem publicar o site. Não classificados como falha de lançamento.
- Checklist React aplicado: formulário de login preserva os campos durante desafio MFA, estados de leitura consistentes e separação servidor/cliente mantida. UI/teclado/mobile ainda não homologados.

### H — Demais controles

Reservas de upload expiram após 24h; leases de dez minutos protegem conclusões em andamento. Limpeza usa tombstone antes de remover objetos, prefixos tenant/entidade/ID validados, timeouts e repetição segura. Falha no storage mantém reserva/cota; arquivos prontos não são apagados. Caminhos legados inseguros são recusados, não removidos às cegas.

Cotas permanecem reservadas e serializadas no banco. Novo guard mantém **dez fotos**, incluindo pendentes; regra também existe na reserva backend e UI. Não aumentei o limite comercial.

Contato duplicado por telefone normalizado/e-mail recebe erro claro. Lead idêntico reutiliza identidade; nome ou dados incompatíveis geram conflito, sem mesclagem ou sobrescrita. Existentes não são deduplicados automaticamente.

Fotos públicas revalidam publicação/tenant em cada acesso e têm cache privado com revalidação; privadas usam no-store. ETag vem da versão real do objeto no storage, não apenas do caminho. Next/Image das fotos já usa `unoptimized`, evitando uma segunda camada de cache. Testes confirmam 404 após despublicação e recusa cross-tenant.

Login limita origem e conta+origem, sem bucket global de e-mail que permita a um atacante bloquear o titular de outra origem. Não se declara proteção absoluta contra ataques distribuídos; MFA e configuração operacional de proteção do provider continuam importantes. Card “Atrasadas” teve correção estrutural de grid/min-width/wrapping, mas a homologação visual continua bloqueada.

### I — E-mail, por último

Sete regressões com fetch integralmente simulado verificam convite, recuperação sem enumeração, links de Preview, autenticação/dupla execução do cron, fila sem envio, falha com lease e estado skipped. Nenhum e-mail real enviado.

Faltam `RESEND_API_KEY` e `AUTH_EMAIL_FROM` (fallback `LEADS_NOTIFY_FROM`) no ambiente correto, mais domínio/remetente validado no Resend. Configuração presente não equivale a entrega comprovada. Envio real continua condicionado à autorização.

## Testes e verificação

Validação consolidada do código em `50fdaa2`:

- `npm run lint`: aprovado.
- `npm test`: **45 arquivos aprovados, 204 testes aprovados; 1 arquivo/1 teste opt-in ignorado** por não fornecer fixture real no comando padrão.
- Execução opt-in com fixture dos oito imóveis: **9 testes aprovados**, incluindo regressão do encoding antigo.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado, Next.js 16.4.0 / React 19.3.
- `npx drizzle-kit check`: aprovado; gerações/migrations testadas apenas em bancos locais PGlite.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades de dependências de produção.
- Aviso não bloqueante do Vite sobre futura troca do loader de configuração; não confundir com falha.
- `git diff --check`: sem erro; diferenças de CRLF são avisos de normalização, não mudança de migrations aplicadas.

PGlite exercita SQL/constraints/transações, mas não substitui carga/concor­rência entre conexões Neon reais. Fluxo completo em Preview, desktop/celular, teclado/modais, uploads com storage real e verificação visual de `cd8fbd3`/`ace1ea7` **não realizados nesta rodada**.

## Banco real preservado

Projeto `wandering-snow-32301627`, branch `vercel-production` / `br-raspy-snow-b58wt9zz`, database `neondb`. Contagens reconfirmadas por SELECT ao encerrar o código:

| Entidade | Quantidade |
| --- | ---: |
| Imóveis | 8 |
| Fotos | 76 |
| Proprietários / vínculos | 8 / 8 |
| Clientes / negócios | 2 / 2 |
| Usuários / empresas | 2 / 1 |
| Documentos de imóveis | 0 |
| Entradas no journal | 15, até 0017 |

Nenhuma escrita externa foi executada. Arquivos reais, usuários, credenciais e acessos não foram alterados. Fixtures locais públicas dos PDFs permanecem ignoradas no Git para reprodução; fixtures sintéticas dos testes são efêmeras. Não houve remoção de dados reais nem limpeza externa.

## Migrations e divergência histórica

Novas, **não aplicadas em Neon**:

| Migration | Conteúdo |
| --- | --- |
| 0018 | MFA e marcação de sessão verificada |
| 0019 | Leases/tombstones de upload e histórico de operação |
| 0020 | Guards de contatos, dez fotos e intake sem mesclagem ambígua |
| 0021 | Alinha snapshot/schema do índice já corrigido por 0014; apenas verifica o índice físico, sem recriá-lo |

0010 local: `869b377ddedec16fc1e77eb294e8e8af820ae2a623e3eabb5f9355478204c0b3`.
0010 no journal Production: `872164be89fdf48f4211caf75da361104294d225d660f7a70ebb4a2071a43169`.

Os hashes diferentes permanecem documentados. Leitura de `pg_indexes` confirmou expressão `[^0-9]` e ausência do índice legado somente por nome, conforme 0014. 0021 impede regressão dos metadados Drizzle sem ocultar a divergência. Não alterei SQL 0010/0012–0017 nem hashes do histórico aplicado. Não executar db:push.

## Custos e dependências oficiais

Consulta em 13/10/2026, USD antes de impostos, sem contratação:

- Vercel Hobby destina-se a uso pessoal não comercial. Pro anunciado a US$20/mês, com crédito de uso de US$20; assentos e excedentes podem aumentar a fatura. O plano real desta equipe não pôde ser reconfirmado. Fonte: [Vercel Pricing](https://vercel.com/pricing), [Hobby](https://vercel.com/docs/plans/hobby).
- Cron Hobby: diário, precisão por hora; Pro permite frequência por minuto. Para o SLA desejado de lembretes será preciso definir frequência e plano. Fonte: [Cron pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Neon Free: histórico até seis horas ou 1GB de mudanças. Launch: US$0,106/CU-h, banco US$0,35/GB-mês, histórico US$0,20/GB-mês, janela configurável até sete dias. Estimativa de exemplo (não cotação): 100 CU-h + 1GB de banco = US$10,95, antes de histórico, storage de objetos, tráfego e demais consumos. Fonte: [Neon Pricing](https://neon.com/pricing).
- Banco e Object Storage precisam de estratégia de recuperação coerente; nenhuma estimativa acima comprova proteção/restauração dos arquivos.

## Commits locais e Preview

- `6ac1bcd` PDF robusto e proteção contra abuso.
- `731cd41` schema aditivo MFA/uploads.
- `12345e8` reconciliação dos metadados do índice.
- `96a5144` MFA opcional e recuperação.
- `221125f` permissões, defaults, provisionamento e contatos.
- `5b92730` branding, contexto Preview e domínio.
- `9e5a9a4` leases, privacidade/cache de fotos.
- `3585377` jobs independentes, histórico e e-mail simulado.
- `50fdaa2` PDFs reais e fixtures protegidas.
- `3a74944` relatório consolidado e gates de Preview/Production.

Nenhum push/deploy desta rodada. Preview reconfirmado na listagem Vercel: [86ocm9e0m](https://avan-aimoveis-86ocm9e0m-guitanakabrasil-7316s-projects.vercel.app), deployment `dpl_9R6f5gkf7yi7rW4JC5mFmT1omKwr`, READY, SHA `ace1ea73b0528fbc9f5b03f73514dd45205d1bae`, branch `feat/saas-multitenant`. A página consultada retornou 20 deployments. Não representa este conjunto corrigido e não foi declarado homologado.

## Pendências externas e prontidão

1. Preservar o acesso Vercel confirmado omitindo `teamId` e `slug`; projeto `avan-aimoveis`, ID `prj_UIoKDpgp9BxiORlABsmY60LlZJvE`. Configuração e escopos restantes ainda precisam ser verificados; não inferir necessidade de reconexão pelo 404 anterior. Após reiniciar, testar novamente o helper do navegador.
2. Confirmar Production Branch Git e hostname do DATABASE_URL/DIRECT_URL do Preview, storage e escopo dos segredos, sem revelar senhas. Não publicar este código contra schema antigo.
3. Disponibilizar ambiente isolado vazio/sem dados pessoais e espaço para branch de ensaio de restore; hoje há dez branches e não foi autorizado remover backup nem contratar capacidade.
4. Configurar segredos server-only de Preview, domínio Vercel e posteriormente Resend; nunca copiar credenciais de Production para simplificar testes.
5. Fornecer WhatsApp oficial da Avança e decisões comerciais de limites/preços/plano externo. Nada disso foi inventado.
6. Executar o roteiro de `docs/saas/AUDIT_RELEASE_RUNBOOK.md`, com testes pela interface e restore comprovado.
7. Só então solicitar aprovação final específica para migrations Production e publicação.

**Uso interno do novo release:** código pronto para ensaio controlado, mas não homologado para substituir Production. **Receber outras imobiliárias:** ainda não liberado; depende de Preview, domínio/segredos, limites comerciais e recuperação testada. Não declarar todos os milestones concluídos.
