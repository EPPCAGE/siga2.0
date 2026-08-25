import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../projetos-logic.js', import.meta.url), 'utf8');

describe('governança do portfólio', () => {
  it('mantém o cadastro de demandas somente com os campos solicitados', () => {
    const renderStart = source.indexOf('function projGovRenderDemandas()');
    const renderEnd = source.indexOf('function projGovAddDemand()', renderStart);
    const demandForm = source.slice(renderStart, renderEnd);

    expect(demandForm).not.toContain('gov-dem-alinhamento');
    expect(demandForm).not.toContain('gov-dem-capacidade');
  });

  it('aplica a visualização somente leitura sem depender da função legada', () => {
    const permissionsStart = source.indexOf('function projApplyPermissions()');
    const permissionsEnd = source.indexOf('function projProjetosVinculadosUsuario', permissionsStart);
    const permissions = source.slice(permissionsStart, permissionsEnd);

    expect(permissions).toContain("document.querySelectorAll('.ep-only')");
    expect(permissions).toContain("el.style.display = canEdit ? '' : 'none'");
    expect(source).not.toMatch(/\n\s*aplicarPermissoes\(\);/);
  });

  it('oferece registro de reunião, deliberação e geração de ata', () => {
    expect(source).toContain('function projGovAddMeeting()');
    expect(source).toContain('function projGovAddDecision(meetingId)');
    expect(source).toContain('function projGovGenerateMinutes(meetingId)');
  });
});
