import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const kpi = { codigo: 'IND-123', nome: 'Atendimentos', area: 'A', periodo: 'ago/2026', meta: null, realizado: 20, unidade: 'unidades' };
function context() {
  return runInNewContext([
    source('function _kpiClassificacao(', 'function _kpiGetMacroProc('),
    source('function parseNumBR(', 'async function importarIndicadores('),
    source('function statusInfo(', 'function _resumoIndicadoresRelatorioPdf('),
    '({ anterior: _resultadoAnteriorIndicadorRelatorio, media: _mediaTrimestralIndicadoresRelatorio, rows: _rowsIndicadoresRelatorioPdf })',
  ].join('\n'), { kpis: [], processos: [], isCritico: () => false, esc: v => String(v), _kpiGetMacroProc: () => ({ macro: 'Macro' }) });
}
const cell = row => [...row.matchAll(/<td[^>]*>(.*?)<\/td>/g)][4][1];

describe('resultado do período anterior no relatório', () => {
  it.each([
    ['ago/2026', 'jul/2026', 'Mensal'], ['jan/2026', 'dez/2025', 'Mensal'],
    ['08/2026', '2026-07', 'Mensal'],
    ['T1/2026', 'T4/2025', 'Trimestral'], ['2º trimestre/2026', 'T1/2026', 'Trimestral'],
    ['S1/2026', '2º semestre/2025', 'Semestral'], ['S2/2026', 'S1/2026', 'Semestral'],
    ['B1/2026', 'B6/2025', 'Bimestral'], ['Q1/2026', 'Q3/2025', 'Quadrimestral'],
    ['2026', '2025', 'Anual'], ['abr/2026', 'mar/2026', 'Trimestral'],
  ])('compara %s com %s (%s), inclusive na virada do ano', (periodo, anterior, periodicidade) => {
    const current = { ...kpi, periodo, periodicidade };
    expect(context().anterior(current, [{ ...current, periodo: anterior, realizado: 7 }, current])).toEqual({ valor: 7, periodo: anterior });
  });

  it('não busca o último disponível quando falta o período imediatamente anterior', () => {
    const c = context();
    const history = [{ ...kpi, periodo: 'jun/2026', realizado: 4 }, kpi, { ...kpi, periodo: 'set/2026', realizado: 9 }];
    expect(c.anterior(kpi, history)).toBeNull();
    expect(cell(c.rows([kpi], history))).toBe('—');
  });

  it('mostra uma linha com medias aritmeticas dos dois trimestres', () => {
    const c=context();
    const history=['abr','mai','jun','jul','ago','set'].map((mes,i)=>({...kpi,periodo:mes+'/2026',realizado:[10,20,30,30,60,90][i],meta:100}));
    const filtros={intervalo:'T3/2026'};
    const current=history.slice(3);
    const media=c.media(current,filtros);
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({realizado:60,periodo:'T3/2026',meta:100});
    expect(current.map(k=>k.realizado)).toEqual([30,60,90]);
    expect(c.anterior(media[0],history,filtros)).toEqual({valor:20,periodo:'T2/2026'});
    const rows=c.rows(current,history,filtros);
    expect(rows.match(/<tr /g)).toHaveLength(1);
    expect(rows).toContain('60 unidades');
    expect(rows).toContain('20 unidades');
    expect(rows).toContain('T3/2026');
    expect(rows).toContain('T2/2026');
    expect(rows).toContain('60%');
  });

  it('compara medias na virada do ano e preserva registros trimestrais', () => {
    const c=context();
    const history=['out/2025','nov/2025','dez/2025'].map((periodo,i)=>({...kpi,periodo,realizado:(i+1)*3}));
    expect(c.anterior({...kpi,periodo:'jan/2026'},history,{intervalo:'T1/2026'})).toEqual({valor:6,periodo:'T4/2025'});
    expect(c.anterior({...kpi,periodo:'T3/2026'},[{...kpi,periodo:'T2/2026',realizado:42}],{intervalo:'T3/2026'})).toEqual({valor:42,periodo:'T2/2026'});
  });

  it('inclui zero valido, ignora ausencias e nao duplica meses', () => {
    const c=context(),filtros={intervalo:'T3/2026'};
    const rows=[{...kpi,periodo:'jul/2026',realizado:0,sem_dado:false},{...kpi,periodo:'ago/2026',realizado:30},{...kpi,periodo:'set/2026',realizado:null}];
    expect(c.media([...rows,rows[1]],filtros)[0].realizado).toBe(15);
    expect(c.media([{...rows[0],sem_dado:true}],filtros)).toHaveLength(0);
    expect(c.anterior(kpi,[],filtros)).toBeNull();
    expect(c.media([{...rows[0],origem:'gsheets',sem_dado:undefined}],filtros)).toHaveLength(0);
    expect(c.media(rows,{period:'ago/2026',...filtros})).toEqual(rows);
    expect(c.media([...rows,{...rows[1],area:'B'}],filtros)).toHaveLength(2);
  });

  it('calcula a meta media e o desempenho sobre o realizado medio', () => {
    const c=context(), filtros={intervalo:'T3/2026'};
    const lista=['jul','ago','set'].map((mes,i)=>({...kpi,periodo:mes+'/2026',realizado:[10,20,30][i],meta:[20,40,60][i]}));
    const media=c.media(lista,filtros);
    expect(media[0]).toMatchObject({realizado:20,meta:40});
    expect(c.rows(lista,[],filtros)).toContain('50%');
    expect(c.media(media,filtros)[0].meta).toBe(40);
    expect(c.media(lista.map(k=>({...k,meta:null})),filtros)[0].meta).toBeNull();
  });

  it.each([[0,100],[2,0]])('preserva meta zero no trimestre com media %s', (realizado,pct) => {
    const c=context(),filtros={intervalo:'T3/2026'};
    const lista=['jul','ago','set'].map(mes=>({...kpi,nome:'Erros na MSC por parametriza\u00e7\u00e3o e/ou normatiza\u00e7\u00e3o',area:'Contabilidade',periodo:mes+'/2026',meta:0,meta_definida:true,origem:'gsheets',sem_dado:false,polaridade:'Menor \u00e9 melhor',realizado}));
    expect(c.media(lista,filtros)[0].meta).toBe(0);
    const rows=c.rows(lista,[],filtros);
    expect(rows).not.toContain('Sem meta');
    expect(rows).toContain(pct+'%');
    expect(rows).toContain(pct===100?'Meta atingida':'Muito abaixo');
  });

  it('soma o semestre e o ano anteriores, inclusive com mudança de ano', () => {
    const c = context();
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const history = meses.map(m => ({ ...kpi, periodo: `${m}/2025`, realizado: 2 }));
    expect(c.anterior(kpi, history, { intervalo: 'S1/2026' })).toEqual({ valor: 12, periodo: 'S2/2025' });
    expect(c.anterior(kpi, history, { period: '2026' })).toEqual({ valor: 24, periodo: '2025' });
  });

  it('prioriza o mês selecionado sobre o filtro de intervalo', () => {
    expect(context().anterior(kpi, [{ ...kpi, periodo: 'jul/2026', realizado: 3 }], { period: 'ago/2026', intervalo: 'T3/2026' })).toEqual({ valor: 3, periodo: 'jul/2026' });
  });

  it.each([null, undefined, '', 'Sem dado', Infinity])('mostra traço para resultado inválido: %s', realizado => {
    const c = context();
    expect(cell(c.rows([kpi], [{ ...kpi, periodo: 'jul/2026', realizado }]))).toBe('—');
  });

  it.each(['importado', 'gsheets', 'importado_editado', 'gsheets_editado'])('distingue zero válido de zero legado sem confirmação: %s', origem => {
    const c = context();
    const anterior = { ...kpi, periodo: 'jul/2026', realizado: 0, origem };
    expect(cell(c.rows([kpi], [anterior]))).toBe('—');
    expect(cell(c.rows([kpi], [{ ...anterior, sem_dado: false }]))).toContain('0 unidades');
    expect(cell(c.rows([kpi], [{ ...anterior, sem_dado: true }]))).toBe('—');
  });

  it('não mistura indicadores, áreas, unidades ou periodicidades', () => {
    const c = context();
    for (const fields of [{ codigo: 'OUTRO' }, { area: 'B' }, { unidade: 'dias' }, { periodo: 'T3/2026' }]) {
      expect(c.anterior(kpi, [{ ...kpi, periodo: 'jul/2026', ...fields }])).toBeNull();
    }
    expect(c.anterior({ ...kpi, periodo: 'inválido' }, [kpi])).toBeNull();
  });

  it.each([{}, { period: 'agosto/2026' }])('compara os meses do indicador 387.442 apesar do cadastro anual: %j', filtros => {
    const history = [
      ['maio/2026', 8.3], ['junho/2026', 8.26], ['julho/2026', 9.17], ['agosto/2026', 8.37],
    ].map(([periodo, realizado]) => ({ ...kpi, codigo: '387.442', area: 'DCO', unidade: 'horas', periodicidade: 'Anual', origem: 'gsheets_editado', periodo, realizado }));
    const c = context();
    expect(c.anterior(history[3], history, filtros)).toEqual({ valor: 9.17, periodo: 'julho/2026' });
    expect(cell(c.rows([history[3]], history, filtros))).toContain('9,17 horas');
  });

  it('compara o mes correspondente mesmo com periodicidade cadastral anual', () => {
    const history = ['abr/2026', 'mai/2026', 'jun/2026'].map(periodo => ({ ...kpi, periodo, periodicidade: 'Anual', realizado: 2 }));
    expect(context().anterior({ ...kpi, periodicidade: 'Anual' }, history, { intervalo: 'T3/2026' })).toEqual({ valor: 2, periodo: 'T2/2026' });
  });

  it('mostra comparação com e sem meta, preservando desempenho e removendo códigos', () => {
    const c = context();
    const history = [{ ...kpi, periodo: 'jul/2026', realizado: '1,25' }];
    for (const meta of [null, 30]) {
      const row = c.rows([{ ...kpi, meta }], history);
      expect(cell(row)).toContain('1,25 unidades');
      expect(row).toContain(meta === null ? 'Sem meta' : '67%');
      expect(row).not.toContain('IND-123');
      expect(row.match(/<td[ >]/g)).toHaveLength(8);
    }
  });
});
