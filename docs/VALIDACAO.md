# Registro de validação — documentação e automação

Data: 12/09/2026. Este registro descreve o que foi observado nesta entrega; não substitui as próximas execuções de CI.

## Resultado observado

| Verificação | Resultado |
| --- | --- |
| Nomes de arquivos, inclusão indevida de arquivos privados/gerados e links simbólicos | PASS com `npm run check:safety`. |
| Segredos reconhecidos no conteúdo atual do projeto | PASS com Gitleaks 8.30.1 e valores ocultados; histórico Git e arquivos privados ignorados não foram lidos. |
| Sintaxe de JavaScript, TypeScript do navegador e do Worker | PASS com os comandos do projeto. |
| Build e empacotamento Cloudflare sem publicação | PASS; 237 arquivos estáticos; todos abaixo de 25 MiB. |
| Preservação do catálogo público v1 no build | PASS; os 142 arquivos públicos comparados tiveram SHA-256 idêntico à origem. |
| Instalação limpa com Node 22.23.2 | PASS; `npm ci --ignore-scripts --no-audit --no-fund` e `npm run check` em cópia temporária isolada. |
| Auditoria das dependências | PASS; `npm audit --audit-level=high` retornou zero vulnerabilidades. |
| Sintaxe e regras do workflow | PASS com actionlint 1.7.12. |
| Espaços/erros do diff local rastreado | PASS com `git diff --check`. Os arquivos novos também foram conferidos pelos validadores pertinentes. |
| Verificador de publicação contra o site já existente | PASS; hashes de seis páginas e três bundles coincidiram com o build e `/api/health` respondeu pronta. Apenas GET; nenhuma peça criada ou retirada. |
| Testes automatizados e lint da aplicação | NOT-RUN; não há etapa de lint configurada e nenhum teste ou mock foi criado. Actionlint é específico do workflow. |
| Revisão visual/interativa em navegador nesta entrega | NOT-RUN; as páginas e o comportamento de produto não foram editados nesta tarefa. |
| Execução real no GitHub Actions / novo deploy | NOT-RUN; arquivos preparados localmente, sem commit, push, integração ou publicação nesta tarefa. |
| Ativação das proteções e dos Secrets | BLOCKED para o acesso atual: permissão WRITE, sem administração. Na inspeção, não havia workflows nem ambiente production cadastrados. |

O site já existente responder e corresponder ao build **não prova** uma execução do workflow novo. A primeira execução completa depende da configuração e envio descritos em [DEPLOY.md](DEPLOY.md).

## Arquivos desta tarefa

Criados:

- `README.md` e `AGENTS.md`.
- `docs/DEPLOY.md` e este registro.
- `.github/workflows/validate-and-deploy.yml`, `.github/pull_request_template.md` e `.github/CODEOWNERS`.
- `scripts/file-policy.mjs`, `scripts/check-repository.mjs`, `scripts/check-secrets.mjs`, `scripts/check-syntax.mjs` e `scripts/verify-deployment.mjs`.

Atualizados:

- `LEIA-ME.txt` e `PUBLICACAO.md`: orientação para os guias atuais e separação de migração remota e deploy.
- `package.json`: comandos de validação, empacotamento e conferência da publicação.
- `.gitignore`: formatos privados e saídas geradas adicionais.
- `scripts/build.mjs`: tipos públicos permitidos, bloqueio de links simbólicos e conferência do conteúdo de saída.

`PUBLICACAO.md`, `package.json`, `.gitignore` e `scripts/build.mjs` já existiam localmente, ainda sem rastreamento no Git, antes desta tarefa. As alterações preexistentes no editor, galeria, módulos TypeScript, Worker, catálogo e configurações foram preservadas. Nenhuma dependência foi adicionada ao projeto.

## Validação manual pendente

Após configurar os acessos e integrar a proposta autorizada, conferir a execução completa no GitHub, o resumo de confirmação e o site em computador e celular. Confirmar que PRs não publicam e que o ambiente aceita somente main. Peças, dados, migrações e recursos Cloudflare só podem ser removidos/alterados administrativamente com autorização específica.
