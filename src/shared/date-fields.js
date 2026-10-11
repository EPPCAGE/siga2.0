// Brazilian display format; existing date inputs remain the ISO source of truth.
(()=>{
  const values=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  let sequence=0;
  function display(iso){return /^\d{4}-\d{2}-\d{2}$/.test(iso)?iso.split('-').reverse().join('/'):'';}
  function parse(text){
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if(!match)return '';
    const [,day,month,year]=match,iso=year+'-'+month+'-'+day;
    const date=new Date(iso+'T12:00:00Z');
    return Number(year)>0 && !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===iso?iso:'';
  }
  function enhance(input){
    if(input.dataset.dateBr || input.type!=='date')return;
    input.dataset.dateBr='1';
    const wrapper=document.createElement('span');wrapper.className='siga-date-field';
    const text=document.createElement('input');text.type='text';text.className=input.className;
    text.style.cssText=input.style.cssText;text.style.width='100%';text.style.paddingRight='32px';
    text.placeholder='DD/MM/AAAA';text.inputMode='numeric';text.autocomplete='off';text.maxLength=10;
    text.id=(input.id || 'siga-date-'+(++sequence))+'-display';
    const labels=Array.from(input.labels || []);
    const nearby=input.closest('.fg,.proj-fg')?.querySelector('label');
    if(!labels.length && nearby)labels.push(nearby);
    for(const label of labels){if(!label.id)label.id='siga-date-label-'+(++sequence);if(label.htmlFor===input.id)label.htmlFor=text.id;}
    if(labels.length)text.setAttribute('aria-labelledby',labels.map(l=>l.id).join(' '));
    else text.setAttribute('aria-label',input.getAttribute('aria-label') || input.title || 'Data (DD/MM/AAAA)');
    text.title=input.title || 'Data no formato DD/MM/AAAA';
    const calendar=document.createElement('button');calendar.type='button';calendar.className='siga-date-calendar';
    calendar.setAttribute('aria-label','Selecionar data no calendário');calendar.title='Selecionar data';
    calendar.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>';
    input.parentNode.insertBefore(wrapper,input);wrapper.append(text,input,calendar);
    input.classList.add('siga-date-native');input.tabIndex=-1;input.setAttribute('aria-hidden','true');
    function sync(){
      text.value=display(values.get.call(input));text.disabled=input.disabled;text.readOnly=input.readOnly;text.required=input.required;
      calendar.disabled=input.disabled || input.readOnly;
      text.setCustomValidity(input.validationMessage);text.setAttribute('aria-invalid',String(!input.validity.valid));
    }
    Object.defineProperty(input,'value',{configurable:true,get(){return values.get.call(this);},set(value){values.set.call(this,value);this.setCustomValidity('');sync();}});
    function update(){
      const raw=text.value.trim(),iso=parse(raw);
      values.set.call(input,iso);
      const error=raw && !iso?'Informe uma data válida no formato DD/MM/AAAA.':'';
      input.setCustomValidity(error);text.setCustomValidity(error || input.validationMessage);
      text.setAttribute('aria-invalid',String(!text.validity.valid));
      return !error && input.validity.valid;
    }
    text.addEventListener('input',()=>{
      // Numeric keyboards also work: 15032027 becomes 15/03/2027.
      if(/^[\d/]*$/.test(text.value)){
        const previous=text.value,caret=text.selectionStart,digits=previous.replaceAll('/','').slice(0,8);
        text.value=[digits.slice(0,2),digits.slice(2,4),digits.slice(4)].filter(Boolean).join('/');
        const position=caret===previous.length?text.value.length:Math.min(caret,text.value.length);
        text.setSelectionRange(position,position);
      }
      if(update())input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    text.addEventListener('change',()=>{if(update())input.dispatchEvent(new Event('change',{bubbles:true}));else text.reportValidity();});
    text.addEventListener('keydown',event=>{
      if(typeof input.onkeydown==='function')input.onkeydown.call(input,event);
      if(event.key==='Enter' && !update()){event.preventDefault();text.reportValidity();}
    });
    input.addEventListener('input',sync);input.addEventListener('change',sync);
    input.addEventListener('focus',()=>text.focus());input.addEventListener('invalid',event=>{event.preventDefault();text.focus();text.reportValidity();});
    calendar.addEventListener('click',()=>{try{input.showPicker();}catch{ text.focus(); }});
    input.form?.addEventListener('reset',()=>setTimeout(sync,0));
    new MutationObserver(sync).observe(input,{attributes:true,attributeFilter:['value','disabled','readonly','required','min','max']});
    sync();
  }
  function scan(root){if(root.nodeType!==1 && root.nodeType!==9)return;if(root.matches?.('input[type="date"]'))enhance(root);root.querySelectorAll('input[type="date"]:not([data-date-br])').forEach(enhance);}
  function start(){scan(document);new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)scan(node);}).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
