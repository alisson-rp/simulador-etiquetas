# Studio ZPL Web

Editor e simulador de etiquetas ZPL no navegador, com prévia automática, QR Code e conversão de PNG/JPG para imagens GRF. Desenvolvido com JavaScript e Node.js, processa o conteúdo localmente, sem enviar etiquetas a um serviço externo de renderização.

## 🚀 Começando

Estas instruções permitem executar o projeto para uso local, desenvolvimento e testes.

### 📋 Pré-requisitos

- Node.js 22 ou superior, preferencialmente uma versão LTS suportada.
- npm, incluído com Node.js.
- Navegador moderno com Canvas, ResizeObserver e armazenamento local habilitado.

Confira o ambiente:

```sh
node --version
npm --version
```

### 🔧 Instalação

Abra um terminal na pasta do projeto e execute:

```sh
npm ci
npm run build
npm start
```

Acesse **[http://127.0.0.1:3000](http://127.0.0.1:3000)** e mantenha o servidor em execução enquanto usar o aplicativo. Para encerrá-lo, pressione `Ctrl+C` no terminal.

`npm ci` usa as versões registradas em `package-lock.json`. Se estiver alterando dependências, use `npm install` e mantenha o lockfile atualizado. O build gera a biblioteca QR local e a pasta `web-dist`.

Para escolher outra porta no PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

O servidor aceita portas de 1 a 65535 e fica restrito a `127.0.0.1`.

## 🏷️ Usando o simulador

### Código e prévia

A interface se adapta ao tamanho da tela: computadores exibem editor e prévia lado a lado, tablets recolhem as configurações e celulares usam abas para alternar editor e prévia. A etiqueta se ajusta automaticamente ao espaço disponível; o botão **Ajustar** restaura esse enquadramento após usar o zoom. O tamanho da tela não modifica milímetros, DPI, GRF ou o arquivo exportado.

1. Defina largura e altura em milímetros e a resolução em dpi.
2. Digite ou abra um arquivo `.zpl` pelo editor.
3. Acompanhe a prévia e os avisos de comandos não suportados.
4. Use **Salvar ZPL preenchido**, **Salvar modelo** ou **Exportar PNG**.

As dimensões atualizam `^PW` e `^LL`. Ao abrir um ZPL que contenha esses comandos, suas dimensões são interpretadas usando a resolução selecionada. A quebra automática do editor é visual: não altera o código exportado. O zoom modifica apenas a exibição.

Exemplo mínimo:

```zpl
^XA
^PW400
^LL160
^FO20,20^A0N,25,25^FDStudio ZPL^FS
^FO250,20^BQN,2,3^FDLA,123456^FS
^XZ
```

### PNG/JPG como imagem da impressora

1. Em **Imagens da impressora · ^XG**, informe `E:SSGFX000.GRF`.
2. Escolha a largura do logo e o contraste.
3. Clique **Importar PNG / GRF** e selecione uma imagem.
4. O aplicativo converte o logo para preto e branco e registra o GRF no catálogo local, sem inserir os dados da imagem no editor.

Depois da importação, alterações de largura e contraste atualizam o GRF armazenado e a prévia em tempo real. O editor contém apenas a chamada pelo nome, como `^XGLOGO.GRF,1,1`. **Baixar GRF** exporta a imagem separadamente. Ao salvar o ZPL, os dados `~DG` das imagens referenciadas são incluídos no arquivo exportado, sem alterar o editor. Também é possível importar um GRF/ZPL contendo `~DG`; definições válidas salvas anteriormente no editor são migradas para o catálogo ao abrir o aplicativo.

Para mostrar o logo, a etiqueta deve referenciar o mesmo nome:

```zpl
^FO45,31^XGE:SSGFX000.GRF,1,1^FS
```

O aplicativo associa a imagem localmente. A memória física da impressora só é atualizada quando o ZPL com `~DG` é enviado ao equipamento por uma ferramenta de impressão. O simulador não envia arquivos à impressora.

### PDF como imagem GRF

Na seção de imagens da impressora, clique **Importar PNG / PDF / GRF** e escolha um PDF de até 8 MB. A primeira página é convertida automaticamente; use **Página do PDF** para escolher outra. A página inteira é rasterizada e convertida para preto e branco, mantendo sua proporção. Ajuste a largura e o contraste e use **Baixar GRF** ou salve o ZPL.

A leitura usa PDF.js no navegador, com biblioteca, worker, fontes e recursos locais. PDFs protegidos por senha devem ser importados sem proteção. Links, ações e scripts do documento não são executados pela interface; o resultado é uma imagem. O PDF original não fica salvo: o raster da página convertida permanece com o logo. Após recarregar, reimporte o PDF para selecionar outra página. As dimensões físicas da página PDF não alteram as dimensões da etiqueta.

### Modelo de patrimônio e RFID

**Modelo patrimônio** carrega o exemplo com logo, texto, QR e RFID. Os campos **Referência** e **Código RFID** substituem `${referencia}` e `${codigoRFID}` na prévia e no ZPL preenchido; **Salvar modelo** mantém as variáveis.

`^RF` e `^RS` são reconhecidos e exibidos em um painel separado. Dados RFID não aparecem como texto na etiqueta. O modo hexadecimal valida pares de dígitos 0–9/A–F. Leitura e gravação físicas exigem impressora e etiquetas RFID compatíveis.

### Recursos e limitações

O catálogo consultável em **Referência de comandos ZPL** reconhece comandos gerais, de memória, rede, RFID e codificação legada, incluindo `^F8`/`^F16`. **Comandos deste código** informa o reconhecimento e a disponibilidade da prévia. Reconhecimento não significa reprodução integral: comandos de hardware não são executados e recursos visuais pendentes continuam sinalizados.

Fontes `^A@` e seleções `^Ax` são interpretadas com aproximação Arial, com rotação de texto. O arquivo `.FNT` indicado permanece referenciado no ZPL exportado. O QR aceita `LA`/`QA`/`MA`/`HA` e modos manuais numérico, alfanumérico e byte; entrada sem prefixo é aceita na prévia como `QA`, com informação no painel. Para imprimir, inclua o prefixo padrão no `^FD`. QR Kanji e símbolos divididos ainda não são renderizados.

Também são renderizados códigos EAN, UPC, Code 39/93, Interleaved 2 of 5, Codabar, MSI, Data Matrix, PDF417/MicroPDF417, Aztec e MaxiCode pela biblioteca bwip-js. Parâmetros avançados podem diferir da impressora. Configurações de prefixo/delimitador/unidade não são aplicadas e exibem aviso. O catálogo tem como referência os índices de comandos da Zebra, sem garantir cobertura de extensões de todo firmware.

| Recurso                | Suporte                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| Texto e posicionamento | `^FO`, `^FT`, `^LH`, `^A0`, `^CF`, `^FB`; fontes aproximadas por Arial         |
| Formas                 | Caixas, círculos e diagonais                                                   |
| Code 128               | Subconjunto B, caracteres ASCII imprimíveis                                    |
| QR Code                | Modelo 2, orientação N, modos automático e manual N/A/B, correção L/M/Q/H      |
| Imagens                | `^GFA`, `~DG` e `^XG`; hexadecimal ASCII simples e compressão RLE Zebra        |
| RFID                   | Reconhecimento e exibição dos dados; sem operação de hardware                  |
| Recursos avançados     | Z64/B64, GRF binário, rotação e outros códigos não são simulados integralmente |

Diferenças de codificação entre `^CI27` e `^CI28` não são reproduzidas integralmente. Confira fontes e acentuação na impressora. A prévia exibe uma etiqueta independentemente da quantidade `^PQ`; PNG contém apenas o conteúdo visual, sem RFID.

Arquivos de imagem importados têm limite de 8 MB; a conversão aceita até 2400 × 4000 pontos, e a prévia até 16 milhões de pontos. Reduza largura, dimensões ou resolução se a tela informar um limite excedido.

Código, campos e logos ficam no armazenamento local do navegador, incluindo o PNG original para redimensionamento. Se o armazenamento ficar cheio, a interface informa a falha. Exporte seu trabalho antes de limpar os dados do navegador.

## ⚙️ Executando os testes

```sh
npm test
```

Os testes usam `node:test`, sem framework adicional:

- `zpl.test.js`: QR, Code 128, RFID, linha de base, variáveis, imagens e compressão GRF.
- `image-utils.test.js`: proporção, transparência, pixels, limites e conversão/exportação/reimportação.
- `server.test.js`: entrega dos arquivos, bloqueio de caminhos não permitidos e métodos GET/HEAD/POST.

### 🔩 Integração e testes no navegador

O teste HTTP usa uma porta temporária local. Se o ambiente restringir conexões de loopback, execute os testes em um ambiente que as permita.

Ainda não há suíte automatizada de ponta a ponta no navegador. Para validar a interface, importe um logo, altere largura e contraste, confira o QR, exporte GRF/ZPL/PNG e recarregue a página para conferir a persistência.

### ⌨️ Estilo de código

```sh
npm run format:check
```

Para aplicar a formatação padronizada por Prettier:

```sh
npm run format
```

Essa verificação cuida da formatação; não substitui testes, análise semântica ou revisão de código.

## 🏗️ Arquitetura

O navegador concentra edição, renderização e conversão de imagens. O servidor Node.js entrega somente arquivos permitidos; não há banco de dados nem API de processamento.

```text
simulador-etiquetas/
├── index.html            # Estrutura e controles
├── styles.css            # Layout responsivo
├── app.js                # Eventos, estado, persistência e arquivos
├── editor.js             # Quebra visual e numeração
├── image-utils.js        # Conversão e dimensionamento de imagens
├── pdf-entry.js          # Leitura e renderização local de páginas PDF
├── zpl.js                # Interpretador, renderizador e GRF
├── commands.js           # Catálogo e classificação de comandos ZPL
├── templates.js          # Exemplos de etiquetas
├── server.js             # Servidor HTTP local
├── build.js              # Build e distribuição estática
├── qr-entry.js           # Entrada da biblioteca QR
├── barcode-entry.js      # Entrada da biblioteca de códigos de barras
├── *.test.js             # Testes unitários e de integração
├── docs/REVISAO.md       # Avaliação e melhorias da arquitetura
├── vendor/qr.js          # Biblioteca gerada pelo build
└── web-dist/             # Site estático gerado
```

Consulte [a revisão técnica](docs/REVISAO.md) para problemas corrigidos, decisões e melhorias futuras.

## 📦 Implantação

```sh
npm ci
npm run build
```

Sirva o conteúdo de **`web-dist`** em uma hospedagem estática que entregue HTML, CSS e JavaScript. A biblioteca QR já está incluída; não é necessário backend para usar o simulador publicado. Não foi realizado deploy automaticamente.

O servidor `npm start` é destinado ao uso local. Para publicação, use um servidor estático ou serviço de hospedagem adequado. `dist` contém artefatos da antiga versão desktop e não faz parte da distribuição web.

### GitHub Pages

O arquivo `.github/workflows/pages.yml` instala dependências, gera `web-dist`, executa os testes e publica o site. No repositório GitHub, configure **Settings → Pages → Source → GitHub Actions**. Em **Actions → Publicar Studio ZPL → Run workflow**, selecione `main` e execute a publicação inicial. Novos pushes para `main` publicam as atualizações automaticamente. A URL será informada na execução e em Settings → Pages. A publicação externa ainda precisa ser executada no seu repositório; o arquivo local apenas prepara esse processo.

## 🛠️ Construído com

- **Node.js**: servidor HTTP, build e testes.
- **JavaScript, HTML e CSS**: interface e lógica no navegador.
- **Canvas 2D**: prévia e conversão de imagens.
- **qrcode**: geração da matriz QR.
- **PDF.js**: leitura de PDFs, seleção de página e renderização para conversão GRF.
- **bwip-js**: renderização de códigos de barras adicionais.
- **esbuild**: empacotamento da biblioteca para o navegador.
- **Prettier**: padronização de estilo.

## 🖇️ Colaborando

Antes de enviar uma alteração:

1. Descreva o problema e a mudança proposta.
2. Preserve a separação entre interface, conversão de imagem e interpretação ZPL.
3. Acrescente testes para comportamentos novos ou defeitos corrigidos.
4. Execute testes, verificação de formatação e build.
5. Atualize a documentação quando mudar comandos suportados ou uso da interface.

Evite adicionar bibliotecas quando as APIs nativas atendem ao requisito. Não inclua `node_modules`, builds desktop ou arquivos gerados de distribuição em contribuições.

## 📌 Versão

Versão atual: **2.0.0**, conforme `package.json`. Use versionamento semântico em futuras alterações de compatibilidade e funcionalidades.

## ✒️ Autoria

Projeto desenvolvido de forma colaborativa com apoio do Codex. A identificação pública dos autores e mantenedores ainda deve ser definida pelo responsável pelo projeto.

## 📄 Licença

O projeto ainda não possui licença própria definida. As dependências mantêm suas respectivas licenças. Nenhuma autorização de distribuição adicional é declarada neste documento.

## 🎁 Agradecimentos e referências

- Estrutura do README inspirada no [modelo de Armstrong Lohãns](https://gist.github.com/lohhans/f8da0b147550df3f96914d3797e9fb89).
- [Documentação Zebra: QR Code `^BQ`](https://docs.zebra.com/content/tcm/us/en/printers/software/zpl-pg/zpl-commands/%5Ebq.html).
- [Documentação Zebra: imagem `^XG`](https://docs.zebra.com/content/tcm/us/en/printers/software/zpl-pg/zpl-commands/%5Exg.html).
- [Guia de programação RFID Zebra](https://cpws.zebra.com/cpws/docs/ait/KA_files/8973/rfid3-pg-en.pdf).
