import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(filename) {
  try {
    for (const raw of readFileSync(filename, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Arquivo opcional.
  }
}

function getServiceRole(projectRef) {
  const raw = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const keys = JSON.parse(raw);
  return keys.find(key => key.id === 'service_role' || key.name === 'service_role')?.api_key;
}

loadEnv('.env.development.local');
loadEnv('.env.local');
loadEnv('.env');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) throw new Error('Ambiente development do Supabase não configurado.');

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const serviceRole = getServiceRole(projectRef);
if (!serviceRole) throw new Error('Service role não localizada pela CLI.');

const suffix = `${Date.now()}`.slice(-8);
const username = `teste.exclusao.${suffix}`;
const telefone = `+5599${`${Date.now()}`.slice(-9)}`;
const password = `T3ste!${randomBytes(10).toString('hex')}`;
const changedPassword = `N0va!${randomBytes(10).toString('hex')}`;
let profileId;
let authUserId;

const client = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const registration = await client.functions.invoke('registrar-username', {
    body: { nome: 'Conta Sintética de Exclusão', telefone, username, password },
  });
  if (registration.error || !registration.data?.access_token) throw new Error('Cadastro sintético falhou.');

  const session = await client.auth.setSession({
    access_token: registration.data.access_token,
    refresh_token: registration.data.refresh_token,
  });
  if (session.error || !session.data.user) throw new Error('Sessão sintética falhou.');
  authUserId = session.data.user.id;

  const profile = await admin.from('usuarios').select('id').eq('auth_user_id', authUserId).single();
  if (profile.error || !profile.data) throw new Error('Perfil sintético não foi vinculado.');
  profileId = profile.data.id;

  const passwordChange = await client.auth.updateUser({ password: changedPassword });
  if (passwordChange.error) throw new Error('Troca remota de senha falhou.');

  const deletion = await client.rpc('solicitar_exclusao_minha_conta');
  if (deletion.error || !deletion.data) throw new Error('Solicitação remota de exclusão falhou.');

  const queued = await admin
    .from('solicitacoes_exclusao_conta')
    .select('status')
    .eq('usuario_id', profileId)
    .single();
  if (queued.error || queued.data?.status !== 'pendente') throw new Error('Fila de exclusão não foi persistida.');

  await client.auth.signOut();
  const blockedLogin = await client.functions.invoke('login-username', {
    body: { username, password: changedPassword },
  });
  if (!blockedLogin.error) throw new Error('Login deveria estar bloqueado apó a solicitação.');

  process.stdout.write('OK: cadastro, troca de senha, fila de exclusão e bloqueio de login validados.\n');
} finally {
  if (profileId) await admin.from('usuarios').delete().eq('id', profileId);
  if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  process.stdout.write('OK: dados sintéticos removidos.\n');
}
