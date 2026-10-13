const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
  const html=readFileSync('processos.html','utf8');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<div id="canvas" style="width:1200px;height:800px"></div>');
    await page.addScriptTag(process.env.BPMN_MODELER_PATH?{path:process.env.BPMN_MODELER_PATH}:{url:'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/bpmn-modeler.production.min.js'});
    await page.addScriptTag({content:html.slice(html.indexOf('function BpmnMilestoneRenderer('),html.indexOf('function bpmnEditorHTML('))});
    await page.addScriptTag({content:html.slice(html.indexOf('async function _bpmnGetSvg('),html.indexOf('async function renderBpmnToPng('))});
    const results=await page.evaluate(async()=>{
      window.bpmnModelers={};window.bpmnProcIds={};
      const mod=new BpmnJS(bpmnModelerOptions('#canvas'));
      await mod.createDiagram();
      const modeling=mod.get('modeling'),registry=mod.get('elementRegistry'),root=mod.get('canvas').getRootElement();
      const pool=modeling.createShape({type:'bpmn:Participant'},{x:600,y:400},root);
      modeling.resizeShape(pool,{x:100,y:150,width:1000,height:500});
      modeling.addLane(pool,'bottom');
      const lane=registry.getAll().find(el=>el.type==='bpmn:Lane');
      const phase=modeling.createShape({type:'bpmn:TextAnnotation',businessObject:mod.get('bpmnFactory').create('bpmn:TextAnnotation',{text:'Recebimento e análise','siga:milestone':true}),width:250,height:500},{x:400,y:400},pool,{autoResize:false});
      const task=modeling.createShape({type:'bpmn:Task',businessObject:mod.get('bpmnFactory').create('bpmn:Task',{name:'Conferir documentos'})},{x:phase.x,y:350},lane);
      const xml=(await mod.saveXML({format:true})).xml;
      const laneIds=registry.getAll().filter(el=>el.type==='bpmn:Lane').map(el=>el.id);
      mod.destroy();
      const results=[];
      for(const which of ['asis','tobe']){
        const process={id:'test',mod:{[which==='asis'?'bpmnAsIs':'bpmnToBe']:xml}};
        const diagrams=await _bpmnGetPdfDiagrams(which,process),svg=diagrams[0].svg;
        const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
        const groups=Array.from(doc.querySelectorAll('.djs-element'));
        const index=id=>groups.findIndex(group=>group.getAttribute('data-element-id')===id);
        const png=await svgStringToPng(svg);
        const image=new Image();image.src=png;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const context=canvas.getContext('2d');context.drawImage(image,0,0);
        const [vx,vy]=doc.documentElement.getAttribute('viewBox').split(' ').map(Number);
        // Check the actual rasterized header, rather than just SVG text presence.
        const pixel=Array.from(context.getImageData(Math.round((phase.x+10-vx)*2),Math.round((phase.y+10-vy)*2),1,1).data);
        const taskPixel=Array.from(context.getImageData(Math.round((phase.x-vx)*2),Math.round((task.y+10-vy)*2),1,1).data);
        results.push({taskPixel,which,count:diagrams.length,phaseAbovePool:index(phase.id)>index(pool.id),phaseAboveLanes:laneIds.every(id=>index(phase.id)>index(id)),taskAbovePhase:index(task.id)>index(phase.id),pixel,png});
      }
      document.body.innerHTML=results.map(r=>'<section style="break-after:page"><h1>'+r.which.toUpperCase()+'</h1><img style="width:100%" src="'+r.png+'"></section>').join('');
      return results.map(({png,...result})=>result);
    });
    for(const result of results){
      assert.equal(result.count,1);
      assert.ok(result.phaseAbovePool&&result.phaseAboveLanes&&result.taskAbovePhase,'Marcos devem aparecer acima dos fundos e abaixo das atividades: '+result.which);
      assert.ok(result.taskPixel.slice(0,3).every(channel=>channel>230),'As atividades devem continuar visíveis por cima da divisória da fase.');
      assert.deepEqual(result.pixel,[239,246,255,255],'O cabeçalho da fase deve manter sua cor na imagem do PDF: '+result.which);
    }
    const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    assert.deepEqual(errors,[]);
    console.log('POP: marcos AS IS e TO BE visíveis em SVG, PNG e documento PDF; fundos de piscinas/raias e atividades na ordem correta.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
