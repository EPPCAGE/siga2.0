// Apply the same language to static forms and dynamically opened editors.
(()=>{
  const selector='textarea,input:not([type]),input[type="text"],input[type="search"],[contenteditable]:not([contenteditable="false"])';
  function configure(root){
    if(root.nodeType!==1 && root.nodeType!==9)return;
    const fields=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
    for(const field of fields){
      field.lang='pt-BR';
      if(field.matches('input') && (field.classList.contains('siga-date-native') || field.closest('.siga-date-field'))){field.spellcheck=false;field.setAttribute('autocorrect','off');continue;}
      // Browsers may ignore lang and use their configured dictionary instead.
      // Avoid false spelling errors and unintended replacements in Portuguese.
      field.spellcheck=false;field.setAttribute('autocorrect','off');
    }
  }
  function start(){
    document.documentElement.lang='pt-BR';document.documentElement.spellcheck=false;document.body.lang='pt-BR';document.body.spellcheck=false;document.body.setAttribute('autocorrect','off');
    configure(document);
    new MutationObserver(changes=>{for(const change of changes){if(change.type==='attributes')configure(change.target);else for(const node of change.addedNodes)configure(node);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['contenteditable']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
