const $ = (id) => document.getElementById(id);
const { example, patrimonio } = StudioTemplates;
let zoom = 1,
  timer,
  graphics = {},
  lastWarnings = [],
  graphicSources = {};
$('grfFile').accept = '.png,.jpg,.jpeg,.webp,.bmp,.pdf,.grf,.zpl,.txt';
const pdfImporter = new StudioPDF();
let pdfGraphicName = '';
const directDownload = document.createElement('button');
directDownload.className = 'wide';
directDownload.textContent = 'Baixar GRF';
directDownload.onclick = () => {
  const name = ZPL.graphicName($('graphicName').value);
  if (!graphics[name]) {
    $('graphicImportStatus').textContent = 'Importe uma imagem primeiro.';
    return;
  }
  download(
    new Blob([ZPL.serializeGraphic(name, graphics[name])], {
      type: 'text/plain',
    }),
    name.split(':').pop(),
  );
};
$('importGRF').after(directDownload);
const editorView = StudioEditor.attach($('code'), $('numbers'));
try {
  const saved = JSON.parse(localStorage.getItem('studio-zpl-web') || 'null');
  $('code').value = saved?.code || example;
  for (const key of [
    'width',
    'height',
    'dpi',
    'referencia',
    'codigoRFID',
    'printerImageWidth',
    'printerThreshold',
  ])
    if (saved?.[key]) $(key).value = saved[key];
  for (const [name, graphic] of Object.entries(saved?.graphics || {}))
    graphics[name] = { ...graphic, bytes: Uint8Array.from(graphic.bytes) };
} catch {
  $('code').value = example;
}
// Migrate previously embedded, valid GRF definitions into the local catalog.
const embeddedGraphics = ZPL.readGraphics($('code').value).graphics;
for (const [name, graphic] of Object.entries(embeddedGraphics))
  graphics[name] = { ...graphics[name], ...graphic };
$('code').value = ZPL.removeGraphicDefinitions(
  $('code').value,
  Object.keys(embeddedGraphics),
);
function dimensions() {
  const dpi = Number($('dpi').value);
  return {
    w: Math.round(
      (Math.min(300, Math.max(10, +$('width').value || 100)) * dpi) / 25.4,
    ),
    h: Math.round(
      (Math.min(500, Math.max(10, +$('height').value || 60)) * dpi) / 25.4,
    ),
    dpi,
  };
}
function filledSource() {
  return ZPL.substitute($('code').value, {
    referencia: $('referencia').value,
    codigoRFID: $('codigoRFID').value,
  });
}
function definitions(source) {
  const embedded = ZPL.readGraphics(source).graphics;
  const names = [...source.matchAll(/\^XG([^,\^~\r\n]+)/gi)].map((match) =>
    ZPL.graphicName(match[1]),
  );
  return [...new Set(names)]
    .filter((name) => graphics[name] && !embedded[name])
    .map((name) => {
      return ZPL.serializeGraphic(name, graphics[name]);
    })
    .join('');
}
function update() {
  const { w, h, dpi } = dimensions(),
    rfid = [],
    commands = new Map();
  let warnings = [];
  try {
    warnings = ZPL.render($('canvas').getContext('2d'), filledSource(), w, h, {
      graphics,
      onRFID: (field) => rfid.push(field),
      onCommand: (info) => commands.set(info.command, info),
    });
  } catch (error) {
    warnings = [error.message];
  }
  if (/[\^~]/.test($('referencia').value + $('codigoRFID').value))
    warnings.push(
      'Os dados do modelo não devem conter ^ ou ~ (delimitadores ZPL).',
    );
  if (/\$\{\w+\}/.test(filledSource()))
    warnings.push('Há variáveis sem valor no modelo.');
  lastWarnings = warnings;
  $('commandInfo').replaceChildren(
    ...[...commands.values()].map((info) => {
      const row = document.createElement('p');
      row.textContent =
        info.command +
        ' · ' +
        (info.rendered
          ? 'Prévia disponível'
          : info.category
            ? 'Reconhecido'
            : 'Não reconhecido') +
        ' · ' +
        (info.description || 'Verifique o comando.');
      return row;
    }),
  );
  fitPreview();
  $('sizeInfo').textContent =
    `${$('width').value} × ${$('height').value} mm · ${w} × ${h} pontos`;
  $('status').textContent = warnings.length
    ? 'Confira os avisos'
    : 'Prévia pronta';
  $('warnings').textContent = warnings.join(' · ');
  $('warnings').hidden = !warnings.length;
  const payloads = rfid.filter((field) => field.value !== undefined);
  $('rfidInfo').hidden = !rfid.length;
  $('rfidInfo').textContent =
    'RFID · ' +
    (payloads
      .map(
        (field) =>
          `${field.operation === 'W' ? 'Gravação' : field.operation === 'R' ? 'Leitura' : 'Operação ' + field.operation} ${field.format} · ${field.value} · ^RS${field.settings}`,
      )
      .join(' | ') ||
      'Configuração ^RS' + (rfid[rfid.length - 1]?.settings || '')) +
    '. Apenas prévia dos dados; a gravação requer impressora RFID.';
  const lines = $('code').value.split('\n').length;
  editorView.refresh();
  $('lineCount').textContent = lines + ' linhas';
  try {
    localStorage.setItem(
      'studio-zpl-web',
      JSON.stringify({
        code: $('code').value,
        ...Object.fromEntries(
          [
            'width',
            'height',
            'dpi',
            'referencia',
            'codigoRFID',
            'printerImageWidth',
            'printerThreshold',
          ].map((key) => [key, $(key).value]),
        ),
        graphics: Object.fromEntries(
          Object.entries(graphics).map(([name, g]) => [
            name,
            { ...g, bytes: Array.from(g.bytes) },
          ]),
        ),
      }),
    );
  } catch {
    $('status').textContent += ' · armazenamento local cheio';
  }
  refreshGraphics();
}
function refreshGraphics() {
  const list = $('graphicList');
  list.replaceChildren();
  for (const name of Object.keys(graphics)) {
    const row = document.createElement('div'),
      label = document.createElement('span'),
      remove = document.createElement('button');
    label.textContent = name;
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remover ' + name);
    remove.onclick = () => {
      delete graphics[name];
      delete graphicSources[name];
      $('code').value = $('code').value.replace(/~DG[^\^~]*/gi, (match) =>
        ZPL.graphicName(match.slice(3).split(',')[0]) === name ? '' : match,
      );
      update();
    };
    row.append(label, remove);
    list.append(row);
  }
}
function insert(value) {
  const code = $('code').value,
    end = code.lastIndexOf('^XZ');
  $('code').value =
    end >= 0
      ? code.slice(0, end) + value + '\n' + code.slice(end)
      : code + '\n' + value;
  update();
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function saveSource(template = false) {
  update();
  if (
    !template &&
    lastWarnings.length &&
    !confirm('Há avisos na prévia. Deseja salvar mesmo assim?')
  )
    return;
  const source = template ? $('code').value : filledSource();
  const content = template
    ? definitions(source) + source
    : (source.match(/\^XA[\s\S]*?\^XZ/gi) || []).join('\n');
  download(
    new Blob([content], {
      type: 'text/plain;charset=utf-8',
    }),
    template ? 'modelo.zpl' : 'etiqueta.txt',
  );
}
$('code').addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(update, 180);
});
$('code').addEventListener('scroll', () => {
  $('numbers').scrollTop = $('code').scrollTop;
});
for (const id of ['referencia', 'codigoRFID'])
  $(id).addEventListener('input', update);
for (const id of ['width', 'height', 'dpi'])
  $(id).addEventListener('change', () => {
    const { w, h } = dimensions();
    let code = $('code').value;
    code = /\^PW\d+/.test(code)
      ? code.replace(/\^PW\d+/g, '^PW' + w)
      : code.replace('^XA', '^XA\n^PW' + w);
    code = /\^LL\d+/.test(code)
      ? code.replace(/\^LL\d+/g, '^LL' + h)
      : code.replace('^XA', '^XA\n^LL' + h);
    $('code').value = code;
    update();
  });
$('zoomIn').onclick = () => {
  zoom = Math.min(3, zoom + 0.25);
  fitPreview();
};
$('zoomOut').onclick = () => {
  zoom = Math.max(0.25, zoom - 0.25);
  fitPreview();
};
function fitPreview() {
  const area = document.querySelector('.preview-area');
  if (!area.clientWidth || !area.clientHeight) return;
  const style = getComputedStyle(area),
    { w, h, dpi } = dimensions();
  const availableWidth =
    area.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const availableHeight =
    area.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  const baseWidth = (w * 96) / dpi,
    baseHeight = (h * 96) / dpi;
  const scale =
    Math.max(
      0.01,
      Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 2),
    ) * zoom;
  $('canvas').style.width = baseWidth * scale + 'px';
  $('canvas').style.height = baseHeight * scale + 'px';
  $('zoomLabel').textContent = Math.round(scale * 100) + '%';
}
$('fitPreview').onclick = () => {
  zoom = 1;
  fitPreview();
};
new ResizeObserver(fitPreview).observe(document.querySelector('.preview-area'));
const compactLayout = matchMedia('(max-width: 1100px)');
function adaptSettings() {
  $('settingsPanel').open = !compactLayout.matches;
  fitPreview();
}
compactLayout.addEventListener('change', adaptSettings);
adaptSettings();
function selectView(view) {
  document.querySelector('.workspace').dataset.view = view;
  $('editorTab').setAttribute('aria-pressed', String(view === 'editor'));
  $('previewTab').setAttribute('aria-pressed', String(view === 'preview'));
  requestAnimationFrame(() => {
    fitPreview();
    editorView.refresh();
  });
}
$('editorTab').onclick = () => selectView('editor');
$('previewTab').onclick = () => selectView('preview');
selectView('editor');
$('text').onclick = () => insert('^FO40,40^A0N,30,24^FDNovo texto^FS');
$('box').onclick = () => insert('^FO40,40^GB200,100,2^FS');
$('barcode').onclick = () => insert('^FO40,40^BY2^BCN,80,Y,N,N^FD123456789^FS');
$('qr').onclick = () => insert('^FO40,40^BQN,2,5^FDLA,${referencia}^FS');
function loadExample(source, w, h) {
  if (confirm('Substituir o código atual pelo modelo?')) {
    $('code').value = source;
    $('width').value = w;
    $('height').value = h;
    $('dpi').value = 203;
    update();
  }
}
$('example').onclick = () => loadExample(example, 100, 60);
$('patrimonio').onclick = () => loadExample(patrimonio, 60, 25);
$('save').onclick = () => saveSource();
$('saveTemplate').onclick = () => saveSource(true);
$('export').onclick = () => {
  update();
  $('canvas').toBlob((blob) => {
    if (blob) download(blob, 'etiqueta.png');
  });
};
$('open').onclick = () => $('file').click();
$('file').onchange = async () => {
  const file = $('file').files[0];
  if (file) {
    $('code').value = await file.text();
    const pw = $('code').value.match(/\^PW(\d+)/),
      ll = $('code').value.match(/\^LL(\d+)/);
    if (pw) $('width').value = ((+pw[1] * 25.4) / +$('dpi').value).toFixed(1);
    if (ll) $('height').value = ((+ll[1] * 25.4) / +$('dpi').value).toFixed(1);
    update();
  }
  $('file').value = '';
};
$('importGRF').onclick = () => $('grfFile').click();
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error('Não foi possível abrir a imagem.'));
    };
    img.src = url;
  });
}
$('grfFile').onchange = async () => {
  const file = $('grfFile').files[0];
  if (!file) return;
  const button = $('importGRF');
  button.disabled = true;
  $('graphicImportStatus').textContent = 'Importando imagem…';
  try {
    if (file.size > 8 * 1024 * 1024)
      throw Error('Arquivo muito grande. Importe um arquivo de até 8 MB.');
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      const name = ZPL.graphicName($('graphicName').value);
      if (!/^[A-Z]:[A-Z0-9_.-]+\.GRF$/.test(name))
        throw Error('Informe um nome como E:SSGFX000.GRF.');
      $('pdfOptions').hidden = true;
      const pages = await pdfImporter.open(file);
      pdfGraphicName = name;
      $('pdfPage').replaceChildren();
      for (let page = 1; page <= pages; page++) {
        const option = document.createElement('option');
        option.value = page;
        option.textContent = 'Página ' + page;
        $('pdfPage').append(option);
      }
      $('pdfFileInfo').textContent = file.name + ' · ' + pages + ' página(s)';
      $('pdfOptions').hidden = false;
      await convertPDFPage();
    } else if (
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|bmp)$/i.test(file.name)
    ) {
      const name = ZPL.graphicName($('graphicName').value);
      if (!/^[A-Z]:[A-Z0-9_.-]+\.GRF$/.test(name))
        throw Error('Informe um nome como E:SSGFX000.GRF.');
      const image = await loadImage(file);
      await pdfImporter.close();
      $('pdfOptions').hidden = true;
      const graphic = imageGraphic(
        image,
        +$('printerImageWidth').value || 15,
        +$('printerThreshold').value,
      );
      // Round-trip through the same GRF format used by the printer and export.
      const converted = ZPL.readGraphics(ZPL.serializeGraphic(name, graphic));
      graphics[name] = converted.graphics[name];
      graphicSources[name] = image;
      graphics[name].sourceDataURL = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      syncGraphicCode(name);
      $('graphicImportStatus').textContent =
        `PNG/JPG convertido e associado a ${name} (${graphic.width} × ${graphic.height} pontos).`;
    } else {
      const parsed = ZPL.readGraphics(await file.text());
      if (parsed.errors.length) throw Error(parsed.errors.join('\n'));
      if (!Object.keys(parsed.graphics).length)
        throw Error(
          'Escolha um PNG/JPG, PDF ou um arquivo GRF com o comando ~DG.',
        );
      await pdfImporter.close();
      $('pdfOptions').hidden = true;
      Object.assign(graphics, parsed.graphics);
      for (const name of Object.keys(parsed.graphics)) {
        delete graphicSources[name];
        syncGraphicCode(name);
      }
      $('graphicImportStatus').textContent = 'Imagem GRF importada.';
    }
    update();
  } catch (error) {
    $('graphicImportStatus').textContent = error.message;
  } finally {
    button.disabled = false;
    $('grfFile').value = '';
  }
};
async function convertPDFPage() {
  const page = +$('pdfPage').value;
  $('graphicImportStatus').textContent =
    'Convertendo página ' + page + ' do PDF…';
  try {
    const canvas = await pdfImporter.render(page);
    if (!canvas) return;
    const graphic = imageGraphic(
      canvas,
      +$('printerImageWidth').value || 15,
      +$('printerThreshold').value,
    );
    graphics[pdfGraphicName] = {
      ...graphic,
      sourceDataURL: canvas.toDataURL('image/png'),
    };
    graphicSources[pdfGraphicName] = canvas;
    syncGraphicCode(pdfGraphicName);
    update();
    $('graphicImportStatus').textContent =
      `Página ${page} convertida para ${pdfGraphicName} (${graphic.width} × ${graphic.height} pontos).`;
  } catch (error) {
    $('graphicImportStatus').textContent = error.message;
  }
}
$('pdfPage').addEventListener('change', convertPDFPage);
function syncGraphicCode(name) {
  $('code').value = ZPL.removeGraphicDefinitions($('code').value, [name]);
}
let logoRevision = 0;
async function resizePrinterLogo() {
  const revision = ++logoRevision,
    name = ZPL.graphicName($('graphicName').value);
  const embedded = ZPL.readGraphics($('code').value).graphics[name];
  const graphic = embedded
    ? { ...graphics[name], ...embedded }
    : graphics[name];
  if (!graphic) return;
  const width = +$('printerImageWidth').value;
  if (width < 1 || width > 300) return;
  try {
    let source = graphicSources[name];
    if (!source) {
      if (graphic.sourceDataURL) {
        const img = new Image();
        img.src = graphic.sourceDataURL;
        await img.decode();
        source = img;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = graphic.width;
        canvas.height = graphic.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        for (let i = 0; i < graphic.bytes.length; i++)
          for (let b = 0; b < 8; b++)
            if (graphic.bytes[i] & (128 >> b))
              ctx.fillRect(
                (i % graphic.rowBytes) * 8 + b,
                Math.floor(i / graphic.rowBytes),
                1,
                1,
              );
        source = canvas;
      }
      if (revision !== logoRevision) return;
      graphicSources[name] = source;
    }
    if (revision !== logoRevision) return;
    graphics[name] = {
      ...imageGraphic(source, width, +$('printerThreshold').value),
      sourceDataURL: graphic.sourceDataURL,
    };
    syncGraphicCode(name);
    update();
    $('graphicImportStatus').textContent =
      `${name} atualizado · ${width} mm · ${graphics[name].width} × ${graphics[name].height} pontos.`;
  } catch (error) {
    $('graphicImportStatus').textContent = error.message;
  }
}
for (const id of ['printerImageWidth', 'printerThreshold'])
  $(id).addEventListener('input', resizePrinterLogo);
$('dpi').addEventListener('change', resizePrinterLogo);
function imageGraphic(source, widthMM, threshold) {
  return StudioImages.fromImage(source, widthMM, +$('dpi').value, threshold);
}
function refreshCommandCatalog() {
  const query = $('commandSearch').value.trim().toUpperCase();
  $('commandCatalog').replaceChildren(
    ...Object.keys(StudioCommands.catalog)
      .filter((command) => command.includes(query))
      .map((command) => {
        const info = StudioCommands.lookup(command),
          row = document.createElement('p');
        row.textContent = command + ' · ' + info.description;
        return row;
      }),
  );
}
$('commandSearch').addEventListener('input', refreshCommandCatalog);
refreshCommandCatalog();
update();
