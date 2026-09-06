import { getProfileCover } from '../../services/profileCovers';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileCoverBackgroundProps {
  coverId?: string | null;
  preserveComposition?: boolean;
}

export default function ProfileCoverBackground({ coverId, preserveComposition = false }: ProfileCoverBackgroundProps) {
  const cover = getProfileCover(coverId);
  const { theme } = useTheme();

  if (!cover.imageUrl) {
    return <div className="profile-cover__background pointer-events-none absolute inset-0 bg-[var(--cover-gradient)] opacity-70" />;
  }

  const imageUrl = theme === 'light' ? cover.lightImageUrl ?? cover.imageUrl : cover.imageUrl;

  return (
    <div className={`profile-cover__background pointer-events-none absolute inset-0 ${preserveComposition ? 'profile-cover__background--preserve' : ''}`} aria-hidden="true">
      <img
        src={imageUrl}
        alt=""
        className={preserveComposition ? 'profile-cover__art' : 'size-full object-cover'}
      />
      <div className="profile-cover__overlay absolute inset-0" />
    </div>
  );
}
