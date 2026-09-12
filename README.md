# Experimentos

Este é o site dos quatro experimentos: **Rolo de bordados, Flores, Cartas de tarô e Peças livres**. Você pode pedir mudanças em linguagem comum pelo modo Work. Não precisa aprender programação para acompanhar o trabalho.

[Abrir o site](https://experimentos-pecas-livres.experimentos.workers.dev/) · [Abrir a galeria](https://experimentos-pecas-livres.experimentos.workers.dev/pecas/galeria.html) · [Acompanhar atualizações no GitHub](https://github.com/sosofsof/experimentos/actions)

## Como pedir uma mudança

Abra uma tarefa no Work com este repositório disponível e selecione **GPT-6 Astra**, se ele estiver disponível na ferramenta. Diga a página, o que incomoda e o resultado que deseja. O repositório contém um [AGENTS.md](AGENTS.md) com instruções para o agente preservar o site, proteger dados e conferir o trabalho.

Você pode copiar este pedido e adaptar:

> Leia o README.md e o AGENTS.md antes de começar. Na página Peças livres, quero que os botões fiquem mais fáceis de usar no celular. Preserve o estilo do site e as peças já publicadas. Faça a mudança, execute as verificações disponíveis e mostre como posso conferir. Não apague conteúdo ou dados sem minha autorização explícita. Explique o resultado em linguagem simples e deixe a proposta pronta para eu aprovar a publicação.

Outros exemplos:

- “Na página Flores, o botão fica cortado no celular. Corrija mantendo o visual atual.”
- “Quero mudar este texto da página inicial para: …”
- “A galeria não abre. Investigue sem consultar dados privados e corrija o problema.”
- “Quero experimentar outra aparência. Primeiro me mostre uma proposta visual, antes de alterar o site.”

Não envie senhas, tokens, arquivos de acesso privado ou links de retirada de peças. Se precisar de uma imagem para explicar um problema, confira se ela não mostra dados pessoais.

## Como uma alteração chega ao site

Depois da configuração inicial descrita abaixo, o caminho é:

1. **Você pede a mudança.** O agente prepara uma proposta separada do site publicado.
2. **O GitHub verifica a proposta.** Confere possíveis segredos, dependências com vulnerabilidades conhecidas, sintaxe, tipos e a preparação dos arquivos para publicação.
3. **Você confere o resultado.** Peça uma prévia ou imagens e uma explicação do que mudou. Um resultado verde não avalia se você gostou do visual.
4. **Você autoriza a publicação.** A proposta é integrada à `main`, que é a versão oficial do repositório. O botão **Merge pull request** faz essa integração; você também pode pedir ao agente para fazê-la, se ele tiver acesso.
5. **O GitHub publica automaticamente na Cloudflare**, se as verificações passarem. Depois confere as páginas, os arquivos publicados e a resposta da API.

Para aprovar uma proposta concreta, você pode dizer:

> Aprovo a publicação desta proposta. Se todas as verificações passarem, pode integrar na main e acompanhar o deploy na Cloudflare. Essa aprovação não autoriza apagar dados, peças publicadas ou recursos do site.

Não é necessário confirmar o mesmo deploy novamente. Se aparecer uma necessidade nova de apagar conteúdo ou modificar o banco, o agente deve explicar e pedir autorização específica.

**Enviar arquivos para uma branch ou abrir uma proposta não publica o site. Integrar na `main` dispara a publicação automática.** Não use a `main` para rascunhos.

## Como saber se deu certo

Abra [Actions no GitHub](https://github.com/sosofsof/experimentos/actions) e procure a execução mais recente de **Validar e publicar**.

| O que aparece | O que significa |
| --- | --- |
| `Validar alteração` verde em uma proposta | A parte automática passou. A proposta ainda precisa ser conferida e integrada. |
| `Publicar na Cloudflare` verde, com “Publicação confirmada” no resumo | O envio e a conferência dos arquivos e da API terminaram. Abra o site para conferir a aparência. |
| Amarelo ou aguardando | Ainda está executando ou aguardando uma regra de aprovação. |
| Vermelho na validação | O deploy não começou. Peça ao agente para corrigir a etapa que falhou. |
| Vermelho na publicação | O envio pode ter acontecido. Peça para verificar o estado antes de repetir ou desfazer. |
| “Publicação ignorada” no resumo | Já existe uma alteração mais recente. Acompanhe a execução dela. |

Você pode pedir:

> A atualização ficou vermelha na etapa [nome]. Verifique o status sem abrir logs brutos ou revelar credenciais, corrija a causa e me diga se o site chegou a ser atualizado. Não desative as verificações para publicar.

## O que precisa de autorização especial

- Apagar uma página, imagem original, peça da galeria ou trabalho existente.
- Alterar o banco de dados, restaurar uma versão antiga ou substituir recursos da Cloudflare.
- Contratar serviços, mudar plano, domínio ou cobrança.
- Reduzir as proteções do GitHub ou trocar acessos e credenciais.

O agente deve explicar **o que será afetado, por quê e se há como recuperar**, antes de agir. Um pedido genérico como “limpe o projeto” não autoriza exclusões. A limpeza dos arquivos temporários que o próprio build gera faz parte da preparação normal; as peças da galeria ficam no banco e não são esses arquivos.

O arquivo privado recebido ao publicar uma peça permite retirá-la. Guarde-o em particular: quem recebe esse acesso pode retirar a peça. Se ele e o acesso do navegador forem perdidos, não há recuperação automática.

## Configuração inicial — uma vez só

**A automação só fica ativa depois de os arquivos serem enviados ao GitHub e os acessos abaixo serem configurados.** Na inspeção de 12/09/2026, este repositório ainda não tinha workflows nem ambiente `production` cadastrados; isso é um registro daquele momento, não uma consulta em tempo real.

Peça ajuda à pessoa administradora do repositório com este texto:

> Configure a publicação descrita em docs/DEPLOY.md: proteja a main, crie o ambiente production restrito à main e cadastre os dois Secrets da Cloudflare diretamente no GitHub. Não envie os valores pelo chat. Confira a primeira execução completa e me mostre o resultado no site. Não execute migrações nem apague dados para ativar a automação.

O [guia de configuração](docs/DEPLOY.md) explica os nomes exatos, as permissões, as verificações e como agir em caso de falha. Não é necessário colocar uma chave da OpenAI no repositório: o GPT-6 Astra é usado na sua ferramenta de trabalho; o deploy usa GitHub e Cloudflare.

## Onde está cada coisa

| Arquivo ou pasta | Para que serve |
| --- | --- |
| `index.html` | Menu inicial. |
| `rolo/`, `flores/`, `cartas/`, `pecas/` | Os quatro experimentos. |
| `assets/` | Fonte e estilos compartilhados. |
| `pecas/assets/v1/` | Imagens usadas pelas peças já publicadas. Precisam ser preservadas. |
| `pecas/src/` e `worker/` | Funcionamento da publicação e da galeria. |
| [AGENTS.md](AGENTS.md) | Regras de trabalho e segurança para os agentes. |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Configuração e manutenção da publicação automática. |
| [PUBLICACAO.md](PUBLICACAO.md) | Detalhes técnicos da galeria e registros de entregas anteriores. |

## Para quem for ajudar tecnicamente

O site usa HTML, CSS e JavaScript; os módulos de publicação usam TypeScript e esbuild. A hospedagem é Cloudflare Workers com arquivos estáticos; o banco existente é D1. Não há React nem etapa de lint configurada.

Com Node.js 22 e npm:

```sh
npm run check:safety
npm ci --ignore-scripts --no-audit --no-fund
npm run db:local
npm run dev
```

Abra `http://127.0.0.1:8787`. A migração acima é **local**. Não use `db:remote` para preparar uma prévia. Após editar TypeScript, reinicie `npm run dev` para reconstruir.

Para conferir a mudança, execute `npm run check:secrets` com Gitleaks 8.30.1 instalado, `npm run check`, `npm audit --audit-level=high` e `git diff --check`. O comando `check` não instala o scanner nem substitui a revisão visual. Nenhum desses comandos publica o site. O workflow instala a versão verificada do scanner automaticamente.

`dist/`, `dist-worker/` e `pecas/generated/` são saídas descartáveis; não guarde arquivos pessoais nelas e não as versione. `.wrangler/` contém estado local e não deve ser apagada por conveniência. Abrir o HTML pelo Finder não oferece a API da galeria.

As instruções, os filtros e o scanner reduzem riscos, mas não garantem que todo dado sensível será reconhecido. A revisão humana, as permissões e a proteção da `main` continuam necessárias.
