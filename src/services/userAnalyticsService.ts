import { supabase } from './supabaseClient';
import type { AppUsageArea } from './userAnalyticsRoutes';

const lastRecorded = new Map<AppUsageArea, number>();

export async function recordAreaAccess(area: AppUsageArea): Promise<void> {
  // O UsageTracker é montado acima das rotas protegidas. Sem este gate, uma
  // abertura inicial em uma rota privada ainda pode chamar a RPC antes de a
  // sessão ser restaurada e gerar um 400 legítimo de USUARIO_NAO_AUTENTICADO.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const now = Date.now();
  if (now - (lastRecorded.get(area) ?? 0) < 30_000) return;
  lastRecorded.set(area, now);
  const { error } = await supabase.rpc('registrar_acesso_area', { p_area: area });
  if (error) lastRecorded.delete(area);
}
