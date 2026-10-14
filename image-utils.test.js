const { test } = require('node:test');
const assert = require('node:assert/strict');
const { imageSize, rgbaToGraphic } = require('./image-utils');
const { serializeGraphic, readGraphics, render } = require('./zpl');
test('Conversão preserva proporção e recusa dimensões que ultrapassam limites', () => {
  assert.deepEqual(imageSize(25.4, 203, 100, 50), { width: 203, height: 102 });
  assert.throws(() => imageSize(Infinity, 203, 100, 50));
  assert.throws(() => imageSize(300, 600, 100, 50), /muito grande/);
});
test('Pixels pretos, brancos e transparentes sobrevivem à conversão para GRF', () => {
  const rgba = Uint8Array.from([
    0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 100, 100, 100, 255,
  ]);
  const graphic = rgbaToGraphic(rgba, 4, 1, 160);
  assert.equal(graphic.bytes[0], 0x90);
  const imported = readGraphics(serializeGraphic('E:LOGO.GRF', graphic));
  assert.equal(imported.graphics['E:LOGO.GRF'].bytes[0], 0x90);
  assert.throws(() => rgbaToGraphic(rgba, 4, 1, NaN));
});
test('Prévia rejeita alocações excessivas antes de modificar o canvas', () => {
  assert.throws(() => render({}, '^XA^XZ', 10000, 10000), /muito grande/);
  assert.throws(() => render({}, '^XA^XZ', NaN, 100), /muito grande/);
});
