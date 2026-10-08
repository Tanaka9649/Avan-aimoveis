# Plano de execução

Fonte de verdade: [MASTER_SPEC.md](./MASTER_SPEC.md).

## Auditoria inicial

- Branch base: `feat/plataforma-base`; `feat/saas-multitenant` estava 1 commit à frente apenas com a especificação.
- Stack confirmada: Next 16.3.5, React 19.3, TypeScript 5.9, Drizzle 0.45, Neon/PostgreSQL, S3 compatível e Vitest 4.
- 22 tabelas operacionais sem `tenant_id`.
- Usuário possui role/access global; não existe membership.
- Login, painel, catálogo, leads, métricas, storage, sitemap e branding são globais.
- CI executa typecheck, lint, testes e build em todo push.

## Sequência

1. Modelo e migration aditiva/backfill do Tenant Avança.
2. Contexto central, sessão/membership e guards.
3. Provisionamento, convites e Super Admin.
4. Branding, site, rotas, slug e domínio.
5. Planos, quotas e módulos.
6. Analytics, auditoria e exportação.
7. Hardening, fixtures cross-tenant, CI e revisão final.

Cada etapa deve manter compatibilidade com os dados Avança e atualizar IMPLEMENTATION_STATUS.md.
