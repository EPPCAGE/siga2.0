import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');

describe('subprocessos BPMN no PDF do POP', () => {
  it('percorre todas as raízes BPMN e exporta uma imagem de cada uma', () => {
    const start = html.indexOf('async function _bpmnRenderAllRoots(xml)');
    const end = html.indexOf('async function _bpmnGetPdfDiagrams', start);
    const renderAll = html.slice(start, end);

    expect(renderAll).toContain('canvas.getRootElements?.()');
    expect(renderAll).toContain('canvas.setRootElement(info.root)');
    expect(renderAll).toContain('bpmnExportSvg(viewer)');
  });

  it('insere fluxo principal e subprocessos na seção 10.0', () => {
    expect(html).toContain('10.0 Desenho do Processo');
    expect(html).toContain("const titulo=d.isSubProcess?`Subprocesso — ${_esc(d.nome)}`:'Fluxo principal'");
    expect(html).toContain('await _bpmnGetPdfDiagrams(\'asis\',p)');
    expect(html).toContain('bpmn-subprocess-page');
  });

  it('ordena o fluxo principal antes de subprocessos, inclusive aninhados', () => {
    const start = html.indexOf('function _bpmnPdfRootInfo(root,index)');
    const end = html.indexOf('// O saveSVG exporta apenas', start);
    const source = html.slice(start, end);
    const rootInfo = new Function(`${source}; return _bpmnPdfRootInfo;`)();
    const processo = {id:'p',type:'bpmn:Process',businessObject:{$type:'bpmn:Process',name:'Principal'}};
    const subPaiBo = {$type:'bpmn:SubProcess',name:'Conferir documentação'};
    const subFilhoBo = {$type:'bpmn:SubProcess',name:'Corrigir pendência',$parent:subPaiBo};
    const infos = [
      rootInfo({id:'s2',type:'bpmn:SubProcess',businessObject:subFilhoBo},2),
      rootInfo(processo,0),
      rootInfo({id:'s1',type:'bpmn:SubProcess',businessObject:subPaiBo},1),
    ].sort((a,b)=>Number(a.isSubProcess)-Number(b.isSubProcess)||a.depth-b.depth||a.index-b.index);

    expect(infos.map(i=>i.nome)).toEqual(['Principal','Conferir documentação','Corrigir pendência']);
  });
});
