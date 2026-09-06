import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'csxrhvgfnkqmkehgmnkp';
const rawKeys = execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const keys = JSON.parse(rawKeys);
const serviceKey = keys.find((item) => item.name === 'service_role' || item.type === 'service_role')?.api_key;
if (!serviceKey) throw new Error('Chave de serviço não encontrada.');
const supabase = createClient(`https://${projectRef}.supabase.co`, serviceKey, { auth: { persistSession: false } });

const { data: role, error: roleError } = await supabase
  .from('admin_role_assignments')
  .select('role_code, active, usuario:usuarios!admin_role_assignments_usuario_id_fkey(nome)')
  .eq('role_code', 'gestor_cantina')
  .eq('active', true)
  .single();
if (roleError) throw roleError;

const { data: events, error: eventsError } = await supabase.from('cantina_eventos').select('id').limit(1);
if (eventsError) throw eventsError;

const { data: permissions, error: permissionsError } = await supabase
  .from('admin_role_permissions')
  .select('permission_code')
  .eq('role_code', 'gestor_cantina');
if (permissionsError) throw permissionsError;

const { data: metrics, error: metricsError } = await supabase.rpc('admin_obter_metricas_kesef', { p_semanas: 12 });
if (metricsError) {
  console.error(JSON.stringify({ metricsError }));
  process.exitCode = 2;
} else if (!metrics || typeof metrics !== 'object') {
  throw new Error('RPC de métricas retornou conteúdo inválido.');
}

console.log(JSON.stringify({
  success: true,
  gestor: role.usuario?.nome ?? null,
  permissions: permissions.length,
  eventsAccessible: Array.isArray(events),
  metricsAccessible: !metricsError,
}));
