const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

function hoje() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function datasPadrao(ano, trimestre) {
  const mes = { T1: 0, T2: 3, T3: 6, T4: 9, Anual: 0 }[trimestre];
  if (!Number.isInteger(Number(ano)) || Number(ano) < 1 || mes == null) return {};
  const inicio = new Date(Date.UTC(Number(ano), mes, 1));
  let uteis = 0;
  while (true) {
    if (inicio.getUTCDay() !== 0 && inicio.getUTCDay() !== 6) uteis++;
    if (uteis === 5) break;
    inicio.setUTCDate(inicio.getUTCDate() + 1);
  }
  const fim = new Date(Date.UTC(Number(ano), trimestre === 'Anual' ? 12 : mes + 3, 0));
  return { dt_prev_inicio: inicio.toISOString().slice(0, 10), prazo: fim.toISOString().slice(0, 10) };
}

function prazoMapeamento(at, processo) {
  if (at.vinculo_tipo !== 'mapeamento' || !processo) return '';
  const prevista = processo.ent?.dt_prev || '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(prevista)) return prevista.split('/').reverse().join('-');
  if (/^\d{4}-\d{2}-\d{2}/.test(prevista)) return prevista.slice(0, 10);
  const inicio = processo.ent?.dt_inicio || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return '';
  const data = new Date(inicio + 'T00:00:00Z');
  if (Number.isNaN(data.getTime())) return '';
  data.setUTCDate(data.getUTCDate() + 90);
  return data.toISOString().slice(0, 10);
}

function calcular(at, processo, data = hoje()) {
  const patch = {};
  const datas = datasPadrao(at.ano, at.trimestre);
  if (!at.dt_prev_inicio && datas.dt_prev_inicio) patch.dt_prev_inicio = datas.dt_prev_inicio;
  const prazo = prazoMapeamento(at, processo) || at.prazo || datas.prazo;
  if (prazo && prazo !== at.prazo) patch.prazo = prazo;
  const vinculado = ['mapeamento', 'auditoria'].includes(at.vinculo_tipo) && at.vinculo_id && processo;
  const inicio = at.dt_efet_inicio || (vinculado && at.vinculo_tipo === 'mapeamento' && processo.ent?.dt_inicio) || '';
  if (inicio && inicio !== at.dt_efet_inicio) patch.dt_efet_inicio = inicio;
  const mapeamentoConcluido = !at.reaberta && vinculado && at.vinculo_tipo === 'mapeamento'
    && (processo.dt_etapas?.publicacao || ['acompanha', 'auditoria'].includes(processo.etapa) || processo.status_workflow === 'concluido');
  const dataMapeamento = mapeamentoConcluido ? processo.ent?.dt_efetiva || processo.dt_etapas?.publicacao || '' : '';
  const entregaMapeamento = !mapeamentoConcluido ? '' : /^\d{2}\/\d{2}\/\d{4}$/.test(dataMapeamento)
    ? dataMapeamento.split('/').reverse().join('-')
    : /^\d{4}-\d{2}-\d{2}/.test(dataMapeamento) ? dataMapeamento.slice(0, 10) : data;
  const status = at.dt_conclusao || at.status === 'concluida' || (!at.reaberta && Number(at.qt_prevista) > 0 && Number(at.qt_realizada) >= Number(at.qt_prevista)) || entregaMapeamento ? 'concluida'
    : prazo && prazo < data ? 'em_atraso'
    : (inicio && inicio <= data) || Number(at.qt_realizada || 0) !== 0 || vinculado ? 'em_execucao'
    : at.status === 'em_atraso' ? 'planejado' : at.status || 'planejado';
  if (status !== at.status) patch.status = status;
  if (status === 'concluida') {
    if (at.reaberta) patch.reaberta = false;
    const conclusao = at.dt_conclusao || entregaMapeamento || data;
    const dias = prazo ? Math.max(0, Math.round((new Date(conclusao) - new Date(prazo)) / 86400000)) : 0;
    const entrega = !prazo ? 'sem_prazo' : conclusao > prazo ? 'com_atraso' : 'em_dia';
    if (at.dt_conclusao !== conclusao) patch.dt_conclusao = conclusao;
    if (at.dias_atraso !== dias) patch.dias_atraso = dias;
    if (at.entrega_status !== entrega) patch.entrega_status = entrega;
  } else {
    if (at.entrega_status) patch.entrega_status = '';
    if (at.dias_atraso != null) patch.dias_atraso = null;
  }
  return patch;
}

function registrar(admin) {
  const db = admin.firestore();
  async function atualizar(ref) {
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const at = snap.data();
      let processo = null;
      if (['mapeamento', 'auditoria'].includes(at.vinculo_tipo) && at.vinculo_id) {
        const ids = [...new Set([at.vinculo_id, String(at.vinculo_id), Number(at.vinculo_id)].filter(v => typeof v !== 'number' || Number.isFinite(v)))];
        const processos = ref.parent.parent ? ref.parent.parent.collection('processos') : db.collection('processos');
        const matches = await tx.get(processos.where('id', 'in', ids).limit(1));
        processo = matches.empty ? null : matches.docs[0].data();
      }
      const patch = calcular(at, processo);
      if (Object.keys(patch).length) tx.update(ref, { ...patch, dt_atualizacao: hoje() });
    });
  }
  async function processoAlterado(event) {
    const snap = event.data.after.exists ? event.data.after : event.data.before;
    if (!snap.exists || snap.data().id == null) return;
    const id = snap.data().id;
    const ids = [...new Set([id, String(id), Number(id)].filter(v => typeof v !== 'number' || Number.isFinite(v)))];
    const collection = snap.ref.parent.parent ? snap.ref.parent.parent.collection('plano') : db.collection('plano');
    const atividades = await collection.where('vinculo_id', 'in', ids).get();
    for (const at of atividades.docs) await atualizar(at.ref);
  }
  return {
    automatizarAtividadePlano: onDocumentWritten('plano/{id}', e => atualizar(e.data.after.ref)),
    automatizarAtividadePlanoTenant: onDocumentWritten('tenants/{tenant}/plano/{id}', e => atualizar(e.data.after.ref)),
    automatizarPlanoProcesso: onDocumentWritten('processos/{id}', processoAlterado),
    automatizarPlanoProcessoTenant: onDocumentWritten('tenants/{tenant}/processos/{id}', processoAlterado),
    atualizarPrazosPlano: onSchedule({ schedule: '0 0 * * *', timeZone: 'America/Sao_Paulo' }, async () => {
      // listDocuments inclui tenants cujo documento pai não existe.
      const collections = [db.collection('plano')];
      const tenants = await db.collection('tenants').listDocuments();
      for (const tenant of tenants) collections.push(tenant.collection('plano'));
      for (const collection of collections) {
        let cursor;
        while (true) {
          let query = collection.orderBy(admin.firestore.FieldPath.documentId()).limit(200);
          if (cursor) query = query.startAfter(cursor);
          const page = await query.get();
          for (const at of page.docs) await atualizar(at.ref);
          if (page.size < 200) break;
          cursor = page.docs[page.docs.length - 1];
        }
      }
    }),
  };
}

module.exports = { calcular, hoje, datasPadrao, registrar };
