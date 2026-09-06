import { useEffect, useRef, type RefObject } from 'react';
import { useGraphics } from '../contexts/GraphicsContext';

interface SpatialOptions {
  maxTilt?: number;
  pointerRange?: number;
}

export function useSpatialSurface<T extends HTMLElement>({
  maxTilt = 1.15,
  pointerRange = 0.72,
}: SpatialOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { quality } = useGraphics();

  useEffect(() => {
    const element = ref.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!element || quality === 'economy' || reducedMotion) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      element.style.setProperty('--spatial-rotate-x', `${(-currentY).toFixed(3)}deg`);
      element.style.setProperty('--spatial-rotate-y', `${currentX.toFixed(3)}deg`);
      element.style.setProperty('--spatial-far-x', `${(-currentX * 1.2).toFixed(2)}px`);
      element.style.setProperty('--spatial-far-y', `${(-currentY).toFixed(2)}px`);
      element.style.setProperty('--spatial-mid-x', `${(currentX * 0.65).toFixed(2)}px`);
      element.style.setProperty('--spatial-mid-y', `${(currentY * 0.55).toFixed(2)}px`);
      element.style.setProperty('--spatial-near-x', `${(currentX * 1.8).toFixed(2)}px`);
      element.style.setProperty('--spatial-near-y', `${(currentY * 1.5).toFixed(2)}px`);
      element.style.setProperty('--spatial-shadow-x', `${(-currentX).toFixed(2)}px`);
      element.style.setProperty('--spatial-shadow-y', `${(3 + currentY * 0.6).toFixed(2)}px`);
      element.style.setProperty('--spatial-aura-x', `${(-currentX * 2).toFixed(2)}px`);
      element.style.setProperty('--spatial-aura-y', `${(8 + currentY).toFixed(2)}px`);
      element.style.setProperty('--spatial-brightness', (1 + currentX * 0.025).toFixed(3));
      element.style.setProperty('--spatial-light-x', `${(50 + currentX * 24).toFixed(1)}%`);
      element.style.setProperty('--spatial-light-y', `${(18 + currentY * 16).toFixed(1)}%`);

      if (Math.abs(targetX - currentX) > 0.002 || Math.abs(targetY - currentY) > 0.002) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const setTarget = (x: number, y: number) => {
      targetX = Math.max(-maxTilt, Math.min(maxTilt, x));
      targetY = Math.max(-maxTilt, Math.min(maxTilt, y));
      schedule();
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (document.visibilityState !== 'visible' || event.gamma == null || event.beta == null) return;
      const horizontal = Math.max(-18, Math.min(18, event.gamma)) / 18;
      const vertical = Math.max(-18, Math.min(18, event.beta - 45)) / 18;
      setTarget(horizontal * maxTilt, vertical * maxTilt);
    };

    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const bounds = element.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      setTarget(x * pointerRange, y * pointerRange);
    };

    const reset = () => setTarget(0, 0);

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    element.addEventListener('pointermove', handlePointer, { passive: true });
    element.addEventListener('pointerleave', reset, { passive: true });
    document.addEventListener('visibilitychange', reset);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      element.removeEventListener('pointermove', handlePointer);
      element.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', reset);
      if (frame) window.cancelAnimationFrame(frame);
      for (const property of [
        '--spatial-rotate-x', '--spatial-rotate-y', '--spatial-far-x', '--spatial-far-y',
        '--spatial-mid-x', '--spatial-mid-y', '--spatial-near-x', '--spatial-near-y',
        '--spatial-shadow-x', '--spatial-shadow-y', '--spatial-aura-x', '--spatial-aura-y',
        '--spatial-brightness', '--spatial-light-x', '--spatial-light-y',
      ]) {
        element.style.removeProperty(property);
      }
    };
  }, [maxTilt, pointerRange, quality]);

  return ref;
}
