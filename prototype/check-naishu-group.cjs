const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
for(const file of ['disclosure-model.js','group-disclosure-model.js','liability-model.js'])vm.runInContext(fs.readFileSync('prototype/'+file,'utf8'),ctx);
(async()=>{
 const get=async path=>(await fetch('http://127.0.0.1:8765/api/'+path)).json();
 const list=await get('workspace-contracts');list.push(await get('default-contract'));
 const records=Object.fromEntries(list.map(r=>[r.id,r]));
 ctx.configureDisclosures(await get('disclosure-international'),records);
 const before=JSON.stringify(records),members=['北京普源耐数电子有限公司','北京耐数信息有限公司'];
 for(const month of ['2026-06','2026-09','2026-10']){
  for(const build of [ctx.buildGroupDisclosure,ctx.buildGroupLiability]){
   const d=build(records,month,'naishu');
   assert.deepEqual(Array.from(d.companies,c=>c.company),members);
   assert.equal(d.eliminations.length,0);
   for(const key of Object.keys(d.values)){
    const sum=d.companies.reduce((n,c)=>n+Math.round(c.report.values[key]*100),0)/100;
    assert.equal(d.values[key],sum,key);assert.equal(d.before[key],sum,key);
    assert.equal(d.debit[key],0);assert.equal(d.credit[key],0);
   }
   if(month==='2026-09'){
    if(d.values.netClosing!==undefined)assert.equal(d.values.netClosing,3400638.10);
    else{assert.equal(d.values.closing,3334945.09);assert.equal(d.values.current,1251953.03);assert.equal(d.values.noncurrent,2082992.06);}
   }
   assert.throws(()=>build(records,month,'invalid'),/未知/);
  }
 }
 // New contracts in a member company flow through; out-of-scope landlords never enter the subgroup.
 const copy=JSON.parse(before),source=Object.values(copy).find(r=>r.params.company===members[0]);
 for(const [id,company] of [['TEST-MEMBER',members[0]],['TEST-LANDLORD','北京普源精电科技有限公司']]){
  const clone=JSON.parse(JSON.stringify(source));clone.id=id;
  clone.params.recordId=clone.result.params.recordId=id;clone.params.company=clone.result.params.company=company;
  copy[id]=clone;
 }
 for(const build of [ctx.buildGroupDisclosure,ctx.buildGroupLiability]){
  const original=build(records,'2026-09','naishu'),changed=build(copy,'2026-09','naishu');
  assert.equal(changed.companies.length,2);
  for(const key of Object.keys(original.values))assert.equal(Math.round(changed.values[key]*100),Math.round(original.values[key]*100)+Math.round(original.companies[0].report.values[key]*100),key);
 }
 assert.equal(JSON.stringify(records),before);
 assert.equal(ctx.groupDetailRoute('asset','naishu'),'#disclosures/group/naishu/detail');
 assert.equal(ctx.groupDetailRoute('liability'),'#liabilities/group/detail');
 console.log('Naishu asset/liability scope, no eliminations, member contract aggregation, landlord exclusion, September balances and source immutability passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
