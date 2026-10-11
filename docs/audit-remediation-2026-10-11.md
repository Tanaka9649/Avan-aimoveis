# Correções da auditoria — 11/10/2026

Base inspecionada: `feat/saas-multitenant` em `caf4f8a`; produção em `3257203`; migration 0012 já aplicada. Nenhuma migration antiga foi repetida ou reescrita.

## Mudanças

- WhatsApp obrigatório na etapa Administrador do assistente de nova empresa, com a pergunta solicitada, validação no cliente e no servidor e armazenamento internacional. Contatos existentes podem ser corrigidos em Configurações. CTAs sem número válido não são exibidos. Nenhum telefone da Avança foi inventado.
- Planos existentes continuam operando. Criar novas empresas exige salvar limites explícitos no Super Admin; campos vazios representam uma escolha de ilimitado, domínio próprio exige habilitação explícita. Não foram definidos preços ou limites comerciais arbitrários.
- Permissão de escrita separada da leitura: viewers não gravam. Escopo do cliente aplicado em visitas/propostas; arquivos e fotos privadas respeitam o módulo habilitado. APIs protegidas respondem em JSON a falhas de autenticação/autorização.
- Limites de recursos protegidos por triggers com bloqueio por empresa, incluindo clientes de leads/CRM, duplicação de imóveis e bytes de branding. Empresas acima de um novo limite preservam seus registros.
- JSON-LD escapa delimitadores HTML; CSP com nonce; cabeçalhos de contexto de empresa externos são descartados; login tem limite por conta e IP.
- Recuperação e alteração de senha: token de uso único, expiração, vínculo à versão da senha e revogação das sessões. Convites e avisos integram o serviço de e-mail, mantendo o link manual de convite.
- Upload de documentos direto para storage, com reserva de quota, confirmação de tamanho/MIME/assinatura e cópia condicional para chave final. Branding também usa chave temporária, validação e cópia antes da publicação. SVG não é aceito como branding. Resposta de branding entrega o conteúdo, evitando cache de URL assinada expirada.
- Leads de empresas suspensas e imóveis não publicados são recusados; telefone/e-mail existente e oportunidade aberta são reutilizados atomicamente.
- Privacidade por empresa com aviso editável e link real no formulário. Remoção administrativa dos dados estruturados do contato com confirmação e registro. **Não representa anonimização integral**: históricos livres, contratos e anexos exigem revisão própria.
- Consolidação de analytics e retenção em transação, dias completos no fuso operacional e chave única para propriedade nula. Histórico antigo visível em tabela separada; visitantes únicos do período não são calculados somando visitantes diários. Limpeza de sessões/tokens expirados na rotina.
- Lembretes diários no painel e fila de e-mail com reserva de processamento e chave de idempotência. A rotina respeita preferências e visitas canceladas; falhas ficam registradas. Plano Hobby usa agendamento diário, não lembretes com precisão de minutos.
- Menus de imóveis/clientes, contraste de abas claras, busca móvel, erros iniciais do assistente, metadados da auditoria, título do Super Admin, indicadores e fuso de datas ajustados. Contagem de fotos a otimizar vem do servidor para evitar inserção tardia do cartão.
- Áreas do terreno e privativa separadas no detalhe e PDF. Compartilhamento usa o caminho da empresa. Slug da Avança protegido.
- Tela `/superadmin/operacao` mostra configuração e execução das rotinas. Health verifica banco e estrutura. Workflow manual faz build de produção, staging sem domínio, verifica health e promove o mesmo artefato; exige secrets do GitHub e migrations previamente aplicadas.

## Migrations e validação

Migrations novas: 0013 autenticação/uploads; 0014 quotas/índices; 0015 leads/operação; 0016 analytics; 0017 lembretes. Snapshot 0017 representa o schema atual, ligado ao último snapshot histórico. Não se inventaram registros retroativos das migrations 0004–0006.

Aplicadas primeiro em `test-0012-lot-area-2026-10-10` (`br-falling-frost-b5ce9ke1`). A criação de nova branch foi recusada pelo limite do Neon; a branch de teste existente já tinha a mesma base 0012. Antes de adicionar fixtures sintéticas, as contagens permaneceram 8 imóveis, 76 fotos, 8 proprietários, 2 clientes e 2 oportunidades. Não foram apagados backups ou branches.

Validação local: 153 testes (35 arquivos), TypeScript, ESLint e build de produção. Cobertura nova para viewer, módulo desabilitado, API JSON, WhatsApp, XSS, cabeçalho forjado, configuração de planos, quota no banco, deduplicação de leads, suspensão, reset de senha, retenção e idempotência de lembretes. `db:generate` não identifica diferença entre o schema e o novo snapshot. Navegador Chromium validou API 401 JSON, privacidade, login, assistente com WhatsApp obrigatório/normalizado, layout móvel sem overflow, Operação, Imóveis, Configurações, Notificações e Perfil, sem erros JavaScript/CSP.

O preview desta branch usa uma conexão específica para o banco isolado, mantendo as credenciais de Production separadas. O banco contém uma cópia de teste e fixtures sintéticas; não deve ser tratado como Production.

## Limites de verificação e decisões externas

- Nenhum e-mail real foi enviado durante os testes. A entrega final depende da chave e do remetente validado no provedor (`AUTH_EMAIL_FROM` ou `LEADS_NOTIFY_FROM`).
- Uploads foram revistos e a validação de conteúdo tem testes; o envio real ao bucket não foi executado com arquivos dos clientes.
- Definir o telefone real da Avança e os limites comerciais dos planos cabe ao administrador no painel.
- Não houve contratação de plano, aquisição de domínio, configuração de provedor externo de logs ou alteração de cobrança. Observabilidade externa e maior retenção de logs continuam sendo decisões de infraestrutura.
- A branch `main` não foi forçada a acompanhar a feature: isso deve passar pelo fluxo de integração do repositório. O workflow de release continua manual e depende de secrets/ambiente GitHub configurados.
- Este trabalho não atribui uma nova nota de auditoria. As notas do relatório anterior continuam sendo históricas, até nova avaliação independente.
