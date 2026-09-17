# Estado verificado — 17/09/2026

## Entregue nesta etapa

- Cadastro, edição, publicação e ocultação de imóveis por usuário autenticado.
- Preços validados em centavos dentro do limite atual do banco (R$ 21.474.836,47).
- Catálogo, detalhes e favoritos ligados aos anúncios disponíveis/publicados no Neon.
- Projeção pública explícita: endereço privado, comissão e coordenadas exatas não são serializados.
- Criação atômica de cliente, negócio, vínculo ao imóvel e atividade no recebimento de um lead.
- CRM com dados reais e página de consulta do contato/histórico, sem cartões fictícios.
- Tratamento de falha de rede e validação de consentimento, telefone, e-mail e identificador.
- Teste integrado em desenvolvimento com fixtures sintéticas e limpeza restrita ao UUID de cada execução.

## Ainda não pronto

- Upload/galeria e documentos privados no Neon Object Storage (beta aceita pelo usuário; serviço ainda não provisionado).
- Movimentação e edição de negócios, notas, perda/ganho, cadastro manual de clientes e preferências.
- Fluxos de visitas, propostas, vendas, comissões e proprietários.
- Dashboard completo e relatórios; revisar todos os números antes de lançamento.
- Recuperação de senha, convite por e-mail, permissões por campo/operação e trilha completa de auditoria.
- Alertas de busca, formulário geral de contato, lembretes e canais de envio.
- Paginação do catálogo/CRM: atualmente limitados aos 200 registros mais recentes.
- Favoritos fora dos 200 anúncios recentes precisam de consulta por IDs.
- Imóveis reservados são ocultados; confirmar a regra comercial antes de alterar.
- Vercel, ambientes isolados, proteção da main, PR, E2E completo e procedimentos de restauração testados.
- Release bloqueado por segurança: não promover configuração de Preview para Production.

## Verificação

## Identidade e administração — atualização

- Nome público Avança Imóveis; logo recebida com fundo removido pela ferramenta nativa de edição, preservada com canal alpha.
- Prompt da edição: remover somente o fundo branco, preservar símbolo, composição e textos AVANÇA e IMÓVEIS; sem redesenho.
- E-mail comercial, localização, telefone e CRECI demonstrativos removidos. WhatsApp aguarda confirmação do número completo; CRECI/região ainda não fornecidos.
- Administração em /painel/configuracoes: criar contas de equipe pendentes, aprovar/suspender, selecionar módulos e escopo todos/próprios, atribuir clientes.
- Administrador não pode ser desativado por esse formulário. Alterar permissões encerra as sessões do usuário alvo.
- Restrições aplicadas no servidor a páginas, ações de imóveis e consultas de clientes/CRM. Indicadores globais são exclusivos do administrador.
- Lembretes: preferências painel/e-mail e lista de até 50 destinatários persistidas no Neon. Não há entrega operacional ainda; cron retorna indisponível em vez de marcar lembretes como enviados.
- Publicação futura no subdomínio Vercel, sem domínio próprio por enquanto. Nenhum deploy realizado nesta atualização.
- Teste scripts/smoke-access.ts cobre conta pendente, login aprovado, módulo bloqueado, clientes próprios, URL direta e suspensão.

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Teste integrado local (somente o projeto Neon de desenvolvimento explicitamente permitido no script):
`node --env-file=.env.local --import tsx scripts/smoke-lead.ts`.
No sandbox Windows, acrescente `--require ./scripts/windows-userinfo.cjs` antes de `--import`.
Requer app em localhost:3000. Não usar dados ou banco de produção.
