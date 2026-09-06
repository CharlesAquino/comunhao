import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  color: string;
}

interface PrayerAscentEffectProps {
  active: boolean;
  onComplete?: () => void;
}

const SPARK_COLORS = ['#e0a953', '#f06d76', '#ffd782', '#78ad88', '#ff8b94'];

export default function PrayerAscentEffect({ active, onComplete }: PrayerAscentEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Gerar 7 fagulhas com dispersão suave ascendente
    const items: Particle[] = Array.from({ length: 7 }).map((_, index) => ({
      id: Date.now() + index,
      tx: (Math.random() - 0.5) * 48,
      ty: -(26 + Math.random() * 32),
      size: 4 + Math.random() * 4,
      delay: Math.random() * 90,
      color: SPARK_COLORS[index % SPARK_COLORS.length],
    }));

    setParticles(items);

    const timer = window.setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 750);

    return () => window.clearTimeout(timer);
  }, [active, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      aria-hidden="true"
    >
      {particles.map(particle => (
        <span
          key={particle.id}
          className="prayer-ascent-particle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_8px_currentColor]"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            color: particle.color,
            animationDelay: `${particle.delay}ms`,
            ['--spark-tx' as string]: `${particle.tx}px`,
            ['--spark-ty' as string]: `${particle.ty}px`,
          }}
        />
      ))}
    </div>
  );
}
