import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronRight, Check, X, RotateCcw, Plus, Edit3, Trash2, Award, LayoutPanelTop } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLicoes, getLicaoCompleta, verificarRespostaQuiz, adminCriarLicao, adminAtualizarLicao, adminExcluirLicao, adminAdicionarPergunta, adminAtualizarPergunta, adminExcluirPergunta } from '../services/ebdLessonService';
import { creditarKesef, creditarXp } from '../services/kesefService';
import { KESEF_VALORES } from '../services/kesefConstants';
import { XP_ACOES } from '../services/patente';
import type { LicaoEBD, PerguntaQuiz } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAdmin } from '../contexts/AdminContext';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import SealIcon from '../components/ui/SealIcon';
import EbdJourney from '../components/ebd/EbdJourney';
import { getPublishedEditorialLesson, subscribeToEditorialLesson } from '../services/ebdEditorialService';
import type { EbdEditorialLesson } from '../types/ebdEditorial';
import { cacheEditorialLesson, getCachedEditorialLesson } from '../services/ebdProgressService';
import { readScreenCache, SCREEN_CACHE_KEYS, writeScreenCache } from '../services/screenCache';

const EBD_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;
interface EbdScreenCache { lessons: LicaoEBD[]; editorial: EbdEditorialLesson | null }

type ViewState = 'list' | 'content' | 'lesson';

export default function EBD() {
  const [cachedEbd] = useState(() => readScreenCache<EbdScreenCache>(SCREEN_CACHE_KEYS.EBD, EBD_CACHE_AGE));
  const [licoes, setLicoes] = useState<LicaoEBD[]>(() => cachedEbd?.lessons ?? []);
  const [view, setView] = useState<ViewState>('list');
  const [licaoAtual, setLicaoAtual] = useState<LicaoEBD | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaQuiz[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [respondeu, setRespondeu] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [loading, setLoading] = useState(() => cachedEbd === null);
  const [editorialLesson, setEditorialLesson] = useState<EbdEditorialLesson | null>(() => cachedEbd?.editorial ?? getCachedEditorialLesson());
  const toast = useToast();
  const { isAdmin } = useAdmin();

  // Admin state
  const [adminModal, setAdminModal] = useState<'licao' | 'pergunta' | null>(null);
  const [editLicaoId, setEditLicaoId] = useState<string | null>(null);
  const [editPerguntaId, setEditPerguntaId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formPergunta, setFormPergunta] = useState('');
  const [formAlt1, setFormAlt1] = useState('');
  const [formAlt2, setFormAlt2] = useState('');
  const [formAlt3, setFormAlt3] = useState('');
  const [formAlt4, setFormAlt4] = useState('');
  const [formCorreta, setFormCorreta] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);

  const loadLicoes = useCallback(async () => {
    try {
      const [data, editorial] = await Promise.all([
        getLicoes(),
        getPublishedEditorialLesson().catch(() => null),
      ]);
      setLicoes(data);
      setEditorialLesson(editorial);
      cacheEditorialLesson(editorial);
      writeScreenCache(SCREEN_CACHE_KEYS.EBD, { lessons: data, editorial });
    } catch (error) {
      const cached = getCachedEditorialLesson();
      if (cached) setEditorialLesson(cached);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar lições');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadLicoes(); }, [loadLicoes]);

  useEffect(() => subscribeToEditorialLesson(() => {
    getPublishedEditorialLesson().then(lesson => {
      setEditorialLesson(lesson);
      cacheEditorialLesson(lesson);
      writeScreenCache(SCREEN_CACHE_KEYS.EBD, { lessons: licoes, editorial: lesson });
    }).catch(() => undefined);
  }), [licoes]);

  const licaoAtualId = licaoAtual?.id;
  useEffect(() => {
    if (finalizado && licaoAtualId && acertos > 0) {
      void creditarKesef('licao', KESEF_VALORES.LICAO_CONCLUIDA, licaoAtualId).catch(() => undefined);
      void creditarXp(XP_ACOES.LICAO, licaoAtualId).catch(() => undefined);
    }
  }, [finalizado, licaoAtualId, acertos]);

  const abrirLicao = async (licao: LicaoEBD) => {
    setLicaoAtual(licao);
    setPerguntaAtual(0);
    setRespostaSelecionada(null);
    setRespondeu(false);
    setAcertos(0);
    setFinalizado(false);
    setLoading(true);
    try {
      const data = await getLicaoCompleta(licao.id);
      setPerguntas(data.perguntas);
      setView('content');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar lição');
    } finally {
      setLoading(false);
    }
  };

  const iniciarQuiz = () => {
    setView('lesson');
  };

  const responder = (index: number) => {
    if (respondeu) return;
    setRespostaSelecionada(index);
    setRespondeu(true);
    const acertou = verificarRespostaQuiz(perguntas[perguntaAtual], index);
    if ('vibrate' in navigator) {
      navigator.vibrate?.(acertou ? [30, 50, 40] : [70]);
    }
    if (acertou) {
      setAcertos(prev => prev + 1);
      const pergunta = perguntas[perguntaAtual];
      creditarKesef('quiz_acerto', KESEF_VALORES.QUIZ_ACERTO, pergunta.id).catch(() => {});
    }
  };

  const proximaPergunta = () => {
    if (perguntaAtual + 1 < perguntas.length) {
      setPerguntaAtual(prev => prev + 1);
      setRespostaSelecionada(null);
      setRespondeu(false);
    } else {
      setFinalizado(true);
    }
  };

  const voltarLista = () => {
    setView('list');
    setLicaoAtual(null);
    setPerguntas([]);
    setFinalizado(false);
  };

  // ─── Admin CRUD ─────────────────────────────────────────────

  const abrirCriarLicao = () => {
    setEditLicaoId(null);
    setFormTitulo('');
    setFormDescricao('');
    setFormRef('');
    setAdminModal('licao');
  };

  const abrirEditarLicao = (l: LicaoEBD) => {
    setEditLicaoId(l.id);
    setFormTitulo(l.titulo);
    setFormDescricao(l.descricao || '');
    setFormRef(l.referencia_biblica || '');
    setAdminModal('licao');
  };

  const salvarLicao = async () => {
    if (!formTitulo.trim() || adminLoading) return;
    setAdminLoading(true);
    try {
      if (editLicaoId) {
        await adminAtualizarLicao(editLicaoId, { titulo: formTitulo.trim(), descricao: formDescricao.trim(), referencia_biblica: formRef.trim() });
        toast.success('Lição atualizada');
      } else {
        await adminCriarLicao({ titulo: formTitulo.trim(), descricao: formDescricao.trim(), referencia_biblica: formRef.trim() });
        toast.success('Lição criada');
      }
      setAdminModal(null);
      loadLicoes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar lição');
    } finally {
      setAdminLoading(false);
    }
  };

  const excluirLicao = async (id: string) => {
    if (!confirm('Excluir esta lição e todas as suas perguntas?')) return;
    try {
      await adminExcluirLicao(id);
      toast.success('Lição excluída');
      loadLicoes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  const abrirAdicionarPergunta = () => {
    setEditPerguntaId(null);
    setFormPergunta('');
    setFormAlt1('');
    setFormAlt2('');
    setFormAlt3('');
    setFormAlt4('');
    setFormCorreta(0);
    setAdminModal('pergunta');
  };

  const abrirEditarPergunta = (p: PerguntaQuiz) => {
    setEditPerguntaId(p.id);
    setFormPergunta(p.pergunta);
    setFormAlt1(p.alternativas[0] || '');
    setFormAlt2(p.alternativas[1] || '');
    setFormAlt3(p.alternativas[2] || '');
    setFormAlt4(p.alternativas[3] || '');
    setFormCorreta(p.resposta_correta);
    setAdminModal('pergunta');
  };

  const salvarPergunta = async () => {
    if (!formPergunta.trim() || !formAlt1.trim() || adminLoading || !licaoAtual) return;
    setAdminLoading(true);
    const alternativas = [formAlt1.trim(), formAlt2.trim(), formAlt3.trim(), formAlt4.trim()].filter(Boolean);
    try {
      if (editPerguntaId) {
        await adminAtualizarPergunta(editPerguntaId, { pergunta: formPergunta.trim(), alternativas, resposta_correta: formCorreta });
        toast.success('Pergunta atualizada');
      } else {
        await adminAdicionarPergunta({ licao_id: licaoAtual.id, pergunta: formPergunta.trim(), alternativas, resposta_correta: formCorreta });
        toast.success('Pergunta adicionada');
      }
      setAdminModal(null);
      const data = await getLicaoCompleta(licaoAtual.id);
      setPerguntas(data.perguntas);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar pergunta');
    } finally {
      setAdminLoading(false);
    }
  };

  const excluirPergunta = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return;
    try {
      await adminExcluirPergunta(id);
      toast.success('Pergunta excluída');
      if (licaoAtual) {
        const data = await getLicaoCompleta(licaoAtual.id);
        setPerguntas(data.perguntas);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  if (loading && view === 'list') {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-pulse txt-tertiary">Carregando lições...</div>
      </div>
    );
  }

  if (view === 'list' && editorialLesson) {
    return <EbdJourney lesson={editorialLesson} isAdmin={isAdmin} />;
  }

  if (view === 'content' && licaoAtual) {
    return (
      <div className="p-6 min-h-full relative z-10 space-y-6">
        {/* Barra de Progresso de Leitura Superior */}
        <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 pt-3 pb-2 backdrop-blur-md bg-[var(--canvas)]/80 border-b border-[var(--border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[var(--accent-primary)]">Leitura Sagrada</span>
            <span>{licaoAtual.referencia_biblica || 'Texto Bíblico'}</span>
          </div>
          <div className="h-1 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-[var(--accent-primary)] rounded-full w-full animate-in fade-in duration-500" />
          </div>
        </div>

        <Button onClick={voltarLista} variant="ghost" className="!px-3 text-sm">
          <ChevronRight size={16} className="rotate-180" />
          Voltar
        </Button>

        <div className="glass rounded-2xl p-6 card-3d space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider txt-muted">Lição</div>
            <h1 className="font-display text-2xl txt-primary">{licaoAtual.titulo}</h1>
            {licaoAtual.referencia_biblica && (
              <div className="inline-block glass-strong rounded-full px-4 py-1.5">
                <span className="text-sm font-serif italic text-amber-300">{licaoAtual.referencia_biblica}</span>
              </div>
            )}
          </div>

          {licaoAtual.descricao && (
            <p className="txt-secondary leading-relaxed">{licaoAtual.descricao}</p>
          )}

          {licaoAtual.texto_base && (
            <div className="glass-strong rounded-xl p-5">
              <p className="txt-primary leading-relaxed whitespace-pre-line">{licaoAtual.texto_base}</p>
            </div>
          )}

          {perguntas.length > 0 && (
            <div className="flex items-center gap-2 txt-tertiary text-sm">
              <BookOpen size={16} />
              <span>{perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={voltarLista} variant="ghost" className="flex-1 min-h-12">
            Voltar às Lições
          </Button>
          {perguntas.length > 0 && (
            <Button onClick={iniciarQuiz} className="flex-[2] min-h-12 text-lg">
              Começar Quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'lesson' && licaoAtual) {
    if (finalizado) {
      return (
        <div className="p-6 min-h-full relative z-10">
          <div className="glass rounded-2xl p-6 text-center space-y-4 card-3d">
            <SealIcon Icon={Award} size="lg" active className="mx-auto" />
            <h2 className="font-display text-xl txt-primary">{licaoAtual.titulo}</h2>
            <p className="txt-secondary text-lg">
              Você acertou <span className="txt-green font-bold">{acertos}</span> de <span className="font-bold">{perguntas.length}</span> perguntas
            </p>
            {acertos === perguntas.length && (
              <p className="txt-tertiary">Perfeito! Domínio completo da lição.</p>
            )}
            <div className="pt-4 flex justify-center gap-3">
              <Button onClick={voltarLista} variant="secondary">
                <SealIcon Icon={BookOpen} size="sm" />
                Voltar às Lições
              </Button>
              <Button onClick={() => abrirLicao(licaoAtual)}>
                <SealIcon Icon={RotateCcw} size="sm" />
                Refazer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const pergunta = perguntas[perguntaAtual];
    if (!pergunta) {
      return (
        <div className="p-6 flex items-center justify-center h-full">
          <div className="txt-tertiary">Nenhuma pergunta disponível para esta lição.</div>
        </div>
      );
    }

    return (
      <div className="p-6 min-h-full relative z-10 space-y-6">
        <Button onClick={voltarLista} variant="ghost" className="!px-3 text-sm">
          <ChevronRight size={16} className="rotate-180" />
          Voltar
        </Button>

        <div className="glass rounded-2xl p-4 card-3d">
          <div className="flex items-center justify-between mb-2">
            <div className="txt-tertiary text-sm">Lições</div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <IconButton onClick={abrirAdicionarPergunta} label="Adicionar pergunta">
                    <Plus size={14} />
                  </IconButton>
                  <IconButton onClick={() => abrirEditarPergunta(pergunta)} label="Editar pergunta">
                    <Edit3 size={14} />
                  </IconButton>
                  <IconButton onClick={() => excluirPergunta(pergunta.id)} label="Excluir pergunta" className="!text-[var(--danger)]">
                    <Trash2 size={14} />
                  </IconButton>
                </>
              )}
              <span className="txt-tertiary text-sm">{perguntaAtual + 1} / {perguntas.length}</span>
            </div>
          </div>
            <div className="w-full h-2 glass-strong rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent-solid)]/70 rounded-full transition-all duration-300" style={{ width: `${((perguntaAtual + 1) / perguntas.length) * 100}%` }} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-2 card-3d">
          <div className="text-xs font-semibold uppercase tracking-wider txt-muted">{licaoAtual.titulo}</div>
          <h2 className="text-lg font-bold txt-primary leading-relaxed">{pergunta.pergunta}</h2>
        </div>

        <div className="space-y-3">
          {pergunta.alternativas.map((alt, index) => {
            let estilo = 'glass-strong hover:bg-white/10 cursor-pointer';
            if (respondeu) {
              if (index === pergunta.resposta_correta) {
                estilo = 'bg-[var(--accent-solid)]/30 border border-green-subtle';
              } else if (index === respostaSelecionada) {
                estilo = 'bg-rose-600/30 border border-rose-400/50';
              } else {
                estilo = 'glass-strong opacity-50';
              }
            } else if (respostaSelecionada === index) {
              estilo = 'bg-[var(--accent-solid)]/30 border border-green-subtle';
            }

            return (
              <button
                key={index}
                onClick={() => responder(index)}
                className={`sanctuary-choice w-full text-left p-4 transition-premium flex items-center gap-3 ${estilo}`}
              >
                <span className="w-8 h-8 rounded-full glass-strong flex items-center justify-center text-sm font-bold shrink-0">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 txt-primary">{alt}</span>
                {respondeu && index === pergunta.resposta_correta && <Check className="txt-green shrink-0" size={20} />}
                {respondeu && index === respostaSelecionada && index !== pergunta.resposta_correta && <X className="text-rose-300 shrink-0" size={20} />}
              </button>
            );
          })}
        </div>

          {respondeu && (
            <Button onClick={proximaPergunta} className="w-full min-h-14 text-lg">
            {perguntaAtual + 1 < perguntas.length ? 'Próxima Pergunta' : 'Ver Resultado'}
            </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full relative z-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl txt-primary">Escola Bíblica Digital</h1>
        <p className="txt-tertiary text-sm">Lições e Quiz</p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <Link to="/admin/ebd-studio" className="button-seal button-seal--primary inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold">
            <SealIcon Icon={LayoutPanelTop} size="sm" /> Estúdio
          </Link>
          <Button onClick={abrirCriarLicao} variant="secondary" className="w-full">
            <SealIcon Icon={Plus} size="sm" /> Lição simples
          </Button>
        </div>
      )}

      {licoes.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center card-3d">
          <SealIcon Icon={BookOpen} size="lg" className="mx-auto mb-3 txt-muted" />
          <p className="txt-tertiary">Nenhuma lição disponível ainda.</p>
          <p className="txt-muted text-sm mt-1">Em breve o professor adicionará o conteúdo.</p>
        </div>
      ) : (
        licoes.map((licao) => (
          <div key={licao.id} className="flex items-start gap-2">
            <button
              onClick={() => abrirLicao(licao)}
              className="sanctuary-disclosure flex-1 glass rounded-2xl p-5 text-left card-3d"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-bold txt-primary truncate">{licao.titulo}</h3>
                  {licao.descricao && <p className="txt-tertiary text-sm line-clamp-2">{licao.descricao}</p>}
                  {licao.referencia_biblica && (
                    <div className="inline-block glass-strong rounded-full px-3 py-1 mt-1">
                      <span className="text-xs txt-muted">{licao.referencia_biblica}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="txt-muted shrink-0 mt-1" size={20} />
              </div>
            </button>
            {isAdmin && (
              <div className="flex flex-col gap-1 pt-3 shrink-0">
                <IconButton onClick={() => abrirEditarLicao(licao)} label="Editar lição">
                  <Edit3 size={14} />
                </IconButton>
                <IconButton onClick={() => excluirLicao(licao.id)} label="Excluir lição" className="!text-[var(--danger)]">
                  <Trash2 size={14} />
                </IconButton>
              </div>
            )}
          </div>
        ))
      )}

      {/* ─── Modal Lição ─── */}
      {adminModal === 'licao' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setAdminModal(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold txt-primary">{editLicaoId ? 'Editar Lição' : 'Nova Lição'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Título</label>
                <input className="w-full input-theme rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--accent-solid)] outline-none transition text-sm mt-1" value={formTitulo} onChange={e => setFormTitulo(e.target.value)} placeholder="Título da lição" />
              </div>
              <div>
                <label className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Descrição</label>
                <textarea className="w-full input-theme rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--accent-solid)] outline-none transition text-sm mt-1 resize-none h-20" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Breve descrição" />
              </div>
              <div>
                <label className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Referência Bíblica</label>
                <input className="w-full input-theme rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--accent-solid)] outline-none transition text-sm mt-1" value={formRef} onChange={e => setFormRef(e.target.value)} placeholder="Ex: João 3:16" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setAdminModal(null)} variant="ghost" className="flex-1">Cancelar</Button>
              <Button onClick={salvarLicao} disabled={adminLoading} className="flex-1">
                {adminLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Pergunta ─── */}
      {adminModal === 'pergunta' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setAdminModal(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold txt-primary">{editPerguntaId ? 'Editar Pergunta' : 'Nova Pergunta'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Pergunta</label>
                <textarea className="w-full input-theme rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--accent-solid)] outline-none transition text-sm mt-1 resize-none h-20" value={formPergunta} onChange={e => setFormPergunta(e.target.value)} placeholder="Digite a pergunta" />
              </div>
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <label className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Alternativa {String.fromCharCode(64 + i)}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      className={`flex-1 input-theme rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--accent-solid)] outline-none transition text-sm ${formCorreta === i - 1 ? 'ring-2 ring-[var(--accent-solid)]' : ''}`}
                      value={[formAlt1, formAlt2, formAlt3, formAlt4][i - 1]}
                      onChange={e => {
                        const setter = [setFormAlt1, setFormAlt2, setFormAlt3, setFormAlt4][i - 1];
                        setter(e.target.value);
                      }}
                      placeholder={`Alternativa ${String.fromCharCode(64 + i)}`}
                    />
                    <IconButton
                      onClick={() => setFormCorreta(i - 1)}
                      label="Marcar como correta"
                      className={formCorreta === i - 1 ? '!text-[var(--accent-primary)] !border-[var(--accent-primary)]' : ''}
                    >
                      {formCorreta === i - 1 ? <Check size={16} /> : <X size={16} />}
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setAdminModal(null)} variant="ghost" className="flex-1">Cancelar</Button>
              <Button onClick={salvarPergunta} disabled={adminLoading} className="flex-1">
                {adminLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
