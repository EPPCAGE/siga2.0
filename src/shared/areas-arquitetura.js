(function initAreasArquitetura(globalScope) {
  function key(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  const aliases = new Map([
    ['GAB', 'Gabinete da CAGE'],
    ['DAUD', 'Divisão de Auditoria'],
    ['DCO', 'Divisão de Controle e Orientação'],
    ['DCON', 'Divisão de Contabilidade'],
    ['DTTI', 'Divisão de Transparência e Tecnologia da Informação'],
    ['DIE', 'Divisão de Informações Estratégicas'],
    ['Contabilidade', 'Divisão de Contabilidade']
  ].map(([from, to]) => [key(from), to]));
  function canonical(value) {
    const clean = String(value || '').trim();
    return aliases.get(key(clean)) || clean;
  }
  function entries(architecture) {
    return (architecture || []).flatMap(m => (m.processos || []).flatMap(p => [p, ...(p.subprocessos || [])]));
  }
  function list(architecture) {
    const unique = new Map();
    entries(architecture).forEach(item => {
      const name = canonical(item.area);
      if(name && !unique.has(key(name))) unique.set(key(name), name);
    });
    return [...unique.values()].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  }
  function resolve(value, architecture) {
    const clean = String(value || '').trim();
    return list(architecture).find(name => key(name) === key(canonical(clean))) || clean;
  }
  function migrate(architecture) {
    const names = list(architecture);
    entries(architecture).forEach(item => {
      if(item.area) item.area = names.find(name => key(name) === key(canonical(item.area))) || item.area;
    });
  }
  function migrateRecords(records, architecture) {
    (records || []).forEach(item => {
      if(item.area) item.area = resolve(item.area, architecture);
    });
  }
  function options(value, architecture, escape) {
    const current = resolve(value, architecture);
    const names = list(architecture);
    const pending = current && !names.includes(current);
    return `<option value="" ${!current ? 'selected' : ''}>— Nenhuma —</option>` +
      names.map(name => `<option value="${escape(name)}" ${name === current ? 'selected' : ''}>${escape(name)}</option>`).join('') +
      (pending ? `<option value="${escape(current)}" selected>${escape(current)} (fora da arquitetura)</option>` : '');
  }
  function valid(value, previous, architecture) {
    return !value || list(architecture).includes(value) || value === resolve(previous, architecture);
  }
  globalScope.AreasArquitetura = {canonical, list, resolve, migrate, migrateRecords, options, valid};
})(globalThis);
