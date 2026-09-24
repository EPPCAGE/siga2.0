import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');

describe('exportação Excel da arquitetura de processos', () => {
  const inicio = html.indexOf('function exportarArquiteturaExcel()');
  const fim = html.indexOf('async function importarArqExcel', inicio);
  const exportacao = html.slice(inicio, fim);

  it('disponibiliza a exportação na barra da arquitetura', () => {
    expect(html).toContain('onclick="exportarArquiteturaExcel()"');
    expect(html).toContain('⬇ Exportar Excel');
  });

  it('organiza cada linha por macroprocesso, processo e subprocesso', () => {
    expect(exportacao).toContain("'Macroprocesso','Processo','Subprocesso'");
    expect(exportacao).toContain('processo.subprocessos.forEach');
    expect(exportacao).toContain("XLSX.utils.book_append_sheet(wb, ws, 'Arquitetura')");
  });

  it('inclui metadados, situação do mapeamento e criticidade', () => {
    expect(exportacao).toContain("'Natureza','Gerente do processo','Área'");
    expect(exportacao).toContain("isMapeado(item.id) ? 'Sim' : 'Não'");
    expect(exportacao).toContain("isCritico(item.id) ? 'Sim' : 'Não'");
    expect(exportacao).toContain('arquitetura_processos_${data}.xlsx');
  });
});
