# CURRENT_CHECKPOINT

Atualizado após a rodada de hardening pós-auditoria interna.

## Escopo

- Não alterar visualmente site público ou telas de login.
- Não realizar deploy até nova autorização explícita.
- Preservar integralmente imóveis, fotos, clientes e oportunidades existentes.

## Banco / Production

Projeto Neon: `avan-aimoveis-dev`
Branch operacional: `vercel-production`

Backup criado antes da deduplicação de proprietários:
- `backup-pre-owner-dedupe-2026-10-09`
- branch ID `br-noisy-leaf-b5jwzw49`

Migrations aplicadas:
- `0010_owner_identity_integrity.sql`
- `0011_internal_consistency_performance.sql`

Validação mais recente:
- properties: 8
- property_photos: 76
- owners: 8
- property_owner_links: 8
- clients: 2
- deals: 2
- proposals: 0
- sales: 0
- estados de domínio inconsistentes: 0
- índices de integridade/performance esperados: 14

A deduplicação removeu somente registros duplicados de proprietários e vínculos redundantes. Nenhum imóvel ou foto foi excluído.

## Código na branch feat/saas-multitenant

Concluído ou em andamento:
- proteção contra nova duplicação de proprietários;
- substituição do vínculo de proprietário no editor em vez de acumular vínculos;
- CRM otimizado por visualização ativa;
- filtro de clientes por responsável;
- cards do CRM com responsável, imóvel, origem, WhatsApp e próxima ação;
- fechamento de venda com lookup mais leve;
- proposta vinculada à venda precisa estar aceita;
- editor de imóvel com Suítes e tipo Terreno;
- carregamento paralelo no editor de imóvel;
- busca global ampliada;
- Analytics com evolução diária e linguagem menos técnica;
- dashboard com atividade recente mais contextual;
- perfil interno do usuário;
- 404 interno do Painel e do Super Admin;
- controles dark/light reforçados;
- Super Admin e Configurações reorganizados nas rodadas anteriores.

## Validação de código ainda necessária antes de deploy

Executar obrigatoriamente:
1. npm run typecheck
2. npm run lint
3. npm test
4. npm run build
5. npx --no-install drizzle-kit check

Não fazer deploy se qualquer validação falhar.

## Observação sobre timeout

Se a conversa atingir timeout novamente, retomar deste arquivo e não repetir migrations 0010/0011 nem a deduplicação de proprietários.
