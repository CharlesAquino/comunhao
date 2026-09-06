import { beforeEach, describe, expect, it } from 'vitest';
import type { DashboardData } from '../types';
import { clearDashboardCache, readDashboardCache, writeDashboardCache } from './dashboardCache';

const dashboard: DashboardData = {
  usuario: { id: 'u1', nome: 'Charles', status_anel: 'offline' },
  missaoAtual: { nome: 'Ana' },
  parceiroSustentador: { nome: 'João' },
  mocidade: [],
};

describe('dashboardCache', () => {
  beforeEach(() => localStorage.clear());

  it('restaura a última Home válida', () => {
    writeDashboardCache(dashboard);
    expect(readDashboardCache()).toEqual(dashboard);
  });

  it('descarta conteúdo inválido e limpa ao sair', () => {
    localStorage.setItem('comunhao:dashboard-cache:v1', '{invalido');
    expect(readDashboardCache()).toBeNull();
    writeDashboardCache(dashboard);
    clearDashboardCache();
    expect(readDashboardCache()).toBeNull();
  });
});
