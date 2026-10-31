/**
 * Always encode from original pixels, never from a previous lossy attempt.
 * @template {{ size: number }} T
 * @param {(width: number, height: number, quality: number) => Promise<T>} encode
 * @param {{width: number, height: number, maxDimension?: number, targetBytes?: number, maxBytes?: number}} options
 * @returns {Promise<T>}
 */
export async function adaptiveCompression(encode, options) {
  const { width, height } = options;
  const target = options.targetBytes ?? 450 * 1024;
  const ceiling = options.maxBytes ?? 2 * 1024 * 1024;
  if (!(width > 0 && height > 0 && target > 0 && ceiling >= target)) throw new Error('No pudimos leer las dimensiones de esta fotografía.');
  let scale = Math.min(1, (options.maxDimension ?? 1600) / Math.max(width, height));
  /** @type {T | undefined} */
  let smallest;
  for (let round = 0; round < 9; round++) {
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    for (const quality of [.84, .76, .68]) {
      const result = await encode(outputWidth, outputHeight, quality);
      if (!smallest || result.size < smallest.size) smallest = result;
      if (result.size <= target) return result;
    }
    // Reduce dimensions progressively before sacrificing more quality.
    scale *= .82;
  }
  if (smallest && smallest.size <= ceiling) return smallest;
  throw new Error('No pudimos optimizar esta fotografía. Prueba otra copia de la misma imagen.');
}
