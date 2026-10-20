const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('prototype/disclosure-model.js','utf8'),ctx);
(async()=>{
 const base='http://127.0.0.1:8765';
 const list=await(await fetch(base+'/api/workspace-contracts')).json();
 const records=Object.fromEntries(list.map(r=>[r.id,r]));
 const korea=records['LS-KR-2025-001'];assert.ok(korea);
 const company=korea.params.company;
 assert.equal(company,'RIGOL KOREA CO,. LTD.');
 assert.equal(list.filter(r=>r.params.currency==='EUR').length,0,'Europe is pending user confirmation');
 ctx.configureDisclosures(await(await fetch(base+'/api/disclosure-international')).json(),records);
 const refs=await(await fetch(base+'/api/disclosure-reference')).json();
 const june=ctx.buildDisclosure(records,company,'2026-06');
 const check=ctx.compareDisclosureReference(june,refs[company]['2026-06']);
 assert.equal(check.state,'matched');assert.equal(check.differences.length,0);
 assert.equal(june.values.costClosing,32737203);assert.equal(june.values.depCharge,8184300);
 assert.equal(june.values.netClosing,20460753);
 assert.equal(june.sources.length,1);
 const august=ctx.buildDisclosure(records,company,'2027-08');
 const september=ctx.buildDisclosure(records,company,'2027-09');
 assert.equal(august.values.netClosing,1364053);
 assert.equal(september.values.costDecrease,32737203);
 assert.equal(september.values.depDecrease,32737203);
 assert.equal(september.values.costClosing,0);
 assert.equal(september.values.depClosing,0);assert.equal(september.values.netClosing,0);
 const next=ctx.buildDisclosure(records,company,'2028-01');
 Object.values(next.values).forEach(v=>assert.equal(v,0));
 const translated=ctx.translateDisclosure(june);
 for(const prefix of ['cost','dep','imp']){
  const v=translated.values;
  assert.ok(Math.abs(v[prefix+'Opening']+v[prefix+'Increase']-v[prefix+'Decrease']+v[prefix+'Fx']-v[prefix+'Closing'])<.005);
 }
 assert.equal(translated.sources[0].values.netClosing,translated.values.netClosing);
 const summary={reference:check,initial:korea.result.initial,june:june.values,
                translated:{values:translated.values,rates:translated.rates},expiry:september.values};
 fs.writeFileSync('analysis/disclosures/korea-disclosure-audit.json',JSON.stringify(summary,null,2));
 console.log('Korea June disclosure, FX, expiry disposal and following-year checks passed');
 console.log(JSON.stringify({originalNet:june.values.netClosing,translatedNet:translated.values.netClosing,
  closingRate:translated.rates.closing,averageRate:translated.rates.average}));
})().catch(e=>{console.error(e);process.exitCode=1;});
