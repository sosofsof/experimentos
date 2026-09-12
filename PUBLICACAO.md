# Publicação de peças livres

Para a dona do site: comece pelo [README.md](README.md). Para agentes: siga [AGENTS.md](AGENTS.md). A configuração vigente de publicação automática está em [docs/DEPLOY.md](docs/DEPLOY.md). Os resultados de entregas abaixo são registros históricos; não comprovam a validação de uma alteração nova.

A galeria usa Cloudflare Workers Free + D1. O site continua em HTML/CSS e o editor existente continua em JavaScript. Os módulos novos são escritos em TypeScript e compilados com esbuild, sem framework adicional.

Endereço de produção: https://experimentos-pecas-livres.experimentos.workers.dev/pecas/

Galeria: https://experimentos-pecas-livres.experimentos.workers.dev/pecas/galeria.html

## Executar localmente

Requer Node.js 22 ou superior.

```sh
npm ci
npm run db:local
npm run dev
```

Abra `http://127.0.0.1:8787/pecas/` para criar e `http://127.0.0.1:8787/pecas/galeria.html` para a galeria. A base local é separada da produção. Se usar Live Server em outra porta local, mantenha o Worker em 8787: os módulos novos usam essa API automaticamente. Após editar TypeScript, encerre o servidor e execute `npm run dev` novamente para reconstruir os arquivos e atualizar o manifesto estático.

A abertura direta de arquivos pelo Finder não disponibiliza a API de publicação. O build gera `pecas/generated/` e `dist/`; esses diretórios não devem ser editados nem versionados.

## Publicar atualizações

O caminho padrão é uma proposta revisada para `main`, seguida do workflow **Validar e publicar**. Configure o ambiente e as proteções conforme [docs/DEPLOY.md](docs/DEPLOY.md). O deploy automático não executa migrações remotas.

Somente para publicação manual já autorizada, com Gitleaks 8.30.1 disponível e autenticação oficial da Cloudflare:

```sh
npm run deploy
npm run deploy:verify
```

`npm run db:remote` é manutenção separada: exige autorização específica e planejamento de preservação/recuperação. Não execute esse comando para cada atualização do site.

O Wrangler usa a autorização oficial da Cloudflare. Nenhuma credencial pertence ao repositório. O identificador de banco no `wrangler.jsonc` não é uma credencial. Os comandos de implantação não fazem commit ou push.

## Fluxo

1. O editor congela uma cópia da composição para a prévia.
2. A publicação é anônima, sem campos de título ou autoria; a confirmação de publicação pública é obrigatória.
3. O servidor valida versão, catálogo, números, tamanhos e limites de texto.
4. D1 salva a composição, data e hash do acesso de exclusão. As colunas legadas de título/autoria recebem valores vazios; a API pública não retorna esses campos, inclusive em peças anteriores.
5. A galeria reconstrói a imagem usando o catálogo v1. O JPG pode ser baixado em 3000 × 2000.
6. Um link público abre a peça em qualquer navegador. Um arquivo privado opcional permite ao autor retirar a peça em outro dispositivo.

A chave privada usa 32 bytes aleatórios. Ela fica no navegador do autor e, se ele escolher, no arquivo de acesso privado. O servidor armazena somente o hash. No link privado, a chave fica no fragmento, que não é enviado ao servidor; a página remove o fragmento da barra de endereço. O compartilhamento público nunca inclui a chave. Sem o navegador original ou o arquivo privado, não existe recuperação automática de autoria.

A retirada é lógica: a obra deixa imediatamente de aparecer na API pública; o registro é mantido no banco para administração e para impedir que uma tentativa antiga de publicação a recrie. Um administrador pode moderar pela tabela `artworks` no painel D1, preenchendo `deleted_at` com um timestamp em milissegundos. Não há painel de moderação próprio nesta versão.

Reenvios usam o mesmo identificador e chave. Uma tentativa sem confirmação é conservada em `sessionStorage`; ao abrir o formulário novamente, a prévia indica a recuperação do envio anterior. Se o armazenamento estiver indisponível, a proteção contra duplicação vale enquanto a página permanecer aberta.

## Limites e custo

- 200 elementos e 64 KiB no máximo por envio. Título e autoria enviados por clientes antigos são ignorados.
- Até 5 novas tentativas por minuto por IP, com o limitador do Worker.
- Até 20 novas tentativas por dia por IP, com contador atômico no D1. Reenvios de uma publicação já salva não consomem nova publicação.
- Um hash diário do IP é usado pelo contador; o endereço bruto não é gravado no banco. Contadores antigos são removidos durante novos envios.
- Teto conservador de 10.000 registros, incluindo retirados. Exige revisão administrativa ao atingir o teto.
- A galeria carrega 12 peças por página, com cursor estável e imagens próximas da área visível.
- Não foram ativados plano pago, R2, processamento de imagem pago ou domínio comprado. As cotas da conta gratuita ainda se aplicam; uma cota excedida pode interromper temporariamente o serviço.

Referências: https://developers.cloudflare.com/d1/platform/pricing/ e https://developers.cloudflare.com/workers/platform/limits/

## Catálogo e build

`pecas/assets/v1/` contém as 138 imagens e 3 fundos originais, extraídos sem recompressão, além do manifesto. Não substitua os arquivos v1: publicações antigas dependem deles. Uma alteração visual futura precisa de nova versão de catálogo e renderizador compatível.

O renderizador é compartilhado entre editor, prévia, galeria e exportação. O build separa também os recursos embutidos de Rolo/Flores somente dentro de `dist/`, para respeitar o limite de 25 MiB por arquivo da hospedagem. Os arquivos fonte desses dois experimentos permanecem intactos.

## Verificação

- `npm run typecheck`: TypeScript do navegador e do Worker em contextos separados.
- `npm run build`: bundles e arquivos estáticos, com verificação do limite de tamanho.
- `wrangler deploy --dry-run`: empacotamento e bindings.
- `git diff --check` e `node --check pecas/editor.js`.
- Não há comando de lint configurado nem arquivos de testes ou mocks adicionados.

Validação manual: criar uma composição com elementos sobrepostos e rotacionados, publicar, conferir a galeria e abrir o link em outro navegador; comparar a imagem, baixar o JPG, guardar o acesso privado, retirar a peça e reabrir o link. Verificar também celular, navegação por teclado, rede indisponível e reenvio após falha.

A miniatura específica em WhatsApp/redes sociais não está incluída; a peça é desenhada no navegador a partir da composição. O link público funciona normalmente.

## Entrega verificada em 12/09/2026

- PASS: TypeScript, build, dry-run, sintaxe do editor e `git diff --check`.
- PASS: as 138 peças, seus metadados e os 3 fundos são idênticos aos dados originais, sem recompressão.
- PASS local: confirmação obrigatória, rejeição de catálogo inválido, reenvio idempotente, preservação da composição, ausência de chave privada na resposta pública, origem externa rejeitada, exclusão sem chave bloqueada, exclusão autorizada e link removido retornando 404. O limitador retornou 429 ao exceder os envios.
- PASS navegador: publicação, prévia, página individual, download JPG e retirada; revisão visual do modal e da peça em 390 px, além do desktop.
- PASS produção: publicação pela interface, exibição da galeria, abertura em outro navegador sem acesso de exclusão, retirada pelo autor e confirmação via API de que o link retorna 404. A publicação usada nessa verificação foi retirada da galeria.
- PASS produção: respostas HTTP 200 do menu, editor, galeria, saúde da API e páginas Rolo/Flores/Cartas. O Rolo abriu com 9 de 9 imagens carregadas; Flores exibiu suas três flores e ferramentas.
- PASS proveniência: comparação SHA-256 do HTML do editor e dos três bundles publicados com o build local.
- NOT-RUN: lint (não configurado), aparelho físico e abertura do arquivo privado em outro dispositivo. Nenhum arquivo de teste ou mock foi criado.

Versão da primeira entrega: `a077f48e-518e-4237-81d4-e99b4f65fe4e`.


## Atualização: publicação anônima

Removidos os campos de título/autoria do formulário, dos tipos e das respostas públicas da API. A galeria exibe somente as composições, sem legendas de autoria, e a página individual usa uma identificação genérica acessível. Removida a frase de apresentação solicitada. Tentativas antigas recuperadas no navegador são normalizadas sem os campos antigos; o servidor ignora metadados extras de clientes legados. A exclusão privada continua disponível.

Arquivos alterados nesta atualização: `pecas/index.html`, `pecas/galeria.html`, `pecas/gallery.css`, `pecas/src/publication.ts`, `pecas/src/gallery.ts`, `pecas/src/api.ts`, `pecas/src/artwork.types.ts`, `worker/worker.ts`, `worker/validation.ts` e este documento. Não foi necessária migração do banco.

PASS: TypeScript, build, dry-run, publicação pelo formulário sem identificação, verificação HTTP local de publicação anônima e reenvio legado, exclusão privada, publicação anônima em produção e comparação dos arquivos online com o build. A peça de verificação foi retirada. Lint não configurado; nenhum teste ou mock foi criado.

Versão atual: `98093570-5124-41fb-bb4b-930db332d1c0`.
