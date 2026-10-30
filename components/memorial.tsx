'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Heart, Leaf, Play, X } from 'lucide-react';
import { Media, Memory, Profile, mediaUrl } from '@/lib/shared';
import { ScrollExperience, ThemeToggle } from '@/components/experience';
export default function Memorial({ profile, media, memories, demo }: { profile: Profile; media: Media[]; memories: Memory[]; demo: boolean }) {
  const [selected, setSelected] = useState<Media | null>(null);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    previousFocus.current = document.activeElement as HTMLElement;
    close.current?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); if (e.key === 'Tab') { const elements = document.querySelectorAll<HTMLElement>('.lightbox button, .lightbox video'); const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = before; document.removeEventListener('keydown', key); previousFocus.current?.focus(); };
  }, [selected]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (sending) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSending(true); setStatus('');
    try { const response = await fetch('/api/memories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setStatus('Gracias por compartirlo. La familia revisará tu recuerdo antes de publicarlo.'); form.reset(); }
    catch (e) { setStatus(e instanceof Error ? e.message : 'No pudimos enviar tu recuerdo. Inténtalo otra vez.'); }
    finally { setSending(false); }
  }
  return <>
    <ScrollExperience />
    {demo && <div className="demo-banner">Vista previa · Este espacio está esperando su historia. <a href="/admin">Preparar el homenaje <ArrowUpRight size={12} /></a></div>}
    <header className="site-header"><a className="wordmark" href="#"><Leaf size={20} strokeWidth={1.3} /> siempre cerca<span className="brand-dot">.</span></a><nav aria-label="Navegación principal"><a href="#historia">Su historia</a><a href="#momentos">Momentos</a><a href="#recuerdos">Recuerdos</a></nav><div className="header-actions"><ThemeToggle /><a href="#compartir" className="header-share">Dejar un recuerdo <Heart size={14} /></a></div></header>
    <main>
      <section className="hero wrap">
        <div className="hero-copy"><span className="eyebrow"><span /> UN ÁLBUM HECHO DE CARIÑO</span><h1>{profile.name}</h1><p className="hero-subtitle">{profile.subtitle}</p><a className="button" href="#momentos">Volver a los momentos <ArrowDown size={15} /></a><div className="hero-note"><span className="small-line" /> Hay personas que hacen de la vida un hogar.</div></div>
        <div className="hero-art"><span className="handwritten top-note">lo más bonito es lo vivido</span><div className="photo-frame">{profile.heroPath ? <img className="hero-photo" src={mediaUrl(profile.heroPath)} alt={`Un momento de ${profile.name}`} fetchPriority="high" /> : <div className="photo-placeholder"><div className="sun" /><div className="hill far" /><div className="hill near" /><Leaf size={64} strokeWidth={.65} /><span>Aquí, su fotografía favorita</span></div>}<div className="photo-signature">Un instante. Toda una vida.</div></div><span className="handwritten bottom-note">para tenerte siempre cerca ♡</span><span className="photo-corner" /></div>
      </section>
      <div className="ribbon"><span>SU HISTORIA</span><span>·</span><span>NUESTRAS MEMORIAS</span><Leaf size={18} strokeWidth={1} /><span>EL AMOR QUE SE QUEDA</span><span>·</span><span>SIEMPRE CERCA</span></div>
      <section className="story wrap" id="historia"><div><span className="eyebrow">01 / LAS HUELLAS DE UNA VIDA</span><h2>Una historia que vive<br /><em>en nosotros.</em></h2></div><div className="story-text"><p>{profile.introduction}</p><div className="signature"><Leaf size={22} strokeWidth={1} /><span>Con todo el cariño, su familia.</span></div></div></section>
      <section className="moments-section" id="momentos"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">02 / NUESTRO ÁLBUM</span><h2>Pequeños instantes.<br /><em>Inmensos recuerdos.</em></h2></div><p>Fotografías, historias y su voz.<br />Un pedacito de todo lo compartido.</p></div>
      {media.length ? <div className="gallery">{media.map((item, i) => <button key={item.id} className={`album-card card-${i % 3}`} onClick={() => setSelected(item)}><div className="album-image">{item.kind === 'image' ? <img src={mediaUrl(item.path)} alt={item.title} loading="lazy" /> : <div className="video-cover"><Play size={32} strokeWidth={1} /><span>Escuchar y volver</span></div>}<span className="image-open">{item.kind === 'video' ? <Play size={17} /> : <ArrowUpRight size={18} />}</span></div><span className="album-year">{item.year || (item.kind === 'video' ? 'UNA VOZ QUE ACOMPAÑA' : 'UN MOMENTO JUNTOS')}</span><h3>{item.title}</h3>{item.caption && <p>{item.caption}</p>}</button>)}</div> : <div className="empty-album"><Leaf size={35} strokeWidth={.8} /><h3>Los recuerdos encontrarán su lugar aquí.</h3><p>Un álbum para esas fotografías y videos que siempre queremos volver a mirar.</p></div>}
      </div></section>
      <section className="quote-section wrap"><span className="quote-mark">“</span><blockquote>{profile.quote}</blockquote><div className="quote-rule"><span /><Heart size={15} strokeWidth={1} /><span /></div></section>
      <section className="memories-section" id="recuerdos"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">03 / LO QUE LLEVAMOS DENTRO</span><h2>Cada recuerdo,<br /><em>una forma de abrazar.</em></h2></div><a className="text-link" href="#compartir">Comparte el tuyo <ArrowUpRight size={17} /></a></div>
      {memories.length ? <div className="memory-grid">{memories.map(memory => <article className="memory-card" key={memory.id}><span className="memory-quote">“</span><p>{memory.message}</p><footer><span className="memory-avatar">{memory.name[0]}</span><span>{memory.name}<small>{new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date(memory.createdAt))}</small></span><Heart size={15} strokeWidth={1} /></footer></article>)}</div> : <div className="empty-memories"><p>Una anécdota, una enseñanza, una tarde cualquiera.</p><span>El primer recuerdo puede ser el tuyo.</span></div>}
      </div></section>
      <section className="share-section wrap" id="compartir"><div><span className="eyebrow">UNAS PALABRAS QUE SE QUEDAN</span><h2>¿Qué recuerdo<br /><em>guardas con él?</em></h2><p>No hace falta escribir algo perfecto.<br />Solo algo que nazca del cariño.</p><div className="privacy-note"><Heart size={18} strokeWidth={1} /><span>La familia leerá tu mensaje con cariño<br />antes de compartirlo en este espacio.</span></div></div><form className="memory-form" onSubmit={submit}><label>Tu nombre o el de tu familia<input name="name" placeholder="Por ejemplo, Familia González" required minLength={2} maxLength={80} autoComplete="name" /></label><label>Tu recuerdo<textarea name="message" placeholder="Siempre me voy a acordar de…" required minLength={10} maxLength={2000} rows={5} /></label><div className="honey" aria-hidden="true"><label>Deja este campo vacío<input name="website" tabIndex={-1} autoComplete="off" /></label></div><p className="form-consent">Al enviarlo, aceptas que tu nombre y recuerdo puedan publicarse aquí. Evita compartir datos privados de otras personas.</p><button className="button" disabled={sending || demo}>{sending ? 'Guardando…' : 'Enviar mi recuerdo'}<Heart size={15} /></button>{demo && <p className="form-note">Los envíos se habilitarán al conectar Supabase.</p>}<p role="status" className="form-status">{status}</p></form></section>
    </main><footer className="site-footer wrap"><a className="wordmark" href="#"><Leaf size={20} strokeWidth={1} /> siempre cerca.</a><p>Lo vivido juntos siempre encuentra cómo quedarse.</p><a href="/admin">Acceso familiar <ArrowUpRight size={12} /></a></footer>
    {selected && <div className="lightbox" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelected(null)}><button ref={close} className="lightbox-close" aria-label="Cerrar recuerdo" onClick={() => setSelected(null)}><X /></button><div className="lightbox-content" onClick={e => e.stopPropagation()}>{selected.kind === 'image' ? <img src={mediaUrl(selected.path)} alt={selected.title} /> : <video src={mediaUrl(selected.path)} controls preload="metadata" playsInline tabIndex={0} />}<h2>{selected.title}</h2><p>{selected.caption}</p></div></div>}
  </>;
}
