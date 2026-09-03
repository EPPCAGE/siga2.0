import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../functions/index.js', import.meta.url), 'utf8');

describe('CORS da função de IA', () => {
  it('permite que o runtime responda ao preflight antes da autenticação', () => {
    expect(source).toContain('invoker: "public"');
    expect(source).toContain('cors: Array.from(ALLOWED_ORIGINS)');
  });

  it('autoriza a origem usada pela aplicação', () => {
    expect(source).toContain('"https://eppcage.com.br"');
  });
});
