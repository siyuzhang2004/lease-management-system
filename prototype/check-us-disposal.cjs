const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('prototype/disclosure-model.js','utf8'),ctx);
(async()=>{
 const records=await(await fetch('http://127.0.0.1:8765/api/workspace-contracts')).json();
 const us=records.find(r=>r.id==='LS-US-2021-001');assert.ok(us);
 const data=Object.fromEntries(records.map(r=>[r.id,r]));
 const build=month=>ctx.buildDisclosure(data,us.params.company,month);
 const refs=JSON.parse(fs.readFileSync('analysis/disclosures/us-reference.json','utf8'));
 const comparisons=[];
 for(const [month,ref] of Object.entries(refs)){
  const check=ctx.compareDisclosureReference(build(month),ref);
  assert.equal(check.state,'matched',month+JSON.stringify(check.differences));
  comparisons.push({month,differences:check.differences});
 }
 const oct=build('2026-10'),nov=build('2026-11'),dec=build('2026-12'),next=build('2027-01');
 assert.equal(oct.values.costClosing,201147.43);assert.equal(oct.values.netClosing,3192.59);
 assert.equal(oct.values.disposal,0);
 assert.equal(nov.values.costClosing,0);assert.equal(nov.values.depClosing,0);assert.equal(nov.values.netClosing,0);
 assert.equal(nov.values.disposal,201147.43);assert.equal(nov.values.costDecrease,201147.43);
 assert.equal(nov.values.depDisposal,201147.43);assert.equal(nov.values.depDecrease,201147.43);
 assert.equal(nov.values.depCharge,35120.79);assert.equal(nov.values.depOpening,166026.64);
 assert.equal(nov.sources[0].disposalDate,'2026-11-30');
 assert.equal(dec.values.disposal,201147.43);
 Object.values(next.values).forEach(v=>assert.equal(v,0));
 // Reading future periods never changes a previously constructed or saved report.
 assert.equal(oct.values.netClosing,3192.59);
 assert.equal(build('2026-10').values.netClosing,3192.59);
 // Active and expired leases of the same company aggregate into one disclosure.
 const another=JSON.parse(JSON.stringify(us));another.id='ACTIVE';another.params.recordId=another.result.params.recordId='ACTIVE';
 another.params.end=another.result.params.end='2027-11-30';
 const mixed=ctx.buildDisclosure({...data,ACTIVE:another},us.params.company,'2026-11');
 assert.equal(mixed.sources.length,2);assert.equal(mixed.values.costClosing,201147.43);
 assert.equal(mixed.values.disposal,201147.43);
 // Same-year inception and expiry, followed by a clean next-year opening.
 const p={recordId:'SHORT',revision:1,company:'Short',start:'2026-10-01',end:'2026-11-30'};
 const short={id:'SHORT',params:p,result:{params:p,initial:{asset:100},rows:[{end:'2026-10-31',depreciation:50},{end:'2026-11-30',depreciation:50}]}};
 const shortReport=ctx.buildDisclosure({SHORT:short},'Short','2026-11');
 assert.equal(shortReport.values.newLease,100);assert.equal(shortReport.values.disposal,100);
 assert.equal(shortReport.values.depCharge,100);assert.equal(shortReport.values.netClosing,0);
 // Synthetic rates test the roll-forward after disposal; they are never saved to runtime data.
 const fx=ctx.translateDisclosure(nov,{opening:7,average:6.8,closing:6.7});
 assert.equal(fx.values.costClosing,0);assert.equal(fx.values.depClosing,0);
 for(const prefix of ['cost','dep'])assert.ok(Math.abs(fx.values[prefix+'Opening']+fx.values[prefix+'Increase']-fx.values[prefix+'Decrease']+fx.values[prefix+'Fx'])<.001);
 const report={historical:comparisons,october:oct.values,november:nov.values,nextYear:next.values};
 fs.writeFileSync('analysis/disclosures/us-disclosure-audit.json',JSON.stringify(report,null,2));
 console.log('US historical disclosures and expiry, YTD, next-year, multi-contract, snapshot and FX disposal checks passed');
 console.log(JSON.stringify(comparisons));
})().catch(e=>{console.error(e);process.exitCode=1});
