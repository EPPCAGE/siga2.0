#!/usr/bin/env node
/**
 * Gera PDF do diagrama de arquitetura SIGA 2.0.
 * Renderiza os blocos Mermaid com Playwright + Chromium e produz um único PDF.
 *
 * Uso: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/gerar-diagrama-pdf.mjs
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dir, '..');
const INPUT  = resolve(ROOT, 'docs/architecture/diagrama-arquitetura.md');
const OUTPUT = resolve(ROOT, 'docs/architecture/diagrama-arquitetura.pdf');

// ── Parse markdown: extract sections and mermaid blocks ──────────────────────

function parseMd(md){
  const sections = [];
  let current = { title: null, parts: [] };

  for(const line of md.split('\n')){
    if(line.startsWith('## ')){
      if(current.parts.length) sections.push(current);
      current = { title: line.replace(/^#+\s*/, ''), parts: [] };
    } else {
      current.parts.push(line);
    }
  }
  if(current.parts.length) sections.push(current);
  return sections;
}

function sectionToHtmlParts(section){
  const parts = [];
  const lines = section.parts;
  let i = 0;
  while(i < lines.length){
    if(lines[i].trim() === '```mermaid'){
      let j = i + 1;
      while(j < lines.length && lines[j].trim() !== '```') j++;
      parts.push({ type: 'mermaid', code: lines.slice(i+1, j).join('\n') });
      i = j + 1;
    } else {
      let block = [];
      while(i < lines.length && lines[i].trim() !== '```mermaid'){
        block.push(lines[i]);
        i++;
      }
      const text = block.join('\n').trim();
      if(text) parts.push({ type: 'text', text });
    }
  }
  return parts;
}

// ── Build full HTML page ──────────────────────────────────────────────────────

function mdToHtml(text){
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`(.+?)`/g,'<code>$1</code>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split('|').map(c => c.trim());
      return '<tr>'+cells.map(c => c.match(/^-+$/) ? '' : `<td>${c}</td>`).join('')+'</tr>';
    })
    .replace(/^#{3} (.+)$/gm,'<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm,'<h2>$1</h2>')
    .replace(/^#{1} (.+)$/gm,'<h1>$1</h1>')
    .replace(/\n{2,}/g,'</p><p>')
    .replace(/^(?!<[hbct])/gm, '')
    .replace(/(<tr>.*<\/tr>\n?)+/gs, m => `<table>${m}</table>`);
}

const MERMAID_JS = readFileSync(resolve(ROOT, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf8');

function buildHtml(sections){
  const sectionHtml = sections.map((sec, si) => {
    const partsHtml = sectionToHtmlParts(sec).map((part, pi) => {
      if(part.type === 'mermaid'){
        return `<div class="diagram" id="d${si}_${pi}">${part.code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
      }
      return `<div class="prose">${mdToHtml(part.text)}</div>`;
    }).join('\n');

    return sec.title
      ? `<section><h2>${sec.title}</h2>${partsHtml}</section>`
      : `<section>${partsHtml}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diagrama de Arquitetura — SIGA 2.0</title>
<script>${MERMAID_JS}</script>
<style>
  :root { --blue:#1e40af; --ink:#1a1a2e; --ink2:#374151; --bdr:#e5e7eb; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family:'Segoe UI',Arial,sans-serif;
    font-size:12px; line-height:1.6;
    color:var(--ink); background:#fff;
    padding:32px 40px;
  }
  h1 { font-size:22px; color:var(--blue); margin-bottom:6px; }
  h2 { font-size:15px; color:var(--blue); margin:28px 0 10px;
       border-bottom:2px solid var(--blue); padding-bottom:4px; }
  h3 { font-size:13px; color:var(--ink); margin:14px 0 6px; }
  section { margin-bottom:8px; }
  .prose { color:var(--ink2); margin-bottom:10px; }
  .prose p { margin-bottom:6px; }
  .prose blockquote {
    border-left:3px solid var(--blue); padding:6px 12px;
    margin:10px 0; background:#f0f4ff; border-radius:0 4px 4px 0;
    font-style:italic; color:#374151; font-size:11.5px;
  }
  .prose code {
    background:#f3f4f6; padding:1px 5px; border-radius:3px;
    font-family:monospace; font-size:11px;
  }
  .prose strong { color:var(--ink); }
  .prose table {
    width:100%; border-collapse:collapse; margin:10px 0; font-size:11.5px;
  }
  .prose table td {
    border:1px solid var(--bdr); padding:5px 10px; vertical-align:top;
  }
  .prose table tr:first-child td { font-weight:700; background:#f0f4ff; }
  .prose table tr:nth-child(even) td { background:#f9fafb; }
  .diagram {
    margin:14px 0;
    display:flex; justify-content:center;
    page-break-inside:avoid;
  }
  .diagram svg { max-width:100%; height:auto; }
  @media print {
    body { padding:16px 20px; }
    section { page-break-inside:avoid; }
    h2 { page-break-after:avoid; }
    .diagram { page-break-inside:avoid; }
  }
</style>
</head>
<body>
<h1>Diagrama de Arquitetura — SIGA 2.0</h1>
<p style="color:#6b7280;font-size:11px;margin:4px 0 24px">
  Gerado automaticamente de <code>docs/architecture/diagrama-arquitetura.md</code>
</p>
${sectionHtml}
<script>
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    themeVariables: { primaryColor:'#dbeafe', primaryTextColor:'#1e40af',
      primaryBorderColor:'#93c5fd', lineColor:'#6b7280',
      secondaryColor:'#f0f4ff', tertiaryColor:'#f9fafb' },
    flowchart: { htmlLabels: true, curve:'basis', padding:12 },
    sequence: { actorMargin:50 },
  });

  async function renderAll(){
    const divs = document.querySelectorAll('.diagram');
    for(const div of divs){
      const code = div.textContent.trim();
      div.textContent = '';
      try {
        const id = 'mermaid-' + div.id;
        const { svg } = await mermaid.render(id, code);
        div.innerHTML = svg;
      } catch(e){
        div.innerHTML = '<pre style="color:red;font-size:10px">Erro: '+e.message+'</pre>';
      }
    }
    document.title = '__READY__';
  }
  renderAll();
</script>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(){
  const md = readFileSync(INPUT, 'utf8');
  const sections = parseMd(md);
  const html = buildHtml(sections);

  // Write temp HTML for debugging (optional)
  const tmpHtml = OUTPUT.replace('.pdf', '.tmp.html');
  writeFileSync(tmpHtml, html, 'utf8');

  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Wait for mermaid to finish rendering (title changes to __READY__)
  await page.waitForFunction(() => document.title === '__READY__', { timeout: 30_000 });
  // Extra settle time for SVG layout
  await page.waitForTimeout(1000);

  await page.pdf({
    path: OUTPUT,
    format: 'A4',
    printBackground: true,
    margin: { top:'18mm', bottom:'18mm', left:'14mm', right:'14mm' },
  });

  await browser.close();

  try { unlinkSync(tmpHtml); } catch(_){}

  console.log(`PDF gerado: ${OUTPUT}`);
}

try {
  await main();
} catch(e){
  console.error(e.message);
  process.exitCode = 1;
}
