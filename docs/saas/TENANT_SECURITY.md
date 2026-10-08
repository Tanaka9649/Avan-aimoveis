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
