# Publicação automática na Cloudflare

Este guia é para a pessoa que configura o GitHub e a Cloudflare. O uso cotidiano está no [README](../README.md).

## Destino existente e escopo

- Repositório: `sosofsof/experimentos`; branch de publicação: `main`.
- Workflow: [Validar e publicar](../.github/workflows/validate-and-deploy.yml).
- Worker: `experimentos-pecas-livres`.
- Site: [experimentos-pecas-livres.experimentos.workers.dev](https://experimentos-pecas-livres.experimentos.workers.dev/).
- Banco D1 existente: `pecas-livres`, binding `DB`, configurado em `wrangler.jsonc`.
- Ambiente de GitHub: `production`.

Não crie outro banco, não altere o identificador existente nem migre para Pages para ativar este fluxo. O identificador do D1 é metadado, não uma chave de acesso. O workflow publica o Worker e os arquivos estáticos, preserva variáveis remotas com `--keep-vars` e não aplica migrações, não executa SQL administrativo e não apaga recursos.

## 1. Preparar a proposta no GitHub

Revise e envie o código fonte, documentação, `package.json`, `package-lock.json`, configurações e scripts necessários. Não envie `node_modules/`, `dist/`, `dist-worker/`, `pecas/generated/`, `.wrangler/` ou arquivos privados. Confira os caminhos antes de adicionar arquivos ao Git.

Abra uma proposta para `main`. O job **Validar alteração** precisa aparecer e passar antes de ser selecionado como verificação obrigatória na proteção da branch. Propostas, inclusive de forks, usam `pull_request`, sem segredos da Cloudflare. Não troque para `pull_request_target`.

## 2. Proteger a main

Uma pessoa com acesso administrativo deve abrir **Settings → Rules → Rulesets**, ou a tela de proteção de branches, e configurar uma regra ativa para `main`:

- Exigir pull request antes da integração.
- Exigir aprovação de uma pessoa responsável; exigir revisão de Code Owners. O [CODEOWNERS](../.github/CODEOWNERS) aponta para `@sosofsof`, dona do repositório. Atualize-o se a responsabilidade mudar.
- Invalidar aprovações antigas quando a proposta recebe mudanças e exigir que a aprovação cubra a revisão mais recente.
- Exigir o check **Validar alteração**, com a branch atualizada em relação à `main`.
- Bloquear exclusão da branch e force-push; não conceder bypass ao agente.
- Exigir resolução das conversas de revisão.

Uma pessoa não pode aprovar o próprio PR. Se a dona também for a autora da proposta, use uma segunda pessoa responsável com acesso de revisão; não remova a proteção para contornar isso. Confirme que a regra se aplica às contas que farão integrações.

CODEOWNERS e AGENTS.md sozinhos não obrigam revisão. O workflow é código modificável e também deve ser revisado. A proteção externa impede que uma alteração do próprio agente desative silenciosamente os cuidados.

## 3. Criar o ambiente e os Secrets

Em **Settings → Environments**, crie `production`. Em **Deployment branches and tags**, permita somente a branch `main`, sem tags. Para deploy automático após o merge já aprovado, não adicione uma segunda aprovação do ambiente. Se a responsável preferir uma confirmação extra por publicação, ative required reviewers nesse ambiente.

Crie os dois **Environment secrets** abaixo diretamente no ambiente:

| Nome exato | Conteúdo cadastrado pela pessoa responsável |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token de implantação criado na Cloudflare e limitado à conta do site. |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador da conta onde o Worker e o D1 existentes estão. |

O Account ID não é senha, mas também é mantido no ambiente para evitar divergência de configuração. Não cadastre tokens em variáveis públicas, arquivos, mensagens ou outputs de workflow. Não é necessário segredo da OpenAI, chave de exclusão de peça nem senha pessoal. Não reutilize uma Global API Key.

Na Cloudflare, crie um token dedicado a esta automação pelo modelo **Edit Cloudflare Workers**, restrito à conta correta. Revise as permissões e retire serviços não usados. Este projeto usa `workers.dev`, sem alteração de DNS ou rotas de uma zona; o fluxo não precisa de permissões de administração de usuários nem de execução de migrações D1. O acesso de edição de Workers permite alterar código com bindings: trate esse token como privilegiado mesmo sem permissão administrativa direta ao banco. Se houver erro de permissão, confira a operação exata antes de ampliar o escopo.

A pessoa responsável deve copiar o token diretamente da Cloudflare para o formulário de Secret do GitHub. O agente não deve ler nem transportar seu valor. Confira apenas nomes/presença dos Secrets, nunca o conteúdo. Ao expirar ou revogar o token, substitua-o nesse mesmo campo.

Ative também a proteção de push contra segredos nas configurações de segurança do repositório, quando disponível. O scanner de CI roda depois de um push: ele bloqueia deploy, mas não desfaz uma exposição já enviada ao GitHub.

## 4. Evitar duas automações concorrentes

Confira se o Worker já usa Workers Builds ou outra integração de Git. Este projeto escolhe GitHub Actions como responsável pelo deploy. Se houver uma integração antiga que também publica a cada push, apresente-a à responsável e obtenha autorização para desativar apenas esse disparo duplicado. Não exclua o Worker, banco ou domínio.

## 5. Confirmar a primeira publicação

Depois da autorização para integrar a proposta na `main`, acompanhe **Actions → Validar e publicar**. Também existe **Run workflow** para uma execução manual da versão atual da `main`; outras branches nunca recebem o job de deploy.

O fluxo faz:

1. Verifica nomes de arquivos e links simbólicos antes de ler conteúdo ou instalar dependências.
2. Instala Gitleaks 8.30.1 com SHA-256 fixo, analisa os arquivos atuais do projeto, oculta os valores e não publica relatórios como artifacts. Não analisa histórico Git nem arquivos privados ignorados.
3. Executa `npm ci --ignore-scripts`, usando o lockfile. O esbuild deste projeto usa o binário de sua dependência opcional; não exige liberar todos os scripts de instalação.
4. Executa `npm audit --audit-level=high`, sem correção automática. Vulnerabilidade alta/crítica ou indisponibilidade do serviço impede a publicação até investigação.
5. Confere sintaxe dos arquivos JavaScript, TypeScript do navegador e Worker, build, formatos públicos, tamanho máximo dos arquivos e `wrangler deploy --dry-run`.
6. Após sucesso e somente na `main`, reconstrói o mesmo commit em outro job sem credenciais nas etapas de instalação e build. As dependências continuam fixadas pelo lockfile.
7. Confere se o commit ainda é o mais recente da `main`. Execuções antigas são ignoradas. A concorrência impede deploys simultâneos deste workflow e não cancela um envio em andamento.
8. Disponibiliza os Secrets somente ao passo de `wrangler deploy --keep-vars`.
9. Faz GET nas páginas dos quatro experimentos, na galeria e nos três bundles e compara SHA-256 com o build. Consulta `/api/health`, que retorna apenas prontidão. Registra a confirmação e o commit no resumo do GitHub.

As Actions externas estão fixadas por SHA completo; o scanner tem versão e checksum fixos. A rotina de validação não precisa de credenciais de produção, não executa migrações e não publica peças para conferir a galeria. O Node.js do CI é 22; `package-lock.json` precisa acompanhar mudanças de dependências.

Confira manualmente, após o primeiro deploy, menu, quatro experimentos, galeria e a mudança solicitada em computador e celular. Publicar ou retirar uma peça real para validação exige autorização específica. O resultado automático não avalia aparência, download em todos os dispositivos ou comportamento interativo completo.

## Alterações de banco e recuperação

Mudanças que exigem migração **não estão cobertas pela publicação automática comum**. O agente deve detectar essa necessidade antes de propor a integração e informar o impacto. O workflow não consegue inferir se uma alteração de código exige um novo esquema.

Antes de qualquer operação remota, obtenha autorização específica para a migração, confirme o banco e planeje preservação/recuperação com a pessoa administradora, pelas ferramentas oficiais, sem abrir ou copiar dados privados. Verifique compatibilidade com o código ainda publicado. Não edite migrações já aplicadas, não execute comandos destrutivos e não use `db:remote` como uma etapa padrão de deploy. O script existe para manutenção deliberada e autorizada.

O código antigo pode depender do esquema antigo. Por isso, um rollback de Worker não é uma restauração de dados e não deve ser automático. Para voltar uma mudança de código, proponha um commit de reversão revisável, confirme compatibilidade e obtenha autorização. Nunca use reset/force-push para reescrever a `main`.

## Se algo falhar

| Situação | Ação |
| --- | --- |
| Secret ausente ou token expirado | A responsável cadastra/substitui o Secret no ambiente. Não cole o valor na tarefa. |
| Scanner detectou segredo | Interrompa o envio, registre apenas `[REDACTED]` e peça revogação/rotação ao responsável. Não ignore a ocorrência nem reescreva histórico sem autorização. |
| Vulnerabilidade ou falha no build | Corrija a causa em nova proposta. Não use `continue-on-error`, remova checks ou force atualização de dependências. |
| `Publicação ignorada` | Acompanhe o commit mais recente. Não reexecute um commit antigo. |
| Deploy enviado, conferência falhou | O site pode já estar atualizado. Confira status, metadados do deploy e URLs públicas; não leia logs brutos nem repita o envio às cegas. |
| Site precisa de reversão | Explique o efeito, confirme compatibilidade e obtenha autorização antes de agir. |

O workflow não roda periodicamente; ele confere cada atualização. Monitoramento contínuo seria uma configuração adicional. Os filtros não reconhecem todo dado pessoal ou segredo possível, e não substituem revisão humana e permissões mínimas.

## Referências oficiais

- [Cloudflare: GitHub Actions e autenticação de CI](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
- [Cloudflare: comandos de publicação do Worker](https://developers.cloudflare.com/workers/wrangler/commands/workers/).
- [GitHub: segurança das Actions e fixação por SHA](https://docs.github.com/en/actions/reference/security/secure-use).
- [GitHub: ambientes de implantação](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
- [GitHub: proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Gitleaks: funcionamento e ocultação dos valores](https://github.com/gitleaks/gitleaks).
