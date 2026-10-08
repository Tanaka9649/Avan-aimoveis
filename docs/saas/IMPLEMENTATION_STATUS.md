# Status da implementação SaaS

Atualizado em 08/10/2026.

| Milestone | Estado | Evidência |
|---|---|---|
| 0 — Auditoria | Concluído | Inventário do projeto real, arquitetura, plano de execução e riscos documentados |
| 1 — Data model | Concluído | Tenants, planos, memberships, convites, módulos, provisioning, analytics e auditoria; entidades operacionais com tenant obrigatório |
| 2 — Migração Avança | Código e checkpoint concluídos; execução Production bloqueada por segurança | Migration 0008_saas_multitenant_foundation.sql, backfill determinístico e relatório pré/pós-migração; falta restore point e acesso ao Neon de Production |
| 3 — Contexto/isolamento | Concluído | Resolução por sessão, slug e hostname; consultas, APIs, storage, PDF e dados públicos escopados |
| 4 — Membership/convites | Concluído | Memberships, convite com token hash/expiração/uso único e ativação sem senha definida por administrador |
| 5 — Super Admin | Concluído | Dashboard global, busca/filtros, detalhe da empresa, status, plano, quotas, módulos e acesso auditado |
| 6 — Provisionamento | Concluído | Wizard em seis etapas, operação transacional/idempotente e checklist persistido |
| 7 — Branding/site | Concluído | Marca, paleta, contatos, login e site público tenant-aware sem fallback para Avança |
| 8 — Rotas/domínios | Concluído em código | Rota por slug, histórico/redirect, custom domain, Vercel add/verify/remove e sitemap isolado |
| 9 — Planos/quotas | Concluído | Starter/Pro/Max/Custom, entitlements centralizados, usage e overrides sem exclusão em downgrade |
| 10 — Módulos | Concluído | Registry central, dependências e validação de plano + tenant + permissão no backend |
| 11 — Analytics | Concluído | Eventos públicos, UTM separado do CRM, deduplicação, filtros, agregação e retenção configurável |
| 12 — Auditoria/exportação | Concluído | Ações sensíveis auditadas e exportação JSON tenant-aware sem hashes ou segredos |
| 13 — Hardening | Concluído | Fail-closed, host normalizado, rate limit, cookies seguros, tenant obrigatório e sessão invalidada na suspensão |
| 14 — Testes | Concluído | CI verde: npm ci, typecheck, lint, testes e build |
| 15 — Preview/revisão | Preview READY; smoke test hospedado bloqueado externamente | Deployment dpl_FuATJ5EcLKfDijYqUkMPzJm2h1NC no commit f731116; Vercel SSO ativo e conexão recusou bypass autenticado com 403 |

## Checkpoint técnico

Validação integral: GitHub Actions quality, run 37818736495, commit f731116ff6f297cb8bf73acd3de678ea20bbfc08, conclusão success.

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

## Configuração Vercel confirmada

As seguintes variáveis foram registradas para Preview e Production:

- PLATFORM_BASE_URL;
- VERCEL_PROJECT_ID;
- VERCEL_PROJECT_NAME;
- VERCEL_TEAM_ID;
- ANALYTICS_RETENTION_DAYS.

ROOT_DOMAIN não foi inventado porque ainda não há domínio raiz definitivo conectado. VERCEL_API_TOKEN não foi inventado nem exposto por ser um segredo operacional real.

## Migração de Production não executada

A migration não foi aplicada ao Neon de Production porque a especificação exige, antes da escrita:

1. identificar inequivocamente projeto e branch Production;
2. criar/confirmar restore point ou branch de segurança;
3. executar npm run saas:counts e guardar o relatório anterior;
4. validar migration em Preview;
5. repetir contagens e comparar depois.

Nenhuma credencial foi registrada no repositório ou exposta no chat.

## Bloqueios externos reais

### Neon

- Serviço: Neon PostgreSQL
- Projeto/branch: não expostos às ferramentas conectadas desta sessão
- Permissão necessária: criar/confirmar restore point, consultar branch e executar migration
- Etapa bloqueada: contagens, aplicação e validação da migration em Preview e Production

### Vercel

- Serviço: Vercel
- Projeto: avan-aimoveis (prj_UIoKDpgp9BxiORlABsmY60LlZJvE)
- Preview final: READY
- Proteção: Vercel SSO
- Etapa bloqueada: smoke test HTTP autenticado
- Evidência: web_fetch_vercel_url recebeu 403 em read_protection_bypass porque a conexão atual não possui acesso ao projeto/equipe para o bypass

### Executor local

O terminal e o navegador autenticado desta sessão falham antes de iniciar com helper_unknown_error: setup refresh had errors. Esse erro impede usar a sessão local já autenticada para operar o Neon Console ou executar os scripts existentes.

## Baseline preservada

O código auditado era single-tenant. O Tenant Avança usa UUID determinístico 00000000-0000-4000-8000-000000000001, slug avanca-imoveis e recebe o backfill de todos os dados legados. O SQL não remove tabelas, registros ou objetos de storage.
