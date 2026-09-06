import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'csxrhvgfnkqmkehgmnkp';
const targetName = process.argv.slice(2).join(' ').trim();
if (!targetName) throw new Error('Informe o nome exato do gestor.');

const rawKeys = execFileSync('npx', [
  'supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const keys = JSON.parse(rawKeys);
const serviceKey = keys.find((item) => item.name === 'service_role' || item.type === 'service_role')?.api_key;
if (!serviceKey) throw new Error('Chave de serviço não encontrada.');

const supabase = createClient(`https://${projectRef}.supabase.co`, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users, error: userError } = await supabase
  .from('usuarios')
  .select('id, nome')
  .ilike('nome', `%${targetName}%`);
if (userError) throw userError;
if (users.length !== 1) {
  console.error(JSON.stringify({ correspondencias: users.map((item) => item.nome) }));
  throw new Error(`Esperada uma correspondência única; encontradas: ${users.length}.`);
}

const user = users[0];
const reason = 'Responsável de produto e gestor geral autorizado da Cantina';
const { error: assignmentError } = await supabase.from('admin_role_assignments').upsert({
  usuario_id: user.id,
  role_code: 'gestor_cantina',
  active: true,
  assigned_by: user.id,
  reason,
  updated_at: new Date().toISOString(),
}, { onConflict: 'usuario_id,role_code' });
if (assignmentError) throw assignmentError;

const { error: auditError } = await supabase.from('admin_audit_log').insert({
  actor_user_id: user.id,
  permission: 'people.roles',
  action: 'assign_role_authorized',
  entity_type: 'admin_role_assignment',
  entity_id: user.id,
  after_data: { role_code: 'gestor_cantina', active: true },
  reason,
});
if (auditError) throw auditError;

console.log(JSON.stringify({ success: true, nome: user.nome, role: 'gestor_cantina' }));
