# Design System — Ações do Comunhão

> Antes de criar ou alterar qualquer ação, cumprir o gate de
> `DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md`. Este documento especializa a
> hierarquia de botões; ele não autoriza estilos locais fora desse contrato.

## Hierarquia

### Ação institucional

Use `InstitutionalAction` para o único CTA principal de uma tela ou de um card editorial relevante.

Exemplos atuais:

- criar publicação no Mural;
- continuar a jornada da EBD;
- abrir o Estúdio Editorial;
- solicitar um resgate no Tesouro;
- abrir o resgate da Carteira Kesef;
- salvar preferências de notificação.

Características obrigatórias:

- largura limitada a `82%` e máximo de `22rem`;
- centralização automática;
- altura mínima de `3.15rem`;
- ícone dentro de selo circular;
- detalhe losangular à direita;
- foco visível e área de toque acessível;
- material próprio para os temas Amanhecer e Santuário;
- estado desabilitado sem alterar a semântica da ação.

```tsx
<InstitutionalAction icon={<BookOpen size={17} />} onClick={continuar}>
  Continuar jornada
</InstitutionalAction>
```

Para navegação, use a propriedade `to`:

```tsx
<InstitutionalAction to="/admin/ebd-studio" icon={<LayoutPanelTop size={17} />}>
  Abrir Estúdio Editorial
</InstitutionalAction>
```

## Botões operacionais

Use `Button` para ações locais, diálogos e fluxos com mais de uma escolha:

- confirmar e cancelar;
- voltar ou fechar;
- ações administrativas em listas;
- ações destrutivas;
- controles compactos.

Variantes disponíveis: `primary`, `secondary`, `ghost`, `danger` e `icon`.

## Regras de composição

1. Uma seção não deve apresentar duas ações institucionais concorrentes.
2. Ações destrutivas nunca usam o estilo institucional.
3. O ícone deve descrever a ação e não ser apenas decorativo.
4. O texto deve começar com verbo e ser curto.
5. Não aplicar `w-full`: a largura e a centralização pertencem ao componente.
6. Estados de carregamento preservam a largura e substituem apenas o rótulo.
7. Ícones e textos continuam elementos reais; não devem ser incorporados a imagens de fundo.
8. O CTA principal de um card editorial não pode ser substituído por `Button`
   com largura, gradiente ou CSS local que imite `InstitutionalAction`.

## Tokens visuais

| Papel | Santuário | Amanhecer |
|---|---|---|
| Superfície | verde profundo em gradiente | marfim e sálvia em gradiente |
| Contorno | ouro antigo translúcido | bronze suave translúcido |
| Texto | marfim | verde institucional |
| Selo | ouro sobre verde | bronze sobre marfim |
| Foco | `var(--focus)` | `var(--focus)` |
