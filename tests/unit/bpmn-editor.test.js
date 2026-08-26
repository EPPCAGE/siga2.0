import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('editor BPMN', () => {
  it('aplica automaticamente a cor em novas atividades', () => {
    expect(html).toContain("commandStack.shape.create.postExecuted");
    expect(html).toContain('_bpmnApplyElementColor(mod,current)');
  });

  it('mantém rótulos pretos no canvas normal e em tela cheia', () => {
    expect(css).toContain('.bpmn-canvas .djs-label,#bpmn-fs-canvas .djs-label');
    expect(css).toContain('fill:#000!important');
  });

  it('só confirma o salvamento depois da gravação no servidor', () => {
    expect(html).toContain('async function bpmnSave(which)');
    expect(html).toContain('const saved=await fbSaveAll()');
    expect(html).toContain("if(!saved) throw new Error('não foi possível confirmar a gravação no servidor')");
  });

  it('atualiza o cache de sincronização somente após o commit remoto', () => {
    const saveStart = html.indexOf('async function fbSaveAll()');
    const saveEnd = html.indexOf('// Save EmailJS config', saveStart);
    const save = html.slice(saveStart, saveEnd);
    expect(save).toContain('if(ops.length) await FirestoreRepositories.batchCommit(ops, 450)');
    expect(save).toContain('cacheUpdates.forEach(apply=>apply())');
    expect(save.indexOf('cacheUpdates.forEach(apply=>apply())')).toBeGreaterThan(save.indexOf('batchCommit(ops, 450)'));
  });
});
