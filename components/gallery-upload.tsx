'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { AdminAPI, saveAdminImage } from '@/lib/admin-upload';
import { compressImage } from '@/lib/image';
import { formatBytes } from '@/lib/shared';
import Modal from './modal';
import ImageCropModal from './image-crop-modal';
type Pending = { id: string; file: File; title: string; prepared?: Blob; error?: string };
function PendingPhoto({ item, busy, onTitle, onCrop, onRemove }: { item: Pending; busy: boolean; onTitle: (title: string) => void; onCrop: () => void; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const url = URL.createObjectURL(item.prepared || item.file); setUrl(url); return () => URL.revokeObjectURL(url); }, [item.file, item.prepared]);
  return <article className="pending-photo"><img src={url} alt={item.title} loading="lazy" /><div><label>Título<input value={item.title} maxLength={150} onChange={e => onTitle(e.target.value)} disabled={busy} required /></label><small>{item.prepared ? `Lista · ${formatBytes(item.prepared.size)}` : `Original: ${formatBytes(item.file.size)} · se optimizará`}</small>{item.error && <p role="alert" className="error">{item.error}</p>}<button type="button" className="secondary" disabled={busy} onClick={onCrop}>Acomodar foto</button></div><button type="button" className="icon-button" aria-label={`Quitar ${item.title}`} disabled={busy} onClick={onRemove}><X size={17} /></button></article>;
}
export default function GalleryUpload({ api, onSaved }: { api: AdminAPI; onSaved: (message?: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null); const [pending, setPending] = useState<Pending[]>([]); const [cropping, setCropping] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const running = useRef(false); const [progress, setProgress] = useState(''); const [error, setError] = useState('');
  const crop = pending.find(item => item.id === cropping);
  async function publish() {
    if (running.current || !pending.length) return; running.current = true; setBusy(true); setError('');
    const failed: Pending[] = []; let saved = 0;
    for (const [index, item] of pending.entries()) {
      setProgress(`Preparando y subiendo ${index + 1} de ${pending.length}…`);
      let source = '';
      try {
        let blob = item.prepared;
        if (!blob) {
          source = URL.createObjectURL(item.file); const image = new Image(); image.src = source; await image.decode();
          blob = await compressImage(source, { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }, { maxDimension: 1920, targetBytes: 200 * 1024, maxBytes: 500 * 1024 });
        }
        await saveAdminImage(api, blob, 'gallery:new', { title: item.title.trim() || 'Un momento para recordar' }); saved++;
      } catch (e) { failed.push({ ...item, error: e instanceof Error ? e.message : 'No pudimos subir esta foto.' }); }
      finally { if (source) URL.revokeObjectURL(source); }
    }
    setPending(failed); setBusy(false); running.current = false; setProgress('');
    if (saved) { try { await onSaved(`${saved} fotografía${saved === 1 ? '' : 's'} publicada${saved === 1 ? '' : 's'} en la galería.`); } catch { setError('Las fotos se guardaron, pero no pudimos actualizar el panel. Recarga la página.'); } }
    if (failed.length) setError(`${failed.length} fotografía(s) no se pudieron subir. Las demás ya están guardadas; puedes reintentar solo las pendientes.`);
  }
  return <><p>Selecciona varias fotos. Se guardarán completas y comprimidas; puedes acomodar cualquiera antes de publicarlas.</p><input className="sr-only" ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Seleccionar fotografías para la galería" onChange={e => {
    const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ''; setError('');
    if (files.length > 30) { setError('Selecciona hasta 30 fotos por tanda. Puedes añadir más en la siguiente.'); return; }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 80 * 1024 * 1024)) { setError('Usa JPG, PNG o WebP de hasta 80 MB por foto.'); return; }
    setPending(files.map(file => ({ id: crypto.randomUUID(), file, title: file.name.replace(/\.[^.]+$/, '').slice(0, 150) })));
  }} /><button type="button" className="button" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={17} /> Seleccionar fotografías</button><p role="alert" className="error">{error}</p>
    {!!pending.length && !crop && <Modal title={`Preparar ${pending.length} fotografías`} onClose={() => setPending([])} busy={busy} wide><p className="modal-description">Por defecto conservaremos toda la fotografía. La carga es secuencial para no saturar tu conexión.</p><div className="pending-photos">{pending.map(item => <PendingPhoto key={item.id} item={item} busy={busy} onTitle={title => setPending(current => current.map(photo => photo.id === item.id ? { ...photo, title } : photo))} onCrop={() => setCropping(item.id)} onRemove={() => setPending(current => current.filter(photo => photo.id !== item.id))} />)}</div><p role="status">{progress}</p><p role="alert" className="error">{error}</p><div className="modal-actions"><button type="button" className="ghost" disabled={busy} onClick={() => setPending([])}>Cancelar</button><button type="button" className="button" disabled={busy} onClick={publish}>{busy ? 'Publicando…' : 'Publicar fotografías'}</button></div></Modal>}
    {crop && <ImageCropModal file={crop.file} compact preserveOriginal onClose={() => setCropping(null)} onSave={blob => { setPending(current => current.map(item => item.id === crop.id ? { ...item, prepared: blob, error: undefined } : item)); setCropping(null); }} />}
  </>;
}
