const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const html = readFileSync('processos.html', 'utf8');
  const functions = html.slice(html.indexOf('function BpmnMilestoneRenderer('), html.indexOf('function bpmnEditorHTML('));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="canvas" style="width:1200px;height:900px"></div>');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/bpmn-modeler.production.min.js' });
    await page.addScriptTag({ content: functions });
    const result = await page.evaluate(async () => {
      const mod = new BpmnJS(bpmnModelerOptions('#canvas'));
      await mod.createDiagram();
      const modeling = mod.get('modeling');
      const registry = mod.get('elementRegistry');
      const root = mod.get('canvas').getRootElement();
      const bo = mod.get('bpmnFactory').create('bpmn:TextAnnotation', { text: 'Recebimento', 'siga:milestone': true });
      const milestone = modeling.createShape({ type: 'bpmn:TextAnnotation', businessObject: bo, width: 180, height: 500 }, { x: 400, y: 350 }, root);
      modeling.updateLabel(milestone, 'Análise e aprovação');
      const task = modeling.createShape({ type: 'bpmn:Task' }, { x: 450, y: 250 }, root);
      modeling.moveShape(milestone, { x: 100, y: 0 });
      const movedX = milestone.x;
      mod.get('commandStack').undo();
      const undoneX = milestone.x;
      mod.get('commandStack').redo();
      modeling.resizeShape(milestone, { x: milestone.x, y: milestone.y, width: 200, height: 600 });
      const { xml } = await mod.saveXML({ format: true });
      await mod.importXML(xml);
      const restored = registry.get(milestone.id);
      mod.get('canvas').zoom('fit-viewport');
      const taskGraphics = registry.getGraphics(registry.get(task.id));
      const point = new DOMPoint(task.width / 2, task.height / 2).matrixTransform(taskGraphics.getScreenCTM());
      const taskClickable = document.elementFromPoint(point.x, point.y)?.closest('[data-element-id]')?.getAttribute('data-element-id') === task.id;
      const { svg } = await mod.saveSVG();
      const restoredResult = {
        marked: restored.businessObject.get('siga:milestone'), text: restored.businessObject.text,
        height: restored.height, movedX, undoneX, xml, svg,
        taskExists: !!registry.get(task.id), taskClickable,
      };
      modeling.removeElements([restored]);
      restoredResult.deleted = !registry.get(milestone.id);
      mod.get('commandStack').undo();
      restoredResult.recovered = !!registry.get(milestone.id);
      mod.destroy();
      return restoredResult;
    });
    assert.equal(result.marked, true);
    assert.equal(result.text, 'Análise e aprovação');
    assert.equal(result.height, 600);
    assert.equal(result.movedX - result.undoneX, 100);
    assert.ok(result.taskExists && result.deleted && result.recovered);
    assert.ok(result.taskClickable, 'A divisão de fase não deve impedir a seleção das atividades.');
    assert.match(result.xml, /siga:milestone="true"/);
    assert.match(result.svg, /stroke-dasharray="7 5"/);
    assert.ok(result.svg.includes('aprovação'));
    console.log('Milestone: criação, edição, movimento, tamanho, XML, SVG, exclusão e desfazer validados.');
    if (process.argv[2] && process.argv[3]) {
      const bpm = [...readFileSync(process.argv[2])];
      const xml = readFileSync(process.argv[3], 'utf8');
      const imported = await page.evaluate(async ({ bpm, xml }) => {
        const phases = await bpmnBizagiMilestones(new Uint8Array(bpm));
        const mod = new BpmnJS(bpmnModelerOptions('#canvas'));
        await mod.importXML(xml);
        const originalElements = mod.get('elementRegistry').getAll().map(el => ({
          id: el.id, bounds: [el.x, el.y, el.width, el.height], waypoints: JSON.stringify(el.waypoints),
        }));
        const count = bpmnApplyBizagiMilestones(mod, phases);
        const registry = mod.get('elementRegistry');
        const originalUnchanged = originalElements.every(original => {
          const el = registry.get(original.id);
          return el && JSON.stringify([el.x, el.y, el.width, el.height]) === JSON.stringify(original.bounds)
            && JSON.stringify(el.waypoints) === original.waypoints;
        });
        const milestones = () => registry.getAll().filter(el => el.businessObject?.get('siga:milestone'));
        const geometryDetails = phases.map(phase => {
          const shape = milestones().find(el => el.businessObject.get('siga:bizagiId') === phase.id);
          const pool = registry.get('Id_' + phase.pool);
          return { name: phase.name, actual: [shape.x, shape.y, shape.width, shape.height],
            expected: [pool.x + phase.x, pool.y + phase.y, phase.width, phase.height] };
        });
        const geometry = geometryDetails.every(item => item.actual.every((value, i) => Math.abs(value - item.expected[i]) < 1));
        const duplicateCount = bpmnApplyBizagiMilestones(mod, phases);
        const { xml: saved } = await mod.saveXML({ format: true });
        await mod.importXML(saved);
        const restored = milestones().length;
        const duplicateAfterReload = bpmnApplyBizagiMilestones(mod, phases);
        const { svg } = await mod.saveSVG();
        mod.destroy();
        return { count, geometry, geometryDetails, originalUnchanged, duplicateCount, restored, duplicateAfterReload,
          names: phases.map(phase => phase.name), svg };
      }, { bpm, xml });
      assert.equal(imported.count, 8);
      assert.ok(imported.geometry, JSON.stringify(imported.geometryDetails));
      assert.ok(imported.originalUnchanged, 'O fluxo original deve manter suas posições e conexões.');
      assert.equal(imported.duplicateCount, 0);
      assert.equal(imported.restored, 8);
      assert.equal(imported.duplicateAfterReload, 0);
      for (const name of ['Planejamento', 'Preparo', 'Execução do evento', 'Pós-evento']) {
        assert.equal(imported.names.filter(value => value === name).length, 2);
        assert.ok(imported.svg.includes(name));
      }
      console.log('Bizagi real: 8 fases, coordenadas e tamanhos preservados, sem duplicação após reimportação.');
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
