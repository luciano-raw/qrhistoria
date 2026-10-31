'use client';
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import Modal from './modal';
import { Crop, compressImage } from '@/lib/image';
import { formatBytes } from '@/lib/shared';
export default function ImageCropModal({ file, initialUrl, aspect: fixedAspect, compact = false, preserveOriginal = false, onSave, onClose }: { file?: File; initialUrl?: string; aspect?: number; compact?: boolean; preserveOriginal?: boolean; onSave: (blob: Blob) => Promise<void> | void; onClose: () => void }) {
  const [source, setSource] = useState(initialUrl || '');
  const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Crop | null>(null); const [aspect, setAspect] = useState(fixedAspect || 4 / 3);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [prepared, setPrepared] = useState<Blob | null>(null); const [preview, setPreview] = useState('');
  const operation = useRef(false);
  const originalAspectApplied = useRef(false);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setSource(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { if (!prepared) { setPreview(''); return; } const url = URL.createObjectURL(prepared); setPreview(url); return () => URL.revokeObjectURL(url); }, [prepared]);
  async function prepare(save = false) {
    if (!area || !source || operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try {
      const blob = prepared || await compressImage(source, area, compact ? { maxDimension: 1920, targetBytes: 200 * 1024, maxBytes: 500 * 1024 } : {});
      setPrepared(blob);
      if (save) await onSave(blob);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos preparar esta foto. Prueba subiendo el archivo original.'); }
    finally { operation.current = false; setBusy(false); }
  }
  return <Modal title="Acomoda tu fotografía" onClose={onClose} busy={busy} wide>
    <p className="modal-description">Arrastra la foto y ajusta el acercamiento. Pulsa «Usar esta fotografía» para comprimir y guardar el encuadre; la vista previa es opcional.</p>
    {!source && <p>Preparando fotografía…</p>}
    {source && <><div className="crop-stage" inert={busy}><Cropper image={source} crop={crop} zoom={zoom} aspect={aspect} onCropChange={value => { setCrop(value); setPrepared(null); }} onZoomChange={value => { setZoom(value); setPrepared(null); }} onCropComplete={(_percent, pixels) => setArea(pixels)} onMediaLoaded={size => { setError(''); const ratio = size.naturalWidth / size.naturalHeight; setNaturalAspect(ratio); if (preserveOriginal && !fixedAspect && !originalAspectApplied.current) { originalAspectApplied.current = true; setAspect(ratio); } }} mediaProps={{ onError: () => setError('No pudimos abrir esta foto. Cierra esta ventana y prueba subiendo el archivo original.') }} /></div>
    <div className="crop-controls">{!fixedAspect && <label>Formato<select disabled={busy} value={aspect} onChange={e => { setAspect(Number(e.target.value)); setPrepared(null); }}>{naturalAspect && preserveOriginal && <option value={naturalAspect}>Fotografía completa</option>}<option value={4 / 3}>Horizontal · 4:3</option><option value={3 / 4}>Retrato · 3:4</option><option value={1}>Cuadrada · 1:1</option><option value={16 / 9}>Panorámica · 16:9</option></select></label>}<label>Acercamiento<input disabled={busy} type="range" min={1} max={3} step={.05} value={zoom} onChange={e => { setZoom(Number(e.target.value)); setPrepared(null); }} /></label></div>
    <button type="button" className="secondary" onClick={() => prepare()} disabled={busy || !area}>{busy ? 'Procesando la fotografía…' : 'Ver vista previa (opcional)'}</button></>}
    {prepared && <div className="optimized-preview"><img src={preview} alt="Así quedará tu fotografía" /><span>Así quedará · {formatBytes(prepared.size)}<small>{file && prepared.size < file.size ? `${Math.min(99.9, (1 - prepared.size / file.size) * 100).toFixed(1)}% menos espacio. ` : ''}Solo se guardará esta versión optimizada.</small></span></div>}
    <p role="alert" className="error">{error}</p><div className="modal-actions"><button type="button" className="ghost" onClick={onClose} disabled={busy}>Cancelar</button><button type="button" className="button" disabled={busy || !area || !source} onClick={() => prepare(true)}>{busy ? 'Procesando…' : 'Usar esta fotografía'}</button></div>
  </Modal>;
}
