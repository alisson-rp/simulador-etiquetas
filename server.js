const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readdirSync } = require('node:fs');
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/zpl.js', ['zpl.js', 'text/javascript']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/vendor/qr.js', ['vendor/qr.js', 'text/javascript']],
  ['/vendor/barcodes.js', ['vendor/barcodes.js', 'text/javascript']],
  ['/vendor/pdf.js', ['vendor/pdf.js', 'text/javascript']],
  [
    '/vendor/pdf.worker.min.mjs',
    ['vendor/pdf.worker.min.mjs', 'text/javascript'],
  ],
  ...['image-utils.js', 'templates.js', 'editor.js', 'commands.js'].map(
    (file) => ['/' + file, [file, 'text/javascript']],
  ),
]);
for (const folder of ['pdf-cmaps', 'pdf-fonts', 'pdf-wasm']) {
  try {
    for (const entry of readdirSync(path.join(__dirname, 'vendor', folder), {
      withFileTypes: true,
    })) {
      if (!entry.isFile()) continue;
      const file = 'vendor/' + folder + '/' + entry.name;
      files.set('/' + file, [
        file,
        entry.name.endsWith('.wasm')
          ? 'application/wasm'
          : 'application/octet-stream',
      ]);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end('Método não permitido');
        return;
      }
      const file = files.get(new URL(req.url, 'http://localhost').pathname);
      if (!file) {
        res.writeHead(404);
        res.end('Não encontrado');
        return;
      }
      const content = await fs.readFile(path.join(__dirname, file[0]));
      res.writeHead(200, {
        'Content-Type': file[1] + '; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      res.writeHead(500);
      res.end('Arquivo indisponível. Execute npm run build.');
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error('PORT deve ser um número inteiro entre 1 e 65535.');
  const server = createServer();
  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `Porta ${port} ocupada. Use outra porta com a variável PORT.`
        : error.message,
    );
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(`Studio ZPL web disponível em http://127.0.0.1:${port}`),
  );
}
module.exports = { createServer };
