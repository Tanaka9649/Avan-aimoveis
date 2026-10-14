# Roteiro seguro de homologação e release — auditoria 13/10/2026

Estado: preparado, **não executado em Preview/Production nesta rodada**. Evidências e bloqueios em [relatório](../audit-remediation-2026-10-13.md). Não usar um Preview com banco/segredos de teste como promoção direta para Production.

**Gate vigente antes da reinicialização:** o usuário pediu somente salvar/checkpoint, sem deploy ou migrations. As etapas de escrita abaixo são roteiro futuro, não autorização atual. Não fazer push que dispare deploy automático. Ver [checkpoint atualizado](CURRENT_CHECKPOINT.md).

## 1. Confirmar o destino antes de escrever

- Acesso de leitura Vercel confirmado: `get_deployment({idOrUrl: "imoveisplatform.vercel.app"})` e `list_deployments({projectId: "prj_UIoKDpgp9BxiORlABsmY60LlZJvE"})`, omitindo `teamId` e `slug`. Não solicitar reconexão antes de repetir essa combinação. Production retornou `48ccfa4` / READY; Preview mais recente `ace1ea7` / READY. Ainda ler configuração de projeto/equipe/Production Branch Git e aliases, sem inferir permissões de escrita a partir dessas consultas.
- Confirmar hostnames de DATABASE_URL e DIRECT_URL, sem copiar credenciais para relatórios. Resolver cada hostname no Neon; pooled/direct do mesmo endpoint diferem por `-pooler`.
- Production conhecida no Neon: projeto `wandering-snow-32301627`, branch `br-raspy-snow-b58wt9zz` / `vercel-production`. O nome `production` de outra branch não comprova vínculo Vercel.
- Confirmar banco, papel, branch pai, restore window e storage. Branch de banco isolada **não comprova automaticamente** isolamento dos buckets/credenciais.
- Inspecionar o journal: não repetir 0012–0017. Não editar o hash divergente de 0010 e não usar db:push.

## 2. Backup e restore ensaiado

1. Obter capacidade para uma branch adicional sem excluir backups existentes por iniciativa própria.
2. Criar backup fresco do destino correto, registrar branch ID, pai, instante e contagens. Confirmar quais objetos/versões do Object Storage estão incluídos; se não incluídos, preparar inventário e cópia separada autorizada.
3. Criar alvo isolado de restauração; nunca executar restore sobre a branch ativa para “testar”.
4. Restaurar o ponto escolhido no alvo isolado. Comparar contagens, relacionamentos, descrições, disponibilidade de fotos/documentos e journal. Testar login somente com fixture isolada; não alterar contas reais.
5. Registrar duração real, RPO/RTO observados e limite de retenção. Estado atual observado: Free seis horas, dez branches, nenhum snapshot listado. Backups de dias anteriores não substituem ensaio recente.
6. Não remover branch de backup/fixtures úteis até concluir a validação e ter autorização para limpeza.

## 3. Preview sintético

Preferir banco vazio/schema-only, não clone com dados pessoais. Manter autenticação/proteção do Preview; não desabilitar Vercel Authentication para facilitar testes.

Após confirmar hostname e isolamento:

1. Provisionar o schema revisado até 0021 no banco isolado, usando o journal normal. Conferir que scripts de build não migram Production.
2. Configurar variáveis somente no Preview: DATABASE_URL, DIRECT_URL, AUTH_PEPPER, IP_HASH_PEPPER, buckets/credenciais de teste, CRON_SECRET, MFA_ENCRYPTION_KEY. Chave MFA: 32 bytes aleatórios em base64; não imprimir, não compartilhar com Production.
3. Manter RESEND_API_KEY ausente; não apontar destinatários de lembretes para pessoas reais.
4. Preparar secretamente, fora de logs e histórico do terminal:
   - VERCEL_ENV=preview
   - AUDIT_EMPTY_DATABASE_CONFIRMED=verified-isolated-preview
   - AUDIT_DATABASE_URL: conexão do banco vazio confirmado (não há fallback para DATABASE_URL)
   - AUDIT_EXPECTED_DATABASE_HOST: hostname exato confirmado
   - AUDIT_PREVIEW_PASSWORD: senha aleatória de teste com pelo menos 16 caracteres
   - AUTH_PEPPER: o mesmo do Preview isolado
5. Executar `npx tsx scripts/seed-audit-preview.ts`. A fixture recusa banco com usuários, imóveis, clientes, proprietários, negócios, convites ou outros tenants; não modifica contas existentes. Repetição é recusada, sem sobrescrita.
6. Confirmar slugs `audit-synthetic-a` e `audit-synthetic-b`. Contas: `superadmin`, `admin-a`, `broker-a1`, `broker-a2`, `viewer-a`, `admin-b`, todas com domínio `@example.invalid`. Não enviar mensagem a esses endereços.
7. O plano Custom recebe limites **temporários**, identificados como AUDIT TEMPORARY - NOT COMMERCIAL. Não transferir essa configuração para o catálogo comercial de Production.
8. Publicar a branch apenas após confirmar que ela gera Preview e que o Preview usa os recursos isolados. Registrar URL imutável, alias de branch, SHA e hostname do banco no relatório.
9. Limpar as variáveis AUDIT_* do processo de seed ao encerrar; não persistir a senha no Git.

## 4. Matriz de testes pela interface

Registrar navegador, viewport, SHA, URL, resultado e evidência visual para cada passo. Executar desktop 1440px e celular 390px, tema claro/escuro, teclado e foco de modal.

- Login válido, inválido, loading, mostrar senha, desafio MFA/recovery, expiração de sessão. Inscrever apenas o Super Admin sintético.
- Empresa nova → plano configurado → WhatsApp obrigatório → convite local/simulado → ativação → seis etapas e três categorias → retry sem duplicação.
- Plano sem limites deve impedir progressão antes de pedir envio final. Não inventar limites comerciais.
- Imóvel → salvar rascunho → fotos JPG/PNG/WebP e HEIC de teste → documentos → revisão → publicação.
- `cd8fbd3`: fotos/documentos da revisão refletem adição, exclusão, capa e reordenação sem recarregar indevidamente; preservar limite dez.
- Lead público → cliente → oportunidade no funil correto → proposta → visita → PDF.
- `ace1ea7`: status/feedback da visita atualiza visualmente após salvar, sem manter select antigo.
- Mais de 100 visitas: navegar páginas e próximos eventos; sem esconder visitas futuras. Conferir histórico.
- Corretores A1/A2: somente seus clientes em listas, seletores, ações e detalhes. IDs da outra empresa devem ser recusados. Viewer pode ler, não salvar/mover/perder/fechar/anexar.
- Avatar/logo/favicon/404/links compartilhados mantêm a empresa; tenant sem logo não herda marca Avança. Nenhum link de Preview direciona para Production.
- Foto publicada 200; despublicar e repetir com If-None-Match deve negar acesso anônimo. Versão nova do objeto deve produzir bytes/ETag novos.
- Uploads concorrentes: capacidade reservada impede exceder cota/dez fotos entre conexões Neon distintas; confirmar lease versus limpeza. Rodar cron de limpeza somente no storage de teste.
- Cron sem Bearer recusado; execução autorizada com fixtures é idempotente. Job de fila não chama transporte de e-mail.
- Domínio/subdomínio de teste: desafio e DNS reais, vínculo à equipe/projeto correto, recusa de domínio ocupado e isolamento do tenant. Não comprar/registrar sem aprovação.
- Modais: Tab/Shift+Tab, Escape, foco devolvido ao acionador, mensagens de erro/loading; card Atrasadas sem sobreposição.
- Oito PDFs reais: repetir apenas leitura contra o código do Preview corrigido, sem publicar dados privados no fixture. Comparar texto completo e renderizar todas as páginas.

## 5. E-mail real somente depois

Transporte simulado já aprovado. Para futura validação real: domínio/remetente verificado no Resend; RESEND_API_KEY e AUTH_EMAIL_FROM no escopo certo; destinatário de teste controlado; autorização explícita de envio. Sem autorização, não executar endpoint de entrega em ambiente com clientes reais.

Cron diário atual não garante SLA de lembrete nem retentativa rápida. Escolher plano/frequência depois de verificar custos e exigências oficiais; não prometer precisão indisponível no Hobby.

## 6. Gate de Production e rollback

- Repetir typecheck/lint/test/build/drizzle check, validações HTTP/UI, contagens e estado das integrações imediatamente antes do release.
- Revalidar o SHA publicado e obter **aprovação final explícita** para aplicar 0018–0021 e publicar o código homologado.
- Criar backup fresco e comparar hashes do journal. Executar apenas migrations ainda ausentes. Todas devem ser ensaiadas antes em clone isolado; 0021 aborta se o estado já corrigido por 0014 não estiver presente.
- Conferir `scripts/check-release-schema.ts` no destino correto e healthcheck; publicar código com segredos de Production, não promover recursos de teste.
- Após release: leituras dos oito imóveis/PDFs/fotos, contagens, tenant/site/login, erros sanitizados e callbacks; não alterar senhas reais para smoke test.
- Rollback de código só é seguro se compatível com o schema aditivo **e com MFA já ativado**. Código antigo ignora MFA: **não voltar ao login anterior à implementação de MFA depois de inscrições reais**, pois isso contornaria o segundo fator. Preferir correção à frente ou rollback para versão que mantenha o guard MFA.
- Não remover colunas, tabelas, hashes ou dados para “desfazer” migration. Se houver corrupção, suspender escritas e restaurar em branch isolada; planejar reconciliação de escritas posteriores antes de trocar endpoints. Troca de endpoint/restore ativo exige aprovação por risco de perda.
- Restaurar banco e objetos de forma coordenada; não presumir que um rollback Vercel restaura o banco.
