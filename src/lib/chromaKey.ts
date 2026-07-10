/**
 * Client-side green-screen (chroma key) removal for images.
 *
 * Loads the image into a canvas, makes green-dominant pixels transparent, and
 * returns a new PNG data URL. Deterministic and offline — no AI, no service.
 * (Videos need per-frame keying and are handled separately / not yet supported.)
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Remove a green background from an image data URL.
 * @param src image data/object URL
 * @param strength 0..1 — higher removes more greenish pixels (default 0.5)
 */
export async function removeGreenScreen(src: string, strength = 0.5): Promise<string> {
  const img = await loadImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  // Higher strength → lower ratio threshold → keys more aggressively.
  const ratio = 1.6 - strength * 0.5; // ~1.35 at 0.5, ~1.1 at 1
  const minGreen = 70;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (g > minGreen && g > r * ratio && g > b * ratio) {
      d[i + 3] = 0; // fully transparent
    } else if (g > r && g > b) {
      // Spill suppression: desaturate slightly-green edges to avoid a green fringe.
      const avg = (r + b) / 2;
      if (g > avg * 1.15) d[i + 1] = Math.round(avg * 1.1);
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}
