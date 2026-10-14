const { test } = require('node:test');
const assert = require('node:assert/strict');
const { barcodeValues, render } = require('./zpl');
test('Code 128 B calcula checksum e rejeita caracteres incompatíveis', () => {
  assert.deepEqual(barcodeValues('AB'), [104, 33, 34, 102, 106]);
  assert.throws(() => barcodeValues('ação'));
});
test('Imagem hexadecimal desenha pixels e comando desconhecido gera aviso', () => {
  const pixels = [];
  const ctx = { canvas: {}, fillRect: (...p) => pixels.push(p) };
  const warnings = render(ctx, '^XA^FO10,20^GFA,1,1,1,81^FS^ZX^XZ', 100, 100);
  assert.deepEqual(pixels.slice(1), [
    [10, 20, 1, 1],
    [17, 20, 1, 1],
  ]);
  assert.equal(warnings.length, 1);
});
const {
  decodeGraphic,
  readGraphics,
  graphicName,
  serializeGraphic,
  substitute,
} = require('./zpl');
const QR = require('qrcode');
test('Interpretador e catálogo funcionam no navegador sem require ou module', () => {
  const vm = require('node:vm'),
    fs = require('node:fs');
  const window = {};
  const sandbox = vm.createContext({
    window,
    TextEncoder,
    Uint8Array,
    console,
  });
  for (const file of ['commands.js', 'zpl.js'])
    vm.runInContext(
      fs.readFileSync(require('node:path').join(__dirname, file), 'utf8'),
      sandbox,
    );
  const ctx = context();
  const warnings = window.ZPL.render(
    ctx,
    '^XA^FO10,10^A@N,20,20,E:ARI000.FNT^F8^FDTESTE^FS^XZ',
    100,
    100,
  );
  assert.equal(warnings.length, 0);
  assert.equal(ctx.texts[0].value, 'TESTE');
});
test('Fonte externa A@ e codificação legada F8 do exemplo são reconhecidas', () => {
  const ctx = context(),
    commands = [];
  const warnings = render(
    ctx,
    '^XA^FO230,27^A@N,20,20,E:ARI000.FNT^F8^FDPATRIMÔNIO^FS^XZ',
    500,
    100,
    { onCommand: (info) => commands.push(info) },
  );
  assert.deepEqual(warnings, []);
  assert.equal(ctx.texts[0].value, 'PATRIMÔNIO');
  assert.equal(ctx.translations[0][0], 230);
  assert.ok(
    commands.some(
      (info) =>
        info.command === '^A@' && info.description?.includes('ARI000.FNT'),
    ),
  );
  assert.ok(commands.some((info) => info.command === '^F8' && info.rendered));
});
test('QR aceita dados genéricos e modos manuais sem ocultar problemas de entrada', () => {
  const { qrInput } = require('./zpl');
  assert.deepEqual(qrInput('123456'), {
    text: '123456',
    level: 'Q',
    generic: true,
  });
  assert.equal(qrInput('LM,N123456').text[0].mode, 'numeric');
  assert.equal(qrInput('MM,AAC-42').text[0].data, 'AC-42');
  assert.deepEqual(
    Array.from(qrInput('QM,B0003ABC').text[0].data),
    [65, 66, 67],
  );
  assert.throws(() => qrInput('QM,B0002ABC'), /quantidade de bytes/);
  const ctx = context(),
    commands = [];
  assert.deepEqual(
    render(ctx, '^XA^BQN,2,4^FD123456^FS^XZ', 200, 200, {
      qrCreate: QR.create,
      onCommand: (c) => commands.push(c),
    }),
    [],
  );
  assert.ok(commands.some((info) => info.description?.includes('sem prefixo')));
});
test('Comandos de impressora são reconhecidos e códigos não renderizados não viram texto', () => {
  const { lookup, catalog } = require('./commands');
  assert.ok(Object.keys(catalog).length > 200);
  assert.equal(lookup('^A@').category, 'visual');
  assert.equal(lookup('^F16').category, 'visual');
  assert.equal(lookup('~HS').category, 'hardware');
  assert.equal(lookup('^ZX'), null);
  const ctx = context();
  const warnings = render(ctx, '^XA~HS^MTT^B4N^FD123^FS^XZ', 100, 100);
  assert.equal(ctx.texts.length, 0);
  assert.ok(warnings.some((v) => v.includes('^B4 reconhecido')));
  assert.ok(!warnings.some((v) => v.includes('~HS')));
});
test('Imagens saem do editor e continuam renderizando pelo nome no catálogo', () => {
  const label = '^XA\n^FO10,20^XGLOGO.GRF,1,1^FS\n^XZ';
  const source = '~DGR:LOGO.GRF,1,1,80\n' + label;
  const { graphics } = readGraphics(source);
  const { removeGraphicDefinitions } = require('./zpl');
  const editorCode = removeGraphicDefinitions(source, Object.keys(graphics));
  assert.equal(editorCode, label);
  const ctx = context();
  assert.deepEqual(render(ctx, editorCode, 100, 100, { graphics }), []);
  assert.deepEqual(ctx.rectangles[1], [10, 20, 1, 1]);
  const exported =
    serializeGraphic('LOGO.GRF', graphics['R:LOGO.GRF']) + editorCode;
  assert.equal(readGraphics(exported).graphics['R:LOGO.GRF'].bytes[0], 128);
  assert.equal(editorCode, label);
});
function context() {
  const rectangles = [],
    texts = [],
    translations = [];
  return {
    canvas: {},
    rectangles,
    texts,
    translations,
    fillRect(...p) {
      rectangles.push(p);
    },
    fillText(value, x, y) {
      texts.push({ value, x, y, baseline: this.textBaseline });
    },
    save() {},
    restore() {},
    translate(...p) {
      translations.push(p);
    },
    scale() {},
    measureText(value) {
      return { width: value.length * 10 };
    },
  };
}
test('QR do modelo patrimônio corresponde à matriz do código e não imprime dados RFID', () => {
  const ctx = context(),
    fields = [];
  const source = substitute(
    '^XA^FO45,31^XGE:SSGFX000.GRF,1,1^FS^FT171,81^A0N,20,28^FDPatrimônio^FS^FO302,23^BQN,2,5^FDLA,${referencia}^FS^RFW,H^RS8^FD${codigoRFID}^FS^XZ',
    { referencia: 'PAT-123', codigoRFID: 'E2000123' },
  );
  const warnings = render(ctx, source, 480, 200, {
    qrCreate: QR.create,
    onRFID: (v) => fields.push(v),
    graphics: { 'E:SSGFX000.GRF': decodeGraphic('80', 1, 1) },
  });
  assert.deepEqual(warnings, []);
  assert.equal(ctx.texts.length, 1);
  assert.equal(ctx.texts[0].baseline, 'alphabetic');
  assert.deepEqual(ctx.translations[0], [171, 81]);
  const expected = QR.create('PAT-123', { errorCorrectionLevel: 'L' }).modules;
  const qrRects = ctx.rectangles.slice(2);
  assert.equal(
    qrRects.length,
    Array.from(expected.data).filter(Boolean).length,
  );
  for (const [x, y, w, h] of qrRects) {
    assert.equal(w, 5);
    assert.equal(h, 5);
    assert.ok(expected.get((y - 23) / 5, (x - 302) / 5));
  }
  assert.equal(fields.find((v) => v.value).value, 'E2000123');
  assert.equal(fields.find((v) => v.value).settings, '8');
});
test('Modelo completo enviado pelo usuário aceita A@, F8, FB, FH e QR sem prefixo', () => {
  const ctx = context();
  const code = substitute(
    '^XA\n^CI27\n^FO230,27^A@N,20,20,E:ARI000.FNT^F8^FDPATRIMÔNIO^FS\n^FO60,53^A@N,28,28,E:ARI000.FNT^FB500,1,0,C^FH\\^FD${referencia}^FS\n^FT200,0^BQN,2,4^FH^FD${referencia}^FS\n^FT32,0^XGE:SESC.GRF,1,1^FS\n^RFW,H^RS8^FD${codigoRFID}^FS\n^PQ1,0,1,Y\n^XZ',
    { referencia: '123456', codigoRFID: 'E2000123' },
  );
  const warnings = render(ctx, code, 600, 200, { qrCreate: QR.create });
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('E:SESC.GRF'));
  assert.deepEqual(
    ctx.texts.map((item) => item.value),
    ['PATRIMÔNIO', '123456'],
  );
});
test('GRF comprimido aceita contagens, fim e repetição de linha', () => {
  assert.deepEqual(
    Array.from(decodeGraphic('HF,:!', 2, 6).bytes),
    [255, 0, 255, 0, 255, 255],
  );
  assert.equal(graphicName('E:SSGFX000.GRF'), 'E:SSGFX000.GRF');
  assert.equal(graphicName('logo'), 'R:LOGO.GRF');
  const result = readGraphics('~DGE:LOGO.GRF,2,1,80:');
  assert.deepEqual(Array.from(result.graphics['E:LOGO.GRF'].bytes), [128, 128]);
  const exported = serializeGraphic(
    'E:SSGFX000.GRF',
    result.graphics['E:LOGO.GRF'],
  );
  assert.equal(exported, '~DGE:SSGFX000.GRF,2,1,8080\n');
  assert.deepEqual(
    Array.from(readGraphics(exported).graphics['E:SSGFX000.GRF'].bytes),
    [128, 128],
  );
  assert.throws(() => decodeGraphic('8', 1, 1), /incompletos/);
  assert.throws(() => decodeGraphic(':', 1, 1), /inválida/);
});
test('XG sem imagem dá instrução útil e RFID hexadecimal inválido dá aviso', () => {
  const ctx = context();
  const warnings = render(
    ctx,
    '^XA^XGE:LOGO.GRF,1,1^FS^RFW,H^RS8^FDXYZ^FS^XZ',
    100,
    100,
  );
  assert.equal(ctx.texts.length, 0);
  assert.ok(warnings.some((v) => v.includes('não carregada')));
  assert.ok(warnings.some((v) => v.includes('RFID hexadecimal')));
});
test('Variáveis desconhecidas são mantidas e imagem XG respeita escala', () => {
  assert.equal(substitute('${a}-${b}', { a: '123' }), '123-${b}');
  const ctx = context();
  render(ctx, '~DGE:L.GRF,1,1,80^XA^FO10,20^XGE:L.GRF,2,3^FS^XZ', 100, 100);
  assert.deepEqual(ctx.rectangles[1], [10, 20, 2, 3]);
});
