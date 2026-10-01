import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = html.slice(
  html.indexOf('function _htmlProcessosPorMaturidade('),
  html.indexOf('function rPainelGestor()'),
);

function render(unidades){
  const esc = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  return runInNewContext(`${source}\n_htmlProcessosPorMaturidade(unidades);`, { unidades, esc });
}

describe('processos por grau de maturidade no painel do gestor', () => {
  it('lista alfabeticamente os processos enquadrados no nível', () => {
    const resultado = render([
      { nome: 'Zeladoria', label: 'Finalístico › Zeladoria' },
      { nome: 'Atendimento', label: 'Finalístico › Atendimento' },
    ]);

    expect(resultado).toContain('Atendimento');
    expect(resultado.indexOf('Atendimento')).toBeLessThan(resultado.indexOf('Zeladoria'));
  });

  it('protege nomes e caminhos exibidos contra injeção de HTML', () => {
    const resultado = render([{ nome: '<script>alert(1)</script>', label: 'Macro "principal"' }]);

    expect(resultado).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(resultado).toContain('Macro &quot;principal&quot;');
    expect(resultado).not.toContain('<script>');
  });

  it('informa quando o nível não possui processos', () => {
    expect(render([])).toContain('Nenhum processo');
  });
});
