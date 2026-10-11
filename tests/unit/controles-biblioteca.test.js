import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const seed=readFileSync('src/shared/controles-catalogo.js','utf8');
const source=readFileSync('src/shared/controles-biblioteca.js','utf8');
function library(){
  const stored=new Map();let fail=false;
  const scope={crypto:{randomUUID:()=>String(stored.size+1)},fbReady:()=>true,fb:()=>({serverTimestamp:()=> 'server-time',auth:{currentUser:{uid:'u1'}}}),FirestoreRepositories:{collection:()=>({list:async()=>({docs:[...stored].map(([id,data])=>({id,data}))}),set:async(id,data)=>{if(fail)throw Error('Falha de rede');stored.set(id,data);}})}};
  runInNewContext(seed+'\n'+source,scope);
  return {api:scope.ControlesBiblioteca,stored,scope,setFail:value=>fail=value};
}
describe('biblioteca de controles',()=>{
  it('contém os 40 controles fornecidos, preservando códigos e tipos',()=>{
    const {api}=library();expect(api.all()).toHaveLength(40);expect(new Set(api.all().map(c=>c.id)).size).toBe(40);
    expect(api.search('GOV-02')[0].nome).toBe('Segregação de funções');
    expect(api.search('cópias segurança')[0].id).toBe('TEC-05');
  });
  it('sugere controles por risco sem vincular nem criar controles',()=>{
    const {api,stored}=library();expect(api.suggest('Atraso nos prazos de entrega').some(c=>c.id.startsWith('PRA-'))).toBe(true);
    expect(api.suggest('Perda de dados e interrupção de sistemas').some(c=>c.id==='TEC-05')).toBe(true);
    expect(api.suggest('')).toHaveLength(0);expect(stored.size).toBe(0);
  });
  it('salva novos controles compartilhados e os recupera em outra sessão',async()=>{
    const {api,stored,scope}=library();const control=await api.create({nome:'Dupla checagem de retenções',categoria:'Tributos',tipo:'Detectivo',descricao:'Conferir retenções com outro servidor.'});
    expect(stored.get(control.id).autor_uid).toBe('u1');
    runInNewContext(source,scope);await scope.ControlesBiblioteca.load();
    expect(scope.ControlesBiblioteca.search('retenções')[0].id).toBe(control.id);
    expect(await scope.ControlesBiblioteca.create({nome:'Dupla checagem de retenções',categoria:'Tributos',tipo:'Detectivo',descricao:'Descrição'})).toMatchObject(control);
    expect(stored.size).toBe(1);
  });
  it('rejeita campos incompletos, conexão ausente e falha de gravação',async()=>{
    const {api,scope,setFail}=library();await expect(api.create({nome:'Incompleto'})).rejects.toThrow('Preencha');
    const values={nome:'Novo',categoria:'Geral',tipo:'Preventivo',descricao:'Controle'};
    scope.fbReady=()=>false;await expect(api.create(values)).rejects.toThrow('Conecte-se');scope.fbReady=()=>true;
    setFail(true);await expect(api.create(values)).rejects.toThrow('Falha de rede');expect(api.search('Novo')).toHaveLength(0);
  });
});
