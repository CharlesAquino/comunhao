import type { ReactNode } from 'react';
import '../../styles/home-journey.css';

interface Props {
  mission?: ReactNode;
  children: ReactNode;
}

/** Uma única arte temática acompanha a missão, a formação e a comunidade. */
export default function HomeJourneySurface({ mission, children }: Props) {
  return (
    <div className="home-journey">
      {mission && <div className="home-journey__mission">{mission}</div>}
      <div className="home-journey__body">{children}</div>
    </div>
  );
}
