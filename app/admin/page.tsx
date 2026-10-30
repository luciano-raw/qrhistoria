import Admin from '@/components/admin';
import { configured } from '@/lib/server';
import { ThemeToggle } from '@/components/experience';
export const dynamic = 'force-dynamic';
export default function AdminPage() { return <><div className="admin-theme-switch"><ThemeToggle /></div><Admin configured={configured()} /></>; }
