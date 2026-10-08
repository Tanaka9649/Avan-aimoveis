# Status da implementação SaaS

Atualizado em 08/10/2026.

| Milestone | Estado | Evidência |
|---|---|---|
| 0 — Auditoria | Concluído | Inventário do projeto real, arquitetura, plano de execução e riscos documentados |
| 1 — Data model | Concluído | Tenants, planos, memberships, convites, módulos, provisioning, analytics e auditoria; entidades operacionais com tenant obrigatório |
| 2 — Migração Avança | Código concluído; execução Production bloqueada por segurança | Migration 0008_saas_multitenant_foundation.sql, backfill determinístico e script de contagens; falta restore point e acesso ao Neon de Production |
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
| 14 — Testes | Concluído | CI verde: npm ci, typecheck, lint, 104 testes e build |
| 15 — Preview/revisão | Revisão concluída; Preview bloqueado externamente | GitHub CI verde; Vercel recusou novo build por limite de builds e a integração não permite listar deployments (403) |

## Checkpoint técnico

Última validação integral antes desta atualização: GitHub Actions quality, run 37776604529, commit c931eea884db4b415188432218d70b6aae398c31, conclusão success.

A revisão React/TypeScript manteve componentes server-first, consultas independentes em paralelo, estados vazios/erro, labels acessíveis e nenhuma dependência nova.

## Migração de Production não executada

A migration não foi aplicada ao Neon de Production porque a especificação exige, antes da escrita:

1. identificar inequivocamente projeto e branch Production;
2. criar/confirmar restore point ou branch de segurança;
3. executar npm run saas:counts e guardar o relatório anterior;
4. validar migration em Preview;
5. repetir contagens e comparar depois.

Nenhuma credencial foi lida, registrada ou solicitada no chat.

## Bloqueios externos reais

### Neon

- Serviço: Neon PostgreSQL
- Projeto: não exposto à sessão
- Permissão necessária: criar/confirmar restore point, consultar branch e executar migration
- Etapa bloqueada: aplicação e validação antes/depois da migration em Production

### Vercel

- Serviço: Vercel
- Projeto: avan-aimoveis (prj_UIoKDpgp9BxiORlABsmY60LlZJvE)
- Permissão/condição necessária: cota de build disponível e permissão de leitura de deployments
- Etapa bloqueada: Preview final e smoke test hospedado
- Evidência: status GitHub/Vercel failure com upgradeToPro=build-rate-limit; API de deployments respondeu 403

## Baseline preservada

O código auditado era single-tenant. O Tenant Avança usa UUID determinístico 00000000-0000-4000-8000-000000000001, slug avanca-imoveis e recebe o backfill de todos os dados legados. O SQL não remove tabelas, registros ou objetos de storage.
