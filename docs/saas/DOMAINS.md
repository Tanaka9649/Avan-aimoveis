# Domínios

Todos os hosts apontam para o mesmo projeto Vercel.

## Resolução

1. Remover porta e normalizar lowercase/punycode aceito pelo runtime.
2. Rejeitar hosts inválidos e valores injetados.
3. Resolver domínio customizado ativo.
4. Resolver rota `/empresa/{slug}`.
5. Somente a raiz do domínio base resolve explicitamente o Tenant Avança.

## Estados

`pending`, `verifying`, `active`, `error`.

A integração Vercel é idempotente. Sem credenciais externas, o domínio permanece pendente; a UI nunca simula sucesso. Canonical usa domínio customizado somente quando ativo.
