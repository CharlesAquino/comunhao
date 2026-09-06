import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('infraestrutura de chamadas de oração', () => {
  it('declara as permissões Android de microfone e câmera', () => {
    const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
    expect(manifest).toContain('android.permission.RECORD_AUDIO');
    expect(manifest).toContain('android.permission.CAMERA');
    expect(manifest).toContain('android.permission.MODIFY_AUDIO_SETTINGS');
  });

  it('mantém convites_oracao na publicação Realtime', () => {
    const migration = readFileSync('supabase/migrations/20260815003000_habilitar_realtime_convites_oracao.sql', 'utf8');
    expect(migration).toContain('alter table public.convites_oracao replica identity full');
    expect(migration).toContain('alter publication supabase_realtime add table public.convites_oracao');
  });
});
