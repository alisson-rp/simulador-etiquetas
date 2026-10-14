const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./server');
test('Servidor entrega a aplicação e bloqueia acesso a arquivos do projeto', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /vendor\/qr.js/);
    const lib = await fetch(base + '/vendor/qr.js');
    assert.equal(lib.status, 200);
    for (const file of ['pdf.js', 'pdf.worker.min.mjs'])
      assert.equal((await fetch(base + '/vendor/' + file)).status, 200);
    for (const file of [
      'image-utils.js',
      'templates.js',
      'editor.js',
      'commands.js',
    ])
      assert.equal((await fetch(base + '/' + file)).status, 200);
    assert.equal((await fetch(base + '/vendor/barcodes.js')).status, 200);
    const head = await fetch(base, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const post = await fetch(base, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    assert.equal((await fetch(base + '/package.json')).status, 404);
    assert.equal((await fetch(base + '/%2e%2e/package.json')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
