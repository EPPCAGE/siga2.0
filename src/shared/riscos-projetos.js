(function(scope){
  function chave(text){return String(text || '').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();}
  function itens(text){return [...new Set(String(text || '').split(/[\n;]+/).map(chave).filter(Boolean))];}
  function rows(projects,assessments={}){
    return (projects || []).flatMap(project=>itens(project.ideacao?.riscos_canvas).map(desc=>{
      const saved=(assessments[String(project.id)] || []).find(item=>item.chave===desc);
      const risk={...saved,desc};
      const canonical=(value,options)=>options.find(option=>Riscos.key(option)===Riscos.key(value)) || '';
      return {project,risk,chave:desc,processId:String(project.id),processName:project.nome || 'Projeto sem nome',
        area:project.gerente || 'Gerente não informado',macro:'Projetos',critical:'nao',
        prob:canonical(risk.prob,Riscos.probabilities),imp:canonical(risk.imp,Riscos.impacts),status:Riscos.status(risk)};
    }));
  }
  scope.RiscosProjetos={chave,itens,rows};
})(globalThis);
