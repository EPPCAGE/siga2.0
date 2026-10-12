(function(scope){
  const categories={gestao:'Gestão',finalistico:'Finalísticos',apoio:'Apoio'};
  const key=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const deliveryLinks=[
    [/^orientacao\b/,'Aprimoramento e credibilidade da gestão'],
    [/^contabilidade\b/,'Qualidade da informação contábil'],
    [/^transparencia\b/,'Transparência'],
    [/^controle\b/,'Fortalecimento da estrutura de controle do Estado'],
    [/^auditoria\b/,'Contribuição para a viabilização de políticas públicas'],
    [/^promocao da integridade\b/,'Integridade pública e privada']
  ];
  function deliveriesFor(macro,deliveries){
    if((macro.categoria || category(macro))!=='finalistico')return [];
    const values=Array.isArray(macro.entregas_valor)?macro.entregas_valor:deliveryLinks.filter(([pattern])=>pattern.test(key(macro.nome))).map(([,delivery])=>delivery);
    if(!deliveries)return [...values];
    return values.map(value=>deliveries.find(delivery=>key(delivery)===key(value))).filter(Boolean);
  }
  function migrateDeliveryLinks(architecture){
    (architecture || []).forEach(macro=>{
      if(!Array.isArray(macro.entregas_valor))macro.entregas_valor=deliveriesFor(macro);
    });
  }
  function category(macro){
    if(categories[macro.categoria_cadeia])return macro.categoria_cadeia;
    const name=key(macro.nome);
    if(/estrateg|comunic|relacionamento institucional/.test(name))return 'gestao';
    if(/administrativ|pessoa|tecnologia|\btic\b|\bti\b|dados|informacoes/.test(name))return 'apoio';
    if(/contabil|contabilidade|auditoria|controle|integridade|transparencia|orientacao|suporte a tomada/.test(name))return 'finalistico';
    return '';
  }
  function initial(architecture,details={}){
    return {...details,nome:details.nome || 'Cadeia de valor',missao:details.missao || '',visao:details.visao || '',valores:details.valores || [],entregas:details.entregas || [],macros:(architecture || []).map(m=>({id:String(m.id),nome:m.nome,categoria:category(m),entregas_valor:deliveriesFor(m,details.entregas || [])}))};
  }
  function validate(chain){
    if(!chain.nome?.trim() || !chain.missao?.trim() || !chain.visao?.trim())throw Error('Informe o nome da cadeia, a missão e a visão.');
    if(!chain.valores.length || !chain.entregas.length)throw Error('Informe pelo menos um valor e uma entrega de valor.');
    if(!chain.macros.length)throw Error('Adicione pelo menos um macroprocesso.');
    const ids=new Set(),names=new Set();
    for(const m of chain.macros){
      if(!m.id || !m.nome?.trim() || !categories[m.categoria])throw Error('Informe nome e categoria de todos os macroprocessos.');
      if(ids.has(m.id) || names.has(key(m.nome)))throw Error('Os macroprocessos devem ter nomes e identificadores únicos.');
      ids.add(m.id);names.add(key(m.nome));
    }
    return chain;
  }
  function merge(architecture,chain){
    validate(chain);
    const destinations=chain.desdobramentos || {};
    const exists=id=>chain.macros.some(m=>String(m.id)===String(id));
    for(const macro of architecture){
      for(const process of macro.processos || []){
        const destination=destinations[String(process.id)] ?? macro.id;
        if(!exists(destination))throw Error('Escolha um macroprocesso válido para o processo "'+process.nome+'".');
      }
    }
    return chain.macros.map(m=>{
      const existing=architecture.find(old=>String(old.id)===String(m.id));
      const processes=architecture.flatMap(old=>(old.processos || []).filter(p=>String(destinations[String(p.id)] ?? old.id)===String(m.id)));
      return {...(existing || {id:m.id}),processos:processes,nome:m.nome.trim(),categoria_cadeia:m.categoria,entregas_valor:deliveriesFor(m,chain.entregas)};
    });
  }
  function renamedProcesses(processes,architecture){
    const units=new Map();architecture.forEach(m=>(m.processos || []).forEach(p=>{units.set(String(p.id),m.nome);(p.subprocessos || []).forEach(s=>units.set(String(s.id),m.nome));}));
    return processes.filter(p=>units.has(String(p.arq_id)) && p.macro!==units.get(String(p.arq_id))).map(p=>({process:p,macro:units.get(String(p.arq_id))}));
  }
  scope.CadeiaValor={categories,key,category,initial,validate,merge,renamedProcesses,deliveriesFor,migrateDeliveryLinks};
})(globalThis);
