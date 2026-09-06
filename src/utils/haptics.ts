/**
 * Utilitário de feedback tátil (háptico) e sensorial.
 * Executa vibrações sutis sem gerar exceções em navegadores sem suporte.
 */

export function triggerSubtleHaptic(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {
    // Silencioso se bloqueado por permissão do navegador
  }
}

export function triggerPrayerIntercededHaptic(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      // Padrão de batimento suave: pulso, pausa curta, confirmação
      navigator.vibrate([14, 45, 20]);
    }
  } catch {
    // Silencioso se bloqueado por permissão do navegador
  }
}
