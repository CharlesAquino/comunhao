import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Flame, Gift, UserPlus, Trophy, RotateCcw, Copy, Check, ScanLine, QrCode, Keyboard, Nfc, ArrowLeft } from 'lucide-react';
import { getSaldoKesef, getHistoricoKesef, subscribeToKesefChanges } from '../services/kesefService';
import { obterProgramaIndicacao } from '../services/dataService';
import { getUserId } from '../services/authService';
import type { KesefTransacao } from '../services/kesefService';
import Button from '../components/ui/Button';
import SealIcon from '../components/ui/SealIcon';
import AppBrandMark from '../components/ui/AppBrandMark';
import { confirmImmediateCantinaRedemption, previewImmediateCantinaRedemption } from '../services/cantinaService';
import type { CantinaImmediateRedemptionPreview } from '../types/cantina';
import CantinaQrScanner from '../components/cantina/CantinaQrScanner';
import InstitutionalAction from '../components/ui/InstitutionalAction';
import { readScreenCache, SCREEN_CACHE_KEYS, writeScreenCache } from '../services/screenCache';
import KesefCoin3D from '../components/kesef/KesefCoin3D';

const WALLET_CACHE_AGE = 5 * 60 * 1000;
interface WalletScreenCache { balance: number; history: KesefTransacao[] }

const ICONE_POR_TIPO: Record<string, typeof BookOpen> = {
  oracao: Flame,
  licao: BookOpen,
  quiz_acerto: BookOpen,
  streak_bonus_7: Flame,
  streak_bonus_30: Flame,
  indicacao: UserPlus,
  resgate: Gift,
  estorno: RotateCcw,
};

const LABEL_POR_TIPO: Record<string, string> = {
  oracao: 'Oração confirmada',
  licao: 'Lição concluída',
  quiz_acerto: 'Acerto no quiz',
  streak_bonus_7: 'Sequência de 7 dias',
  streak_bonus_30: 'Sequência de 30 dias',
  indicacao: 'Indicação de membro',
  resgate: 'Resgate na lojinha',
  estorno: 'Estorno',
};

function formatarData(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const mesmoDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (mesmoDay(data, hoje)) return 'Hoje';
  if (mesmoDay(data, ontem)) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Carteira() {
  const [cachedWallet] = useState(() => readScreenCache<WalletScreenCache>(SCREEN_CACHE_KEYS.WALLET, WALLET_CACHE_AGE));
  const [saldo, setSaldo] = useState<number>(() => cachedWallet?.balance ?? 0);
  const [historico, setHistorico] = useState<KesefTransacao[]>(() => cachedWallet?.history ?? []);
  const [loading, setLoading] = useState(() => cachedWallet === null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [codigoIndicacao, setCodigoIndicacao] = useState<string | null>(null);
  const [bonusIndicacao, setBonusIndicacao] = useState(5);
  const [copiado, setCopiado] = useState(false);
  const [codigoResgate, setCodigoResgate] = useState('');
  const [resgate, setResgate] = useState<CantinaImmediateRedemptionPreview | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroResgate, setErroResgate] = useState('');
  const [resgateAberto, setResgateAberto] = useState(false);
  const [metodoResgate, setMetodoResgate] = useState<'menu' | 'qr' | 'codigo' | 'nfc'>('menu');
  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const localizarResgate = async () => {
    setProcessando(true); setErroResgate('');
    try { setResgate(await previewImmediateCantinaRedemption(codigoResgate)); }
    catch { setErroResgate('Código inválido ou expirado.'); }
    finally { setProcessando(false); }
  };

  const localizarCodigoLido = (code: string) => { setCodigoResgate(code); setMetodoResgate('codigo'); setTimeout(() => { void (async () => { setProcessando(true); setErroResgate(''); try { setResgate(await previewImmediateCantinaRedemption(code)); } catch { setErroResgate('QR Code inválido ou expirado.'); } finally { setProcessando(false); } })(); }, 0); };

  const confirmarResgate = async () => {
    if (!resgate) return;
    setProcessando(true); setErroResgate('');
    try { await confirmImmediateCantinaRedemption(resgate.id, resgate.codigo); setResgate(null); setResgateAberto(false); setCodigoResgate(''); await carregar(); }
    catch (error) { setErroResgate(error instanceof Error && error.message.includes('SALDO_INSUFICIENTE') ? 'Saldo Kesef insuficiente.' : 'Não foi possível confirmar o resgate.'); }
    finally { setProcessando(false); }
  };

  const carregar = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getSaldoKesef(), getHistoricoKesef()]);
      setSaldo(s);
      setHistorico(h);
      writeScreenCache(SCREEN_CACHE_KEYS.WALLET, { balance: s, history: h });
    } catch (error) {
      console.error('Erro ao carregar carteira:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarCodigo = useCallback(async () => {
    try {
      const programa = await obterProgramaIndicacao();
      setCodigoIndicacao(programa.codigo);
      setBonusIndicacao(programa.bonus);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarCodigo();
    getUserId().then(setUsuarioId).catch(() => setUsuarioId(null));
  }, [carregar, carregarCodigo]);

  useEffect(() => {
    if (!usuarioId) return;
    const unsubscribe = subscribeToKesefChanges(usuarioId, carregar);
    return unsubscribe;
  }, [usuarioId, carregar]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent txt-tertiary">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Autenticando relíquia...</p>
      </div>
    );
  }

  return (
    <div className="p-6 relative z-10 space-y-6">
      <header className="flex items-center gap-3">
        <AppBrandMark />
        <div>
          <h1 className="font-display text-2xl font-semibold txt-primary">Carteira</h1>
          <p className="mt-0.5 text-sm txt-tertiary">Seu registro de fidelidade em Kesef</p>
        </div>
      </header>

      {/* Case holográfico da moeda */}
      <section className="glass rounded-[2rem] p-8 shadow-2xl relative overflow-hidden card-enter flex flex-col items-center">
        <div className="glass-shine"></div>

        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(74,124,106,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(74,124,106,0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-[#4a7c6a]/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative size-48 max-w-[74vw] mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-400/20" />

          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full animate-[spin_6s_linear_infinite]">
            <circle cx="80" cy="80" r="76" fill="none" stroke="rgba(74,124,106,0.55)" strokeWidth="2" strokeDasharray="12 220" strokeLinecap="round" />
            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(74,124,106,0.25)" strokeWidth="1" strokeDasharray="2 6" />
          </svg>

          <KesefCoin3D className="size-full drop-shadow-[0_18px_26px_rgba(35,21,11,0.45)]" />
        </div>

        <div className="flex items-baseline gap-2 relative z-10">
          <span className="numero-destaque text-4xl txt-primary" style={{ textShadow: '0 0 20px var(--glow-green)' }}>
            {saldo}
          </span>
          <span className="text-xs txt-tertiary uppercase tracking-[0.15em] font-bold">Kesef</span>
        </div>
        <p className="text-[11px] txt-muted mt-1 font-serif" dir="rtl">כֶּסֶף</p>

        {codigoIndicacao && (
          <div className="relative z-10 mt-5 w-full">
            <p className="text-[10px] font-bold txt-tertiary uppercase tracking-[0.15em] text-center mb-2">Seu código de indicação</p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(codigoIndicacao);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              variant="secondary"
              className="w-full"
            >
              <span className="text-lg font-bold tracking-[0.2em] txt-primary" style={{ fontFamily: 'ui-monospace, monospace' }}>{codigoIndicacao}</span>
              {copiado ? <Check size={16} className="txt-green shrink-0" /> : <Copy size={16} className="txt-tertiary shrink-0" />}
            </Button>
            <p className="text-[10px] txt-muted text-center mt-1.5">Compartilhe e ganhe +{bonusIndicacao} Kesef por novo membro validado!</p>
          </div>
        )}
      </section>

      <InstitutionalAction icon={<ScanLine size={19} />} onClick={() => { setResgateAberto(true); setMetodoResgate('menu'); setErroResgate(''); }}>Resgatar com Kesef</InstitutionalAction>

      {/* Histórico */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold txt-tertiary uppercase tracking-[0.15em] flex items-center gap-2">
          <SealIcon Icon={Trophy} size="sm" className="txt-amber" /> Histórico de atividade
        </h3>

        {historico.length === 0 ? (
          <div className="text-center py-12 txt-muted">
            <p className="text-sm font-medium">Nenhuma atividade ainda.</p>
            <p className="text-xs txt-muted mt-1">Ore, estude e acompanhe seu saldo crescer.</p>
          </div>
        ) : (
          historico.map((t) => {
            const Icone = ICONE_POR_TIPO[t.tipo] ?? Gift;
            const positivo = t.quantidade > 0;
            return (
              <div key={t.id} className="glass rounded-2xl p-4 flex items-center justify-between relative overflow-hidden card-enter">
                <div className="glass-shine" />
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-xl ${positivo ? 'bg-green-subtle txt-green' : 'bg-rose-500/10 txt-rose'}`}>
                    <Icone size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold txt-primary">{LABEL_POR_TIPO[t.tipo] ?? t.tipo}</p>
                    <p className="text-[11px] txt-muted">{formatarData(t.criado_em)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${positivo ? 'txt-green' : 'txt-rose'}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {positivo ? '+' : ''}{t.quantidade}
                </span>
              </div>
            );
          })
        )}
      </section>

      {resgate && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setResgate(null)}><div className="glass-strong w-full max-w-sm space-y-4 rounded-2xl p-5" onClick={event => event.stopPropagation()}><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--celebration)]">Confirme na Carteira</p><h2 className="mt-1 font-display text-2xl txt-primary">{resgate.evento}</h2></div><div className="space-y-2 rounded-xl border border-[var(--border)] p-3">{resgate.itens.map((item,index) => <div key={`${item.nome}-${index}`} className="flex justify-between gap-3 text-sm"><span className="txt-secondary">{item.quantidade}× {item.nome}</span><strong className="txt-primary">{item.subtotal_kesef} K</strong></div>)}</div><div className="rounded-xl bg-[var(--celebration-soft)] p-3"><div className="flex justify-between"><span className="txt-secondary">Total</span><strong className="text-[var(--celebration)]">{resgate.total_kesef} K</strong></div><div className="mt-1 flex justify-between text-xs"><span className="txt-muted">Saldo após confirmar</span><strong className="txt-primary">{resgate.saldo - resgate.total_kesef} K</strong></div></div><p className="text-xs txt-muted">A confirmação autoriza o uso do Kesef e libera os itens no caixa.</p><div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setResgate(null)}>Cancelar</Button><Button className="flex-1" onClick={confirmarResgate} disabled={processando || resgate.saldo < resgate.total_kesef}>{resgate.saldo < resgate.total_kesef ? 'Saldo insuficiente' : processando ? 'Confirmando…' : 'Confirmar resgate'}</Button></div></div></div>}
      {resgateAberto && !resgate && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setResgateAberto(false)}><div className="glass-strong w-full max-w-sm space-y-4 rounded-2xl p-5" onClick={event => event.stopPropagation()}><div className="flex items-start gap-3">{metodoResgate !== 'menu' && <button onClick={() => { setMetodoResgate('menu'); setErroResgate(''); }} className="button-quiet grid size-10 shrink-0 place-items-center rounded-xl"><ArrowLeft size={18} /></button>}<div><p className="text-[10px] font-bold uppercase tracking-[0.15em] txt-green">Carteira Kesef</p><h2 className="mt-1 font-display text-2xl txt-primary">{metodoResgate === 'menu' ? 'Como deseja resgatar?' : metodoResgate === 'qr' ? 'Ler QR Code' : metodoResgate === 'nfc' ? 'Usar NFC' : 'Resgatar com código'}</h2></div></div>{metodoResgate === 'menu' && <div className="space-y-2"><button onClick={() => setMetodoResgate('qr')} className="button-quiet flex min-h-16 w-full items-center gap-4 rounded-2xl border border-[var(--border)] px-4 text-left"><QrCode className="txt-green" /><span><strong className="block txt-primary">Ler QR Code</strong><small className="txt-muted">Use a câmera do aparelho</small></span></button><button onClick={() => setMetodoResgate('codigo')} className="button-quiet flex min-h-16 w-full items-center gap-4 rounded-2xl border border-[var(--border)] px-4 text-left"><Keyboard className="text-[var(--celebration)]" /><span><strong className="block txt-primary">Resgatar com código</strong><small className="txt-muted">Digite os seis caracteres</small></span></button><button disabled={!nfcSupported} onClick={() => setMetodoResgate('nfc')} className="button-quiet flex min-h-16 w-full items-center gap-4 rounded-2xl border border-[var(--border)] px-4 text-left disabled:opacity-45"><Nfc className="text-sky-500" /><span><strong className="block txt-primary">Usar NFC</strong><small className="txt-muted">{nfcSupported ? 'Aproximar de uma etiqueta compatível' : 'Indisponível neste aparelho'}</small></span></button></div>}{metodoResgate === 'qr' && <CantinaQrScanner onCode={localizarCodigoLido} onClose={() => setMetodoResgate('menu')} />}{metodoResgate === 'codigo' && <div><div className="flex gap-2"><input autoFocus value={codigoResgate} onChange={event => setCodigoResgate(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6))} className="input-theme min-h-12 min-w-0 flex-1 rounded-xl px-3 text-center font-mono text-lg tracking-[0.18em]" placeholder="CÓDIGO" /><Button onClick={localizarResgate} disabled={processando || codigoResgate.length < 6}>{processando ? 'Buscando…' : 'Continuar'}</Button></div>{erroResgate && <p className="mt-2 text-xs text-rose-400">{erroResgate}</p>}</div>}{metodoResgate === 'nfc' && <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-6 text-center"><Nfc size={42} className="mx-auto text-sky-500" /><p className="mt-3 text-sm font-semibold txt-primary">Aproxime de uma etiqueta NFC da Cantina</p><p className="mt-2 text-xs txt-tertiary">A aproximação entre dois celulares não é suportada pelo navegador. Use QR ou código quando não houver etiqueta.</p></div>}<Button variant="ghost" className="w-full" onClick={() => setResgateAberto(false)}>Fechar</Button></div></div>}
    </div>
  );
}
