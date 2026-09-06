import { supabase } from './supabaseClient';
import { getUserId } from './authService';

export type UserRole = 'membro' | 'admin';

export async function checkUserRole(): Promise<UserRole> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return 'membro';

  let profileId: string;
  try {
    profileId = await getUserId();
  } catch {
    return 'membro';
  }

  const { data, error: profileError } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', profileId)
    .single<{ papel: string }>();

  if (profileError || !data) return 'membro';
  if (data.papel === 'admin') return 'admin';
  return 'membro';
}

export async function checkAdminAuth(): Promise<boolean> {
  const role = await checkUserRole();
  return role === 'admin';
}

export async function logoutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}
