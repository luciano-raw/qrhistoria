'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Heart, Leaf, Pencil, Play } from 'lucide-react';
import { Media, Memory, Profile, mediaUrl } from '@/lib/shared';
import { CopyKey, EditableTarget, MemorialEditor, pageCopy } from '@/lib/copy';
import { ScrollExperience, ThemeToggle } from './experience';
import MemoryForm from './memory-form';
import Modal from './modal';
import SectionPhotos from './section-photos';

export default function Memorial({ profile, media, memories, demo, editor }: { profile: Profile; media: Media[]; memories: Memory[]; demo: boolean; editor?: MemorialEditor }) {
  const [selected, setSelected] = useState<{ title: string; path: string; kind: string; caption?: string } | null>(null);
  const [visibleMemories, setVisibleMemories] = useState(memories);
  useEffect(() => setVisibleMemories(memories), [memories]);
  const copy = (key: CopyKey) => profile.content?.[key] ?? pageCopy[key];
  function text(target: EditableTarget, value: string) {
    if (!editor) return value;
    return <span role="button" tabIndex={0} className="editable-text" title="Editar este texto" onClick={e => { e.preventDefault(); e.stopPropagation(); editor.onText(target, value); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editor.onText(target, value); } }}>{value || 'Añadir texto'}<Pencil size={12} aria-hidden="true" /></span>;
  }
  const c = (key: CopyKey) => text({ type: 'copy', key }, copy(key));
  const p = (key: 'name' | 'subtitle' | 'introduction' | 'quote') => text({ type: 'profile', key }, profile[key]);
  const album = media.filter(item => !item.placement || item.placement === 'album');
  const photos = (slots: Parameters<typeof SectionPhotos>[0]['slots'], variant: 'triptych' | 'feature' | 'companions' = 'feature') => <SectionPhotos slots={slots} variant={variant} profile={profile} media={media} editor={editor} text={text} onOpen={setSelected} />;
  return <div className={editor ? 'memorial editing-memorial' : 'memorial'}>
    {!editor && <ScrollExperience />}
    {demo && !editor && <div className="demo-banner">Vista previa · Este espacio está esperando su historia. <a href="/admin">Preparar el homenaje <ArrowUpRight size={12} /></a></div>}
    <header className="site-header"><a className="wordmark" href="#"><Leaf size={20} strokeWidth={1.3} /> siempre cerca<span className="brand-dot">.</span></a><nav aria-label="Navegación principal"><a href="#historia">Su historia</a><a href="#momentos">Momentos</a><a href="#recuerdos">Recuerdos</a><a href="/galeria">Galería</a></nav><div className="header-actions"><ThemeToggle /><a href="#compartir" className="header-share">Dejar un recuerdo <Heart size={14} /></a></div></header>
    <main>
      <section className="hero wrap">
        <div className="hero-copy"><span className="eyebrow"><span />{c('eyebrow')}</span><h1>{p('name')}</h1><p className="hero-subtitle">{p('subtitle')}</p><a className="button" href="#momentos">Volver a los momentos <ArrowDown size={15} /></a><div className="hero-note"><span className="small-line" />{c('heroNote')}</div></div>
        <div className="hero-art"><span className="handwritten top-note">{c('photoTop')}</span><div className="photo-frame"><div className="hero-image-slot">{profile.heroPath ? editor ? <img className="hero-photo" src={mediaUrl(profile.heroPath)} alt={`Un momento de ${profile.name}`} fetchPriority="high" /> : <button type="button" className="hero-open" aria-label="Ampliar fotografía de portada" onClick={() => setSelected({ title: profile.name, kind: 'image', path: profile.heroPath! })}><img className="hero-photo" src={mediaUrl(profile.heroPath)} alt={`Un momento de ${profile.name}`} fetchPriority="high" /></button> : <div className="photo-placeholder"><div className="sun" /><div className="hill far" /><div className="hill near" /><Leaf size={64} strokeWidth={.65} /><span>Aquí, su fotografía favorita</span></div>}{editor && <button type="button" className="edit-photo-overlay" onClick={() => editor.onImage('hero')}><Pencil size={18} /> Editar fotografía de portada</button>}</div><div className="photo-signature">{c('photoSignature')}</div></div><span className="handwritten bottom-note">{c('photoBottom')}</span><span className="photo-corner" /></div>
        {photos(['hero-2', 'hero-3'], 'companions')}
      </section>
      <div className="ribbon"><span>SU HISTORIA</span><span>·</span><span>NUESTRAS MEMORIAS</span><Leaf size={18} strokeWidth={1} /><span>EL AMOR QUE SE QUEDA</span><span>·</span><span>SIEMPRE CERCA</span></div>
      <section className="story wrap" id="historia"><div><span className="eyebrow">{c('storyLabel')}</span><h2>{c('storyTitle')}<br /><em>{c('storyEmphasis')}</em></h2></div><div className="story-text"><p>{p('introduction')}</p><div className="signature"><Leaf size={22} strokeWidth={1} /><span>{c('signature')}</span></div></div>{photos(['story-1', 'story-2', 'story-3'], 'triptych')}</section>
      <section className="moments-section" id="momentos"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">{c('albumLabel')}</span><h2>{c('albumTitle')}<br /><em>{c('albumEmphasis')}</em></h2></div><p className="preserve-lines">{c('albumDescription')}</p></div>
        {photos(['album-feature'])}
        {album.length ? <div className="gallery">{album.map((item, i) => <article key={item.id} className={`album-card card-${i % 3}`}>
          <button type="button" className="album-open" aria-label={editor && item.kind === 'image' ? `Editar fotografía: ${item.title}` : `Abrir ${item.title}`} onClick={() => editor && item.kind === 'image' ? editor.onImage(item.id) : setSelected(item)}><div className="album-image">{item.kind === 'image' ? <img src={mediaUrl(item.path)} alt={item.title} loading="lazy" /> : <div className="video-cover"><Play size={32} strokeWidth={1} /><span>Escuchar y volver</span></div>}<span className="image-open">{editor && item.kind === 'image' ? <Pencil size={17} /> : item.kind === 'video' ? <Play size={17} /> : <ArrowUpRight size={18} />}</span></div></button>
          {editor && !item.published && <span className="badge">Borrador</span>}
          <span className="album-year">{text({ type: 'media', id: item.id, key: 'year' }, item.year || (editor ? '' : 'UN MOMENTO JUNTOS'))}</span><h3>{text({ type: 'media', id: item.id, key: 'title' }, item.title)}</h3>{(item.caption || editor) && <p>{text({ type: 'media', id: item.id, key: 'caption' }, item.caption)}</p>}
        </article>)}</div> : <div className="empty-album"><Leaf size={35} strokeWidth={.8} /><h3>{c('albumEmpty')}</h3><p>{c('albumEmptyDescription')}</p></div>}
        {editor && <button type="button" className="secondary add-visual-photo" onClick={() => editor.onImage('new')}><Pencil size={15} /> Añadir una fotografía al álbum</button>}
        <div className="gallery-invitation"><div><span className="eyebrow">PARA RECORRER CON CALMA</span><h3>{c('galleryTitle')}</h3><p>{c('galleryDescription')}</p></div><a className="button" href="/galeria">Entrar a la galería <ArrowUpRight size={18} /></a></div>
      </div></section>
      <section className="quote-section wrap"><span className="quote-mark">“</span><blockquote>{p('quote')}</blockquote><div className="quote-rule"><span /><Heart size={15} strokeWidth={1} /><span /></div>{photos(['quote-photo'])}</section>
      <section className="memories-section" id="recuerdos"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">{c('memoriesLabel')}</span><h2>{c('memoriesTitle')}<br /><em>{c('memoriesEmphasis')}</em></h2></div><a className="text-link" href="#compartir">Comparte el tuyo <ArrowUpRight size={17} /></a></div>
        {photos(['memories-feature'])}
        {visibleMemories.length ? <div className="memory-grid">{visibleMemories.map(memory => <article className="memory-card" key={memory.id}><span className="memory-quote">“</span><p>{memory.message}</p>{!!memory.photos?.length && <div className="memory-photos">{memory.photos.map((photo, i) => <button type="button" key={photo.path} aria-label={`Ampliar foto ${i + 1} del recuerdo de ${memory.name}`} onClick={() => setSelected({ title: `Un recuerdo de ${memory.name}`, kind: 'image', path: photo.path })}><img src={mediaUrl(photo.path)} alt={`Foto ${i + 1} compartida por ${memory.name}`} loading="lazy" /></button>)}</div>}<footer><span className="memory-avatar">{memory.name[0]}</span><span>{memory.name}<small>{new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date(memory.createdAt))}</small></span><Heart size={15} strokeWidth={1} /></footer></article>)}</div> : <div className="empty-memories"><p>{c('memoriesEmpty')}</p><span>{c('memoriesEmptyNote')}</span></div>}
      </div></section>
      <section className="share-section wrap" id="compartir"><div><span className="eyebrow">{c('shareLabel')}</span><h2>{c('shareTitle')}<br /><em>{c('shareEmphasis')}</em></h2><p className="preserve-lines">{c('shareDescription')}</p><div className="privacy-note"><Heart size={18} strokeWidth={1} /><span>Cada recuerdo encuentra su lugar aquí.<br />La familia cuida este espacio compartido.</span></div></div><MemoryForm disabled={demo} editing={!!editor} onCreated={memory => setVisibleMemories(current => [memory, ...current])} /></section>
      <section className="closing-photos wrap">{photos(['closing-photo'])}</section>
    </main>
    <footer className="site-footer wrap"><a className="wordmark" href="#"><Leaf size={20} strokeWidth={1} /> siempre cerca.</a><p>{c('footer')}</p>{!editor && <a href="/admin">Acceso familiar <ArrowUpRight size={12} /></a>}</footer>
    {selected && <Modal title={selected.title} onClose={() => setSelected(null)} fullscreen><div className="media-viewer" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>{selected.kind === 'image' ? <img src={mediaUrl(selected.path)} alt={selected.title} /> : <video src={mediaUrl(selected.path)} controls preload="metadata" playsInline />}{selected.caption && <p>{selected.caption}</p>}</div></Modal>}
  </div>;
}
