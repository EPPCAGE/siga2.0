import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const start = html.indexOf('function _calcNivelMaturidade(media)');
const end = html.indexOf('function _migrarQuestHistNivel(', start);
const source = html.slice(start, end);

const QUESTOES = [
  { id: 'a', dim: 'A' },
  { id: 'b', dim: 'B' },
  { id: 'c', dim: 'C' },
  { id: 'd', dim: 'D' },
  { id: 'e', dim: 'E' },
  { id: 'f', dim: 'F' },
];

const { calcModa, calcNivel } = new Function('QUESTOES', `${source}
  return { calcModa: _calcModaNiveis, calcNivel: _calcNivelMaturidadeModa };
`)(QUESTOES);

describe('nível de maturidade pela moda das dimensões', () => {
  it('retorna o nível que mais se repete, em vez do menor nível', () => {
    expect(calcNivel({ a: 1, b: 3, c: 3, d: 3, e: 4, f: 5 })).toBe(3);
  });

  it('desconsidera dimensões sem resposta numérica', () => {
    expect(calcNivel({ a: 2, b: 4, c: 4, d: 'Não se aplica' })).toBe(4);
  });

  it('adota o menor nível modal quando há empate', () => {
    expect(calcModa([2, 2, 4, 4, 5])).toBe(2);
    expect(calcModa([1, 2, 3])).toBe(1);
  });

  it('mantém nível 1 quando não existem dimensões avaliadas', () => {
    expect(calcNivel({})).toBe(1);
  });
});
