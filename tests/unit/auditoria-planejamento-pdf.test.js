import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');

describe('relatório de planejamento da análise de aderência', () => {
  it('disponibiliza a geração do PDF na aba Planejamento', () => {
    expect(html).toContain('onclick="exportarPlanejamentoAuditoriaPdf()"');
    expect(html).toContain('function exportarPlanejamentoAuditoriaPdf()');
  });

  it('inclui planejamento, questões e respostas atuais no relatório', () => {
    expect(html).toContain('Relatório de Planejamento de Trabalho');
    expect(html).toContain('Questões e respostas');
    expect(html).toContain("document.getElementById('aud-q-resposta-'+index)?.value?.trim()");
    expect(html).toContain("metodologia:domValue('aud-metod',aud.metodologia)");
  });
});
