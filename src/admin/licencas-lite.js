/* Loaded by the original SIGA, using its existing Firebase Auth session. */
(()=>{
  const endpoint='https://us-central1-gesproc2.cloudfunctions.net/sigaLiteLicenseAdmin';
  const $=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  async function api(action,args={}){
    const user=globalThis._fb?.auth?.currentUser;if(!user)throw Error('Entre na sua conta do SIGA original.');
    const token=await user.getIdToken(),response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...args})});
    if(globalThis._fb?.auth?.currentUser?.uid!==user.uid)throw Error('A conta foi alterada. Reabra o painel de licenças.');
    if(!response.ok){const body=await response.json().catch(()=>({}));const messages={'invalid-cnpj':'Informe um CNPJ válido.','activated-organization-fixed':'O nome do órgão não pode ser alterado após a ativação.','single-installation-only':'Cada licença autoriza somente uma instalação.'};throw Error(messages[body.error]||(response.status===403?'Sua conta não está autorizada pela CAGE a administrar licenças.':response.status===401?'Entre novamente no SIGA.':'Não foi possível concluir a operação de licença. Confira os dados e a conexão.'));}
    return (await response.json()).result;
  }
  function button(label,handler){const el=$('button',label);el.type='button';el.className='btn';el.onclick=async()=>{el.disabled=true;try{await handler();}catch(e){alert(e.message);}finally{el.disabled=false;}};return el;}
  const date=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
  async function open(){
    const root=document.getElementById('siga-lite-licenses-content');if(!root)return;root.replaceChildren($('p','Carregando central…'));let records;try{records=await api('list');}catch(error){root.replaceChildren($('p',error.message));return;}root.replaceChildren();
    const box=$('section');box.id='siga-lite-licenses-panel';Object.assign(box.style,{background:'white',color:'#172436',padding:'28px',borderRadius:'12px'});root.append(box);
    box.append($('h2','Central de Licenças SIGA Lite'),$('p','Cada código autoriza uma única instalação. Após a primeira ativação, não poderá ser utilizado em outra máquina. A revogação será aplicada na próxima verificação online; sem conexão, o prazo máximo é de sete dias desde a última validação.'));
    const contract=$('details'),summary=$('summary','Contrato de licenciamento do SIGA Lite'),content=$('pre');content.style.whiteSpace='pre-wrap';content.textContent='Abra para consultar o termo completo.';contract.append(summary,content);
    for(const [extension,label] of [['txt','Baixar contrato em texto'],['rtf','Baixar contrato formatado']]){const download=$('a',label);download.href='src/admin/contrato-siga-lite.'+extension;download.download='Contrato-SIGA-Lite.'+extension;download.className='btn';contract.append(download);}
    let loaded=false;contract.addEventListener('toggle',async()=>{if(!contract.open||loaded)return;try{const response=await fetch('src/admin/contrato-siga-lite.txt',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar o contrato.');content.textContent=await response.text();loaded=true;}catch(error){content.textContent=error.message;}});box.append(contract);
    const form=$('form');form.style.margin='24px 0';const org=$('input'),abbreviation=$('input'),taxId=$('input'),notes=$('input');let editing=null;
    org.required=true;org.maxLength=300;org.placeholder='Nome oficial do órgão autorizado';org.style.width='45%';org.setAttribute('aria-label','Órgão autorizado');
    abbreviation.maxLength=100;abbreviation.setAttribute('aria-label','Órgão / sigla');taxId.required=true;taxId.maxLength=18;taxId.placeholder='00.000.000/0000-00';taxId.setAttribute('aria-label','CNPJ');
    notes.placeholder='Observações (opcional)';notes.maxLength=2000;notes.setAttribute('aria-label','Observações');
    const submit=$('button','Emitir licença');submit.type='submit';submit.className='btn';
    for(const [label,input] of [['Nome oficial do órgão',org],['Órgão / sigla (opcional)',abbreviation],['CNPJ',taxId],['Observações',notes]]){const container=$('label',label);container.style.display='block';input.className='fi';container.append(input);form.append(container);}form.append(submit);box.append(form);
    const cancel=button('Cancelar edição',()=>{editing=null;form.reset();org.readOnly=false;submit.textContent='Emitir licença';cancel.hidden=true;});cancel.hidden=true;form.append(cancel);
    const issued=$('div');issued.setAttribute('role','status');box.append(issued);
    form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{const result=await api(editing?'update-registration':'issue',{id:editing,organization:org.value,organizationAbbreviation:abbreviation.value,cnpj:taxId.value,notes:notes.value});issued.replaceChildren($('p',editing?'Cadastro atualizado.':'Licença emitida para '+result.organization+'. Copie o código agora: ele não será exibido novamente.'));if(result.code)issued.append($('code',result.code),button('Copiar código',()=>navigator.clipboard.writeText(result.code)));await render();editing=null;form.reset();org.readOnly=false;cancel.hidden=true;submit.textContent='Emitir licença';}catch(e){alert(e.message);}finally{submit.disabled=false;}};
    const list=$('div');box.append(list);
    async function render(page,previous=[]){list.replaceChildren();page||=await api('list');const data=[...previous,...page.items];list.append($('p','Licenças exibidas: '+data.length+'.'));
      const table=$('table');table.style.width='100%';const head=$('tr');['Órgão / nome','CNPJ','Situação','Emitida em','Ativada em','Código (final)','Ações'].forEach(title=>head.append($('th',title)));table.append(head);
      for(const record of data){const row=$('tr');[record.organizationAbbreviation?record.organizationAbbreviation+' — '+record.organization:record.organization,record.cnpj||'Não informado',({issued:'Emitida',activated:'Ativada',revoked:'Revogada'})[record.status]||record.status,date(record.createdAt),date(record.activatedAt),record.codeHint].forEach(value=>row.append($('td',value)));
        const actions=$('td');actions.append(button('Editar cadastro',()=>{editing=record.id;org.value=record.organization;org.readOnly=record.activationCount>0;abbreviation.value=record.organizationAbbreviation||'';taxId.value=record.cnpj||'';notes.value=record.notes||'';submit.textContent='Salvar cadastro';cancel.hidden=false;form.scrollIntoView({block:'start'});}));
        actions.append(button('Ver instalação',async()=>{const installs=await api('installations',{id:record.id});const target=$('div');target.append($('h3','Instalação de '+record.organization));for(const installation of installs)target.append($('p',installation.installationId+' — ativada: '+date(installation.activatedAt)+' — última consulta: '+date(installation.lastSeenAt)));if(!installs.length)target.append($('p','Nenhuma instalação ativada.'));target.append(button('Fechar detalhes',()=>target.remove()));list.append(target);}));
        actions.append(button(record.status!=='revoked'?'Revogar':'Reativar',async()=>{const action=record.status!=='revoked'?'revoke':'reactivate';const reason=prompt((action==='revoke'?'Revogar':'Reativar')+' a licença de '+record.organization+'? Informe o motivo:');if(!reason?.trim())return;await api(action,{id:record.id,reason});await render();}));
        row.append(actions);table.append(row);
      }list.append(table);if(page.nextCursor)list.append(button('Carregar mais licenças',async()=>{await render(await api('list',{cursor:page.nextCursor}),data);}));
    }
    await render(records);
  }
  let allowed=false;
  async function install(){const nav=document.getElementById('nb-licencaslite'),user=globalThis._fb?.auth?.currentUser;if(nav){nav.hidden=true;nav.style.display='none';}if(!user){allowed=false;return;}if(allowed){if(nav){nav.hidden=false;nav.style.display='';}return;}
    try{await api('list');allowed=true;if(nav){nav.hidden=false;nav.style.display='';}}catch{}
  }
  function attach(){const fb=globalThis._fb;if(!fb?.auth||!fb.onAuthStateChanged)return;clearInterval(timer);fb.onAuthStateChanged(fb.auth,()=>{allowed=false;document.getElementById('siga-lite-licenses-panel')?.remove();void install();});}
  const timer=setInterval(attach,1000);attach();globalThis.SigaLiteLicenses={open};
})();
