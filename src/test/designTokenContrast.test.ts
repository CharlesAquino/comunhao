import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type TokenMap = Record<string, string>;

function declarations(source: string): TokenMap {
  return Object.fromEntries(
    [...source.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]),
  );
}

function resolveToken(tokens: TokenMap, name: string, visited = new Set<string>()): string {
  if (visited.has(name)) throw new Error(`Referência circular no token --${name}`);
  visited.add(name);
  const value = tokens[name];
  if (!value) throw new Error(`Token --${name} não encontrado`);
  const reference = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  return reference ? resolveToken(tokens, reference, visited) : value;
}

function luminance(hex: string): number {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map(value => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Cor não suportada: ${hex}`);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
const lightSource = css.match(/:root,\s*:root\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const darkSource = css.match(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const light = declarations(lightSource);
const dark = { ...light, ...declarations(darkSource) };

describe.each([
  ['claro', light],
  ['escuro', dark],
] as const)('contraste dos tokens no tema %s', (_theme, tokens) => {
  it.each([
    ['text-primary', 'surface'],
    ['text-secondary', 'surface'],
    ['text-muted', 'surface'],
    ['text-muted', 'surface-elevated'],
    ['accent-primary', 'surface'],
    ['celebration', 'surface'],
    ['text-on-accent', 'accent-primary'],
  ])('mantém %s sobre %s em pelo menos 4,5:1', (foreground, background) => {
    expect(contrast(resolveToken(tokens, foreground), resolveToken(tokens, background))).toBeGreaterThanOrEqual(4.5);
  });
});
