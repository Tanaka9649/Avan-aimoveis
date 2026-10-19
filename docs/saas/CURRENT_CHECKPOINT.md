## Corretor A1 — isolamento inverso e atualização própria — 19/10/2026

- Sessão `AUDIT broker-a1` confirmada. Propostas mostra somente sua proposta `1519c412-5c5f-4b2e-9592-da1cd5191fee`; alterada de Em negociação para Enviada pela UI, persistência confirmada após reload.
- CRM mostra somente negócio A1. URL direta do negócio A2 `cb7ff5d7-f369-4ca5-9511-07f18b0f1fe2` retorna 404 interno. Painel do tenant B leva ao login de B sem expor dados.
- Isolamento bidirecional A1/A2 de leitura e escrita autorizada própria validado na UI. Não afirmar matriz completa de mutações HTTP com IDs manipulados: esse gate continua pendente, junto com retentativa de falha de upload, fluxo completo de venda e backup/restore antes de Production.
- Rodadas consolidadas abaixo são evidências do Preview de código `63caa91`. Este envio altera apenas documentação; código, migrations e Production permanecem inalterados. Capturas referidas nas rodadas são evidências locais da sessão.

## Corretor A2 — leitura isolada e criação própria — 19/10/2026

- Sessão `AUDIT broker-a2` confirmada no Preview 63caa91. Dashboard zero clientes/propostas/vendas antes da criação; CRM vazio; proposta do A1 não aparece na listagem nem seu negócio no seletor de Nova proposta.
- URL direta do negócio A1 `d2d6f74d-c0d5-4466-896e-ad1f8d524d96` retorna 404 interno. `/superadmin` retorna 404 público.
- Criados pela UI, como A2, cliente `AUDIT A2 20261019 Cliente próprio` (ID `2d2681e0-a490-4b61-8a5f-da00def5e000`) e oportunidade `AUDIT A2 20261019 Negócio próprio` (ID `cb7ff5d7-f369-4ca5-9511-07f18b0f1fe2`), ambos sintéticos no tenant A.
- SELECT confirma cliente atribuído a `broker-a2@example.invalid`, tenant A e valor estimado 23456789 centavos. Card próprio reaparece após navegação; seletor Nova proposta contém somente oportunidade A2.
- Esta rodada valida UI, GET direto negado e criação autorizada. Não equivale a teste HTTP de mutações com IDs manipulados. Próximo: sessão A1 para isolamento inverso e proposta própria.
- Sem mudanças de código, migrations, credenciais, deployment ou Production. Evidência `docs/saas/evidence/broker-a2-20261019.png` e checkpoint locais pendentes de lote documental.

## Proposta sintética e preparação de teste de escopo — 19/10/2026

- Sessão AUDIT superadmin confirmada no Preview 63caa91. Nova proposta aberta normalmente (a interrupção anterior não se reproduziu).
- Proposta `1519c412-5c5f-4b2e-9592-da1cd5191fee`, tenant A, negócio A1 `d2d6f74d-c0d5-4466-896e-ad1f8d524d96`, imóvel Fazenda `f71c4002-5b74-490e-bda4-41aae698b1e7`. Notas `AUDIT 20261019 proposta sintética — centavos e validação`.
- Anunciado 35000000057 centavos; ofertado 12345678 centavos. SELECT no banco sintético confirmou valores exatos e validade `2026-10-21T02:59:59Z` = fim do dia 20/10 em São Paulo. UI exibe corretamente R$ 350.000.000,57 e R$ 123.456,78.
- Campo anunciado obrigatório bloqueou submissão vazia no navegador, mantendo preenchimento. Status Contraproposta foi aceito com contraproposta monetária vazia (NULL); não tratar como teste de rejeição nem inferir regra obrigatória inexistente.
- Status atualizado para Em negociação, confirmado na UI e após recarregamento. Formulário mobile 390×844 ocupa 390px sem ultrapassar lateral; screenshot inspecionada, viewport restaurado.
- Concluir venda abriu; proposta em negociação não aparece entre propostas aceitas. Nenhuma venda submetida, preservando Fazenda e negócio A1 para testar escopo.
- Próximo passo: sessão broker-a2@example.invalid para testar isolamento da proposta/negócio A1 e acesso a mutações. A evidência de superadmin não substitui prova de autorização de corretor/admin.
- Nenhuma migration, mudança de credencial, novo deployment ou escrita em Production. Checkpoint e evidências locais aguardam lote de documentação.

## QA03 — wizard com duas logos concluído no Preview — 19/10/2026

- Usuário selecionou as duas imagens na etapa Identidade. Cadastro percorreu Site, Recursos (plano `AUDIT TEMPORARY - NOT COMMERCIAL`), Administrador e Revisão; ausência de WhatsApp rejeitada com preservação dos campos. Contato sintético `+55 11 90000-0000`, e-mails `example.invalid`.
- Uma única submissão criou `AUDIT Logo 20261019`, slug `audit-logo-20261019`, tenant `1ecad888-c0ca-4d68-ac7f-abc3bec3a768`, status `configuring`, no banco sintético `br-falling-firefly-b57arz1t`.
- Duas logos PNG persistidas em `branding_assets`, ambas confirmadas e pertencentes ao novo tenant: 350692 e 339389 bytes. Branding usa URLs estáveis `/api/branding/<tenantId>/<asset>`; ambas abertas no navegador e imagens renderizadas após sair do wizard. Nenhum blob URL persistido.
- Super Admin reaberto: armazenamento 673,9 KB; Configuração mostra Identidade visual, Módulos, Plano, Site e Empresa concluídos (uma tentativa cada); Convite do administrador pendente. Não houve aceite de convite nem criação de senha.
- Override RESEND_API_KEY da branch Preview confirmado vazio novamente; 13 overrides mantêm data de atualização anterior. Nenhuma variável alterada ou e-mail real enviado. Não registrar token do convite no Git.
- Login do tenant `configuring` retorna tela vazia; código usa `notFound()` para tenant não operacional. Não validado login/site desse novo tenant como ativo; não alterar status para contornar provisionamento.
- QA03 upload/persistência passou. Retentativa após falha de upload não induzida; matriz completa de mutações por papel, demais fluxos de propostas e gate de restore continuam pendentes. Produção intacta, sem migration ou novo deployment nesta rodada.

## Validação mobile e retomada do wizard — 19/10/2026

- Preview `63caa91`: sessão AUDIT superadmin confirmada na UI. Em 390×844, busca de imóveis mede 317px para formulário de 317px (antes 76,75px); screenshot confirma campo legível. Viewport restaurado.
- Super Admin acessível. Wizard preenchido localmente com `AUDIT Logo 20261019`, slug `audit-logo-20261019` e e-mail `audit-logo-20261019@example.invalid`; chegou à etapa Identidade. Marca: `AUDIT Logo — teste sintético`.
- Upload aguarda seleção de imagem sintética no computador do usuário; nenhum arquivo enviado e nenhuma empresa criada nesta rodada. Não repetir criação sem verificar resultado. Aba mantida para continuação.
- Nenhuma alteração de credenciais, migration ou escrita em Production. QA03 permanece pendente até upload/persistência e conclusão do fluxo.

# CURRENT_CHECKPOINT

## Preview da correção mobile — 19/10/2026

- Commit remoto `63caa91aa3422127bdea033cf5ed663bf8dfd0a7`, deployment `dpl_FRNwrrMhxoYriBxUL7wLZHUVRHZt` READY, Preview https://avan-aimoveis-oen7jkbha-guitanakabrasil-7316s-projects.vercel.app . Git local sincronizado; commit local equivalente preservado na branch checkpoint/mobile-local-20261019. Push terminal sem credenciais; integração GitHub concluiu o envio com lease sobre ef1553a.
- Production reconfirmada em 48ccfa4, sem alteração. Nenhuma migration criada/aplicada.
- Validação visual da correção publicada aguarda sessão no novo domínio; wizard/logo exige Super Admin sintético. Abertura da nova proposta no Preview anterior ficou sem resposta; chamada interrompida, nenhuma proposta submetida.
- Este registro posterior ao deploy fica local para o próximo lote; não gerar deploy documental duplicado.

## Admin A e correção de busca mobile — 19/10/2026

- Login real AUDIT admin-a confirmado no Preview `ef1553a` (nw55pmas9). Empresa B redireciona para login próprio; `/superadmin` recusa com 404. Não equivale à matriz completa de mutações cross-tenant.
- Nova visita sintética com data 20/10/2026 09:00: submissões Realizada e Não compareceu recusadas com mensagem adequada; cliente, imóvel, data e observações preservados. SELECT na branch sintética não encontrou visita com marcador AUDIT 20261019 após a primeira recusa.
- Imóvel `f71c4002-5b74-490e-bda4-41aae698b1e7`: preço redigitado e salvo como admin; SELECT antes/depois no Preview confirmou status disponivel, price_cents 35000000057 e published_at 2026-10-15T18:45:41.593Z, sem despublicação. Mensagem Imóvel salvo correta.
- Mobile: formulário de busca tinha 317px e campo de busca apenas 76,75px, flex computado 1 1 0%; regra legada `.filter-row label:first-child` sobrescrevia o flex responsivo. Correção aumenta a especificidade dos seletores existentes em 1180/760px, sem alterar site público ou regras de negócio. Validação visual do novo deployment ainda pendente.
- Galeria pública da cópia QA-001-7B7797 carregou imagem e abriu diálogo com texto 1 de 1 em 390px. Segunda captura ficou sem resposta e a chamada foi interrompida; não tratar essa captura como evidência obtida.
- Lint e TypeScript aprovados. Primeiro build falhou ao abrir persistência do cache Turbopack (invalid digit found in string); `.next` preservado em `/tmp/avan-next-before-build-20261019`, build limpo concluído com sucesso. Conexão com navegador voltou a responder; viewport restaurado.
- Sem migrations, mudanças de credenciais ou escrita em Production. Próximos gates: Preview da correção mobile, wizard/logo com Super Admin, demais fluxos de propostas e homologação completa.


## Viewer e verificação mobile parcial — 19/10/2026

- Sessão real AUDIT viewer-a confirmada no Preview `ef1553a`, URL https://avan-aimoveis-nw55pmas9-guitanakabrasil-7316s-projects.vercel.app . Nenhuma mutação de dados submetida nesta rodada.
- Imóveis: sem criação/edição; menu da Fazenda somente Ver no site/Gerar PDF; R$ 350.000.000,57 preservado na exibição. URLs diretas de novo imóvel e nova oportunidade recusadas com 404/sem acesso.
- Viewport 390×844: lista de imóveis e ficha rápida do CRM inspecionadas visualmente; ficha cabe na largura, upload desabilitado, Escape fecha diálogo. Consulta de visitas (incluindo Todas) e propostas sem controles de escrita. Viewport restaurado ao encerrar.
- Observação para próxima correção visual: busca da lista de imóveis fica estreita em 390px, truncando quase todo o placeholder. Ainda sem ajuste ou validação de correção. Não declarar mobile completo: galeria pública, temas, fluxos de edição e wizard continuam pendentes.
- Testes locais nesta rodada: `npm test -- src/lib/access-regression.test.ts src/lib/tenant-backend-isolation.integration.test.ts --maxWorkers=1 --testTimeout=30000`: 24 aprovados, 2 arquivos, 33,49s. Exercitam guards de actions/APIs, escrita entre empresas e escopo de corretores; não equivalem a POST autenticado no deployment.
- Próximo passo: login seguro admin-a para validar formulários/visitas/propostas; superadmin para wizard/logo. Nenhuma migration, push, deployment, alteração de credencial ou escrita em Production nesta rodada. Registro local para integrar ao próximo lote, evitando deploy exclusivamente documental.


## Escopo dos corretores — 17/10/2026

- Wizard: login real de AUDIT superadmin confirmado; preenchidos somente os campos locais de AUDIT Logo 20261017 até Identidade. Antes de selecionar arquivo, navegador recusou observação por `retained_data_restricted` após entrega nativa de credenciais e reiniciou a conexão. Nenhum upload ou criação de empresa foi executado. QA03 permanece pendente por bloqueio do navegador.
- Leitura Vercel confirmou RESEND_API_KEY vazio no override exclusivo de Preview/branch; 13 overrides mantêm data de atualização de 14/10. Endpoint de storage Neon da branch sintética confirmado; o valor S3 sensitive da Vercel continua não retornável, portanto não houve nova comparação direta do segredo. Nenhuma variável alterada. Não foi criado deploy manual.

- Revalidação autenticada posterior como AUDIT viewer-a no mesmo Preview: `/painel/imoveis/novo` e `/painel/crm/novo` recusadas (tela 404/sem acesso). Ficha do cliente A1 consultável, sem ações de favoritos/apresentações/nova oportunidade; aba Dados sem editor e Histórico sem formulário. Oportunidade A1 consultável com aviso de leitura, upload desabilitado e R$ 350.000.000,57. Lista de proprietários sem criação e ficha `701f1c1f-bf3c-4e09-8ecb-a7ee04f125f0` sem editor. Nenhuma tentativa de mutação nesta rodada; guards de servidor foram executados na suíte anterior de 248 testes, não repetida para esta alteração documental.

- GitHub e Vercel reconfirmados: HEAD `e30b6dd0fc7e8d67cf4c34537eed35b11d812a23`, deployment `dpl_GdGuXSAT2eQVV6ui9egBn9zfMMr6` READY, Preview https://avan-aimoveis-nvqonybcu-guitanakabrasil-7316s-projects.vercel.app . Checkout limpo antes deste registro.
- Rodada anterior no mesmo Preview: A1 criou pela interface o cliente `1fa035d9-5db4-4b52-b93f-af8af12536c6` (AUDIT A1 20261016 Escopo próprio) e a oportunidade `d2d6f74d-c0d5-4466-896e-ad1f8d524d96` (AUDIT A1 20261016 Negócio próprio). SELECT no Preview confirmou atribuição a broker-a1@example.invalid e valor de 35000000057 centavos. Registros preservados como evidência.
- Nesta rodada, login seguro confirmou AUDIT broker-a2. Dashboard sem clientes próprios e CRM com zero negócios. URLs diretas do cliente e da oportunidade acima renderizaram 404/sem acesso, sem exibir os dados do A1. Nenhuma mutação submetida como A2.
- Isso valida essas leituras por escopo no navegador; não equivale à matriz completa de mutações/IDs entre empresas. Wizard/logo, mobile 390px e a matriz completa de mutações continuam pendentes; revalidação de leitura do Viewer registrada acima. Sem nova migration ou alteração em Production.

## Rotas diretas de leitura — 16/10/2026, continuação

- Sessão real AUDIT viewer-a preservada no Preview 381aff7. Configurações administrativas retornaram 404/sem acesso.
- Reproduzidos formulários indevidos nas URLs diretas Novo imóvel, Nova oportunidade, ficha de cliente (favoritos/apresentações) e ficha completa de oportunidade (edição/upload). Nenhuma criação ou alteração foi submetida nessa rodada.
- Correção exige requireWriteModule antes de renderizar páginas de criação, e usa canWrite nas fichas de clientes, oportunidades e proprietários, incluindo anexos e reabertura. Mantém dados/histórico em leitura.
- Teste novo executa as páginas de criação com identidade viewer e confirma recusa antes das consultas; 9 testes do arquivo de guards aprovados. Lint e TypeScript aprovados. Suíte completa: 248 aprovados e 1 ignorado, 49,86 s.
- Incluída a confirmação documental local e517b8c no mesmo lote de código, evitando publicação documental separada. Sem migration ou alteração em Production. Revalidação do novo Preview deve ser registrada após publicação.


## Viewer autenticado — 16/10/2026

- Preview `dc8226365c0d87f51dedba64974325c3ed1d746b` READY, URL https://avan-aimoveis-9pzdy64gs-guitanakabrasil-7316s-projects.vercel.app . Sessão real confirmada como AUDIT viewer-a após entrada segura manual.
- Lista de imóveis sem criação/edição/publicação/exclusão; menu da Fazenda contém somente Ver no site e Gerar PDF. CRM informa acesso de leitura; ficha sem edição, upload desabilitado. Visitas sem agendamento.
- Defeito reproduzido: detalhe de imóvel ainda exibia editor para Viewer. Salvar sem modificar campos retornou página de acesso negado/404 do servidor. Correção substitui o editor por consulta com dados, fotos e documentos para usuários sem canWrite; permissões do servidor preservadas.
- Admin A no mesmo Preview: salvar a fixture mostrou a mensagem corrigida “Imóvel salvo”, preço exibido preservado em R$ 350.000.000,57. Esta rodada não fez SELECT de confirmação.
- TypeScript e lint aprovados; suíte completa com 247 aprovados e 1 ignorado (48,02 s); Correção publicada em `381aff7896963ce6b4748e30e311468afdf121b9`, deployment `dpl_H9e9i3a8DJmiC2NMf8AA9Nw3cfwD` READY: https://avan-aimoveis-hzrshwhhr-guitanakabrasil-7316s-projects.vercel.app . Reautenticado como AUDIT viewer-a nesse Preview: detalhe mostra “Consultar imóvel” e “Seu acesso permite apenas consultar este imóvel”, preço R$ 350.000.000,57, sem formulário ou botão de salvar. Propostas no Preview anterior também apresentaram apenas consulta. Não declarar matriz completa de escrita/escopo, corretores, mobile ou wizard homologados. Nenhuma migration ou alteração em Production.


## Homologação autenticada parcial — 15/10/2026, retomada

- Baseline limpo e sincronizado `b5b005f`; Preview mais recente reconfirmado READY `dpl_4xiVDgrnHdpUimXyBDQALmHCRDGj`, executando esse commit: https://avan-aimoveis-depnd8v1v-guitanakabrasil-7316s-projects.vercel.app . O commit contém somente documentação sobre o código `9aec044`.
- Navegador local falhou com `Sheep MCP session closed: RPC INTERNAL`. Navegador cloud abriu o Preview; após uma tentativa inválida, autenticação segura fornecida pelo usuário confirmou AUDIT admin-a / Administrador da empresa A. Nenhuma credencial foi lida ou alterada.
- Admin A: painel, CRM, lista de imóveis e edição da Fazenda abriram. Atalho `/painel/crm` foi corretamente contextualizado para `/empresa/audit-synthetic-a/painel/crm`. Acesso ao painel B redirecionou para o login B; `/superadmin` exibiu página 404, sem dados administrativos. Esses testes não substituem a matriz completa de autorização por endpoint/ID.
- Salvar sem modificar campos a fixture `AUDIT-QA15-20261015` pelo formulário autenticado preservou status `disponivel`, preço `35000000057` centavos e published_at `2026-10-15T18:45:41.593Z`. SELECT antes/depois exclusivamente na branch sintética `br-falling-firefly-b57arz1t` confirmou os valores. Não houve despublicação ou correção de registros antigos.
- Falha visual reproduzida: sucesso dizia "Rascunho salvo" para imóvel publicado. Texto corrigido para "Imóvel salvo", sem mudança de regras ou schema. Verificação/publicação da correção deve ser confirmada no deployment resultante.
- Ainda pendentes: viewer e corretores em sessões reais, escrita negada no Preview, fluxos restantes de formulários/visitas/propostas/wizard/upload, mobile 390px e recuperação ensaiada. Não pronto para Production. Nenhuma migration, seed, redefinição de senha ou escrita de Production nesta retomada.

## QA15 implementada e migration isolada — 15/10/2026

Correções, evidências e limitações em [QA15_2026_10_15.md](QA15_2026_10_15.md). Migration 0022 aplicada somente ao Preview sintético; dados anteriores preservados. Código enviado em `8ec7dcd` e `9aec044`; Preview READY `dpl_HTdvy8TFzYwWcHyCDhWaz8rCNx3J`, executando `9aec044b8e8902915b505c3b1cd6ea82f33db27e`: https://avan-aimoveis-dk1aq7zpd-guitanakabrasil-7316s-projects.vercel.app . Validação pública no navegador confirmou tipos, limite com centavos, preservação do formulário inválido e abertura da galeria. Suíte final: 247 aprovados, 1 ignorado; lint, TypeScript e build aprovados. Homologação autenticada/mobile bloqueada pelo mecanismo de navegador, não concluída. Production permanece sem alteração.

## Recuperação e conciliação — 15/10/2026 (histórico anterior à QA15)

- Terminal e integração GitHub responderam normalmente nesta sessão; fetch do GitHub concluído.
- Checkout original recuperado em `/workspace/scratch/5e7a5b1d52d0/avan-imoveis`, branch `feat/saas-multitenant`, limpo antes da conciliação, HEAD `f66fe57e3b210ce8f6f6670b4e112f113b1ecffa`.
- Remoto encontrado em `5bbe16fcdd9c41afab5129c7fddc07661261882c`. Seu registro de não recuperação se refere àquela sessão; nesta sessão o commit original foi localizado. Os registros foram conciliados; o commit original permanece preservado no histórico local.
- Trabalho recuperado: somente documentação em CURRENT_CHECKPOINT.md e QA_REMEDIATION_2026_10_14.md. Código de aplicação permanece idêntico a `ad67ecc`.
- Envio documental autorizado pelo usuário, sem promoção para Production. Nenhuma migration, alteração de variável, credencial ou execução de workflow de release nesta retomada.
- Estados de Preview/Production e resultados de testes abaixo são registros anteriores; não houve nova homologação ou consulta à Vercel nesta conciliação. O push por terminal falhou por falta de autenticação; o envio usa a integração GitHub. Validação autenticada e mobile permanece pendente.

## Retomada anterior — 15/10/2026

- Novo ambiente: o diretório e o commit local `f66fe57` da sessão anterior não foram transferidos e não foram recuperados. Este registro substitui o conteúdo que ele teria. Repositório clonado do GitHub no commit `ad67ecc581fbab100dac6b463e926ef1ac2c1a06`, branch `feat/saas-multitenant`, árvore limpa.
- Preview atual conferido na Vercel: `dpl_Hm4uSjwKWXc891KP9eAvvS5PHKT6`, READY, commit `ad67ecc`, mesmo código do GitHub. Este commit é só documental e não deve gerar novo Preview (`[skip ci]`).
- Production conferida sem alteração: `dpl_8w3WsvFyMiTbsA24fpUAJJXrjtCx`, commit `48ccfa4`, READY. Existe também `dpl_BygjqayGMaoUYA3Pn9s3kE3X5jyS` (target production, sem commit Git, 13/10) em ERROR no passo `node recovery.cjs`; corresponde aos jobs de recuperação encerrados de propósito, sem efeito no site.
- Neon conferido somente com leitura: Preview sintético `br-falling-firefly-b57arz1t` com 19 migrations (última 0021); Production `br-raspy-snow-b58wt9zz` com 15 migrations (até 0017). Nenhuma migration aplicada.
- Suíte completa executada em 15/10 no ambiente anterior, sobre o código de `ad67ecc`: 48 arquivos aprovados e 1 ignorado; 214 testes aprovados e 1 ignorado; cerca de 40,70 s. Comando: `npm test -- --maxWorkers=1 --testTimeout=30000`. O teste ignorado depende da fixture opcional de PDFs reais. O log (`/tmp/avan-qa-20261015.log`) não foi transferido; o resultado vem do relatório da sessão anterior, não de nova execução.
- Validação pública no navegador (sessão anterior): preço com centavos R$ 799.900,50; busca "acao" encontra "Ação"; foto única carregou no desktop; telefone inválido no formulário de lead mostrou erro e preservou os campos.
- Conferência de código nesta retomada (leitura, sem execução): as actions de imóveis, CRM, clientes, visitas, propostas e proprietários, a movimentação de etapas e as rotas de upload de fotos e documentos passam por `requireWriteModule`, que exige `canWrite` (owner, admin, manager, agent ou super admin). Perfil de leitura fica de fora. Não comprova o comportamento em execução; configurações, usuários e branding não foram revisados.
- NÃO concluído: validação autenticada no Preview (admin A, viewer A, corretores, isolamento A/B, upload de logo no wizard, imóvel publicado, formulários, valores, visitas) e validação mobile em 390 px. Bloqueios nesta sessão: o chat não está vinculado a um computador (sem navegador) e `work/audit-preview/secrets.json` não existe aqui. Nenhum usuário foi recriado e nenhuma senha alterada.
- Continuam pendentes: QA15 (tipos de imóvel e valores acima de int32), QA17 (limites e preços dos planos, decisão do proprietário), MFA opcional, Resend/domínio de e-mail, e os gates de Production (backup/recuperação, 0018–0021 não aplicadas em Production, aprovação final).

## Preview publicado — 14/10/2026

- Autorização do usuário: publicar Preview; Production não promovida.
- Branch Production confirmada no painel Vercel: `feat/plataforma-base`. Código publicado na branch `feat/saas-multitenant`, commit `150f637ee15ed10ec18f9f5590e26dfb81a125b8`; tree `d681a579fa22527cf5cf236968764ae598e615ab`, idêntica ao conteúdo local validado. Push de terminal falhou por ausência de autenticação; envio concluído via integração GitHub, com lease no HEAD anterior.
- Deployment Preview: `dpl_ESuBDo4BQz3HjEjGBXusiwbHnKhA`, READY, build 79 segundos. URL: https://avan-aimoveis-kje4xl97n-guitanakabrasil-7316s-projects.vercel.app
- Configuradas 13 variáveis exclusivamente para Preview / feat/saas-multitenant: banco sintético br-falling-firefly-b57arz1t, armazenamento da mesma branch com nova credencial de leitura/escrita, buckets existentes, peppers exclusivos, MFA_ENCRYPTION_KEY, CRON_SECRET. RESEND_API_KEY vazio para impedir e-mails reais. Credenciais não incluídas no Git.
- Reconfirmado banco sintético: 19 migrations, 6 usuários e zero imóveis. Nenhuma migration reaplicada nesta rodada.
- Navegador remoto abriu página inicial (portfólio vazio esperado) e /login. Isso não comprova login autenticado, MFA, upload ou homologação completa; matriz UI permanece pendente.
- /api/health não validado: navegador retornou ERR_BLOCKED_BY_CLIENT. Fetch protegido via conector retornou 403 no acesso ao bypass; leitura de deployment funciona. Logs de build pelo conector retornaram 404; painel confirmou READY. Não remover proteção nem pedir reconexão como pré-condição para ler o projeto.
- Production reconfirmada após deploy: imoveisplatform.vercel.app permanece em dpl_8w3WsvFyMiTbsA24fpUAJJXrjtCx / 48ccfa4, READY. Nenhuma variável, migration ou credencial de Production alterada.
- Este registro documental é salvo localmente após o deploy, sem novo push para evitar build duplicado. Próximo passo: homologação autenticada do Preview antes de qualquer release de Production.

## Banco sintético preparado — 13/10/2026 (estado mais recente)

- Após autorização do usuário para preparar a branch vazia, atualizado exclusivamente `wandering-snow-32301627` / `br-falling-firefly-b57arz1t` / `neondb` (`vercel-preview`). Endpoint: `ep-polished-brook-b5pxuxkk.c-7.us-east-2.aws.neon.tech`.
- Journal inicial: uma entrada cujo hash corresponde exatamente à migration 0003 local; nenhuma outra conexão cliente ativa observada antes da alteração. Migrations pendentes 0004–0021 aplicadas em transações por migration, com hash e timestamp registrados. Histórico inicial preservado, sem inventar entradas 0000–0002.
- A primeira tentativa da 0008 foi recusada pela API por múltiplos comandos em prepared statement. Confirmado rollback (tenants ausente e journal ainda na 0007); instruções SQL separadas respeitando blocos dollar-quoted e reexecutadas com sucesso. Total final: 19 entradas, última 0021 (`1791915223817`).
- Fixture sintética criada atomicamente usando `previewFixtureQueries`, com guarda de banco vazio: `audit-synthetic-a` (5 membros) e `audit-synthetic-b` (1 membro), cada uma com seis etapas e três categorias. Seis contas `@example.invalid`, sem envio de e-mail. Custom identificado como configuração temporária de auditoria, não comercial.
- Segredos exclusivos de testes gerados com aleatoriedade criptográfica, em `work/audit-preview/secrets.json`, modo 0600, ignorado pelo Git. Nenhum valor publicado. Ainda NÃO configurados na Vercel; não usar essa fixture com outro AUTH_PEPPER.
- Consultas finais confirmam tabelas user_mfa e operation_run_events no banco sintético. Production reconferida: 10 imóveis, 2 usuários, 15 migrations, user_mfa ausente; nenhuma escrita direcionada a Production.
- Nenhuma branch foi excluída/resetada. Nenhum push/deploy ou mudança de variável Vercel realizado. Overrides da branch Git ainda apontam para o Preview anterior: banco sintético pronto não significa novo Preview publicado ou interface homologada.
- Próximo passo: configurar recursos/segredos desse banco sintético no escopo específico do Preview, garantir e-mails desativados e credenciais de storage ancoradas em br-falling-firefly-b57arz1t, então publicar Preview autorizado e executar a matriz UI. Backup/restore de Production continua pendente antes de qualquer release em Production.

## Inspeção externa somente leitura — 13/10/2026, após transferência

- Vercel Production reconfirmada em `48ccfa461e24896827739bad2cc5dcb2dcfee445`, deployment `dpl_8w3WsvFyMiTbsA24fpUAJJXrjtCx`, READY. Preview mais recente informado pelo projeto: `dpl_9R6f5gkf7yi7rW4JC5mFmT1omKwr` (código anterior ao patch).
- Neon mantém 10 branches. `br-raspy-snow-b58wt9zz` agora contém **10 imóveis**, 2 usuários, 2 clientes e 2 negócios; a contagem histórica de 8 imóveis não é mais baseline atual. Nenhuma escrita executada nesta inspeção.
- Production e `br-falling-frost-b5ce9ke1` têm 15 entradas no journal; hashes das cinco últimas conferem com 0013–0017 locais. 0018–0021 não foram executadas nesta inspeção.
- `br-falling-frost-b5ce9ke1` contém 10 imóveis e 3 usuários, logo não serve como banco vazio para o seed sintético que exige ausência de dados.
- Vercel tem overrides de DATABASE_URL/DIRECT_URL e credenciais S3 para `feat/saas-multitenant`. URLs de banco e chaves S3 são Secret e não retornam valores pela API; o destino efetivo do banco não foi reconfirmado apenas por esses metadados. Não considerar comentários de variáveis prova de isolamento.
- Endpoint S3 da branch Git foi lido pelo endpoint individual de env: `br-falling-frost-b5ce9ke1.storage.c-7.us-east-2.aws.neon.tech`. Neon lista credencial `avan-feature-preview-storage` ancorada nessa branch, mas o valor oculto da Vercel não pôde ser comparado. Buckets: `property-documents` privado e `property-photos` public_read.
- Candidata para homologação sintética sem excluir branches: `vercel-preview` / `br-falling-firefly-b57arz1t`. Consultas confirmaram zero usuários, imóveis, clientes, negócios, proprietários, fotos, documentos, sessões, visitas, propostas, vendas e atividades; os dois buckets estão vazios. Schema antigo, sem tenants, e apenas 1 migration registrada. Ainda exige conferir journal/schema completo e vínculos antes de reutilização; não foi resetada nem migrada.
- MFA_ENCRYPTION_KEY não consta nas variáveis do projeto. CRON_SECRET e RESEND_API_KEY constam como Secret, sem confirmação de valor; não inferir configuração válida ou vazia. E-mail real permanece fora dos testes.
- Nenhum push, deploy, migration externa, seed, exclusão, mudança de credenciais ou configuração foi realizado.

## Transferência para o ambiente remoto — 13/10/2026

- Patch cumulativo `ace1ea7-to-113fb9f` recebido e aplicado sem conflitos sobre checkout limpo `ace1ea73b0528fbc9f5b03f73514dd45205d1bae`.
- SHA-256 conferido: `0945ebd484f9bbf4917ebeaaf0771959c859c97588b543103115787c2a79ac11`. Verificações `git apply --check`, reversa e `git diff --check` aprovadas.
- 103 entradas recuperadas; `.env.example` excluído conforme manifesto. O patch não recria os 11 commits do Windows: alterações permanecem locais, sem commit/push neste ambiente.
- Verificação repetida neste ambiente: typecheck, lint, build e `drizzle-kit check` aprovados; 204 testes aprovados e 1 teste opt-in ignorado. O ensaio dos oito PDFs reais não foi repetido nesta transferência, pois sua fixture não integra o pacote.
- Build e verificação de metadados executados com URLs de banco locais fictícias, sem conexão ao Neon. Testes de integração padrão usam banco local em memória.
- Navegador remoto conseguiu ler o dashboard Vercel com sessão autenticada; isso resolve o bloqueio de navegação neste ambiente, não a instalação Windows.
- Nenhum push, deploy, seed, restore ou migration externa executado. Continuam pendentes a confirmação dos recursos isolados e a homologação do novo release em Preview; manter o gate de escrita abaixo até autorização.

## Estado vigente — 13/10/2026 (substitui as conclusões históricas abaixo)

- Branch `feat/saas-multitenant`, base sincronizada `ace1ea7`; código validado até `50fdaa2`, relatório salvo em `3a74944` (dez commits locais antes deste checkpoint documental). Sem push/deploy desta rodada.
- Production não foi escrita ou migrada. Consulta Vercel somente leitura reconfirmou `imoveisplatform.vercel.app`: deployment `dpl_8w3WsvFyMiTbsA24fpUAJJXrjtCx`, target `production`, estado `READY`, SHA `48ccfa461e24896827739bad2cc5dcb2dcfee445`.
- Neon lido: `wandering-snow-32301627` / `vercel-production` / `br-raspy-snow-b58wt9zz` / `neondb`; 8 imóveis, 76 fotos, 8 proprietários/8 vínculos, 2 clientes, 2 negócios, 2 usuários, 1 empresa, 0 documentos.
- Journal real: 15 entradas até **0017**. As listas antigas até 0012 abaixo são históricas, não o estado atual. Não reaplicar 0012–0017.
- 0010 possui hashes local/Production diferentes; 0014 já reconciliou o índice físico. Histórico preservado. Schema/snapshot alinhado com verificação não destrutiva na nova 0021.
- Novas migrations **0018–0021 locais, não executadas no Neon**. Leases, MFA, guards de contatos/fotos e histórico operacional dependem dessas migrations antes do novo código.
- Validação final: lint/typecheck/build aprovados; 204 testes / 45 arquivos aprovados, 1 opt-in ignorado no padrão; mais 9 testes opt-in dos oito PDFs reais. PDFs válidos/200 pelo handler local, descrições completas e 12 páginas revisadas visualmente.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades. `drizzle-kit check`: aprovado.
- Acesso Vercel a deployments confirmado sem `teamId`/`slug`; o 404 das consultas anteriores com escopo explícito não é bloqueio geral de conexão. Configuração/bindings/segredos do Preview ainda não confirmados. Navegador helper continua pendente; restore externo não ensaiado (última leitura: 10 branches/limite10, retenção6h). Sem homologação UI desktop/mobile.
- E-mails reais não enviados; testes integralmente simulados. WhatsApp oficial da Avança ainda ausente. Nenhuma senha/papel/acesso real modificado.
- Uso interno do **novo release** e onboarding comercial ainda não liberados; aprovação de Production só depois da homologação e dos gates.
- Jobs anteriores de recuperação foram encerrados intencionalmente sem publicar o site, conforme esclarecimento do usuário; não tratados como falha de lançamento.

Detalhes, F01–F24, commits e custos: [relatório da auditoria](../audit-remediation-2026-10-13.md). Próxima execução: [runbook seguro](AUDIT_RELEASE_RUNBOOK.md). Dados sintéticos preparados, não semeados externamente.

## Checkpoint antes de reiniciar — 13/10/2026

Pedido mais recente: salvar alterações e pendências, **sem deploy e sem migrations**. Este checkpoint altera somente documentação e é salvo em commit local. Não fazer push (a integração Git pode disparar deploy), seed, restore, alteração de variáveis ou limpeza de branches nesta etapa. A retomada deve respeitar essa restrição até nova autorização.

### Consultas que funcionaram — preservar esta combinação

Omitir de verdade as chaves opcionais `teamId` e `slug`, não enviá-las vazias:

```json
get_deployment: { "idOrUrl": "imoveisplatform.vercel.app" }
list_deployments: { "projectId": "prj_UIoKDpgp9BxiORlABsmY60LlZJvE" }
```

- Ambas retornaram sucesso, sem reconexão. Projeto confirmado: `avan-aimoveis` / `prj_UIoKDpgp9BxiORlABsmY60LlZJvE`.
- A listagem retornou uma página de 20 deployments (não o total do histórico).
- Mais recente listado: `dpl_9R6f5gkf7yi7rW4JC5mFmT1omKwr`, `READY`, Preview (`target: null`), SHA `ace1ea73b0528fbc9f5b03f73514dd45205d1bae`, branch Git `feat/saas-multitenant`.
- URL do Preview: `https://avan-aimoveis-86ocm9e0m-guitanakabrasil-7316s-projects.vercel.app`. Não contém os commits locais de correção posteriores.
- Production e Preview existentes não foram criados ou modificados por estas consultas. Sucesso de leitura não comprova permissão de escrita, saúde funcional ou isolamento do banco.
- Não pedir reconexão nem recomendar upgrade apenas pelo 404 anterior. Causa exata da diferença de escopo ainda não diagnosticada; nenhuma evidência de limite do plano causando esse erro.

### Pendências para a próxima sessão

1. Conferir branch, HEAD e `git status`; ler este checkpoint e o runbook. Código já salvo: não refazer as correções nem confundir testes locais com homologação externa.
2. Testar se o navegador voltou após reinicialização; último erro `helper_unknown_error: setup refresh had errors`. Não presumir correção pelo restart.
3. Usar as consultas Vercel sem escopo acima como ponto de partida. Ainda confirmar em leitura a configuração Production Branch Git (não inferir da branch do commit), bindings DATABASE_URL/DIRECT_URL, armazenamento e segredos do Preview, sem expor valores sensíveis.
4. Reavaliar capacidade Neon e vínculos das branches. Não excluir/reutilizar/resetar branch com dados ou conexão ativa sem análise e autorização específica; não contratar plano por iniciativa própria. Backup/restore fresco e proteção dos objetos continuam pendentes.
5. Quando novamente autorizado, seguir o runbook para ambiente isolado, migrations 0018–0021, fixtures sintéticas e Preview. Não aplicar migrations nesta retomada apenas por estarem listadas aqui; não reaplicar o histórico até 0017.
6. Homologar login/MFA, cross-tenant e permissões, uploads/HEIC/documentos, cotas concorrentes Neon, PDFs, visitas, branding, desktop/mobile/teclado e domínios. Confirmar visualmente `cd8fbd3` e `ace1ea7`.
7. WhatsApp oficial, limites/preços comerciais, configuração externa e testes autorizados de e-mail continuam pendentes. E-mail real por último, sem atingir clientes.
8. Production exige aprovação final específica após os gates. Não fazer rollback para login sem MFA depois de inscrição real.

Nenhum código de aplicação foi alterado neste checkpoint; não se repetiram lint/test/build por ser alteração exclusivamente documental. Resultados anteriores estão registrados acima. Fixtures/PDFs locais em `test-results/pdf-audit/` seguem ignorados pelo Git; não incluir dados reais ou segredos no commit.

---

## Histórico de 10/10/2026 — não usar como confirmação atual

Atualizado após a rodada completa de refinamento interno pós-auditoria em 2026-10-10.

## Escopo preservado

- Site público e telas de login permanecem visualmente congelados.
- Nenhum merge automático foi realizado.
- Deploy em Production realizado após autorização explícita em 2026-10-10.
- Imóveis, fotos, clientes, oportunidades, documentos, propostas, vendas e usuários reais foram preservados.

## Banco / Production

Projeto Neon: `avan-aimoveis-dev`
Branch operacional: `vercel-production`

Estado real confirmado após a rodada:
- properties: 8
- property_photos: 76
- owners: 8
- property_owner_links: 8
- clients: 2
- deals: 2
- `properties.lot_area`: aplicado em Production e preservado como NULL nos 8 imóveis existentes

Migrations já aplicadas em Production:
- `0010_owner_identity_integrity.sql`
- `0011_internal_consistency_performance.sql`
- `0012_property_lot_area.sql`

0012 em Production:
- adiciona apenas `properties.lot_area numeric(10,2)`;
- sem backfill;
- sem alteração automática dos imóveis existentes;
- journal registrado com hash `b73dc544a36709d5d53a3e504c5addef9665a6b9b98ac3a23191180ed64dfc0b`.

Validação isolada da 0012:
- branch Neon: `test-0012-lot-area-2026-10-10`
- branch ID: `br-falling-frost-b5ce9ke1`
- origem: `vercel-production`
- journal registrado na branch de teste
- contagens antes/depois preservadas: 8 imóveis, 76 fotos, 8 proprietários, 8 vínculos, 2 clientes, 2 oportunidades
- `lot_area` dos imóveis existentes permaneceu NULL

## Código na branch feat/saas-multitenant

Rodada concluída:
- banner de acesso como empresa integrado ao fluxo do painel;
- tabela de clientes responsiva com ações em menu;
- menu de ações dos imóveis com posicionamento seguro e teste dedicado;
- controles/formulários internos reforçados para dark/light mode;
- helpers centralizados de data/hora em `America/Sao_Paulo`;
- labels internos centralizados em PT-BR;
- 404 interno real para Painel, Super Admin e painel de tenant;
- validação visível e foco no erro no wizard de nova empresa;
- dashboard com ações Atrasadas / Hoje / Próximas;
- Dashboard e Analytics alinhados à fonte canônica de eventos;
- área do terreno separada da área privativa/construída via migration aditiva;
- suítes exibidas nas listagens quando > 0;
- filtros compactos no funil, follow-up atrasado textual e microcopy revisada;
- fluxo único de fechamento de venda com validação de proposta aceita quando informada;
- oportunidades perdidas precisam ser reabertas antes de proposta/venda;
- planos administráveis usando o motor de entitlements existente;
- gestão segura de usuários globais e memberships por empresa;
- auditoria mais legível;
- upload real de branding com storage tenant-scoped, validação de MIME/bytes e URLs persistentes estáveis;
- componentes reutilizáveis para dropdown flutuante e controles administrativos;
- cobertura de regressão ampliada.

## Validação automatizada

Última validação completa em GitHub Actions:
- npm ci: OK
- npm run typecheck: OK
- npm run lint: OK
- npm test: OK — 32 arquivos / 139 testes
- npm run build: OK
- npx --no-install drizzle-kit check: OK
- npm audit --omit=dev --audit-level=high: OK — 0 vulnerabilidades

A integração Vercel gerou Preview automaticamente para a branch. Após autorização explícita, o commit `3257203aeabb9101da156a86915f5829924a999f` foi publicado em Production no deployment `dpl_39Xi7GUU84pvY9J8txLYrYsqTcLX` e o alias `imoveisplatform.vercel.app` foi apontado para ele.

## Observação de smoke test

O build lista e compila as rotas internas, inclusive os catch-alls de 404. A ferramenta conectada à Vercel não teve permissão para abrir o Preview protegido (403 no bypass), então não foi possível fazer smoke test visual autenticado pelo conector. Não usar credenciais reais para contornar essa proteção.

## Estado atual de Production

- migration `0012_property_lot_area.sql`: aplicada;
- deployment: `dpl_39Xi7GUU84pvY9J8txLYrYsqTcLX`;
- commit publicado: `3257203aeabb9101da156a86915f5829924a999f`;
- alias principal: `imoveisplatform.vercel.app`;
- contagens pós-migration preservadas: 8 imóveis, 76 fotos, 8 proprietários, 8 vínculos, 2 clientes e 2 oportunidades;
- nenhum imóvel existente recebeu valor automático em `lot_area`.

Não reaplicar `0010`, `0011` ou `0012`.

---

## Registro recuperado de 14/10/2026 — correções QA publicadas em Preview

- Código remoto e deployment: `ad67ecc581fbab100dac6b463e926ef1ac2c1a06` na branch `feat/saas-multitenant`.
- Preview `dpl_Hm4uSjwKWXc891KP9eAvvS5PHKT6`: READY, target Preview (`null`), sem promoção Production.
- URL: https://avan-aimoveis-gz09sf2xd-guitanakabrasil-7316s-projects.vercel.app
- Lint, TypeScript, build e 47 testes direcionados aprovados. Suíte completa não concluída por timeouts de preparação; os casos relevantes passaram isoladamente. Nenhuma migration ou seed executada.
- Navegador confirmou catálogo, centavos (R$ 799.900,50), busca acao encontrando Ação, foto única carregada com dimensões 1180×460 e campos preservados após POST inválido no formulário público (telefone inválido, resposta de validação).
- Painel do novo domínio abriu login, sem sessão autenticada. Próximo passo: autenticação segura do viewer-a para concluir QA13 e os fluxos internos. Não declarar homologação autenticada concluída.
- Banco sintético contém dados de auditoria anteriores com UF XX e suítes maiores que quartos: nova validação bloqueia novos cadastros inválidos; não altera dados existentes silenciosamente.
- Pendências: matriz completa no arquivo QA_REMEDIATION_2026_10_14.md, expansão de tipos/limite financeiro, definição comercial dos planos, Resend adiado; MFA continua opcional.
- Este registro foi originalmente salvo apenas no commit local `f66fe57`, após o deploy. Seu conteúdo foi recuperado e integrado ao checkpoint remoto em 15/10/2026; não confundir documentação enviada com nova versão publicada.

---
