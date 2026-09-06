import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, X, type LucideIcon } from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

export interface GuideStep {
  title: string;
  description: string;
  bullets?: string[];
  tip?: string;
  Icon: LucideIcon;
}

interface GuideModalProps {
  title: string;
  steps: GuideStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onComplete: () => void;
  allowSkip?: boolean;
}

export default function GuideModal({ title, steps, currentStep, onStepChange, onClose, onComplete, allowSkip = true }: GuideModalProps) {
  const step = steps[currentStep];
  const StepIcon = step.Icon;
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    const handleBack = (event: Event) => {
      event.preventDefault();
      if (currentStep > 0) onStepChange(currentStep - 1);
      else onClose();
    };
    window.addEventListener('comunhao:back-request', handleBack);
    return () => window.removeEventListener('comunhao:back-request', handleBack);
  }, [currentStep, onClose, onStepChange]);

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/70 px-3 pt-[var(--safe-area-top)] backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <section className="guide-sheet w-full max-w-lg rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] txt-green">{title}</p>
            <p className="mt-1 text-xs txt-muted">Etapa {currentStep + 1} de {steps.length}</p>
          </div>
          <IconButton label="Fechar guia" onClick={onClose}><X size={18} /></IconButton>
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= currentStep ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border)]'}`} />)}
        </div>

        <div className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] txt-green">
          <StepIcon size={27} />
        </div>
        <h2 className="mt-4 font-display text-2xl txt-primary">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 txt-secondary">{step.description}</p>

        {step.bullets && (
          <ul className="mt-4 space-y-2">
            {step.bullets.map(item => <li key={item} className="flex gap-2 text-sm leading-5 txt-tertiary"><Check size={16} className="mt-0.5 shrink-0 txt-green" />{item}</li>)}
          </ul>
        )}
        {step.tip && <div className="mt-4 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-xs leading-5 txt-secondary"><strong className="txt-primary">Dica:</strong> {step.tip}</div>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" className="min-h-12" onClick={() => currentStep > 0 ? onStepChange(currentStep - 1) : onClose()}><ArrowLeft size={17} /> {currentStep > 0 ? 'Anterior' : 'Fechar'}</Button>
          <Button className="min-h-12" onClick={() => isLast ? onComplete() : onStepChange(currentStep + 1)}>{isLast ? 'Concluir' : 'Próxima'} {isLast ? <Check size={17} /> : <ArrowRight size={17} />}</Button>
        </div>
        {allowSkip && !isLast && <button type="button" onClick={onComplete} className="mt-3 min-h-10 w-full text-xs font-semibold txt-muted">Pular este guia</button>}
      </section>
    </div>
  );
}
