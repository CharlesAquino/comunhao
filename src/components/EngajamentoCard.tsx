import { Clock, Hand, Trophy } from 'lucide-react';
import type { EngajamentoJovem } from '../types';

interface Props {
  jovem: EngajamentoJovem;
}

const SEMAFORO = {
  verde: { label: 'Ativo', cor: 'bg-[var(--accent-solid)]', bg: 'bg-[var(--accent-soft)]', txt: 'txt-green' },
  amarelo: { label: 'Atenção', cor: 'bg-yellow-500', bg: 'bg-yellow-500/15', txt: 'text-yellow-300' },
  vermelho: { label: 'Afastado', cor: 'bg-rose-500', bg: 'bg-rose-500/15', txt: 'text-rose-300' },
};

export default function EngajamentoCard({ jovem }: Props) {
  const meta = SEMAFORO[jovem.semafaro];

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 glass-strong rounded-full flex items-center justify-center text-sm font-bold txt-primary shrink-0 overflow-hidden">
          {jovem.foto_url ? (
            <img src={jovem.foto_url} alt={jovem.nome} className="w-full h-full object-cover" />
          ) : (
            jovem.nome[0]?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold txt-primary text-sm truncate">{jovem.nome}</p>
            {jovem.papel === 'admin' && <span className="text-[10px] txt-muted bg-amber-500/15 px-2 py-0.5 rounded-full">Admin</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${meta.cor}`} />
            <span className={`text-xs ${meta.txt}`}>{meta.label}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.txt}`}>
          {jovem.dias_sem_login}d
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs txt-tertiary">
        <div className="flex items-center gap-1">
          <Hand size={12} />
          <span>{jovem.status_anel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy size={12} />
          <span>{jovem.pontos_comunhao} pts</span>
        </div>
        {(jovem.streak_dias ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{jovem.streak_dias}d streak</span>
          </div>
        )}
      </div>
    </div>
  );
}
