import { supabase } from './supabaseClient';
import { LIMITS } from './constants';
import { executarSorteio } from './sorteio';

type SorteioParticipante = {
  id: string;
};

export type SorteioCirculoResult = {
  participantes: number;
  notificacoes: {
    total: number;
    sucessos: number;
    falhas: number;
    resultados: Array<{ usuarioId: string; success: boolean }>;
  };
};

export type SorteioTelemetry = {
  periodo: { inicio: string; fim: string };
  kpis: {
    chamadas: number;
    aceitas: number;
    concluidas: number;
    sem_resposta: number;
    recusadas: number;
    expiradas: number;
    falhas_app: number;
    taxa_aceite: number;
    taxa_continuidade: number;
  };
  ultima_formacao: {
    id?: string;
    criado_em?: string;
    participantes?: number;
    executado_por?: string;
  };
  serie_diaria: Array<{ dia: string; chamadas: number; aceitas: number; concluidas: number; falhas: number }>;
  circulo_atual: Array<{ participante: string; ora_por: string; e_orado_por: string }>;
  sem_resposta: Array<{ quem_chamou: string; quem_nao_respondeu: string; criado_em: string; minutos_aguardando: number }>;
  atendimentos: Array<{ quem_atendeu: string; quem_chamou: string; aceito_em: string | null; concluida: boolean }>;
  necessidades_assistenciais: Array<{
    pessoa: string;
    categoria: string;
    acompanhamento: string;
    status: string;
    criado_em: string;
    intercessoes_confirmadas: number;
  }>;
  identidades_assistenciais_visiveis: boolean;
};

async function listarParticipantesElegiveisSorteio(): Promise<SorteioParticipante[]> {
  const { data, error } = await supabase
    .rpc('admin_listar_elegiveis_sorteio', {
      // A assinatura mantém este argumento para clientes em versões antigas.
      // A decisão de participar é exclusivamente a seleção do administrador.
      p_last_login_min: new Date(0).toISOString(),
    });

  if (error) throw error;
  return (data ?? []) as SorteioParticipante[];
}

async function persistirSorteio(
  updates: Array<{ id: string; orando_por_id: string; sendo_orado_por_id: string }>,
): Promise<void> {
  const { error } = await supabase.rpc('admin_aplicar_sorteio_circulo', {
    p_relacoes: updates,
  });

  if (error) {
    if (error.message.includes('SORTEIO_SELECAO_DESATUALIZADA')) {
      throw new Error('A seleção foi alterada durante o sorteio. Atualize a lista e gere o círculo novamente para incluir todas as pessoas marcadas.');
    }
    throw error;
  }
}

export async function executarSorteioCirculo(): Promise<SorteioCirculoResult> {
  const participantes = await listarParticipantesElegiveisSorteio();

  if (participantes.length < LIMITS.MIN_USERS_FOR_DRAW) {
    throw new Error(
      `Não há participantes suficientes (mínimo de ${LIMITS.MIN_USERS_FOR_DRAW} pessoas marcadas para o sorteio).`,
    );
  }

  const updates = executarSorteio(participantes.map(usuario => usuario.id));
  await persistirSorteio(updates);
  const { data: totalNotificacoes, error: notificationError } = await supabase.rpc('admin_notificar_sorteio_circulo', {
    p_usuario_ids: updates.map(item => item.id),
  });
  if (notificationError) throw notificationError;

  const total = Number(totalNotificacoes ?? 0);
  const notificacoes = {
    total,
    sucessos: total,
    falhas: 0,
    resultados: updates.map(item => ({ usuarioId: item.id, success: true })),
  };

  return {
    participantes: updates.length,
    notificacoes,
  };
}

export async function atualizarParticipacaoSorteio(
  usuarioId: string,
  participaSorteio: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_atualizar_participacao_sorteio', {
    p_usuario_id: usuarioId,
    p_participa_sorteio: participaSorteio,
  });

  if (error) throw error;
}

export async function obterTelemetriaSorteio(days = 30): Promise<SorteioTelemetry> {
  const safeDays = Math.max(1, Math.min(90, Math.trunc(days)));
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - safeDays);
  const { data, error } = await supabase.rpc('admin_obter_telemetria_sorteio', {
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
  });
  if (error) throw error;
  return data as SorteioTelemetry;
}

export interface MemberValidation {
  usuario_id: string;
  validado_em: string;
  bonus_quantidade: number;
}

export async function listarValidacoesMembros(): Promise<MemberValidation[]> {
  const { data, error } = await supabase.rpc('admin_listar_validacoes_indicacao');
  if (error) throw error;
  return (data ?? []) as MemberValidation[];
}

export async function validarMembroIndicado(usuarioId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('admin_validar_membro_indicado', {
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw error;
}
