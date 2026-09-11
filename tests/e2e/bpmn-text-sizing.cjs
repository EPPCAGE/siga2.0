const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const html = readFileSync('processos.html', 'utf8');
  const sizing = html.slice(html.indexOf('function _bpmnFitActivityText('), html.indexOf('function _bpmnInitModelerEvents('));
  const isActivity = html.slice(html.indexOf('function _bpmnIsActivity('), html.indexOf('function _bpmnApplyElementColor('));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="canvas" style="width:1200px;height:900px"></div>');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/bpmn-modeler.production.min.js' });
    await page.addScriptTag({ content: isActivity + sizing });
    const result = await page.evaluate(async () => {
      const mod = new BpmnJS({ container: '#canvas' });
      _bpmnInitActivityTextSizing(mod);
      await mod.createDiagram();
      const modeling = mod.get('modeling');
      const registry = mod.get('elementRegistry');
      const task = modeling.createShape({ type: 'bpmn:Task' }, { x: 300, y: 250 }, mod.get('canvas').getRootElement());
      modeling.updateLabel(task, 'Conferir dados');
      const original = { x: task.x, y: task.y, width: task.width, height: task.height };
      const longText = 'Conferir todos os documentos recebidos e verificar as informações fornecidas antes de encaminhar o processo para análise e aprovação pela equipe responsável';
      modeling.updateLabel(task, longText);
      const bounds = () => ({ x: task.x, y: task.y, width: task.width, height: task.height });
      const grown = bounds();
      const box = registry.getGraphics(task).querySelector('.djs-label').getBBox();
      const fits = box.y >= 0 && box.y + box.height <= task.height;
      mod.get('commandStack').undo();
      const undone = bounds();
      mod.get('commandStack').redo();
      const redone = bounds();
      const { xml } = await mod.saveXML({ format: true });
      await mod.importXML(xml);
      const restored = registry.get(task.id);
      const restoredHeight = restored.height;
      modeling.updateLabel(restored, 'Conferir dados');
      const shortenedHeight = restored.height;
      // Diagramas antigos com texto excedente também são corrigidos na importação.
      const oldXml = xml.replace(`height="${grown.height}"`, 'height="80"');
      await mod.importXML(oldXml);
      const importedHeight = registry.get(task.id).height;
      mod.destroy();
      return { original, grown, fits, undone, redone, restoredHeight, shortenedHeight, importedHeight };
    });
    assert.equal(result.original.height, 80);
    assert.ok(result.grown.height > 80);
    assert.equal(result.grown.width, result.original.width);
    assert.equal(result.grown.x, result.original.x);
    assert.equal(result.grown.y + result.grown.height / 2, result.original.y + 40);
    assert.ok(result.fits, 'texto deve caber verticalmente na caixa');
    assert.deepEqual(result.undone, result.original);
    assert.deepEqual(result.redone, result.grown);
    assert.equal(result.restoredHeight, result.grown.height);
    assert.equal(result.shortenedHeight, 80);
    assert.equal(result.importedHeight, result.grown.height);
    console.log('BPMN: altura, largura, texto, undo/redo e persistência validados.', result);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
