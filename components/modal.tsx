'use client';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, onClose, busy = false, children, wide = false, fullscreen = false }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode; wide?: boolean; fullscreen?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; before?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} className={`editor-modal ${wide ? 'wide' : ''} ${fullscreen ? 'fullscreen-viewer' : ''}`} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label={fullscreen ? 'Cerrar y volver a la página' : 'Cerrar ventana'} onClick={onClose} disabled={busy}><X size={fullscreen ? 26 : 19} /></button></header>{children}</dialog>;
}
