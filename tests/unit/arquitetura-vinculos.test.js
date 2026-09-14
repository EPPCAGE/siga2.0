import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html=readFileSync(new URL('../../processos.html',import.meta.url),'utf8');
const source=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const helpers=source('function _arqEntries()', 'let _arqSaveEnabled');
const sync=source('function syncArquiteturaProcessos()', 'function _normIntel');
const separate=source('function _separarItemArqDuplicado(', 'function _rArqDuplicateWarning(');
const filter=source('function filtrarProcArq()', 'function previewProcArq()');
const transfer=source('function _transferirProcArq(', '// ── Modal simples');

describe('transferência entre macroprocessos',()=>{
  function setup(){
    const item={id:'p1',nome:'Processo',proc_id:1,subprocessos:[{id:'s1',proc_id:2}]};
    const origem={id:'m1',nome:'Origem',processos:[item]};
    const destino={id:'m2',nome:'Destino',processos:[]};
    return {item,origem,destino,ARQUITETURA:[origem,destino],
      processos:[{id:1,arq_id:'p1',macro:'Origem',mod:{bpmn:'preservado'}},{id:2,arq_id:'s1',macro:'Origem'},{id:3,arq_id:'outro',macro:'Origem'}],
      isEP:()=>true,toast:()=>{}};
  }
  const move=context=>runInNewContext(`${helpers}\n${transfer}\n_transferirProcArq(item,origem,destino)`,context);
  it('move o processo com subprocessos, preservando identidade e mapeamentos',()=>{
    const context=setup();
    expect(move(context)).toBe(true);
    expect(context.origem.processos).toEqual([]);
    expect(context.destino.processos[0]).toBe(context.item);
    expect(context.item.subprocessos[0].proc_id).toBe(2);
    expect(context.processos.map(p=>p.macro)).toEqual(['Destino','Destino','Origem']);
    expect(context.processos[0].mod.bpmn).toBe('preservado');
  });
  it.each(['permissao','destino','duplicado'])('recusa transferência inválida: %s',reason=>{
    const context=setup();
    if(reason==='permissao')context.isEP=()=>false;
    if(reason==='destino')context.destino=undefined;
    if(reason==='duplicado')context.destino.processos.push({id:'s1',subprocessos:[]});
    const before=JSON.stringify([context.ARQUITETURA,context.processos]);
    expect(move(context)).toBe(false);
    expect(JSON.stringify([context.ARQUITETURA,context.processos])).toBe(before);
  });
  it('mantém a estrutura ao salvar no mesmo macroprocesso',()=>{
    const context=setup();
    context.destino=context.origem;
    expect(move(context)).toBe(true);
    expect(context.origem.processos).toHaveLength(1);
  });
});

function fixture(){
  const original={id:'ap200',nome:'Gerenciar afastamentos, diárias e passagens',subprocessos:[],proc_id:7};
  const recent={id:'ap200',nome:'Emitir certificado de capacidade econômico-financeira de licitantes',subprocessos:[],proc_id:7};
  return {
    ARQUITETURA:[{id:'m1',nome:'Gestão Administrativa',processos:[original]},
      {id:'m2',nome:'Contabilidade',processos:[recent]}],
    processos:[{id:7,arq_id:'ap200',nome:original.nome,macro:'Gestão Administrativa',mod:{bpmnAsIs:'diagrama preservado'}}],
    crypto:{randomUUID},fbAutoSave:()=>{}, original,recent
  };
}

describe('identidade dos processos da arquitetura',()=>{
  it.each(['m','ap','s'])('gera IDs de %s distintos entre sessões e usuários',prefix=>{
    const context=fixture();
    const first=runInNewContext(`${helpers};_novoArqId('${prefix}')`,context);
    const second=runInNewContext(`${helpers};_novoArqId('${prefix}')`,fixture());
    expect(first).not.toBe(second);
    expect(first).not.toBe('ap200');
  });

  it('não reutiliza IDs já reservados por mapeamentos mesmo fora da arquitetura',()=>{
    const context=fixture();
    context.processos.push({arq_id:'ap-collision'});
    const values=['collision','fresh'];
    context.crypto={randomUUID:()=>values.shift()};
    expect(runInNewContext(`${helpers};_novoArqId('ap')`,context)).toBe('ap-fresh');
  });

  it('não renomeia nem muda o macroprocesso do mapeamento por um ID ambíguo',()=>{
    const context=fixture();
    const before=structuredClone(context.processos);
    runInNewContext(`${helpers}\n${sync}\nsyncArquiteturaProcessos()`,context);
    expect(context.processos).toEqual(before);
  });

  it('libera apenas o item escolhido e o inclui na lista de novos mapeamentos',()=>{
    const context=fixture();
    const before=structuredClone(context.processos);
    const select={innerHTML:''};
    context.document={getElementById:id=>id==='novo-macro'?{value:'m2'}:id==='novo-proc-sel'?select:{style:{}}};
    context.esc=value=>value;
    runInNewContext(`${helpers}\n${sync}\n${separate}\n${filter}
      _separarItemArqDuplicado(recent);
      syncArquiteturaProcessos();
      filtrarProcArq();`,context);
    expect(context.recent.id).not.toBe('ap200');
    expect(context.recent.proc_id).toBeNull();
    expect(context.original.id).toBe('ap200');
    expect(context.original.proc_id).toBe(7);
    expect(context.processos).toEqual(before);
    expect(select.innerHTML).toContain(context.recent.nome);
    expect(select.innerHTML).toContain(context.recent.id);
    const saved=JSON.parse(JSON.stringify(context.ARQUITETURA));
    expect(saved[1].processos[0].id).toBe(context.recent.id);
  });

  it('recusa separar um item que não compartilha ID',()=>{
    const context=fixture();
    context.recent.id='ap-unique';
    expect(runInNewContext(`${helpers}\n${separate}\n_separarItemArqDuplicado(recent)`,context)).toBe(false);
    expect(context.recent.id).toBe('ap-unique');
  });
});
