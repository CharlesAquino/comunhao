import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../services/constants';
import brandLogo from '../../../public/favicon.svg';
import heroSceneryLight from '../../assets/home-v12/hero-cross-clean-v1.png';
import heroSceneryDark from '../../assets/home-v12/hero-cross-clean-v1.png';

interface HomeMockupHeroProps {
  nome: string;
  avatar?: string | null;
  verseReference?: string | null;
  verseSummary?: string | null;
  onAbrirEbd: () => void;
}

export default function HomeMockupHero({
  nome,
  avatar,
  verseReference,
  verseSummary,
  onAbrirEbd,
}: HomeMockupHeroProps) {
  const primeiroNome = nome?.trim().split(/\s+/)[0] || nome || 'Irmão';

  return (
    <header className="home-v12-hero" aria-labelledby="home-v12-greeting">
      <img
        className="home-v12-hero__art home-v12-theme-art home-v12-theme-art--light"
        src={heroSceneryLight}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <img
        className="home-v12-hero__art home-v12-theme-art home-v12-theme-art--dark"
        src={heroSceneryDark}
        alt=""
        aria-hidden="true"
        decoding="async"
      />

      <div className="home-v12-hero__top">
        <div className="home-v12-brand" aria-label="Comunhão">
          <img
            src={brandLogo}
            alt="Logo Comunhão"
            aria-hidden="true"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <span>
            <strong>Comunhão</strong>
            <small>Juntos em uma caminhada com Deus</small>
          </span>
        </div>
      </div>

      <div className="home-v12-hero__greeting" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          to={ROUTES.PERFIL}
          className="home-v12-avatar"
          aria-label="Abrir meu perfil"
          style={{ width: '48px', height: '48px', flexShrink: 0 }}
        >
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            <span>{primeiroNome.charAt(0)}</span>
          )}
        </Link>
        <div>
          <p>A paz do Senhor,</p>
          <h1 id="home-v12-greeting">
            {primeiroNome}
          </h1>
        </div>
      </div>

      <div className="home-v12-hero__greeting" style={{ marginTop: '0' }}>
        {verseReference && (
          <button
            type="button"
            className="home-v12-verse"
            onClick={onAbrirEbd}
            aria-label={`Abrir EBD em ${verseReference}`}
            title={verseSummary || undefined}
          >
            <BookOpen size={18} aria-hidden="true" />
            <span>{verseReference}</span>
            <b aria-hidden="true">›</b>
          </button>
        )}
      </div>
      <p className="home-v12-hero__motto">Mais juntos<br />com Deus</p>
    </header>
  );
}
