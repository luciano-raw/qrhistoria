import type { Metadata } from 'next';
import './globals.css';
import './experience.css';
// Runs before first paint, so a saved dark preference does not flash a light page.
const themeScript = `(function(){try{var t=localStorage.getItem('siempre-cerca-theme');document.documentElement.dataset.theme=t==='dark'||t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;
export const metadata: Metadata = { title: 'Siempre cerca · Un lugar para recordar', description: 'Una historia compartida. Fotografías, voces y recuerdos que nos mantienen cerca.', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>; }
