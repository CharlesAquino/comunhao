import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Clock3, Heart, History, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SealIcon from '../components/ui/SealIcon';
import { triggerPrayerIntercededHaptic } from '../utils/haptics';
import {
  IntercessionIcon,
  PrayerPresenceIcon,
  PrayerTextIcon,
  PrayerTogetherIcon,
  PrayerVideoIcon,
  PrayerVoiceIcon,
  QuietPrayerIcon,
  RaisedPrayerIcon,
} from '../components/icons/SanctuaryIcons';
import { useToast } from '../contexts/ToastContext';
import {
  closePrayerRequest,
  confirmPrayer,
  createPrayerRequest,
  embracePrayerRequest,
  listAvailablePrayerRequests,
  listMyPrayerRequests,
  type AvailablePrayerRequest,
  type MyPrayerRequest,
  type PrayerRequestCategory,
  type PrayerRequestFollowUp,
  type PrayerRequestVisibility,
} from '../services/asynchronousPrayerService';
import { configurePrayerAvailability, endPrayerAvailability, getMyPrayerAvailability, listPrayerAvailablePeople, type AvailablePrayerPerson, type PrayerAvailability, type PrayerAvailabilityMode } from '../services/prayerAvailabilityService';
import { enviarConviteOracao } from '../services/conviteService';
import InstitutionalCrest from '../components/InstitutionalCrest';

const CATEGORY_LABELS: Record<PrayerRequestCategory, string> = {
  familia: 'Família', saude: 'Saúde', fe: 'Fé', estudos: 'Estudos', trabalho: 'Trabalho',
  relacionamentos: 'Relacionamentos', outro: 'Outro motivo',
};

type Tab = 'inicio' | 'interceder' | 'agora' | 'meus';

export default function CentralOracao() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('aba');
  const [tab, setTab] = useState<Tab>(initialTab === 'meus' || initialTab === 'interceder' || initialTab === 'agora' ? initialTab : 'inicio');
  const [showForm, setShowForm] = useState(searchParams.get('novo') === 'true');
  const [available, setAvailable] = useState<AvailablePrayerRequest[]>([]);
  const [mine, setMine] = useState<MyPrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<PrayerRequestCategory>('outro');
  const [intencao, setIntencao] = useState('');
  const [visibilidade, setVisibilidade] = useState<PrayerRequestVisibility>('intercessores');
  const [identificado, setIdentificado] = useState(false);
  const [acompanhamento, setAcompanhamento] = useState<PrayerRequestFollowUp>('somente_oracao');
  const [dias, setDias] = useState<1 | 3 | 7>(3);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [myAvailability, setMyAvailability] = useState<PrayerAvailability | null>(null);
  const [availablePeople, setAvailablePeople] = useState<AvailablePrayerPerson[]>([]);
  const [availabilityMinutes, setAvailabilityMinutes] = useState<15 | 30 | 60>(30);
  const [availabilityModes, setAvailabilityModes] = useState<PrayerAvailabilityMode[]>(['silencio']);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [availableRows, myRows, peopleRows, ownAvailability] = await Promise.all([listAvailablePrayerRequests(), listMyPrayerRequests(), listPrayerAvailablePeople(), getMyPrayerAvailability()]);
      setAvailable(availableRows);
      setMine(myRows);
      setAvailablePeople(peopleRows);
      setMyAvailability(ownAvailability?.ativo && new Date(ownAvailability.disponivel_ate).getTime() > Date.now() ? ownAvailability : null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a Sala de Oração.');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const changeTab = (next: Tab) => {
    setTab(next);
    setSearchParams(next === 'inicio' ? {} : { aba: next }, { replace: true });
  };

  const submitRequest = async () => {
    setWorkingId('create');
    try {
      await createPrayerRequest({ categoria, intencao, visibilidade, identificado, acompanhamento, diasValidade: dias });
      setShowForm(false);
      setIntencao('');
      setIdentificado(false);
      toast.success('Seu pedido foi acolhido. Avisaremos quando alguém estiver orando por você.');
      await load();
      changeTab('meus');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar seu pedido.');
    } finally { setWorkingId(null); }
  };

  const embrace = async (request: AvailablePrayerRequest) => {
    setWorkingId(request.id);
    try {
      await embracePrayerRequest(request.id);
      triggerPrayerIntercededHaptic();
      toast.success(`${request.autor_nome} saberá que seu pedido foi acolhido.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Este pedido não está mais disponível.');
    } finally { setWorkingId(null); }
  };

  const complete = async (request: AvailablePrayerRequest) => {
    if (!request.minha_intercessao_id) return;
    setWorkingId(request.id);
    try {
      await confirmPrayer(request.minha_intercessao_id, messages[request.id]);
      triggerPrayerIntercededHaptic();
      toast.success('Oração confirmada. A pessoa será avisada com discrição.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível confirmar agora.');
    } finally { setWorkingId(null); }
  };

  const toggleMode = (mode: PrayerAvailabilityMode) => setAvailabilityModes(current => current.includes(mode) ? (current.length > 1 ? current.filter(value => value !== mode) : current) : [...current, mode]);
  const activateAvailability = async () => {
    setWorkingId('availability');
    try { setMyAvailability(await configurePrayerAvailability(availabilityMinutes, availabilityModes)); toast.success(`Você ficará disponível por ${availabilityMinutes} minutos.`); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível ativar sua disponibilidade.'); }
    finally { setWorkingId(null); }
  };
  const stopAvailability = async () => { setWorkingId('availability'); try { await endPrayerAvailability(); setMyAvailability(null); toast.success('Disponibilidade encerrada.'); await load(); } finally { setWorkingId(null); } };
  const inviteAvailablePerson = async (person: AvailablePrayerPerson, mode: PrayerAvailabilityMode) => {
    setWorkingId(person.usuario_id);
    try { await enviarConviteOracao(person.usuario_id, mode === 'video' ? 'video' : mode === 'voz' ? 'voz' : 'aceite', 'sala_oracao'); toast.success(`Convite enviado para ${person.nome}.`); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o convite.'); }
    finally { setWorkingId(null); }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-5 pb-8 pt-6">
      <header className="prayer-room-hero">
        <div className="sr-only">
          <p>Comunhão e cuidado</p>
          <h1>Sala de Oração</h1>
          <p>Um espaço para orar e fortalecer a fé em comunhão.</p>
        </div>
      </header>

      <nav className="sanctuary-nav grid grid-cols-4 p-1" aria-label="Seções da Sala de Oração">
        {([['inicio', 'Início'], ['interceder', 'Interceder'], ['agora', 'Ao vivo'], ['meus', 'Meus pedidos']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => changeTab(value)} className={`sanctuary-tab px-2 text-xs font-semibold transition-premium ${tab === value ? 'sanctuary-tab--active txt-primary' : 'txt-tertiary hover:txt-primary'}`}>{label}</button>
        ))}
      </nav>

      {loading ? <Card className="p-8 text-center text-sm txt-muted">Carregando o cuidado da comunidade...</Card> : tab === 'inicio' ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setShowForm(true)} className="sanctuary-disclosure premium-surface w-full rounded-[1.5rem] border border-[var(--celebration-border)] bg-[var(--surface-highlighted)] p-5 text-left">
            <div className="flex items-start gap-4"><SealIcon Icon={RaisedPrayerIcon} size="lg" active /><div><h2 className="font-display text-xl font-semibold txt-primary">Preciso de oração</h2><p className="mt-1 text-sm leading-relaxed txt-tertiary">Compartilhe somente o que desejar. Você não precisa entrar em uma chamada.</p></div></div>
          </button>
          <button type="button" onClick={() => changeTab('interceder')} className="sanctuary-disclosure card-surface w-full p-5 text-left">
            <div className="flex items-start gap-4"><SealIcon Icon={IntercessionIcon} size="lg" /><div><h2 className="font-display text-xl font-semibold txt-primary">Quero orar por alguém</h2><p className="mt-1 text-sm leading-relaxed txt-tertiary">Acolha uma intenção e confirme quando tiver intercedido.</p></div></div>
          </button>
          <Card className="p-5">
            <div className="flex items-start gap-4"><SealIcon Icon={PrayerTogetherIcon} size="lg" /><div className="min-w-0 flex-1"><h2 className="font-display text-lg font-semibold txt-primary">Orar juntos agora</h2><p className="mt-1 text-sm txt-tertiary">Encontros simultâneos por silêncio, texto, voz ou vídeo ficam concentrados aqui.</p><button type="button" onClick={() => changeTab('agora')} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent-primary)]">Entrar na sala ao vivo</button></div></div>
          </Card>
          <p className="text-operational flex items-center gap-2 px-1"><Shield size={14} /> Intenções são privadas por padrão e nunca aparecem no Mural.</p>
        </div>
      ) : tab === 'interceder' ? (
        <div className="space-y-3">
          {available.length === 0 ? <Card className="p-8 text-center"><Heart className="mx-auto txt-muted" /><h2 className="mt-3 font-display text-lg txt-primary">Nenhum pedido aguardando agora</h2><p className="mt-2 text-sm txt-tertiary">Volte mais tarde. Sua disposição para acolher já é valiosa.</p></Card> : available.map(request => (
            <Card key={request.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">{CATEGORY_LABELS[request.categoria]}</p><h2 className="mt-1 font-display text-lg txt-primary">{request.autor_nome}</h2></div><span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-primary)]">{request.anonimo ? 'Reservado' : 'Comunidade'}</span></div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed txt-secondary">{request.intencao || 'Prefiro não explicar, mas gostaria de ser lembrado em oração.'}</p>
              <p className="text-operational mt-3 flex items-center gap-1.5"><Clock3 size={13} /> Pedido recente · conteúdo privado</p>
              {request.minha_intercessao_status === 'concluida' ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--success)]"><Check size={17} /> Você orou por esta intenção</p> : request.minha_intercessao_status === 'assumida' ? <div className="mt-4 space-y-3">{request.acompanhamento !== 'somente_oracao' && <textarea value={messages[request.id] || ''} onChange={event => setMessages(current => ({ ...current, [request.id]: event.target.value }))} maxLength={500} rows={2} placeholder="Uma palavra breve de acolhimento (opcional)" className="input-theme w-full resize-y rounded-xl border p-3 text-sm" />}<Button onClick={() => complete(request)} disabled={workingId === request.id} className="w-full"><Check size={17} /> Orei por você</Button></div> : <Button onClick={() => embrace(request)} disabled={workingId === request.id} variant="secondary" className="mt-4 w-full"><Heart size={17} /> Vou orar por você</Button>}
            </Card>
          ))}
        </div>
      ) : tab === 'agora' ? (
        <div className="space-y-4">
          <Card variant="highlighted" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">Presença</p>
            <h2 className="mt-1 font-display text-xl font-semibold txt-primary">Disponível para orar</h2>
            {myAvailability ? <div className="mt-3"><p className="text-sm txt-secondary">Você está disponível até <strong className="txt-primary">{new Date(myAvailability.disponivel_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>.</p><p className="mt-1 text-operational">Modos: {myAvailability.modalidades.join(', ')}</p><Button onClick={stopAvailability} disabled={workingId === 'availability'} variant="ghost" className="mt-4 w-full">Encerrar disponibilidade</Button></div> : <div className="mt-4 space-y-4"><fieldset><legend className="text-operational font-semibold">Por quanto tempo?</legend><div className="mt-2 grid grid-cols-3 gap-2">{([15, 30, 60] as const).map(value => <button key={value} type="button" onClick={() => setAvailabilityMinutes(value)} className={`sanctuary-choice border px-3 text-center text-sm font-semibold transition-premium ${availabilityMinutes === value ? 'sanctuary-choice--active' : 'border-[var(--border)] txt-secondary'}`}>{value} min</button>)}</div></fieldset><fieldset><legend className="text-operational font-semibold">Como você deseja orar?</legend><div className="mt-2 grid grid-cols-2 gap-2">{([{ value: 'silencio', label: 'Silêncio', Icon: QuietPrayerIcon }, { value: 'texto', label: 'Texto', Icon: PrayerTextIcon }, { value: 'voz', label: 'Voz', Icon: PrayerVoiceIcon }, { value: 'video', label: 'Vídeo', Icon: PrayerVideoIcon }] as const).map(option => <button key={option.value} type="button" onClick={() => toggleMode(option.value)} className={`sanctuary-choice flex items-center justify-center gap-2 border px-3 text-center text-sm font-semibold transition-premium ${availabilityModes.includes(option.value) ? 'sanctuary-choice--active' : 'border-[var(--border)] txt-secondary'}`}><option.Icon size={22} /> {option.label}</button>)}</div></fieldset><Button onClick={activateAvailability} disabled={workingId === 'availability'} className="w-full"><PrayerPresenceIcon size={20} /> Ficar disponível</Button></div>}
          </Card>
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">Comunidade agora</p>
                <h2 className="mt-1 font-display text-xl font-semibold txt-primary">Pessoas disponíveis</h2>
              </div>
              <div className="flex items-center gap-2 pb-0.5 text-operational font-semibold">
                <span className="size-2 rounded-full bg-[var(--success)] shadow-[0_0_0_3px_var(--accent-soft)]" />
                {availablePeople.length} {availablePeople.length === 1 ? 'pessoa' : 'pessoas'}
              </div>
            </div>
            {availablePeople.length === 0 ? (
              <div className="card-surface px-6 py-7 text-center">
                <p className="text-sm font-semibold txt-secondary">Ninguém está disponível neste momento.</p>
                <p className="mt-1 text-operational">Você ainda pode deixar um pedido reservado.</p>
              </div>
            ) : (
              <div className="space-y-3">{availablePeople.map(person => <Card key={person.usuario_id} className="p-4"><div className="flex items-center gap-3"><div className="relative shrink-0"><div className="grid size-11 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)]">{person.foto_url ? <img src={person.foto_url} alt="" className="size-full object-cover" /> : <span className="font-bold txt-primary">{person.nome[0]}</span>}</div>{person.brasao_institucional && <span className="absolute -bottom-1.5 -right-2"><InstitutionalCrest kind={person.brasao_institucional} size={22} /></span>}</div><div className="min-w-0 flex-1"><h3 className="font-semibold txt-primary">{person.nome}</h3><p className="text-operational">Disponível para {person.modalidades.join(', ')}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{person.modalidades.map(mode => <Button key={mode} variant="secondary" className="!min-h-11 flex-1 text-xs" disabled={workingId === person.usuario_id} onClick={() => inviteAvailablePerson(person, mode)}>{mode === 'silencio' ? 'Silêncio' : mode === 'texto' ? 'Texto' : mode === 'voz' ? 'Voz' : 'Vídeo'}</Button>)}</div></Card>)}</div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          {mine.length === 0 ? <Card className="p-8 text-center"><History className="mx-auto txt-muted" /><h2 className="mt-3 font-display text-lg txt-primary">Você ainda não fez um pedido</h2><Button onClick={() => { setShowForm(true); changeTab('inicio'); }} className="mt-4">Preciso de oração</Button></Card> : mine.map(request => (
            <Card key={request.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--accent-primary)]">{CATEGORY_LABELS[request.categoria]}</p><h2 className="mt-1 font-display text-lg txt-primary">{request.total_confirmacoes > 0 ? 'Orando por você!' : request.total_intercessores > 0 ? 'Seu pedido foi acolhido' : 'Aguardando acolhimento'}</h2></div><span className="text-[11px] font-semibold uppercase txt-muted">{request.status}</span></div>
              {request.intencao && <p className="mt-3 line-clamp-3 text-sm txt-secondary">{request.intencao}</p>}
              <div className="mt-4 rounded-xl bg-[var(--accent-soft)] p-3 text-sm txt-secondary"><strong className="txt-primary">{request.total_intercessores}</strong> {request.total_intercessores === 1 ? 'pessoa acolheu' : 'pessoas acolheram'} · <strong className="txt-primary">{request.total_confirmacoes}</strong> {request.total_confirmacoes === 1 ? 'oração confirmada' : 'orações confirmadas'}</div>
              {request.ultima_mensagem && <blockquote className="mt-3 rounded-xl border border-[var(--care-border)] bg-[var(--surface-highlighted)] p-3 text-sm italic leading-relaxed txt-secondary">“{request.ultima_mensagem}”{request.ultimo_intercessor_nome && <footer className="mt-2 text-xs not-italic font-semibold txt-primary">— {request.ultimo_intercessor_nome}</footer>}</blockquote>}
              {(request.status === 'aberto' || request.status === 'acolhido') && <Button variant="ghost" className="mt-3 w-full" disabled={workingId === request.id} onClick={async () => { setWorkingId(request.id); try { await closePrayerRequest(request.id); await load(); } finally { setWorkingId(null); } }}>Encerrar pedido</Button>}
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="app-modal-layer fixed inset-0 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={() => workingId !== 'create' && setShowForm(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="novo-pedido-title" onMouseDown={event => event.stopPropagation()} className="glass-strong flex max-h-[calc(var(--app-viewport-height)-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--border)] sm:rounded-[1.75rem]">
            <header className="shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-5">
              <h2 id="novo-pedido-title" className="font-display text-2xl txt-primary">Preciso de oração</h2>
              <p className="mt-1 text-sm txt-tertiary">Você pode pedir sem explicar o motivo.</p>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
              <label className="block text-xs font-semibold txt-secondary">Assunto<select value={categoria} onChange={event => setCategoria(event.target.value as PrayerRequestCategory)} className="input-theme mt-1.5 min-h-12 w-full rounded-xl border px-3 text-sm">{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-xs font-semibold txt-secondary">Como podemos acolher você? <span className="font-normal txt-muted">(opcional)</span><textarea value={intencao} onChange={event => setIntencao(event.target.value)} maxLength={1200} rows={4} placeholder="Prefiro não explicar, mas gostaria de oração..." className="input-theme mt-1.5 w-full resize-y rounded-xl border p-3 text-sm" /></label>
              <label className="block text-xs font-semibold txt-secondary">Quem pode receber<select value={visibilidade} onChange={event => setVisibilidade(event.target.value as PrayerRequestVisibility)} className="input-theme mt-1.5 min-h-12 w-full rounded-xl border px-3 text-sm"><option value="intercessores">Pessoas que desejam interceder</option><option value="dupla">Somente minha dupla</option><option value="lideranca">Somente a liderança</option></select></label>
              <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold txt-primary">Quero me identificar</span>
                  <span className="mt-0.5 block text-operational">Se ativado, seu nome e sua foto aparecerão para quem receber o pedido.</span>
                </span>
                <input type="checkbox" checked={identificado} disabled={workingId === 'create'} onChange={event => setIdentificado(event.target.checked)} className="size-5 shrink-0 accent-[var(--accent-primary)]" />
              </label>
              <label className="block text-xs font-semibold txt-secondary">Acompanhamento<select value={acompanhamento} onChange={event => setAcompanhamento(event.target.value as PrayerRequestFollowUp)} className="input-theme mt-1.5 min-h-12 w-full rounded-xl border px-3 text-sm"><option value="somente_oracao">Somente receber confirmação de oração</option><option value="mensagem">Permitir uma mensagem de acolhimento</option><option value="conversa">Gostaria de conversar com alguém</option></select></label>
              <fieldset><legend className="text-operational font-semibold">Manter o pedido por</legend><div className="mt-2 grid grid-cols-3 gap-2">{([1, 3, 7] as const).map(value => <button key={value} type="button" onClick={() => setDias(value)} className={`sanctuary-choice border px-3 text-sm font-semibold transition-premium ${dias === value ? 'sanctuary-choice--active' : 'border-[var(--border)] txt-secondary'}`}>{value === 1 ? 'Hoje' : `${value} dias`}</button>)}</div></fieldset>
              <p className="text-operational flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><Shield size={15} className="shrink-0" /> Seu pedido não será publicado no Mural. Você poderá encerrá-lo quando desejar.</p>
            </div>
            <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-[max(1rem,var(--safe-area-bottom))] pt-4 shadow-[0_-12px_28px_color-mix(in_srgb,var(--canvas)_38%,transparent)]">
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)} disabled={workingId === 'create'} className="flex-1">Cancelar</Button>
                <Button onClick={submitRequest} disabled={workingId === 'create'} className="flex-1">{workingId === 'create' ? 'Enviando...' : 'Pedir oração'}</Button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
