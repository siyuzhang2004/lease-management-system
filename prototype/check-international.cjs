const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('prototype/disclosure-model.js','utf8'),ctx);
(async()=>{
 const base='http://127.0.0.1:8765';
 const payload=await(await fetch(base+'/api/disclosure-international')).json();
 const references=JSON.parse(fs.readFileSync('analysis/disclosures/overseas-reference.json','utf8'));
 assert.equal(payload.companies.length,0);
 assert.equal(Object.keys(payload.snapshots).length,0);
 const list=await(await fetch(base+'/api/workspace-contracts')).json();
 const records=Object.fromEntries(list.map(r=>[r.id,r]));
 ctx.configureDisclosures(payload,records);
 const jp=list.find(r=>r.id==='LS-JP-2024-001');
 assert.equal(jp.result.initial.asset,11740394);
 assert.equal(jp.result.rows[23].depreciation,489185);
 assert.equal(jp.result.rows[23].closingAsset,0);
 assert.equal(jp.result.rows[23].closingLiability,0);
 const raw=ctx.buildDisclosure(records,jp.params.company,'2026-06');
 assert.equal(raw.currencyCode,'JPY');assert.equal(raw.values.netClosing,1956734);
 assert.equal(raw.values.depCharge,2935098);
 for(const [month,snapshot] of Object.entries(references[jp.params.company])){
  const current=ctx.buildDisclosure(records,jp.params.company,month);
  for(const [key,value] of Object.entries(snapshot.values))assert.ok(Math.abs(current.values[key]-value)<.01,month+' '+key);
 }
 const translated=ctx.translateDisclosure(raw);
 assert.equal(translated.rates.opening,.044797);
 assert.equal(translated.rates.closing,.04205);
 assert.equal(translated.rates.average,.04343);
 assert.equal(translated.values.netClosing,82280.67); // rounded cost less rounded depreciation
 assert.equal(translated.values.depCharge,127471.31);
 assert.equal(raw.currencyCode,'JPY'); // no mutation during display conversion
 for(const p of ['cost','dep','imp']){
  const v=translated.values;
  assert.ok(Math.abs(v[p+'Opening']+v[p+'Increase']-v[p+'Decrease']+v[p+'Fx']-v[p+'Closing'])<.001);
 }
 assert.throws(()=>ctx.translateDisclosure(ctx.buildDisclosure(records,jp.params.company,'2026-10')),/2026-10/);
 // Isolate historical-only coverage from the now-active European contracts.
 const historicalRecords=Object.fromEntries(Object.entries(records).filter(([,r])=>r.params.currency!=='EUR'));
 ctx.configureDisclosures({...payload,snapshots:references,companies:[{name:'RIGOL TECHNOLOGIES EU GmbH',currency:'EUR'}]},records);
 const historic=ctx.buildDisclosure(historicalRecords,'RIGOL TECHNOLOGIES EU GmbH','2026-06');
 const eur=ctx.translateDisclosure(historic);
 assert.equal(eur.values.costOpening,Math.round(references['RIGOL TECHNOLOGIES EU GmbH']['2026-06'].translatedOpening.costOpening*100)/100);
 assert.equal(eur.rates.average,8.0107);
 assert.throws(()=>ctx.buildDisclosure(historicalRecords,'RIGOL TECHNOLOGIES EU GmbH','2026-10'),/尚无本期/);
 const clone=JSON.parse(JSON.stringify(jp));clone.id='second';clone.params.recordId='second';clone.result.params.recordId='second';
 const both=ctx.buildDisclosure({...records,second:clone},jp.params.company,'2026-06');
 assert.equal(both.sources.length,2);assert.equal(both.values.netClosing,raw.values.netClosing*2);
 const fxBoth=ctx.translateDisclosure(both);
 assert.equal(fxBoth.values.netClosing,Math.round(fxBoth.sources.reduce((a,s)=>a+s.values.netClosing,0)*100)/100);
 clone.params.currency='USD';clone.result.params.currency='USD';
 assert.throws(()=>ctx.buildDisclosure({...records,second:clone},jp.params.company,'2026-06'),/本位币/);
 const saved=JSON.parse(JSON.stringify({original:raw,converted:translated}));
 payload.rates['2026-06'].JPY.value=999;ctx.configureDisclosures(payload,records);
 assert.equal(saved.converted.rates.closing,.04205);
 assert.equal(ctx.disclosureRates('USD','2025-01').opening,7.1884);
 // Every historical original report agrees with the January-to-date roll-forward.
 for(const months of Object.values(references))for(const item of Object.values(months)){
  const v=item.values;
  for(const prefix of ['cost','dep','imp'])assert.ok(Math.abs(v[prefix+'Opening']+v[prefix+'Increase']-v[prefix+'Decrease']-v[prefix+'Closing'])<1);
 }
 console.log('Japan, currency isolation, YTD FX, missing rates, opening carry, snapshots and multi-contract traces passed');
})().catch(e=>{console.error(e);process.exitCode=1});
