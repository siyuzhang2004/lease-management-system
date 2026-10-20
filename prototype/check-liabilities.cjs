const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});
for(const file of ['disclosure-model','group-disclosure-model','liability-model'])vm.runInContext(fs.readFileSync('prototype/'+file+'.js','utf8'),ctx);
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.011,`${label}: ${a} != ${b}`);
(async()=>{
 const base='http://127.0.0.1:8765',get=async path=>{const r=await fetch(base+path);assert.equal(r.status,200);return r.json();};
 const list=await get('/api/workspace-contracts');list.push(await get('/api/default-contract'));
 const records=Object.fromEntries(list.map(r=>[r.id,r])),original=JSON.stringify(records);
 ctx.configureDisclosures(await get('/api/disclosure-international'),records);
 const refs=await get('/api/disclosure-liability-reference'),audit={};
 for(const month of ['2026-06','2026-09']){
  const group=ctx.buildGroupLiability(records,month);
  assert.equal(group.companies.length,8);assert.equal(group.eliminations.length,2);
  for(const d of [group,...group.companies.map(c=>c.report)]){
   const v=d.values;
   near(v.opening+v.additions+v.interest-v.payments+v.fx,v.closing,'rollforward');
   near(v.current+v.noncurrent,v.closing,'closing classification');
   near(v.currentOpening+v.noncurrentOpening,v.opening,'opening classification');
   assert.ok(v.current>=0&&v.noncurrent>=0);
   for(const key of ['closing','noncurrent','noncurrentOpening','fx']){
    const f=ctx.liabilityFormula(d,key);
    near(f.terms.reduce((n,t)=>n+t.sign*t.value,0),f.value,key+' trace formula');
   }
  }
  for(const key of Object.keys(group.values)){
   near(group.companies.filter(c=>!c.eliminated).reduce((n,c)=>n+c.report.values[key],0),group.values[key],key+' full elimination');
   near(group.before[key]+ctx.liabilityBalanceSign(key)*(group.debit[key]-group.credit[key]),group.values[key],key+' debit credit');
  }
  const companies={};
  for(const c of group.companies){
   const d=ctx.buildLiabilityDisclosure(records,c.company,month);
   companies[c.label]={currency:d.currencyCode,values:d.values,check:ctx.compareLiabilityReference(d,refs[month].companies[c.company])};
  }
  assert.equal(companies['日本公司'].check.state,'matched');
  assert.ok(group.credit.payments>0);assert.equal(group.debit.payments,0);
  assert.ok(group.debit.closing>0);assert.equal(group.credit.closing,0);
  near(companies['美国公司'].values.current,companies['美国公司'].values.closing,'US all current');
  near(companies['美国公司'].values.noncurrent,0,'US no noncurrent');
  near(companies['美国公司'].values.noncurrentOpening,0,'US opening all current');
  near(companies['欧洲公司'].values.current,refs[month].companies['RIGOL TECHNOLOGIES EU GmbH'].values.current,'EU next 12 principal');
  audit[month]={group:group.values,check:ctx.compareLiabilityReference(group,refs[month].group),companies};
 }
 // Independently read source-table checkpoints (source cells recorded in prepare_liability.py).
 const sz='深圳普源精电科技有限公司',eu='RIGOL TECHNOLOGIES EU GmbH',us='RIGOL TECHNOLOGIES, USA INC.';
 near(ctx.buildLiabilityDisclosure(records,sz,'2026-06').values.closing,1851463.52,'SZ source R41');
 near(ctx.buildLiabilityDisclosure(records,sz,'2026-09').values.closing,1400910.53,'SZ source R44');
 near(ctx.buildLiabilityDisclosure(records,eu,'2026-06').values.closing,263470.14,'EU Lead L15');
 near(ctx.buildLiabilityDisclosure(records,eu,'2026-09').values.closing,245415.81,'EU Lead L18');
 near(ctx.buildLiabilityDisclosure(records,us,'2026-06').values.closing,19513.23,'US Lead O59');
 near(audit['2026-09'].group.noncurrent-refs['2026-09'].trial.noncurrent,50200.37,'reported noncurrent discrepancy retained');
 // At expiry the remaining liability is settled; future years do not repeat repayments.
 for(const id of ['LS-US-2021-001','LS-KR-2025-001','LS-JP-2024-001','LS-EU-2025-002']){
  const r=records[id],d=ctx.buildLiabilityDisclosure({[id]:r},r.params.company,r.params.end.slice(0,7));
  near(d.values.closing,0,id+' expiry');near(d.values.current,0,id+' expiry current');near(d.values.noncurrent,0,id+' expiry noncurrent');
  const after=ctx.buildLiabilityDisclosure({[id]:r},r.params.company,(Number(r.params.end.slice(0,4))+1)+'-12');
  near(after.values.payments,0,id+' next year payments');
 }
 const xian=list.find(r=>r.params.company==='西安普源精电科技有限公司');
 // The following year window starts after the reporting month, includes month +12, excludes +13.
 const pos=ctx.liabilityPosition(xian,'2026-06');
 assert.equal(pos.future.length,12);assert.equal(pos.future[0].end.slice(0,7),'2026-07');assert.equal(pos.future.at(-1).end.slice(0,7),'2027-06');
 near(pos.current,pos.payments-pos.interest,'principal vs future cash flows');
 near(ctx.liabilityPosition(xian,'2022-06').current,0,'not yet commenced');
 const toy={result:{params:{start:'2026-01-01'},initial:{liability:100},rows:[
  {end:'2026-06-30',closingLiability:100,principal:0,payment:0,interest:0},
  {end:'2027-06-30',closingLiability:110,principal:-10,payment:0,interest:10},
  {end:'2027-07-31',closingLiability:0,principal:110,payment:111,interest:1}]}};
 near(ctx.liabilityPosition(toy,'2026-06').current,0,'free period clamp');
 toy.result.rows[1].principal=120;
 near(ctx.liabilityPosition(toy,'2026-06').current,100,'cap at contract balance');
 // Foreign snapshots remain frozen and raw original currency values are untouched.
 const frozen=JSON.parse(JSON.stringify(ctx.translateLiabilityDisclosure(ctx.buildLiabilityDisclosure(records,eu,'2026-06'))));
 ctx.configureDisclosures({},records);
 assert.throws(()=>ctx.translateLiabilityDisclosure(ctx.buildLiabilityDisclosure(records,eu,'2026-06')),/汇率/);
 near(frozen.values.current+frozen.values.noncurrent,frozen.values.closing,'frozen classification');
 assert.equal(JSON.stringify(records),original,'source records immutable');
 const broken=JSON.parse(original);broken[list[0].id].params.revision=999;
 assert.throws(()=>ctx.buildLiabilityDisclosure(broken,list[0].params.company,'2026-06'),/同步/);
 fs.writeFileSync('analysis/disclosures/liability-audit.json',JSON.stringify(audit,null,2));
 console.log('Liability rollforwards, 12-month window, expiry, FX, full elimination, frozen sources, and June/September reconciliation passed.');
 console.log(JSON.stringify(Object.fromEntries(Object.entries(audit).map(([m,a])=>[m,a.group])),null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
