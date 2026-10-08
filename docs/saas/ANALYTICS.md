# Analytics próprio por tenant

## Eventos públicos

- site_view
- property_view
- whatsapp_click
- interest_submit
- favorite_add
- search

Cada evento carrega tenant_id; property_id é opcional e, quando presente, é validado dentro do mesmo tenant. Painel, Super Admin, convites e rotas administrativas não registram site_view.

## Privacidade e qualidade

- identificador anônimo first-party com hash;
- IP puro não é persistido;
- user agents de bots conhecidos são descartados;
- rate limiting persistente reduz spam;
- dedupe_key impede refresh repetido de inflar eventos;
- erros de analytics não bloqueiam a navegação pública;
- payloads são validados e limitados.

UTM serve somente a analytics. utm_source, utm_medium, utm_campaign, utm_content e utm_term nunca preenchem automaticamente a origem comercial do CRM.

## Dashboard do tenant

Filtros suportados:

- Hoje;
- 7 dias;
- 30 dias;
- intervalo personalizado.

Indicadores:

- visitantes únicos;
- visualizações do site;
- visualizações de imóveis;
- WhatsApp;
- formulários de interesse;
- favoritos;
- buscas;
- conversão visualização para contato;
- fontes UTM;
- tabela por imóvel.

Toda consulta inclui tenant_id. O Super Admin possui visão consolidada separada; uma empresa nunca recebe métricas globais.

## Retenção

ANALYTICS_RETENTION_DAYS define a retenção dos eventos crus e usa 90 dias quando ausente. O cron diário em /api/cron/analytics-retention:

1. autentica com CRON_SECRET;
2. agrega os eventos antigos em analytics_daily;
3. preserva total e visitantes únicos por tenant, dia, tipo e imóvel;
4. só depois remove os eventos crus agregados.

O agendamento está em vercel.json. A rota nunca deve ser exposta sem CRON_SECRET em Production.

## Operação

- consultas recentes usam analytics_events;
- histórico consolidado usa analytics_daily;
- índices particionam tenant, data e imóvel;
- eventos de um imóvel só são aceitos quando imóvel e tenant coincidem;
- dashboard administrativo não gera eventos públicos.
