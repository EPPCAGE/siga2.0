import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');

describe('relatório de indicadores por macroprocesso', () => {
  it('agrega o cabeçalho executivo por macroprocesso', () => {
    expect(html).toContain('function _buildKpiMacroprocessoCards(lista)');
    expect(html).toContain('Taxa de atingimento por macroprocesso');
    expect(html).not.toContain('Taxa de atingimento por área');
  });

  it('exibe o macroprocesso junto à área na tabela de indicadores', () => {
    expect(html).toContain('<th>Indicador</th><th>Macroprocesso</th><th>Área</th><th>Período</th>');
    expect(html).toContain('esc(_macroprocessoIndicador(k))');
  });

  it('mantém indicadores sem vínculo em um agrupamento explícito', () => {
    expect(html).toContain("return _kpiGetMacroProc(k).macro || '(sem macroprocesso)';");
  });
});
