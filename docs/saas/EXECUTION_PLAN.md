# Plano de execução

Fonte de verdade: MASTER_SPEC.md.

## Auditoria inicial

- Branch base auditada: feat/plataforma-base; a execução ocorreu em feat/saas-multitenant.
- Stack confirmada: Next 16.3.5, React 19.3, TypeScript 5.9, Drizzle 0.45, Neon/PostgreSQL, S3 compatível e Vitest 4.
- Baseline: 22 tabelas operacionais sem tenant_id, usuário com role global, login/site/storage/sitemap/branding single-tenant.
- CI existente: npm ci, typecheck, lint, testes e build em todo push.

## Sequência executada

1. Modelo SaaS e migration aditiva/backfill do Tenant Avança.
2. Tenant context, sessão/membership, guards e isolamento de todas as superfícies operacionais.
3. Convites, provisionamento idempotente, wizard e Super Admin.
4. Branding, site público, login, rotas, slug history, SEO e domínios.
5. Planos, quotas, usage, overrides e Module Registry.
6. Analytics próprio, retenção, auditoria e exportação.
7. Hardening do schema, fixtures cross-tenant, CI e revisão React/TypeScript.
8. Tentativa de inspeção do Preview Vercel e registro dos bloqueios externos.

## Decisões de segurança

- Tenant autenticado vem da sessão, não do formulário, query string ou header público.
- Tenant público vem de host/slug normalizado e persistido.
- Tenant Avança é regra explícita do domínio raiz, nunca fallback de dados.
- tenant_id é obrigatório no schema e no SQL após backfill.
- Storage novo usa prefixo de tenant; leitura privada valida vínculo no banco.
- Suspensão invalida sessões e não remove dados.
- Migração Production depende de restore point e contagens antes/depois.
- Nenhuma biblioteca foi adicionada; a stack existente resolveu o escopo.

## Checkpoints

Cada conjunto de mudanças foi enviado à branch e validado na CI. O último checkpoint de código antes da documentação passou npm ci, typecheck, lint, 104 testes e build. A aplicação da migration em Production e o Preview hospedado permanecem operações externas separadas, descritas em IMPLEMENTATION_STATUS.md.
