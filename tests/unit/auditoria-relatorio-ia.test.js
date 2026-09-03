import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const functions = readFileSync(new URL('../../functions/index.js', import.meta.url), 'utf8');

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
