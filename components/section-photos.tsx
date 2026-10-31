'use client';
import { ImagePlus, Pencil } from 'lucide-react';
import { Media, Profile, mediaUrl } from '@/lib/shared';
import { EditableTarget, MemorialEditor, pageCopy } from '@/lib/copy';
import { SectionSlot, sectionSlots } from '@/lib/sections';
export default function SectionPhotos({ slots, media, profile, editor, text, onOpen, variant = 'feature' }: { slots: SectionSlot[]; media: Media[]; profile: Profile; editor?: MemorialEditor; text: (target: EditableTarget, value: string) => React.ReactNode; onOpen: (image: Media) => void; variant?: 'triptych' | 'feature' | 'companions' }) {
  const visible = slots.filter(slot => editor || media.some(item => item.placement === slot && item.published));
  if (!visible.length) return null;
  return <div className={`section-photos ${variant}`}>{visible.map(slot => {
    const item = media.find(item => item.placement === slot && (item.published || editor));
    const spec = sectionSlots[slot]; const caption = item ? item.caption : profile.content?.[spec.captionKey] ?? pageCopy[spec.captionKey];
    return <figure key={slot} className="section-photo"><button type="button" className={`section-photo-image ${item ? '' : 'empty-photo-slot'}`} aria-label={editor ? `Editar ${spec.label}` : `Ampliar ${item?.title}`} onClick={() => editor ? editor.onImage(`slot:${slot}`) : item && onOpen(item)}>{item ? <img src={mediaUrl(item.path)} alt={item.title} loading="lazy" /> : <><ImagePlus size={28} strokeWidth={1} /><span>{spec.label}</span><small>Añadir fotografía</small></>}{editor && item && <span className="section-photo-edit"><Pencil size={15} /> Cambiar o acomodar</span>}</button>{(caption || editor) && <figcaption><span className="section-photo-rule" />{text(item ? { type: 'media', id: item.id, key: 'caption' } : { type: 'copy', key: spec.captionKey }, caption)}</figcaption>}</figure>;
  })}</div>;
}
