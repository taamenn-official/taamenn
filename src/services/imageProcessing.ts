export const AVATAR_CROP_ASPECT = 1;
export const BANNER_CROP_ASPECT = 3.4;

export type CropFrame = {
  aspect: number;
  zoom: number;
  /** -1 to 1. Zero keeps the window centered. These are not canvas pixels. */
  panX: number;
  panY: number;
};

export function clampUnit(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

/** Visible source window for a cover crop. Pan is normalized, not a raw canvas point. */
export function cropSourceRect(imageWidth: number, imageHeight: number, frame: CropFrame) {
  const zoom = Math.min(3, Math.max(1, frame.zoom || 1));
  const panX = clampUnit(frame.panX);
  const panY = clampUnit(frame.panY);
  const aspect = frame.aspect > 0 ? frame.aspect : 1;
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  let cropW: number;
  let cropH: number;
  if (safeWidth / safeHeight > aspect) {
    cropH = safeHeight;
    cropW = safeHeight * aspect;
  } else {
    cropW = safeWidth;
    cropH = safeWidth / aspect;
  }
  cropW = Math.min(safeWidth, cropW / zoom);
  cropH = Math.min(safeHeight, cropH / zoom);
  const maxX = Math.max(0, safeWidth - cropW);
  const maxY = Math.max(0, safeHeight - cropH);
  return {
    sx: (maxX / 2) * (1 + panX),
    sy: (maxY / 2) * (1 + panY),
    sw: cropW,
    sh: cropH,
  };
}

/** Empty MIME is common for camera rolls. Only a declared non-image type is rejected up front. */
export function canTryImageFile(file: { type?: string }) {
  return !file.type || file.type.startsWith('image/');
}

export function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}

/**
 * Decode a file once. The caller owns `release` and must call it after the preview
 * is no longer displayed. A failed decode revokes its own URL.
 */
export async function readImageFile(file: File): Promise<{ url: string; width: number; height: number; release: () => void }> {
  if (!canTryImageFile(file)) throw new Error('Unsupported image');
  const url = URL.createObjectURL(file);
  const release = () => URL.revokeObjectURL(url);
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      if (!width || !height) throw new Error('Image decode failed');
      return { url, width, height, release };
    }
    const img = await loadImageElement(url);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Image decode failed');
    return { url, width: img.naturalWidth, height: img.naturalHeight, release };
  } catch (error) {
    release();
    throw error;
  }
}

export async function cropImageToDataUrl(file: File, frame: CropFrame, options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}) {
  if (!canTryImageFile(file)) throw new Error('Unsupported image');
  const sourceUrl = URL.createObjectURL(file);
  try {
    const source = await loadImageElement(sourceUrl);
    const rect = cropSourceRect(source.naturalWidth, source.naturalHeight, frame);
    const maxWidth = options.maxWidth ?? 1600;
    const maxHeight = options.maxHeight ?? 1200;
    const quality = options.quality ?? 0.82;
    const scale = Math.min(1, maxWidth / rect.sw, maxHeight / rect.sh);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.sw * scale));
    canvas.height = Math.max(1, Math.round(rect.sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(source, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function imageFileToDataUrl(file: File, options:{maxWidth?:number;maxHeight?:number;quality?:number}={}) {
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1200;
  const quality = options.quality ?? .84;
  if (!canTryImageFile(file)) throw new Error('Unsupported image');
  const source = await new Promise<HTMLImageElement>((resolve,reject)=>{
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image decode failed'))};
    img.src=url;
  });
  const ratio=Math.min(1,maxWidth/source.naturalWidth,maxHeight/source.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(source.naturalHeight*ratio));
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/webp',quality);
}
