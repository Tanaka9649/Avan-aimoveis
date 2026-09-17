# Avan Imóveis

Plataforma imobiliária full-stack em português, com catálogo público, captação de leads, favoritos locais, painel autenticado, CRM, visitas, propostas, vendas, auditoria e estrutura de dados preparada para Neon.

## Estado da entrega

O projeto inclui a experiência pública completa, autenticação com sessão persistida e cookie `httpOnly`, dashboard conectado ao banco, listagens administrativas, criação de imóvel, CRM visual, schema relacional completo, rate limit persistente, CI e pipeline de promoção do mesmo artefato validado. Uploads privados, e-mails e algumas telas administrativas avançadas têm o modelo de dados e as variáveis preparados, mas exigem a conexão dos serviços antes de serem habilitados.

## Desenvolvimento local

Requisitos: Node.js 22+, npm e um banco Neon de desenvolvimento.

1. Copie `.env.example` para `.env.local` e preencha somente com credenciais de desenvolvimento.
2. Use a URL **pooled** do Neon em `DATABASE_URL` e a URL **direct** em `DIRECT_URL`.
3. Rode `npm ci`, `npm run db:generate`, revise o SQL em `drizzle/`, `npm run db:migrate` e `npm run db:seed`.
4. Para criar o primeiro administrador no seed, defina temporariamente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` apenas no ambiente local; remova-os depois.
5. Rode `npm run dev`.

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

O workflow manual `Release validated preview` gera um artefato de preview, aplica a migration versionada uma única vez, executa smoke test, promove exatamente aquele artefato e verifica a produção. A CLI está fixada em `vercel@59.20.0`.

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

## Segurança e privacidade

Senhas usam `scrypt`; tokens de sessão são armazenados apenas como hash. As respostas de login não distinguem usuário inexistente de senha incorreta. Leads e login têm rate limit persistente. Dados de proprietários e endereços exatos ficam somente no banco e no painel. Documentos devem usar bucket privado e URLs assinadas após autorização. A localização pública deve passar por aproximação determinística. Não registre payloads com dados pessoais nem valores de segredos em logs.
