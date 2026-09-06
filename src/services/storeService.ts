import { supabase } from './supabaseClient';
import { getUserId } from './authService';
import { createRuntimeId } from '../utils/createRuntimeId';
import type { LojaEtapaLogistica, LojaItem, LojaPedido } from '../types';

export async function getLojaItens(): Promise<LojaItem[]> {
  const { data, error } = await supabase
    .from('loja_itens')
    .select('*, variantes:loja_variantes(*), imagens:loja_item_imagens(*)')
    .eq('ativo', true)
    .eq('estado', 'ativo')
    .order('categoria')
    .order('nome');
  if (error) throw error;
  return data as LojaItem[];
}

export async function getLojaItensAdmin(): Promise<LojaItem[]> {
  const { data, error } = await supabase
    .from('loja_itens')
    .select('*, variantes:loja_variantes(*), imagens:loja_item_imagens(*)')
    .order('categoria')
    .order('nome');
  if (error) throw error;
  return data as LojaItem[];
}

export function subscribeToAdminStoreOrders(callback: () => void): () => void {
  const channel = supabase
    .channel('admin_loja_pedidos')
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'loja_pedidos' } as never,
      callback,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function solicitarResgate(itemId: string, quantidade: number): Promise<LojaPedido> {
  return solicitarResgateIdempotente(itemId, quantidade, createRuntimeId());
}

export async function solicitarResgateIdempotente(
  itemId: string,
  quantidade: number,
  chaveIdempotencia: string,
  varianteId?: string | null,
): Promise<LojaPedido> {
  const { data, error } = await supabase.rpc('solicitar_resgate_loja', {
    p_item_id: itemId,
    p_quantidade: quantidade,
    p_chave_idempotencia: chaveIdempotencia,
    p_variante_id: varianteId ?? null,
  });
  if (error) {
    if (error.message.includes('PEDIDO_PENDENTE_EXISTENTE')) throw new Error('Você já possui uma solicitação pendente para este item.');
    if (error.message.includes('SALDO_INSUFICIENTE')) throw new Error('Seu saldo de Kesef não é suficiente para este resgate.');
    if (error.message.includes('ESTOQUE_INSUFICIENTE') || error.message.includes('ITEM_INDISPONIVEL')) throw new Error('Este item não está mais disponível.');
    if (error.message.includes('VARIANTE_OBRIGATORIA')) throw new Error('Selecione uma cor e tamanho antes de continuar.');
    if (error.message.includes('LIMITE_POR_MEMBRO_ATINGIDO')) throw new Error('Você atingiu o limite de resgates deste produto.');
    throw error;
  }
  return data as unknown as LojaPedido;
}

export async function getMeusPedidos(): Promise<LojaPedido[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('loja_pedidos')
    .select('*, item:loja_itens(*), variante:loja_variantes(*), historico:loja_pedido_historico(*)')
    .eq('usuario_id', userId)
    .order('solicitado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as LojaPedido[];
}

export async function adminGetPedidos(status?: string): Promise<LojaPedido[]> {
  let query = supabase
    .from('loja_pedidos')
    .select('*, item:loja_itens(*), variante:loja_variantes(*), usuario:usuarios!loja_pedidos_usuario_id_fkey(nome, username)');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('solicitado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as LojaPedido[];
}

export async function adminProcessarPedido(
  pedidoId: string,
  novoStatus: 'aprovado' | 'rejeitado' | 'entregue',
  observacoes?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_processar_pedido_loja', {
    p_pedido_id: pedidoId,
    p_novo_status: novoStatus,
    p_observacoes: observacoes ?? null,
  });
  if (error) {
    if (error.message.includes('SALDO_INSUFICIENTE')) throw new Error('O saldo do membro mudou e não permite mais a aprovação.');
    if (error.message.includes('ESTOQUE_INSUFICIENTE')) throw new Error('O estoque não é suficiente para aprovar este pedido.');
    if (error.message.includes('TRANSICAO_INVALIDA')) throw new Error('Este pedido já foi processado ou está em outro estado.');
    throw error;
  }
}

export interface LojaLogisticaInput {
  etapa: LojaEtapaLogistica;
  entregaAgendadaEm?: string | null;
  entregaLocal?: string | null;
  instrucoes?: string | null;
}

export async function adminAprovarPedido(
  pedidoId: string,
  logistica: LojaLogisticaInput,
): Promise<LojaPedido> {
  const { data, error } = await supabase.rpc('admin_aprovar_pedido_loja', {
    p_pedido_id: pedidoId,
    p_etapa_logistica: logistica.etapa,
    p_entrega_agendada_em: logistica.entregaAgendadaEm ?? null,
    p_entrega_local: logistica.entregaLocal ?? null,
    p_instrucoes_retirada: logistica.instrucoes ?? null,
  });
  if (error) {
    if (error.message.includes('ESTOQUE_INSUFICIENTE')) throw new Error('O estoque não é suficiente para aprovar este pedido.');
    if (error.message.includes('TRANSICAO_INVALIDA')) throw new Error('Este pedido já foi processado ou está em outro estado.');
    if (error.message.includes('LOGISTICA_INVALIDA')) throw new Error('Informe data, horário e local para o resgate agendado.');
    throw error;
  }
  return data as LojaPedido;
}

export async function adminAtualizarLogisticaPedido(
  pedidoId: string,
  logistica: LojaLogisticaInput,
): Promise<LojaPedido> {
  const { data, error } = await supabase.rpc('admin_atualizar_logistica_pedido_loja', {
    p_pedido_id: pedidoId,
    p_etapa_logistica: logistica.etapa,
    p_entrega_agendada_em: logistica.entregaAgendadaEm ?? null,
    p_entrega_local: logistica.entregaLocal ?? null,
    p_instrucoes_retirada: logistica.instrucoes ?? null,
  });
  if (error) {
    if (error.message.includes('LOGISTICA_INVALIDA')) throw new Error('Informe data, horário e local para o resgate agendado.');
    if (error.message.includes('PEDIDO_NAO_ENCONTRADO')) throw new Error('Este pedido não foi encontrado.');
    if (error.message.includes('TRANSICAO_INVALIDA')) throw new Error('A logística só pode ser atualizada enquanto o pedido estiver aprovado.');
    throw error;
  }
  return data as LojaPedido;
}

export async function adminCriarItem(item: Omit<LojaItem, 'id' | 'ativo' | 'criado_em'>): Promise<LojaItem> {
  const { data, error } = await supabase.rpc('admin_criar_item_loja', {
    p_nome: item.nome,
    p_descricao: item.descricao,
    p_preco_kesef: item.preco_kesef,
    p_estoque: item.estoque,
    p_categoria: item.categoria,
    p_imagem_url: item.imagem_url,
    p_imagem_url_claro: item.imagem_url_claro,
    p_imagem_url_escuro: item.imagem_url_escuro,
  });
  if (error) throw error;
  return data as LojaItem;
}

export async function adminAtualizarItem(itemId: string, updates: Partial<LojaItem>): Promise<void> {
  const { error } = await supabase.rpc('admin_atualizar_item_loja', {
    p_item_id: itemId,
    p_nome: updates.nome,
    p_descricao: updates.descricao,
    p_preco_kesef: updates.preco_kesef,
    p_estoque: updates.estoque,
    p_categoria: updates.categoria,
    p_imagem_url: updates.imagem_url,
    p_imagem_url_claro: updates.imagem_url_claro,
    p_imagem_url_escuro: updates.imagem_url_escuro,
  });
  if (error) throw error;
}

export interface LojaVarianteDraft {
  id?: string;
  sku: string;
  nome: string;
  atributos: Record<string, string>;
  estoque: number;
  estoque_alerta: number;
  ativo?: boolean;
}

export async function adminSalvarVariantes(itemId: string, variantes: LojaVarianteDraft[]): Promise<void> {
  const idsMantidos = variantes.flatMap(variante => variante.id ? [variante.id] : []);
  let desativar = supabase.from('loja_variantes').update({ ativo: false }).eq('item_id', itemId);
  if (idsMantidos.length) desativar = desativar.not('id', 'in', `(${idsMantidos.join(',')})`);
  const { error: deactivateError } = await desativar;
  if (deactivateError) throw deactivateError;

  if (variantes.length) {
    const { error } = await supabase.from('loja_variantes').upsert(variantes.map((variante, index) => ({
      ...(variante.id ? { id: variante.id } : {}),
      item_id: itemId,
      sku: variante.sku.trim().toUpperCase(),
      nome: variante.nome.trim(),
      atributos: variante.atributos,
      estoque: variante.estoque,
      estoque_alerta: variante.estoque_alerta,
      ativo: variante.ativo ?? true,
      ordem: index,
      atualizado_em: new Date().toISOString(),
    })), { onConflict: 'id' });
    if (error) throw error;
  }

  const estoqueTotal = variantes.filter(variante => variante.ativo !== false)
    .reduce((total, variante) => total + variante.estoque, 0);
  if (variantes.length) await adminAtualizarItem(itemId, { estoque: estoqueTotal });
}

export async function adminAtualizarEstadoItem(
  itemId: string,
  estado: 'ativo' | 'pausado' | 'arquivado',
): Promise<void> {
  const { error } = await supabase.from('loja_itens').update({
    estado,
    ativo: estado === 'ativo',
  }).eq('id', itemId);
  if (error) throw error;
}

export async function adminExcluirItem(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_excluir_item_loja', {
    p_item_id: itemId,
  });
  if (error) {
    if (error.message.includes('ITEM_COM_HISTORICO_NAO_PODE_SER_EXCLUIDO')) {
      throw new Error('Este produto já possui histórico de pedidos ou estoque. Arquive-o para preservar os registros.');
    }
    if (error.message.includes('ITEM_NAO_ENCONTRADO')) {
      throw new Error('Este produto não foi encontrado ou já foi removido.');
    }
    throw error;
  }
}
