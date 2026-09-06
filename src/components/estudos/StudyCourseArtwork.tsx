import { BookOpen, Sparkles } from 'lucide-react';
import type { StudyCourse } from '../../types/comunhaoEstudos';

interface StudyCourseArtworkProps {
  course: StudyCourse;
  variant?: 'card' | 'featured' | 'hero';
}

function artworkTone(slug: string) {
  const value = Array.from(slug).reduce((total, character) => total + character.charCodeAt(0), 0);
  return String((value % 3) + 1);
}

export default function StudyCourseArtwork({ course, variant = 'card' }: StudyCourseArtworkProps) {
  const isFeatured = variant === 'featured';
  const isBanner = variant === 'hero';
  const lightCover = isFeatured
    ? course.heroImage || course.bannerLight || course.coverLight || course.coverDark
    : isBanner
      ? course.bannerLight || course.bannerDark || course.coverLight || course.coverDark
      : course.coverLight || course.coverDark;
  const darkCover = isFeatured
    ? course.heroImage || course.bannerDark || course.coverDark || course.coverLight
    : isBanner
      ? course.bannerDark || course.bannerLight || course.coverDark || course.coverLight
      : course.coverDark || course.coverLight;
  const hasCustomCover = Boolean(lightCover || darkCover);
  const reference = course.modules[0]?.lessons[0]?.reference;

  return (
    <div className={`study-course-artwork study-course-artwork--${variant}`} data-artwork-tone={artworkTone(course.slug)} aria-label={`Capa do curso ${course.title}`}>
      {hasCustomCover ? (
        <>
          <img src={lightCover} alt="" aria-hidden="true" className="study-course-cover study-course-cover--light absolute inset-0 size-full object-cover" />
          <img src={darkCover} alt="" aria-hidden="true" className="study-course-cover study-course-cover--dark absolute inset-0 size-full object-cover" />
        </>
      ) : (
        <>
          <span className="study-course-artwork__halo study-course-artwork__halo--one" aria-hidden="true" />
          <span className="study-course-artwork__halo study-course-artwork__halo--two" aria-hidden="true" />
          <BookOpen className="study-course-artwork__watermark" aria-hidden="true" />
          <div className="study-course-artwork__content">
            <span className="study-course-artwork__eyebrow"><Sparkles size={13} /> Comunhão Estudos</span>
            <strong>{course.title}</strong>
            <span>{reference || course.subtitle}</span>
          </div>
        </>
      )}
    </div>
  );
}
