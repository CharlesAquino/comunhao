import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Trash2, X } from 'lucide-react';
import type { MuralComment } from '../../types';
import InstitutionalCrest from '../InstitutionalCrest';
import {
  createMuralComment,
  deleteMuralComment,
  listMuralComments,
  subscribeToMuralComments,
} from '../../services/muralCommentsService';
import { MURAL_MAX_COMMENT_LENGTH } from '../../services/muralSocial';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { useToast } from '../../contexts/ToastContext';
import PatentSeal from './PatentSeal';

interface CommentsSheetProps {
  publicationId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function CommentsSheet({ publicationId, open, onClose, onCountChange }: CommentsSheetProps) {
  const [comments, setComments] = useState<MuralComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  const toast = useToast();

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const load = useCallback(async () => {
    try {
      const rows = await listMuralComments(publicationId);
      setComments(rows);
      onCountChangeRef.current?.(rows.length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [publicationId, toast]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load();
    const unsubscribe = subscribeToMuralComments(publicationId, () => void load());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [load, open, publicationId]);

  useEffect(() => {
    if (!open) return;
    const closeOnBack = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    window.addEventListener('comunhao:back-request', closeOnBack);
    return () => window.removeEventListener('comunhao:back-request', closeOnBack);
  }, [onClose, open]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await createMuralComment(publicationId, text);
      setText('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao comentar');
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await deleteMuralComment(commentId);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir comentário');
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-end bg-black/60 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <section
        className="comments-sheet mx-auto flex max-h-[82dvh] w-full max-w-[var(--app-max-width)] flex-col rounded-t-[1.75rem] border-x border-t border-[var(--border)] bg-[var(--canvas)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`comments-title-${publicationId}`}
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id={`comments-title-${publicationId}`} className="font-display text-lg font-semibold txt-primary">Comentários</h2>
            <p className="text-xs txt-tertiary">{comments.length} {comments.length === 1 ? 'comentário' : 'comentários'}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-[var(--border)] txt-secondary" aria-label="Fechar comentários">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
          {loading ? (
            <p className="py-10 text-center text-sm txt-tertiary">Carregando comentários...</p>
          ) : comments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold txt-primary">Seja o primeiro a apoiar</p>
              <p className="mt-1 text-sm txt-tertiary">Escreva uma palavra de cuidado e fé.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map(comment => (
                <article key={comment.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="grid size-10 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-sm font-bold txt-primary">
                        {comment.authorPhotoUrl ? <img src={comment.authorPhotoUrl} alt="" className="size-full object-cover" /> : comment.authorName[0]?.toUpperCase()}
                      </div>
                      {comment.authorInstitutionalCrest && <span className="absolute -bottom-1 -right-2"><InstitutionalCrest kind={comment.authorInstitutionalCrest} size={20} /></span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold txt-primary">{comment.authorName}</p>
                        <PatentSeal xp={comment.authorXp} compact />
                        <time className="ml-auto shrink-0 text-[10px] txt-muted" dateTime={comment.createdAt}>{formatRelativeTime(comment.createdAt)}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 txt-secondary">{comment.text}</p>
                      {comment.editedAt && <p className="mt-1 text-[10px] txt-muted">editado</p>}
                    </div>
                    {comment.isOwner && (
                      <button type="button" onClick={() => void remove(comment.id)} className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--danger)]" aria-label="Excluir comentário">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-[calc(0.9rem+var(--safe-area-bottom))] pt-3">
          <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={event => setText(event.target.value.slice(0, MURAL_MAX_COMMENT_LENGTH))}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Escreva um comentário..."
              className="input-theme min-h-12 min-w-0 flex-1 rounded-full px-4 text-sm outline-none"
              aria-label="Novo comentário"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!text.trim() || sending}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-45"
              aria-label="Enviar comentário"
            >
              <Send size={19} />
            </button>
          </div>
          <p className="mt-1 pr-14 text-right text-[10px] txt-muted">{text.length}/{MURAL_MAX_COMMENT_LENGTH}</p>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
