# CURRENT_CHECKPOINT

Atualizado após a rodada completa de refinamento interno pós-auditoria em 2026-10-10.

## Escopo preservado

- Site público e telas de login permanecem visualmente congelados.
- Nenhum merge automático foi realizado.
- Nenhum deploy em Production foi realizado nesta rodada.
- Imóveis, fotos, clientes, oportunidades, documentos, propostas, vendas e usuários reais foram preservados.

## Banco / Production

Projeto Neon: `avan-aimoveis-dev`
Branch operacional: `vercel-production`

Estado real confirmado após a rodada:
- properties: 8
- property_photos: 76
- owners: 8
- property_owner_links: 8
- clients: 2
- deals: 2
- `properties.lot_area`: ainda NÃO aplicado em Production

Migrations já aplicadas em Production:
- `0010_owner_identity_integrity.sql`
- `0011_internal_consistency_performance.sql`

Migration nova criada, mas NÃO aplicada em Production:
- `0012_property_lot_area.sql`
- mudança aditiva: adiciona apenas `properties.lot_area numeric(10,2)`
- sem backfill e sem alteração automática dos imóveis existentes

Validação isolada da 0012:
- branch Neon: `test-0012-lot-area-2026-10-10`
- branch ID: `br-falling-frost-b5ce9ke1`
- origem: `vercel-production`
- journal registrado na branch de teste
- contagens antes/depois preservadas: 8 imóveis, 76 fotos, 8 proprietários, 8 vínculos, 2 clientes, 2 oportunidades
- `lot_area` dos imóveis existentes permaneceu NULL

## Código na branch feat/saas-multitenant

Rodada concluída:
- banner de acesso como empresa integrado ao fluxo do painel;
- tabela de clientes responsiva com ações em menu;
- menu de ações dos imóveis com posicionamento seguro e teste dedicado;
- controles/formulários internos reforçados para dark/light mode;
- helpers centralizados de data/hora em `America/Sao_Paulo`;
- labels internos centralizados em PT-BR;
- 404 interno real para Painel, Super Admin e painel de tenant;
- validação visível e foco no erro no wizard de nova empresa;
- dashboard com ações Atrasadas / Hoje / Próximas;
- Dashboard e Analytics alinhados à fonte canônica de eventos;
- área do terreno separada da área privativa/construída via migration aditiva;
- suítes exibidas nas listagens quando > 0;
- filtros compactos no funil, follow-up atrasado textual e microcopy revisada;
- fluxo único de fechamento de venda com validação de proposta aceita quando informada;
- oportunidades perdidas precisam ser reabertas antes de proposta/venda;
- planos administráveis usando o motor de entitlements existente;
- gestão segura de usuários globais e memberships por empresa;
- auditoria mais legível;
- upload real de branding com storage tenant-scoped, validação de MIME/bytes e URLs persistentes estáveis;
- componentes reutilizáveis para dropdown flutuante e controles administrativos;
- cobertura de regressão ampliada.

## Validação automatizada

Última validação completa em GitHub Actions:
- npm ci: OK
- npm run typecheck: OK
- npm run lint: OK
- npm test: OK — 32 arquivos / 139 testes
- npm run build: OK
- npx --no-install drizzle-kit check: OK
- npm audit --omit=dev --audit-level=high: OK — 0 vulnerabilidades

A integração Vercel gerou Preview automaticamente para a branch. Production não recebeu deploy.

## Observação de smoke test

O build lista e compila as rotas internas, inclusive os catch-alls de 404. A ferramenta conectada à Vercel não teve permissão para abrir o Preview protegido (403 no bypass), então não foi possível fazer smoke test visual autenticado pelo conector. Não usar credenciais reais para contornar essa proteção.

## Próximo passo seguro

Antes de qualquer deploy que use o novo campo `lot_area` em Production:
1. aplicar `0012_property_lot_area.sql` na branch operacional somente com autorização explícita;
2. comparar novamente as contagens reais;
3. só depois preparar/promover o deploy aprovado.

Não reaplicar `0010` ou `0011`.
