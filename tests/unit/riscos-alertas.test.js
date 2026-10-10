import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
const context=vm.createContext({Intl,Date,require:name=>name==='node:crypto'?{createHash}:{onSchedule:()=>{}},module:{exports:{}}});
vm.runInContext(readFileSync('functions/riscos-alertas.js','utf8'),context);const A=context.module.exports;
describe('Alertas de prazo de risco',()=>{
  it('considera o prazo encerrado após o fim do dia em Brasília e dispensa tratados',()=>{
    expect(A.hoje(new Date('2026-10-11T02:00:00Z'))).toBe('2026-10-10');
    expect(A.pendente({prazo_tratamento:'2026-10-10'},'2026-10-10')).toBe(false);
    expect(A.pendente({prazo_tratamento:'2026-10-10',status_tratamento:'aguardando_verificacao'},'2026-10-11')).toBe(true);
    expect(A.pendente({prazo_tratamento:'2026-10-10',status_tratamento:'tratado'},'2026-10-11')).toBe(false);
    expect(A.pendente({},'2026-10-11')).toBe(false);
  });
  it('avisa apenas EP ativos e não duplica destinatários',()=>{
    const users=[{perfil:'ep',email:'EP@CAGE'},{perfis:['ep'],email:'ep@cage'},{perfil:'gestor',email:'gestor@cage'},{perfil:'ep',email:'inativo@cage',ativo:false}];
    expect(A.destinatarios(JSON.stringify(users))).toHaveLength(1);
  });
  it('gera um único aviso por prazo e usuário, e um novo aviso para prazo reprogramado',async()=>{
    const documents=new Map(),risk={id:'r1',desc:'Prazo legal',prazo_tratamento:'2026-10-10'},process={id:1,nome:'Auditar',ent:{riscos:[risk]}};
    const ref={path:'processos/1'},users=[{nome:'EP',email:'ep@cage'}];
    const db={collection:()=>({doc:id=>({path:'notifs/'+id})}),runTransaction:async fn=>fn({get:async target=>target===ref?{exists:true,data:()=>process}:{exists:documents.has(target.path)},create:(target,value)=>documents.set(target.path,value)})};
    await A.alertarProcesso(db,ref,users,'2026-10-11');await A.alertarProcesso(db,ref,users,'2026-10-12');expect(documents.size).toBe(1);
    expect([...documents.values()][0].acao).toContain('Verifique');
    risk.prazo_tratamento='2026-10-12';await A.alertarProcesso(db,ref,users,'2026-10-13');expect(documents.size).toBe(2);
    risk.status_tratamento='tratado';await A.alertarProcesso(db,ref,users,'2026-10-14');expect(documents.size).toBe(2);
  });
});
