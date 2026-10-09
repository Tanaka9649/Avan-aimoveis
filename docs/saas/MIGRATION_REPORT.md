# SaaS Migration Report

## Scope

Validation of `drizzle/0008_saas_multitenant_foundation.sql` on an isolated Neon test branch before any Production migration.

## Neon project

- Project: `avan-aimoveis-dev`
- Project ID: `wandering-snow-32301627`
- Production data branch identified: `vercel-production`
- Production branch ID: `br-raspy-snow-b58wt9zz`

The branch named `production` was inspected and found to be nearly empty compared with `vercel-production`, which contains the current operational Avança data.

## Safety branches

Backup branch created before testing:

- `backup-pre-saas-vercel-production-2026-10-08`
- Branch ID: `br-old-rice-b5xkemer`
- Parent: `vercel-production`
- State: READY

Isolated migration test branch:

- `test-saas-migration-2026-10-08`
- Branch ID: `br-odd-water-b5e3f4vx`
- Parent: `vercel-production`
- State: READY

No migration was applied to `vercel-production`.

## Counts before migration on test branch

- properties: 8
- property_photos: 76
- clients: 2
- deals: 2
- owners: 20
- users: 2
- property_documents: 0
- opportunity_attachments: 0
- visits: 0
- proposals: 0
- sales: 0

## Migration executed

Migration:

`drizzle/0008_saas_multitenant_foundation.sql`

The statements were executed as a transaction on:

`test-saas-migration-2026-10-08`

## Validation after migration

Counts preserved:

- properties: 8
- property_photos: 76
- clients: 2
- deals: 2
- owners: 20
- users: 2

Tenant foundation:

- tenants: 1
- tenant_memberships: 2
- super_admins: 1
- plans: 4
- Avança enabled modules: 8
- analytics_events: 0
- analytics_daily: 0

Tenant 1:

- ID: `00000000-0000-4000-8000-000000000001`
- Name: `Avança Imóveis e Rogério Cortes`
- Slug: `avanca-imoveis`
- Status: `active`
- Plan: `max`
- Standard domain: `imoveisplatform.vercel.app`

NULL tenant validation after backfill:

- properties: 0
- clients: 0
- deals: 0
- owners: 0
- property_photos: 0
- property_documents: 0
- opportunity_attachments: 0
- visits: 0
- proposals: 0
- sales: 0
- property_views: 0
- whatsapp_clicks: 0

Membership validation:

- Avança memberships: 2
- owner memberships: 1

## Result

The multi-tenant foundation migration completed successfully on the isolated test branch and preserved the observed operational data counts.

## Production migration — 09/10/2026

Explicit approval was obtained and migrations `0008_saas_multitenant_foundation.sql` and `0009_tenant_relational_integrity.sql` were applied transactionally to:

- branch: `vercel-production`
- branch ID: `br-raspy-snow-b58wt9zz`

A fresh pre-migration backup branch was created immediately beforehand:

- `backup-pre-saas-production-2026-10-09`
- branch ID: `br-cool-sunset-b520s5i0`
- state: READY

Production counts before and after were preserved:

- properties: 8
- property_photos: 76
- owners: 20
- clients: 2
- deals: 2
- users: 2
- visits: 0
- proposals: 0
- sales: 0
- property_documents: 0

Post-migration validation:

- tenants: 1
- tenant_memberships: 2
- super_admins: 1
- verified tenant relational constraints from 0009: 25
- NULL tenant_id in verified core tables: 0
- Avança operational records found under a different tenant: 0

The Drizzle database migration journal was also updated with the exact SHA-256 hashes and timestamps for 0008 and 0009.

Important deployment checkpoint: the Vercel Production deployment was still on pre-SaaS commit `40a4b93641e6144c6534a213344740406256d8b6` when this migration completed. That code does not model the new mandatory `tenant_id` columns, so Production application writes/login flows must not be considered fully compatible until the SaaS code is promoted or a deliberate compatibility/rollback action is taken.

## Application hardening after the Neon test

On 09/10/2026 the application audit added:

- Drizzle journal registration for 0008;
- `0009_tenant_relational_integrity.sql`, which adds composite tenant/resource foreign keys;
- fail-closed resolution when Host is absent;
- stricter tenant-correlated joins and write validation;
- invitation quota enforcement and protection against password replacement;
- Tenant A/B integration tests covering clients, properties, visits, proposals, sales, owners, memberships and database constraints.

Local validation after these changes: 25 test files and 116 tests passed, plus typecheck, lint, Drizzle migration consistency check and the production build. The 0009 migration was subsequently validated on the isolated Neon branch and then applied to `vercel-production` together with 0008 after explicit approval.


## Integridade de proprietários — 09/10/2026

Após auditoria da plataforma interna, foi confirmada duplicação histórica de proprietários no Tenant Avança. Antes de qualquer correção foi criada uma branch de segurança a partir de `vercel-production`:

- `backup-pre-owner-dedupe-2026-10-09`
- branch ID: `br-noisy-leaf-b5jwzw49`
- estado: READY

Contagens antes da correção:

- properties: 8
- property_photos: 76
- owners: 20
- property_owners: 20
- clients: 2
- deals: 2

A migration `0010_owner_identity_integrity.sql` foi validada primeiro na branch isolada e depois aplicada a `vercel-production`. A correção:

- preserva o proprietário canônico mais antigo por identidade dentro do mesmo tenant;
- move os vínculos de imóveis para o registro canônico;
- elimina somente registros duplicados de proprietário e vínculos redundantes;
- adiciona proteção de unicidade por telefone normalizado, e-mail normalizado e, como fallback sem contato, nome normalizado;
- não altera nem exclui registros de imóveis ou fotos.

Validação depois da correção em Production:

- properties: 8
- property_photos: 76
- owners: 8
- property_owners: 8
- clients: 2
- deals: 2
- grupos de identidade duplicada: 0
- todos os 8 imóveis continuaram com um proprietário vinculado.

Hash registrado no journal para 0010:

`872164be89fdf48f4211caf75da361104294d225d660f7a70ebb4a2071a43169`

## Consistência interna e performance — 09/10/2026

A migration `0011_internal_consistency_performance.sql` também foi validada primeiro na branch isolada e aplicada depois em Production.

Ela não remove nem altera imóveis, fotos, clientes, oportunidades, propostas ou vendas.

Mudanças:

- normaliza `domain_status` para `pending` quando não existe custom domain;
- adiciona 11 índices tenant-first para caminhos frequentes de CRM, clientes, visitas, propostas, proprietários e fotos.

Validação pós-0011:

- properties: 8
- property_photos: 76
- owners: 8
- clients: 2
- deals: 2
- índices novos confirmados: 11
- tenants sem custom domain com status de domínio inconsistente: 0

Hash registrado no journal para 0011:

`8f19db876c6a814a895ab51867ed0f90d2bf9954cb23f9b3c9593b72d0a6eab4`
