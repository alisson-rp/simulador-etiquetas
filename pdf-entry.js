import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';

const assetBase = new URL('./', document.currentScript.src);
GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', assetBase).href;

class PDFImporter {
  constructor() {
    this.document = null;
    this.loading = null;
    this.revision = 0;
  }

  async close() {
    this.revision++;
    const loading = this.loading;
    this.loading = null;
    this.document = null;
    if (loading) await loading.destroy();
  }

  async open(file) {
    await this.close();
    const loading = getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
      cMapUrl: new URL('pdf-cmaps/', assetBase).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('pdf-fonts/', assetBase).href,
      wasmUrl: new URL('pdf-wasm/', assetBase).href,
    });
    this.loading = loading;
    try {
      this.document = await loading.promise;
      return this.document.numPages;
    } catch (error) {
      await this.close();
      if (error.name === 'PasswordException')
        throw Error('PDF protegido por senha. Importe uma cópia sem senha.');
      throw Error(
        'Não foi possível abrir o PDF. Verifique se o arquivo é válido.',
      );
    }
  }

  async render(pageNumber) {
    if (!this.document) throw Error('Importe um PDF primeiro.');
    const revision = ++this.revision;
    const page = await this.document.getPage(pageNumber);
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(2400 / original.width, 4000 / original.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
      background: 'rgb(255,255,255)',
    }).promise;
    if (revision !== this.revision) return null;
    page.cleanup();
    return canvas;
  }
}

window.StudioPDF = PDFImporter;
