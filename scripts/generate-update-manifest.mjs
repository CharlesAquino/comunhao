import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    args[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) {
      index += 1;
    }
  }
  return args;
}

function required(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`Parâmetro obrigatório ausente: --${key}`);
  }
  return value;
}

function toReleaseNotes(value) {
  return value
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

function sha256Of(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const apkPath = path.resolve(required(args, 'apk'));
  const versionCode = Number(required(args, 'versionCode'));
  const versionName = required(args, 'versionName');
  const minimumVersionCode = Number(args.minimumVersionCode ?? versionCode);
  const mandatory = (args.mandatory ?? 'false') === 'true';
  const apkUrl = required(args, 'apkUrl');
  const releaseDate = args.releaseDate ?? new Date().toISOString().slice(0, 10);
  const releaseNotes = toReleaseNotes(args.releaseNotes ?? 'Atualização do aplicativo');
  const output = path.resolve(args.output ?? 'dist/app/version.json');

  const fileStats = statSync(apkPath);
  const manifest = {
    versionCode,
    versionName,
    minimumVersionCode,
    mandatory,
    apkUrl,
    sha256: sha256Of(apkPath),
    size: fileStats.size,
    releaseDate,
    releaseNotes,
  };

  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  process.stdout.write(`${output}\n`);
}

main();
