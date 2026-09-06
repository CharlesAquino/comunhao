import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projects = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'list', '--output', 'json'], { encoding: 'utf8' }));
const project = projects.find(item => item.status === 'ACTIVE_HEALTHY') ?? projects[0];
if (!project?.id) throw new Error('Projeto Supabase não encontrado.');
const keys = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', project.id, '--output', 'json'], { encoding: 'utf8' }));
const serviceKey = keys.find(item => item.name === 'service_role' || item.type === 'service_role')?.api_key;
if (!serviceKey) throw new Error('Chave de serviço não encontrada.');

const client = createClient(`https://${project.id}.supabase.co`, serviceKey, { auth: { persistSession: false } });
const { data: events, error: eventsError } = await client
  .from('cantina_eventos')
  .select('id,nome,status,inicio_em,fim_em,reservas_abrem_em,reservas_fecham_em')
  .order('criado_em', { ascending: false })
  .limit(5);
if (eventsError) throw eventsError;

for (const event of events) {
  const { data: ads, error } = await client
    .from('cantina_anuncios')
    .select('id,status,disponivel_de,disponivel_ate,valor_kesef,lote:cantina_lotes(status,quantidade_disponivel),produto:cantina_produtos(nome,ativo,imagem_url)')
    .eq('evento_id', event.id);
  if (error) throw error;
  console.log(JSON.stringify({ ...event, anuncios: ads }, null, 2));
}
