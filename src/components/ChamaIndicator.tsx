import { Flame } from 'lucide-react';
import { calcularChama, CHAMA_COR, CHAMA_LABEL, type NivelChama } from '../services/patente';

interface Props {
  ultimaAtividade?: string | null;
  tamanho?: number;
  mostrarLabel?: boolean;
}

export default function ChamaIndicator({ ultimaAtividade, tamanho = 12, mostrarLabel = false }: Props) {
  const nivel: NivelChama = calcularChama(ultimaAtividade);

  const pulsar = nivel === 'acesa' ? 'animate-pulse' : '';

  return (
    <span className={`inline-flex items-center gap-1 ${pulsar}`} title={CHAMA_LABEL[nivel]}>
      <Flame size={tamanho} className={CHAMA_COR[nivel]} />
      {mostrarLabel && <span className={`text-[10px] font-medium ${CHAMA_COR[nivel]}`}>{CHAMA_LABEL[nivel]}</span>}
    </span>
  );
}
