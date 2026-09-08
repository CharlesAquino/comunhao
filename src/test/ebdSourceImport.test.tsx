import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditorialSourceImport from '../components/ebd/EditorialSourceImport';
import { listEditorialSources } from '../services/ebdSourceService';
import { createEmptyEditorialDocument } from '../types/ebdEditorial';
import { SOURCE_BLOCKS, SOURCE_SCHEMA, type EditorialSourceDay } from '../services/ebdSourcePackage';

vi.mock('../services/ebdSourceService', () => ({ listEditorialSources: vi.fn(), importEditorialSources: vi.fn() }));
const source: EditorialSourceDay = {
  schemaVersion: SOURCE_SCHEMA, lessonKey: 'L11', dayKey: 'D01', weekday: 'monday', revision: 1,
  provenance: [], day: { title: 'Dia importado', subtitle: 'Subtítulo', purpose: 'Objetivo', estimatedMinutes: 12,
    blocks: SOURCE_BLOCKS.map(type => ({ type, title: type, content: 'Texto original preservado.', reference: '', prompt: '', altText: '', required: true, quizQuestions: [] })),
  },
};
describe('seleção de conteúdo preparado no Estúdio', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(listEditorialSources).mockResolvedValue([source]); });
  it('aplica somente os tipos escolhidos após confirmação e mantém o dia alvo', async () => {
    const apply = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(true);
    const day = createEmptyEditorialDocument().days[0];
    render(<EditorialSourceImport lessonId="lesson" lessonNumber={11} day={day} disabled={false} onApply={apply} />);
    fireEvent.click(screen.getByText(/Conteúdo preparado/));
    await screen.findByText(/Aplicar seleção/);
    const choices = screen.getAllByRole('checkbox');
    fireEvent.click(choices[0]);
    fireEvent.click(screen.getByText(/Aplicar seleção/));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0].blocks).toHaveLength(8);
    expect(apply.mock.calls[0][0].blocks.some((b: { type: string }) => ['hero', 'video'].includes(b.type))).toBe(false);
    expect(apply.mock.calls[0][0].id).toBe(day.id);
  });
  it('bloqueia importação/aplicação quando o rascunho não pode ser editado', async () => {
    render(<EditorialSourceImport lessonId="lesson" lessonNumber={11} day={createEmptyEditorialDocument().days[0]} disabled onApply={vi.fn()} />);
    expect(await screen.findByText(/Aplicar seleção/)).toBeDisabled();
    expect(screen.getByLabelText('Arquivos dos dias e manifesto opcional')).toBeDisabled();
  });
  it('mostra falha remota sem afirmar que a biblioteca está vazia com sucesso', async () => {
    vi.mocked(listEditorialSources).mockRejectedValue(new Error('Falha de conexão'));
    render(<EditorialSourceImport lessonId="lesson" lessonNumber={11} day={createEmptyEditorialDocument().days[0]} disabled={false} onApply={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha de conexão'));
  });
});
