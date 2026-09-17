# Publicação Vercel — configuração de lançamento

- Projeto vinculado: `avan-aimoveis`.
- Agendamento automático de `/api/cron/visit-reminders` temporariamente removido de `vercel.json`, com autorização do usuário. A rota e os lembretes do painel permanecem disponíveis.
- Produção: branch Neon `vercel-production` (`br-raspy-snow-b58wt9zz`), criada com os cadastros existentes conforme autorização do usuário.
- Preview: branch Neon `vercel-preview` (`br-falling-firefly-b57arz1t`), criada somente com o schema, sem dados pessoais.
- Development: conexão local original preservada (`br-orange-firefly-b5pde16d`, cujo nome histórico no Neon é `production`).
- As variáveis DATABASE_URL e DIRECT_URL possuem valores separados por ambiente. Runtime usa conexão pooled; migrations usam conexão direct. AUTH_PEPPER de produção foi preservado para manter compatibilidade com as senhas existentes; preview usa segredo próprio.
- Site: `https://avan-aimoveis.vercel.app`. Painel: `/painel`; entrada: `/login`.
- O projeto está conectado à branch `feat/plataforma-base` como produção; pushes nessa branch podem iniciar deploy automático.
- A publicação inicial deve usar `vercel deploy --prod --skip-domain`, verificar as rotas e então promover o mesmo deployment.
- Para reativar o agendamento, após validar o plano e a configuração de e-mail, restaurar a entrada `crons` com caminho `/api/cron/visit-reminders` e frequência aprovada.
