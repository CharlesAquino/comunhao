import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function CantinaReservationQr({ reservationId, code }: { reservationId: string; code: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(JSON.stringify({ v: 1, type: 'cantina_pickup', reservationId, code }), {
      errorCorrectionLevel: 'M', margin: 2, width: 320,
      color: { dark: '#13251b', light: '#ffffff' },
    }).then(value => { if (active) setSrc(value); });
    return () => { active = false; };
  }, [code, reservationId]);

  return src ? <img src={src} alt={`QR Code da reserva ${code}`} className="mx-auto size-48 rounded-xl bg-white p-2" /> : <div className="mx-auto size-48 animate-pulse rounded-xl bg-white/80" />;
}
