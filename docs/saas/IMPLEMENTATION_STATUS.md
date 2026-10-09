# Status da implementação SaaS

Atualizado em 09/10/2026.

| Milestone | Estado | Evidência |
|---|---|---|
| 0 — Auditoria | Concluído | Inventário do projeto real, arquitetura, plano de execução e riscos documentados |
| 1 — Data model | Concluído | Tenants, planos, memberships, convites, módulos, provisioning, analytics e auditoria; entidades operacionais com tenant obrigatório |
| 2 — Migração Avança | Aplicada em Production; deploy SaaS ainda pendente | 0008 e 0009 aplicadas em vercel-production após backup fresco; contagens preservadas, backfill validado e 25 constraints relacionais confirmadas |
| 3 — Contexto/isolamento | Concluído | Resolução por sessão, slug e hostname; consultas, APIs, storage, PDF e dados públicos escopados |
| 4 — Membership/convites | Concluído | Memberships, convite com token hash/expiração/uso único, quota incluindo convites pendentes e senha de conta existente preservada |
| 5 — Super Admin | Concluído | Dashboard global, busca/filtros, detalhe da empresa, status, plano, quotas, módulos e acesso auditado |
| 6 — Provisionamento | Concluído | Wizard em seis etapas, operação transacional, retry idempotente com rotação segura do convite e checklist persistido |
| 7 — Branding/site | Concluído | Marca, paleta, contatos, login e site público tenant-aware sem fallback para Avança |
| 8 — Rotas/domínios | Concluído em código | Rota por slug, histórico/redirect, custom domain, Vercel add/verify/remove e sitemap isolado |
| 9 — Planos/quotas | Concluído | Starter/Pro/Max/Custom, usage/limite visível e enforcement backend para usuários, imóveis, clientes, oportunidades, documentos, armazenamento e domínio |
| 10 — Módulos | Concluído | Registry central, dependências, validação de plano + tenant + permissão no backend e configuração self-service pelo admin do tenant |
| 11 — Analytics | Concluído | Eventos públicos, UTM separado do CRM, deduplicação, filtros, agregação e retenção configurável |
| 12 — Auditoria/exportação | Concluído | Ações sensíveis auditadas e exportação JSON tenant-aware sem hashes ou segredos |
| 13 — Hardening | Concluído em código | Fail-closed inclusive sem header Host, joins correlacionados por tenant, constraints relacionais compostas, rate limit, cookies seguros e invalidação de sessão |
| 14 — Testes | Concluído | 25 arquivos e 116 testes locais aprovados, incluindo Tenant A/B, constraints no PostgreSQL efêmero, quotas, convites, provisionamento, typecheck, lint e build |
| 15 — Preview/revisão | Production SaaS READY; smoke HTTP externo parcialmente bloqueado | Deployment Production dpl_FwfKojzCSCeL83vgU1oHjekD5b4j no commit 105cd06, alias imoveisplatform.vercel.app e aliasError=null; leitura de runtime errors permaneceu bloqueada por 403 da integração |

## Checkpoint técnico

Validação local em 09/10/2026:

1. npm run typecheck — aprovado;
2. npm run lint — aprovado;
3. npm test — 25 arquivos e 116 testes aprovados;
4. npm run build — aprovado com Next.js 16.3.5.
5. npx --no-install drizzle-kit check — journal e migrations consistentes.

Última validação integral anterior no GitHub Actions: run 37818736495, commit f731116ff6f297cb8bf73acd3de678ea20bbfc08, conclusão success.

Etapas confirmadas no CI:

1. npm ci;
2. npm run typecheck;
3. npm run lint;
4. npm test;
5. npm run build.

O Preview final do mesmo commit foi criado e está READY na região gru1, sem erro de alias.

## Correções operacionais adicionais

A auditoria de execução identificou e corrigiu dois problemas no checkpoint de migração:

- o comando documentado npm run saas:counts não estava registrado no package.json;
- scripts/saas-counts.ts consultava tenant_id em tabelas que não possuem a coluna antes da migration e também em users, que é global.

O relatório agora:

- funciona antes e depois da migration;
- detecta tabelas e colunas por introspecção;
- cobre as tabelas legadas e SaaS exigidas pelo plano;
- diferencia tabelas globais de tabelas tenant-owned;
- continua protegido por ALLOW_SAAS_COUNT_REPORT=true.

O hardening de 09/10/2026 também:

- registrou corretamente a migration 0008 no journal do Drizzle;
- adicionou 0009_tenant_relational_integrity.sql com FKs compostas tenant/recurso;
- eliminou leitura não escopada de proprietários no cadastro de imóvel;
- bloqueou apresentação de imóvel de outro tenant;
- correlacionou tenant_id nos joins críticos de dashboard, CRM, busca, propostas e ficha do cliente;
- tornou a resolução sem Host explicitamente fail-closed;
- incluiu convites pendentes na quota de usuários;
- impediu que a aceitação de convite redefina a senha global de uma conta existente;
- permitiu ao admin do tenant ativar/desativar módulos somente dentro do plano e com dependências válidas.
- tornou o retry de provisionamento idempotente e validou módulos contra o plano;
- aplicou quotas de oportunidades, documentos e armazenamento antes das respectivas criações/uploads;
- passou a exibir uso/limite efetivo no detalhe Super Admin.

## Configuração Vercel confirmada

As seguintes variáveis foram registradas para Preview e Production:

- PLATFORM_BASE_URL;
- VERCEL_PROJECT_ID;
- VERCEL_PROJECT_NAME;
- VERCEL_TEAM_ID;
- ANALYTICS_RETENTION_DAYS.

ROOT_DOMAIN não foi inventado porque ainda não há domínio raiz definitivo conectado. VERCEL_API_TOKEN não foi inventado nem exposto por ser um segredo operacional real.

## Migração de Production executada

As migrations 0008 e 0009 foram aplicadas ao Neon de Production em 09/10/2026 após aprovação explícita. O checkpoint confirmou:

1. projeto Neon avan-aimoveis-dev (wandering-snow-32301627);
2. branch com os dados atuais: vercel-production (br-raspy-snow-b58wt9zz);
3. backup: backup-pre-saas-vercel-production-2026-10-08 (br-old-rice-b5xkemer);
4. teste isolado: test-saas-migration-2026-10-08 (br-odd-water-b5e3f4vx);
5. migrations 0008 e 0009 validadas no clone antes de Production;
6. backup fresco `backup-pre-saas-production-2026-10-09` (`br-cool-sunset-b520s5i0`) criado imediatamente antes da execução;
7. contagens de Production preservadas e 25 constraints da 0009 confirmadas;
8. journal Drizzle de Production atualizado com 0008 e 0009.

Atenção operacional: o deployment Vercel de Production ainda apontava para código pré-SaaS no momento da migration. O próximo passo crítico é promover código compatível com tenant_id ou realizar uma ação deliberada de compatibilidade/rollback antes de considerar os fluxos de escrita/login plenamente operacionais. Nenhuma credencial foi registrada no repositório.

## Bloqueios externos reais

### Neon

- Serviço: Neon PostgreSQL
- Projeto: avan-aimoveis-dev
- Branch operacional: vercel-production
- Segurança: backup e branch isolada confirmados
- Etapa concluída: 0009 validada em branch isolada e 0008/0009 aplicadas em vercel-production após aprovação explícita
- Etapa concluída: deployment Vercel Production alinhado ao código SaaS compatível no commit `105cd06e045d9ccbf6b0cc9dbb038988ee6a3c16`
- Deployment: `dpl_FwfKojzCSCeL83vgU1oHjekD5b4j`, estado READY, alias `imoveisplatform.vercel.app`, aliasError=null
- Validação externa pendente: smoke HTTP detalhado/runtime errors não pôde ser concluído pela integração devido 403 de acesso à observabilidade

### Vercel

- Serviço: Vercel
- Projeto: avan-aimoveis (prj_UIoKDpgp9BxiORlABsmY60LlZJvE)
- Preview final: READY
- Proteção: Vercel SSO
- Etapa bloqueada: smoke test HTTP autenticado
- Evidência: web_fetch_vercel_url recebeu 403 em read_protection_bypass porque a conexão atual não possui acesso ao projeto/equipe para o bypass

## Baseline preservada

O código auditado era single-tenant. O Tenant Avança usa UUID determinístico 00000000-0000-4000-8000-000000000001, slug avanca-imoveis e recebe o backfill de todos os dados legados. O SQL não remove tabelas, registros ou objetos de storage.


## Refinamento visual interno — 09/10/2026

Foi aplicada uma rodada de correções e consolidação visual baseada na auditoria do produto, com escopo deliberadamente restrito às áreas autenticadas. O site público e todas as telas de login permaneceram visualmente fora de escopo.

Entregas principais:

- Design system interno consolidado em grafite/preto com azul de destaque, mantendo Manrope.
- Wizard de Nova Empresa reconstruído com stepper, validação por etapa, slug automático, preview e revisão.
- Analytics reconstruído usando os componentes visuais do painel.
- Editor multi-logo corrigido para o tema escuro e contraste interno.
- Super Admin ganhou navegação responsiva, identidade neutra da plataforma e labels em pt-BR.
- Detalhe de empresa no Super Admin reorganizado em abas.
- Configurações do tenant reorganizadas em seções/abas.
- Visitas, Propostas/Vendas e Proprietários passaram a priorizar a lista, abrindo cadastros em drawer.
- Dashboard passou a ter hierarquia entre KPIs principais e secundários.
- CRM ganhou CTA principal de Nova Oportunidade, busca compacta, contexto adicional nos cards, alerta visual de ação atrasada e atalho de WhatsApp.
- Status, papéis, planos, domínio, auditoria, pluralização e armazenamento foram humanizados para pt-BR.
- Ao acessar um tenant como Super Admin, uma faixa de contexto informa a impersonação e oferece retorno ao Super Admin.

Uma tentativa adicional de compactar as ações dos cards de imóveis foi revertida após falha de build no Preview. A versão estável anterior foi restaurada antes do deploy de Production.

Validação:

- Preview final do commit `36aaaebb8d0f2c9f77342da24b72bb25a9ee40a7`: READY.
- Production: deployment `dpl_37amrDAizSRwUzRK5wgXwj422uqs`, READY.
- Alias `imoveisplatform.vercel.app`: ativo, sem erro de alias.
- Nenhuma migration ou alteração de dados foi necessária nesta rodada.


## Hardening pós-auditoria interna — 09/10/2026

A segunda auditoria da plataforma interna encontrou problemas de confiabilidade e performance que foram tratados na branch `feat/saas-multitenant`, sem alterar visualmente o site público ou os logins.

### Dados e integridade

- Backup `backup-pre-owner-dedupe-2026-10-09` criado antes da limpeza.
- Duplicação histórica de proprietários corrigida em Production.
- 8 imóveis e 76 fotos preservados integralmente.
- Proprietários passaram de 20 registros históricos duplicados para 8 identidades canônicas.
- Migration 0010 adiciona proteção de unicidade para impedir regressão.
- Actions de imóvel e proprietário tratam conflito de identidade com mensagem amigável.

### Performance e consistência

- CRM passou a carregar somente as consultas necessárias para a visualização ativa (Funil ou Clientes), evitando o pacote completo de métricas em todas as visitas.
- Editor de imóvel passou a carregar proprietários, vínculos, fotos, documentos e clientes compatíveis em paralelo.
- Migration 0011 adiciona índices tenant-first para consultas frequentes.
- Estado de domínio sem custom domain foi normalizado e a UI passou a seguir a mesma semântica do motor de entitlements.

### UX/produto na branch

- Busca global agora encontra oportunidade também pelo cliente/contato.
- Perfil do usuário interno foi adicionado.
- Editor de imóvel ganhou Suítes, tipo Terreno e resumo sem repetição de proprietário.
- Analytics ganhou evolução diária e linguagem menos técnica.
- Páginas 404 internas já existem para Painel e Super Admin.
- Super Admin já possui Planos, Usuários e Auditoria com paginação/filtros.
- Imóveis exibem apenas Editar + menu de ações no card na versão atual da branch.

### Validação pendente de código

Não houve deploy desta rodada por decisão explícita do usuário e porque a Vercel havia atingido o limite diário de deployments. O status do Vercel para o head atual não substitui typecheck/lint/test/build local/CI.

Antes do próximo deploy é obrigatório executar:

1. `npm run typecheck`;
2. `npm run lint`;
3. `npm test`;
4. `npm run build`;
5. `npx --no-install drizzle-kit check`.

Nenhuma promoção para Production deve ocorrer se qualquer uma dessas validações falhar.
