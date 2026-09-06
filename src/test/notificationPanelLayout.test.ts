import { describe, expect, it } from 'vitest';
import { calcularLayoutPainelNotificacoes } from '../services/notificationPanelLayout';

describe('notificationPanelLayout', () => {
  it('mantém o painel inteiro dentro de uma tela estreita', () => {
    const layout = calcularLayoutPainelNotificacoes(
      { left: 270, right: 306, top: 48, bottom: 84 },
      { width: 360, height: 720 },
    );

    expect(layout.left).toBe(8);
    expect(layout.width).toBe(344);
    expect(layout.left + layout.width).toBeLessThanOrEqual(352);
  });

  it('reduz a largura em aparelhos ainda menores', () => {
    const layout = calcularLayoutPainelNotificacoes(
      { left: 240, right: 276, top: 48, bottom: 84 },
      { width: 320, height: 640 },
    );

    expect(layout.left).toBe(8);
    expect(layout.width).toBe(304);
  });

  it('abre acima do botão quando falta espaço abaixo', () => {
    const layout = calcularLayoutPainelNotificacoes(
      { left: 280, right: 316, top: 560, bottom: 596 },
      { width: 360, height: 640 },
    );

    expect(layout.abreAcima).toBe(true);
    expect(layout.top + layout.maxHeight).toBeLessThanOrEqual(552);
  });

  it('respeita o deslocamento do visual viewport', () => {
    const layout = calcularLayoutPainelNotificacoes(
      { left: 310, right: 346, top: 90, bottom: 126 },
      { width: 340, height: 600, offsetLeft: 12, offsetTop: 20 },
    );

    expect(layout.left).toBeGreaterThanOrEqual(20);
    expect(layout.left + layout.width).toBeLessThanOrEqual(344);
  });
});
