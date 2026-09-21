# Avan Imóveis

Plataforma imobiliária full-stack em português, com catálogo público, captação de leads, favoritos locais, painel autenticado, CRM, visitas, propostas, vendas, auditoria e estrutura de dados preparada para Neon.

## Estado da entrega

Em desenvolvimento, não pronto para produção. Implementado: autenticação, criação/edição/publicação de imóveis, catálogo público conectado ao Neon, favoritos locais, captura atômica de leads e consulta do CRM com histórico. As fotos são otimizadas no upload em três tamanhos (miniatura, média e cheia) no Neon Object Storage. Consulte `docs/STATUS.md` para limites e pendências. Ter tabelas no banco não significa que cada módulo esteja funcional.

## Desenvolvimento local

Requisitos: Node.js 22+, npm e um banco Neon de desenvolvimento.

1. Copie `.env.example` para `.env.local` e preencha somente com credenciais de desenvolvimento.
2. Use a URL **pooled** do Neon em `DATABASE_URL` e a URL **direct** em `DIRECT_URL`.
3. Rode `npm ci`, `npm run db:generate`, revise o SQL em `drizzle/`, `npm run db:migrate` e `npm run db:seed`.
4. Para criar o primeiro administrador no seed, defina temporariamente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` apenas no ambiente local; remova-os depois.
5. Rode `npm run dev`.

Variáveis de ambiente: nenhuma nova é obrigatória. `NEXT_PUBLIC_SITE_URL` passa a ser usada também para montar o link público compartilhável e as tags Open Graph — em Production ela precisa apontar para `https://avan-aimoveis.vercel.app` (ou o domínio final), sem barra no fim.

Nunca use `drizzle-kit push` em produção. Scripts fora do Next.js não carregam `.env.local` automaticamente; execute-os com as variáveis já disponíveis no processo ou por um gerenciador seguro.

## Ambientes e Neon

Adotamos isolamento por banco/branch:

- **Development:** branch Neon exclusiva para cada desenvolvedor ou equipe interna.
- **Preview:** branch/banco compartilhado apenas por previews, sem dados pessoais reais.
- **Production:** branch exclusiva, acessível somente pelo runtime e pipeline de release.

Na Vercel, cadastre valores diferentes para Development, Preview e Production. Preview nunca deve receber as URLs, o bucket privado ou destinatários reais de e-mail de Production. `DATABASE_URL` é usada pelo runtime; `DIRECT_URL` é usada exclusivamente por migrations e tarefas administrativas.

## Vercel e GitHub

Conecte o projeto Vercel ao repositório `Tanaka9649/Avan-aimoveis`. A integração Git cria Preview Deployments em Pull Requests. O workflow `CI` não publica: ele bloqueia regressões com typecheck, lint, testes e build.

Cadastre como GitHub Actions Secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_DIRECT_URL`
- `PRODUCTION_URL`

O workflow manual de release está bloqueado deliberadamente: a versão inicial construía com variáveis de Preview e migrava Production. Não remova o bloqueio antes de separar os ambientes e validar um artefato preparado com a configuração correta de Production, ainda sem atribuir o domínio público. Nenhum deploy de produção está concluído.

## Proteção da main

Nas configurações do GitHub, crie uma ruleset para `main` exigindo Pull Request, pelo menos uma aprovação, conversa resolvida e o check `quality`; bloqueie force push e exclusão. Trabalhe em branches curtas (`feat/catalogo`, `feat/crm`, `fix/auth`).

## Backup, restauração e rollback

Antes de migrations destrutivas, crie ou confirme um restore point/branch no Neon. Para restaurar dados, crie uma branch a partir do ponto anterior, valide a aplicação contra ela e só então troque as variáveis do ambiente afetado. Não apague a branch problemática até concluir a análise.

Para falha apenas de aplicação, use `vercel rollback <deployment>` ou reatribua o alias ao último deployment saudável. Se a migration já foi aplicada, confirme primeiro a compatibilidade do código anterior com o schema atual; rollback de aplicação não desfaz banco. Quando necessário, use uma migration corretiva compatível para frente.

## Checklist de release

1. CI verde no PR.
2. SQL da migration revisado e testado em Preview.
3. Restore point confirmado para operações destrutivas.
4. Preview implantado; `/api/health` e fluxos críticos validados.
5. Migration aplicada uma vez no banco-alvo.
6. Mesmo deployment promovido, sem rebuild.
7. Smoke test pós-deploy e logs revisados.

## Publicação no site

Publicar é uma decisão separada do status comercial:

- `properties.published_at` é o interruptor de publicação (definido ao publicar, limpo ao despublicar).
- `properties.status` continua descrevendo a situação comercial (`rascunho`, `disponivel`, `reservado`, `pausado`, `vendido`).
- Um imóvel só aparece no catálogo público quando `published_at` está preenchido **e** o status é `disponivel`. A regra vive em `src/lib/property-publication.ts` e é usada pelo site, pelas rotas de API, pelo PDF, pelo sitemap e pelas métricas.

A URL pública é `/imoveis/{slug}` e vem do slug já existente do imóvel — nenhum id interno é exposto. Salvar um imóvel já publicado não reescreve a data de publicação.

Para publicar exige-se apenas o que aparece no site: título, preço, região pública, descrição, área privativa e pelo menos uma foto. Documentos e dados do proprietário nunca são exigidos.

## Fotos dos imóveis

Cada foto enviada gera três arquivos WebP em `property-photos`, com chaves imutáveis:

| Variante | Largura | Onde é usada |
| --- | --- | --- |
| `thumb` | 480 px | cards, CRM, dashboard, listas e match |
| `medium` | 1280 px | página pública do imóvel e PDF |
| `full` | 1920 px | galeria em tela cheia |

A rota `/api/property-photos/{id}?v=thumb|medium|full` entrega a variante pedida com `Cache-Control` de um ano e `ETag`. Fotos enviadas antes desse pipeline continuam funcionando (a rota volta para o arquivo original); para gerar as miniaturas delas, abra **Painel → Imóveis** e use o cartão "Otimizar fotos antigas", que chama `/api/properties/photos/variants` em lotes. O arquivo original é preservado e reaproveitado como variante `full`, sem recompressão.

## Datas e horários

Todo campo de data/hora usa os componentes de `src/components/date-time-fields.tsx` (calendário DD/MM/AAAA com atalhos e horários de 30 em 30 minutos). O valor trafega como horário de parede (`2026-09-22T14:00`) e é convertido no servidor por `parseOperationDateTime` (`src/lib/datetime.ts`), no fuso da operação (`America/Sao_Paulo`). Valores que já carregam offset ou `Z` continuam sendo aceitos como instantes absolutos.

## Segurança e privacidade

Senhas usam `scrypt`; tokens de sessão são armazenados apenas como hash. As respostas de login não distinguem usuário inexistente de senha incorreta. Leads e login têm rate limit persistente. Dados de proprietários e endereços exatos ficam somente no banco e no painel. Documentos devem usar bucket privado e URLs assinadas após autorização. A localização pública deve passar por aproximação determinística. Não registre payloads com dados pessoais nem valores de segredos em logs.
