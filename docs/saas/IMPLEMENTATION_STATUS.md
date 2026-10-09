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
| 15 — Preview/revisão | Preview READY; smoke test hospedado bloqueado externamente | Deployment dpl_FuATJ5EcLKfDijYqUkMPzJm2h1NC no commit f731116; Vercel SSO ativo e conexão recusou bypass autenticado com 403 |

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
- Etapa crítica pendente: alinhar o deployment Vercel Production ao código SaaS compatível

### Vercel

- Serviço: Vercel
- Projeto: avan-aimoveis (prj_UIoKDpgp9BxiORlABsmY60LlZJvE)
- Preview final: READY
- Proteção: Vercel SSO
- Etapa bloqueada: smoke test HTTP autenticado
- Evidência: web_fetch_vercel_url recebeu 403 em read_protection_bypass porque a conexão atual não possui acesso ao projeto/equipe para o bypass

## Baseline preservada

O código auditado era single-tenant. O Tenant Avança usa UUID determinístico 00000000-0000-4000-8000-000000000001, slug avanca-imoveis e recebe o backfill de todos os dados legados. O SQL não remove tabelas, registros ou objetos de storage.
