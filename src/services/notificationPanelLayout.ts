export interface NotificationPanelAnchor {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NotificationPanelViewport {
  width: number;
  height: number;
  offsetLeft?: number;
  offsetTop?: number;
}

export interface NotificationPanelLayout {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  abreAcima: boolean;
}

export function calcularLayoutPainelNotificacoes(
  ancora: NotificationPanelAnchor,
  viewport: NotificationPanelViewport,
): NotificationPanelLayout {
  const margem = 8;
  const espacamento = 8;
  const larguraMaxima = 352;
  const alturaMaxima = 448;
  const alturaMinimaPreferida = 220;
  const offsetLeft = viewport.offsetLeft ?? 0;
  const offsetTop = viewport.offsetTop ?? 0;
  const limiteDireito = offsetLeft + viewport.width - margem;
  const limiteInferior = offsetTop + viewport.height - margem;
  const largura = Math.max(0, Math.min(larguraMaxima, viewport.width - margem * 2));
  const left = Math.min(
    Math.max(offsetLeft + margem, ancora.right - largura),
    limiteDireito - largura,
  );
  const topAbaixo = ancora.bottom + espacamento;
  const espacoAbaixo = Math.max(0, limiteInferior - topAbaixo);
  const espacoAcima = Math.max(0, ancora.top - espacamento - (offsetTop + margem));
  const abreAcima = espacoAbaixo < alturaMinimaPreferida && espacoAcima > espacoAbaixo;
  const espacoDisponivel = abreAcima ? espacoAcima : espacoAbaixo;
  const maxHeight = Math.min(alturaMaxima, espacoDisponivel);
  const top = abreAcima
    ? Math.max(offsetTop + margem, ancora.top - espacamento - maxHeight)
    : topAbaixo;

  return { left, top, width: largura, maxHeight, abreAcima };
}
