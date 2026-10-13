(function(scope) {
  const types = ['Preventivo', 'Detectivo', 'Corretivo'];
  const effects = ['Não avaliada', 'Eficaz', 'Parcialmente eficaz', 'Ineficaz'];
  const array = value => Array.isArray(value) ? value : [];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  async function controlId(name) {
    const bytes = await scope.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalize(name)));
    return 'MAP-' + Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
  }

  function assessment(value) {
    return {
      setor: String(value.setor || '').slice(0, 200),
      responsavel: String(value.responsavel || '').slice(0, 200),
      efetividade: effects.includes(value.efetividade) ? value.efetividade : 'Não avaliada'
    };
  }

  function defaults(control, origin) {
    const copy = {...control, origem: control.origem || origin, processos_associados: array(control.processos_associados), vinculos: [], aplicacoes: []};
    if (control.schema_version !== 2) {
      copy._legacy = assessment(control);
    }
    delete copy.setor;
    delete copy.responsavel;
    delete copy.efetividade;
    return copy;
  }

  function entriesForRisk(process, risk, index) {
    const phases = [['Existente', risk.controles_existentes], ['Tratamento', risk.controles_tratamento]];
    return phases.flatMap(([phase, items]) => array(items).map(control => ({process, risk, index, phase, control, name: String(control.nome || control.descricao || '').trim()})));
  }

  function riskEntries(processes) {
    return processes.flatMap(process => array(process.ent?.riscos).flatMap((risk, index) => entriesForRisk(process, risk, index))).filter(entry => entry.name);
  }

  async function identify(entry, records) {
    const matching = [...records.values()].find(control => normalize(control.nome) === normalize(entry.name));
    const id = entry.control.biblioteca_id || entry.control.id || matching?.id || await controlId(entry.name);
    return {...entry, id: String(id)};
  }

  function mappedDefinition(entry) {
    const control = entry.control;
    return {
      id: entry.id, nome: entry.name.slice(0, 200),
      descricao: String(control.descricao_catalogo || control.descricao || entry.name).slice(0, 5000),
      categoria: control.categoria || 'Controle do mapeamento',
      tipo: types.includes(control.tipo) ? control.tipo : 'Preventivo'
    };
  }

  function addMapping(records, entry) {
    if (!records.has(entry.id)) {
      records.set(entry.id, defaults(mappedDefinition(entry), 'Mapeamento'));
    }
    const record = records.get(entry.id);
    const {process, risk, control} = entry;
    record.vinculos.push({
      processo_id: process.id, processo: process.nome, risco: risk.desc || risk.descricao || '',
      risco_indice: entry.index, fase: entry.phase,
      ...assessment({setor: control.setor || process.area || '', responsavel: control.responsavel || risk.responsavel_tratamento || '', efetividade: control.efetividade}),
      tipo: record.tipo, aplicacao: control.descricao || ''
    });
  }

  function processContext(processes, architecture) {
    const catalog = scope.CentralControlesView.processCatalog(processes, architecture);
    const aliases = new Map(processes.filter(process => process.arq_id != null).map(process => ['arq:' + process.arq_id, String(process.id)]));
    return {catalog, ids: new Set(catalog.map(process => String(process.id))), canonical: id => aliases.get(String(id)) || String(id)};
  }

  function mappedApplications(links, pid) {
    const distinct = new Map();
    links.forEach(link => {
      const value = assessment(link);
      const key = JSON.stringify([value.setor, value.responsavel, value.efetividade]);
      if (!distinct.has(key)) {
        distinct.set(key, {id: 'auto:' + pid + ':' + distinct.size, processo_id: pid, ...value, persisted: false, origem: 'Mapeamento'});
      }
    });
    return [...distinct.values()];
  }

  function applicationsForProcess(control, pid, saved, canonical) {
    const registered = saved.filter(application => application.processo_id === pid);
    if (registered.length) {
      return registered;
    }
    const links = control.vinculos.filter(link => canonical(link.processo_id) === pid);
    if (links.length) {
      return mappedApplications(links, pid);
    }
    const legacy = control._legacy || control.classificacao_anterior;
    return [{id: 'legacy:' + pid, processo_id: pid, ...assessment(legacy || {}), persisted: false, origem: legacy ? 'Migração' : 'Associação'}];
  }

  function populateApplications(control, applications, context) {
    control._savedApplications = applications.filter(application => application.controle_id === control.id);
    const saved = control._savedApplications.filter(application => context.ids.has(context.canonical(application.processo_id))).map(application => ({...application, processo_id: context.canonical(application.processo_id), persisted: true, origem: 'Central'}));
    const references = [...control.processos_associados.map(context.canonical), ...saved.map(application => application.processo_id), ...control.vinculos.map(link => context.canonical(link.processo_id))];
    control.processos_associados = [...new Set(references)].filter(id => context.ids.has(id));
    control.aplicacoes = control.processos_associados.flatMap(pid => applicationsForProcess(control, pid, saved, context.canonical));
  }

  async function build({factory, library, registry, processes, architecture, applications = []}) {
    const records = new Map();
    factory.forEach(control => records.set(control.id, defaults(control, 'Fábrica')));
    library.forEach(control => records.set(control.id, defaults(control, 'Cadastrado')));
    registry.forEach(control => records.set(control.id, defaults(control, 'Cadastrado')));
    const entries = await Promise.all(riskEntries(processes).map(entry => identify(entry, records)));
    entries.forEach(entry => addMapping(records, entry));
    const context = processContext(processes, architecture);
    records.forEach(control => populateApplications(control, applications, context));
    return {records: [...records.values()], processes: context.catalog};
  }

  function document(control, user, timestamp) {
    if (!control.nome?.trim() || !control.categoria?.trim() || !control.descricao?.trim() || !types.includes(control.tipo)) {
      throw new Error('Preencha nome, categoria, descrição e tipo do controle.');
    }
    if (control.nome.length > 200 || control.categoria.length > 200 || control.descricao.length > 5000) {
      throw new Error('Nome e categoria: até 200 caracteres. Descrição: até 5.000.');
    }
    const ids = [...new Set(array(control.processos_associados).map(String))];
    if (ids.length > 500 || ids.some(id => !id || id.length > 200)) {
      throw new Error('Associações a processos inválidas.');
    }
    const data = {nome: control.nome.trim(), categoria: control.categoria.trim(), descricao: control.descricao.trim(), tipo: control.tipo, origem: control.origem || 'Cadastrado', schema_version: 2, processos_associados: ids, autor_uid: user.uid, criado_em: control.criado_em || timestamp, atualizado_em: timestamp};
    if (control.classificacao_anterior || control._legacy) {
      data.classificacao_anterior = control.classificacao_anterior || assessment(control._legacy);
    }
    return data;
  }

  function applicationDocument(application, control, user, timestamp) {
    if (!application.processo_id || String(application.processo_id).length > 200 || String(application.setor || '').length > 200 || String(application.responsavel || '').length > 200 || !effects.includes(application.efetividade)) {
      throw new Error('Confira processo, setor, responsável e efetividade de cada aplicação.');
    }
    return {controle_id: control, processo_id: String(application.processo_id), setor: String(application.setor || '').trim(), responsavel: String(application.responsavel || '').trim(), efetividade: application.efetividade, autor_uid: user.uid, criado_em: application.criado_em || timestamp, atualizado_em: timestamp};
  }

  function reference(control, pid, sector) {
    const applications = array(control.aplicacoes).filter(application => String(application.processo_id) === String(pid));
    const matches = applications.filter(application => normalize(application.setor) === normalize(sector));
    if (matches.length === 1) {
      return matches[0];
    }
    if (applications.length === 1) {
      return applications[0];
    }
    return null;
  }

  scope.CentralControlesCore = {build, document, applicationDocument, reference, controlId};
})(globalThis);
