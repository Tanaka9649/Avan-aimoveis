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
- Configurações de equipe, recuperação de senha, trilha completa de auditoria e permissões por função.
- Alertas de busca, formulário geral de contato, lembretes e canais de envio.
- Paginação do catálogo/CRM: atualmente limitados aos 200 registros mais recentes.
- Favoritos fora dos 200 anúncios recentes precisam de consulta por IDs.
- Imóveis reservados são ocultados; confirmar a regra comercial antes de alterar.
- Vercel, ambientes isolados, proteção da main, PR, E2E completo e procedimentos de restauração testados.
- Release bloqueado por segurança: não promover configuração de Preview para Production.

## Verificação

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Teste integrado local (somente o projeto Neon de desenvolvimento explicitamente permitido no script):
`node --env-file=.env.local --import tsx scripts/smoke-lead.ts`.
No sandbox Windows, acrescente `--require ./scripts/windows-userinfo.cjs` antes de `--import`.
Requer app em localhost:3000. Não usar dados ou banco de produção.
