const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
(async()=>{
  const browser=await chromium.launch();
  try{
    for(const locale of ['en-US','pt-BR']){
      const page=await browser.newPage({locale,viewport:{width:390,height:844}});
      await page.setContent('<form><label for="start">Data de início</label><input type="date" id="start" value="2026-10-11" required><label>Previsão<input type="date" id="end" readonly></label><button type="submit">Salvar</button></form><div id="dynamic"></div>');
      await page.addStyleTag({path:'src/shared/date-fields.css'});
      await page.addScriptTag({path:'src/shared/date-fields.js'});
      await page.evaluate(()=>{
        window.saved=[];window.changed=[];
        document.querySelector('form').onsubmit=e=>{e.preventDefault();saved.push(document.getElementById('start').value);};
        document.getElementById('start').oninput=function(){const date=new Date(this.value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+90);document.getElementById('end').value=date.toISOString().slice(0,10);};
        document.getElementById('start').onchange=function(){changed.push(this.value);};
      });
      assert.equal(await page.inputValue('#start-display'),'11/10/2026');
      await page.getByLabel('Data de início',{exact:true}).last().fill('29/02/2024');
      await page.locator('#start-display').press('Tab');
      assert.equal(await page.inputValue('#start'),'2024-02-29');
      assert.equal(await page.inputValue('#end-display'),'29/05/2024');
      await page.getByRole('button',{name:'Salvar',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>saved),['2024-02-29']);
      assert.deepEqual(await page.evaluate(()=>changed),['2024-02-29']);
      await page.fill('#start-display','31/02/2026');
      assert.equal(await page.locator('#start-display').evaluate(input=>input.checkValidity()),false);
      await page.getByRole('button',{name:'Salvar',exact:true}).click();
      assert.equal(await page.evaluate(()=>saved.length),1);
      await page.evaluate(()=>{const input=document.getElementById('start');input.min='2026-01-01';input.value='2026-10-15';});
      assert.equal(await page.inputValue('#start-display'),'15/10/2026');
      await page.fill('#start-display','31/12/2025');
      assert.equal(await page.locator('#start-display').evaluate(input=>input.checkValidity()),false);
      await page.evaluate(()=>document.getElementById('start').disabled=true);
      await page.waitForFunction(()=>document.getElementById('start-display').disabled);
      await page.evaluate(()=>document.getElementById('dynamic').innerHTML='<label for="risk-deadline">Prazo</label><input type="date" id="risk-deadline" value="2027-01-02">');
      await page.waitForSelector('#risk-deadline-display');
      assert.equal(await page.inputValue('#risk-deadline-display'),'02/01/2027');
      await page.fill('#risk-deadline-display','15032027');
      assert.equal(await page.inputValue('#risk-deadline-display'),'15/03/2027');
      assert.equal(await page.inputValue('#risk-deadline'),'2027-03-15');
      await page.evaluate(()=>{document.getElementById('risk-deadline').showPicker=()=>{window.pickerOpened=true;};});
      await page.locator('#dynamic .siga-date-calendar').click();
      assert.equal(await page.evaluate(()=>pickerOpened),true);
      await page.evaluate(()=>{const input=document.getElementById('risk-deadline');input.value='2027-04-20';input.dispatchEvent(new Event('change',{bubbles:true}));});
      assert.equal(await page.inputValue('#risk-deadline-display'),'20/04/2027');
      await page.fill('#risk-deadline-display','');
      assert.equal(await page.inputValue('#risk-deadline'),'');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.close();
    }
    for(const file of ['processos.html','projetos.html'])assert.ok(readFileSync(file,'utf8').includes('src/shared/date-fields.js'));
    console.log('Datas: DD/MM/AAAA em pt-BR e en-US, ISO, cálculos, validação, calendário, campos dinâmicos e responsividade OK.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
