import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import Button from '../ui/Button';

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function extractCode(raw: string): string | null {
  try {
    const payload = JSON.parse(raw) as { type?: string; code?: string };
    if (payload.type === 'cantina_immediate' && /^[A-F0-9]{6}$/.test(payload.code ?? '')) return payload.code!;
  } catch { /* QR externo ou texto puro. */ }
  const plain = raw.trim().toUpperCase();
  return /^[A-F0-9]{6}$/.test(plain) ? plain : null;
}

export default function CantinaQrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let frame = 0;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) { setError('Este navegador não oferece leitura nativa de QR Code. Use o código manual.'); return; }
    const detector = new Detector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(value => {
      stream = value;
      if (!active || !videoRef.current) return;
      videoRef.current.srcObject = value;
      void videoRef.current.play();
      const scan = async () => {
        if (!active || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const code = results[0] && extractCode(results[0].rawValue);
          if (code) { onCode(code); return; }
        } catch { /* Próximo quadro. */ }
        frame = requestAnimationFrame(scan);
      };
      frame = requestAnimationFrame(scan);
    }).catch(() => setError('Não foi possível acessar a câmera. Verifique a permissão ou use o código manual.'));
    return () => { active = false; cancelAnimationFrame(frame); stream?.getTracks().forEach(track => track.stop()); };
  }, [onCode]);

  return <div className="space-y-4"><div className="relative aspect-square overflow-hidden rounded-2xl bg-black">{!error && <video ref={videoRef} muted playsInline className="size-full object-cover" />}<div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/80" />{error && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white"><div><CameraOff className="mx-auto mb-3" /><p>{error}</p></div></div>}</div><p className="text-center text-xs txt-tertiary"><Camera size={14} className="mr-1 inline" />Aponte para o QR Code exibido pelo operador.</p><Button variant="ghost" className="w-full" onClick={onClose}>Voltar</Button></div>;
}
