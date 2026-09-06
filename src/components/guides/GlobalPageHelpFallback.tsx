import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getPageGuide } from '../../guides/pageGuides';
import GuideModal from './GuideModal';

export default function GlobalPageHelpFallback() {
  const location = useLocation();
  const [needed, setNeeded] = useState(false);
  const [open, setOpen] = useState(false);
  const guide = getPageGuide(location.pathname);

  useEffect(() => {
    setOpen(false);
    const frame = window.requestAnimationFrame(() => {
      setNeeded(!document.querySelector('[data-page-help-mounted="true"]'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  if (!needed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="global-page-help fixed right-[calc(1rem+var(--safe-area-right))] z-[120] flex size-12 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--surface)] txt-green shadow-2xl"
        aria-label="Como usar esta tela"
      >
        <CircleHelp size={21} />
      </button>
      {open && (
        <GuideModal
          title="Ajuda desta página"
          steps={[guide]}
          currentStep={0}
          onStepChange={() => undefined}
          onClose={() => setOpen(false)}
          onComplete={() => setOpen(false)}
          allowSkip={false}
        />
      )}
    </>
  );
}
