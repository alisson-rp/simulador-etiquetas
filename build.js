const fs = require('node:fs/promises');
const { build } = require('esbuild');
(async () => {
  await build({
    entryPoints: ['qr-entry.js'],
    bundle: true,
    platform: 'browser',
    minify: true,
    outfile: 'vendor/qr.js',
    legalComments: 'eof',
  });
  await fs.mkdir('web-dist/vendor', { recursive: true });
  await build({
    entryPoints: ['barcode-entry.js'],
    bundle: true,
    platform: 'browser',
    minify: true,
    outfile: 'vendor/barcodes.js',
    legalComments: 'eof',
  });
  await build({
    entryPoints: ['pdf-entry.js'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    minify: true,
    outfile: 'vendor/pdf.js',
    legalComments: 'eof',
  });
  await fs.copyFile(
    'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    'vendor/pdf.worker.min.mjs',
  );
  await fs.copyFile(
    'node_modules/pdfjs-dist/LICENSE',
    'vendor/pdf-LICENSE.txt',
  );
  for (const [source, target] of [
    ['cmaps', 'pdf-cmaps'],
    ['standard_fonts', 'pdf-fonts'],
    ['wasm', 'pdf-wasm'],
  ]) {
    await fs.cp('node_modules/pdfjs-dist/' + source, 'vendor/' + target, {
      recursive: true,
    });
  }
  for (const file of [
    'index.html',
    'styles.css',
    'app.js',
    'zpl.js',
    'image-utils.js',
    'templates.js',
    'editor.js',
    'commands.js',
  ])
    await fs.copyFile(file, 'web-dist/' + file);
  await fs.cp('vendor', 'web-dist/vendor', { recursive: true });
  console.log('Versão web preparada em web-dist. Inicie com npm start.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
