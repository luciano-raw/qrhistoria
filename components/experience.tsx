'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    setDark(next);
    try { localStorage.setItem('siempre-cerca-theme', next ? 'dark' : 'light'); } catch { /* The selected theme still works when browser storage is unavailable. */ }
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={dark} title={dark ? 'Modo claro' : 'Modo oscuro'}>{dark ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />}</button>;
}

export function ScrollExperience() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches || !('IntersectionObserver' in window)) return;
    const selector = '.hero-copy > *, .hero-art, .story > *, .section-heading > *, .album-card, .empty-album, .quote-section > *, .memory-card, .empty-memories, .share-section > *, .site-footer > *';
    const nodes = [...document.querySelectorAll<HTMLElement>(selector)];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    nodes.forEach((node, index) => {
      node.classList.add('reveal');
      node.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 75}ms`);
      // Never hide the hero while waiting for observation; it is the first visible content.
      if (node.getBoundingClientRect().top < window.innerHeight) node.classList.add('is-visible');
      else observer.observe(node);
    });
    const showAll = () => { if (preference.matches) { nodes.forEach(node => node.classList.add('is-visible')); observer.disconnect(); } };
    preference.addEventListener('change', showAll);
    return () => { observer.disconnect(); preference.removeEventListener('change', showAll); nodes.forEach(node => { node.classList.remove('reveal', 'is-visible'); node.style.removeProperty('--reveal-delay'); }); };
  }, []);
  return null;
}
