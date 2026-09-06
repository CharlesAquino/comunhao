import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IncomingPrayerCall from '../components/oracao/IncomingPrayerCall';
import PrayerPreJoin from '../components/oracao/PrayerPreJoin';

function criarStream({ audio = true, video = true } = {}) {
  const audioTrack = { enabled: true, stop: vi.fn() };
  const videoTrack = { enabled: true, stop: vi.fn() };
  return {
    stream: {
      getTracks: () => [audio && audioTrack, video && videoTrack].filter(Boolean),
      getAudioTracks: () => audio ? [audioTrack] : [],
      getVideoTracks: () => video ? [videoTrack] : [],
      addTrack: vi.fn(),
    } as unknown as MediaStream,
    audioTrack,
    videoTrack,
  };
}

describe('fluxo visual da chamada de oração', () => {
  afterEach(() => vi.restoreAllMocks());

  it('oferece os três caminhos aprovados sem aceitar automaticamente', () => {
    const aceitarVideo = vi.fn();
    const aceitarAudio = vi.fn();
    const recusar = vi.fn();

    render(
      <IncomingPrayerCall
        nome="Ana Souza"
        onAcceptVideo={aceitarVideo}
        onAcceptAudio={aceitarAudio}
        onDecline={recusar}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(aceitarVideo).not.toHaveBeenCalled();
    expect(aceitarAudio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar com vídeo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar sem câmera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    expect(aceitarVideo).toHaveBeenCalledOnce();
    expect(aceitarAudio).toHaveBeenCalledOnce();
    expect(recusar).toHaveBeenCalledOnce();
  });

  it('só entra na sala depois da confirmação na antessala', async () => {
    const { stream, audioTrack, videoTrack } = criarStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    const entrar = vi.fn();

    render(<PrayerPreJoin initialVideo onBack={vi.fn()} onEnter={entrar} />);

    expect(entrar).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Preparando dispositivos…')).not.toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });

    fireEvent.click(screen.getByRole('button', { name: /microfone ligado/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar na oração' }));

    expect(entrar).toHaveBeenCalledWith({ microphone: false, camera: true });
    expect(audioTrack.stop).toHaveBeenCalled();
    expect(videoTrack.stop).toHaveBeenCalled();
  });
});
