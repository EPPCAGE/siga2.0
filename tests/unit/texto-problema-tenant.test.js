import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const tenantSource = readFileSync(new URL('../../src/shared/tenant-config.js', import.meta.url), 'utf8');
const context = vm.createContext({});
for (const name of ['_extrairProblemaSolucao', '_comSolucaoDefinitiva']) {
  vm.runInContext(html.match(new RegExp('function ' + name + '\\([^]*?\\n\\}'))[0], context);
}

describe('textos de problemas e soluções', () => {
  it('preserva texto multilinha e separa na primeira chave de fechamento', () => {
    expect(context._extrairProblemaSolucao('[Problema:  Falta de\ncontrole ] \n Criar checklist [revisado] '))
      .toEqual({ problema: 'Falta de\ncontrole', solucao: 'Criar checklist [revisado]' });
  });
  it('mantém os fallbacks para texto simples ou incompleto', () => {
    expect(context._extrairProblemaSolucao('Problema sem marcador')).toBeNull();
    expect(context._extrairProblemaSolucao('[Problema:' + ' '.repeat(100000))).toBeNull();
    expect(context._extrairProblemaSolucao('[Problema: ]')).toEqual({ problema: '', solucao: '' });
  });
  it('usa a solução definitiva preservando o problema original', () => {
    const text = '[Problema:  Falta de controle ] Solução da IA';
    const p = { ent: { analise: { solucao_definitiva: { [text]: 'Solução aprovada', livre: 'Texto aprovado' } } } };
    expect(context._comSolucaoDefinitiva(p, [text, 'livre', 'inalterado']))
      .toEqual(['[Problema: Falta de controle] Solução aprovada', 'Texto aprovado', 'inalterado']);
  });
});

describe('normalização do tenant', () => {
  it.each([
    [' --- Órgão TESTE --- ', 'rg-o-teste'],
    ['--cage-rs__prod--', 'cage-rs__prod'],
    ['-'.repeat(100000), 'default'],
    ['abc' + '-'.repeat(100000), 'abc'],
  ])('normaliza segmentos sem repetição de buscas pelo sufixo', (tenantId, expected) => {
    const scope = vm.createContext({ CONFIG: { TENANCY: { enabled: true, tenantId } } });
    vm.runInContext(tenantSource, scope);
    expect(scope.TENANT_CONFIG.tenantId).toBe(expected);
    expect(scope.tenantDocPath('processos', '1')).toBe(`tenants/${expected}/processos/1`);
  });
});
