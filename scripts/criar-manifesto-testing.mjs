import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(args.config ?? 'release/testing/release.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const apkPath = path.resolve(args.apk ?? `release/testing/comunhao-${config.versionName}.apk`);
  const output = path.resolve(args.output ?? 'release/testing/version.json');
  const publicBaseUrl = `${String(config.supabaseUrl).replace(/\/$/, '')}/storage/v1/object/public/${config.bucket}/${config.remoteFolder}`;
  const apkUrl = `${publicBaseUrl}/comunhao-${config.versionName}.apk`;
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

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  process.stdout.write(`${output}\n`);
}

main();
