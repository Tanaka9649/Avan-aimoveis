# Refinamento visual da busca do CRM

## Escopo

- Mesmo ListFilters e mesmos botões admin-button, com variante visual somente quando scope é crm.
- Barra única, lupa decorativa, label acessível sem texto solto, input flexível e ação Limpar de menor destaque.
- Filtros salvos mantidos no mesmo componente e armazenamento; apenas layout de apresentação reorganizado.
- Placeholder corresponde à consulta existente: nome de cliente ou título da oportunidade.
- O input é remontado quando a busca aplicada muda para refletir visualmente o parâmetro q, inclusive após Limpar.
- Sem novos filtros, chips de filtros ativos, chamadas de backend, mudanças no banco ou ordenação.

## Verificação

- Desktop, tablet (768 × 1024), celular (390 × 844), tema claro e escuro.
- Nenhum overflow horizontal na página mobile/tablet; scroll próprio do kanban preservado.
- Filtrar preserva GET e q, incluindo caracteres especiais; Limpar volta a /painel/crm e limpa o valor exibido.
- Área de filtros salvos abre sem mudar a consulta.
- 30 testes aprovados, incluindo dois novos testes de marcação para o contrato GET e isolamento visual das outras telas.
- Lint, typecheck e build aprovados.

## Publicação

Deploy solicitado. A conta conectada estava no plano Hobby, sem projetos, e a CLI precisava de autorização.
O agendamento existente (a cada 15 minutos) é incompatível com o limite diário do Hobby.
Não foi removido nem reduzido o agendamento sem decisão do usuário. Nenhuma produção foi publicada nesta etapa.
