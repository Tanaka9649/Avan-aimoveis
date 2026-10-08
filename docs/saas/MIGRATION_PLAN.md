# Plano de migração

## Pré-requisitos de Production

1. Confirmar projeto e branch Neon do ambiente.
2. Criar e registrar restore point ou branch de segurança.
3. Executar npm run saas:counts e guardar o relatório anterior.
4. Aplicar primeiro em Preview com fixtures sintéticas.
5. Revisar o SQL efetivo de drizzle/0008_saas_multitenant_foundation.sql.
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

A migration está implementada e validada por typecheck, lint, testes e build, mas não foi executada em Production. Sem acesso ao projeto Neon e sem restore point verificável, aplicar o SQL violaria o checkpoint de segurança da especificação.
