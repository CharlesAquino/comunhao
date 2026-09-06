export default function ProgressBar({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span>{normalized}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
        <div className="h-full rounded-full bg-[var(--accent-primary)] transition-premium" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
