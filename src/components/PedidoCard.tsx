import {
  BookOpen,
  Check,
  Edit3,
  Heart,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PedidoCardProps } from '../types';
import Badge from './ui/Badge';
import IconButton from './ui/IconButton';
import Button from './ui/Button';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { getTipoPublicacaoMeta, isPedidoSemResposta } from '../services/muralSocial';
import PatentSeal from './mural/PatentSeal';
import CommentsSheet from './mural/CommentsSheet';
import InstitutionalCrest from './InstitutionalCrest';
import { triggerPrayerIntercededHaptic } from '../utils/haptics';
import PrayerAscentEffect from './ui/PrayerAscentEffect';

export default function PedidoCard({
  id,
  autorId,
  autor,
  autorUsername,
  autorFotoUrl,
  autorXp,
  autorBrasaoInstitucional,
  texto,
  criadoEm,
  contagemIntercessores,
  comentariosContagem,
  intercedendo,
  onInterceder,
  onComentariosAlterados,
  tipo,
  status,
  permiteComentarios,
  media,
  loading,
  isAdmin,
  onEditar,
  onExcluir,
}: PedidoCardProps) {
  const [editando, setEditando] = useState(false);
  const [editTexto, setEditTexto] = useState(texto);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [showAscent, setShowAscent] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [, setTimeTick] = useState(0);
  const typeMeta = getTipoPublicacaoMeta(tipo);
  const isPrayerRequest = tipo === 'em_clamor';
  const isTestimony = tipo === 'testemunho';
  const unanswered = isPedidoSemResposta({ tipo, contagem: contagemIntercessores, criado_em: criadoEm });
  const TypeIcon = tipo === 'em_clamor' ? Heart : tipo === 'testemunho' ? Sparkles : tipo === 'reflexao' ? BookOpen : Heart;

  useEffect(() => {
    const interval = window.setInterval(() => setTimeTick(value => value + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!editando && !menuOpen && !confirmandoExcluir && !imageOpen) return;
    const closeOnBack = (event: Event) => {
      event.preventDefault();
      setEditando(false);
      setMenuOpen(false);
      setConfirmandoExcluir(false);
      setImageOpen(false);
    };
    window.addEventListener('comunhao:back-request', closeOnBack);
    return () => window.removeEventListener('comunhao:back-request', closeOnBack);
  }, [confirmandoExcluir, editando, imageOpen, menuOpen]);

  const sharePost = async () => {
    const payload = {
      title: 'Mural — Comunhão',
      text: `${autor}: ${texto}`,
      url: `${window.location.origin}/mural?pedido=${encodeURIComponent(id)}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setShareFeedback('Compartilhado');
      } else {
        await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
        setShareFeedback('Copiado');
      }
      window.setTimeout(() => setShareFeedback(''), 2200);
    } catch {
      // Cancelar o compartilhamento não deve gerar erro visível.
    }
  };

  const avatar = (
    <div className="relative shrink-0">
      <div className={`flex size-11 items-center justify-center overflow-hidden rounded-full border text-sm font-bold ${isTestimony ? 'border-amber-500/30 bg-amber-500/15 txt-amber' : 'border-[var(--accent-border)] bg-[var(--accent-soft)] txt-green'}`}>
        {autorFotoUrl ? <img src={autorFotoUrl} alt="" className="size-full object-cover" /> : autor?.[0]?.toUpperCase() ?? '?'}
      </div>
      {autorBrasaoInstitucional && (
        <span className="absolute -bottom-1.5 -right-2 z-10">
          <InstitutionalCrest kind={autorBrasaoInstitucional} size={22} />
        </span>
      )}
    </div>
  );

  const handleCardDoubleTap = () => {
    if (!isPrayerRequest) return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (!intercedendo) {
        triggerPrayerIntercededHaptic();
        setShowAscent(true);
        onInterceder();
      }
      setShowDoubleTapHeart(true);
      window.setTimeout(() => setShowDoubleTapHeart(false), 900);
    }
    setLastTap(now);
  };

  return (
    <>
      <article
        id={`mural-publicacao-${id}`}
        onClick={handleCardDoubleTap}
        className={`spatial-section spatial-section--raised relic-surface mural-feed-card card-enter relative select-none overflow-hidden rounded-[1.4rem] border bg-[var(--surface)] ${unanswered ? 'mural-feed-card--awaiting-care border-[var(--care-border)]' : 'border-[var(--border)]'}`}
        data-publication-status={status}
      >
        {/* Animação de Coração Sagrado no Double-Tap */}
        {showDoubleTapHeart && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-[2px] animate-in fade-in zoom-in-50 duration-200">
            <div className="relative flex flex-col items-center gap-1.5 animate-out fade-out zoom-out-110 duration-700 delay-300">
              <span className="grid size-20 place-items-center rounded-full bg-[var(--accent-primary)]/20 shadow-[0_0_40px_var(--accent-primary)] text-[var(--accent-primary)]">
                <Heart size={44} className="fill-current" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] drop-shadow-md">Amém! Intercedido</span>
            </div>
          </div>
        )}
        <header className="mural-feed-card__header flex items-center gap-3 py-3">
          {autorId ? <Link to={`/perfil/${autorId}`} aria-label={`Abrir perfil de ${autor}`}>{avatar}</Link> : avatar}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {autorId ? <Link to={`/perfil/${autorId}`} className="truncate text-sm font-bold txt-primary">{autor || 'Anônimo'}</Link> : <span className="truncate text-sm font-bold txt-primary">{autor || 'Anônimo'}</span>}
              <PatentSeal xp={autorXp} />
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] txt-muted">
              {autorUsername && <span>@{autorUsername}</span>}
              {autorUsername && <span aria-hidden="true">•</span>}
              <time dateTime={criadoEm}>{formatRelativeTime(criadoEm)}</time>
            </div>
          </div>

          {isAdmin && (
            <div className="relative">
              <IconButton onClick={() => setMenuOpen(value => !value)} label="Opções da publicação"><MoreHorizontal size={18} /></IconButton>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-2xl">
                  <button type="button" onClick={() => { setEditando(true); setEditTexto(texto); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold txt-primary hover:bg-[var(--surface)]"><Edit3 size={15} /> Editar</button>
                  <button type="button" onClick={() => { setConfirmandoExcluir(true); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-[var(--danger)] hover:bg-[var(--care-soft)]"><Trash2 size={15} /> Excluir</button>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="mural-feed-card__badges flex flex-wrap items-center gap-2 pb-3">
          <Badge tone={typeMeta.tone}><TypeIcon size={14} aria-hidden="true" /> {typeMeta.label}</Badge>
          {unanswered && <Badge tone="care">Aguardando primeira intercessão</Badge>}
        </div>

        <div className={`mural-feed-card__content ${media ? 'mural-feed-card__content--with-media' : 'flex min-h-48 items-center px-5 py-8'} ${isTestimony ? 'mural-feed-card__content--testimony' : ''}`}>
          {editando ? (
            <div className="w-full space-y-3 px-5 py-5">
              <textarea className="input-theme min-h-32 w-full resize-none rounded-xl p-4 text-sm leading-6 outline-none" value={editTexto} onChange={event => setEditTexto(event.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => { setEditando(false); setEditTexto(texto); }} variant="ghost" className="flex-1">Cancelar</Button>
                <Button onClick={() => { onEditar?.(id, editTexto.trim()); setEditando(false); }} disabled={!editTexto.trim()} className="flex-1">Salvar</Button>
              </div>
            </div>
          ) : (
            <>
              <p className={`w-full whitespace-pre-wrap text-[1.02rem] leading-7 ${media ? 'px-5 py-4' : ''} ${isTestimony ? 'font-medium text-[var(--celebration)]' : 'txt-primary'}`}>{texto}</p>
              {media?.signedUrl && (
                <button
                  type="button"
                  onClick={() => setImageOpen(true)}
                  className="mural-photo-frame relative block w-full overflow-hidden border-t border-[var(--border)] bg-black/20 text-left"
                  aria-label="Ampliar foto da publicação"
                >
                  <img
                    src={media.signedUrl}
                    alt={media.altText || `Foto publicada por ${autor}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm" aria-hidden="true">
                    <Maximize2 size={17} />
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {isPrayerRequest && (
          <div className="mural-feed-card__care-row flex items-center gap-2 border-b border-[var(--border)] py-3">
            <div className="flex -space-x-2" aria-hidden="true">
              {Array.from({ length: Math.min(3, Math.max(1, contagemIntercessores)) }).map((_, index) => (
                <span
                  key={index}
                  className={`grid size-7 place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent-soft)] txt-green ${
                    index === 0 && contagemIntercessores > 0 ? 'prayer-resonance-pulse' : ''
                  }`}
                >
                  <Heart size={13} aria-hidden="true" />
                </span>
              ))}
            </div>
            <p className="text-xs txt-secondary">
              {contagemIntercessores === 0
                ? 'Este pedido ainda aguarda intercessão'
                : `${contagemIntercessores} ${contagemIntercessores === 1 ? 'pessoa está' : 'pessoas estão'} intercedendo`}
            </p>
          </div>
        )}

        <div className="mural-feed-card__actions flex items-center gap-1 py-2">
          {isPrayerRequest ? (
            <button
              type="button"
              onClick={() => {
                if (!intercedendo) {
                  triggerPrayerIntercededHaptic();
                  setShowAscent(true);
                }
                onInterceder();
              }}
              disabled={loading}
              className={`mural-intercede-action relative overflow-visible flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold active:scale-[0.98] disabled:opacity-60 ${intercedendo ? 'mural-intercede-action--active' : 'txt-primary'}`}
              aria-label={intercedendo ? 'Deixar de interceder por esta publicação' : 'Interceder por esta publicação'}
              aria-pressed={intercedendo}
            >
              <PrayerAscentEffect active={showAscent} onComplete={() => setShowAscent(false)} />
              <Heart size={23} className={`${intercedendo ? 'fill-current' : ''} ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Atualizando…' : intercedendo ? 'Intercedendo' : 'Interceder'}</span>
            </button>
          ) : isTestimony ? (
            <div className="flex min-h-11 items-center gap-2 px-3 text-sm font-semibold txt-amber"><Sparkles size={22} /> Celebrar</div>
          ) : null}

          {permiteComentarios && (
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold txt-primary active:scale-[0.98]"
              aria-label={`Abrir ${comentariosContagem} comentários`}
            >
              <MessageCircle size={21} />
              <span>{comentariosContagem}</span>
            </button>
          )}

          <button type="button" onClick={sharePost} className="ml-auto flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold txt-primary active:scale-[0.98]" aria-label="Compartilhar publicação">
            <Send size={21} />
            <span className="hidden min-[390px]:inline">{shareFeedback || 'Compartilhar'}</span>
          </button>
        </div>

        {confirmandoExcluir && (
          <div className="border-t border-[var(--care-border)] bg-[var(--care-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--danger)]">Excluir esta publicação?</p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmandoExcluir(false)} className="!min-h-10 flex-1 text-xs"><X size={15} /> Cancelar</Button>
              <Button variant="danger" onClick={() => { onExcluir?.(id); setConfirmandoExcluir(false); }} className="!min-h-10 flex-1 text-xs"><Check size={15} /> Confirmar</Button>
            </div>
          </div>
        )}
      </article>

      <CommentsSheet
        publicationId={id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={count => onComentariosAlterados?.(id, count)}
      />

      {imageOpen && media?.signedUrl && (
        <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black/95 p-3" role="dialog" aria-modal="true" aria-label="Foto ampliada da publicação" onClick={() => setImageOpen(false)}>
          <button type="button" className="absolute right-4 top-[calc(1rem+var(--safe-area-top))] grid size-11 place-items-center rounded-full bg-white/10 text-white" onClick={() => setImageOpen(false)} aria-label="Fechar foto">
            <X size={22} />
          </button>
          <img src={media.signedUrl} alt={media.altText || `Foto publicada por ${autor}`} className="max-h-full max-w-full rounded-xl object-contain" onClick={event => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}
