export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
}

export function getImageEscPos(img: HTMLImageElement, maxWidth: number = 384): Uint8Array {
  // Ensure we round the max width to a multiple of 8
  const validMaxWidth = Math.floor(maxWidth / 8) * 8;
  const targetWidth = Math.min(validMaxWidth, Math.floor(img.width / 8) * 8);
  const ratio = targetWidth / img.width;
  const targetHeight = Math.floor(img.height * ratio);
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  // Center drawing if we wanted, but here it occupies targetWidth
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  
  const widthBytes = targetWidth / 8;
  const heightDots = targetHeight;
  
  const result = new Uint8Array(8 + widthBytes * heightDots);
  result[0] = 0x1D; // GS
  result[1] = 0x76; // v
  result[2] = 0x30; // 0
  result[3] = 0x00; // m=0 (normal)
  result[4] = widthBytes & 0xFF;
  result[5] = (widthBytes >> 8) & 0xFF;
  result[6] = heightDots & 0xFF;
  result[7] = (heightDots >> 8) & 0xFF;
  
  let i = 8;
  for (let y = 0; y < heightDots; y++) {
    for (let x = 0; x < widthBytes; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        const idx = (y * targetWidth + pixelX) * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];
        const a = data[idx+3];
        // Dark pixels & non-transparent become black on thermal printer
        const isBlack = a > 128 && (r + g + b) / 3 < 180;
        if (isBlack) {
          byte |= (1 << (7 - bit)); // MSB to LSB
        }
      }
      result[i++] = byte;
    }
  }
  return result;
}

export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLens = arrays.reduce((acc, a) => acc + a.length, 0);
  const res = new Uint8Array(totalLens);
  let offset = 0;
  for (const a of arrays) {
    res.set(a, offset);
    offset += a.length;
  }
  return res;
}
