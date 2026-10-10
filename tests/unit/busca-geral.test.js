import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../../src/shared/busca-geral.js',import.meta.url),'utf8'),context);
const search=context.BuscaGeral.search;
const data={processos:[{id:1,arq_id:'p',nome:'Auditar contratos',macro:'Auditoria',ent:{riscos:[{desc:'Atraso na emissão',tratamento:'Revisar prazo'}],prob:[{desc:'Falha no relatório',solucao:'Revisão'}]},form:{pop:{obj:'Emitir relatório'}}}],
  arquitetura:[{id:'a',nome:'Auditoria',processos:[{id:'p',nome:'Auditar contratos'},{id:'s',nome:'Inspecionar obras'}]}],
  kpis:[{nome:'Prazo de emissão',codigo:'I1',periodo:'jan/2026'}],
  projetos:[{id:2,nome:'Melhoria da emissão',status:'concluido',planejamento:{riscos:[{descricao:'Atraso na entrega'}]}}],
  publicacoes:[{titulo:'POP de fiscalização',categoria:'POPs',url:'https://example.org/pop'},{titulo:'Outro manual',categoria:'Manual'}]};
describe('busca geral',()=>{
  it('busca sem acentos e combina palavras em qualquer ordem',()=>{
    expect(search('riscos','prazo emissao',data)).toHaveLength(1);
    expect(search('riscos','atraso',data)).toHaveLength(2);
    expect(search('riscos','inexistente',data)).toHaveLength(0);
  });
  it('busca problemas pela descrição e solução',()=>expect(search('problemas','revisao',data)[0].target.id).toBe(1));
  it('inclui arquitetura sem duplicar processos mapeados',()=>{
    expect(search('processos','auditar',data)).toHaveLength(1);
    expect(search('processos','obras',data)[0].target.kind).toBe('arquitetura');
  });
  it('busca indicadores por código ou período e projetos concluídos',()=>{
    expect(search('indicadores','I1',data)).toHaveLength(1);
    expect(search('indicadores','jan/2026',data)).toHaveLength(1);
    expect(search('projetos','concluido',data)[0].target.id).toBe(2);
  });
  it('busca POPs nos processos e publicações',()=>{
    expect(search('pops','relatorio',data)).toHaveLength(1);
    expect(search('pops','fiscalizacao',data)[0].target.url).toBe('https://example.org/pop');
    expect(search('pops','manual',data)).toHaveLength(0);
  });
});
