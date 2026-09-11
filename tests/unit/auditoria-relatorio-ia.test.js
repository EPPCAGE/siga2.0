import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const functions = readFileSync(new URL('../../functions/index.js', import.meta.url), 'utf8');

const functionSource = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));

describe('relatório salvo de aderência', () => {
  const restore = functionSource('function _rAudRestoreRelatorio(p)', '\nfunction salvarTratamentoRisco');
  const init = functionSource('function _rAcaoInitBpmn(p, minhaTarefa)', '\n// Q019');
  const save = functionSource('async function salvarRelatorioAuditoria(concluir)', '\nfunction exportarAuditoriaRelPdf');

  it('restaura o JSON carregado de uma nova sessão ao abrir a etapa', () => {
    const p = JSON.parse(JSON.stringify({ etapa: 'auditoria', auditoria: {
      conformidade: 'Conforme', relatorio_json: { sumario: 'Análise já salva' }
    } }));
    let displayed;
    runInNewContext(`${restore}\n${init}\n_rAcaoInitBpmn(p, false);`, {
      p, _BPMN_INIT: {},
      document: { getElementById: () => ({ replaceChildren: node => { displayed = node; } }) },
      renderRelatorioAuditoria: (json, conf) => ({ text: json.sumario, conf }),
      _anexarFluxogramaRelatorio: async () => {},
    });
    expect(displayed).toEqual({ text: 'Análise já salva', conf: 'Conforme' });
  });

  it.each([true, false])('só confirma o salvamento após a nuvem responder: %s', async saved => {
    let finishSave;
    const messages = [];
    const p = { auditoria: { relatorio_json: { sumario: 'Conteúdo persistente' } } };
    const pending = runInNewContext(`${save}\nsalvarRelatorioAuditoria(false);`, {
      curProc: p, document: { getElementById: () => null }, now: () => '11/09/2026',
      clearTimeout: () => {}, fbSaveAll: () => new Promise(resolve => { finishSave = resolve; }),
      _rAudRestoreRelatorio: () => {}, toast: message => messages.push(message),
    });
    expect(messages).toEqual([]);
    finishSave(saved);
    await pending;
    expect(messages.some(message => message === 'Relatório salvo!')).toBe(saved);
    expect(p.auditoria.relatorio_json.sumario).toBe('Conteúdo persistente');
    if(!saved) expect(messages[0]).toContain('Não foi possível salvar');
  });
});

describe('geração do relatório de análise de aderência com IA', () => {
  const start = html.indexOf('async function iaGerarRelatorioAuditoria()');
  const end = html.indexOf('\nfunction _fixTermoAnalise', start);
  const source = html.slice(start, end);

  it('tolera coleções antigas ou incompletas e sempre reabilita o botão', () => {
    expect(source).toContain('const _list = value => Array.isArray(value)');
    expect(source).toContain("_list(p.ent?.riscos)");
    expect(source).toContain('} finally {');
    expect(source).toContain('btn.disabled = false');
  });

  it('exibe um erro quando uma falha inesperada ocorre', () => {
    expect(source).toContain("console.error('iaGerarRelatorioAuditoria:'");
    expect(source).toContain('Não foi possível gerar o relatório.');
  });

  it('não inclui o token de autenticação no limite do payload da função', () => {
    expect(functions).toContain('JSON.stringify(req.body?.payload ?? "").length > MAX_PAYLOAD_BYTES');
  });

  it('usa apenas o fluxograma construído no módulo de Mapeamento', () => {
    expect(html).not.toContain('function _getFluxogramasPublicados');
    expect(html).toContain('const pngUrl=await _getFluxogramaAsIsPng(p)');
    expect(html).toContain('if(!pngUrl) return');
    expect(source).toContain('_anexarFluxogramaRelatorio(p, el)');
  });
});
