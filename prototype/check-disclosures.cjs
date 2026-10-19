const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('prototype/disclosure-model.js','utf8'),ctx);
const run=(records,company,month)=>ctx.buildDisclosure(records,company,month);
const p={recordId:'A',revision:1,company:'西安普源精电科技有限公司',start:'2025-02-01',name:'test'};
const record={id:'A',params:p,result:{params:{...p},initial:{asset:100.01},rows:[{end:'2025-02-28',depreciation:10.01},{end:'2025-03-31',depreciation:10.01}]}};
const a=run({A:record},p.company,'2025-03');assert.equal(a.values.newLease,100.01);assert.equal(a.values.depCharge,20.02);assert.equal(a.values.netClosing,79.99);assert.equal(a.values.netOpening,0);
record.params.revision=2;assert.throws(()=>run({A:record},p.company,'2025-03'));assert.equal(a.sources[0].params.revision,1);record.params.revision=1;
assert.equal(run({A:record},p.company,'2026-03').values.depOpening,20.02);assert.equal(run({A:record},'深圳普源精电科技有限公司','2025-03').sources.length,0);assert.throws(()=>run({},p.company,'2025-13'));
assert.equal(ctx.compareDisclosureReference(a,{'31':80.16}).state,'matched');assert.equal(ctx.compareDisclosureReference(a,{'31':82}).state,'review');
(async()=>{const base='http://127.0.0.1:8765';const all=[await(await fetch(base+'/api/default-contract')).json(),...await(await fetch(base+'/api/workspace-contracts')).json()];const records=Object.fromEntries(all.map(r=>[r.id,r]));const reference=await(await fetch(base+'/api/disclosure-reference')).json();let count=0;for(const [company,months] of Object.entries(reference)){for(const [month,ref]of Object.entries(months)){const actual=run(records,company,month);const check=ctx.compareDisclosureReference(actual,ref);assert.equal(check.state,'matched',company+' '+month+' '+JSON.stringify(check.material));count++;}}
const dz=run(records,'北京普源耐数电子有限公司','2026-06');assert.equal(dz.values.netClosing,1792990.63);assert.equal(dz.values.depCharge,290755.20);
assert.equal(run(records,'北京耐数信息有限公司','2026-06').values.netClosing,1907703.75);
console.log('Disclosure period, revision, snapshot, isolation, tolerance and '+count+' historical comparisons passed');})().catch(e=>{console.error(e);process.exitCode=1;});
