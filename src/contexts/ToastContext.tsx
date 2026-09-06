import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
  }), [addToast]);

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-slide-up
              ${t.type === 'success' ? 'bg-[var(--accent-solid)]/10 border-green-subtle txt-green' : ''}
              ${t.type === 'error' ? 'bg-rose-950 border-rose-500/40 text-rose-100' : ''}
              ${t.type === 'info' ? 'bg-sky-950 border-sky-500/40 text-sky-100' : ''}
            `}
          >
            {t.type === 'success' && <CheckCircle size={18} className="shrink-0" />}
            {t.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="sanctuary-mini-action shrink-0 opacity-70 hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context.toast;
}
