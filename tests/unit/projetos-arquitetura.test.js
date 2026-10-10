import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../projetos-logic.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  const remaining = source.slice(start);
  const next = remaining.slice(1).search(/^(?:async )?function /m);
  return next < 0 ? remaining : remaining.slice(0, next + 1);
}
const macros = [
  ['Finalístico', 'Auditoria'], ['Gestão', 'Comunicação e Relacionamento Institucional'],
  ['Finalístico', 'Contabilidade'], ['Finalístico', 'Controle'], ['Apoio', 'Gestão Administrativa'],
  ['Apoio', 'Gestão de Dados e Informações'], ['Apoio', 'Gestão de Pessoas'], ['Apoio', 'Gestão de TIC'],
  ['Gestão', 'Gestão Estratégica'], ['Finalístico', 'Orientação e Suporte à Tomada de Decisão'],
  ['Finalístico', 'Promoção da Integridade e Prevenção à Corrupção'],
  ['Finalístico', 'Transparência e Estímulo ao Controle Social'],
];

function setup() {
  const elements = Object.fromEntries(['aprov-macro-sel', 'aprov-impacto-list', 'aprov-impacto-macro', 'aprov-impacto-sel'].map(id => [id, { value: '', innerHTML: '' }]));
  const context = vm.createContext({
    PROJETOS: [], PROJ_MACROS: [], PROJ_ARQUITETURA: [], _projCurrentId: '1',
    document: { getElementById: id => elements[id] },
    projSetHtml: (el, html) => { el.innerHTML = html; },
    projEnsureWriteAll: () => true, projToast: vi.fn(), projSave: vi.fn(),
    projPopulateVinculacoes: vi.fn(), configRepository: { get: vi.fn(), set: vi.fn() },
  });
  const names = ['projArquiteturaAtual', 'projMacroKey', 'projResolveMacro', 'projSyncArquitetura',
    'projApplyArquitetura', 'projLoadArquitetura', 'projProcessosArquitetura', 'projStrategyBaseName',
    'projFixDefaults', 'projEsc', 'projAddMacro', 'projRemoverMacro', 'projPopulateProcessosImpactados',
    'projAddProcessoImpactado', 'projRemoverProcessoImpactado'];
  vm.runInContext(readFileSync(new URL('../../src/shared/objetivos-estrategicos.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../../src/shared/areas-arquitetura.js', import.meta.url), 'utf8'), context);
  vm.runInContext(names.map(functionSource).join('\n'), context);
  context.projLoad = () => {
    context.PROJETOS = context.PROJETOS.map(context.projFixDefaults);
    context.projSyncArquitetura();
  };
  const arquitetura = macros.map(([, nome], i) => ({id: `m${i}`, nome, processos: [{id: 'p1', nome: `Processo ${i}`}]}));
  context.projApplyArquitetura(arquitetura);
  return { context, elements, arquitetura };
}

describe('Arquitetura compartilhada em Projetos', () => {
  it('corresponde os 12 nomes aprovados, mantendo vínculos sem correspondência', () => {
    const { context } = setup();
    context.PROJETOS = [{ id: 1, macroprocessos: [...macros.map(([group, name]) => `[${group}] ${name.toLowerCase()}`), 'Macro antigo'] }];
    context.projSyncArquitetura();
    expect(context.PROJ_MACROS).toEqual(macros.map(([, name]) => name));
    expect(context.PROJETOS[0].macroprocesso_ids).toHaveLength(12);
    expect(context.PROJETOS[0].macroprocessos).toEqual([...macros.map(([, name]) => name), 'Macro antigo']);
    context.projSyncArquitetura();
    expect(context.PROJETOS[0].macroprocesso_ids).toHaveLength(12);
  });

  it('acompanha renomeações por ID e remove o vínculo mesmo após exclusão do macroprocesso', () => {
    const { context, arquitetura } = setup();
    context.PROJETOS = [context.projFixDefaults({id: 1, macroprocessos: ['[Finalístico] Auditoria']})];
    context.projSyncArquitetura();
    arquitetura[0].nome = 'Auditoria Renomeada';
    context.projSyncArquitetura();
    expect(context.PROJETOS[0].macroprocessos).toEqual(['Auditoria Renomeada']);
    context.projApplyArquitetura([]);
    context.projRemoverMacro(0);
    expect(context.PROJETOS[0].macroprocesso_ids).toEqual([]);
    expect(context.PROJETOS[0].macroprocessos).toEqual([]);
  });

  it('não escolhe um macroprocesso quando há nomes ambíguos', () => {
    const { context } = setup();
    context.projApplyArquitetura([{id:'a',nome:'Auditoria'}, {id:'b',nome:'AUDITORIA'}]);
    expect(context.projResolveMacro('[Finalístico] Auditoria')).toBeNull();
  });

  it('lê a arquitetura sem criar ou gravar um catálogo paralelo', async () => {
    const { context, arquitetura } = setup();
    context.configRepository.get.mockResolvedValue({ exists: () => true, data: () => ({data: JSON.stringify(arquitetura)}) });
    await context.projLoadArquitetura();
    expect(context.configRepository.get).toHaveBeenCalledWith('arquitetura');
    expect(context.configRepository.set).not.toHaveBeenCalled();
    context.configRepository.get.mockResolvedValue({exists: () => false});
    await context.projLoadArquitetura();
    expect(context.PROJ_MACROS).toEqual([]);
  });

  it('salva os projetos e objetivos sem escrever a arquitetura ou o antigo catálogo', async () => {
    const { context } = setup();
    Object.assign(context, {
      fbReady: () => true, _projFbState: {}, PROGRAMAS: [], PROJ_OBJETIVOS: [], PROJ_GOVERNANCA: {},
      PROJ_FB: {colProjetos:'projPROJETOS',colProgramas:'projPROGRAMAS',cfgObjetivosId:'proj_objetivos',cfgGovernancaId:'proj_governanca'},
      PROJ_STORAGE_KEY:'projetos', PROG_STORAGE_KEY:'programas', PROJ_GOV_STORAGE_KEY:'governanca',
      projFbSyncCollection: vi.fn(), localStorage:{setItem:vi.fn()},
    });
    vm.runInContext(functionSource('projFbSaveAll'), context);
    await context.projFbSaveAll();
    expect(context.configRepository.set.mock.calls.map(([id]) => id)).toEqual(['proj_objetivos','proj_governanca']);
  });

  it('adiciona processos de vários macroprocessos, evita duplicatas e preserva no carregamento', () => {
    const { context, elements } = setup();
    context.PROJETOS = [context.projFixDefaults({id:1})];
    for(const macroId of ['m0','m1','m0']) {
      elements['aprov-impacto-sel'].value = JSON.stringify([macroId,'p1']);
      context.projAddProcessoImpactado();
    }
    expect(context.PROJETOS[0].processos_impactados).toHaveLength(2);
    const saved = JSON.parse(JSON.stringify(context.PROJETOS[0]));
    expect(context.projFixDefaults(saved).processos_impactados).toEqual(saved.processos_impactados);
    context.projRemoverProcessoImpactado(0);
    expect(context.PROJETOS[0].processos_impactados.map(p => p.macro_id)).toEqual(['m1']);
  });

  it('filtra por macroprocesso e mantém processos excluídos visíveis para remoção', () => {
    const { context, elements, arquitetura } = setup();
    context.PROJETOS = [context.projFixDefaults({id:1,processos_impactados:[{macro_id:'m0',processo_id:'p1',nome:'Processo original',macro:'Auditoria'}]})];
    elements['aprov-impacto-macro'].value = 'm1';
    context.projPopulateProcessosImpactados();
    expect(elements['aprov-impacto-sel'].innerHTML).toContain('Processo 1');
    expect(elements['aprov-impacto-sel'].innerHTML).not.toContain('Processo 2');
    arquitetura[0].processos = [];
    context.projPopulateProcessosImpactados();
    expect(elements['aprov-impacto-list'].innerHTML).toContain('Processo original (indisponível na arquitetura)');
    expect(context.PROJETOS[0].processos_impactados).toHaveLength(1);
  });

  it('respeita as permissões ao adicionar e remover vínculos', () => {
    const { context, elements } = setup();
    context.PROJETOS = [context.projFixDefaults({id:1})];
    context.projEnsureWriteAll = () => false;
    elements['aprov-impacto-sel'].value = JSON.stringify(['m0','p1']);
    context.projAddProcessoImpactado();
    context.projRemoverProcessoImpactado(0);
    context.projAddMacro();
    context.projRemoverMacro(0);
    expect(context.projSave).not.toHaveBeenCalled();
  });
});
