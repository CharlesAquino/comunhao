import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Layers3,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SealIcon from '../components/ui/SealIcon';
import { AdminPageHeader, AdminSection } from '../components/admin/AdminPage';
import {
  deleteKnowledgeSource,
  listKnowledgeSources,
  reindexKnowledgeSource,
  searchKnowledgeMemory,
  setKnowledgeSourceActive,
  uploadKnowledgeSource,
} from '../services/conhecimentoService';
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_SCOPES,
  type KnowledgeCategory,
  type KnowledgeScope,
  type KnowledgeSearchResult,
  type KnowledgeSource,
} from '../types/conhecimento';

const STATUS_LABELS = {
  processing: 'Processando',
  ready: 'Pronta',
  error: 'Falhou',
  archived: 'Arquivada',
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusClasses(status: KnowledgeSource['status']): string {
  if (status === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (status === 'processing') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'error') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  return 'border-[var(--border)] bg-[var(--surface-highlighted)] text-[var(--text-muted)]';
}

export default function BibliotecaConhecimento() {
  const { can, checking } = useAdmin();
  const canRead = can('knowledge.read');
  const canManage = can('knowledge.manage');
  const toast = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<KnowledgeScope>('global');
  const [category, setCategory] = useState<KnowledgeCategory>('documento');
  const [tags, setTags] = useState('');
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<KnowledgeScope | 'all'>('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);

  const loadSources = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setSources(await listKnowledgeSources());
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (canRead) void loadSources();
    else if (!checking) setLoading(false);
  }, [checking, canRead, loadSources]);

  useEffect(() => {
    if (!sources.some(source => source.status === 'processing')) return;
    const timer = window.setInterval(() => void loadSources(true), 4000);
    return () => window.clearInterval(timer);
  }, [sources, loadSources]);

  const metrics = useMemo(() => ({
    total: sources.length,
    ready: sources.filter(source => source.status === 'ready' && source.active).length,
    processing: sources.filter(source => source.status === 'processing').length,
    chunks: sources.reduce((sum, source) => sum + source.totalChunks, 0),
  }), [sources]);

  const handleFile = (file: File | null) => {
    setSelectedFile(file);
    if (file && !title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    }
  };

  const handleUpload = async () => {
    if (!canManage) return;
    if (!selectedFile || uploading) return;
    setUploading(true);
    try {
      await uploadKnowledgeSource({
        file: selectedFile,
        title: title.trim() || selectedFile.name,
        description,
        scope,
        category,
        tags: tags.split(',').map(item => item.trim().toLowerCase()).filter(Boolean),
      });
      toast.success('Arquivo enviado. A memória está sendo atualizada.');
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setTags('');
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (source: KnowledgeSource) => {
    if (!canManage) return;
    setOperatingId(source.id);
    try {
      await reindexKnowledgeSource(source.id);
      toast.success('Reindexação iniciada');
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reindexar.');
    } finally {
      setOperatingId(null);
    }
  };

  const handleToggle = async (source: KnowledgeSource) => {
    if (!canManage) return;
    setOperatingId(source.id);
    try {
      await setKnowledgeSourceActive(source.id, !source.active);
      toast.success(source.active ? 'Fonte retirada da memória ativa' : 'Fonte reativada');
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a fonte.');
    } finally {
      setOperatingId(null);
    }
  };

  const handleDelete = async (source: KnowledgeSource) => {
    if (!canManage) return;
    if (!confirm(`Excluir permanentemente “${source.title}” e todos os seus trechos da memória?`)) return;
    setOperatingId(source.id);
    try {
      await deleteKnowledgeSource(source);
      toast.success('Fonte removida');
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.');
    } finally {
      setOperatingId(null);
    }
  };

  const handleSearch = async () => {
    if (query.trim().length < 3 || searching) return;
    setSearching(true);
    try {
      setResults(await searchKnowledgeMemory({
        query: query.trim(),
        scopes: searchScope === 'all' ? undefined : [searchScope],
        limit: 8,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível consultar a memória.');
    } finally {
      setSearching(false);
    }
  };

  if (checking || loading) {
    return <div className="flex min-h-full items-center justify-center text-sm text-[var(--text-muted)]">Abrindo memória sistêmica...</div>;
  }

  if (!canRead) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <h1 className="font-display text-xl text-[var(--text-primary)]">Área restrita</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Seu perfil não possui acesso à memória sistêmica.</p>
          <Link to="/" className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-primary)]">Voltar ao início</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <Link to="/admin/ebd" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]"><ArrowLeft size={15} /> Estúdio</Link>
      <AdminPageHeader eyebrow="Conhecimento institucional" title="Memória sistêmica" description="Fontes oficiais usadas por IA, busca, conteúdo editorial e futuros módulos do Comunhão." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Fontes', value: metrics.total, icon: Database },
          { label: 'Ativas', value: metrics.ready, icon: CheckCircle2 },
          { label: 'Processando', value: metrics.processing, icon: Clock3 },
          { label: 'Trechos', value: metrics.chunks, icon: Layers3 },
        ].map(metric => (
          <Card key={metric.label} className="p-4">
            <metric.icon size={17} className="text-[var(--accent-primary)]" />
            <p className="mt-3 font-display text-xl text-[var(--text-primary)]">{metric.value}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{metric.label}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <SealIcon Icon={UploadCloud} size="md" active />
          <div>
            <h2 className="font-display text-lg text-[var(--text-primary)]">Adicionar fonte</h2>
            <p className="text-xs text-[var(--text-secondary)]">PDF, DOCX, TXT, Markdown, HTML, CSV ou JSON · até 15 MB.</p>
          </div>
        </div>

        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--accent-border)] bg-[var(--surface-highlighted)] p-5 text-center">
          <UploadCloud size={24} className="text-[var(--accent-primary)]" />
          <span className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{selectedFile?.name ?? 'Escolher arquivo'}</span>
          <span className="mt-1 text-[11px] text-[var(--text-muted)]">O original fica privado no Storage; somente os trechos indexados alimentam o RAG.</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md,.markdown,.html,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/html,text/csv,application/json"
            onChange={event => handleFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-[var(--text-muted)]">
            Título da fonte
            <input value={title} onChange={event => setTitle(event.target.value)} className="input-theme mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Ex.: Lição 5 — Débora e Baraque" />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Tags separadas por vírgula
            <input value={tags} onChange={event => setTags(event.target.value)} className="input-theme mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="debora, baraque, juizes" />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Escopo
            <select value={scope} onChange={event => setScope(event.target.value as KnowledgeScope)} className="input-theme mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              {KNOWLEDGE_SCOPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Categoria
            <select value={category} onChange={event => setCategory(event.target.value as KnowledgeCategory)} className="input-theme mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              {KNOWLEDGE_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <label className="text-xs text-[var(--text-muted)]">
          Descrição e regras de uso
          <textarea value={description} onChange={event => setDescription(event.target.value)} className="input-theme mt-1 min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-sm" placeholder="Ex.: fonte principal da semana; preservar contexto e não inventar complementos." />
        </label>

        <Button onClick={handleUpload} disabled={!canManage || !selectedFile || uploading} className="w-full">
          <UploadCloud size={17} /> {uploading ? 'Enviando e indexando...' : 'Integrar à memória sistêmica'}
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-[var(--text-primary)]">Testar recuperação</h2>
            <p className="text-xs text-[var(--text-secondary)]">Veja quais trechos seriam enviados a um gerador antes de publicar conteúdo.</p>
          </div>
          <Search size={20} className="text-[var(--accent-primary)]" />
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void handleSearch(); }} className="input-theme rounded-xl border px-3 py-2 text-sm" placeholder="Ex.: qual é o papel de Débora na libertação de Israel?" />
          <select value={searchScope} onChange={event => setSearchScope(event.target.value as KnowledgeScope | 'all')} className="input-theme rounded-xl border px-3 py-2 text-sm">
            <option value="all">Todos os escopos</option>
            {KNOWLEDGE_SCOPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Button onClick={handleSearch} disabled={query.trim().length < 3 || searching}>
            <Search size={16} /> {searching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map(result => (
              <div key={result.chunk_id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--accent-primary)]">{result.fonte_titulo} · trecho {result.chunk_index + 1}</p>
                  <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)]">score {(result.score_final * 100).toFixed(1)}%</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{result.conteudo}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AdminSection title="Fontes registradas" description="Desativar retira a fonte das respostas sem apagar o original.">
        <div className="flex items-center justify-between">
          <div />
          <Button variant="ghost" className="!px-2" onClick={() => void loadSources()}><RefreshCw size={16} /> Atualizar</Button>
        </div>

        {sources.length === 0 ? (
          <Card className="p-8 text-center">
            <Database size={26} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Nenhuma fonte integrada ainda.</p>
          </Card>
        ) : sources.map(source => (
          <Card key={source.id} className={`space-y-3 p-4 ${source.active ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText size={19} className="mt-1 shrink-0 text-[var(--accent-primary)]" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{source.title}</h3>
                  <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{source.fileName} · {formatBytes(source.sizeBytes)}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClasses(source.status)}`}>{STATUS_LABELS[source.status]}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
              <span className="rounded-full border border-[var(--border)] px-2 py-1">{KNOWLEDGE_SCOPES.find(item => item.value === source.scope)?.label}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-1">{KNOWLEDGE_CATEGORIES.find(item => item.value === source.category)?.label}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-1">{source.totalChunks} trechos</span>
              {source.pages ? <span className="rounded-full border border-[var(--border)] px-2 py-1">{source.pages} páginas</span> : null}
            </div>

            {source.description && <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{source.description}</p>}
            {source.error && (
              <div className="flex gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle size={15} className="shrink-0" /> {source.error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button variant="ghost" className="!min-h-10 !px-2 text-xs" disabled={!canManage || operatingId === source.id} onClick={() => void handleReindex(source)}>
                <RefreshCw size={14} /> Reindexar
              </Button>
              <Button variant="ghost" className="!min-h-10 !px-2 text-xs" disabled={!canManage || operatingId === source.id || source.status === 'processing'} onClick={() => void handleToggle(source)}>
                {source.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />} {source.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="ghost" className="!min-h-10 !px-2 text-xs text-[var(--danger)]" disabled={!canManage || operatingId === source.id} onClick={() => void handleDelete(source)}>
                <Trash2 size={14} /> Excluir
              </Button>
            </div>
          </Card>
        ))}
      </AdminSection>
    </div>
  );
}
