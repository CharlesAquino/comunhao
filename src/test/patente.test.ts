import { describe, expect, it } from 'vitest';
import { calcularBonusIndicacao, calcularPatente, nomePatenteAtual, PATENTES } from '../services/patente';

describe('Jornada de Serviço', () => {
  it('progride o bônus de indicação em 5 Kesef por patente', () => {
    expect(PATENTES.map(patente => calcularBonusIndicacao(patente.xpMin))).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
  });

  it('mantém as oito patentes na ordem canônica', () => {
    expect(PATENTES.map(p => p.id)).toEqual([
      'servo-fiel',
      'guardiao',
      'intercessor',
      'atalaia',
      'discipulador',
      'missionario',
      'conselheiro',
      'pacificador',
    ]);
  });

  it.each([
    [0, 'servo-fiel'],
    [299, 'servo-fiel'],
    [300, 'guardiao'],
    [800, 'intercessor'],
    [1800, 'atalaia'],
    [3500, 'discipulador'],
    [6000, 'missionario'],
    [9500, 'conselheiro'],
    [13500, 'conselheiro'],
    [18500, 'pacificador'],
  ] as const)('resolve %i XP como %s', (xp, patente) => {
    expect(calcularPatente(xp).id).toBe(patente);
  });

  it('apresenta nomes legados com a taxonomia atual', () => {
    expect(nomePatenteAtual('Serafim')).toBe('Pacificador');
    expect(nomePatenteAtual('Querubim')).toBe('Conselheiro');
  });
});
