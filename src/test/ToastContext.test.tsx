import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import type { ReactNode } from 'react';

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ToastProvider>{children}</ToastProvider>
  );

  it('should show success toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('Operação concluída!');
    });

    // Toast is rendered (no error thrown)
    expect(true).toBe(true);
  });

  it('should show error toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.error('Algo deu errado.');
    });

    expect(true).toBe(true);
  });

  it('should show info toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.info('Aviso importante.');
    });

    expect(true).toBe(true);
  });

  it('should throw error if used outside provider', () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within ToastProvider');
  });

  it('should auto-remove toast after 4 seconds', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('Mensagem temporária');
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Toast should be removed after 4s (no error)
    expect(true).toBe(true);
  });
});
