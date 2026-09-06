import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getUserId } from './authService';
import { STORAGE, MESSAGES } from './constants';
import type { DashboardData, PedidoMural, PedidoAdmin, Usuario, EngajamentoJovem, ProvaAscensao, ResultadoVerificacaoProva, TipoPublicacaoMural, StatusPublicacaoMural, MuralMedia } from '../types';
import { createSignedMuralImageUrl, uploadMuralImage } from './muralImageService';
import { normalizeMuralMediaRelation, priorizarPedidosMural } from './muralSocial';
import type { MuralMediaRow } from './muralSocial';
import { getPublicInstitutionalCrest, listPublicInstitutionalCrests } from './institutionalCrestService';
import { writeDashboardCache } from './dashboardCache';

const MURAL_SOCIAL_SCHEMA_ENABLED = import.meta.env.VITE_MURAL_SOCIAL_SCHEMA === 'true';

interface MocidadeDashboardRow {
  id: string;
  nome: string;
  status_anel: Usuario['status_anel'];
  foto_url?: string | null;
  perfil_capa?: string | null;
  xp?: number | null;
}

export async function getCurrentUserId(): Promise<string> {
  return getUserId();
}

export async function getCurrentUserProfile(): Promise<Usuario | null> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, username, foto_url, perfil_capa, status_anel, pontos_comunhao, xp, streak_dias, orando_por_id, sendo_orado_por_id, criado_em, papel')
      .eq('id', userId)
      .single<Usuario>();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getUserPublicProfile(userId: string): Promise<Pick<Usuario, 'id' | 'nome' | 'foto_url' | 'perfil_capa' | 'status_anel' | 'pontos_comunhao' | 'xp' | 'streak_dias' | 'criado_em' | 'brasao_institucional'> | null> {
  const { data, error } = await supabase
    .from('usuarios_publicos')
    .select('id, nome, foto_url, perfil_capa, status_anel, pontos_comunhao, xp, streak_dias, criado_em')
    .eq('id', userId)
    .maybeSingle<Pick<Usuario, 'id' | 'nome' | 'foto_url' | 'perfil_capa' | 'status_anel' | 'pontos_comunhao' | 'xp' | 'streak_dias' | 'criado_em'>>();

  if (error) throw error;
  if (!data) return null;
  const brasao = await getPublicInstitutionalCrest(userId);
  return { ...data, brasao_institucional: brasao };
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const userId = await getCurrentUserId();

  const { data: user, error: userError } = await supabase
    .from('usuarios_publicos')
    .select('id, nome, username, foto_url, status_anel, pontos_comunhao, xp, streak_dias, orando_por_id, sendo_orado_por_id, criado_em')
    .eq('id', userId)
    .single<Usuario>();

  if (userError || !user) throw new Error(MESSAGES.USER_NOT_FOUND);

  const profileQuery = (profileId?: string | null) => profileId
    ? supabase
      .from('usuarios_publicos')
      .select('id, nome, foto_url')
      .eq('id', profileId)
      .single<Pick<Usuario, 'id' | 'nome' | 'foto_url'>>()
    : Promise.resolve({ data: null, error: null });

  const [missaoResult, sustentadorResult, mocidadeResult] = await Promise.all([
    profileQuery(user.orando_por_id),
    profileQuery(user.sendo_orado_por_id),
    supabase.rpc('listar_mocidade_por_ultimo_login'),
  ]);
  const missao = missaoResult.data;
  const sustentador = sustentadorResult.data;
  const { data: mocidade, error: mocidadeError } = mocidadeResult;

  if (mocidadeError) throw mocidadeError;
  const jovens = (mocidade ?? []) as MocidadeDashboardRow[];
  const idsComIdentidade = [user.id, missao?.id, sustentador?.id, ...jovens.map(jovem => jovem.id)].filter((id): id is string => Boolean(id));
  const brasoesInstitucionais = await listPublicInstitutionalCrests(idsComIdentidade);

  const dashboard: DashboardData = {
    usuario: {
      id: user.id,
      nome: user.nome,
      avatar: user.foto_url,
      status_anel: user.status_anel,
      brasaoInstitucional: brasoesInstitucionais[user.id] ?? null,
    },
    missaoAtual: {
      id: missao?.id,
      nome: missao?.nome || MESSAGES.AWAITING_DRAW,
      avatar: missao?.foto_url,
      brasaoInstitucional: missao?.id ? brasoesInstitucionais[missao.id] ?? null : null,
    },
    parceiroSustentador: {
      id: sustentador?.id,
      nome: sustentador?.nome || MESSAGES.AWAITING_DRAW,
      avatar: sustentador?.foto_url,
      brasaoInstitucional: sustentador?.id ? brasoesInstitucionais[sustentador.id] ?? null : null,
    },
    mocidade: jovens.map(jovem => ({
      id: jovem.id,
      nome: jovem.nome,
      status_anel: jovem.status_anel,
      avatar: jovem.foto_url,
      perfilCapa: jovem.perfil_capa,
      brasaoInstitucional: brasoesInstitucionais[jovem.id] ?? null,
      xp: jovem.xp ?? 0,
    })),
  };
  writeDashboardCache(dashboard);
  return dashboard;
};

export const getMuralData = async (): Promise<PedidoMural[]> => {
  const userId = await getCurrentUserId();

  const { data: minhasIntercessoes, error: minhasError } = await supabase
    .from('intercessoes')
    .select('pedido_id')
    .eq('usuario_id', userId);

  if (minhasError) throw minhasError;
  const intercedendoIds = new Set((minhasIntercessoes ?? []).map(item => item.pedido_id as string));

  if (!MURAL_SOCIAL_SCHEMA_ENABLED) {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        texto,
        tipo,
        criado_em,
        autor:usuarios!pedidos_autor_id_fkey(id, nome, username, foto_url, xp),
        intercessoes(count)
      `)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(p => ({
      id: p.id as string,
      autor_id: (p.autor as { id?: string } | null)?.id,
      autor: (p.autor as { nome?: string } | null)?.nome || MESSAGES.ANONYMOUS,
      autor_username: (p.autor as { username?: string | null } | null)?.username ?? null,
      autor_foto_url: (p.autor as { foto_url?: string | null } | null)?.foto_url ?? null,
      autor_xp: (p.autor as { xp?: number | null } | null)?.xp ?? 0,
      texto: p.texto as string,
      contagem: ((p.intercessoes as { count: number }[])?.[0]?.count) || 0,
      comentarios_contagem: 0,
      intercedendo: intercedendoIds.has(p.id as string),
      tipo: p.tipo as TipoPublicacaoMural,
      status: 'publicado' as StatusPublicacaoMural,
      permite_comentarios: false,
      criado_em: p.criado_em as string,
      ultima_atualizacao_em: null,
      media: null,
    } satisfies PedidoMural));

    const brasoes = await listPublicInstitutionalCrests(mapped.flatMap(item => item.autor_id ? [item.autor_id] : []));
    return priorizarPedidosMural(mapped.map(item => ({
      ...item,
      autor_brasao_institucional: item.autor_id ? brasoes[item.autor_id] ?? null : null,
    })));
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      texto,
      tipo,
      status,
      permite_comentarios,
      criado_em,
      ultima_atualizacao_em,
      autor:usuarios!pedidos_autor_id_fkey(id, nome, username, foto_url, xp),
      intercessoes(count),
      mural_comentarios(count),
      mural_midias(id, storage_path, mime_type, largura, altura, tamanho_bytes, texto_alternativo)
    `)
    .neq('status', 'encerrado')
    .order('criado_em', { ascending: false });

  if (error) throw error;

  const mapped = await Promise.all((data || []).map(async p => {
    // A constraint UNIQUE(publicacao_id) faz o PostgREST expor esta relação
    // como objeto (to-one). Alguns mocks/versões ainda retornam array.
    const mediaRow = normalizeMuralMediaRelation(
      p.mural_midias as MuralMediaRow | MuralMediaRow[] | null,
    );

    let media: MuralMedia | null = null;
    if (mediaRow) {
      media = {
        id: mediaRow.id,
        storagePath: mediaRow.storage_path,
        signedUrl: await createSignedMuralImageUrl(mediaRow.storage_path),
        mimeType: mediaRow.mime_type,
        width: mediaRow.largura,
        height: mediaRow.altura,
        sizeBytes: mediaRow.tamanho_bytes,
        altText: mediaRow.texto_alternativo,
      };
    }

    return {
      id: p.id as string,
      autor_id: (p.autor as { id?: string } | null)?.id,
      autor: (p.autor as { nome?: string } | null)?.nome || MESSAGES.ANONYMOUS,
      autor_username: (p.autor as { username?: string | null } | null)?.username ?? null,
      autor_foto_url: (p.autor as { foto_url?: string | null } | null)?.foto_url ?? null,
      autor_xp: (p.autor as { xp?: number | null } | null)?.xp ?? 0,
      texto: p.texto as string,
      contagem: ((p.intercessoes as { count: number }[])?.[0]?.count) || 0,
      comentarios_contagem: ((p.mural_comentarios as { count: number }[])?.[0]?.count) || 0,
      intercedendo: intercedendoIds.has(p.id as string),
      tipo: p.tipo as TipoPublicacaoMural,
      status: (p.status ?? 'publicado') as StatusPublicacaoMural,
      permite_comentarios: p.permite_comentarios !== false,
      criado_em: p.criado_em as string,
      ultima_atualizacao_em: (p.ultima_atualizacao_em as string | null) ?? null,
      media,
    } satisfies PedidoMural;
  }));

  const brasoes = await listPublicInstitutionalCrests(mapped.flatMap(item => item.autor_id ? [item.autor_id] : []));
  return priorizarPedidosMural(mapped.map(item => ({
    ...item,
    autor_brasao_institucional: item.autor_id ? brasoes[item.autor_id] ?? null : null,
  })));
};

export const toggleUserAvailability = async (disponivel: boolean): Promise<boolean> => {
  const userId = await getCurrentUserId();
  const novoStatus: Usuario['status_anel'] = disponivel ? 'disponivel' : 'offline';

  const { error } = await supabase
    .from('usuarios')
    .update({ status_anel: novoStatus })
    .eq('id', userId);

  if (error) throw error;
  return disponivel;
};

export const intercederPorPedido = async (pedidoId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  const { data: existe, error: selectError } = await supabase
    .from('intercessoes')
    .select('pedido_id')
    .eq('pedido_id', pedidoId)
    .eq('usuario_id', userId)
    .maybeSingle<{ pedido_id: string }>();

  if (selectError) throw selectError;

  if (existe) {
    const { error } = await supabase
      .from('intercessoes')
      .delete()
      .eq('pedido_id', pedidoId)
      .eq('usuario_id', userId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('intercessoes')
      .insert({ pedido_id: pedidoId, usuario_id: userId });
    if (error) throw error;
    return true;
  }
};

export interface CriarPublicacaoMuralInput {
  texto: string;
  tipo: TipoPublicacaoMural;
  foto?: File | null;
}

export const criarPublicacaoMural = async ({ texto, tipo, foto }: CriarPublicacaoMuralInput) => {
  const userId = await getCurrentUserId();
  const cleanText = texto.trim();
  if (!cleanText) throw new Error('Escreva o conteúdo da publicação.');

  if (!MURAL_SOCIAL_SCHEMA_ENABLED) {
    if (foto) throw new Error('Fotos exigem o banco de desenvolvimento 1.4.');
    if (tipo !== 'em_clamor' && tipo !== 'testemunho') {
      throw new Error('Este tipo de publicação exige o banco de desenvolvimento 1.4.');
    }

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        autor_id: userId,
        texto: cleanText,
        tipo,
      })
      .select('id, texto, tipo, criado_em')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      autor_id: userId,
      texto: cleanText,
      tipo,
      status: tipo === 'testemunho' ? 'testemunho' : 'publicado',
      permite_comentarios: true,
    })
    .select('id, texto, tipo, criado_em')
    .single();

  if (error) throw error;

  if (foto) {
    try {
      await uploadMuralImage(data.id, foto);
    } catch (uploadError) {
      await supabase.from('pedidos').delete().eq('id', data.id);
      throw uploadError;
    }
  }

  return data;
};

export const criarPedidoOracao = async (texto: string) => criarPublicacaoMural({
  texto,
  tipo: 'em_clamor',
});

export const getRankingData = async (): Promise<Pick<Usuario, 'id' | 'nome' | 'pontos_comunhao' | 'foto_url'>[]> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, pontos_comunhao, foto_url')
    .order('pontos_comunhao', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getHierarquiaData = async (): Promise<Pick<Usuario, 'id' | 'nome' | 'foto_url' | 'xp' | 'brasao_institucional'>[]> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, foto_url, xp')
    .order('xp', { ascending: false });

  if (error) throw error;
  const rows = data || [];
  const brasoes = await listPublicInstitutionalCrests(rows.map(user => user.id));
  return rows.map(user => ({ ...user, brasao_institucional: brasoes[user.id] ?? null }));
};

export const getAllPedidos = async (): Promise<PedidoAdmin[]> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      texto,
      tipo,
      criado_em,
      autor_id,
      autor:usuarios!pedidos_autor_id_fkey(nome),
      intercessoes(count)
    `)
    .order('criado_em', { ascending: false });

  if (error) throw error;

  return (data || []).map(p => ({
    id: p.id as string,
    autor: (p.autor as { nome?: string } | null)?.nome || MESSAGES.ANONYMOUS,
    autor_id: p.autor_id as string,
    texto: p.texto as string,
    tipo: p.tipo as TipoPublicacaoMural,
    criado_em: p.criado_em as string,
    contagem_intercessores: ((p.intercessoes as { count: number }[])?.[0]?.count) || 0,
  }));
};

export const updatePedido = async (pedidoId: string, updates: { texto?: string; tipo?: TipoPublicacaoMural }): Promise<void> => {
  const { error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', pedidoId);

  if (error) throw error;
};

export const deletePedido = async (pedidoId: string): Promise<void> => {
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', pedidoId);

  if (error) throw error;
};

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  if (file.size > STORAGE.MAX_FILE_SIZE) {
    throw new Error(`A foto deve ter no máximo ${STORAGE.MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }
  if (!STORAGE.ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato não aceito. Use JPEG, PNG ou WebP.');
  }

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extensionByType[file.type];
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE.AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    const message = uploadError.message.toLowerCase();
    if (message.includes('bucket') && (message.includes('not found') || message.includes('does not exist'))) {
      throw new Error('O armazenamento de fotos ainda não está disponível. Confirme a existência do bucket público “avatars”.');
    }
    if (message.includes('row-level security') || message.includes('policy') || message.includes('unauthorized')) {
      throw new Error('Sua sessão não tem permissão para enviar esta foto. A policy do bucket “avatars” precisa autorizar a pasta do usuário autenticado.');
    }
    throw new Error(`Não foi possível enviar a foto: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE.AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

export const updateCurrentUserAvatar = async (file: File): Promise<string> => {
  const authResult = await supabase.auth.getUser();
  const authUser = authResult.data.user;
  if (authResult.error || !authUser) throw new Error('Sua sessão expirou. Entre novamente para alterar a foto.');

  const userId = await getCurrentUserId();
  const fotoUrl = await uploadAvatar(file, authUser.id);
  const { data: updatedProfile, error } = await supabase
    .from('usuarios')
    .update({ foto_url: fotoUrl })
    .eq('id', userId)
    .select('foto_url')
    .maybeSingle<{ foto_url: string | null }>();

  if (error) throw error;
  if (!updatedProfile?.foto_url) {
    throw new Error('A foto foi enviada, mas o perfil não pôde ser atualizado. Confirme o vínculo de autenticação e a policy de UPDATE de usuarios.');
  }
  return updatedProfile.foto_url;
};

export const updateCurrentUserProfile = async (updates: { nome: string; perfil_capa?: string }): Promise<void> => {
  const nome = updates.nome.trim();
  if (nome.length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');

  const userId = await getCurrentUserId();

  const { data: updatedProfile, error } = await supabase
    .from('usuarios')
    .update({ nome, ...(updates.perfil_capa ? { perfil_capa: updates.perfil_capa } : {}) })
    .eq('id', userId)
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!updatedProfile) {
    throw new Error('O perfil não pôde ser atualizado. Confirme o vínculo de autenticação e a policy de UPDATE de usuarios.');
  }
};

// ── Recuperação de senha via OTP ──
// Backend reservado para a futura recuperação. A interface permanece desabilitada.

export interface SendOtpOptions {
  username: string;
  channel?: 'whatsapp' | 'email';
}

export interface SendOtpResult {
  sent: boolean;
  destination?: string;
}

async function getEdgeFunctionError(error: unknown): Promise<Error> {
  if (error instanceof Error && error.message !== 'Edge Function returned a non-2xx status code.') {
    return error;
  }

  const response = (error as { context?: Response } | null)?.context;
  if (response) {
    try {
      const payload = await response.clone().json() as { error?: string; message?: string };
      if (payload.error || payload.message) return new Error(payload.error || payload.message);
    } catch {
      // A resposta sem JSON continua usando a mensagem genérica abaixo.
    }
  }

  return new Error('Não foi possível concluir a operação agora. Tente novamente em instantes.');
}

export const sendOtp = async (options: SendOtpOptions): Promise<SendOtpResult> => {
  const { data, error } = await supabase.functions.invoke<SendOtpResult>('enviar-otp', {
    body: {
      mode: 'recuperacao',
      username: options.username,
      channel: options.channel || 'whatsapp',
    },
  });
  if (error) throw await getEdgeFunctionError(error);
  if (!data) throw new Error('A função de OTP não retornou uma resposta válida.');
  return data;
};

export const verifyOtp = async (
  username: string,
  token: string,
  senha: string,
): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('verificar-otp', {
    body: {
      username,
      code: token,
      password: senha,
      mode: 'recuperacao',
    },
  });
  if (error) throw await getEdgeFunctionError(error);

  if (data.access_token && data.refresh_token) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subscribeToDataChanges = (callback: () => void): (() => void) => {
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(callback, 80);
  };

  const channel = supabase
    .channel(`mural-data-${createRuntimeId()}`)
    // Cada tabela precisa de um listener próprio. A opção `tables` não é reconhecida pelo Realtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'pedidos' } as any, scheduleRefresh)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'intercessoes' } as any, scheduleRefresh);

  if (MURAL_SOCIAL_SCHEMA_ENABLED) {
    channel
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'mural_comentarios' } as any, scheduleRefresh)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'mural_midias' } as any, scheduleRefresh);
  }

  channel.subscribe();

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    supabase.removeChannel(channel);
  };
};

export {
  adminAdicionarPergunta,
  adminAtualizarLicao,
  adminAtualizarPergunta,
  adminCriarLicao,
  adminExcluirLicao,
  adminExcluirPergunta,
  getLicaoCompleta,
  getLicoes,
  verificarRespostaQuiz,
} from './ebdLessonService';

export {
  adminAtualizarEstadoItem,
  adminAtualizarItem,
  adminAtualizarLogisticaPedido,
  adminAprovarPedido,
  adminCriarItem,
  adminExcluirItem,
  adminGetPedidos,
  adminProcessarPedido,
  adminSalvarVariantes,
  getLojaItens,
  getLojaItensAdmin,
  getMeusPedidos,
  solicitarResgate,
  solicitarResgateIdempotente,
  subscribeToAdminStoreOrders,
} from './storeService';
export type { LojaVarianteDraft } from './storeService';

// ─── Métricas Pastorais ──────────────────────────────────────

type AdminMetricasContatoRow = {
  id: string;
  nome: string;
  telefone?: string | null;
  foto_url?: string | null;
  status_anel: EngajamentoJovem['status_anel'];
  pontos_comunhao?: number | null;
  streak_dias?: number | null;
  papel?: string | null;
  participa_sorteio?: boolean | null;
  last_login?: string | null;
};

export const getMetricasEngajamento = async (): Promise<EngajamentoJovem[]> => {
  const { data: usuariosData, error } = await supabase
    .rpc('admin_listar_metricas_contatos');

  const usuarios = (usuariosData ?? []) as AdminMetricasContatoRow[];

  if (error) throw error;

  const userIds = usuarios.map((u: AdminMetricasContatoRow) => u.id);

  const intercessoes = userIds.length > 0
    ? (await supabase
      .from('intercessoes')
      .select('usuario_id, criado_em')
      .in('usuario_id', userIds)
      .order('criado_em', { ascending: false })).data
    : [];

  const ultimaIntercessao = new Map<string, string>();
  for (const i of intercessoes || []) {
    if (!ultimaIntercessao.has(i.usuario_id)) {
      ultimaIntercessao.set(i.usuario_id, i.criado_em);
    }
  }

  const agora = new Date();

  return usuarios.map((u: AdminMetricasContatoRow) => {
    const lastLogin = u.last_login ? new Date(u.last_login) : null;
    const diasSemLogin = lastLogin
      ? Math.floor((agora.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let semafaro: 'verde' | 'amarelo' | 'vermelho';
    if (diasSemLogin <= 3) semafaro = 'verde';
    else if (diasSemLogin <= 14) semafaro = 'amarelo';
    else semafaro = 'vermelho';

    return {
      id: u.id,
      nome: u.nome,
      telefone: u.telefone ?? undefined,
      foto_url: u.foto_url ?? null,
      status_anel: u.status_anel,
      dias_sem_login: diasSemLogin,
      ultima_intercessao: ultimaIntercessao.get(u.id) || null,
      pontos_comunhao: u.pontos_comunhao ?? 0,
      streak_dias: u.streak_dias || 0,
      papel: u.papel ?? undefined,
      participa_sorteio: Boolean(u.participa_sorteio),
      semafaro,
    };
  });
};

// --- Sistema de Indicação ---

export async function gerarCodigoIndicacao(): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_codigo_indicacao');
  if (error) throw error;
  return data as string;
}

export interface ProgramaIndicacao {
  codigo: string;
  bonus: number;
}

export async function obterProgramaIndicacao(): Promise<ProgramaIndicacao> {
  const { data, error } = await supabase.rpc('obter_programa_indicacao');
  if (error) throw error;
  return data as ProgramaIndicacao;
}

export async function registrarIndicacao(codigo: string): Promise<void> {
  const { error } = await supabase.rpc('registrar_indicacao', {
    p_codigo_indicacao: codigo,
  });
  if (error) throw error;
}

export async function getProvaAtiva(): Promise<ProvaAscensao | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('provas_ascensao')
    .select('*')
    .eq('usuario_id', userId)
    .eq('status', 'ativa')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle<ProvaAscensao>();

  if (error || !data) return null;
  return data;
}

export async function verificarProvasPendentes(): Promise<ResultadoVerificacaoProva | null> {
  const { data, error } = await supabase.rpc('verificar_provas_pendentes');
  if (error) {
    console.error('Erro ao verificar provas:', error);
    return null;
  }
  if (!data || data.length === 0) return null;
  return data[0] as ResultadoVerificacaoProva;
}

// TODO: Implementar streak tracking (sistema de ofensivas/raias)
// - Após qualquer ação de oração/intercessão, verificar se o usuário tem
//   atividade diária consecutiva (coluna streak_dias na tabela usuarios)
// - Se streak >= 7 dias: creditar STREAK_7_DIAS (15 Kesef + 12 XP)
// - Se streak >= 30 dias: creditar STREAK_30_DIAS (50 Kesef + 50 XP)
// - Sugestão: criar RPC `verificar_streak` que atualiza streak_dias e
//   credita bônus quando necessário, chamada após creditar_kesef/creditar_xp
