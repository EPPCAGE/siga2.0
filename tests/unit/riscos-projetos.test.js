import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const shared=readFileSync('src/shared/riscos.js','utf8')+'\n'+readFileSync('src/shared/riscos-projetos.js','utf8');
const moduleSource=readFileSync('src/processos/riscos-projetos-module.js','utf8');
const project={id:1,nome:'Obras',gerente:'Ana',ideacao:{riscos_canvas:'Sobrecarga\u200b\nRealocação; Apoio; Mudanças'}};
function setup(extra={}){
  const c={...extra};runInNewContext(shared,c);return c;
}
describe('riscos dos canvas de projetos',()=>{
  it('separa linhas e ponto e virgula em sete riscos, sem vazios ou duplicatas',()=>{
    const c=setup();const rows=c.RiscosProjetos.rows([project,{id:2,nome:'AIRA',ideacao:{riscos_canvas:'Integração; Profisco; Imagem;'}},{id:3}]);
    expect(rows).toHaveLength(7);expect(rows[0].risk.desc).toBe('Sobrecarga');
    expect(c.RiscosProjetos.itens('A\n A ;\n')).toEqual(['A']);
    expect(rows[4]).toMatchObject({processId:'2',processName:'AIRA',status:'sem_tratamento',prob:'',imp:''});
  });
  it('preserva avaliações após reordenar o canvas e separa projetos',()=>{
    const c=setup(),assessments={'1':[{chave:'Sobrecarga',prob:'Alta',imp:'Alto',status_tratamento:'em_tratamento'}]};
    const rows=c.RiscosProjetos.rows([{...project,ideacao:{riscos_canvas:'Novo; Sobrecarga'}},{...project,id:2}],assessments);
    expect(rows[1]).toMatchObject({prob:'Alta',imp:'Alto',status:'em_tratamento'});
    expect(rows[2].status).toBe('sem_tratamento');
    expect(c.RiscosProjetos.rows([{...project,ideacao:{riscos_canvas:'Novo'}}],assessments)).toHaveLength(1);
    expect(c.Riscos.filter(rows,{processId:'1',prob:'Alta'})).toHaveLength(1);
  });
  it('salva apenas a avaliação, preserva os outros riscos e não altera o canvas',async()=>{
    const writes=[];
    const evaluations=[{chave:'Outro',prob:'Baixa'}];
    const tx={get:vi.fn(async ref=>({exists:()=>true,data:()=>ref==='project'?project:{avaliacoes:evaluations}})),set:vi.fn((...args)=>writes.push(args))};
    const c=setup({riscosCanEdit:()=>true,fbReady:()=>true,fb:()=>({db:{},runTransaction:async(_db,fn)=>fn(tx)}),projetosRepository:{ref:()=> 'project'},configRepository:{ref:()=> 'assessment'}});
    runInNewContext(moduleSource,c);
    const row=c.RiscosProjetos.rows([project])[0],values={chave:row.chave,prob:'Alta'};
    await c.riscosProjetoSalvar(row,values);
    expect(writes).toEqual([['assessment',{avaliacoes:[evaluations[0],values]},{merge:true}]]);
    expect(project.ideacao.riscos_canvas).toContain('Sobrecarga');
  });
  it.each(['canvas','avaliacao','offline','leitor'])('bloqueia gravação quando há mudança ou falta de acesso: %s',async reason=>{
    const tx={get:vi.fn(async ref=>({exists:()=>true,data:()=>ref==='project'?{...project,ideacao:{riscos_canvas:reason==='canvas'?'Novo':project.ideacao.riscos_canvas}}:{avaliacoes:reason==='avaliacao'?[{chave:'Sobrecarga',prob:'Alta'}]:[]}})),set:vi.fn()};
    const c=setup({riscosCanEdit:()=>reason!=='leitor',fbReady:()=>true,navigator:{onLine:reason!=='offline'},fb:()=>({db:{},runTransaction:async(_db,fn)=>fn(tx)}),projetosRepository:{ref:()=> 'project'},configRepository:{ref:()=> 'assessment'}});
    runInNewContext(moduleSource,c);
    await expect(c.riscosProjetoSalvar(c.RiscosProjetos.rows([project])[0],{chave:'Sobrecarga'})).rejects.toThrow();
    expect(tx.set).not.toHaveBeenCalled();
  });
});
