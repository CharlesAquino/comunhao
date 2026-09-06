import { useState, useEffect } from 'react';
import { getSaldoKesef } from '../services/kesefService';

export default function KesefDisplay() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [animando, setAnimando] = useState(false);

  useEffect(() => {
    let mounted = true;
    const carregar = async () => {
      try {
        const s = await getSaldoKesef();
        if (mounted) {
          setSaldo(prev => {
            if (prev !== null && prev !== s) {
              setAnimando(true);
              setTimeout(() => setAnimando(false), 600);
            }
            return s;
          });
        }
      } catch {
        // ignora
      }
    };
    carregar();
    const interval = setInterval(carregar, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (saldo === null) return null;

  return (
    <div
      className={`relative flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-lg transition-all duration-300 overflow-hidden ${
        animando
          ? 'scale-110 text-amber-300 bg-amber-400/20 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/50'
          : 'txt-primary hover:text-amber-300'
      }`}
      title="Seus pontos Kesef"
    >
      {animando && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-amber-200/30 to-transparent" />
      )}
      <img
        src="/kesef-coin.png"
        alt=""
        className={`size-5 object-contain transition-transform duration-300 ${animando ? 'rotate-[360deg] scale-125' : ''}`}
      />
      <span className="font-display font-semibold tracking-tight">{saldo}</span>
    </div>
  );
}
