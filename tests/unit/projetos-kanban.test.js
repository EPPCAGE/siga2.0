import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const source=readFileSync('projetos-logic.js','utf8');
const context=vm.createContext({projCanWriteSchedule:()=>true,projEsc:value=>String(value||'').replaceAll('<','&lt;'),projFormatDate:value=>value||'—'});
for(const name of ['projKanbanTasks','projRenderKanban']) vm.runInContext(source.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0],context);
describe('Kanban do projeto',()=>{
  it('classifica atividades pelo progresso e pela conclusão sem duplicar agrupadores',()=>{
    const tasks=[{nome:'Grupo',subtarefas:[{nome:'Pendente',conclusao:0},{nome:'Executando',conclusao:35},{nome:'Finalizada',conclusao:100}]},{nome:'Concluída',concluida:true}];
    const rows=context.projKanbanTasks(tasks);
    expect(Array.from(rows,row=>row.status)).toEqual(['pendentes','andamento','concluidas','concluidas']);
    expect(rows[1].path).toBe('0.1');
    expect(rows[1].parentName).toBe('Grupo');
    expect(tasks[0].subtarefas[1].conclusao).toBe(35);
  });
  it('mostra responsável, prazo, atraso e escapa nomes',()=>{
    const html=context.projRenderKanban({execucao:{tarefas:[{nome:'<Atividade>',responsavel:'Maria',dt_fim:'2000-01-01'}]}});
    expect(html).toContain('&lt;Atividade>');
    expect(html).toContain('Responsável: Maria');
    expect(html).toContain('Atrasada');
    expect(html).toContain('Em andamento');
  });
  it('mostra as três colunas vazias quando não há atividades',()=>{
    expect(context.projRenderKanban({}).match(/Nenhuma atividade nesta coluna/g)).toHaveLength(3);
  });
});
