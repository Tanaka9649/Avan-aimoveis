# Plano de migração

## Pré-requisitos de produção

1. Confirmar projeto/branch Neon e ambiente.
2. Criar restore point/branch de segurança.
3. Registrar contagens das tabelas tenant-owned.
4. Executar primeiro em Preview.
5. Aplicar a migration uma única vez.
6. Recontar e comparar antes de promover a aplicação.

## Estratégia

A migration é aditiva: cria estruturas SaaS, cria o Tenant Avança idempotentemente, adiciona `tenant_id` inicialmente nullable, faz backfill, valida ausência de nulos, adiciona FKs/índices e somente então aplica NOT NULL. Unicidades de imóvel e etapas passam a ser compostas por tenant.

Nenhum objeto de storage legado é movido ou removido. Novos uploads recebem prefixo de tenant.

## Contagens mínimas

`properties`, `property_photos`, `clients`, `deals`, `visits`, `proposals`, `sales`, `owners`, documentos, anexos, atividades, usuários e memberships.

A migration de produção não está autorizada sem restore point e relatório antes/depois.
