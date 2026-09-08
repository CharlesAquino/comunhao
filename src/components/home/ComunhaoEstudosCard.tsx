import { ArrowRight, Clock3 } from 'lucide-react';

interface ComunhaoEstudosCardProps {
  hasEstudosAccess?: boolean;
  onAcessar: () => void;
}

export default function ComunhaoEstudosCard({
  hasEstudosAccess = false,
  onAcessar,
}: ComunhaoEstudosCardProps) {
  const statusId = hasEstudosAccess ? undefined : 'comunhao-estudos-status';

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

        <button
          type="button"
          className={`home-formation__link${hasEstudosAccess ? '' : ' home-formation__link--secondary'}`}
          onClick={onAcessar}
          aria-describedby={statusId}
        >
          {hasEstudosAccess ? 'Acessar estudos' : 'Conhecer a proposta'}
          <ArrowRight size={21} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
