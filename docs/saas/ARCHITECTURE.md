# Arquitetura SaaS multi-tenant

## Princípios

- Um projeto Next.js/Vercel, um PostgreSQL/Neon e vários tenants.
- `TenantMembership` liga pessoas a empresas; superadmin é uma função global.
- Toda entidade operacional carrega `tenant_id` e toda consulta falha fechada.
- Tenant autenticado vem da sessão + membership; tenant público vem de rota/hostname validado.
- Nenhum identificador de tenant enviado pelo navegador é autoridade.
- A raiz pública resolve explicitamente o Tenant Avança; ausência de tenant nunca produz fallback.

## Camadas

1. **Resolução pública:** hostname ou `/empresa/{slug}`, com histórico de slug e status.
2. **Sessão:** cookie opaco, membership ativa e tenant selecionado gravado na sessão.
3. **Autorização:** tenant + entitlement + módulo + permissão.
4. **Dados:** filtros compostos e constraints por `tenant_id`.
5. **Storage:** `tenants/{tenantId}/...`; objetos legados da Avança permanecem legíveis.
6. **Observabilidade:** auditoria sem segredos/PII desnecessária e analytics exclusivamente público.

## Invariantes

- Recursos de outro tenant retornam 404/403 sem metadados.
- Suspensão bloqueia site, login e painel, preservando dados.
- Desativar módulo ou reduzir quota nunca apaga dados.
- Cache, sitemap, metadata, exportação e analytics incluem tenant em sua chave/consulta.


## Fluxos implementados

### Público

Hostname ou /empresa/{slug} → tenant operacional → branding/SEO/site → consultas publicadas com tenant_id. Slug antigo resolve o histórico e redireciona; hostname desconhecido falha fechado.

### Autenticado

Cookie opaco → hash da sessão → tenant gravado na sessão → membership ativa → status do tenant → entitlement do plano → módulo habilitado → permissão do usuário → consulta com tenant_id.

### Super Admin

GlobalRole super_admin → shell global → gestão da empresa. Acesso operacional cria uma sessão temporária no tenant, registra auditoria e mantém um caminho explícito de retorno ao Super Admin. Super Admin não depende de e-mail hardcoded nem cria uma membership artificial no tenant.

### Suspensão

Mudança para suspended ou cancelled invalida sessões do tenant, bloqueia login/site/painel e preserva registros, storage, histórico e auditoria.

## Componentes centrais

- src/lib/tenant.ts: resolução por host/slug, status e URLs públicas;
- src/lib/auth.ts: sessão e contexto autenticado;
- src/lib/access.ts: guards globais, administrativos e de módulo;
- src/lib/entitlements.ts: limites, uso e disponibilidade;
- src/lib/module-registry.ts: módulos e dependências;
- src/lib/provisioning.ts: criação idempotente de tenant;
- src/lib/tenant-audit.ts: trilha sanitizada;
- src/lib/storage.ts: namespace e acesso privado;
- src/proxy.ts: roteamento do painel por slug sem confiar em parâmetros operacionais.
