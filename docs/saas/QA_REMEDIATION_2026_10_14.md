# Correções da auditoria de navegador — 14/10/2026

Estado inicial conferido: remoto `150f637`, local `b7f12fa`, Preview `dpl_ESuBDo4BQz3HjEjGBXusiwbHnKhA`. Neon Preview com 19 migrations. Nenhuma migration necessária para este lote.

## Implementado e verificado localmente

- QA01: salvar alterações de imóvel existente preserva status e publicação; botão deixa de dizer rascunho.
- QA02: largura explícita no botão da foto principal, inclusive com uma única imagem.
- QA03: uploads do wizard ficam locais até criar a empresa; envio e confirmação usam o tenant criado, autorizados por Super Admin. Repetir após falha não cria outra empresa na mesma sessão.
- QA04: formulários preservam campos em erros retornados por actions.
- QA05: cabeçalho neutro no CRM, sem marca Avança fixa em outras empresas.
- QA06–08: valor em reais consistente; mensagem de contato duplicado; máscara remove código de país antes de formatar DDD.
- QA09–10: validade da proposta exibida em Brasília; visita futura não pode ser realizada/não compareceu; oportunidades filtradas pelo cliente.
- QA11–12: PDF inclui suítes, características e centavos; rodapé técnico removido; telefone de proprietário validado na primeira etapa.
- QA13: CRM e listagem de imóveis ocultam edição para viewer; arquivos desabilitam mutações. Proteções de servidor mantidas.
- QA14: telefone normalizado, email visível e mensagem explícita quando faltam canais.
- QA16: seletor de proposta remonta após alteração de status.
- QA19: canonical próprio em imóveis, sobre e contato; busca pública ignora acentos.
- Ajustes adicionais: menu de clientes com estilo independente do portal; etiqueta Novo lead somente na etapa inicial; mensagem de oportunidade editada; slug permite digitar hífen; UF válida e suítes limitadas ao total de quartos.

## Pendências e limites que não devem ser apresentados como resolvidos

- QA15: expansão de tipos de imóvel e valores acima do limite de int32 exige alteração de schema e migration planejada; este lote mantém o limite explícito.
- QA17: limites comerciais dos planos dependem de decisão do proprietário; não preencher com valores inventados. Empresa configurando permanece sem acesso operacional até ativação.
- QA18: MFA continua opt-in; obrigatoriedade é mudança de política, não aplicada silenciosamente.
- Resend e domínio de email continuam adiados conforme solicitado.
- Repetir no Preview os cenários de erro de formulário, upload de logo, foto única mobile e viewer. Ainda falta evidência de navegador para admin-b e os dois brokers.
- Nenhuma promoção para Production autorizada nesta rodada.

## Verificação local

- Lint, TypeScript e build Next aprovados.
- 47 testes direcionados aprovados: publicação (8), agendamento (5), upload/escopo de branding (5), formatação/telefone (3), regressões existentes de inputs, wizard, acesso e PDF (26).
- A suíte completa não foi concluída nesta rodada: a primeira execução paralela excedeu os timeouts de preparação PGlite. Os casos relevantes foram executados isoladamente. A preparação da suíte de publicação recebeu 120s; nenhuma asserção foi removida. PDF executado com testTimeout de 30s, sem alterar asserções.
- Nenhuma migration, seed, restore ou alteração de credenciais executada.
- Publicação planejada somente em Preview; navegador autenticado na proteção Vercel carregou o Preview anterior. Validação visual da versão nova ainda pendente no momento deste registro.

## Preview publicado e verificações de navegador

Commit `ad67ecc`, deployment `dpl_Hm4uSjwKWXc891KP9eAvvS5PHKT6`, READY. Catálogo e detalhe acessíveis, centavos preservados, busca sem acentos funcionando, foto única carregada e formulário público preservando dados após erro do servidor. Não foi simulada viewport mobile. Login do painel solicita autenticação; testes internos e entre perfis permanecem pendentes. Production não alterada.
