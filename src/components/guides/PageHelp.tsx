import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getPageGuide } from '../../guides/pageGuides';
import GuideModal from './GuideModal';

export default function PageHelp() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const guide = getPageGuide(location.pathname);

  return (
    <section className="page-help-access mx-auto mt-7 w-full max-w-2xl px-1 pb-3 text-center" data-page-help-mounted="true">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold txt-tertiary underline decoration-[var(--border)] underline-offset-4 hover:txt-primary">
        <CircleHelp size={17} /> Como usar esta tela
      </button>
      {open && <GuideModal title="Ajuda desta página" steps={[guide]} currentStep={0} onStepChange={() => undefined} onClose={() => setOpen(false)} onComplete={() => setOpen(false)} allowSkip={false} />}
    </section>
  );
}
