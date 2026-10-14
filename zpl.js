(function (root) {
  const patterns =
    '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(
      ' ',
    );
  const tokens = (source) =>
    source.match(/[\^~](?:F16|F8|A[@A-Z0-9]|[A-Z][A-Z0-9])[^\^~]*/gi) || [];
  function splitCommand(command) {
    const match = command.match(
      /^([\^~])(F16|F8|A[@A-Z0-9]|[A-Z][A-Z0-9])([\s\S]*)$/i,
    );
    return {
      op: match[2].toUpperCase(),
      arg: match[3].replace(/[\r\n]+$/, ''),
      full: match[1] + match[2].toUpperCase(),
    };
  }
  function qrInput(value) {
    if (/^D\d{4}[\da-f]{2},/i.test(value))
      throw Error(
        'QR dividido em vários símbolos reconhecido, mas ainda não renderizado.',
      );
    const match = value.match(/^([HQLM])([AM]),([\s\S]*)$/);
    if (!match) return { text: value, level: 'Q', generic: true };
    if (match[2] === 'A') return { text: match[3], level: match[1] };
    const body = match[3],
      mode = body[0];
    if (mode === 'N') {
      if (!/^N\d+$/.test(body))
        throw Error('QR manual numérico: use apenas dígitos após N.');
      return {
        text: [{ data: body.slice(1), mode: 'numeric' }],
        level: match[1],
      };
    }
    if (mode === 'A')
      return {
        text: [{ data: body.slice(1), mode: 'alphanumeric' }],
        level: match[1],
      };
    if (mode === 'B') {
      const bytes = body.match(/^B(\d{4})([\s\S]*)$/);
      if (!bytes)
        throw Error(
          'QR manual: use B e quatro dígitos para o tamanho dos dados.',
        );
      const data = new TextEncoder().encode(bytes[2]);
      if (data.length !== +bytes[1])
        throw Error(
          'QR manual: quantidade de bytes diferente do tamanho B' +
            bytes[1] +
            '.',
        );
      return { text: [{ data, mode: 'byte' }], level: match[1] };
    }
    throw Error('QR manual: modo Kanji ou segmentação ainda não simulados.');
  }
  const graphicName = (name) =>
    name
      .trim()
      .toUpperCase()
      .replace(/^(?![A-Z]:)/, 'R:')
      .replace(/(?<!\.GRF)$/, '.GRF');
  function barcodeValues(value) {
    if (!/^[\x20-\x7e]*$/.test(value))
      throw Error('Code 128: use caracteres ASCII imprimíveis.');
    const values = [104, ...Array.from(value, (c) => c.charCodeAt(0) - 32)];
    values.push(
      values.reduce((sum, v, i) => sum + (i === 0 ? v : v * i), 0) % 103,
      106,
    );
    return values;
  }
  function substitute(source, variables) {
    return source.replace(/\$\{([\w]+)\}/g, (match, key) =>
      Object.hasOwn(variables, key) ? String(variables[key]) : match,
    );
  }
  function decodeGraphic(data, rowBytes, totalBytes) {
    if (
      !Number.isInteger(rowBytes) ||
      rowBytes < 1 ||
      !Number.isInteger(totalBytes) ||
      totalBytes < 1 ||
      totalBytes % rowBytes ||
      totalBytes > 4e6
    )
      throw Error('Dimensões da imagem GRF inválidas.');
    const bytes = new Uint8Array(totalBytes),
      rowLength = rowBytes * 2;
    let nibble = 0,
      repeat = 0;
    function emit(value, count = 1) {
      if (nibble + count > totalBytes * 2)
        throw Error('Dados GRF excedem o tamanho declarado.');
      for (let i = 0; i < count; i++, nibble++)
        bytes[nibble >> 1] |= value << (nibble % 2 ? 0 : 4);
    }
    for (const char of data.replace(/\s/g, '')) {
      if (/^[0-9A-Fa-f]$/.test(char)) {
        emit(parseInt(char, 16), repeat || 1);
        repeat = 0;
      } else if (char >= 'G' && char <= 'Y') repeat += char.charCodeAt(0) - 70;
      else if (char >= 'g' && char <= 'z')
        repeat += (char.charCodeAt(0) - 102) * 20;
      else if (char === ',' || char === '!') {
        emit(char === '!' ? 15 : 0, rowLength - (nibble % rowLength));
        repeat = 0;
      } else if (char === ':') {
        if (nibble < rowLength || nibble % rowLength)
          throw Error('Repetição de linha GRF inválida.');
        const previous = bytes.slice(nibble / 2 - rowBytes, nibble / 2);
        for (const byte of previous) {
          emit(byte >> 4);
          emit(byte & 15);
        }
      } else
        throw Error(
          'Compressão GRF não suportada (Z64/B64) ou dados inválidos.',
        );
    }
    if (nibble !== totalBytes * 2) throw Error('Dados GRF incompletos.');
    return {
      bytes,
      rowBytes,
      width: rowBytes * 8,
      height: totalBytes / rowBytes,
    };
  }
  function serializeGraphic(name, graphic) {
    if (
      !(graphic.bytes instanceof Uint8Array) ||
      !Number.isInteger(graphic.rowBytes) ||
      graphic.rowBytes < 1 ||
      !graphic.bytes.length ||
      graphic.bytes.length % graphic.rowBytes
    )
      throw Error('Dados GRF inválidos para exportação.');
    const normalized = graphicName(name);
    if (!/^[A-Z]:[A-Z0-9_.-]+\.GRF$/.test(normalized))
      throw Error('Informe um nome como E:SSGFX000.GRF.');
    const hex = Array.from(graphic.bytes, (b) =>
      b.toString(16).padStart(2, '0'),
    )
      .join('')
      .toUpperCase();
    return `~DG${normalized},${graphic.bytes.length},${graphic.rowBytes},${hex}\n`;
  }
  function readGraphics(source) {
    const graphics = {},
      errors = [];
    for (const command of tokens(source)) {
      if (command.slice(0, 3).toUpperCase() !== '~DG') continue;
      const p = command.slice(3).split(','),
        name = graphicName(p[0]);
      try {
        graphics[name] = decodeGraphic(
          p.slice(3).join(','),
          Number(p[2]),
          Number(p[1]),
        );
      } catch (error) {
        errors.push(name + ': ' + error.message);
      }
    }
    return { graphics, errors };
  }
  function removeGraphicDefinitions(source, names) {
    const selected = new Set(names.map(graphicName));
    return source
      .replace(/~DG[^\^~]*/gi, (command) =>
        selected.has(graphicName(command.slice(3).split(',')[0]))
          ? ''
          : command,
      )
      .replace(/^\s+/, '');
  }
  function drawGraphic(ctx, graphic, x, y, scaleX = 1, scaleY = 1) {
    for (let i = 0; i < graphic.bytes.length; i++)
      for (let bit = 0; bit < 8; bit++) {
        if (graphic.bytes[i] & (128 >> bit))
          ctx.fillRect(
            x + ((i % graphic.rowBytes) * 8 + bit) * scaleX,
            y + Math.floor(i / graphic.rowBytes) * scaleY,
            scaleX,
            scaleY,
          );
      }
  }
  function render(ctx, source, width, height, options = {}) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 16000000
    )
      throw Error(
        'Prévia muito grande (máximo 16 milhões de pontos). Reduza as dimensões ou a resolução.',
      );
    if (typeof source !== 'string' || source.length > 8 * 1024 * 1024)
      throw Error('ZPL muito grande (máximo 8 MB).');
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'black';
    const embedded = readGraphics(source),
      graphics = { ...options.graphics, ...embedded.graphics };
    const warnings = new Set(embedded.errors);
    const barcodeTypes = {
      B3: 'code39',
      BE: 'ean13',
      B8: 'ean8',
      BU: 'upca',
      B9: 'upce',
      B2: 'interleaved2of5',
      BA: 'code93',
      BK: 'rationalizedCodabar',
      BM: 'msi',
      BX: 'datamatrix',
      B7: 'pdf417',
      BF: 'micropdf417',
      B0: 'azteccode',
      BO: 'azteccode',
      BD: 'maxicode',
      BI: 'industrial2of5',
      BJ: 'matrix2of5',
      BZ: 'postnet',
      B5: 'planet',
    };
    const supported = new Set([
      'XA',
      'XZ',
      'PW',
      'LL',
      'LH',
      'FO',
      'FT',
      'FS',
      'FD',
      'FH',
      'A0',
      'CF',
      'GB',
      'GC',
      'GD',
      'BY',
      'BC',
      'BQ',
      'GF',
      'XG',
      'DG',
      'RF',
      'RS',
      'CI',
      'FX',
      'PR',
      'MD',
      'MM',
      'PO',
      'PQ',
      'FB',
      'A@',
      'F8',
      'F16',
      'FW',
      'FV',
      'LS',
      'LT',
      'GE',
      'FR',
      ...Object.keys(barcodeTypes),
    ]);
    let x = 0,
      y = 0,
      baseline = false,
      fontH = 30,
      fontW = 0,
      bar = null,
      qr = null,
      rfid = null,
      hex = false,
      wrap = null,
      fontOrientation = 'N',
      defaultOrientation = 'N',
      reverse = false,
      shiftX = 0,
      shiftY = 0,
      skipField = false;
    let originX = 0,
      originY = 0,
      module = 2,
      barHeight = 80,
      rfidSettings = '';
    for (const command of tokens(source)) {
      const { op: parsedOp, arg, full } = splitCommand(command),
        op = /^A[A-Z0-9]$/.test(parsedOp) ? 'A0' : parsedOp,
        p = arg.split(',');
      const lookup =
        typeof require === 'function' && typeof window === 'undefined'
          ? require('./commands').lookup
          : root.StudioCommands?.lookup;
      const info = lookup?.(full);
      options.onCommand?.({
        ...info,
        command: full,
        rendered: supported.has(op),
      });
      if (!supported.has(op)) {
        if (info && ['hardware', 'network'].includes(info.category)) {
          if (
            ['^CC', '~CC', '^CD', '~CD', '^CT', '~CT', '^MU', '^JM'].includes(
              full,
            )
          )
            warnings.add(
              full +
                ' reconhecido; mudança de linguagem/unidade ainda não simulada.',
            );
          continue;
        }
        if (info?.category === 'rfid') {
          options.onRFID?.({ settings: full + arg });
          continue;
        }
        warnings.add(
          info
            ? `${full} reconhecido; recurso ainda não renderizado.`
            : `Comando não reconhecido: ${full}.`,
        );
        if (info?.category === 'visual' && /^\^B/.test(full)) skipField = true;
        continue;
      }
      if (barcodeTypes[op]) {
        bar = {
          type: barcodeTypes[op],
          height: +p[op === 'B3' ? 2 : 1] || barHeight,
          text: (op === 'B3' ? p[3] : p[2]) === 'Y',
          orientation: p[0] || 'N',
          twoDimensional: ['BX', 'B7', 'BF', 'B0', 'BO', 'BD'].includes(op),
        };
        options.onCommand?.({
          command: full,
          category: 'visual',
          rendered: true,
          description:
            'Código de barras renderizado; opções avançadas específicas podem diferir da impressora.',
        });
        continue;
      }
      switch (op) {
        case 'LH':
          originX = +p[0] || 0;
          originY = +p[1] || 0;
          break;
        case 'LS':
          shiftX = +p[0] || 0;
          break;
        case 'LT':
          shiftY = +p[0] || 0;
          break;
        case 'FW':
          defaultOrientation = p[0] || 'N';
          break;
        case 'FR':
          reverse = true;
          break;
        case 'FO':
        case 'FT':
          x = (+p[0] || 0) + originX - shiftX;
          y = (+p[1] || 0) + originY + shiftY;
          baseline = op === 'FT';
          break;
        case 'A0':
        case 'A@':
          fontOrientation = p[0] || defaultOrientation;
          if (op === 'A@')
            options.onCommand?.({
              command: full,
              category: 'visual',
              rendered: true,
              description:
                'Fonte externa aproximada por Arial: ' +
                (p[3] || 'não informada'),
            });
          fontH = +p[1] || 30;
          fontW = +p[2] || 0;
          break;
        case 'CF':
          fontH = +p[1] || 30;
          fontW = +p[2] || 0;
          break;
        case 'FH':
          hex = p[0] || '_';
          break;
        case 'FB':
          wrap = {
            width: +p[0] || 100,
            lines: +p[1] || 1,
            gap: +p[2] || 0,
            align: p[3] || 'L',
          };
          break;
        case 'BY':
          module = +p[0] || 2;
          barHeight = +p[2] || 80;
          break;
        case 'BC':
          bar = { height: +p[1] || barHeight, text: p[2] !== 'N' };
          if (p[0] && p[0] !== 'N')
            warnings.add('Rotação de código de barras ainda não simulada.');
          break;
        case 'BQ':
          qr = {
            scale: Math.max(1, Math.min(100, +p[2] || 1)),
            model: +p[1] || 2,
            orientation: p[0] || 'N',
          };
          break;
        case 'RS':
          rfidSettings = arg;
          options.onRFID?.({ settings: arg });
          break;
        case 'RF':
          rfid = {
            operation: p[0] || 'W',
            format: p[1] || 'H',
            parameters: p.slice(2),
          };
          break;
        case 'FD':
        case 'FV': {
          if (skipField) break;
          let value = arg;
          if (hex)
            value = value.replace(
              new RegExp(
                hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([0-9a-f]{2})',
                'gi',
              ),
              (_, h) => String.fromCharCode(parseInt(h, 16)),
            );
          if (rfid) {
            const valid =
              rfid.format !== 'H' || /^(?:[\da-f]{2})+$/i.test(value);
            if (!valid)
              warnings.add(
                'RFID hexadecimal: informe pares de caracteres de 0 a 9 e A a F.',
              );
            options.onRFID?.({ ...rfid, value, valid, settings: rfidSettings });
          } else if (qr) {
            try {
              if (qr.model !== 2 || qr.orientation !== 'N')
                throw Error(
                  'QR: esta versão simula o modelo 2 na orientação N.',
                );
              const data = qrInput(value);
              if (data.generic)
                options.onCommand?.({
                  command: '^BQ',
                  category: 'visual',
                  rendered: true,
                  description:
                    'QR com dados sem prefixo: prévia usa QA; para imprimir, informe LA, ou QA, antes dos dados.',
                });
              const create = options.qrCreate || root.StudioQR?.create;
              if (!create)
                throw Error(
                  'Biblioteca QR indisponível. Execute npm run build.',
                );
              const matrix = create(data.text, {
                errorCorrectionLevel: data.level,
              }).modules;
              for (let row = 0; row < matrix.size; row++)
                for (let col = 0; col < matrix.size; col++)
                  if (matrix.get(row, col))
                    ctx.fillRect(
                      x + col * qr.scale,
                      y + row * qr.scale,
                      qr.scale,
                      qr.scale,
                    );
            } catch (error) {
              warnings.add(error.message);
            }
          } else if (bar) {
            try {
              if (bar.type) {
                const library = options.barcodeRenderer || root.StudioBarcodes;
                if (!library)
                  throw Error(
                    'Biblioteca de códigos indisponível. Execute npm run build.',
                  );
                const canvas = document.createElement('canvas');
                library.toCanvas(canvas, {
                  bcid: bar.type,
                  text: value,
                  scale: Math.max(1, Math.min(10, module)),
                  includetext: bar.text,
                  ...(bar.twoDimensional
                    ? {}
                    : {
                        height: Math.max(
                          1,
                          Math.min(500, ((bar.height / module) * 25.4) / 72),
                        ),
                      }),
                  rotate:
                    { N: 'N', R: 'R', I: 'I', B: 'L' }[bar.orientation] || 'N',
                });
                ctx.drawImage(canvas, x, y);
                break;
              }
              let bx = x + 10 * module;
              for (const v of barcodeValues(value))
                [...patterns[v]].forEach((n, i) => {
                  if (i % 2 === 0) ctx.fillRect(bx, y, +n * module, bar.height);
                  bx += +n * module;
                });
              if (bar.text) {
                ctx.font = '20px Arial';
                ctx.textBaseline = 'top';
                ctx.fillText(value, x + 10 * module, y + bar.height + 5);
              }
            } catch (error) {
              warnings.add(error.message);
            }
          } else {
            const rotated = fontOrientation !== 'N';
            const savedX = x,
              savedY = y;
            if (rotated) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(
                (({ R: 90, I: 180, B: 270 }[fontOrientation] || 0) * Math.PI) /
                  180,
              );
              x = 0;
              y = 0;
            }
            if (reverse) {
              ctx.save();
              ctx.globalCompositeOperation = 'difference';
              ctx.fillStyle = 'white';
            }
            ctx.font = fontH + 'px Arial';
            ctx.textBaseline = baseline ? 'alphabetic' : 'top';
            if (wrap) {
              let lines = [],
                line = '';
              for (const word of value.split(/\s+/)) {
                const candidate = line ? line + ' ' + word : word;
                if (ctx.measureText(candidate).width > wrap.width && line) {
                  lines.push(line);
                  line = word;
                } else line = candidate;
              }
              lines.push(line);
              lines.slice(0, wrap.lines).forEach((line, i) => {
                let offset =
                  wrap.align === 'C'
                    ? (wrap.width - ctx.measureText(line).width) / 2
                    : wrap.align === 'R'
                      ? wrap.width - ctx.measureText(line).width
                      : 0;
                ctx.fillText(line, x + offset, y + i * (fontH + wrap.gap));
              });
            } else if (fontW) {
              ctx.save();
              ctx.translate(x, y);
              ctx.scale(fontW / fontH, 1);
              ctx.fillText(value, 0, 0);
              ctx.restore();
            } else ctx.fillText(value, x, y);
            if (reverse) ctx.restore();
            if (rotated) {
              ctx.restore();
              x = savedX;
              y = savedY;
            }
          }
          break;
        }
        case 'XG': {
          const name = graphicName(p[0]),
            graphic = graphics[name];
          if (!graphic)
            warnings.add(
              `Imagem ${name} não carregada. Importe o GRF ou associe um PNG/JPG a esse nome.`,
            );
          else
            drawGraphic(
              ctx,
              graphic,
              x,
              y,
              Math.max(1, Math.min(10, +p[1] || 1)),
              Math.max(1, Math.min(10, +p[2] || 1)),
            );
          break;
        }
        case 'GF': {
          if (p[0] !== 'A') {
            warnings.add('Imagem: somente ^GFA ASCII é simulada.');
            break;
          }
          try {
            drawGraphic(
              ctx,
              decodeGraphic(p.slice(4).join(','), Number(p[3]), Number(p[2])),
              x,
              y,
            );
          } catch (error) {
            warnings.add(error.message);
          }
          break;
        }
        case 'GB': {
          const w = +p[0] || 1,
            h = +p[1] || 1,
            t = +p[2] || 1;
          ctx.fillStyle = p[3] === 'W' ? 'white' : 'black';
          if (t >= Math.min(w, h)) ctx.fillRect(x, y, w, h);
          else {
            ctx.lineWidth = t;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.strokeRect(x + t / 2, y + t / 2, w - t, h - t);
          }
          ctx.fillStyle = 'black';
          break;
        }
        case 'GC':
          ctx.beginPath();
          ctx.lineWidth = +p[1] || 1;
          ctx.strokeStyle = 'black';
          ctx.arc(
            x + +p[0] / 2,
            y + +p[0] / 2,
            Math.max(0, (+p[0] - ctx.lineWidth) / 2),
            0,
            Math.PI * 2,
          );
          ctx.stroke();
          break;
        case 'GE':
          ctx.beginPath();
          ctx.lineWidth = +p[2] || 1;
          ctx.ellipse(
            x + (+p[0] || 1) / 2,
            y + (+p[1] || 1) / 2,
            Math.max(0, ((+p[0] || 1) - ctx.lineWidth) / 2),
            Math.max(0, ((+p[1] || 1) - ctx.lineWidth) / 2),
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
          break;
        case 'GD':
          ctx.beginPath();
          ctx.lineWidth = +p[2] || 1;
          ctx.moveTo(x, p[4] === 'R' ? y + +p[1] : y);
          ctx.lineTo(x + +p[0], p[4] === 'R' ? y : y + +p[1]);
          ctx.stroke();
          break;
        case 'PO':
          if (arg === 'I')
            warnings.add('Orientação invertida ^POI ainda não simulada.');
          break;
        case 'FS':
          bar = null;
          qr = null;
          rfid = null;
          hex = false;
          wrap = null;
          baseline = false;
          reverse = false;
          skipField = false;
          fontOrientation = defaultOrientation;
          break;
      }
    }
    return [...warnings];
  }
  const api = {
    render,
    barcodeValues,
    decodeGraphic,
    readGraphics,
    removeGraphicDefinitions,
    tokens,
    qrInput,
    graphicName,
    serializeGraphic,
    substitute,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ZPL = api;
})(typeof window !== 'undefined' ? window : globalThis);
