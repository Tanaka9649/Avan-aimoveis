# Domínios por tenant

Todos os hosts apontam para o mesmo projeto Vercel. O domínio não seleciona dados por texto enviado pelo navegador; ele é normalizado e resolvido contra um tenant persistido e ativo.

## Resolução

1. remover porta, ponto final e prefixo www quando aplicável;
2. converter para lowercase e rejeitar host inválido ou injetado;
3. reconhecer o domínio base da plataforma;
4. resolver customDomain somente quando domainStatus for active;
5. resolver /empresa/{slug} e histórico de slug;
6. retornar 404/bloqueio quando não houver tenant operacional.

Somente a raiz do domínio base resolve explicitamente o Tenant Avança. Host desconhecido nunca recebe dados da Avança por fallback.

## Estados

- pending: domínio informado, ainda sem operação de verificação;
- verifying: adicionado ao projeto e aguardando DNS/verificação;
- active: verificação concluída e permitido para resolução/canonical;
- error: falha registrada para correção.

A UI exibe endereço padrão, domínio atual, status e registros DNS retornados pela Vercel.

## Integração Vercel

As rotas de domínio usam a API oficial para adicionar, consultar/verificar e remover somente o domínio associado ao tenant autenticado. Operações exigem entitlement custom_domain, papel administrativo e geram auditoria.

Variáveis:

- VERCEL_API_TOKEN: token de servidor, nunca exposto ao cliente ou logs;
- VERCEL_PROJECT_ID ou VERCEL_PROJECT_NAME: projeto compartilhado;
- VERCEL_TEAM_ID: escopo da equipe quando aplicável;
- PLATFORM_BASE_URL: origem canônica da plataforma;
- ROOT_DOMAIN: hostname base usado na resolução.

A implementação é fail-closed: sem credenciais ou com erro externo, o status não é promovido artificialmente para active.

## SEO e caminhos

- tenant raiz/custom domain: /sitemap.xml;
- tenant no endereço padrão: /empresa/{slug}/sitemap.xml;
- sitemap consulta somente imóveis publicados do tenant;
- canonical prefere custom domain apenas quando active;
- login e painel funcionam no mesmo custom domain;
- robots bloqueia painel, API e Super Admin.

## Estado externo observado

O projeto Vercel identificado é avan-aimoveis, ID prj_UIoKDpgp9BxiORlABsmY60LlZJvE. A sessão conseguiu localizar o projeto, mas listar deployments retornou 403. O status do último commit também informou build-rate-limit. Portanto o fluxo está implementado, porém o Preview hospedado depende de permissão/cota externa.
