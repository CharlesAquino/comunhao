import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAdminAccessProfile } from '../services/adminAccessService';
import { subscribeToAuthentication } from '../services/authService';
import type { AdminAccessProfile, AdminPermission, AdminRoleCode } from '../types/admin';

interface AdminContextType extends AdminAccessProfile {
  isAdmin: boolean;
  isGuardiao: boolean;
  hasAdminAccess: boolean;
  checking: boolean;
  can: (permission: AdminPermission) => boolean;
  hasRole: (role: AdminRoleCode) => boolean;
  refreshRole: () => Promise<void>;
}

const EMPTY_ACCESS: AdminAccessProfile = {
  userId: null,
  legacyRole: 'membro',
  roles: [],
  permissions: [],
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AdminAccessProfile>(EMPTY_ACCESS);
  const [checking, setChecking] = useState(true);

  const refreshRole = useCallback(async () => {
    setChecking(true);
    try {
      setAccess(await getAdminAccessProfile());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const updateAccess = async () => {
      try {
        const nextAccess = await getAdminAccessProfile();
        if (active) setAccess(nextAccess);
      } finally {
        if (active) setChecking(false);
      }
    };

    updateAccess();
    const unsubscribe = subscribeToAuthentication(() => updateAccess());

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AdminContextType>(() => {
    const permissionSet = new Set(access.permissions);
    const roleSet = new Set(access.roles);
    return {
      ...access,
      isAdmin: roleSet.has('administrador') || access.legacyRole === 'admin',
      isGuardiao: roleSet.has('administrador') || roleSet.has('guardiao') || access.legacyRole === 'admin' || access.legacyRole === 'mod',
      hasAdminAccess: permissionSet.has('admin.access'),
      checking,
      can: permission => permissionSet.has(permission),
      hasRole: role => roleSet.has(role),
      refreshRole,
    };
  }, [access, checking, refreshRole]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}
