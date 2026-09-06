import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { resolveBackTarget } from '../services/navigationRules';

const ROUTE_STACK_KEY = 'comunhao:navigation-stack';

function readStack(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(ROUTE_STACK_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]): void {
  sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack.slice(-40)));
}

export default function NativeNavigationBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const suppressNextPush = useRef(false);
  const lastBackAt = useRef(0);

  useEffect(() => {
    const current = `${location.pathname}${location.search}${location.hash}`;
    const stack = readStack();

    if (suppressNextPush.current) {
      suppressNextPush.current = false;
      if (stack[stack.length - 1] !== current) writeStack([...stack, current]);
      return;
    }

    if (stack[stack.length - 1] === current) return;
    const existingIndex = stack.lastIndexOf(current);
    if (existingIndex >= 0) {
      writeStack(stack.slice(0, existingIndex + 1));
      return;
    }
    writeStack([...stack, current]);
  }, [location.hash, location.pathname, location.search]);

  const requestBack = useCallback(() => {
    const now = Date.now();
    if (now - lastBackAt.current < 450) return;
    lastBackAt.current = now;

    const overlayEvent = new CustomEvent('comunhao:back-request', { cancelable: true });
    window.dispatchEvent(overlayEvent);
    if (overlayEvent.defaultPrevented) return;

    if (location.pathname === '/') {
      toast.info('Você já está no início do aplicativo.');
      return;
    }

    const { target, nextStack } = resolveBackTarget(location.pathname, readStack());
    writeStack(nextStack);
    suppressNextPush.current = true;
    navigate(target, { replace: true });
  }, [location.pathname, navigate, toast]);

  useEffect(() => {
    const handleNativeBack = () => requestBack();
    window.addEventListener('comunhao:native-back', handleNativeBack);
    return () => window.removeEventListener('comunhao:native-back', handleNativeBack);
  }, [requestBack]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const edge = 26;
      tracking = touch.clientX <= edge || touch.clientX >= window.innerWidth - edge;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const horizontal = Math.abs(touch.clientX - startX);
      const vertical = Math.abs(touch.clientY - startY);
      if (horizontal >= 72 && vertical <= 54) requestBack();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [requestBack]);

  return null;
}
