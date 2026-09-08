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
  parceiroSustentador?: { nome: string; avatar?: string; brasaoInstitucional?: string } | null;
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
  const primeiroNome = missaoAtual.nome ? missaoAtual.nome.split(' ')[0] : 'Sua dupla';

  return (
    <section
      className="editorial-journey-card mission-week-card card-enter"
      aria-labelledby="missao-semana"
    >
      <h2 id="missao-semana" className="sr-only">Missão da semana</h2>

      {/* Arte oficial com alternância automática de tema claro/escuro */}
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

      {/* Avatar do parceiro */}
      <Link
        to={missaoAtual.id ? ROUTES.PERFIL_USUARIO(missaoAtual.id) : ROUTES.COMUNIDADE}
        aria-label={`Abrir perfil de ${missaoAtual.nome}`}
        className="mission-week-card__avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        {missaoAtual.avatar ? (
          <img src={missaoAtual.avatar} alt={`Foto de ${missaoAtual.nome}`} />
        ) : (
          <span>{missaoAtual.nome ? missaoAtual.nome[0] : '?'}</span>
        )}
      </Link>

      {/* Identidade e Brasão */}
      <div className="mission-week-card__identity">
        <p className="mission-week-card__name">{missaoAtual.nome}</p>
        <p className="mission-week-card__role">
          Sua intercessão nesta semana
        </p>
        {missaoAtual.brasaoInstitucional && (
          <InstitutionalCrest kind={missaoAtual.brasaoInstitucional} size={22} />
        )}
      </div>

      {/* Mensagem e Estado da Intercessão */}
      <div className={`mission-week-card__message${parceiroSustentador && !conviteEnviado ? ' mission-week-card__message--supporter' : ''}`} aria-live="polite">
        {conviteEnviado ? (
          <>
            <Clock size={22} className="mission-week-card__message-icon animate-pulse" />
            <div>
              <strong>Aguardando {primeiroNome} aceitar o convite...</strong>
              <p>O convite foi enviado para o app.</p>
            </div>
            <button
              type="button"
              onClick={onCancelarConvite}
              className="mission-week-card__cancel"
            >
              <X size={14} /> Cancelar
            </button>
          </>
        ) : parceiroSustentador ? (
          <>
            <p className="mission-week-card__supporter">
                <span className="mission-week-card__supporter-avatar" aria-hidden="true">
                  <span>{parceiroSustentador.nome.trim().charAt(0) || '?'}</span>
                  {parceiroSustentador.avatar && <img
                    key={parceiroSustentador.avatar}
                    src={parceiroSustentador.avatar}
                    alt=""
                    onError={event => { event.currentTarget.style.display = 'none'; }}
                  />}
                </span>
              <strong className="mission-week-card__supporter-identity">{parceiroSustentador.nome}</strong>
              <span className="mission-week-card__supporter-copy">está orando por você nesta semana.</span>
            </p>
            {parceiroSustentador.brasaoInstitucional && (
              <InstitutionalCrest kind={parceiroSustentador.brasaoInstitucional} size={19} />
            )}
          </>
        ) : (
          <p>Uma semana para fortalecer vínculos através da oração.</p>
        )}
      </div>

      {/* A arte deixa esta área livre; o convite é um controle real. */}
      <div className="mission-week-card__invitation">
        <PrayerActionButton
          onClick={onConvidar}
          disabled={criandoSala || Boolean(conviteEnviado)}
          busy={criandoSala}
          className="mission-week-card__invite"
          label={criandoSala ? 'Enviando…' : conviteEnviado ? 'Convite enviado' : `Orar com ${primeiroNome}`}
        />
      </div>

    </section>
  );
}
