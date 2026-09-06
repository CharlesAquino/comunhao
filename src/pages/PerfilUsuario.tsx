import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import AvatarComEmblema from '../components/AvatarComEmblema';
import BadgeRank from '../components/BadgeRank';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { ErrorState, LoadingState } from '../components/ui/FeedbackState';
import { getCurrentUserId, getUserPublicProfile } from '../services/dataService';
import { calcularProgressoProximoNivel, formatarDivisao } from '../services/patente';
import { ROUTES } from '../services/constants';
import type { Usuario } from '../types';
import ProfileCoverBackground from '../components/profile/ProfileCoverBackground';
import { getProfileCover } from '../services/profileCovers';
import InstitutionalCrest from '../components/InstitutionalCrest';
import AppBrandMark from '../components/ui/AppBrandMark';

type PerfilPublico = Pick<Usuario, 'id' | 'nome' | 'foto_url' | 'perfil_capa' | 'status_anel' | 'pontos_comunhao' | 'xp' | 'streak_dias' | 'criado_em' | 'brasao_institucional'>;

export default function PerfilUsuario() {
  const { userId } = useParams();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [meuId, setMeuId] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!userId) {
      setErro('Perfil não identificado.');
      setLoading(false);
      return;
    }

    Promise.all([getCurrentUserId(), getUserPublicProfile(userId)])
      .then(([currentUserId, data]) => {
        setMeuId(currentUserId);
        if (!data) throw new Error('Perfil não encontrado.');
        setPerfil(data);
      })
      .catch(error => setErro(error instanceof Error ? error.message : 'Não foi possível carregar este perfil.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState label="Carregando perfil..." />;
  if (userId && meuId === userId) return <Navigate to={ROUTES.PERFIL} replace />;
  if (erro || !perfil) return <ErrorState message={erro || 'Perfil não encontrado.'} />;

  const progresso = calcularProgressoProximoNivel(perfil.xp ?? 0);
  const patente = progresso.atual;
  const cover = getProfileCover(perfil.perfil_capa);
  const status = perfil.status_anel === 'disponivel'
    ? 'Disponível para oração'
    : perfil.status_anel === 'orando'
      ? 'Em oração'
      : 'Em recolhimento';

  return (
    <div className="space-y-5 px-5 pb-6 pt-6">
      <header className="flex items-center gap-3">
        <Link
          to={ROUTES.HOME}
          aria-label="Voltar para o início"
          className="flex size-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface)]"
        >
          <ArrowLeft size={20} />
        </Link>
        <AppBrandMark size="sm" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">Comunidade</p>
          <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">Perfil</h1>
        </div>
      </header>

      <section className={`profile-cover-card relative overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-5 pb-6 pt-8 text-center ${cover.imageUrl ? 'profile-cover-card--themed' : ''}`}>
        <ProfileCoverBackground coverId={perfil.perfil_capa} preserveComposition />
        <div className="relative mx-auto w-fit">
          <AvatarComEmblema
            nome={perfil.nome}
            fotoUrl={perfil.foto_url}
            statusAnel={perfil.status_anel}
            xp={perfil.xp}
            tamanho="lg"
            showBadge={false}
          />
          <div className="absolute -bottom-2 -right-5 drop-shadow-[0_4px_7px_rgba(0,0,0,0.55)]">
            {perfil.brasao_institucional
              ? <InstitutionalCrest kind={perfil.brasao_institucional} size={42} />
              : <BadgeRank rank={patente.badgeRank} size={40} />}
          </div>
        </div>
        <h2 className="profile-cover-card__name mt-5 font-display text-2xl font-semibold text-[var(--text-primary)]">{perfil.nome}</h2>
        <p className="profile-cover-card__secondary mt-1 text-sm text-[var(--text-secondary)]">
          {patente.nome}{progresso.divisao ? ` · ${formatarDivisao(progresso.divisao)}` : ''}
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary)]">
          <span className="size-2 rounded-full bg-[var(--success)]" />
          {status}
        </span>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="font-display text-xl text-[var(--text-primary)]">{perfil.xp ?? 0}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">XP</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-display text-xl text-[var(--text-primary)]">{perfil.pontos_comunhao ?? 0}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Comunhão</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-display text-xl text-[var(--text-primary)]">{perfil.streak_dias ?? 0}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Sequência</p>
        </Card>
      </div>

      <Card variant="highlighted" className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <BadgeRank rank={patente.badgeRank} size={48} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--celebration)]">Jornada de Serviço</p>
            <p className="truncate font-display text-lg text-[var(--text-primary)]">{patente.nome}</p>
          </div>
        </div>
        <ProgressBar value={progresso.porcentagem} label={progresso.proximo ? `Rumo a ${progresso.proximo.nome}` : 'Patente máxima'} />
      </Card>

      <Link to={`/chat/${perfil.id}`} className="block">
        <Button className="w-full">
          <MessageCircle size={18} />
          Enviar mensagem
        </Button>
      </Link>
    </div>
  );
}
