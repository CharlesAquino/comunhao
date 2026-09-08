import { BookOpen } from 'lucide-react';
import HomeEditorialAction from './HomeEditorialAction';
import type { EbdEditorialLesson, EbdWeekday } from '../../types/ebdEditorial';

interface Props {
  editorialLesson: EbdEditorialLesson | null;
  onAbrir: () => void;
}

const WEEKDAYS: EbdWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function getAvailableDay(editorialLesson: EbdEditorialLesson | null, now: Date) {
  if (!editorialLesson) return null;

  const day = editorialLesson.document.days.find(
    item => item.day === WEEKDAYS[now.getDay()],
  );
  if (!day || day.blocks.length === 0) return null;

  if (editorialLesson.document.releaseMode === 'immediate') {
    return day;
  }

  const releaseAt = Date.parse(day.unlocksAt);
  return Number.isFinite(releaseAt) && releaseAt <= now.getTime() ? day : null;
}

export default function DailyEbdCard({ editorialLesson, onAbrir }: Props) {
  const availableDay = getAvailableDay(editorialLesson, new Date());
  const title =
    availableDay?.title.trim()
    || editorialLesson?.title?.trim()
    || 'Um encontro com a Palavra';
  const minutes = availableDay?.estimatedMinutes;
  const contextLabel = availableDay
    ? `EBD · ${availableDay.label}`
    : editorialLesson
      ? 'EBD · Lição da semana'
      : 'EBD';

  return (
    <section className="home-ebd" aria-labelledby="home-ebd-title">
      <div className="home-formation__copy">
        <p className="home-formation__eyebrow">Palavra para hoje</p>
        <p className="home-ebd__day">{contextLabel}</p>
        <h2 id="home-ebd-title">{title}</h2>
        <p className="home-ebd__duration">
          <BookOpen size={20} aria-hidden="true" />
          {minutes && minutes > 0 ? `${minutes} min de leitura` : 'Escola Bíblica Digital'}
        </p>

        <HomeEditorialAction
          icon={<BookOpen size={18} />}
          label="Abrir EBD"
          onClick={onAbrir}
          aria-label={`Abrir EBD: ${title}`}
        />
      </div>
    </section>
  );
}
