import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

let environment = {};
try { environment = parse(readFileSync('.env')); } catch { /* Can also run in a checkout with no local secrets. */ }
const needles = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RATE_LIMIT_SECRET'].map(key => environment[key]).filter(value => value && value.length > 10);
for (const key of ['DATABASE_URL', 'DIRECT_URL']) if (environment[key]) {
  const password = decodeURIComponent(new URL(environment[key]).password);
  if (password.length >= 8) needles.push(password);
}
const files = execFileSync('git', ['ls-files', '-z', '--cached'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const problems = [];
for (const file of files) {
  if (/^\.env(?:\.|$)/.test(file) && file !== '.env.example') { problems.push(file); continue; }
  // Read the index rather than the working tree: only staged content will be published.
  const content = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (needles.some(secret => content.includes(secret))) problems.push(file);
}
if (problems.length) { console.error('Se detectaron credenciales en archivos preparados:', problems.join(', ')); process.exitCode = 1; }
else console.log(`Revisión completada: ${files.length} archivos, sin credenciales locales en el índice.`);
