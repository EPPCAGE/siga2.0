#!/usr/bin/env node

import dns from 'node:dns/promises';
import process from 'node:process';

const DEFAULT_URLS = [
  'https://eppcage.com.br/',
  'https://sigaepp.web.app/',
];

if (process.argv.includes('--help')) {
  console.log(`Uso: npm run site:check -- [URLs...]

Verifica DNS e a resposta HTTPS do domínio público e do endereço canônico do
Firebase Hosting. Sem argumentos, verifica:
  ${DEFAULT_URLS.join('\n  ')}`);
  process.exit(0);
}

const urls = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const targets = urls.length > 0 ? urls : DEFAULT_URLS;
let failed = false;

async function check(target) {
  const url = new URL(target);
  console.log(`\n${url.href}`);

  try {
    const addresses = await dns.lookup(url.hostname, { all: true });
    console.log(`  DNS: OK (${addresses.map(({ address }) => address).join(', ')})`);
  } catch (error) {
    failed = true;
    console.error(`  DNS: FALHOU (${error.code ?? error.message})`);
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const status = `${response.status} ${response.statusText}`.trim();
    console.log(`  HTTP(S): ${response.ok ? 'OK' : 'FALHOU'} (${status})`);
    console.log(`  URL final: ${response.url}`);
    if (!response.ok) failed = true;
  } catch (error) {
    failed = true;
    const cause = error.cause?.code ?? error.cause?.message;
    console.error(`  HTTP(S): FALHOU (${cause ?? error.message})`);
  }
}

for (const target of targets) {
  try {
    await check(target);
  } catch (error) {
    failed = true;
    console.error(`\n${target}\n  URL inválida: ${error.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
