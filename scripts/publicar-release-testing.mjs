import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filename) {
  try {
    const lines = readFileSync(filename, 'utf-8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index < 1) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Arquivo opcional.
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    args[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) index += 1;
  }
  return args;
}

function sha256Of(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function serviceRoleFromSupabaseCli(supabaseUrl) {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const output = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const keys = JSON.parse(output);
  const serviceRole = keys.find(key => key.id === 'service_role' || key.name === 'service_role');
  return serviceRole?.api_key;
}

async function main() {
  loadEnvFile('.env');
  loadEnvFile('.env.local');

  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(args.config ?? 'release/testing/release.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const apkPath = path.resolve(args.apk ?? `release/testing/comunhao-${config.versionName}.apk`);
  const manifestPath = path.resolve(args.manifest ?? 'release/testing/version.json');

  const supabaseUrl = process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || config.supabaseUrl;
  let serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL não está configurada.');
  }
  if (!serviceRole && args['use-supabase-cli'] === 'true') {
    serviceRole = serviceRoleFromSupabaseCli(supabaseUrl);
  }
  if (!serviceRole) {
    throw new Error('Defina SUPABASE_SERVICE_ROLE_KEY ou publique com --use-supabase-cli.');
  }

  const bucket = String(config.bucket ?? 'app-updates');
  const folder = String(config.remoteFolder ?? 'testing').replace(/^\/|\/$/g, '');
  const apkName = `comunhao-${config.versionName}.apk`;
  const apkRemotePath = `${folder}/${apkName}`;
  const manifestRemotePath = `${folder}/version.json`;
  const publicBaseUrl = `${String(supabaseUrl).replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${folder}`;
  const apkUrl = `${publicBaseUrl}/${apkName}`;
  const stats = statSync(apkPath);

  const manifest = {
    channel: config.channel,
    versionCode: config.versionCode,
    versionName: config.versionName,
    minimumVersionCode: config.minimumVersionCode,
    mandatory: config.mandatory,
    apkUrl,
    sha256: sha256Of(apkPath),
    size: stats.size,
    releaseDate: config.releaseDate,
    releaseTitle: config.releaseTitle,
    testerMessage: config.testerMessage,
    releaseNotes: config.releaseNotes,
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const apkUpload = await supabase.storage
    .from(bucket)
    .upload(apkRemotePath, readFileSync(apkPath), {
      upsert: true,
      contentType: 'application/vnd.android.package-archive',
      cacheControl: '3600',
    });

  if (apkUpload.error) {
    throw new Error(`Falha ao publicar o APK: ${apkUpload.error.message}`);
  }

  const manifestUpload = await supabase.storage
    .from(bucket)
    .upload(manifestRemotePath, readFileSync(manifestPath), {
      upsert: true,
      contentType: 'application/json; charset=utf-8',
      cacheControl: '60',
    });

  if (manifestUpload.error) {
    throw new Error(`Falha ao publicar o manifesto: ${manifestUpload.error.message}`);
  }

  const manifestUrl = `${publicBaseUrl}/version.json`;
  const verification = await fetch(`${manifestUrl}?verify=${Date.now()}`, { cache: 'no-store' });

  if (!verification.ok) {
    throw new Error(`Publicação concluída, mas a verificação pública retornou HTTP ${verification.status}.`);
  }

  const remote = await verification.json();
  if (remote.versionCode !== config.versionCode || remote.sha256 !== manifest.sha256) {
    throw new Error('O manifesto público não corresponde ao artefato local.');
  }

  console.log('✅ Release de testes publicada.');
  console.log(`APK: ${apkUrl}`);
  console.log(`Manifesto: ${manifestUrl}`);
  console.log(`SHA-256: ${manifest.sha256}`);
}

main().catch(error => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
