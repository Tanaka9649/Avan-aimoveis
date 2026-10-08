# RESUME AFTER NEON ACCESS — Continuação segura da migração SaaS

Use este documento quando a implementação SaaS já tiver avançado até o ponto em que a migration multi-tenant está pronta, mas a execução foi bloqueada por falta de acesso confirmado ao Neon, impossibilidade de criar/confirmar restore point, falha do executor local, browser indisponível ou Preview Vercel protegido.

## Contexto

A especificação principal continua sendo:

`docs/saas/MASTER_SPEC.md`

Este documento NÃO substitui a MASTER_SPEC. Ele somente define como retomar a execução com segurança depois que o Neon estiver acessível no navegador/sessão.

A migration citada no bloqueio atual é:

`0008_saas_multitenant_foundation.sql`

Antes de executar qualquer migration, confirme o nome/caminho real no repositório.

## Objetivo

Retomar a transformação SaaS sem pedir novos prompts, priorizando:

1. preservar todos os dados existentes de Avança Imóveis e Rogério Cortes;
2. confirmar ambiente Neon;
3. criar/confirmar restore point ou branch de segurança;
4. registrar contagens antes;
5. aplicar migration somente no ambiente correto;
6. validar contagens e relacionamentos depois;
7. continuar automaticamente os milestones restantes;
8. não promover Production automaticamente.

## Regras críticas

- NÃO execute migration em Production sem confirmar explicitamente que o ambiente alvo é o correto.
- NÃO use `drizzle-kit push` em Production.
- NÃO crie novo projeto Neon.
- NÃO use Supabase.
- NÃO apague dados.
- NÃO faça migration destrutiva.
- NÃO promova Production.
- NÃO considere sucesso se o navegador apenas estiver aberto: confirme de fato que a sessão consegue ler o projeto Neon correto.
- Se existir mais de um projeto Neon, descubra pelo `DATABASE_URL`, `DIRECT_URL`, configuração do projeto e documentação existente qual pertence ao repositório.
- Nunca imprimir ou copiar DATABASE_URL, senha, token ou secret em logs/chat.

## Passo 1 — Revalidar o ambiente de execução

Antes de qualquer operação:

- confirmar repositório `Tanaka9649/Avan-aimoveis`;
- confirmar branch `feat/saas-multitenant`;
- verificar `git status`;
- reler `docs/saas/MASTER_SPEC.md`;
- reler `docs/saas/IMPLEMENTATION_STATUS.md`, se existir;
- identificar exatamente em qual milestone a execução parou;
- verificar se a migration `0008_saas_multitenant_foundation.sql` está presente e revisar seu conteúdo.

Se terminal/local executor estiver indisponível:
- tente usar o navegador/sessão conectada;
- se houver integração Neon disponível, use-a;
- se o browser estiver aberto no Neon, confirme visualmente/procedimentalmente o projeto correto;
- se ainda não for possível interagir com Neon, não execute a migration e registre o bloqueio.

## Passo 2 — Confirmar o projeto Neon correto

Confirmar pelo menos:

- nome do projeto;
- branch/database alvo;
- ambiente: Development, Preview ou Production;
- correspondência com as variáveis do projeto;
- que o banco contém os dados atuais da Avança.

Não adivinhar IDs.

Se houver dúvida sobre qual branch Neon corresponde a Preview/Development/Production:
- investigar as configurações já existentes do repositório/Vercel;
- não escolher arbitrariamente.

## Passo 3 — Criar proteção antes da migration

Antes da migration:

- criar/confirmar restore point, branch de segurança ou mecanismo equivalente no Neon;
- registrar data/hora e referência desse ponto de recuperação na documentação;
- não prosseguir sem uma forma realista de rollback.

Se a interface Neon tiver opção de branch:
- preferir branch de segurança/restore apropriado ao fluxo atual do projeto.

## Passo 4 — Registrar contagens ANTES

Executar consultas de contagem nas entidades tenant-owned relevantes.

No mínimo, descobrir as tabelas reais equivalentes a:

- properties
- property_photos
- customers
- opportunities/deals
- visits
- proposals
- sales
- owners
- attachments/documents
- activities/history
- users/memberships relevantes

Registrar os resultados em:

`docs/saas/MIGRATION_REPORT.md`

Formato sugerido:

```
Environment:
Neon project:
Neon branch/database:
Restore point/backup reference:
Migration:
Timestamp:

Before:
properties: X
property_photos: X
customers: X
...
```

Não incluir secrets.

## Passo 5 — Validar a migration antes de executar

Revisar `0008_saas_multitenant_foundation.sql` e confirmar:

- cria tenant sem apagar dados;
- adiciona `tenant_id` de forma segura;
- faz backfill dos registros existentes para Avança;
- não usa DROP destrutivo;
- não remove colunas necessárias;
- não cria constraint NOT NULL antes do backfill;
- índices/uniques são tenant-aware quando necessário;
- Tenant Avança é criado exatamente uma vez;
- migration é idempotente quando aplicável ou protegida pelo sistema de migrations;
- não altera credenciais.

Se qualquer ponto estiver inseguro:
- corrigir a migration primeiro;
- rodar testes;
- somente depois executar.

## Passo 6 — Aplicar em ambiente seguro primeiro

Se houver Development/Preview isolado:
- aplicar primeiro lá;
- validar;
- executar smoke tests;
- somente então considerar Production.

Se o projeto estiver configurado com Neon Development/Preview/Production:
- respeitar essa separação.

Production permanece intacta até a validação estar concluída.

## Passo 7 — Validar DEPOIS

Após migration:

- repetir todas as contagens;
- confirmar que os registros existentes continuam presentes;
- confirmar que todos os registros antigos foram associados ao Tenant Avança quando esperado;
- verificar constraints;
- verificar foreign keys;
- verificar usuários;
- verificar relações CRM;
- verificar fotos/documentos;
- verificar que não surgiram registros órfãos.

Atualizar `MIGRATION_REPORT.md`:

```
After:
properties: X
...

Validation:
- counts preserved: yes/no
- orphan records: 0/...
- Tenant Avança created: yes/no
- existing users preserved: yes/no
```

Se houver divergência não explicada:
- PARAR;
- usar restore/rollback;
- não avançar milestones.

## Passo 8 — Testes cross-tenant

Criar dados sintéticos de Tenant B somente em ambiente seguro.

Testar que Tenant B não acessa:

- imóvel da Avança;
- cliente da Avança;
- oportunidade da Avança;
- documento da Avança;
- proposta da Avança;
- analytics da Avança;
- storage key da Avança.

Resposta obrigatória:

403 ou 404, sem vazamento de metadados.

## Passo 9 — Preview Vercel

O erro 403 de Preview protegido NÃO deve ser tratado como falha do código.

Se a Preview exigir autenticação:
- usar sessão autorizada;
- ou testar via ambiente permitido;
- ou registrar que a proteção de Preview impede acesso anônimo.

Não desabilitar segurança de Preview apenas para concluir a tarefa sem necessidade.

Não promover Production.

## Passo 10 — Continuar automaticamente

Depois que migration + validação + isolamento estiverem seguros:

- continuar os milestones restantes da MASTER_SPEC;
- não pedir um novo prompt;
- atualizar `IMPLEMENTATION_STATUS.md`;
- rodar lint, typecheck, tests e build;
- fazer commits organizados;
- push da branch;
- deixar Preview/revisão pronta;
- não fazer merge automático;
- não promover Production.

## Se o executor/browser falhar novamente

Não tente contornar segurança inventando sucesso.

Registrar objetivamente:

```
Serviço: Neon / Vercel / executor local
Projeto:
Operação bloqueada:
Erro observado:
Acesso necessário:
Próxima ação segura:
```

Continue tudo que puder ser feito sem a operação externa.

## Instrução final

Se o Neon está agora aberto e acessível, tente novamente a partir do Passo 1 e siga até o fim. Não pare depois de criar o restore point ou aplicar a migration: valide, teste isolamento e continue os milestones restantes da MASTER_SPEC.

Só pare se:
- não for possível confirmar o projeto/branch Neon correto;
- não for possível obter proteção/rollback;
- houver risco real de perda de dados;
- uma integração externa indispensável continuar inacessível.
