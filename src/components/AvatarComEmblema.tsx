import { calcularPatente } from '../services/patente';
import { corAvatar, corTextoAvatar } from '../utils/avatarColor';
import ChamaIndicator from './ChamaIndicator';
import BadgeRank from './BadgeRank';
import InstitutionalCrest from './InstitutionalCrest';
import type { InstitutionalCrestKind } from '../services/institutionalCrestRules';

interface Props {
  nome: string;
  fotoUrl?: string | null;
  statusAnel: 'offline' | 'disponivel' | 'orando';
  xp: number;
  ultimaAtividade?: string | null;
  tamanho?: 'sm' | 'md' | 'lg';
  brasaoInstitucional?: InstitutionalCrestKind | null;
  showBadge?: boolean;
}

export default function AvatarComEmblema({ nome, fotoUrl, statusAnel, xp, ultimaAtividade, tamanho = 'md', brasaoInstitucional, showBadge = true }: Props) {
  const patente = calcularPatente(xp);

  const statusRing = {
    disponivel: 'ring-[var(--accent-solid)]',
    orando: 'ring-rose-400',
    offline: 'ring-slate-300',
  }[statusAnel];

  const innerSize = tamanho === 'sm' ? 'size-10' : tamanho === 'lg' ? 'size-20' : 'size-12';
  const badgeSize = tamanho === 'sm' ? 16 : tamanho === 'lg' ? 24 : 18;
  const badgePos = tamanho === 'sm' ? '-bottom-1 -right-1' : tamanho === 'lg' ? '-bottom-2 -right-2' : '-bottom-1.5 -right-1.5';
  const chamaPos = tamanho === 'sm' ? '-top-1 -right-1' : tamanho === 'lg' ? '-top-2 -right-2' : '-top-1.5 -right-1.5';

  return (
    <div className="relative inline-flex rounded-full p-[2px] transition-all duration-500">
      <div className={`p-[2px] rounded-full ring-2 ${statusRing}`}>
        <div
          className={`${innerSize} rounded-full flex items-center justify-center text-base select-none overflow-hidden border border-subtle`}
          style={{ backgroundColor: corAvatar(nome || ''), color: corTextoAvatar() }}
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt={nome} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="font-bold uppercase text-sm">{nome ? nome[0].toUpperCase() : '?'}</span>
          )}
        </div>
      </div>
      {showBadge && <div className={`absolute ${badgePos} flex items-center justify-center`}>
        {brasaoInstitucional
          ? <InstitutionalCrest kind={brasaoInstitucional} size={badgeSize + 5} />
          : <BadgeRank rank={patente.badgeRank} size={badgeSize} />}
      </div>}
      <div className={`absolute ${chamaPos}`} aria-label="Sequência de atividade">
        <ChamaIndicator ultimaAtividade={ultimaAtividade} tamanho={10} />
      </div>
    </div>
  );
}
