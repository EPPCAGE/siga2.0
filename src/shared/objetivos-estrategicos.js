(function initObjetivosEstrategicos(globalScope) {
  const defaults = Object.freeze([
    '[Resultados] Colaborar para a implementação de políticas públicas efetivas',
    '[Resultados] Aperfeiçoar a transparência pública e fomentar o controle social',
    '[Resultados] Promover a integridade pública e privada e fortalecer a prevenção à corrupção',
    '[Resultados] Otimizar a utilização dos recursos públicos',
    '[Articulação] Aprimorar o assessoramento aos gestores públicos',
    '[Articulação] Fortalecer a credibilidade e a imagem da CAGE',
    '[Processos] Desenvolver modelo de controle baseado em riscos e orientado pela utilização de dados',
    '[Processos] Sistematizar e implementar modelo de avaliação de políticas públicas',
    '[Processos] Reestruturar as ações de transparência, com foco no cidadão',
    '[Processos] Qualificar a informação contábil',
    '[Processos] Otimizar a contribuição da auditoria para o aprimoramento da gestão pública estadual',
    '[Processos] Promover a cultura de integridade na Administração Pública',
    '[Processos] Otimizar os processos de trabalho, com foco em eficiência operacional e automação',
    '[Aprendizado] Gerir as pessoas com foco na estratégia',
    '[Aprendizado] Aperfeiçoar a governança organizacional e fortalecer a cultura de colaboração e inovação',
    '[Aprendizado] Promover uma comunicação interna mais efetiva',
    '[Aprendizado] Assegurar serviços de TIC para suportar os processos e a estratégia'
  ]);
  const configId = 'proj_objetivos';
  let values = [...defaults];
  let unsubscribe = null;
  function loadLocal() {
    if(globalScope.fbReady?.()) return;
    try {
      const cached = globalScope.localStorage?.getItem('cage_objetivos_v6');
      if(cached) applySnapshot({exists:() => true, data:() => ({data:cached})});
    } catch(error) { console.warn('Objetivos estratégicos locais:', error.message); }
  }
  function key(value) {
    return String(value || '').replace(/^\s*\[[^\]]+\]\s*/, '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.]$/, '');
  }
  const aliases = new Map([
    ['Aprimorar o assessoramento aos gestores públicos, provendo soluções de forma proativa e tempestiva', 'Aprimorar o assessoramento aos gestores públicos'],
    ['Qualificar Informação Contábil', 'Qualificar a informação contábil'],
    ['Otimizar a contribuição da auditoria para o aprimoramento dos processos da gestão pública estadual', 'Otimizar a contribuição da auditoria para o aprimoramento da gestão pública estadual'],
    ['Otimizar os processos de trabalho, com foco em melhoria da eficiência operacional e automação', 'Otimizar os processos de trabalho, com foco em eficiência operacional e automação'],
    ['Otimizar os processos de trabalho, com foco na melhoria da eficiência operacional e automação', 'Otimizar os processos de trabalho, com foco em eficiência operacional e automação']
  ].map(([from, to]) => [key(from), key(to)]));

  function canonical(value, catalog = values) {
    const clean = String(value || '').trim();
    const name = aliases.get(key(clean)) || key(clean);
    const matches = catalog.filter(item => key(item) === name);
    return matches.length === 1 ? matches[0] : clean;
  }
  function selected(value, catalog = values) {
    return [...new Set(String(value || '').split(/[;\n]+/).map(item => canonical(item, catalog)).filter(Boolean))];
  }
  function normalize(value, catalog = values) { return selected(value, catalog).join('; '); }
  function choices(value) {
    loadLocal();
    const linked = selected(value);
    return [...values, ...linked.filter(item => !values.includes(item))].map(item => ({
      value: item, selected: linked.includes(item), pending: !values.includes(item),
      label: values.includes(item) ? item : `${item} (pendente de correspondência)`
    }));
  }
  function migrateArchitecture(architecture) {
    loadLocal();
    (architecture || []).forEach(macro => (macro.processos || []).forEach(process => {
      [process, ...(process.subprocessos || [])].forEach(item => {
        item.objetivo_estrategico = normalize(item.objetivo_estrategico);
      });
    }));
  }
  function applySnapshot(snapshot) {
    const data = snapshot.exists() && snapshot.data()?.data;
    const parsed = data ? JSON.parse(data) : defaults;
    if(!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) throw new Error('Catálogo de objetivos inválido.');
    values = [...new Set(parsed.map(item => item.trim()).filter(Boolean))];
  }
  async function load() {
    if(!globalScope.fbReady()) { loadLocal(); return; }
    applySnapshot(await globalScope.configRepository.get(configId));
  }
  function watch(onChange) {
    if(unsubscribe) unsubscribe();
    const api = globalScope.fb();
    if(!api.onSnapshot) return;
    unsubscribe = api.onSnapshot(globalScope.configRepository.ref(configId), snapshot => {
      try { applySnapshot(snapshot); onChange(); }
      catch(error) { console.warn('Objetivos estratégicos:', error.message); }
    }, error => console.warn('Objetivos estratégicos:', error.message));
  }
  globalScope.ObjetivosEstrategicos = {defaults, configId, canonical, selected, normalize, choices, migrateArchitecture, load, watch};
})(globalThis);
