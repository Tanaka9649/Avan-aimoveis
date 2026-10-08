# Segurança entre tenants

## Autoridade

- Público: host normalizado ou slug da rota.
- Autenticado: sessão válida e membership ativa.
- Super Admin: role global persistida, nunca e-mail hardcoded.
- Headers externos de tenant não são confiáveis.

## Regras

Toda leitura/escrita operacional inclui o tenant resolvido. Relacionamentos são validados dentro do mesmo tenant. Storage privado exige sessão, membership, tenant e vínculo do registro. Chaves novas usam `tenants/{tenantId}`.

## Resposta a invasão horizontal

ID/slug/key de outro tenant retorna 404 ou 403 sem revelar existência, nome, URL, tamanho ou metadados.

## Cache

Nenhum resultado tenant-sensitive usa chave global. Cache/metadata/sitemap devem ser particionados pelo tenant.

## Testes

Fixtures A/B exercitam imóveis, clientes, oportunidades, visitas, propostas, vendas, proprietários, anexos, analytics e usuários; tentativas cruzadas precisam falhar fechadas.


## Controles implementados

- tenant_id NOT NULL após backfill em todas as entidades tenant-owned;
- unicidades de código, slug, posição e deduplicação compostas por tenant;
- login exige tenant ativo/trial e membership ativa;
- convite usa token aleatório armazenado apenas como hash, expiração e uso único;
- sessão usa token opaco armazenado como hash e cookie HttpOnly, SameSite Lax e Secure em Production;
- Super Admin usa globalRole persistido e sessão temporária auditada para acessar um tenant;
- suspensão/cancelamento remove sessões do tenant sem apagar dados;
- domínio customizado exige entitlement, papel admin, verificação e host normalizado;
- analytics não armazena IP puro;
- exportação exclui hashes de senha, sessão e convite;
- auditoria filtra password, token, secret, signedUrl e conteúdo de documento.

## Matriz de isolamento

| Superfície | Autoridade | Proteção |
|---|---|---|
| Painel e server actions | sessão + tenant + membership | guards e filtros tenant_id |
| APIs operacionais | sessão + módulo + permissão | validação de relacionamentos no tenant |
| Site público | hostname/slug persistido | somente status operacional e imóveis publicados |
| Fotos e documentos | sessão pública/privada conforme tipo | join com registro e tenant antes da URL/stream |
| PDF e compartilhamento | imóvel + tenant | branding, contato e URL do tenant |
| Analytics | tenant resolvido + evento permitido | property_id validado, rate limit e dedupe |
| Exportação | admin do tenant | seleção explícita e exclusão de segredos |
| Super Admin | globalRole | rotas dedicadas, auditoria e sessão temporária |

## Operação segura

Erros de banco, domínio, storage ou serviço externo não podem selecionar o Tenant Avança como alternativa. O comportamento seguro é 404, 403, redirect controlado ou estado pendente/erro. Logs não devem conter credenciais, payloads privados ou URLs assinadas.
