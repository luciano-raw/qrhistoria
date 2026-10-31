'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Pencil } from 'lucide-react';
import { EditableTarget, pageCopy } from '@/lib/copy';
import { isSectionSlot, sectionSlots } from '@/lib/sections';
import { AdminAPI, saveAdminImage } from '@/lib/admin-upload';
import { Media, Memory, Profile, mediaUrl } from '@/lib/shared';
import Memorial from './memorial';
import Modal from './modal';
import ImageCropModal from './image-crop-modal';

export function PhotoEditor({ target, profile, media, api, onSaved, onClose }: { target: string; profile: Profile; media: Media[]; api: AdminAPI; onSaved: (notice?: string) => Promise<void>; onClose: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>(); const [source, setSource] = useState(''); const [error, setError] = useState('');
  const slot = target.startsWith('slot:') ? target.slice(5) : '';
  const item = slot ? media.find(item => item.placement === slot) : media.find(item => item.id === target);
  const current = target === 'hero' ? profile.heroPath : item?.path;
  const gallery = item?.placement === 'gallery';
  const caption = item?.caption ?? (isSectionSlot(slot) ? profile.content?.[sectionSlots[slot].captionKey] ?? pageCopy[sectionSlots[slot].captionKey] : '');
  if (file || source) return <ImageCropModal file={file} initialUrl={source || undefined} aspect={target === 'hero' ? 4 / 5 : gallery ? undefined : 4 / 3} preserveOriginal={gallery} onClose={onClose} onSave={async blob => { const result = await saveAdminImage(api, blob, target, { title: item?.title, caption }); await onSaved(result.warning || 'Fotografía guardada.'); onClose(); }} />;
  return <Modal title={target === 'hero' ? 'Fotografía de portada' : isSectionSlot(slot) ? sectionSlots[slot].label : target === 'new' ? 'Añadir una fotografía' : 'Editar fotografía'} onClose={onClose} wide>
    <p className="modal-description">Elige una foto. Antes de guardarla podrás ajustar el encuadre y comprobar cómo quedará.</p>
    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Elegir fotografía" onChange={e => { const value = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!value) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type) || value.size > 80 * 1024 * 1024) { setError('Elige un JPG, PNG o WebP de hasta 80 MB.'); return; } setFile(value); }} />
    <div className="photo-picker-actions"><button type="button" className="button" onClick={() => picker.current?.click()}><ImagePlus size={17} /> Subir otra fotografía</button>{current && <button type="button" className="secondary" onClick={() => setSource(mediaUrl(current))}><Pencil size={15} /> Ajustar la foto actual</button>}</div>
    {!!media.filter(item => item.kind === 'image').length && <><h3 className="library-heading">O elige una foto de tu biblioteca</h3><div className="photo-library">{media.filter(item => item.kind === 'image').map(item => <button type="button" key={item.id} onClick={() => setSource(mediaUrl(item.path))}><img src={mediaUrl(item.path)} alt={item.title} loading="lazy" /><span>{item.title}</span></button>)}</div></>}
    <p role="alert" className="error">{error}</p>
  </Modal>;
}

export default function VisualEditor({ profile, media, memories, api, onSaved, onBack }: { profile: Profile; media: Media[]; memories: Memory[]; api: AdminAPI; onSaved: (notice?: string) => Promise<void>; onBack: () => void }) {
  const [editing, setEditing] = useState<{ target: EditableTarget; value: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save() {
    if (!editing || busy) return; setBusy(true); setError('');
    try {
      const { target, value } = editing;
      if (target.type === 'media') {
        const item = media.find(item => item.id === target.id); if (!item) throw new Error('La fotografía ya no está en el álbum.');
        await api({ action: 'updateMedia', value: { id: item.id, title: item.title, caption: item.caption, year: item.year, published: item.published, [target.key]: value } });
      } else {
        const next = target.type === 'copy' ? { ...profile, content: { ...profile.content, [target.key]: value } } : { ...profile, [target.key]: value };
        await api({ action: 'profile', value: next });
      }
      await onSaved('Texto guardado.'); setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el texto.'); }
    finally { setBusy(false); }
  }
  const limit = editing?.target.type === 'profile' ? ({ name: 120, subtitle: 300, introduction: 6000, quote: 600 }[editing.target.key]) : editing?.target.type === 'media' ? ({ title: 150, caption: 2000, year: 40 }[editing.target.key]) : 3000;
  return <div className="visual-editor"><div className="visual-toolbar"><button type="button" className="secondary" onClick={onBack}><ArrowLeft size={16} /> Volver al panel</button><p><strong>Edición sobre la página</strong><span>Haz clic en los textos o las fotos. Cada cambio se guarda al confirmarlo.</span></p><button type="button" className="secondary" onClick={() => setPhoto('new')}><ImagePlus size={16} /> Añadir foto</button></div>
    <Memorial profile={profile} media={media} memories={memories.filter(item => item.approved)} demo={false} editor={{ onText: (target, value) => { setError(''); setEditing({ target, value }); }, onImage: setPhoto }} />
    {editing && <Modal title="Editar texto" busy={busy} onClose={() => setEditing(null)}><form onSubmit={e => { e.preventDefault(); save(); }}><label>Texto en la página<textarea autoFocus rows={editing.target.type === 'profile' && editing.target.key === 'introduction' ? 10 : 5} value={editing.value} maxLength={limit} required={editing.target.type === 'profile' && editing.target.key === 'name' || editing.target.type === 'media' && editing.target.key === 'title'} onChange={e => setEditing({ ...editing, value: e.target.value })} /></label><p role="alert" className="error">{error}</p><div className="modal-actions"><button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button><button className="button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar texto'}</button></div></form></Modal>}
    {photo && <PhotoEditor target={photo} profile={profile} media={media} api={api} onSaved={onSaved} onClose={() => setPhoto(null)} />}
  </div>;
}
