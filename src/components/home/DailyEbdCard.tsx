import { ArrowRight, BookOpen } from 'lucide-react';
import type { EbdEditorialLesson, EbdWeekday } from '../../types/ebdEditorial';

interface Props { editorialLesson: EbdEditorialLesson | null; onAbrir: () => void }
const WEEKDAYS: EbdWeekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function DailyEbdCard({ editorialLesson, onAbrir }: Props) {
  const day = editorialLesson?.document.days.find(item => item.day === WEEKDAYS[new Date().getDay()]);
  const release = day?.unlocksAt ? Date.parse(day.unlocksAt) : NaN;
  const availableDay = day && day.blocks.length > 0 && Number.isFinite(release) && release <= Date.now() ? day : null;
  const title = availableDay?.title.trim() || editorialLesson?.title || 'Um encontro com a Palavra';
  const minutes = availableDay?.estimatedMinutes;
  return (
    <section className="home-ebd" aria-labelledby="home-ebd-title">
      <div className="home-formation__copy">
        <p className="home-formation__eyebrow">Palavra para hoje</p>
        <p className="home-ebd__day">EBD{availableDay ? ` · ${availableDay.label}` : editorialLesson ? ' · Lição da semana' : ''}</p>
        <h2 id="home-ebd-title">{title}</h2>
        <p className="home-ebd__duration"><BookOpen size={20} aria-hidden="true" />{minutes && minutes > 0 ? `${minutes} min de leitura` : 'Escola Bíblica Digital'}</p>
        <button type="button" className="home-formation__link" onClick={onAbrir}>Abrir EBD <ArrowRight size={21} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
