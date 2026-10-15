# CURRENT_CHECKPOINT

## Retomada — 15/10/2026 (estado mais recente)

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
