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
  it('separa os detalhes por linhas com rótulos e não repete o título do risco',()=>{
    const row=search('riscos','emissao',data)[0];
    expect(row.detail).toBe('Processo: Auditar contratos\nMacroprocesso: Auditoria\nTratamento: Revisar prazo');
    expect(row.detail).not.toContain(row.title);
  });
  it('busca sem acentos e combina palavras em qualquer ordem',()=>{
    expect(search('riscos','prazo emissao',data)).toHaveLength(1);
    expect(search('riscos','atraso',data)).toHaveLength(1);
    expect(search('riscos','inexistente',data)).toHaveLength(0);
  });
  it('busca problemas pela descrição e solução',()=>expect(search('problemas','revisao',data)[0].target.id).toBe(1));
  it.each(['indicadores','processos','projetos'])('não disponibiliza a categoria removida %s',type=>expect(search(type,'',data)).toEqual([]));
  it('busca POPs dos processos e publicações e os inclui em Todos',()=>{
    expect(search('pops','relatorio',data)[0].target.kind).toBe('info-processo');
    expect(search('pops','fiscalizacao',data)[0].target.url).toBe('https://example.org/pop');
    expect(search('todos','fiscalizacao',data)[0].category).toBe('pops');
    expect(search('pops','manual',data)).toHaveLength(0);
  });
  it('abre a ficha interna para POP publicado vinculado ao processo, mesmo com URL externa',()=>{
    const linked={...data,publicacoes:[{titulo:'POP publicado',categoria:'POPs',arq_ids:['p'],url:'https://example.org/documento'}]};
    const row=search('pops','publicado',linked)[0];
    expect(row.target.kind).toBe('info-processo');
    expect(row.target.processId).toBe(1);
    expect(row.target.arqId).toBe('p');
    expect(row.target.url).toBeUndefined();
  });
  it('exibe FAQs, riscos e problemas apenas do processo selecionado, mesmo sem texto de busca',()=>{
    const selected={...data,processId:'1',processos:[{...data.processos[0],form:{faq:'P: Como auditar?\nR: Revisar contratos.'}},
      {id:2,nome:'Outro',ent:{riscos:[{desc:'Risco de outro processo'}]}}]};
    expect(search('todos','',selected).map(row=>row.category)).toEqual(['faq','riscos','problemas']);
    expect(search('todos','',selected).every(row=>row.target.id===1)).toBe(true);
    expect(search('faq','contratos',selected)).toHaveLength(1);
  });
});
