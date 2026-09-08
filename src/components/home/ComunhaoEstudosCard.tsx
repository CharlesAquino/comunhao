import { BookMarked, Clock3 } from 'lucide-react';
import HomeEditorialAction from './HomeEditorialAction';

interface ComunhaoEstudosCardProps {
  hasEstudosAccess?: boolean;
  onAcessar: () => void;
}

export default function ComunhaoEstudosCard({
  hasEstudosAccess = false,
  onAcessar,
}: ComunhaoEstudosCardProps) {
  const statusId = hasEstudosAccess ? undefined : 'comunhao-estudos-status';
  const actionLabel = hasEstudosAccess ? 'Acessar estudos' : 'Conhecer a proposta';

  return (
    <section className="home-studies" aria-labelledby="comunhao-estudos-title">
      <div className="home-formation__copy">
        <p className="home-formation__eyebrow">Aprofunde sua jornada</p>
        <h2 id="comunhao-estudos-title">Comunhão Estudos</h2>
        <p className="home-studies__subtitle">Cursos e trilhas bíblicas</p>
        <p className="home-studies__description">
          Conheça a Palavra.<br />
          Viva o que aprende.
        </p>

        {!hasEstudosAccess && (
          <p id={statusId} className="home-studies__status">
            <Clock3 size={15} aria-hidden="true" />
            Em preparação
          </p>
        )}

        <HomeEditorialAction
          icon={<BookMarked size={18} />}
          label={actionLabel}
          onClick={onAcessar}
          aria-describedby={statusId}
        />
      </div>
    </section>
  );
}
