Indicadores — versão 1.0.40

- Removidos os comandos de importação de planilha e sincronização do módulo desktop; o cadastro manual permanece disponível. Indicadores já existentes não são apagados.
- Os indicadores de `form.indicadores_proc` são publicados automaticamente na coleção local de KPIs, inclusive nas bases antigas ao abri-las e após importar um backup.
- Cada definição ganha uma identidade persistente no processo. O catálogo usa um código próprio por definição para não misturar indicadores de mesmo nome.
- A definição é editada no mapeamento; o módulo de indicadores identifica a origem e permite lançar resultados e consultar o histórico. Metas textuais do mapeamento são exibidas como referência, sem inventar uma meta numérica ou um resultado. O lançamento mensal solicita os valores numéricos.
- Alterar a definição atualiza os dados do catálogo sem sobrescrever as medições e metas dos períodos já lançados. Remover uma definição sem medições retira o registro vazio; históricos medidos são preservados.
- Indicadores publicados a partir do mapeamento não são repetidos na lista de indicadores externos vinculados ao mesmo POP.

Verificação: 66 testes unitários; teste Electron `npm run test:mapping-indicators` para ausência da importação, cadastro manual, exibição do indicador do mapeamento, lançamento e persistência do resultado.

Implementação desktop: `electron/mapping-indicators.cjs`, integração transacional em `electron/store.cjs`, interface em `renderer/indicator-results.js`, retirada da importação em `tools/prepare-web.cjs`. Fontes compartilhadas de interface: `processos.html`.
