const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('prototype/disclosure-model.js','utf8'),ctx);
(async()=>{
 const base='http://127.0.0.1:8765';
 const list=await(await fetch(base+'/api/workspace-contracts')).json();
 const records=Object.fromEntries(list.map(r=>[r.id,r]));
 const payload=await(await fetch(base+'/api/disclosure-international')).json();
 const refs=await(await fetch(base+'/api/disclosure-reference')).json();
 ctx.configureDisclosures(payload,records);
 const company='RIGOL TECHNOLOGIES EU GmbH',build=month=>ctx.buildDisclosure(records,company,month);
 assert.equal(list.filter(r=>r.params.company===company).length,2);
 for(const id of ['LS-EU-2025-001','LS-EU-2025-002']){
  const r=records[id];assert.equal(r.result.rows.at(-1).closingAsset,0);
  assert.equal(r.result.rows.at(-1).closingLiability,0);
  assert.ok(r.params.rentPhases.every(p=>p.timing==='arrears'));
 }
 assert.equal(records['LS-EU-2025-002'].result.initial.asset,15310.12);
 assert.ok(records['LS-EU-2025-002'].result.rows.every(r=>r.payment===783.38));
 const historical=JSON.stringify(payload.fixedHistory),audit={};
 for(const month of ['2025-03','2025-09','2026-03','2026-06']){
  const d=build(month),check=ctx.compareDisclosureReference(d,refs[company][month],.01);
  assert.equal(check.material.length,0,month+JSON.stringify(check));
  audit[month]={values:d.values,check};
  assert.ok(d.sources.find(s=>s.kind==='history'));
 }
 assert.equal(build('2025-03').values.netClosing,4124.8);
 assert.throws(()=>build('2025-02'),/历史记录/);
 assert.equal(build('2026-05').values.disposal,0);
 const june=build('2026-06');
 assert.equal(june.values.disposal,214482.46);assert.equal(june.values.depDisposal,214482.46);
 assert.equal(june.values.netClosing,255049.96);assert.equal(june.values.depCharge,36566.28);
 assert.equal(ctx.disclosureSourceLabel(june),'2 份合同 · 1 项历史数据');
 const dec=build('2026-12'),jan=build('2027-01'),end=build('2030-05');
 assert.equal(dec.values.disposal,229792.58);assert.equal(dec.values.depDisposal,229792.58);
 assert.equal(dec.values.costClosing,325061.16);
 assert.equal(jan.values.netClosing,213154.89);assert.equal(jan.values.disposal,0);
 assert.ok(!jan.sources.some(s=>s.kind==='history'));
 assert.equal(end.values.disposal,325061.16);assert.equal(end.values.depDisposal,325061.16);
 assert.equal(end.values.netClosing,0);assert.equal(build('2031-01').values.costOpening,0);
 for(const month of ['2026-03','2026-06','2026-09']){
  const d=build(month),fx=ctx.translateDisclosure(d);
  for(const prefix of ['cost','dep','imp']){
   const v=fx.values;
   assert.ok(Math.abs(v[prefix+'Opening']+v[prefix+'Increase']-v[prefix+'Decrease']+v[prefix+'Fx']-v[prefix+'Closing'])<.005);
  }
  const frozen=JSON.parse(JSON.stringify(fx));
  assert.equal(frozen.sources.find(s=>s.kind==='history').values.disposal,fx.sources.find(s=>s.kind==='history').values.disposal);
  audit[month]={...audit[month],translation:fx.values};
 }
 // Contract edits must not change the fixed historical source.
 const changed=JSON.parse(JSON.stringify(records));changed['LS-EU-2025-001'].result.initial.asset+=100;
 const altered=ctx.buildDisclosure(changed,company,'2026-06');
 assert.equal(altered.values.costClosing,june.values.costClosing+100);
 assert.equal(JSON.stringify(payload.fixedHistory),historical);
 assert.equal(JSON.stringify(altered.sources.find(s=>s.kind==='history')),JSON.stringify(june.sources.find(s=>s.kind==='history')));
 fs.writeFileSync('analysis/disclosures/europe-disclosure-audit.json',JSON.stringify(audit,null,2));
 console.log('Europe: four original disclosures, fixed legacy data, two leases, FX and expiry disposal passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
