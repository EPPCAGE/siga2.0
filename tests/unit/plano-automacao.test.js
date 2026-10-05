import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../functions/plano-automacao.js', import.meta.url), 'utf8');
const processos = [{ id: 8, ent: { dt_inicio: '2026-03-10' } }];
const context = vm.createContext({ processos, Intl, Date });
for (const name of ['planoPrazoMapeamento', 'planoHoje', 'planoDatasPadrao', 'planoEntregaMapeamento', 'planoProcessoVinculado', 'planoStatusEfetivo', '_planoAutomatizar', '_planoMarcarConclusao', '_planoAplicarConclusao', 'planoAtualizarTriDatas', 'planoAtualizarAutomacaoModal']) {
  vm.runInContext(html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0], context);
}
const server = vm.createContext({ Intl, Date });
for (const name of ['prazoMapeamento', 'hoje', 'datasPadrao', 'calcular']) vm.runInContext(source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0], server);
const hoje = context.planoHoje();
const base = { status: 'planejado', prazo: '2099-12-31' };

describe('automação do plano de trabalho', () => {
  it.each([
    [{ dt_inicio: '2026-03-10' }, '2026-06-08'],
    [{ dt_inicio: '2026-03-10', dt_prev: '2026-07-01' }, '2026-07-01'],
    [{ dt_inicio: '2026-03-10', dt_prev: '01/07/2026' }, '2026-07-01'],
    [{ dt_inicio: '2027-11-15' }, '2028-02-13'],
  ])('sincroniza prazo na tela e servidor: %j', (ent, prazo) => {
    const processo = { id: 10, ent };
    processos.push(processo);
    const at = { ...base, vinculo_tipo: 'mapeamento', vinculo_id: 10 };
    expect(server.calcular(at, processo, hoje).prazo).toBe(prazo);
    context._planoAutomatizar(at);
    expect(at.prazo).toBe(prazo);
    expect(server.calcular(at, processo, hoje)).toEqual({});
    ent.dt_prev = '2099-09-10';
    expect(server.calcular(at, processo, hoje).prazo).toBe(ent.dt_prev);
    context._planoAutomatizar(at);
    expect(at.prazo).toBe(ent.dt_prev);
    const auditoria = { ...base, vinculo_tipo: 'auditoria', vinculo_id: 10 };
    context._planoAutomatizar(auditoria);
    expect(auditoria.prazo).toBe(base.prazo);
    expect(server.calcular(auditoria, processo, hoje).prazo).toBeUndefined();
    processos.pop();
  });
  it('permite reabrir no modal e concluir novamente', () => {
    const ids = ['pm-status','pm-prazo','pm-dt-efet-conclusao','pm-dt-efet-inicio','pm-qtreal','pm-qtprev','pm-vint','pm-vinid'];
    const campos = Object.fromEntries(ids.map(id => [id, { value: '', dataset: {} }]));
    context.document = { getElementById: id => campos[id] };
    campos['pm-status'] = { value: 'em_execucao', dataset: { anterior: 'concluida' } };
    campos['pm-prazo'].value = '2099-12-31';
    campos['pm-dt-efet-conclusao'].value = hoje;
    campos['pm-qtprev'].value = campos['pm-qtreal'].value = '2';
    context.planoAtualizarAutomacaoModal({ target: campos['pm-status'] });
    context.planoAtualizarAutomacaoModal();
    expect(campos['pm-status'].value).toBe('em_execucao');
    expect(campos['pm-dt-efet-conclusao'].value).toBe('');
    expect(campos['pm-status'].dataset.reaberta).toBe('true');
    const processo = { etapa: 'acompanha', ent: { dt_efetiva: hoje } };
    const at = { ...base, status: 'em_execucao', reaberta: true, vinculo_tipo: 'mapeamento', vinculo_id: 8, qt_prevista: 2, qt_realizada: 2 };
    expect(context.planoEntregaMapeamento(at, processo)).toBe('');
    expect(server.calcular(at, processo, hoje).dt_conclusao).toBeUndefined();
    campos['pm-status'].value = 'concluida';
    context.planoAtualizarAutomacaoModal({ target: campos['pm-status'] });
    expect(campos['pm-dt-efet-conclusao'].value).toBe(hoje);
    expect(campos['pm-status'].dataset.reaberta).toBe('false');
  });
  const casos = [
    [{ reaberta: true, status: 'em_execucao', qt_prevista: 2, qt_realizada: 2 }, 'em_execucao'],
    [{ reaberta: true, status: 'em_execucao', qt_prevista: 2, qt_realizada: 2, prazo: '2020-01-01' }, 'em_atraso'],
    [{ reaberta: true, status: 'concluida' }, 'concluida'],
    [{}, 'planejado'],
    [{ dt_efet_inicio: '2026-01-01' }, 'em_execucao'],
    [{ qt_realizada: 0 }, 'planejado'],
    [{ qt_realizada: 0.5 }, 'em_execucao'],
    [{ qt_realizada: -1 }, 'em_execucao'],
    [{ qt_prevista: 1, qt_realizada: 1 }, 'concluida'],
    [{ qt_prevista: 1, qt_realizada: 2 }, 'concluida'],
    [{ qt_prevista: 0, qt_realizada: 0 }, 'planejado'],
    [{ dt_efet_inicio: '2099-01-01' }, 'planejado'],
    [{ dt_efet_inicio: '2099-01-01', qt_realizada: 0.5 }, 'em_execucao'],
    [{ dt_prev_inicio: '2099-01-01', dt_efet_inicio: '2026-01-01' }, 'em_execucao'],
    [{ dt_prev_inicio: '2020-01-01' }, 'planejado'],
    [{ vinculo_tipo: 'mapeamento', vinculo_id: '8' }, 'em_atraso'],
    [{ vinculo_tipo: 'auditoria', vinculo_id: 8 }, 'em_execucao'],
    [{ vinculo_tipo: 'mapeamento', vinculo_id: 99 }, 'planejado'],
    [{ dt_conclusao: '2026-01-01', prazo: '2025-12-31' }, 'concluida'],
    [{ prazo: '2020-01-01', qt_realizada: 1 }, 'em_atraso'],
    [{ prazo: hoje }, 'planejado'],
    [{ prazo: '', ano: 2020, trimestre: 'T1' }, 'em_atraso'],
    [{ prazo: '2020-01-01', qt_prevista: 1, qt_realizada: 1 }, 'concluida'],
  ];
  it.each(casos)('aplica as mesmas regras no formulário e servidor: %j', (fields, esperado) => {
    const at = { ...base, ...fields };
    expect(context.planoStatusEfetivo(at)).toBe(esperado);
    const processo = context.planoProcessoVinculado(at);
    expect({ ...at, ...server.calcular(at, processo, hoje) }.status).toBe(esperado);
  });
  it('preenche o início do processo e preserva uma data efetiva já informada', () => {
    const at = { ...base, vinculo_tipo: 'mapeamento', vinculo_id: 8 };
    context._planoAutomatizar(at);
    expect(at.dt_efet_inicio).toBe('2026-03-10');
    at.dt_efet_inicio = '2026-02-01';
    context._planoAutomatizar(at);
    expect(at.dt_efet_inicio).toBe('2026-02-01');
    expect(server.calcular(at, processos[0], hoje)).toEqual({});
  });
  it.each([
    [2026, 'T1', '2026-01-07', '2026-03-31'],
    [2026, 'T2', '2026-04-07', '2026-06-30'],
    [2026, 'T3', '2026-07-07', '2026-09-30'],
    [2026, 'T4', '2026-10-07', '2026-12-31'],
    [2026, 'Anual', '2026-01-07', '2026-12-31'],
    [2022, 'T4', '2022-10-07', '2022-12-31'],
    [2023, 'T1', '2023-01-06', '2023-03-31'],
  ])('calcula o quinto dia de segunda a sexta e o último dia: %s %s', (ano, trimestre, inicio, fim) => {
    const esperado = { dt_prev_inicio: inicio, prazo: fim };
    expect(context.planoDatasPadrao(ano, trimestre)).toEqual(esperado);
    expect(server.datasPadrao(ano, trimestre)).toEqual(esperado);
  });
  it('preenche as datas previstas vazias e preserva as datas personalizadas', () => {
    const at = { ano: 2099, trimestre: 'T2', status: 'planejado' };
    const patch = server.calcular(at, null, hoje);
    context._planoAutomatizar(at);
    expect(at.prazo).toBe('2099-06-30');
    expect(at.dt_prev_inicio).toBe(patch.dt_prev_inicio);
    at.prazo = '2099-08-15';
    at.dt_prev_inicio = '2099-04-20';
    context._planoAutomatizar(at);
    expect(at.prazo).toBe('2099-08-15');
    expect(at.dt_prev_inicio).toBe('2099-04-20');
  });
  it('registra a data de entrega ao atingir a quantidade e não altera em novas atualizações', () => {
    const at = { ...base, qt_prevista: 2, qt_realizada: 3 };
    const patch = server.calcular(at, null, hoje);
    expect(patch.dt_conclusao).toBe(hoje);
    context._planoAutomatizar(at);
    expect(at.dt_conclusao).toBe(hoje);
    expect(at.status).toBe('concluida');
    expect(server.calcular(at, null, '2099-12-31')).toEqual({});
  });
  it('conclui pelo mapeamento publicado, usando a entrega do processo', () => {
    const processo = { id: 9, etapa: 'acompanha', ent: { dt_inicio: '2026-01-01', dt_efetiva: '2026-02-15' } };
    processos.push(processo);
    const at = { ...base, vinculo_tipo: 'mapeamento', vinculo_id: 9 };
    const patch = server.calcular(at, processo, hoje);
    context._planoAutomatizar(at);
    expect(at.dt_conclusao).toBe('2026-02-15');
    expect(at.dt_conclusao).toBe(patch.dt_conclusao);
    expect(at.status).toBe('concluida');
    const auditoria = { ...base, vinculo_tipo: 'auditoria', vinculo_id: 9 };
    context._planoAutomatizar(auditoria);
    expect(auditoria.status).toBe('em_execucao');
    expect(auditoria.dt_efet_inicio).toBeUndefined();
    expect(auditoria.dt_conclusao).toBe('');
  });
  it('converte a data de publicação legada e não conclui apenas pelo preenchimento da entrega na etapa de publicação', () => {
    const at = { ...base, vinculo_tipo: 'mapeamento', vinculo_id: 8 };
    const processo = { dt_etapas: { publicacao: '15/02/2026' } };
    expect(context.planoEntregaMapeamento(at, processo)).toBe('2026-02-15');
    expect(server.calcular(at, processo, hoje).dt_conclusao).toBe('2026-02-15');
    const pendente = { etapa: 'publicacao', ent: { dt_efetiva: '2026-02-15' } };
    expect(context.planoEntregaMapeamento(at, pendente)).toBe('');
    expect(server.calcular(at, pendente, hoje).status).toBe('em_execucao');
  });
  it('atualiza as datas padrão ao trocar trimestre, preservando datas personalizadas', () => {
    const campos = Object.fromEntries(['pm-tri','pm-ano','pm-dt-prev-inicio','pm-prazo','pm-status','pm-dt-efet-conclusao','pm-dt-efet-inicio','pm-qtreal','pm-qtprev','pm-vint','pm-vinid'].map(id=>[id,{value:'',dataset:{}}]));
    context.document = { getElementById: id=>campos[id] };
    campos['pm-ano'].value = '2099';
    campos['pm-tri'].value = 'T1';
    campos['pm-status'].value = 'planejado';
    context.planoAtualizarTriDatas();
    const inicioT1 = campos['pm-dt-prev-inicio'].value;
    campos['pm-tri'].value = 'T2';
    context.planoAtualizarTriDatas();
    expect(campos['pm-prazo'].value).toBe('2099-06-30');
    expect(campos['pm-dt-prev-inicio'].value).not.toBe(inicioT1);
    campos['pm-dt-prev-inicio'].value = '2099-04-20';
    campos['pm-prazo'].value = '2099-08-15';
    campos['pm-tri'].value = 'T3';
    context.planoAtualizarTriDatas();
    expect(campos['pm-dt-prev-inicio'].value).toBe('2099-04-20');
    expect(campos['pm-prazo'].value).toBe('2099-08-15');
    campos['pm-qtprev'].value = '2';
    campos['pm-qtreal'].value = '2';
    context.planoAtualizarAutomacaoModal();
    expect(campos['pm-status'].value).toBe('concluida');
    expect(campos['pm-dt-efet-conclusao'].value).toBe(hoje);
  });
  it('preserva a conclusão informada e recalcula o atraso ao editar a data', () => {
    const at = { ...base, prazo: '2026-03-10', dt_conclusao: '2026-03-12' };
    context._planoAplicarConclusao(at, null);
    expect(at.status).toBe('concluida');
    expect(at.dt_conclusao).toBe('2026-03-12');
    expect(at.dias_atraso).toBe(2);
    at.dt_conclusao = '2026-03-09';
    context._planoAplicarConclusao(at, at);
    expect(at.entrega_status).toBe('em_dia');
    expect(at.dias_atraso).toBe(0);
    expect(server.calcular(at, null, hoje)).toEqual({});
  });
  it('atualiza em transação e evita novas gravações quando as regras já foram aplicadas', async () => {
    let at = { ...base, qt_realizada: 1 };
    const update = vi.fn((ref, patch) => { at = { ...at, ...patch }; });
    const tx = { get: async () => ({ exists: true, data: () => at }), update };
    const db = { runTransaction: async fn => fn(tx) };
    const module = { exports: {} };
    const worker = vm.createContext({ Intl, Date, module, require: () => ({
      onDocumentWritten: (path, handler) => handler,
      onSchedule: (options, handler) => handler,
    }) });
    vm.runInContext(source, worker);
    const handlers = module.exports.registrar({ firestore: () => db });
    const event = { data: { after: { ref: { path: 'plano/1' } } } };
    await handlers.automatizarAtividadePlano(event);
    expect(at.status).toBe('em_execucao');
    expect(update).toHaveBeenCalledTimes(1);
    await handlers.automatizarAtividadePlano(event);
    expect(update).toHaveBeenCalledTimes(1);
    tx.get = async () => ({ exists: false });
    await handlers.automatizarAtividadePlano(event);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
