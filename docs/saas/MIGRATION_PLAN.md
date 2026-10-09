# Plano de migração

## Pré-requisitos de Production

1. Confirmar projeto e branch Neon do ambiente.
2. Criar e registrar restore point ou branch de segurança.
3. Executar npm run saas:counts e guardar o relatório anterior.
4. Aplicar primeiro em Preview com fixtures sintéticas.
5. Revisar os SQLs efetivos de drizzle/0008_saas_multitenant_foundation.sql e drizzle/0009_tenant_relational_integrity.sql.
6. Executar npm run db:migrate uma única vez.
7. Repetir npm run saas:counts e comparar tabela por tabela.
8. Executar smoke tests autenticados e públicos antes da promoção.

## Estratégia

A migration é aditiva e idempotente nas estruturas principais:

- cria entidades SaaS, planos, módulos, memberships, convites, provisioning, analytics e auditoria;
- cria o Tenant Avança com UUID determinístico;
- adiciona tenant_id inicialmente nullable nas tabelas legadas;
- faz backfill integral para o Tenant Avança;
- promove tenant_id a NOT NULL somente depois do backfill;
- adiciona FKs e índices;
- converte unicidades de imóvel, etapa e métricas para chaves compostas por tenant;
- eleva somente o administrador legado ativo mais antigo a Super Admin global;
- mantém os demais administradores como memberships administrativas do Tenant Avança.

Nenhuma tabela, registro ou objeto de storage é removido. Objetos legados da Avança continuam legíveis; novos uploads usam prefixo tenants/{tenantId}/.

## Contagens mínimas

O script scripts/saas-counts.ts cobre as tabelas tenant-owned críticas. O relatório anterior e posterior precisa incluir, no mínimo:

- properties e property_photos;
- clients, deals, activities e anexos;
- visits, proposals e sales;
- owners e relações de propriedade;
- documentos e categorias;
- users, memberships e sessions;
- analytics e audit logs.

A soma por tenant depois da migration deve corresponder ao total anterior. Qualquer diferença bloqueia a promoção.

## Rollback

A migration não possui rollback destrutivo automático. Em incidente:

1. interromper promoção/deploy;
2. preservar logs e contagens;
3. restaurar uma branch Neon a partir do restore point;
4. validar a aplicação nessa branch;
5. trocar as variáveis do ambiente somente após smoke test.

Rollback de aplicação não desfaz schema. Preferir migration corretiva compatível para frente quando a restauração não for necessária.

## Estado atual

A 0008 foi executada com sucesso somente na branch Neon isolada test-saas-migration-2026-10-08, criada a partir de vercel-production, e preservou as contagens documentadas em MIGRATION_REPORT.md. A 0009 foi validada em PostgreSQL efêmero pela suíte local e ainda precisa ser executada e conferida nessa branch isolada. Nenhuma delas foi aplicada a vercel-production nesta etapa; essa escrita exige aprovação explícita.
