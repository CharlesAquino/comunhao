import { Check } from 'lucide-react';
import { PROFILE_COVERS, type ProfileCoverId } from '../../services/profileCovers';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileCoverPickerProps {
  value: ProfileCoverId;
  onChange: (value: ProfileCoverId) => void;
}

export default function ProfileCoverPicker({ value, onChange }: ProfileCoverPickerProps) {
  const { theme } = useTheme();

  return (
    <fieldset className="text-left">
      <legend className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Expressão de serviço</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Capa do perfil">
        {PROFILE_COVERS.map(option => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={`profile-cover-option relative min-h-20 overflow-hidden rounded-xl border text-left ${selected ? 'profile-cover-option--selected' : ''}`}
            >
              {option.imageUrl ? (
                <img
                  src={theme === 'light' ? option.lightImageUrl ?? option.imageUrl : option.imageUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 bg-[var(--surface-elevated)]" />
              )}
              <span className="profile-cover-option__overlay absolute inset-0" />
              <span className="relative z-10 flex min-h-20 items-end justify-between gap-2 p-2.5">
                <span>
                  <span className="profile-cover-option__label block text-xs font-semibold">{option.label}</span>
                  <span className="profile-cover-option__description mt-0.5 block text-[9px] leading-tight">{option.description}</span>
                </span>
                {selected && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)]"><Check size={13} /></span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">A capa expressa como você serve. Ela não altera patente ou permissões.</p>
    </fieldset>
  );
}
