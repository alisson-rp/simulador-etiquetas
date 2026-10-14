# Revisão de programação e arquitetura

Revisão realizada em 14/10/2026. Escopo: código-fonte da versão web, servidor HTTP, conversão de imagens, renderização ZPL, build e testes. Não inclui certificação de impressão nem auditoria de infraestrutura.

## Avaliação

A arquitetura de aplicação estática com processamento no navegador e servidor Node.js para arquivos é adequada ao simulador local. Não há requisito que justifique banco de dados, API de renderização, framework de interface ou microsserviços neste momento. O processamento local reduz dependências externas e mantém etiquetas e imagens no navegador.

## Problemas corrigidos

| Problema observado                                                                                    | Correção                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Fluxo de imagens removido da interface ainda tinha elementos ocultos e manipuladores ativos no código | Remoção do HTML e do JavaScript desse fluxo; importação e download concentrados em imagens da impressora |
| Conversão de pixels e dimensionamento misturados aos eventos de interface                             | Extração para `image-utils.js`, com funções testáveis sem DOM e adaptador Canvas                         |
| Exemplos e lógica de numeração aumentavam o arquivo principal                                         | Extração de `templates.js` e `editor.js`                                                                 |
| Código compactado manualmente dificultava manutenção                                                  | Prettier configurado e comandos de formatação/verificação                                                |
| Imagens maiores eram silenciosamente limitadas, alterando proporção em alguns casos                   | Limites explícitos e erros compreensíveis antes da criação do Canvas de conversão                        |
| Prévia podia tentar alocar Canvas de tamanho excessivo                                                | Limite de 16 milhões de pontos e validação de dimensões                                                  |
| Exportação GRF aceitava objetos inconsistentes                                                        | Validação de bytes e tamanho de linha antes da serialização                                              |
| Servidor não diferenciava método HTTP não suportado                                                   | Resposta 405 e cabeçalho Allow; suporte GET/HEAD verificado                                              |
| Porta inválida não tinha validação explícita                                                          | PORT validada entre 1 e 65535                                                                            |
| Conversão e transparência não tinham teste direto                                                     | Testes de pixels, proporção, transparência, limites e exportação/reimportação GRF                        |

## Responsabilidades

- `index.html` e `styles.css`: estrutura e apresentação.
- `app.js`: coordenação de eventos, estado da sessão, armazenamento, importação e exportação.
- `editor.js`: quebra visual e numeração das linhas.
- `image-utils.js`: dimensões, conversão RGBA para bitmap monocromático e adaptador Canvas.
- `zpl.js`: interpretação, validação e renderização dos comandos suportados; codificação GRF.
- `templates.js`: exemplos ZPL.
- `server.js`: entrega de arquivos permitidos, sem acesso arbitrário ao diretório.
- `build.js`: empacotamento QR e distribuição estática.

## Limites e próximas melhorias

Atualização do fluxo de imagens: os GRFs convertidos de PNG/PDF ficam no catálogo local; o editor usa referências `^XG` pelo nome. Os dados `~DG` são adicionados apenas na exportação. Definições válidas antigas no editor são migradas para o catálogo ao carregar o aplicativo.

O coordenador `app.js` ainda concentra persistência e eventos de arquivos. É aceitável para o escopo atual, mas poderá ser dividido quando surgirem novos recursos. Dados permanecem em localStorage, com limite de capacidade informado na interface; IndexedDB seria uma alternativa para catálogos maiores.

Há testes unitários e integração HTTP, mas não uma suíte automatizada de navegador. Importação via seletor, persistência após recarregar, zoom e alinhamento do editor ainda precisam de verificação visual. Arquivos grandes podem ocupar a thread principal mesmo com limites; um Web Worker é uma melhoria possível se o uso exigir.

O renderizador implementa um subconjunto ZPL, com fontes aproximadas e sem operação física RFID. Não deve ser apresentado como reprodução integral de impressora Zebra. A exportação não valida compatibilidade de firmware ou mídia.

O projeto ainda não tem licença própria definida, pipeline CI ou política de publicação. Nenhuma licença foi atribuída e nenhum deploy foi realizado durante esta revisão. Arquivos de build desktop existentes em `dist` são legados e não fazem parte do build web.
