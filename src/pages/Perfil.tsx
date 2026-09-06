import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, ChevronRight, Flame, Pencil, Save, Settings, Users, Wallet } from 'lucide-react';
import AvatarPicker from '../components/AvatarPicker';
import BadgeRank from '../components/BadgeRank';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { ErrorState, LoadingState } from '../components/ui/FeedbackState';
import { useToast } from '../contexts/ToastContext';
import { getCurrentUserProfile, updateCurrentUserAvatar, updateCurrentUserProfile } from '../services/dataService';
import { calcularProgressoProximoNivel, formatarDivisao } from '../services/patente';
import { ROUTES } from '../services/constants';
import type { Usuario } from '../types';
import SealIcon from '../components/ui/SealIcon';
import ProfileCoverBackground from '../components/profile/ProfileCoverBackground';
import ProfileCoverPicker from '../components/profile/ProfileCoverPicker';
import { getProfileCover, normalizeProfileCover, type ProfileCoverId } from '../services/profileCovers';
import InstitutionalCrest from '../components/InstitutionalCrest';
import { resolveInstitutionalCrest } from '../services/institutionalCrestRules';
import { useAdmin } from '../contexts/AdminContext';
import AppBrandMark from '../components/ui/AppBrandMark';
import { readScreenCache, SCREEN_CACHE_KEYS, writeScreenCache } from '../services/screenCache';

const PROFILE_CACHE_AGE = 24 * 60 * 60 * 1000;

export default function Perfil() {
  const [cachedProfile] = useState(() => readScreenCache<Usuario>(SCREEN_CACHE_KEYS.PROFILE, PROFILE_CACHE_AGE));
  const [perfil, setPerfil] = useState<Usuario | null>(() => cachedProfile);
  const [loading, setLoading] = useState(() => cachedProfile === null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [perfilCapa, setPerfilCapa] = useState<ProfileCoverId>('neutro');
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const { roles: adminRoles, legacyRole } = useAdmin();

  useEffect(() => {
    getCurrentUserProfile()
      .then(data => {
        if (!data) throw new Error('Perfil não encontrado.');
        setPerfil(data);
        writeScreenCache(SCREEN_CACHE_KEYS.PROFILE, data);
        setNome(data.nome);
        setPerfilCapa(normalizeProfileCover(data.perfil_capa));
      })
      .catch(error => setErro(error instanceof Error ? error.message : 'Não foi possível carregar o perfil.'))
      .finally(() => setLoading(false));
  }, []);

  const salvar = async () => {
    if (!perfil || salvando) return;
    setSalvando(true);
    try {
      let fotoUrl = perfil.foto_url;
      if (foto) fotoUrl = await updateCurrentUserAvatar(foto);
      if (nome.trim() !== perfil.nome || perfilCapa !== normalizeProfileCover(perfil.perfil_capa)) {
        await updateCurrentUserProfile({ nome, perfil_capa: perfilCapa });
      }
      setPerfil({ ...perfil, nome: nome.trim(), foto_url: fotoUrl, perfil_capa: perfilCapa });
      writeScreenCache(SCREEN_CACHE_KEYS.PROFILE, { ...perfil, nome: nome.trim(), foto_url: fotoUrl, perfil_capa: perfilCapa });
      setFoto(null);
      setEditando(false);
      toast.success('Perfil atualizado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    if (!perfil || salvando) return;
    setNome(perfil.nome);
    setPerfilCapa(normalizeProfileCover(perfil.perfil_capa));
    setFoto(null);
    setEditando(false);
  };

  if (loading) return <LoadingState label="Carregando seu perfil..." />;
  if (erro || !perfil) return <ErrorState message={erro || 'Perfil não encontrado.'} />;

  const progresso = calcularProgressoProximoNivel(perfil.xp ?? 0);
  const patente = progresso.atual;
  const institutionalCrest = resolveInstitutionalCrest(adminRoles, legacyRole);
  const cover = getProfileCover(perfilCapa);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-6 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppBrandMark />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Sua presença</p>
            <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Perfil</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          className="!px-3"
          onClick={() => editando ? cancelarEdicao() : setEditando(true)}
          disabled={salvando}
        >
          <SealIcon Icon={Pencil} size="sm" />
          {editando ? 'Cancelar' : 'Editar'}
        </Button>
      </header>

      <section className={`profile-cover-card relative flex flex-col items-center overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-5 pb-6 pt-7 text-center ${cover.imageUrl ? 'profile-cover-card--themed' : ''}`}>
        <ProfileCoverBackground coverId={perfilCapa} preserveComposition />
        <AvatarPicker
          initialPreview={perfil.foto_url}
          onFileSelect={file => {
            setFoto(file);
            setEditando(true);
          }}
          disabled={salvando}
          size="large"
          label={perfil.foto_url ? 'Toque para trocar sua foto' : 'Adicione uma foto para ser reconhecido'}
          avatarAccessory={institutionalCrest
            ? <InstitutionalCrest kind={institutionalCrest} size={42} />
            : <BadgeRank rank={patente.badgeRank} size={40} />}
        />

        {editando ? (
          <div className="mt-5 w-full space-y-3">
            <label htmlFor="nome-perfil" className="block text-left text-xs font-semibold text-[var(--text-secondary)]">Nome exibido</label>
            <input
              id="nome-perfil"
              value={nome}
              onChange={event => setNome(event.target.value)}
              maxLength={80}
              className="input-theme min-h-12 w-full rounded-xl border px-4 text-sm outline-none"
            />
            <ProfileCoverPicker value={perfilCapa} onChange={setPerfilCapa} />
            <Button onClick={salvar} disabled={salvando || nome.trim().length < 2} className="w-full">
              <SealIcon Icon={Save} size="sm" />
              {salvando ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </div>
        ) : (
          <>
            <h2 className="profile-cover-card__name mt-5 font-display text-2xl font-semibold text-[var(--text-primary)]">{perfil.nome}</h2>
            {perfil.username && (
              <p className="profile-cover-card__secondary mt-1 text-xs font-semibold text-[var(--accent-primary)]">@{perfil.username}</p>
            )}
            <p className="profile-cover-card__secondary mt-1 text-sm text-[var(--text-secondary)]">
              {patente.nome}{progresso.divisao ? ` · ${formatarDivisao(progresso.divisao)}` : ''}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary)]">
              <span className="size-2 rounded-full bg-[var(--success)]" />
              {perfil.status_anel === 'disponivel' ? 'Disponível para oração' : perfil.status_anel === 'orando' ? 'Em oração' : 'Em recolhimento'}
            </span>
          </>
        )}
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
        <Card className="relative overflow-hidden p-3 text-center border-amber-500/30 bg-gradient-to-b from-[var(--surface)] to-amber-950/10">
          <div className="flex items-center justify-center gap-1">
            <Flame size={18} className={`text-amber-500 fill-amber-500/60 ${(perfil.streak_dias ?? 0) > 0 ? 'animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]' : 'opacity-40'}`} />
            <p className="font-display text-xl font-bold text-amber-400">{perfil.streak_dias ?? 0}</p>
          </div>
          <p className="mt-1 text-xs font-semibold text-amber-500/90">Chama Sagrada</p>
        </Card>
      </div>

      <Card variant="highlighted" className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <BadgeRank rank={patente.badgeRank} size={48} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--celebration)]">Jornada de Serviço</p>
            <h3 className="font-display text-lg text-[var(--text-primary)]">{patente.nome}</h3>
          </div>
        </div>
        <ProgressBar value={progresso.porcentagem} label={progresso.proximo ? `Rumo a ${progresso.proximo.nome}` : 'Patente máxima'} />
        <Link to="/guia" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--accent-primary)]">
          <SealIcon Icon={Award} size="sm" />
          Conhecer a jornada
        </Link>
      </Card>

      <nav aria-label="Atalhos do perfil" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {[
          { to: ROUTES.COMUNIDADE, label: 'Comunidade', Icon: Users },
          { to: ROUTES.CARTEIRA, label: 'Carteira Kesef', Icon: Wallet },
          { to: ROUTES.EBD, label: 'Minhas lições', Icon: BookOpen },
          { to: ROUTES.RANKING, label: 'Jornada e patentes', Icon: Award },
          { to: ROUTES.CONFIGURACOES, label: 'Configurações', Icon: Settings },
        ].map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] last:border-0">
            <SealIcon Icon={Icon} size="sm" className="text-[var(--accent-primary)]" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={17} className="text-[var(--text-muted)]" />
          </Link>
        ))}
      </nav>

    </div>
  );
}
