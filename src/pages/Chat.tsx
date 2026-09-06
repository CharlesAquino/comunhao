import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Check, CheckCheck, Sparkles } from 'lucide-react';
import { getConversa, enviarMensagem, enviarFigurinha, subscribeToMensagens, marcarComoLidas } from '../services/mensagemService';
import type { MensagemComRemetente } from '../services/mensagemService';
import { getUserId } from '../services/authService';
import { getCurrentUserProfile, getUserPublicProfile } from '../services/dataService';
import { ROUTES } from '../services/constants';
import { useToast } from '../contexts/ToastContext';
import IconButton from '../components/ui/IconButton';
import { corAvatar, corTextoAvatar } from '../utils/avatarColor';
import InstitutionalCrest from '../components/InstitutionalCrest';
import type { InstitutionalCrestKind } from '../services/institutionalCrestRules';
import { getPublicInstitutionalCrest } from '../services/institutionalCrestService';
import PrayerStickerPicker from '../components/oracao/PrayerStickerPicker';
import PrayerSticker from '../components/oracao/PrayerSticker';
import { PRAYER_STICKERS, type PrayerStickerDefinition, type PrayerStickerPack } from '../services/prayerStickerService';

type AvatarInfo = {
  nome: string;
  foto_url: string | null;
  brasao_institucional?: InstitutionalCrestKind | null;
};

function AvatarMensagem({ nome, fotoUrl, brasao, tamanho = 'md' }: { nome: string; fotoUrl?: string | null; brasao?: InstitutionalCrestKind | null; tamanho?: 'sm' | 'md' }) {
  const classes = tamanho === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';

  return (
    <span className="relative shrink-0">
      {fotoUrl
        ? <img src={fotoUrl} alt={nome} className={`${classes} rounded-full object-cover`} />
        : <span className={`${classes} flex items-center justify-center rounded-full font-semibold`} style={{ backgroundColor: corAvatar(nome), color: corTextoAvatar() }}>{nome ? nome[0]?.toUpperCase() : '?'}</span>}
      {brasao && <span className="absolute -bottom-1 -right-1.5"><InstitutionalCrest kind={brasao} size={tamanho === 'sm' ? 17 : 20} /></span>}
    </span>
  );
}

export default function Chat() {
  const { userId: parceiroId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [mensagens, setMensagens] = useState<MensagemComRemetente[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parceiroNome, setParceiroNome] = useState('Carregando...');
  const [erro, setErro] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [parceiro, setParceiro] = useState<AvatarInfo | null>(null);
  const [meuPerfil, setMeuPerfil] = useState<AvatarInfo | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerPack, setStickerPack] = useState<PrayerStickerPack>('essencial');
  const bottomRef = useRef<HTMLDivElement>(null);

  const voltar = () => {
    navigate(ROUTES.HOME);
  };

  useEffect(() => {
    (async () => {
      try {
        setCurrentUserId(await getUserId());
        const meu = await getCurrentUserProfile();
        if (meu) {
          const brasao = await getPublicInstitutionalCrest(meu.id);
          setMeuPerfil({ nome: meu.nome, foto_url: meu.foto_url ?? null, brasao_institucional: brasao });
        }
      } catch {
        setErro('Seu perfil não está vinculado à conta. Entre novamente ou procure o professor.');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!parceiroId || !currentUserId) return;

    const carregar = async () => {
      try {
        const [msgs] = await Promise.all([
          getConversa(parceiroId),
          marcarComoLidas(parceiroId),
        ]);
        setMensagens(msgs);
      } catch {
        setErro('Não foi possível carregar esta conversa.');
        toast.error('Erro ao carregar mensagens');
      } finally {
        setLoading(false);
      }
    };

    carregar();

    const unsub = subscribeToMensagens(currentUserId, parceiroId, async () => {
      const msgs = await getConversa(parceiroId);
      setMensagens(msgs);
      marcarComoLidas(parceiroId);
    });

    return () => {
      unsub();
    };
  }, [parceiroId, currentUserId, toast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (!parceiroId) return;
    (async () => {
      try {
        const profile = await getUserPublicProfile(parceiroId);
        if (!profile) {
          setParceiroNome('Conversa indisponível');
          setErro('Este membro não foi encontrado.');
          setLoading(false);
          return;
        }
        setParceiroNome(profile.nome);
        setParceiro({ nome: profile.nome, foto_url: profile.foto_url ?? null, brasao_institucional: profile.brasao_institucional });
      } catch {
        setParceiroNome('Conversa indisponível');
        setErro('Não foi possível localizar este membro.');
        setLoading(false);
      }
    })();
  }, [parceiroId]);

  const handleEnviar = async () => {
    if (!texto.trim() || !parceiroId || enviando) return;
    setEnviando(true);
    try {
      await enviarMensagem(parceiroId, texto.trim());
      setTexto('');
      const msgs = await getConversa(parceiroId);
      setMensagens(msgs);
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleEnviarFigurinha = async (sticker: PrayerStickerDefinition) => {
    if (!parceiroId || enviando) return;
    setEnviando(true);
    try {
      await enviarFigurinha(parceiroId, sticker, stickerPack);
      setStickerPickerOpen(false);
      setMensagens(await getConversa(parceiroId));
    } catch {
      toast.error('Não foi possível enviar a figurinha.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden" style={{ background: 'var(--body-bg)' }}>
      <header
        className="flex items-center gap-3 border-b border-subtle px-4 pb-3 pt-3 sm:px-6"
        style={{
          background: 'var(--surface-bg)',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        }}
      >
        <IconButton label="Voltar para o início" onClick={voltar}>
          <ArrowLeft size={22} />
        </IconButton>
        <AvatarMensagem nome={parceiro?.nome ?? parceiroNome} fotoUrl={parceiro?.foto_url} brasao={parceiro?.brasao_institucional} />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold txt-primary truncate">{parceiroNome}</h1>
          <p className="text-[11px] txt-muted">Mensagens</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
        {erro ? (
          <div role="alert" className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-rose-400">{erro}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-[var(--accent-solid)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-elevated border border-subtle flex items-center justify-center mb-4">
              <Send size={24} className="txt-muted" />
            </div>
            <p className="text-sm txt-secondary font-medium">Nenhuma mensagem ainda</p>
            <p className="text-xs txt-tertiary mt-1">Envie uma mensagem para começar a conversa</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.remetente_id === parceiroId ? 'justify-start' : 'justify-end'}`}
            >
              {msg.remetente_id === parceiroId && (
                <AvatarMensagem nome={parceiro?.nome ?? parceiroNome} fotoUrl={parceiro?.foto_url} brasao={parceiro?.brasao_institucional} tamanho="sm" />
              )}
              <div className={msg.tipo === 'figurinha'
                ? 'chat-sticker-message'
                : `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.remetente_id === parceiroId ? 'bg-surface border border-subtle txt-primary rounded-tl-sm' : 'bg-[var(--accent-soft)] border border-green-subtle txt-green rounded-tr-sm'}`}
              >
                {msg.tipo === 'figurinha' && msg.figurinha_id && msg.figurinha_pacote ? (() => {
                  const sticker = PRAYER_STICKERS.find(item => item.id === msg.figurinha_id);
                  return sticker ? <PrayerSticker sticker={sticker} pack={msg.figurinha_pacote} /> : <p>{msg.texto}</p>;
                })() : <p>{msg.texto}</p>}
                <div className={`flex items-center justify-end gap-1 mt-1 ${msg.tipo === 'figurinha' ? 'chat-sticker-message__meta' : ''}`}>
                  <span className="text-[10px] txt-muted">
                    {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.remetente_id !== parceiroId && (
                    msg.lida
                      ? <CheckCheck size={12} className="txt-green" />
                      : <Check size={12} className="txt-muted" />
                  )}
                </div>
              </div>
              {msg.remetente_id !== parceiroId && (
                <AvatarMensagem nome={meuPerfil?.nome ?? 'Você'} fotoUrl={meuPerfil?.foto_url} brasao={meuPerfil?.brasao_institucional} tamanho="sm" />
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="border-t border-subtle px-4 pb-3 pt-3 sm:px-6"
        style={{
          background: 'var(--surface-bg)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        }}
      >
        <div className="flex items-end gap-2">
          <IconButton
            label="Enviar figurinha"
            onClick={() => setStickerPickerOpen(open => !open)}
            disabled={Boolean(erro)}
            aria-expanded={stickerPickerOpen}
            className={stickerPickerOpen ? '!bg-[var(--celebration-soft)] !text-[var(--celebration)]' : ''}
          >
            <Sparkles size={18} />
          </IconButton>
          <textarea
            aria-label="Mensagem"
            disabled={Boolean(erro)}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="flex-1 input-theme rounded-2xl py-3 px-4 text-sm outline-none resize-none max-h-28 disabled:opacity-50"
          />
          <IconButton
            label="Enviar mensagem"
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando || Boolean(erro)}
            className="!bg-[var(--accent-primary)] !text-[var(--text-on-accent)]"
          >
            <Send size={18} />
          </IconButton>
        </div>
      </div>
      <PrayerStickerPicker
        open={stickerPickerOpen}
        pack={stickerPack}
        sending={enviando}
        context="chat"
        onPackChange={setStickerPack}
        onClose={() => setStickerPickerOpen(false)}
        onSelect={handleEnviarFigurinha}
      />
    </div>
  );
}
