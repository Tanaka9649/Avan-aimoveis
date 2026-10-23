# Neon DEV isolado: operação 100% na nuvem

## Projeto e estado verificado (23/10/2026)

- Neon: `avanca-imoveis-dev-isolado`, projeto `lively-dawn-85746107`
- Branch `development`: `br-rapid-mud-b57m1bsh`
- PostgreSQL 18, região AWS `us-east-2`, database `neondb`
- Endpoint Direct: `ep-empty-rain-b52xpcx0.c-7.us-east-2.aws.neon.tech`
- **Leitura direta no Neon após criação:** 42 tabelas `public`, 23 migrações registradas em `drizzle.__drizzle_migrations`, 0 usuários, 0 clientes, 0 imóveis, 0 fotos cadastradas, 0 negócios, 0 índices inválidos, 0 constraints não validadas, 0 domínios de tenant configurados.
- Tenant de desenvolvimento `Avanca Imoveis - DEV ISOLADO`, status `configuring`, sem domínio de produção.
- **A origem da aplicação das 23 migrações não foi identificada nesta operação.** O banco apareceu preenchido depois de uma consulta inicial que mostrava zero tabelas; não reexecute migrações sem investigar.

**Nenhuma migração, seed nem DDL foi executada neste PR.** O banco antigo `avan-aimoveis-dev` (`wandering-snow-32301627`) e a Vercel estão fora do escopo.

## Workflow preparado para verificação — somente leitura

O arquivo `.github/workflows/migrate-neon-dev-isolado.yml`, apesar do nome histórico, **não migra dados nem altera tabelas**. Apenas verifica o endpoint exato, as contagens e a integridade estrutural mínima. Não é acionado automaticamente.

Para usá-lo, após revisar e mesclar este PR na branch padrão:

1. No Neon, abra o projeto isolado e selecione branch `development`, banco `neondb`, **Direct** (não pooled). Confirme o hostname.
2. No GitHub, abra `Settings > Environments`, crie `avanca-dev-isolado` e configure revisores obrigatórios e restrições de branch se disponíveis no seu plano.
3. Adicione **Environment secret** chamado `AVANCA_DEV_ISOLATED_DIRECT_URL`. Cole a conexão completa **diretamente no GitHub**, nunca em chat, pull request, arquivo versionado ou logs.
4. Depois do merge, em **Actions > Neon DEV isolado - verificação manual > Run workflow**, informe `VERIFICAR-DEV-ISOLADO`.
5. O workflow deve terminar com `ISOLATED DEV READ-ONLY VERIFICATION APPROVED.`. Caso as contagens mudem, bloqueia o check. **Não há execução de migrações nem deploy.**

O código de verificação utiliza uma revisão fixa para dependências: `8d4d19bf3c09eff9f5c1d26484cda2b1c963498c`.

## Próximos marcos

- Para **migrations futuras**, revisar diferenças Drizzle e preparar um workflow separado explicitamente autorizado antes de executar qualquer DDL.
- Preparar Preview de teste na Vercel com banco e buckets exclusivos de desenvolvimento. **Não alterar variáveis Secret de Production** nem atribuir domínio de produção ao banco de testes.
- Guardar backups antigos em segunda cópia criptografada independente na nuvem. Hoje foram validados no Windows, mas **a segunda cópia cloud ainda não foi feita**.
- Não excluir nenhum dos 10 branches antigos até concluir associação de conexões e segunda cópia.
