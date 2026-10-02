import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { uiCopy, type Language } from '../i18n/translations';
import { useOverlayPresence } from '../motion/useOverlayPresence';
import {
  AVATAR_CROP_ASPECT,
  BANNER_CROP_ASPECT,
  clampUnit,
  cropImageToDataUrl,
  cropSourceRect,
  type CropFrame,
} from '../services/imageProcessing';

type CropKind = 'avatar' | 'banner';

export function ImageCropOverlay({
  file,
  kind,
  language,
  onConfirm,
  onCancel,
}: {
  file: File;
  kind: CropKind;
  language: Language;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const copy = uiCopy[language];
  const aspect = kind === 'avatar' ? AVATAR_CROP_ASPECT : BANNER_CROP_ASPECT;
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>('modal', onCancel);
  const stageRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFailed(false);
    setLoadFailed(false);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setNatural({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    };
    img.onerror = () => {
      if (!cancelled) setLoadFailed(true);
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const frame: CropFrame = { aspect, zoom, panX, panY };
  const rect = cropSourceRect(natural.width, natural.height, frame);
  const imageStyle = {
    width: `${(natural.width / rect.sw) * 100}%`,
    height: `${(natural.height / rect.sh) * 100}%`,
    left: `${(-rect.sx / rect.sw) * 100}%`,
    top: `${(-rect.sy / rect.sh) * 100}%`,
  };

  const nudgeZoom = (delta: number) => setZoom((current) => Math.min(3, Math.max(1, Math.round((current + delta) * 10) / 10)));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, panX, panY };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = drag.current;
    const stage = stageRef.current;
    if (!origin || !stage) return;
    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const base = cropSourceRect(natural.width, natural.height, { aspect, zoom, panX: origin.panX, panY: origin.panY });
    const maxX = Math.max(0, natural.width - base.sw);
    const maxY = Math.max(0, natural.height - base.sh);
    const nextSx = base.sx - dx * (base.sw / bounds.width);
    const nextSy = base.sy - dy * (base.sh / bounds.height);
    setPanX(maxX === 0 ? 0 : clampUnit(nextSx / (maxX / 2) - 1));
    setPanY(maxY === 0 ? 0 : clampUnit(nextSy / (maxY / 2) - 1));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const dataUrl = await cropImageToDataUrl(file, frame, kind === 'avatar'
        ? { maxWidth: 900, maxHeight: 900, quality: 0.82 }
        : { maxWidth: 1600, maxHeight: 520, quality: 0.82 });
      onConfirm(dataUrl);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="overlay image-crop-overlay" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
      <button ref={backdropRef} className="overlay-backdrop" onClick={requestClose} aria-label={copy.cropCancel} />
      <aside ref={panelRef} className="image-crop-sheet">
        <header>
          <div>
            <p className="eyebrow">TAAMEN / PHOTO</p>
            <h2 id="image-crop-title">{kind === 'avatar' ? copy.cropAvatar : copy.cropBanner}</h2>
          </div>
          <button type="button" className="icon-button" onClick={requestClose} aria-label={copy.cropCancel}><X size={18} /></button>
        </header>
        <div
          ref={stageRef}
          className={`image-crop-stage is-${kind}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {previewUrl && <img src={previewUrl} alt="" style={imageStyle} draggable={false} />}
        </div>
        <p className="settings-note">{copy.cropHint}</p>
        <div
          className="image-crop-zoom"
          onWheel={(event) => {
            event.preventDefault();
            nudgeZoom(event.deltaY < 0 ? 0.08 : -0.08);
          }}
        >
          <button type="button" className="icon-button" onClick={() => nudgeZoom(-0.2)} aria-label={copy.cropZoomOut}><Minus size={16} /></button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label={copy.cropZoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <button type="button" className="icon-button" onClick={() => nudgeZoom(0.2)} aria-label={copy.cropZoomIn}><Plus size={16} /></button>
          <button type="button" className="text-button" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}>{copy.cropReset}</button>
        </div>
        {(failed || loadFailed) && <p className="error-banner" role="alert">{loadFailed ? copy.imageLoadFailed : copy.imageProcessFailed}</p>}
        <footer>
          <button type="button" className="dark-action" onClick={requestClose} disabled={busy}>{copy.cropCancel}</button>
          <button type="button" className="primary-action" onClick={() => void confirm()} disabled={busy || failed || loadFailed || !previewUrl}>
            <Check size={15} />
            {copy.cropConfirm}
          </button>
        </footer>
      </aside>
    </div>
  );
}
