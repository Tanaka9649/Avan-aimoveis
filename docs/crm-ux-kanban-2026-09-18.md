# CRM: drawers, oportunidades e Kanban

## Correções e arquitetura

- A sobreposição antiga tinha z-index 120, acima do drawer de cliente (101), interceptando os cliques. Os fluxos agora usam `CrmDialog`, com `<dialog>.showModal()` na camada superior nativa, fundo a 40%, foco contido/restaurado, ESC, X e clique externo. O conteúdo tem rolagem própria e o rodapé permanece acessível.
- Nova oportunidade abre no CRM, com seções de dados básicos, próximo contato, imóveis opcionais e informações internas. A rota dedicada permanece disponível para edição.
- Busca de cliente, cadastro de cliente dentro do fluxo, moeda brasileira, calendário em português com atalhos, horário manual/sugestões de meia hora e seleção de vários imóveis por clique, sem Ctrl.
- Sem próxima ação oculta o agendamento; Perdido exige motivo. Datas antigas sem tipo de ação são preservadas usando Outro como tipo inicial.
- As opções são carregadas ao abrir o formulário e as consultas independentes são paralelas; a revisão React orientou esse carregamento e os cuidados com estado e acessibilidade.

## Kanban e persistência

- Biblioteca: `@dnd-kit/core` e `@dnd-kit/sortable`. Alça separada do clique no card, ativação do mouse após 8px, toque após 250ms, teclado, prévia flutuante e destaque de destino. Menu Mover para e opções Subir/Descer como alternativas.
- O banco já tinha `deals.position`; nenhuma migration foi necessária. A leitura agora usa position + id, sem a antiga paginação global de 20 cards.
- A gravação valida usuário, etapa de origem e destino, executa transação com advisory lock e reordena a etapa em incrementos de 1024. Cards ocultos por filtros conservam sua ordem relativa. A interface antecipa a alteração e restaura o estado em caso de erro.
- Histórico apenas na troca de etapa, não na simples ordenação. Próximo contato e vínculos não são alterados pela movimentação.
- Ganho abre a conclusão de venda; Perdido pede motivo. Cancelar não move. A venda e suas atualizações relacionadas são atômicas; índices únicos existentes impedem duplicação. O formulário comum não permite contornar o fluxo de venda.
- Colunas com mínimo de 260px, rolagem horizontal do quadro e vertical por coluna. Altura acompanha o espaço disponível; em telas pequenas há seleção de etapa e alternativa de movimentação pelo menu.

## Verificação realizada

- 49 testes em 14 arquivos aprovados; lint e TypeScript aprovados; build de produção aprovado.
- Integração em PGlite isolado com migrations reais: cadastro, duplicidade, oportunidade sem imóvel, valores em centavos, agendamento, venda atômica, histórico e impedimento de venda duplicada.
- SQL de movimentação testado quanto a permissões, origem desatualizada, destino inválido, ordem com cards ocultos, confirmação Ganho/Perdido e preservação da próxima ação.
- Navegador em produção: formulário clicável, preferências, ESC/X, moeda, calendário, seleção de imóvel, motivo condicional, cancelamento de perda/venda e início/cancelamento do arraste por teclado. Nenhum erro de console capturado na sessão.
- Inspeção responsiva com overrides 1920, 1440, 1366, 768 e 390px; zoom existente do navegador a 90% foi preservado, portanto as larguras CSS efetivas diferem. Temas claro/escuro e ausência de overflow horizontal da página conferidos. Override e tema foram restaurados.

## Limites desta validação

Não foram criados negócios fictícios nem concluídas vendas em produção. Persistência foi verificada no banco isolado; a sessão visual não constitui teste completo de arrastar-e-soltar com gravação, toque em aparelho físico, grande volume de cards ou todas as combinações de autoscroll. Esses cenários ainda podem receber uma suíte E2E dedicada com dados descartáveis.
