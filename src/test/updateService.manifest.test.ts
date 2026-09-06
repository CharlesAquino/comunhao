import { describe, expect, it } from 'vitest';
import { normalizeUpdateManifest } from '../services/updateService';

const validManifest = {
  channel: 'testing',
  versionCode: 13001,
  versionName: '1.3.0-rc.1',
  minimumVersionCode: 2,
  mandatory: false,
  apkUrl: 'https://example.com/testing/comunhao.apk',
  sha256: 'a'.repeat(64),
  size: 12345,
  releaseDate: '2026-07-30',
  releaseTitle: 'Piloto real',
  testerMessage: 'Uso restrito',
  releaseNotes: ['Correção A', 'Correção B'],
};

describe('normalizeUpdateManifest', () => {
  it('normaliza um manifesto do canal de testes', () => {
    expect(normalizeUpdateManifest(validManifest)).toEqual(validManifest);
  });

  it('assume production para manifestos antigos sem canal', () => {
    const result = normalizeUpdateManifest({ ...validManifest, channel: undefined });
    expect(result.channel).toBe('production');
  });

  it('rejeita hash inválido e APK sem HTTPS', () => {
    expect(() => normalizeUpdateManifest({ ...validManifest, sha256: 'abc' })).toThrow(/SHA-256/);
    expect(() => normalizeUpdateManifest({
      ...validManifest,
      apkUrl: 'http://example.com/comunhao.apk',
    })).toThrow(/HTTPS/);
  });
});
