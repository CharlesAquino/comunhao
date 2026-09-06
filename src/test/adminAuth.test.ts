import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAdminAuth, checkUserRole, logoutAdmin } from '../services/adminAuth';
import { supabase } from '../services/supabaseClient';

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

const mockSingle = (papel: string) => ({
  single: vi.fn().mockResolvedValue({
    data: { papel },
    error: null,
  }),
});

describe('adminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'profile-u1', error: null } as never);
  });

  describe('checkUserRole', () => {
    it('should return membro when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Not authenticated', status: 401, code: 'unauthenticated' } as any,
      });
      expect(await checkUserRole()).toBe('membro');
    });

    it('should return membro for papel=membro', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => mockSingle('membro')) })) } as any);
      expect(await checkUserRole()).toBe('membro');
    });

    it('should return membro for papel=mod (unsupported)', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => mockSingle('mod')) })) } as any);
      expect(await checkUserRole()).toBe('membro');
    });

    it('should return admin for papel=admin', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => mockSingle('admin')) })) } as any);
      expect(await checkUserRole()).toBe('admin');
    });
  });

  describe('checkAdminAuth', () => {
    it('should return false when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Not authenticated', status: 401, code: 'unauthenticated' } as any,
      });
      expect(await checkAdminAuth()).toBe(false);
    });

    it('should return false when papel is mod', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => mockSingle('mod')) })) } as any);
      expect(await checkAdminAuth()).toBe(false);
    });

    it('should return true when papel is admin', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => mockSingle('admin')) })) } as any);
      expect(await checkAdminAuth()).toBe(true);
    });

    it('should query the profile by domain id', async () => {
      const mockEq = vi.fn(() => mockSingle('admin'));
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'auth-uid-123' } }, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: mockEq })) } as any);
      await checkAdminAuth();
      expect(supabase.rpc).toHaveBeenCalledWith('usuario_atual_id');
      expect(mockEq).toHaveBeenCalledWith('id', 'profile-u1');
    });
  });

  describe('logoutAdmin', () => {
    it('should call supabase.auth.signOut', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
      await logoutAdmin();
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });
  });
});
