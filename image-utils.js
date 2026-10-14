(function (root) {
  const MAX_IMAGE_WIDTH = 2400;
  const MAX_IMAGE_HEIGHT = 4000;
  function imageSize(widthMM, dpi, sourceWidth, sourceHeight) {
    if (
      ![widthMM, dpi, sourceWidth, sourceHeight].every(Number.isFinite) ||
      widthMM < 1 ||
      widthMM > 300 ||
      dpi < 1 ||
      sourceWidth < 1 ||
      sourceHeight < 1
    )
      throw Error('Dimensões da imagem inválidas.');
    const width = Math.round((widthMM * dpi) / 25.4);
    const height = Math.max(
      1,
      Math.round((width * sourceHeight) / sourceWidth),
    );
    if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT)
      throw Error(
        'Imagem muito grande. Reduza a largura do logo (máximo 2400 × 4000 pontos).',
      );
    return { width, height };
  }
  function rgbaToGraphic(data, width, height, threshold) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > MAX_IMAGE_WIDTH ||
      height > MAX_IMAGE_HEIGHT ||
      data.length !== width * height * 4 ||
      !Number.isFinite(threshold) ||
      threshold < 0 ||
      threshold > 255
    )
      throw Error('Dados da imagem inválidos.');
    const rowBytes = Math.ceil(width / 8),
      bytes = new Uint8Array(rowBytes * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4,
          alpha = data[i + 3] / 255;
        const gray =
          (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) *
            alpha +
          255 * (1 - alpha);
        if (gray < threshold) bytes[y * rowBytes + (x >> 3)] |= 128 >> (x % 8);
      }
    return { bytes, rowBytes, width: rowBytes * 8, height };
  }
  function fromImage(source, widthMM, dpi, threshold) {
    const { width, height } = imageSize(
      widthMM,
      dpi,
      source.width,
      source.height,
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);
    return rgbaToGraphic(
      ctx.getImageData(0, 0, width, height).data,
      width,
      height,
      threshold,
    );
  }
  const api = { imageSize, rgbaToGraphic, fromImage };
  if (typeof module !== 'undefined') module.exports = api;
  else root.StudioImages = api;
})(typeof window !== 'undefined' ? window : globalThis);
