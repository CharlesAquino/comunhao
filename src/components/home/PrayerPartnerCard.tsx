import { Link } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import InstitutionalCrest from '../InstitutionalCrest';
import missionWeekAmanhecer from '../../assets/mission-week-amanhecer-v2.png';
import missionWeekSantuario from '../../assets/mission-week-santuario-v2.png';
import PrayerActionButton from '../ui/PrayerActionButton';
import { ROUTES } from '../../services/constants';
import type { ConviteOracao } from '../../services/conviteService';

interface MissaoUsuario {
  id: string;
  nome: string;
  avatar?: string;
  brasaoInstitucional?: string;
}

interface Props {
  missaoAtual: MissaoUsuario;
  parceiroSustentador?: {
    nome: string;
    avatar?: string;
    brasaoInstitucional?: string;
  } | null;
  conviteEnviado: ConviteOracao | null;
  criandoSala: boolean;
  onConvidar: () => void;
  onCancelarConvite: () => void;
}

export default function PrayerPartnerCard({
  missaoAtual,
  parceiroSustentador,
  conviteEnviado,
  criandoSala,
  onConvidar,
  onCancelarConvite,
}: Props) {
  const hasPartner = Boolean(missaoAtual.id?.trim());
  const primeiroNome = hasPartner && missaoAtual.nome
    ? missaoAtual.nome.split(' ')[0]
    : 'sua dupla';

  const avatarContent = missaoAtual.avatar && hasPartner ? (
    <img src={missaoAtual.avatar} alt={`Foto de ${missaoAtual.nome}`} />
  ) : (
    <span>{hasPartner && missaoAtual.nome ? missaoAtual.nome[0] : '?'}</span>
  );

  return (
    <section
      className="editorial-journey-card mission-week-card card-enter"
      aria-labelledby="missao-semana"
    >
      <h2 id="missao-semana" className="sr-only">Missão da semana</h2>

      <img
        src={missionWeekAmanhecer}
        alt=""
        aria-hidden="true"
        className="mission-week-card__art mission-week-card__art--light"
      />
      <img
        src={missionWeekSantuario}
        alt=""
        aria-hidden="true"
        className="mission-week-card__art mission-week-card__art--dark"
      />

      {hasPartner ? (
        <Link
          to={ROUTES.PERFIL_USUARIO(missaoAtual.id)}
          aria-label={`Abrir perfil de ${missaoAtual.nome}`}
          className="mission-week-card__avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          {avatarContent}
        </Link>
      ) : (
        <div
          className="mission-week-card__avatar mission-week-card__avatar--waiting"
          aria-hidden="true"
        >
          {avatarContent}
        </div>
      )}

      <div className="mission-week-card__identity">
        <p className="mission-week-card__name">
          {hasPartner ? missaoAtual.nome : 'Aguardando sorteio'}
        </p>
        <p className="mission-week-card__role">
          {hasPartner
            ? 'Sua intercessão nesta semana'
            : 'Sua dupla será revelada aqui'}
        </p>
        {hasPartner && missaoAtual.brasaoInstitucional && (
          <InstitutionalCrest kind={missaoAtual.brasaoInstitucional} size={22} />
        )}
      </div>

      <div
        className={`mission-week-card__message${
          hasPartner && parceiroSustentador && !conviteEnviado
            ? ' mission-week-card__message--supporter'
            : ''
        }`}
        aria-live="polite"
      >
        {!hasPartner ? (
          <p>
            Assim que o sorteio for concluído, sua missão da semana aparecerá aqui.
          </p>
        ) : conviteEnviado ? (
          <>
            <Clock
              size={22}
              className="mission-week-card__message-icon animate-pulse"
              aria-hidden="true"
            />
            <div>
              <strong>Aguardando {primeiroNome} aceitar o convite...</strong>
              <p>O convite foi enviado para o app.</p>
            </div>
            <button
              type="button"
              onClick={onCancelarConvite}
              className="mission-week-card__cancel"
            >
              <X size={14} aria-hidden="true" /> Cancelar
            </button>
          </>
        ) : parceiroSustentador ? (
          <>
            <p className="mission-week-card__supporter">
              <span
                className="mission-week-card__supporter-avatar"
                aria-hidden="true"
              >
                <span>{parceiroSustentador.nome.trim().charAt(0) || '?'}</span>
                {parceiroSustentador.avatar && (
                  <img
                    key={parceiroSustentador.avatar}
                    src={parceiroSustentador.avatar}
                    alt=""
                    onError={event => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </span>
              <strong className="mission-week-card__supporter-identity">
                {parceiroSustentador.nome}
              </strong>
              <span className="mission-week-card__supporter-copy">
                está orando por você nesta semana.
              </span>
            </p>
            {parceiroSustentador.brasaoInstitucional && (
              <InstitutionalCrest
                kind={parceiroSustentador.brasaoInstitucional}
                size={19}
              />
            )}
          </>
        ) : (
          <p>Uma semana para fortalecer vínculos através da oração.</p>
        )}
      </div>

      <div className="mission-week-card__invitation">
        <PrayerActionButton
          onClick={onConvidar}
          disabled={!hasPartner || criandoSala || Boolean(conviteEnviado)}
          busy={criandoSala}
          className="mission-week-card__invite"
          label={
            !hasPartner
              ? 'Aguardando sorteio'
              : criandoSala
                ? 'Enviando…'
                : conviteEnviado
                  ? 'Convite enviado'
                  : `Orar com ${primeiroNome}`
          }
        />
      </div>
    </section>
  );
}
