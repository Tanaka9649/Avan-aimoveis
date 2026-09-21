# Redesign público — 21/09/2026

## Escopo e auditoria

Repositório confirmado: Tanaka9649/Avan-aimoveis. Trabalho iniciado com árvore limpa na feat/plataforma-base, criando feat/public-site-redesign e incorporando por fast-forward a base remota e0a8f60 antes das alterações. Sem merge na principal, alterações de banco, migrations, storage ou deploy de produção.

Rotas analisadas: /, /imoveis, /imoveis/[slug], /favoritos, /sobre, /contato e 404. Layout compartilhado, globals.css, evolution.css, fontes, cards, galeria, formulário, navegação e componentes administrativos foram inspecionados para delimitar o escopo.

Encontrados: regras públicas antigas de serifas e itálicos, aliases forest/sand/accent, botão verde no header, footer verde, formulário escuro/dourado, fundos bege de galeria, títulos editoriais e cards com dimensões inconsistentes. O hero moderno existente foi mantido como referência, sem trocar fotografia, conteúdo ou busca.

## Implementação

- public-site.css centraliza tokens e padrões exclusivamente fora de admin/login. Azul existente #1769e0, branco, grafite #10141b e cinzas neutros. Fonte Manrope existente, sem serifas ou itálicos decorativos públicos. Regras legadas compartilhadas com o painel não foram apagadas indiscriminadamente.
- Header: CTA azul, alinhamento, área clicável, estado atual e menu mobile funcional com Escape e retorno de foco.
- Footer: grafite, logo, descrição, navegação completa, telefone e WhatsApp. E-mail condicional; não foi inventada uma página de privacidade.
- Home: títulos sans-serif, benefícios refinados e CTA grafite/azul. Suspense e erro público amigável no carregamento.
- Catálogo: título atualizado, filtros compactos responsivos, busca/tipo/cidade/bairro/quartos/preço/ordenação preservados, limpar filtros e estado vazio compacto.
- PropertyCard compartilhado pelo catálogo, favoritos e semelhantes: fotografia clicável, proporção consistente, atributos acessíveis e favoritos com estado anunciado.
- Ficha do imóvel: apresentação extraída em PublicPropertyView sem alterar consulta ou regras; galeria, preço, características, descrição, região, formulário e semelhantes seguem o mesmo sistema visual. Metadados e JSON-LD preservados.
- Galeria: dialog nativo, fechamento por Escape, foco restaurado e navegação por setas, mantendo variantes de imagem e carregamento da foto completa apenas ao abrir.
- Sobre e Contato: tipografia, cards, botões e superfícies neutras. Formulário de interesse existente preservado na ficha do imóvel.
- Componentes públicos compartilhados PublicEmptyState, PublicLoading e PublicError; loading/erro de catálogo e favoritos, e estilo coerente de 404.
- Sem dependências novas. Next/Image, variantes, lazy loading, URLs, sitemap, robots, canonical, Open Graph e integrações existentes preservados.

## Validação

- npm run lint: passou.
- npm run typecheck: passou.
- npm test: 19 arquivos, 86 testes passaram. Aviso não bloqueante do Vitest sobre formato futuro do config loader.
- npm run build: passou; compilação, TypeScript e geração das rotas concluídos.
- Inspeção no navegador: home, catálogo, Sobre, Contato, estados de favoritos e imóvel inexistente/404; Manrope e azul existentes confirmados.
- Larguras verificadas: 1920, 1440, 1366, 768 e 390. Sem overflow horizontal nas medições realizadas; home e filtros mobile inspecionados visualmente.
- Menu mobile abre/fecha e Escape funciona. Filtros por cidade/preço, limpar, ordenação e adicionar/remover favorito conferidos com dados fictícios locais. Galeria abre modal e Escape devolve foco.
- Não havia imóveis publicados no ambiente consultado. Cards, ficha, semelhantes e formulário foram renderizados com exemplos temporários, sem inserir registros; rota temporária removida antes do build.

## Limites e revisão antes de produção

Não foi enviado lead real nem mensagem de WhatsApp, nem alterado qualquer anúncio. A imagem completa da galeria de teste não era um objeto real do storage; download de foto real e jornada com envio de lead ainda devem ser validados com anúncio publicado autorizado. Core Web Vitals de campo não foram medidos; não se afirma melhoria quantitativa. O telefone exibido e o destino WhatsApp preexistentes foram preservados. A publicação de produção depende de revisão/aprovação da branch.

## Git

Branch: feat/public-site-redesign. Commit de implementação: `feat: unify public site visual identity and navigation` (este relatório acompanha o commit). Nenhum merge automático na principal.
