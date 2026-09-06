import { useRef, useState, type ReactNode } from 'react';
import { Camera } from 'lucide-react';
import Button from './ui/Button';

interface AvatarPickerProps {
  onFileSelect: (file: File | null) => void;
  initialPreview?: string | null;
  disabled?: boolean;
  label?: string;
  avatarAccessory?: ReactNode;
  size?: 'default' | 'large';
}

export default function AvatarPicker({
  onFileSelect,
  initialPreview = null,
  disabled = false,
  label = 'Foto de perfil (opcional)',
  avatarAccessory,
  size = 'default',
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      onFileSelect(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="relative w-fit">
        <button
          type="button"
          onClick={handleClick}
          aria-label={preview ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
          disabled={disabled}
          className={`sanctuary-control group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] border-[var(--surface-elevated)] bg-[var(--surface-elevated)] shadow-[0_0_0_1px_var(--border)] transition-premium hover:shadow-[0_0_0_2px_var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-wait disabled:opacity-60 ${size === 'large' ? 'h-32 w-32' : 'h-28 w-28'}`}
        >
          {preview ? (
            <img src={preview} alt="Prévia da foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
              <Camera size={26} />
              <span className="text-xs font-semibold">Adicionar</span>
            </div>
          )}
        </button>
        {avatarAccessory && (
          <span className="absolute -bottom-2 -left-3 z-10 grid place-items-center drop-shadow-[0_4px_7px_rgba(0,0,0,0.55)]">
            {avatarAccessory}
          </span>
        )}
      </div>
      <Button
        onClick={handleClick}
        disabled={disabled}
        variant="ghost"
        className="text-[var(--accent-primary)]"
      >
        {preview ? 'Alterar foto do perfil' : 'Adicionar foto do perfil'}
      </Button>
      <span className="max-w-64 text-center text-xs text-[var(--text-muted)]">{label}</span>
    </div>
  );
}
