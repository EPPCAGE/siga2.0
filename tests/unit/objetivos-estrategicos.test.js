import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../src/shared/objetivos-estrategicos.js', import.meta.url), 'utf8');
const similar = [
  ['Aprimorar o assessoramento aos gestores públicos, provendo soluções de forma proativa e tempestiva', '[Articulação] Aprimorar o assessoramento aos gestores públicos'],
  ['Qualificar Informação Contábil', '[Processos] Qualificar a informação contábil'],
  ['Otimizar a contribuição da auditoria para o aprimoramento dos processos da gestão pública estadual', '[Processos] Otimizar a contribuição da auditoria para o aprimoramento da gestão pública estadual'],
  ['Otimizar os processos de trabalho, com foco em melhoria da eficiência operacional e automação', '[Processos] Otimizar os processos de trabalho, com foco em eficiência operacional e automação']
];
const pending = 'Aprimorar os Processos de Auditoria, com Base nas Melhores Práticas Internacionais';
function setup() {
  let listener;
  const repo = {get:vi.fn(),set:vi.fn(),ref:vi.fn(id => id)};
  const ctx = vm.createContext({fbReady:() => true, configRepository:repo,
    fb:() => ({onSnapshot:vi.fn((_ref, callback) => { listener = callback; return () => {}; })}),console});
  vm.runInContext(source, ctx);
  return {api:ctx.ObjetivosEstrategicos,repo,update:values => listener(snapshot(values))};
}
const snapshot = values => ({exists:() => true,data:() => ({data:JSON.stringify(values)})});

describe('Objetivos estratégicos com fonte em Projetos', () => {
  it('mantém exatamente os 17 objetivos padrão e corresponde nomes sem prefixos', () => {
    const {api} = setup();
    expect(api.defaults).toHaveLength(17);
    api.defaults.forEach(value => {
      const bare = value.replace(/^\[[^\]]+\]\s*/, '');
      expect(api.canonical(bare.toUpperCase())).toBe(value);
    });
  });
  it.each(similar)('corresponde a redação da arquitetura: %s', (from, to) => {
    expect(setup().api.canonical(from)).toBe(to);
  });
  it('preserva o objetivo de auditoria como pendente sem adicioná-lo ao catálogo', () => {
    const {api} = setup();
    expect(api.canonical(pending)).toBe(pending);
    const choice = api.choices(pending).find(item => item.value === pending);
    expect(choice).toMatchObject({selected:true,pending:true});
    expect(api.defaults).not.toContain(pending);
    expect(api.choices('').some(item => item.value === pending)).toBe(false);
  });
  it('migra processos e subprocessos preservando vários vínculos e removendo duplicatas', () => {
    const {api} = setup();
    const architecture = [{processos:[{objetivo_estrategico:`${similar[0][0]}; ${similar[1][0]}; ${similar[1][1]}`,subprocessos:[{objetivo_estrategico:`${similar[2][0]}; ${pending}`}]}]}];
    api.migrateArchitecture(architecture);
    expect(architecture[0].processos[0].objetivo_estrategico).toBe(`${similar[0][1]}; ${similar[1][1]}`);
    expect(architecture[0].processos[0].subprocessos[0].objetivo_estrategico).toBe(`${similar[2][1]}; ${pending}`);
    const migrated = JSON.stringify(architecture);
    api.migrateArchitecture(architecture);
    expect(JSON.stringify(architecture)).toBe(migrated);
  });
  it('carrega e acompanha o catálogo editado em Projetos sem escrever em configuração', async () => {
    const {api,repo,update} = setup();
    const custom = ['[Processos] Qualificar a informação contábil','[Resultados] Objetivo cadastrado em Projetos'];
    repo.get.mockResolvedValue(snapshot(custom));
    await api.load();
    expect(repo.get).toHaveBeenCalledWith('proj_objetivos');
    expect(api.choices('').map(item => item.value)).toEqual(custom);
    expect(repo.set).not.toHaveBeenCalled();
    const changed = vi.fn();
    api.watch(changed);
    update(['[Resultados] Objetivo atualizado']);
    expect(changed).toHaveBeenCalledOnce();
    expect(api.choices('').map(item => item.value)).toEqual(['[Resultados] Objetivo atualizado']);
  });
  it('não transforma uma redação se o destino foi retirado do catálogo de Projetos', async () => {
    const {api,repo} = setup();
    repo.get.mockResolvedValue(snapshot([]));
    await api.load();
    expect(api.canonical(similar[0][0])).toBe(similar[0][0]);
  });
  it('usa também o catálogo local de Projetos quando Firebase está indisponível', () => {
    const localValues = ['[Resultados] Objetivo local'];
    const context = vm.createContext({fbReady:() => false,localStorage:{getItem:key => key === 'cage_objetivos_v6' ? JSON.stringify(localValues) : null},console});
    vm.runInContext(source, context);
    expect(context.ObjetivosEstrategicos.choices('').map(item => item.value)).toEqual(localValues);
  });
});
