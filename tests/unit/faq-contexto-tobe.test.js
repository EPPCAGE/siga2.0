import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const inicio = html.indexOf('async function gerarFAQIA()');
const fim = html.indexOf('\nasync function iaGerarQuestoesAuditoria()', inicio);
const source = html.slice(inicio, fim);

async function gerarPayload(processo) {
  let payload;
  await runInNewContext(`${source}\ngerarFAQIA();`, {
    curProc: processo,
    document: { getElementById: () => null },
    _rsPOP: () => {},
    chamarIA: async (_acao, enviado) => { payload = enviado; return ''; },
    now: () => '01/10/2026',
    toast: () => {},
  });
  return payload;
}

describe('geração de FAQ pelo contexto do POP', () => {
  const base = {
    nome: 'Processo de teste', objetivo: '', produto: '',
    ent: { entradas: '', saidas: '', atores: '', prob: [] },
    form: { pop: { ativ_detalhes: {} } },
  };

  it('prioriza o TO BE e as descrições e responsáveis revisados no POP', async () => {
    const processo = structuredClone(base);
    processo.mod = {
      asIs: 'Descrição antiga que não deve ser a referência',
      toBe: 'Descrição do processo aprovado',
      etapas_proc: [{ id: 'asis-1', nome: 'Atividade antiga', executor: 'Equipe antiga' }],
      etapas_proc_tobe: [{ id: 'tobe-1', nome: 'Atividade futura', executor: 'Equipe futura' }],
    };
    processo.form.pop.ativ_detalhes['tobe-1'] = {
      desc: 'Atividade futura revisada', resp: 'Responsável revisado', tipo: 'Decisão',
    };

    const payload = await gerarPayload(processo);

    expect(payload.contexto_modelagem).toBe('TO BE');
    expect(payload.descricao_contexto).toBe('Descrição do processo aprovado');
    expect(payload.etapas).toContain('Atividade futura revisada');
    expect(payload.etapas).toContain('Responsavel: Responsável revisado');
    expect(payload.etapas).not.toContain('Atividade antiga');
    expect(payload).not.toHaveProperty('descricao_as_is');
  });

  it('usa o AS IS somente quando não há etapas TO BE', async () => {
    const processo = structuredClone(base);
    processo.mod = {
      asIs: 'Descrição atual', toBe: '',
      etapas_proc: [{ id: 'asis-1', nome: 'Atividade atual', executor: 'Equipe atual' }],
      etapas_proc_tobe: [],
    };

    const payload = await gerarPayload(processo);

    expect(payload.contexto_modelagem).toBe('AS IS');
    expect(payload.descricao_contexto).toBe('Descrição atual');
    expect(payload.etapas).toContain('Atividade atual');
  });
});
