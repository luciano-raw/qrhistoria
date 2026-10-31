'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Images, Leaf, Maximize2, Pause, Play, Square } from 'lucide-react';
import { GalleryPhoto, Profile, mediaUrl } from '@/lib/shared';
import { slideDuration, slideIndex } from '@/lib/gallery-selection.mjs';
import { pageCopy } from '@/lib/copy';
import { ThemeToggle } from './experience';
import Modal from './modal';

function DisplayPhoto({ photo, previous = false, seconds, playing, layout }: { photo: GalleryPhoto; previous?: boolean; seconds: number; playing: boolean; layout: number }) {
  const [failed, setFailed] = useState(false);
  return <figure className={`display-slide ${previous ? 'departing' : 'arriving'} layout-${layout % 3}`} aria-hidden={previous || undefined} style={{ '--display-time': `${seconds}s` } as CSSProperties}>
    <div className="display-ambience" style={{ backgroundImage: `url("${mediaUrl(photo.path)}")` }} />
    <div className="display-grain" />
    <div className="display-photo-mat" style={{ animationPlayState: playing ? 'running' : 'paused' }}>{failed ? <div className="display-unavailable"><Heart size={30} /><p>Este recuerdo no pudo cargarse.</p><span>Puedes avanzar a la siguiente fotografía.</span></div> : <img src={mediaUrl(photo.path)} alt={photo.title} onError={() => setFailed(true)} draggable={false} />}</div>
    <figcaption><span className="eyebrow">UN INSTANTE QUE SE QUEDA</span><h2>{photo.title}</h2>{photo.caption && <p>{photo.caption}</p>}<span className="display-credit">{photo.credit}</span></figcaption>
  </figure>;
}

export default function Gallery({ initialPhotos, profile }: { initialPhotos: GalleryPhoto[]; profile: Profile }) {
  const [all, setAll] = useState(initialPhotos); const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
  const [presenting, setPresenting] = useState(false); const [playing, setPlaying] = useState(false); const [active, setActive] = useState('');
  const [previous, setPrevious] = useState<GalleryPhoto | null>(null); const [seconds, setSeconds] = useState(8); const [status, setStatus] = useState('');
  const [visible, setVisible] = useState(true); const [controls, setControls] = useState(true); const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const stage = useRef<HTMLDivElement>(null); const open = useRef(false); const nativeOwned = useRef(false); const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const photos = useMemo(() => all.filter(photo => (filter === 'all' || photo.source === filter) && `${photo.title} ${photo.caption} ${photo.credit}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))), [all, filter, search]);
  const index = Math.max(0, photos.findIndex(photo => photo.id === active)); const current = photos[index];
  const close = useCallback(() => {
    open.current = false; setPresenting(false); setPlaying(false); setPrevious(null);
    if (nativeOwned.current && document.fullscreenElement) { nativeOwned.current = false; void document.exitFullscreen().catch(() => {}); }
  }, []);
  const revealControls = useCallback(() => {
    setControls(true); if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!stage.current?.parentElement?.contains(document.activeElement) || document.activeElement === stage.current) setControls(false); }, 4500);
  }, []);
  const advance = useCallback((direction: number) => {
    if (!photos.length) return;
    setPrevious(current || null); setActive(photos[slideIndex(index, direction, photos.length)].id);
  }, [photos, index, current]);
  async function fullscreen() {
    if (!document.documentElement.requestFullscreen || document.fullscreenElement) return;
    try { await document.documentElement.requestFullscreen(); if (open.current) nativeOwned.current = true; else await document.exitFullscreen(); }
    catch { setStatus('La presentación funciona en esta ventana. El navegador no permitió la pantalla completa.'); }
  }
  function start(photo: GalleryPhoto, autoplay: boolean) { setStatus(''); setActive(photo.id); setPrevious(null); open.current = true; setPresenting(true); setPlaying(autoplay); revealControls(); if (autoplay) void fullscreen(); }

  useEffect(() => {
    try { setSeconds(slideDuration(localStorage.getItem('siempre-cerca-slide-seconds') || 8)); } catch {}
    setFullscreenAvailable(!!document.fullscreenEnabled && !!document.documentElement.requestFullscreen);
    const visibility = () => setVisible(!document.hidden);
    const full = () => { if (nativeOwned.current && !document.fullscreenElement) { nativeOwned.current = false; close(); } };
    document.addEventListener('visibilitychange', visibility); document.addEventListener('fullscreenchange', full);
    return () => { document.removeEventListener('visibilitychange', visibility); document.removeEventListener('fullscreenchange', full); if (hideTimer.current) clearTimeout(hideTimer.current); if (nativeOwned.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [close]);
  useEffect(() => {
    const controller = new AbortController(); let pending = false;
    const refresh = async () => {
      if (document.hidden || pending) return; pending = true;
      try { const response = await fetch('/api/gallery', { cache: 'no-store', signal: controller.signal }); if (!response.ok) return; const result = await response.json(); if (Array.isArray(result.photos)) setAll(current => JSON.stringify(current) === JSON.stringify(result.photos) ? current : result.photos); }
      catch {} finally { pending = false; }
    };
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => { if (!presenting || !playing || !visible || photos.length < 2) return; const timer = setTimeout(() => advance(1), seconds * 1000); return () => clearTimeout(timer); }, [presenting, playing, visible, photos.length, seconds, advance]);
  useEffect(() => { if (presenting && !photos.length) setPlaying(false); }, [presenting, photos.length]);
  useEffect(() => { if (!previous) return; const timer = setTimeout(() => setPrevious(null), 1200); return () => clearTimeout(timer); }, [previous]);
  useEffect(() => {
    if (!presenting) return;
    stage.current?.focus({ preventScroll: true }); revealControls();
  }, [presenting, revealControls]);
  useEffect(() => {
    if (!presenting) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea,button')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); advance(1); revealControls(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); revealControls(); }
      if (e.code === 'Space') { e.preventDefault(); setPlaying(value => !value); revealControls(); }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, [presenting, advance, revealControls]);
  useEffect(() => {
    if (!presenting || !photos.length) return;
    for (const offset of [1, 2]) { const photo = photos[slideIndex(index, offset, photos.length)]; if (photo.id !== current?.id) { const image = new Image(); image.src = mediaUrl(photo.path); } }
  }, [presenting, index, photos, current?.id]);
  useEffect(() => {
    if (!presenting || !playing || !visible || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | undefined; let cancelled = false;
    navigator.wakeLock.request('screen').then(lock => { if (cancelled) void lock.release(); else sentinel = lock; }).catch(() => {});
    return () => { cancelled = true; void sentinel?.release().catch(() => {}); };
  }, [presenting, playing, visible]);

  return <div className="gallery-page"><header className="site-header"><a className="wordmark" href="/"><Leaf size={20} /> siempre cerca.</a><div className="header-actions"><ThemeToggle /><a className="text-link" href="/"><ArrowLeft size={16} /> Volver a la historia</a></div></header>
    <main className="wrap"><section className="gallery-heading"><div><span className="eyebrow">EL ÁLBUM COMPLETO</span><h1>{profile.content?.galleryTitle ?? pageCopy.galleryTitle}</h1><p>{profile.content?.galleryDescription ?? pageCopy.galleryDescription}</p></div><button className="button" disabled={!photos.length} onClick={() => start(photos[0], true)}><Play size={18} /> Iniciar presentación</button></section>
      <div className="gallery-explanation"><Images size={25} strokeWidth={1} /><p>Toca cualquier foto para ampliarla. La presentación recorre las imágenes en bucle y permite ajustar el tiempo de cada una. En un PC puedes usar pantalla completa y mostrar esta ventana en la pantalla conectada por HDMI.</p></div>
      <div className="gallery-filters"><div aria-label="Colección de fotografías">{[['all', 'Todas'], ['family', 'Familia'], ['visitors', 'Recuerdos compartidos']].map(([value, label]) => <button key={value} className="secondary" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><label>Buscar una foto o familia<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Un nombre, una fecha, un momento…" type="search" /></label></div>
      <p className="gallery-count">{photos.length} fotografía{photos.length === 1 ? '' : 's'}</p>
      {photos.length ? <div className="photo-gallery-grid">{photos.map(photo => <button type="button" key={photo.id} className="photo-gallery-card" onClick={() => start(photo, false)}><img src={mediaUrl(photo.path)} alt={photo.title} loading="lazy" decoding="async" /><span><strong>{photo.title}</strong><small>{photo.credit}</small></span></button>)}</div> : <div className="empty-album"><Leaf size={35} /><h2>{search || filter !== 'all' ? 'No encontramos fotografías con ese filtro.' : 'Aquí iremos reuniendo todos los momentos.'}</h2><p>Las fotos publicadas de la familia y las de los recuerdos visibles aparecerán aquí.</p></div>}
      <p className="gallery-bottom-note">Los mensajes e historias de cada persona están en <a href="/#recuerdos">los recuerdos de la página principal</a>. Aquí reunimos sus fotografías.</p>
    </main>
    {presenting && <Modal title={profile.name} fullscreen className="presentation-modal" onClose={close}><div ref={stage} tabIndex={0} className={`presentation-body ${controls || !playing ? 'controls-visible' : ''}`} onPointerMove={revealControls} onFocusCapture={revealControls}>
      <div className="presentation-stage" onPointerDown={() => stage.current?.focus({ preventScroll: true })} onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; revealControls(); }} onTouchEnd={e => { if (!touch.current) return; const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) advance(dx < 0 ? 1 : -1); touch.current = null; }}>
        {previous && previous.id !== current?.id && photos.some(photo => photo.id === previous.id) && <DisplayPhoto key={`previous:${previous.id}`} photo={previous} previous seconds={seconds} playing layout={photos.findIndex(photo => photo.id === previous.id)} />}
        {current ? <DisplayPhoto key={current.id} photo={current} seconds={seconds} playing={playing} layout={index} /> : <div className="display-empty"><p>No hay fotografías visibles en esta colección.</p><button className="secondary" onClick={close}>Volver a la galería</button></div>}
      </div>
      <div className="presentation-controls"><div className="playback-buttons"><button type="button" aria-label="Foto anterior" onClick={() => { advance(-1); revealControls(); }} disabled={photos.length < 2}><ChevronLeft size={24} /></button><button type="button" aria-label={playing ? 'Pausar presentación' : 'Reproducir presentación'} onClick={() => { setPlaying(value => !value); revealControls(); }}>{playing ? <Pause size={24} /> : <Play size={24} />}</button><button type="button" aria-label="Foto siguiente" onClick={() => { advance(1); revealControls(); }} disabled={photos.length < 2}><ChevronRight size={24} /></button><button type="button" aria-label="Detener y volver a la galería" onClick={close}><Square size={19} /></button></div><label className="display-speed">{seconds} segundos por foto<input type="range" min={3} max={30} step={1} value={seconds} onChange={e => { const value = slideDuration(e.target.value); setSeconds(value); revealControls(); try { localStorage.setItem('siempre-cerca-slide-seconds', String(value)); } catch {} }} /></label><span className="display-position">{current ? index + 1 : 0} / {photos.length}</span>{fullscreenAvailable && <button type="button" className="display-fullscreen" aria-label="Usar pantalla completa" onClick={() => void fullscreen()}><Maximize2 size={19} /></button>}<span className="display-help">Escape para salir</span></div>
      {status && <p className="display-status" role="status">{status}</p>}
    </div></Modal>}
  </div>;
}
