(function(scope){
  const dimensions=['Documentação e Padronização','Tecnologia','Alinhamento Estratégico','Indicadores','Melhoria Contínua','Cultura Organizacional'];
  const rows=[
    [0,'Os processos da CAGE possuem documentação formal elaborada (ex: POP, Manual, Fluxograma)?',[
      'Não, os processos não são documentados ou a documentação é muito rara e informal.',
      'Sim, algumas equipes documentam seus próprios processos para garantir a consistência do seu trabalho.',
      'Sim, a CAGE utiliza um conjunto de documentos de processo padrão.',
      'Sim, e a documentação é detalhada e rigorosamente controlada, servindo como base para auditorias que garantem a execução uniforme do processo.',
      'Sim, e a documentação é usada como um modelo digital para simular e testar o impacto de melhorias inovadoras antes de sua implementação.']],
    [0,'Os processos são padronizados de forma clara e seguidos por todos os envolvidos?',[
      'Não, não há um padrão claro e cada pessoa executa o trabalho de sua própria maneira.',
      'O processo é padronizado e seguido dentro da minha equipe, mas outras equipes podem fazer diferente.',
      'Sim, a organização possui processos padrão que são a base para o trabalho de todos, embora possam ser adaptados.',
      'Sim, o cumprimento do padrão é monitorado quantitativamente para reduzir a variação nos resultados.',
      'Sim, os padrões são continuamente desafiados e aprimorados por meio de inovações proativas.']],
    [0,'A documentação dos processos da CAGE é atualizada periodicamente?',[
      'Não, a documentação raramente ou nunca é atualizada.',
      'Ela é atualizada quando uma equipe percebe a necessidade, para garantir suas entregas.',
      'Sim, existe um processo organizacional para revisar e atualizar os documentos de processo padrão.',
      'Sim, a atualização é acionada quando a análise de dados mostra que o processo não atende mais às metas de desempenho.',
      'Sim, a atualização é um processo contínuo, impulsionado pela incorporação de inovações.']],
    [0,'Os processos são revisados e atualizados com base em feedbacks e resultados?',[
      'Não, os processos raramente são revisados, independentemente dos feedbacks ou resultados.',
      'Sim, as equipes revisam os processos com base em seus próprios resultados e feedbacks diretos.',
      'Sim, existe um processo formal para coletar feedbacks e usar os resultados para melhorar os processos padrão da organização.',
      'Sim, a revisão é baseada em análises quantitativas dos resultados para identificar as causas da variação de desempenho.',
      'Sim, são utilizados feedbacks e resultados para buscar inovações que possam transformar fundamentalmente os processos.']],
    [0,'A documentação dos processos está disponível de forma fácil e acessível a todos os envolvidos?',[
      'Não, é difícil encontrar a documentação; ela não é centralizada nem de fácil acesso.',
      'Ela está acessível para a equipe que executa o processo, mas não necessariamente para outras áreas.',
      'Sim, existe um repositório de processos padrão da organização onde todos podem consultar a documentação.',
      'Sim, o acesso é fácil e muitas vezes integrado às ferramentas que usamos para executar e monitorar o processo.',
      'Sim, a documentação relevante é entregue de forma proativa e contextualizada no momento da necessidade.']],
    [1,'Nas atividades realizadas pela CAGE, são utilizados recursos tecnológicos para automatizar os procedimentos?',[
      'Não, a maioria dos procedimentos é manual e não é automatizada.',
      'Sim, algumas ferramentas são usadas para automatizar tarefas específicas dentro de algumas equipes.',
      'Sim, a CAGE utiliza sua infraestrutura de tecnologia e sistemas para automatizar os processos padrão.',
      'Sim, a tecnologia é usada para automatizar a coleta de dados e o monitoramento quantitativo do desempenho do processo.',
      'Sim, a CAGE busca e utiliza ativamente tecnologias inovadoras (IA, RPA) para automatizar tarefas complexas e otimizar processos.']],
    [1,'A interação entre os sistemas que a CAGE utiliza torna minha rotina mais eficiente e facilita o fluxo de informações?',[
      'Não, os sistemas não são integrados, o que exige retrabalho manual e dificulta o fluxo de informações.',
      'A integração é limitada e funciona bem apenas para as necessidades de algumas equipes.',
      'Sim, a CAGE fornece sistemas que se integram para suportar o fluxo de trabalho dos processos padrão.',
      'Sim, a integração dos sistemas permite um fluxo de dados contínuo que é usado para gerenciar o desempenho do processo de ponta a ponta.',
      'Sim, a integração é flexível e permite a rápida incorporação de novas tecnologias para inovar nos processos.']],
    [1,'A organização investe em novas tecnologias para melhorar os processos?',[
      'Não, o investimento é mínimo e focado apenas em manter os sistemas atuais funcionando.',
      'O investimento é reativo e geralmente atende a uma necessidade urgente de uma equipe ou área específica.',
      'Sim, existe um planejamento de investimento em tecnologia para suportar e melhorar os processos padrão da organização.',
      'Sim, o investimento é priorizado com base em análises quantitativas que demonstram o retorno esperado na capacidade e desempenho do processo.',
      'Sim, a organização busca e investe proativamente em tecnologias de ponta como um meio de alcançar inovação e vantagem competitiva.']],
    [1,'A tecnologia é utilizada para automatizar tarefas repetitivas e reduzir erros?',[
      'Não, tarefas repetitivas são executadas manualmente, resultando em erros frequentes.',
      'Sim, mas a automação é aplicada de forma pontual para resolver os problemas mais críticos das equipes.',
      'Sim, os processos padrão da organização são projetados com automação para reduzir tarefas repetitivas e erros comuns.',
      'Sim, a eficácia da automação na redução de erros e custos é medida e gerenciada quantitativamente.',
      'Sim, a automação inteligente (como RPA e IA) é usada não apenas para reduzir erros, mas para eliminar proativamente as causas da ineficiência.']],
    [2,'Os processos da CAGE estão alinhados à estratégia da organização?',[
      'Não há uma conexão clara ou visível entre os processos e a estratégia da organização.',
      'O alinhamento é localizado; os processos de algumas equipes atendem a metas locais, mas sem uma conexão clara com a estratégia geral da CAGE.',
      'Sim, o conjunto de processos padrão da CAGE foi desenvolvido para suportar os objetivos estratégicos da organização.',
      'Sim, e o alinhamento é gerenciado quantitativamente, com os objetivos estratégicos desdobrados em metas de desempenho para os processos.',
      'Sim, e o alinhamento é uma via de mão dupla: a estratégia guia a inovação nos processos, e os resultados dos processos influenciam a formulação da futura estratégia.']],
    [2,'Os processos da CAGE são revistos e ajustados quando a estratégia da organização muda?',[
      'Não, os processos geralmente permanecem os mesmos, mesmo após mudanças na estratégia.',
      'Os ajustes são lentos, reativos e acontecem de forma isolada em cada área, sem uma coordenação central.',
      'Sim, a CAGE possui um processo organizacional para revisar e ajustar seu conjunto de processos padrão em resposta a mudanças estratégicas.',
      'Sim, e o impacto da mudança estratégica na capacidade dos processos é analisado quantitativamente para orientar os ajustes necessários.',
      'Sim, os processos da CAGE são projetados para serem ágeis e se adaptarem rapidamente, usando simulações para antecipar e planejar os ajustes.']],
    [2,'Os colaboradores compreendem como seus processos contribuem para os objetivos da CAGE?',[
      'Não, a maioria dos colaboradores não compreende essa conexão.',
      'Os colaboradores entendem como contribuem para os objetivos de sua própria equipe.',
      'Sim, a organização comunica como os processos padrão contribuem para os objetivos gerais da CAGE.',
      'Sim, os colaboradores acompanham indicadores de desempenho que mostram quantitativamente sua contribuição para os objetivos.',
      'Sim, os colaboradores são incentivados a propor inovações nos processos com base em sua compreensão dos objetivos da CAGE.']],
    [2,'São realizadas análises periódicas para avaliar o alinhamento dos processos com a estratégia?',[
      'Não, esse tipo de análise não é realizado.',
      'A análise é informal e acontece apenas dentro de algumas equipes ou departamentos.',
      'Sim, a organização conduz análises periódicas para garantir que o conjunto de processos padrão permaneça alinhado à estratégia.',
      'Sim, e essa análise utiliza dados quantitativos de desempenho para avaliar se a capacidade do processo ainda atende às necessidades estratégicas.',
      'Sim, a análise é contínua, buscando proativamente oportunidades de inovação nos processos para melhor impulsionar a estratégia.']],
    [3,'Os processos da CAGE possuem indicadores de desempenho?',[
      'Não, a medição de desempenho dos processos não é uma prática institucionalizada; a avaliação é subjetiva.',
      'Sim, mas os indicadores são definidos e utilizados de forma inconsistente por cada equipe ou departamento para gerenciar suas próprias metas.',
      'Sim, a CAGE possui um conjunto de indicadores de desempenho padrão para monitorar seus principais processos.',
      'Sim, e os indicadores são utilizados para a análise estatística da capacidade e desempenho dos processos, permitindo previsões.',
      'Sim, e os indicadores são usados para identificar proativamente oportunidades de inovação e medir o retorno sobre o investimento dessas melhorias.']],
    [3,'Os indicadores dos processos da CAGE são coletados e analisados regularmente?',[
      'Não, a coleta e análise de indicadores não é uma prática regular.',
      'Sim, algumas equipes coletam e analisam seus próprios indicadores para gerenciar o trabalho do dia a dia.',
      'Sim, existe uma rotina organizacional para a coleta e reporte dos indicadores dos processos padrão.',
      'Sim, a análise é regular e usa métodos estatísticos para entender a variação e prever o desempenho futuro.',
      'Sim, a análise é contínua e automatizada, fornecendo insights em tempo real para a tomada de decisão e inovação.']],
    [3,'São utilizados dados para tomar decisões e implementar melhorias nos processos da CAGE?',[
      'Não, as decisões são geralmente baseadas em intuição ou experiência pessoal.',
      'Os dados são usados para tomar decisões operacionais dentro da minha equipe.',
      'Sim, os dados dos indicadores são usados nas discussões para identificar problemas e planejar melhorias nos processos padrão.',
      'Sim, as decisões de melhoria são estritamente baseadas em análises quantitativas da causa raiz dos problemas de desempenho.',
      'Sim, usamos análises preditivas e dados para identificar oportunidades de inovação antes mesmo que os problemas ocorram.']],
    [3,'Os indicadores utilizados nos processos da CAGE são relevantes e confiáveis?',[
      'Não, os indicadores, se existem, são pouco confiáveis ou não medem o que é realmente importante.',
      'Eles são relevantes para o gerenciamento de algumas equipes, mas sua confiabilidade pode ser questionável.',
      'Sim, os indicadores são padronizados e sua coleta segue regras que garantem maior confiabilidade.',
      'Sim, a relevância e a confiabilidade dos indicadores são validadas estatisticamente para garantir um gerenciamento quantitativo preciso.',
      'Sim, e os próprios indicadores são revisados e inovados continuamente para garantir que reflitam as novas capacidades do processo.']],
    [4,'Os clientes dos processos da CAGE estão satisfeitos com a qualidade das entregas?',[
      'A satisfação é baixa e inconsistente; há reclamações frequentes.',
      'A satisfação é gerenciada no nível da equipe; algumas equipes se esforçam para atender aos seus usuários diretos.',
      'A satisfação é monitorada por meio de pesquisas e feedbacks formais, como parte do gerenciamento do processo padrão.',
      'A satisfação do usuário é correlacionada quantitativamente com o desempenho do processo, e as metas de satisfação são gerenciadas.',
      'Buscamos proativamente inovar para exceder as expectativas dos usuários, não apenas para satisfazê-las.']],
    [4,'Os servidores da CAGE são incentivados a sugerir melhorias nos processos?',[
      'Não, não há incentivo e as sugestões raramente são consideradas.',
      'O incentivo existe dentro de algumas equipes, liderado pelo gestor direto.',
      'Sim, a CAGE possui programas formais (caixa de sugestões, workshops) para incentivar melhorias nos processos padrão.',
      'Sim, e os servidores são incentivados a usar dados e análises para fundamentar suas sugestões de melhoria.',
      'Sim, o incentivo faz parte da cultura; espera-se que todos busquem ativamente por inovações em seus processos.']],
    [4,'As não conformidades encontradas nos processos da CAGE são analisadas e medidas corretivas são implementadas?',[
      'Não, a prática comum é apenas corrigir a falha pontual, sem uma análise formal da causa raiz.',
      'A análise ocorre de forma isolada dentro das equipes para resolver seus problemas específicos, sem uma visão organizacional.',
      'Sim, a CAGE possui um procedimento padrão para que as não conformidades sejam analisadas e ações corretivas sejam implementadas nos processos.',
      'Sim, e a análise da causa raiz é realizada com ferramentas estatísticas para identificar e eliminar as fontes de variação que geram as não conformidades.',
      'Sim, e as não conformidades são tratadas como oportunidades estratégicas para questionar o estado atual do processo e buscar soluções inovadoras.']],
    [4,'São realizados projetos de melhoria contínua dos processos de forma regular?',[
      'Não, projetos de melhoria são muito raros.',
      'Os projetos acontecem de forma isolada dentro das equipes, para resolver problemas locais.',
      'Sim, a CAGE tem um programa de melhoria contínua com projetos regulares para aprimorar os processos padrão.',
      'Sim, e os projetos são selecionados e priorizados com base em análises quantitativas de seu impacto potencial no desempenho.',
      'Sim, e além de projetos de melhoria, há um foco constante em projetos de inovação que buscam transformar os processos.']],
    [4,'A efetividade das ações de melhorias implementadas nos processos é regularmente avaliada?',[
      'Não, raramente medimos se uma melhoria realmente funcionou.',
      'A avaliação é informal e baseada na percepção da equipe.',
      'Sim, a avaliação é parte do ciclo de melhoria, comparando o desempenho do processo antes e depois da mudança.',
      'Sim, a efetividade é avaliada quantitativamente, medindo o impacto da melhoria nos indicadores de desempenho e na capacidade dos processos.',
      'Sim, a avaliação foca não apenas na eficiência, mas também no valor estratégico e no retorno sobre o investimento da inovação.']],
    [5,'A CAGE possui papéis e responsabilidades claros para a gestão de processos (ex: Gerentes de Processo)?',[
      'Não, as responsabilidades são definidas por função ou departamento, não por processo. Ninguém é formalmente responsável pelo processo.',
      'A responsabilidade é implícita e fragmentada; cada gerente é "dono" do seu pedaço do processo, sem uma visão do todo.',
      'Sim, a CAGE designou formalmente "Gerentes de Processo" para seus processos padrão, com a responsabilidade de mantê-los e melhorá-los.',
      'Sim, e os Gerentes de Processo são responsáveis por atingir as metas de desempenho quantitativas e por gerenciar a capacidade de seus processos.',
      'Sim, e os Gerentes de Processo têm autonomia e recursos para buscar e implementar inovações que transformem seus processos e agreguem valor estratégico.']],
    [5,'Os envolvidos nos processos da CAGE estão comprometidos com a melhoria contínua?',[
      'Não, há muita resistência à mudança e pouco interesse em melhoria.',
      'O comprometimento varia muito; é forte em algumas equipes e fraco em outras.',
      'Sim, há um comprometimento geral em seguir e ajudar a melhorar os processos padrão da CAGE.',
      'Sim, o comprometimento é reforçado por metas de desempenho quantitativas, tanto individuais quanto da equipe.',
      'Sim, o comprometimento vai além da melhoria contínua; há um engajamento cultural com a busca pela inovação.']],
    [5,'A CAGE valoriza a inovação e a busca por novas soluções?',[
      'Não, a organização é avessa a riscos e prefere manter as coisas como estão.',
      'A inovação é rara e acontece de forma não estruturada, por iniciativa de indivíduos ou equipes isoladas.',
      'A organização apoia melhorias nos processos padrão, mas o foco ainda não é em inovação disruptiva.',
      'A organização avalia novas soluções com base em seu potencial quantitativo para melhorar o desempenho dos processos.',
      'Sim, a inovação é um pilar estratégico e a organização investe ativamente em experimentação e na busca de soluções transformadoras.']],
    [5,'A alta gestão da CAGE apoia as iniciativas de melhoria de processos?',[
      'Não, a alta gestão não demonstra apoio ou envolvimento com iniciativas de melhoria; o tema raramente é discutido.',
      'O apoio é passivo ou reativo; a alta gestão aprova ações apenas quando um problema crítico surge, mas não lidera o movimento.',
      'Sim, a alta gestão patrocina formalmente o programa de melhoria de processos, comunicando sua importância e alocando os recursos necessários.',
      'Sim, e o apoio é ativo e baseado em dados. A alta gestão cobra por resultados quantitativos e decide a alocação de recursos com base em análises de custo-benefício.',
      'Sim, a alta gestão não apenas apoia, mas lidera ativamente a busca por inovação nos processos, tratando-a como uma vantagem competitiva essencial e parte central da estratégia da CAGE.']]
  ];
  const questions=rows.map(([dimension,title,options],i)=>({id:'mg'+(i+1),number:i+1,dimension,title,options}));
  const levels={
    1:{name:'Inicial',meaning:'A gestão depende de iniciativas individuais. Há pouca padronização, responsabilidades fragmentadas e resultados imprevisíveis.',next:'Definir donos dos processos, documentar rotinas básicas, organizar responsabilidades e acompanhar as entregas das equipes.'},
    2:{name:'Gerenciado',meaning:'As equipes gerenciam suas rotinas, mas práticas, documentos e ferramentas ainda variam entre áreas.',next:'Institucionalizar padrões comuns, um repositório oficial, governança de processos e alinhamento com a estratégia.'},
    3:{name:'Padronizado',meaning:'A organização utiliza processos documentados, responsabilidades definidas e práticas comuns de gestão e melhoria.',next:'Consolidar indicadores confiáveis, metas e linhas de base; analisar variações e decidir com evidências quantitativas.'},
    4:{name:'Gerenciado quantitativamente',meaning:'O desempenho é medido e gerenciado com dados, metas e análise das causas de variação.',next:'Usar previsões e experimentação, priorizar inovações pelo benefício esperado e verificar o retorno das mudanças.'},
    5:{name:'Otimizado',meaning:'A melhoria e a inovação são contínuas, orientadas a dados e ao valor estratégico entregue pela organização.',next:'Sustentar a inovação, reavaliar indicadores e padrões, compartilhar aprendizados e acompanhar novos desafios estratégicos.'}
  };
  function levelFromMean(mean){return mean<=1.5?1:mean<=2.5?2:mean<=3.5?3:mean<=4.5?4:5;}
  function mode(values){const counts=new Map();values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));let result=null,max=0;counts.forEach((n,v)=>{if(n>max || n===max && v<result){result=v;max=n;}});return result;}
  function calculate(answers={}){
    const valid=q=>Number.isInteger(answers[q.id]) && answers[q.id]>=1 && answers[q.id]<=5;
    const dimensionsResult=dimensions.map((name,index)=>{
      const items=questions.filter(q=>q.dimension===index),values=items.filter(valid).map(q=>answers[q.id]);
      const mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
      return {name,index,total:items.length,answered:values.length,complete:values.length===items.length,mean,level:values.length===items.length?levelFromMean(mean):null};
    });
    const complete=dimensionsResult.every(d=>d.complete);
    return {complete,answered:questions.filter(valid).length,total:questions.length,dimensions:dimensionsResult,level:complete?mode(dimensionsResult.map(d=>d.level)):null};
  }
  function improvements(answers){
    return questions.filter(q=>Number.isInteger(answers[q.id]) && answers[q.id]>=1 && answers[q.id]<5).sort((a,b)=>answers[a.id]-answers[b.id] || a.number-b.number).map(q=>({question:q,level:answers[q.id],target:answers[q.id]+1,practice:q.options[answers[q.id]]}));
  }
  scope.MaturidadeGestao={dimensions,questions,levels,levelFromMean,mode,calculate,improvements};
})(globalThis);
