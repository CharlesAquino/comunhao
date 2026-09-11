import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  FilePlus2,
  History,
  Image,
  LayoutPanelTop,
  ListChecks,
  PenLine,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import TextInputDialog from '../components/ui/TextInputDialog';
import Card from '../components/ui/Card';
import SealIcon from '../components/ui/SealIcon';
import { AdminPageHeader } from '../components/admin/AdminPage';
import { createRuntimeId } from '../utils/createRuntimeId';
import {
  changeEditorialLessonStatus,
  createEditorialLesson,
  deleteEditorialLesson,
  getEditorialLessons,
  getEditorialLessonById,
  getEditorialVersions,
  generateEditorialDayWithAI,
  publishEditorialLesson,
  publishEditorialDayNow,
  publishEditorialWeekNow,
  saveEditorialLesson,
  saveUnreleasedEditorialDay,
  uploadEditorialImage,
} from '../services/ebdEditorialService';
import { listKnowledgeSources } from '../services/conhecimentoService';
import {
  createEmptyEditorialDocument,
  EBD_WEEKDAYS,
  getQuizSettings,
  getEditorialCoverImage,
  type EbdBlockType,
  type EbdEditorialBlock,
  type EbdEditorialDay,
  type EbdEditorialLesson,
  type EbdQuizQuestion,
  type EbdEditorialVersion,
  type EbdAiGeneratedDay,
} from '../types/ebdEditorial';
import type { KnowledgeSource } from '../types/conhecimento';
import { validateEditorialDayLanguage } from '../services/editorialLanguage';
import {
  createEditorialSlug as slugify,
  createEmptyQuizQuestion,
  EBD_STUDIO_BLOCK_OPTIONS as BLOCK_OPTIONS,
  EBD_STUDIO_STATUS_LABELS as STATUS_LABELS,
  GENERATED_WEEKDAY_COUNT,
  getEbdBlockLabel as blockLabel,
  getEditorialReleaseModeClasses as releaseModeClasses,
  getEditorialReleaseModeLabel as releaseModeLabel,
} from '../services/ebdStudioRules';
import EditorialPreview from '../components/ebd/EditorialPreview';
import EditorialSourceImport from '../components/ebd/EditorialSourceImport';
import EditorialPreflight from '../components/ebd/EditorialPreflight';
import { extractEditorialSourceDay, type EditorialSourceDay } from '../services/ebdSourcePackage';

const AGENT_PREPARE_BLOCK_TYPES: EbdBlockType[] = BLOCK_OPTIONS
  .filter(option => option.type !== 'video')
  .map(option => option.type);

export default function EbdStudio() {
  const navigate = useNavigate();
  const { can, checking } = useAdmin();
  const canRead = can('ebd.read');
  const canManage = can('ebd.manage');
  const canPublish = can('ebd.publish');
  const canReview = can('ebd.review') || canPublish;
  const toast = useToast();
  const [lessons, setLessons] = useState<EbdEditorialLesson[]>([]);
  const [selected, setSelected] = useState<EbdEditorialLesson | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [blockPaletteOpen, setBlockPaletteOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const editRevision = useRef(0);
  const autosaveInFlight = useRef(false);
  const [versions, setVersions] = useState<EbdEditorialVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [uploadingBlocks, setUploadingBlocks] = useState<Record<string, boolean>>({});
  const [uploadingWeekCover, setUploadingWeekCover] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCooldown, setAiCooldown] = useState(0);

  useEffect(() => {
    if (aiCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setAiCooldown(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [aiCooldown]);

  const [aiDraft, setAiDraft] = useState<EbdAiGeneratedDay | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [knowledgeSourcesLoading, setKnowledgeSourcesLoading] = useState(false);
  const [knowledgeSourceSearch, setKnowledgeSourceSearch] = useState('');
  const [aiSelectedBlockTypes, setAiSelectedBlockTypes] = useState<EbdBlockType[]>(
    () => BLOCK_OPTIONS.map(option => option.type),
  );
  const [aiForm, setAiForm] = useState({
    audience: 'Jovens e adultos',
    tone: 'Bíblico, acolhedor, claro e prático',
    objective: '',
    additionalInstructions: '',
  });
  const [reasonDialog, setReasonDialog] = useState<'archive' | 'draft' | null>(null);
  const [reason, setReason] = useState('');

  const loadLessons = useCallback(async () => {
    try {
      setLessons(await getEditorialLessons());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o Estúdio.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (canRead) loadLessons();
    else if (!checking) setLoading(false);
  }, [checking, canRead, loadLessons]);

  const loadKnowledgeSources = useCallback(async () => {
    if (!canRead || knowledgeSourcesLoading) return;
    setKnowledgeSourcesLoading(true);
    try {
      setKnowledgeSources(await listKnowledgeSources());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as fontes RAG.');
    } finally {
      setKnowledgeSourcesLoading(false);
    }
  }, [canRead, knowledgeSourcesLoading, toast]);

  const day = selected?.document.days[selectedDay];
  const completeness = useMemo(() => {
    if (!selected) return 0;
    const completeDays = selected.document.days.filter(item => item.day !== 'sunday' && item.blocks.length > 0).length;
    return Math.round((completeDays / GENERATED_WEEKDAY_COUNT) * 100);
  }, [selected]);
  const incompleteDays = useMemo(() => {
    if (!selected) return [];
    return selected.document.days.filter(item => item.day !== 'sunday' && item.blocks.length === 0);
  }, [selected]);
  const selectedDayReady = Boolean(day && day.blocks.length > 0);
  const firstLanguageIssue = selected?.document.days
    .flatMap(candidate => validateEditorialDayLanguage(candidate).map(issue => ({ day: candidate, issue })))
    [0];

  const requireEditorialLanguageReady = () => {
    if (!firstLanguageIssue) return true;
    toast.error(`${firstLanguageIssue.day.label}: ${firstLanguageIssue.issue.message}`);
    return false;
  };
  const readyDays = selected?.document.days.filter(item => item.day !== 'sunday' && item.blocks.length > 0).length ?? 0;
  const activeStage = selected?.status === 'published' ? 4 : selected?.status === 'review' ? 3 : 2;
  const saveStateLabel = saveState === 'saving'
    ? 'Salvando alterações…'
    : saveState === 'dirty'
      ? 'Alterações pendentes'
      : saveState === 'error'
        ? 'Falha ao salvar'
        : 'Tudo salvo';
  const missingLessonInputs = useMemo(() => {
    if (!selected) return [];
    return [
      !selected.title.trim() ? 'Título da lição' : '',
      !selected.subtitle.trim() ? 'Subtítulo da lição' : '',
      !selected.document.summary.trim() ? 'Resumo editorial' : '',
    ].filter(Boolean);
  }, [selected]);
  const eligibleKnowledgeSources = useMemo(() => knowledgeSources.filter(source =>
    source.active
    && source.status === 'ready'
    && (source.scope === 'ebd' || source.scope === 'global')
    && (
      !knowledgeSourceSearch.trim()
      || `${source.title} ${source.fileName} ${source.tags.join(' ')}`
        .toLocaleLowerCase('pt-BR')
        .includes(knowledgeSourceSearch.trim().toLocaleLowerCase('pt-BR'))
    )
  ), [knowledgeSources, knowledgeSourceSearch]);

  const incompleteDaysMessage = () => {
    if (incompleteDays.length === 0) return '';
    return `Complete antes de publicar: ${incompleteDays.map(item => item.label).join(', ')}.`;
  };

  const markDirty = () => {
    editRevision.current += 1;
    setSaveState('dirty');
  };

  const patchSelected = (patch: Partial<EbdEditorialLesson>) => {
    markDirty();
    setSelected(current => current ? { ...current, ...patch } : current);
  };

  const patchDocument = (patch: Partial<EbdEditorialLesson['document']>) => {
    markDirty();
    setSelected(current => current ? {
      ...current,
      document: { ...current.document, ...patch },
    } : current);
  };

  const patchDay = (patch: Partial<EbdEditorialDay>) => {
    markDirty();
    setSelected(current => {
      if (!current) return current;
      const days = current.document.days.map((item, index) => index === selectedDay ? { ...item, ...patch } : item);
      return { ...current, document: { ...current.document, days } };
    });
  };

  useEffect(() => {
    if (!selected || selected.status !== 'draft' || saveState !== 'dirty' || saving || autosaveInFlight.current) return;
    const snapshot = selected;
    const revision = editRevision.current;
    const timer = window.setTimeout(async () => {
      if (autosaveInFlight.current) return;
      autosaveInFlight.current = true;
      setSaving(true);
      setSaveState('saving');
      try {
        await saveEditorialLesson(snapshot);
        setLessons(current => current.map(item => item.id === snapshot.id ? snapshot : item));
        if (editRevision.current === revision) setSaveState('saved');
        else setSaveState('dirty');
      } catch {
        if (editRevision.current === revision) setSaveState('error');
        else setSaveState('dirty');
      } finally {
        autosaveInFlight.current = false;
        setSaving(false);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [selected, saveState, saving]);

  const patchBlock = (blockId: string, patch: Partial<EbdEditorialBlock>) => {
    if (!day) return;
    patchDay({ blocks: day.blocks.map(block => block.id === blockId ? { ...block, ...patch } : block) });
  };

  const patchQuizSettings = (block: EbdEditorialBlock, questions: EbdQuizQuestion[]) => {
    patchBlock(block.id, { settings: { ...block.settings, questions } });
  };

  const isDayImmutable = Boolean(
    selected?.status === 'published' &&
    day?.unlocksAt &&
    !isNaN(new Date(day.unlocksAt).getTime()) &&
    new Date(day.unlocksAt).getTime() <= Date.now()
  );

  const canEditSelectedDay = Boolean(
    canManage &&
    selected &&
    (selected.status === 'draft' || (selected.status === 'published' && !isDayImmutable))
  );

  const disabledImportReason = !canManage
    ? 'Você não possui permissão para gerenciar lições da EBD.'
    : isDayImmutable
    ? `${day?.label ?? 'Este dia'} já foi liberado e publicado, portanto permanece imutável.`
    : undefined;

  const applyImportedDay = async (imported: EbdEditorialDay) => {
    if (!selected || !day) return;
    if (selected.status === 'published') {
      if (isDayImmutable) {
        toast.error('Este dia já foi liberado publicamente e permanece imutável.');
        return;
      }
      setSaving(true);
      try {
        await saveUnreleasedEditorialDay(selected.id, imported);
        const days = selected.document.days.map((item, index) => index === selectedDay ? imported : item);
        const updatedLesson = { ...selected, document: { ...selected.document, days } };
        setSelected(updatedLesson);
        setLessons(current => current.map(item => item.id === updatedLesson.id ? updatedLesson : item));
        setSaveState('saved');
        toast.success(`${imported.label} aplicado e salvo com sucesso.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o dia importado.');
        throw error;
      } finally {
        setSaving(false);
      }
    } else {
      patchDay(imported);
    }
  };

  const applyImportedWeek = async (sourcesMap: Record<string, EditorialSourceDay>, types: EbdBlockType[]) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updatedDays = [...selected.document.days];
      const modifiedDays: EbdEditorialDay[] = [];

      for (let i = 0; i < updatedDays.length; i++) {
        const targetDay = updatedDays[i];
        if (targetDay.day === 'sunday') continue;
        const source = sourcesMap[targetDay.day];
        if (!source) continue;

        const isReleased = Boolean(
          selected.status === 'published' &&
          targetDay.unlocksAt &&
          !isNaN(new Date(targetDay.unlocksAt).getTime()) &&
          new Date(targetDay.unlocksAt).getTime() <= Date.now()
        );
        if (isReleased) continue;

        const extracted = extractEditorialSourceDay(source, targetDay, types);
        updatedDays[i] = extracted;
        modifiedDays.push(extracted);
      }

      if (modifiedDays.length === 0) {
        toast.error('Nenhum dia disponível pôde ser modificado (todos já estão liberados ou sem fonte).');
        return;
      }

      if (selected.status === 'published') {
        for (const modDay of modifiedDays) {
          await saveUnreleasedEditorialDay(selected.id, modDay);
        }
        const updatedLesson = { ...selected, document: { ...selected.document, days: updatedDays } };
        setSelected(updatedLesson);
        setLessons(current => current.map(item => item.id === updatedLesson.id ? updatedLesson : item));
        setSaveState('saved');
        toast.success(`Pacote semanal aplicado: ${modifiedDays.length} dia(s) salvos com sucesso.`);
      } else {
        const updatedLesson = { ...selected, document: { ...selected.document, days: updatedDays } };
        setSelected(updatedLesson);
        markDirty();
        toast.success(`Pacote semanal aplicado: ${modifiedDays.length} dia(s) atualizados.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao aplicar pacote semanal.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const createLesson = async () => {
    const number = Math.max(0, ...lessons.map(item => item.number)) + 1;
    const title = `Nova lição ${number}`;
    setSaving(true);
    try {
      const lesson = await createEditorialLesson({
        id: `ebd-${number}-${slugify(title)}-${Date.now().toString(36)}`,
        number,
        title,
        subtitle: '',
        document: createEmptyEditorialDocument(),
      });
      setLessons(current => [lesson, ...current]);
      setSelected(lesson);
      setSelectedDay(0);
      editRevision.current = 0;
      setSaveState('saved');
      toast.success('Rascunho criado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a lição.');
    } finally {
      setSaving(false);
    }
  };

  const archiveLesson = () => {
    if (!selected || saving) return;
    setReason('Lição criada por engano no Estúdio Editorial');
    setReasonDialog('archive');
  };

  const returnToDraft = () => {
    if (!selected || selected.status !== 'review' || saving) return;
    setReason('Ajustes editoriais solicitados antes da publicação');
    setReasonDialog('draft');
  };

  const confirmReasonAction = async () => {
    if (!selected || !reasonDialog || saving || reason.trim().length < 8) return;
    const action = reasonDialog;
    setSaving(true);
    try {
      if (action === 'archive') {
        await deleteEditorialLesson(selected.id, reason.trim());
        setLessons(current => current.filter(item => item.id !== selected.id));
        setSelected(null);
        setSelectedDay(0);
        toast.success('Lição arquivada com segurança');
      } else {
        await changeEditorialLessonStatus(selected.id, 'draft', reason.trim());
        const updated = { ...selected, status: 'draft' as const };
        setSelected(updated);
        setLessons(current => current.map(item => item.id === updated.id ? updated : item));
        toast.success('Lição devolvida para rascunho');
      }
      setReasonDialog(null);
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a alteração editorial.');
    } finally {
      setSaving(false);
    }
  };

  const save = async (): Promise<boolean> => {
    if (!selected || saving) return false;
    setSaving(true);
    setSaveState('saving');
    try {
      await saveEditorialLesson(selected);
      setLessons(current => current.map(item => item.id === selected.id ? selected : item));
      setSaveState('saved');
      toast.success('Rascunho salvo');
      return true;
    } catch (error) {
      setSaveState('error');
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const sendToReview = async () => {
    if (!selected) return;
    if (completeness < 100) {
      toast.error(incompleteDaysMessage());
      return;
    }
    if (!requireEditorialLanguageReady()) return;
    const saved = await save();
    if (!saved) return;
    try {
      await changeEditorialLessonStatus(selected.id, 'review', 'Envio para revisão editorial');
      patchSelected({ status: 'review' });
      toast.success('Lição enviada para revisão');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar para revisão.');
    }
  };

  const publish = async () => {
    if (!selected) return;
    if (completeness < 100) {
      toast.error(incompleteDaysMessage());
      return;
    }
    if (!requireEditorialLanguageReady()) return;
    if (selected.status !== 'review') {
      toast.error('Envie a lição para revisão antes de publicar.');
      return;
    }
    if (!confirm('Publicar esta versão para os jovens respeitando o agendamento dos dias?')) return;
    const scheduledLesson = {
      ...selected,
      document: {
        ...selected.document,
        releaseMode: 'scheduled' as const,
      },
    };
    setSaving(true);
    try {
      await saveEditorialLesson(scheduledLesson);
      const version = await publishEditorialLesson(scheduledLesson.id);
      const updated = {
        ...scheduledLesson,
        status: 'published' as const,
        version,
      };
      setSelected(updated);
      setLessons(current => current.map(item => item.id === updated.id ? updated : item));
      toast.success(`Versão ${version} publicada. Os dias serão exibidos conforme o agendamento.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar.');
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!selected) return;
    if (completeness < 100) {
      toast.error(incompleteDaysMessage());
      return;
    }
    if (!requireEditorialLanguageReady()) return;
    if (selected.status !== 'review' && selected.status !== 'published') {
      toast.error('Envie a lição para revisão antes de publicar agora.');
      return;
    }
    if (!confirm('Publicar esta versão agora e liberar todos os dias imediatamente?')) return;

    if (selected.status === 'published') {
      setSaving(true);
      try {
        const version = await publishEditorialWeekNow(selected.id, selected.version);
        const publishedLesson = await getEditorialLessonById(selected.id);
        if (!publishedLesson) throw new Error('A lição atualizada não pôde ser recarregada.');
        const updated = { ...publishedLesson, version };
        setSelected(updated);
        setLessons(current => current.map(item => item.id === updated.id ? updated : item));
        toast.success(`Versão ${version} · semana liberada agora`);
        navigate('/ebd');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível liberar a semana agora.');
      } finally {
        setSaving(false);
      }
      return;
    }

    const immediateLesson = {
      ...selected,
      document: {
        ...selected.document,
        releaseMode: 'immediate' as const,
      },
    };
    setSaving(true);
    try {
      await saveEditorialLesson(immediateLesson);
      const version = await publishEditorialLesson(immediateLesson.id);
      const publishedLesson = await getEditorialLessonById(immediateLesson.id);
      if (!publishedLesson) throw new Error('A lição publicada não pôde ser recarregada.');
      const updated = { ...publishedLesson, version };
      setSelected(updated);
      setLessons(current => current.map(item => item.id === updated.id ? updated : item));
      toast.success(`Versão ${version} publicada agora`);
      navigate('/ebd');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar agora.');
    } finally {
      setSaving(false);
    }
  };

  const publishSelectedDayNow = async () => {
    if (!selected || !day) return;
    if (!selectedDayReady) {
      toast.error(`${day.label} precisa ter pelo menos um bloco.`);
      return;
    }
    const languageIssue = validateEditorialDayLanguage(day)[0];
    if (languageIssue) {
      toast.error(languageIssue.message);
      return;
    }
    if (!confirm(`Liberar ${day.label} agora para todos os usuários? Esta ação antecipa somente o dia selecionado.`)) return;
    const dayToPublish = {
      ...day,
      title: day.title.trim(),
      unlocksAt: new Date().toISOString(),
    };
    setSaving(true);
    try {
      if (selected.status !== 'published') {
        await saveEditorialLesson(selected);
      }
      const version = await publishEditorialDayNow(selected.id, dayToPublish);
      const publishedLesson = await getEditorialLessonById(selected.id);
      if (!publishedLesson) throw new Error('A lição publicada não pôde ser recarregada.');
      const updated = { ...publishedLesson, version };
      setSelected(updated);
      setLessons(current => current.map(item => item.id === updated.id ? updated : item));
      toast.success(`${day.label} foi publicado(a) agora; os demais dias continuam independentes.`);
      navigate('/ebd', { state: { editorialDayIndex: selectedDay } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar este dia agora.');
    } finally {
      setSaving(false);
    }
  };

  const continueEditorialFlow = () => {
    if (selected?.status === 'draft' && completeness === 100) {
      void sendToReview();
      return;
    }
    if (selected?.status === 'review') {
      void publish();
      return;
    }
    const nextIncomplete = selected?.document.days.findIndex(item => !item.title.trim() || item.blocks.length === 0) ?? -1;
    if (nextIncomplete >= 0) setSelectedDay(nextIncomplete);
    setPreview(false);
    window.setTimeout(() => document.getElementById('ebd-day-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const loadVersions = async () => {
    if (!selected) return;
    try {
      setVersions(await getEditorialVersions(selected.id));
      setShowVersions(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
    }
  };

  const addBlock = (type: EbdBlockType) => {
    if (!day) return;
    const block: EbdEditorialBlock = {
      id: `${day.id}-${type}-${createRuntimeId()}`,
      type,
      title: blockLabel(type),
      content: '',
      required: type !== 'hero' && type !== 'text',
    };
    patchDay({ blocks: [...day.blocks, block] });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (!day) return;
    const target = index + direction;
    if (target < 0 || target >= day.blocks.length) return;
    const blocks = [...day.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    patchDay({ blocks });
  };

  const openAiGenerator = () => {
    if (!day) return;
    if (day.day === 'sunday') {
      toast.info('Domingo está reservado para uma atividade especial. O formato será definido depois.');
      return;
    }
    setAiDraft(null);
    setAiForm(current => ({
      ...current,
      objective: current.objective || day.purpose || `Ajudar o leitor a ${day.label.toLowerCase()} o tema da lição.`,
    }));
    setAiOpen(true);
  };

  const generateDayWithAI = async (mode: 'manual' | 'prepare_day' = 'manual') => {
    if (!selected || !day || aiGenerating || aiCooldown > 0) return;
    const requestedBlockTypes = mode === 'prepare_day' ? AGENT_PREPARE_BLOCK_TYPES : aiSelectedBlockTypes;
    if (requestedBlockTypes.length === 0) {
      toast.error('Selecione pelo menos um tipo de bloco.');
      return;
    }
    if (mode === 'prepare_day' && selected.status !== 'draft') {
      toast.error('O Agente Editorial só prepara dias de lições ainda em rascunho.');
      return;
    }
    if (selected.document.knowledgeSourceIds.length === 0) {
      toast.error('Vincule pelo menos uma fonte RAG oficial a esta lição antes de gerar.');
      return;
    }
    if (!aiForm.objective.trim()) {
      toast.error('Informe o objetivo do conteúdo deste dia.');
      return;
    }

    const selectedTypes = new Set(requestedBlockTypes);
    const blocksToReplace = day.blocks.filter(block => selectedTypes.has(block.type));
    if (blocksToReplace.length > 0 && !confirm(
      mode === 'prepare_day'
        ? `O Agente Editorial substituirá ${blocksToReplace.length} bloco(s) de ${day.label}, salvará o resultado como rascunho e parará para sua revisão. Continuar?`
        : `A geração substituirá ${blocksToReplace.length} bloco(s) existente(s) dos tipos selecionados em ${day.label}. Continuar?`,
    )) {
      return;
    }

    setAiGenerating(true);
    try {
      const generated = await generateEditorialDayWithAI({
        mode,
        lessonUpdatedAt: selected.updatedAt,
        lessonId: selected.id,
        lessonNumber: selected.number,
        lessonTitle: selected.title,
        lessonSubtitle: selected.subtitle,
        theme: selected.document.theme,
        summary: selected.document.summary,
        mainVerseReference: selected.document.mainVerseReference,
        sourcePublisher: selected.document.source.publisher,
        sourceEdition: selected.document.source.edition,
        sourcePageRange: selected.document.source.pageRange,
        day: day.day,
        dayLabel: day.label,
        dayPurpose: day.purpose,
        estimatedMinutes: day.estimatedMinutes,
        audience: aiForm.audience,
        tone: aiForm.tone,
        objective: aiForm.objective,
        additionalInstructions: aiForm.additionalInstructions,
        selectedBlockTypes: requestedBlockTypes,
        knowledgeSourceIds: selected.document.knowledgeSourceIds,
      });
      const generatedByType = new Map(generated.blocks.map((block, index) => {
        const { quizQuestions, ...blockFields } = block;
        const generatedBlock: EbdEditorialBlock = {
          ...blockFields,
          id: `${day.id}-${block.type}-ai-${index + 1}-${createRuntimeId()}`,
          ...(block.type === 'quiz' ? {
            settings: {
              questions: quizQuestions.map((question, questionIndex) => ({
                ...question,
                id: `${day.id}-quiz-ai-${questionIndex + 1}-${createRuntimeId()}`,
              })),
            },
          } : {}),
        };
        return [block.type, generatedBlock] as const;
      }));

      const days = selected.document.days.map(item => {
        if (item.id !== day.id) return item;
        const mergedBlocks = BLOCK_OPTIONS.flatMap(({ type }) => {
          const generatedBlock = generatedByType.get(type);
          return generatedBlock ? [generatedBlock] : item.blocks.filter(block => block.type === type);
        });
        return {
          ...item,
          // O cabeçalho diário descreve o recorte pedagógico daquele dia e é
          // parte da geração, não uma cópia do cabeçalho geral da lição.
          title: generated.title,
          subtitle: generated.subtitle,
          estimatedMinutes: generated.estimatedMinutes,
          blocks: mergedBlocks,
        };
      });
      const updatedLesson: EbdEditorialLesson = {
        ...selected,
        document: { ...selected.document, days },
      };

      // A geração faz parte do rascunho editorial: persista antes de confirmar
      // sucesso para que reload, navegação ou publicação não descartem os blocos.
      if (generated.generation?.persistedByAgent) {
        const persistedLesson = await getEditorialLessonById(updatedLesson.id);
        if (!persistedLesson) throw new Error('O rascunho preparado pelo agente não pôde ser recarregado.');
        setSelected(persistedLesson);
        setLessons(current => current.map(item => item.id === persistedLesson.id ? persistedLesson : item));
      } else if (updatedLesson.status === 'published') {
        const generatedDay = updatedLesson.document.days[selectedDay];
        await saveUnreleasedEditorialDay(updatedLesson.id, generatedDay);
        setSelected(updatedLesson);
        setLessons(current => current.map(item => item.id === updatedLesson.id ? updatedLesson : item));
      } else {
        await saveEditorialLesson(updatedLesson);
        setSelected(updatedLesson);
        setLessons(current => current.map(item => item.id === updatedLesson.id ? updatedLesson : item));
      }
      editRevision.current += 1;
      setSaveState('saved');
      setAiDraft(generated);
      toast.success(mode === 'prepare_day'
        ? `${generated.blocks.length} blocos preparados pelo agente e salvos como rascunho em ${day.label}`
        : `${generated.blocks.length} blocos aplicados e salvos em ${day.label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar o conteúdo.');
    } finally {
      setAiGenerating(false);
      setAiCooldown(12);
    }
  };

  const handleImageUpload = async (block: EbdEditorialBlock, file: File | null) => {
    if (!file) return;
    setUploadingBlocks(current => ({ ...current, [block.id]: true }));
    try {
      const publicUrl = await uploadEditorialImage(file);
      patchBlock(block.id, {
        mediaUrl: publicUrl,
        altText: block.altText || block.title,
      });
      toast.success('Imagem enviada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingBlocks(current => ({ ...current, [block.id]: false }));
    }
  };

  const handleWeekCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingWeekCover(true);
    try {
      const publicUrl = await uploadEditorialImage(file);
      patchDocument({ coverImageUrl: publicUrl });
      toast.success('Capa da semana enviada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a capa da semana.');
    } finally {
      setUploadingWeekCover(false);
    }
  };

  if (checking || loading) {
    return <div className="flex min-h-full items-center justify-center text-sm text-[var(--text-muted)]">Abrindo Estúdio Editorial...</div>;
  }

  if (!canRead) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <h1 className="font-display text-xl text-[var(--text-primary)]">Área editorial restrita</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Seu perfil não possui acesso ao Estúdio Editorial.</p>
          <Link to="/ebd" className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-primary)]">Voltar à EBD</Link>
        </Card>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-5 pb-8">
        <AdminPageHeader eyebrow="Administração editorial" title="Estúdio Editorial EBD" description="Conteúdo, mídia, interações, revisão e publicação." actions={<>
            <Link
              to="/admin/conhecimento"
              className="button-seal button-seal--secondary inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-semibold"
            >
              <BrainCircuit size={16} /> Memória
            </Link>
            {canManage && <Button onClick={createLesson} disabled={saving} className="!px-3">
              <SealIcon Icon={FilePlus2} size="sm" />
              Nova
            </Button>} 
          </>} />

        {lessons.length === 0 ? (
          <Card className="p-8 text-center">
            <SealIcon Icon={LayoutPanelTop} size="lg" className="mx-auto text-[var(--accent-primary)]" />
            <h2 className="mt-4 font-display text-lg text-[var(--text-primary)]">A estação está pronta</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Crie a primeira lição para começar a montar a jornada.</p>
{canManage && <Button onClick={createLesson} className="mt-5">
              <Plus size={17} /> Criar primeira lição
            </Button>}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {lessons.map(lesson => {
              const completeDays = lesson.document.days.filter(item => item.day !== 'sunday' && item.blocks.length > 0).length;
              const completion = Math.round((completeDays / GENERATED_WEEKDAY_COUNT) * 100);
              const coverImage = getEditorialCoverImage(lesson.document);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setSelected(lesson);
                    setSelectedDay(0);
                    setExpandedBlockId(null);
                    editRevision.current = 0;
                    setSaveState('saved');
                  }}
                  className="premium-surface group flex min-h-64 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-premium hover:-translate-y-0.5 hover:border-[var(--accent-border)]"
                >
                  <div className="relative flex min-h-32 items-start justify-between overflow-hidden border-b border-[var(--border)] bg-[var(--surface-highlighted)] p-4">
                    {coverImage ? (
                      <img src={coverImage} alt="" className="absolute inset-0 size-full object-cover opacity-55 transition duration-300 group-hover:scale-[1.03]" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-highlighted)] via-transparent to-transparent" />
                    <span className="relative rounded-full border border-[var(--accent-border)] bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">Lição {lesson.number}</span>
                    <span className="relative rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">{STATUS_LABELS[lesson.status]} · v{lesson.version}</span>
                    {!coverImage && <BookOpen size={28} className="absolute bottom-4 right-4 text-[var(--accent-primary)]" />}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="line-clamp-2 font-display text-xl leading-tight text-[var(--text-primary)]">{lesson.title}</h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{lesson.subtitle || 'Sem subtítulo editorial'}</p>
                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="font-semibold text-[var(--text-secondary)]">{completeDays} de {GENERATED_WEEKDAY_COUNT} dias prontos</span>
                        <span className="font-bold text-[var(--accent-primary)]">{completion}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-highlighted)]">
                        <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all" style={{ width: `${completion}%` }} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${releaseModeClasses(lesson)}`}>{releaseModeLabel(lesson)}</span>
                        <span className="text-xs font-semibold text-[var(--accent-primary)]">Abrir estúdio →</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <nav aria-label="Etapas editoriais" className="overflow-hidden border-y border-[var(--border)] bg-[var(--surface)] sm:rounded-2xl sm:border">
        <div className="p-4 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{activeStage} de 4 · {activeStage === 2 ? 'Conteúdo semanal' : activeStage === 3 ? 'Revisão' : activeStage === 4 ? 'Publicação' : 'Contexto'}</span>
            <span className="text-xs text-[var(--text-muted)]">Fluxo editorial</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-highlighted)]">
            <div className="h-full bg-[var(--accent-primary)]" style={{ width: `${activeStage * 25}%` }} />
          </div>
        </div>
        <div className="hidden grid-cols-4 sm:grid">
          {[
            ['Contexto', 'Objetivos e referências'],
            ['Conteúdo semanal', 'Dias e blocos'],
            ['Revisão', 'Teologia e clareza'],
            ['Publicação', 'Liberação e agenda'],
          ].map(([label, description], index) => {
            const stage = index + 1;
            const current = stage === activeStage;
            const complete = stage < activeStage;
            return (
              <div key={label} className={`flex min-h-20 items-center gap-3 border-r border-[var(--border)] px-4 last:border-r-0 ${current ? 'bg-[var(--accent-soft)]' : ''}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full border text-sm font-semibold ${current || complete ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                  {complete ? <CheckCircle2 size={17} /> : stage}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${current ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                  <span className="block text-[11px] text-[var(--text-muted)]">{description}</span>
                </span>
              </div>
            );
          })}
        </div>
      </nav>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="!px-2" onClick={() => setSelected(null)}>
            <ArrowLeft size={17} /> Lições
          </Button>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`mr-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${selected.status === 'published' ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--celebration-border)] bg-[var(--celebration-soft)] text-[var(--celebration)]'}`}>
              {STATUS_LABELS[selected.status]} · v{selected.version}
            </span>
            <Button variant="ghost" className="!px-2" onClick={() => setPreview(value => !value)} aria-label="Alternar pré-visualização">
              <Eye size={17} /> <span className="hidden sm:inline">Pré-visualizar</span>
            </Button>
            <Button variant="ghost" className="!px-2" onClick={loadVersions} aria-label="Histórico de versões">
              <History size={17} />
            </Button>
            {canManage && <Button variant="ghost" className="!px-2 !text-[var(--danger)]" onClick={archiveLesson} disabled={saving} aria-label="Arquivar esta lição">
              <Trash2 size={17} />
            </Button>}
            {canManage && <Button className="!px-3" onClick={save} disabled={saving || selected.status !== 'draft'}>
              <Save size={17} /> {saving ? 'Salvando' : 'Salvar'}
            </Button>}
          </div>
        </div>

        <div className="border-b border-[var(--border)] pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-primary)]">Lição da semana · Lição {selected.number}</p>
          <h1 className="mt-2 max-w-4xl font-display text-2xl leading-tight text-[var(--text-primary)] sm:text-3xl">{selected.title || 'Lição sem título'}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{selected.subtitle || selected.document.summary || 'Complete o contexto editorial antes de produzir os dias.'}</p>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="weekly-cover-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p id="weekly-cover-title" className="text-sm font-semibold text-[var(--text-primary)]">Capa da semana</p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">Opcional. Sem uma capa definida, a primeira imagem editorial de segunda-feira será usada automaticamente.</p>
            </div>
            {getEditorialCoverImage(selected.document) && (
              <img src={getEditorialCoverImage(selected.document)} alt="Prévia da capa da semana" className="size-16 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] object-cover" />
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="button-seal button-seal--secondary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 text-xs font-semibold">
              <Image size={15} /> {uploadingWeekCover ? 'Enviando capa…' : 'Enviar imagem'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={!canManage || uploadingWeekCover}
                onChange={event => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = '';
                  void handleWeekCoverUpload(file);
                }}
              />
            </label>
            {selected.document.coverImageUrl && (
              <Button type="button" variant="ghost" className="text-xs" disabled={!canManage || uploadingWeekCover} onClick={() => patchDocument({ coverImageUrl: '' })}>
                Usar imagem de segunda
              </Button>
            )}
          </div>
          <label className="mt-3 block text-xs text-[var(--text-muted)]">
            URL da capa <span className="font-normal">(opcional)</span>
            <input
              value={selected.document.coverImageUrl ?? ''}
              disabled={!canManage || uploadingWeekCover}
              onChange={event => patchDocument({ coverImageUrl: event.target.value })}
              placeholder="Ou cole uma URL de imagem"
              className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
        </section>

        <details className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-3"><BookOpen size={18} className="text-[var(--accent-primary)]" /> Contexto, metadados e fontes RAG</span>
            <span className="flex items-center gap-2 text-xs font-normal text-[var(--text-muted)]">
              {selected.document.knowledgeSourceIds.length} fonte(s) <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="grid gap-3 border-t border-[var(--border)] p-4 lg:grid-cols-2">
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <label className="text-xs text-[var(--text-muted)]">
              Número
              <input
                type="number"
                min={1}
                value={selected.number}
                onChange={event => patchSelected({ number: Number(event.target.value) })}
                className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Título da lição
              <input
                value={selected.title}
                onChange={event => patchSelected({ title: event.target.value })}
                className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-xs text-[var(--text-muted)] lg:col-span-2">
            Subtítulo da lição
            <input
              value={selected.subtitle}
              onChange={event => patchSelected({ subtitle: event.target.value })}
              className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            Resumo editorial
            <textarea
              value={selected.document.summary}
              onChange={event => patchDocument({ summary: event.target.value })}
              className="input-theme mt-1 min-h-20 w-full resize-y rounded-xl border px-3 py-2"
            />
          </label>
          <details
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-3 lg:col-span-2"
            onToggle={event => {
              if (event.currentTarget.open) void loadKnowledgeSources();
            }}
          >
            <summary className="cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
              Fontes RAG desta lição · {selected.document.knowledgeSourceIds.length} selecionada(s)
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              A IA pesquisará somente nestes arquivos. Vincule a revista ou o material oficial correspondente à semana atual.
            </p>
            <input
              value={knowledgeSourceSearch}
              onChange={event => setKnowledgeSourceSearch(event.target.value)}
              placeholder="Buscar pelo título, arquivo ou etiqueta"
              className="input-theme mt-3 w-full rounded-xl border px-3 py-2 text-xs"
            />
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
              {knowledgeSourcesLoading && (
                <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  Carregando fontes disponíveis…
                </p>
              )}
              {!knowledgeSourcesLoading && eligibleKnowledgeSources.map(source => {
                const checked = selected.document.knowledgeSourceIds.includes(source.id);
                return (
                  <label
                    key={source.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${
                      checked
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => patchDocument({
                        knowledgeSourceIds: checked
                          ? selected.document.knowledgeSourceIds.filter(id => id !== source.id)
                          : [...selected.document.knowledgeSourceIds, source.id],
                      })}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{source.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">
                        {source.scope.toUpperCase()} · {source.category} · {source.totalChunks} trechos
                      </span>
                    </span>
                  </label>
                );
              })}
              {!knowledgeSourcesLoading && eligibleKnowledgeSources.length === 0 && (
                <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  Nenhuma fonte ativa e pronta encontrada para esta busca.
                </p>
              )}
            </div>
          </details>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] px-3 py-3 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Liberação da lição</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {selected.document.releaseMode === 'immediate'
                    ? 'Esta lição está configurada para ficar disponível imediatamente, ignorando o agendamento dos dias.'
                    : 'Esta lição respeita o agendamento configurado em cada dia.'}
                </p>
              </div>
              <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${releaseModeClasses(selected)}`}>
                {releaseModeLabel(selected)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:col-span-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-highlighted)]">
              <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: `${completeness}%` }} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">{completeness}%</span>
          </div>
          </div>
        </details>
      </header>

      <section aria-label="Dias da semana" className="scrollbar-hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid min-w-[42rem] grid-cols-7">
        {EBD_WEEKDAYS.map((item, index) => {
          const editorialDay = selected.document.days[index];
          const isSunday = editorialDay.day === 'sunday';
          const ready = !isSunday && editorialDay.blocks.length > 0;
          const isDayReleased = Boolean(
            selected.status === 'published' &&
            editorialDay.unlocksAt &&
            !isNaN(new Date(editorialDay.unlocksAt).getTime()) &&
            new Date(editorialDay.unlocksAt).getTime() <= Date.now()
          );
          return (
          <button
            key={item.day}
            type="button"
            onClick={() => { setSelectedDay(index); setExpandedBlockId(null); setBlockPaletteOpen(false); }}
            className={`min-h-20 border-r border-[var(--border)] px-3 py-3 text-center text-xs font-semibold last:border-r-0 ${
              selectedDay === index
                ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] shadow-[inset_0_-2px_0_var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <span className="block">{item.label}</span>
            <span className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-normal opacity-80">
              {isDayReleased ? (
                <span className="inline-flex items-center gap-1 text-[var(--accent-primary)] font-semibold">
                  <CheckCircle2 size={12} /> Liberado
                </span>
              ) : ready ? (
                <span className="inline-flex items-center gap-1 text-[var(--text-primary)]">
                  <CheckCircle2 size={12} className="text-[var(--accent-primary)]" /> {editorialDay.blocks.length} blocos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                  <Circle size={11} /> {isSunday ? 'Especial' : 'Vazio'}
                </span>
              )}
            </span>
          </button>
        );})}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">

      {day && (
        <div id="ebd-day-editor" className={preview ? 'space-y-5' : ''}>
          <div className={preview ? 'hidden' : 'space-y-4'}>
            <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-primary)]">Conteúdo semanal</p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="font-display text-2xl text-[var(--text-primary)]">{day.label}</h2>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${selectedDayReady ? 'text-[var(--accent-primary)]' : 'text-[var(--celebration)]'}`}>
                    {selectedDayReady ? <CheckCircle2 size={15} /> : <Circle size={14} />}
                    {selectedDayReady ? 'Pronto' : 'Em produção'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{day.blocks.length} bloco(s) · {day.estimatedMinutes} minutos</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button type="button" variant="secondary" className="!px-3" onClick={() => setBlockPaletteOpen(value => !value)}>
                  <Plus size={16} /> Adicionar bloco
                </Button>
                <Button type="button" variant="secondary" className="!px-3" onClick={openAiGenerator} disabled={day.day === 'sunday'}>
                  <Sparkles size={16} /> {day.day === 'sunday' ? 'Atividade em planejamento' : 'Gerar com IA'}
                </Button>
              </div>
            </div>

            {canManage && day.day !== 'sunday' && <EditorialSourceImport
              key={`${selected.id}/${day.id}`}
              lessonId={selected.id}
              lessonNumber={selected.number}
              day={day}
              disabled={!canEditSelectedDay || saving || aiGenerating}
              disabledReason={disabledImportReason}
              onApply={applyImportedDay}
              onApplyWeek={applyImportedWeek}
            />}

            {day.day !== 'sunday' && <EditorialPreflight day={day} />}
            <details className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--text-primary)]">
                <span>Configurações de {day.label}</span>
                <ChevronDown size={16} className="text-[var(--text-muted)] transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t border-[var(--border)] p-4">
              <label className="text-xs text-[var(--text-muted)]">
                Título do dia
                <input value={day.title} onChange={event => patchDay({ title: event.target.value })} className="input-theme mt-1 w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Subtítulo
                <input value={day.subtitle} onChange={event => patchDay({ subtitle: event.target.value })} className="input-theme mt-1 w-full rounded-xl border px-3 py-2" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-[var(--text-muted)]">
                  Liberação programada <span className="font-normal opacity-70">(opcional)</span>
                  <input type="datetime-local" value={day.unlocksAt} onChange={event => patchDay({ unlocksAt: event.target.value })} className="input-theme mt-1 w-full rounded-xl border px-2 py-2" />
                  <span className="mt-1 block text-[10px] leading-relaxed">Deixe em branco para liberar somente por ação manual ou pela publicação da semana.</span>
                </label>
                <label className="text-xs text-[var(--text-muted)]">
                  Minutos
                  <input type="number" min={1} value={day.estimatedMinutes} onChange={event => patchDay({ estimatedMinutes: Number(event.target.value) })} className="input-theme mt-1 w-full rounded-xl border px-3 py-2" />
                </label>
              </div>
              </div>
            </details>

            {!day.title.trim() && (
              <div className="rounded-xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] px-3 py-2 text-xs text-[var(--celebration)]">
                Título do dia não encontrado. Isso não impede a publicação; será usado “{day.label}”.
              </div>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ordem e estrutura do conteúdo</h3>
                <span className="text-xs text-[var(--text-muted)]">Toque em um bloco para editar</span>
              </div>

              {blockPaletteOpen && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 sm:grid-cols-5">
                  {BLOCK_OPTIONS.map(option => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => { addBlock(option.type); setBlockPaletteOpen(false); }}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--surface)] px-3 text-left text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      <Plus size={15} className="text-[var(--accent-primary)]" /> {option.label}
                    </button>
                  ))}
                </div>
              )}

              {day.blocks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--border)] px-5 py-10 text-center">
                  <ListChecks size={24} className="mx-auto text-[var(--text-muted)]" />
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Nenhum bloco neste dia</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Adicione manualmente ou gere os tipos desejados com IA.</p>
                </div>
              )}

              {day.blocks.map((block, index) => (
                <Card key={block.id} className="overflow-hidden p-0">
                  <div className="flex min-h-16 items-center gap-2 px-3 sm:px-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-primary)]">{index + 1}</span>
                    <button type="button" onClick={() => setExpandedBlockId(current => current === block.id ? null : block.id)} className="min-w-0 flex-1 py-3 text-left">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--celebration)]">{blockLabel(block.type)}</span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--text-primary)]">{block.title || 'Bloco sem título'}</span>
                    </button>
                    <button type="button" onClick={() => setExpandedBlockId(current => current === block.id ? null : block.id)} className="grid size-10 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]" aria-label={`Editar ${block.title || blockLabel(block.type)}`}><PenLine size={16} /></button>
                    <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="hidden p-1 text-[var(--text-muted)] disabled:opacity-20 sm:block"><ArrowUp size={16} /></button>
                    <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === day.blocks.length - 1} className="hidden p-1 text-[var(--text-muted)] disabled:opacity-20 sm:block"><ArrowDown size={16} /></button>
                    <button type="button" onClick={() => patchDay({ blocks: day.blocks.filter(item => item.id !== block.id) })} className="p-2 text-[var(--danger)]" aria-label={`Excluir ${block.title || blockLabel(block.type)}`}><Trash2 size={16} /></button>
                  </div>
                  {expandedBlockId === block.id && <div className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                  <input
                    value={block.title}
                    onChange={event => patchBlock(block.id, { title: event.target.value })}
                    placeholder="Título do bloco"
                    className="input-theme w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  />
                  {block.type === 'scripture' && (
                    <input
                      value={block.reference ?? ''}
                      onChange={event => patchBlock(block.id, { reference: event.target.value })}
                      placeholder="Referência bíblica"
                      className="input-theme w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  )}
                  <textarea
                    value={block.content ?? ''}
                    onChange={event => patchBlock(block.id, { content: event.target.value })}
                    placeholder={block.type === 'quiz' ? 'Descrição ou instruções do quiz' : 'Conteúdo'}
                    className="input-theme min-h-24 w-full resize-y rounded-xl border px-3 py-2 text-sm"
                  />
                  {block.type === 'quiz' && (() => {
                    const quiz = getQuizSettings(block);
                    return (
                      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">Perguntas do quiz</p>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!min-h-9 !px-2"
                            onClick={() => patchQuizSettings(block, [...quiz.questions, createEmptyQuizQuestion()])}
                          >
                            <Plus size={14} /> Pergunta
                          </Button>
                        </div>
                        {quiz.questions.length === 0 && (
                          <p className="text-xs text-[var(--text-muted)]">Adicione perguntas para exibir opções com botão único ou caixa de seleção.</p>
                        )}
                        {quiz.questions.map((question, questionIndex) => (
                          <div key={question.id} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-[var(--celebration)]">Pergunta {questionIndex + 1}</p>
                              <button
                                type="button"
                                onClick={() => patchQuizSettings(block, quiz.questions.filter(item => item.id !== question.id))}
                                className="p-1 text-[var(--danger)]"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <textarea
                              value={question.prompt}
                              onChange={event => patchQuizSettings(block, quiz.questions.map(item => item.id === question.id ? { ...item, prompt: event.target.value } : item))}
                              placeholder="Enunciado da pergunta"
                              className="input-theme min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-sm"
                            />
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">Tipo de resposta</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => patchQuizSettings(
                                    block,
                                    quiz.questions.map(item => item.id === question.id
                                      ? {
                                          ...item,
                                          selectionMode: 'single',
                                          correctAnswers: item.correctAnswers.slice(0, 1),
                                        }
                                      : item,
                                    ),
                                  )}
                                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                                    question.selectionMode === 'single'
                                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Resposta única
                                </button>
                                <button
                                  type="button"
                                  onClick={() => patchQuizSettings(
                                    block,
                                    quiz.questions.map(item => item.id === question.id
                                      ? {
                                          ...item,
                                          selectionMode: 'multiple',
                                        }
                                      : item,
                                    ),
                                  )}
                                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                                    question.selectionMode === 'multiple'
                                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Múltiplas respostas
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => {
                                const checked = question.correctAnswers.includes(optionIndex);
                                return (
                                  <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                    <input
                                      type={question.selectionMode === 'multiple' ? 'checkbox' : 'radio'}
                                      name={question.id}
                                      checked={checked}
                                      onChange={() => {
                                        const nextCorrectAnswers = question.selectionMode === 'multiple'
                                          ? checked
                                            ? question.correctAnswers.filter(answer => answer !== optionIndex)
                                            : [...question.correctAnswers, optionIndex].sort((a, b) => a - b)
                                          : [optionIndex];
                                        patchQuizSettings(
                                          block,
                                          quiz.questions.map(item => item.id === question.id ? { ...item, correctAnswers: nextCorrectAnswers } : item),
                                        );
                                      }}
                                    />
                                    <input
                                      value={option}
                                      onChange={event => patchQuizSettings(
                                        block,
                                        quiz.questions.map(item => item.id === question.id
                                          ? {
                                              ...item,
                                              options: item.options.map((currentOption, currentIndex) => currentIndex === optionIndex ? event.target.value : currentOption),
                                            }
                                          : item,
                                        ),
                                      )}
                                      placeholder={`Alternativa ${optionIndex + 1}`}
                                      className="input-theme flex-1 rounded-xl border px-3 py-2 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => patchQuizSettings(
                                        block,
                                        quiz.questions.map(item => item.id === question.id
                                          ? {
                                              ...item,
                                              options: item.options.filter((_, currentIndex) => currentIndex !== optionIndex),
                                              correctAnswers: item.correctAnswers
                                                .filter(answer => answer !== optionIndex)
                                                .map(answer => answer > optionIndex ? answer - 1 : answer),
                                            }
                                          : item,
                                        ),
                                      )}
                                      disabled={question.options.length <= 2}
                                      className="p-1 text-[var(--danger)] disabled:opacity-30"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                              <Button
                                type="button"
                                variant="ghost"
                                className="!min-h-9 !px-2"
                                onClick={() => patchQuizSettings(
                                  block,
                                  quiz.questions.map(item => item.id === question.id ? { ...item, options: [...item.options, ''] } : item),
                                )}
                              >
                                <Plus size={14} /> Alternativa
                              </Button>
                            </div>
                            <textarea
                              value={question.explanation ?? ''}
                              onChange={event => patchQuizSettings(
                                block,
                                quiz.questions.map(item => item.id === question.id ? { ...item, explanation: event.target.value } : item),
                              )}
                              placeholder="Explicação exibida após responder"
                              className="input-theme min-h-16 w-full resize-y rounded-xl border px-3 py-2 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {(['hero', 'video', 'prayer', 'mission'].includes(block.type)) && (
                    <>
                      <label className="block text-xs text-[var(--text-muted)]">
                        Texto alternativo
                        <input
                          value={block.altText ?? ''}
                          onChange={event => patchBlock(block.id, { altText: event.target.value })}
                          placeholder="Descreva a imagem para acessibilidade"
                          className="input-theme mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">Upload de imagem</p>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                              Envia para o bucket público editorial e preenche a URL automaticamente.
                            </p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-primary)]">
                            <Image size={14} />
                            {uploadingBlocks[block.id] ? 'Enviando...' : 'Escolher imagem'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingBlocks[block.id]}
                              onChange={event => {
                                const file = event.target.files?.[0] ?? null;
                                void handleImageUpload(block, file);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <input
                        value={block.mediaUrl ?? ''}
                        onChange={event => patchBlock(block.id, { mediaUrl: event.target.value })}
                        placeholder="URL da mídia (opcional)"
                        className="input-theme w-full rounded-xl border px-3 py-2 text-sm"
                      />
                      <textarea
                        value={block.prompt ?? ''}
                        onChange={event => patchBlock(block.id, { prompt: event.target.value })}
                        placeholder="Prompt ou orientação de produção"
                        className="input-theme min-h-16 w-full resize-y rounded-xl border px-3 py-2 text-xs"
                      />
                    </>
                  )}
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input type="checkbox" checked={block.required ?? false} onChange={event => patchBlock(block.id, { required: event.target.checked })} />
                    Obrigatório para concluir o dia
                  </label>
                  </div>}
                </Card>
              ))}

              <button type="button" onClick={() => setBlockPaletteOpen(value => !value)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--surface)]">
                <Plus size={16} /> Adicionar bloco
              </button>
            </section>
          </div>

          {preview && <EditorialPreview lesson={selected} day={day} />}
        </div>
      )}

      <Card className="space-y-4 p-4 xl:sticky xl:top-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Progresso da semana</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{readyDays} de {GENERATED_WEEKDAY_COUNT} conteúdos prontos · domingo especial</p>
          </div>
          <SealIcon Icon={selected.status === 'published' ? CheckCircle2 : BookOpen} size="md" active={selected.status === 'published'} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-highlighted)]">
          <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: `${completeness}%` }} />
        </div>

        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 py-3 text-xs">
            <span className="text-[var(--text-muted)]">Estado</span>
            <span className="font-semibold text-[var(--text-primary)]">{STATUS_LABELS[selected.status]} · v{selected.version}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3 text-xs">
            <span className="text-[var(--text-muted)]">Fontes RAG</span>
            <span className="font-semibold text-[var(--text-primary)]">{selected.document.knowledgeSourceIds.length} vinculada(s)</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3 text-xs">
            <span className="text-[var(--text-muted)]">Salvamento</span>
            <span className={`font-semibold ${saveState === 'error' ? 'text-[var(--danger)]' : saveState === 'saved' ? 'text-[var(--accent-primary)]' : 'text-[var(--celebration)]'}`}>{saveStateLabel}</span>
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => setPreview(value => !value)}>
          <Eye size={16} /> {preview ? 'Voltar ao editor' : 'Pré-visualizar dia'}
        </Button>

        <div className="grid gap-2">
          {canManage && selected.status === 'draft' && <Button variant="secondary" onClick={sendToReview} disabled={saving}>
            <Send size={16} /> Enviar para revisão
          </Button>}
          {canReview && selected.status === 'review' && <Button variant="secondary" onClick={returnToDraft} disabled={saving}>
            <ArrowLeft size={16} /> Voltar ao rascunho
          </Button>}
          {canPublish && selected.status === 'review' && <Button variant="secondary" onClick={publish} disabled={saving}>
            <CheckCircle2 size={16} /> Publicar agendado
          </Button>}
        {canPublish && <Button
          variant="secondary"
          onClick={publishSelectedDayNow}
          disabled={saving || !selectedDayReady}
          className="w-full"
        >
          <CheckCircle2 size={16} /> Liberar {day?.label ?? 'dia'} agora
        </Button>}
        {canPublish && (selected.status === 'review' || selected.status === 'published') && <Button
          onClick={publishNow}
          disabled={saving || (selected.status === 'published' && selected.document.releaseMode === 'immediate')}
          className="w-full"
        >
          <CheckCircle2 size={16} /> Publicar semana agora
        </Button>}
        </div>
        {incompleteDays.length > 0 && (
          <details className="group rounded-xl bg-[var(--surface-highlighted)] px-3 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[var(--celebration)]">
              {incompleteDays.length} dia(s) pendente(s) <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">{incompleteDays.map(item => item.label).join(', ')}.</p>
          </details>
        )}
      </Card>
      </div>

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl border border-[var(--celebration-border)] bg-[var(--surface-elevated)] p-3 shadow-2xl xl:hidden">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs font-semibold ${saveState === 'error' ? 'text-[var(--danger)]' : 'text-[var(--accent-primary)]'}`}>{saveStateLabel}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{readyDays} de {GENERATED_WEEKDAY_COUNT} conteúdos prontos</p>
        </div>
        <Button onClick={continueEditorialFlow} disabled={saving || saveState === 'saving'} className="shrink-0 !px-4">
          {selected.status === 'review'
            ? 'Publicar agendado'
            : completeness === 100
              ? 'Ir para revisão'
              : `Continuar ${incompleteDays[0]?.label ?? day?.label ?? 'semana'}`}
        </Button>
      </div>

      {aiOpen && day && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => { if (!aiGenerating) setAiOpen(false); }}
        >
          <div
            className="scrollbar-hidden max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-2xl sm:p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-[var(--accent-primary)]">Editorial Inteligente</p>
                <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)]">Gerar {day.label} com IA</h2>
                <p className="mt-2 text-base leading-7 text-[var(--text-secondary)]">
                  Gere blocos pontuais ou use o Agente Editorial para preparar o dia inteiro. O agente só atua em rascunhos e nunca envia para revisão, publica ou dispara notificações.
                </p>
              </div>
              <button
                type="button"
                disabled={aiGenerating}
                onClick={() => setAiOpen(false)}
                className="rounded-xl p-2 text-[var(--text-muted)] disabled:opacity-40"
                aria-label="Fechar geração com IA"
              >
                <X size={18} />
              </button>
            </div>

            {!aiDraft ? (
              <div className="mt-5 space-y-4">
                <fieldset>
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-sm font-semibold text-[var(--text-primary)]">Blocos a preencher</legend>
                    <div className="flex gap-2 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => setAiSelectedBlockTypes(BLOCK_OPTIONS.map(option => option.type))}
                        className="text-[var(--accent-primary)]"
                      >
                        Selecionar todos
                      </button>
                      <span className="text-[var(--border)]">·</span>
                      <button type="button" onClick={() => setAiSelectedBlockTypes([])} className="text-[var(--text-muted)]">
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {BLOCK_OPTIONS.map(option => {
                      const checked = aiSelectedBlockTypes.includes(option.type);
                      return (
                        <label
                          key={option.type}
                          className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                            checked
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setAiSelectedBlockTypes(current => checked
                              ? current.filter(type => type !== option.type)
                              : BLOCK_OPTIONS.map(item => item.type).filter(type => [...current, option.type].includes(type)))}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Ao aplicar, somente os tipos selecionados serão adicionados ou substituídos.
                  </p>
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-[var(--text-muted)]">
                    Público
                    <input
                      value={aiForm.audience}
                      onChange={event => setAiForm(current => ({ ...current, audience: event.target.value }))}
                      className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>
                  <label className="text-sm text-[var(--text-muted)]">
                    Tom da linguagem
                    <input
                      value={aiForm.tone}
                      onChange={event => setAiForm(current => ({ ...current, tone: event.target.value }))}
                      className="input-theme mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>
                </div>
                <label className="block text-sm text-[var(--text-muted)]">
                  Objetivo do dia
                  <textarea
                    value={aiForm.objective}
                    onChange={event => setAiForm(current => ({ ...current, objective: event.target.value }))}
                    placeholder="O que o leitor deve compreender ou praticar ao concluir este conteúdo?"
                    className="input-theme mt-1 min-h-20 w-full resize-y rounded-xl border px-3 py-2"
                  />
                </label>
                <label className="block text-sm text-[var(--text-muted)]">
                  Instruções adicionais
                  <textarea
                    value={aiForm.additionalInstructions}
                    onChange={event => setAiForm(current => ({ ...current, additionalInstructions: event.target.value }))}
                    placeholder="Ex.: enfatize Débora como liderança servidora; evite linguagem acadêmica."
                    className="input-theme mt-1 min-h-20 w-full resize-y rounded-xl border px-3 py-2"
                  />
                </label>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Contexto enviado:</strong> Lição {selected.number}, “{selected.title}”, {day.label}, duração de {day.estimatedMinutes} minutos e os dados editoriais já preenchidos.
                  <span className="mt-1 block">
                    <strong className="text-[var(--text-primary)]">RAG vinculado:</strong> {selected.document.knowledgeSourceIds.length} fonte(s) oficial(is) desta lição.
                  </span>
                </div>
                <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">Agente Editorial EBD — Preparar Dia</p>
                  <p className="mt-1">Usa o roteiro semanal e o RAG para evitar repetição, cria o rascunho completo com quiz e sugestão visual, registra a execução e para no editor para sua revisão.</p>
                  <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">Autonomia: somente rascunho · Publicação: sempre humana</p>
                </div>
                {missingLessonInputs.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/45 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                    <strong>Input não encontrado:</strong> {missingLessonInputs.join(', ')}.
                    <span className="mt-1 block text-sm opacity-80">
                      A geração pode continuar, mas esses dados não farão parte do contexto enviado à IA.
                    </span>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => generateDayWithAI('manual')}
                    disabled={aiGenerating || aiCooldown > 0 || selected.document.knowledgeSourceIds.length === 0 || aiSelectedBlockTypes.length === 0 || !aiForm.audience.trim() || !aiForm.tone.trim() || !aiForm.objective.trim()}
                    className="w-full"
                  >
                    <Sparkles size={17} /> {aiGenerating
                      ? 'Gerando rascunho...'
                      : aiCooldown > 0
                        ? `Aguarde ${aiCooldown}s...`
                        : `Gerar ${aiSelectedBlockTypes.length} ${aiSelectedBlockTypes.length === 1 ? 'bloco' : 'blocos'}`}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => generateDayWithAI('prepare_day')}
                    disabled={aiGenerating || aiCooldown > 0 || selected.status !== 'draft' || selected.document.knowledgeSourceIds.length === 0 || !aiForm.audience.trim() || !aiForm.tone.trim() || !aiForm.objective.trim()}
                    className="w-full"
                  >
                    <BrainCircuit size={17} /> {aiCooldown > 0 ? `Aguarde ${aiCooldown}s` : 'Preparar dia com agente'}
                  </Button>
                </div>
                {selected.status !== 'draft' && (
                  <p className="text-center text-xs text-[var(--text-muted)]">O agente fica disponível quando a lição retorna para rascunho.</p>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">Rascunho gerado</p>
                  <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{aiDraft.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[var(--text-secondary)]">{aiDraft.subtitle}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{aiDraft.estimatedMinutes} minutos · {aiDraft.blocks.length} blocos</p>
                  {aiDraft.generation && (
                    <div className="mt-2 space-y-1 text-xs font-semibold text-[var(--accent-primary)]">
                      <p title={`Execução ${aiDraft.generation.executionId ?? 'não registrada'}`}>
                        Gerado por {aiDraft.generation.provider} · {aiDraft.generation.model}
                      </p>
                      {aiDraft.generation.agentRunId && (
                        <p title={`Agente ${aiDraft.generation.agentRunId}`}>
                          Agente Editorial: rascunho registrado para revisão
                        </p>
                      )}
                      {aiDraft.generation.fallbacks.length > 0 && (
                        <p className="text-[var(--text-muted)]">
                          Alternativas: {aiDraft.generation.fallbacks.map(item => `${item.provider} (${item.reason})`).join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {aiDraft.blocks.map((block, index) => (
                    <div key={`${block.type}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--celebration)]">{blockLabel(block.type)}</p>
                      <p className="mt-2 text-lg font-semibold leading-6 text-[var(--text-primary)]">{block.title}</p>
                      {block.reference && <p className="mt-2 text-sm font-semibold text-[var(--accent-primary)]">{block.reference}</p>}
                      <p className="mt-3 whitespace-pre-line text-base leading-7 text-[var(--text-secondary)]">{block.content}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAiDraft(null)}>
                    Gerar novamente
                  </Button>
                  <Button type="button" onClick={() => { setAiOpen(false); setAiDraft(null); }}>
                    <CheckCircle2 size={16} /> Revisar no editor
                  </Button>
                </div>
                <p className="text-center text-sm leading-6 text-[var(--text-muted)]">
                  {aiDraft.generation?.persistedByAgent
                    ? 'O agente salvou o rascunho e encerrou sua ação. Revise, ajuste e envie para revisão quando estiver pronto.'
                    : 'Os blocos já foram aplicados e salvos no rascunho. Continue a revisão no editor.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showVersions && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowVersions(false)}>
          <div className="max-h-[70vh] w-full overflow-y-auto rounded-3xl bg-[var(--surface-elevated)] p-5" onClick={event => event.stopPropagation()}>
            <h2 className="font-display text-xl text-[var(--text-primary)]">Histórico de publicação</h2>
            <div className="mt-4 space-y-2">
              {versions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Nenhuma versão publicada.</p>
              ) : versions.map(version => (
                <div key={version.id} className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Versão {version.version}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(version.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <TextInputDialog
        open={reasonDialog !== null}
        title={reasonDialog === 'archive' ? 'Arquivar lição' : 'Voltar ao rascunho'}
        description={reasonDialog === 'archive'
          ? `“${selected?.title ?? 'Esta lição'}” sairá da lista ativa, mas seu histórico será preservado.`
          : 'Registre o ajuste necessário para orientar a próxima revisão editorial.'}
        label="Motivo"
        value={reason}
        confirmLabel={reasonDialog === 'archive' ? 'Arquivar' : 'Voltar ao rascunho'}
        busy={saving}
        danger={reasonDialog === 'archive'}
        minLength={8}
        onChange={setReason}
        onCancel={() => { setReasonDialog(null); setReason(''); }}
        onConfirm={confirmReasonAction}
      />
    </div>
  );
}
