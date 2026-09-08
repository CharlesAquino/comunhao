import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LamparinaIcon } from '../icons/SanctuaryIcons';
import { getDashboardData, subscribeToDataChanges, toggleUserAvailability } from '../../services/dataService';

export default function LamparinaDock() {
  const location = useLocation();
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Ocultar na aba de oração e configuração para evitar sobreposição
  const hideDock = location.pathname.startsWith('/oracao') || location.pathname.startsWith('/configuracoes');

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const dashboard = await getDashboardData();
        if (mounted && dashboard?.usuario) {
          setIsAvailable(dashboard.usuario.status_anel === 'disponivel');
        }
      } catch (err) {
        console.error(err);
      }
    };

    void loadData();

    const unsubscribe = subscribeToDataChanges(() => {
      if (mounted) {
        void loadData();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await toggleUserAvailability();
      // subscribeToDataChanges irá atualizar o estado automaticamente
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (hideDock) return null;

  return (
    <div className="absolute top-[calc(var(--safe-area-top)+0.75rem)] left-4 z-[90] pointer-events-auto">
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={isAvailable ? "Ficar offline" : "Ficar disponível"}
        className={`flex size-[2.35rem] items-center justify-center rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] hover:scale-110 active:scale-95 ${
          isAvailable
            ? 'drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
            : 'opacity-50 grayscale filter hover:grayscale-0 hover:opacity-100'
        }`}
      >
        <LamparinaIcon 
          className={`size-6 transition-all duration-700 ${isAvailable ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'txt-tertiary'}`} 
          aria-hidden="true" 
        />
        {loading && (
          <span className="absolute -inset-1 rounded-full border-2 border-dashed border-[var(--celebration)] animate-[spin_2s_linear_infinite]" />
        )}
      </button>
    </div>
  );
}
