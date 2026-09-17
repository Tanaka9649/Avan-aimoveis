# Cadastro guiado de imóveis

## Escopo

Criação e edição usam o mesmo PropertyEditor, em seis etapas:

1. Informações: título, tipo, preço, status e código. Proprietário recolhível, com cadastro por nome ou vínculo existente. Endereço da página nas opções avançadas.
2. Características: quartos, banheiros, vagas e área privativa.
3. Localização: endereço completo interno, bairro, cidade e UF.
4. Descrição: apresentação pública e lista de diferenciais.
5. Mídia: fotos e documentos privados separados; envio explicitamente indisponível.
6. Revisão: resumo e atalhos para editar cada seção.

Componentes: PropertyEditor reorganizado; Field e SummaryBlock internos; estilos isolados por prefixo wizard; helpers property-wizard e sete testes unitários novos.

## Regras preservadas

- Nenhuma migration ou mudança no schema. Mesma Server Action, autenticação e permissão de imóveis.
- Campos e limites existentes mantidos; rascunho ainda exige todos os dados obrigatórios do backend.
- A navegação apenas altera estado React em memória; não cria registros intermediários.
- Dados não são persistidos automaticamente ao sair ou recarregar a página.
- Novo anúncio gera endereço pelo título; edição preserva o endereço existente até alteração manual.
- Salvar rascunho envia status rascunho. Salvar na revisão respeita o status escolhido; o botão diz Publicar imóvel somente para Disponível.
- Disponível aparece no catálogo; outros status seguem as regras existentes.
- Os dados do proprietário e as características continuam sendo enviados para o mesmo fluxo de salvamento.
- Não adicionados campos sem suporte de salvamento: CEP separado, área total, proximidades estruturadas e mapa.

## Verificação em 17/09/2026

- Lint, typecheck e build aprovados.
- 28 testes unitários aprovados (7 novos para etapas, slug e validação).
- Navegador: validação da etapa, contadores, navegação, preservação de valores, atalhos da revisão, slug automático e preservado ao editar.
- Rascunho criado e editado no banco de Development; proprietário sintético vinculado.
- Publicação manual testada no ambiente local: valores exatos, características, vínculo, status e published_at conferidos no banco.
- Catálogo: rascunho oculto; imóvel disponível acessível; endereço privado ausente do HTML público.
- Visual: desktop e celular (viewport 390 × 844), claro e escuro; sem overflow horizontal no celular.
- Corrigida submissão involuntária na passagem Mídia → Revisão: botões Continuar/Salvar possuem keys distintas, e Continuar cancela a ação padrão.
- Dados sintéticos removidos após a verificação.
- Smoke de acesso aprovado: aprovação de conta, login, módulos, escopo de clientes e suspensão. O teste foi ajustado para reconhecer o notFound em respostas transmitidas progressivamente (HTTP 200 com marcador 404), verificando também a ausência de conteúdo protegido.

## Pendência conhecida

Não existia integração funcional de upload antes do redesenho. Fotos/documentos continuam sem envio; nenhum arquivo é simulado como salvo. Capa, thumbnails, reordenação, exclusão, categorias e progresso de upload dependem da configuração do armazenamento no Neon e de implementação posterior. O formulário informa isso na etapa Mídia e na revisão.
