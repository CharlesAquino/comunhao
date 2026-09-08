import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditorialPreflight from '../components/ebd/EditorialPreflight';
import { createEmptyEditorialDocument } from '../types/ebdEditorial';

describe('EditorialPreflight (Inspetor de Qualidade Editorial)', () => {
  it('aponta pendência crítica quando o dia não possui blocos', () => {
    const emptyDay = createEmptyEditorialDocument().days[0];
    render(<EditorialPreflight day={emptyDay} />);

    expect(screen.getByText(/1 pendência\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/O dia está sem blocos/)).toBeInTheDocument();
  });

  it('aprova dia com conteúdo e quiz devidamente estruturado', () => {
    const day = createEmptyEditorialDocument().days[0];
    day.title = 'Quando a fé vira conveniência';
    day.blocks = [
      {
        id: 'b-text',
        type: 'text',
        title: 'Texto de aprofundamento',
        content: 'Conteúdo bíblico sólido e expositivo sem perguntas retóricas.',
        reference: '',
        prompt: '',
        altText: '',
        required: false,
      },
      {
        id: 'b-scripture',
        type: 'scripture',
        title: 'Leitura bíblica',
        content: 'Explicação contextual da passagem.',
        reference: 'Juízes 17:1–6',
        prompt: '',
        altText: '',
        required: true,
      },
      {
        id: 'b-reflection',
        type: 'reflection',
        title: 'Reflexão pessoal',
        content: 'Examine suas escolhas e prioridades de vida: quem realmente governa seu coração?',
        reference: '',
        prompt: '',
        altText: '',
        required: true,
      },
      {
        id: 'b-quiz',
        type: 'quiz',
        title: 'Quiz de fixação',
        content: 'Questões para verificar a compreensão.',
        reference: '',
        prompt: '',
        altText: '',
        required: true,
        settings: {
          questions: [
            {
              id: 'q1',
              prompt: 'Qual o problema da família de Mica?',
              selectionMode: 'single',
              options: ['Falta de zelo', 'Sincretismo e conveniência', 'Pobreza', 'Perseguição'],
              correctAnswers: [1],
              explanation: 'Eles misturavam idolatria e culto ao Senhor.',
            },
          ],
        },
      },
    ];

    render(<EditorialPreflight day={day} />);
    expect(screen.getByText(/Pronto para publicação/)).toBeInTheDocument();
    expect(screen.getByText(/Integridade pedagógica do Quiz/)).toBeInTheDocument();
  });

  it('detecta quiz sem gabarito configurado como erro crítico', () => {
    const day = createEmptyEditorialDocument().days[0];
    day.title = 'Dia com quiz quebrado';
    day.blocks = [
      {
        id: 'b-quiz',
        type: 'quiz',
        title: 'Quiz inválido',
        content: 'Quiz sem respostas corretas.',
        reference: '',
        prompt: '',
        altText: '',
        required: true,
        settings: {
          questions: [
            {
              id: 'q1',
              prompt: 'Pergunta sem gabarito',
              selectionMode: 'single',
              options: ['Opção 1', 'Opção 2'],
              correctAnswers: [], // Inválido!
              explanation: 'Explicação.',
            },
          ],
        },
      },
    ];

    render(<EditorialPreflight day={day} />);
    expect(screen.getByText(/pendência\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Existem questões incompletas, sem alternativas ou sem gabarito/)).toBeInTheDocument();
  });
});
