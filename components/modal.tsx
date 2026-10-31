'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, onClose, busy = false, children, wide = false }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; before?.focus(); };
  }, []);
  return <dialog ref={dialog} className={`editor-modal ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}><X size={19} /></button></header>{children}</dialog>;
}
