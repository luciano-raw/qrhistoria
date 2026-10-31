'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Eye, ImagePlus, Leaf, LogOut, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/browser';
import { Media, Memory, Profile, formatBytes, initialProfile, mediaUrl } from '@/lib/shared';
import { AdminAPI } from '@/lib/admin-upload';
import ImageCropModal from './image-crop-modal';
import VisualEditor, { PhotoEditor } from './visual-editor';

type Tab = 'profile' | 'visual' | 'album' | 'memories';
function PreparedImage({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const url = URL.createObjectURL(blob); setUrl(url); return () => URL.revokeObjectURL(url); }, [blob]);
  return <div className="optimized-preview"><img src={url} alt="Recorte preparado" /><span>Lista para subir · {formatBytes(blob.size)}<small>Se guardará únicamente esta versión comprimida.</small></span></div>;
}
function AlbumUpload({ api, onSaved }: { api: AdminAPI; onSaved: (message?: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null); const [prepared, setPrepared] = useState<Blob | null>(null); const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const form = useRef<HTMLFormElement>(null);
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!file || busy) return;
    const kind = file.type.startsWith('image/') ? 'image' : 'video'; const blob = kind === 'image' ? prepared : file;
    if (!blob) { setError('Acomoda primero la fotografía.'); return; }
    const fields = new FormData(e.currentTarget); setBusy(true); setError(''); let path: string | undefined;
    try {
      const signed = await api({ action: 'upload', value: { kind, bytes: blob.size } }); path = signed.path;
      if (!path || !signed.token) throw new Error('No pudimos preparar la subida.');
      const { error } = await supabase().storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'memorias').uploadToSignedUrl(path, signed.token, blob, { contentType: kind === 'image' ? 'image/webp' : 'video/mp4', cacheControl: '31536000' });
      if (error) throw new Error('No pudimos subir el archivo.');
      await api({ action: 'createMedia', value: { title: fields.get('title'), caption: fields.get('caption'), year: fields.get('year'), kind, path } });
      path = undefined; setFile(null); setPrepared(null); form.current?.reset(); await onSaved('Archivo guardado como borrador.');
    } catch (e) { if (path) await api({ action: 'discardUpload', path }).catch(() => {}); setError(e instanceof Error ? e.message : 'No pudimos subir el archivo.'); }
    finally { setBusy(false); }
  }
  return <><form ref={form} onSubmit={upload}><label className="file-label"><ImagePlus size={25} /> Elige una fotografía o un video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={busy} onChange={e => {
    const value = e.currentTarget.files?.[0]; setError(''); setPrepared(null);
    if (!value) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(value.type) || value.size > (value.type.startsWith('image/') ? 40 : 25) * 1024 * 1024) { setError('Usa JPG, PNG o WebP de menos de 40 MB, o MP4 de menos de 25 MB.'); e.currentTarget.value = ''; return; }
    setFile(value); if (value.type.startsWith('image/')) setCropOpen(true);
  }} /></label>
    {file && <div className="upload-workspace"><p>{file.name} · Original: {formatBytes(file.size)}</p>{file.type.startsWith('image/') ? <>{prepared && <PreparedImage blob={prepared} />}<button type="button" className="secondary" disabled={busy} onClick={() => setCropOpen(true)}>Acomodar fotografía</button></> : <p className="setup-note">MP4, máximo 25 MB. Prepara el video en H.264, 720p, AAC y Web Optimized antes de subirlo.</p>}
      <label>Título<input name="title" required maxLength={150} /></label><label>Fecha o época<input name="year" maxLength={40} /></label><label>La historia detrás<textarea name="caption" maxLength={2000} rows={3} /></label><button className="button" disabled={busy || file.type.startsWith('image/') && !prepared}>{busy ? 'Subiendo…' : 'Subir como borrador'}</button>
    </div>}<p role="alert" className="error">{error}</p></form>
    {file && cropOpen && <ImageCropModal file={file} onClose={() => setCropOpen(false)} onSave={blob => { setPrepared(blob); setCropOpen(false); }} />}
  </>;
}

export default function Admin({ configured }: { configured: boolean }) {
  const [token, setToken] = useState(''); const [checking, setChecking] = useState(configured);
  const [tab, setTab] = useState<Tab>('profile'); const [profile, setProfile] = useState<Profile>(initialProfile);
  const [media, setMedia] = useState<Media[]>([]); const [memories, setMemories] = useState<Memory[]>([]);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [photo, setPhoto] = useState<string | null>(null);
  const load = useCallback(async (accessToken: string) => {
    const response = await fetch('/api/admin', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }); const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setProfile(data.profile || initialProfile); setMedia(data.media); setMemories(data.memories);
  }, []);
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    supabase().auth.getSession().then(async ({ data }) => {
      try { if (data.session) { await load(data.session.access_token); if (alive) setToken(data.session.access_token); } }
      catch (e) { if (alive) setError(e instanceof Error ? e.message : 'No pudimos abrir tu sesión.'); }
      finally { if (alive) setChecking(false); }
    });
    const { data: listener } = supabase().auth.onAuthStateChange((event, session) => { if (alive && !session) setToken(''); if (alive && event === 'TOKEN_REFRESHED' && session) setToken(session.access_token); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [configured, load]);
  const api: AdminAPI = async body => {
    const { data } = await supabase().auth.getSession();
    const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || token}` }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  };
  async function refresh(message = 'Cambios guardados.') { const { data } = await supabase().auth.getSession(); await load(data.session?.access_token || token); setNotice(message); }
  async function action(body: object, message?: string) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { const result = await api(body); await refresh(result.warning || message); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar los cambios.'); }
    finally { setBusy(false); }
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return; const fields = new FormData(e.currentTarget); setBusy(true); setError('');
    try { const { data, error } = await supabase().auth.signInWithPassword({ email: String(fields.get('email')), password: String(fields.get('password')) }); if (error || !data.session) throw new Error('Revisa tu correo y contraseña.'); await load(data.session.access_token); setToken(data.session.access_token); }
    catch (e) { await supabase().auth.signOut(); setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.'); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="setup"><Leaf /><p>Abriendo tu espacio…</p></main>;
  if (!token || !configured) return <main className="login-page"><a href="/" className="back-link"><ArrowLeft size={15} /> Volver al homenaje</a><div className="login-card"><Leaf size={34} strokeWidth={1} /><span className="eyebrow">UN ESPACIO PARA CUIDAR SU HISTORIA</span><h1>Acceso familiar</h1><p>Prepara el álbum y acompaña los recuerdos de sus seres queridos.</p>{configured ? <form onSubmit={login}><label>Correo<input name="email" type="email" autoComplete="username" required /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label><button className="button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar a mi espacio'}</button></form> : <div className="setup-note">Para abrir el panel falta completar la conexión de Supabase. Las instrucciones están en el README del proyecto.</div>}<p role="alert" className="error">{error}</p></div></main>;
  const album = media.filter(item => item.placement !== 'hero');
  return <div className="admin-shell"><header className="admin-header"><a className="wordmark" href="/"><Leaf size={19} /> siempre cerca.</a><span>Tu espacio familiar</span><button className="ghost" onClick={() => supabase().auth.signOut()}><LogOut size={15} /> Salir</button></header>
    <main className={`admin-main ${tab === 'visual' ? 'visual-admin-main' : ''}`}>
      {tab !== 'visual' && <div className="admin-title"><span className="eyebrow">CUIDAR LO QUE QUEREMOS CONSERVAR</span><h1>Preparar su historia.</h1><p>Cada fotografía y cada palabra, en su lugar.</p></div>}
      <div className="admin-tabs" aria-label="Secciones de administración">{([['profile', 'La página'], ['visual', 'Editar en la web'], ['album', `Álbum · ${album.length}`], ['memories', `Recuerdos · ${memories.length}`]] as [Tab, string][]).map(([key, label]) => <button type="button" aria-pressed={tab === key} key={key} onClick={() => { setTab(key); setNotice(''); setError(''); }}>{key === 'visual' && <Pencil size={13} />} {label}</button>)}</div>
      <p role="status" className="success admin-notice">{notice}</p><p role="alert" className="error admin-notice">{error}</p>
      {tab === 'visual' && <VisualEditor profile={profile} media={media} memories={memories} api={api} onSaved={refresh} onBack={() => setTab('profile')} />}
      {tab === 'profile' && <section className="admin-panel"><h2>Las palabras de bienvenida</h2><p>Edita aquí o selecciona los textos directamente en la web.</p><button type="button" className="secondary" onClick={() => setTab('visual')}><Eye size={16} /> Editar sobre la página</button><form className="profile-form" onSubmit={e => { e.preventDefault(); action({ action: 'profile', value: profile }); }}>
        <label>Nombre o título de portada<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required maxLength={120} /></label>
        <label>Texto bajo el nombre<textarea value={profile.subtitle} onChange={e => setProfile({ ...profile, subtitle: e.target.value })} maxLength={300} rows={2} /></label>
        <label>Su historia<textarea value={profile.introduction} onChange={e => setProfile({ ...profile, introduction: e.target.value })} maxLength={6000} rows={7} /></label>
        <label>Una frase para recordar<textarea value={profile.quote} onChange={e => setProfile({ ...profile, quote: e.target.value })} maxLength={600} rows={2} /></label>
        <button className="button" disabled={busy}>Guardar textos <Check size={16} /></button>
      </form><div className="profile-photo"><h3>Fotografía de portada</h3>{profile.heroPath && <img src={mediaUrl(profile.heroPath)} alt="Portada actual" />}<button type="button" className="secondary" disabled={busy} onClick={() => setPhoto('hero')}><ImagePlus size={17} /> Cambiar o acomodar portada</button>{profile.heroPath && <button type="button" className="ghost danger" disabled={busy} onClick={() => action({ action: 'profile', value: { ...profile, heroPath: null } }, 'Portada retirada.')}>Retirar portada</button>}</div></section>}
      {tab === 'album' && <><section className="admin-panel"><div className="section-heading"><div><h2>Sumar un momento</h2><p>Las fotos se recortan y comprimen antes de subir.</p></div><span className="storage-total">Archivos: {formatBytes(media.reduce((sum, item) => sum + item.bytes, 0))}</span></div><AlbumUpload api={api} onSaved={refresh} /></section>
        <section className="admin-panel"><h2>El álbum</h2><p>Usa las flechas para acomodarlo. Las fotos de portada se administran en «La página».</p>{!album.length && <p className="empty-admin">Todavía no hay momentos en el álbum.</p>}<div className="admin-media-list">{album.map((item, i) => <article key={`${item.id}:${item.path}`} className="admin-media">
          <div>{item.kind === 'image' ? <><img className="admin-thumbnail" src={mediaUrl(item.path)} alt={item.title} loading="lazy" /><button className="secondary recrop-button" onClick={() => setPhoto(item.id)}>Ajustar foto</button></> : <div className="mini-video">Video<br />{formatBytes(item.bytes)}</div>}</div>
          <form onSubmit={e => { e.preventDefault(); const fields = new FormData(e.currentTarget); action({ action: 'updateMedia', value: { id: item.id, title: fields.get('title'), caption: fields.get('caption'), year: fields.get('year'), published: fields.get('published') === 'on' } }); }}><label>Título<input name="title" defaultValue={item.title} required maxLength={150} /></label><label>Fecha<input name="year" defaultValue={item.year} maxLength={40} /></label><label>Descripción<textarea name="caption" defaultValue={item.caption} maxLength={2000} rows={2} /></label><label className="checkbox"><input type="checkbox" name="published" defaultChecked={item.published} /> Visible en la página</label><button className="secondary" disabled={busy}>Guardar</button><small>{formatBytes(item.bytes)} · {item.published ? 'Publicado' : 'Borrador'}</small></form>
          <div className="media-actions"><button className="icon-button" aria-label={`Subir ${item.title}`} disabled={busy || i === 0} onClick={() => { const ids = album.map(item => item.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; action({ action: 'reorder', ids }); }}><ArrowUp size={17} /></button><button className="icon-button" aria-label={`Bajar ${item.title}`} disabled={busy || i === album.length - 1} onClick={() => { const ids = album.map(item => item.id); [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]; action({ action: 'reorder', ids }); }}><ArrowDown size={17} /></button><button className="icon-button danger" aria-label={`Eliminar ${item.title}`} disabled={busy} onClick={() => { if (confirm('¿Eliminar este archivo del álbum y de Storage? Conserva antes una copia del original.')) action({ action: 'deleteMedia', id: item.id }, 'Archivo eliminado.'); }}><Trash2 size={17} /></button></div>
        </article>)}</div></section></>}
      {tab === 'memories' && <section className="admin-panel"><h2>Palabras que nos acercan</h2><p>Los nuevos recuerdos se publican al enviarse. Puedes ocultarlos o volver a mostrarlos cuando quieras.</p>{!memories.length && <p className="empty-admin">Los recuerdos aparecerán aquí cuando alguien comparta uno.</p>}{memories.map(memory => <article className="moderation-card" key={memory.id}><span className={`badge ${memory.approved ? 'approved' : ''}`}>{memory.approved ? 'Visible' : 'Oculto'}</span><h3>{memory.name}</h3><p>{memory.message}</p>{!!memory.photos?.length && <div className="moderation-photos">{memory.photos.map((photo, i) => <a key={photo.path} href={mediaUrl(photo.path)} target="_blank" rel="noreferrer"><img src={mediaUrl(photo.path)} alt={`Foto ${i + 1} compartida por ${memory.name}`} loading="lazy" /></a>)}</div>}<small>{new Date(memory.createdAt).toLocaleString('es-CL')}</small><div className="moderation-actions"><button className="secondary" disabled={busy} onClick={() => action({ action: 'memory', value: { id: memory.id, approved: !memory.approved } }, memory.approved ? 'Recuerdo oculto de la web.' : 'Recuerdo visible otra vez.')}>{memory.approved ? 'Ocultar de la web' : 'Volver a mostrar'}</button><button className="ghost danger" disabled={busy} onClick={() => { if (confirm('¿Eliminar definitivamente el recuerdo y sus fotografías?')) action({ action: 'deleteMemory', id: memory.id }, 'Recuerdo eliminado.'); }}><Trash2 size={15} /> Eliminar</button></div></article>)}</section>}
    </main>
    {photo && <PhotoEditor target={photo} profile={profile} media={media} api={api} onSaved={refresh} onClose={() => setPhoto(null)} />}
  </div>;
}
