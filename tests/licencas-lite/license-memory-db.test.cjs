const {test}=require('node:test'),assert=require('node:assert/strict'),{MemoryDb}=require('./license-memory-db.cjs');
test('transactions remain serialized and recover after a rejected operation',async()=>{
 const db=new MemoryDb(),ref=db.doc('counter/one');db.rows.set(ref.key,{value:0});
 const increment=()=>db.runTransaction(async tx=>{const snap=await tx.get(ref);await Promise.resolve();tx.update(ref,{value:snap.data().value+1});});
 await Promise.all([increment(),increment()]);assert.equal(db.rows.get(ref.key).value,2);
 await assert.rejects(db.runTransaction(async tx=>{await tx.get(ref);tx.update(ref,{value:999});throw Error('rollback');}),/rollback/);
 assert.equal(db.rows.get(ref.key).value,2);await increment();assert.equal(db.rows.get(ref.key).value,3);
});
