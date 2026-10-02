import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function _coberturaIndicadoresCriticos('), html.indexOf('function rPainelGestor()'));
const parsing = html.slice(html.indexOf('function parseNumBR('), html.indexOf('function _xlsNorm('));
const c = runInNewContext(`${parsing}\n${source}\n({ calc:_coberturaIndicadoresCriticos, render:_htmlIndicadoresCriticos })`, {
  isCritico: id => id !== 'normal',
  esc: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
});
const unidades = ['a', 'b', 'c', 'normal'].map(arq_id => ({ arq_id, nome: arq_id }));

describe('indicadores e metas de processos críticos no painel do gestor', () => {
  it('separa os três grupos considerando vínculo direto e pelo processo mapeado', () => {
    const result = c.calc(unidades, [{ arq_id: 'b', meta: null, sem_dado: true }, { pid: '7', meta: 10 }], [{ id: 7, arq_id: 'c' }]);
    expect(result.total).toBe(3);
    expect(result.semIndicadores.map(u => u.arq_id)).toEqual(['a']);
    expect(result.semMeta.map(u => u.arq_id)).toEqual(['b']);
    expect(result.comMeta.map(u => u.arq_id)).toEqual(['c']);
  });
  it('não duplica processos por período e aceita meta em qualquer indicador vinculado', () => {
    const result = c.calc([...unidades, unidades[0]], [
      { arq_id: 'a', meta: null }, { arq_id: 'a', meta: 0 }, { arq_id: 'a', meta: 20 },
      { arq_id: 'b', meta: '', _metaFallback: 99 },
      { arq_id: 'c', meta: 0, origem: 'importado' },
    ], []);
    expect(result.total).toBe(3);
    expect(result.comMeta.map(u => u.arq_id)).toEqual(['a']);
    expect(result.semMeta.map(u => u.arq_id)).toEqual(['b', 'c']);
    expect(result.semIndicadores).toHaveLength(0);
  });
  it('reconhece zero confirmado na importação e ignora vínculos inexistentes', () => {
    const result = c.calc(unidades, [
      { pid: 99, meta: 10 }, { arq_id: 'c', meta: 0, origem: 'gsheets', meta_definida: true },
    ], []);
    expect(result.semIndicadores).toHaveLength(2);
    expect(result.comMeta.map(u => u.arq_id)).toEqual(['c']);
  });
  it('exibe gráfico acessível, nomes e caminhos sem injetar HTML', () => {
    const result = c.calc([{ arq_id: 'a', nome: '<script>', label: 'Macro > Processo' }], [], []);
    const rendered = c.render(result);
    expect(rendered).toContain('role="img"');
    expect(rendered).toContain('Sem indicador: 1');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('Macro &gt; Processo');
    expect(rendered).toContain('100%');
  });
  it('trata ausência de processos críticos sem divisão por zero', () => {
    const rendered = c.render(c.calc([], [], []));
    expect(rendered).toContain('Nenhum processo crítico cadastrado.');
    expect(rendered).not.toContain('NaN');
    expect(rendered).not.toContain('role="img"');
  });
});
