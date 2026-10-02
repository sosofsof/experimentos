# Organização do código

O site tem quatro experimentos. O navegador recebe HTML para a estrutura, CSS para a aparência e JavaScript para as interações. TypeScript é convertido para JavaScript pelo esbuild. Node.js é usado apenas na preparação dos arquivos.

| Local                                                            | Responsabilidade                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `index.html`, `assets/home.css`                                  | Menu inicial e sua aparência.                                                       |
| `flores/index.html`, `flores/style.css`, `flores/flores.js`      | Estrutura, aparência e regras das flores.                                           |
| `cartas/`                                                        | Seleção das cartas, animações e oração.                                             |
| `rolo/index.html`, `rolo/style.css`                              | Estrutura e estilos, com a ordem original das regras preservada.                    |
| `rolo/app.ts`, `rolo/embroideries.json`                          | Montagem do rolo, dimensões originais e carregamento dos bordados próximos da tela. |
| `rolo/scroll-journey.ts`, `cord-reveal.ts`, `final-switch.ts`    | Rolagem lateral, continuação vertical, cordão e interruptor.                        |
| `pecas/index.html`, `layout.css`, `editor.js`                    | Estrutura, estilos, composição e gestos do editor.                                  |
| `pecas/src/render.ts`, `catalog.ts`, `jpg.ts`                    | Desenho, consulta por identificador e download de JPG compartilhado.                |
| `pecas/src/publication.ts`, `gallery.ts`, `api.ts`               | Publicação e galeria no navegador.                                                  |
| `worker/worker.ts`                                               | Encaminhamento das requisições e tratamento de erros e origens.                     |
| `worker/artworks.ts`, `types.ts`, `response.ts`, `validation.ts` | Operações da galeria, tipos, respostas e validação.                                 |
| `scripts/build.mjs`, `version-assets.mjs`                        | Preparação, redução dos arquivos e versões automáticas para cache.                  |

## Backend

O backend já existe: é um Cloudflare Worker que atende `/api/health` e `/api/artworks`. A galeria usa o banco D1. O navegador publica uma receita da composição; o JPG é produzido no navegador. A retirada exige o acesso privado recebido na publicação.

A separação dos módulos mantém as consultas SQL, os limites de publicação, a paginação, a validação e o formato das receitas. Não exige alteração de esquema ou migração. Os arquivos de imagens do catálogo v1 permanecem imutáveis.

## Checklist de manutenção

- [x] Separar estilos da página inicial, das Flores, do Rolo e do editor.
- [x] Retirar imagens em base64 dos arquivos de código, preservando seus bytes.
- [x] Substituir o React compilado embutido do Rolo por um módulo TypeScript.
- [x] Carregar bordados conforme se aproximam da área visível e montar a continuação quando necessária.
- [x] Carregar somente o fundo escolhido no editor e agrupar redesenhos em quadros de animação.
- [x] Compartilhar o download de JPG e consultar os elementos por identificador em um Map.
- [x] Separar rotas, operações, respostas e tipos do backend.
- [x] Reduzir JavaScript e CSS apenas na saída do build.
- [x] Gerar versões de arquivos a partir do conteúdo, evitando trocas manuais de parâmetros.
- [x] Adicionar formatação consistente e sua verificação.
- [ ] Medir o carregamento em produção após aprovação da publicação.
- [ ] Conferir os gestos em Safari e em dispositivos físicos.

Para continuar a manutenção, edite os arquivos fonte. Não edite `dist/`, `dist-worker/` ou `pecas/generated/`. Rode `npm run format`, os validadores descritos no README e confira manualmente os quatro experimentos. Um build verde não confirma fidelidade visual nem a integração com o banco de produção.

O catálogo ainda possui as representações existentes em JSON e JavaScript; sua unificação e a divisão completa do controlador de gestos do editor são etapas pendentes. Não foi realizada limpeza de versões antigas, imagens originais ou dados da galeria.
