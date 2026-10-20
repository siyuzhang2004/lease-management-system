/* Single-entity disclosures are derived from versioned contract schedules. */
const domesticDisclosureCompanies=['西安普源精电科技有限公司','深圳普源精电科技有限公司','北京普源耐数电子有限公司','北京耐数信息有限公司'];
const disclosureCompanies=[...domesticDisclosureCompanies];
let disclosureInternational={rates:{},companies:[],snapshots:{}};
const disclosureCurrencyNames={CNY:'人民币元',JPY:'日元',USD:'美元',EUR:'欧元',HKD:'港元',KRW:'韩元',MYR:'马来西亚林吉特'};
function configureDisclosures(data={},records={}){
 disclosureInternational={rates:{},companies:[],snapshots:{},...data};
 const names=[...domesticDisclosureCompanies,...Object.values(records).map(r=>r.params?.company),...disclosureInternational.companies.map(c=>c.name)].filter(Boolean);
 disclosureCompanies.splice(0,disclosureCompanies.length,...new Set(names));
}
function disclosureCurrency(company,records){
 const codes=[...new Set(Object.values(records).filter(r=>r.params?.company===company).map(r=>r.params.currency||'CNY'))];
 if(codes.length>1)throw new Error('同一公司合同的记账本位币不一致，请先核实。');
 return codes[0]||disclosureInternational.companies.find(c=>c.name===company)?.currency||'CNY';
}
const disclosureRows=[
 ['原值','一、账面原值'],['costOpening','1.期初余额',4],['costIncrease','2.本期增加金额',5],['newLease','其中：新增租赁',6],['acquisition','其中：企业并购',7],['costDecrease','3.本期减少金额',9],['disposal','其中：处置',10],['costClosing','4.期末余额',13],
 ['折旧','二、累计折旧'],['depOpening','1.期初余额',15],['depIncrease','2.本期增加金额',16],['depCharge','其中：本期计提',17],['depDecrease','3.本期减少金额',18],['depDisposal','其中：处置',19],['depClosing','4.期末余额',22],
 ['减值','三、减值准备'],['impOpening','1.期初余额',24],['impIncrease','2.本期增加金额',25],['impCharge','其中：本期计提',26],['impDecrease','3.本期减少金额',27],['impDisposal','其中：处置',28],['impClosing','4.期末余额',29],
 ['净值','四、账面价值'],['netClosing','1.期末账面价值',31],['netOpening','2.期初账面价值',32],
];
function disclosureMinor(value){if(!Number.isFinite(value))throw new Error('计算表金额无效。');return Math.round(value*100);}
// Fixed opening balances and reported disposals are separate from editable contracts.
function fixedDisclosureSources(company,month){
 return (disclosureInternational.fixedHistory||[]).filter(h=>h.company===company).flatMap(h=>{
  if(month<h.firstMonth)return [];
  let values;
  if(month<h.openingMonth){
   const snapshot=h.snapshots?.[month];
   if(!snapshot)throw new Error('旧租赁尚无 '+month+' 的历史记录，请选择已提供的报告期间。');
   values={...Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,0])),...snapshot};
  }else{
   const start=month.slice(0,4)+'-01',empty=()=>Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,0]));
   const balances={cost:disclosureMinor(h.opening.cost),dep:disclosureMinor(h.opening.dep),imp:disclosureMinor(h.opening.imp||0)};
   const events=h.movements||[],v=empty();
   const apply=e=>{for(const prefix of ['cost','dep','imp'])balances[prefix]+=disclosureMinor(e[prefix+'Increase']||0)-disclosureMinor(e[prefix+'Decrease']||0);};
   events.filter(e=>e.month<start).forEach(apply);
   for(const prefix of ['cost','dep','imp'])v[prefix+'Opening']=balances[prefix];
   for(const e of events.filter(e=>e.month>=start&&e.month<=month)){
    for(const key of ['costIncrease','newLease','acquisition','costDecrease','disposal','depIncrease','depCharge','depDecrease','depDisposal','impIncrease','impCharge','impDecrease','impDisposal'])v[key]+=disclosureMinor(e[key]||0);
    apply(e);
   }
   for(const prefix of ['cost','dep','imp'])v[prefix+'Closing']=balances[prefix];
   v.netOpening=v.costOpening-v.depOpening-v.impOpening;v.netClosing=v.costClosing-v.depClosing-v.impClosing;
   values=Object.fromEntries(Object.entries(v).map(([key,value])=>[key,value/100]));
  }
  if(!Object.values(values).some(v=>v!==0))return [];
  return [{id:h.id,name:h.name,kind:'history',values:{...values},reference:h.reference,historyNote:h.note}];
 });
}
function disclosureSourceLabel(data){
 const contracts=data.sources.filter(s=>s.result).length,history=data.sources.filter(s=>s.kind==='history').length;
 return [contracts?contracts+' 份合同':'',history?history+' 项历史数据':''].filter(Boolean).join(' · ');
}
function buildDisclosure(records,company,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('请选择有效的报告期间。');
 const currencyCode=disclosureCurrency(company,records);
 const hasContracts=Object.values(records).some(r=>r.params?.company===company);
 if(!hasContracts&&disclosureInternational.snapshots[company]){
  const history=disclosureInternational.snapshots[company][month];
  if(!history)throw new Error('尚无本期原币附注数据。');
  const source={id:'history-'+company+'-'+month,name:company+'历史附注',kind:'history',values:{...history.values},translatedOpening:{...history.translatedOpening},reference:history.source+' / '+history.sheet};
  return {company,month,opening:month.slice(0,4)+'-01-01',values:{...history.values},sources:[source],currencyCode,currency:disclosureCurrencyNames[currencyCode]||currencyCode,basis:'单体',historical:true,generatedAt:new Date().toISOString()};
 }
 const opening=month.slice(0,4)+'-01-01',cutoff=month+'-31',sources=fixedDisclosureSources(company,month);
 for(const record of Object.values(records)){
  if(record.params?.company!==company)continue;
  if(!record.result||record.params.revision!==record.result.params.revision||record.result.params.recordId!==record.id)throw new Error('本公司有尚未生成最新计算表的合同，请先完善合同参数。');
  if(record.result.params.company!==company)throw new Error('合同与计算表的承租公司不一致。');
  const p=record.result.params;
  if(p.start>cutoff)continue;
  const cost=disclosureMinor(record.result.initial.asset),values=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,0]));
  if(p.start<opening)values.costOpening=cost;else values.newLease=values.costIncrease=cost;
  values.costClosing=cost;
  for(const row of record.result.rows){
   if(row.end>cutoff)continue;
   const dep=disclosureMinor(row.depreciation);
   if(row.end<opening)values.depOpening+=dep;else values.depCharge+=dep;
  }
  values.depIncrease=values.depCharge;values.depClosing=values.depOpening+values.depCharge;
  // Derecognize at the contractual end date after the final depreciation charge.
  // Historical periods are derived independently; prior-year disposals do not recur.
  const disposed=!!p.end&&p.end<=cutoff;
  if(disposed){
   if(Math.abs(values.depClosing-cost)>1)throw new Error('合同 '+record.id+' 到期折旧尚未结清，请先检查计算表。');
   if(p.end<opening){Object.keys(values).forEach(key=>values[key]=0);}
   else{
    values.disposal=values.costDecrease=cost;values.costClosing=0;
    values.depDisposal=values.depDecrease=values.depClosing;values.depClosing=0;
   }
  }
  values.netOpening=values.costOpening-values.depOpening;values.netClosing=values.costClosing-values.depClosing;
  sources.push({id:record.id,name:p.name,revision:p.revision,disposalDate:disposed?p.end:null,values:Object.fromEntries(Object.entries(values).map(([key,n])=>[key,n/100])),params:JSON.parse(JSON.stringify(p)),result:JSON.parse(JSON.stringify(record.result))});
 }
 const values=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,sources.reduce((n,s)=>n+disclosureMinor(s.values[key]),0)/100]));
 return {company,month,opening,values,sources,currencyCode,currency:disclosureCurrencyNames[currencyCode]||currencyCode,basis:'单体',generatedAt:new Date().toISOString()};
}
// Exchange differences reconcile opening and translated movements to closing-rate balances.
for(const [closing,key] of [['costClosing','costFx'],['depClosing','depFx'],['impClosing','impFx']]){
 disclosureRows.splice(disclosureRows.findIndex(row=>row[0]===closing),0,[key,'外币报表折算差额',-1]);
}
function visibleDisclosureRows(data){return disclosureRows.filter(row=>data.translated||!row[0].endsWith('Fx'));}
function disclosureRates(currency,month){
 const year=Number(month.slice(0,4)),count=Number(month.slice(5,7));
 const get=period=>{
  const rate=disclosureInternational.rates[period]?.[currency];
  if(!rate||!Number.isFinite(rate.value)||rate.value<=0)throw new Error(`缺少 ${period} ${currency} 汇率，暂不能折算人民币。`);
  return {period,...rate};
 };
 const opening=get((year-1)+'-12'),monthly=Array.from({length:count},(_,i)=>get(year+'-'+String(i+1).padStart(2,'0')));
 return {opening:opening.value,closing:monthly.at(-1).value,average:Number((monthly.reduce((n,r)=>n+r.value,0)/count).toFixed(5)),monthly,openingSource:opening,source:disclosureInternational.rateSource,rule:'期初承接；本期变动用年初至报告期末月末汇率的算术平均值（五位小数）；期末用期末汇率。'};
}
function translateDisclosure(original,rates=null){
 if((original.currencyCode||'CNY')==='CNY')return JSON.parse(JSON.stringify(original));
 rates=rates||disclosureRates(original.currencyCode,original.month);
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 function translateValues(values,carry={}){
  const v=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,round((values[key]||0)*rates.average)]));
  for(const prefix of ['cost','dep','imp']){
   v[prefix+'Opening']=round(carry[prefix+'Opening']??((values[prefix+'Opening']||0)*rates.opening));
   v[prefix+'Closing']=round((values[prefix+'Closing']||0)*rates.closing);
   v[prefix+'Fx']=round(v[prefix+'Closing']-v[prefix+'Opening']-v[prefix+'Increase']+v[prefix+'Decrease']);
  }
  v.netOpening=round(v.costOpening-v.depOpening-v.impOpening);
  v.netClosing=round(v.costClosing-v.depClosing-v.impClosing);
  return v;
 }
 const sources=original.sources.map(s=>({...s,originalValues:{...s.values},values:translateValues(s.values,s.translatedOpening)}));
 const carry=disclosureInternational.openingCarry?.[original.month.slice(0,4)]?.[original.company];
 if(carry&&!original.historical&&sources.length){
  const zero=()=>Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,0]));
  const values=zero();
  for(const prefix of ['cost','dep','imp']){
   values[prefix+'Opening']=carry.adjustment[prefix+'Opening']||0;
   values[prefix+'Fx']=-values[prefix+'Opening'];
  }
  values.netOpening=round(values.costOpening-values.depOpening-values.impOpening);
  sources.push({id:'opening-carry-'+original.company,kind:'translation-opening',name:'人民币期初承接调整',
   reference:carry.source,historyNote:'固定承接上年末已报人民币金额与原币按期初汇率折算金额的差额。',
   values,originalValues:zero(),carryReported:{...carry.reported},
   carryBaseline:Object.fromEntries(Object.entries(carry.reported).map(([key,value])=>[key,round(value-(carry.adjustment[key]||0))])),
   translatedOpening:{costOpening:values.costOpening,depOpening:values.depOpening,impOpening:values.impOpening}});
 }
 const values=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,round(sources.reduce((sum,s)=>sum+s.values[key],0))]));
 return {...original,values,sources,currency:'人民币元',currencyCode:'CNY',originalCurrency:original.currencyCode,translated:true,rates:JSON.parse(JSON.stringify(rates))};
}
function compareDisclosureReference(disclosure,reference,tolerance=1){
 if(!reference)return {state:'generated',label:'按计算表生成',differences:[]};
 const differences=disclosureRows.filter(row=>row.length===3&&reference[String(row[2])]!==undefined).map(([key,label,cell])=>({key,label,cell,actual:disclosure.values[key],reference:reference[String(cell)],difference:(disclosureMinor(disclosure.values[key])-disclosureMinor(reference[String(cell)]))/100})).filter(row=>row.difference!==0);
 const material=differences.filter(row=>Math.abs(row.difference)>tolerance);
 return {state:material.length?'review':'matched',label:material.length?'存在需复核差异':differences.length?'核对通过 · 分位尾差已忽略':'核对通过',differences,material};
}
// Arithmetic relationships use the displayed version and currency, including frozen reports.
function disclosureFormula(data,key){
 const definitions={
  costIncrease:[['newLease',1,'新增租赁'],['acquisition',1,'企业并购']],
  costDecrease:[['disposal',1,'处置']],
  depIncrease:[['depCharge',1,'本期计提']],
  depDecrease:[['depDisposal',1,'处置']],
  impIncrease:[['impCharge',1,'本期计提']],
  impDecrease:[['impDisposal',1,'处置']],
 };
 for(const prefix of ['cost','dep','imp']){
  definitions[prefix+'Closing']=[[prefix+'Opening',1,'期初余额'],[prefix+'Increase',1,'本期增加金额'],[prefix+'Decrease',-1,'本期减少金额']];
  if(data.translated)definitions[prefix+'Closing'].push([prefix+'Fx',1,'外币报表折算差额']);
  definitions[prefix+'Fx']=[[prefix+'Closing',1,'期末余额'],[prefix+'Opening',-1,'期初余额'],[prefix+'Increase',-1,'本期增加金额'],[prefix+'Decrease',1,'本期减少金额']];
 }
 for(const suffix of ['Opening','Closing']){
  const period=suffix==='Opening'?'期初':'期末';
  definitions['net'+suffix]=[['cost'+suffix,1,period+'原值'],['dep'+suffix,-1,period+'累计折旧'],['imp'+suffix,-1,period+'减值准备']];
 }
 if(!definitions[key]||(!data.translated&&key.endsWith('Fx')))return null;
 const terms=definitions[key].map(([field,sign,label])=>({key:field,sign,label,value:data.values[field]||0}));
 return {terms,result:data.values[key]||0};
}
