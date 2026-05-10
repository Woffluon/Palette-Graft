export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function downscaleImage(img: HTMLImageElement, maxDimension: number): ImageData {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;
  
  if (width > maxDimension || height > maxDimension) {
    const ratio = width / height;
    if (width > height) {
      width = maxDimension;
      height = Math.round(maxDimension / ratio);
    } else {
      height = maxDimension;
      width = Math.round(maxDimension * ratio);
    }
  }
  
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context');
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToBlob(imageData: ImageData, type = 'image/jpeg', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject('No context');
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject('Blob creation failed');
    }, type, quality);
  });
}
