const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
for(const path of ['disclosure-model.js','group-disclosure-model.js'])vm.runInContext(fs.readFileSync('prototype/'+path,'utf8'),ctx);
(async()=>{
 const base='http://127.0.0.1:8765';
 const list=await(await fetch(base+'/api/workspace-contracts')).json();
 list.push(await(await fetch(base+'/api/default-contract')).json());
 const records=Object.fromEntries(list.map(r=>[r.id,r]));
 const settings=await(await fetch(base+'/api/disclosure-international')).json();
 const references=await(await fetch(base+'/api/disclosure-group-reference')).json();
 ctx.configureDisclosures(settings,records);
 const audit={};
 for(const month of ['2026-06','2026-09']){
  const d=ctx.buildGroupDisclosure(records,month),ref=references[month],check=ctx.compareGroupReference(d,ref);
  assert.equal(d.companies.length,8);assert.equal(d.eliminations.length,2);
  assert.equal(check.state,'matched',JSON.stringify(check));assert.equal(check.material.length,0);
  assert.ok(Math.abs(d.values.netClosing-ref.expected.netClosing)<=.05);
  for(const key of Object.keys(d.values)){
   const included=d.companies.filter(c=>!c.eliminated).reduce((n,c)=>n+Math.round(c.report.values[key]*100),0)/100;
   assert.equal(d.values[key],included,key);
  }
  for(const prefix of ['cost','dep','imp']){
   for(const v of [d.values,d.before,...d.companies.map(c=>c.report.values)]){
    assert.ok(Math.abs(v[prefix+'Opening']+v[prefix+'Increase']-v[prefix+'Decrease']+v[prefix+'Fx']-v[prefix+'Closing'])<.015,prefix);
   }
  }
  assert.equal(d.debit.costClosing,0);assert.equal(d.credit.depClosing,0);
  assert.ok(d.credit.costClosing>0);assert.ok(d.debit.depClosing>0);
  assert.equal(d.debit.netClosing,d.debit.depClosing);
  assert.equal(d.credit.netClosing,d.credit.costClosing);
  if(ref.trialBalance)assert.ok(Math.abs(d.values.netClosing-ref.trialBalance.expected)<.05);
  const before=JSON.stringify(d);
  // No mutation of single-entity numbers during consolidation.
  for(const e of d.eliminations)assert.equal(ctx.buildDisclosure(records,e.company,month).values.netClosing,-e.values.netClosing);
  assert.equal(JSON.stringify(d),before);
  audit[month]={values:d.values,before:d.before,debit:d.debit,credit:d.credit,check,trial:ref.trialBalance};
 }
 const d=ctx.buildGroupDisclosure(records,'2026-06');
 // Malaysia is excluded even if a contract is added before that phase is implemented.
 const copy=JSON.parse(JSON.stringify(records)),clone=JSON.parse(JSON.stringify(list[0]));
 clone.id='TEST-MY';clone.params.recordId=clone.result.params.recordId=clone.id;
 clone.params.company=clone.result.params.company='RIGOL TECHNOLOGIES（MALAYSIA）SDN.BHD.';
 copy[clone.id]=clone;
 assert.equal(JSON.stringify(ctx.buildGroupDisclosure(copy,'2026-06').values),JSON.stringify(d.values));
 assert.throws(()=>ctx.buildGroupDisclosure(records,'2026-10'),/汇率/);
 // Changed internal rent is fully cancelled, not left as a stale fixed elimination.
 const internal=Object.values(copy).find(r=>r.params.company==='北京耐数信息有限公司');
 internal.result.initial.asset+=100;
 assert.equal(ctx.buildGroupDisclosure(copy,'2026-06').values.costClosing,d.values.costClosing);
 fs.writeFileSync('analysis/disclosures/group-audit.json',JSON.stringify(audit,null,2));
 console.log(JSON.stringify(audit,null,2));
 console.log('Group June/September disclosures and trial balance, FX carry, elimination signs, scope and contract changes passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
