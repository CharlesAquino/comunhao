import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('contextos dos convites de oração', () => {
  const migration = readFileSync('supabase/migrations/20260815193000_separar_origem_e_convites_sala.sql', 'utf8');

  it('separa dupla semanal e sala de oração no contrato remoto', () => {
    expect(migration).toContain("check (origem in ('dupla_semana', 'sala_oracao'))");
    expect(migration).toContain("v_convite.origem='dupla_semana'");
  });

  it('permite convidar para a sala existente com limite e autorização', () => {
    expect(migration).toContain('function public.convidar_para_sala_oracao');
    expect(migration).toContain("raise exception 'NAO_PARTICIPA_DA_SALA'");
    expect(migration).toContain("raise exception 'LIMITE_DA_SALA_ATINGIDO'");
    expect(migration).toContain('v_convite.sala_id is not null');
  });

  it('finaliza o convite quando a sala é encerrada', () => {
    expect(migration).toContain('salas_oracao_finalizar_convites');
    expect(migration).toContain('set finalizado_em=coalesce(finalizado_em,now())');
  });
});
