'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, ImagePlus, X } from 'lucide-react';
import ImageCropModal from './image-crop-modal';
import { Memory, formatBytes } from '@/lib/shared';
function Attachment({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const url = URL.createObjectURL(blob); setUrl(url); return () => URL.revokeObjectURL(url); }, [blob]);
  return <div className="memory-attachment"><img src={url} alt="Fotografía preparada para tu recuerdo" /><span>{formatBytes(blob.size)}</span><button type="button" className="icon-button" onClick={onRemove} aria-label="Quitar fotografía"><X size={15} /></button></div>;
}
export default function MemoryForm({ disabled = false, editing = false, onCreated }: { disabled?: boolean; editing?: boolean; onCreated: (memory: Memory) => void }) {
  const [photos, setPhotos] = useState<Blob[]>([]); const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (sending || disabled || editing) return;
    const form = e.currentTarget; const data = new FormData(form);
    photos.forEach((blob, i) => data.append('photos', blob, `recuerdo-${i + 1}.webp`));
    setSending(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/memories', { method: 'POST', body: data }); const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onCreated(result.memory); form.reset(); setPhotos([]);
      setStatus('Gracias por compartirlo. Tu recuerdo ya forma parte de este espacio.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar tu recuerdo. Inténtalo otra vez.'); }
    finally { setSending(false); }
  }
  return <><form className="memory-form" onSubmit={submit}>
    <label>Tu nombre o el de tu familia<input name="name" placeholder="Por ejemplo, Familia González" required minLength={2} maxLength={80} autoComplete="name" disabled={sending || editing} /></label>
    <label>Tu recuerdo<textarea name="message" placeholder="Siempre me voy a acordar de…" required minLength={10} maxLength={2000} rows={5} disabled={sending || editing} /></label>
    <div className="memory-attachments">{photos.map((photo, i) => <Attachment key={i} blob={photo} onRemove={() => { if (!sending) setPhotos(current => current.filter((_, index) => index !== i)); }} />)}</div>
    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Elegir foto para el recuerdo" disabled={sending || disabled || editing || photos.length >= 3} onChange={e => { const selected = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!selected) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 40 * 1024 * 1024) { setError('Elige una imagen JPG, PNG o WebP de menos de 40 MB.'); return; } setError(''); setFile(selected); }} />
    <button type="button" className="secondary attach-button" onClick={() => picker.current?.click()} disabled={sending || disabled || editing || photos.length >= 3}><ImagePlus size={17} /> Añadir fotografía ({photos.length}/3)</button>
    <p className="form-note">Opcional. Podrás acomodar cada foto antes de enviarla.</p>
    <div className="honey" aria-hidden="true"><label>Deja este campo vacío<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="form-consent">Tu nombre, mensaje y fotos aparecerán públicamente al enviarlos. Comparte solo imágenes que puedas publicar y evita datos privados. La familia podrá ocultar recuerdos si hace falta.</p>
    <button className="button" disabled={sending || disabled || editing}>{sending ? 'Compartiendo…' : 'Enviar mi recuerdo'}<Heart size={15} /></button>
    {disabled && <p className="form-note">Los envíos se habilitarán al conectar Supabase.</p>}{editing && <p className="form-note">Los envíos están desactivados en la vista de edición.</p>}
    <p role="alert" className="error">{error}</p><p role="status" className="form-status">{status}</p>
  </form>{file && <ImageCropModal file={file} compact aspect={4 / 3} onClose={() => setFile(null)} onSave={blob => { setPhotos(current => [...current, blob]); setFile(null); }} />}</>;
}
