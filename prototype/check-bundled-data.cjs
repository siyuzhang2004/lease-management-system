const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ctx=vm.createContext({});
for(const file of ['disclosure-model.js','group-disclosure-model.js','liability-model.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
}
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8765';
 const get=async route=>{const response=await fetch(base+'/api/'+route);assert.equal(response.status,200,route);return response.json();};
 const list=await get('workspace-contracts');list.push(await get('default-contract'));
 assert.equal(list.length,9);assert.equal(new Set(list.map(r=>r.id)).size,9);
 assert.equal(new Set(list.map(r=>r.params.company)).size,8);
 const records=Object.fromEntries(list.map(r=>[r.id,r])),international=await get('disclosure-international');
 ctx.configureDisclosures(international,records);
 assert.ok(international.fixedHistory.length);assert.ok(Object.keys(international.openingCarry).length);
 const references=await get('disclosure-group-reference');
 for(const month of ['2026-06','2026-09']){
  for(const company of new Set(list.map(r=>r.params.company))){
   ctx.buildDisclosure(records,company,month);ctx.buildLiabilityDisclosure(records,company,month);
  }
  const group=ctx.buildGroupDisclosure(records,month);
  assert.equal(group.companies.length,8);assert.equal(group.eliminations.length,2);
  assert.equal(ctx.compareGroupReference(group,references[month]).state,'matched');
  const sub=ctx.buildGroupDisclosure(records,month,'naishu'),ll=ctx.buildGroupLiability(records,month,'naishu');
  assert.equal(sub.companies.length,2);assert.equal(sub.eliminations.length,0);
  assert.equal(ll.eliminations.length,0);
  assert.ok(Math.abs(ll.values.current+ll.values.noncurrent-ll.values.closing)<.01);
  if(month==='2026-09'){
   assert.equal(group.values.netClosing,16185633.85);
   assert.equal(sub.values.netClosing,3400638.10);
   assert.equal(ll.values.closing,3334945.09);
   assert.equal(ctx.buildGroupLiability(records,month).values.closing,17388709.56);
  }
 }
 console.log('Bundled data passed: 9 contracts, 8 companies, FX/history inputs, June/September RIGOL and Naishu asset/liability disclosures.');
})().catch(e=>{console.error(e);process.exitCode=1;});
