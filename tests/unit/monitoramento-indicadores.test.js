import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function rMon('), html.indexOf('function rHist('));
function render(p, kpis) {
  const target = { innerHTML: '' };
  const shown = [];
  runInNewContext(`${source}\nrMon(p);`, {
    p, kpis, document: { getElementById: () => target },
    kpiCard: k => { shown.push(k.nome); return `<div>${k.nome}</div>`; }, esc: String,
  });
  return { shown, html: target.innerHTML };
}
describe('indicadores na aba Monitoramento', () => {
  it('mostra indicador vinculado apenas pela arquitetura', () => {
    const result = render({ id: 1, arq_id: 'orientacoes' }, [
      { nome: 'Informações emitidas', arq_id: 'orientacoes', pid: null },
    ]);
    expect(result.shown).toEqual(['Informações emitidas']);
    expect(result.html).not.toContain('Nenhum indicador vinculado');
  });
  it('aceita IDs de mapeamento e arquitetura como texto ou número, sem duplicar', () => {
    const result = render({ id: 1, arq_id: 20 }, [
      { nome: 'Direto', pid: '1' },
      { nome: 'Arquitetura', arq_id: '20' },
      { nome: 'Ambos', pid: 1, arq_id: 20 },
      { nome: 'Outro processo', pid: 2, arq_id: 30 },
    ]);
    expect(result.shown).toEqual(['Direto', 'Arquitetura', 'Ambos']);
  });
  it('não associa indicadores sem vínculo e preserva a análise de aderência', () => {
    const result = render({ id: 1, auditoria: { concluida: true, conclusao: 'Conforme' } }, [
      { nome: 'Sem vínculo' }, { nome: 'Nulo', pid: null, arq_id: null },
    ]);
    expect(result.shown).toEqual([]);
    expect(result.html).toContain('Nenhum indicador vinculado');
    expect(result.html).toContain('Conforme');
  });
});
