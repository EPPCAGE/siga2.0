const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
(async()=>{
  const html=readFileSync('projetos.html','utf8'),logic=readFileSync('projetos-logic.js','utf8');
  const tag=html.match(/<script src="([^"]*dompurify[^\"]*)" integrity="([^"]+)"/);
  assert.ok(tag,'DOMPurify precisa de URL fixa e integridade.');
  let script;
  if(process.env.DOMPURIFY_TEST_PATH)script=readFileSync(process.env.DOMPURIFY_TEST_PATH);
  else{const response=await fetch(tag[1]);assert.equal(response.ok,true);script=Buffer.from(await response.arrayBuffer());}
  assert.equal('sha384-'+createHash('sha384').update(script).digest('base64'),tag[2]);
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();await page.setContent('<main id="content"></main>');
    await page.addScriptTag({content:script.toString('utf8')});
    for(const name of ['projEsc','projSafeHtml','projDeveloperHtml'])await page.addScriptTag({content:logic.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]});
    const result=await page.evaluate(()=>{
      const content=document.getElementById('content');
      content.innerHTML=projSafeHtml('<p>Texto <strong>permitido</strong></p><img src=x onerror="window.injected=true"><a href="javascript:alert(1)">Link</a><iframe srcdoc="malicioso"></iframe><script>window.injected=true</script>');
      const safe=content.querySelector('strong')?.textContent==='permitido'&&!content.querySelector('script,iframe,[onerror],a[href^="javascript:"]');
      content.innerHTML=projDeveloperHtml('<button onclick="window.templateClicked=true">Abrir</button><script>window.injected=true</script>');
      content.querySelector('button').click();
      return {safe,templateWorks:window.templateClicked===true,scriptsRemoved:!content.querySelector('script'),injected:window.injected===true};
    });
    assert.deepEqual(result,{safe:true,templateWorks:true,scriptsRemoved:true,injected:false});
    console.log('DOMPurify atualizado: integridade, sanitização de conteúdo e handlers dos templates internos validados.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
