import { ArrowRight, Flame } from 'lucide-react';
import prayerHeroAmanhecer from '../../assets/prayer-room-hero-amanhecer-v2.png';
import prayerHeroSantuario from '../../assets/prayer-room-hero-santuario-v2.png';

interface Props { sessoesAbertasCount: number; mocidadeOnlineCount: number; onEntrar: () => void }
export default function LivePrayerRoomCard({ sessoesAbertasCount, mocidadeOnlineCount, onEntrar }: Props) {
  const textoPresenca = sessoesAbertasCount > 0 ? `${sessoesAbertasCount} sala(s) compartilhada(s) aberta(s) agora` : mocidadeOnlineCount > 0 ? `${mocidadeOnlineCount} jovens em comunhão agora` : 'Um altar aberto para intercessão espontânea';
  return <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-xl card-enter group" aria-labelledby="live-prayer-title">
    <h3 id="live-prayer-title" className="sr-only">Sala de Oração</h3>
    <img src={prayerHeroAmanhecer} alt="" aria-hidden="true" className="block dark:hidden w-full aspect-[2/1] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
    <img src={prayerHeroSantuario} alt="" aria-hidden="true" className="hidden dark:block w-full aspect-[2/1] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
    <div className="absolute top-3 right-3 z-10"><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-black/60 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm"><span className="size-2 rounded-full bg-emerald-400 animate-ping" />Ao Vivo</span></div>
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-4 py-3 sm:px-6 sm:py-4"><div className="flex items-center gap-2 text-[#e9e1d4] min-w-0"><Flame size={16} className="text-[#f0c868] shrink-0" /><span className="text-xs sm:text-sm font-medium truncate drop-shadow">{textoPresenca}</span></div><button type="button" onClick={onEntrar} className="group/btn shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#f5e5be]/40 bg-[#fbf7ed]/20 px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold text-white backdrop-blur-md shadow-md transition-all hover:bg-[#fbf7ed]/30 hover:border-[#f5e5be] active:scale-95"><span>Entrar na Sala</span><ArrowRight size={13} className="text-[#f0c868] group-hover/btn:translate-x-0.5 transition-transform" /></button></div>
  </section>;
}
