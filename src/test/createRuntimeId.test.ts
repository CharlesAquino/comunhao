import { describe, expect, it } from 'vitest';
import { createFallbackUuid, createRuntimeId } from '../utils/createRuntimeId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('identificadores de runtime', () => {
  it('produz UUID válido para chaves aceitas pelo Postgres', () => {
    expect(createRuntimeId()).toMatch(UUID_V4);
  });

  it('mantém o formato UUID mesmo sem APIs criptográficas', () => {
    expect(createFallbackUuid()).toMatch(UUID_V4);
  });
});
