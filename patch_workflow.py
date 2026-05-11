#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys

with open('C:/gesproc-functions/index.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

def rep(old, new, count=1, label=''):
    global c
    if old not in c:
        errors.append(f"WARN: pattern not found [{label}]: {old[:80]!r}")
        return False
    c = c.replace(old, new, count)
    print(f"  OK: {label or old[:60]!r}")
    return True

# ─── 1. ETAPAS + TOBE_STEPS + getPipelineSteps ─────────────────────────────
rep(
"// PIPELINE — 17 etapas em 5 fases\nconst ETAPAS = [\n  // Entendimento\n  {id:'abertura',lb:'Abertura',fase:'Entendimento',cor:'pip-e',resp:'ep'},\n  {id:'reuniao',lb:'Reunião entend.',fase:'Entendimento',cor:'pip-e',resp:'ep'},\n  {id:'questionario',lb:'Quest. maturidade',fase:'Entendimento',cor:'pip-e',resp:'dono'},\n  // Modelagem\n  {id:'esboco',lb:'Esboço AS IS / TO BE',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'det_etapas',lb:'Detalhamento etapas',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'riscos',lb:'Identificação de riscos',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'analise_asis',lb:'Análise inteligente',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'valid_dono',lb:'Validação dono',fase:'Modelagem',cor:'pip-m',resp:'dono'},\n  // Formalização\n  {id:'desenho_final',lb:'Desenho final',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  {id:'pop',lb:'Construção POP',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  {id:'complement',lb:'Complement. dono',fase:'Formalizacao',cor:'pip-f',resp:'dono'},\n  {id:'apresentacao',lb:'Aprov. gestor',fase:'Formalizacao',cor:'pip-f',resp:'gestor'},\n  {id:'publicacao',lb:'Publicação',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  // Operação\n  {id:'acompanha',lb:'Acompanhamento',fase:'Operacao',cor:'pip-o',resp:'ep'},\n  // Auditoria\n  {id:'auditoria',lb:'Auditoria do processo',fase:'Auditoria',cor:'pip-a',resp:'ep'},\n];",
"// PIPELINE — etapas em 5 fases (TO BE steps condicionais ao produto)\nconst ETAPAS = [\n  // Entendimento\n  {id:'abertura',lb:'Abertura',fase:'Entendimento',cor:'pip-e',resp:'ep'},\n  {id:'reuniao',lb:'Reunião entend.',fase:'Entendimento',cor:'pip-e',resp:'ep'},\n  {id:'questionario',lb:'Quest. maturidade',fase:'Entendimento',cor:'pip-e',resp:'dono'},\n  // Modelagem AS IS\n  {id:'esboco',lb:'Esboço AS IS',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'det_etapas',lb:'Detalhamento AS IS',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'riscos',lb:'Identificação de riscos',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'analise_asis',lb:'Análise inteligente',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'valid_dono',lb:'Validação AS IS',fase:'Modelagem',cor:'pip-m',resp:'dono'},\n  // Modelagem TO BE (condicionais ao produto)\n  {id:'esboco_tobe',lb:'Esboço TO BE',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'det_tobe',lb:'Detalhamento TO BE',fase:'Modelagem',cor:'pip-m',resp:'ep'},\n  {id:'valid_tobe',lb:'Validação TO BE',fase:'Modelagem',cor:'pip-m',resp:'dono'},\n  // Formalização\n  {id:'desenho_final',lb:'Desenho final',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  {id:'pop',lb:'Construção POP',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  {id:'complement',lb:'Complement. dono',fase:'Formalizacao',cor:'pip-f',resp:'dono'},\n  {id:'apresentacao',lb:'Aprov. gestor',fase:'Formalizacao',cor:'pip-f',resp:'gestor'},\n  {id:'publicacao',lb:'Publicação',fase:'Formalizacao',cor:'pip-f',resp:'ep'},\n  // Operação\n  {id:'acompanha',lb:'Acompanhamento',fase:'Operacao',cor:'pip-o',resp:'ep'},\n  // Auditoria\n  {id:'auditoria',lb:'Auditoria do processo',fase:'Auditoria',cor:'pip-a',resp:'ep'},\n];\nconst TOBE_STEPS=['esboco_tobe','det_tobe','valid_tobe'];\nfunction getPipelineSteps(p){\n  const prod=(p||curProc)?.produto||'AS IS';\n  const incTobe=prod==='AS IS + TO BE'||prod==='TO BE';\n  return ETAPAS.filter(e=>incTobe||!TOBE_STEPS.includes(e.id));\n}",
label="ETAPAS+TOBE_STEPS+getPipelineSteps"
)

# ─── 2. EBADGE ──────────────────────────────────────────────────────────────
rep(
"const EBADGE = {abertura:'bt',reuniao:'bt',questionario:'bt',esboco:'bp',det_etapas:'bp',riscos:'bp',analise_asis:'bp',valid_dono:'bp',desenho_final:'ba',pop:'ba',complement:'ba',apresentacao:'ba',publicacao:'ba',acompanha:'bb',auditoria:'br'};",
"const EBADGE = {abertura:'bt',reuniao:'bt',questionario:'bt',esboco:'bp',det_etapas:'bp',riscos:'bp',analise_asis:'bp',valid_dono:'bp',esboco_tobe:'bp',det_tobe:'bp',valid_tobe:'bp',desenho_final:'ba',pop:'ba',complement:'ba',apresentacao:'ba',publicacao:'ba',acompanha:'bb',auditoria:'br'};",
label="EBADGE"
)

# ─── 3. nextEt ──────────────────────────────────────────────────────────────
rep(
"function nextEt(id){const i=etIdx(id);return i<ETAPAS.length-1?ETAPAS[i+1].id:null;}",
"function nextEt(id,p){const steps=getPipelineSteps(p);const i=steps.findIndex(e=>e.id===id);return i>=0&&i<steps.length-1?steps[i+1].id:null;}",
label="nextEt"
)

# ─── 4. Add _procCtx near etapasIdC ─────────────────────────────────────────
rep(
"let etapasIdC=100;",
"let etapasIdC=100;\nlet _procCtx='etapas_proc'; // Context for det_etapas vs det_tobe editing",
label="_procCtx global"
)

# ─── 5. rDetalhe - use getPipelineSteps ─────────────────────────────────────
rep(
"  const idx=etIdx(p.etapa);\n  const epUser=isEP();\n  document.getElementById('det-prog').innerHTML=ETAPAS.map((e,i)=>{\n    const past=i<idx,cur=i===idx,future=i>idx;\n    const clickable=epUser&&!cur;\n    const tip=past?`Ver etapa: ${e.lb}`:`Visualizar: ${e.lb}`;\n    return `<div class=\"prog-s ${past?'dn':cur?'da':''}\" ${clickable?`onclick=\"navegarRetro('${e.id}')\" style=\"cursor:pointer\" title=\"${tip}\"`:''}\">\n      <div class=\"prog-d ${past?'dn':cur?'da':''}\">${past?'✓':(i+1)}</div>\n      <div class=\"prog-l ${cur?'da':''}\">${e.lb}</div>\n    </div>`;\n  }).join('');",
"  const _steps=getPipelineSteps(p);\n  const idx=_steps.findIndex(e=>e.id===p.etapa);\n  const epUser=isEP();\n  document.getElementById('det-prog').innerHTML=_steps.map((e,i)=>{\n    const past=i<idx,cur=i===idx,future=i>idx;\n    const clickable=epUser&&!cur;\n    const tip=past?`Ver etapa: ${e.lb}`:`Visualizar: ${e.lb}`;\n    return `<div class=\"prog-s ${past?'dn':cur?'da':''}\" ${clickable?`onclick=\"navegarRetro('${e.id}')\" style=\"cursor:pointer\" title=\"${tip}\"`:''}\">\n      <div class=\"prog-d ${past?'dn':cur?'da':''}\">${past?'✓':(i+1)}</div>\n      <div class=\"prog-l ${cur?'da':''}\">${e.lb}</div>\n    </div>`;\n  }).join('');",
label="rDetalhe pipeline filter"
)

# ─── 6. ACT in rFila ────────────────────────────────────────────────────────
rep(
"  const ACT={abertura:'Abrir processo e vincular à arquitetura',questionario:'Responder questionário de maturidade',reuniao:'Conduzir reunião de entendimento',mapeamento:'Registrar volumetria, equipe e prazos',analise_asis:'Elaborar análise completa do AS IS',esboco:'Elaborar esboço AS IS / TO BE com BPMN',det_etapas:'Detalhar etapas extraídas do fluxo',valid_dono:'Validar modelagem do processo',desenho_final:'Finalizar desenho do processo',pop:'Construir POP no padrão CAGE',complement:'Complementar POP (FAQ, formulários)',apresentacao:'Apresentar ao gestor',publicacao:'Publicar no repositório oficial',acompanha:'Verificar conformidade na implementação',monitora:'Monitorar indicadores de desempenho',auditoria:'Conduzir auditoria do processo'};",
"  const ACT={abertura:'Abrir processo e vincular à arquitetura',questionario:'Responder questionário de maturidade',reuniao:'Conduzir reunião de entendimento',mapeamento:'Registrar volumetria, equipe e prazos',analise_asis:'Elaborar análise completa do AS IS',esboco:'Elaborar esboço AS IS com BPMN',det_etapas:'Detalhar etapas do fluxo AS IS',riscos:'Identificar riscos do processo',valid_dono:'Validar modelagem AS IS',esboco_tobe:'Elaborar esboço TO BE com BPMN',det_tobe:'Detalhar etapas do fluxo TO BE',valid_tobe:'Validar modelagem TO BE',desenho_final:'Finalizar desenho do processo',pop:'Construir POP no padrão CAGE',complement:'Complementar POP (FAQ, formulários)',apresentacao:'Apresentar ao gestor',publicacao:'Publicar no repositório oficial',acompanha:'Verificar conformidade na implementação',monitora:'Monitorar indicadores de desempenho',auditoria:'Conduzir auditoria do processo'};",
label="ACT in rFila"
)

# ─── 7. ACOES.esboco — remove TO BE tab ─────────────────────────────────────
old_esboco = (
    "  esboco:{titulo:'Esboço AS IS / TO BE',sub:'Descrever e desenhar os fluxos atual e futuro.',role:'EP',rk:'ep',\n"
    "    form:p=>`<div class=\"ib ibp\">Descreva os fluxos e desenhe no editor BPMN abaixo. Identifique oportunidades de melhoria na modelagem.</div>\n"
    "    <div class=\"tabs\" style=\"margin-bottom:1rem\">\n"
    "      <div class=\"tab on\" onclick=\"sModTab('sm-asis',this)\">AS IS</div>\n"
    "      <div class=\"tab\" onclick=\"sModTab('sm-tobe',this)\">TO BE</div>\n"
    "    </div>\n"
    "    <div id=\"sm-asis\" style=\"display:block\">\n"
    "      <div class=\"fg\"><label class=\"fl\">Descrição AS IS</label>\n"
    "        ${!p.mod.asIs && p.ent.atividades_principais ? `<div class=\"ib\" style=\"margin-bottom:.4rem;font-size:12px\">Pré-preenchido com as atividades registradas na reunião de entendimento.</div>` : ''}\n"
    "        <textarea class=\"fi\" id=\"e-asis\" style=\"min-height:120px\" placeholder=\"Como o processo funciona hoje...\">${p.mod.asIs || p.ent.atividades_principais || ''}</textarea></div>\n"
    "      ${bpmnEditorHTML('asis', p.mod.bpmnAsIs)}\n"
    "    </div>\n"
    "    <div id=\"sm-tobe\" style=\"display:none\">\n"
    "      <div class=\"fg\"><label class=\"fl\">Descrição TO BE</label><textarea class=\"fi\" id=\"e-tobe\" style=\"min-height:80px\" placeholder=\"Como o processo deve funcionar...\">${p.mod.toBe||''}</textarea></div>\n"
    "      ${bpmnEditorHTML('tobe', p.mod.bpmnToBe)}\n"
    "    </div>\n"
    "    <div class=\"btn-row\"><button class=\"btn btn-p\" onclick=\"salvarEsboco()\">Encaminhar para detalhamento de etapas →</button></div>`},"
)
new_esboco = (
    "  esboco:{titulo:'Esboço AS IS',sub:'Desenhar o fluxo atual do processo com BPMN.',role:'EP',rk:'ep',\n"
    "    form:p=>`<div class=\"ib ibp\">Descreva o processo e desenhe o fluxo no editor BPMN abaixo. Identifique oportunidades de melhoria na modelagem.</div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Descrição AS IS</label>\n"
    "      ${!p.mod.asIs && p.ent.atividades_principais ? `<div class=\"ib\" style=\"margin-bottom:.4rem;font-size:12px\">Pré-preenchido com as atividades registradas na reunião de entendimento.</div>` : ''}\n"
    "      <textarea class=\"fi\" id=\"e-asis\" style=\"min-height:120px\" placeholder=\"Como o processo funciona hoje...\">${p.mod.asIs || p.ent.atividades_principais || ''}</textarea>\n"
    "    </div>\n"
    "    ${bpmnEditorHTML('asis', p.mod.bpmnAsIs)}\n"
    "    <div class=\"btn-row\"><button class=\"btn btn-p\" onclick=\"salvarEsboco()\">Encaminhar para detalhamento AS IS →</button></div>`},"
)
rep(old_esboco, new_esboco, label="ACOES.esboco remove TO BE tab")

# ─── 8. ACOES.det_etapas — add skip button, fix label ───────────────────────
rep(
"    <div class=\"btn-row\"><button class=\"btn btn-p\" onclick=\"salvarDetEtapas()\">Encaminhar para validação do dono →</button></div>`},",
"    <div class=\"btn-row\">\n      <button class=\"btn\" onclick=\"skipDetEtapas()\" title=\"Pular detalhamento e avançar\">Pular etapa</button>\n      <button class=\"btn btn-p\" onclick=\"salvarDetEtapas()\">Encaminhar para identificação de riscos →</button>\n    </div>`},",
label="det_etapas skip button"
)

# ─── 9. ACOES.valid_dono — full replacement ──────────────────────────────────
old_vd_start = "  valid_dono:{titulo:'Validar modelagem',sub:'Revise o desenho do processo, a análise inteligente e a nota de maturidade.',role:'Dono do processo',rk:'dono',"
old_vd_end = "        <button class=\"btn btn-a\" onclick=\"reprovarDono('esboco','Dono','Dono solicitou ajustes')\">Solicitar ajustes</button>\n        <button class=\"btn btn-g\" onclick=\"aprovarComFeedback()\">Aprovar ✓</button>\n      </div>`;\n    }},"

if old_vd_start in c and old_vd_end in c:
    idx_start = c.index(old_vd_start)
    idx_end = c.index(old_vd_end) + len(old_vd_end)
    old_vd = c[idx_start:idx_end]

    new_vd = (
        "  valid_dono:{titulo:'Validação AS IS',sub:'Revise o desenho AS IS, a análise inteligente e a maturidade do processo.',role:'Dono do processo',rk:'dono',\n"
        "    form:p=>{\n"
        "      const a=p.ent.analise||{};\n"
        "      const ia=a.ia_resultado||{};\n"
        "      const mat=p.ent.mat||0;\n"
        "      const ML=['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];\n"
        "      const matCor=mat<=1?'var(--red)':mat<=2?'var(--amber)':mat<=3?'var(--amber)':mat<=4?'var(--teal)':'var(--green)';\n"
        "      const matBg=mat<=1?'var(--red-l)':mat<=2?'var(--amber-l)':mat<=3?'var(--amber-l)':mat<=4?'var(--teal-l)':'var(--green-l)';\n"
        "      const gargalos=[...new Set([...(a.gargalos||[]),...(ia.gargalos||[])])];\n"
        "      const retrabalhos=[...new Set([...(a.retrabalhos||[]),...(ia.retrabalhos||[])])];\n"
        "      const gaps=[...new Set([...(a.gaps||[]),...(ia.gaps||[])])];\n"
        "      const oportunidades=[...new Set([...(a.oportunidades||[]),...(ia.oportunidades||[])])];\n"
        "      const solucoes=[...new Set([...(a.solucoes_problemas||[]),...(ia.solucoes_problemas||[])])];\n"
        "      const mitigacoes=[...new Set([...(a.mitigacoes_riscos||[]),...(ia.mitigacoes_riscos||[])])];\n"
        "      const complexidade=a.complexidade||ia.complexidade||'';\n"
        "      const temAnalise=!!(ia.resumo||gargalos.length||retrabalhos.length||gaps.length||oportunidades.length||solucoes.length||mitigacoes.length);\n"
        "      window._dfb = {};\n"
        "      window._dfbItems = [];\n"
        "      const savedFb = a.feedback_dono || {};\n"
        "      Object.keys(savedFb).forEach(t=>{ window._dfb[t]={...savedFb[t]}; });\n"
        "      const savedReu = a.reuniao_valid_asis||{};\n"
        "      return `<div class=\"ib ibp\" style=\"margin-bottom:1.2rem\">Revise os materiais abaixo. Para cada item da análise, confirme (✓) se concorda ou descarte (✗) se discorda. Ao final, aprove ou solicite ajustes.</div>\n"
        "\n"
        "      <div class=\"card-t\" style=\"margin-bottom:.5rem\">Reunião de validação</div>\n"
        "      <div class=\"g3\" style=\"margin-bottom:1rem\">\n"
        "        <div class=\"fg\"><label class=\"fl\">Data da reunião</label><input class=\"fi\" id=\"vd-dt\" type=\"date\" value=\"${savedReu.dt||''}\"></div>\n"
        "        <div class=\"fg\"><label class=\"fl\">Presentes</label><input class=\"fi\" id=\"vd-presentes\" placeholder=\"Nomes dos presentes\" value=\"${esc(savedReu.presentes||'')}\"></div>\n"
        "        <div class=\"fg\"><label class=\"fl\">Ata / encaminhamentos</label><textarea class=\"fi\" id=\"vd-ata\" style=\"min-height:54px\" placeholder=\"Resumo da reunião...\">${esc(savedReu.ata||'')}</textarea></div>\n"
        "      </div>\n"
        "\n"
        "      <div class=\"card-t\" style=\"margin-bottom:.6rem\">1. Desenho AS IS</div>\n"
        "      ${p.mod.asIs?`<div class=\"card\" style=\"margin-bottom:.8rem\"><div class=\"card-t\">Descrição AS IS</div><div style=\"font-size:13px;color:var(--ink2);white-space:pre-wrap;line-height:1.7\">${esc(p.mod.asIs)}</div></div>`:''}\n"
        "      ${bpmnEditorHTML('asis',p.mod.bpmnAsIs)}\n"
        "\n"
        "      <hr>\n"
        "      <div class=\"card-t\" style=\"margin:.8rem 0 .2rem\">2. Análise inteligente</div>\n"
        "      <div style=\"font-size:12px;color:var(--ink3);margin-bottom:.6rem\">Confirme (✓) os achados com os quais concorda ou descarte (✗) os que não se aplicam ao seu processo.</div>\n"
        "      ${temAnalise?`\n"
        "        ${ia.resumo?`<div class=\"card\" style=\"margin-bottom:.8rem\"><div class=\"card-t\">Resumo</div><div style=\"font-size:13px;color:var(--ink2);line-height:1.7\">${esc(ia.resumo)}</div></div>`:''}\n"
        "        <div class=\"g4\" style=\"margin-bottom:.8rem\">\n"
        "          ${[['Complexidade',complexidade||'—'],['Ciclo médio',a.t_ciclo_medio||'—'],['Tempo de espera',a.t_espera_medio||'—'],['Atividades',a.qtd_atividades||'—']].map(([l,v])=>`<div class=\"card\"><div class=\"sec-lbl\" style=\"margin-bottom:2px\">${l}</div><div style=\"font-size:14px;font-weight:600\">${v}</div></div>`).join('')}\n"
        "        </div>\n"
        "        ${gargalos.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat analise-gar\">Gargalos (${gargalos.length})</div>${gargalos.map(g=>dfbRow('gargalos',g,'⚠')).join('')}</div>`:''}\n"
        "        ${retrabalhos.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat analise-ret\">Retrabalhos (${retrabalhos.length})</div>${retrabalhos.map(r=>dfbRow('retrabalhos',r,'↩')).join('')}</div>`:''}\n"
        "        ${gaps.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat analise-gap\">Pontos cegos (${gaps.length})</div>${gaps.map(g=>dfbRow('gaps',g,'○')).join('')}</div>`:''}\n"
        "        ${oportunidades.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat analise-oport\">Oportunidades (${oportunidades.length})</div>${oportunidades.map(o=>dfbRow('oportunidades',o,'✦')).join('')}</div>`:''}\n"
        "        ${solucoes.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat\" style=\"background:var(--teal-l);color:var(--teal)\">💡 Soluções para problemas (${solucoes.length})</div>${solucoes.map(s=>dfbRow('solucoes_problemas',s,'💡')).join('')}</div>`:''}\n"
        "        ${mitigacoes.length?`<div class=\"analise-item\" style=\"margin-bottom:.6rem\"><div class=\"analise-cat\" style=\"background:var(--amber-l);color:var(--amber)\">🛡 Mitigações de riscos (${mitigacoes.length})</div>${mitigacoes.map(m=>dfbRow('mitigacoes_riscos',m,'🛡')).join('')}</div>`:''}\n"
        "      `:`<div class=\"ib iba\" style=\"margin-bottom:.8rem\">Análise inteligente ainda não gerada pelo EP.</div>`}\n"
        "\n"
        "      <hr>\n"
        "      <div class=\"card-t\" style=\"margin:.8rem 0 .6rem\">3. Maturidade do processo</div>\n"
        "      ${mat?`\n"
        "        <div class=\"card\" style=\"margin-bottom:.8rem\">\n"
        "          <div style=\"display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap\">\n"
        "            <div style=\"text-align:center;min-width:80px\">\n"
        "              <div style=\"font-size:48px;font-weight:700;font-family:var(--fh);color:${matCor};line-height:1\">${mat}</div>\n"
        "              <div style=\"font-size:12px;font-weight:600;color:${matCor};margin-top:2px\">${ML[mat]||''}</div>\n"
        "            </div>\n"
        "            <div style=\"flex:1;min-width:160px\">\n"
        "              <div style=\"background:var(--bg2);border-radius:99px;overflow:hidden;height:10px;margin-bottom:.5rem\">\n"
        "                <div style=\"width:${mat*20}%;height:100%;background:${matCor};border-radius:99px\"></div>\n"
        "              </div>\n"
        "              <div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:4px;text-align:center\">\n"
        "                ${['Inicial','Repetível','Definido','Gerenciado','Otimizado'].map((l,i)=>`\n"
        "                  <div style=\"padding:4px 2px;border-radius:6px;background:${mat===i+1?matBg:'transparent'};border:1px solid ${mat===i+1?matCor:'var(--bdr)'}\">\n"
        "                    <div style=\"font-size:13px;font-weight:700;color:${mat===i+1?matCor:'var(--ink4)'}\">${i+1}</div>\n"
        "                    <div style=\"font-size:9px;color:${mat===i+1?matCor:'var(--ink4)'}\">${l}</div>\n"
        "                  </div>`).join('')}\n"
        "              </div>\n"
        "            </div>\n"
        "          </div>\n"
        "        </div>\n"
        "      `:`<div class=\"ib iba\" style=\"margin-bottom:.8rem\">Questionário de maturidade ainda não respondido.</div>`}\n"
        "\n"
        "      <hr style=\"margin:.8rem 0\">\n"
        "      <div class=\"fg\"><label class=\"fl\">Comentários / ajustes solicitados</label>\n"
        "        <textarea class=\"fi\" id=\"aobs\" style=\"min-height:70px\" placeholder=\"Descreva ajustes ou deixe em branco se aprovado...\"></textarea>\n"
        "      </div>\n"
        "      <div class=\"btn-row\">\n"
        "        <button class=\"btn btn-a\" onclick=\"reprovarValidAsIs()\">Solicitar ajustes</button>\n"
        "        <button class=\"btn btn-g\" onclick=\"aprovarComFeedback()\">Aprovar AS IS ✓</button>\n"
        "      </div>`;\n"
        "    }},"
    )
    c = c[:idx_start] + new_vd + c[idx_end:]
    print("  OK: valid_dono replacement")
else:
    errors.append("WARN: valid_dono pattern not found (start or end marker missing)")

# ─── 10. ACOES.complement — add meeting fields ──────────────────────────────
old_comp = (
    "  complement:{titulo:'Complementação pelo Dono',sub:'O dono do processo complementa o POP com informações operacionais.',role:'Dono do processo',rk:'dono',\n"
    "    form:p=>`<div class=\"ib iba\">Revise o POP elaborado e adicione informações que só você, como responsável pelo processo, pode fornecer.</div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Perguntas frequentes (FAQ)</label><textarea class=\"fi\" id=\"afaq\" style=\"min-height:80px\" placeholder=\"P: Pergunta frequente\\nR: Resposta\\n\\nP: Outra pergunta\\nR: Resposta\">${p.form?.faq||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Exceções / casos especiais</label><textarea class=\"fi\" id=\"a-excecoes\" style=\"min-height:70px\" placeholder=\"Situações fora do fluxo padrão que devem ser documentadas...\">${p.form?.excecoes||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Contatos-chave do processo</label><textarea class=\"fi\" id=\"a-contatos\" style=\"min-height:60px\" placeholder=\"Nome — Função — E-mail ou ramal\">${p.form?.contatos||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Formulários / sistemas utilizados</label><input class=\"fi\" id=\"aforms\" placeholder=\"Nome do formulário ou sistema — link se houver\" value=\"${p.form?.forms||''}\"></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Observações ou correções ao POP</label><textarea class=\"fi\" id=\"aobs\" style=\"min-height:60px\" placeholder=\"Aponte qualquer ajuste necessário no documento...\"></textarea></div>\n"
    "    <div class=\"btn-row\"><button class=\"btn btn-g\" onclick=\"salvarComplementacaoDono()\">Enviar complementação →</button></div>`},"
)
new_comp = (
    "  complement:{titulo:'Complementação pelo Dono',sub:'O dono do processo complementa o POP com informações operacionais.',role:'Dono do processo',rk:'dono',\n"
    "    form:p=>{const savedReu=p.form?.reuniao_complement||{};return`<div class=\"ib iba\">Revise o POP elaborado e adicione informações que só você, como responsável pelo processo, pode fornecer.</div>\n"
    "    <div class=\"card-t\" style=\"margin-bottom:.5rem\">Reunião de complementação</div>\n"
    "    <div class=\"g3\" style=\"margin-bottom:1rem\">\n"
    "      <div class=\"fg\"><label class=\"fl\">Data da reunião</label><input class=\"fi\" id=\"comp-dt\" type=\"date\" value=\"${savedReu.dt||''}\"></div>\n"
    "      <div class=\"fg\"><label class=\"fl\">Presentes</label><input class=\"fi\" id=\"comp-presentes\" placeholder=\"Nomes dos presentes\" value=\"${esc(savedReu.presentes||'')}\"></div>\n"
    "      <div class=\"fg\"><label class=\"fl\">Ata / encaminhamentos</label><textarea class=\"fi\" id=\"comp-ata\" style=\"min-height:54px\" placeholder=\"Resumo da reunião...\">${esc(savedReu.ata||'')}</textarea></div>\n"
    "    </div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Perguntas frequentes (FAQ)</label><textarea class=\"fi\" id=\"afaq\" style=\"min-height:80px\" placeholder=\"P: Pergunta frequente\\nR: Resposta\\n\\nP: Outra pergunta\\nR: Resposta\">${p.form?.faq||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Exceções / casos especiais</label><textarea class=\"fi\" id=\"a-excecoes\" style=\"min-height:70px\" placeholder=\"Situações fora do fluxo padrão que devem ser documentadas...\">${p.form?.excecoes||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Contatos-chave do processo</label><textarea class=\"fi\" id=\"a-contatos\" style=\"min-height:60px\" placeholder=\"Nome — Função — E-mail ou ramal\">${p.form?.contatos||''}</textarea></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Formulários / sistemas utilizados</label><input class=\"fi\" id=\"aforms\" placeholder=\"Nome do formulário ou sistema — link se houver\" value=\"${p.form?.forms||''}\"></div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Observações ou correções ao POP</label><textarea class=\"fi\" id=\"aobs\" style=\"min-height:60px\" placeholder=\"Aponte qualquer ajuste necessário no documento...\"></textarea></div>\n"
    "    <div class=\"btn-row\"><button class=\"btn btn-g\" onclick=\"salvarComplementacaoDono()\">Enviar complementação →</button></div>`}},"
)
rep(old_comp, new_comp, label="ACOES.complement meeting fields")

# ─── 11. ACOES.apresentacao — add ata field ──────────────────────────────────
rep(
"    <div class=\"g2\">\n      <div class=\"fg\"><label class=\"fl\">Data da reunião de apresentação</label><input class=\"fi\" id=\"adt\" type=\"date\"></div>\n      <div class=\"fg\"><label class=\"fl\">Participantes</label><input class=\"fi\" id=\"apart\" placeholder=\"Nomes dos presentes\"></div>\n    </div>\n    <div class=\"fg\"><label class=\"fl\">Decisão / encaminhamentos do gestor</label><textarea class=\"fi\" id=\"aobs\" style=\"min-height:70px\" placeholder=\"Decisão do gestor...\"></textarea></div>",
"    <div class=\"g2\">\n      <div class=\"fg\"><label class=\"fl\">Data da reunião de aprovação</label><input class=\"fi\" id=\"adt\" type=\"date\" value=\"${p.form?.dt_apresentacao||''}\"></div>\n      <div class=\"fg\"><label class=\"fl\">Participantes</label><input class=\"fi\" id=\"apart\" placeholder=\"Nomes dos presentes\" value=\"${esc(p.form?.apart||'')}\"></div>\n    </div>\n    <div class=\"fg\"><label class=\"fl\">Ata / encaminhamentos</label><textarea class=\"fi\" id=\"aata\" style=\"min-height:70px\" placeholder=\"Resumo da reunião e decisões...\">${esc(p.form?.ata_apresentacao||'')}</textarea></div>\n    <div class=\"fg\"><label class=\"fl\">Decisão / observações do gestor</label><textarea class=\"fi\" id=\"aobs\" style=\"min-height:60px\" placeholder=\"Decisão do gestor...\"></textarea></div>",
label="apresentacao ata field"
)

# ─── 12. Add new ACOES entries before desenho_final ─────────────────────────
new_tobe_acoes = (
    "  esboco_tobe:{titulo:'Esboço TO BE',sub:'Desenhar o fluxo futuro do processo (TO BE) com BPMN.',role:'EP',rk:'ep',\n"
    "    form:p=>`<div class=\"ib ibp\">Descreva o processo futuro e desenhe o fluxo TO BE no editor BPMN abaixo.</div>\n"
    "    <div class=\"fg\"><label class=\"fl\">Descrição TO BE</label>\n"
    "      <textarea class=\"fi\" id=\"e-tobe\" style=\"min-height:120px\" placeholder=\"Como o processo deve funcionar no futuro...\">${p.mod.toBe||''}</textarea>\n"
    "    </div>\n"
    "    ${bpmnEditorHTML('tobe', p.mod.bpmnToBe)}\n"
    "    <div class=\"btn-row\"><button class=\"btn btn-p\" onclick=\"salvarEsbocoTobe()\">Encaminhar para detalhamento TO BE →</button></div>`},\n"
    "\n"
    "  det_tobe:{titulo:'Detalhamento TO BE',sub:'Extrair do BPMN TO BE e detalhar cada atividade, evento e decisão.',role:'EP',rk:'ep',\n"
    "    form:p=>`<div class=\"ib ibp\">Extraia as etapas do diagrama BPMN TO BE ou adicione manualmente.</div>\n"
    "    <div style=\"display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap\">\n"
    "      <button class=\"btn btn-p\" onclick=\"extrairBpmn()\">⚡ Extrair etapas do BPMN TO BE</button>\n"
    "      <button class=\"btn\" onclick=\"addEtapaProc()\">+ Adicionar manualmente</button>\n"
    "      <span style=\"font-size:12px;color:var(--ink3);align-self:center\">A extração detecta todos os elementos do diagrama TO BE salvo.</span>\n"
    "    </div>\n"
    "    <div style=\"display:grid;grid-template-columns:1fr 340px;gap:1.25rem;align-items:start\">\n"
    "      <div>\n"
    "        <div id=\"etapas-proc-list\">${renderEtapasProc(p.mod.etapas_tobe||[])}</div>\n"
    "      </div>\n"
    "      <div style=\"position:sticky;top:1rem\">\n"
    "        <div style=\"background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:.85rem;box-shadow:var(--sh)\">\n"
    "          <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem\">\n"
    "            <div style=\"font-size:12px;font-weight:600;color:var(--ink2)\">Fluxo TO BE gerado</div>\n"
    "            <div style=\"display:flex;gap:4px\">\n"
    "              <button class=\"btn\" style=\"font-size:10px;padding:2px 8px\" onclick=\"atualizarMermaid()\" title=\"Recarregar diagrama\">↺ Ajustar</button>\n"
    "              <button class=\"btn\" style=\"font-size:10px;padding:2px 8px\" onclick=\"copiarMermaid()\">⎘ Copiar código</button>\n"
    "            </div>\n"
    "          </div>\n"
    "          <div id=\"mermaid-preview\" style=\"overflow-x:auto;min-height:80px\"><div style=\"font-size:11px;color:var(--ink3);text-align:center;padding:1rem\">Adicione etapas para visualizar o fluxo</div></div>\n"
    "        </div>\n"
    "      </div>\n"
    "    </div>\n"
    "    <div class=\"btn-row\">\n"
    "      <button class=\"btn\" onclick=\"skipDetTobe()\" title=\"Pular detalhamento e avançar\">Pular etapa</button>\n"
    "      <button class=\"btn btn-p\" onclick=\"salvarDetTobe()\">Encaminhar para validação TO BE →</button>\n"
    "    </div>`},\n"
    "\n"
    "  valid_tobe:{titulo:'Validação TO BE',sub:'O dono do processo revisa e valida o desenho TO BE proposto pelo EPP.',role:'Dono do processo',rk:'dono',\n"
    "    form:p=>{\n"
    "      const savedReu=p.ent?.reuniao_valid_tobe||{};\n"
    "      return `<div class=\"ib ibp\" style=\"margin-bottom:1.2rem\">Revise o desenho TO BE elaborado pelo EPP. Registre a reunião, aprove ou solicite ajustes.</div>\n"
    "\n"
    "      <div class=\"card-t\" style=\"margin-bottom:.5rem\">Reunião de validação TO BE</div>\n"
    "      <div class=\"g3\" style=\"margin-bottom:1rem\">\n"
    "        <div class=\"fg\"><label class=\"fl\">Data da reunião</label><input class=\"fi\" id=\"vt-dt\" type=\"date\" value=\"${savedReu.dt||''}\"></div>\n"
    "        <div class=\"fg\"><label class=\"fl\">Presentes</label><input class=\"fi\" id=\"vt-presentes\" placeholder=\"Nomes dos presentes\" value=\"${esc(savedReu.presentes||'')}\"></div>\n"
    "        <div class=\"fg\"><label class=\"fl\">Ata / encaminhamentos</label><textarea class=\"fi\" id=\"vt-ata\" style=\"min-height:54px\" placeholder=\"Resumo da reunião...\">${esc(savedReu.ata||'')}</textarea></div>\n"
    "      </div>\n"
    "\n"
    "      <div class=\"card-t\" style=\"margin-bottom:.6rem\">Desenho TO BE proposto</div>\n"
    "      ${p.mod.toBe?`<div class=\"card\" style=\"margin-bottom:.8rem\"><div class=\"card-t\">Descrição TO BE</div><div style=\"font-size:13px;color:var(--ink2);white-space:pre-wrap;line-height:1.7\">${esc(p.mod.toBe)}</div></div>`:''}\n"
    "      ${bpmnEditorHTML('tobe',p.mod.bpmnToBe)}\n"
    "\n"
    "      <hr style=\"margin:.8rem 0\">\n"
    "      <div class=\"fg\"><label class=\"fl\">Comentários / ajustes solicitados</label>\n"
    "        <textarea class=\"fi\" id=\"aobs\" style=\"min-height:70px\" placeholder=\"Descreva ajustes ou deixe em branco se aprovado...\"></textarea>\n"
    "      </div>\n"
    "      <div class=\"btn-row\">\n"
    "        <button class=\"btn btn-a\" onclick=\"reprovarTobe()\">Solicitar ajustes</button>\n"
    "        <button class=\"btn btn-g\" onclick=\"aprovarTobe()\">Aprovar TO BE ✓</button>\n"
    "      </div>`;\n"
    "    }},\n"
    "\n"
    "  desenho_final:{titulo:'Desenho final do processo',"
)
rep(
"  desenho_final:{titulo:'Desenho final do processo',",
new_tobe_acoes,
label="new ACOES esboco_tobe/det_tobe/valid_tobe"
)

# ─── 13. rAcao — add _procCtx + BPMN init for new steps ───────────────────────
rep(
"  const roleNote=role!==ac.rk?`<div class=\"ib iba\" style=\"margin-top:.7rem\">Esta etapa aguarda: <strong>${ac.role}</strong>. Troque o perfil para interagir.</div>`:'\';\n  el.innerHTML=buildAcaoCardHTML(ac,p,roleNote);\n  if(p.etapa==='esboco') setTimeout(()=>{initBpmnMod('asis',p);},120);\n  if(p.etapa==='desenho_final') setTimeout(()=>initBpmnMod('asis',p),120);\n  if(p.etapa==='det_etapas') setTimeout(atualizarMermaid,300);\n  if(p.etapa==='pop') setTimeout(injectIaPop, 100);\n}",
"  _procCtx = p.etapa==='det_tobe' ? 'etapas_tobe' : 'etapas_proc';\n  const roleNote=role!==ac.rk?`<div class=\"ib iba\" style=\"margin-top:.7rem\">Esta etapa aguarda: <strong>${ac.role}</strong>. Troque o perfil para interagir.</div>`:'\';\n  el.innerHTML=buildAcaoCardHTML(ac,p,roleNote);\n  if(p.etapa==='esboco') setTimeout(()=>{initBpmnMod('asis',p);},120);\n  if(p.etapa==='esboco_tobe') setTimeout(()=>{initBpmnMod('tobe',p);},120);\n  if(p.etapa==='desenho_final') setTimeout(()=>initBpmnMod('asis',p),120);\n  if(p.etapa==='det_etapas') setTimeout(atualizarMermaid,300);\n  if(p.etapa==='det_tobe') setTimeout(atualizarMermaid,300);\n  if(p.etapa==='pop') setTimeout(injectIaPop, 100);\n}",
label="rAcao _procCtx + BPMN init"
)

rep(
"    if(p.etapa==='valid_dono' && minhaTarefa) setTimeout(()=>initBpmnMod('asis',p),120);",
"    if(p.etapa==='valid_dono' && minhaTarefa) setTimeout(()=>initBpmnMod('asis',p),120);\n    if(p.etapa==='valid_tobe' && minhaTarefa) setTimeout(()=>initBpmnMod('tobe',p),120);",
label="rAcao valid_tobe BPMN init"
)

# ─── 14. navegarRetro — add esboco_tobe and valid_tobe BPMN init ─────────────
rep(
"  if(etId==='esboco'||etId==='valid_dono'||etId==='desenho_final') setTimeout(()=>initBpmnMod('asis',p),120);",
"  _procCtx = etId==='det_tobe' ? 'etapas_tobe' : 'etapas_proc';\n  if(etId==='esboco'||etId==='valid_dono'||etId==='desenho_final') setTimeout(()=>initBpmnMod('asis',p),120);\n  if(etId==='esboco_tobe'||etId==='valid_tobe') setTimeout(()=>initBpmnMod('tobe',p),120);\n  if(etId==='det_tobe') setTimeout(atualizarMermaid,300);",
label="navegarRetro new steps"
)

# ─── 15. salvarRetroativo — add new entries ──────────────────────────────────
rep(
"    publicacao:()=>{\n      p.form=p.form||{};\n      p.form.pub_link=document.getElementById('pub-link')?.value||p.form.pub_link;\n      p.form.pub_local=document.getElementById('pub-local')?.value||p.form.pub_local;\n    },\n  };",
"    esboco_tobe:()=>{\n      p.mod.toBe=document.getElementById('e-tobe')?.value||p.mod.toBe;\n      const mTobe=bpmnModelers['tobe'];\n      if(mTobe) mTobe.saveXML({format:true}).then(({xml})=>{p.mod.bpmnToBe=xml;}).catch(e=>console.warn(e));\n    },\n    det_tobe:()=>{/* etapas_tobe stored live */},\n    publicacao:()=>{\n      p.form=p.form||{};\n      p.form.pub_link=document.getElementById('pub-link')?.value||p.form.pub_link;\n      p.form.pub_local=document.getElementById('pub-local')?.value||p.form.pub_local;\n    },\n  };",
label="salvarRetroativo new entries"
)

# ─── 16. salvarEsboco — remove toBe saving ───────────────────────────────────
rep(
"function salvarEsboco(){\n  const p=curProc;\n  p.mod.asIs=document.getElementById('e-asis')?.value||'';\n  p.mod.toBe=document.getElementById('e-tobe')?.value||'';\n  // Save BPMN if modeler active\n  const mAs=bpmnModelers['asis'];\n  if(mAs){mAs.saveXML({format:true}).then(({xml})=>{p.mod.bpmnAsIs=xml;}).catch(e=>console.warn('bpmn saveXML asis:',e.message));}\n  const mTo=bpmnModelers['tobe'];\n  if(mTo){mTo.saveXML({format:true}).then(({xml})=>{p.mod.bpmnToBe=xml;}).catch(e=>console.warn('bpmn saveXML tobe:',e.message));}\n  av('esboco','EP','Esboço AS IS/TO BE elaborado com BPMN');\n}",
"function salvarEsboco(){\n  const p=curProc;\n  p.mod.asIs=document.getElementById('e-asis')?.value||'';\n  const mAs=bpmnModelers['asis'];\n  if(mAs){mAs.saveXML({format:true}).then(({xml})=>{p.mod.bpmnAsIs=xml;}).catch(e=>console.warn('bpmn saveXML asis:',e.message));}\n  av('esboco','EP','Esboço AS IS elaborado com BPMN');\n}\nfunction salvarEsbocoTobe(){\n  const p=curProc;\n  p.mod.toBe=document.getElementById('e-tobe')?.value||'';\n  const mTo=bpmnModelers['tobe'];\n  if(mTo){mTo.saveXML({format:true}).then(({xml})=>{p.mod.bpmnToBe=xml;}).catch(e=>console.warn('bpmn saveXML tobe:',e.message));}\n  av('esboco_tobe','EP','Esboço TO BE elaborado com BPMN');\n}",
label="salvarEsboco remove TO BE + add salvarEsbocoTobe"
)

# ─── 17. aprovarComFeedback — save meeting fields + add new functions ─────────
rep(
"function aprovarComFeedback(){\n  const p=curProc;\n  if(!p.ent.analise)p.ent.analise={};\n  const fb={};\n  (window._dfbItems||[]).forEach(({tipo,texto})=>{\n    const val=window._dfb?.[tipo]?.[texto];\n    if(val){if(!fb[tipo])fb[tipo]={};fb[tipo][texto]=val;}\n  });\n  p.ent.analise.feedback_dono=fb;\n  avDono('valid_dono','Dono do processo','Modelagem validada pelo dono',null);\n}",
"function aprovarComFeedback(){\n  const p=curProc;\n  if(!p.ent.analise)p.ent.analise={};\n  const fb={};\n  (window._dfbItems||[]).forEach(({tipo,texto})=>{\n    const val=window._dfb?.[tipo]?.[texto];\n    if(val){if(!fb[tipo])fb[tipo]={};fb[tipo][texto]=val;}\n  });\n  p.ent.analise.feedback_dono=fb;\n  const dt=document.getElementById('vd-dt')?.value||'';\n  const presentes=document.getElementById('vd-presentes')?.value||'';\n  const ata=document.getElementById('vd-ata')?.value||'';\n  if(dt||presentes||ata) p.ent.analise.reuniao_valid_asis={dt,presentes,ata};\n  avDono('valid_dono','Dono do processo','Validação AS IS aprovada',null);\n}\nfunction reprovarValidAsIs(){\n  const p=curProc;\n  if(!p.ent.analise)p.ent.analise={};\n  const dt=document.getElementById('vd-dt')?.value||'';\n  const presentes=document.getElementById('vd-presentes')?.value||'';\n  const ata=document.getElementById('vd-ata')?.value||'';\n  if(dt||presentes||ata) p.ent.analise.reuniao_valid_asis={dt,presentes,ata};\n  const obs=document.getElementById('aobs')?.value||'';\n  if(obs) p.ent.analise.obs_reprovacao_asis=obs;\n  reprovarDono('esboco','Dono','Dono solicitou ajustes no AS IS');\n}\nfunction aprovarTobe(){\n  const p=curProc;\n  if(!p.ent)p.ent={};\n  const dt=document.getElementById('vt-dt')?.value||'';\n  const presentes=document.getElementById('vt-presentes')?.value||'';\n  const ata=document.getElementById('vt-ata')?.value||'';\n  if(dt||presentes||ata) p.ent.reuniao_valid_tobe={dt,presentes,ata};\n  avDono('valid_tobe','Dono do processo','Validação TO BE aprovada',null);\n}\nfunction reprovarTobe(){\n  const p=curProc;\n  if(!p.ent)p.ent={};\n  const dt=document.getElementById('vt-dt')?.value||'';\n  const presentes=document.getElementById('vt-presentes')?.value||'';\n  const ata=document.getElementById('vt-ata')?.value||'';\n  if(dt||presentes||ata) p.ent.reuniao_valid_tobe={dt,presentes,ata};\n  const obs=document.getElementById('aobs')?.value||'';\n  if(obs){if(!p.ent.analise)p.ent.analise={};p.ent.analise.obs_reprovacao_tobe=obs;}\n  reprovarDono('esboco_tobe','Dono','Dono solicitou ajustes no TO BE');\n}",
label="aprovarComFeedback + new TO BE approve/reject functions"
)

# ─── 18. renderFeedbackEP — add solucoes + mitigacoes ────────────────────────
rep(
"  const labels={gargalos:['⚠','analise-gar','Gargalos'],retrabalhos:['↩','analise-ret','Retrabalhos'],gaps:['○','analise-gap','Pontos cegos'],oportunidades:['✦','analise-oport','Oportunidades']};",
"  const labels={gargalos:['⚠','analise-gar','Gargalos'],retrabalhos:['↩','analise-ret','Retrabalhos'],gaps:['○','analise-gap','Pontos cegos'],oportunidades:['✦','analise-oport','Oportunidades'],solucoes_problemas:['💡','analise-gap','Soluções p/ problemas'],mitigacoes_riscos:['🛡','analise-oport','Mitigações de riscos']};",
label="renderFeedbackEP new types"
)

# ─── 19. salvarComplementacaoDono — add meeting fields ──────────────────────
rep(
"function salvarComplementacaoDono(){\n  const p=curProc;\n  if(!p.form)p.form={};\n  p.form.faq=document.getElementById('afaq')?.value||p.form.faq||'';\n  p.form.excecoes=document.getElementById('a-excecoes')?.value||p.form.excecoes||'';\n  p.form.contatos=document.getElementById('a-contatos')?.value||p.form.contatos||'';\n  p.form.forms=document.getElementById('aforms')?.value||p.form.forms||'';\n  const obs=document.getElementById('aobs')?.value||'';\n  if(obs) p.form.obs_complement=obs;\n  av('complement','Dono','Complementação fornecida pelo dono do processo');\n}",
"function salvarComplementacaoDono(){\n  const p=curProc;\n  if(!p.form)p.form={};\n  p.form.faq=document.getElementById('afaq')?.value||p.form.faq||'';\n  p.form.excecoes=document.getElementById('a-excecoes')?.value||p.form.excecoes||'';\n  p.form.contatos=document.getElementById('a-contatos')?.value||p.form.contatos||'';\n  p.form.forms=document.getElementById('aforms')?.value||p.form.forms||'';\n  const obs=document.getElementById('aobs')?.value||'';\n  if(obs) p.form.obs_complement=obs;\n  const dt=document.getElementById('comp-dt')?.value||'';\n  const presentes=document.getElementById('comp-presentes')?.value||'';\n  const ata=document.getElementById('comp-ata')?.value||'';\n  if(dt||presentes||ata) p.form.reuniao_complement={dt,presentes,ata};\n  av('complement','Dono','Complementação fornecida pelo dono do processo');\n}",
label="salvarComplementacaoDono meeting fields"
)

# ─── 20. salvarApresentacao — add ata saving ─────────────────────────────────
rep(
"function salvarApresentacao(){\n  const obs=document.getElementById('aobs')?.value||'';\n  const p=curProc;\n  if(!p.form)p.form={pop_ok:false,pop:null,apresent:''};\n  p.form.apresent='Aprovado pelo gestor em '+now()+(obs?'. '+obs:'');\n  av('apresentacao','Gestor','Aprovado pelo gestor para publicação');\n}",
"function salvarApresentacao(){\n  const obs=document.getElementById('aobs')?.value||'';\n  const p=curProc;\n  if(!p.form)p.form={pop_ok:false,pop:null,apresent:''};\n  p.form.apresent='Aprovado pelo gestor em '+now()+(obs?'. '+obs:'');\n  p.form.dt_apresentacao=document.getElementById('adt')?.value||'';\n  p.form.apart=document.getElementById('apart')?.value||'';\n  p.form.ata_apresentacao=document.getElementById('aata')?.value||'';\n  av('apresentacao','Gestor','Aprovado pelo gestor para publicação');\n}",
label="salvarApresentacao add ata"
)

# ─── 21. Add skip/salvarDet functions near salvarDetEtapas ──────────────────
rep(
"function salvarDetEtapas(){\n  av('det_etapas','EP','Etapas detalhadas: '+(curProc?.mod?.etapas_proc||[]).length+' etapas');\n}",
"function salvarDetEtapas(){\n  _procCtx='etapas_proc';\n  av('det_etapas','EP','Etapas detalhadas: '+(curProc?.mod?.etapas_proc||[]).length+' etapas');\n}\nfunction skipDetEtapas(){\n  _procCtx='etapas_proc';\n  av('det_etapas','EP','Detalhamento AS IS pulado');\n}\nfunction skipDetTobe(){\n  _procCtx='etapas_proc';\n  av('det_tobe','EP','Detalhamento TO BE pulado');\n}\nfunction salvarDetTobe(){\n  _procCtx='etapas_proc';\n  av('det_tobe','EP','Etapas TO BE detalhadas: '+(curProc?.mod?.etapas_tobe||[]).length+' etapas');\n}",
label="skip/salvar det functions"
)

# ─── 22. resolveGwPath — use _procCtx ────────────────────────────────────────
rep(
"  let obj=curProc.mod.etapas_proc.find(x=>x.id===parts[0]);",
"  let obj=curProc.mod[_procCtx].find(x=>x.id===parts[0]);",
label="resolveGwPath _procCtx"
)

# ─── 23. renderEtapaDetalheConteudo — use _procCtx ───────────────────────────
c = c.replace(
    "oninput=\"curProc.mod.etapas_proc.find(x=>x.id==='${id}').nome=this.value;document.querySelector",
    "oninput=\"curProc.mod[_procCtx].find(x=>x.id==='${id}').nome=this.value;document.querySelector",
    1
)
c = c.replace(
    "const _e=curProc.mod.etapas_proc.find(x=>x.id==='${id}');_e.tipo=s.value;_e.subtipo_evento=null",
    "const _e=curProc.mod[_procCtx].find(x=>x.id==='${id}');_e.tipo=s.value;_e.subtipo_evento=null",
    1
)
c = c.replace(
    "onchange=\"curProc.mod.etapas_proc.find(x=>x.id==='${id}').natureza=this.value\"",
    "onchange=\"curProc.mod[_procCtx].find(x=>x.id==='${id}').natureza=this.value\"",
    1
)
c = c.replace(
    "onchange=\"curProc.mod.etapas_proc.find(x=>x.id==='${id}').modo=this.value\"",
    "onchange=\"curProc.mod[_procCtx].find(x=>x.id==='${id}').modo=this.value\"",
    1
)
c = c.replace(
    "oninput=\"curProc.mod.etapas_proc.find(x=>x.id==='${id}').executor=this.value\"",
    "oninput=\"curProc.mod[_procCtx].find(x=>x.id==='${id}').executor=this.value\"",
    1
)
c = c.replace(
    "const _e=curProc.mod.etapas_proc.find(x=>x.id==='${id}');_e.subtipo_evento=s.value||null",
    "const _e=curProc.mod[_procCtx].find(x=>x.id==='${id}');_e.subtipo_evento=s.value||null",
    1
)
c = c.replace(
    "oninput=\"curProc.mod.etapas_proc.find(x=>x.id==='${id}').desc=this.value\">${e.desc||''}",
    "oninput=\"curProc.mod[_procCtx].find(x=>x.id==='${id}').desc=this.value\">${e.desc||''}",
    1
)
print("  OK: renderEtapaDetalheConteudo _procCtx")

# ─── 24. reRenderEtapaDetalhe + reRenderGw — use _procCtx ────────────────────
c = c.replace(
    "  const e=curProc.mod.etapas_proc.find(x=>x.id===etapaId);\n  if(el&&e){ el.innerHTML=renderEtapaDetalheConteudo(e); atualizarMermaid(); }",
    "  const e=curProc.mod[_procCtx].find(x=>x.id===etapaId);\n  if(el&&e){ el.innerHTML=renderEtapaDetalheConteudo(e); atualizarMermaid(); }",
    1
)
c = c.replace(
    "  const e=curProc.mod.etapas_proc.find(x=>x.id===etapaId);\n  if(el&&e){ el.innerHTML=renderGatewaySection(etapaId,0); atualizarMermaid(); }",
    "  const e=curProc.mod[_procCtx].find(x=>x.id===etapaId);\n  if(el&&e){ el.innerHTML=renderGatewaySection(etapaId,0); atualizarMermaid(); }",
    1
)
print("  OK: reRenderEtapaDetalhe/Gw _procCtx")

# ─── 25. remEtapaProc — use _procCtx ─────────────────────────────────────────
rep(
"function remEtapaProc(id){\n  if(!curProc?.mod?.etapas_proc)return;\n  curProc.mod.etapas_proc=curProc.mod.etapas_proc.filter(e=>e.id!==id);\n  curProc.mod.etapas_proc.forEach((e,i)=>e.seq=i+1);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod.etapas_proc);\n  atualizarMermaid();\n}",
"function remEtapaProc(id){\n  if(!curProc?.mod?.[_procCtx])return;\n  curProc.mod[_procCtx]=curProc.mod[_procCtx].filter(e=>e.id!==id);\n  curProc.mod[_procCtx].forEach((e,i)=>e.seq=i+1);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod[_procCtx]);\n  atualizarMermaid();\n}",
label="remEtapaProc _procCtx"
)

# ─── 26. onEtapaDrop — use _procCtx ──────────────────────────────────────────
rep(
"  const etapas = curProc.mod.etapas_proc;",
"  const etapas = curProc.mod[_procCtx];",
label="onEtapaDrop _procCtx"
)

# ─── 27. addEtapaProc — use _procCtx ─────────────────────────────────────────
rep(
"function addEtapaProc(){\n  if(!curProc?.mod)return;\n  if(!curProc.mod.etapas_proc)curProc.mod.etapas_proc=[];\n  const seq=(curProc.mod.etapas_proc.length||0)+1;\n  const nova={id:'ep'+etapasIdC++,seq,nome:'Nova etapa '+seq,tipo:'Atividade',natureza:'Execucao',modo:'Manual',executor:'',desc:'',subtipo_evento:null,caminhos:[]};\n  curProc.mod.etapas_proc.push(nova);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod.etapas_proc);\n  setTimeout(()=>{ toggleEtapaDetalhe(nova.id); atualizarMermaid(); },50);\n}",
"function addEtapaProc(){\n  if(!curProc?.mod)return;\n  if(!curProc.mod[_procCtx])curProc.mod[_procCtx]=[];\n  const seq=(curProc.mod[_procCtx].length||0)+1;\n  const nova={id:'ep'+etapasIdC++,seq,nome:'Nova etapa '+seq,tipo:'Atividade',natureza:'Execucao',modo:'Manual',executor:'',desc:'',subtipo_evento:null,caminhos:[]};\n  curProc.mod[_procCtx].push(nova);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod[_procCtx]);\n  setTimeout(()=>{ toggleEtapaDetalhe(nova.id); atualizarMermaid(); },50);\n}",
label="addEtapaProc _procCtx"
)

# ─── 28. extrairBpmn — use _procCtx and auto-detect BPMN source ──────────────
rep(
"function extrairBpmn(){\n  const p=curProc;\n  if(!p?.mod?.bpmnAsIs){\n    toast('Nenhum fluxo BPMN AS IS salvo. Salve o BPMN na aba de Esboço primeiro.','var(--amber)');\n    return;\n  }\n  const parser=new DOMParser();\n  const xml=parser.parseFromString(p.mod.bpmnAsIs,'text/xml');",
"function extrairBpmn(){\n  const p=curProc;\n  const bpmnField=_procCtx==='etapas_tobe'?'bpmnToBe':'bpmnAsIs';\n  const ctxLabel=_procCtx==='etapas_tobe'?'TO BE':'AS IS';\n  if(!p?.mod?.[bpmnField]){\n    toast(`Nenhum fluxo BPMN ${ctxLabel} salvo. Salve o BPMN no Esboço primeiro.`,'var(--amber)');\n    return;\n  }\n  const parser=new DOMParser();\n  const xml=parser.parseFromString(p.mod[bpmnField],'text/xml');",
label="extrairBpmn auto-detect BPMN source"
)

rep(
"  if(!p.mod.etapas_proc)p.mod.etapas_proc=[];\n  const existentes=new Set(p.mod.etapas_proc.map(e=>e.nome));\n  const novas=elems.filter(e=>!existentes.has(e.nome));\n  p.mod.etapas_proc=[...p.mod.etapas_proc,...novas];\n  // Re-sequence\n  p.mod.etapas_proc.forEach((e,i)=>e.seq=i+1);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(p.mod.etapas_proc);\n  atualizarMermaid();\n  toast(novas.length+' etapas extraídas do BPMN!');\n}",
"  if(!p.mod[_procCtx])p.mod[_procCtx]=[];\n  const existentes=new Set(p.mod[_procCtx].map(e=>e.nome));\n  const novas=elems.filter(e=>!existentes.has(e.nome));\n  p.mod[_procCtx]=[...p.mod[_procCtx],...novas];\n  // Re-sequence\n  p.mod[_procCtx].forEach((e,i)=>e.seq=i+1);\n  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(p.mod[_procCtx]);\n  atualizarMermaid();\n  toast(novas.length+' etapas extraídas do BPMN!');\n}",
label="extrairBpmn _procCtx end"
)

# ─── 29. atualizarMermaid — use _procCtx ─────────────────────────────────────
rep(
"  const etapas = curProc?.mod?.etapas_proc||[];",
"  const etapas = curProc?.mod?.[_procCtx]||[];",
label="atualizarMermaid _procCtx"
)

# ─── 30. etapasIdC init — also count etapas_tobe ─────────────────────────────
rep(
"  const nums=(curProc?.mod?.etapas_proc||[]).map(e=>parseInt(String(e.id||'').replace('ep',''))||0);\n  if(nums.length) etapasIdC=Math.max(etapasIdC,...nums)+1;",
"  const nums=[...(curProc?.mod?.etapas_proc||[]),...(curProc?.mod?.etapas_tobe||[])].map(e=>parseInt(String(e.id||'').replace('ep',''))||0);\n  if(nums.length) etapasIdC=Math.max(etapasIdC,...nums)+1;",
label="etapasIdC init tobe"
)

# ─── Final report ─────────────────────────────────────────────────────────────
if errors:
    print("\nWARNINGS:")
    for e in errors:
        print(f"  {e}")
else:
    print("\nAll replacements applied successfully!")

with open('C:/gesproc-functions/index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f"File written: {len(c)} bytes")
