import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import { importEditorialSources, listEditorialSources } from '../../services/ebdSourceService';
import { extractEditorialSourceDay, parseEditorialSourceDay, SOURCE_BLOCKS, SOURCE_SCHEMA, sourceDayWarnings, type EditorialSourceDay } from '../../services/ebdSourcePackage';
import { getEbdBlockLabel } from '../../services/ebdStudioRules';
import type { EbdBlockType, EbdEditorialDay } from '../../types/ebdEditorial';

interface Props {
  lessonId: string;
  lessonNumber: number;
  day: EbdEditorialDay;
  disabled: boolean;
  disabledReason?: string;
  onApply: (day: EbdEditorialDay) => void | Promise<void>;
  onApplyWeek?: (sourcesMap: Record<string, EditorialSourceDay>, types: EbdBlockType[]) => void | Promise<void>;
}

export default function EditorialSourceImport({ lessonId, lessonNumber, day, disabled, disabledReason, onApply, onApplyWeek }: Props) {
  const [sources, setSources] = useState<EditorialSourceDay[]>([]);
  const [pending, setPending] = useState<EditorialSourceDay[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [types, setTypes] = useState<EbdBlockType[]>(SOURCE_BLOCKS.filter(type => type !== 'video'));
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const prevDayRef = useRef(day.day);

  // Busca as fontes da biblioteca ao montar ou trocar de lição
  useEffect(() => {
    let active = true;
    listEditorialSources(lessonId).then(value => { if (active) setSources(value); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [lessonId]);

  // Ao trocar de dia, limpa estados transientes e reseta o índice de fonte
  useEffect(() => {
    if (prevDayRef.current !== day.day) {
      prevDayRef.current = day.day;
      setSourceIndex(0);
      setMessage('');
      setError('');
    }
  }, [day.day]);

  const available = sources.filter(source => source.weekday === day.day);
  const source = available[sourceIndex] ?? available[0];
  const warnings = source ? sourceDayWarnings(source).filter(note => types.some(type => note.startsWith(`${type}:`))) : [];

  // Abre automaticamente o painel quando há fontes disponíveis
  useEffect(() => {
    if (source && detailsRef.current && !detailsRef.current.open) {
      detailsRef.current.open = true;
    }
  }, [source, day.day]);

  async function readFiles(files: File[]) {
    setError(''); setMessage(''); setPending([]); setBusy(true);
    try {
      if (!files.length || files.length > 7 || files.some(file => file.size > 524288)) throw new Error('Selecione até seis JSONs de dia e o manifesto; cada arquivo deve ter até 512 KB.');
      const parsed: EditorialSourceDay[] = [];
      let manifest: Record<string, unknown> | undefined;
      for (const file of files) {
        let raw;
        try { raw = JSON.parse(await file.text()); } catch { throw new Error(`${file.name}: JSON inválido. Envie o arquivo exportado pelo Astra.`); }
        if (raw?.schemaVersion === SOURCE_SCHEMA && raw?.lesson && Array.isArray(raw?.days)) {
          if (manifest) throw new Error('Selecione apenas um manifesto.');
          manifest = raw;
        } else {
          try { parsed.push(parseEditorialSourceDay(raw)); } catch (reason) { throw new Error(`${file.name}: ${(reason as Error).message}`); }
        }
      }
      if (!parsed.length) throw new Error('Selecione os arquivos dos dias, além do manifesto opcional.');
      if (new Set(parsed.map(s => `${s.lessonKey}/${s.revision}`)).size !== 1 || new Set(parsed.map(s => s.weekday)).size !== parsed.length) throw new Error('Não misture lições, revisões ou dias repetidos.');
      if (manifest) {
        const lesson = manifest.lesson as Record<string, unknown>;
        if (lesson.number !== lessonNumber || manifest.lessonKey !== parsed[0].lessonKey || manifest.revision !== parsed[0].revision) throw new Error('O manifesto não corresponde à lição aberta ou à revisão dos dias.');
        if (!Array.isArray(manifest.issues) || manifest.issues.length) throw new Error('O manifesto possui pendências ou não informa issues. Resolva-as antes de importar.');
        const entries = manifest.days as Array<Record<string, unknown>>;
        if (entries.length !== 6 || new Set(entries.map(entry => entry.weekday)).size !== 6 || parsed.some(s => !entries.some(entry => entry.weekday === s.weekday && entry.dayKey === s.dayKey))) throw new Error('Os dias não correspondem ao manifesto.');
      }
      setPending(parsed);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function storeFiles() {
    setBusy(true); setError('');
    try {
      await importEditorialSources(lessonId, pending);
      setSources(await listEditorialSources(lessonId));
      setPending([]); setSourceIndex(0);
      setMessage('Arquivos guardados. Escolha os blocos para aplicar ao dia.');
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  // Desabilita apenas a aplicação ao rascunho quando salvando; importação/seleção permanecem acessíveis
  const applyDisabled = disabled || busy || !types.length;

  return <details ref={detailsRef} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
      Conteúdo preparado · Importar pacote editorial
      {source && <span className="ml-2 text-xs font-normal text-[var(--accent-primary)]">· {source.day.title}</span>}
    </summary>
    <div className="mt-3 space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">Importe os JSONs produzidos pelo Astra. Os dez blocos ficam guardados para seleção, sem nova geração por IA.</p>
      <label className="block text-sm text-[var(--text-primary)]">Arquivos dos dias e manifesto opcional
        <input type="file" accept=".json,application/json" multiple disabled={busy || disabled} className="input-theme mt-2 block min-h-11 w-full" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles(files); }} />
      </label>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent-primary)]">{message}</p>}
      {pending.length > 0 && <div className="space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">Vincular {pending.length} dia(s) de {pending[0].lessonKey}, revisão {pending[0].revision}, à lição {lessonNumber}. Confira essa correspondência antes de guardar.</p>
        <Button variant="secondary" disabled={busy || disabled} onClick={() => void storeFiles()}>{busy ? 'Guardando…' : 'Confirmar vínculo e guardar pacote'}</Button>
      </div>}
      {source ? <>
        <label className="block text-sm text-[var(--text-primary)]">Fonte de {day.label}
          <select className="input-theme mt-2 min-h-11 w-full rounded-xl border px-3" value={available.indexOf(source)} onChange={e => setSourceIndex(Number(e.target.value))}>
            {available.map((item, index) => <option key={`${item.lessonKey}/${item.revision}`} value={index}>{item.lessonKey} · revisão {item.revision} · {item.day.title}</option>)}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm text-[var(--text-primary)]">Blocos para este dia</legend>
          {SOURCE_BLOCKS.map(type => <label key={type} className="sanctuary-choice flex min-h-11 items-center gap-2 px-3 text-sm">
            <input type="checkbox" checked={types.includes(type)} onChange={event => setTypes(current => event.target.checked ? [...current, type] : current.filter(value => value !== type))} />{getEbdBlockLabel(type)}
          </label>)}
        </fieldset>
        {warnings.length > 0 && <ul className="space-y-1 text-sm text-[var(--celebration)]">{warnings.map(note => <li key={note}>{note}</li>)}</ul>}
        {types.includes('quiz') && <p className="text-sm text-[var(--text-secondary)]">Na revisão, confira se as questões podem ser respondidas com os blocos escolhidos.</p>}
        <details className="text-sm text-[var(--text-secondary)]"><summary className="min-h-11 cursor-pointer">Conferir textos antes de aplicar</summary>
          {source.day.blocks.filter(block => types.includes(block.type)).map(block => <section className="mt-3" key={block.type}><h4 className="font-semibold">{block.title}</h4><p className="whitespace-pre-line leading-7">{block.content}</p>{block.quizQuestions.map((q, index) => <p key={index} className="mt-2">{q.prompt} — {q.options.join(' / ')} · Corretas: {q.correctAnswers.map(i => i + 1).join(', ')}. {q.explanation}</p>)}</section>)}
        </details>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button disabled={applyDisabled} onClick={async () => {
            if (!confirm(`Aplicar ${types.length} blocos de ${source.day.title} em ${day.label}? Os ${day.blocks.length} blocos atuais deste dia serão substituídos. O pacote original continuará guardado.`)) return;
            try {
              await onApply(extractEditorialSourceDay(source, day, types));
              setMessage('Conteúdo aplicado ao rascunho com sucesso.');
            } catch (reason) {
              setError((reason as Error).message);
            }
          }}>Aplicar seleção em {day.label}</Button>
          {onApplyWeek && sources.length >= 2 && (
            <Button
              variant="secondary"
              disabled={busy || disabled || !types.length}
              onClick={async () => {
                const availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].filter(w => sources.some(s => s.weekday === w));
                if (!confirm(`Aplicar os blocos selecionados para toda a semana (${availableDays.length} dias disponíveis)? Dias já liberados no aplicativo permanecerão protegidos.`)) return;
                try {
                  const sourcesMap: Record<string, EditorialSourceDay> = {};
                  for (const w of availableDays) {
                    const found = sources.find(s => s.weekday === w);
                    if (found) sourcesMap[w] = found;
                  }
                  await onApplyWeek(sourcesMap, types);
                  setMessage(`Pacote semanal aplicado com sucesso (${availableDays.length} dias sincronizados).`);
                } catch (reason) {
                  setError((reason as Error).message);
                }
              }}
            >
              Aplicar pacote na semana inteira
            </Button>
          )}
        </div>
        {disabled && (
          <p className="text-xs text-[var(--celebration)]">
            {disabledReason ?? 'Aguarde o salvamento concluir para aplicar.'}
          </p>
        )}
      </> : <p className="text-sm text-[var(--text-muted)]">{busy ? 'Lendo arquivos…' : 'Nenhum pacote disponível para este dia.'}</p>}
    </div>
  </details>;
}
