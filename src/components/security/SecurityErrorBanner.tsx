type SecurityErrorBannerProps = {
  message: string;
  correlationId?: string | null;
  onDismiss?: () => void;
};

export function SecurityErrorBanner({
  message,
  correlationId,
  onDismiss,
}: SecurityErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground"
    >
      <p>{message}</p>
      {correlationId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Referência: <code>{correlationId}</code>
        </p>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="mt-3 underline underline-offset-4"
          onClick={onDismiss}
        >
          Fechar
        </button>
      ) : null}
    </div>
  );
}
