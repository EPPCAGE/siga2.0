import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/shared/areas-arquitetura.js',import.meta.url),'utf8');
const names = ['Gabinete da CAGE','Divisão de Auditoria','Divisão de Controle e Orientação',
  'Divisão de Contabilidade','Divisão de Transparência e Tecnologia da Informação',
  'Divisão de Informações Estratégicas','Divisão de Integridade e Responsabilização',
  'Coordenação de Orientação e Normatização'];
const aliases = ['GAB','DAUD','DCO','DCON','DTTI','DIE'];
function setup() {
  const ctx=vm.createContext({});
  vm.runInContext(source,ctx);
  const architecture=[{processos:names.map((area,i)=>({id:`p${i}`,area,subprocessos:[]}))}];
  return {api:ctx.AreasArquitetura,architecture};
}
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
describe('Áreas com fonte na arquitetura',()=>{
  it('consolida os 9 nomes da planilha em 8 unidades sem mesclar a coordenação',()=>{
    const {api,architecture}=setup();
    architecture[0].processos[0].subprocessos.push({area:'Contabilidade'});
    architecture[0].processos.push({area:'divisão de auditoria'});
    api.migrate(architecture);
    expect(api.list(architecture)).toHaveLength(8);
    expect(architecture[0].processos[0].subprocessos[0].area).toBe('Divisão de Contabilidade');
    expect(api.list(architecture)).toContain('Coordenação de Orientação e Normatização');
  });
  it.each(aliases.map((sigla,i)=>[sigla,names[i]]))('corresponde %s a %s',(sigla,name)=>{
    const {api,architecture}=setup();
    expect(api.resolve(sigla,architecture)).toBe(name);
  });
  it('inclui áreas novas e remove áreas retiradas da arquitetura',()=>{
    const {api,architecture}=setup();
    architecture[0].processos.push({area:'Unidade nova'});
    expect(api.list(architecture)).toContain('Unidade nova');
    architecture[0].processos.pop();
    expect(api.list(architecture)).not.toContain('Unidade nova');
    expect(api.list([])).toEqual([]);
  });
  it('preserva vínculos antigos sem correspondência e impede novas áreas fora da lista',()=>{
    const {api,architecture}=setup();
    expect(api.resolve('Unidade antiga',architecture)).toBe('Unidade antiga');
    expect(api.valid('Unidade antiga','Unidade antiga',architecture)).toBe(true);
    expect(api.valid('Unidade inventada','DCO',architecture)).toBe(false);
    expect(api.valid('Divisão de Controle e Orientação','DCO',architecture)).toBe(true);
    expect(api.options('Unidade antiga',architecture,escape)).toContain('Unidade antiga (fora da arquitetura)');
    expect(api.options('',architecture,escape)).not.toContain('Unidade antiga');
  });
  it('normaliza áreas dos mapeamentos e indicadores sem perder áreas antigas',()=>{
    const {api,architecture}=setup();
    const records=[{area:'DCO'},{area:'Contabilidade'},{area:'Outra unidade'}];
    api.migrateRecords(records,architecture);
    expect(records.map(r=>r.area)).toEqual(['Divisão de Controle e Orientação','Divisão de Contabilidade','Outra unidade']);
  });
  it('escapa os nomes das opções e seleciona o nome completo correspondente',()=>{
    const {api,architecture}=setup();
    expect(api.options('DCON',architecture,escape)).toContain('value="Divisão de Contabilidade" selected');
    architecture[0].processos.push({area:'Unidade <teste>'});
    expect(api.options('',architecture,escape)).toContain('Unidade &lt;teste>');
  });
});
