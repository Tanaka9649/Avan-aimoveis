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
