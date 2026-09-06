import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../services/supabaseClient';
import {
  authorizeCantinaRepresentative,
  confirmCantinaPickup,
  confirmImmediateCantinaRedemption,
  createImmediateCantinaRedemption,
  reserveCantinaItem,
} from '../services/cantinaService';

vi.mock('../services/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}));

describe('contratos remotos da Cantina', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
  });

  it('envia uma chave de idempotência ao aprovisionar a reserva', async () => {
    await reserveCantinaItem('anuncio-1', 2, 'chave-1');

    expect(supabase.rpc).toHaveBeenCalledWith('cantina_reservar', {
      p_anuncio_id: 'anuncio-1',
      p_quantidade: 2,
      p_chave_idempotencia: 'chave-1',
    });
  });

  it('preserva anúncio e quantidade no carrinho do operador', async () => {
    await createImmediateCantinaRedemption('evento-1', [
      { anuncio_id: 'anuncio-1', quantidade: 3 },
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith('cantina_criar_resgate_imediato', {
      p_evento_id: 'evento-1',
      p_itens: [{ anuncio_id: 'anuncio-1', quantidade: 3 }],
    });
  });

  it('exige id e código para confirmar o resgate do beneficiário', async () => {
    await confirmImmediateCantinaRedemption('resgate-1', 'C7A4');

    expect(supabase.rpc).toHaveBeenCalledWith('cantina_confirmar_resgate_imediato', {
      p_resgate_id: 'resgate-1',
      p_codigo: 'C7A4',
    });
  });

  it('exige reserva e código para o operador confirmar a retirada', async () => {
    await confirmCantinaPickup('reserva-1', 'AB12CD');

    expect(supabase.rpc).toHaveBeenCalledWith('cantina_confirmar_retirada', {
      p_reserva_id: 'reserva-1',
      p_codigo_retirada: 'AB12CD',
    });
  });

  it('vincula a retirada por terceiro à reserva e ao username informado', async () => {
    await authorizeCantinaRepresentative('reserva-1', 'ana');

    expect(supabase.rpc).toHaveBeenCalledWith('cantina_autorizar_representante', {
      p_reserva_id: 'reserva-1',
      p_username: 'ana',
    });
  });

  it('propaga falhas remotas sem simular confirmação local', async () => {
    const error = new Error('SALDO_INSUFICIENTE');
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error } as never);

    await expect(confirmImmediateCantinaRedemption('resgate-1', 'C7A4')).rejects.toBe(error);
  });
});
