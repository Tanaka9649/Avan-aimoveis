# MASTER SPEC — Transformação da plataforma imobiliária em SaaS Multi-Tenant

> Fonte de verdade para a transformação completa do projeto **Tanaka9649/Avan-aimoveis** em uma plataforma SaaS multi-tenant.
>
> Este documento deve ser lido integralmente antes de qualquer alteração relevante.
>
> **Não contém e não deve receber senhas, tokens, DATABASE_URLs, chaves privadas ou outros segredos.**

---

## 1. Objetivo geral

Transformar a aplicação imobiliária atual em uma **plataforma SaaS multi-tenant** com:

- uma única aplicação;
- um único projeto Vercel;
- um único banco Neon/PostgreSQL;
- várias imobiliárias/empresas;
- vários usuários por empresa;
- isolamento absoluto de dados por empresa;
- site próprio por empresa;
- branding próprio;
- favicon próprio;
- paleta própria no site público;
- módulos configuráveis;
- planos e limites;
- domínio personalizado opcional;
- analytics por empresa;
- visão consolidada para Super Admin.

A implementação deve preservar integralmente o que já existe hoje para **Avança Imóveis e Rogério Cortes**.

---

## 2. Projeto correto

Repositório correto:

`Tanaka9649/Avan-aimoveis`

Não utilizar o repositório antigo/incorreto:

`Tanaka9649/avan-aim-veis`

Branch de trabalho desta transformação:

`feat/saas-multitenant`

Antes de alterar código:

- confirmar repositório;
- confirmar branch;
- verificar git status;
- ler README;
- ler AGENTS.md, se existir;
- ler docs existentes;
- ler STATUS.md, se existir;
- inspecionar schema;
- inspecionar migrations;
- inspecionar autenticação;
- inspecionar autorização/permissões;
- inspecionar storage;
- inspecionar rotas públicas;
- inspecionar painel;
- inspecionar variáveis de ambiente.

Não assumir nomes de arquivos.

---

## 3. Stack e infraestrutura existentes

Preservar a stack atual sempre que possível:

- Next.js
- React
- TypeScript
- Tailwind
- Drizzle ORM
- PostgreSQL
- Neon
- Neon Object Storage / S3-compatible
- Vercel
- autenticação existente
- sistema de permissões existente

### Regras

- **Não usar Supabase.**
- Não criar projeto Supabase.
- Não instalar Supabase.
- Não criar novo banco apenas para multi-tenancy.
- Reutilizar o projeto Neon existente.
- Reutilizar o projeto Vercel existente.
- Não criar um projeto Vercel por empresa.
- Não criar um projeto Vercel por usuário.

Buckets conhecidos:

- `property-photos`
- `property-documents`

Reutilizar quando arquiteturalmente correto.

---

## 4. URL principal atual

Aplicação atual:

`https://imoveisplatform.vercel.app/`

Por enquanto, a raiz deve continuar representando:

**Avança Imóveis e Rogério Cortes**

Não transformar a raiz em landing page institucional do SaaS nesta fase.

Nova empresa, enquanto ainda usamos `vercel.app`, deve ser acessível por rota lógica:

`https://imoveisplatform.vercel.app/empresa/{slug}`

Exemplo:

`https://imoveisplatform.vercel.app/empresa/xp-imoveis`

Login:

`https://imoveisplatform.vercel.app/empresa/xp-imoveis/painel/login`

A arquitetura deve ficar pronta para futuramente utilizar domínio base próprio e subdomínios, por exemplo:

`xp-imoveis.imoveisplatform.com.br`

e também domínios próprios dos clientes:

`www.xpimoveis.com.br`

---

## 5. Regra de segurança mais importante

**Uma empresa jamais pode enxergar dados de outra empresa.**

Isso vale:

- na interface;
- no backend;
- nas APIs;
- por alteração de URL;
- por alteração de ID;
- por query string;
- por body;
- por header;
- por cache;
- por storage;
- por documentos;
- por analytics;
- durante onboarding;
- durante provisionamento;
- durante suspensão;
- durante troca de slug;
- em qualquer tela administrativa.

O sistema deve falhar fechado.

Ausência de tenant válido nunca pode significar fallback para Avança.

---

## 6. Modelo de Tenant / Empresa

Criar uma entidade central equivalente a `Tenant` ou `Company`, de acordo com o padrão do projeto.

Conceitualmente deve suportar:

- id
- nome
- slug
- status
- plano
- branding
- contatos
- configurações do site
- módulos habilitados
- limites/quotas
- domínio padrão
- domínio personalizado
- status do domínio
- timestamps

### Status

Suportar:

- CONFIGURANDO
- TESTE
- ATIVA
- SUSPENSA
- CANCELADA

UI em PT-BR.

### Regras de status

**CONFIGURANDO**
- tenant criado;
- ainda não completamente provisionado;
- não expor dados de outros tenants;
- não considerar operacional até requisitos mínimos concluídos.

**TESTE**
- operação normal, dentro dos limites.

**ATIVA**
- operação normal.

**SUSPENSA**
- bloquear novos logins;
- bloquear painel;
- bloquear site público;
- preservar todos os dados.

**CANCELADA**
- preservar os dados;
- não apagar automaticamente.

### Exclusão definitiva

Separada de Suspender/Cancelar.

Somente Super Admin.

Não executar por clique simples.

Preferência:
- digitar o nome exato da empresa;
- mostrar impacto;
- confirmar backup/export;
- auditar ação.

Se purge físico não puder ser garantido com segurança, implementar estado de solicitação de exclusão e não apagar automaticamente.

---

## 7. Tenant 1 — Avança Imóveis e Rogério Cortes

Tudo que já existe hoje deve ser associado ao tenant:

**Avança Imóveis e Rogério Cortes**

Esse é o Tenant 1.

Preservar integralmente:

- imóveis;
- fotos;
- clientes;
- CRM;
- oportunidades;
- visitas;
- propostas;
- vendas;
- proprietários;
- documentos;
- anexos;
- atividades;
- históricos;
- usuários;
- permissões;
- configurações;
- analytics existentes;
- demais entidades atuais.

Não apagar.
Não resetar.
Não duplicar inadvertidamente.

---

## 8. Snapshot e migração segura

Antes de qualquer migration relevante em produção:

1. identificar o ambiente;
2. não operar cegamente em produção;
3. criar/confirmar restore point ou branch de segurança no Neon;
4. gerar relatório de contagem das tabelas tenant-owned;
5. registrar os números antes;
6. migrar;
7. recontar;
8. comparar.

Exemplo:

- properties: X
- customers: X
- opportunities: X
- visits: X
- proposals: X
- sales: X
- owners: X
- attachments: X

Se houver divergência não explicada, não considerar migração concluída.

### Estratégia preferida

A. criar estruturas multi-tenant;
B. adicionar `tenant_id` nullable onde necessário;
C. criar Tenant Avança;
D. backfill dos registros existentes;
E. validar contagens/relacionamentos;
F. criar índices e constraints;
G. só então tornar `tenant_id` obrigatório onde seguro.

Não fazer migration destrutiva em uma única etapa.

---

## 9. Auditoria das tabelas tenant-owned

Inspecionar todo o schema real.

No mínimo verificar:

- properties
- property_photos
- customers
- opportunities/deals
- visits
- proposals
- sales
- owners
- attachments/documents
- activities
- notes
- follow-ups
- notifications
- analytics
- site settings
- CRM relations
- favorites persistidos
- buscas persistidas
- tabelas de relacionamento

Não limitar a auditoria a esses nomes.

### Constraints

Auditar unicidade.

Valores que antes eram globalmente únicos podem precisar virar:

`UNIQUE(tenant_id, value)`

Exemplos possíveis:
- código do imóvel;
- slug do imóvel;
- referências internas.

Por outro lado:
- tenant slug;
- domínio personalizado;
- hostname ativo

devem ser únicos globalmente.

---

## 10. Usuários e Membership

`User` representa uma pessoa.

Não modelar empresa = login.

Uma empresa possui vários usuários.

Arquitetura deve permitir futuramente um usuário participar de mais de uma empresa.

Criar conceito equivalente a:

`TenantMembership`

Relacionando:

`User ↔ Tenant`

Membership deve suportar:

- função;
- permissões;
- status;
- datas;
- convite;
- ativação.

Não colocar um `tenant_id` permanente diretamente no usuário se isso impedir associação futura a vários tenants.

---

## 11. Super Admin

O administrador global atual deve virar **Super Admin global**.

Não hardcode Super Admin por e-mail.

Criar role/permissão global adequada.

Super Admin pode:

- ver todas as empresas;
- criar empresa;
- alterar empresa;
- mudar status;
- mudar plano;
- ajustar limites;
- administrar módulos globais;
- administrar domínios;
- ver analytics consolidado;
- acessar contexto operacional de uma empresa quando necessário;
- ver auditoria;
- administrar configurações globais.

### Navegação global sugerida

- Visão geral
- Empresas
- Planos
- Módulos
- Usuários
- Domínios
- Analytics
- Auditoria
- Configurações

### Dashboard global

Pode mostrar:

- número de empresas;
- empresas por status;
- usuários;
- imóveis;
- uso geral;
- domínios;
- planos;
- analytics consolidado.

Não misturar com dashboard de uma imobiliária.

---

## 12. Usuários existentes

Preservar usuários atuais.

Não:
- excluir conta;
- resetar senha;
- recriar conta;
- hardcode credencial.

Migrar conceitualmente:

- administrador global atual → Super Admin;
- usuários operacionais atuais → membership do Tenant Avança.

Preservar permissões existentes quando possível.

---

## 13. Tenant Context centralizado

Não espalhar segurança em dezenas de `where tenant_id = ...` manuais sem padrão.

Criar uma camada centralizada para resolução de tenant.

Tenant autenticado deve derivar de:

- sessão;
- membership;
- rota/hostname resolvidos no servidor.

Nunca confiar em `tenant_id` arbitrariamente enviado pelo browser.

Se o cliente enviar tenant B mas a sessão pertence ao tenant A:
- ignorar/bloquear.

### Headers

Se houver header interno de tenant:
- remover qualquer valor recebido externamente;
- somente servidor/proxy confiável pode setar.

### Cache

Auditar:
- Next cache;
- React cache;
- fetch cache;
- route cache;
- metadata cache;
- sitemap cache;
- queries.

Toda cache tenant-sensitive precisa incluir tenant no namespace/chave.

Nunca reutilizar cache entre empresas.

---

## 14. Testes de invasão cross-tenant

Criar fixtures sintéticas:

- Tenant A
- Tenant B
- Usuário A
- Usuário B
- Imóvel A/B
- Cliente A/B
- Oportunidade A/B
- Documento A/B
- Proposta A/B

Usuário B tenta acessar recursos de A.

Resultado obrigatório:

**404 ou 403**

Nunca retornar:
- título;
- nome;
- existência;
- metadata;
- URL;
- storage key;
- conteúdo parcial.

Repetir para:

- imóvel;
- cliente;
- oportunidade;
- visita;
- proposta;
- venda;
- proprietário;
- documento;
- analytics;
- usuários.

---

## 15. Storage multi-tenant

Novos arquivos devem seguir estrutura equivalente a:

- `tenants/{tenantId}/properties/...`
- `tenants/{tenantId}/documents/...`
- `tenants/{tenantId}/opportunities/...`
- `tenants/{tenantId}/branding/...`

Adaptar ao padrão do projeto.

### Fotos existentes

Não quebrar URLs existentes da Avança.

Se legacy keys atuais não tiverem prefixo:
- suportar legacy temporariamente;
ou
- migrar com copiar → validar → atualizar referência → só depois considerar remoção.

Não fazer bulk move/delete arriscado.

### Documentos privados

Documentos continuam privados.

Tenant A nunca acessa arquivo de B.

Validação obrigatoriamente no backend.

---

## 16. Wizard de criação de empresa

No Super Admin:

**Empresas → Nova empresa**

Wizard:

1. Empresa
2. Identidade
3. Site
4. Recursos
5. Administrador
6. Revisão

### Etapa Empresa

Campos principais:

- nome;
- slug;
- telefone;
- WhatsApp;
- e-mail;
- contatos relevantes.

Slug:
- normalizado;
- amigável;
- único;
- validado no backend.

### Etapa Identidade

Permitir:

- logo para fundo claro;
- logo para fundo escuro/transparente;
- favicon.

### Etapa Site

Permitir:

- cor principal;
- cor secundária;
- cor de destaque;
- textos/configurações pertinentes;
- dados de contato públicos.

### Etapa Recursos

- plano;
- limites;
- módulos disponíveis;
- módulos habilitados.

### Etapa Administrador

- nome;
- e-mail;
- convite.

### Revisão

Exibir resumo e criar.

---

## 17. Provisionamento transacional / idempotente

Criar empresa precisa provisionar consistentemente:

- Tenant;
- TenantSettings;
- branding;
- site;
- plano;
- entitlements;
- módulos;
- limites;
- administrador inicial;
- convite;
- slug;
- endereço lógico.

Tudo que for somente banco:
- transação.

Ações externas:
- e-mail;
- Vercel;
- storage;

devem ser idempotentes.

Se ação externa falhar:
- não mostrar tenant como plenamente pronto;
- manter CONFIGURANDO;
- registrar etapa pendente;
- oferecer retry.

Checklist de provisionamento, por exemplo:

- Tenant criado
- Branding salvo
- Plano aplicado
- Módulos configurados
- Admin convidado
- Site disponível
- Domínio opcional

Nova empresa nunca pode ver dados da Avança nem durante um estado intermediário.

---

## 18. Convites de usuários

Administrador não define senha do funcionário.

Fluxo:

1. nome + e-mail;
2. criar convite;
3. enviar e-mail;
4. usuário abre link;
5. define senha;
6. acesso é ativado.

### Convite seguro

- token aleatório;
- token armazenado como hash quando possível;
- expiração;
- uso único;
- tenant correto;
- membership correta.

Reutilizar infraestrutura de e-mail existente.

Se envio não estiver disponível:
- criar convite pendente;
- permitir a usuário autorizado copiar link de convite.

Nunca mostrar senha.

### Recuperação de senha

Preparar e, se seguro/compatível, implementar:
- “Esqueci minha senha”.

Não reescrever autenticação inteira sem necessidade.

### Limite de usuários

Convites e ativações obedecem à quota do tenant.

Validação obrigatória no backend.

---

## 19. Branding por empresa

Branding compartilhado não pode continuar hardcoded como Avança.

Transformar elementos de marca em tenant-aware.

Tenant 1:
**Avança Imóveis e Rogério Cortes**

XP:
**XP Imóveis**

### Painel

O design system do painel permanece padronizado:

- preto/grafite;
- azul;
- dark/light se houver;
- componentes atuais.

A paleta pública da imobiliária **não deve colorir o painel inteiro**.

No painel mudar apenas:
- logo;
- nome;
- favicon;
- identificação do tenant.

### Logo

Suportar:
- logo para fundo claro;
- logo para fundo escuro/transparente.

No dark mode:
- nunca exibir quadrado branco inadequado atrás da logo.

### Favicon

Tenant-aware.

No contexto da empresa:
- favicon da empresa.

No contexto global Super Admin:
- favicon da plataforma apropriado.

---

## 20. Login com identidade da empresa

Exemplo:

`/empresa/xp-imoveis/painel/login`

A aplicação conhece o tenant pela rota/hostname.

Mostrar:
- logo XP;
- nome XP;
- favicon XP;
- branding coerente.

Pode utilizar discretamente a cor principal pública.

Após login:
- painel volta ao design padronizado SaaS.

---

## 21. Site público multi-tenant

Cada tenant utiliza o mesmo motor de site.

Não duplicar aplicação por imobiliária.

Dados, marca, paleta e contato são específicos do tenant.

Nova empresa nasce com:

- 0 imóveis
- 0 clientes
- 0 oportunidades
- 0 visitas
- 0 propostas
- 0 vendas
- 0 proprietários

Nunca carregar dados da Avança por fallback.

---

## 22. Paleta do site

Empresa escolhe:

- cor principal;
- cor secundária;
- cor de destaque.

Usar CSS variables/tokens tenant-aware.

Gerar/validar:
- foreground;
- hover;
- contraste;
- acessibilidade.

Não aceitar combinação ilegível sem feedback.

---

## 23. Root tenant

A raiz pública:

`https://imoveisplatform.vercel.app/`

resolve para o tenant Avança.

Isso é uma regra de roteamento público, não fallback de segurança.

Nunca usar algo como:

`tenant ?? avancaTenant`

em lógica autenticada ou consultas operacionais.

Se tenant não estiver resolvido:
- não consultar dados;
- retornar erro controlado/404/redirect apropriado.

---

## 24. Slug e histórico de slug

Slugs de tenant são globais e únicos.

Se:
`xp-imoveis`

virar:
`xp-negocios`

manter histórico de slug.

Quando apropriado:
- fazer 301 do antigo para o novo.

IDs internos nunca dependem do slug.

---

## 25. Domínio personalizado

Dentro de:

**Configurações → Site → Domínio**

mostrar:

- domínio atual;
- endereço padrão;
- domínio personalizado;
- status;
- instruções DNS;
- verificação.

Estados:

- Aguardando configuração
- Verificando
- Ativo
- Erro

Todos os domínios apontam para o mesmo projeto Vercel.

### Integração Vercel

Usar API/SDK disponível para:
- adicionar domínio;
- consultar configuração;
- verificar domínio;
- remover domínio autorizado.

Descobrir configuração atual antes.

Variáveis conceituais, somente se necessárias e ainda inexistentes:
- `PLATFORM_BASE_URL`
- `ROOT_DOMAIN`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID` / `TEAM_ID`

Não inventar IDs.
Não colocar secrets no código.
Não imprimir token em log.

Se acesso Vercel estiver ausente:
- implementar arquitetura;
- informar exatamente qual acesso externo falta;
- não simular sucesso.

### Domínio e tenant

Quando custom domain estiver ativo:

`www.xpimoveis.com.br`
→ Tenant XP.

No domínio próprio, devem funcionar naturalmente:
- /
- /imoveis
- /imoveis/{slug}
- /painel/login

### Segurança de host

- domínio único;
- lowercase;
- normalizar hostname;
- tratar www quando apropriado;
- remover porta;
- prevenir host header injection.

---

## 26. SEO independente por tenant

Cada empresa possui:

- title;
- description;
- Open Graph;
- favicon;
- canonical;
- sitemap;
- robots;
- structured data;
- metadata de imóveis.

Google não pode interpretar todos os tenants como Avança.

### Canonical

Sem domínio próprio:
- URL padrão do tenant.

Com domínio próprio ativo:
- preferir domínio customizado como canonical.

Evitar conteúdo duplicado indexado em dois domínios.

### Sitemap

Sitemap XP:
- somente imóveis XP.

Sitemap Avança:
- somente Avança.

Nunca cruzar tenants.

---

## 27. Planos

Criar infraestrutura para:

- Starter
- Pro
- Max
- Custom

Nenhuma cobrança automática nesta fase.

Não integrar:
- Stripe;
- Mercado Pago;
- PayPal;
- equivalente.

Super Admin pode atribuir manualmente plano.

Clientes do serviço de tráfego podem receber **Max**.

Não inventar limites comerciais finais agora.

---

## 28. Entitlements e quotas

Centralizar regras.

Não espalhar:

`if (plan === "pro")`

pelo código.

Criar camada conceitual equivalente a:

- `canUseFeature()`
- `getLimit()`
- `getUsage()`
- `canCreateResource()`
- `requireEntitlement()`

Suportar limites para:

- usuários;
- imóveis ativos;
- clientes/leads;
- oportunidades;
- armazenamento;
- documentos;
- domínio personalizado;
- módulos;
- analytics.

Valor nulo/configuração apropriada pode significar ilimitado.

### Overrides

Super Admin pode ajustar limite específico de uma empresa sem necessariamente criar outro plano.

Exemplo:
- Pro
- max_users override = 12

### Uso

Mostrar:

- Usuários 4/10
- Imóveis 127/500
- Armazenamento 3,8 GB/20 GB

### Limite atingido

Nunca apagar dados.

Nunca bloquear leitura dos existentes.

Bloquear apenas criação/uso adicional correspondente.

### Downgrade

Nunca:
- apagar imóveis;
- apagar documentos;
- remover histórico;
- apagar usuários.

Se uso atual exceder novo limite:
- marcar overage;
- bloquear novas criações;
- manter dados;
- permitir Super Admin resolver.

---

## 29. Module Registry

Criar registro central de módulos.

Auditar módulos reais existentes.

Conceitualmente incluir:

- dashboard
- properties
- crm
- visits
- proposals/sales
- owners
- analytics
- demais existentes

### Regra de acesso

Módulo disponível quando:

**plano permite**
E
**tenant habilitou**
E
**usuário possui permissão**

São três camadas diferentes.

### Controle da empresa

Administrador XP:
- ativa/desativa somente módulos da XP.

Nunca altera Avança ou outro tenant.

### Desativação

Desativar módulo:
- remove navegação/acesso;
- não apaga dados.

Ao reativar:
- dados reaparecem.

### Backend

Não basta esconder sidebar.

Route guards/backend também devem validar:
- tenant;
- módulo;
- permissão.

### Novos módulos

Não construir no-code builder agora.

Novo módulo funcional:
- desenvolvido em código;
- registrado no Module Registry;
- disponibilizado por plano;
- tenant decide se ativa.

### Dependências

Se um módulo depender de outro:
- registrar dependência;
ou
- impedir combinação inválida.

---

## 30. Dashboard do tenant

Dashboard não pode ser exclusivo de Super Admin.

Usuário com:
- módulo Dashboard habilitado;
- permissão Dashboard;

vê métricas **somente da própria empresa**.

Nunca métricas globais.

---

## 31. Tela de empresas no Super Admin

Permitir:

- busca;
- filtros;
- status;
- plano;
- número de usuários;
- número de imóveis;
- domínio;
- uso;
- ações administrativas.

Exemplo:

| Empresa | Plano | Usuários | Imóveis | Status | Domínio |
|---|---|---:|---:|---|---|

### Detalhe da empresa

Seções sugeridas:

- Visão geral
- Identidade
- Site
- Plano e limites
- Módulos
- Usuários
- Domínios
- Analytics
- Auditoria

---

## 32. Acessar como empresa

Super Admin precisa conseguir acessar o contexto operacional de uma empresa.

Não é necessário criar uma grande barra permanente de impersonação nesta fase.

Mas:
- deve ser claro como sair;
- tenant context deve ser correto;
- ação deve ser auditada;
- sessão não pode ficar presa no tenant errado.

---

## 33. Auditoria central

Registrar ações sensíveis:

- empresa criada;
- status alterado;
- suspensão;
- cancelamento;
- plano alterado;
- limites alterados;
- domínio adicionado/removido;
- usuário convidado;
- usuário suspenso;
- permissões alteradas;
- módulos alterados;
- acesso administrativo a tenant;
- solicitações de exclusão.

Não registrar:
- senha;
- token;
- secret;
- conteúdo de documento;
- arquivo privado;
- URL assinada;
- dados pessoais desnecessários.

---

## 34. Exportação

Preparar arquitetura tenant-aware para exportação.

Idealmente implementar exportação básica de:

- imóveis;
- clientes;
- oportunidades.

Formato:
- CSV ou equivalente adequado.

Export respeita tenant.

Nunca misturar empresas.

---

## 35. Analytics próprio por tenant

Implementar analytics próprio da plataforma.

Não depender exclusivamente do Vercel Analytics.

Vercel Web Analytics pode ser complemento.

### Eventos mínimos

- `site_view`
- `property_view`
- `whatsapp_click`
- `interest_submit`
- `favorite_add`
- `search`

### Estrutura conceitual

- id
- tenant_id
- property_id nullable
- event_type
- anonymous_session_id
- utm_source nullable
- utm_medium nullable
- utm_campaign nullable
- utm_content nullable
- utm_term nullable
- referrer nullable
- created_at

Não guardar IP puro.

### Analytics somente do site público

Não contar:
- painel;
- Super Admin;
- navegação administrativa;
- preview interno quando identificável.

### Bots / spam

Implementar proteção razoável:
- bot filtering;
- rate limiting;
- deduplicação.

Refresh repetido não deve virar dezenas de visitantes únicos.

### Visitantes únicos

Usar identificador anônimo first-party apropriado.

Permitir métricas como:
- 428 visualizações;
- 301 visitantes únicos.

### Dashboard Analytics da empresa

Mostrar pelo menos:

- visitantes únicos;
- visualizações do site;
- visualizações de imóveis;
- imóvel mais acessado;
- cliques WhatsApp;
- formulários de interesse;
- favoritos;
- buscas;
- taxa visualização → contato;
- origem do tráfego quando disponível.

Filtros:
- Hoje
- 7 dias
- 30 dias
- Personalizado

### Analytics por imóvel

Tabela conceitual:

| Imóvel | Visualizações | Visitantes | WhatsApp | Interesses | Conversão |
|---|---:|---:|---:|---:|---:|

### Super Admin Analytics

Super Admin pode ver consolidado:
- tráfego total;
- empresas mais acessadas;
- distribuição por tenant;
- crescimento.

Tenant só vê seus próprios dados.

---

## 36. UTM e origem comercial do lead

Pode capturar automaticamente para ANALYTICS:

- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term

### Regra obrigatória

**Não preencher automaticamente o campo comercial "Origem do lead" no CRM baseado em UTM.**

A empresa escolhe manualmente a origem do lead/card.

Exemplos:

- Instagram
- Tráfego pago
- Indicação
- Evento
- Prospecção

UTM = analytics.

Origem comercial do CRM = manual.

Não misturar.

---

## 37. Retenção de analytics

Não guardar eventos crus indefinidamente.

Criar arquitetura com:

- eventos recentes detalhados;
- agregações históricas.

Retenção deve ser configurável/documentada.

Antes de apagar raw events:
- garantir que agregações necessárias existam.

Gravação de analytics não pode bloquear navegação nem degradar Core Web Vitals.

---

## 38. Publicação de imóveis

Preservar comportamento atual.

Publicação sempre dentro do tenant.

Imóvel XP nunca aparece no site Avança.
Imóvel Avança nunca aparece no site XP.

---

## 39. Compartilhamento e PDF

Link público de imóvel deve usar URL do tenant.

Avança:
- raiz atual.

XP:
- `/empresa/xp-imoveis/imoveis/{slug}`

ou domínio customizado quando ativo.

Se PDF inclui branding:
- usar logo, nome e contato do tenant correto.

---

## 40. WhatsApp e contatos

Links de WhatsApp usam contato do tenant.

Não hardcode telefone da Avança em componentes compartilhados.

Formulário de interesse no site XP:
- cria lead/oportunidade do tenant XP.

Nunca Avança.

---

## 41. Suspensão

Ao suspender tenant:

- impedir login;
- invalidar/bloquear sessões quando necessário;
- bloquear site;
- preservar todos os dados.

Mostrar página apropriada.

Convite de usuário de tenant suspenso não deve liberar operação até reativação.

---

## 42. Variáveis e segredos

Auditar `.env.example`.

Reutilizar variáveis existentes.

Adicionar somente se necessário.

Nunca commit:
- .env;
- senhas;
- tokens;
- DATABASE_URL real;
- chaves S3;
- credenciais.

Ignorar qualquer credencial eventualmente presente em histórico de conversa.

Nunca copiar credencial para:
- código;
- docs;
- fixtures;
- logs;
- commits.

---

## 43. UI/UX

Manter identidade atual da plataforma.

Não usar esta tarefa para redesenhar tudo.

Novas telas devem parecer parte do mesmo produto.

Responsividade obrigatória:
- 1920
- 1440
- 1366
- tablet
- mobile

Especial atenção:
- wizard;
- lista de empresas;
- configuração;
- analytics;
- domínio;
- módulos;
- usuários.

Implementar:
- loading;
- error;
- empty states.

Não usar métricas mock como se fossem reais.

Toda UI em PT-BR.

Não mostrar erro técnico cru ao usuário.

---

## 44. Documentação

Criar/atualizar:

- `docs/saas/ARCHITECTURE.md`
- `docs/saas/EXECUTION_PLAN.md`
- `docs/saas/MIGRATION_PLAN.md`
- `docs/saas/TENANT_SECURITY.md`
- `docs/saas/DOMAINS.md`
- `docs/saas/ANALYTICS.md`
- `docs/saas/IMPLEMENTATION_STATUS.md`

Atualizar AGENTS.md se fizer sentido.

Este arquivo `MASTER_SPEC.md` é a fonte de verdade do escopo aprovado.

---

## 45. Execução por milestones

Esta é uma única tarefa de ponta a ponta.

Não parar entre milestones para pedir novo prompt.

### Milestone 0
Auditoria completa.

### Milestone 1
Data model multi-tenant.

### Milestone 2
Migração segura da Avança.

### Milestone 3
Tenant context + isolamento + autorização.

### Milestone 4
Users + Membership + Convites.

### Milestone 5
Super Admin + Empresas.

### Milestone 6
Provisionamento transacional/idempotente.

### Milestone 7
Branding + site tenant-aware.

### Milestone 8
Rotas + domínio + slug history.

### Milestone 9
Planos + entitlements + quotas.

### Milestone 10
Module Registry.

### Milestone 11
Analytics.

### Milestone 12
Auditoria + exportação.

### Milestone 13
Security hardening.

### Milestone 14
Testes completos.

### Milestone 15
Preview/revisão final.

Ao terminar um milestone:
- atualizar `IMPLEMENTATION_STATUS.md`;
- rodar testes relevantes;
- fazer commit;
- continuar.

Não responder:
“Pronto, posso continuar?”

Continuar automaticamente.

---

## 46. Checkpoints

Antes de migration crítica:

- git status;
- confirmar ambiente;
- snapshot/restore;
- revisar SQL;
- testar em ambiente seguro.

Nunca usar dados reais de produção para testes destrutivos.

Usar fixtures sintéticas.

---

## 47. Testes obrigatórios

### Autorização cross-tenant

Trocar IDs, slugs, URLs, requests e storage keys deliberadamente.

Tudo deve permanecer isolado.

### Super Admin

Testar:
- criar tenant;
- branding;
- plano;
- limites;
- módulos;
- acesso ao tenant;
- suspender;
- reativar.

### Admin de empresa

Testar:
- gerenciar usuários da própria empresa;
- alterar somente módulos próprios;
- alterar branding/site próprio se permitido;
- gerenciar domínio próprio se entitlement permitir;
- nunca acessar outra empresa.

### Limites

Testar:
- max users;
- max properties;
- max storage;
- custom domain entitlement;
- module entitlement.

Backend obrigatório.

### Suspensão

Suspender:
- login bloqueado;
- site bloqueado;
- dados intactos.

Reativar:
- dados normais novamente.

### Branding

Avança:
- marca Avança Imóveis e Rogério Cortes.

XP:
- apenas XP.

Nenhuma marca Avança hardcoded em XP.

### Site

Avança:
`https://imoveisplatform.vercel.app/`

XP:
`https://imoveisplatform.vercel.app/empresa/xp-imoveis`

Dados separados.

### SEO

Verificar ao menos dois tenants:
- metadata;
- canonical;
- Open Graph;
- favicon;
- sitemap;
- robots.

### Analytics

Acessar imóvel XP:
- evento XP.

Acessar Avança:
- evento Avança.

Acessar painel:
- nenhum `site_view`.

### UTM

Acessar:
`?utm_source=meta&utm_campaign=teste`

Analytics captura.

CRM não preenche automaticamente origem comercial.

### Domínio

Se integração Vercel estiver disponível:
- usar domínio de teste apropriado.

Se não:
- testar resolução internamente;
- não conectar domínio aleatório de produção.

---

## 48. Qualidade

Ao longo da implementação e obrigatoriamente no final executar scripts reais equivalentes a:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Corrigir erros introduzidos.

---

## 49. Critérios de não conclusão

Não considerar concluído se:

- tenant isolation existir somente no frontend;
- algum endpoint tenant-owned continuar global;
- tabela tenant-owned ficar sem isolamento;
- Avança perder dados;
- usuário existente perder acesso injustificadamente;
- tenant novo enxergar Avança;
- módulos forem somente escondidos no menu;
- quotas existirem apenas visualmente;
- analytics misturar tenants;
- painel contar como site view;
- UTM preencher automaticamente origem do lead;
- suspensão apagar dados;
- branding continuar hardcoded;
- cache puder cruzar tenants;
- documentos puderem cruzar tenants;
- build estiver quebrado;
- domínio customizado tiver somente um campo sem fluxo real;
- provisionamento puder cair em fallback para Avança.

---

## 50. Acessos externos

Antes de pedir algo ao usuário:
- tentar descobrir pelo ambiente/repositório.

Possíveis integrações:
- GitHub
- Neon
- Neon Object Storage
- Vercel
- e-mail

Se faltar acesso:
- continuar tudo que não depende dele;
- parar somente na operação externa bloqueada;
- informar objetivamente:

```
Serviço:
Projeto:
Permissão necessária:
Etapa bloqueada:
```

Nunca pedir para o usuário colar token, senha, chave privada ou DATABASE_URL no chat.

---

## 51. Relatório final

Ao finalizar, entregar:

- branch;
- commits;
- resultado de lint;
- typecheck;
- testes;
- build;
- migrations;
- snapshot/restore point;
- contagens antes/depois;
- Tenant Avança;
- dados migrados;
- usuários/memberships;
- tenant context;
- isolamento;
- testes cross-tenant;
- storage isolation;
- Super Admin;
- wizard;
- onboarding;
- convites;
- planos;
- quotas;
- módulos;
- branding;
- sites;
- rotas;
- domínio customizado;
- SEO;
- analytics;
- retenção;
- auditoria;
- exportação;
- variáveis novas;
- acessos externos faltantes;
- pendências reais.

---

## 52. Instrução de execução

Não devolver apenas um plano.

Executar.

Começar auditando o projeto real.

Criar `EXECUTION_PLAN.md`.

Depois executar todos os milestones sequencialmente.

Não pedir confirmação sobre decisões já fechadas neste documento.

Só interromper se houver:

- risco real de perda de dados;
- acesso externo indispensável ausente;
- contradição técnica que não possa ser resolvida com segurança sem decisão do usuário.

Prioridades absolutas:

1. preservar os dados existentes da Avança;
2. isolamento entre tenants;
3. segurança;
4. consistência arquitetural;
5. compatibilidade com a aplicação atual;
6. experiência do usuário;
7. performance.
