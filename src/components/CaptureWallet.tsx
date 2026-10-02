import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Share2, Trash2, Upload, X } from 'lucide-react';
import { html2canvas } from '../utils/capture';
import { clearCaptures, downloadCapture, importScreenshot, listCaptures, removeCapture, saveCapture, shareCapture, objectUrl, type LocalCapture } from '../services/screenshotService';
import { useOverlayPresence } from '../motion/useOverlayPresence';

function CaptureImage({ item, alt }: { item: LocalCapture; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!(item.blob instanceof Blob)) { setUrl(''); return; }
    const next = objectUrl(item);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [item]);
  if (!url) return <div className="capture-missing" aria-hidden="true" />;
  return <img src={url} alt={alt} loading="lazy" decoding="async" />;
}

export function CaptureWallet({ language, embedded = false }: { language: 'ar' | 'en'; embedded?: boolean }) {
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LocalCapture[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<LocalCapture | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => listCaptures().then(next => setItems(next.sort((a, b) => b.createdAt - a.createdAt)));
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>('drawer', () => setOpen(false), open && !embedded);
  useEffect(() => { refresh(); }, []);

  const capture = async () => {
    setBusy(true);
    try {
      const canvas = await html2canvas(document.body);
      await saveCapture(canvas.toDataURL('image/png'), 'TAAMEN capture');
    } finally {
      setBusy(false);
      refresh();
      if (!embedded) setOpen(true);
    }
  };
  const imported = async (file?: File) => {
    if (!file) return;
    try { await importScreenshot(file); await refresh(); if (!embedded) setOpen(true); } catch { /* keep the current gallery */ }
  };

  const gallery = (
    <div className="capture-gallery">
      <div className="capture-toolbar">
        <button className="dark-action" onClick={capture} disabled={busy}><Camera size={15} />{ar ? 'التقاط الشاشة' : 'Capture screen'}</button>
        <button className="dark-action" onClick={() => input.current?.click()}><Upload size={15} />{ar ? 'إضافة صورة' : 'Add image'}</button>
        <input ref={input} hidden type="file" accept="image/*" onChange={event => imported(event.target.files?.[0])} />
        <button className="text-button" onClick={async () => { if (!window.confirm(ar ? 'حذف كل اللقطات؟' : 'Delete all captures?')) return; await clearCaptures(); refresh(); }}><Trash2 size={14} />{ar ? 'حذف الكل' : 'Clear all'}</button>
      </div>
      <div className="capture-gallery-grid">
        {items.map(item => (
          <article className="capture-gallery-card" key={item.id}>
            <button type="button" className="capture-gallery-open" onClick={() => setPreview(item)} aria-label={ar ? `عرض ${item.name}` : `View ${item.name}`}>
              <CaptureImage item={item} alt={item.name} />
            </button>
            <div className="capture-card-actions">
              <button className="mini-action" onClick={() => downloadCapture(item)}><Download size={13} />{ar ? 'حفظ' : 'Download'}</button>
              <button className="mini-action" onClick={async () => { try { await shareCapture(item); } catch { /* share sheet dismissed */ } }}><Share2 size={13} />{ar ? 'مشاركة' : 'Share'}</button>
              <button className="mini-action" onClick={async () => { await removeCapture(item.id); refresh(); }} aria-label={ar ? 'حذف اللقطة' : 'Delete capture'}><Trash2 size={13} /></button>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="empty-state capture-empty">
          <Camera />
          <strong>{ar ? 'لا توجد صور بعد' : 'No images yet'}</strong>
          <span>{ar ? 'أضف صورة أو التقط الشاشة. تبقى الصور على هذا الجهاز.' : 'Add an image or capture the screen. Images stay on this device.'}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? gallery : (
        <div className="capture-actions">
          <button className="icon-button capture-button" onClick={capture} disabled={busy} aria-label={ar ? 'التقاط الشاشة' : 'Capture screen'} title={ar ? 'التقاط الشاشة' : 'Capture screen'}>{busy ? <span className="capture-spinner" /> : <Camera size={17} />}</button>
          <button className="icon-button" onClick={() => { setOpen(true); refresh(); }} aria-label={ar ? 'معرض الصور' : 'Photo gallery'} title={ar ? 'معرض الصور' : 'Photo gallery'}><Upload size={16} /></button>
        </div>
      )}
      {!embedded && open && (
        <div className="capture-wallet">
          <button ref={backdropRef} className="overlay-backdrop" aria-label={ar ? 'إغلاق' : 'Close'} onClick={requestClose} />
          <section ref={panelRef} className="capture-panel">
            <header>
              <div><p className="eyebrow">TAAMEN / GALLERY</p><h2>{ar ? 'المعرض' : 'Gallery'}</h2></div>
              <button className="icon-button" aria-label={ar ? 'إغلاق' : 'Close'} onClick={requestClose}><X size={16} /></button>
            </header>
            {gallery}
          </section>
        </div>
      )}
      {preview && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={ar ? 'معاينة الصورة' : 'Image preview'}>
          <button className="overlay-backdrop" aria-label={ar ? 'إغلاق' : 'Close'} onClick={() => setPreview(null)} />
          <div className="capture-preview">
            <CaptureImage item={preview} alt={preview.name} />
            <button type="button" className="dark-action" onClick={() => setPreview(null)}>{ar ? 'إغلاق' : 'Close'}</button>
          </div>
        </div>
      )}
    </>
  );
}
