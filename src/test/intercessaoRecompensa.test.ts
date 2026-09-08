import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../services/supabaseClient';
import {
  creditarKesef,
  creditarXp,
  jaRecebeuRecompensaOracao,
} from '../services/kesefService';
import { KESEF_VALORES } from '../services/kesefConstants';
import { XP_ACOES } from '../services/patente';

vi.mock('../services/authService', () => ({
  getUserId: vi.fn().mockResolvedValue('user-123'),
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Anti-farming de intercessão e oração', () => {
  const userId = 'user-123';
  const pedidoId = 'pedido-abc';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('jaRecebeuRecompensaOracao', () => {
    it('retorna true quando já existe registro no kesef_ledger para este pedido', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'ledger-1' }],
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as never);

      const result = await jaRecebeuRecompensaOracao(pedidoId, userId);
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('kesef_ledger');
    });

    it('retorna false quando não há registro no kesef_ledger', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as never);

      const result = await jaRecebeuRecompensaOracao(pedidoId, userId);
      expect(result).toBe(false);
    });
  });

  describe('creditarKesef', () => {
    it('credita Kesef quando ainda não foi recompensado', async () => {
      // 1ª chamada from('kesef_ledger'): verificação de existência -> vazio
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelectCheck,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          id: 'trans-1',
          usuario_id: userId,
          tipo: 'oracao',
          quantidade: KESEF_VALORES.INTERCEDER,
          referencia_id: pedidoId,
          criado_em: '2026-09-06T10:00:00Z',
        },
        error: null,
      } as never);

      const resultado = await creditarKesef('oracao', KESEF_VALORES.INTERCEDER, pedidoId);

      expect(supabase.rpc).toHaveBeenCalledWith('creditar_kesef', {
        p_usuario_id: userId,
        p_tipo: 'oracao',
        p_quantidade: KESEF_VALORES.INTERCEDER,
        p_referencia_id: pedidoId,
      });
      expect(resultado.quantidade).toBe(KESEF_VALORES.INTERCEDER);
    });

    it('não chama RPC e retorna registro existente quando já foi recompensado', async () => {
      // 1ª chamada from('kesef_ledger'): verificação de existência -> já existe
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'ledger-1' }],
                error: null,
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'ledger-1',
                      usuario_id: userId,
                      tipo: 'oracao',
                      quantidade: 1,
                      referencia_id: pedidoId,
                      criado_em: '2026-09-06T09:00:00Z',
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelectCheck,
      } as never);

      const resultado = await creditarKesef('oracao', KESEF_VALORES.INTERCEDER, pedidoId);

      // Não pode chamar RPC novamente
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(resultado.id).toBe('ledger-1');
    });
  });

  describe('creditarXp', () => {
    it('credita XP quando ainda não foi recompensado', async () => {
      // Verificação de existência -> vazio
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelectCheck,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 50,
        error: null,
      } as never);

      const novoXp = await creditarXp(XP_ACOES.INTERCEDER, pedidoId);

      expect(supabase.rpc).toHaveBeenCalledWith('creditar_xp', {
        p_usuario_id: userId,
        p_quantidade: XP_ACOES.INTERCEDER,
        p_referencia_id: pedidoId,
      });
      expect(novoXp).toBe(50);
    });

    it('não chama RPC e retorna XP atual quando já existe recompensa para esta oração', async () => {
      // Verificação de existência -> já existe no ledger
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'ledger-1' }],
                error: null,
              }),
            }),
          }),
        }),
      });

      // Busca do XP atual no usuarios
      const mockSelectUsuarios = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { xp: 45 },
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'kesef_ledger') {
          return { select: mockSelectCheck } as never;
        }
        if (table === 'usuarios') {
          return { select: mockSelectUsuarios } as never;
        }
        return {} as never;
      });

      const xp = await creditarXp(XP_ACOES.INTERCEDER, pedidoId);

      // Não pode chamar RPC novamente
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(xp).toBe(45);
    });
  });

  describe('Fluxo contínuo de toggle (interceder -> remover -> interceder)', () => {
    it('impede acréscimo repetido de pontos em ciclos de toggle', async () => {
      let recompensadoNoBanco = false;

      // Mock dinâmico simulando banco de dados
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'kesef_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                      return Promise.resolve({
                        data: recompensadoNoBanco ? [{ id: 'ledger-1' }] : [],
                        error: null,
                      });
                    }),
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: {
                            id: 'ledger-1',
                            usuario_id: userId,
                            tipo: 'oracao',
                            quantidade: 1,
                            referencia_id: pedidoId,
                            criado_em: '2026-09-06T09:00:00Z',
                          },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          } as never;
        }
        if (table === 'usuarios') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { xp: 10 },
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      vi.mocked(supabase.rpc).mockImplementation((rpcName: string) => {
        if (rpcName === 'creditar_kesef') {
          recompensadoNoBanco = true;
          return Promise.resolve({
            data: { id: 'trans-1', quantidade: 1 },
            error: null,
          }) as never;
        }
        if (rpcName === 'creditar_xp') {
          return Promise.resolve({ data: 11, error: null }) as never;
        }
        return Promise.resolve({ data: null, error: null }) as never;
      });

      // Ciclo 1: 1º clique (Interceder)
      // Como não foi recompensado, deve chamar os RPCs
      const jaRecompensado1 = await jaRecebeuRecompensaOracao(pedidoId, userId);
      expect(jaRecompensado1).toBe(false);

      await Promise.all([
        creditarKesef('oracao', KESEF_VALORES.INTERCEDER, pedidoId),
        creditarXp(XP_ACOES.INTERCEDER, pedidoId),
      ]);

      expect(supabase.rpc).toHaveBeenCalledWith('creditar_kesef', expect.anything());
      expect(supabase.rpc).toHaveBeenCalledWith('creditar_xp', expect.anything());
      expect(recompensadoNoBanco).toBe(true);

      // Limpa histórico de chamadas de RPC para auditar o próximo ciclo
      vi.mocked(supabase.rpc).mockClear();

      // Ciclo 2: 2º clique (Remover intercessão / Desmarcar)
      // O usuário remove a intercessão, mas a recompensa continua registrada no ledger
      const jaRecompensadoAposRemocao = await jaRecebeuRecompensaOracao(pedidoId, userId);
      expect(jaRecompensadoAposRemocao).toBe(true);

      // Ciclo 3: 3º clique (Interceder novamente)
      // O usuário clica novamente para interceder no mesmo pedido
      const jaRecompensado3 = await jaRecebeuRecompensaOracao(pedidoId, userId);
      expect(jaRecompensado3).toBe(true);

      // Tenta acionar creditarKesef e creditarXp
      await Promise.all([
        creditarKesef('oracao', KESEF_VALORES.INTERCEDER, pedidoId),
        creditarXp(XP_ACOES.INTERCEDER, pedidoId),
      ]);

      // NENHUM RPC DE CRÉDITO DEVE SER CHAMADO NO SEGUNDO CLIQUE
      expect(supabase.rpc).not.toHaveBeenCalledWith('creditar_kesef', expect.anything());
      expect(supabase.rpc).not.toHaveBeenCalledWith('creditar_xp', expect.anything());
    });
  });
});
