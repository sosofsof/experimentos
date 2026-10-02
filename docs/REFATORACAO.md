# Revisão da refatoração

Esta proposta está na branch `feat/organizar-codigo`. Não foi integrada à `main` nem publicada. As verificações abaixo foram executadas nesta alteração, em 02/10/2026.

## Checklist

| Item                                          | Resultado | Evidência                                                                                                                                                                                                |
| --------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separar HTML, estilos e lógica                | PASS      | Home, Flores, Rolo e layout de Peças possuem estilos externos; Flores tem seu próprio JavaScript; Rolo usa `app.ts`. Cartas já tinha módulos externos.                                                   |
| Organizar o editor                            | PASS      | Estado, geometria, gestos, catálogo, desenho da moldura e download de JPG têm módulos próprios.                                                                                                          |
| Organizar o backend                           | PASS      | Rotas, operações da galeria, respostas, tipos e validação estão separados.                                                                                                                               |
| Remover duplicação do catálogo                | PASS      | JSON é a fonte única; o build produz o JavaScript público. O instalador de retalhos foi adaptado, sem executá-lo.                                                                                        |
| Evitar trabalho no carregamento inicial       | PASS      | Rolo carrega bordados próximos da tela e monta a continuação quando necessária. O editor carrega o fundo escolhido. A oração permanece sob demanda.                                                      |
| Reduzir trabalho durante movimentos           | PASS      | Redesenhos são agrupados por quadro; a moldura fica em cache; a busca dos elementos usa `Map`.                                                                                                           |
| Reduzir arquivos publicados e versionar cache | PASS      | esbuild reduz JS/CSS na saída; versões são calculadas a partir do conteúdo.                                                                                                                              |
| Preservar imagens e receitas antigas          | PASS      | Os 29 assets extraídos têm bytes idênticos. Os 167 elementos e fundos correspondem ao catálogo público anterior. Imagens históricas e migrações não foram alteradas.                                     |
| Conferir arquivos inválidos                   | PASS      | 232 arquivos decodificados: 69 PNG, 152 WebP, 5 JPG/JPEG, 5 SVG e 1 WOFF2. Nenhum inválido.                                                                                                              |
| Conferir referências                          | PASS      | 260 referências de HTML, CSS e imagens em JavaScript; nenhum destino ausente.                                                                                                                            |
| Conferir o conteúdo enviado ao GitHub         | PASS      | Hashes dos 318 arquivos da proposta conferidos contra os arquivos locais validados.                                                                                                                      |
| Segurança, formatação, tipos e build          | PASS      | `check:safety`, Gitleaks 8.30.1, sintaxe, Prettier, TypeScript, build, dry-run e `git diff --check`. Auditoria npm: zero vulnerabilidades.                                                               |
| Conferir interações em telas distintas        | PASS      | Chromium: 1440×900, 390×844 e 820×1180; abertura e continuação do Rolo, teclado no editor, duplicação/devolução, alça com mouse, pinça/rotação touch e JPG 3000×2000. Sem erros JS ou imagens quebradas. |
| Conferir a API                                | PASS      | 13 verificações no Worker e D1 locais: saúde, listagem, validação, origem, preflight, publicação, repetição, detalhe e retirada. Nenhum acesso ao banco de produção.                                     |
| Safari e dispositivos físicos                 | NOT-RUN   | As telas e o touch foram emulados em Chromium.                                                                                                                                                           |
| Medir e conferir produção                     | NOT-RUN   | Depende de aprovação para integrar e publicar.                                                                                                                                                           |

## Carregamento inicial

Medição local dos recursos transferidos, sem incluir o HTML, usando navegador sem cache. Não representa uma medição do tempo de carregamento em produção.

| Página e tela     | Antes    | Depois   | Redução aproximada                                             |
| ----------------- | -------- | -------- | -------------------------------------------------------------- |
| Rolo              | 40,62 MB | 2,86 MB  | 93%                                                            |
| Peças, computador | 25,33 MB | 14,96 MB | 41%                                                            |
| Peças, celular    | 20,06 MB | 9,70 MB  | 52%                                                            |
| Cartas            | 1,00 MB  | 0,38 MB  | 62%                                                            |
| Flores            | 4,71 MB  | 4,72 MB  | Volume preservado; arquivos externos reutilizáveis pelo cache. |

## Decisões de preservação

Mantive a ordem das regras CSS e os ajustes responsivos existentes, incluindo `!important` quando já usado. Retirar essas prioridades em massa pode alterar o visual; a separação em arquivos não exige isso. A comparação das capturas iniciais das cinco páginas coincidiu nos três tamanhos de tela. A abertura do Rolo mantém a animação de 1,85 segundo, que deve ser comparada depois de terminar.

O arquivo antigo de estilos da rolagem foi incorporado ao novo `rolo/style.css`; a representação JavaScript do catálogo passou a ser gerada. Seus históricos continuam disponíveis no Git. Não removi versões de imagens, conteúdo artístico ou dados da galeria.

Antes de publicar, confira o resultado visual da proposta. Depois da aprovação, acompanhe o workflow e confira o site, a galeria e os gestos no navegador usado no dispositivo real.
