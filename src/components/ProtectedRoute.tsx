import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AppNotificationsBridge from './AppNotificationsBridge';
import LegalAcceptanceGate from './legal/LegalAcceptanceGate';
import { hasActiveSession, registerAuthenticatedAccess, subscribeToAuthentication } from '../services/authService';

export default function ProtectedRoute() {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let active = true;
    let accessRegistered = false;

    const registerAccessOnce = () => {
      if (accessRegistered) return;
      accessRegistered = true;
      void registerAuthenticatedAccess().catch(() => undefined);
    };

    hasActiveSession()
      .then((authenticated) => {
        if (!active) return;
        setStatus(authenticated ? 'authenticated' : 'unauthenticated');
        if (authenticated) registerAccessOnce();
      })
      .catch(() => {
        if (active) setStatus('unauthenticated');
      });

    const unsubscribe = subscribeToAuthentication((authenticated) => {
      if (active) {
        setStatus(authenticated ? 'authenticated' : 'unauthenticated');
        if (authenticated) registerAccessOnce();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent txt-tertiary">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return (
    <LegalAcceptanceGate>
      <AppNotificationsBridge />
      <Outlet />
    </LegalAcceptanceGate>
  );
}
