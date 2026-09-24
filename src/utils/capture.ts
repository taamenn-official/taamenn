export type PitchCaptureOptions = {
  backgroundColor?: string;
  scale?: number;
};

/**
 * Real DOM-to-canvas capture used by the tactical board and Capture Wallet.
 * Replaces the previous SVG foreignObject fallback, which omitted stylesheets
 * and produced blank or incomplete images.
 */
export async function html2canvas(
  target: HTMLElement,
  options: PitchCaptureOptions = {},
): Promise<HTMLCanvasElement> {
  const { default: html2canvasLib } = await import('html2canvas');
  const scale = options.scale ?? Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
  const width = Math.max(1, target.offsetWidth);
  const height = Math.max(1, target.offsetHeight);
  return html2canvasLib(target, {
    backgroundColor: options.backgroundColor ?? '#193940',
    scale,
    useCORS: true,
    logging: false,
    imageTimeout: 4000,
    foreignObjectRendering: false,
    width,
    height,
    onclone: (_document, cloned) => {
      cloned.classList.add('is-pitch-capture');
      cloned.style.transform = 'none';
      cloned.style.maxHeight = 'none';
      cloned.style.width = `${width}px`;
      cloned.style.height = `${height}px`;
    },
  });
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) reject(new Error('capture-unavailable'));
      else resolve(blob);
    }, 'image/png');
  });
}
