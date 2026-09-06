import { describe, expect, it } from 'vitest';
import { shouldRunUpgradeCleanup } from '../services/runtimeLifecycle';

describe('shouldRunUpgradeCleanup', () => {
  it('detecta mudança de versionCode', () => {
    expect(shouldRunUpgradeCleanup({ storedVersionCode: 13002, currentVersionCode: 13003, nativeReportedUpdate: false, hasExistingUsage: true })).toBe(true);
  });

  it('não limpa novamente na mesma versão', () => {
    expect(shouldRunUpgradeCleanup({ storedVersionCode: 13003, currentVersionCode: 13003, nativeReportedUpdate: false, hasExistingUsage: true })).toBe(false);
  });

  it('considera a primeira execução da função em uma instalação já usada', () => {
    expect(shouldRunUpgradeCleanup({ storedVersionCode: null, currentVersionCode: 13003, nativeReportedUpdate: false, hasExistingUsage: true })).toBe(true);
  });

  it('não trata uma instalação realmente nova como atualização', () => {
    expect(shouldRunUpgradeCleanup({ storedVersionCode: null, currentVersionCode: 13003, nativeReportedUpdate: false, hasExistingUsage: false })).toBe(false);
  });
});
