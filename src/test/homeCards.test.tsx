import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PrayerPartnerCard from '../components/home/PrayerPartnerCard';
import LivePrayerRoomCard from '../components/home/LivePrayerRoomCard';
import DailyEbdCard from '../components/home/DailyEbdCard';
import ComunhaoEstudosCard from '../components/home/ComunhaoEstudosCard';
import type { EbdEditorialLesson } from '../types/ebdEditorial';
import { createEmptyEditorialDocument } from '../types/ebdEditorial';

describe('Home Redesign Components', () => {
  describe('PrayerPartnerCard', () => {
    it('renderiza o parceiro de oração da semana como card editorial sem CTA improvisado', () => {
      render(
        <BrowserRouter>
          <PrayerPartnerCard
            missaoAtual={{ id: 'user-1', nome: 'Marcos Oliveira', avatar: '' }}
            parceiroSustentador={{ nome: 'Ana Lima' }}
            conviteEnviado={null}
            criandoSala={false}
            onConvidar={vi.fn()}
            onCancelarConvite={vi.fn()}
          />
        </BrowserRouter>,
      );

      expect(screen.getByText('Sua intercessão nesta semana')).toBeInTheDocument();
      expect(screen.getByText('Marcos Oliveira')).toBeInTheDocument();
      expect(screen.getByText(/Ana Lima/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Orar com Marcos/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sala de Oração/ })).not.toBeInTheDocument();
    });

    it('exibe estado de espera pulsante quando o convite já foi enviado', () => {
      const onCancelar = vi.fn();
      render(
        <BrowserRouter>
          <PrayerPartnerCard
            missaoAtual={{ id: 'user-1', nome: 'Marcos Oliveira' }}
            conviteEnviado={{
              id: 'conv-1',
              remetente_id: 'user-2',
              destinatario_id: 'user-1',
              status: 'pendente',
              criado_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
              origem: 'dupla_semana',
            }}
            criandoSala={false}
            onConvidar={vi.fn()}
            onCancelarConvite={onCancelar}
          />
        </BrowserRouter>,
      );

      expect(screen.getByText(/Aguardando Marcos aceitar o convite/)).toBeInTheDocument();
      const cancelarBtn = screen.getByRole('button', { name: /Cancelar/ });
      fireEvent.click(cancelarBtn);
      expect(onCancelar).toHaveBeenCalledTimes(1);
    });

    it('não transforma a ausência de dupla em uma pessoa fictícia ou CTA ativo', () => {
      render(
        <BrowserRouter>
          <PrayerPartnerCard
            missaoAtual={{ id: '', nome: 'Aguardando sorteio' }}
            parceiroSustentador={null}
            conviteEnviado={null}
            criandoSala={false}
            onConvidar={vi.fn()}
            onCancelarConvite={vi.fn()}
          />
        </BrowserRouter>,
      );

      expect(screen.getByText('Sua dupla será revelada aqui')).toBeInTheDocument();
      expect(
        screen.getByText(/Assim que o sorteio for concluído/),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aguardando sorteio' })).toBeDisabled();
      expect(screen.queryByRole('link', { name: /Abrir perfil de Aguardando/ })).not.toBeInTheDocument();
    });
  });

  describe('LivePrayerRoomCard', () => {
    it('exibe o portal nobre da Sala de Oração com contagem de jovens', () => {
      const onEntrar = vi.fn();
      render(
        <LivePrayerRoomCard
          sessoesAbertasCount={2}
          mocidadeOnlineCount={14}
          onEntrar={onEntrar}
        />,
      );

      expect(screen.getByText('Sala de Oração')).toBeInTheDocument();
      expect(screen.getByText(/2 sala\(s\) compartilhada\(s\) aberta\(s\) agora/)).toBeInTheDocument();
      expect(screen.getByText('Ao Vivo')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /Entrar na Sala/ });
      fireEvent.click(btn);
      expect(onEntrar).toHaveBeenCalledTimes(1);
    });
  });

  describe('DailyEbdCard', () => {
    it('não promete conteúdo diário quando o dia atual ainda não está liberado', () => {
      const onAbrir = vi.fn();
      const mockLesson: EbdEditorialLesson = {
        id: 'ebd-11',
        number: 11,
        title: 'Crise Espiritual',
        subtitle: '',
        status: 'published',
        version: 1,
        document: createEmptyEditorialDocument(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <DailyEbdCard
          editorialLesson={mockLesson}
          onAbrir={onAbrir}
        />,
      );

      expect(screen.getByText('EBD · Lição da semana')).toBeInTheDocument();
      expect(screen.getByText('Crise Espiritual')).toBeInTheDocument();
      const cardBtn = screen.getByRole('button', { name: /Abrir EBD/ });
      fireEvent.click(cardBtn);
      expect(onAbrir).toHaveBeenCalledTimes(1);
    });
  });

  describe('ComunhaoEstudosCard', () => {
    it('mantém cursos indisponíveis explicitamente em preparação', () => {
      const onAcessar = vi.fn();
      render(
        <ComunhaoEstudosCard
          hasEstudosAccess={false}
          onAcessar={onAcessar}
        />,
      );

      expect(screen.getByText('Em preparação')).toBeInTheDocument();
      const button = screen.getByRole('button', { name: /Conhecer a proposta/ });
      fireEvent.click(button);
      expect(onAcessar).toHaveBeenCalledTimes(1);
    });
  });
});
