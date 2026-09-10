import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { getHomeStudyResume, type StudyResume } from '../../services/studyResumeService';
import studiesBible from '../../assets/home-v12/studies-bible-clean-v1.png';

export default function HomeStudiesCard() {
  const { theme } = useTheme();
  const [resume, setResume] = useState<StudyResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedCover, setFailedCover] = useState<string>();

  useEffect(() => {
    let active = true;
    getHomeStudyResume()
      .then(value => { if (active) setResume(value); })
      .catch(() => { if (active) setResume(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const course = resume?.course;
  const cover = course && (theme === 'dark'
    ? course.coverDark || course.coverLight || course.bannerDark || course.heroImage
    : course.coverLight || course.coverDark || course.bannerLight || course.heroImage);

  return (
    <Link
      to={resume?.path ?? '/estudos'}
      className="home-v12-study-card home-v12-studies"
      aria-label={course ? `Estudos bíblicos: retomar ${course.title}` : 'Explorar estudos bíblicos'}
    >
      <span className="home-v12-studies__library">
        <img className="home-v12-study-card__art" src={studiesBible} alt="" loading="lazy" decoding="async" />
        <span className="home-v12-study-card__copy">
          <BookOpen size={22} aria-hidden="true" />
          <h2>EBD</h2>
          <span className="home-v12-round-action" aria-hidden="true"><ArrowRight size={17} /></span>
        </span>
      </span>
      <span className="home-v12-studies__resume">
        <span className="home-v12-studies__details">
          <small>{loading ? 'Seus estudos' : course ? 'Continuar' : 'Sua jornada na Palavra'}</small>
          <strong>{resume?.lesson?.title ?? course?.title ?? 'Conheça os estudos bíblicos'}</strong>
          {course ? (
            <span className="home-v12-mini-progress" aria-label={`${Math.round(course.progress)}% concluído`}>
              <span><i style={{ width: `${Math.max(0, Math.min(100, course.progress))}%` }} /></span>
              <strong>{Math.round(course.progress)}%</strong>
            </span>
          ) : <span className="home-v12-studies__explore">Explorar <ArrowRight size={14} aria-hidden="true" /></span>}
        </span>
        {course && <span className="home-v12-studies__cover" aria-hidden="true">
          <BookOpen size={28} />
          {cover && cover !== failedCover && <img key={cover} src={cover} alt="" loading="lazy" decoding="async" onError={() => setFailedCover(cover)} />}
        </span>}
      </span>
    </Link>
  );
}
