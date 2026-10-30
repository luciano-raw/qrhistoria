import { createClient } from '@supabase/supabase-js';
let client: ReturnType<typeof createClient> | undefined;
export function supabase() { return client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }
