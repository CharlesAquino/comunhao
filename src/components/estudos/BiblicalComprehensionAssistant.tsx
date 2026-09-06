import { useState } from 'react';
import { BookOpen, Sparkles, MessageCircleQuestion, Send, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import type { StudyBlock } from '../../types/comunhaoEstudos';

interface BiblicalComprehensionAssistantProps {
  lessonTitle: string;
  lessonReference: string;
  blocks: StudyBlock[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function BiblicalComprehensionAssistant({
  lessonTitle,
  lessonReference,
  blocks,
}: BiblicalComprehensionAssistantProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [answering, setAnswering] = useState(false);

  const suggestedQuestions = [
    `Como aplicar ${lessonReference} no meu dia a dia?`,
    `Qual o contexto principal desta aula sobre ${lessonTitle}?`,
    `O que significa a reflexão desta aula para a mocidade?`,
  ];

  const handleAsk = (questionText: string) => {
    const question = questionText.trim();
    if (!question || answering) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setAnswering(true);

    // Síntese pedagógica contextual baseada no conteúdo da aula
    window.setTimeout(() => {
      // Coleta o contexto da aula disponível
      const lessonBodies = blocks
        .map(b => (typeof b.content?.body === 'string' ? b.content.body : ''))
        .filter(Boolean)
        .join('\n');

      let reply = '';
      if (question.toLowerCase().includes('aplicar') || question.toLowerCase().includes('prática')) {
        reply = `Em ${lessonReference}, a ênfase prática é viver a constância e o amor comunitário. Para o seu dia a dia, separe momentos regulares de oração silenciosa e procure apoiar os irmãos da mocidade nos desafios da semana.`;
      } else if (question.toLowerCase().includes('contexto')) {
        reply = `O estudo de "${lessonTitle}" fundamenta-se em ${lessonReference}. Ele foi preparado para demonstrar como o ensino bíblico se conecta diretamente com a nossa caminhada com Cristo hoje.`;
      } else {
        reply = `Com base na lição sobre ${lessonTitle} (${lessonReference}): ${lessonBodies.slice(0, 240) || 'O texto nos convida à fidelidade e à oração constante.'} Lembre-se: na dúvida teológica mais profunda, seu pastor e seus professores da EBD estão à disposição para caminhar com você!`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setAnswering(false);
    }, 600);
  };

  return (
    <Card className="spatial-section relic-surface overflow-hidden border border-[var(--celebration-border)] bg-[var(--surface-highlighted)] p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--celebration-soft)] text-[var(--celebration)]">
            <Sparkles size={18} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold txt-primary">
              Compreensão Bíblica & Dúvidas
            </h3>
            <p className="text-xs txt-tertiary">
              Tire dúvidas rápidas com base estrita no estudo de {lessonReference}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="txt-tertiary" /> : <ChevronDown size={18} className="txt-tertiary" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3 pt-3 border-t border-[var(--border)]">
          {messages.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold txt-secondary flex items-center gap-1.5">
                <MessageCircleQuestion size={14} /> Perguntas frequentes desta aula:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(q)}
                    className="sanctuary-choice rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-left transition-premium hover:border-[var(--accent-primary)] txt-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3 leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                      : 'mr-auto max-w-[95%] border border-[var(--border)] bg-[var(--surface)] txt-secondary'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <span className="mb-1 flex items-center gap-1 font-bold text-[var(--accent-primary)]">
                      <BookOpen size={13} /> Orientação da Lição:
                    </span>
                  )}
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              ))}
              {answering && (
                <div className="mr-auto max-w-[85%] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs txt-muted animate-pulse">
                  Consultando o texto da lição…
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Digite sua dúvida sobre a aula..."
              className="input-theme min-h-11 flex-1 rounded-xl border px-3 text-xs txt-primary"
              disabled={answering}
            />
            <Button
              type="submit"
              disabled={!query.trim() || answering}
              className="min-h-11 px-3"
              aria-label="Enviar pergunta"
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
