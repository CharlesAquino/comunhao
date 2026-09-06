import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CircleAlert, Clock3, HandHeart, HeartHandshake, PhoneCall, RefreshCw, UsersRound } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../ui/FeedbackState';
import { obterTelemetriaSorteio, type SorteioTelemetry } from '../../services/adminService';
import { AdminMetric, AdminMetricGrid, AdminSection } from './AdminPage';

type Period = 7 | 30 | 60;

const number = new Intl.NumberFormat('pt-BR');

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

export default function PrayerDrawTelemetry(): React.ReactElement {
  const [period, setPeriod] = useState<Period>(30);
  const [telemetry, setTelemetry] = useState<SorteioTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTelemetry(await obterTelemetriaSorteio(period));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a telemetria do círculo.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const seriesMax = useMemo(() => Math.max(1, ...(telemetry?.serie_diaria.map(item => Math.max(item.chamadas, item.falhas)) ?? [1])), [telemetry]);

  if (loading && !telemetry) return <LoadingState label="Lendo sinais de cuidado do círculo…" />;
  if (error && !telemetry) return <ErrorState message={error} />;
  if (!telemetry) return <EmptyState Icon={Activity} title="Telemetria indisponível" description="Não há dados para este período." />;

  const { kpis } = telemetry;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-y border-[var(--border)] py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período da telemetria">
          {([7, 30, 60] as Period[]).map(days => (
            <Button key={days} type="button" variant={period === days ? 'secondary' : 'ghost'} className="!min-h-10 text-xs" onClick={() => setPeriod(days)} disabled={loading}>
              {days} dias
            </Button>
          ))}
        </div>
        <Button type="button" variant="secondary" className="!min-h-10 text-xs" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar
        </Button>
      </div>

      {error && <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]">{error}</div>}

      <AdminMetricGrid>
        <AdminMetric label="Chamadas iniciadas" value={number.format(kpis.chamadas)} Icon={PhoneCall} tone="accent" />
        <AdminMetric label="Aceites" value={`${number.format(kpis.taxa_aceite)}%`} Icon={CheckCircle2} tone="celebration" />
        <AdminMetric label="Continuidade" value={`${number.format(kpis.taxa_continuidade)}%`} Icon={HeartHandshake} tone="care" />
        <AdminMetric label="Sem resposta" value={number.format(kpis.sem_resposta)} Icon={Clock3} tone="neutral" />
      </AdminMetricGrid>

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Frequência de uso</p>
            <h3 className="mt-1 font-display text-lg text-[var(--text-primary)]">Chamadas do círculo</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Cada coluna mostra chamadas iniciadas; a marca em cobre representa falhas registradas pelo app.</p>
          </div>
          <div className="text-right text-xs text-[var(--text-secondary)]">
            <strong className="block text-base text-[var(--text-primary)]">{number.format(kpis.concluidas)}</strong>
            encontros concluídos
          </div>
        </div>
        <div className="mt-5 flex h-32 items-end gap-1.5" aria-label="Série diária de chamadas e falhas">
          {telemetry.serie_diaria.map(item => (
            <div key={item.dia} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${item.dia}: ${item.chamadas} chamadas, ${item.falhas} falhas`}>
              <div className="w-full overflow-hidden rounded-t-md bg-[var(--accent-primary)]/70" style={{ height: `${Math.max(item.chamadas ? 8 : 0, (item.chamadas / seriesMax) * 100)}%` }} />
              {item.falhas > 0 && <div className="absolute bottom-0 w-full rounded-t-md bg-[var(--celebration)]" style={{ height: `${Math.max(5, (item.falhas / seriesMax) * 100)}%` }} />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]"><span>{formatDateTime(telemetry.periodo.inicio).split(',')[0]}</span><span>{formatDateTime(telemetry.periodo.fim).split(',')[0]}</span></div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3"><UsersRound className="mt-0.5 text-[var(--accent-primary)]" size={19} /><div><h3 className="font-display text-lg text-[var(--text-primary)]">Círculo atual</h3><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{telemetry.ultima_formacao.id ? `Formado em ${formatDateTime(telemetry.ultima_formacao.criado_em)} por ${telemetry.ultima_formacao.executado_por}.` : 'A próxima formação aparecerá aqui.'}</p></div></div>
          {telemetry.circulo_atual.length ? <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-hidden">{telemetry.circulo_atual.map(pair => <div key={pair.participante} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><strong className="block text-sm text-[var(--text-primary)]">{pair.participante}</strong><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">Ora por <strong>{pair.ora_por}</strong> · recebe oração de <strong>{pair.e_orado_por}</strong></p></div>)}</div> : <p className="mt-5 text-sm text-[var(--text-muted)]">Nenhuma formação registrada ainda.</p>}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 text-[var(--celebration)]" size={19} /><div><h3 className="font-display text-lg text-[var(--text-primary)]">Atenção à continuidade</h3><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{kpis.recusadas} recusa(s), {kpis.expiradas} expiração(ões) e {kpis.falhas_app} falha(s) de app no período.</p></div></div>
          {telemetry.sem_resposta.length ? <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-hidden">{telemetry.sem_resposta.map(item => <div key={`${item.quem_chamou}-${item.criado_em}`} className="rounded-xl border border-[var(--care-border)] bg-[var(--care-soft)] p-3"><p className="text-sm font-semibold text-[var(--text-primary)]">{item.quem_chamou} aguarda {item.quem_nao_respondeu}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Há {item.minutos_aguardando} min · chamada em {formatDateTime(item.criado_em)}</p></div>)}</div> : <p className="mt-5 text-sm text-[var(--text-muted)]">Nenhuma chamada sem resposta há mais de 30 minutos.</p>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="Quem atendeu" description="Aceites registrados no período; concluir indica encerramento confirmado.">
          {telemetry.atendimentos.length ? <div className="space-y-2">{telemetry.atendimentos.map(item => <Card key={`${item.quem_atendeu}-${item.aceito_em}`} className="flex items-center justify-between gap-3 p-3"><div><strong className="block text-sm text-[var(--text-primary)]">{item.quem_atendeu}</strong><p className="mt-1 text-xs text-[var(--text-secondary)]">Atendeu {item.quem_chamou} · {formatDateTime(item.aceito_em)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.concluida ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>{item.concluida ? 'Concluída' : 'Em aberto'}</span></Card>)}</div> : <EmptyState Icon={CheckCircle2} title="Ainda não há aceites" description="Os atendimentos aparecerão após os primeiros convites." />}
        </AdminSection>

        <AdminSection title="Necessidades de intercessão" description={telemetry.identidades_assistenciais_visiveis ? 'Sinais ativos para cuidado e encaminhamento; a intenção continua privada.' : 'Contagens protegidas; identidades exigem permissão pastoral sensível.'}>
          {telemetry.necessidades_assistenciais.length ? <div className="space-y-2">{telemetry.necessidades_assistenciais.map(item => <Card key={`${item.pessoa}-${item.criado_em}`} className="p-3"><div className="flex items-start justify-between gap-3"><div><strong className="block text-sm text-[var(--text-primary)]">{item.pessoa}</strong><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatLabel(item.categoria)} · {formatLabel(item.acompanhamento)}</p></div><span className="rounded-full bg-[var(--care-soft)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--care)]">{item.intercessoes_confirmadas} confirmação(ões)</span></div></Card>)}</div> : <EmptyState Icon={HandHeart} title="Nenhum pedido ativo" description="Pedidos de oração ativos aparecerão aqui sem expor a intenção." />}
        </AdminSection>
      </div>
    </div>
  );
}
