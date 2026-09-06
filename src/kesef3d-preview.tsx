import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import KesefCoin3D from './components/kesef/KesefCoin3D';
import './index.css';

export function KesefPreview() {
  const params = new URLSearchParams(window.location.search);
  const angled = params.get('angle') === 'side';
  const light = params.get('theme') === 'light';
  return (
    <main className={`grid min-h-screen place-items-center p-8 ${light ? 'bg-[#f3eddf] text-[#24301f]' : 'bg-[#07100c] text-[#f8efd8]'}`}>
      <section className={`relative grid w-full max-w-xl place-items-center overflow-hidden rounded-[2.5rem] border p-10 shadow-2xl ${light ? 'border-[#b58b40]/25 bg-[radial-gradient(circle_at_50%_38%,rgba(206,157,73,0.2),transparent_42%),linear-gradient(145deg,#fffdf7,#e9dfc9)]' : 'border-amber-300/15 bg-[radial-gradient(circle_at_50%_38%,rgba(178,126,57,0.19),transparent_42%),linear-gradient(145deg,#122019,#080d0a)]'}`}>
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:28px_28px]" />
        <p className="relative text-xs font-bold uppercase tracking-[0.24em] text-amber-200/70">Laboratório Kesef</p>
        <KesefCoin3D className="relative mt-3 size-[min(72vw,420px)]" initialRotationY={angled ? 0.82 : -0.28} />
        <h1 className="relative mt-2 font-display text-3xl">Kesef tridimensional</h1>
        <p className={`relative mt-2 max-w-sm text-center text-sm leading-relaxed ${light ? 'text-[#44513f]/75' : 'text-white/55'}`}>Mova o ponteiro sobre a moeda para inspecionar o aro, a espessura e o relevo metálico.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><KesefPreview /></StrictMode>,
);
