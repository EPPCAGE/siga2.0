import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function _calcNivelMaturidade('), html.indexOf('function _migrarQuestHist(p)'));

function context(dimensoes) {
  const QUESTOES = [];
  const resp = {};
  dimensoes.forEach((valores, dim) => valores.forEach((valor, i) => {
    const id = `${dim}-${i}`;
    QUESTOES.push({ id, dim });
    if (valor !== undefined) resp[id] = valor;
  }));
  return runInNewContext(`${source}\n({ calcular: () => _calcNivelMaturidadeModa(resp), migrar: _migrarMatModa, resp });`, {
    QUESTOES, resp, fbAutoSave() {},
  });
}

describe('maturidade pela moda das dimensões', () => {
  it.each([
    [[[1], [4], [4], [5], [3]], 4],
    [[[1], [4], [4], [3], [3]], 3],
    [[[5], [3], [1], [4], [2]], 1],
    [[[5], [5], [5]], 5],
    [[[5, 5, 5], [2], [2]], 2],
    [[[3, 4], [3], [1]], 3],
    [[['na'], [undefined], [4], [4], [1]], 4],
    [[['na'], [undefined]], 1],
    [[], 1],
  ])('calcula %j como nível %i', (dimensoes, esperado) => {
    expect(context(dimensoes).calcular()).toBe(esperado);
  });

  it('atualiza a nota existente a partir das respostas', () => {
    const c = context([[1], [4], [4]]);
    const p = { ent: { mat: 1, quest_resp: c.resp } };
    c.migrar(p);
    expect(p.ent.mat).toBe(4);
  });

  it('preserva a nota existente quando não há respostas', () => {
    const c = context([]);
    const p = { ent: { mat: 3 } };
    c.migrar(p);
    expect(p.ent.mat).toBe(3);
  });
});
