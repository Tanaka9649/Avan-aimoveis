# Neon: desenvolvimento isolado via GitHub Actions

## Escopo confirmado

- Neon **novo** projeto `avanca-imoveis-dev-isolado`, ID `lively-dawn-85746107`
- Branch `development`, ID `br-rapid-mud-b57m1bsh`
- PostgreSQL 18, região `aws-us-east-2`, banco `neondb`
- Endpoint PostgreSQL não-pooler esperado: `ep-empty-rain-b52xpcx0.c-7.us-east-2.aws.neon.tech`
- Projeto anterior `avan-aimoveis-dev` (ID `wandering-snow-32301627`) **fora do escopo**.

Este PR **não** altera conexões da Vercel, não migra produção, não cria um deployment e não toca nos dez branches antigos. A migração só será executada após merge e despacho **manual** com confirmação textual.

## Antes de executar pela primeira vez

1. Revise e aprove este PR. Ele adiciona apenas um workflow manual ao GitHub. O arquivo só aparece como workflow executável depois de entrar na branch padrão do repositório.
2. Acesse o Neon no navegador, projeto `avanca-imoveis-dev-isolado`, branch `development`, database `neondb`. Em **Connect**, escolha conexão **Direct** (não pooled). Confirme que o hostname é o endpoint indicado acima.
3. Em GitHub, abra este repositório em **Settings > Environments**. Crie `avanca-dev-isolado`. Configure, se disponível no plano, revisores obrigatórios e restrição de branches para a branch padrão.
4. Dentro desse ambiente GitHub, em **Environment secrets**, adicione `AVANCA_DEV_ISOLATED_DIRECT_URL` com a conexão Direct completa. Faça essa operação **diretamente nas interfaces Neon e GitHub**, nunca em chat, issue, pull request ou documento.
5. Verifique que o segredo está no **ambiente** `avanca-dev-isolado`, e não em Production da Vercel.

## Execução

Após merge na branch padrão, vá em GitHub **Actions > Neon DEV isolado - migrações manuais > Run workflow** e informe **exatamente** `MIGRAR-DEV-ISOLADO`.

Proteções do workflow:

- Referência de código de migrações **fixada** em `8d4d19bf3c09eff9f5c1d26484cda2b1c963498c` (`feat/saas-multitenant` no momento da preparação)
- Valida hostname exato, banco `neondb` e protocolo PostgreSQL antes de qualquer migração
- Exige banco vazio (o workflow não pode ser repetido automaticamente em banco já populado)
- Usa `npm ci` com lockfile e aplica `npm run db:migrate` (Drizzle, **não Prisma**)
- Ajusta o tenant criado pelas migrações para remover o domínio real da produção no banco de testes
- Confere que não existem usuários, clientes, imóveis nem domínios de tenants vinculados
- Nunca imprime a string de conexão nem roda deploy na Vercel

**Atenção:** se a migração interromper após criar algumas tabelas, não a execute novamente sem diagnóstico. O teste de banco vazio impedirá a repetição automática para evitar uma migração parcial inesperada.

## Depois da execução

Conferir no Neon as tabelas, migrações e contagem zero de usuários/clientes/imóveis, então planejar um Preview **separado** na Vercel, com credenciais e recursos de storage específicos de desenvolvimento. Não migrar nem alterar os valores Secret de Production.

## Backups existentes (pendência independente)

Os backups dos 10 branches antigos, 698 fotos e 5 documentos foram validados localmente. **Uma segunda cópia independente em nuvem ainda não foi realizada.** A criação deste projeto e o workflow não substituem essa cópia. A forma segura é armazená-los criptografados em um destino privado, preservando manifests e hashes, sem publicar em GitHub nem em site público.
