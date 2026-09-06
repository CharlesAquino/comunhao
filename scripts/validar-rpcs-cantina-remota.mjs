import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projects = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'list', '--output', 'json'], { encoding: 'utf8' }));
const project = projects.find(item => item.status === 'ACTIVE_HEALTHY') ?? projects[0];
const keys = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', project.id, '--output', 'json'], { encoding: 'utf8' }));
const serviceKey = keys.find(item => item.name === 'service_role' || item.type === 'service_role')?.api_key;
const client = createClient(`https://${project.id}.supabase.co`, serviceKey, { auth: { persistSession: false } });

for (const [name, args] of [
  ['cantina_listar_vitrine', undefined],
  ['cantina_listar_estoque_evento', { p_evento_id: 'a2e0235d-1982-423d-9845-139a68126048' }],
  ['cantina_listar_retiradas_evento', { p_evento_id: 'a2e0235d-1982-423d-9845-139a68126048' }],
]) {
  const { data, error } = await client.rpc(name, args);
  console.log(JSON.stringify({ rpc: name, ok: !error, error: error && { code: error.code, message: error.message, details: error.details, hint: error.hint }, rows: Array.isArray(data) ? data.length : null }, null, 2));
}
