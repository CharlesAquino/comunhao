import { useState, useEffect } from 'react';
import { Award, Flame, CheckCircle2, Clock } from 'lucide-react';
import { getProvaAtiva } from '../services/dataService';
import type { ProvaAscensao } from '../types';
import { nomePatenteAtual } from '../services/patente';

function formatTempoRestante(expiraEm: string): string {
  const diff = new Date(expiraEm).getTime() - Date.now();
  if (diff <= 0) return 'Expirada';
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${dias}d ${horas}h`;
}

export default function ProvaBanner() {
  const [prova, setProva] = useState<ProvaAscensao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProvaAtiva().then((p) => {
      setProva(p);
      setLoading(false);
    });
  }, []);

  if (loading || !prova) return null;

  const cumpridas = prova.metas_cumpridas.filter((m) => m.cumprida).length;
  const total = prova.metas_cumpridas.length;

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden card-enter border border-amber-400/20">
      <div className="glass-shine" />
      <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-500/15 rounded-xl">
          <Award size={18} className="text-amber-300" />
        </div>
        <div>
          <h3 className="text-xs font-bold txt-primary">Prova de Ascensão</h3>
          <p className="text-[10px] txt-muted">
            Avance para <span className="font-bold text-amber-300">{nomePatenteAtual(prova.tier_alvo)}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] txt-muted">
          <Clock size={12} />
          {formatTempoRestante(prova.expira_em)}
        </div>
      </div>

      <div className="space-y-2">
        {prova.metas_cumpridas.map((meta, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {meta.cumprida ? (
              <CheckCircle2 size={14} className="txt-green shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-amber-400/40 shrink-0" />
            )}
            <span className={meta.cumprida ? 'txt-muted line-through' : 'txt-tertiary'}>
              {meta.descricao}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-subtle">
        <div className="flex items-center gap-2">
          <Flame size={12} className="text-amber-300" />
          <span className="text-[10px] txt-muted">{cumpridas}/{total} metas cumpridas</span>
        </div>
      </div>
    </div>
  );
}
